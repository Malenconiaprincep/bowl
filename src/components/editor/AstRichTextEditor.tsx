import { useState, useCallback, useLayoutEffect } from "react";
import type { ASTNode } from "../../types/ast";
import { useCursorPosition } from "../../hooks/useCursorPosition";
import { useTextInput } from "../../hooks/useTextInput";
import { AstEditorToolbar } from "./AstEditorToolbar";
import { hasSelection } from "../../utils";
import "../../styles/editor.css";

// 渲染 AST 节点
function renderNode(node: ASTNode, key: number): React.ReactNode {
  if (node.type === "text") {
    // 如果有标记，使用 span 标签和 className
    if (node.marks && node.marks.length > 0) {
      const className = node.marks.join(' ');
      return (
        <span key={key} className={className}>
          {node.value}
        </span>
      );
    }

    // 没有标记，直接返回文本
    return node.value;
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
    pendingSelection,
    restoreCursorPosition,
    restoreSelection,
    checkActiveCommands,
    handleSelectionChange,
    handleClick,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing
  } = useCursorPosition(ast);

  // 更新 AST 并触发回调
  const updateAST = useCallback((newAST: ASTNode[]) => {
    isUpdatingFromState.current = true;
    setAst(newAST);
    onChange?.(newAST);
  }, [onChange, isUpdatingFromState]);

  // 使用 useLayoutEffect 在 DOM 更新后立即恢复光标位置或选区
  useLayoutEffect(() => {
    if (pendingSelection.current) {
      // 如果有待恢复的选区，恢复选区
      restoreSelection(pendingSelection.current);
      pendingSelection.current = null;
    } else if (pendingCursorPosition.current) {
      // 否则恢复光标位置
      restoreCursorPosition(pendingCursorPosition.current);
      pendingCursorPosition.current = null;
    }
    isUpdatingFromState.current = false;
    // 检查激活状态
    checkActiveCommands();
  }, [ast, restoreCursorPosition, restoreSelection, checkActiveCommands, pendingCursorPosition, pendingSelection, isUpdatingFromState]);

  // 使用文本输入处理 hook
  const { handleKeyDown } = useTextInput(
    ast,
    setCursorPosition,
    updateAST,
    pendingCursorPosition,
    selection,
    editorRef,
    isComposing
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
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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
        pendingCursorPosition={pendingCursorPosition}
        pendingSelection={pendingSelection}
      />

      <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        <p>光标位置: 偏移 {cursorPosition}</p>
        <p>选区: {hasSelection(selection) ? `从 ${selection.start} 到 ${selection.end}` : '无'}</p>
      </div>
    </div>
  );
}