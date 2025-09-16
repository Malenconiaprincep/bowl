import { useState, useCallback } from "react";
import type { ASTNode } from "../../types/ast";
import { useCursorPosition } from "../../hooks/useCursorPosition";
import { useTextInput } from "../../hooks/useTextInput";
import { AstEditorToolbar } from "./AstEditorToolbar";

// 渲染 AST 节点
function renderNode(node: ASTNode, key: number): React.ReactNode {
  if (node.type === "text") {
    let content: React.ReactNode = node.value;

    // 应用标记
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach(mark => {
        switch (mark) {
          case "b":
            content = <b key={mark}>{content}</b>;
            break;
          case "i":
            content = <i key={mark}>{content}</i>;
            break;
          case "u":
            content = <u key={mark}>{content}</u>;
            break;
          case "s":
            content = <s key={mark}>{content}</s>;
            break;
        }
      });
    }

    return content;
  }

  if (node.type === "element") {
    const Tag = node.tag;
    return (
      <Tag key={key}>
        {node.children.map((child, idx) => renderNode(child, idx))}
      </Tag>
    );
  }

  return null;
}

export default function ASTEditor({
  initialAST,
  onChange
}: {
  initialAST: ASTNode[];
  onChange?: (ast: ASTNode[]) => void;
}) {
  const [ast, setAst] = useState<ASTNode[]>(initialAST);

  // 使用光标位置管理 hook
  const {
    cursorPosition,
    setCursorPosition,
    selection,
    activeCommands,
    editorRef,
    isUpdatingFromState,
    pendingCursorPosition,
    restoreCursorPosition,
    checkActiveCommands,
    handleSelectionChange,
    handleClick
  } = useCursorPosition(ast);

  // 更新 AST 并触发回调
  const updateAST = useCallback((newAST: ASTNode[]) => {
    isUpdatingFromState.current = true;
    setAst(newAST);
    onChange?.(newAST);

    // 延迟恢复光标位置
    setTimeout(() => {
      if (pendingCursorPosition.current) {
        restoreCursorPosition(pendingCursorPosition.current);
        pendingCursorPosition.current = null;
      }
      isUpdatingFromState.current = false;
      // 检查激活状态
      checkActiveCommands();
    }, 0);
  }, [onChange, restoreCursorPosition, checkActiveCommands, isUpdatingFromState, pendingCursorPosition]);

  // 使用文本输入处理 hook
  const { handleKeyDown } = useTextInput(
    ast,
    cursorPosition,
    setCursorPosition,
    updateAST,
    pendingCursorPosition
  );

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleClick}
        style={{
          border: "1px solid #ccc",
          padding: 10,
          minHeight: 50,
          outline: 'none',
          whiteSpace: 'pre-wrap',
          cursor: 'text'
        }}
      >
        {ast.map((node, idx) => renderNode(node, idx))}
      </div>

      <AstEditorToolbar
        ast={ast}
        selection={selection}
        cursorPosition={cursorPosition}
        activeCommands={activeCommands}
        onUpdateAST={updateAST}
      />

      <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        <p>光标位置: 节点 {cursorPosition.nodeIndex}, 偏移 {cursorPosition.textOffset}</p>
        <p>选区: {selection.hasSelection ? `从 ${selection.start.textOffset} 到 ${selection.end.textOffset}` : '无'}</p>
      </div>
    </div>
  );
}