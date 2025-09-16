import "./App.css";
import type { ASTNode } from "./types/ast";
import { EditorContainer } from "./components/editor/EditorContainer";
import ASTEditor from "./components/editor/AstRichTextEditor";

function App() {
  const content =
    "<p>欢迎使用富文本编辑器！</p><p>您可以：</p><ul><li>使用工具栏按钮进行格式化</li><li>使用快捷键 Ctrl+B (加粗)、Ctrl+I (斜体)、Ctrl+U (下划线)</li><li>选择文本后应用格式</li></ul>";

  const initialAST: ASTNode[] = [
    {
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "Hello " },
        { type: "text", value: "World", marks: ["b"] },
        { type: "text", value: "! 这是一个可编辑的 AST 编辑器。" },
      ],
    },
    // {
    //   type: "element",
    //   tag: "p",
    //   children: [
    //     { type: "text", value: "您可以：", marks: ["i"] },
    //     { type: "text", value: " 直接编辑文本，使用快捷键格式化，或者点击按钮。" },
    //     { type: "text", value: " 试试在", marks: ["u"] },
    //     { type: "text", value: "不同位置", marks: ["b"] },
    //     { type: "text", value: "编辑文本！" },
    //   ],
    // },
    // {
    //   type: "element",
    //   tag: "p",
    //   children: [
    //     { type: "text", value: "第三段文本，包含更多节点用于测试。" },
    //   ],
    // },
  ];

  const handleASTChange = (newAST: ASTNode[]) => {
    console.log("AST 已更新:", newAST);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>富文本编辑器</h1>
        <p>基于 React + contentEditable 实现</p>
      </header>
      <main>
        <div style={{ marginBottom: 20 }}>
          <h2>传统 HTML 编辑器</h2>
          <EditorContainer value={content} placeholder="开始输入您的内容..." />
        </div>
        <div>
          <h2>AST 编辑器 (直接操作 AST)</h2>
          <p>这个编辑器直接操作 AST 数据，避免了 HTML 转换的开销！</p>
          <p>支持：文本输入、删除、格式化、快捷键操作</p>
          <ASTEditor initialAST={initialAST} onChange={handleASTChange} />
        </div>
      </main>
    </div>
  );
}

export default App;
