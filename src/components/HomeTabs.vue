<template>
  <n-tabs @update:value="sendSaveEvent" type="line" default-value="report">
    <n-tab-pane name="report" tab="日/周报总结" display-directive="show">
      <keep-alive>
        <SummarizationPanel />
      </keep-alive>
    </n-tab-pane>
    <n-tab-pane name="project" tab="项目管理">
      <keep-alive>
        <ProjectManager />
      </keep-alive>
    </n-tab-pane>
    <n-tab-pane name="oa" tab="OA系统" display-directive="show">
      <keep-alive>
        <OALogin />
      </keep-alive>
    </n-tab-pane>
    <n-tab-pane name="settings" tab="基础设置">
      <keep-alive>
        <SettingsPanel @save="sendSaveEvent" />
      </keep-alive>
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { NTabs, NTabPane } from 'naive-ui'
import ProjectManager from './ProjectManager.vue'
import SettingsPanel from './SettingsPanel.vue'
import SummarizationPanel from './SummarizationPanel.vue'
import OALogin from './OALogin.vue'

const emit = defineEmits(['save'])
const sendSaveEvent = () => {
  emit('save')
}
</script>
