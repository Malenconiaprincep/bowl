import React, { useCallback } from "react";
import type { EditorCommand } from "../../types/editor";
import type { Mark, Selection } from "../../utils";
import { EditorToolbar } from "../toolbar/EditorToolbar";
import { applyFormatToSelection, getTextNodes, findNodeAndOffsetBySelectionOffset } from "../../utils";
import type { ASTNode } from "../../types/ast";

interface AstEditorToolbarProps {
  ast: ASTNode[];
  selection: Selection;
  cursorPosition: number;
  activeCommands: string[];
  onUpdateAST: (newAST: ASTNode[]) => void;
  pendingCursorPosition: React.MutableRefObject<number | null>;
  pendingSelection: React.MutableRefObject<Selection | null>;
}

export const AstEditorToolbar: React.FC<AstEditorToolbarProps> = ({
  ast,
  selection,
  cursorPosition,
  activeCommands,
  onUpdateAST,
  pendingCursorPosition,
  pendingSelection
}) => {
  // 执行格式化命令
  const executeCommand = useCallback((mark: Mark) => {
    if (selection.hasSelection) {
      // 对选区应用格式化
      // 保存当前选区，以便在 AST 更新后恢复
      pendingSelection.current = { ...selection };
      const newAST = applyFormatToSelection(ast, selection, mark);
      onUpdateAST(newAST);
    } else {
      // 对当前光标位置应用格式化（简化版）
      // 保存当前光标位置，以便在 AST 更新后恢复
      pendingCursorPosition.current = cursorPosition;
      const newAST = JSON.parse(JSON.stringify(ast));
      const textNodes = getTextNodes(newAST);
      const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, cursorPosition);
      const targetNode = textNodes[nodeIndex];

      if (targetNode) {
        if (!targetNode.marks) targetNode.marks = [];
        if (!targetNode.marks.includes(mark)) {
          targetNode.marks.push(mark);
        } else {
          // 如果已有该格式，则移除（切换格式）
          targetNode.marks = targetNode.marks.filter(m => m !== mark);
        }
        onUpdateAST(newAST);
      }
    }
  }, [ast, selection, cursorPosition, onUpdateAST, pendingCursorPosition, pendingSelection]);

  // 处理工具栏命令
  const handleToolbarCommand = useCallback((command: EditorCommand) => {
    switch (command.type) {
      case 'bold':
        executeCommand('b');
        break;
      case 'italic':
        executeCommand('i');
        break;
      case 'underline':
        executeCommand('u');
        break;
      case 'strikethrough':
        executeCommand('s');
        break;
    }
  }, [executeCommand]);

  return (
    <EditorToolbar
      onCommand={handleToolbarCommand}
      activeCommands={activeCommands}
    />
  );
};
