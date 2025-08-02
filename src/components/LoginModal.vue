<template>
    <n-modal
        v-model:show="showModal"
        preset="card"
        size="small"
        :bordered="false"
        :closable="false"
        :mask-closable="false"
        class="login-modal"
        @close="handleClose"
    >
        <!-- 自定义标题栏 -->
        <template #header>
            <div class="modal-header">
                <div class="header-content">
                    <div class="brand-section">
                        <div class="brand-icon">
                            <n-icon size="24" color="#7fe7c4"><PersonOutline /></n-icon>
                        </div>
                        <div class="brand-text">
                            <h3 class="title">登录 OA 系统</h3>
                            <p class="subtitle">请输入您的账户信息</p>
                        </div>
                    </div>
                </div>
                <n-button quaternary circle size="small" class="close-btn" @click="handleClose">
                    <template #icon>
                        <n-icon size="16"><CloseOutline /></n-icon>
                    </template>
                </n-button>
            </div>
        </template>

        <div class="login-modal-content">
            <n-form ref="formRef" :model="loginForm" :rules="formRules" size="medium" class="login-form" :show-label="false">
                <!-- 用户名输入框 -->
                <n-form-item path="username" class="form-item">
                    <div class="input-wrapper">
                        <n-input
                            v-model:value="loginForm.username"
                            placeholder="请输入手机号"
                            clearable
                            class="styled-input"
                            :input-props="{ autocomplete: 'username' }"
                            @keyup.enter="handleLogin"
                        >
                            <template #prefix>
                                <n-icon size="18" color="#7fe7c4"><PersonOutline /></n-icon>
                            </template>
                        </n-input>
                    </div>
                </n-form-item>

                <!-- 密码输入框 -->
                <n-form-item path="password" class="form-item">
                    <div class="input-wrapper">
                        <n-input
                            v-model:value="loginForm.password"
                            type="password"
                            placeholder="请输入密码"
                            show-password-on="click"
                            clearable
                            class="styled-input"
                            :input-props="{ autocomplete: 'current-password' }"
                            @keyup.enter="handleLogin"
                        >
                            <template #prefix>
                                <n-icon size="18" color="#7fe7c4"><LockClosedOutline /></n-icon>
                            </template>
                        </n-input>
                    </div>
                </n-form-item>

                <!-- 验证码输入框 -->
                <n-form-item path="code" class="form-item">
                    <div class="captcha-container">
                        <div class="input-wrapper captcha-input-wrapper">
                            <n-input
                                v-model:value="loginForm.code"
                                placeholder="请输入验证码"
                                clearable
                                class="styled-input captcha-input"
                                @keyup.enter="handleLogin"
                            >
                                <template #prefix>
                                    <n-icon size="18" color="#7fe7c4"><ShieldCheckmarkOutline /></n-icon>
                                </template>
                            </n-input>
                        </div>
                        <div 
                            class="captcha-image" 
                            @click="refreshCaptcha" 
                            :class="{ 'loading': captchaLoading, 'error': captchaError }"
                        >
                            <!-- 加载状态 -->
                            <div v-if="captchaLoading" class="captcha-loading">
                                <div class="skeleton-placeholder">
                                    <div class="skeleton-line"></div>
                                    <div class="skeleton-line"></div>
                                    <div class="skeleton-line"></div>
                                </div>
                                <div class="loading-text">加载中...</div>
                            </div>
                            
                            <!-- 错误状态 -->
                            <div v-else-if="captchaError" class="captcha-error">
                                <n-icon size="20" color="#f56565"><RefreshOutline /></n-icon>
                                <div class="error-text">点击重试</div>
                            </div>
                            
                            <!-- 验证码图片 -->
                            <div v-else-if="captchaImage" class="captcha-success">
                                <img :src="captchaImage" alt="验证码" class="captcha-img" />
                                <div class="refresh-overlay">
                                    <n-icon size="16" color="#fff"><RefreshOutline /></n-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                </n-form-item>

                <!-- 保存账户信息复选框 -->
                <n-form-item class="form-item checkbox-item">
                    <n-checkbox v-model:checked="saveAccount" size="medium" class="save-checkbox"> 
                        <span class="checkbox-text">保存账户信息</span>
                    </n-checkbox>
                </n-form-item>

                <!-- 登录按钮 -->
                <n-button 
                    type="primary" 
                    size="large" 
                    block 
                    :loading="loginLoading" 
                    @click="handleLogin" 
                    class="login-button"
                >
                    <template #icon v-if="!loginLoading">
                        <n-icon size="18"><LogInOutline /></n-icon>
                    </template>
                    {{ loginLoading ? "登录中..." : "立即登录" }}
                </n-button>
            </n-form>
        </div>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import { NModal, NForm, NFormItem, NInput, NButton, NCheckbox, NIcon, useMessage, type FormInst, type FormRules } from "naive-ui";
import { PersonOutline, LockClosedOutline, ShieldCheckmarkOutline, CloseOutline, RefreshOutline, LogInOutline } from "@vicons/ionicons5";
import { getCaptchaImage, login, encodeBase64, OATokenManager, OAAccountManager, type LoginParams } from "../api/oa";

// 定义组件属性
interface Props {
    show: boolean;
}

// 定义组件事件
interface Emits {
    (e: "update:show", value: boolean): void;
    (e: "login-success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 消息提示
const message = useMessage();

// 表单引用
const formRef = ref<FormInst | null>(null);

// 内部显示状态
const showModal = ref(false);

// 登录表单数据
const loginForm = reactive({
    username: "",
    password: "",
    code: "",
});

// 其他状态
const loginLoading = ref(false);
const saveAccount = ref(false);
const captchaImage = ref("");
const captchaUuid = ref("");
const captchaLoading = ref(false);
const captchaError = ref(false);

// 表单验证规则
const formRules: FormRules = {
    username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
    password: [{ required: true, type: "string", message: "请输入密码", trigger: "blur" }],
    code: [{ required: true, type: "string", message: "请输入验证码", trigger: "blur" }],
};

// 监听外部show属性变化
watch(
    () => props.show,
    (newVal) => {
        showModal.value = newVal;
        if (newVal) {
            // 模态框打开时重新获取验证码和加载账户信息
            getCaptcha();
            loadAccountInfo();
        }
    }
);

// 监听内部showModal变化，同步到外部
watch(showModal, (newVal) => {
    emit("update:show", newVal);
});

// 获取验证码
const getCaptcha = async () => {
    try {
        // 重置状态
        captchaLoading.value = true;
        captchaError.value = false;
        captchaImage.value = "";
        
        const data = await getCaptchaImage();

        if (data.code === 200) {
            captchaImage.value = `data:image/png;base64,${data.img}`;
            captchaUuid.value = data.uuid;
            captchaError.value = false;
        } else {
            captchaError.value = true;
            message.error(data.msg || "获取验证码失败");
        }
    } catch (error) {
        console.error("获取验证码失败:", error);
        captchaError.value = true;
        message.error("获取验证码失败，请检查网络连接");
    } finally {
        captchaLoading.value = false;
    }
};

// 刷新验证码
const refreshCaptcha = () => {
    getCaptcha();
};

// 处理登录
const handleLogin = async () => {
    if (!formRef.value) return;

    try {
        await formRef.value.validate();

        loginLoading.value = true;

        // 准备登录数据
        const loginData: LoginParams = {
            username: loginForm.username,
            encryptPassword: encodeBase64(loginForm.password),
            code: loginForm.code,
            uuid: captchaUuid.value,
        };

        // 发送登录请求
        const result = await login(loginData);

        if (result.code === 200 && result.token) {
            // 保存token
            OATokenManager.saveToken(result.token);

            // 如果勾选了保存账户信息，则保存到设置中
            if (saveAccount.value) {
                OAAccountManager.saveAccount(loginForm.username, loginForm.password);
                message.success("账户信息已保存");
            }

            // 触发登录成功事件（父组件会显示登录成功消息）
            emit("login-success");

            // 关闭模态框
            handleClose();
        } else {
            // 登录失败
            message.error(result.msg || "登录失败");
            refreshCaptcha();
        }
    } catch (error) {
        console.error("登录失败:", error);
        message.error("登录失败，请检查用户名、密码和验证码");
        refreshCaptcha();
    } finally {
        loginLoading.value = false;
    }
};

// 加载已保存的账户信息
const loadAccountInfo = () => {
    try {
        const account = OAAccountManager.getAccount();
        if (account.username) {
            loginForm.username = account.username;
            saveAccount.value = true;
        }
        if (account.password) {
            loginForm.password = account.password;
        }
    } catch (error) {
        console.error("加载账户信息失败:", error);
    }
};

// 处理关闭
const handleClose = () => {
    showModal.value = false;
    // 清空表单
    loginForm.username = "";
    loginForm.password = "";
    loginForm.code = "";
    saveAccount.value = false;
    captchaImage.value = "";
    captchaUuid.value = "";
    captchaLoading.value = false;
    captchaError.value = false;
};

// 组件挂载时执行
onMounted(() => {
    showModal.value = props.show;
});
</script>

<style scoped lang="scss">
// 登录模态框样式
:deep(.login-modal) {
    .n-card {
        width: 420px !important;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        border: 1px solid rgba(126, 231, 196, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(126, 231, 196, 0.1);
        border-radius: 16px;
        overflow: hidden;
        backdrop-filter: blur(10px);
        
        .n-card-header {
            background: rgba(126, 231, 196, 0.1);
            border-bottom: 1px solid rgba(126, 231, 196, 0.15);
            padding: 20px 24px;
        }
        
        .n-card__content {
            padding: 24px;
        }
    }
}

// 模态框头部样式
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .header-content {
        flex: 1;
        
        .brand-section {
            display: flex;
            align-items: center;
            gap: 12px;

            .brand-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #7fe7c4 0%, #6dd5ed 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(126, 231, 196, 0.3);
            }

            .brand-text {
                .title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #fff;
                    background: linear-gradient(135deg, #7fe7c4 0%, #6dd5ed 100%);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .subtitle {
                    margin: 2px 0 0 0;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 400;
                }
            }
        }
    }

    .close-btn {
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.3s ease;
        border-radius: 8px;

        &:hover {
            color: #fff;
            background: rgba(126, 231, 196, 0.2);
            transform: scale(1.1);
        }
    }
}

// 登录表单内容样式
.login-modal-content {
    .login-form {
        .form-item {
            margin-bottom: 20px;

            &.checkbox-item {
                margin-bottom: 24px;
            }
        }

        .input-wrapper {
            position: relative;
            
            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #7fe7c4, #6dd5ed);
                border-radius: 8px;
                padding: 1px;
                z-index: 0;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            &:hover::before,
            &:focus-within::before {
                opacity: 1;
            }

            :deep(.styled-input) {
                position: relative;
                z-index: 1;
                height: 48px;
                border-radius: 8px;
                background: rgba(42, 42, 42, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;

                &:hover {
                    border-color: rgba(126, 231, 196, 0.4);
                    background: rgba(42, 42, 42, 0.9);
                }

                &:focus-within {
                    border-color: #7fe7c4;
                    box-shadow: 0 0 0 2px rgba(126, 231, 196, 0.2);
                    background: rgba(42, 42, 42, 1);
                }

                .n-input__input-el {
                    color: #fff;
                    font-size: 14px;
                    
                    &::placeholder {
                        color: rgba(255, 255, 255, 0.4);
                    }
                }

                .n-input__prefix {
                    margin-right: 12px;
                }
            }
        }

        .captcha-container {
            display: flex;
            gap: 12px;
            align-items: stretch;

            .captcha-input-wrapper {
                flex: 1;
            }

            .captcha-image {
                width: 120px;
                height: 48px;
                border-radius: 8px;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                background: rgba(42, 42, 42, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;

                &:hover {
                    border-color: rgba(126, 231, 196, 0.4);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                &.loading {
                    border-color: rgba(126, 231, 196, 0.3);
                }

                &.error {
                    border-color: rgba(245, 101, 101, 0.4);
                    background: rgba(245, 101, 101, 0.1);

                    &:hover {
                        border-color: rgba(245, 101, 101, 0.6);
                    }
                }

                .captcha-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: 6px;

                    .skeleton-placeholder {
                        width: 80%;
                        display: flex;
                        flex-direction: column;
                        gap: 3px;

                        .skeleton-line {
                            height: 6px;
                            background: linear-gradient(
                                90deg,
                                rgba(126, 231, 196, 0.1) 0%,
                                rgba(126, 231, 196, 0.3) 50%,
                                rgba(126, 231, 196, 0.1) 100%
                            );
                            border-radius: 3px;
                            animation: skeleton-shimmer 1.5s infinite;

                            &:nth-child(2) {
                                width: 70%;
                                animation-delay: 0.2s;
                            }

                            &:nth-child(3) {
                                width: 50%;
                                animation-delay: 0.4s;
                            }
                        }
                    }

                    .loading-text {
                        font-size: 10px;
                        color: rgba(126, 231, 196, 0.7);
                        font-weight: 500;
                    }
                }

                .captcha-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: 4px;

                    .error-text {
                        font-size: 10px;
                        color: rgba(245, 101, 101, 0.8);
                        font-weight: 500;
                    }
                }

                .captcha-success {
                    position: relative;
                    height: 100%;

                    .captcha-img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 7px;
                        opacity: 0.9;
                        transition: opacity 0.3s ease;
                    }

                    .refresh-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        backdrop-filter: blur(2px);
                    }

                    &:hover {
                        .captcha-img {
                            opacity: 0.7;
                        }

                        .refresh-overlay {
                            opacity: 1;
                        }
                    }
                }
            }
        }

        .save-checkbox {
            :deep(.n-checkbox) {
                .n-checkbox__label {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 13px;
                    font-weight: 500;
                }

                .n-checkbox-box {
                    border-color: rgba(126, 231, 196, 0.4);
                    
                    &:hover {
                        border-color: #7fe7c4;
                    }
                }

                &.n-checkbox--checked {
                    .n-checkbox-box {
                        background: linear-gradient(135deg, #7fe7c4, #6dd5ed);
                        border-color: #7fe7c4;
                    }
                }
            }
        }

        .login-button {
            height: 52px;
            font-weight: 600;
            font-size: 15px;
            border-radius: 12px;
            background: linear-gradient(135deg, #7fe7c4 0%, #6dd5ed 100%);
            border: none;
            box-shadow: 0 4px 15px rgba(126, 231, 196, 0.4);
            transition: all 0.3s ease;
            margin-top: 8px;

            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(126, 231, 196, 0.5);
                background: linear-gradient(135deg, #6dd5ed 0%, #7fe7c4 100%);
            }

            &:active {
                transform: translateY(0);
            }

            :deep(.n-button__content) {
                color: #1a1a1a;
                font-weight: 600;
            }

            :deep(.n-button__icon) {
                color: #1a1a1a;
            }
        }
    }
}

// 动画定义
@keyframes skeleton-shimmer {
    0% {
        opacity: 0.5;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0.5;
    }
}

// 响应式设计
@media (max-width: 480px) {
    :deep(.login-modal) {
        .n-card {
            width: 90vw !important;
            margin: 20px;
        }
    }
    
    .modal-header {
        .header-content {
            .brand-section {
                .brand-icon {
                    width: 40px;
                    height: 40px;
                }

                .brand-text {
                    .title {
                        font-size: 16px;
                    }

                    .subtitle {
                        font-size: 12px;
                    }
                }
            }
        }
    }
    
    .login-modal-content {
        .login-form {
            .captcha-container {
                .captcha-image {
                    width: 100px;
                }
            }
        }
    }
}
</style>
