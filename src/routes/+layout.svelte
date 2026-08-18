<script lang="ts">
	import favicon from '$lib/assets/favicon.svg'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
</svelte:head>

{@render children()}

<style>
	/* Full-viewport AR app — no scrolling, no margins (port of index.css from the
	   official 8th Wall example). */
	:global(html, body) {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: #000;
	}

	/* ── 8th Wall engine prompt (iOS motion-sensor permission), restyled to the
	   KFC look. The engine injects its own stylesheet at the top of <head>, so
	   these later rules win; !important guards against ordering surprises.
	   Copy is localized in $lib/xr/prompt-localizer.ts. */
	:global(.prompt-box-8w) {
		width: min(20rem, calc(100vw - 3rem)) !important;
		padding: 1.25rem 1.25rem 1.1rem !important;
		border-radius: 0.6rem !important;
		background: rgb(0 0 0 / 60%) !important;
		color: #fff !important;
		font-family:
			'Pretendard Variable',
			Pretendard,
			-apple-system,
			BlinkMacSystemFont,
			system-ui,
			'Apple SD Gothic Neo',
			'Noto Sans KR',
			'Malgun Gothic',
			sans-serif !important;
		font-size: 1rem !important;
		filter: none !important;
		box-shadow: 0 0 12px 3px rgb(255 255 255 / 45%) !important;
		backdrop-filter: blur(10px);
	}

	:global(.prompt-box-8w p) {
		margin: 0 0 1rem !important;
		font-weight: 600 !important;
		line-height: 1.5 !important;
	}

	:global(.prompt-box-8w .prompt-button-8w) {
		padding: 0.7rem 0 !important;
		border-radius: 999px !important;
		background: rgb(255 255 255 / 18%) !important;
		color: #fff !important;
		font-weight: 800 !important;
		font-size: 0.95rem !important;
	}

	:global(.prompt-box-8w .button-primary-8w) {
		background: linear-gradient(94deg, #eb1c11 0%, #ed2e24 100%) !important;
	}
</style>
