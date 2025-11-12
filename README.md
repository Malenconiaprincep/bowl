# Bowl Editor

<div align="center">

**A Notion-like block-based rich text editor built with React and TypeScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Language / 语言:** [English](README.md) | [中文](README.zh.md)

</div>

---

## 📖 Introduction

Bowl is a modern, block-based rich text editor inspired by Notion. It provides a flexible and extensible architecture for building rich text editing experiences in React applications. The editor uses AST (Abstract Syntax Tree) as its core data structure, enabling efficient content manipulation and rendering.

## ✨ Core Features

### 🎯 Block-Based Editing

- Edit content in independent blocks, similar to Notion's editing experience

### 📝 Rich Text Formatting

- Support for bold, italic, underline, and strikethrough formatting

### 🎨 AST-Based Architecture

- Uses AST as the core data structure for efficient content manipulation

### ⌨️ Keyboard Shortcuts

- Full keyboard support for efficient editing

### 🔧 Extensible Design

- Easy to add new block types and formatting options

### 🎯 Smart Selection Management

- Advanced selection handling with cursor position tracking

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📚 Usage

### Basic Example

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

### Block Editor Example

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

## 🏗️ Project Structure

```
src/
├── components/          # React Components
│   ├── editor/         # Editor Components
│   │   ├── AstRichTextEditor.tsx    # AST Editor Core Component
│   │   └── AstEditorToolbar.tsx     # Editor Toolbar
│   ├── BlockComponent.tsx           # Block Component
│   └── BlockWrapper.tsx             # Block Wrapper
├── blocks/             # Block Type Implementations
│   ├── page/           # Page Block
│   ├── text/           # Text Block
│   └── image/          # Image Block
├── hooks/              # React Hooks
│   ├── useCursorPosition.ts         # Cursor Position Management
│   ├── useTextInput.ts              # Text Input Handling
│   └── useActiveCommands.ts         # Command Management
├── types/              # TypeScript Type Definitions
│   ├── ast.ts          # AST Types
│   ├── blocks.ts       # Block Types
│   └── editor.ts       # Editor Types
├── utils/              # Utility Functions
│   ├── core.ts         # Core Utilities
│   ├── formatting.ts   # Formatting Utilities
│   ├── selection.ts    # Selection Utilities
│   └── textOperations.ts # Text Operations
└── styles/             # Style Files
    ├── editor.css      # Editor Styles
    └── toolbar.css     # Toolbar Styles
```

## 🎯 Core Concepts

### AST Structure

The editor uses AST to represent document structure:

```typescript
type ASTNode =
  | { type: "text"; value: string; marks?: Mark[] }
  | { type: "element"; tag: ElementTag; children: ASTNode[] }

type Mark = "b" | "i" | "u" | "s" // bold, italic, underline, strikethrough
```

### Block Types

```typescript
type Block = {
  id: string
  type: "paragraph" | "heading" | "media"
  content: ASTNode[] | string
}
```

## 🔧 Tech Stack

- **React 19.1** - UI Framework
- **TypeScript 5.8** - Type Safety
- **Vite** - Build Tool
- **Vitest** - Testing Framework
- **SCSS** - Style Preprocessor

## 🛠️ Development Guide

### Adding New Block Types

1. Define the new block type in `src/types/blocks.ts`
2. Create the corresponding component in `src/blocks/`
3. Register the new block type in `src/components/BlockComponent.tsx`

### Adding New Formatting Options

1. Extend the `Mark` type in `src/types/ast.ts`
2. Implement formatting logic in `src/utils/formatting.ts`
3. Add corresponding buttons in the toolbar component

## 📝 TODO

- [ ] Optimize page block behavior (focus after deletion, merge logic, etc.)
- [ ] Improve undo/redo functionality
- [ ] Add more block types (lists, quotes, code blocks, etc.)
- [ ] Support image upload and insertion
- [ ] Add link functionality
- [ ] Support table editing
- [ ] Mobile adaptation optimization

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by the editing experience of [Notion](https://www.notion.so/)

---

<div align="center">

Made with ❤️ by the Bowl Editor team

</div>
