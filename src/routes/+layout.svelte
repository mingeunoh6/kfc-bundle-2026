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
</style>
