<template>
    <div class="oa-login">
        <div class="login-container">
            <n-form
                ref="formRef"
                :model="loginForm"
                :rules="formRules"
                size="medium"
                class="login-form"
                label-width="55"
                label-placement="left"
            >
                <!-- 用户名输入框 -->
                <n-form-item path="username" label="用户名">
                    <n-input
                        v-model:value="loginForm.username"
                        placeholder="请输入手机号"
                        clearable
                        :input-props="{ autocomplete: 'username' }"
                        @keyup.enter="handleLogin"
                    >
                        <template #prefix>
                            <n-icon><PersonOutline /></n-icon>
                        </template>
                    </n-input>
                </n-form-item>

                <!-- 密码输入框 -->
                <n-form-item path="password" label="密码">
                    <n-input
                        v-model:value="loginForm.password"
                        type="password"
                        placeholder="请输入密码"
                        show-password-on="click"
                        clearable
                        :input-props="{ autocomplete: 'current-password' }"
                        @keyup.enter="handleLogin"
                    >
                        <template #prefix>
                            <n-icon><LockClosedOutline /></n-icon>
                        </template>
                    </n-input>
                </n-form-item>

                <!-- 验证码输入框 -->
                <n-form-item path="code" label="验证码">
                    <div class="captcha-container">
                        <n-input
                            v-model:value="loginForm.code"
                            placeholder="请输入验证码"
                            clearable
                            class="captcha-input"
                            @keyup.enter="handleLogin"
                        >
                            <template #prefix>
                                <n-icon><ShieldCheckmarkOutline /></n-icon>
                            </template>
                        </n-input>
                        <div class="captcha-image" @click="refreshCaptcha" :title="captchaImage ? '点击刷新验证码' : '加载中...'">
                            <img v-if="captchaImage" :src="captchaImage" alt="验证码" class="captcha-img" />
                            <n-spin v-else size="small" />
                        </div>
                    </div>
                </n-form-item>

                <!-- 保存账户信息复选框 -->
                <n-form-item>
                    <n-checkbox v-model:checked="saveAccount"> 保存账户信息 </n-checkbox>
                </n-form-item>

                <!-- 登录按钮 -->
                <n-button type="primary" size="large" block :loading="loginLoading" @click="handleLogin"> 登录 </n-button>
            </n-form>

            <!-- 登录状态显示 -->
            <div v-if="isLoggedIn" class="login-status">
                <div class="status-content">
                    <n-button size="small" @click="handleLogout">退出登录</n-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { NForm, NFormItem, NInput, NButton, NCheckbox, NIcon, NSpin, useMessage, type FormInst, type FormRules } from "naive-ui";
import { PersonOutline, LockClosedOutline, ShieldCheckmarkOutline } from "@vicons/ionicons5";
import { getCaptchaImage, login, encodeBase64, OATokenManager, OAAccountManager, type LoginParams } from "../api/oa";

// 消息提示
const message = useMessage();

// 表单引用
const formRef = ref<FormInst | null>(null);

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
const isLoggedIn = ref(false);

// 表单验证规则
const formRules: FormRules = {
    username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
    password: [{ required: true, type: "string", message: "请输入密码", trigger: "blur" }],
    code: [{ required: true, type: "string", message: "请输入验证码", trigger: "blur" }],
};

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
            // 登录成功
            message.success("登录成功");
            isLoggedIn.value = true;

            // 保存token
            OATokenManager.saveToken(result.token);

            // 如果勾选了保存账户信息，则保存到设置中
            if (saveAccount.value) {
                OAAccountManager.saveAccount(loginForm.username, loginForm.password);
                message.success("账户信息已保存");
            }

            // 清空验证码
            loginForm.code = "";
            refreshCaptcha();
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

// 检查登录状态
const checkLoginStatus = () => {
    isLoggedIn.value = OATokenManager.isLoggedIn();
};

// 退出登录
const handleLogout = () => {
    OATokenManager.clearToken();
    isLoggedIn.value = false;
    message.success("已退出登录");
};

// 组件挂载时执行
onMounted(() => {
    getCaptcha();
    loadAccountInfo();
    checkLoginStatus();
});
</script>

<style scoped lang="scss">
.oa-login {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 140px);
    padding: 15px;
    background: #18181c;

    .login-container {
        width: 100%;
        max-width: 380px;
        background: rgba(42, 42, 50, 0.8);
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(64, 64, 70, 0.3);

        .login-form {
            // 调整表单项间距
            :deep(.n-form-item) {
                .n-form-item-label {
                    font-size: 12px;
                    color: #c2c2c2;
                    font-weight: 500;
                    padding-right: 6px;
                    text-align: right;
                    min-width: 40px;
                }
            }

            // 调整最后一个表单项的间距
            :deep(.n-form-item:last-child) {
                margin-bottom: 0;
            }

            .captcha-container {
                display: flex;
                gap: 8px;
                align-items: center;

                .captcha-input {
                    flex: 1;
                }

                .captcha-image {
                    width: 90px;
                    height: 36px;
                    border: 1px solid rgba(64, 64, 70, 0.6);
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(42, 42, 50, 0.9);
                    transition: all 0.3s ease;
                    overflow: hidden;

                    &:hover {
                        border-color: #7fe7c4;
                        background: rgba(127, 231, 196, 0.1);
                        transform: scale(1.02);
                    }

                    .captcha-img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        border-radius: 2px;
                    }
                }
            }
        }

        .login-status {
            margin-top: 16px;

            .status-content {
                display: flex;
                justify-content: space-between;
                align-items: center;

                p {
                    margin: 0;
                    color: #7fe7c4;
                    font-weight: 500;
                    font-size: 14px;
                }
            }
        }
    }
}
</style>
