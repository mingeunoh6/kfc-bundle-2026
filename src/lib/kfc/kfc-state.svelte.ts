// Reactive state of the KFC experience, shared between MainScene (which drives
// the three.js effect) and the UI components (Coach button, MainUI hints).

import type { KfcPhase } from './KfcEffect'

class KfcState {
	/** GLB download progress 0..1 while the effect is loading. */
	loadProgress = $state(0)
	/** True once all models are loaded and the scene graph is built. */
	loaded = $state(false)
	/** Mirrors KfcEffect.phase. */
	phase = $state<KfcPhase>('loading')
	/** Number of bursts fired in this session (0 = show the "tap the castle" hint). */
	burstCount = $state(0)
	/** Load / runtime error, if any. */
	error = $state<string | null>(null)

	readonly canTap = $derived(this.phase === 'idle' || this.phase === 'burst')

	reset() {
		this.loadProgress = 0
		this.loaded = false
		this.phase = 'loading'
		this.burstCount = 0
		this.error = null
	}
}

export const kfc = new KfcState()
