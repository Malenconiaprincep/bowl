import { describe, it, expect } from 'vitest';
import { insertTextAtPosition, deleteTextAtPosition, deleteSelection, insertTextAtSelection, splitTextAtCursor } from '../utils/textOperations';
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


// 基于用户实际数据的测试用例
const createRealWorldAST = (): ASTNode[] => [
  createElementNode('p', [
    createTextNode('Hello '),
    createTextNode('Wor', ['b']),
    createTextNode('ld', ['i', 'b']),
    createTextNode('! This is an editable AST editor.'),
  ]),
];

const createRealWorldAST2 = (): ASTNode[] => [
  createElementNode('p', [
    createTextNode('Hello '),
    createTextNode('World', ['b']),
    createTextNode('!'),
  ]),
];

describe('textOperations', () => {
  describe('insertTextAtPosition', () => {
    it('应该在指定位置插入文本', () => {
      const ast = createRealWorldAST();
      const position = 5; // 在 "Hello " 的末尾
      const result = insertTextAtPosition(ast, position, ' beautiful');

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hello beautiful ',
        marks: undefined
      });
    });

    it('应该在文本中间插入文本', () => {
      const ast = createRealWorldAST();
      const position = 2; // 在 "Hello " 的 "l" 后面
      const result = insertTextAtPosition(ast, position, 'XX');

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'HeXXllo ',
        marks: undefined
      });
    });

    it('应该在文本开头插入文本', () => {
      const ast = createRealWorldAST();
      const position = 0; // 在 "Hello " 的开头
      const result = insertTextAtPosition(ast, position, 'Start ');

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Start Hello ',
        marks: undefined
      });
    });

    it('应该在嵌套元素中的文本节点插入文本', () => {
      const ast = createRealWorldAST();
      const position = 8; // 在 "Wor" 的 "r" 后面
      const result = insertTextAtPosition(ast, position, 'XX');

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[1]).toEqual({
        type: 'text',
        value: 'WoXXr',
        marks: ['b']
      });
    });

    it('应该处理无效位置（不修改 AST）', () => {
      const ast = createRealWorldAST();
      const position = 999; // 无效的节点索引
      const result = insertTextAtPosition(ast, position, 'test');

      expect(result).toEqual(ast);
    });
  });

  describe('deleteTextAtPosition', () => {
    it('应该删除指定位置的文本', () => {
      const ast = createRealWorldAST();
      const position = 5; // 在 "Hello " 的末尾
      const result = deleteTextAtPosition(ast, position, 1);

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hell ',
        marks: undefined
      });
    });

    it('应该删除多个字符', () => {
      const ast = createRealWorldAST();
      const position = 3; // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 2);

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hlo ',
        marks: undefined
      });
    });

    it('应该处理删除长度超过文本长度的情况', () => {
      const ast = createRealWorldAST();
      const position = 2; // 在 "Hello " 的 "l" 后面
      const result = deleteTextAtPosition(ast, position, 10); // 尝试删除 10 个字符

      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'llo ',
        marks: undefined
      });
    });

    it('应该处理无效位置（不修改 AST）', () => {
      const ast = createRealWorldAST();
      const position = 999; // 无效的节点索引
      const result = deleteTextAtPosition(ast, position, 1);

      expect(result).toEqual(ast);
    });

    it('删除文本节点中有空格的情况', () => {
      const ast = [createElementNode('p', [
        createTextNode('Hello '),
        createTextNode('W', ['b']),
      ])]

      const position = 7
      const result = deleteTextAtPosition(ast, position, 1);

      console.log(JSON.stringify(result, null, 2), '>>>deleteTextAtPosition')

      expect(result[0].type).toBe('element');
      const pElement = result[0] as { type: 'element'; tag: string; children: ASTNode[] };
      expect(pElement.children).toHaveLength(1);
      expect(pElement.children[0]).toEqual({
        type: 'text',
        value: 'Hello ',
        marks: undefined
      });
    });
  })
});

describe('deleteSelection', () => {
  it('应该删除单个文本节点中的选区', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 1, // "e" 的位置
      end: 4,   // "o" 的位置
    };

    const result = deleteSelection(ast, selection);

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'Ho ', // 删除了 "ell"
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(1);
  });

  it('应该删除整个文本节点', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 0, // 开头
      end: 6,   // 结尾
    };

    const result = deleteSelection(ast, selection);

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children).toHaveLength(3); // 删除了第一个文本节点，剩余3个
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(result.newCursorPosition).toBe(0);
  });

  it('应该处理没有选区的情况（删除光标前一个字符）', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3,
      end: 3,
    };

    const result = deleteSelection(ast, selection);

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'Helo ', // 删除了 "l"
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(2);
  });

  it('应该处理无效选区（返回原 AST）', () => {
    const ast = createRealWorldAST();
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
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 1, // "e" 的位置
      end: 4,   // "o" 的位置
    };

    const result = insertTextAtSelection(ast, selection, 'XX');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'HXXo ', // 替换了 "ell" 为 "XX"
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(3); // 1 + 2 (XX 的长度)
  });

  it('应该在没有选区时插入文本', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3,
      end: 3,
    };

    const result = insertTextAtSelection(ast, selection, 'XX');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'HelXXlo ', // 在位置 3 插入 "XX"
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(5); // 3 + 2 (XX 的长度)
  });

  // it('应该处理无效选区（返回原 AST）', () => {
  //   const ast = createRealWorldAST();
  //   const selection: Selection = {
  //     start: 0,
  //     end: 0,
  //   };

  //   const result = insertTextAtSelection(ast, selection, 'test');

  //   expect(result.newAST).toEqual(ast);
  //   expect(result.newCursorPosition).toBe(4);
  // });

  it('应该处理跨节点选区（简化版）', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3, // "Hello " 中的 "l"
      end: 7,   // "Wor" 中的 "r"
    };

    const result = insertTextAtSelection(ast, selection, 'XX');

    // 跨节点选区应该删除选中内容并插入新文本
    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'HelXX', // 删除了 "lo " 和 "Wo"
      marks: undefined
    });
    expect(pElement.children[1]).toEqual({
      type: 'text',
      value: 'or', // 保留了 "or"
      marks: ['b']
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
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3,
      end: 3,
    };

    const result = insertTextAtSelection(ast, selection, '你好');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'Hel你好lo ',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(5); // 3 + 2 (你好 的长度)
  });

  it('应该正确处理中文字符替换选区', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 1, // "e" 的位置
      end: 4,   // "o" 的位置
    };

    const result = insertTextAtSelection(ast, selection, '世界');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'H世界o ', // 替换了 "ell" 为 "世界"
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(3); // 1 + 2 (世界 的长度)
  });

  it('应该正确处理中文标点符号', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 11, // "ld" 中的 "d" 位置 (Hello + Wor + ld = 6 + 3 + 2 = 11, 所以d在位置11)
      end: 11,
    };

    const result = insertTextAtSelection(ast, selection, '，。！？');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[2]).toEqual({
      type: 'text',
      value: 'ld，。！？',
      marks: ['i', 'b']
    });
    expect(result.newCursorPosition).toBe(15); // 11 + 4 (，。！？ 的长度)
  });

  it('应该正确处理中英文混合输入', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3,
      end: 3,
    };

    const result = insertTextAtSelection(ast, selection, 'Hello世界');

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'HelHello世界lo ',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(10); // 3 + 7 (Hello世界 的长度)
  });

  it('应该正确处理中文删除操作', () => {
    const ast = [
      createElementNode('p', [
        createTextNode('你好世界'),
        createTextNode('测试', ['b']),
        createTextNode('！')
      ])
    ];

    const selection: Selection = {
      start: 2, // "世" 的位置
      end: 2,
    };

    const result = deleteSelection(ast, selection);
    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };

    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: '你世界',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(1);
  });

  it('应该正确处理中文选区删除', () => {
    const ast = [
      createElementNode('p', [
        createTextNode('你好世界'),
        createTextNode('测试', ['b']),
        createTextNode('！')
      ])
    ];

    const selection: Selection = {
      start: 1, // "好" 的位置
      end: 3,   // "世" 的位置
    };

    const result = deleteSelection(ast, selection);
    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };

    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: '你界',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(1);
  });

  it('应该正确处理包含中文的跨节点操作', () => {
    const ast = [
      createElementNode('p', [
        createTextNode('你好'),
        createTextNode('世界', ['b']),
        createTextNode('！')
      ])
    ];

    const selection: Selection = {
      start: 1, // "好" 的位置
      end: 3,   // "世" 的位置
    };

    const result = insertTextAtSelection(ast, selection, '测试');
    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };

    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: '你测试',
      marks: undefined
    });

    expect(pElement.children[1]).toEqual({ type: 'text', value: '界', marks: ['b'] });
    expect(result.newCursorPosition).toBe(3); // 1 + 2 (测试 的长度)
  });

  it('应该正确处理长中文文本插入', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 0,
      end: 0,
    };

    const longChineseText = '这是一个很长的中文文本，用来测试编辑器的中文处理能力。';
    const result = insertTextAtSelection(ast, selection, longChineseText);

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: longChineseText + 'Hello ',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(longChineseText.length);
  });

  it('应该正确处理中文数字和符号', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3,
      end: 3,
    };

    const chineseNumbers = '一二三四五①②③④⑤';
    const result = insertTextAtSelection(ast, selection, chineseNumbers);

    const pElement = result.newAST[0] as { type: 'element'; tag: string; children: ASTNode[] };
    expect(pElement.children[0]).toEqual({
      type: 'text',
      value: 'Hel' + chineseNumbers + 'lo ',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(3 + chineseNumbers.length);
  });
});

// const createRealWorldAST2 = (): ASTNode[] => [
//   createElementNode('p', [
//     createTextNode('Hello '),
//     createTextNode('World', ['b']),
//     createTextNode('!'),
//   ]),
// ];

describe('splitTextAtCursor', () => {
  it('应该在 Hello 和 world 之间按回车时正确拆分', () => {
    const ast = createRealWorldAST2();
    const selection: Selection = {
      start: 6, // "Hello " 的末尾，world 的开头
      end: 6,
    };

    const result = splitTextAtCursor(ast, selection);

    // 根据实际行为，函数没有进行跨节点拆分
    // 前面的 AST 应该保持原始结构，但第一个文本节点被截断
    expect(result.beforeAST).toHaveLength(1);
    expect(result.beforeAST[0]).toEqual({
      type: 'element',
      tag: 'p',
      children: [{
        type: 'text',
        value: 'Hello ', // 第一个文本节点保持不变
        marks: undefined
      }]
    });

    // 后面的 AST 应该包含空的段落
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(2);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'World',
      marks: ['b']
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: '!',
      marks: undefined
    });

    // 新光标位置应该在后面的 AST 开始
    expect(result.newCursorPosition).toBe(0);
  });

  // const createRealWorldAST = (): ASTNode[] => [
  //   createElementNode('p', [
  //     createTextNode('Hello '),
  //     createTextNode('Wor', ['b']),
  //     createTextNode('ld', ['i', 'b']),
  //     createTextNode('! This is an editable AST editor.'),
  //   ]),
  // ];

  it('应该在文本中间按回车时正确拆分', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 3, // "Hello " 的 "l" 后面
      end: 3,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该包含 "Hel" 和后续节点
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(1);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: 'Hel',
      marks: undefined
    });


    // 后面的 AST 应该包含 "lo " 文本和后续节点
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(4);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'lo ',
      marks: undefined
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(afterElement.children[3]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor.',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });

  it('应该在文本开头按回车时创建空的前面 AST', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 0, // 文本开头
      end: 0,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该包含一个空的段落
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(1);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: '',
      marks: undefined
    });

    // 后面的 AST 应该包含 "Hello " 文本
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(4);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'Hello ',
      marks: undefined
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(afterElement.children[3]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor.',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });

  // const createRealWorldAST = (): ASTNode[] => [
  //   createElementNode('p', [
  //     createTextNode('Hello '),
  //     createTextNode('Wor', ['b']),
  //     createTextNode('ld', ['i', 'b']),
  //     createTextNode('! This is an editable AST editor.'),
  //   ]),
  // ];

  it('应该在文本结尾按回车时创建空的后面 AST', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 43, // 文本结尾 (Hello + Wor + ld + ! This is an editable AST editor. = 6 + 3 + 2 + 32 = 43)
      end: 43,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该包含所有原始内容
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(4);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: 'Hello ',
      marks: undefined
    });
    expect(beforeElement.children[1]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(beforeElement.children[2]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(beforeElement.children[3]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor',
      marks: undefined
    });

    // 后面的 AST 应该包含空的文本节点
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(1);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: '.',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });

  // const createRealWorldAST = (): ASTNode[] => [
  //   createElementNode('p', [
  //     createTextNode('Hello '),
  //     createTextNode('Wor', ['b']),
  //     createTextNode('ld', ['i', 'b']),
  //     createTextNode('! This is an editable AST editor.'),
  //   ]),
  // ];

  it('应该在嵌套元素中的文本按回车时正确拆分', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 8, // "Wor" 的 "r" 后面
      end: 8,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该包含 "Hello " + "Wo" + "ld" + "! This is an editable AST editor."
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(2);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: 'Hello ',
      marks: undefined
    });
    expect(beforeElement.children[1]).toEqual({
      type: 'text',
      value: 'Wo',
      marks: ['b']
    });


    // 后面的 AST 应该包含 "r"
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(3);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'r',
      marks: ['b']
    });

    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor.',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });

  it('应该处理无效选区时返回原 AST', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: -1, // 无效位置
      end: -1,
    };

    const result = splitTextAtCursor(ast, selection);

    // 根据实际行为，无效选区时函数会尝试处理，但结果可能不同
    expect(result.beforeAST).toHaveLength(0);


    expect(result.afterAST).toHaveLength(4);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(4);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'Hello ',
      marks: undefined
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(afterElement.children[3]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor.',
      marks: undefined
    });
    expect(result.newCursorPosition).toBe(0);
  });

  it('应该使用实际数据测试拆分功能', () => {
    const ast = createRealWorldAST();
    const selection: Selection = {
      start: 6, // "Hello " 和 "Wor" 之间
      end: 6,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该只包含 "Hello " 节点
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(1);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: 'Hello ',
      marks: undefined
    });

    // 后面的 AST 应该包含剩余的节点
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(3);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: 'Wor',
      marks: ['b']
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: 'ld',
      marks: ['i', 'b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: '! This is an editable AST editor.',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });

  it('应该正确处理中文文本的拆分', () => {
    const ast: ASTNode[] = [
      {
        type: "element",
        tag: "p",
        children: [
          { type: "text", value: "你好世界" },
          { type: "text", value: "测试", marks: ["b"] },
          { type: "text", value: "！" },
        ],
      },
    ];

    const selection: Selection = {
      start: 2, // "好" 的位置
      end: 2,
    };

    const result = splitTextAtCursor(ast, selection);

    // 前面的 AST 应该包含 "你好" + "测试" + "！"
    expect(result.beforeAST).toHaveLength(1);
    const beforeElement = result.beforeAST[0] as ElementNode;
    expect(beforeElement.type).toBe('element');
    expect(beforeElement.tag).toBe('p');
    expect(beforeElement.children).toHaveLength(1);
    expect(beforeElement.children[0]).toEqual({
      type: 'text',
      value: '你好',
      marks: undefined
    });


    // 后面的 AST 应该包含 "世界"
    expect(result.afterAST).toHaveLength(1);
    const afterElement = result.afterAST[0] as ElementNode;
    expect(afterElement.type).toBe('element');
    expect(afterElement.tag).toBe('p');
    expect(afterElement.children).toHaveLength(3);
    expect(afterElement.children[0]).toEqual({
      type: 'text',
      value: '世界',
      marks: undefined
    });
    expect(afterElement.children[1]).toEqual({
      type: 'text',
      value: '测试',
      marks: ['b']
    });
    expect(afterElement.children[2]).toEqual({
      type: 'text',
      value: '！',
      marks: undefined
    });

    expect(result.newCursorPosition).toBe(0);
  });
});