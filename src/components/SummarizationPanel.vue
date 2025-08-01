<template>
  <div class="summarization-panel flex-1 flex flex-col overflow-hidden">
    <!-- 操作区域 -->
    <div class="action-section">
      <div class="action-buttons flex gap-15">
        <button class="action-btn primary flex align-center gap-10" @click="openProjectModal('daily')">
          <span class="btn-icon">📊</span>
          <span class="btn-text">总结正常日报</span>
        </button>
        <button class="action-btn primary flex align-center gap-10" @click="openProjectModal('overtime')">
          <span class="btn-icon">⏰</span>
          <span class="btn-text">总结加班日报</span>
        </button>
        <button class="action-btn primary flex align-center gap-10" @click="openProjectModal('weekly')">
          <span class="btn-icon">📅</span>
          <span class="btn-text">总结周报</span>
        </button>
      </div>
    </div>

    <!-- 内容展示区域 -->
    <div class="content-section flex-1 flex flex-col overflow-hidden">
      <div class="content-card flex-1 flex flex-col overflow-hidden">
        <div class="content-header flex justify-between align-center">
          <h3 class="content-title">生成结果</h3>
          <div class="content-status" :class="{ loading: loading }">
            <span v-if="loading" class="status-text">生成中...</span>
            <span v-else class="status-text">就绪</span>
          </div>
        </div>
        <div class="content-body flex-1 flex flex-col overflow-hidden">
          <div ref="logContainerRef" class="log-container flex-1 overflow-y-auto" :class="{ loading: loading }">
            <pre class="log-content">{{ logRef || '点击上方按钮开始生成报告...' }}</pre>
          </div>
        </div>
      </div>
    </div>
    <!-- 项目选择模态框 -->
    <div v-if="showModal" class="modal-overlay flex align-center justify-center" @click="showModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header flex justify-between align-center">
          <h3 class="modal-title">{{ modalTitle }}</h3>
          <button class="modal-close flex align-center justify-center" @click="showModal = false">×</button>
        </div>
        <div class="modal-body">
          <!-- 单选模式 -->
          <div v-if="selectMode === 'single'" class="project-selection">
            <div class="selection-title">请选择项目：</div>
            <div class="radio-group">
              <label v-for="p in projectList" :key="p.path" class="radio-item flex align-center gap-10">
                <input
                  type="radio"
                  :value="p.path"
                  v-model="selectedProject"
                  class="radio-input"
                />
                <span class="radio-label">{{ p.alias }}</span>
              </label>
            </div>
          </div>
          <!-- 多选模式 -->
          <div v-else class="project-selection">
            <div class="selection-title">请选择项目：</div>
            <div class="checkbox-group">
              <label v-for="p in projectList" :key="p.path" class="checkbox-item flex align-center gap-10">
                <input
                  type="checkbox"
                  :value="p.path"
                  v-model="selectedProjects"
                  class="checkbox-input"
                />
                <span class="checkbox-label">{{ p.alias }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer flex justify-end gap-15">
          <button class="modal-btn primary" @click="onProjectSelectConfirm">确定</button>
          <button class="modal-btn secondary" @click="showModal = false">取消</button>
        </div>
      </div>
    </div>
    <!-- 浮动复制按钮 -->
    <button
      v-if="showCopyButton"
      class="floating-copy-btn"
      @click="handleCopySummary"
      title="复制结果"
    >
      <span class="copy-icon">📋</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watchEffect } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { chatWithDeepSeek } from "../api/deepseek";
import { invoke } from "@tauri-apps/api/core";

// 定义组件事件
const emit = defineEmits<{
  'submit-report': [data: {
    projectId: string;
    projectName: string;
    description: string;
    workType: string;
    fullProject: any;
  }];
  'bind-project': [project: Project];
}>();

const type = ref<"daily" | "overtime" | "weekly">("daily");
const loading = ref(false);
const message = useMessage();
const dialog = useDialog();
const logRef = ref("");
const logContainerRef = ref<HTMLElement | null>(null);
const showCopyButton = ref(false);

// 提交日报相关状态
const currentSummary = ref("");
const currentProjectInfo = ref<Project | null>(null);

// 获取配置
const getSettings = () => {
    const raw = localStorage.getItem("githelper-settings");
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch {}
    }
    return {};
};

// 获取配置
const settings = getSettings();
const gitUser = settings.gitUser || "";

/**
 * 计算本周一的日期
 * @returns 本周一的日期，格式为 YYYY-MM-DD
 */
const getThisMonday = (): string => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 如果是周日，则往前推6天到周一
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0); // 设置为00:00:00
    return monday.toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
};

// 获取本周的提交记录（从本周一00:00开始到现在）
const weeklyCommand = `git log --since="${getThisMonday()}" --author="${gitUser}" --pretty=format:"%an %ad %s" --date=format:"%Y-%m-%d %A"`;
// 获取当天到18:30的提交记录
const dailyCommand = `git log --since="00:00" --until="18:30" --author="${gitUser}" --pretty=format:"%an %ad %s" --date=format:"%Y-%m-%d %A"`;
// 获取当天18:30到21点的提交记录
const overtimeCommand = `git log --since="18:30" --author="${gitUser}" --pretty=format:"%an %ad %s" --date=format:"%Y-%m-%d %A"`;

// 项目选择相关，单选/多选
interface Project {
    alias: string;
    path: string;
}

const showModal = ref(false);
const selectMode = ref<"single" | "multiple">("single");
const projectList = ref<Project[]>([]);
const selectedProject = ref<string>("");
const selectedProjects = ref<string[]>([]);
const modalTitle = ref("选择项目");

// 打开项目选择弹窗
const openProjectModal = (summarizeType: "daily" | "overtime" | "weekly") => {
  console.log(gitUser);
  
    if (!gitUser) {
        message.warning("请先配置 Git 用户名");
        return;
    }
    type.value = summarizeType;
    selectMode.value = summarizeType === "daily" || summarizeType === "overtime" ? "single" : "multiple";
    modalTitle.value = summarizeType === "daily" || summarizeType === "overtime" ? "选择项目（单选）" : "选择项目（多选）";
    // 读取项目列表
    const raw = localStorage.getItem("githelper-projects");
    projectList.value = raw ? JSON.parse(raw) : [];
    selectedProject.value = "";
    selectedProjects.value = [];
    showModal.value = true;
};

// 选择项目
const onProjectSelectConfirm = async () => {
    if (selectMode.value === "single" && !selectedProject.value) {
        message.warning("请选择一个项目");
        return;
    }
    if (selectMode.value === "multiple" && selectedProjects.value.length === 0) {
        message.warning("请至少选择一个项目");
        return;
    }

    // 设置当前项目信息（用于后续提交日报）
    if (selectMode.value === "single" && selectedProject.value) {
        const project = projectList.value.find(p => p.path === selectedProject.value);
        if (project) {
            currentProjectInfo.value = project;
        }
    }

    showModal.value = false;
    await handleSummarize(type.value);
};

// 总结
const handleSummarize = async (summarizeType: "daily" | "overtime" | "weekly") => {
    try {
        loading.value = true;
        // 根据类型选择对应的git命令
        let command = weeklyCommand; // 默认周报命令
        if (summarizeType === "daily") {
            command = dailyCommand;
        } else if (summarizeType === "overtime") {
            command = overtimeCommand;
        }

        if (summarizeType === "daily" || summarizeType === "overtime") {
            // 单选模式（日报和加班日报）
            logRef.value = "";
            const projectPath = selectedProject.value;
            if (!projectPath) return;
            const project = projectList.value.find((p) => p.path === projectPath);
            const result = (await invoke("run_git_log", { command, projectPath })) as string;
            // 每行加 [别名]
            const prefix = project ? `[${project.alias}] ` : "";
            logRef.value = (result || "")
                .split("\n")
                .map((line) => (line ? prefix + line : ""))
                .join("\n");
        } else {
            // 多选模式（周报）
            logRef.value = "";
            let allLogs = "";
            for (const projectPath of selectedProjects.value) {
                const project = projectList.value.find((p) => p.path === projectPath);
                let result = (await invoke("run_git_log", { command, projectPath })) as string;
                const prefix = project ? `[${project.alias}] ` : "";
                allLogs +=
                    (result || "")
                        .split("\n")
                        .map((line) => (line ? `${prefix}${line}` : ""))
                        .join("\n") + "\n\n";
            }
            logRef.value = allLogs;
        }
        if (!logRef.value || logRef.value.trim() === "") {
            message.error("获取日志失败或没有日志");
            loading.value = false;
            return;
        }
        await handleSummarizeDeepSeek();
        loading.value = false;
    } catch (error) {
        loading.value = false;
        console.error("Error in handleSummarize:", error);
        message.error("执行失败，请检查配置");
    }
};

// 调用 deepseek 总结
const handleSummarizeDeepSeek = async () => {
    try {
        const settings = getSettings();
        const token = settings.token || "";
        if (!token) {
            message.error("请先配置 DeepSeek 的 API Key");
            return;
        }
        const messages = [{ role: "user", content: logRef.value }];
        if (type.value === "daily" || type.value === "overtime") {
            // 日报和加班日报都使用日报模板
            messages.unshift({ role: "system", content: settings.dailyTemplate });
        } else {
            // 周报使用周报模板
            messages.unshift({ role: "system", content: settings.weeklyTemplate });
        }
        // 先在日志最后一行添加分割线
        logRef.value += "\n--------------------\n";
        // 调用 DeepSeek API 进行总结（非流式）
        logRef.value += "正在调用 DeepSeek API...\n";
        const response = await chatWithDeepSeek(messages, token, "deepseek-chat", false);

        // 处理非流式响应
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
            const deepseekText = response.choices[0].message.content;
            logRef.value = logRef.value.replace(/(--------------------\n)[\s\S]*$/, `$1${deepseekText}`);
            await nextTick();
            scrollToBottom();
        } else {
            throw new Error("DeepSeek API 响应格式错误");
        }
        // deepseek 输出完成后显示复制按钮和提交确认
        await nextTick();
        showCopyButton.value = true;

        // 如果是日报类型（正常日报或加班日报），询问是否提交
        if (type.value === "daily" || type.value === "overtime") {
            await showSubmitConfirmation();
        }
    } catch (error) {
        console.error("DeepSeek 总结失败:", error);
        message.error("DeepSeek 总结失败");
    }
};

// 一键复制分割线下内容
const handleCopySummary = async () => {
    // 提取分割线下内容
    const match = logRef.value.match(/--------------------\n([\s\S]*)$/);
    const summary = match ? match[1] : "";
    if (summary) {
        await navigator.clipboard.writeText(summary);
        message.success("已复制到剪贴板");
    } else {
        message.warning("暂无可复制内容");
    }
};

// 显示提交确认对话框
const showSubmitConfirmation = async () => {
    // 提取DeepSeek生成的内容作为日报描述
    const match = logRef.value.match(/--------------------\n([\s\S]*)$/);
    const summary = match ? match[1].trim() : "";

    if (!summary) {
        message.warning("没有可提交的内容");
        return;
    }

    // 检查当前选中的项目是否绑定了OA项目
    if (!currentProjectInfo.value) {
        message.warning("请先选择项目");
        return;
    }

    // 获取项目列表，检查绑定状态
    const projectsData = localStorage.getItem("githelper-projects");
    if (!projectsData) {
        message.warning("未找到项目信息");
        return;
    }

    const projects = JSON.parse(projectsData);
    const project = projects.find((p: any) => p.path === currentProjectInfo.value?.path);

    if (!project) {
        message.warning("未找到当前项目信息");
        return;
    }

    // 存储当前摘要内容
    currentSummary.value = summary;

    // 检查项目是否已绑定OA项目
    if (!project.oaProjectId) {
        // 未绑定，询问是否要绑定
        dialog.warning({
            title: '项目未绑定',
            content: `项目"${project.alias}"尚未绑定OA项目，是否现在绑定？`,
            positiveText: '立即绑定',
            negativeText: '取消',
            onPositiveClick: () => {
                // 触发绑定项目事件
                emit('bind-project', project);
            }
        });
        return;
    }

    // 已绑定，询问是否提交日报
    dialog.info({
        title: '提交日报',
        content: '是否要将当前总结提交为日报？',
        positiveText: '是',
        negativeText: '否',
        onPositiveClick: () => {
            handleSubmitReport(project, summary);
        }
    });
};

// 处理提交日报
const handleSubmitReport = (project: any, summary: string) => {
    // 触发事件，通知父组件打开日报填写模态框
    emit('submit-report', {
        projectId: project.oaProjectId,
        projectName: project.oaProjectName || project.alias,
        description: summary,
        workType: type.value === "overtime" ? "加班" : "正常",
        // 传递完整的项目信息，优先使用保存的 OA 项目信息
        fullProject: project.oaProjectInfo || project
    });
};

// 绑定完成后的回调，重新尝试提交
const handleBindComplete = () => {
    if (currentSummary.value) {
        // 重新检查项目绑定状态并提交
        showSubmitConfirmation();
    }
};

// 暴露方法给父组件调用
defineExpose({
    handleBindComplete
});

// 自动滚动到底部的函数
const scrollToBottom = () => {
    if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
    }
};

watchEffect(() => {
    if (logRef.value) {
        nextTick(() => {
            scrollToBottom();
        });
    }
});
</script>

<style scoped lang="scss">
/* 操作区域 - 确保不被挤压 */
.action-section {
  flex-shrink: 0; /* 防止被压缩 */
  padding-bottom: 16px; /* 底部留出空间 */

  .action-buttons {
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;

    .btn-icon {
      font-size: 16px;
    }

    &.primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);

      &:hover {
        background: linear-gradient(135deg, #059669, #047857);
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
      }
    }
  }
}

.content-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;

  .content-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f1f5f9;

    .content-title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .content-status {
      gap: 8px;

      .status-text {
        font-size: 12px;
        color: #64748b;
      }

      &.loading .status-text {
        color: #10b981;
      }

      &.loading::before {
        content: '';
        width: 12px;
        height: 12px;
        border: 2px solid #e2e8f0;
        border-top: 2px solid #10b981;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }
  }

  .content-body {
    padding: 24px;

    .log-container {
      max-height: 400px; /* 限制日志容器的最大高度 */
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;

      &.loading {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      .log-content {
        padding: 16px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #374151;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
        min-height: 100%;
      }
    }
  }
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #64748b;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;

        &:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
      }
    }

    .modal-body {
      padding: 24px;
      max-height: 400px;
      overflow-y: auto;

      .project-selection {
        .selection-title {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 16px;
        }

        .radio-group,
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radio-item,
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background 0.2s ease;

          &:hover {
            background: #f8fafc;
          }

          .radio-input,
          .checkbox-input {
            margin: 0;
          }

          .radio-label,
          .checkbox-label {
            font-size: 14px;
            color: #374151;
          }
        }
      }
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      .modal-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &.primary {
          background: #10b981;
          color: white;

          &:hover {
            background: #059669;
          }
        }

        &.secondary {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;

          &:hover {
            background: #f1f5f9;
          }
        }
      }
    }
  }
}

/* 浮动复制按钮 - 修复遮挡问题 */
.floating-copy-btn {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 0.2s ease;
  z-index: 10;

  .copy-icon {
    font-size: 18px;
  }

  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}


</style>
