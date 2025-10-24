import React, { useCallback } from "react";
import type { EditorCommand } from "../../types/editor";
import type { Selection } from "../../utils";
import { EditorToolbar } from "../toolbar/EditorToolbar";
import { useActiveCommands } from "../../hooks/useActiveCommands";
import type { ASTNode } from "../../types/ast";
import type { TextMethods } from "../../blocks/text";

interface AstEditorToolbarProps {
  ast: ASTNode[];
  selection: Selection;
  editorInstance: TextMethods | null;
}

export const AstEditorToolbar: React.FC<AstEditorToolbarProps> = ({
  ast,
  selection,
  editorInstance
}) => {
  // 使用 hook 管理激活状态
  const activeCommands = useActiveCommands(ast, selection);

  // 处理工具栏命令
  const handleToolbarCommand = useCallback((command: EditorCommand) => {
    if (!editorInstance) return;

    switch (command.type) {
      case 'bold':
        editorInstance.applyBold();
        break;
      case 'italic':
        editorInstance.applyItalic();
        break;
      case 'underline':
        editorInstance.applyUnderline();
        break;
      case 'strikethrough':
        editorInstance.applyStrikethrough();
        break;
    }
  }, [editorInstance]);

  return (
    <EditorToolbar
      onCommand={handleToolbarCommand}
      activeCommands={activeCommands}
    />
  );
};
