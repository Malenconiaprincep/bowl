import React, { useCallback, useEffect } from "react";
import type { ContentNode } from "../types/ast";
import type { Block } from "../types/blocks";
import type { Selection } from "../utils";
import { insertTextAtSelection, deleteSelection, splitTextAtCursor } from "../utils";
import { v4 as uuidv4 } from 'uuid';

// 检查内容是否为空（只有空的段落或没有文本内容）
function isEmptyContent(content: ContentNode[]): boolean {
  if (content.length === 0) return true;

  for (const node of content) {
    if (node.type === 'text' && node.value.trim() !== '') {
      return false;
    }
    if (node.type === 'element' && node.children) {
      for (const child of node.children) {
        if (child.type === 'text' && child.value.trim() !== '') {
          return false;
        }
      }
    }
  }

  return true;
}

export function useTextInput(
  content: ContentNode[],
  setSelection: (selection: Selection) => void,
  onUpdateContent: (newContent: ContentNode[]) => void,
  pendingSelection: React.MutableRefObject<Selection | null>,
  selection: Selection,
  editorRef: React.RefObject<HTMLDivElement | null>,
  isComposing: React.MutableRefObject<boolean>,
  blockIndex?: number,
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void,
  onDeleteBlock?: (blockIndex: number) => void,
  onFindPreviousTextBlock?: (currentIndex: number) => number,
  onFocusBlockAtEnd?: (blockIndex: number) => void,
  onMergeWithPreviousBlock?: (currentIndex: number, currentContent: ContentNode[]) => void
) {
  // 跟踪是否已经变空的状态
  const wasEmpty = React.useRef<boolean>(false);
  // 处理文本输入
  const handleTextInput = useCallback((text: string) => {
    const { newContent, newCursorPosition } = insertTextAtSelection(content, selection, text);

    // 更新wasEmpty状态
    wasEmpty.current = isEmptyContent(newContent);

    // 设置待恢复的光标位置
    const newSelection = { start: newCursorPosition, end: newCursorPosition };
    pendingSelection.current = newSelection;
    setSelection(newSelection);

    onUpdateContent(newContent);
  }, [content, selection, setSelection, onUpdateContent, pendingSelection]);

  // 创建空的段落结构
  const createEmptyParagraph = useCallback((): ContentNode[] => {
    return [{
      type: "element",
      tag: "p",
      children: [{ type: "text", value: "" }]
    }];
  }, []);

  // 处理删除操作
  const handleDelete = useCallback(() => {
    // 检查是否有选区
    const hasSelectionRange = selection.start !== selection.end;

    // 检查光标是否在开头位置（光标位置为0且没有选区）
    // 只有在没有选区且光标在开头时，才触发合并逻辑
    if (!hasSelectionRange && selection.start === 0 && blockIndex !== undefined && onMergeWithPreviousBlock) {
      // 查找上一个textBlock
      const previousTextBlockIndex = onFindPreviousTextBlock?.(blockIndex);

      if (previousTextBlockIndex !== -1) {
        // 合并当前block到上一个textBlock
        onMergeWithPreviousBlock(blockIndex, content);
        return;
      }
    }

    const { newContent, newCursorPosition } = deleteSelection(content, selection);

    // 检查是否已经变空且删除后仍然为空内容
    if (wasEmpty.current && isEmptyContent(newContent) && blockIndex !== undefined && onDeleteBlock && onFindPreviousTextBlock && onFocusBlockAtEnd) {
      // 查找上一个textBlock
      const previousTextBlockIndex = onFindPreviousTextBlock(blockIndex);

      if (previousTextBlockIndex !== -1) {
        // 删除当前block
        onDeleteBlock(blockIndex);

        // 聚焦到上一个textBlock的末尾
        onFocusBlockAtEnd(previousTextBlockIndex);
        return;
      }
    }

    // 如果内容变空，保留空的段落结构
    if (isEmptyContent(newContent)) {
      const emptyParagraph = createEmptyParagraph();
      wasEmpty.current = true;

      // 设置待恢复的光标位置
      const newSelection = { start: 0, end: 0 };
      pendingSelection.current = newSelection;
      setSelection(newSelection);

      onUpdateContent(emptyParagraph);
      return;
    }

    // 更新wasEmpty状态
    wasEmpty.current = isEmptyContent(newContent);

    // 设置待恢复的光标位置
    const newSelection = { start: newCursorPosition, end: newCursorPosition };
    pendingSelection.current = newSelection;
    setSelection(newSelection);

    onUpdateContent(newContent);
  }, [content, selection, setSelection, onUpdateContent, pendingSelection, blockIndex, onDeleteBlock, onFindPreviousTextBlock, onFocusBlockAtEnd, onMergeWithPreviousBlock, createEmptyParagraph]);

  // 使用原生事件监听器处理 beforeInput
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleBeforeInput = (e: Event) => {
      const inputEvent = e as InputEvent;

      // 如果正在组合输入，跳过所有处理
      if (isComposing.current || inputEvent.isComposing) {
        return;
      }

      // 处理插入文本 - 只在非组合状态下处理 insertText
      if (inputEvent.inputType === 'insertText') {
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

      if (inputEvent.inputType === 'insertParagraph') {
        e.preventDefault();

        // 回车后进行数据拆分
        const { beforeContent, afterContent, newCursorPosition } = splitTextAtCursor(content, selection);

        // 更新当前块的内容（前面的部分）
        onUpdateContent(beforeContent);

        // 设置新的光标位置
        const newSelection = { start: newCursorPosition, end: newCursorPosition };
        pendingSelection.current = newSelection;
        setSelection(newSelection);

        // 将afterContent插入到PageBlock的新位置
        if (blockIndex !== undefined && onInsertBlock) {
          let contentToInsert: ContentNode[];

          if (afterContent.length > 0) {
            // 检查afterContent是否已经有段落结构
            const hasParagraph = afterContent.some(node => node.type === 'element' && node.tag === 'p');
            if (hasParagraph) {
              contentToInsert = afterContent;
            } else {
              // 如果没有段落结构，包装在段落中
              contentToInsert = [{
                type: "element" as const,
                tag: "p" as const,
                children: afterContent
              }];
            }
          } else {
            // 如果afterContent为空，创建一个包含空P标签的段落
            contentToInsert = [{
              type: "element" as const,
              tag: "p" as const,
              children: [{ type: "text" as const, value: "" }]
            }];
          }

          const newBlock: Block = {
            type: "paragraph",
            content: contentToInsert,
            id: uuidv4()
          };
          onInsertBlock(blockIndex, newBlock);
        }

        return;
      }
    };

    // 处理组合输入结束事件
    const handleCompositionEnd = (e: CompositionEvent) => {
      // 标记组合输入结束
      isComposing.current = false;

      handleTextInput(e.data)
    };

    // 处理组合输入开始事件
    const handleCompositionStart = () => {
      isComposing.current = true;
    };

    editor.addEventListener('beforeinput', handleBeforeInput);
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      editor.removeEventListener('beforeinput', handleBeforeInput);
      editor.removeEventListener('compositionstart', handleCompositionStart);
      editor.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [editorRef, handleTextInput, handleDelete, isComposing, content, onUpdateContent, pendingSelection, selection, setSelection, blockIndex, onInsertBlock, onDeleteBlock, onFindPreviousTextBlock, onFocusBlockAtEnd, onMergeWithPreviousBlock]);

  // 处理键盘事件（保留用于快捷键）
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
