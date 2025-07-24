<template>
  <div class="title-bar flex justify-between align-center">
    <div class="left flex align-center gap-10">
      <img src="/vite.svg" class="logo" alt="Git Helper" />
      <span class="title">Git Helper</span>
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
  background: #23232b;
  padding: 0 16px;
  -webkit-app-region: drag;
  user-select: none;

  .left {
    .logo {
      width: 24px;
      height: 24px;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #fff;
    }
  }

  .right {
    -webkit-app-region: no-drag;

    .bar-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.close:hover {
        background: #e9546b;
        color: #fff;
      }
    }
  }
}

/* 工具类 */
.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.align-center {
  align-items: center;
}

.gap-10 {
  gap: 10px;
}
</style>
