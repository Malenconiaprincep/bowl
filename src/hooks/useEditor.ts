import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorState, SelectionState, EditorCommand } from '../types/editor';

export const useEditor = (initialContent = '') => {
  const [editorState, setEditorState] = useState<EditorState>({
    content: initialContent,
  });

  const editorRef = useRef<HTMLDivElement>(null);
  // 使用 ref 存储选区状态，不会触发重新渲染
  const selectionRef = useRef<SelectionState>({
    start: 0,
    end: 0,
    collapsed: true
  });

  // 获取当前选区（更新 ref，不更新 state）
  const getSelection = useCallback((): SelectionState => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) {
      return { start: 0, end: 0, collapsed: true };
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const start = preCaretRange.toString().length;
    const end = start + range.toString().length;

    const newSelection = {
      start,
      end,
      collapsed: start === end
    };

    // 更新 ref，不更新 state
    selectionRef.current = newSelection;
    return newSelection;
  }, []);

  // 处理选区变化（只更新 ref）
  const handleSelectionChange = useCallback(() => {
    getSelection(); // 只更新 ref，不更新 state
  }, [getSelection]);

  // 监听选区变化
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // 执行命令时，只在需要时获取选区
  const executeCommand = useCallback((command: EditorCommand) => {
    switch (command.type) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'insertText':
        if (command.payload) {
          document.execCommand('insertText', false, command.payload);
        }
        break;
      case 'deleteContent':
        document.execCommand('delete', false);
        break;
    }

    // 只在执行命令后更新内容状态
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorState(prev => ({
        ...prev,
        content: newContent
        // 不更新 selection，因为它在 ref 中
      }));
    }
  }, []);

  // 处理编辑器内容变化
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorState(prev => ({
        ...prev,
        content: newContent,
      }));
    }
  }, [getSelection]);

  // 设置选区
  const setSelection = useCallback((start: number, end: number) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let currentPos = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentPos + nodeLength >= start) {
        startNode = node;
        startOffset = start - currentPos;
      }

      if (!endNode && currentPos + nodeLength >= end) {
        endNode = node;
        endOffset = end - currentPos;
        break;
      }

      currentPos += nodeLength;
    }

    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  return {
    editorRef,
    editorState,
    executeCommand,
    handleInput,
    getSelection,
    setSelection,
    // 提供获取当前选区的方法
    getCurrentSelection: () => selectionRef.current
  };
}; 