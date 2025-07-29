<template>
  <div class="project-manager">
    <!-- 操作区域 -->
    <div class="action-section">
      <button class="action-btn primary" @click="handleSelectDirectory">
        <span class="btn-icon">📁</span>
        <span class="btn-text">选择项目文件夹</span>
      </button>
    </div>

    <!-- 项目列表 -->
    <div class="projects-section">
      <div class="projects-card">
        <div class="card-header">
          <h3 class="card-title">项目列表</h3>
          <span class="project-count">{{ projects.length }} 个项目</span>
        </div>
        <div class="card-content">
          <div v-if="projects.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <div class="empty-text">暂无项目</div>
            <div class="empty-description">点击上方按钮添加项目文件夹</div>
          </div>
          <div v-else class="projects-list">
            <div
              v-for="(project, index) in projects"
              :key="index"
              class="project-item"
            >
              <div class="project-info">
                <div class="project-icon">📁</div>
                <div class="project-details">
                  <div v-if="!project.editing" class="project-alias">
                    {{ project.alias }}
                  </div>
                  <input
                    v-else
                    v-model="project.alias"
                    class="project-alias-input"
                    @blur="handleSaveAlias(project)"
                    @keyup.enter="handleSaveAlias(project)"
                    @keyup.escape="handleCancelEdit(project)"
                    ref="editInput"
                  />
                  <div class="project-path">{{ project.path }}</div>
                </div>
              </div>
              <div class="project-actions">
                <button
                  v-if="!project.editing"
                  class="action-btn-small edit"
                  @click="handleEditAlias(project)"
                  title="编辑别名"
                >
                  ✏️
                </button>
                <button
                  class="action-btn-small delete"
                  @click="showDeleteConfirm(project, index)"
                  title="删除项目"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="delete-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-icon">
            <span class="warning-icon">⚠️</span>
          </div>
          <h3 class="modal-title">确认删除项目</h3>
        </div>
        <div class="modal-body">
          <p class="modal-message">
            您确定要删除项目 <strong>"{{ deleteTarget?.alias }}"</strong> 吗？
          </p>
          <p class="modal-warning">
            该删除不会影响本地项目文件。
          </p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn secondary" @click="cancelDelete">
            取消
          </button>
          <button class="modal-btn danger" @click="confirmDelete">
            <span class="btn-icon">🗑️</span>
            删除项目
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useMessage } from "naive-ui";
import { invoke } from "@tauri-apps/api/core";

interface Project {
    alias: string;
    path: string;
    editing?: boolean;
    originalAlias?: string; // 用于取消编辑时恢复
}

const LOCAL_KEY = "githelper-projects";
const projects = ref<Project[]>([]);
const message = useMessage();

// 删除确认模态框相关状态
const showDeleteModal = ref(false);
const deleteTarget = ref<Project | null>(null);
const deleteIndex = ref(-1);

const loadProjects = () => {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
        try {
            projects.value = JSON.parse(raw);
        } catch {}
    }
};
const saveProjects = () => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(projects.value));
};

// 选择项目文件夹
const handleSelectDirectory = async () => {
    try {
        const dirPath = (await invoke("select_directory")) as string | null;
        if (dirPath) {
            const alias = dirPath.replace(/\\/g, "/").split("/").pop() || dirPath;
            projects.value.push({ alias, path: dirPath });
            saveProjects();
            message.success("项目添加成功");
        }
    } catch (error) {
        console.error("选择目录失败:", error);
        if (error) {
            message.error(error as any);
        } else {
            message.error("选择目录失败");
        }
    }
};

// 编辑别名
const handleEditAlias = (project: Project) => {
    project.originalAlias = project.alias; // 保存原始值
    project.editing = true;
};

// 保存别名
const handleSaveAlias = (project: Project) => {
    project.editing = false;
    delete project.originalAlias; // 清除原始值
    saveProjects();
    message.success("别名修改成功");
};

// 取消编辑
const handleCancelEdit = (project: Project) => {
    if (project.originalAlias) {
        project.alias = project.originalAlias; // 恢复原始值
    }
    project.editing = false;
    delete project.originalAlias;
};

// 显示删除确认模态框
const showDeleteConfirm = (project: Project, index: number) => {
    deleteTarget.value = project;
    deleteIndex.value = index;
    showDeleteModal.value = true;
};

// 取消删除
const cancelDelete = () => {
    showDeleteModal.value = false;
    deleteTarget.value = null;
    deleteIndex.value = -1;
};

// 确认删除
const confirmDelete = () => {
    if (deleteIndex.value >= 0) {
        projects.value.splice(deleteIndex.value, 1);
        saveProjects();
        message.success("项目删除成功");
    }
    cancelDelete(); // 关闭模态框并重置状态
};

onMounted(loadProjects);
</script>

<style scoped lang="scss">
/* 项目管理器容器 */
.project-manager {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
  overflow: hidden; /* 防止整体溢出 */
}

/* 操作区域 */
.action-section {
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
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

/* 项目区域 */
.projects-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
  overflow: hidden; /* 防止溢出 */
}

.projects-card {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .project-count {
      font-size: 12px;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 12px;
    }
  }

  .card-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    min-height: 0; /* 重要：允许内容正确滚动 */
    /* 使用更精确的高度计算：
       100vh - 标题栏(40px) - 面板标题(80px) - 操作按钮区域(80px) - 卡片头部(70px) - 间距(50px) */
    max-height: calc(100vh - 320px);

    /* 自定义滚动条 */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;

      &:hover {
        background: #94a3b8;
      }
    }
  }
}

/* 空状态 */
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
    color: #64748b;
    margin-bottom: 8px;
  }

  .empty-description {
    font-size: 14px;
    color: #94a3b8;
  }
}

/* 项目列表 */
.projects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .project-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;

    .project-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .project-details {
      flex: 1;
      min-width: 0;

      .project-alias {
        font-size: 14px;
        font-weight: 500;
        color: #0f172a;
        margin-bottom: 4px;
      }

      .project-alias-input {
        width: 100%;
        padding: 4px 8px;
        border: 1px solid #10b981;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        color: #0f172a;
        background: white;
        margin-bottom: 4px;

        &:focus {
          outline: none;
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }
      }

      .project-path {
        font-size: 12px;
        color: #64748b;
        word-break: break-all;
        line-height: 1.4;
      }
    }
  }

  .project-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    .action-btn-small {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s ease;

      &.edit {
        background: #f0f9ff;
        color: #0369a1;

        &:hover {
          background: #e0f2fe;
          transform: scale(1.05);
        }
      }

      &.delete {
        background: #fef2f2;
        color: #dc2626;

        &:hover {
          background: #fee2e2;
          transform: scale(1.05);
        }
      }
    }
  }
}

/* 删除确认模态框样式 */
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
  backdrop-filter: blur(2px);
}

.delete-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;

  .modal-header {
    padding: 24px 24px 16px;
    text-align: center;

    .modal-icon {
      margin-bottom: 12px;

      .warning-icon {
        font-size: 48px;
        display: inline-block;
        animation: warningPulse 2s infinite;
      }
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #dc2626;
      margin: 0;
    }
  }

  .modal-body {
    padding: 0 24px 24px;
    text-align: center;

    .modal-message {
      font-size: 14px;
      color: #374151;
      margin: 0 0 12px 0;
      line-height: 1.5;

      strong {
        color: #dc2626;
        font-weight: 600;
      }
    }

    .modal-warning {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }
  }

  .modal-footer {
    padding: 16px 24px 24px;
    display: flex;
    gap: 12px;
    justify-content: flex-end;

    .modal-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;

      .btn-icon {
        font-size: 14px;
      }

      &.secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;

        &:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
      }

      &.danger {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);

        &:hover {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }
      }
    }
  }
}

/* 动画效果 */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes warningPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}


</style>
