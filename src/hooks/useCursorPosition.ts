import { useState, useRef, useCallback } from "react";
import type { ASTNode } from "../types/ast";
import type { Selection } from "../utils";
import { findSelectionOffsetFromDOM, getTextNodes, findNodeAndOffsetBySelectionOffset } from "../utils";

export function useCursorPosition(ast: ASTNode[]) {
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [selection, setSelection] = useState<Selection>({
    start: 0,
    end: 0,
    hasSelection: false
  });
  const [activeCommands, setActiveCommands] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromState = useRef(false);
  const pendingCursorPosition = useRef<number | null>(null);

  // 恢复光标位置
  const restoreCursorPosition = useCallback((position: number) => {
    if (!editorRef.current) return;

    const textNodes = getTextNodes(ast);
    const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, position);
    const targetNode = textNodes[nodeIndex];

    if (targetNode) {
      // 找到对应的 DOM 文本节点
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentIndex = 0;
      let targetTextNode = null;

      while (walker.nextNode()) {
        if (currentIndex === nodeIndex) {
          targetTextNode = walker.currentNode;
          break;
        }
        currentIndex++;
      }

      if (targetTextNode) {
        const range = document.createRange();
        const offset = Math.min(textOffset, targetTextNode.textContent?.length || 0);
        range.setStart(targetTextNode, offset);
        range.setEnd(targetTextNode, offset);

        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [ast]);

  // 检查当前光标位置的激活状态
  const checkActiveCommands = useCallback(() => {
    const textNodes = getTextNodes(ast);
    const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, cursorPosition);
    const currentTextNode = textNodes[nodeIndex];

    if (currentTextNode && currentTextNode.marks) {
      setActiveCommands(currentTextNode.marks);
    } else {
      setActiveCommands([]);
    }
  }, [ast, cursorPosition]);

  // 处理选区变化
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current || isUpdatingFromState.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const hasSelection = !range.collapsed;

    if (hasSelection) {
      // 计算选区的开始和结束位置
      const startPosition = findSelectionOffsetFromDOM(editorRef.current, ast, range.startContainer, range.startOffset);
      const endPosition = findSelectionOffsetFromDOM(editorRef.current, ast, range.endContainer, range.endOffset);

      console.log('选区信息:', {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        startPosition,
        endPosition
      });

      setSelection({
        start: startPosition,
        end: endPosition,
        hasSelection: true
      });
    } else {
      // 计算光标位置
      const cursorPos = findSelectionOffsetFromDOM(editorRef.current, ast, range.startContainer, range.startOffset);

      console.log('光标信息:', {
        container: range.startContainer,
        offset: range.startOffset,
        textContent: range.startContainer.textContent,
        cursorPos
      });

      // 更新光标位置和选区信息，确保它们同步
      setCursorPosition(cursorPos);
      setSelection({
        start: cursorPos,
        end: cursorPos,
        hasSelection: false
      });

      // 检查激活状态
      setTimeout(() => {
        const textNodes = getTextNodes(ast);
        const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, cursorPos);
        const currentTextNode = textNodes[nodeIndex];

        if (currentTextNode && currentTextNode.marks) {
          setActiveCommands(currentTextNode.marks);
        } else {
          setActiveCommands([]);
        }
      }, 0);
    }
  }, [ast]);

  // 处理点击事件
  const handleClick = useCallback(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  return {
    cursorPosition,
    setCursorPosition,
    selection,
    setSelection,
    activeCommands,
    setActiveCommands,
    editorRef,
    isUpdatingFromState,
    pendingCursorPosition,
    restoreCursorPosition,
    checkActiveCommands,
    handleSelectionChange,
    handleClick
  };
}
