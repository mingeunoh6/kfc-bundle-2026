<!--
	Splash — custom loading screen shown while the 8th Wall engine downloads and
	the camera session starts. Replaces XRExtras.Loading.pipelineModule() (the
	default 8th Wall spinner + logo), which is intentionally NOT registered in
	ARScene.svelte.
-->
<div class="splash">
	<p>로딩중..</p>
</div>

<style>
	.splash {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		background: #000;
		color: #fff;
		font:
			500 1.1rem/1 system-ui,
			sans-serif;
	}

	p {
		margin: 0;
	}
</style>
