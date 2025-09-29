import { useState, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from "react";
import type { ASTNode } from "../../types/ast";
import type { Block } from "../../types/blocks";
import type { BlockComponentMethods } from "../../types/blockComponent";
import { useCursorPosition } from "../../hooks/useCursorPosition";
import { useTextInput } from "../../hooks/useTextInput";
// import { AstEditorToolbar } from "./AstEditorToolbar";
// import { hasSelection } from "../../utils";
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

const ASTEditor = forwardRef<BlockComponentMethods, {
  initialAST: ASTNode[];
  onChange?: (ast: ASTNode[]) => void;
  blockIndex?: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
}>(({
  initialAST,
  onChange,
  blockIndex,
  onInsertBlock
}, ref) => {
  const [ast, setAst] = useState<ASTNode[]>(initialAST);

  // 暴露聚焦方法
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    blur: () => {
      if (editorRef.current) {
        editorRef.current.blur();
      }
    },
    getElement: () => {
      return editorRef.current;
    }
  }));

  // 使用光标位置管理 hook
  const {
    selection,
    setSelection,
    // activeCommands,
    editorRef,
    isUpdatingFromState,
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
      if (pendingSelection.current.start === pendingSelection.current.end) {
        // 如果是光标位置（start === end），使用 restoreCursorPosition
        restoreCursorPosition(pendingSelection.current);
      } else {
        // 如果是选区，使用 restoreSelection
        restoreSelection(pendingSelection.current);
      }
      pendingSelection.current = null;
    }
    isUpdatingFromState.current = false;
    // 检查激活状态
    checkActiveCommands();
  }, [ast, restoreCursorPosition, restoreSelection, checkActiveCommands, pendingSelection, isUpdatingFromState]);

  // 使用文本输入处理 hook
  const { handleKeyDown } = useTextInput(
    ast,
    setSelection,
    updateAST,
    pendingSelection,
    selection,
    editorRef,
    isComposing,
    blockIndex,
    onInsertBlock
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
        className="editor-content"
      >
        {ast.map((node, idx) => renderNode(node, idx))}
      </div>

      {/* <AstEditorToolbar
        ast={ast}
        selection={selection}
        activeCommands={activeCommands}
        onUpdateAST={updateAST}
        pendingSelection={pendingSelection}
      /> */}

      {/* <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        <p>光标位置: 偏移 {selection.start}</p>
        <p>选区: {hasSelection(selection) ? `从 ${selection.start} 到 ${selection.end}` : '无'}</p>
      </div> */}
    </div>
  );
});

ASTEditor.displayName = 'ASTEditor';

export default ASTEditor;