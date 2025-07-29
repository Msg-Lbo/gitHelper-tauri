<template>
  <div class="report-list">
    <!-- 报告列表头部 - 固定在顶部 -->
    <div class="report-header">
      <h3 class="report-title">我的报告列表</h3>
      <div class="report-actions">
        <n-button size="small" type="primary" @click="handleAddReport">
          新增
        </n-button>
        <n-button size="small" @click="handleRefresh" :loading="loading">
          刷新
        </n-button>
      </div>
    </div>

    <!-- 报告列表内容 -->
    <div class="report-content">
      <!-- 加载状态 -->
      <div v-if="loading && reportList.length === 0" class="loading-container">
        <n-spin size="large">
          <template #description>
            <span class="loading-text">正在加载报告数据...</span>
          </template>
        </n-spin>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && reportList.length === 0" class="empty-container">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无报告数据</div>
        <n-button size="small" type="primary" @click="handleRefresh">
          重新加载
        </n-button>
      </div>

      <!-- 报告列表 -->
      <div v-else class="report-items">
        <div
          v-for="report in reportList"
          :key="report.id"
          class="report-item"
        >
          <!-- 报告头部信息 -->
          <div class="report-item-header">
            <div class="report-meta">
              <span class="work-hours">{{ report.work }}h</span>
              <span class="create-time">{{ formatDate(report.createTime) }}</span>
            </div>
            <div class="project-name">{{ report.projectName }}</div>
          </div>

          <!-- 报告内容 -->
          <div class="report-item-content">
            <div class="remarks-content">{{ report.remarks }}</div>
          </div>

          <!-- 报告状态信息 -->
          <div class="report-item-footer">
            <div class="status-info">
              <span class="stage-name">{{ report.stageName }}</span>
              <span class="status-name">{{ report.statusName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页器 -->
      <div v-if="reportList.length > 0" class="pagination-container">
        <n-pagination
          v-model:page="currentPage"
          :page-size="pageSize"
          :item-count="totalItems"
          :prefix="paginationPrefix"
          @update:page="handlePageChange"
          size="small"
          class="custom-pagination"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { NButton, NSpin, NPagination, useMessage } from 'naive-ui'
import { getMyReportingList, type ReportInfo, type ReportListParams } from '../api/oa'

// ==================== 组件属性 ====================
interface Props {
  projectId: string  // 项目ID
}

const props = defineProps<Props>()

// ==================== 响应式数据 ====================
const message = useMessage()
const loading = ref(false)
const reportList = ref<ReportInfo[]>([])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 分页器前缀文本函数
const paginationPrefix = (_info: any) => {
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, totalItems.value)
  return `共 ${totalItems.value} 条，显示 ${start}-${end} 条`
}

// ==================== 业务函数 ====================

/**
 * 格式化日期显示
 * @param dateStr 日期字符串
 * @returns 格式化后的日期
 */
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      })
    }
  } catch {
    return dateStr
  }
}

/**
 * 加载报告列表数据
 */
const loadReportList = async () => {
  // 如果没有项目ID，不执行加载
  if (!props.projectId) {
    console.log('没有项目ID，跳过加载')
    return
  }

  try {
    loading.value = true
    console.log('开始加载报告列表，项目ID:', props.projectId)

    // 构建请求参数
    const params: ReportListParams = {
      keywords: '',
      overtimeStatus: '',
      createTime: {
        start: '',
        end: ''
      },
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      projectId: props.projectId
    }

    console.log('加载报告列表，参数:', params)

    // 调用API获取数据
    const response = await getMyReportingList(params)

    if (response.code === 200 && response.data) {
      reportList.value = response.data.list || []
      totalItems.value = response.data.total || 0
      console.log('报告列表加载成功:', {
        projectId: props.projectId,
        total: totalItems.value,
        count: reportList.value.length
      })
    } else {
      throw new Error(response.msg || '获取报告列表失败')
    }

  } catch (error: any) {
    console.error('加载报告列表失败:', error)
    message.error(error?.message || '加载报告列表失败，请稍后重试')
    reportList.value = []
    totalItems.value = 0
  } finally {
    loading.value = false
  }
}

/**
 * 处理页码变化
 * @param page 新页码
 */
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadReportList()
}

/**
 * 处理新增报告
 */
const handleAddReport = () => {
  message.info('新增报告功能开发中...')
  // TODO: 实现新增报告功能
  console.log('点击新增报告按钮')
}

/**
 * 处理刷新
 */
const handleRefresh = () => {
  currentPage.value = 1
  loadReportList()
}

// ==================== 生命周期 ====================
onMounted(() => {
  console.log('ReportList组件挂载，项目ID:', props.projectId)
  if (props.projectId) {
    // 重置状态
    currentPage.value = 1
    reportList.value = []
    totalItems.value = 0
    loadReportList()
  }
})

// 监听projectId变化，重新加载数据
watch(() => props.projectId, (newProjectId, oldProjectId) => {
  console.log('项目ID变化:', { from: oldProjectId, to: newProjectId })
  if (newProjectId && newProjectId !== oldProjectId) {
    // 重置状态
    currentPage.value = 1
    reportList.value = []
    totalItems.value = 0
    loadReportList()
  }
}, { immediate: false })

// 组件卸载时清理状态
onUnmounted(() => {
  console.log('ReportList组件卸载')
  loading.value = false
  reportList.value = []
  totalItems.value = 0
})
</script>

<style scoped lang="scss">
.report-list {
  height: 500px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .report-title {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .report-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.report-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.loading-container,
.empty-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  .loading-text {
    margin-top: 12px;
    color: #64748b;
    font-size: 14px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-text {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 16px;
  }
}

.report-items {
  flex: 1;
  padding: 16px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  max-height: calc(100vh - 200px); /* 确保有足够的滚动空间 */

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.report-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .report-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;

    .report-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .work-hours {
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .create-time {
        color: #64748b;
        font-size: 12px;
      }
    }

    .project-name {
      font-size: 14px;
      font-weight: 500;
      color: #0f172a;
      text-align: right;
      max-width: 200px;
      word-break: break-word;
    }
  }

  .report-item-content {
    margin-bottom: 12px;

    .remarks-content {
      color: #374151;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .report-item-footer {
    .status-info {
      display: flex;
      gap: 8px;

      .stage-name,
      .status-name {
        background: #e2e8f0;
        color: #475569;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
      }

      .status-name {
        background: #fef3c7;
        color: #92400e;
      }
    }
  }
}

.pagination-container {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

  .custom-pagination {
    :deep(.n-pagination-prefix) {
      color: #64748b;
      font-size: 12px;
    }
  }
}
</style>
