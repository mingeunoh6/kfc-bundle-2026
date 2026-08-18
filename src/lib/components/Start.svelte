<!--
	Start — the first screen the user sees. The AR session (and therefore the
	camera permission prompt + engine download) only begins after the user taps
	the start button, which calls `onstart`.
-->
<script lang="ts">
	let { onstart }: { onstart: () => void } = $props()
</script>

<div class="start">
	<button type="button" onclick={onstart}>시작하기</button>
</div>

<style>
	.start {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		background: #000;
	}

	button {
		padding: 0.9rem 2.5rem;
		border: none;
		border-radius: 999px;
		background: #ad50ff;
		color: #fff;
		font:
			600 1.1rem/1 system-ui,
			sans-serif;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	button:active {
		transform: scale(0.96);
	}
</style>
