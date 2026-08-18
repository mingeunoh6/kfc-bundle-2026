<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	DesktopLanding — shown instead of the AR flow when the visitor is on a desktop
	browser (no rear camera / SLAM). Replaces the 8th Wall landing-page module
	(and its "Powered by 8th Wall" footer) with a KFC-styled QR handoff: scan the
	code with a phone to open this same URL there.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments'
	import titleUrl from '$lib/assets/artitle.png'
	import logoUrl from '$lib/assets/kfc_logo_white.png'

	const url = typeof window !== 'undefined' ? window.location.href : ''
	const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

	let copied = $state(false)

	// Draws the QR code into the canvas (lazy-loaded lib, client only).
	const qr: Attachment<HTMLCanvasElement> = (canvas) => {
		let cancelled = false
		import('qrcode').then(({ default: QRCode }) => {
			if (cancelled) return
			QRCode.toCanvas(canvas, url, {
				width: 260,
				margin: 1,
				errorCorrectionLevel: 'M',
				color: { dark: '#111111', light: '#ffffff' }
			})
		})
		return () => {
			cancelled = true
		}
	}

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url)
			copied = true
			setTimeout(() => (copied = false), 1600)
		} catch {
			/* clipboard unavailable — ignore */
		}
	}
</script>

<div class="landing">
	<header class="bar">
		<img src={logoUrl} alt="KFC" />
		<span>수원장안DT점 · Web AR</span>
	</header>

	<main class="card">
		<img class="title" src={titleUrl} alt="KFC AR FILTER" />

		<div class="qr">
			<canvas {@attach qr} width="260" height="260" aria-label="AR 체험 QR 코드"></canvas>
			<div class="corner tl"></div>
			<div class="corner tr"></div>
			<div class="corner bl"></div>
			<div class="corner br"></div>
		</div>

		<p class="lead">모바일에서 QR 코드를 스캔하고<br />AR 체험을 시작하세요</p>
		<p class="sub">이 체험은 카메라가 있는 스마트폰에서만 동작합니다.</p>

		<button type="button" class="link" onclick={copy} title="주소 복사">
			<span class="url">{displayUrl}</span>
			<span class="copy">{copied ? '복사됨 ✓' : '복사'}</span>
		</button>
	</main>

	<footer>
		<img src={logoUrl} alt="KFC" />
		<p>
			Our food is always craveable. We are the original fried chicken experts,<br />
			and everything we do celebrates our passion for serving finger lickin' good food.
		</p>
	</footer>
</div>

<style>
	.landing {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		grid-template-rows: auto 1fr auto;
		background:
			radial-gradient(120% 80% at 50% 0%, #2a0407 0%, #0d0000 55%, #000 100%);
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
		overflow: auto;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.8rem 1.5rem;
		background: linear-gradient(94deg, #eb1c11 0%, #ed2e24 100%);
		font-weight: 800;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}

	.bar img {
		height: 22px;
	}

	.card {
		align-self: center;
		justify-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		width: min(92vw, 30rem);
		padding: 2rem 2rem 1.75rem;
		border-radius: 1.25rem;
		background: rgb(255 255 255 / 5%);
		border: 1px solid rgb(255 255 255 / 12%);
		box-shadow: 0 30px 80px rgb(0 0 0 / 55%);
		text-align: center;
	}

	.title {
		width: 55%;
		max-width: 12rem;
	}

	.qr {
		position: relative;
		padding: 0.9rem;
		border-radius: 1rem;
		background: #fff;
	}

	.qr canvas {
		display: block;
		width: 260px;
		height: 260px;
		border-radius: 0.5rem;
	}

	.corner {
		position: absolute;
		width: 1.4rem;
		height: 1.4rem;
		border: 4px solid #e1021f;
		border-radius: 3px;
	}

	.corner.tl {
		top: -8px;
		left: -8px;
		border-right: none;
		border-bottom: none;
	}

	.corner.tr {
		top: -8px;
		right: -8px;
		border-left: none;
		border-bottom: none;
	}

	.corner.bl {
		bottom: -8px;
		left: -8px;
		border-right: none;
		border-top: none;
	}

	.corner.br {
		bottom: -8px;
		right: -8px;
		border-left: none;
		border-top: none;
	}

	.lead {
		margin: 0.4rem 0 0;
		font-size: 1.2rem;
		font-weight: 800;
		line-height: 1.45;
	}

	.sub {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.link {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.3rem;
		padding: 0.5rem 0.6rem 0.5rem 1rem;
		border: 1px solid rgb(255 255 255 / 25%);
		border-radius: 999px;
		background: rgb(0 0 0 / 40%);
		color: #fff;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.link .url {
		max-width: 18rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.85;
	}

	.link .copy {
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: #e1021f;
		font-weight: 800;
		font-size: 0.75rem;
	}

	footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
		text-align: center;
	}

	footer img {
		height: 18px;
	}

	footer p {
		margin: 0;
		padding: 4px;
		font-size: 10px;
		font-weight: 500;
		line-height: 1.4;
		opacity: 0.7;
	}
</style>
