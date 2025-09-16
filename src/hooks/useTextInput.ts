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

  // 处理 beforeInput 事件
  const handleBeforeInput = useCallback((e: React.FormEvent) => {
    const inputEvent = e.nativeEvent as InputEvent;

    // 处理插入文本
    if (inputEvent.inputType === 'insertText' || inputEvent.inputType === 'insertCompositionText') {
      e.preventDefault();
      const text = inputEvent.data || '';
      if (text) {
        handleTextInput(text);
      }
      return;
    }

    // 处理删除操作
    if (inputEvent.inputType === 'deleteContentBackward') {
      e.preventDefault();
      handleDelete();
      return;
    }

    if (inputEvent.inputType === 'deleteContentForward') {
      e.preventDefault();
      handleDelete();
      return;
    }

    // 处理其他输入类型（如粘贴等）
    if (inputEvent.inputType === 'insertFromPaste') {
      e.preventDefault();
      const text = inputEvent.dataTransfer?.getData('text/plain') || '';
      if (text) {
        handleTextInput(text);
      }
      return;
    }
  }, [handleTextInput, handleDelete]);

  // 处理键盘事件（保留用于快捷键）
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 处理快捷键
    if (e.ctrlKey || e.metaKey) {
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
  }, []);

  return {
    handleTextInput,
    handleDelete,
    handleBeforeInput,
    handleKeyDown
  };
}
