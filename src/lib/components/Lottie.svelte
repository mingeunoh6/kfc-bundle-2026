<!--
	Lottie — thin wrapper around lottie-web (port of Mattercraft's LottieAnimation).
	Loads the animation JSON from `src` (a URL, e.g. /lottie/coach2.json) into a
	div via a Svelte attachment; the animation is destroyed when the element unmounts.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments'
	import lottie from 'lottie-web'

	let {
		src,
		loop = true,
		autoplay = true,
		class: className = ''
	}: { src: string; loop?: boolean; autoplay?: boolean; class?: string } = $props()

	const lottieAttachment: Attachment<HTMLDivElement> = (container) => {
		const animation = lottie.loadAnimation({
			container,
			renderer: 'svg',
			loop,
			autoplay,
			path: src,
			rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
		})
		return () => animation.destroy()
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
