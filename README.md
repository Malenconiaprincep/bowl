# 富文本编辑器

基于 React + TypeScript + contentEditable 实现的富文本编辑器。

## 项目结构

```
src/
├── components/
│   ├── editor/
│   │   ├── RichTextEditor.tsx    # 核心编辑器组件
│   │   └── EditorContainer.tsx   # 编辑器容器（整合工具栏）
│   └── toolbar/
│       └── EditorToolbar.tsx     # 工具栏组件
├── hooks/
│   └── useEditor.ts              # 编辑器核心逻辑 Hook
├── types/
│   └── editor.ts                 # TypeScript 类型定义
├── utils/
│   └── editorUtils.ts            # 编辑器工具函数
├── styles/
│   ├── editor.css                # 编辑器样式
│   └── toolbar.css               # 工具栏样式
└── App.tsx                       # 主应用组件
```

## 核心特性

- ✅ 基于 contentEditable 的富文本编辑
- ✅ 工具栏支持（加粗、斜体、下划线）
- ✅ 快捷键支持（Ctrl+B, Ctrl+I, Ctrl+U）
- ✅ 选区管理和操作
- ✅ 内容变化监听
- ✅ 历史记录支持
- ✅ 响应式设计

## 技术实现

### 1. 状态管理
- 使用 React Hooks 管理编辑器状态
- 包含内容、选区、历史记录等状态

### 2. 选区操作
- 使用 Selection API 和 Range API
- 支持获取、设置、保存、恢复选区

### 3. 命令执行
- 使用 document.execCommand 执行格式化命令
- 支持加粗、斜体、下划线等基础格式

### 4. 事件处理
- 监听输入、键盘、选区变化等事件
- 支持粘贴时清理格式

## 使用方法

```tsx
import { EditorContainer } from './components/editor/EditorContainer';

function App() {
  const handleContentChange = (content: string) => {
    console.log('内容变化:', content);
  };

  return (
    <EditorContainer
      initialContent="<p>初始内容</p>"
      placeholder="开始输入..."
      onChange={handleContentChange}
    />
  );
}
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 扩展功能

可以轻松扩展以下功能：

1. **更多格式**：添加字体大小、颜色、对齐方式等
2. **列表支持**：有序列表、无序列表
3. **链接插入**：URL 链接功能
4. **图片上传**：图片插入功能
5. **表格支持**：表格创建和编辑
6. **撤销重做**：完善的历史记录功能

## 注意事项

- 使用 contentEditable 需要注意浏览器兼容性
- document.execCommand 已被废弃，生产环境建议使用更现代的方案
- 选区操作需要仔细处理边界情况





