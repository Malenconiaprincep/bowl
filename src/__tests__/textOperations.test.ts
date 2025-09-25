import { describe, it, expect } from 'vitest';
import { insertTextAtPosition, deleteTextAtPosition, deleteSelection, insertTextAtSelection } from '../utils/textOperations';
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
  createTextNode('Hello '),
  createElementNode('span', [
    createTextNode('world', ['b'])
  ]),
  createTextNode('!')
];

// 基于用户实际数据的测试用例
const createRealWorldAST = (): ASTNode[] => [
  {
    type: "element",
    tag: "p",
    children: [
      { type: "text", value: "Hello " },
      { type: "text", value: "Wor", marks: ["b"] },
      { type: "text", value: "ld", marks: ["i", "b"] },
      { type: "text", value: "! This is an editable AST editor." },
    ],
  },
];

describe('textOperations', () => {
  describe('insertTextAtPosition', () => {
    it('应该在指定位置插入文本', () => {
      const ast = createTestAST();
      const position = 5; // 在 "Hello " 的末尾
      const result = insertTextAtPosition(ast, position, ' beautiful');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hello beautiful ',
        marks: undefined
      });
    });

    it('应该在文本中间插入文本', () => {
      const ast = createTestAST();
      const position = 2; // 在 "Hello " 的 "l" 后面
      const result = insertTextAtPosition(ast, position, 'XX');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'HeXXllo ',
        marks: undefined
      });
    });

    it('应该在文本开头插入文本', () => {
      const ast = createTestAST();
      const position = 0; // 在 "Hello " 的开头
      const result = insertTextAtPosition(ast, position, 'Start ');

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Start Hello ',
        marks: undefined
      });
    });

    it('应该在嵌套元素中的文本节点插入文本', () => {
      const ast = createTestAST();
      const position = 8; // 在 "world" 的 "o" 后面
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
      const position = 999; // 无效的节点索引
      const result = insertTextAtPosition(ast, position, 'test');

      expect(result).toEqual(ast);
    });
  });

  describe('deleteTextAtPosition', () => {
    it('应该删除指定位置的文本', () => {
      const ast = createTestAST();
      const position = 5; // 在 "Hello " 的末尾
      const result = deleteTextAtPosition(ast, position, 1);

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hell ',
        marks: undefined
      });
    });

    it('应该删除多个字符', () => {
      const ast = createTestAST();
      const position = 3; // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 2);

      expect(result[0]).toEqual({
        type: 'text',
        value: 'Hlo ',
        marks: undefined
      });
    });

    it('应该处理删除长度超过文本长度的情况', () => {
      const ast = createTestAST();
      const position = 2; // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 10); // 尝试删除 10 个字符

      expect(result[0]).toEqual({
        type: 'text',
        value: 'llo ',
        marks: undefined
      });
    });

    it('应该处理无效位置（不修改 AST）', () => {
      const ast = createTestAST();
      const position = 999; // 无效的节点索引
      const result = deleteTextAtPosition(ast, position, 1);

      expect(result).toEqual(ast);
    });
  });

  describe('deleteSelection', () => {
    it('应该删除单个文本节点中的选区', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 1, // "e" 的位置
        end: 4,   // "o" 的位置
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Ho ', // 删除了 "ell"
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(1);
    });

    it('应该删除整个文本节点', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 0, // 开头
        end: 6,   // 结尾
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'element',
        tag: 'span',
        children: [{
          type: 'text',
          value: 'world',
          marks: ['b']
        }]
      });
      expect(result.newCursorPosition).toBe(0);
    });

    it('应该处理没有选区的情况（删除光标前一个字符）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3,
        end: 3,
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Helo ', // 删除了 "l"
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(2);
    });

    it('应该处理无效选区（返回原 AST）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 0,
        end: 0,
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST).toEqual(ast);
      expect(result.newCursorPosition).toBe(selection.start);
    });
  });

  describe('insertTextAtSelection', () => {
    it('应该在选区位置插入文本（替换选区内容）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 1, // "e" 的位置
        end: 4,   // "o" 的位置
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HXXo ', // 替换了 "ell" 为 "XX"
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(3); // 1 + 2 (XX 的长度)
    });

    it('应该在没有选区时插入文本', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3,
        end: 3,
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HelXXlo ', // 在位置 3 插入 "XX"
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(5); // 3 + 2 (XX 的长度)
    });

    // it('应该处理无效选区（返回原 AST）', () => {
    //   const ast = createTestAST();
    //   const selection: Selection = {
    //     start: 0,
    //     end: 0,
    //   };

    //   const result = insertTextAtSelection(ast, selection, 'test');

    //   expect(result.newAST).toEqual(ast);
    //   expect(result.newCursorPosition).toBe(4);
    // });

    it('应该处理跨节点选区（简化版）', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3, // "Hello " 中的 "l"
        end: 7,   // "world" 中的 "r"
      };

      const result = insertTextAtSelection(ast, selection, 'XX');

      // 跨节点选区应该删除选中内容并插入新文本
      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HelXX', // 删除了 "lo " 和 "wo"
        marks: undefined
      });
      expect(result.newAST[1]).toEqual({
        type: 'element',
        tag: 'span',
        children: [{
          type: 'text',
          value: 'orld', // 保留了 "orld"
          marks: ['b']
        }]
      });
      expect(result.newCursorPosition).toBe(5); // 3 + 2 (XX 的长度)
    });

    it('应该删除实际数据中的加粗文本后清理空的格式化节点', () => {
      const ast = createRealWorldAST();
      const selection: Selection = {
        start: 6, // "Wor" 的开始位置
        end: 12,   // "Wor" 的结束位置
      };

      const result = deleteSelection(ast, selection);

      // 应该清理空的格式化节点，只保留有内容的节点
      const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };

      expect(pElement.children).toHaveLength(1); // 删除了空的 "Wor" 节点，合并了相邻的文本节点
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hello  This is an editable AST editor.',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(6);
    });


    //   {
    //     type: "element",
    //       tag: "p",
    //         children: [
    //           { type: "text", value: "Hello " },
    //           { type: "text", value: "Wor", marks: ["b"] },
    //           { type: "text", value: "ld", marks: ["i", "b"] },
    //           { type: "text", value: "! This is an editable AST editor." },
    //         ],
    // },

    it('应该模拟按删除键逐个删除字符后清理空的格式化节点', () => {
      let ast = createRealWorldAST();

      // 模拟按删除键删除 "Wor" 的每个字符
      // 第一次删除 'r'
      const result1 = deleteSelection(ast, { start: 9, end: 9 });
      ast = result1.newAST;

      // 第二次删除 'o'  
      const result2 = deleteSelection(ast, { start: 8, end: 8 });
      ast = result2.newAST;

      // 第三次删除 'W'
      const result3 = deleteSelection(ast, { start: 7, end: 7 });
      ast = result3.newAST;

      // 应该清理空的格式化节点
      const pElement = ast[0] as { type: 'element'; tag: string; children: ASTNode[] };
      console.log('实际结果:', JSON.stringify(pElement.children, null, 2));
      expect(pElement.children).toHaveLength(3); // 按删除键后，节点被拆分但格式不同无法合并
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hello ',
        marks: undefined
      });
      expect(pElement.children[1]).toEqual({
        type: 'text',
        value: 'ld',
        marks: ['i', 'b']
      });
      expect(pElement.children[2]).toEqual({
        type: 'text',
        value: '! This is an editable AST editor.',
        marks: undefined
      });
    });
  });

  describe('中文输入处理', () => {
    it('应该正确处理中文字符插入', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3,
        end: 3,
      };

      const result = insertTextAtSelection(ast, selection, '你好');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Hel你好lo ',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(5); // 3 + 2 (你好 的长度)
    });

    it('应该正确处理中文字符替换选区', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 1, // "e" 的位置
        end: 4,   // "o" 的位置
      };

      const result = insertTextAtSelection(ast, selection, '世界');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'H世界o ', // 替换了 "ell" 为 "世界"
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(3); // 1 + 2 (世界 的长度)
    });

    it('应该正确处理中文标点符号', () => {

      // createTextNode('Hello '),
      //   createElementNode('span', [
      //     createTextNode('world', ['b'])
      //   ]),
      //   createTextNode('!')

      const ast = createTestAST();
      const selection: Selection = {
        start: 11, // "!" 的位置 (Hello + world + ! = 6 + 5 + 1 = 12, 所以!在位置11)
        end: 11,
      };

      const result = insertTextAtSelection(ast, selection, '，。！？');

      expect(((result.newAST[1] as ElementNode).children[0] as TextNode).value).toEqual('world，。！？');
      expect(result.newCursorPosition).toBe(15); // 11 + 4 (，。！？ 的长度)
    });

    it('应该正确处理中英文混合输入', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3,
        end: 3,
      };

      const result = insertTextAtSelection(ast, selection, 'Hello世界');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'HelHello世界lo ',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(10); // 3 + 7 (Hello世界 的长度)
    });

    it('应该正确处理中文删除操作', () => {
      const ast = [
        createTextNode('你好世界'),
        createElementNode('span', [
          createTextNode('测试', ['b'])
        ]),
        createTextNode('！')
      ];

      const selection: Selection = {
        start: 2, // "世" 的位置
        end: 2,
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: '你世界',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(1);
    });

    it('应该正确处理中文选区删除', () => {
      const ast = [
        createTextNode('你好世界'),
        createElementNode('span', [
          createTextNode('测试', ['b'])
        ]),
        createTextNode('！')
      ];

      const selection: Selection = {
        start: 1, // "好" 的位置
        end: 3,   // "世" 的位置
      };

      const result = deleteSelection(ast, selection);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: '你界',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(1);
    });

    it('应该正确处理包含中文的跨节点操作', () => {
      const ast = [
        createTextNode('你好'),
        createElementNode('span', [
          createTextNode('世界', ['b'])
        ]),
        createTextNode('！')
      ];

      const selection: Selection = {
        start: 1, // "好" 的位置
        end: 3,   // "世" 的位置
      };

      const result = insertTextAtSelection(ast, selection, '测试');

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: '你测试',
        marks: undefined
      });
      expect(result.newAST[1]).toEqual({
        type: 'element',
        tag: 'span',
        children: [{
          type: 'text',
          value: '界',
          marks: ['b']
        }]
      });
      expect(result.newCursorPosition).toBe(3); // 1 + 2 (测试 的长度)
    });

    it('应该正确处理长中文文本插入', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 0,
        end: 0,
      };

      const longChineseText = '这是一个很长的中文文本，用来测试编辑器的中文处理能力。';
      const result = insertTextAtSelection(ast, selection, longChineseText);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: longChineseText + 'Hello ',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(longChineseText.length);
    });

    it('应该正确处理中文数字和符号', () => {
      const ast = createTestAST();
      const selection: Selection = {
        start: 3,
        end: 3,
      };

      const chineseNumbers = '一二三四五①②③④⑤';
      const result = insertTextAtSelection(ast, selection, chineseNumbers);

      expect(result.newAST[0]).toEqual({
        type: 'text',
        value: 'Hel' + chineseNumbers + 'lo ',
        marks: undefined
      });
      expect(result.newCursorPosition).toBe(3 + chineseNumbers.length);
    });
  });
});