<!--
	KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
	Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
	redistribution of this source code is prohibited. See LICENSE.md.
-->
<!--
	Splash — custom loading screen shown while the 8th Wall engine downloads and
	the camera session starts. Replaces XRExtras.Loading.pipelineModule() (the
	default 8th Wall spinner + logo), which is intentionally NOT registered in
	ARScene.svelte.
-->
<div class="splash">
	<p>카메라를 준비하고 있어요…</p>
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
