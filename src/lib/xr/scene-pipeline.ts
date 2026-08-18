// Custom camera pipeline module, ported from `threejs-scene-init.js` of the official
// 8th Wall example (8thwall/threejs-world-effects-example).
//
// It configures the three.js scene owned by XR8.Threejs.pipelineModule() — renderer,
// initial camera pose, SLAM projection sync and tap-to-recenter. The actual scene
// content (cube, lights, shadow plane) lives in MainScene.svelte, which mounts
// invisibly once the camera is running and is revealed from the coach marker.

import type { CameraPipelineModule } from './types'
import { xr } from './xr-state.svelte'

/**
 * Returns the pipeline module that prepares the AR scene when the camera feed starts.
 */
export const initScenePipelineModule = (): CameraPipelineModule => ({
	name: 'threejsinitscene',

	// onStart runs once the camera feed begins. XR8.Threejs.pipelineModule() has
	// already created the scene in its own onStart by the time ours is called.
	onStart: ({ canvas }) => {
		const XR8 = window.XR8!
		const { camera, renderer } = XR8.Threejs.xrScene()

		renderer.shadowMap.enabled = true

		// Initial camera pose relative to the content. Must be above y = 0 so the
		// SLAM origin starts at standing height.
		camera.position.set(0, 2, 2)

		// Prevent scroll/pinch gestures from panning the page over the canvas.
		canvas.addEventListener('touchmove', (event) => event.preventDefault())

		// Sync the XrController's 6DoF position and camera parameters with our scene.
		XR8.XrController.updateCameraProjectionMatrix({
			origin: camera.position,
			facing: camera.quaternion
		})

		// Recenter content in front of the user when the canvas is tapped.
		canvas.addEventListener(
			'touchstart',
			(event) => {
				if (event.touches.length === 1) {
					XR8.XrController.recenter()
					xr.recenterCount++
				}
			},
			true
		)

		xr.status = 'running'
	}
})
