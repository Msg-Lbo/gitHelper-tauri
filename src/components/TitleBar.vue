<template>
  <div class="title-bar flex justify-between align-center">
    <div class="left flex align-center gap-10">
      <img src="/logo.png" class="logo" alt="workHelper" />
      <span class="title">workHelper</span>
    </div>
    <div class="right flex align-center">
      <button class="bar-btn minimize" @click="handleMinimize" title="最小化">
        <n-icon size="16"><RemoveOutline /></n-icon>
      </button>
      <button class="bar-btn close" @click="handleClose" title="关闭">
        <n-icon size="16"><CloseOutline /></n-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { RemoveOutline, CloseOutline } from '@vicons/ionicons5'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

const handleMinimize = async () => {
  try {
    await invoke('window_minimize', { window: getCurrentWindow() })
  } catch (error) {
    console.error('Failed to minimize window:', error)
  }
}

const handleClose = async () => {
  try {
    await invoke('window_close', { window: getCurrentWindow() })
  } catch (error) {
    console.error('Failed to close window:', error)
  }
}
</script>

<style scoped lang="scss">
.title-bar {
  height: 40px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 16px;
  -webkit-app-region: drag;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .left {
    .logo {
      width: 24px;
      height: 24px;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
  }

  .right {
    -webkit-app-region: no-drag;

    .bar-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      &.close:hover {
        background: #ef4444;
        color: #ffffff;
      }
    }
  }
}
</style>
