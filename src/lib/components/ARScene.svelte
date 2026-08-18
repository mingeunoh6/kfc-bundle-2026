<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	ARScene — owns the camera-feed canvas and the 8th Wall session lifecycle.

	Mirrors app.js of the official example: register the standard pipeline modules,
	add our custom scene module, then XR8.run({canvas}). The whole session is tied
	to the canvas element via a Svelte 5 attachment — setup runs when the canvas
	mounts, the returned cleanup stops the session when it unmounts (e.g. during
	client-side navigation).
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments'
	import * as THREE from 'three'
	import { loadEngine } from '$lib/xr/engine-loader'
	import { initScenePipelineModule } from '$lib/xr/scene-pipeline'
	import { installPromptLocalizer } from '$lib/xr/prompt-localizer'
	import { xr } from '$lib/xr/xr-state.svelte'

	const arSession: Attachment<HTMLCanvasElement> = (canvas) => {
		let disposed = false
		// Localize the engine's own DOM prompts (iOS motion-sensor permission box).
		const uninstallLocalizer = installPromptLocalizer()

		const start = async () => {
			xr.status = 'loading'
			try {
				// XR8.Threejs.pipelineModule() picks up the app's three.js instance
				// from the global scope — same as the official example.
				window.THREE = THREE

				const XR8 = await loadEngine()
				if (disposed) return

				xr.status = 'starting'
				XR8.addCameraPipelineModules([
					XR8.GlTextureRenderer.pipelineModule(), // Draws the camera feed.
					XR8.Threejs.pipelineModule(), // Creates a three.js AR scene.
					XR8.XrController.pipelineModule(), // Enables SLAM world tracking.
					window.XRExtras!.FullWindowCanvas.pipelineModule(), // Canvas fills the window.
					// Note: XRExtras.Loading.pipelineModule() is intentionally omitted —
					// the default 8th Wall splash is replaced by our own Splash.svelte.
					window.XRExtras!.RuntimeError.pipelineModule(), // Error overlay on runtime error.
					initScenePipelineModule() // Our cube-on-the-floor scene.
				])

				XR8.run({ canvas })
			} catch (error) {
				if (!disposed) {
					xr.fail(error instanceof Error ? error.message : String(error))
				}
			}
		}

		start()

		return () => {
			disposed = true
			uninstallLocalizer()
			window.XR8?.stop()
			window.XR8?.clearCameraPipelineModules()
			xr.reset()
		}
	}
</script>

<canvas {@attach arSession} id="camerafeed"></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
	}
</style>
