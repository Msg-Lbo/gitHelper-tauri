<template>
  <div class="about-page">
    <!-- 闪电特效 -->
    <div class="lightning-effects">
      <svg class="lightning lightning-1" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-2" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-3" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-4" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-5" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-6" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-7" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-8" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-9" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-10" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-11" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
      <svg class="lightning lightning-12" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
      </svg>
    </div>

    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">关于工作助手</h2>
      <p class="page-subtitle">智能日报周报生成工具</p>
    </div>

    <!-- 主要内容 -->
    <div class="about-content">
      <!-- 应用信息卡片 -->
      <div class="info-card app-info-card">
        <div class="app-info">
          <div class="app-icon">📊</div>
          <div class="app-details">
            <h3 class="app-name">WorkHelper</h3>
            <p class="app-description">一个方便公司提交与修改OA日报周报的管理工具</p>
          </div>
        </div>

        <!-- 版本信息 -->
        <div class="version-section">
          <div class="version-item">
            <span class="version-label">当前版本</span>
            <span class="version-value">v{{ currentVersion }}</span>
          </div>
        </div>
      </div>

      <!-- 作者信息卡片 -->
      <div class="info-card">
        <h4 class="card-title">开发者信息</h4>
        <div class="author-info">
          <div class="author-item">
            <span class="author-label">作者</span>
            <span class="author-value">Msg-Lbo</span>
          </div>
          <div class="author-item">
            <span class="author-label">邮箱</span>
            <span class="author-value">msglbo@foxmail.com</span>
          </div>
          <div class="author-item">
            <span class="author-label">GitHub</span>
            <a href="https://github.com/Msg-Lbo" target="_blank" class="author-link">
              @Msg-Lbo
            </a>
          </div>
          <div class="author-item">
            <span class="author-label">项目地址</span>
            <a href="https://github.com/Msg-Lbo/workHelper-tauri" target="_blank" class="author-link">
              workHelper-tauri
            </a>
          </div>
        </div>
      </div>



      <!-- 技术栈信息 -->
      <div class="info-card">
        <h4 class="card-title">技术栈</h4>
        <div class="tech-stack">
          <div class="tech-item">
            <span class="tech-name">前端框架</span>
            <span class="tech-value">Vue 3 + TypeScript</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">UI组件库</span>
            <span class="tech-value">Naive UI</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">桌面框架</span>
            <span class="tech-value">Rust + Tauri</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">构建工具</span>
            <span class="tech-value">Vite</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">样式</span>
            <span class="tech-value">SCSS</span>
          </div>
        </div>
      </div>

      <!-- 许可证信息 -->
      <div class="info-card">
        <h4 class="card-title">许可证</h4>
        <div class="license-info">
          <p class="license-text">MIT License</p>
          <p class="copyright-text">Copyright © 2024 Msg-Lbo. All rights reserved.</p>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// ==================== 响应式数据 ====================

const currentVersion = ref('');

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadVersionInfo();
});

// ==================== 方法 ====================



/**
 * 加载版本信息
 */
const loadVersionInfo = async () => {
  try {
    // 获取当前版本号
    currentVersion.value = await invoke<string>('get_app_version');
    console.log('获取到版本号:', currentVersion.value);

  } catch (error) {
    console.error('加载版本信息失败:', error);
    // 设置默认值
    currentVersion.value = '0.0.1';
  }
};






</script>

<style lang="scss" scoped>
.about-page {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  height: 100%;
  overflow-y: auto;
  width: 100%;
  position: relative;

  // 美化滚动条
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 4px;
    transition: background 0.3s ease;

    &:hover {
      background: linear-gradient(135deg, #059669, #047857);
    }
  }

  // 添加背景装饰
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border-radius: 0 0 50% 50% / 0 0 100px 100px;
    z-index: 0;
  }

  // 确保内容在装饰之上
  > * {
    position: relative;
    z-index: 1;
  }
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
  animation: fadeInDown 0.8s ease-out;

  .page-title {
    font-size: 22px;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 6px 0;
    background: linear-gradient(135deg, #1f2937, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleGlow 2s ease-in-out infinite alternate;
  }

  .page-subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    opacity: 0.8;
  }
}

.about-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeInUp 1s ease-out 0.3s both;

  // 在小屏幕上使用单列布局
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: fit-content;
  position: relative;
  overflow: hidden;

  // 添加微妙的渐变背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #10b981, #059669, #047857);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
    border-color: #10b981;

    &::before {
      transform: scaleX(1);
    }
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #10b981;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, #059669, #047857);
      transition: width 0.3s ease;
    }
  }

  &:hover .card-title::after {
    width: 100%;
  }
}

// 应用信息卡片特殊样式
.app-info-card {
  grid-column: 1 / -1; // 跨越所有列

  @media (max-width: 768px) {
    grid-column: 1;
  }
}

.app-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .app-icon {
    font-size: 36px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 12px;
    box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
  }

  .app-details {
    flex: 1;

    .app-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 4px 0;
    }

    .app-description {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }
  }
}

.version-section {
  display: flex;
  gap: 24px;

  .version-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .version-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 500;
    }

    .version-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 600;
    }
  }
}

.author-info,
.tech-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.author-item,
.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.author-label,
.tech-name {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.author-value,
.tech-value {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}

.author-link {
  font-size: 13px;
  color: #10b981;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    color: #059669;
    text-decoration: underline;
  }
}



.license-info {
  .license-text {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 6px 0;
  }

  .copyright-text {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
  }
}



// 闪电特效样式
.lightning-effects {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.lightning {
  position: absolute;
  width: 32px;
  height: 32px;
  color: #10b981;
  opacity: 0;
  animation-fill-mode: both;

  &.lightning-1 {
    top: 8%;
    left: 12%;
    animation: lightningFlash 2.5s infinite;
    animation-delay: 0s;
    width: 28px;
    height: 28px;
  }

  &.lightning-2 {
    top: 15%;
    right: 18%;
    animation: lightningFlash 3.2s infinite;
    animation-delay: 0.8s;
    color: #059669;
    width: 35px;
    height: 35px;
  }

  &.lightning-3 {
    top: 25%;
    left: 8%;
    animation: lightningFlash 2.8s infinite;
    animation-delay: 1.6s;
    color: #047857;
    width: 30px;
    height: 30px;
  }

  &.lightning-4 {
    top: 35%;
    right: 12%;
    animation: lightningFlash 3.5s infinite;
    animation-delay: 0.3s;
    color: #10b981;
    width: 26px;
    height: 26px;
  }

  &.lightning-5 {
    top: 45%;
    left: 15%;
    animation: lightningFlash 3.1s infinite;
    animation-delay: 2.1s;
    color: #059669;
    width: 33px;
    height: 33px;
  }

  &.lightning-6 {
    top: 55%;
    right: 25%;
    animation: lightningFlash 2.7s infinite;
    animation-delay: 1.2s;
    color: #047857;
    width: 29px;
    height: 29px;
  }

  &.lightning-7 {
    top: 65%;
    left: 22%;
    animation: lightningFlash 3.4s infinite;
    animation-delay: 0.6s;
    color: #10b981;
    width: 31px;
    height: 31px;
  }

  &.lightning-8 {
    top: 75%;
    right: 8%;
    animation: lightningFlash 2.9s infinite;
    animation-delay: 1.8s;
    color: #059669;
    width: 27px;
    height: 27px;
  }

  &.lightning-9 {
    top: 18%;
    left: 45%;
    animation: lightningFlash 3.3s infinite;
    animation-delay: 0.9s;
    color: #047857;
    width: 34px;
    height: 34px;
  }

  &.lightning-10 {
    top: 42%;
    right: 45%;
    animation: lightningFlash 2.6s infinite;
    animation-delay: 1.4s;
    color: #10b981;
    width: 32px;
    height: 32px;
  }

  &.lightning-11 {
    top: 68%;
    left: 50%;
    animation: lightningFlash 3.6s infinite;
    animation-delay: 0.2s;
    color: #059669;
    width: 30px;
    height: 30px;
  }

  &.lightning-12 {
    top: 85%;
    right: 35%;
    animation: lightningFlash 3.0s infinite;
    animation-delay: 2.3s;
    color: #047857;
    width: 28px;
    height: 28px;
  }
}

// 闪电动画
@keyframes lightningFlash {
  0%, 85%, 100% {
    opacity: 0;
    transform: scale(0.6) rotate(0deg);
    filter: brightness(1);
  }

  2%, 8% {
    opacity: 0.9;
    transform: scale(1.3) rotate(8deg);
    filter: brightness(1.5) drop-shadow(0 0 8px currentColor);
  }

  5% {
    opacity: 0.6;
    transform: scale(1.1) rotate(-5deg);
    filter: brightness(1.2) drop-shadow(0 0 4px currentColor);
  }

  12%, 18% {
    opacity: 1;
    transform: scale(1.4) rotate(3deg);
    filter: brightness(1.8) drop-shadow(0 0 12px currentColor);
  }

  15% {
    opacity: 0.4;
    transform: scale(0.9) rotate(-2deg);
    filter: brightness(1);
  }

  25%, 80% {
    opacity: 0;
    transform: scale(0.7) rotate(1deg);
    filter: brightness(1);
  }
}

// 标题发光动画
@keyframes titleGlow {
  0% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.1) drop-shadow(0 0 8px rgba(16, 185, 129, 0.3));
  }
  100% {
    filter: brightness(1);
  }
}

// 页面进入动画
@keyframes fadeInDown {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .about-page {
    padding: 12px;
  }

  .version-section {
    flex-direction: column;
    gap: 12px;
  }

  .author-item,
  .tech-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  // 移动端闪电特效调整
  .lightning {
    width: 24px !important;
    height: 24px !important;
  }
}
</style>
