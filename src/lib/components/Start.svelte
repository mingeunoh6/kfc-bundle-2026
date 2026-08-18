<!--
	Start — the first screen the user sees (port of the Mattercraft splash in
	index.html). The AR session (and therefore the camera permission prompt +
	engine download) only begins after the user taps the start button, which
	calls `onstart`.
-->
<script lang="ts">
	import titleUrl from '$lib/assets/artitle.png'
	import logoUrl from '$lib/assets/kfc_logo_white.png'

	let { onstart }: { onstart: () => void } = $props()
</script>

<div class="start">
	<div class="box">
		<img class="title" src={titleUrl} alt="KFC AR" />
		<button type="button" onclick={onstart}>시작하기!</button>
	</div>
	<div class="bottom">
		<img src={logoUrl} alt="KFC" />
		<p>
			Our food is always craveable. We are the original fried chicken experts,<br />
			and everything we do celebrates our passion for serving finger lickin' good food.
		</p>
	</div>
</div>

<style>
	.start {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		background: #000;
		color: #fff;
		font-family:
			'Pretendard Variable',
			Pretendard,
			-apple-system,
			BlinkMacSystemFont,
			system-ui,
			'Apple SD Gothic Neo',
			'Noto Sans KR',
			'Malgun Gothic',
			sans-serif;
	}

	.box {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: min(90%, 24rem);
	}

	.title {
		width: 55%;
		max-width: 14rem;
	}

	button {
		margin-top: 1.1rem;
		padding: 0.6rem 1.6rem;
		border: none;
		border-radius: 999px;
		background: linear-gradient(94deg, #eb1c11 0%, #ed2e24 100%);
		color: #fff;
		font-size: 1rem;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	button:active {
		transform: scale(0.96);
	}

	.bottom {
		position: absolute;
		bottom: max(0.5rem, env(safe-area-inset-bottom));
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		text-align: center;
	}

	.bottom img {
		height: 20px;
	}

	.bottom p {
		margin: 0;
		padding: 4px;
		font-size: 10px;
		font-weight: 500;
		line-height: 1.4;
		opacity: 0.85;
	}
</style>
