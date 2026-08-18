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
	<title>KFC AR</title>
	<meta name="description" content="KFC 캐슬 AR — 8th Wall 월드 트래킹으로 벽면에 나타나는 KFC 성과 치킨 버스트 연출." />
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
