<!--
	MainUI — the UI layer rendered together with MainScene once the AR content is
	revealed. Ports the in-experience UI of the Mattercraft scene:
	  • touch guide ("성을 터치해보세요") until the first burst — replaces the
	    arrowtext.png / arrowmotion.mp4 hint that was visible in the "On" state;
	  • KFC app CTA at the bottom after the first burst — replaces the
	    Lottie + phrase + LaunchURL block of the "idle" state;
	  • "다시 배치" — recenters the SLAM origin so the virtual wall is placed
	    in front of the user again and the entrance replays.
-->
<script lang="ts">
	import { xr } from '$lib/xr/xr-state.svelte'
	import { kfc } from '$lib/kfc/kfc-state.svelte'
	import touchGuideUrl from '$lib/assets/touch_guide.png'

	const KFC_APP_URL =
		'https://kfckr.airbridge.io/braze/signup?airbridge_referrer=airbridge%3Dtrue%26client_id%3D7eecfe93-e4fa-42eb-82f9-2d4b1dfd4bea%26event_uuid%3Df0efc2e1-9354-4dfe-86e3-5c142aa0324f%26referrer_timestamp%3D1778780090852%26short_id%3Dvseii9%26channel%3Dhomepage_web%26campaign%3Dapp_download_QR%26tracking_template_id%3Dedc49716cb675d79bc707cae26a20aa9&https_deeplink=true&short_id=vseii9'

	const showTouchGuide = $derived(kfc.canTap && kfc.burstCount === 0)
	const showCta = $derived(kfc.burstCount > 0)

	const recenter = () => {
		window.XR8?.XrController.recenter()
		xr.recenterCount++
	}
</script>

<div class="main-ui">
	<button type="button" class="recenter" onclick={recenter} aria-label="다시 배치">
		다시 배치
	</button>

	{#if kfc.phase === 'entrance'}
		<div class="hint">
			<p>벽면에 작품이 나타나고 있어요…</p>
		</div>
	{:else if showTouchGuide}
		<div class="hint guide">
			<img src={touchGuideUrl} alt="" />
			<p>성을 터치해보세요!</p>
		</div>
	{/if}

	{#if showCta}
		<div class="cta">
			<a href={KFC_APP_URL} target="_blank" rel="noopener noreferrer">
				앱으로 이동하여 다양한 혜택을 누리세요!
			</a>
		</div>
	{/if}
</div>

<style>
	.main-ui {
		position: fixed;
		inset: 0;
		z-index: 10;
		/* The layer itself must not block taps reaching the AR canvas. */
		pointer-events: none;
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

	.recenter {
		position: absolute;
		top: max(0.9rem, env(safe-area-inset-top));
		right: max(0.9rem, env(safe-area-inset-right));
		padding: 0.5rem 0.9rem;
		border: 1px solid rgb(255 255 255 / 40%);
		border-radius: 999px;
		background: rgb(0 0 0 / 45%);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 600;
		font-family: inherit;
		backdrop-filter: blur(6px);
		pointer-events: auto;
		cursor: pointer;
	}

	.recenter:active {
		transform: scale(0.96);
	}

	.hint {
		position: absolute;
		bottom: max(4.5rem, calc(env(safe-area-inset-bottom) + 3.5rem));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.1rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 55%);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
		backdrop-filter: blur(6px);
	}

	.guide {
		border-radius: 1rem;
		padding: 0.8rem 1.4rem;
		animation: pulse 1.6s ease-in-out infinite;
	}

	.guide img {
		height: 2.2rem;
		opacity: 0.9;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: translateX(-50%) scale(1);
		}
		50% {
			transform: translateX(-50%) scale(1.05);
		}
	}

	.cta {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #000;
		padding-bottom: env(safe-area-inset-bottom);
		animation: slide-up 0.6s ease-out;
		pointer-events: auto;
	}

	.cta a {
		display: block;
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem 0.5rem;
		background: #e1021f;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 800;
		text-align: center;
		text-decoration: none;
	}

	@keyframes slide-up {
		from {
			translate: 0 100%;
		}
		to {
			translate: 0 0;
		}
	}

	p {
		margin: 0;
	}
</style>
