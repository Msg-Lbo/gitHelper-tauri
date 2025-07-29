<template>
    <div class="settings-panel">
        <!-- 可滚动的内容区域 -->
        <div class="settings-content">
            <!-- ==================== 基础配置卡片 ==================== -->
            <div class="settings-card">
                <div class="card-header">
                    <h3 class="card-title">基础配置</h3>
                    <p class="card-description">配置应用的基本参数和账号信息</p>
                </div>
                <div class="card-content">
                    <div class="form-grid">
                        <!-- DeepSeek API Token 配置 -->
                        <div class="form-group">
                            <label class="form-label">DeepSeek Token</label>
                            <input
                                v-model="form.token"
                                type="text"
                                class="form-input"
                                placeholder="请输入 DeepSeek API Token"
                            />
                        </div>

                        <!-- Git 用户名配置 -->
                        <div class="form-group">
                            <label class="form-label">Git 用户名</label>
                            <input
                                v-model="form.gitUser"
                                type="text"
                                class="form-input"
                                placeholder="请输入 Git 用户名"
                            />
                        </div>

                        <!-- OA 系统账号配置 -->
                        <div class="form-group">
                            <label class="form-label">OA 账号</label>
                            <input
                                v-model="form.oaAccount"
                                type="text"
                                class="form-input"
                                placeholder="请输入 OA 系统账号"
                            />
                        </div>

                        <!-- OA 系统密码配置 -->
                        <div class="form-group">
                            <label class="form-label">OA 密码</label>
                            <input
                                v-model="form.oaPassword"
                                type="password"
                                class="form-input"
                                placeholder="请输入 OA 系统密码"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==================== 模板配置卡片 ==================== -->
            <div class="settings-card">
                <div class="card-header">
                    <h3 class="card-title">模板配置</h3>
                    <p class="card-description">自定义日报和周报生成模板</p>
                </div>
                <div class="card-content">
                    <div class="template-section">
                        <!-- 日报模板配置 -->
                        <div class="form-group">
                            <label class="form-label">日报模板</label>
                            <textarea
                                v-model="form.dailyTemplate"
                                class="form-textarea"
                                placeholder="请输入日报生成模板"
                                rows="8"
                            ></textarea>
                        </div>
                        <!-- 周报模板配置 -->
                        <div class="form-group">
                            <label class="form-label">周报模板</label>
                            <textarea
                                v-model="form.weeklyTemplate"
                                class="form-textarea"
                                placeholder="请输入周报生成模板"
                                rows="8"
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== 固定操作按钮区域 ==================== -->
        <div class="actions-section">
            <div class="actions-group">
                <!-- 保存设置按钮 -->
                <button class="btn btn-primary" @click="saveSettings">
                    <span class="btn-icon">💾</span>
                    保存设置
                </button>

                <!-- 恢复默认按钮 -->
                <button class="btn btn-secondary" @click="restoreDefault">
                    <span class="btn-icon">🔄</span>
                    恢复默认
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 相关导入
import { ref } from "vue";
// Naive UI 消息提示
import { useMessage } from "naive-ui";

// ==================== 默认模板配置 ====================

// 默认日报模板
const DEFAULT_DAILY = `你是一位专业的团队领导，你的任务是分析 Git commit 日志并生成一份清晰的工作总结。
请遵循以下规则:
1. 仔细阅读下面提供的 Commit 日志。
2. 根据日志内容，将工作内容按功能模块进行归类。
3. 以数字列表的形式输出总结，每个列表项代表一个模块的工作。
4. 每个列表项的格式必须为："[序号]、[模块名]：[具体的修改内容]"。例如："1、用户管理模块：修复了无法删除用户的bug。"
5. 列表项之间不要有任何空行，但是每个列表项必须单独占一行。
6. 总结内容必须简洁、清晰，直接描述完成的工作，限制100字以内。
7. 倒叙输出日志,但是序号是正序。
8. 绝对不要在你的回复中使用任何 Markdown 格式（例如 ###、** 或 *）。

Commit 日志:
{commit_logs}

请开始生成工作总结:`;

// 默认周报模板
const DEFAULT_WEEKLY = `你是一个顶级的项目经理和技术领导。请根据下面按天和项目分组的 Git 提交记录，生成一份高度概括、重点突出、语言流畅的中文周报。

你的任务是：
1.  仔细分析每一天的 commit 记录。
2.  将零散的 commit 信息提炼成对当天工作核心内容的总结，而不是简单罗列。
3.  如果某天没有提交记录，请明确指出"暂无提交记录"。
4.  最终的输出必须严格遵循下面的格式，以星期为单位进行组织。
5.  每个项目的工作总结必须以项目名开头，以冒号分隔，每天的完成工作不可换行和换列，也不可用-号开头。
6.  总结内容必须简洁、清晰，直接描述完成的工作，字数不要超过200字。
7.  绝对不要在你的回复中使用任何 Markdown 格式（例如 ###、** 或 *）。

[高质量输出范例]
星期一：暂无提交记录
星期二：[项目名]：大量功能优化包括首页分类导航、订单管理、搜索功能、店铺详情等多个模块的完善和bug修复
星期三：[项目名]：主要进行订单物流显示、搜索结果页面、购物车样式、收藏功能等的优化和新增推荐商品页面
星期四：[项目名]：重点开发积分系统功能、批量订单处理、商品详情页轮播图优化、评价系统改进等大量功能更新
星期五：[项目名]：主要更新接口地址配置、VIP页面会员功能和积分订单流程优化
星期六：[项目名]：修复米林APPbug

[待总结的 Commit 记录]
{commit_logs}`;

// ==================== 状态管理 ====================

// 本地存储键名
const LOCAL_KEY = "githelper-settings";

// 默认表单数据
const defaultForm = {
    token: "",                      // DeepSeek API Token
    gitUser: "",                    // Git 用户名
    oaAccount: "",                  // OA 系统账号
    oaPassword: "",                 // OA 系统密码
    dailyTemplate: DEFAULT_DAILY,   // 日报模板
    weeklyTemplate: DEFAULT_WEEKLY, // 周报模板
};

// 表单响应式数据
const form = ref({ ...defaultForm });

// 消息提示实例
const message = useMessage();

// 定义组件事件
const emit = defineEmits(["save"]);

// ==================== 业务函数 ====================

// 加载保存的设置
const loadSettings = () => {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
        try {
            // 将保存的设置合并到表单数据中
            Object.assign(form.value, JSON.parse(raw));
        } catch (error) {
            // 解析失败时忽略错误，使用默认值
            console.warn("加载设置失败，使用默认值:", error);
        }
    }
};

// 保存设置到本地存储
const saveSettings = () => {
    // 将表单数据保存到 localStorage
    localStorage.setItem(LOCAL_KEY, JSON.stringify(form.value));

    // 触发保存事件，通知父组件
    emit("save");

    // 显示成功提示
    message.success("保存成功");
};

// 恢复默认模板
const restoreDefault = () => {
    // 恢复日报和周报模板为默认值
    form.value.dailyTemplate = DEFAULT_DAILY;
    form.value.weeklyTemplate = DEFAULT_WEEKLY;

    // 保存设置
    saveSettings();

    // 显示成功提示
    message.success("已恢复默认模板");
};

// ==================== 组件初始化 ====================

// 组件加载时自动加载设置
loadSettings();
</script>

<style scoped lang="scss">
/* ==================== 主容器样式 ==================== */

/* 设置面板主容器 */
.settings-panel {
    width: 100%;                    // 占满宽度
    max-width: 1200px;              // 最大宽度限制
    margin: 0 auto;                 // 水平居中
    display: flex;                  // 弹性布局
    flex-direction: column;         // 垂直方向
    height: 100%;                   // 占满父容器高度
    min-height: 0;                  // 重要：允许 flex 子元素正确收缩
    overflow: hidden;               // 防止整体滚动
}

/* 可滚动的内容区域 */
.settings-content {
    flex: 1;                        // 占据剩余空间
    overflow-y: auto;               // 允许垂直滚动
    padding: 0 8px 24px 0;          // 右侧留出滚动条空间，底部留出间距
    display: flex;                  // 弹性布局
    flex-direction: column;         // 垂直方向
    gap: 24px;                      // 卡片间距

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
        width: 8px;                 // 滚动条宽度
    }

    &::-webkit-scrollbar-track {
        background: #f8fafc;        // 滚动条轨道背景
        border-radius: 4px;         // 圆角
    }

    &::-webkit-scrollbar-thumb {
        background: #cbd5e1;        // 滚动条滑块背景
        border-radius: 4px;         // 圆角

        &:hover {
            background: #94a3b8;    // 悬停时的背景色
        }
    }
}

/* ==================== 卡片样式 ==================== */

/* 设置卡片容器 */
.settings-card {
    background: #ffffff;            // 白色背景
    border: 1px solid #e2e8f0;     // 边框
    border-radius: 12px;            // 圆角
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);  // 阴影
    overflow: visible;              // 允许内容溢出，避免被裁剪
    flex-shrink: 0;                 // 防止卡片被压缩

    .card-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid #f1f5f9;

        .card-title {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin: 0 0 6px 0;
        }

        .card-description {
            font-size: 13px;
            color: #64748b;
            margin: 0;
        }
    }

    .card-content {
        padding: 20px 24px 24px;
    }
}

/* 表单网格布局 */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
}

/* 表单组 */
.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .form-label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin: 0;
    }

    .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        color: #111827;
        background: #ffffff;
        transition: all 0.2s ease;

        &::placeholder {
            color: #9ca3af;
        }

        &:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        &:hover {
            border-color: #9ca3af;
        }
    }

    .form-textarea {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 13px;
        color: #111827;
        background: #ffffff;
        font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
        line-height: 1.6;
        resize: vertical;
        min-height: 180px; /* 减少最小高度 */
        max-height: 300px; /* 限制最大高度 */
        transition: all 0.2s ease;
        word-wrap: break-word;
        white-space: pre-wrap; /* 保持换行和空格 */

        &::placeholder {
            color: #9ca3af;
        }

        &:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        &:hover {
            border-color: #9ca3af;
        }

        /* 自定义滚动条样式 */
        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: #f0fdf4; /* 浅绿色背景 */
            border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #10b981, #059669); /* 绿色渐变 */
            border-radius: 4px;
            transition: background 0.2s ease;

            &:hover {
                background: linear-gradient(135deg, #059669, #047857); /* 深绿色渐变 */
            }
        }

        &::-webkit-scrollbar-corner {
            background: #f0fdf4;
        }
    }
}

/* 模板区域 */
.template-section {
    display: flex;
    flex-direction: column;
    gap: 20px; /* 减少间距 */
}

/* 固定的操作区域 */
.actions-section {
    display: flex;
    justify-content: flex-end;
    padding: 10px 8px; /* 右侧与滚动条对齐 */
    border-top: 1px solid #f1f5f9;
    background: #ffffff; /* 确保背景不透明 */
    flex-shrink: 0; /* 防止按钮区域被压缩 */
    border-radius: 12px;

    .actions-group {
        display: flex;
        gap: 12px;
    }
}

/* 按钮样式 */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
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

    &.btn-primary {
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

    &.btn-secondary {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;

        &:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: translateY(-1px);
        }

        &:active {
            transform: translateY(0);
            background: #e2e8f0;
        }
    }
}
</style>
