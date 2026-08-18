<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	MainScene — the KFC AR content (renderless component).

	Vertical Wall AR flow (docs/VERTICAL_WALL_AR.md):
	  stage 'wall'   — a white line on the floor follows the camera's centre ray;
	                   tap → the line becomes the base of a virtual wall.
	  stage 'castle' — gradient wall + red aim ring at ray ∩ wall; tap → the ring
	                   position becomes the castle anchor.
	  stage 'play'   — wall goes invisible (shadows only), KfcEffect is placed at
	                   the anchor, its burst floor re-derived so bodies land on the
	                   real floor, and the entrance plays. Taps on the castle /
	                   box walls fire the burst.

	Mounted as soon as the camera feed is running, while the coach marker is still
	on screen: the GLBs download and the scene is pre-compiled invisibly, so that
	revealing it (Coach → recenter → xr.contentVisible = true) is instant.
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import * as THREE from 'three'
	import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
	import { xr } from '$lib/xr/xr-state.svelte'
	import { kfc } from '$lib/kfc/kfc-state.svelte'
	import { KfcEffect } from '$lib/kfc/KfcEffect'
	import { WallPlacer } from '$lib/kfc/wall-placer'
	import { EFFECT_SCALE, EFFECT_TIME_SCALE } from '$lib/kfc/kfc-config'
	import { KEY_LIGHT, WALL_HEIGHT, WALL_SHADOW_OPACITY, WALL_WIDTH } from '$lib/kfc/wall-layout'

	const UPDATE_MODULE_NAME = 'kfc-update'

	let group: THREE.Group | undefined
	let fx: KfcEffect | undefined
	let restart: (() => void) | undefined

	// Build the content once and pre-compile it while the coach marker is up.
	$effect(() => {
		const XR8 = window.XR8
		if (!XR8) return
		const { scene, camera, renderer } = XR8.Threejs.xrScene()
		const debug = new URLSearchParams(window.location.search).has('debug')

		group = new THREE.Group()
		group.name = 'KfcRoot'

		// ── Environment (IBL) — replaces Mattercraft's DefaultEnvironment/AutoLighting.
		const pmrem = new THREE.PMREMGenerator(renderer)
		const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
		pmrem.dispose()
		const previousEnvironment = scene.environment
		const previousEnvironmentIntensity = scene.environmentIntensity
		scene.environment = envTexture
		scene.environmentIntensity = 1

		// ── Wall placement helpers (floor line → gradient wall → aim ring).
		const activePlacer = new WallPlacer({
			wallWidth: WALL_WIDTH,
			wallHeight: WALL_HEIGHT,
			wallShadowOpacity: WALL_SHADOW_OPACITY
		})
		group.add(activePlacer.root)

		// ── Key light: the Scene.zcomp DirectionalLight (warm, intensity 0.1,
		//    shadow camera ±10). Lives in the wall group and is re-aimed at the
		//    castle anchor whenever the castle is placed.
		const key = new THREE.DirectionalLight(new THREE.Color(...KEY_LIGHT.color), KEY_LIGHT.intensity)
		key.castShadow = true
		key.shadow.mapSize.set(1024, 1024)
		key.shadow.camera.near = 0.1
		key.shadow.camera.far = 30
		key.shadow.camera.left = -KEY_LIGHT.shadowExtent
		key.shadow.camera.right = KEY_LIGHT.shadowExtent
		key.shadow.camera.top = KEY_LIGHT.shadowExtent
		key.shadow.camera.bottom = -KEY_LIGHT.shadowExtent
		key.shadow.bias = -0.0005
		activePlacer.wallGroup.add(key, key.target)

		// ── The KFC effect, child of the wall anchor (so it inherits the wall's
		//    yaw). Hidden until the castle anchor is confirmed. All physics/layout
		//    values are the Scene.zcomp ones; only burstFloorY is re-derived from
		//    the anchor height at placement time.
		const activeEffect = new KfcEffect(
			{ showBurstFloorDebug: debug },
			{
				onPhase: (phase) => (kfc.phase = phase),
				onProgress: (ratio) => (kfc.loadProgress = ratio),
				onBurst: () => kfc.burstCount++
			}
		)
		fx = activeEffect
		activeEffect.timeScale = EFFECT_TIME_SCALE
		activeEffect.root.scale.setScalar(EFFECT_SCALE)
		activeEffect.root.visible = false
		activePlacer.wallGroup.add(activeEffect.root)

		scene.add(group)

		// Hidden until the coach marker is confirmed. untrack keeps this setup
		// effect from re-running (and rebuilding the scene) on reveal.
		group.visible = untrack(() => xr.contentVisible)
		const activeGroup = group

		// ── Placement helpers -------------------------------------------------
		const [kx, ky, kz] = KEY_LIGHT.offset

		const placeCastle = (anchor: THREE.Vector3) => {
			activeEffect.root.position.copy(anchor)
			activeEffect.root.visible = true
			// Burst bodies / particles must land on the real floor (world y = 0):
			// the effect's floor is `anchor.y` below its origin, in local units.
			activeEffect.setConfig({ burstFloorY: -anchor.y / EFFECT_SCALE })
			key.position.set(anchor.x + kx, anchor.y + ky, anchor.z + kz)
			key.target.position.copy(anchor)
			activePlacer.setDebug(debug)
			activeEffect.startEntrance()
			kfc.stage = 'play'
		}

		restart = () => {
			activePlacer.reset()
			activeEffect.root.visible = false // placeCastle() resets + restarts it
			kfc.stage = 'wall'
			kfc.aimValid = false
			kfc.burstCount = 0
		}

		// ── Load the GLBs, then pre-compile with the group briefly visible. That
		//    block is synchronous, so no frame renders in between.
		let cancelled = false
		activeEffect
			.load()
			.then(() => {
				if (cancelled) return
				const wasVisible = activeGroup.visible
				const fxWasVisible = activeEffect.root.visible
				activeGroup.visible = true
				activeEffect.root.visible = true
				renderer.compile(scene, camera)
				activeEffect.root.visible = fxWasVisible
				activeGroup.visible = wasVisible
				kfc.loaded = true
			})
			.catch((error: unknown) => {
				if (cancelled) return
				kfc.error = error instanceof Error ? error.message : String(error)
			})

		// ── Per-frame update, synced with the XR8 render loop.
		const clock = new THREE.Clock()
		XR8.addCameraPipelineModule({
			name: UPDATE_MODULE_NAME,
			onUpdate: () => {
				const dt = clock.getDelta()
				if (!activeGroup.visible) return
				activePlacer.update(camera)
				if (kfc.aimValid !== activePlacer.aimValid) kfc.aimValid = activePlacer.aimValid
				if (activePlacer.stage === 'play') activeEffect.update(dt)
			}
		})

		// ── Taps: confirm wall → confirm castle → burst.
		const raycaster = new THREE.Raycaster()
		const ndc = new THREE.Vector2()
		const canvas = renderer.domElement
		const onPointerDown = (event: PointerEvent) => {
			if (!activeGroup.visible) return

			if (activePlacer.stage === 'wall') {
				if (activePlacer.confirmWall()) kfc.stage = 'castle'
				return
			}
			if (activePlacer.stage === 'castle') {
				if (!activeEffect.isLoaded) return
				const anchor = activePlacer.confirmCastle()
				if (anchor) placeCastle(anchor)
				return
			}

			// stage play → raycast against castle / box walls.
			if (!activeEffect.isLoaded) return
			const rect = canvas.getBoundingClientRect()
			ndc.set(
				((event.clientX - rect.left) / rect.width) * 2 - 1,
				-((event.clientY - rect.top) / rect.height) * 2 + 1
			)
			raycaster.setFromCamera(ndc, camera)
			const hits = raycaster.intersectObjects(activeEffect.getTapTargets(), true)
			if (hits.length > 0) activeEffect.triggerBurst()
		}
		canvas.addEventListener('pointerdown', onPointerDown)

		return () => {
			cancelled = true
			canvas.removeEventListener('pointerdown', onPointerDown)
			XR8.removeCameraPipelineModule(UPDATE_MODULE_NAME)

			activeEffect.dispose()
			activePlacer.dispose()
			scene.remove(activeGroup)
			key.dispose()

			if (scene.environment === envTexture) {
				scene.environment = previousEnvironment
				scene.environmentIntensity = previousEnvironmentIntensity
			}
			envTexture.dispose()

			kfc.reset()
			restart = undefined
			fx = undefined
			group = undefined
		}
	})

	// Reveal / hide reactively; every reveal or recenter ("다시 배치") restarts
	// the placement flow from the floor line.
	$effect(() => {
		const visible = xr.contentVisible
		void xr.recenterCount
		if (!group) return
		group.visible = visible
		if (visible && fx?.isLoaded) restart?.()
	})
</script>
