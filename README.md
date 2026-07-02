# PxRuler 📐

一个简洁实用的像素标尺工具，适用于 UI 设计、前端开发等需要精确测量像素的场景。

## ✨ 功能特性

- 🎯 **像素级精确测量** — 基于 Canvas 渲染，支持高精度像素标尺
- 🖱️ **便捷交互** — 鼠标悬停即时显示像素位置
- 🎨 **简洁 UI** — 轻量无干扰，专注测量本身
- 🔌 **uTools 插件** — 作为 uTools 插件运行，随时呼出

## 📦 安装

1. 下载本项目全部文件
2. 在 uTools 中选择「插件开发」→「导入插件」
3. 选择本项目的 `plugin.json` 文件完成导入

或者将项目文件夹放入 uTools 插件目录后重启 uTools。

## 🚀 使用方式

在 uTools 输入以下任意关键词即可呼出像素尺：

- `像素尺`
- `pixel ruler`
- `像素标尺`
- `测量工具`

## 📁 项目结构

```
PxRuler/
├── plugin.json       # uTools 插件配置
├── preload.js        # uTools 预加载脚本
├── ruler_preload.js  # 标尺预加载脚本
├── ruler.html        # 主页面
├── ruler.css         # 样式文件
├── ruler.js          # 核心逻辑
└── logo.png          # 插件图标
```

## 🛠️ 技术栈

- 原生 HTML + CSS + JavaScript
- Canvas API 渲染标尺

## 📄 License

MIT

---

Made with ❤️ by bgDmm
