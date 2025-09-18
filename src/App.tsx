import "./App.css";
import type { ASTNode } from "./types/ast";
import ASTEditor from "./components/editor/AstRichTextEditor";

function App() {
  // const initialAST: ASTNode[] = [
  //   {
  //     type: "element",
  //     tag: "p",
  //     children: [
  //       { type: "text", value: "Hello " },
  //       { type: "text", value: "Wor", marks: ["b"] },
  //       { type: "text", value: "ld", marks: ["i", "b"] },
  //       { type: "text", value: "! 这是一个可编辑的 AST 编辑器。" },
  //     ],
  //   },
  // ];

  const initialAST: ASTNode[] = [
    {
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "First " },
        { type: "text", value: "Second " },
        { type: "text", value: "Third " },
        { type: "text", value: "Fourth " },
      ],
    },
  ];

  // const initialAST: ASTNode[] = [
  //   {
  //     type: "element",
  //     tag: "p",
  //     children: [
  //       { type: "text", value: "Hello " },
  //       { type: "text", value: "world", marks: ["b"] },
  //       { type: "text", value: "! " },
  //     ],
  //   }
  // ]

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
