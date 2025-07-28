<template>
    <div class="oa-login">
        <!-- 未登录状态：显示登录按钮 -->
        <div v-if="!isLoggedIn" class="login-prompt">
            <div class="prompt-container">
                <div class="prompt-icon">
                    <n-icon size="48"><PersonOutline /></n-icon>
                </div>
                <h3 class="prompt-title">请先登录OA系统</h3>
                <p class="prompt-description">点击下方按钮进行身份验证</p>
                <n-button type="primary" size="large" @click="showLoginModal = true" class="login-btn">
                    <template #icon>
                        <n-icon><LockClosedOutline /></n-icon>
                    </template>
                    登录
                </n-button>
            </div>
        </div>

        <!-- 已登录状态：显示项目列表 -->
        <div v-else class="project-list-container">
            <!-- 头部操作栏 -->
            <div class="header-actions">
                <div class="search-container">
                    <n-input
                        size="small"
                        v-model:value="searchForm.projectName"
                        placeholder="搜索项目名称"
                        clearable
                        @keyup.enter="handleSearch"
                        class="search-input"
                    >
                        <template #prefix>
                            <n-icon><SearchOutline /></n-icon>
                        </template>
                    </n-input>
                    <n-button size="small" type="primary" @click="handleSearch" :loading="loading"> 搜索 </n-button>
                </div>
                <n-button size="small" @click="handleLogout" type="warning"> 退出登录 </n-button>
            </div>

            <!-- 项目列表 -->
            <div class="project-list">
                <n-data-table
                    :columns="columns"
                    :data="projectList"
                    :loading="loading"
                    :pagination="paginationReactive"
                    :bordered="false"
                    :scroll-x="700"
                    :max-height="350"
                    size="small"
                    class="project-table"
                />
            </div>
        </div>

        <!-- 登录模态框 -->
        <LoginModal v-model:show="showLoginModal" @login-success="handleLoginSuccess" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, h } from "vue";
import { NButton, NIcon, NInput, NDataTable, useMessage } from "naive-ui";
import { PersonOutline, LockClosedOutline, SearchOutline, EyeOutline } from "@vicons/ionicons5";
import { OATokenManager, getMyProjectList, type ProjectInfo, type ProjectListParams } from "../api/oa";
import LoginModal from "./LoginModal.vue";

// 消息提示
const message = useMessage();

// 状态变量
const isLoggedIn = ref(false);
const showLoginModal = ref(false);
const loading = ref(false);
const projectList = ref<ProjectInfo[]>([]);

// 搜索表单
const searchForm = reactive({
    projectName: "",
    pageNum: 1,
    pageSize: 10,
});

// 分页配置
const paginationReactive = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    prefix: (info: {
        startIndex: number;
        endIndex: number;
        page: number;
        pageSize: number;
        pageCount: number;
        itemCount: number | undefined;
    }) => `共 ${info.itemCount || 0} 条`,
    onChange: (page: number) => {
        searchForm.pageNum = page;
        loadProjectList();
    },
    onUpdatePageSize: (pageSize: number) => {
        searchForm.pageSize = pageSize;
        searchForm.pageNum = 1;
        paginationReactive.page = 1;
        loadProjectList();
    },
});

// 表格列定义
const columns = [
    {
        title: "项目名称",
        key: "projectName",
        width: 60,
        ellipsis: {
            tooltip: true,
        },
    },
    {
        title: "项目状态",
        key: "statusName",
        width: 20,
        render: (row: ProjectInfo) => {
            return h(
                "span",
                {
                    style: {
                        color: getStatusColor(row.statusName),
                        fontWeight: "500",
                    },
                },
                row.statusName
            );
        },
    },
    {
        title: "操作",
        key: "actions",
        width: 15,
        render: (row: ProjectInfo) => {
            return h(
                NButton,
                {
                    size: "small",
                    type: "primary",
                    ghost: true,
                    onClick: () => handleViewProject(row),
                },
                {
                    default: () => "查看",
                    icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
                }
            );
        },
    },
];

// 获取状态颜色
const getStatusColor = (statusName: string): string => {
    const statusColorMap: Record<string, string> = {
        待确认原型: "#f39c12",
        开发中: "#3498db",
        待开发会议确认: "#e67e22",
        验收中: "#9b59b6",
        维护中: "#27ae60",
        已完成: "#2ecc71",
        已暂停: "#95a5a6",
        已取消: "#e74c3c",
    };
    return statusColorMap[statusName] || "#666";
};

// 加载项目列表
const loadProjectList = async () => {
    try {
        loading.value = true;
        const params: ProjectListParams = {
            projectName: searchForm.projectName,
            pageNum: searchForm.pageNum,
            pageSize: searchForm.pageSize,
        };

        const response = await getMyProjectList(params);

        if (response.code === 200 && response.data) {
            projectList.value = response.data.list;
            paginationReactive.itemCount = response.data.total;
            paginationReactive.page = response.data.pageNum;
        } else {
            message.error(response.msg || "获取项目列表失败");
        }
    } catch (error) {
        console.error("获取项目列表失败:", error);

        // 检查是否是登录过期错误
        if (error instanceof Error && error.message.includes("登录已过期")) {
            // 自动退出登录状态
            isLoggedIn.value = false;
            projectList.value = [];
            message.error("登录已过期，请重新登录");
        } else {
            message.error("获取项目列表失败，请检查网络连接");
        }
    } finally {
        loading.value = false;
    }
};

// 搜索项目
const handleSearch = () => {
    searchForm.pageNum = 1;
    paginationReactive.page = 1;
    loadProjectList();
};

// 查看项目详情
const handleViewProject = (project: ProjectInfo) => {
    message.info(`查看项目: ${project.projectName}`);
    // TODO: 实现项目详情查看功能
};

// 处理登录成功
const handleLoginSuccess = () => {
    isLoggedIn.value = true;
    message.success("登录成功");
    // 登录成功后加载项目列表
    loadProjectList();
};

// 检查登录状态
const checkLoginStatus = () => {
    isLoggedIn.value = OATokenManager.isLoggedIn();
    // 如果已登录，加载项目列表
    if (isLoggedIn.value) {
        loadProjectList();
    }
};

// 退出登录
const handleLogout = () => {
    OATokenManager.clearToken();
    isLoggedIn.value = false;
    projectList.value = [];
    message.success("已退出登录");
};

// 组件挂载时执行
onMounted(() => {
    checkLoginStatus();
});
</script>

<style scoped lang="scss">
.oa-login {
    height: calc(100vh - 140px);
    background: #18181c;
    overflow: hidden; // 防止出现外层滚动条

    // 未登录时居中显示
    &:has(.login-prompt) {
        display: flex;
        justify-content: center;
        align-items: center;
    }
}

.login-prompt {
    width: 100%;
    max-width: 400px;

    .prompt-container {
        background: rgba(42, 42, 50, 0.8);
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(64, 64, 70, 0.3);

        .prompt-icon {
            margin-bottom: 20px;
            color: rgba(255, 255, 255, 0.6);
        }

        .prompt-title {
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 12px;
        }

        .prompt-description {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 30px;
            line-height: 1.5;
        }

        .login-btn {
            width: 100%;
            height: 44px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            transition: all 0.3s ease;

            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(127, 231, 196, 0.3);
            }
        }
    }
}

// 项目列表容器样式
.project-list-container {
    .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        background: rgba(42, 42, 50, 0.8);
        border: 1px solid rgba(64, 64, 70, 0.3);
        flex-shrink: 0; // 防止被压缩

        .search-container {
            display: flex;
            gap: 12px;
            align-items: center;

            .search-input {
                width: 300px;
            }
        }
    }

    .project-list {
        background: rgba(42, 42, 50, 0.8);
        border: 1px solid rgba(64, 64, 70, 0.3);

        :deep(.n-data-table) {
            .n-data-table-wrapper {
                // 自定义滚动条样式
                &::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                &::-webkit-scrollbar-track {
                    background: rgba(64, 64, 70, 0.2);
                    border-radius: 3px;
                }

                &::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;

                    &:hover {
                        background: rgba(255, 255, 255, 0.5);
                    }
                }
            }

            .n-data-table-base-table {
                width: 100%;
            }

            .n-data-table-thead {
                background: rgba(32, 32, 40, 0.8);

                .n-data-table-th {
                    background: transparent;
                    color: #fff;
                    font-weight: 600;
                    border-bottom: 1px solid rgba(64, 64, 70, 0.5);
                }
            }

            .n-data-table-tbody {
                .n-data-table-tr {
                    background: transparent;

                    &:hover {
                        background: rgba(64, 64, 70, 0.3);
                    }

                    .n-data-table-td {
                        background: transparent;
                        color: rgba(255, 255, 255, 0.9);
                        border-bottom: 1px solid rgba(64, 64, 70, 0.2);
                    }
                }
            }
        }

        :deep(.n-pagination) {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px;
            .n-pagination-item {
                background: rgba(64, 64, 70, 0.3);
                color: rgba(255, 255, 255, 0.9);
                min-width: 22px;
                height: 22px;

                &:hover {
                    background: rgba(64, 64, 70, 0.7);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.3);
                }

                &.n-pagination-item--active {
                    background: #4a9eff;
                    color: #fff;
                    border-color: #4a9eff;
                }
            }

            .n-pagination-quick-jumper {
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
            }

            .n-pagination-prefix {
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
            }

            .n-pagination-size-picker {
                color: rgba(255, 255, 255, 0.9);
            }
        }

        :deep(.n-data-table__pagination) {
            margin-top: 0;
        }
    }
}
</style>
