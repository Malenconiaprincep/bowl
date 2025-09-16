import { describe, it, expect } from 'vitest';
import { insertTextAtPosition, deleteTextAtPosition, deleteSelection, insertTextAtSelection } from '../utils/textOperations';
import type { ASTNode, TextNode, Mark } from '../types/ast';
import type { Selection } from '../utils/selection';
import { createCursorPosition } from '../utils/selection';

// 测试用的 AST 数据
const createTextNode = (value: string, marks?: Mark[]): TextNode => ({
  type: 'text',
  value,
  marks
});

const createElementNode = (tag: 'p' | 'div' | 'span', children: ASTNode[]): ASTNode => ({
  type: 'element',
  tag,
  children
});

const createTestAST = (): ASTNode[] => [
  createTextNode('Hello '),
  createElementNode('span', [
    createTextNode('world', ['b'])
  ]),
  createTextNode('!')
];

describe('textOperations', () => {
  describe('insertTextAtPosition', () => {
    it('应该在指定位置插入文本', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 5); // 在 "Hello " 的末尾
      const result = insertTextAtPosition(ast, position, ' beautiful');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hello beautiful ',
        marks: undefined
      });
    });

    it('应该在文本中间插入文本', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 2); // 在 "Hello " 的 "l" 后面
      const result = insertTextAtPosition(ast, position, 'XX');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'HeXXllo ',
        marks: undefined
      });
    });

    it('应该在文本开头插入文本', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 0); // 在 "Hello " 的开头
      const result = insertTextAtPosition(ast, position, 'Start ');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Start Hello ',
        marks: undefined
      });
    });

    it('应该在嵌套元素中的文本节点插入文本', () => {
      const ast = createTestAST();
      const position = createCursorPosition(1, 2); // 在 "world" 的 "o" 后面
      const result = insertTextAtPosition(ast, position, 'XX');

      const spanElement = result[1] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(spanElement.children[0]).toEqual({
        type: 'text',
        value: 'woXXrld',
        marks: ['b']
      });
    });

    it('应该处理无效位置（不修改 AST）', () => {
      const ast = createTestAST();
      const position = createCursorPosition(999, 0); // 无效的节点索引
      const result = insertTextAtPosition(ast, position, 'test');

      expect(result).toEqual(ast);
    });
  });

  describe('deleteTextAtPosition', () => {
    it('应该删除指定位置的文本', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 5); // 在 "Hello " 的末尾
      const result = deleteTextAtPosition(ast, position, 1);

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hell ',
        marks: undefined
      });
    });

    it('应该删除多个字符', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 3); // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 2);

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hlo ',
        marks: undefined
      });
    });

    it('应该处理删除长度超过文本长度的情况', () => {
      const ast = createTestAST();
      const position = createCursorPosition(0, 2); // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 10); // 尝试删除 10 个字符

      expect(result[0]).toEqual({
        type: 'text',
        value: 'llo ',
        marks: undefined
      });
    });

    it('应该处理无效位置（不修改 AST）', () => {
      const ast = createTestAST();
      const position = createCursorPosition(999, 0); // 无效的节点索引
      const result = deleteTextAtPosition(ast, position, 1);

      expect(result).toEqual(ast);
    });
  });

  describe('deleteSelection', () => {
    it('应该删除单个文本节点中的选区', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 1), // "e" 的位置
        end: createCursorPosition(0, 4),   // "o" 的位置
        hasSelection: true
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Ho ', // 删除了 "ell"
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 1,
        isAtEnd: false
      });
    });

    it('应该删除整个文本节点', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 0), // 开头
        end: createCursorPosition(0, 6),   // 结尾
        hasSelection: true
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: '',
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 0,
        isAtEnd: false
      });
    });

    it('应该处理没有选区的情况（删除光标前一个字符）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 3),
        end: createCursorPosition(0, 3),
        hasSelection: false
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Helo ', // 删除了 "l"
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 2,
        isAtEnd: false
      });
    });

    it('应该处理无效选区（返回原 AST）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(999, 0),
        end: createCursorPosition(999, 0),
        hasSelection: true
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST).toEqual(ast);
      expect(result.newCursorPosition).toEqual(selection.start);
    });
  });

  describe('insertTextAtSelection', () => {
    it('应该在选区位置插入文本（替换选区内容）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 1), // "e" 的位置
        end: createCursorPosition(0, 4),   // "o" 的位置
        hasSelection: true
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HXXo ', // 替换了 "ell" 为 "XX"
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 3, // 1 + 2 (XX 的长度)
        isAtEnd: false
      });
    });

    it('应该在没有选区时插入文本', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 3),
        end: createCursorPosition(0, 3),
        hasSelection: false
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HelXXlo ', // 在位置 3 插入 "XX"
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 5, // 3 + 2 (XX 的长度)
        isAtEnd: false
      });
    });

    it('应该处理无效选区（返回原 AST）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(999, 0),
        end: createCursorPosition(999, 0),
        hasSelection: true
      };

      const result = insertTextAtSelection(ast, selection, 'test');

      expect(result.newAST).toEqual(ast);
      expect(result.newCursorPosition).toEqual(selection.start);
    });

    it('应该处理跨节点选区（简化版）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: createCursorPosition(0, 3), // "Hello " 中的 "l"
        end: createCursorPosition(2, 1),   // "!" 中的位置
        hasSelection: true
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      // 跨节点选区应该删除选中内容并插入新文本
      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HelXX', // 删除了 "lo " 和 "world" 和 "!"
        marks: undefined
      });
      expect(result.newCursorPosition).toEqual({
        nodeIndex: 0,
        textOffset: 5, // 3 + 2 (XX 的长度)
        isAtEnd: false
      });
    });
  });
});
