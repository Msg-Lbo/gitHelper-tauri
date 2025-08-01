/**
 * 更新检测和管理API
 * 负责检查新版本、下载更新包、管理更新流程
 */

import { invoke } from '@tauri-apps/api/core';

// ==================== 类型定义 ====================

/**
 * 版本信息接口
 */
export interface VersionInfo {
  version: string;           // 版本号，如 "1.0.1"
  releaseDate: string;       // 发布日期
  changelog: string;         // 更新日志内容
  downloadUrl: string;       // 下载链接
  fileSize: number;          // 文件大小（字节）
  fileSizeFormatted: string; // 格式化的文件大小，如 "25.6 MB"
  platform: string;         // 平台标识，如 "windows"
  fileType: string;          // 文件类型，如 "exe" 或 "msi"
}

/**
 * 更新检查结果接口
 */
export interface UpdateCheckResult {
  hasUpdate: boolean;        // 是否有新版本
  currentVersion: string;    // 当前版本
  latestVersion?: string;    // 最新版本
  versionInfo?: VersionInfo; // 版本详细信息
  error?: string;           // 错误信息
}

/**
 * 下载进度接口
 */
export interface DownloadProgress {
  downloaded: number;        // 已下载字节数
  total: number;            // 总字节数
  percentage: number;       // 下载百分比 (0-100)
  speed: string;            // 下载速度，如 "1.2 MB/s"
  remainingTime: string;    // 剩余时间，如 "2m 30s"
}

/**
 * 下载状态枚举
 */
export enum DownloadStatus {
  IDLE = 'idle',                    // 空闲状态
  DOWNLOADING = 'downloading',      // 下载中
  COMPLETED = 'completed',          // 下载完成
  FAILED = 'failed',               // 下载失败
  CANCELLED = 'cancelled'          // 下载取消
}

/**
 * 下载结果接口
 */
export interface DownloadResult {
  status: DownloadStatus;
  filePath?: string;        // 下载文件的本地路径 (前端格式)
  file_path?: string;       // 下载文件的本地路径 (后端格式)
  error?: string;          // 错误信息
}

// ==================== API 函数 ====================

/**
 * 检查是否有新版本可用
 * @returns Promise<UpdateCheckResult> 更新检查结果
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    console.log('🔍 开始检查更新...');
    const result = await invoke<UpdateCheckResult>('check_for_updates');
    console.log('✅ 更新检查完成:', result);
    return result;
  } catch (error) {
    console.error('❌ 检查更新失败:', error);
    return {
      hasUpdate: false,
      currentVersion: await getCurrentVersion(),
      error: error instanceof Error ? error.message : '检查更新失败'
    };
  }
}

/**
 * 获取当前应用版本
 * @returns Promise<string> 当前版本号
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    return await invoke<string>('get_app_version');
  } catch (error) {
    console.error('获取当前版本失败:', error);
    return '未知版本';
  }
}

/**
 * 下载更新包
 * @param versionInfo 版本信息
 * @param onProgress 下载进度回调函数
 * @returns Promise<DownloadResult> 下载结果
 */
export async function downloadUpdate(
  versionInfo: VersionInfo,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadResult> {
  try {
    console.log('📥 开始下载更新包:', versionInfo.version);
    
    // 如果提供了进度回调，设置进度监听
    if (onProgress) {
      // 注册下载进度监听器
      const unlisten = await listenToDownloadProgress(onProgress);
      
      try {
        const result = await invoke<DownloadResult>('download_update', {
          downloadUrl: versionInfo.downloadUrl,
          fileName: `WorkHelper_${versionInfo.version}_x64-setup.exe`,
          expectedSize: versionInfo.fileSize
        });
        
        return result;
      } finally {
        // 清理监听器
        unlisten();
      }
    } else {
      // 不需要进度回调的简单下载
      return await invoke<DownloadResult>('download_update', {
        downloadUrl: versionInfo.downloadUrl,
        fileName: `WorkHelper_${versionInfo.version}_x64-setup.exe`,
        expectedSize: versionInfo.fileSize
      });
    }
  } catch (error) {
    console.error('❌ 下载更新包失败:', error);
    return {
      status: DownloadStatus.FAILED,
      error: error instanceof Error ? error.message : '下载失败'
    };
  }
}

/**
 * 监听下载进度
 * @param onProgress 进度回调函数
 * @returns Promise<() => void> 取消监听的函数
 */
async function listenToDownloadProgress(
  onProgress: (progress: DownloadProgress) => void
): Promise<() => void> {
  // 这里使用 Tauri 的事件系统来监听下载进度
  // 需要在 Rust 后端发送相应的事件
  const { listen } = await import('@tauri-apps/api/event');
  
  const unlisten = await listen<DownloadProgress>('download-progress', (event) => {
    onProgress(event.payload);
  });
  
  return unlisten;
}

/**
 * 取消下载
 * @returns Promise<boolean> 是否成功取消
 */
export async function cancelDownload(): Promise<boolean> {
  try {
    console.log('🛑 取消下载更新包');
    await invoke('cancel_download');
    return true;
  } catch (error) {
    console.error('❌ 取消下载失败:', error);
    return false;
  }
}

/**
 * 安装更新包并重启应用
 * @param filePath 更新包文件路径
 * @returns Promise<boolean> 是否成功启动安装
 */
export async function installUpdateAndRestart(filePath: string): Promise<boolean> {
  try {
    console.log('🔄 开始安装更新并重启应用:', filePath);
    await invoke('install_update_and_restart', { filePath });
    return true;
  } catch (error) {
    console.error('❌ 安装更新失败:', error);
    return false;
  }
}

/**
 * 检查是否已下载指定版本的更新包
 * @param version 版本号
 * @returns Promise<string | null> 如果已下载返回文件路径，否则返回null
 */
export async function getDownloadedUpdatePath(version: string): Promise<string | null> {
  try {
    const result = await invoke<string | null>('get_downloaded_update_path', { version });
    return result;
  } catch (error) {
    console.error('❌ 检查已下载更新失败:', error);
    return null;
  }
}

/**
 * 清理旧的更新文件
 * @returns Promise<boolean> 是否成功清理
 */
export async function cleanupOldUpdates(): Promise<boolean> {
  try {
    console.log('🧹 清理旧的更新文件');
    await invoke('cleanup_old_updates');
    return true;
  } catch (error) {
    console.error('❌ 清理更新文件失败:', error);
    return false;
  }
}
