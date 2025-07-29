<template>
    <!-- Naive UI 配置提供者 -->
    <n-config-provider :theme="lightTheme">
        <!-- 消息提示提供者 -->
        <n-message-provider placement="top-right" container-style="top: 50px;">
            <div class="app-container">
                <!-- ==================== 自定义标题栏 ==================== -->
                <TitleBar />

                <!-- ==================== 主应用布局 ==================== -->
                <div class="app-layout">
                    <!-- 左侧导航栏 -->
                    <aside class="sidebar">
                        <!-- 侧边栏头部 -->
                        <div class="sidebar-header">
                            <!-- Logo 区域 -->
                            <div class="logo-section">
                                <div class="logo-icon">
                                    <!-- Git 图标 SVG -->
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 2L2 7L12 12L22 7L12 2Z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linejoin="round"
                                        />
                                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                                    </svg>
                                </div>
                                <h1 class="app-title">Git Helper</h1>
                            </div>

                            <!-- 用户信息区域 -->
                            <div class="user-info">
                                <span class="welcome-text">欢迎回来！</span>
                            </div>
                        </div>

                        <!-- 侧边栏导航 -->
                        <nav class="sidebar-nav">
                            <!-- 主要功能区域 -->
                            <div class="nav-section">
                                <div class="nav-section-title">主要功能</div>
                                <ul class="nav-list">
                                    <!-- 日/周报总结 -->
                                    <li class="nav-item" :class="{ active: activeTab === 'report' }" @click="setActiveTab('report')">
                                        <div class="nav-icon">📊</div>
                                        <span class="nav-text">日/周报总结</span>
                                    </li>

                                    <!-- 项目管理 -->
                                    <li class="nav-item" :class="{ active: activeTab === 'project' }" @click="setActiveTab('project')">
                                        <div class="nav-icon">📁</div>
                                        <span class="nav-text">项目管理</span>
                                    </li>

                                    <!-- OA系统 -->
                                    <li class="nav-item" :class="{ active: activeTab === 'oa' }" @click="setActiveTab('oa')">
                                        <div class="nav-icon">🏢</div>
                                        <span class="nav-text">OA系统</span>
                                    </li>
                                </ul>
                            </div>

                            <!-- 系统设置区域 -->
                            <div class="nav-section">
                                <div class="nav-section-title">系统设置</div>
                                <ul class="nav-list">
                                    <!-- 设置页面 -->
                                    <li class="nav-item" :class="{ active: activeTab === 'settings' }" @click="setActiveTab('settings')">
                                        <div class="nav-icon">⚙️</div>
                                        <span class="nav-text">基础设置</span>
                                    </li>
                                </ul>
                            </div>
                        </nav>

                        <!-- 状态信息卡片 -->
                        <div class="status-card">
                            <div class="status-header">
                                <h3>DS状态</h3>
                                <div
                                    class="status-indicator"
                                    :class="{
                                        online: !systemInitializing && balanceInfo?.is_available,
                                        initializing: systemInitializing,
                                    }"
                                ></div>
                            </div>
                            <!-- 状态信息内容 -->
                            <div class="status-content">
                                <!-- 初始化状态提示 -->
                                <div v-if="systemInitializing" class="initializing-info">
                                    <span class="initializing-text">系统初始化中...</span>
                                </div>
                                <!-- 正常状态信息 -->
                                <template v-else>
                                    <!-- 账户余额信息 -->
                                    <div class="balance-info">
                                        <span class="balance-label">账户余额</span>
                                        <span class="balance-value">￥{{ balanceInfo?.balance_infos[0]?.total_balance || 0 }}</span>
                                    </div>
                                    <div class="balance-info">
                                        <span class="balance-label">今日工时</span>
                                        <span class="balance-value">{{ todayWorkingHours }}h</span>
                                    </div>

                                    <!-- 版本信息 -->
                                    <div class="version-info">
                                        <span class="version-text">v{{ appVersion }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </aside>

                    <!-- ==================== 主内容区域 ==================== -->
                    <main class="main-content">
                        <div class="content-wrapper">
                            <!-- 主要内容标签页组件 -->
                            <HomeTabs :active-tab="activeTab" @save="handleCheckDeepSeekBalance" />
                        </div>
                    </main>
                </div>
            </div>
        </n-message-provider>
    </n-config-provider>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================

// Naive UI 相关导入
import { lightTheme, NConfigProvider, NMessageProvider, createDiscreteApi } from "naive-ui";
// 组件导入
import TitleBar from "./components/TitleBar.vue";
import HomeTabs from "./components/HomeTabs.vue";
// API 导入
import { checkDeepSeekBalance } from "./api/deepseek";
import { getTodayWorkingHours, OATokenManager } from "./api/oa";
// Vue 相关导入
import { onMounted, ref } from "vue";
// Tauri API 导入
import { invoke } from "@tauri-apps/api/core";

// ==================== 类型定义 ====================

// 余额信息接口
interface BalanceInfo {
    currency: string; // 货币类型
    total_balance: string; // 总余额
    granted_balance: string; // 赠送余额
    topped_up_balance: string; // 充值余额
}

// DeepSeek 余额响应接口
interface DeepSeekBalance {
    is_available: boolean; // 是否可用
    balance_infos: BalanceInfo[]; // 余额信息列表
}

// ==================== 状态管理 ====================

// 余额信息
const balanceInfo = ref<DeepSeekBalance>();
// 应用版本号
const appVersion = ref("");
// 当前激活的标签页
const activeTab = ref("report");
// 系统初始化状态
const systemInitializing = ref(true);

// 创建消息提示实例
const { message } = createDiscreteApi(["message"], {
    configProviderProps: {
        theme: lightTheme,
    },
    messageProviderProps: {
        placement: "top-right",
        containerStyle: "top: 50px",
    },
});

// DeepSeek Token
const deepseekToken = ref<string>("");

// 今日工时相关状态
const todayWorkingHours = ref<string>("0.00");

// ==================== 业务函数 ====================

// 设置激活的标签页
const setActiveTab = (tab: string) => {
    activeTab.value = tab;
};

// 获取本地存储的配置信息
const getSettings = () => {
    const raw = localStorage.getItem("githelper-settings");
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (error) {
            // 解析失败时返回空对象
            console.warn("解析设置失败:", error);
        }
    }
    return {};
};

// 检查 DeepSeek 账户余额
const handleCheckDeepSeekBalance = async () => {
    try {
        // 获取配置中的 token
        const settings = getSettings();
        deepseekToken.value = settings.token || "";

        // 如果没有token，设置为不可用状态
        if (!deepseekToken.value) {
            balanceInfo.value = {
                is_available: false,
                balance_infos: [],
            };
            return;
        }

        // 调用 API 检查余额
        const res: DeepSeekBalance = await checkDeepSeekBalance(deepseekToken.value);

        if (res) {
            if (res.is_available) {
                // 余额充足，更新余额信息
                balanceInfo.value = res;
            } else {
                // 余额不足提示
                message.error("当前账户余额不足，请充值");
                balanceInfo.value = {
                    is_available: false,
                    balance_infos: res.balance_infos || [],
                };
            }
        }
    } catch (error) {
        // Token 无效或其他错误
        console.error("DeepSeek余额检查失败:", error);
        message.error("token 无效，请重新配置");
        balanceInfo.value = {
            is_available: false,
            balance_infos: [],
        };
    }
};

// 获取今日工时
const loadTodayWorkingHours = async () => {
    try {
        console.log("开始获取今日工时...");

        // 检查是否已登录OA系统
        if (!OATokenManager.isLoggedIn()) {
            console.log("OA系统未登录，显示默认工时");
            todayWorkingHours.value = "0.00";
            return;
        }

        const response = await getTodayWorkingHours();

        if (response.code === 200) {
            todayWorkingHours.value = response.data || "0.00";
            console.log("今日工时获取成功:", todayWorkingHours.value);
        } else {
            throw new Error(response.msg || "获取今日工时失败");
        }
    } catch (error: any) {
        console.error("获取今日工时失败:", error);
        todayWorkingHours.value = "0.00";
    }
};

// 系统启动时的完整状态检查
const performSystemCheck = async () => {
    try {
        systemInitializing.value = true;
        console.log("开始执行系统状态检查...");

        // 1. 获取应用版本号
        appVersion.value = await invoke("get_app_version");
        console.log("应用版本:", appVersion.value);

        // 2. 执行健康检查
        const healthStatus = await invoke("health_check");
        console.log("健康检查结果:", healthStatus);

        // 3. 检查DeepSeek账户余额
        await handleCheckDeepSeekBalance();

        // 4. 获取今日工时（如果已登录OA系统）
        await loadTodayWorkingHours();

        // 5. 检查本地配置完整性
        const settings = getSettings();
        const hasGitUser = !!settings.gitUser;
        const hasToken = !!settings.token;
        const hasTemplates = !!(settings.dailyTemplate && settings.weeklyTemplate);

        console.log("配置检查结果:", {
            hasGitUser,
            hasToken,
            hasTemplates,
            balanceAvailable: balanceInfo.value?.is_available || false,
        });

        // 5. 显示系统状态总结
        if (!hasGitUser || !hasToken || !hasTemplates) {
            message.warning("系统配置不完整，请前往设置页面完善配置");
        } else if (balanceInfo.value?.is_available) {
            message.success("DS状态正常");
        } else {
            message.warning("DeepSeek账户状态异常，请检查Token配置");
        }
    } catch (error) {
        console.error("系统状态检查失败:", error);
        message.error("系统状态检查失败，请检查应用配置");
    } finally {
        // 无论成功失败都要结束初始化状态
        systemInitializing.value = false;
    }
};

// ==================== 组件生命周期 ====================

// 组件挂载时执行初始化
onMounted(async () => {
    // 执行完整的系统状态检查
    await performSystemCheck();
});
</script>

<style scoped lang="scss">
/* 现代化应用容器 */
.app-container {
    width: 100vw;
    height: 100vh;
    background: #f8fafc;
    color: #1e293b;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
}

/* 主应用布局 */
.app-layout {
    flex: 1;
    display: flex;
    height: calc(100vh - 40px); /* 减去标题栏高度 */
    overflow: hidden;
}

/* 左侧导航栏 */
.sidebar {
    width: 280px;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);

    .sidebar-header {
        padding: 24px 20px;
        border-bottom: 1px solid #f1f5f9;

        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;

            .logo-icon {
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .app-title {
                font-size: 20px;
                font-weight: 700;
                color: #0f172a;
                margin: 0;
            }
        }

        .user-info {
            .welcome-text {
                font-size: 14px;
                color: #64748b;
            }
        }
    }

    .sidebar-nav {
        flex: 1;
        padding: 20px 0;
        overflow-y: auto;

        .nav-section {
            margin-bottom: 32px;

            .nav-section-title {
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 0 20px 12px;
            }

            .nav-list {
                list-style: none;
                margin: 0;
                padding: 0;

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 20px;
                    margin: 0 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    font-weight: 500;
                    color: #475569;

                    .nav-icon {
                        font-size: 16px;
                        width: 20px;
                        text-align: center;
                    }

                    &:hover {
                        background: #f1f5f9;
                        color: #0f172a;
                    }

                    &.active {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
                    }
                }
            }
        }
    }

    .status-card {
        margin: 0 24px 24px;
        padding: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;

        .status-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;

            h3 {
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
                margin: 0;
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ef4444;

                &.online {
                    background: #10b981;
                }

                &.initializing {
                    background: #f59e0b;
                    animation: pulse 2s infinite;
                }
            }
        }

        .status-content {
            .balance-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;

                .balance-label {
                    font-size: 12px;
                    color: #64748b;
                }

                .balance-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #10b981;
                }
            }

            .version-info {
                .version-text {
                    font-size: 12px;
                    color: #94a3b8;
                }
            }

            .initializing-info {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 0;

                .initializing-text {
                    font-size: 12px;
                    color: #f59e0b;
                    font-weight: 500;
                }
            }
        }
    }
}

/* 脉冲动画 */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* 主内容区域 */
.main-content {
    flex: 1;
    background: #f8fafc;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0; /* 重要：允许 flex 子元素正确收缩 */

    .content-wrapper {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        min-height: 0; /* 重要：允许内容正确滚动 */

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
</style>
