<!--
	Coach — coach marker popup shown once the camera feed is live. It explains the
	AR interaction, and on confirm: recenters the SLAM origin (so content appears
	right in front of the user) and reveals the pre-compiled MainScene.
-->
<script lang="ts">
	import { xr } from '$lib/xr/xr-state.svelte'

	const begin = () => {
		// Place the scene origin in front of where the user is pointing right now,
		// then reveal the already-compiled content — no jank on first frame.
		window.XR8?.XrController.recenter()
		xr.recenterCount++
		xr.contentVisible = true
	}
</script>

<div class="backdrop">
	<div class="coach" role="dialog" aria-modal="true" aria-label="AR 안내">
		<div class="icon" aria-hidden="true">👆</div>
		<p>화면을 탭하면 카메라가 새로 정렬됩니다.</p>
		<button type="button" onclick={begin}>시작하기</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 25;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgb(0 0 0 / 45%);
	}

	.coach {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: min(100%, 20rem);
		padding: 1.75rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom) * 0.5);
		border-radius: 1.25rem;
		background: rgb(20 20 24 / 92%);
		color: #fff;
		text-align: center;
		backdrop-filter: blur(10px);
		box-shadow: 0 12px 40px rgb(0 0 0 / 40%);
	}

	.icon {
		font-size: 2rem;
	}

	p {
		margin: 0;
		font:
			500 1rem/1.5 system-ui,
			sans-serif;
	}

	button {
		width: 100%;
		padding: 0.85rem 0;
		border: none;
		border-radius: 999px;
		background: #ad50ff;
		color: #fff;
		font:
			600 1.05rem/1 system-ui,
			sans-serif;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	button:active {
		transform: scale(0.97);
	}
</style>
