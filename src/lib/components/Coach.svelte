<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	Coach — coach marker popup shown once the camera feed is live. Explains the
	interaction, and on confirm: recenters the SLAM origin (so the virtual wall is
	placed straight in front of the user) and reveals the pre-compiled MainScene.

	The start button stays disabled until the KFC models have finished loading
	(MainScene downloads them in the background while this popup is up).
-->
<script lang="ts">
	import { xr } from '$lib/xr/xr-state.svelte'
	import { kfc } from '$lib/kfc/kfc-state.svelte'
	import logoUrl from '$lib/assets/kfc_logo_white.png'
	import Lottie from './Lottie.svelte'

	const progressPct = $derived(Math.round(kfc.loadProgress * 100))

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
		<div class="title">작품 감상 TIP!</div>
		<Lottie src="/lottie/coach2.json" class="guide" />
		<div class="body">
			<p class="main">벽면의 조형물 앞에 서서<br />시작하기를 눌러주세요</p>
			<p class="sub">
				① 흰 선을 벽 아래에 맞춰 탭 → ② 빨간 원을 조형물에 맞춰 탭<br />
				모바일 화면을 상하좌우로 움직여 작품을 즐겨보세요.
			</p>
			{#if kfc.error}
				<p class="error">모델을 불러오지 못했습니다.<br />{kfc.error}</p>
			{/if}
			<button type="button" onclick={begin} disabled={!kfc.loaded || !!kfc.error}>
				{#if kfc.loaded}
					시작하기
				{:else}
					불러오는 중… {progressPct}%
				{/if}
			</button>
		</div>
		<div class="logo">
			<img src={logoUrl} alt="KFC" />
		</div>
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
		width: min(100%, 22rem);
		border-radius: 0.6rem;
		overflow: hidden;
		background: rgb(0 0 0 / 55%);
		color: #fff;
		text-align: center;
		backdrop-filter: blur(10px);
		box-shadow: 0 0 12px 3px rgb(255 255 255 / 45%);
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

	.title {
		padding: 0.6rem 1.25rem;
		background: rgb(206 21 21);
		font-weight: 800;
		font-size: 0.95rem;
	}

	.coach :global(.guide) {
		width: 100%;
		aspect-ratio: 1;
		max-height: 40vh;
		opacity: 0.7;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.25rem 1.25rem;
	}

	p {
		margin: 0;
	}

	.main {
		font-weight: 700;
		font-size: 1rem;
		line-height: 1.5;
	}

	.sub {
		font-size: 0.8rem;
		line-height: 1.5;
		opacity: 0.85;
	}

	.error {
		font-size: 0.75rem;
		color: #ffb4b4;
	}

	button {
		margin-top: 0.4rem;
		width: 100%;
		padding: 0.85rem 0;
		border: none;
		border-radius: 999px;
		background: linear-gradient(94deg, #eb1c11 0%, #ed2e24 100%);
		color: #fff;
		font:
			800 1.05rem/1 inherit;
		font-family: inherit;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.2s ease;
	}

	button:disabled {
		opacity: 0.55;
		cursor: default;
	}

	button:not(:disabled):active {
		transform: scale(0.97);
	}

	.logo {
		display: flex;
		justify-content: center;
		align-items: center;
		background: #000;
	}

	.logo img {
		height: 14px;
		padding: 6px 0;
	}
</style>
