// Minimal type surface of the 8th Wall open-source engine (https://github.com/8thwall/8thwall)
// covering the APIs used by this template. The engine binary attaches `XR8`, `XRExtras`
// and `LandingPage` to `window` when its script tags finish loading.

import type * as THREE from 'three'

/** A camera pipeline module, as consumed by XR8.addCameraPipelineModules(). */
export interface CameraPipelineModule {
	name: string
	onStart?: (args: { canvas: HTMLCanvasElement }) => void
	onUpdate?: (args: { processCpuResult: unknown }) => void
	onDetach?: () => void
	[hook: string]: unknown
}

/** The three.js scene owned by XR8.Threejs.pipelineModule(). */
export interface XrThreejsScene {
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer
}

export interface XR8Api {
	addCameraPipelineModule: (module: CameraPipelineModule) => void
	addCameraPipelineModules: (modules: CameraPipelineModule[]) => void
	removeCameraPipelineModule: (moduleOrName: CameraPipelineModule | string) => void
	clearCameraPipelineModules: () => void
	run: (config: { canvas: HTMLCanvasElement; allowedDevices?: unknown }) => void
	stop: () => void
	isPaused: () => boolean
	pause: () => void
	resume: () => void
	GlTextureRenderer: { pipelineModule: () => CameraPipelineModule }
	Threejs: {
		pipelineModule: () => CameraPipelineModule
		xrScene: () => XrThreejsScene
	}
	XrController: {
		pipelineModule: () => CameraPipelineModule
		updateCameraProjectionMatrix: (args: {
			origin: THREE.Vector3
			facing: THREE.Quaternion
		}) => void
		recenter: () => void
	}
	XrConfig: { device: () => { ANY: unknown; MOBILE: unknown } }
}

export interface XRExtrasApi {
	FullWindowCanvas: { pipelineModule: () => CameraPipelineModule }
	Loading: { pipelineModule: () => CameraPipelineModule }
	RuntimeError: { pipelineModule: () => CameraPipelineModule }
}

export interface LandingPageApi {
	pipelineModule: () => CameraPipelineModule
}

declare global {
	interface Window {
		XR8?: XR8Api
		XRExtras?: XRExtrasApi
		LandingPage?: LandingPageApi
		THREE?: typeof THREE
	}
}
