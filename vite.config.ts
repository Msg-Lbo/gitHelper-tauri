import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 代理OA系统API请求
      '/api/oa': {
        target: 'https://ai.mufengweilai.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('代理错误：', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('发送请求到目标：', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('从目标接收响应：', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
