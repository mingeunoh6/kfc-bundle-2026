<!--
	MainUI — the UI layer rendered together with MainScene once the AR content is
	revealed. Holds in-experience controls and hints; grows with the app.
-->
<script lang="ts">
	import { xr } from '$lib/xr/xr-state.svelte'
</script>

<div class="main-ui">
	<div class="hint">
		<p>Tap the screen to recenter the cube</p>
		{#if xr.recenterCount > 0}
			<p class="count">Recentered ×{xr.recenterCount}</p>
		{/if}
	</div>
</div>

<style>
	.main-ui {
		position: fixed;
		inset: 0;
		z-index: 10;
		/* The layer itself must not block taps reaching the AR canvas. */
		pointer-events: none;
	}

	.hint {
		position: absolute;
		bottom: max(1.25rem, env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		padding: 0.5rem 1rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 55%);
		color: #fff;
		font:
			500 0.85rem/1.4 system-ui,
			sans-serif;
		text-align: center;
		white-space: nowrap;
		backdrop-filter: blur(6px);
	}

	.count {
		opacity: 0.7;
		font-size: 0.75rem;
	}

	p {
		margin: 0;
	}
</style>
