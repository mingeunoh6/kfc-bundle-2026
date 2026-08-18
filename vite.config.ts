import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

// `npm run dev -- --host` exposes the server on the LAN for phone testing. Camera
// access needs a secure context there, so the presence of --host switches dev to
// https (self-signed cert) automatically.
const exposedToNetwork = process.argv.includes('--host');

export default defineConfig(({ mode }) => ({
	plugins: [
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
