/**
 * 应用程序入口文件
 * 负责创建和初始化 Vue 应用实例
 */

// Vue 核心库导入
import { createApp } from 'vue'
// 全局样式导入
import './style.css'
// 根组件导入
import App from './App.vue'
// Tauri API 导入
import { invoke } from '@tauri-apps/api/core'

// ==================== 应用初始化 ====================

// 创建 Vue 应用实例
const app = createApp(App)

// 挂载应用到 DOM 节点
app.mount('#app')

// ==================== 启动画面管理 ====================

/**
 * 关闭启动画面并显示主窗口
 * 在应用完全加载后调用
 */
async function closeSplashscreen() {
  try {
    // 等待一小段时间确保应用完全渲染
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 调用后端命令关闭启动画面
    await invoke('close_splashscreen')
    console.log('启动画面已关闭，主窗口已显示')
  } catch (error) {
    console.error('关闭启动画面时出错:', error)
    // 即使出错也要尝试显示主窗口，避免用户看不到界面
  }
}

// 在 DOM 加载完成和 Vue 应用挂载后关闭启动画面
document.addEventListener('DOMContentLoaded', () => {
  // 使用 nextTick 确保 Vue 应用完全渲染
  app.config.globalProperties.$nextTick(() => {
    closeSplashscreen()
  })
})

// 备用方案：如果 DOMContentLoaded 已经触发，直接执行
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(closeSplashscreen, 100)
}
