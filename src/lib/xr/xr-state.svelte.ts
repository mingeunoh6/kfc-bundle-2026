/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Reactive AR session state, shared app-wide via Svelte 5 runes.
// Any component can `import { xr } from '$lib/xr/xr-state.svelte'` and read
// `xr.status` etc. inside markup or $derived/$effect — updates are fully reactive.

export type XrStatus = 'idle' | 'loading' | 'starting' | 'running' | 'error'

class XrState {
	/** Lifecycle of the engine + camera session. */
	status = $state<XrStatus>('idle')
	/** Human-readable error, set when status === 'error'. */
	error = $state<string | null>(null)
	/** Incremented every time the user recenters the scene. */
	recenterCount = $state(0)
	/**
	 * Whether the AR content (MainScene) is visible. The scene is mounted and
	 * pre-compiled while the coach marker is up, then revealed when the user
	 * confirms — so the reveal is instant even for heavy scenes.
	 */
	contentVisible = $state(false)

	readonly isRunning = $derived(this.status === 'running')

	reset() {
		this.status = 'idle'
		this.error = null
		this.recenterCount = 0
		this.contentVisible = false
	}

	fail(message: string) {
		this.status = 'error'
		this.error = message
	}
}

export const xr = new XrState()
