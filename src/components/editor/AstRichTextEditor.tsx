import { useState, useRef, useCallback } from "react";
import type { ASTNode, Mark, TextNode } from "../../types/ast";

// 光标位置信息
interface CursorPosition {
  nodeIndex: number;  // 在文本节点列表中的索引
  textOffset: number; // 在文本节点中的字符偏移
  isAtEnd: boolean;   // 是否在节点末尾
}

// 选区信息
interface Selection {
  start: CursorPosition;
  end: CursorPosition;
  hasSelection: boolean;
}

// DOM 节点到文本节点的映射
interface NodeMapping {
  domNode: Node;
  textNodeIndex: number;
  textOffset: number;
}

// 渲染 AST 节点
function renderNode(node: ASTNode, key: number): React.ReactNode {
  if (node.type === "text") {
    let content: React.ReactNode = node.value;

    // 应用标记
    if (node.marks && node.marks.length > 0) {
      node.marks.forEach(mark => {
        switch (mark) {
          case "b":
            content = <b key={mark}>{content}</b>;
            break;
          case "i":
            content = <i key={mark}>{content}</i>;
            break;
          case "u":
            content = <u key={mark}>{content}</u>;
            break;
          case "s":
            content = <s key={mark}>{content}</s>;
            break;
        }
      });
    }

    return content;
  }

  if (node.type === "element") {
    const Tag = node.tag;
    return (
      <Tag key={key}>
        {node.children.map((child, idx) => renderNode(child, idx))}
      </Tag>
    );
  }

  return null;
}

// 获取 AST 中的文本节点列表
function getTextNodes(ast: ASTNode[]): TextNode[] {
  const textNodes: TextNode[] = [];

  function traverse(nodes: ASTNode[]) {
    nodes.forEach(node => {
      if (node.type === "text") {
        textNodes.push(node);
      } else if (node.type === "element") {
        traverse(node.children);
      }
    });
  }

  traverse(ast);
  return textNodes;
}

// 建立 DOM 节点到文本节点的映射
function buildNodeMapping(container: HTMLElement, ast: ASTNode[]): NodeMapping[] {
  const mappings: NodeMapping[] = [];
  const textNodes = getTextNodes(ast);
  let textNodeIndex = 0;

  function traverseDOM(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (textNodeIndex < textNodes.length) {
        mappings.push({
          domNode: node,
          textNodeIndex: textNodeIndex,
          textOffset: 0 // 在文本节点内部，偏移量从0开始
        });
        textNodeIndex++;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(child => {
        traverseDOM(child);
      });
    }
  }

  Array.from(container.childNodes).forEach(child => {
    traverseDOM(child);
  });

  return mappings;
}

// 根据 DOM 位置找到对应的文本节点索引
function findTextNodeIndex(container: HTMLElement, ast: ASTNode[], domNode: Node, offset: number): CursorPosition {
  const mappings = buildNodeMapping(container, ast);

  for (const mapping of mappings) {
    if (mapping.domNode === domNode) {
      return {
        nodeIndex: mapping.textNodeIndex,
        textOffset: offset, // 使用 DOM 中的实际偏移量
        isAtEnd: offset >= (mapping.domNode.textContent?.length || 0)
      };
    }
  }

  // 如果没找到，返回第一个文本节点
  return {
    nodeIndex: 0,
    textOffset: 0,
    isAtEnd: false
  };
}


// 在指定位置插入文本
function insertTextAtPosition(ast: ASTNode[], position: CursorPosition, text: string): ASTNode[] {
  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);
  const targetNode = textNodes[position.nodeIndex];

  if (targetNode) {
    const before = targetNode.value.slice(0, position.textOffset);
    const after = targetNode.value.slice(position.textOffset);
    targetNode.value = before + text + after;
  }

  return newAst;
}

// 在指定位置删除文本
function deleteTextAtPosition(ast: ASTNode[], position: CursorPosition, length: number = 1): ASTNode[] {
  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);
  const targetNode = textNodes[position.nodeIndex];

  if (targetNode) {
    const before = targetNode.value.slice(0, position.textOffset);
    const after = targetNode.value.slice(position.textOffset + length);
    targetNode.value = before + after;
  }

  return newAst;
}

// 应用格式化到选区
function applyFormatToSelection(ast: ASTNode[], selection: Selection, mark: Mark): ASTNode[] {
  if (!selection.hasSelection) return ast;

  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);

  const startNode = textNodes[selection.start.nodeIndex];
  const endNode = textNodes[selection.end.nodeIndex];

  if (startNode && endNode) {
    // 简化版：只处理单个文本节点的情况
    if (selection.start.nodeIndex === selection.end.nodeIndex) {
      if (!startNode.marks) startNode.marks = [];
      if (!startNode.marks.includes(mark)) {
        startNode.marks.push(mark);
      }
    }
  }

  return newAst;
}



export default function ASTEditor({
  initialAST,
  onChange
}: {
  initialAST: ASTNode[];
  onChange?: (ast: ASTNode[]) => void;
}) {
  const [ast, setAst] = useState<ASTNode[]>(initialAST);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ nodeIndex: 0, textOffset: 0, isAtEnd: false });
  const [selection, setSelection] = useState<Selection>({
    start: { nodeIndex: 0, textOffset: 0, isAtEnd: false },
    end: { nodeIndex: 0, textOffset: 0, isAtEnd: false },
    hasSelection: false
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromState = useRef(false);
  const pendingCursorPosition = useRef<CursorPosition | null>(null);

  // 恢复光标位置
  const restoreCursorPosition = useCallback((position: CursorPosition) => {
    if (!editorRef.current) return;

    const textNodes = getTextNodes(ast);
    const targetNode = textNodes[position.nodeIndex];

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
        if (currentIndex === position.nodeIndex) {
          targetTextNode = walker.currentNode;
          break;
        }
        currentIndex++;
      }

      if (targetTextNode) {
        const range = document.createRange();
        const offset = Math.min(position.textOffset, targetTextNode.textContent?.length || 0);
        range.setStart(targetTextNode, offset);
        range.setEnd(targetTextNode, offset);

        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [ast]);

  // 更新 AST 并触发回调
  const updateAST = useCallback((newAST: ASTNode[]) => {
    isUpdatingFromState.current = true;
    setAst(newAST);
    onChange?.(newAST);

    // 延迟恢复光标位置
    setTimeout(() => {
      if (pendingCursorPosition.current) {
        restoreCursorPosition(pendingCursorPosition.current);
        pendingCursorPosition.current = null;
      }
      isUpdatingFromState.current = false;
    }, 0);
  }, [onChange, restoreCursorPosition]);

  // 处理文本输入
  const handleTextInput = useCallback((text: string) => {
    const newAST = insertTextAtPosition(ast, cursorPosition, text);

    // 保存新的光标位置
    const newCursorPosition = {
      ...cursorPosition,
      textOffset: cursorPosition.textOffset + text.length
    };

    // 设置待恢复的光标位置
    pendingCursorPosition.current = newCursorPosition;
    setCursorPosition(newCursorPosition);

    updateAST(newAST);
  }, [ast, cursorPosition, updateAST]);

  // 处理删除操作
  const handleDelete = useCallback((length: number = 1) => {
    const newAST = deleteTextAtPosition(ast, cursorPosition, length);
    updateAST(newAST);
  }, [ast, cursorPosition, updateAST]);

  // 处理选区变化
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current || isUpdatingFromState.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const hasSelection = !range.collapsed;

    if (hasSelection) {
      // 计算选区的开始和结束位置
      const startPosition = findTextNodeIndex(editorRef.current, ast, range.startContainer, range.startOffset);
      const endPosition = findTextNodeIndex(editorRef.current, ast, range.endContainer, range.endOffset);

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
      const cursorPos = findTextNodeIndex(editorRef.current, ast, range.startContainer, range.startOffset);

      console.log('光标信息:', {
        container: range.startContainer,
        offset: range.startOffset,
        textContent: range.startContainer.textContent,
        cursorPos
      });

      setSelection(prev => ({ ...prev, hasSelection: false }));
      setCursorPosition(cursorPos);
    }
  }, [ast]);

  // 执行格式化命令
  const executeCommand = useCallback((mark: Mark) => {
    if (selection.hasSelection) {
      // 对选区应用格式化
      const newAST = applyFormatToSelection(ast, selection, mark);
      updateAST(newAST);
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
        updateAST(newAST);
      }
    }
  }, [ast, selection, cursorPosition, updateAST]);

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
          executeCommand('b');
          break;
        case 'i':
          executeCommand('i');
          break;
        case 'u':
          executeCommand('u');
          break;
        case 's':
          executeCommand('s');
          break;
      }
    }

    // 处理普通字符输入
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleTextInput(e.key);
    }
  }, [handleTextInput, handleDelete, executeCommand]);

  // 处理点击事件
  const handleClick = useCallback(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleClick}
        style={{
          border: "1px solid #ccc",
          padding: 10,
          minHeight: 50,
          outline: 'none',
          whiteSpace: 'pre-wrap',
          cursor: 'text'
        }}
      >
        {ast.map((node, idx) => renderNode(node, idx))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
        <button onClick={() => executeCommand('b')}>Bold (Ctrl+B)</button>
        <button onClick={() => executeCommand('i')}>Italic (Ctrl+I)</button>
        <button onClick={() => executeCommand('u')}>Underline (Ctrl+U)</button>
        <button onClick={() => executeCommand('s')}>Strikethrough (Ctrl+S)</button>
      </div>
      <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        <p>光标位置: 节点 {cursorPosition.nodeIndex}, 偏移 {cursorPosition.textOffset}</p>
        <p>选区: {selection.hasSelection ? `从 ${selection.start.textOffset} 到 ${selection.end.textOffset}` : '无'}</p>
      </div>
    </div>
  );
}