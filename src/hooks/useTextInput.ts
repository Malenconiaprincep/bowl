import { useCallback } from "react";
import type { ASTNode } from "../types/ast";
import type { CursorPosition, Selection } from "../utils/astUtils";
import { insertTextAtSelection, deleteSelection } from "../utils/astUtils";

export function useTextInput(
  ast: ASTNode[],
  setCursorPosition: (position: CursorPosition) => void,
  onUpdateAST: (newAST: ASTNode[]) => void,
  pendingCursorPosition: React.MutableRefObject<CursorPosition | null>,
  selection: Selection
) {
  // 处理文本输入
  const handleTextInput = useCallback((text: string) => {
    const { newAST, newCursorPosition } = insertTextAtSelection(ast, selection, text);

    // 设置待恢复的光标位置
    pendingCursorPosition.current = newCursorPosition;
    setCursorPosition(newCursorPosition);

    onUpdateAST(newAST);
  }, [ast, selection, setCursorPosition, onUpdateAST, pendingCursorPosition]);

  // 处理删除操作
  const handleDelete = useCallback(() => {
    const { newAST, newCursorPosition } = deleteSelection(ast, selection);

    // 设置待恢复的光标位置
    pendingCursorPosition.current = newCursorPosition;
    setCursorPosition(newCursorPosition);

    onUpdateAST(newAST);
  }, [ast, selection, setCursorPosition, onUpdateAST, pendingCursorPosition]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 处理特殊键
    if (e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      handleDelete();
      return;
    }

    // 处理快捷键
    if (e.ctrlKey) {
      e.preventDefault();
      switch (e.key) {
        case 'b':
          // 这里可以触发格式化命令
          break;
        case 'i':
          // 这里可以触发格式化命令
          break;
        case 'u':
          // 这里可以触发格式化命令
          break;
        case 's':
          // 这里可以触发格式化命令
          break;
      }
    }

    // 处理普通字符输入
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleTextInput(e.key);
    }
  }, [handleTextInput, handleDelete]);

  return {
    handleTextInput,
    handleDelete,
    handleKeyDown
  };
}
