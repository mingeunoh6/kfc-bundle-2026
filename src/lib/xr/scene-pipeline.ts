// Custom camera pipeline module, ported from `threejs-scene-init.js` of the official
// 8th Wall example (8thwall/threejs-world-effects-example).
//
// It configures the three.js scene owned by XR8.Threejs.pipelineModule() — renderer,
// initial camera pose and SLAM projection sync. The actual scene content (virtual
// wall + KFC effect, lights) lives in MainScene.svelte, which mounts invisibly once
// the camera is running and is revealed from the coach marker.
//
// Note: the template's tap-anywhere-to-recenter is intentionally gone — taps are
// raycast against the castle in MainScene to fire the burst. Recentering is
// exposed as an explicit button in MainUI instead.

import * as THREE from 'three'
import { CAMERA_HEIGHT } from '$lib/kfc/wall-layout'
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
		renderer.shadowMap.type = THREE.PCFSoftShadowMap

		// Initial camera pose: standing at the origin, CAMERA_HEIGHT above the
		// floor (y = 0), looking down -Z. recenter() returns the camera to this
		// pose, so the virtual wall at z = -WALL_DISTANCE is always in front.
		camera.position.set(0, CAMERA_HEIGHT, 0)

		// Prevent scroll/pinch gestures from panning the page over the canvas.
		canvas.addEventListener('touchmove', (event) => event.preventDefault())

		// Sync the XrController's 6DoF position and camera parameters with our scene.
		XR8.XrController.updateCameraProjectionMatrix({
			origin: camera.position,
			facing: camera.quaternion
		})

		xr.status = 'running'
	}
})
