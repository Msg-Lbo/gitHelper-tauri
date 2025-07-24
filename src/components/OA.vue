<template>
  <div class="oa-container">
    <div class="oa-header">
      <n-space justify="start" align="center">
        <n-button type="primary" size="small" @click="handleLogin">登录 OA</n-button>
        <n-button type="info" size="small" @click="handleRefresh">刷新页面</n-button>
        <n-button type="warning" size="small" @click="handleClearSession">清除会话</n-button>
      </n-space>
    </div>
    <div class="oa-content">
      <div v-if="!showWebview" class="placeholder">
        <n-empty description="点击'登录 OA'按钮开始使用 OA 系统">
          <template #icon>
            <n-icon size="48"><GlobeOutline /></n-icon>
          </template>
        </n-empty>
      </div>
      <iframe
        v-if="showWebview"
        ref="webviewRef"
        :src="oaUrl"
        class="oa-webview"
        frameborder="0"
        @load="handleWebviewLoad"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NSpace, NEmpty, NIcon, useMessage } from 'naive-ui'
import { GlobeOutline } from '@vicons/ionicons5'

const message = useMessage()
const showWebview = ref(false)
const webviewRef = ref<HTMLIFrameElement | null>(null)
const oaUrl = 'https://ai.mufengweilai.com/'

// 获取配置
const getSettings = () => {
  const raw = localStorage.getItem('githelper-settings')
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {}
  }
  return {}
}

const handleLogin = () => {
  const settings = getSettings()
  if (!settings.oaAccount || !settings.oaPassword) {
    message.warning('请先在设置中配置 OA 账号和密码')
    return
  }
  
  showWebview.value = true
  
  // 等待 iframe 加载完成后自动填充登录信息
  setTimeout(() => {
    autoFillLogin(settings.oaAccount, settings.oaPassword)
  }, 3000)
}

const handleRefresh = () => {
  if (webviewRef.value) {
    webviewRef.value.src = webviewRef.value.src
  }
}

const handleClearSession = () => {
  // 在 Tauri 中，我们可以通过重新加载 iframe 来清除会话
  if (webviewRef.value) {
    webviewRef.value.src = 'about:blank'
    setTimeout(() => {
      if (webviewRef.value) {
        webviewRef.value.src = oaUrl
      }
    }, 100)
  }
  message.success('会话已清除')
}

const handleWebviewLoad = () => {
  console.log('OA 页面加载完成')
}

const autoFillLogin = (account: string, password: string) => {
  try {
    if (webviewRef.value && webviewRef.value.contentWindow) {
      const iframe = webviewRef.value
      const doc = iframe.contentDocument || iframe.contentWindow.document
      
      // 尝试查找登录表单元素并自动填充
      setTimeout(() => {
        const usernameInput = doc.querySelector('input[type="text"], input[name*="user"], input[name*="account"]') as HTMLInputElement
        const passwordInput = doc.querySelector('input[type="password"]') as HTMLInputElement
        
        if (usernameInput && passwordInput) {
          usernameInput.value = account
          passwordInput.value = password
          
          // 触发输入事件
          usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
          
          message.success('已自动填充登录信息')
        }
      }, 1000)
    }
  } catch (error) {
    console.log('自动填充登录信息失败（可能由于跨域限制）:', error)
  }
}

onMounted(() => {
  // 组件挂载时的初始化逻辑
})
</script>

<style scoped lang="scss">
.oa-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.oa-header {
  padding: 12px 0;
  border-bottom: 1px solid #333;
}

.oa-content {
  flex: 1;
  position: relative;
  height: calc(100vh - 140px); // 减去标题栏、标签栏、底部栏的高度
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #1a1a1a;
}

.oa-webview {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
</style>
