<!--
	ArHud — status overlay driven by the shared rune state. The in-experience UI
	lives in MainUI.svelte; this component only surfaces errors now.
-->
<script lang="ts">
	import { xr } from '$lib/xr/xr-state.svelte'
</script>

{#if xr.status === 'error'}
	<div class="hud">
		<p>{xr.error ?? 'Something went wrong'}</p>
	</div>
{/if}

<style>
	.hud {
		position: fixed;
		bottom: max(1.25rem, env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		background: rgb(180 30 40 / 80%);
		color: #fff;
		font:
			500 0.85rem/1.4 system-ui,
			sans-serif;
		text-align: center;
		pointer-events: none;
		backdrop-filter: blur(6px);
	}

	p {
		margin: 0;
	}
</style>
