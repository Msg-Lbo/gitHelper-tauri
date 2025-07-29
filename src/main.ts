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

// ==================== 应用初始化 ====================

// 创建 Vue 应用实例
const app = createApp(App)

// 挂载应用到 DOM 节点
app.mount('#app')
