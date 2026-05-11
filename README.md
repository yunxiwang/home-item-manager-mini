# 🍱 期食录 — 家庭物品管理助手

一个简洁实用的微信小程序，帮助管理家庭食物保质期和物品存放位置。

## ✨ 功能

| 模块 | 功能 |
|---|---|
| 🍔 食物管理 | 录入名称、购买日期、保质期，临期微信提醒 |
| 📦 物品管理 | 记录名称和存放位置，快速搜索定位 |
| 🔔 临期提醒 | 可自定义提醒天数（3/30/90天），订阅消息推送 |
| 📊 数据管理 | 支持 XLSX/JSON 格式导入导出 |
| 🏷️ 分类管理 | 食物和物品分类自定义 |
| 💬 意见反馈 | 内置反馈收集 |

## 🛠 技术栈

- **前端**：微信小程序原生（WXML + WXSS + JavaScript）
- **后端**：微信云开发（CloudBase）
- **数据库**：CloudBase 文档型数据库
- **云函数**：checkReminders（定时提醒）、submitFeedback（反馈收集）、manageCredits（积分预留）

## 📱 预览

<img src="assets/screenshots/home.png" width="200">

## 🚀 快速开始

1. 克隆仓库
2. 微信开发者工具导入项目
3. 配置 CloudBase 环境 ID（`app.js` 第 8 行）
4. 创建数据库集合：`foods` `items` `categories` `config` `feedback`
5. 上传部署云函数
6. 编译运行

## 📝 许可证

MIT License

## 👤 作者

yunxiwang
