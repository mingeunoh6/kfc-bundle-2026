<script lang="ts">
	import ARScene from '$lib/components/ARScene.svelte'
	import ArHud from '$lib/components/ArHud.svelte'
	import Coach from '$lib/components/Coach.svelte'
	import MainScene from '$lib/components/MainScene.svelte'
	import MainUI from '$lib/components/MainUI.svelte'
	import Splash from '$lib/components/Splash.svelte'
	import Start from '$lib/components/Start.svelte'
	import { xr } from '$lib/xr/xr-state.svelte'

	// The AR session only mounts after the user taps 시작하기 on the start screen.
	let started = $state(false)

	// Custom splash covers the screen from tap until the camera feed is running.
	const showSplash = $derived(
		started && (xr.status === 'loading' || xr.status === 'starting')
	)
</script>

<svelte:head>
	<title>8th Wall × SvelteKit — World Tracking</title>
	<meta name="description" content="A cube augmented on the floor with 8th Wall SLAM world tracking, built with SvelteKit and Svelte 5 runes." />
</svelte:head>

{#if !started}
	<Start onstart={() => (started = true)} />
{:else}
	<ARScene />
	<ArHud />
	{#if xr.isRunning}
		<!-- MainScene mounts immediately (invisible + pre-compiled); the coach
		     marker sits on top until the user confirms, then recenter + reveal. -->
		<MainScene />
		{#if xr.contentVisible}
			<MainUI />
		{:else}
			<Coach />
		{/if}
	{/if}
	{#if showSplash}
		<Splash />
	{/if}
{/if}
