import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'configure-wasm',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      }
    },
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'node_modules/onnxruntime-web/dist/*.wasm',
    //       dest: 'public/wasm'
    //     }
    //   ]
    // }),
  ],
  base: "/fruit-identifier/"
})
