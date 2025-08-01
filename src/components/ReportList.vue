<template>
  <div class="report-list flex-1 flex flex-col overflow-hidden">
    <!-- 报告列表头部 - 固定在顶部 -->
    <div class="report-header flex justify-between align-center">
      <h3 class="report-title">我的报告列表</h3>
      <div class="report-actions flex gap-10">
        <n-button size="small" type="primary" @click="handleAddReport">
          新增
        </n-button>
        <n-button size="small" @click="handleRefresh" :loading="loading">
          刷新
        </n-button>
      </div>
    </div>

    <!-- 报告列表内容 -->
    <div class="report-content flex-1 overflow-y-auto">
      <!-- 加载状态 -->
      <div v-if="loading && reportList.length === 0" class="loading-container flex align-center justify-center h-full">
        <n-spin size="large">
          <template #description>
            <span class="loading-text">正在加载报告数据...</span>
          </template>
        </n-spin>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && reportList.length === 0" class="empty-container flex flex-col align-center justify-center h-full gap-15">
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
          <div class="report-item-header flex justify-between align-center">
            <div class="report-meta flex gap-15">
              <span class="work-hours">{{ report.work }}h</span>
              <span class="create-time">{{ formatDate(report.createTime) }}</span>
            </div>
            <div class="header-right flex align-center gap-10">
              <div class="project-name">{{ report.projectName }}</div>
              <!-- 操作按钮组 -->
              <div class="action-buttons flex align-center gap-4">
                <!-- 编辑按钮 -->
                <n-button
                  size="tiny"
                  type="primary"
                  secondary
                  circle
                  class="edit-btn"
                  :title="`编辑日报 - ${formatDate(report.createTime)}`"
                  @click="handleEditReport(report)"
                >
                  <template #icon>
                    <n-icon><CreateOutline /></n-icon>
                  </template>
                </n-button>

                <!-- 删除按钮 -->
                <n-popconfirm
                  @positive-click="handleDeleteReport(report.id)"
                  negative-text="取消"
                  positive-text="确认删除"
                >
                  <template #trigger>
                    <n-button
                      size="tiny"
                      type="error"
                      secondary
                      circle
                      class="delete-btn"
                      :title="`删除日报 - ${formatDate(report.createTime)}`"
                    >
                      <template #icon>
                        <n-icon><TrashOutline /></n-icon>
                      </template>
                    </n-button>
                  </template>
                  <span>确定要删除这条日报吗？</span>
                </n-popconfirm>
              </div>
            </div>
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

    <!-- 新增/编辑日报模态框 -->
    <AddReportModal
      v-model:show="showAddModal"
      :project-info="projectInfo"
      :edit-data="editingReport ? {
        id: editingReport.id,
        work: editingReport.work,
        speed: parseInt(editingReport.speed),
        remarks: editingReport.remarks,
        workType: editingReport.workType,
        overtimeType: editingReport.overtimeType,
        speedPlan: editingReport.speedPlan,
        tomorrowWorkPlan: '',  // ReportInfo中没有此字段，使用默认值
        difficulty: editingReport.difficulty
      } : undefined"
      @success="handleAddSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { NButton, NSpin, NPagination, NIcon, NPopconfirm, useMessage } from 'naive-ui'
import { TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { getMyReportingList, deleteReport, type ReportInfo, type ReportListParams } from '../api/oa'
import AddReportModal from './AddReportModal.vue'

// ==================== 组件属性 ====================
interface Props {
  projectId: string  // 项目ID
  projectName?: string  // 项目名称
  projectStartTime?: string  // 项目开始时间
  projectEndTime?: string  // 项目结束时间
  projectTeamId?: string  // 项目团队ID
  stage?: string  // 阶段ID
  stageName?: string  // 阶段名称
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
const showAddModal = ref(false)

// 编辑相关状态
const editingReport = ref<ReportInfo | null>(null)

// 项目信息（用于新增日报）
const projectInfo = computed(() => {
  if (!props.projectId) return undefined

  return {
    id: props.projectId,
    projectName: props.projectName || '',
    projectStartTime: props.projectStartTime || '',
    projectEndTime: props.projectEndTime || '',
    projectTeamId: props.projectTeamId || '',
    stage: props.stage || '',
    stageName: props.stageName || ''
  }
})

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
  showAddModal.value = true
}

/**
 * 处理新增/编辑成功
 */
const handleAddSuccess = () => {
  // 清除编辑状态
  editingReport.value = null

  // 重新加载报告列表
  currentPage.value = 1
  loadReportList()
}

/**
 * 处理刷新
 */
const handleRefresh = () => {
  currentPage.value = 1
  loadReportList()
}

/**
 * 处理删除日报
 * @param reportId 日报ID
 */
const handleDeleteReport = async (reportId: string) => {
  try {
    loading.value = true

    // 调用删除API
    const response = await deleteReport(reportId)

    if (response.code === 200) {
      message.success(response.msg || '日报删除成功')

      // 删除成功后重新加载列表
      // 如果当前页没有数据了，回到上一页
      if (reportList.value.length === 1 && currentPage.value > 1) {
        currentPage.value = currentPage.value - 1
      }

      await loadReportList()
    } else {
      message.error(response.msg || '删除失败')
    }
  } catch (error: any) {
    console.error('删除日报失败:', error)
    message.error(error?.message || '删除失败，请重试')
  } finally {
    loading.value = false
  }
}

/**
 * 处理编辑日报
 * @param report 要编辑的日报数据
 */
const handleEditReport = (report: ReportInfo) => {
  // 保存当前编辑的日报数据
  editingReport.value = report

  // 打开编辑模态框
  showAddModal.value = true
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

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;

      .project-name {
        font-size: 14px;
        font-weight: 500;
        color: #0f172a;
        text-align: right;
        max-width: 200px;
        word-break: break-word;
      }

      .action-buttons {
        display: flex;
        align-items: center;
        gap: 4px;

        .edit-btn,
        .delete-btn {
          opacity: 0;
          transition: all 0.2s ease;

          &:hover {
            transform: scale(1.1);
          }
        }

        .edit-btn {
          // 编辑按钮的特殊样式
          &:hover {
            background-color: rgba(24, 160, 251, 0.1);
          }
        }
      }
    }
  }

  // 鼠标悬停时显示操作按钮
  &:hover .header-right .action-buttons {
    .edit-btn,
    .delete-btn {
      opacity: 1;
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
