import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorCommand } from '../types/editor';
import { handleNestedFormat, cleanupHtml } from '../utils/formatUtils';

interface CursorPosition {
  offset: number;
  node: Node | null;
}

export const useEditor = (initialContent = '') => {
  const [content, setContentState] = useState(initialContent);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isUpdatingFromState = useRef(false);

  // 保存光标位置信息（包含文本偏移量）
  const saveCursorPosition = useCallback((container: HTMLElement): CursorPosition => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { offset: 0, node: null };
    }

    const range = selection.getRangeAt(0);
    const containerNode = range.startContainer;

    // 计算在容器中的文本偏移量
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let textOffset = 0;
    let found = false;

    while (walker.nextNode() && !found) {
      const node = walker.currentNode;
      if (node === containerNode) {
        textOffset += range.startOffset;
        found = true;
      } else {
        textOffset += node.textContent?.length || 0;
      }
    }

    return { offset: textOffset, node: containerNode };
  }, []);

  // 恢复光标位置
  const restoreCursorPosition = useCallback((
    container: HTMLElement,
    savedPosition: CursorPosition
  ): void => {
    if (savedPosition.offset < 0) return;

    try {
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentOffset = 0;
      let targetNode = null;
      let targetOffset = 0;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent?.length || 0;

        if (currentOffset + nodeLength >= savedPosition.offset) {
          targetNode = node;
          targetOffset = savedPosition.offset - currentOffset;
          break;
        }
        currentOffset += nodeLength;
      }

      if (targetNode) {
        const newRange = document.createRange();
        newRange.setStart(targetNode, targetOffset);
        newRange.setEnd(targetNode, targetOffset);

        const newSelection = window.getSelection();
        newSelection?.removeAllRanges();
        newSelection?.addRange(newRange);

        // 确保容器获得焦点
        container.focus();
      }
    } catch (error) {
      console.error('恢复光标位置失败:', error);
    }
  }, []);

  // 安全地更新编辑器内容并保持光标位置
  const updateEditorContent = useCallback((newContent: string): void => {
    const container = editorRef.current;
    if (!container || container.innerHTML === newContent) return;

    // 标记正在从状态更新
    isUpdatingFromState.current = true;

    // 保存当前光标位置
    const savedPosition = saveCursorPosition(container);

    // 更新内容
    container.innerHTML = newContent;

    // 恢复光标位置
    setTimeout(() => {
      restoreCursorPosition(container, savedPosition);
      isUpdatingFromState.current = false;
    }, 0);
  }, [saveCursorPosition, restoreCursorPosition]);

  // 处理编辑器内容变化
  const handleInput = useCallback((event: React.ChangeEvent<HTMLDivElement>) => {
    // 防止在状态更新期间触发循环
    if (isUpdatingFromState.current) return;

    setContentState(event.target.innerHTML);
  }, []);

  // 外部更新内容
  const updateContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  // 执行编辑器命令
  const executeCommand = useCallback((command: EditorCommand) => {
    const container = editorRef.current;
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText) return;

    // 计算选区的文本偏移量
    const startOffset = getTextOffsetFromRange(container, range, true);
    const endOffset = getTextOffsetFromRange(container, range, false);

    // 使用 formatUtils 处理格式化
    const formatType = command.type as 'bold' | 'italic' | 'underline';
    const formattedHtml = handleNestedFormat(
      container,
      startOffset,
      endOffset,
      formatType
    );

    // 替换选中的内容
    range.deleteContents();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedHtml;

    while (tempDiv.firstChild) {
      range.insertNode(tempDiv.firstChild);
    }

    // 清理整个编辑器的HTML结构
    const cleanedHtml = cleanupHtml(container.innerHTML);

    // 保存当前光标位置信息
    const cursorInfo = {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    };

    container.innerHTML = cleanedHtml;

    // 恢复光标位置
    const newRange = document.createRange();
    try {
      // 尝试恢复光标位置（如果节点仍然存在）
      newRange.setStart(cursorInfo.startContainer, cursorInfo.startOffset);
      newRange.setEnd(cursorInfo.endContainer, cursorInfo.endOffset);
    } catch {
      // 如果恢复失败，将光标放在内容末尾
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );
      let lastTextNode = null;
      while (walker.nextNode()) {
        lastTextNode = walker.currentNode;
      }
      if (lastTextNode) {
        newRange.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
        newRange.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
      }
    }

    selection.removeAllRanges();
    selection.addRange(newRange);

    // 更新状态
    setContentState(cleanedHtml);
  }, []);

  // 辅助函数：从 Range 获取文本偏移量
  const getTextOffsetFromRange = useCallback((
    container: HTMLElement,
    range: Range,
    isStart: boolean
  ): number => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let textOffset = 0;
    const targetNode = isStart ? range.startContainer : range.endContainer;
    const targetOffset = isStart ? range.startOffset : range.endOffset;

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node === targetNode) {
        return textOffset + targetOffset;
      }

      textOffset += node.textContent?.length || 0;
    }

    return textOffset;
  }, []);

  // 设置编辑器引用
  const setEditorRef = useCallback((element: HTMLDivElement | null) => {
    editorRef.current = element;
  }, []);

  // 当状态变化时同步到 DOM
  useEffect(() => {
    if (content !== undefined) {
      updateEditorContent(content);
    }
  }, [content, updateEditorContent]);

  return {
    editorState: {
      content,
    },
    handleInput,
    updateContent,
    executeCommand,
    setEditorRef,
  };
}; 