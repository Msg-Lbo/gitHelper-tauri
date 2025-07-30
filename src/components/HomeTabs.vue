<template>
  <div class="content-container">
    <!-- 根据激活的标签显示对应内容 -->
    <div class="content-panel">
      <!-- 日/周报总结 -->
      <div v-if="activeTab === 'report'" class="panel-content">
        <div class="panel-header">
          <h2 class="panel-title">日/周报总结</h2>
          <p class="panel-description">基于 Git 提交记录自动生成工作总结</p>
        </div>
        <keep-alive>
          <SummarizationPanel />
        </keep-alive>
      </div>

      <!-- 项目管理 -->
      <div v-else-if="activeTab === 'project'" class="panel-content">
        <div class="panel-header">
          <h2 class="panel-title">项目管理</h2>
          <p class="panel-description">管理和配置您的项目信息</p>
        </div>
        <keep-alive>
          <ProjectManager />
        </keep-alive>
      </div>

      <!-- OA系统 -->
      <div v-else-if="activeTab === 'oa'" class="panel-content">
        <div class="panel-header">
          <h2 class="panel-title">OA系统</h2>
          <p class="panel-description">企业办公自动化系统集成</p>
        </div>
        <keep-alive>
          <OASystem />
        </keep-alive>
      </div>

      <!-- 基础设置 -->
      <div v-else-if="activeTab === 'settings'" class="panel-content">
        <div class="panel-header">
          <h2 class="panel-title">基础设置</h2>
          <p class="panel-description">配置应用的基本参数和模板</p>
        </div>
        <keep-alive>
          <SettingsPanel @save="sendSaveEvent" />
        </keep-alive>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import ProjectManager from './ProjectManager.vue'
import SettingsPanel from './SettingsPanel.vue'
import SummarizationPanel from './SummarizationPanel.vue'
import OASystem from './OASystem.vue'

// 接收父组件传递的激活标签
const { activeTab } = defineProps<{
  activeTab: string
}>()

const emit = defineEmits(['save'])
const sendSaveEvent = () => {
  emit('save')
}
</script>

<style scoped lang="scss">
/* 内容容器 */
.content-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
  overflow: hidden; /* 防止整体溢出 */
}

/* 内容面板 */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
  overflow: hidden; /* 防止溢出 */
}

/* 面板内容 */
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
  overflow: hidden;
}

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
