/*!
 * KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG (Web-based AR / WebXR / AR creator).
 * Copyright (c) 2026 OOMG. All rights reserved. Unauthorized copying, use, modification or
 * redistribution of this source code is prohibited. See LICENSE.md.
 */
// Loads the 8th Wall open-source engine at runtime.
//
// The official example (threejs-world-effects-example) loads these three scripts with
// static <script> tags in index.html. In SvelteKit we inject them from the browser
// instead, so the engine is only fetched on pages that actually use AR and SSR stays
// untouched.
//
//   engine-binary  — the XR engine + SLAM (binary-licensed, free for commercial use)
//   xrextras       — loading screen, full-window canvas, runtime error overlays (MIT)
//   landing-page   — desktop landing page with QR code handoff to mobile (MIT)

import { browser } from '$app/environment'
import type { XR8Api } from './types'

const ENGINE_SCRIPTS: { src: string; attrs: Record<string, string> }[] = [
	{
		src: 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js',
		attrs: { 'data-preload-chunks': 'slam' }
	},
	{ src: 'https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js', attrs: {} },
	{ src: 'https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1/dist/landing-page.js', attrs: {} }
]

let loadPromise: Promise<XR8Api> | null = null

const injectScript = (src: string, attrs: Record<string, string>) =>
	new Promise<void>((resolve, reject) => {
		const existing = document.querySelector(`script[src="${src}"]`)
		if (existing) {
			resolve()
			return
		}
		const script = document.createElement('script')
		script.src = src
		script.async = true
		script.crossOrigin = 'anonymous'
		for (const [key, value] of Object.entries(attrs)) {
			script.setAttribute(key, value)
		}
		script.addEventListener('load', () => resolve())
		script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
		document.head.appendChild(script)
	})

/**
 * Injects the engine script tags (once) and resolves with the global XR8 API
 * after the engine fires its `xrloaded` event.
 */
export function loadEngine(): Promise<XR8Api> {
	if (!browser) {
		return Promise.reject(new Error('The 8th Wall engine can only load in the browser'))
	}
	loadPromise ??= (async () => {
		await Promise.all(ENGINE_SCRIPTS.map(({ src, attrs }) => injectScript(src, attrs)))
		if (window.XR8) return window.XR8
		return new Promise<XR8Api>((resolve) => {
			window.addEventListener('xrloaded', () => resolve(window.XR8!), { once: true })
		})
	})()
	return loadPromise
}
