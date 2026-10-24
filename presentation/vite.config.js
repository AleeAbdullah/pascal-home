import {defineConfig} from 'vite';
export default defineConfig({esbuild:{jsx:"automatic"},build:{target:'esnext',chunkSizeWarningLimit:2500},resolve:{dedupe:['react','react-dom','three','@pascal-app/core','@pascal-app/viewer','@pascal-app/editor']}});
