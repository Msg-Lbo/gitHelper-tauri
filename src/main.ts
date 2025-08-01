/**
 * 应用程序入口文件
 *
 * 负责创建和初始化 Vue 应用实例，管理启动画面的显示和隐藏。
 * 这是整个应用的启动点，确保应用正确加载并向用户展示。
 */

// ==================== 依赖导入 ====================

// Vue 核心库
import { createApp, nextTick } from 'vue'

// 全局样式
import './style.scss'

// 根组件
import App from './App.vue'

// Tauri API
import { invoke } from '@tauri-apps/api/core'

// ==================== 应用初始化 ====================

/**
 * 创建并挂载 Vue 应用实例
 */
const app = createApp(App)
app.mount('#app')

console.log('✅ Vue 应用已成功挂载')

// ==================== 启动画面管理 ====================

/**
 * 关闭启动画面并显示主窗口
 *
 * 在应用完全加载和渲染后调用，确保用户看到完整的界面
 * 而不是空白页面或加载中的状态
 */
async function closeSplashscreen(): Promise<void> {
  try {
    // 等待应用完全渲染（给Vue一些时间完成初始化）
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 调用Tauri后端命令关闭启动画面
    await invoke('close_splashscreen')
    console.log('✅ 启动画面已关闭，主窗口已显示')

  } catch (error) {
    console.error('❌ 关闭启动画面时出错:', error)
    // 即使出错也不影响应用正常使用
    // 用户仍然可以看到和使用主界面
  }
}

/**
 * 启动画面管理流程
 * 确保在DOM和Vue应用都准备就绪后再关闭启动画面
 */
function initSplashscreenManager(): void {
  // 主要方案：监听DOM加载完成事件
  document.addEventListener('DOMContentLoaded', () => {
    // 使用nextTick确保Vue应用完全渲染
    nextTick(() => {
      closeSplashscreen()
    })
  })

  // 备用方案：如果DOMContentLoaded已经触发，直接执行
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(closeSplashscreen, 100)
  }
}

// 启动启动画面管理流程
initSplashscreenManager()
