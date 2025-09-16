import React, { useCallback } from "react";
import type { EditorCommand } from "../../types/editor";
import type { Mark, Selection, CursorPosition } from "../../utils";
import { EditorToolbar } from "../toolbar/EditorToolbar";
import { applyFormatToSelection, getTextNodes } from "../../utils";
import type { ASTNode } from "../../types/ast";

interface AstEditorToolbarProps {
  ast: ASTNode[];
  selection: Selection;
  cursorPosition: CursorPosition;
  activeCommands: string[];
  onUpdateAST: (newAST: ASTNode[]) => void;
}

export const AstEditorToolbar: React.FC<AstEditorToolbarProps> = ({
  ast,
  selection,
  cursorPosition,
  activeCommands,
  onUpdateAST
}) => {
  // 执行格式化命令
  const executeCommand = useCallback((mark: Mark) => {
    if (selection.hasSelection) {
      // 对选区应用格式化
      const newAST = applyFormatToSelection(ast, selection, mark);
      onUpdateAST(newAST);
    } else {
      // 对当前光标位置应用格式化（简化版）
      const newAST = JSON.parse(JSON.stringify(ast));
      const textNodes = getTextNodes(newAST);
      const targetNode = textNodes[cursorPosition.nodeIndex];

      if (targetNode) {
        if (!targetNode.marks) targetNode.marks = [];
        if (!targetNode.marks.includes(mark)) {
          targetNode.marks.push(mark);
        }
        onUpdateAST(newAST);
      }
    }
  }, [ast, selection, cursorPosition, onUpdateAST]);

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
