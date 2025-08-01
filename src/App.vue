<template>
    <!-- Naive UI 配置提供者 -->
    <n-config-provider :theme="lightTheme">
        <!-- 消息提示提供者 -->
        <n-message-provider placement="top-right" container-style="top: 50px;">
            <!-- 对话框提供者 -->
            <n-dialog-provider>
                <div class="app-container">
                    <!-- ==================== 自定义标题栏 ==================== -->
                    <TitleBar />

                    <!-- ==================== 主应用布局 ==================== -->
                    <div class="app-layout flex">
                        <!-- 左侧导航栏 -->
                        <aside class="sidebar flex flex-col">
                            <!-- 侧边栏头部 -->
                            <div class="sidebar-header">
                                <!-- Logo 区域 -->
                                <div class="logo-section flex align-center gap-15">
                                    <div class="logo-icon flex align-center justify-center">
                                        <!-- 工作助手图标 SVG -->
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <path
                                                d="M8 12L10 14L16 8"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                    </div>
                                    <h1 class="app-title">工作助手</h1>
                                </div>

                                <!-- 用户信息区域 -->
                                <div class="user-info">
                                    <span class="welcome-text">欢迎回来！</span>
                                </div>
                            </div>

                            <!-- 侧边栏导航 -->
                            <nav class="sidebar-nav flex-1">
                                <!-- 主要功能区域 -->
                                <div class="nav-section">
                                    <div class="nav-section-title">主要功能</div>
                                    <ul class="nav-list">
                                        <!-- 日/周报总结 -->
                                        <li
                                            class="nav-item flex align-center gap-15"
                                            :class="{ active: activeTab === 'report' }"
                                            @click="setActiveTab('report')"
                                        >
                                            <div class="nav-icon">📊</div>
                                            <span class="nav-text">日/周报总结</span>
                                        </li>

                                        <!-- 项目管理 -->
                                        <li
                                            class="nav-item flex align-center gap-15"
                                            :class="{ active: activeTab === 'project' }"
                                            @click="setActiveTab('project')"
                                        >
                                            <div class="nav-icon">📁</div>
                                            <span class="nav-text">项目管理</span>
                                        </li>

                                        <!-- OA系统 -->
                                        <li
                                            class="nav-item flex align-center gap-15"
                                            :class="{ active: activeTab === 'oa' }"
                                            @click="setActiveTab('oa')"
                                        >
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
                                        <li
                                            class="nav-item flex align-center gap-15"
                                            :class="{ active: activeTab === 'settings' }"
                                            @click="setActiveTab('settings')"
                                        >
                                            <div class="nav-icon">⚙️</div>
                                            <span class="nav-text">基础设置</span>
                                        </li>
                                        <!-- 关于页面 -->
                                        <li
                                            class="nav-item flex align-center gap-15"
                                            :class="{ active: activeTab === 'about' }"
                                            @click="setActiveTab('about')"
                                        >
                                            <div class="nav-icon">ℹ️</div>
                                            <span class="nav-text">关于</span>
                                        </li>
                                    </ul>
                                </div>
                            </nav>

                            <!-- 状态信息卡片 -->
                            <div class="status-card">
                                <div class="status-header flex align-center justify-between">
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
                                    <div v-if="systemInitializing" class="initializing-info flex align-center justify-center">
                                        <span class="initializing-text">系统初始化中...</span>
                                    </div>
                                    <!-- 正常状态信息 -->
                                    <template v-else>
                                        <!-- 账户余额信息 -->
                                        <div class="balance-info flex justify-between align-center">
                                            <span class="balance-label">账户余额</span>
                                            <span class="balance-value">￥{{ balanceInfo?.balance_infos[0]?.total_balance || 0 }}</span>
                                        </div>
                                        <div class="balance-info flex justify-between align-center">
                                            <span class="balance-label">今日工时</span>
                                            <span class="balance-value">{{ todayWorkingHours }}h</span>
                                        </div>

                                        <!-- 版本信息 -->
                                        <div
                                            class="version-info flex align-center gap-5"
                                            @click="handleVersionClick"
                                            :class="{ clickable: hasUpdateAvailable || hasDownloadedUpdate }"
                                        >
                                            <span class="version-text">v{{ appVersion }}</span>
                                            <!-- 检查更新中的加载指示器 -->
                                            <n-icon v-if="isCheckingUpdate" size="16" class="checking-indicator spinning" color="#666">
                                                <RefreshOutline />
                                            </n-icon>
                                            <!-- 更新提示箭头 -->
                                            <n-icon v-else-if="hasUpdateAvailable" size="16" class="update-indicator" color="#18a058">
                                                <ArrowUpOutline />
                                            </n-icon>
                                            <!-- 已下载更新提示 -->
                                            <n-icon v-else-if="hasDownloadedUpdate" size="16" class="downloaded-indicator" color="#f0a020">
                                                <DownloadOutline />
                                            </n-icon>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </aside>

                        <!-- ==================== 主内容区域 ==================== -->
                        <main class="main-content flex-1 flex flex-col">
                            <div class="content-wrapper flex-1 flex flex-col">
                                <!-- 主要内容标签页组件 -->
                                <HomeTabs :active-tab="activeTab" @save="handleCheckDeepSeekBalance" />
                            </div>
                        </main>
                    </div>
                </div>

                <!-- 更新模态框 -->
                <UpdateModal
                    v-model:show="showUpdateModal"
                    :current-version="appVersion"
                    :version-info="latestVersionInfo"
                    :has-downloaded-update="hasDownloadedUpdate"
                    :downloaded-update-path="downloadedUpdatePath"
                    @cancel="handleUpdateCancel"
                    @install-completed="handleInstallCompleted"
                    @message="handleUpdateMessage"
                />
            </n-dialog-provider>
        </n-message-provider>
    </n-config-provider>
</template>

<script setup lang="ts">
// ==================== 导入依赖 ====================

// Naive UI 相关导入
import { lightTheme, NConfigProvider, NMessageProvider, NDialogProvider, NIcon, createDiscreteApi } from "naive-ui";
// 图标导入
import { ArrowUpOutline, DownloadOutline, RefreshOutline } from "@vicons/ionicons5";
// 组件导入
import TitleBar from "./components/TitleBar.vue";
import HomeTabs from "./components/HomeTabs.vue";
import UpdateModal from "./components/UpdateModal.vue";
// API 导入
import { checkDeepSeekBalance } from "./api/deepseek";
import { getTodayWorkingHours, OATokenManager } from "./api/oa";
// 更新相关导入（动态加载以避免阻塞启动）
let updateAPI: any = null;
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

// ==================== 更新相关状态 ====================

// 更新检测状态
const hasUpdateAvailable = ref(false);
const hasDownloadedUpdate = ref(false);
const latestVersionInfo = ref<any>(null);
const downloadedUpdatePath = ref<string>("");
const showUpdateModal = ref(false);
const updateCheckCompleted = ref(false);
const isCheckingUpdate = ref(false);

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

// ==================== 更新检测相关函数 ====================

/**
 * 动态加载更新API
 */
const loadUpdateAPI = async () => {
    if (!updateAPI) {
        try {
            updateAPI = await import("./api/updater");
            console.log("✅ 更新API加载成功");
        } catch (error) {
            console.error("❌ 更新API加载失败:", error);
            return null;
        }
    }
    return updateAPI;
};

/**
 * 检查更新
 */
const checkForAppUpdates = async (showMessages = false) => {
    // 防止重复检查
    if (isCheckingUpdate.value) {
        console.log("⚠️ 正在检查更新中，跳过重复请求");
        return;
    }

    try {
        isCheckingUpdate.value = true;
        console.log("🔍 开始检查应用更新...");

        // 动态加载更新API
        const api = await loadUpdateAPI();
        if (!api) {
            console.warn("⚠️ 更新API不可用，跳过更新检查");
            updateCheckCompleted.value = true;
            return;
        }

        const result = await api.checkForUpdates();

        if (result.hasUpdate && result.versionInfo) {
            console.log("✅ 发现新版本:", result.versionInfo.version);
            hasUpdateAvailable.value = true;
            latestVersionInfo.value = result.versionInfo;

            // 检查是否已经下载过这个版本
            const downloadedPath = await api.getDownloadedUpdatePath(result.versionInfo.version);
            if (downloadedPath) {
                hasDownloadedUpdate.value = true;
                downloadedUpdatePath.value = downloadedPath;
                console.log("📦 已下载更新包:", downloadedPath);
            }

            // 如果是手动检查或者第一次启动检查，显示更新模态框
            if (showMessages || !updateCheckCompleted.value) {
                showUpdateModal.value = true;
            }
        } else {
            console.log("✅ 当前已是最新版本");
            hasUpdateAvailable.value = false;
            latestVersionInfo.value = null;

            // 如果是手动检查，显示成功消息
            if (showMessages) {
                message.success("当前已是最新版本！");
            }
        }

        updateCheckCompleted.value = true;
    } catch (error) {
        console.error("❌ 检查更新失败:", error);
        updateCheckCompleted.value = true;

        // 如果是手动检查，显示错误消息
        if (showMessages) {
            message.error("检查更新失败，请稍后重试");
        }
    } finally {
        isCheckingUpdate.value = false;
    }
};

/**
 * 处理版本号点击事件
 */
const handleVersionClick = async () => {
    // 如果正在检查更新，显示提示
    if (isCheckingUpdate.value) {
        message.info("正在检查更新，请稍候...");
        return;
    }

    // 如果有更新或已下载更新，显示更新模态框
    if (hasUpdateAvailable.value || hasDownloadedUpdate.value) {
        showUpdateModal.value = true;
        return;
    }

    // 手动检查更新
    message.info("正在检查更新...");
    await checkForAppUpdates(true); // 传入 true 表示手动检查，会显示结果消息
};

/**
 * 处理更新取消
 */
const handleUpdateCancel = () => {
    showUpdateModal.value = false;
};

/**
 * 处理安装完成
 */
const handleInstallCompleted = () => {
    showUpdateModal.value = false;
    // 应用将重启，这里的代码可能不会执行
};

/**
 * 处理更新模态框的消息事件
 */
const handleUpdateMessage = (type: "success" | "error" | "info" | "warning", content: string) => {
    // 使用父组件的 message 实例显示消息
    switch (type) {
        case "success":
            message.success(content);
            break;
        case "error":
            message.error(content);
            break;
        case "info":
            message.info(content);
            break;
        case "warning":
            message.warning(content);
            break;
    }
};

/**
 * 清理旧的更新文件
 */
const cleanupUpdates = async () => {
    try {
        const api = await loadUpdateAPI();
        if (api) {
            await api.cleanupOldUpdates();
            console.log("🧹 清理旧更新文件完成");
        }
    } catch (error) {
        console.error("❌ 清理更新文件失败:", error);
    }
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

        // 5. 清理旧的更新文件
        await cleanupUpdates();

        // 6. 启动后台更新检查（延迟执行，确保不阻塞主窗口显示）
        setTimeout(() => {
            checkForAppUpdates().catch((error) => {
                console.warn("后台更新检查失败:", error);
            });
        }, 5000); // 延迟5秒执行，确保主窗口已完全显示

        // 7. 检查本地配置完整性
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

        // 8. 显示系统状态总结
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

// 组件挂载时执行初始化 - 应用启动的核心逻辑
onMounted(async () => {
    try {
        console.log("主应用开始初始化...");

        // 确保启动画面至少显示2秒，给用户良好的启动体验
        const startTime = Date.now();
        const minSplashTime = 2000; // 最少显示2秒，避免闪烁

        // 执行完整的系统状态检查（包括API连接、用户状态等）
        await performSystemCheck();

        // 计算已经过去的时间，确保启动画面显示足够时间
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);

        if (remainingTime > 0) {
            console.log(`等待启动画面显示完整时间，剩余: ${remainingTime}ms`);
            await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        // 系统初始化完成后，关闭启动画面并显示主窗口
        await invoke("close_splashscreen");
        console.log("启动画面已关闭，主窗口已显示");
    } catch (error) {
        console.error("系统初始化或启动画面处理失败:", error);
        // 即使出错也要尝试关闭启动画面，确保用户能看到主界面
        try {
            await invoke("close_splashscreen");
        } catch (closeError) {
            console.error("关闭启动画面失败:", closeError);
        }
    }
});
</script>

<style scoped lang="scss">
/* 现代化应用容器 - 圆角内容区域 */
.app-container {
    width: 100vw;
    height: 100vh;
    background: #f8fafc;
    color: #1e293b;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
}

/* 主应用布局 */
.app-layout {
    height: calc(100vh - 40px); /* 减去标题栏高度 */
    overflow: hidden;
}

/* 左侧导航栏 */
.sidebar {
    width: 280px;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);

    .sidebar-header {
        padding: 24px 20px;
        border-bottom: 1px solid #f1f5f9;

        .logo-section {
            margin-bottom: 16px;

            .logo-icon {
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 8px;
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
        overflow-y: auto;

        .nav-section {
            .nav-section-title {
                font-size: 12px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 12px;
            }

            .nav-list {
                list-style: none;
                margin: 0;
                padding: 0;

                .nav-item {
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
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s ease;

                &.clickable {
                    cursor: pointer;

                    &:hover {
                        background: rgba(255, 255, 255, 0.1);
                        transform: translateY(-1px);
                    }
                }

                .version-text {
                    font-size: 12px;
                    color: #94a3b8;
                    font-family: "Consolas", "Monaco", monospace;
                    font-weight: 500;
                }

                .checking-indicator {
                    animation: spin 1s linear infinite;
                }

                .update-indicator {
                    animation: bounce 1s infinite;
                }

                .downloaded-indicator {
                    animation: pulse 2s infinite;
                }
            }

            .initializing-info {
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

/* 旋转动画 */
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
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

/* 弹跳动画 */
@keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-4px);
    }
    60% {
        transform: translateY(-2px);
    }
}

/* 主内容区域 */
.main-content {
    background: #f8fafc;
    overflow: hidden;
    min-height: 0; /* 重要：允许 flex 子元素正确收缩 */

    .content-wrapper {
        padding: 24px;
        overflow-y: auto;
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
