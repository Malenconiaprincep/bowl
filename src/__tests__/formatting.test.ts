import { describe, it, expect } from 'vitest';
import { applyFormatToSelection } from '../utils/formatting';
import type { ASTNode, TextNode, Mark, ElementNode, ElementTag } from '../types/ast';
import type { Selection } from '../utils/selection';

// 测试用的 AST 数据
const createTextNode = (value: string, marks?: Mark[]): TextNode => ({
  type: 'text',
  value,
  marks
});

const createElementNode = (tag: ElementTag, children: ASTNode[]): ASTNode => ({
  type: 'element',
  tag,
  children
});

const createTestAST = (): ASTNode[] => [
  createElementNode('p', [
    createTextNode('Hello '),
    createElementNode('span', [
      createTextNode('world', ['b'])
    ]),
    createTextNode('!')
  ])
];

const createMultiNodeAST = (): ASTNode[] => [
  createElementNode('p', [
    createTextNode('First '),
    createTextNode('second '),
    createTextNode('third '),
    createTextNode('fourth')
  ])
];

const createFormattedAST = (): ASTNode[] => [
  createElementNode('p', [
    createTextNode('Hello ', ['b']),
    createTextNode('world', ['i']),
    createTextNode('!', ['u'])
  ])
];

describe('formatting', () => {
  describe('applyFormatToSelection', () => {
    it('应该对单个文本节点内的选区应用格式', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 2, // "Hello " 中的 "l"
        end: 4,   // "Hello " 中的 "l"
      };

      const result = applyFormatToSelection(ast, selection, 'b')[0] as ElementNode
      const children = (result as ElementNode).children

      // 验证结果不为空且与原始 AST 不同
      expect(result).toBeDefined();
      expect(result).not.toEqual(ast[0]); // 验证修改后的 p 节点与原始 p 节点不同
      expect((result).children).toBeDefined(); // 验证 p 节点的子节点存在
      expect((result).children).toHaveLength(5); // 验证 p 节点的子节点数量为 5

      // 验证第一个节点（未选中的部分）
      expect((children[0] as TextNode).value).toBe("He");
      expect((children[0] as TextNode).marks).toEqual([]);

      // 验证选中的部分有格式
      expect((children[1] as TextNode).value).toBe('ll');
      expect((children[1] as TextNode).marks).toContain('b');

      // 验证未选中的部分没有格式
      expect((children[2] as TextNode).value).toBe('o ');
      expect((children[2] as TextNode).marks).toEqual([]);

      // 验证其他节点保持不变
      expect((children[3] as TextNode).type).toBe('element');
      expect((children[4] as TextNode).value).toBe('!');
    });

    it('应该对跨节点选区应用格式', () => {
      const ast = createMultiNodeAST();
      const selection: Selection = {
        start: 3, // "First " 中的 "s"
        end: 9,   // "second " 中的 "o"
      };

      const result = applyFormatToSelection(ast, selection, 'i')[0] as ElementNode
      const children = (result as ElementNode).children


      // 验证结果不为空且与原始 AST 不同
      expect(result).toBeDefined();
      expect(result).not.toEqual(ast);
      expect(result.children).toHaveLength(5);

      // 验证第一个节点被分割
      expect((children[0] as TextNode).value).toBe('Fir');
      expect((children[0] as TextNode).marks).toEqual([]);


      expect((children[1] as TextNode).value).toBe('st sec');
      expect((children[1] as TextNode).marks).toContain('i');

      // 验证第二个节点被分割
      expect((children[2] as TextNode).value).toBe('ond ');
      expect((children[2] as TextNode).marks).toEqual([]);

      // 验证第三个节点被完全格式化
      expect((children[3] as TextNode).value).toBe('third ');
      expect((children[3] as TextNode).marks).toBeUndefined();

      // 验证第四个节点保持不变
      expect((children[4] as TextNode).value).toBe('fourth');
    });

    it('应该处理选区覆盖整个文本节点的情况', () => {
      // createElementNode('p', [
      //   createTextNode('Hello '),
      //   createElementNode('span', [
      //     createTextNode('world', ['b'])
      //   ]),
      //   createTextNode('!')
      // ])

      const ast = createTestAST();
      const selection: Selection = {
        start: 6, // "world" 的开始
        end: 11,  // "world" 的结束
      };

      const result = applyFormatToSelection(ast, selection, 'u')[0] as ElementNode
      const children = (result as ElementNode).children

      console.log(JSON.stringify(result), '>>>result');


      // 应该对整个 "world" 节点应用格式
      expect(children).toHaveLength(3);
      expect((children[1])).toEqual({
        type: 'text',
        value: 'world',
        marks: ['b', 'u'] // 保留原有格式并添加新格式
      });
    });

    it('应该处理选区在元素节点内的情况', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 7, // "world" 中的 "o"
        end: 9,   // "world" 中的 "r"
      };

      const result = applyFormatToSelection(ast, selection, 's')[0] as ElementNode
      const children = (result as ElementNode).children

      // 应该分割元素节点内的文本
      expect(children).toHaveLength(3);
      const spanElement = children[1] as ElementNode;
      expect(spanElement.type).toBe('element');
      expect(spanElement.tag).toBe('span');
      expect(spanElement.children).toHaveLength(3);

      // 分割后的文本节点
      expect(spanElement.children[0]).toEqual({
        type: 'text',
        value: 'w',
        marks: ['b']
      });
      expect(spanElement.children[1]).toEqual({
        type: 'text',
        value: 'or',
        marks: ['b', 's']
      });
      expect(spanElement.children[2]).toEqual({
        type: 'text',
        value: 'ld',
        marks: ['b']
      });
    });

    it('应该处理无效选区', () => {
      const ast = createTestAST();
      const invalidSelection: Selection = {
        start: 100, // 超出范围
        end: 200,
      };

      const result = applyFormatToSelection(ast, invalidSelection, 'b');

      // 应该返回原始 AST
      expect(result).toEqual(ast);
    });

    it('应该处理没有选区的情况', () => {
      const ast = createTestAST();
      const noSelection: Selection = {
        start: 0,
        end: 0,
      };

      const result = applyFormatToSelection(ast, noSelection, 'b');

      // 应该返回原始 AST
      expect(result).toEqual(ast);
    });

    it('应该避免重复添加相同的格式', () => {
      const ast = createFormattedAST();
      const selection: Selection = {
        start: 0, // "Hello " 的开始
        end: 6,   // "Hello " 的结束
      };

      const result = applyFormatToSelection(ast, selection, 'b')[0] as ElementNode
      const children = (result as ElementNode).children

      // 不应该重复添加已有的格式
      expect((children[0] as TextNode).marks).toEqual(['b']);
    });

    it('应该处理选区在单个字符上的情况', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 0, // "H"
        end: 1,   // "H"
      };

      const result = applyFormatToSelection(ast, selection, 'i')[0] as ElementNode
      const children = (result as ElementNode).children


      console.log(JSON.stringify(result), '>>>result')

      // 应该分割单个字符
      expect(children).toHaveLength(4);
      expect((children[0] as TextNode).value).toBe('H');
      expect((children[0] as TextNode).marks).toEqual(['i']);

      // // 分割后的节点
      expect((children[1] as TextNode).value).toBe('ello ');
      expect((children[1] as TextNode).marks).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((children[2] as any).type).toBe('element');
    });
  });
});