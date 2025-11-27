import { useState, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from "react";
import type { ASTNode } from "../../types/ast";
import type { Block } from "../../types/blocks";
import type { BlockComponentMethods } from "../../types/blockComponent";
import { useCursorPosition } from "../../hooks/useCursorPosition";
import { useTextInput } from "../../hooks/useTextInput";
import { applyFormatToSelection, getTextNodes, findNodeAndOffsetBySelectionOffset, hasSelection } from "../../utils";
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
  blockId?: string;
  initialAST: ASTNode[];
  onChange?: (ast: ASTNode[]) => void;
  blockIndex?: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onDeleteBlock?: (blockIndex: number) => void;
  onFindPreviousTextBlock?: (currentIndex: number) => number;
  onFocusBlockAtEnd?: (blockIndex: number) => void;
  onMergeWithPreviousBlock?: (currentIndex: number, currentContent: ASTNode[]) => void;
}>(({
  initialAST,
  onChange,
  blockIndex,
  onInsertBlock,
  onDeleteBlock,
  onFindPreviousTextBlock,
  onFocusBlockAtEnd,
  onMergeWithPreviousBlock
}, ref) => {
  const [ast, setAst] = useState<ASTNode[]>(initialAST);

  // 当initialAST变化时，更新本地状态
  const initialASTString = JSON.stringify(initialAST);
  useLayoutEffect(() => {
    setAst(initialAST);
  }, [initialAST, initialASTString]);

  // 使用光标位置管理 hook
  const {
    selection,
    setSelection,
    editorRef,
    isUpdatingFromState,
    pendingSelection,
    restoreCursorPosition,
    restoreSelection,
    handleSelectionChange,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing,
    compositionKey
  } = useCursorPosition(ast);

  // 更新 AST 并触发回调
  const updateAST = useCallback((newAST: ASTNode[]) => {
    isUpdatingFromState.current = true;
    setAst(newAST);
    onChange?.(newAST);
  }, [onChange, isUpdatingFromState]);

  // 格式化方法
  const applyFormat = useCallback((mark: 'b' | 'i' | 'u' | 's') => {
    if (hasSelection(selection)) {
      // 对选区应用格式化
      pendingSelection.current = { ...selection };
      const newAST = applyFormatToSelection(ast, selection, mark);
      updateAST(newAST);
    } else {
      // 对当前光标位置应用格式化
      pendingSelection.current = { ...selection };
      const newAST = JSON.parse(JSON.stringify(ast));
      const textNodes = getTextNodes(newAST);
      const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, selection.start);
      const targetNode = textNodes[nodeIndex];

      if (targetNode) {
        if (!targetNode.marks) targetNode.marks = [];
        if (!targetNode.marks.includes(mark)) {
          targetNode.marks.push(mark);
        } else {
          // 如果已有该格式，则移除（切换格式）
          targetNode.marks = targetNode.marks.filter(m => m !== mark);
        }
        updateAST(newAST);
      }
    }
  }, [ast, selection, updateAST, pendingSelection]);

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
    },
    setSelection: (selection: { start: number; end: number }) => {
      // 先更新状态
      setSelection(selection);
      // 然后立即应用到 DOM
      if (selection.start === selection.end) {
        // 如果是光标位置，使用 restoreCursorPosition
        restoreCursorPosition(selection);
      } else {
        // 如果是选区，使用 restoreSelection
        restoreSelection(selection);
      }
    },
    // 格式化方法
    applyBold: () => applyFormat('b'),
    applyItalic: () => applyFormat('i'),
    applyUnderline: () => applyFormat('u'),
    applyStrikethrough: () => applyFormat('s')
  }));

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
  }, [ast, restoreCursorPosition, restoreSelection, pendingSelection, isUpdatingFromState]);

  // 当 compositionKey 变化时（组合输入结束，DOM 重建），恢复光标位置并聚焦
  useLayoutEffect(() => {
    if (compositionKey > 0) {
      // 先聚焦编辑器
      editorRef.current?.focus();
      // 然后恢复光标位置
      if (selection.start === selection.end) {
        restoreCursorPosition(selection);
      } else {
        restoreSelection(selection);
      }
    }
  }, [compositionKey, selection, restoreCursorPosition, restoreSelection, editorRef]);

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
    onInsertBlock,
    onDeleteBlock,
    onFindPreviousTextBlock,
    onFocusBlockAtEnd,
    onMergeWithPreviousBlock
  );

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        // 只在组合输入结束时改变 key，强制重建 DOM
        // 这样可以避免 React diff 与浏览器修改的 DOM 产生冲突，同时不影响普通输入的性能
        key={compositionKey}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className="editor-content"
      >
        {ast.map((node, idx) => renderNode(node, idx))}
      </div>
      {/* 
      <AstEditorToolbar
        ast={ast}
        selection={selection}
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