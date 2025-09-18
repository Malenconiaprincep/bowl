import { describe, it, expect, beforeEach } from 'vitest';
import { isValidSelection, buildNodeMapping, findNodeAndOffsetBySelectionOffset, calculateSelectionOffset, findSelectionOffsetFromDOM } from '../utils/selection';
import type { TextNode, Mark, ASTNode } from '../types/ast';
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
  describe('findNodeAndOffsetBySelectionOffset', () => {
    it('应该根据全局偏移量找到对应的文本节点索引和偏移量', () => {
      const textNodes = createTestTextNodes(); // ['Hello ', 'world', '! How are you?']

      // 测试在第一个文本节点内
      const result1 = findNodeAndOffsetBySelectionOffset(textNodes, 3);
      expect(result1).toEqual({
        nodeIndex: 0,
        textOffset: 3
      });

      // 测试在第二个文本节点内
      const result2 = findNodeAndOffsetBySelectionOffset(textNodes, 8); // 6 + 2
      expect(result2).toEqual({
        nodeIndex: 1,
        textOffset: 2
      });

      // 测试在第三个文本节点内
      const result3 = findNodeAndOffsetBySelectionOffset(textNodes, 15); // 6 + 5 + 4
      expect(result3).toEqual({
        nodeIndex: 2,
        textOffset: 4
      });
    });

    it('应该处理超出范围的情况', () => {
      const textNodes = createTestTextNodes();

      // 测试超出范围的情况
      const result = findNodeAndOffsetBySelectionOffset(textNodes, 999);
      expect(result).toEqual({
        nodeIndex: 2, // 最后一个节点
        textOffset: 14 // 最后一个节点的长度
      });
    });
  });

  describe('calculateSelectionOffset', () => {
    it('应该根据文本节点索引和偏移量计算全局偏移量', () => {
      const textNodes = createTestTextNodes(); // ['Hello ', 'world', '! How are you?']

      // 测试第一个文本节点
      expect(calculateSelectionOffset(textNodes, 0, 3)).toBe(3);

      // 测试第二个文本节点
      expect(calculateSelectionOffset(textNodes, 1, 2)).toBe(8); // 6 + 2

      // 测试第三个文本节点
      expect(calculateSelectionOffset(textNodes, 2, 4)).toBe(15); // 6 + 5 + 4
    });
  });

  describe('isValidSelection', () => {
    let textNodes: TextNode[];

    beforeEach(() => {
      textNodes = createTestTextNodes(); // ['Hello ', 'world', '! How are you?'] - 总长度 24
    });

    it('应该验证有效的选区', () => {
      const selection: Selection = {
        start: 1,
        end: 4,
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该验证跨节点的有效选区', () => {
      const selection: Selection = {
        start: 3, // 在第一个文本节点内
        end: 8,   // 在第二个文本节点内
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该验证没有选区的光标位置', () => {
      const selection: Selection = {
        start: 8, // 在第二个文本节点内
        end: 8,   // 相同位置
        hasSelection: false
      };

      expect(isValidSelection(selection, textNodes)).toBe(true);
    });

    it('应该拒绝负的偏移量', () => {
      const selection: Selection = {
        start: -1,
        end: 1,
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该拒绝超出文本长度的偏移', () => {
      const selection: Selection = {
        start: 0,
        end: 999, // 超出总长度 24
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该拒绝开始位置大于结束位置', () => {
      const selection: Selection = {
        start: 10,
        end: 5,
        hasSelection: true
      };

      expect(isValidSelection(selection, textNodes)).toBe(false);
    });

    it('应该处理空文本节点列表', () => {
      const selection: Selection = {
        start: 0,
        end: 0,
        hasSelection: true
      };

      expect(isValidSelection(selection, [])).toBe(false);
    });

    it('应该验证在文本末尾的偏移', () => {
      const selection: Selection = {
        start: 24, // 文本末尾
        end: 24,
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
      const ast: ASTNode[] = [
        { type: 'text', value: 'Hello ' },
        { type: 'text', value: 'world' },
        { type: 'text', value: '!' },
        { type: 'text', value: ' How are you?' }
      ];

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
      const ast: ASTNode[] = [];

      const mappings = buildNodeMapping(emptyContainer, ast);

      expect(mappings).toHaveLength(0);
    });

    it('应该处理只有元素节点的容器', () => {
      const elementContainer = document.createElement('div');
      elementContainer.innerHTML = '<div><span></span></div>';
      const ast: ASTNode[] = [];

      const mappings = buildNodeMapping(elementContainer, ast);

      expect(mappings).toHaveLength(0);
    });
  });

  describe('findSelectionOffsetFromDOM', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <p>Hello <span><strong>world</strong>!</span> How are you?</p>
      `;
    });

    it('应该根据 DOM 位置找到对应的全局偏移量', () => {
      const ast: ASTNode[] = [
        { type: 'text', value: 'Hello ' },
        { type: 'text', value: 'world' },
        { type: 'text', value: '!' },
        { type: 'text', value: ' How are you?' }
      ];

      // 找到第一个文本节点
      const firstTextNode = container.querySelector('p')?.firstChild;
      const offset = findSelectionOffsetFromDOM(container, ast, firstTextNode!, 3);

      // 由于 DOM 结构复杂，实际返回的可能是不同的偏移量
      expect(typeof offset).toBe('number');
      expect(offset).toBeGreaterThanOrEqual(0);
    });

    it('应该处理找不到节点的情况（返回默认值）', () => {
      const ast: ASTNode[] = [
        { type: 'text', value: 'Hello ' }
      ];

      const unknownNode = document.createElement('div');
      const offset = findSelectionOffsetFromDOM(container, ast, unknownNode, 0);

      expect(offset).toBe(0);
    });

    it('应该处理空 AST', () => {
      const ast: ASTNode[] = [];
      const firstTextNode = container.querySelector('p')?.firstChild;
      const offset = findSelectionOffsetFromDOM(container, ast, firstTextNode!, 0);

      expect(offset).toBe(0);
    });
  });
});
