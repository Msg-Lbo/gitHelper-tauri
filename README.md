# WorkHelper

一个方便公司提交与修改OA日报周报的管理工具

## 项目介绍

WorkHelper 是一款基于 Tauri + Vue 3 + TypeScript 开发的桌面应用程序，专为提升工作效率而设计。通过智能化的日报周报生成功能，帮助用户快速创建规范的工作汇报并一键提交到OA系统。

## 主要功能

- 📝 **智能日报生成** - 自动分析工作内容，生成规范的日报格式
- 🔄 **OA系统集成** - 支持直接提交到公司OA系统
- ✏️ **编辑与管理** - 支持日报的编辑、删除等管理功能
- 🎨 **现代化界面** - 基于 Naive UI 的美观用户界面
- 🚀 **高性能** - Tauri 框架提供原生性能体验

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI组件库**: Naive UI
- **桌面框架**: Tauri
- **构建工具**: Vite
- **样式**: SCSS
- **图标**: @vicons/ionicons5

## 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建应用
npm run tauri:build
```

## 作者

**Msg-Lbo**
- Email: msglbo@foxmail.com
- GitHub: [@Msg-Lbo](https://github.com/Msg-Lbo)

## 许可证

MIT License

## 项目结构

```
workHelper-tauri/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── api/               # API 接口
│   ├── utils/             # 工具函数
│   └── style.scss         # 全局样式
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   └── Cargo.toml         # Rust 配置
└── package.json           # 项目配置
```
