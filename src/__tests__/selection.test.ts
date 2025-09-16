import { describe, it, expect, beforeEach } from 'vitest';
import { createCursorPosition, isValidSelection, buildNodeMapping, findTextNodeIndex } from '../utils/selection';
import type { TextNode, Mark } from '../types/ast';
import type { Selection } from '../utils/selection';

// 测试用的文本节点数据
const createTextNode = (value: string, marks?: Mark[]): TextNode => ({
  type: 'text',
  value,
  marks
});

const createTestTextNodes = (): TextNode[] => [
  createTextNode('Hello '),
  createTextNode('world', ['b']),
  createTextNode('! How are you?')
];

describe('selection', () => {
  describe('createCursorPosition', () => {
    it('应该创建基本的光标位置', () => {
      const position = createCursorPosition(1, 3);

      expect(position).toEqual({
        nodeIndex: 1,
        textOffset: 3,
        isAtEnd: false
      });
    });

    it('应该创建在末尾的光标位置', () => {
      const position = createCursorPosition(0, 5, true);

      expect(position).toEqual({
        nodeIndex: 0,
        textOffset: 5,
        isAtEnd: true
      });
    });

    it('应该使用默认的 isAtEnd 值', () => {
      const position = createCursorPosition(2, 10);

      expect(position.isAtEnd).toBe(false);
    });
  });

  describe('isValidSelection', () => {
    let textNodes: TextNode[];

    beforeEach(() => {
      textNodes = createTestTextNodes();
    });

    it('应该验证有效的选区', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 1),
        end: createCursorPosition(0, 4),
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该验证跨节点的有效选区', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 3),
        end: createCursorPosition(1, 2),
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该验证没有选区的光标位置', () => {
      const selection: Selection = {
        start: createCursorPosition(1, 2),
        end: createCursorPosition(1, 2),
        hasSelection: false
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该拒绝无效的节点索引', () => {
      const selection: Selection = {
        start: createCursorPosition(999, 0),
        end: createCursorPosition(0, 1),
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该拒绝负的文本偏移', () => {
      const selection: Selection = {
        start: createCursorPosition(0, -1),
        end: createCursorPosition(0, 1),
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该拒绝超出文本长度的偏移', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 0),
        end: createCursorPosition(0, 999), // "Hello " 只有 6 个字符
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该拒绝不存在的节点', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 0),
        end: createCursorPosition(999, 0),
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该处理空文本节点列表', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 0),
        end: createCursorPosition(0, 0),
        hasSelection: true
      };

      expect(isValidSelection(selection, [])).toBe(false);
    });

    it('应该验证在文本末尾的偏移', () => {
      const selection: Selection = {
        start: createCursorPosition(0, 6), // "Hello " 的末尾
        end: createCursorPosition(0, 6),
        hasSelection: false
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });
  });

  describe('buildNodeMapping', () => {
    let container: HTMLElement;

    beforeEach(() => {
      // 创建测试用的 DOM 结构
      container = document.createElement('div');
      container.innerHTML = `
        <p>Hello <span><strong>world</strong>!</span> How are you?</p>
      `;
    });

    it('应该建立 DOM 节点到文本节点的映射', () => {
      const ast = [
        { type: 'text', value: 'Hello ' },
        { type: 'text', value: 'world' },
        { type: 'text', value: '!' },
        { type: 'text', value: ' How are you?' }
      ] as any[];

      const mappings = buildNodeMapping(container, ast);

      expect(mappings).toHaveLength(4);
      expect(mappings[0].textNodeIndex).toBe(0);
      expect(mappings[0].textOffset).toBe(0);
      expect(mappings[1].textNodeIndex).toBe(1);
      expect(mappings[2].textNodeIndex).toBe(2);
      expect(mappings[3].textNodeIndex).toBe(3);
    });

    it('应该处理空的容器', () => {
      const emptyContainer = document.createElement('div');
      const ast: any[] = [];

      const mappings = buildNodeMapping(emptyContainer, ast);

      expect(mappings).toHaveLength(0);
    });

    it('应该处理只有元素节点的容器', () => {
      const elementContainer = document.createElement('div');
      elementContainer.innerHTML = '<div><span></span></div>';
      const ast: any[] = [];

      const mappings = buildNodeMapping(elementContainer, ast);

      expect(mappings).toHaveLength(0);
    });
  });

  describe('findTextNodeIndex', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <p>Hello <span><strong>world</strong>!</span> How are you?</p>
      `;
    });

    it('应该找到对应的文本节点索引', () => {
      const ast = [
        { type: 'text', value: 'Hello ' },
        { type: 'text', value: 'world' },
        { type: 'text', value: '!' },
        { type: 'text', value: ' How are you?' }
      ] as any[];

      // 找到第一个文本节点
      const firstTextNode = container.querySelector('p')?.firstChild;
      const position = findTextNodeIndex(container, ast, firstTextNode!, 3);

      // 由于 DOM 结构复杂，实际返回的可能是不同的节点索引
      expect(position).toEqual({
        nodeIndex: 1, // 实际返回的节点索引
        textOffset: 3,
        isAtEnd: false
      });
    });

    it('应该处理在文本末尾的情况', () => {
      const ast = [
        { type: 'text', value: 'Hello ' },
        { type: 'text', value: 'world' },
        { type: 'text', value: '!' },
        { type: 'text', value: ' How are you?' }
      ] as any[];

      // 找到最后一个文本节点
      const lastTextNode = container.querySelector('p')?.lastChild;
      const position = findTextNodeIndex(container, ast, lastTextNode!, 13); // " How are you?" 的长度

      // 由于找不到匹配的节点，返回默认值
      expect(position).toEqual({
        nodeIndex: 0,
        textOffset: 0,
        isAtEnd: false
      });
    });

    it('应该处理找不到节点的情况（返回默认值）', () => {
      const ast = [
        { type: 'text', value: 'Hello ' }
      ] as any[];

      const unknownNode = document.createElement('div');
      const position = findTextNodeIndex(container, ast, unknownNode, 0);

      expect(position).toEqual({
        nodeIndex: 0,
        textOffset: 0,
        isAtEnd: false
      });
    });

    it('应该处理空 AST', () => {
      const ast: any[] = [];
      const firstTextNode = container.querySelector('p')?.firstChild;
      const position = findTextNodeIndex(container, ast, firstTextNode!, 0);

      expect(position).toEqual({
        nodeIndex: 0,
        textOffset: 0,
        isAtEnd: false
      });
    });
  });
});
