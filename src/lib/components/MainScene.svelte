<!--
	MainScene — the KFC AR content (renderless component).

	Builds, under the XR8 three.js scene:
	  • an invisible virtual wall (BoxGeometry + ShadowMaterial) standing
	    WALL_DISTANCE m in front of the SLAM origin — the world-tracking stand-in
	    for the Immersal-anchored real store wall of the original build;
	  • the KfcEffect (castle entrance → box walls → tap-to-burst) attached to
	    the wall's front face at WALL_ANCHOR_HEIGHT;
	  • lights + a floor shadow catcher.

	Mounted as soon as the camera feed is running, while the coach marker is still
	on screen: the GLBs download and the scene is pre-compiled invisibly, so that
	revealing it (Coach → recenter → xr.contentVisible = true) is instant and the
	entrance animation starts on a warmed-up GPU.

	Taps on the castle / box walls are raycast here and fire the burst.
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import * as THREE from 'three'
	import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
	import { xr } from '$lib/xr/xr-state.svelte'
	import { kfc } from '$lib/kfc/kfc-state.svelte'
	import { KfcEffect } from '$lib/kfc/KfcEffect'
	import { EFFECT_SCALE } from '$lib/kfc/kfc-config'
	import {
		KEY_LIGHT,
		WALL_ANCHOR_HEIGHT,
		WALL_DISTANCE,
		WALL_HEIGHT,
		WALL_SHADOW_OPACITY,
		WALL_THICKNESS,
		WALL_WIDTH
	} from '$lib/kfc/wall-layout'

	const UPDATE_MODULE_NAME = 'kfc-update'

	let group: THREE.Group | undefined
	let fx: KfcEffect | undefined

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

		// ── Key light: the Scene.zcomp DirectionalLight (warm, intensity 0.1,
		//    shadow camera ±10), placed relative to the wall anchor.
		const [kx, ky, kz] = KEY_LIGHT.offset
		const key = new THREE.DirectionalLight(new THREE.Color(...KEY_LIGHT.color), KEY_LIGHT.intensity)
		key.position.set(kx, WALL_ANCHOR_HEIGHT + ky, -WALL_DISTANCE + kz)
		key.target.position.set(0, WALL_ANCHOR_HEIGHT, -WALL_DISTANCE)
		key.castShadow = true
		key.shadow.mapSize.set(1024, 1024)
		key.shadow.camera.near = 0.1
		key.shadow.camera.far = 30
		key.shadow.camera.left = -KEY_LIGHT.shadowExtent
		key.shadow.camera.right = KEY_LIGHT.shadowExtent
		key.shadow.camera.top = KEY_LIGHT.shadowExtent
		key.shadow.camera.bottom = -KEY_LIGHT.shadowExtent
		key.shadow.bias = -0.0005
		group.add(key, key.target)

		// ── Virtual wall: a box standing on the floor, front face at z = -WALL_DISTANCE.
		//    Not rendered as a surface — only the shadows cast onto it show
		//    (ShadowMaterial, opacity of the original ShadowPlane). `?debug` in the
		//    URL tints it so it can be checked.
		const wallGroup = new THREE.Group()
		wallGroup.name = 'VirtualWallAnchor'
		wallGroup.position.set(0, 0, -WALL_DISTANCE)

		const wallGeometry = new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS)
		const wallMaterial = debug
			? new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.18 })
			: new THREE.ShadowMaterial({ opacity: WALL_SHADOW_OPACITY, transparent: true })
		const wall = new THREE.Mesh(wallGeometry, wallMaterial)
		wall.name = 'VirtualWall'
		wall.position.set(0, WALL_HEIGHT / 2, -WALL_THICKNESS / 2)
		wall.receiveShadow = true
		wallGroup.add(wall)

		// ── The KFC effect, hanging on the wall's front face. All physics/layout
		//    values are the Scene.zcomp ones (kfc-config.ts); its own shadow floor
		//    at burstFloorY doubles as the floor shadow catcher.
		fx = new KfcEffect(
			{ showBurstFloorDebug: debug },
			{
				onPhase: (phase) => (kfc.phase = phase),
				onProgress: (ratio) => (kfc.loadProgress = ratio),
				onBurst: () => kfc.burstCount++
			}
		)
		fx.root.position.set(0, WALL_ANCHOR_HEIGHT, 0)
		fx.root.scale.setScalar(EFFECT_SCALE)
		wallGroup.add(fx.root)

		group.add(wallGroup)
		scene.add(group)

		// Hidden until the coach marker is confirmed. untrack keeps this setup
		// effect from re-running (and rebuilding the scene) on reveal.
		group.visible = untrack(() => xr.contentVisible)

		// ── Load the GLBs, then pre-compile with the group briefly visible. That
		//    block is synchronous, so no frame renders in between.
		let cancelled = false
		const activeEffect = fx
		const activeGroup = group
		activeEffect
			.load()
			.then(() => {
				if (cancelled) return
				const wasVisible = activeGroup.visible
				activeGroup.visible = true
				renderer.compile(scene, camera)
				activeGroup.visible = wasVisible
				kfc.loaded = true
				// Already revealed (e.g. slow network) → start right away.
				if (untrack(() => xr.contentVisible)) activeEffect.startEntrance()
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
				if (activeGroup.visible) activeEffect.update(dt)
			}
		})

		// ── Tap on castle / box wall → burst.
		const raycaster = new THREE.Raycaster()
		const ndc = new THREE.Vector2()
		const canvas = renderer.domElement
		const onPointerDown = (event: PointerEvent) => {
			if (!activeGroup.visible || !activeEffect.isLoaded) return
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
			scene.remove(activeGroup)
			wallGeometry.dispose()
			wallMaterial.dispose()
			key.dispose()

			if (scene.environment === envTexture) {
				scene.environment = previousEnvironment
				scene.environmentIntensity = previousEnvironmentIntensity
			}
			envTexture.dispose()

			kfc.reset()
			fx = undefined
			group = undefined
		}
	})

	// Reveal / hide reactively, and (re)play the entrance on every reveal or
	// recenter ("다시 배치") so the castle always emerges from the freshly placed wall.
	$effect(() => {
		const visible = xr.contentVisible
		void xr.recenterCount
		if (!group) return
		group.visible = visible
		if (visible && fx?.isLoaded) fx.startEntrance()
	})
</script>
