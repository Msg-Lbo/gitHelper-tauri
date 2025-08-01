<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    :close-on-esc="false"
    preset="card"
    :style="{ width: '500px' }"
    title="发现新版本"
    :bordered="false"
    size="huge"
    role="dialog"
    aria-labelledby="modal-header"
  >
    <!-- 模态框内容 -->
    <div class="update-modal-content">
      <!-- 版本信息区域 -->
      <div class="version-section">
        <div class="version-info">
          <div class="current-version flex align-center gap-10">
            <span class="version-label">当前版本：</span>
            <span class="version-number">v{{ currentVersion }}</span>
          </div>
          <div class="new-version flex align-center gap-10">
            <span class="version-label">最新版本：</span>
            <span class="version-number highlight">v{{ versionInfo?.version }}</span>
            <n-tag type="success" size="small" class="new-tag">NEW</n-tag>
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="file-info" v-if="versionInfo">
          <div class="file-size flex align-center gap-10">
            <n-icon size="16" class="info-icon"><DownloadOutline /></n-icon>
            <span>文件大小：{{ versionInfo.fileSizeFormatted }}</span>
          </div>
          <div class="release-date flex align-center gap-10">
            <n-icon size="16" class="info-icon"><CalendarOutline /></n-icon>
            <span>发布日期：{{ formatDate(versionInfo.releaseDate) }}</span>
          </div>
        </div>
      </div>

      <!-- 更新日志区域 -->
      <div class="changelog-section" v-if="versionInfo?.changelog?.length">
        <h4 class="changelog-title flex align-center gap-10">
          <n-icon size="18"><DocumentTextOutline /></n-icon>
          更新内容
        </h4>
        <div class="changelog-content">
          <ul class="changelog-list">
            <li v-for="(item, index) in versionInfo.changelog" :key="index" class="changelog-item">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 下载进度区域 -->
      <div class="download-section" v-if="downloadStatus !== DownloadStatus.IDLE">
        <div class="download-header">
          <span class="download-title">
            {{ downloadStatus === DownloadStatus.DOWNLOADING ? '正在下载...' :
               downloadStatus === DownloadStatus.COMPLETED ? '下载完成' :
               downloadStatus === DownloadStatus.FAILED ? '下载失败' : '下载已取消' }}
          </span>
          <span class="download-speed" v-if="downloadProgress && downloadStatus === DownloadStatus.DOWNLOADING">
            {{ downloadProgress.speed }}
          </span>
        </div>
        
        <!-- 进度条 -->
        <n-progress
          v-if="downloadStatus === DownloadStatus.DOWNLOADING || downloadStatus === DownloadStatus.COMPLETED"
          :percentage="downloadProgress?.percentage || 0"
          :status="downloadStatus === DownloadStatus.COMPLETED ? 'success' : 'info'"
          :show-indicator="true"
          class="download-progress"
        />
        
        <!-- 下载详情 -->
        <div class="download-details" v-if="downloadProgress && downloadStatus === DownloadStatus.DOWNLOADING">
          <span class="downloaded-size">
            {{ formatBytes(downloadProgress.downloaded) }} / {{ formatBytes(downloadProgress.total) }}
          </span>
          <span class="remaining-time" v-if="downloadProgress.remainingTime">
            剩余时间：{{ downloadProgress.remainingTime }}
          </span>
        </div>

        <!-- 错误信息 -->
        <div class="error-message" v-if="downloadStatus === DownloadStatus.FAILED && downloadError">
          <n-alert type="error" :show-icon="true">
            {{ downloadError }}
          </n-alert>
        </div>
      </div>
    </div>

    <!-- 模态框操作按钮 -->
    <template #action>
      <div class="modal-actions">
        <!-- 空闲状态：显示取消和更新按钮 -->
        <template v-if="downloadStatus === DownloadStatus.IDLE">
          <n-button @click="handleCancel" class="cancel-btn">
            取消
          </n-button>
          <n-button
            type="primary"
            @click="handleStartDownload"
            :loading="false"
            class="update-btn"
          >
            <template #icon>
              <n-icon><DownloadOutline /></n-icon>
            </template>
            立即更新
          </n-button>
        </template>

        <!-- 下载中状态：显示取消下载按钮 -->
        <template v-else-if="downloadStatus === DownloadStatus.DOWNLOADING">
          <n-button @click="handleCancelDownload" class="cancel-btn">
            取消下载
          </n-button>
        </template>

        <!-- 下载完成状态：显示取消和安装按钮 -->
        <template v-else-if="downloadStatus === DownloadStatus.COMPLETED">
          <n-button @click="handleCancel" class="cancel-btn">
            稍后安装
          </n-button>
          <n-button
            type="primary"
            @click="handleInstall"
            class="install-btn"
          >
            <template #icon>
              <n-icon><RefreshOutline /></n-icon>
            </template>
            立即安装
          </n-button>
        </template>

        <!-- 下载失败状态：显示取消和重试按钮 -->
        <template v-else-if="downloadStatus === DownloadStatus.FAILED">
          <n-button @click="handleCancel" class="cancel-btn">
            取消
          </n-button>
          <n-button 
            type="primary" 
            @click="handleStartDownload"
            class="retry-btn"
          >
            <template #icon>
              <n-icon><RefreshOutline /></n-icon>
            </template>
            重试下载
          </n-button>
        </template>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref, computed } from 'vue';
import {
  NModal, NButton, NProgress, NAlert, NIcon, NTag
} from 'naive-ui';
import {
  DownloadOutline,
  CalendarOutline,
  DocumentTextOutline,
  RefreshOutline
} from '@vicons/ionicons5';

// API 导入
import {
  type VersionInfo,
  type DownloadProgress,
  DownloadStatus,
  downloadUpdate,
  cancelDownload,
  installUpdateAndRestart
} from '../api/updater';

// ==================== 组件属性 ====================
interface Props {
  show: boolean;
  currentVersion: string;
  versionInfo: VersionInfo | null;
  hasDownloadedUpdate?: boolean;  // 是否已下载更新
  downloadedUpdatePath?: string;  // 已下载的更新文件路径
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'cancel'): void;
  (e: 'install-completed'): void;
  (e: 'message', type: 'success' | 'error' | 'info' | 'warning', content: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  hasDownloadedUpdate: false,
  downloadedUpdatePath: ''
});

const emit = defineEmits<Emits>();

// ==================== 响应式状态 ====================

// 模态框显示状态
const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
});

// 下载状态
const downloadStatus = ref<DownloadStatus>(
  props.hasDownloadedUpdate ? DownloadStatus.COMPLETED : DownloadStatus.IDLE
);
const downloadProgress = ref<DownloadProgress | null>(null);
const downloadError = ref<string>('');
const downloadedFilePath = ref<string>(props.downloadedUpdatePath || '');

// ==================== 工具函数 ====================

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// ==================== 事件处理函数 ====================

/**
 * 处理取消操作
 */
function handleCancel() {
  emit('cancel');
  showModal.value = false;
}

/**
 * 处理开始下载
 */
async function handleStartDownload() {
  if (!props.versionInfo) {
    console.error('版本信息不完整，无法下载');
    emit('message', 'error', '版本信息不完整，无法下载');
    return;
  }

  try {
    downloadStatus.value = DownloadStatus.DOWNLOADING;
    downloadError.value = '';
    downloadProgress.value = null;

    const result = await downloadUpdate(props.versionInfo, (progress) => {
      downloadProgress.value = progress;
    });

    // 获取正确的文件路径（兼容前后端字段名差异）
    const filePath = result.filePath || result.file_path;

    if (result.status === DownloadStatus.COMPLETED && filePath) {
      downloadStatus.value = DownloadStatus.COMPLETED;
      downloadedFilePath.value = filePath;
      emit('message', 'success', '更新包下载完成！');
      return;
    } else if (result.status === DownloadStatus.FAILED) {
      downloadStatus.value = DownloadStatus.FAILED;
      downloadError.value = result.error || '下载失败';
      emit('message', 'error', '下载失败：' + downloadError.value);
    } else if (result.status === DownloadStatus.CANCELLED) {
      downloadStatus.value = DownloadStatus.CANCELLED;
      emit('message', 'info', '下载已取消');
    } else {
      // 兜底逻辑：处理字符串状态
      const finalFilePath = result.filePath || result.file_path;
      if (result.status === "completed" && finalFilePath) {
        downloadStatus.value = DownloadStatus.COMPLETED;
        downloadedFilePath.value = finalFilePath;
        emit('message', 'success', '更新包下载完成！');
      } else {
        downloadStatus.value = DownloadStatus.FAILED;
        downloadError.value = `未知状态: ${result.status}`;
        emit('message', 'error', `下载状态异常: ${result.status}`);
      }
    }
  } catch (error) {
    downloadStatus.value = DownloadStatus.FAILED;
    downloadError.value = error instanceof Error ? error.message : '下载过程中发生未知错误';
    console.error('下载失败：' + downloadError.value);
    emit('message', 'error', '下载失败：' + downloadError.value);
  }
}

/**
 * 处理取消下载
 */
async function handleCancelDownload() {
  try {
    const success = await cancelDownload();
    if (success) {
      downloadStatus.value = DownloadStatus.CANCELLED;
      console.log('下载已取消');
      emit('message', 'info', '下载已取消');
    } else {
      console.error('取消下载失败');
      emit('message', 'error', '取消下载失败');
    }
  } catch (error) {
    console.error('取消下载时发生错误');
    emit('message', 'error', '取消下载时发生错误');
  }
}

/**
 * 处理安装更新
 */
async function handleInstall() {
  if (!downloadedFilePath.value) {
    console.error('未找到更新文件，请重新下载');
    emit('message', 'error', '未找到更新文件，请重新下载');
    return;
  }

  try {
    console.log('正在启动安装程序，应用将自动重启...');
    emit('message', 'info', '正在启动安装程序，应用将自动重启...');

    const success = await installUpdateAndRestart(downloadedFilePath.value);
    if (success) {
      emit('install-completed');
      // 安装成功后应用会自动重启，这里的代码可能不会执行
    } else {
      console.error('启动安装程序失败，请手动运行更新文件');
      emit('message', 'error', '启动安装程序失败，请手动运行更新文件');
    }
  } catch (error) {
    const errorMsg = '安装过程中发生错误：' + (error instanceof Error ? error.message : '未知错误');
    console.error(errorMsg);
    emit('message', 'error', errorMsg);
  }
}
</script>

<style scoped>
/* ==================== 模态框样式 ==================== */
.update-modal-content {
  padding: 0;
}

/* 版本信息区域 */
.version-section {
  margin-bottom: 24px;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.current-version,
.new-version {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-label {
  font-size: 14px;
  color: #666;
  min-width: 80px;
}

.version-number {
  font-size: 16px;
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}

.version-number.highlight {
  color: #18a058;
}

.new-tag {
  margin-left: 8px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
}

.file-info > div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  color: #999;
}

/* 更新日志区域 */
.changelog-section {
  margin-bottom: 24px;
}

.changelog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.changelog-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #18a058;
}

.changelog-list {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.changelog-item {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #555;
}

.changelog-item:last-child {
  margin-bottom: 0;
}

/* 下载进度区域 */
.download-section {
  margin-bottom: 16px;
}

.download-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.download-title {
  font-weight: 600;
  color: #333;
}

.download-speed {
  font-size: 13px;
  color: #666;
  font-family: 'Consolas', 'Monaco', monospace;
}

.download-progress {
  margin-bottom: 8px;
}

.download-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
  font-family: 'Consolas', 'Monaco', monospace;
}

.error-message {
  margin-top: 12px;
}

/* 操作按钮区域 */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  min-width: 80px;
}

.update-btn,
.install-btn,
.retry-btn {
  min-width: 100px;
}
</style>
