import { describe, it, expect } from 'vitest';
import { getTextNodes, cloneAST, getTargetTextNode, replaceTextNodeInAST, mergeEmptyTextNodes } from '../utils/core';
import type { ASTNode, TextNode, Mark } from '../types/ast';

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
    createTextNode('world', ['b']),
    createTextNode('!', ['i'])
  ]),
  createTextNode(' How are you?')
];

describe('core', () => {
  describe('getTextNodes', () => {
    it('应该正确提取所有文本节点', () => {
      const ast = createTestAST();
      const textNodes = getTextNodes(ast);

      expect(textNodes).toHaveLength(4);
      expect(textNodes[0]).toEqual({
        type: 'text',
        value: 'Hello ',
        marks: undefined
      });
      expect(textNodes[1]).toEqual({
        type: 'text',
        value: 'world',
        marks: ['b']
      });
      expect(textNodes[2]).toEqual({
        type: 'text',
        value: '!',
        marks: ['i']
      });
      expect(textNodes[3]).toEqual({
        type: 'text',
        value: ' How are you?',
        marks: undefined
      });
    });

    it('应该处理空 AST', () => {
      const ast: ASTNode[] = [];
      const textNodes = getTextNodes(ast);

      expect(textNodes).toHaveLength(0);
    });

    it('应该处理只有元素节点的 AST', () => {
      const ast: ASTNode[] = [
        createElementNode('div', [
          createElementNode('span', [])
        ])
      ];
      const textNodes = getTextNodes(ast);

      expect(textNodes).toHaveLength(0);
    });

    it('应该处理只有文本节点的 AST', () => {
      const ast: ASTNode[] = [
        createTextNode('Hello'),
        createTextNode('World')
      ];
      const textNodes = getTextNodes(ast);

      expect(textNodes).toHaveLength(2);
      expect(textNodes[0].value).toBe('Hello');
      expect(textNodes[1].value).toBe('World');
    });
  });

  describe('cloneAST', () => {
    it('应该深拷贝 AST', () => {
      const ast = createTestAST();
      const cloned = cloneAST(ast);

      expect(cloned).toEqual(ast);
      expect(cloned).not.toBe(ast); // 不是同一个引用

      // 修改克隆后的 AST 不应该影响原 AST
      const textNode = cloned[0] as TextNode;
      textNode.value = 'Modified';

      expect((ast[0] as TextNode).value).toBe('Hello ');
      expect(textNode.value).toBe('Modified');
    });

    it('应该处理空 AST', () => {
      const ast: ASTNode[] = [];
      const cloned = cloneAST(ast);

      expect(cloned).toEqual([]);
      expect(cloned).not.toBe(ast);
    });

    it('应该深拷贝嵌套结构', () => {
      const ast: ASTNode[] = [
        createElementNode('div', [
          createTextNode('nested', ['b']),
          createElementNode('span', [
            createTextNode('deep', ['i'])
          ])
        ])
      ];
      const cloned = cloneAST(ast);

      expect(cloned).toEqual(ast);

      // 修改深层嵌套的节点
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const divElement = cloned[0] as any;
      const spanElement = divElement.children[1];
      const deepTextNode = spanElement.children[0];
      deepTextNode.value = 'modified';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalDivElement = ast[0] as any;
      const originalSpanElement = originalDivElement.children[1];
      const originalDeepTextNode = originalSpanElement.children[0];

      expect(originalDeepTextNode.value).toBe('deep');
      expect(deepTextNode.value).toBe('modified');
    });
  });

  describe('getTargetTextNode', () => {
    it('应该正确获取指定索引的文本节点', () => {
      const ast = createTestAST();

      expect(getTargetTextNode(ast, 0)).toEqual({
        type: 'text',
        value: 'Hello ',
        marks: undefined
      });

      expect(getTargetTextNode(ast, 1)).toEqual({
        type: 'text',
        value: 'world',
        marks: ['b']
      });

      expect(getTargetTextNode(ast, 2)).toEqual({
        type: 'text',
        value: '!',
        marks: ['i']
      });

      expect(getTargetTextNode(ast, 3)).toEqual({
        type: 'text',
        value: ' How are you?',
        marks: undefined
      });
    });

    it('应该处理无效索引', () => {
      const ast = createTestAST();

      expect(getTargetTextNode(ast, -1)).toBeNull();
      expect(getTargetTextNode(ast, 999)).toBeNull();
    });

    it('应该处理空 AST', () => {
      const ast: ASTNode[] = [];

      expect(getTargetTextNode(ast, 0)).toBeNull();
    });
  });

  describe('replaceTextNodeInAST', () => {
    it('应该用单个新节点替换文本节点', () => {
      const ast = createTestAST();
      const newNodes: TextNode[] = [
        createTextNode('replaced', ['b', 'i'])
      ];

      const result = replaceTextNodeInAST(ast, 0, newNodes);

      expect(result[0]).toEqual({
        type: 'text',
        value: 'replaced',
        marks: ['b', 'i']
      });
    });

    it('应该用多个新节点替换文本节点（包装在 span 中）', () => {
      const ast = createTestAST();
      const newNodes: TextNode[] = [
        createTextNode('first', ['b']),
        createTextNode('second', ['i'])
      ];

      const result = replaceTextNodeInAST(ast, 0, newNodes, true);

      // console.log(result[1].children, '>>result')

      expect(result[0]).toEqual({
        type: 'element',
        tag: 'span',
        children: [
          { type: 'text', value: 'first', marks: ['b'] },
          { type: 'text', value: 'second', marks: ['i'] }
        ]
      });
    });

    it('应该处理无效索引（返回原 AST）', () => {
      const ast = createTestAST();
      const newNodes: TextNode[] = [createTextNode('test')];

      const result = replaceTextNodeInAST(ast, 999, newNodes);

      expect(result).toEqual(ast);
    });

    it('应该替换嵌套元素中的文本节点', () => {
      const ast = createTestAST();
      const newNodes: TextNode[] = [createTextNode('nested-replaced', ['u'])];

      const result = replaceTextNodeInAST(ast, 1, newNodes);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spanElement = result[1] as any;
      expect(spanElement.children[0]).toEqual({
        type: 'text',
        value: 'nested-replaced',
        marks: ['u']
      });
    });
  });

  describe('mergeEmptyTextNodes', () => {
    it('应该删除空文本节点', () => {
      const ast: ASTNode[] = [
        createTextNode('Hello'),
        createTextNode(''), // 空节点
        createTextNode(''), // 空节点
        createTextNode('World')
      ];

      const result = mergeEmptyTextNodes(ast);

      // 空节点应该被删除
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hello',
        marks: undefined
      });
      expect(result[1]).toEqual({
        type: 'text',
        value: 'World',
        marks: undefined
      });
    });

    it('应该处理没有空节点的情况', () => {
      const ast = createTestAST();
      const result = mergeEmptyTextNodes(ast);

      expect(result).toEqual(ast);
    });

    it('应该处理只有空节点的情况', () => {
      const ast: ASTNode[] = [
        createTextNode(''),
        createTextNode(''),
        createTextNode('')
      ];

      const result = mergeEmptyTextNodes(ast);

      // 所有空节点都应该被删除
      expect(result).toHaveLength(0);
    });

    it('应该处理空和非空节点混合的情况', () => {
      const ast: ASTNode[] = [
        createTextNode('Hello'),
        createTextNode(''), // 空节点
        createTextNode('World'),
        createTextNode(''), // 空节点
        createTextNode(''), // 空节点
        createTextNode('!')
      ];

      const result = mergeEmptyTextNodes(ast);

      // 空节点应该被删除，只保留非空节点
      expect(result).toHaveLength(3);
      expect((result[0] as TextNode).value).toBe('Hello');
      expect((result[1] as TextNode).value).toBe('World');
      expect((result[2] as TextNode).value).toBe('!');
    });
  });
});
