<template>
    <n-modal
        v-model:show="showModal"
        preset="card"
        size="small"
        :bordered="false"
        :closable="false"
        :mask-closable="false"
        style="width: 320px"
        @close="handleClose"
    >
        <!-- 自定义标题栏 -->
        <template #header>
            <div class="modal-header flex justify-between align-center">
                <div class="header-spacer"></div>
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
                    <n-input
                        v-model:value="loginForm.username"
                        placeholder="请输入手机号"
                        clearable
                        class="styled-input"
                        :input-props="{ autocomplete: 'username' }"
                        @keyup.enter="handleLogin"
                    >
                        <template #prefix>
                            <n-icon size="16" color="#7fe7c4"><PersonOutline /></n-icon>
                        </template>
                    </n-input>
                </n-form-item>

                <!-- 密码输入框 -->
                <n-form-item path="password" class="form-item">
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
                            <n-icon size="16" color="#7fe7c4"><LockClosedOutline /></n-icon>
                        </template>
                    </n-input>
                </n-form-item>

                <!-- 验证码输入框 -->
                <n-form-item path="code" class="form-item">
                    <div class="captcha-container">
                        <n-input
                            v-model:value="loginForm.code"
                            placeholder="请输入验证码"
                            clearable
                            class="styled-input captcha-input"
                            @keyup.enter="handleLogin"
                        >
                            <template #prefix>
                                <n-icon size="16" color="#7fe7c4"><ShieldCheckmarkOutline /></n-icon>
                            </template>
                        </n-input>
                        <div class="captcha-image" @click="refreshCaptcha" :title="captchaImage ? '点击刷新验证码' : '加载中...'">
                            <img v-if="captchaImage" :src="captchaImage" alt="验证码" class="captcha-img" />
                            <n-spin v-else size="small" />
                        </div>
                    </div>
                </n-form-item>

                <!-- 保存账户信息复选框 -->
                <n-form-item class="form-item checkbox-item">
                    <n-checkbox v-model:checked="saveAccount" size="small"> 保存账户信息 </n-checkbox>
                </n-form-item>

                <!-- 登录按钮 -->
                <n-button type="primary" size="medium" block :loading="loginLoading" @click="handleLogin" class="login-button">
                    {{ loginLoading ? "登录中..." : "登录" }}
                </n-button>
            </n-form>
        </div>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import { NModal, NForm, NFormItem, NInput, NButton, NCheckbox, NIcon, NSpin, useMessage, type FormInst, type FormRules } from "naive-ui";
import { PersonOutline, LockClosedOutline, ShieldCheckmarkOutline, CloseOutline } from "@vicons/ionicons5";
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
        const data = await getCaptchaImage();

        if (data.code === 200) {
            captchaImage.value = `data:image/png;base64,${data.img}`;
            captchaUuid.value = data.uuid;
        } else {
            message.error(data.msg || "获取验证码失败");
        }
    } catch (error) {
        console.error("获取验证码失败:", error);
        message.error("获取验证码失败，请检查网络连接");
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
};

// 组件挂载时执行
onMounted(() => {
    showModal.value = props.show;
});
</script>

<style scoped lang="scss">
// 模态框头部样式
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;

    .header-spacer {
        flex: 1;
    }

    .close-btn {
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;

        &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
        }
    }
}

// 登录表单内容样式
.login-modal-content {
    .login-form {
        .captcha-container {
            display: flex;
            gap: 8px;
            align-items: stretch;

            .captcha-input {
                flex: 1;
            }

            .captcha-image {
                width: 80px;
                height: 34px;
                border: 1px solid #444;
                border-radius: 3px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #2a2a2a;
                transition: all 0.2s ease;
                overflow: hidden;

                &:hover {
                    border-color: #4a9eff;
                    background: rgba(74, 158, 255, 0.1);
                }

                .captcha-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 2px;
                }
            }
        }

        .login-button {
            height: 36px;
            font-weight: 600;
            margin-top: 6px;
        }
    }
}
</style>
