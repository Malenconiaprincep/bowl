# Bowl Editor

<div align="center">

**A Notion-like block-based rich text editor built with React and TypeScript**

一个类 Notion 的块级富文本编辑器，基于 React 和 TypeScript 构建

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 📖 简介 / Introduction

**English:** Bowl is a modern, block-based rich text editor inspired by Notion. It provides a flexible and extensible architecture for building rich text editing experiences in React applications. The editor uses AST (Abstract Syntax Tree) as its core data structure, enabling efficient content manipulation and rendering.

**中文:** Bowl 是一个受 Notion 启发的现代化块级富文本编辑器。它为在 React 应用中构建富文本编辑体验提供了灵活且可扩展的架构。编辑器使用 AST（抽象语法树）作为核心数据结构，实现了高效的内容操作和渲染。

## ✨ 核心特性 / Core Features

### 🎯 Block-Based Editing / 块级编辑

- **English:** Edit content in independent blocks, similar to Notion's editing experience
- **中文:** 以独立块为单位编辑内容，类似 Notion 的编辑体验

### 📝 Rich Text Formatting / 富文本格式化

- **English:** Support for bold, italic, underline, and strikethrough formatting
- **中文:** 支持加粗、斜体、下划线和删除线格式化

### 🎨 AST-Based Architecture / 基于 AST 的架构

- **English:** Uses AST as the core data structure for efficient content manipulation
- **中文:** 使用 AST 作为核心数据结构，实现高效的内容操作

### ⌨️ Keyboard Shortcuts / 键盘快捷键

- **English:** Full keyboard support for efficient editing
- **中文:** 完整的键盘支持，实现高效编辑

### 🔧 Extensible Design / 可扩展设计

- **English:** Easy to add new block types and formatting options
- **中文:** 易于添加新的块类型和格式化选项

### 🎯 Smart Selection Management / 智能选区管理

- **English:** Advanced selection handling with cursor position tracking
- **中文:** 高级选区处理，支持光标位置跟踪

## 🚀 快速开始 / Quick Start

### 安装 / Installation

```bash
npm install
```

### 开发 / Development

```bash
# Start development server
# 启动开发服务器
npm run dev
```

### 构建 / Build

```bash
# Build for production
# 构建生产版本
npm run build
```

### 测试 / Testing

```bash
# Run tests
# 运行测试
npm test

# Run tests with coverage
# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 📚 使用方法 / Usage

### 基础示例 / Basic Example

```tsx
import ASTEditor from "./components/editor/AstRichTextEditor"
import type { ASTNode } from "./types/ast"

function App() {
  const initialAST: ASTNode[] = [
    {
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "Hello " },
        { type: "text", value: "world", marks: ["b"] },
        { type: "text", value: "! " },
      ],
    },
  ]

  const handleASTChange = (newAST: ASTNode[]) => {
    console.log("AST updated:", newAST)
  }

  return <ASTEditor initialAST={initialAST} onChange={handleASTChange} />
}
```

### 块级编辑器示例 / Block Editor Example

```tsx
import PageBlock from "./blocks/page"
import type { Block } from "./types/blocks"

function App() {
  const initialBlocks: Block[] = [
    {
      id: "1",
      type: "paragraph",
      content: [
        {
          type: "element",
          tag: "p",
          children: [{ type: "text", value: "Welcome to Bowl Editor" }],
        },
      ],
    },
  ]

  return <PageBlock initialBlocks={initialBlocks} />
}
```

## 🏗️ 项目结构 / Project Structure

```
src/
├── components/          # React 组件
│   ├── editor/         # 编辑器组件
│   │   ├── AstRichTextEditor.tsx    # AST 编辑器核心组件
│   │   └── AstEditorToolbar.tsx     # 编辑器工具栏
│   ├── BlockComponent.tsx           # 块组件
│   └── BlockWrapper.tsx             # 块包装器
├── blocks/             # 块类型实现
│   ├── page/           # 页面块
│   ├── text/           # 文本块
│   └── image/          # 图片块
├── hooks/              # React Hooks
│   ├── useCursorPosition.ts         # 光标位置管理
│   ├── useTextInput.ts              # 文本输入处理
│   └── useActiveCommands.ts         # 命令管理
├── types/              # TypeScript 类型定义
│   ├── ast.ts          # AST 类型
│   ├── blocks.ts       # 块类型
│   └── editor.ts       # 编辑器类型
├── utils/              # 工具函数
│   ├── core.ts         # 核心工具
│   ├── formatting.ts   # 格式化工具
│   ├── selection.ts    # 选区工具
│   └── textOperations.ts # 文本操作
└── styles/             # 样式文件
    ├── editor.css      # 编辑器样式
    └── toolbar.css     # 工具栏样式
```

## 🎯 核心概念 / Core Concepts

### AST 结构 / AST Structure

编辑器使用 AST 来表示文档结构：

```typescript
type ASTNode =
  | { type: "text"; value: string; marks?: Mark[] }
  | { type: "element"; tag: ElementTag; children: ASTNode[] }

type Mark = "b" | "i" | "u" | "s" // bold, italic, underline, strikethrough
```

### 块类型 / Block Types

```typescript
type Block = {
  id: string
  type: "paragraph" | "heading" | "media"
  content: ASTNode[] | string
}
```

## 🔧 技术栈 / Tech Stack

- **React 19.1** - UI 框架
- **TypeScript 5.8** - 类型安全
- **Vite** - 构建工具
- **Vitest** - 测试框架
- **SCSS** - 样式预处理

## 🛠️ 开发指南 / Development Guide

### 添加新的块类型 / Adding New Block Types

1. 在 `src/types/blocks.ts` 中定义新的块类型
2. 在 `src/blocks/` 中创建对应的组件
3. 在 `src/components/BlockComponent.tsx` 中注册新块类型

### 添加新的格式化选项 / Adding New Formatting Options

1. 在 `src/types/ast.ts` 中扩展 `Mark` 类型
2. 在 `src/utils/formatting.ts` 中实现格式化逻辑
3. 在工具栏组件中添加对应的按钮

## 📝 待办事项 / TODO

- [ ] 优化页面块的行为（删除后聚焦、合并逻辑等）
- [ ] 完善撤销/重做功能
- [ ] 添加更多块类型（列表、引用、代码块等）
- [ ] 支持图片上传和插入
- [ ] 添加链接功能
- [ ] 支持表格编辑
- [ ] 移动端适配优化

## 🤝 贡献 / Contributing

欢迎提交 Issue 和 Pull Request！

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 许可证 / License

本项目采用 MIT 许可证。

This project is licensed under the MIT License.

## 🙏 致谢 / Acknowledgments

- 受 [Notion](https://www.notion.so/) 的编辑体验启发
- Inspired by the editing experience of [Notion](https://www.notion.so/)

---

<div align="center">

Made with ❤️ by the Bowl Editor team

</div>
