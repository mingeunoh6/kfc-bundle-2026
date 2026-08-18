import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, type Plugin } from 'vite';

// `npm run dev -- --host` exposes the server on the LAN for phone testing. Camera
// access needs a secure context there, so the presence of --host switches dev to
// https (self-signed cert) automatically.
const exposedToNetwork = process.argv.includes('--host');

// Creator / copyright banner kept at the top of every built JS chunk (the `/*!`
// form is preserved by the minifier). Source: src/lib/site.ts CREATOR.
const BANNER =
	'/*! KFC 수원 장안점 드라이브 스루 Web AR (WebXR) — created by OOMG, Web-based AR / WebXR / AR creator. ' +
	'Copyright (c) 2026 OOMG. All rights reserved. ' +
	'Unauthorized copying, use, modification or redistribution of this source code is prohibited. */';

// Prepends BANNER to every emitted JS chunk after minification.
const creatorBanner = (): Plugin => ({
	name: 'oomg-creator-banner',
	enforce: 'post',
	generateBundle(_options, bundle) {
		for (const file of Object.values(bundle)) {
			if (file.type === 'chunk') file.code = `${BANNER}\n${file.code}`;
		}
	}
});

export default defineConfig(({ mode }) => ({
	plugins: [
		creatorBanner(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		}),

		// Camera access (getUserMedia) requires a secure context. http://localhost already
		// is one, but a phone reaching the dev server over the LAN is not.
		...(exposedToNetwork || mode === 'https' ? [basicSsl()] : [])
	],
	server: {
		// Convenient for tunneling to a phone, mirrors the official example's config.
		allowedHosts: ['.ngrok-free.dev']
	}
}));
