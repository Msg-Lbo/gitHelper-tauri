<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="modalTitle"
    size="large"
    :bordered="false"
    :segmented="true"
    :closable="true"
    :close-on-esc="true"
    :mask-closable="false"
    :auto-focus="false"
    :trap-focus="false"
    :block-scroll="true"
    style="width: 800px; max-height: 90vh;"
    class="add-report-modal"
    @after-leave="handleModalClose"
  >
    <div class="report-form-container flex-1 flex flex-col overflow-hidden">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
        size="small"
        class="report-form"
      >


        <!-- 上班类型 -->
        <n-form-item label="上班类型:" path="workType">
          <n-select
            v-model:value="formData.workType"
            :options="workTypeOptions"
            placeholder="选择上班类型"
          />
        </n-form-item>

        <!-- 加班类型 -->
        <n-form-item label="加班类型:" path="overtimeType">
          <n-select
            v-model:value="formData.overtimeType"
            :options="overtimeTypeOptions"
            placeholder="选择加班类型"
          />
        </n-form-item>

        <!-- 工时 -->
        <n-form-item label="工时:" path="work">
          <div class="work-time-container">
            <n-button
              size="small"
              @click="decreaseWorkTime"
              :disabled="formData.work <= 0"
              class="time-btn"
            >
              -
            </n-button>
            <n-input-number
              v-model:value="formData.work"
              :min="0"
              :max="24"
              :step="0.5"
              :precision="1"
              placeholder="7.5"
              style="flex: 1; margin: 0 8px;"
            />
            <n-button
              size="small"
              @click="increaseWorkTime"
              :disabled="formData.work >= 24"
              class="time-btn"
            >
              +
            </n-button>
          </div>
        </n-form-item>

        <!-- 当前工作进度% -->
        <n-form-item label="当前工作进度%:" path="speed">
          <div class="progress-container">
            <n-button
              size="small"
              @click="decreaseSpeed"
              :disabled="formData.speed <= 0"
              class="time-btn"
            >
              -
            </n-button>
            <n-input-number
              v-model:value="formData.speed"
              :min="0"
              :max="100"
              :step="1"
              placeholder="0"
              style="flex: 1; margin: 0 8px;"
            />
            <n-button
              size="small"
              @click="increaseSpeed"
              :disabled="formData.speed >= 100"
              class="time-btn"
            >
              +
            </n-button>
          </div>
        </n-form-item>

        <!-- 描述 -->
        <n-form-item label="描述:" path="remarks">
          <n-input
            v-model:value="formData.remarks"
            type="textarea"
            placeholder="请输入内容"
            :rows="6"
          />
        </n-form-item>

          <!-- 明日计划进度% -->
          <n-form-item label="明日计划进度%:" path="speedPlan">
            <div class="progress-container">
              <n-button
                size="small"
                @click="decreaseSpeedPlan"
                :disabled="formData.speedPlan <= 0"
                class="time-btn"
              >
                -
              </n-button>
              <n-input-number
                v-model:value="formData.speedPlan"
                :min="0"
                :max="100"
                :step="1"
                placeholder="0"
                style="flex: 1; margin: 0 8px;"
              />
              <n-button
                size="small"
                @click="increaseSpeedPlan"
                :disabled="formData.speedPlan >= 100"
                class="time-btn"
              >
                +
              </n-button>
            </div>
          </n-form-item>

          <!-- 明日工作计划 -->
          <n-form-item label="明日工作计划:" path="tomorrowWorkPlan">
            <n-input
              v-model:value="formData.tomorrowWorkPlan"
              type="textarea"
              placeholder="请输入内容"
              :rows="4"
            />
          </n-form-item>

          <!-- 遇到的问题 -->
          <n-form-item label="遇到的问题:" path="difficulty">
            <n-input
              v-model:value="formData.difficulty"
              type="textarea"
              placeholder="请输入内容"
              :rows="4"
            />
          </n-form-item>
      </n-form>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <n-button
          @click="handleCancel"
          class="cancel-btn"
          secondary
        >
          取消
        </n-button>
        <n-button
          @click="handleSubmit"
          :loading="submitting"
          class="submit-btn"
        >
          提交
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================

// Vue 核心功能
import { ref, reactive, computed, watch } from 'vue'

// Naive UI 组件和工具
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NButton,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'

// API 接口和类型
import {
  addReport,
  getMyProjectList,
  getUserProfile,
  getProjectTeamList,
  type AddReportParams
} from '../api/oa'

// ==================== 类型定义 ====================

/**
 * 组件属性接口
 */
interface Props {
  show: boolean                    // 是否显示模态框
  projectInfo?: {                  // 项目信息（可选）
    id: string                     // 项目ID
    projectName: string            // 项目名称
    projectStartTime: string       // 项目开始时间
    projectEndTime: string         // 项目结束时间
    projectTeamId: string          // 项目团队ID
    stage: string                  // 阶段ID
    stageName: string              // 阶段名称
  }
  initialDescription?: string      // 初始描述内容
  workType?: string               // 工作类型（正常/加班）
  editData?: {                     // 编辑数据（可选，用于编辑模式）
    id: string                     // 日报ID
    work: number                   // 工作时长
    speed: number                  // 当前进度
    remarks: string                // 描述备注
    workType: number               // 上班类型
    overtimeType: number           // 加班类型
    speedPlan: number              // 明日计划进度
    tomorrowWorkPlan: string       // 明日工作计划
    difficulty: string             // 遇到的问题
  }
}

/**
 * 组件事件接口
 */
interface Emits {
  (e: 'update:show', value: boolean): void  // 更新显示状态
  (e: 'success'): void                      // 提交成功事件
}

// ==================== 组件配置 ====================

/**
 * 组件属性配置
 */
const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialDescription: '',
  workType: ''
})

/**
 * 组件事件配置
 */
const emit = defineEmits<Emits>()

// ==================== 响应式数据 ====================

/**
 * UI 相关状态
 */
const message = useMessage()                    // 消息提示工具
const formRef = ref<FormInst>()                // 表单引用
const submitting = ref(false)                  // 提交状态

/**
 * 模态框显示状态（双向绑定）
 */
const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

/**
 * 模态框标题（根据是否为编辑模式动态显示）
 */
const modalTitle = computed(() => {
  return props.editData ? '编辑日报' : '新增日报'
})

/**
 * 日期选择器状态（暂未使用，保留备用）
 */
const startTimeValue = ref<number | null>(null)
const endTimeValue = ref<number | null>(null)

/**
 * 表单数据对象
 */
const formData = reactive({
  workType: 0,                  // 上班类型：0-公司上班，1-居家办公
  overtimeType: 0,              // 加班类型：0-正常上班，1-加班
  work: 7.5,                    // 工作时长（小时）
  speed: 0,                     // 当前进度（百分比）
  remarks: '',                  // 工作描述备注
  speedPlan: 0,                 // 明日计划进度（百分比）
  submitCode: 1,                // 是否提交了代码：0-否，1-是
  tomorrowWorkPlan: '',         // 明日工作计划
  projectId: '',                // 项目ID
  difficulty: ''                // 遇到的问题
})

/**
 * 下拉选项配置
 */
const workTypeOptions = [
  { label: '公司上班', value: 0 },
  { label: '居家办公', value: 1 }
]

const overtimeTypeOptions = [
  { label: '正常上班', value: 0 },
  { label: '加班', value: 1 }
]

/**
 * 表单验证规则（暂无特殊规则）
 */
const formRules: FormRules = {}

// ==================== 方法函数 ====================

/**
 * 监听项目信息变化，自动填充表单
 */
watch(() => props.projectInfo, (newInfo) => {
  if (newInfo && newInfo.id) {
    formData.projectId = newInfo.id
  }
}, { immediate: true })

/**
 * 监听初始描述变化
 */
watch(() => props.initialDescription, (newDescription) => {
  if (newDescription) {
    formData.remarks = newDescription
  }
}, { immediate: true })

/**
 * 监听工作类型变化
 */
watch(() => props.workType, (newWorkType) => {
  if (newWorkType) {
    if (newWorkType === '加班') {
      formData.overtimeType = 1  // 加班
    } else {
      formData.overtimeType = 0  // 正常上班
    }
  }
}, { immediate: true })

/**
 * 监听模态框显示状态，确保项目ID正确设置并填充初始数据
 */
watch(() => props.show, (isShow) => {
  if (isShow) {
    // 如果是编辑模式，优先使用编辑数据填充表单
    if (props.editData) {
      Object.assign(formData, {
        workType: props.editData.workType,
        overtimeType: props.editData.overtimeType,
        work: props.editData.work,
        speed: props.editData.speed,
        remarks: props.editData.remarks,
        speedPlan: props.editData.speedPlan,
        tomorrowWorkPlan: props.editData.tomorrowWorkPlan,
        difficulty: props.editData.difficulty,
        projectId: props.projectInfo?.id || ''
      })
    } else {
      // 新增模式：设置项目ID
      if (props.projectInfo?.id) {
        formData.projectId = props.projectInfo.id
      }

      // 设置初始描述
      if (props.initialDescription) {
        formData.remarks = props.initialDescription
      }

      // 设置工作类型
      if (props.workType === '加班') {
        formData.overtimeType = 1  // 加班
      } else {
        formData.overtimeType = 0  // 正常上班
      }
    }
  }
})



/**
 * 增加工作时长
 */
const increaseWorkTime = () => {
  if (formData.work < 24) {
    formData.work = Math.round((formData.work + 0.5) * 10) / 10
  }
}

/**
 * 减少工作时长
 */
const decreaseWorkTime = () => {
  if (formData.work > 0) {
    formData.work = Math.round((formData.work - 0.5) * 10) / 10
  }
}

/**
 * 增加当前进度
 */
const increaseSpeed = () => {
  if (formData.speed < 100) {
    formData.speed += 1
  }
}

/**
 * 减少当前进度
 */
const decreaseSpeed = () => {
  if (formData.speed > 0) {
    formData.speed -= 1
  }
}

/**
 * 增加明日计划进度
 */
const increaseSpeedPlan = () => {
  if (formData.speedPlan < 100) {
    formData.speedPlan += 1
  }
}

/**
 * 减少明日计划进度
 */
const decreaseSpeedPlan = () => {
  if (formData.speedPlan > 0) {
    formData.speedPlan -= 1
  }
}

/**
 * 处理取消操作
 */
const handleCancel = () => {
  showModal.value = false
}

/**
 * 处理模态框关闭
 */
const handleModalClose = () => {
  // 重置表单数据
  Object.assign(formData, {
    workType: 0,                  // 上班类型：0-公司上班，1-居家办公
    overtimeType: 0,              // 加班类型：0-正常上班，1-加班
    work: 7.5,                    // 工作时长
    speed: 0,                     // 当前进度
    remarks: '',                  // 描述备注
    speedPlan: 0,                 // 明日计划进度
    submitCode: 1,                // 是否提交了代码：0-否，1-是
    tomorrowWorkPlan: '',         // 明日工作计划
    projectId: '',                // 项目ID
    difficulty: ''                // 遇到的问题
  })

  // 重置日期选择器
  startTimeValue.value = null
  endTimeValue.value = null
}

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  try {


    submitting.value = true

    // 构建提交数据
    const projectInfo = props.projectInfo

    // 获取完整的项目信息和团队信息
    let finalProjectInfo: any = projectInfo
    let projectTeamId = ''
    let teamStartTime = ''
    let teamEndTime = ''

    try {
      // 1. 获取当前用户信息
      const userProfileResponse = await getUserProfile()
      if (userProfileResponse.code !== 200 || !userProfileResponse.data) {
        throw new Error('获取用户信息失败')
      }
      const currentUserId = userProfileResponse.data.userId.toString()

      // 2. 获取项目团队列表
      const teamListResponse = await getProjectTeamList(formData.projectId)
      if (teamListResponse.code === 200 && teamListResponse.data) {
        // 找到当前用户在项目团队中的记录
        const currentUserTeam = teamListResponse.data.find(member => member.userId === currentUserId)
        if (currentUserTeam) {
          projectTeamId = currentUserTeam.id
          teamStartTime = currentUserTeam.startTime
          teamEndTime = currentUserTeam.endTime
        }
      }

      // 3. 如果缺少项目基本信息，从项目列表获取
      if (!projectInfo?.projectStartTime || !projectInfo?.projectEndTime || !projectInfo?.stage) {
        const projectListResponse = await getMyProjectList({ projectName: '', pageNum: 1, pageSize: 100 })
        if (projectListResponse.code === 200 && projectListResponse.data?.list) {
          const fullOAProject = projectListResponse.data.list.find((p: any) => p.id === formData.projectId)
          if (fullOAProject) {
            finalProjectInfo = {
              id: fullOAProject.id,
              projectName: fullOAProject.projectName,
              projectStartTime: fullOAProject.startTime,
              projectEndTime: fullOAProject.endTime,
              projectTeamId: projectTeamId, // 使用从团队列表获取的ID
              stage: fullOAProject.stage,
              stageName: fullOAProject.stageName,
              status: fullOAProject.status,
              statusName: fullOAProject.statusName
            }
          }
        }
      } else if (finalProjectInfo) {
        // 更新项目团队ID
        finalProjectInfo = {
          ...finalProjectInfo,
          projectTeamId: projectTeamId
        }
      }
    } catch (error) {
      console.warn('获取项目和团队信息失败:', error)
    }

    const submitData: AddReportParams = {
      ...(props.editData?.id && { id: props.editData.id }), // 编辑模式时包含日报ID
      work: formData.work,                    // 工作时长
      speed: formData.speed,                  // 当前进度
      projectName: finalProjectInfo?.projectName, // 项目名称（从项目信息获取）
      stage: finalProjectInfo?.stage,           // 阶段ID（使用开发阶段ID）
      status: finalProjectInfo?.status,          // 状态ID（从项目信息获取）
      remarks: formData.remarks,              // 描述备注
      workType: formData.workType,            // 上班类型 0-公司上班 1-居家办公
      overtimeType: formData.overtimeType,    // 加班类型 0-正常上班 1-加班
      submitCode: 1,                          // 是否提交了代码（默认为是） 0-否 1-是
      projectStartTime: finalProjectInfo?.projectStartTime, // 项目开始时间（从项目信息获取）
      projectEndTime: finalProjectInfo?.projectEndTime,     // 项目结束时间（从项目信息获取）
      speedPlan: formData.speedPlan,          // 明日计划进度
      overtimePlan: 0,                        // 明日加班计划
      stageName: finalProjectInfo?.stageName,                 // 阶段名称（默认值）
      statusName: finalProjectInfo?.statusName,      // 状态名称（从项目信息获取）
      startTime: teamStartTime || finalProjectInfo?.projectStartTime ,   // 开始时间（从团队信息获取）
      endTime: teamEndTime || finalProjectInfo?.projectEndTime,         // 结束时间（从团队信息获取）
      projectTeamId: projectTeamId,     // 项目团队ID（从团队列表获取）
      projectId: formData.projectId,    // 项目ID（从项目信息传递）
      tomorrowWorkPlan: formData.tomorrowWorkPlan, // 明日工作计划
      difficulty: formData.difficulty,        // 遇到的问题
      color: 2                                // 颜色标识
    }



    // 调用API提交数据
    const response = await addReport(submitData)

    if (response.code === 200) {
      const successMsg = props.editData ? '日报更新成功！' : '日报提交成功！'
      message.success(response.msg || successMsg)
      showModal.value = false
      emit('success')
    } else {
      const errorMsg = props.editData ? '更新失败' : '提交失败'
      throw new Error(response.msg || errorMsg)
    }

  } catch (error: any) {
    let errorMessage = '提交失败'
    if (error?.message) {
      errorMessage = error.message
    } else if (error?.response?.data?.msg) {
      errorMessage = error.response.data.msg
    } else if (error?.data?.msg) {
      errorMessage = error.data.msg
    }

    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ==================== 模态框样式 ==================== */
.add-report-modal {
  --primary-color: #10b981;
  --primary-hover: #059669;
  --border-color: #e5e7eb;
  --text-color: #374151;
  --text-secondary: #6b7280;
  --bg-gray: #f9fafb;
  --danger-color: #ef4444;
}

.report-form-container {
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}

.report-form::-webkit-scrollbar {
  width: 6px;
}

.report-form::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.report-form::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.report-form::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ==================== 表单样式 ==================== */
.report-form {
  padding: 8px 16px 8px 0;
  flex: 1;
  overflow-y: auto;
  margin-right: 8px;
}

.readonly-input {
  background-color: var(--bg-gray);
  cursor: not-allowed;
}

/* ==================== 工时控制器样式 ==================== */
.work-time-container,
.progress-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.time-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
}

.time-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: white;
  transform: translateY(-1px);
}

.time-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}





/* ==================== 底部按钮样式 ==================== */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0 4px 0;
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  background: white;
}

.cancel-btn {
  padding: 8px 24px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  background-color: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #6c757d !important;
}

.cancel-btn:hover {
  background-color: #e9ecef !important;
  border-color: #dee2e6 !important;
  transform: translateY(-1px);
}

.submit-btn {
  padding: 8px 24px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  background: #10b981 !important;
  background-color: #10b981 !important;
  border: 1px solid #10b981 !important;
  color: white !important;
}

.submit-btn:hover {
  background: #059669 !important;
  background-color: #059669 !important;
  border-color: #059669 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
}

.submit-btn:focus {
  background: #10b981 !important;
  background-color: #10b981 !important;
  border-color: #10b981 !important;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 深度选择器确保样式生效 */
:deep(.submit-btn) {
  background: #10b981 !important;
  background-color: #10b981 !important;
  border-color: #10b981 !important;
  color: white !important;
}

:deep(.submit-btn:hover) {
  background: #059669 !important;
  background-color: #059669 !important;
  border-color: #059669 !important;
}

:deep(.submit-btn:focus) {
  background: #10b981 !important;
  background-color: #10b981 !important;
  border-color: #10b981 !important;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .add-report-modal {
    width: 95vw !important;
    margin: 0 auto;
  }

  .report-form-container {
    max-height: 50vh;
  }

  .modal-footer {
    flex-direction: column;
    gap: 8px;
  }

  .cancel-btn,
  .submit-btn {
    width: 100%;
  }
}
</style>
