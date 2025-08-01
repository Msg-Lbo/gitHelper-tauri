<template>
  <div class="content-container w-full h-full flex flex-col overflow-hidden">
    <!-- 根据激活的标签显示对应内容 -->
    <div class="content-panel flex-1 flex flex-col h-full overflow-hidden">
      <!-- 日/周报总结 -->
      <div v-if="activeTab === 'report'" class="panel-content flex-1 flex flex-col h-full overflow-hidden">
        <div class="panel-header">
          <h2 class="panel-title">日/周报总结</h2>
          <p class="panel-description">基于 Git 提交记录自动生成工作总结</p>
        </div>
        <keep-alive>
          <SummarizationPanel
            ref="summarizationPanelRef"
            @submit-report="handleSubmitReport"
            @bind-project="handleBindProject"
          />
        </keep-alive>
      </div>

      <!-- 项目管理 -->
      <div v-else-if="activeTab === 'project'" class="panel-content flex-1 flex flex-col h-full overflow-hidden">
        <div class="panel-header">
          <h2 class="panel-title">项目管理</h2>
          <p class="panel-description">管理和配置您的项目信息</p>
        </div>
        <keep-alive>
          <ProjectManager />
        </keep-alive>
      </div>

      <!-- OA系统 -->
      <div v-else-if="activeTab === 'oa'" class="panel-content flex-1 flex flex-col h-full overflow-hidden">
        <div class="panel-header">
          <h2 class="panel-title">OA系统</h2>
          <p class="panel-description">企业办公自动化系统集成</p>
        </div>
        <keep-alive>
          <OASystem />
        </keep-alive>
      </div>

      <!-- 基础设置 -->
      <div v-else-if="activeTab === 'settings'" class="panel-content flex-1 flex flex-col h-full overflow-hidden">
        <div class="panel-header">
          <h2 class="panel-title">基础设置</h2>
          <p class="panel-description">配置应用的基本参数和模板</p>
        </div>
        <keep-alive>
          <SettingsPanel @save="sendSaveEvent" />
        </keep-alive>
      </div>


    </div>

    <!-- 日报提交模态框 -->
    <AddReportModal
      v-if="showAddReportModal"
      :show="showAddReportModal"
      :project-info="{
        id: reportFormData.projectId,
        projectName: reportFormData.projectName,
        projectStartTime: reportFormData.fullProject?.oaProjectInfo?.startTime || '',
        projectEndTime: reportFormData.fullProject?.oaProjectInfo?.endTime || '',
        projectTeamId: reportFormData.fullProject?.oaProjectInfo?.projectTeamId || '',
        stage: reportFormData.fullProject?.oaProjectInfo?.stage || '',
        stageName: reportFormData.fullProject?.oaProjectInfo?.stageName || ''
      }"
      :initial-description="reportFormData.description"
      :work-type="reportFormData.workType"
      @update:show="showAddReportModal = $event"
      @success="handleReportSubmitComplete"
    />

    <!-- 项目绑定模态框 -->
    <OAProjectSelector
      v-if="showBindProjectModal && currentBindProject"
      :show="showBindProjectModal"
      :local-project-id="currentBindProject.path"
      :local-project-name="currentBindProject.alias"
      @update:show="showBindProjectModal = $event"
      @confirm="handleBindComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProjectManager from './ProjectManager.vue'
import SettingsPanel from './SettingsPanel.vue'
import SummarizationPanel from './SummarizationPanel.vue'
import OASystem from './OASystem.vue'
import AddReportModal from './AddReportModal.vue'
import OAProjectSelector from './OAProjectSelector.vue'

// 接收父组件传递的激活标签
const { activeTab } = defineProps<{
  activeTab: string
}>()

const emit = defineEmits(['save'])
const sendSaveEvent = () => {
  emit('save')
}

// 组件引用
const summarizationPanelRef = ref()

// 日报提交相关状态
const showAddReportModal = ref(false)
const showBindProjectModal = ref(false)
const reportFormData = ref({
  projectId: '',
  projectName: '',
  description: '',
  workType: '',
  fullProject: null as any
})
const currentBindProject = ref<any>(null)

// 处理提交日报事件
const handleSubmitReport = (data: any) => {
  reportFormData.value = data
  showAddReportModal.value = true
}

// 处理绑定项目事件
const handleBindProject = (project: any) => {
  currentBindProject.value = project
  showBindProjectModal.value = true
}

// 绑定完成回调
const handleBindComplete = (oaProject?: any) => {
  showBindProjectModal.value = false

  // 如果有绑定的项目信息，更新本地项目数据
  if (oaProject && currentBindProject.value) {
    const projectsData = localStorage.getItem("githelper-projects");
    if (projectsData) {
      const projects = JSON.parse(projectsData);
      const projectIndex = projects.findIndex((p: any) => p.path === currentBindProject.value.path);
      if (projectIndex !== -1) {
        projects[projectIndex].oaProjectId = oaProject.id;
        projects[projectIndex].oaProjectName = oaProject.projectName;
        // 保存完整的 OA 项目信息
        projects[projectIndex].oaProjectInfo = oaProject;
        localStorage.setItem("githelper-projects", JSON.stringify(projects));
      }
    }
  }

  // 通知SummarizationPanel绑定完成
  if (summarizationPanelRef.value?.handleBindComplete) {
    summarizationPanelRef.value.handleBindComplete()
  }
}

// 日报提交完成回调
const handleReportSubmitComplete = () => {
  showAddReportModal.value = false
}
</script>

<style scoped lang="scss">
/* 面板头部 */
.panel-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;

  .panel-title {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
    line-height: 1.2;
  }

  .panel-description {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }
}
</style>
