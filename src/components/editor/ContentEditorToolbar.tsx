import React, { useCallback } from "react";
import type { EditorCommand } from "../../types/editor";
import type { Selection } from "../../utils";
import { EditorToolbar } from "../toolbar/EditorToolbar";
import { useActiveCommands } from "../../hooks/useActiveCommands";
import type { ContentNode } from "../../types/ast";
import type { TextMethods } from "../../blocks/text";

interface ContentEditorToolbarProps {
  content: ContentNode[];  // 保持 ast 属性名以兼容现有代码
  selection: Selection;
  editorInstance: TextMethods | null;
}

export const ContentEditorToolbar: React.FC<ContentEditorToolbarProps> = ({
  content,
  selection,
  editorInstance
}) => {
  // 使用 hook 管理激活状态
  const activeCommands = useActiveCommands(content, selection);

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

// 保持向后兼容
export const AstEditorToolbar = ContentEditorToolbar;

