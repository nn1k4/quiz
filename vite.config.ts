import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import crossOriginIsolation from '@laimi7/vite-plugin-cross-origin-isolation';

export default defineConfig({
	server: {
		https: true,
		proxy: {}
	},

	plugins: [sveltekit(), mkcert(), crossOriginIsolation()],
	define: {
		"process.env.NODE_ENV": '"production"',
	  },
	  worker: {
		rollupOptions: {
		  output: {
			format: "iife",
			inlineDynamicImports: true,
		  },
		},
	  },
	  build:{
		target: "esnext" // or "es2019",
	
	   }
});
