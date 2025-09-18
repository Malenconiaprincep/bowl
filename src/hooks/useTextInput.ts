import { useCallback, useEffect } from "react";
import type { ASTNode } from "../types/ast";
import type { Selection } from "../utils";
import { insertTextAtSelection, deleteSelection } from "../utils";

export function useTextInput(
  ast: ASTNode[],
  setCursorPosition: (position: number) => void,
  onUpdateAST: (newAST: ASTNode[]) => void,
  pendingCursorPosition: React.MutableRefObject<number | null>,
  selection: Selection,
  editorRef: React.RefObject<HTMLDivElement | null>
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

  // 使用原生事件监听器处理 beforeInput
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleBeforeInput = (e: Event) => {
      const inputEvent = e as InputEvent;

      console.log('原生 beforeInput 事件:', {
        inputType: inputEvent.inputType,
        data: inputEvent.data,
        isComposing: inputEvent.isComposing
      });

      // 处理插入文本 - 只在非组合状态下处理 insertText
      if (inputEvent.inputType === 'insertText' && !inputEvent.isComposing) {
        e.preventDefault();
        const text = inputEvent.data || '';
        if (text) {
          handleTextInput(text);
        }
        return;
      }

      // 忽略组合输入过程中的事件，只在最终确认时处理
      if (inputEvent.isComposing) {
        // 不处理组合过程中的事件，让浏览器自然处理
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
    };

    // 处理组合输入结束事件
    const handleCompositionEnd = (e: CompositionEvent) => {
      console.log('组合输入结束:', {
        data: e.data,
        type: e.type
      });

      // 当组合输入结束时，将最终文本添加到我们的 AST 中
      if (e.data) {
        handleTextInput(e.data);
      }
    };

    editor.addEventListener('beforeinput', handleBeforeInput);
    editor.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      editor.removeEventListener('beforeinput', handleBeforeInput);
      editor.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [editorRef, handleTextInput, handleDelete]);

  // 处理键盘事件（保留用于快捷键）
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 禁用 Enter 键换行
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    // 只处理我们自定义的格式化快捷键，让系统默认快捷键正常工作
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          // 这里可以触发格式化命令
          e.preventDefault();
          break;
        case 'i':
          // 这里可以触发格式化命令
          e.preventDefault();
          break;
        case 'u':
          // 这里可以触发格式化命令
          e.preventDefault();
          break;
        case 's':
          // 这里可以触发格式化命令
          e.preventDefault();
          break;
        // 不处理 c, v, a, x, z 等系统默认快捷键，让浏览器自然处理
        default:
          // 让其他快捷键正常工作
          break;
      }
    }
  }, []);

  return {
    handleTextInput,
    handleDelete,
    handleKeyDown
  };
}
