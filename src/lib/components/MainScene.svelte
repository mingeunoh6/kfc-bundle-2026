<!--
	MainScene — the actual three.js content rendered in AR (renderless component).

	Mounted as soon as the camera feed is running, while the coach marker is still
	on screen. The content group is added to the XR8 scene invisibly and
	pre-compiled (renderer.compile uploads shaders/textures to the GPU), so that
	revealing it later is instant even for heavy scenes.

	Revealing = Coach.svelte sets `xr.contentVisible = true` right after a
	recenter() — the group becomes visible already positioned in front of the user.
-->
<script lang="ts">
	import { untrack } from 'svelte'
	import * as THREE from 'three'
	import { xr } from '$lib/xr/xr-state.svelte'
	import cubeTextureUrl from '$lib/assets/cube-texture.png'

	const PURPLE = 0xad50ff

	let group: THREE.Group | undefined

	// Build the content once and pre-compile it while the coach marker is up.
	$effect(() => {
		const XR8 = window.XR8
		if (!XR8) return
		const { scene, camera, renderer } = XR8.Threejs.xrScene()

		group = new THREE.Group()

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
		directionalLight.position.set(5, 10, 7)
		directionalLight.castShadow = true
		group.add(directionalLight)

		// The demo cube: 1m per side, sitting on the ground (y = 0), casting a shadow.
		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
				map: new THREE.TextureLoader().load(cubeTextureUrl),
				color: new THREE.Color(PURPLE)
			})
		)
		cube.position.set(0, 0.5, 0)
		cube.castShadow = true
		group.add(cube)

		// Invisible plane that only renders the shadow the cube drops on the floor.
		const planeGeometry = new THREE.PlaneGeometry(2000, 2000)
		planeGeometry.rotateX(-Math.PI / 2)
		const plane = new THREE.Mesh(planeGeometry, new THREE.ShadowMaterial({ opacity: 0.67 }))
		plane.receiveShadow = true
		group.add(plane)

		scene.add(group)

		// Pre-compile with the group briefly visible. This block is synchronous, so
		// no frame can render in between — the user never sees it. untrack keeps
		// this setup effect from re-running (and rebuilding the scene) on reveal.
		group.visible = true
		renderer.compile(scene, camera)
		group.visible = untrack(() => xr.contentVisible)

		return () => {
			scene.remove(group!)
			group!.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry.dispose()
					const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
					for (const material of materials) {
						if ('map' in material && material.map instanceof THREE.Texture) {
							material.map.dispose()
						}
						material.dispose()
					}
				}
			})
			group = undefined
		}
	})

	// Reveal / hide reactively.
	$effect(() => {
		if (group) group.visible = xr.contentVisible
	})
</script>
