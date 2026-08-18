/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Reactive state of the KFC experience, shared between MainScene (which drives
// the three.js effect + wall placement) and the UI components.

import type { KfcPhase } from './KfcEffect'
import type { PlacementStage } from './wall-placer'

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

	/** Vertical Wall AR placement stage (see docs/VERTICAL_WALL_AR.md). */
	stage = $state<PlacementStage>('wall')
	/** Whether the centre ray currently hits the floor (stage wall) / wall (stage castle). */
	aimValid = $state(false)

	readonly canTap = $derived(
		this.stage === 'play' && (this.phase === 'idle' || this.phase === 'burst')
	)

	reset() {
		this.loadProgress = 0
		this.loaded = false
		this.phase = 'loading'
		this.burstCount = 0
		this.error = null
		this.stage = 'wall'
		this.aimValid = false
	}
}

export const kfc = new KfcState()
