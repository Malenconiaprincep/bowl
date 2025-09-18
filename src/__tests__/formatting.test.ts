import { describe, it, expect } from 'vitest';
import { applyFormatToSelection } from '../utils/formatting';
import type { ASTNode, TextNode, Mark, ElementNode } from '../types/ast';
import type { Selection } from '../utils/selection';

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
    // it('应该对单个文本节点内的选区应用格式', () => {
    //   const ast = createTestAST();
    //   const selection: Selection = {
    //     start: 2, // "Hello " 中的 "l"
    //     end: 4,   // "Hello " 中的 "l"
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, selection, 'b')[0] as ElementNode
    //   const children = (result as ElementNode).children

    //   // 验证结果不为空且与原始 AST 不同
    //   expect(result).toBeDefined();
    //   expect(result).not.toEqual(ast[0]); // 验证修改后的 p 节点与原始 p 节点不同
    //   expect((result).children).toBeDefined(); // 验证 p 节点的子节点存在
    //   expect((result).children).toHaveLength(5); // 验证 p 节点的子节点数量为 5

    //   // 验证第一个节点（未选中的部分）
    //   expect((children[0] as TextNode).value).toBe("He");
    //   expect((children[0] as TextNode).marks).toEqual([]);

    //   // 验证选中的部分有格式
    //   expect((children[1] as TextNode).value).toBe('ll');
    //   expect((children[1] as TextNode).marks).toContain('b');

    //   // 验证未选中的部分没有格式
    //   expect((children[2] as TextNode).value).toBe('o ');
    //   expect((children[2] as TextNode).marks).toEqual([]);

    //   // 验证其他节点保持不变
    //   expect((children[3] as TextNode).type).toBe('element');
    //   expect((children[4] as TextNode).value).toBe('!');
    // });

    it('应该对跨节点选区应用格式', () => {
      const ast = createMultiNodeAST();
      const selection: Selection = {
        start: 3, // "First " 中的 "s"
        end: 9,   // "second " 中的 "o"
        hasSelection: true
      };

      console.log(ast, '>>>ast');

      const result = applyFormatToSelection(ast, selection, 'i')[0] as ElementNode
      const children = (result as ElementNode).children


      console.log(result, '>>>result');

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

    // it('应该处理选区覆盖整个文本节点的情况', () => {
    //   const ast = createTestAST();
    //   const selection: Selection = {
    //     start: 6, // "world" 的开始
    //     end: 11,  // "world" 的结束
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, selection, 'u');

    //   // 应该对整个 "world" 节点应用格式
    //   expect(result).toHaveLength(3);
    //   expect((result[1] as any).children[0]).toEqual({
    //     type: 'text',
    //     value: 'world',
    //     marks: ['b', 'u'] // 保留原有格式并添加新格式
    //   });
    // });

    // it('应该处理选区在元素节点内的情况', () => {
    //   const ast = createTestAST();
    //   const selection: Selection = {
    //     start: 7, // "world" 中的 "o"
    //     end: 9,   // "world" 中的 "r"
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, selection, 's');

    //   // 应该分割元素节点内的文本
    //   expect(result).toHaveLength(3);
    //   const spanElement = result[1] as any;
    //   expect(spanElement.type).toBe('element');
    //   expect(spanElement.tag).toBe('span');
    //   expect(spanElement.children).toHaveLength(3);

    //   // 分割后的文本节点
    //   expect(spanElement.children[0]).toEqual({
    //     type: 'text',
    //     value: 'w',
    //     marks: ['b']
    //   });
    //   expect(spanElement.children[1]).toEqual({
    //     type: 'text',
    //     value: 'or',
    //     marks: ['b', 's']
    //   });
    //   expect(spanElement.children[2]).toEqual({
    //     type: 'text',
    //     value: 'ld',
    //     marks: ['b']
    //   });
    // });

    // it('应该处理无效选区', () => {
    //   const ast = createTestAST();
    //   const invalidSelection: Selection = {
    //     start: 100, // 超出范围
    //     end: 200,
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, invalidSelection, 'b');

    //   // 应该返回原始 AST
    //   expect(result).toEqual(ast);
    // });

    // it('应该处理没有选区的情况', () => {
    //   const ast = createTestAST();
    //   const noSelection: Selection = {
    //     start: 0,
    //     end: 0,
    //     hasSelection: false
    //   };

    //   const result = applyFormatToSelection(ast, noSelection, 'b');

    //   // 应该返回原始 AST
    //   expect(result).toEqual(ast);
    // });

    // it('应该避免重复添加相同的格式', () => {
    //   const ast = createFormattedAST();
    //   const selection: Selection = {
    //     start: 0, // "Hello " 的开始
    //     end: 6,   // "Hello " 的结束
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, selection, 'b');

    //   // 不应该重复添加已有的格式
    //   expect((result[0] as TextNode).marks).toEqual(['b']);
    // });

    // it('应该处理空选区', () => {
    //   const ast = createTestAST();
    //   const emptySelection: Selection = {
    //     start: 3,
    //     end: 3, // 开始和结束位置相同
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, emptySelection, 'b');

    //   // 空选区应该返回原始 AST
    //   expect(result).toEqual(ast);
    // });

    // it('应该处理选区在单个字符上的情况', () => {
    //   const ast = createTestAST();
    //   const selection: Selection = {
    //     start: 0, // "H"
    //     end: 1,   // "H"
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(ast, selection, 'i');

    //   // 应该分割单个字符
    //   expect(result).toHaveLength(4);
    //   expect((result[0] as TextNode).value).toBe('');
    //   expect((result[0] as TextNode).marks).toEqual([]);

    //   // 分割后的节点
    //   expect((result[1] as TextNode).value).toBe('H');
    //   expect((result[1] as TextNode).marks).toEqual(['i']);
    //   expect((result[2] as TextNode).value).toBe('ello ');
    //   expect((result[2] as TextNode).marks).toEqual([]);

    //   // 验证其他节点保持不变
    //   expect((result[3] as any).type).toBe('element');
    // });

    // it('应该处理选区跨越多个元素节点的情况', () => {
    //   const complexAST: ASTNode[] = [
    //     createElementNode('p', [
    //       createTextNode('First paragraph')
    //     ]),
    //     createElementNode('p', [
    //       createTextNode('Second paragraph')
    //     ])
    //   ];

    //   const selection: Selection = {
    //     start: 10, // "First paragraph" 中的 "p"
    //     end: 21,   // "Second paragraph" 中的 "p" (15 + 6 = 21)
    //     hasSelection: true
    //   };

    //   const result = applyFormatToSelection(complexAST, selection, 'b');

    //   // 应该处理跨元素节点的选区
    //   expect(result).toHaveLength(2);

    //   // 第一个段落：分割并格式化后半部分
    //   const firstP = result[0] as any;
    //   expect(firstP.children).toHaveLength(2);
    //   expect(firstP.children[0].value).toBe('First parag');
    //   expect(firstP.children[0].marks).toEqual([]);
    //   expect(firstP.children[1].value).toBe('raph');
    //   expect(firstP.children[1].marks).toEqual(['b']);

    //   // 第二个段落：分割并格式化前半部分
    //   const secondP = result[1] as any;
    //   expect(secondP.children).toHaveLength(2);
    //   expect(secondP.children[0].value).toBe('Second');
    //   expect(secondP.children[0].marks).toEqual(['b']);
    //   expect(secondP.children[1].value).toBe(' paragraph');
    //   expect(secondP.children[1].marks).toEqual([]);
    // });
  });
});