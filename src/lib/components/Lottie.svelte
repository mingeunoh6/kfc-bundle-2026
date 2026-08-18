<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	Lottie — thin wrapper around lottie-web (port of Mattercraft's LottieAnimation).
	Loads the animation JSON from `src` (a URL, e.g. /lottie/coach2.json) into a
	div via a Svelte attachment; the animation is destroyed when the element unmounts.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments'
	import type { AnimationItem } from 'lottie-web'

	let {
		src,
		loop = true,
		autoplay = true,
		class: className = ''
	}: { src: string; loop?: boolean; autoplay?: boolean; class?: string } = $props()

	// lottie-web touches `document` at import time, so it is loaded lazily on the
	// client only (the page shell is prerendered for SEO).
	const lottieAttachment: Attachment<HTMLDivElement> = (container) => {
		let animation: AnimationItem | undefined
		let cancelled = false
		import('lottie-web').then(({ default: lottie }) => {
			if (cancelled) return
			animation = lottie.loadAnimation({
				container,
				renderer: 'svg',
				loop,
				autoplay,
				path: src,
				rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
			})
		})
		return () => {
			cancelled = true
			animation?.destroy()
		}
	}
</script>

<div class="lottie {className}" {@attach lottieAttachment} aria-hidden="true"></div>

<style>
	.lottie {
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.lottie :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
