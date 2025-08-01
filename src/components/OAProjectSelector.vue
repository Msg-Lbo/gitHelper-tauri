<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="选择OA项目"
    size="large"
    :bordered="false"
    :segmented="true"
    :closable="true"
    :close-on-esc="true"
    :mask-closable="false"
    :auto-focus="false"
    :trap-focus="false"
    :block-scroll="true"
    style="width: 600px;"
    class="oa-project-selector"
    @after-leave="handleModalClose"
  >
    <div class="selector-container flex-1 flex flex-col overflow-hidden">
      <!-- 搜索区域 -->
      <div class="search-section">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索项目名称..."
          clearable
          @input="handleSearch"
          class="search-input"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
      </div>

      <!-- 项目列表 -->
      <div class="projects-section flex-1 overflow-hidden">
        <n-spin :show="loading" class="loading-container">
          <div v-if="filteredProjects.length === 0 && !loading" class="empty-state flex flex-col align-center justify-center h-full gap-15">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">{{ searchKeyword ? '未找到匹配的项目' : '暂无项目数据' }}</div>
            <div class="empty-description">
              {{ searchKeyword ? '请尝试其他关键词' : '请先登录OA系统获取项目列表' }}
            </div>
          </div>
          <div v-else-if="!loading" class="projects-list">
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="project-item"
              :class="{ selected: selectedProject?.id === project.id }"
              @click="selectProject(project)"
            >
              <div class="project-info">
                <div class="project-icon">🏢</div>
                <div class="project-details">
                  <div class="project-name">{{ project.projectName }}</div>
                </div>
              </div>
              <div class="project-actions">
                <n-icon v-if="selectedProject?.id === project.id" class="selected-icon">
                  <CheckmarkCircleOutline />
                </n-icon>
              </div>
            </div>
          </div>
          <!-- 加载状态占位 -->
          <div v-if="loading" class="loading-placeholder">
            <div class="loading-text">正在加载项目列表...</div>
          </div>
        </n-spin>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="modal-footer">
        <n-button @click="handleCancel" class="cancel-btn">
          取消
        </n-button>
        <n-button
          type="primary"
          @click="handleConfirm"
          :disabled="!selectedProject"
          class="confirm-btn"
        >
          确认绑定
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NInput,
  NButton,
  NSpin,
  NIcon,
  useMessage
} from 'naive-ui'
import { SearchOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import { getMyProjectList, type ProjectInfo, type ProjectListParams } from '../api/oa'

// ==================== 组件属性和事件 ====================
interface Props {
  show: boolean
  localProjectId: string
  localProjectName: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', project: ProjectInfo): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ==================== 响应式数据 ====================
const message = useMessage()
const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const loading = ref(false)
const searchKeyword = ref('')
const selectedProject = ref<ProjectInfo | null>(null)
const oaProjects = ref<ProjectInfo[]>([])

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchKeyword.value) {
    return oaProjects.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return oaProjects.value.filter(project =>
    project.projectName.toLowerCase().includes(keyword) ||
    project.stageName.toLowerCase().includes(keyword) ||
    project.statusName.toLowerCase().includes(keyword)
  )
})

// ==================== 业务函数 ====================

/**
 * 加载OA项目列表
 */
const loadOAProjects = async () => {
  try {
    loading.value = true

    // 先加载第一页获取总数
    const firstPageParams: ProjectListParams = {
      projectName: '',
      pageNum: 1,
      pageSize: 50
    }

    const firstResponse = await getMyProjectList(firstPageParams)

    if (firstResponse.code === 200 && firstResponse.data) {
      let allProjects = firstResponse.data.list || []
      const total = firstResponse.data.total || 0
      const totalPages = Math.ceil(total / 50)

      // 如果有多页，继续加载其他页
      if (totalPages > 1) {
        const promises = []
        for (let page = 2; page <= Math.min(totalPages, 10); page++) { // 最多加载10页，避免请求过多
          const params: ProjectListParams = {
            projectName: '',
            pageNum: page,
            pageSize: 50
          }
          promises.push(getMyProjectList(params))
        }

        const responses = await Promise.all(promises)
        responses.forEach(response => {
          if (response.code === 200 && response.data?.list) {
            allProjects = allProjects.concat(response.data.list)
          }
        })
      }

      oaProjects.value = allProjects
    } else {
      throw new Error(firstResponse.msg || '获取项目列表失败')
    }

  } catch (error: any) {
    console.error('加载OA项目失败:', error)
    message.error(error?.message || '加载项目列表失败，请检查网络连接')
    oaProjects.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索
 */
const handleSearch = () => {
  // 搜索是通过计算属性实现的，这里可以添加防抖逻辑
}

/**
 * 选择项目
 */
const selectProject = (project: ProjectInfo) => {
  selectedProject.value = project
}



/**
 * 处理取消
 */
const handleCancel = () => {
  showModal.value = false
}

/**
 * 处理确认
 */
const handleConfirm = () => {
  if (selectedProject.value) {
    emit('confirm', selectedProject.value)
    showModal.value = false
  }
}

/**
 * 处理模态框关闭
 */
const handleModalClose = () => {
  selectedProject.value = null
  searchKeyword.value = ''
}

// ==================== 生命周期 ====================

/**
 * 监听模态框显示状态
 */
watch(() => props.show, (isShow) => {
  if (isShow) {
    loadOAProjects()
  }
})
</script>

<style scoped lang="scss">
/* ==================== 模态框样式 ==================== */
.oa-project-selector {
  --primary-color: #10b981;
  --primary-hover: #059669;
  --border-color: #e5e7eb;
  --text-color: #374151;
  --text-secondary: #6b7280;
  --bg-gray: #f9fafb;
}

.selector-container {
  display: flex;
  flex-direction: column;
  height: 400px;
  gap: 16px;
}

/* ==================== 搜索区域 ==================== */
.search-section {
  .search-input {
    width: 100%;
  }
}

/* ==================== 项目列表区域 ==================== */
.projects-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 360px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  position: relative;
}

.loading-container {
  height: 100%;
  min-height: 300px;

  :deep(.n-spin-container) {
    height: 100%;
  }

  :deep(.n-spin-content) {
    height: 100%;
  }
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;

  .loading-text {
    margin-top: 16px;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.projects-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  min-height: 0;
  max-height: 360px;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
  }
  
  &.selected {
    border-color: var(--primary-color);
    background: #f0fdf4;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  }
  
  .project-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    
    .project-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .project-details {
      flex: 1;
      min-width: 0;
      
      .project-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-color);
        line-height: 1.4;
      }
    }
  }
  
  .project-actions {
    flex-shrink: 0;
    
    .selected-icon {
      font-size: 24px;
      color: var(--primary-color);
    }
  }
}

/* ==================== 空状态 ==================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  
  .empty-description {
    font-size: 14px;
    color: #94a3b8;
  }
}

/* ==================== 底部按钮 ==================== */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .cancel-btn {
    padding: 8px 20px;
  }

  .confirm-btn {
    padding: 8px 20px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
