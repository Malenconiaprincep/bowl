/**
 * 格式化工具函数的单元测试
 * 
 * 运行方式：
 * 1. 安装测试依赖：npm install --save-dev vitest jsdom @testing-library/jest-dom
 * 2. 在 package.json 添加："test": "vitest"
 * 3. 运行：npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectFormatState,
  removeFormat,
  applyFormat,
  toggleFormat,
  cleanupHtml,
  smartToggleFormat,
} from '../utils/formatUtils';

// Mock DOM environment
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: vi.fn()
});

describe('格式化工具函数测试', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // 重置 DOM 环境
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
  });

  describe('detectFormatState - 格式状态检测', () => {
    it('应该检测到纯文本没有任何格式', () => {
      container.innerHTML = '这是普通文本';
      const state = detectFormatState(container, 0, 6);

      expect(state.bold).toBe(false);
      expect(state.italic).toBe(false);
      expect(state.underline).toBe(false);
    });

    it('应该检测到加粗格式', () => {
      container.innerHTML = '这是<strong>加粗的</strong>文本';
      const state = detectFormatState(container, 2, 5); // "加粗的" 部分

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(false);
      expect(state.underline).toBe(false);
    });

    it('应该检测到多重格式', () => {
      container.innerHTML = '这是<strong><em>加粗斜体</em></strong>文本';
      const state = detectFormatState(container, 2, 6);

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(true);
      expect(state.underline).toBe(false);
    });

    it('应该处理复杂的嵌套结构', () => {
      container.innerHTML = '前面<strong>加粗<em>加粗斜体</em>继续加粗</strong>后面';
      const state = detectFormatState(container, 4, 8); // "加粗斜体" 部分

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(true);
    });

    it('应该处理跨越多个格式区域的选择', () => {
      container.innerHTML = '<strong>加粗</strong>普通<em>斜体</em>';
      const state = detectFormatState(container, 1, 5); // 跨越加粗和普通文本

      // 这种情况下，应该返回 false，因为不是所有文本都有格式
      expect(state.bold).toBe(false);
      expect(state.italic).toBe(false);
    });
  });

  describe('removeFormat - 格式移除', () => {
    it('应该移除加粗格式', () => {
      const html = '<strong>加粗文本</strong>';
      const result = removeFormat(html, 'bold');

      expect(result).toBe('加粗文本');
    });

    it('应该移除嵌套格式中的特定格式', () => {
      const html = '<strong><em>加粗斜体</em></strong>';
      const result = removeFormat(html, 'bold');

      expect(result).toBe('<em>加粗斜体</em>');
    });

    it('应该处理多个相同格式的标签', () => {
      const html = '<strong>第一个</strong>普通<strong>第二个</strong>';
      const result = removeFormat(html, 'bold');

      expect(result).toBe('第一个普通第二个');
    });

    it('应该保留其他格式', () => {
      const html = '<strong><em><u>三重格式</u></em></strong>';
      const result = removeFormat(html, 'bold');

      expect(result).toBe('<em><u>三重格式</u></em>');
    });
  });

  describe('applyFormat - 格式应用', () => {
    it('应该正确应用加粗格式', () => {
      const html = '普通文本';
      const result = applyFormat(html, 'bold');

      expect(result).toBe('<strong>普通文本</strong>');
    });

    it('应该正确应用斜体格式', () => {
      const html = '普通文本';
      const result = applyFormat(html, 'italic');

      expect(result).toBe('<em>普通文本</em>');
    });

    it('应该正确应用下划线格式', () => {
      const html = '普通文本';
      const result = applyFormat(html, 'underline');

      expect(result).toBe('<u>普通文本</u>');
    });
  });

  describe('toggleFormat - 格式切换', () => {
    it('应该在没有格式时添加格式', () => {
      const html = '普通文本';
      const result = toggleFormat(html, 'bold', false);

      expect(result).toBe('<strong>普通文本</strong>');
    });

    it('应该在有格式时移除格式', () => {
      const html = '<strong>加粗文本</strong>';
      const result = toggleFormat(html, 'bold', true);

      expect(result).toBe('加粗文本');
    });

    it('应该正确处理部分格式的情况', () => {
      const html = '<strong>部分</strong>加粗';
      const result = toggleFormat(html, 'bold', false);

      // toggleFormat 会先应用格式: <strong><strong>部分</strong>加粗</strong>
      // 然后 cleanupHtml 会优化嵌套的相同标签: <strong>部分加粗</strong>
      expect(result).toBe('<strong>部分加粗</strong>');
    });
  });

  describe('智能格式切换测试', () => {
    it('应该在没有格式时添加格式', () => {
      const html = '普通文本';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('<strong>普通文本</strong>');
    });

    it('应该在有格式时移除格式', () => {
      const html = '<strong>加粗文本</strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('加粗文本');
    });

    it('应该正确处理部分格式的情况', () => {
      const html = '<strong>部分</strong>加粗';
      const result = smartToggleFormat(html, 'bold');
      // 由于有部分格式，应该移除所有加粗格式
      expect(result).toBe('部分加粗');
    });

    it('应该处理嵌套格式的移除', () => {
      const html = '<strong><em>嵌套格式</em></strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('<em>嵌套格式</em>');
    });

    it('应该处理多重格式的移除', () => {
      const html = '<strong><em><u>三重格式</u></em></strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('<em><u>三重格式</u></em>');
    });

    it('应该处理混合格式的移除', () => {
      const html = '<strong>粗体</strong>普通<em>斜体</em>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('粗体普通<em>斜体</em>');
    });

    it('应该处理空标签的移除', () => {
      const html = '<strong></strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('');
    });

    it('应该处理只包含空格的标签移除', () => {
      const html = '<strong>   </strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('   ');
    });

    it('应该处理自闭合标签', () => {
      const html = '<strong>文本<br/>换行</strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('文本<br>换行');
    });

    it('应该处理特殊字符', () => {
      const html = '<strong>&lt;&gt;&amp;</strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('&lt;&gt;&amp;');
    });

    it('应该处理复杂的嵌套结构移除', () => {
      const html = '<strong><em>斜体<u>下划线</u></em>文本</strong>';
      const result = smartToggleFormat(html, 'bold');
      expect(result).toBe('<em>斜体<u>下划线</u></em>文本');
    });

    it('应该处理多次切换操作', () => {
      let html = '测试文本';

      // 第一次：添加加粗
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<strong>测试文本</strong>');

      // 第二次：移除加粗
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('测试文本');

      // 第三次：再次添加加粗
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<strong>测试文本</strong>');
    });

    it('应该处理不同格式类型的切换', () => {
      let html = '测试文本';

      // 添加加粗
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<strong>测试文本</strong>');

      // 添加斜体
      html = smartToggleFormat(html, 'italic');
      expect(html).toBe('<em><strong>测试文本</strong></em>');

      // 移除加粗
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<em>测试文本</em>');

      // 移除斜体
      html = smartToggleFormat(html, 'italic');
      expect(html).toBe('测试文本');
    });

    it('应该检查取消加粗时不会出现额外字符', () => {
      // 测试简单的加粗取消
      let html = '<strong>Hello World</strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('Hello World');
      expect(html.length).toBe(11); // 确保没有额外字符

      // 测试嵌套格式的加粗取消
      html = '<strong><em>Hello</em> World</strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<em>Hello</em> World');
      expect(html.length).toBe(20); // 确保没有额外字符

      // 测试多重格式的加粗取消
      html = '<strong><em><u>Hello</u></em> World</strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('<em><u>Hello</u></em> World');
      expect(html.length).toBe(27); // 确保没有额外字符
    });

    it('应该检查HTML结构的完整性', () => {
      // 测试复杂的HTML结构
      const originalHtml = '<strong><em>斜体</em>和<u>下划线</u>文本</strong>';
      const result = smartToggleFormat(originalHtml, 'bold');

      // 验证结果不包含多余的字符
      expect(result).toBe('<em>斜体</em>和<u>下划线</u>文本');

      // 验证HTML结构正确
      expect(result).toContain('<em>斜体</em>');
      expect(result).toContain('<u>下划线</u>');
      expect(result).toContain('和');
      expect(result).toContain('文本');

      // 验证没有多余的标签
      expect(result).not.toContain('<strong>');
      expect(result).not.toContain('</strong>');
    });

    it('应该处理边界情况下的字符完整性', () => {
      // 测试空内容
      let html = '<strong></strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('');
      expect(html.length).toBe(0);

      // 测试只有空格
      html = '<strong>   </strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('   ');
      expect(html.length).toBe(3);

      // 测试特殊字符
      html = '<strong>&lt;&gt;&amp;</strong>';
      html = smartToggleFormat(html, 'bold');
      expect(html).toBe('&lt;&gt;&amp;');
      expect(html.length).toBe(13);
    });

    it('应该直接测试 removeFormat 函数', () => {
      // 直接测试 removeFormat，不经过 smartToggleFormat
      const html = '<strong><em>Hello</em> World</strong>';
      const result = removeFormat(html, 'bold');
      console.log('removeFormat 直接结果:', JSON.stringify(result));
      console.log('期望结果:', JSON.stringify('<em>Hello</em> World'));
      expect(result).toBe('<em>Hello</em> World');
    });

    it('应该分析字符差异', () => {
      const html = '<strong><em>Hello</em> World</strong>';
      const result = removeFormat(html, 'bold');
      const expected = '<em>Hello</em> World';

      console.log('实际结果:', result);
      console.log('期望结果:', expected);
      console.log('实际长度:', result.length);
      console.log('期望长度:', expected.length);

      // 逐字符比较
      for (let i = 0; i < Math.max(result.length, expected.length); i++) {
        const actualChar = result[i] || 'undefined';
        const expectedChar = expected[i] || 'undefined';
        if (actualChar !== expectedChar) {
          console.log(`位置 ${i}: 实际='${actualChar}' (${actualChar.charCodeAt(0)}) 期望='${expectedChar}' (${expectedChar.charCodeAt(0)})`);
        }
      }

      expect(result).toBe(expected);
    });

    it('应该重现用户提到的字符重复问题', () => {
      // 模拟用户操作：12345678，选中4567，加粗，再取消加粗

      // 第一步：选中4567并加粗
      const selectedHtml = '4567';
      const boldHtml = applyFormat(selectedHtml, 'bold');
      console.log('加粗后:', boldHtml);

      // 第二步：取消加粗
      const unboldHtml = removeFormat(boldHtml, 'bold');
      console.log('取消加粗后:', unboldHtml);

      // 第三步：清理HTML
      const cleanedHtml = cleanupHtml(unboldHtml);
      console.log('清理后:', cleanedHtml);

      // 验证结果
      expect(cleanedHtml).toBe('4567');
      expect(cleanedHtml.length).toBe(4);

      // 检查是否有重复字符
      expect(cleanedHtml).not.toContain('45674567');
      expect(cleanedHtml).not.toContain('45678');
    });

    it('应该测试完整的格式化流程', () => {
      // 模拟完整的编辑器操作流程
      let html = '12345678';

      // 1. 应用加粗格式
      html = applyFormat(html, 'bold');
      expect(html).toBe('<strong>12345678</strong>');

      // 2. 移除加粗格式
      html = removeFormat(html, 'bold');
      expect(html).toBe('12345678');

      // 3. 清理HTML
      html = cleanupHtml(html);
      expect(html).toBe('12345678');

      // 4. 再次应用加粗
      html = applyFormat(html, 'bold');
      expect(html).toBe('<strong>12345678</strong>');

      // 5. 再次移除加粗
      html = removeFormat(html, 'bold');
      expect(html).toBe('12345678');

      // 6. 最终清理
      html = cleanupHtml(html);
      expect(html).toBe('12345678');

      // 验证最终结果
      expect(html).toBe('12345678');
      expect(html.length).toBe(8);
    });

    it('应该模拟实际的编辑器选区操作', () => {
      // 模拟编辑器中的实际操作：12345678，选中4567

      // 模拟选中4567部分
      const selectedText = '4567';
      const beforeSelection = '123';
      const afterSelection = '8';

      // 第一次：应用加粗
      const formattedHtml = applyFormat(selectedText, 'bold');
      expect(formattedHtml).toBe('<strong>4567</strong>');

      // 模拟在编辑器中替换内容
      const firstResult = beforeSelection + formattedHtml + afterSelection;
      expect(firstResult).toBe('123<strong>4567</strong>8');

      // 第二次：取消加粗（模拟用户再次点击加粗按钮）
      const unformattedHtml = removeFormat(formattedHtml, 'bold');
      expect(unformattedHtml).toBe('4567');

      // 模拟在编辑器中再次替换内容
      const secondResult = beforeSelection + unformattedHtml + afterSelection;
      expect(secondResult).toBe('12345678');

      // 验证最终结果
      expect(secondResult).toBe('12345678');
      expect(secondResult.length).toBe(8);
      expect(secondResult).not.toContain('45674567');
      // 注意：'45678' 是 '12345678' 的子字符串，这是正常的
      // 我们真正要检查的是是否有重复的字符
      expect(secondResult.indexOf('4567')).toBe(3); // 4567 应该只出现一次，位置在索引3
      expect(secondResult.lastIndexOf('4567')).toBe(3); // 最后一次出现也应该在索引3
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空字符串', () => {
      const result = applyFormat('', 'bold');
      expect(result).toBe('<strong></strong>');
    });

    it('应该处理只有空格的字符串', () => {
      const result = applyFormat('   ', 'bold');
      expect(result).toBe('<strong>   </strong>');
    });

    it('应该处理特殊字符', () => {
      const html = '<>&"\'';
      const result = applyFormat(html, 'bold');
      expect(result).toBe('<strong><>&"\'</strong>');
    });

    it('应该处理自闭合标签', () => {
      const html = '文本<br/>换行';
      const result = applyFormat(html, 'bold');
      expect(result).toBe('<strong>文本<br/>换行</strong>');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量文本', () => {
      const longText = 'a'.repeat(10000);
      const html = `<strong>${longText}</strong>`;

      const startTime = performance.now();
      const result = removeFormat(html, 'bold');
      const endTime = performance.now();

      expect(result).toBe(longText);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该在合理时间内处理深度嵌套', () => {
      let html = '文本';
      for (let i = 0; i < 100; i++) {
        html = `<strong>${html}</strong>`;
      }

      const startTime = performance.now();
      const result = removeFormat(html, 'bold');
      const endTime = performance.now();

      expect(result).toBe('文本');
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('实际使用场景测试', () => {
    it('场景1：用户选中已加粗的文本再次点击加粗按钮', () => {
      container.innerHTML = '前面<strong>选中的文本</strong>后面';
      const state = detectFormatState(container, 2, 7);
      const selectedHtml = '<strong>选中的文本</strong>';

      const result = toggleFormat(selectedHtml, 'bold', state.bold);
      expect(result).toBe('选中的文本');
    });

    it('场景2：用户选中部分加粗部分普通的文本', () => {
      container.innerHTML = '<strong>加粗</strong>普通文本';
      const state = detectFormatState(container, 1, 6);
      // 这种情况下应该统一应用格式

      expect(state.bold).toBe(false); // 因为不是全部都是加粗
    });

    it('场景3：用户在已有格式上添加新格式', () => {
      const html = '<strong>已加粗的文本</strong>';
      const result = applyFormat(html, 'italic');

      expect(result).toBe('<em><strong>已加粗的文本</strong></em>');
    });

    it('场景4：用户移除多重格式中的一种', () => {
      const html = '<strong><em><u>三重格式</u></em></strong>';
      const result = removeFormat(html, 'italic');

      expect(result).toBe('<strong><u>三重格式</u></strong>');
    });
  });

  describe('HTML清理和优化测试', () => {
    describe('cleanupHtml - HTML结构清理', () => {
      it('应该移除空的格式标签', () => {
        const html = 'a<em></em>b<strong></strong>c<u></u>d';
        const result = cleanupHtml(html);
        expect(result).toBe('abcd');
      });

      it('应该移除只包含空白字符的格式标签', () => {
        const html = 'a<em>   </em>b<strong>\n\t</strong>c';
        const result = cleanupHtml(html);
        expect(result).toBe('abc');
      });

      it('应该合并相邻的相同格式标签', () => {
        const html = '<strong>a</strong><strong>b</strong><strong>c</strong>';
        const result = cleanupHtml(html);
        expect(result).toBe('<strong>abc</strong>');
      });

      it('应该合并不同类型的相邻标签', () => {
        const html = '<em>a</em><em>b</em><u>c</u><u>d</u>';
        const result = cleanupHtml(html);
        expect(result).toBe('<em>ab</em><u>cd</u>');
      });

      it('应该优化嵌套的相同标签', () => {
        const html = '<strong><strong>nested</strong></strong>';
        const result = cleanupHtml(html);
        expect(result).toBe('<strong>nested</strong>');
      });

      it('应该处理深度嵌套的相同标签', () => {
        const html = '<em><em><em>deep</em></em></em>';
        const result = cleanupHtml(html);
        expect(result).toBe('<em>deep</em>');
      });

      it('应该保留不同类型的嵌套标签', () => {
        const html = '<strong><em>different</em></strong>';
        const result = cleanupHtml(html);
        expect(result).toBe('<strong><em>different</em></strong>');
      });

      it('应该处理复杂的混合情况', () => {
        const html = 'a<em></em><u><em>b</em><strong><em>c<strong>d</strong></em></strong></u><em>e</em><em>f</em>';
        const result = cleanupHtml(html);

        // 验证具体的清理结果：
        // 1. 移除空标签 <em></em>
        // 2. 合并相邻的相同标签 <em>e</em><em>f</em> -> <em>ef</em>  
        // 3. 优化嵌套的相同标签 <strong><em>c<strong>d</strong></em></strong> -> <strong><em>cd</em></strong>
        expect(result).toBe('a<u><em>b</em><strong><em>cd</em></strong></u><em>ef</em>');
      });



      it('应该处理用户提到的复杂案例', () => {
        const html = 'a<em></em><u><em>b</em><strong><em>c<strong>cefef</strong></em><u><em><strong></strong></em></u></strong></u><u><em>w</em></u><u><em></em><u><em>we</em></u></u><strong><u><em><strong></strong></em><strong>ew</strong></u></strong><u><strong>f</strong>w</u>e';
        const result = cleanupHtml(html);

        // 验证结果不包含空标签
        expect(result).not.toMatch(/<\w+><\/\w+>/);
        expect(result).not.toMatch(/<\w+>\s*<\/\w+>/);

        // 验证仍然包含实际内容
        expect(result).toContain('a');
        expect(result).toContain('b');
        expect(result).toContain('c');
        expect(result).toContain('cefef');
        expect(result).toContain('w');
        expect(result).toContain('we');
        expect(result).toContain('ew');
        expect(result).toContain('f');
        expect(result).toContain('e');
      });
    });

    describe('多轮操作后的HTML清理', () => {
      it('应该在多次格式化操作后保持干净的结构', () => {
        let html = '测试文本';

        // 模拟多次格式化操作
        html = applyFormat(html, 'bold');
        html = applyFormat(html, 'italic');
        html = removeFormat(html, 'bold');
        html = applyFormat(html, 'bold');
        html = removeFormat(html, 'italic');

        const result = cleanupHtml(html);
        expect(result).toBe('<strong>测试文本</strong>');
      });

      it('应该处理频繁的格式切换', () => {
        let html = '文本';

        // 模拟用户频繁点击格式按钮
        for (let i = 0; i < 5; i++) {
          html = toggleFormat(html, 'bold', false);
          html = toggleFormat(html, 'bold', true);
        }

        // 最终应该没有格式
        expect(html).toBe('文本');
      });

      it('应该处理混合格式的复杂操作', () => {
        let html = '<strong>粗体</strong>普通<em>斜体</em>';

        // 应用下划线到整个文本
        html = applyFormat(html, 'underline');
        // 移除粗体
        html = removeFormat(html, 'bold');

        const result = cleanupHtml(html);
        expect(result).toBe('<u>粗体普通<em>斜体</em></u>');
      });
    });

    describe('边界情况的HTML清理', () => {
      it('应该处理只有格式标签没有内容的情况', () => {
        const html = '<strong><em><u></u></em></strong>';
        const result = cleanupHtml(html);
        expect(result).toBe('');
      });

      it('应该处理混合文本和空标签的情况', () => {
        const html = '前面<strong></strong>中间<em>内容</em><u></u>后面';
        const result = cleanupHtml(html);
        expect(result).toBe('前面中间<em>内容</em>后面');
      });

      it('应该处理特殊字符', () => {
        const html = '<strong>&lt;</strong><strong>&gt;</strong><em>&amp;</em><em>"</em>';
        const result = cleanupHtml(html);
        expect(result).toBe('<strong>&lt;&gt;</strong><em>&amp;"</em>');
      });

      it('应该保留非格式标签', () => {
        const html = '<div><strong>粗体</strong><span>文本</span></div>';
        const result = cleanupHtml(html);
        expect(result).toBe('<div><strong>粗体</strong><span>文本</span></div>');
      });
    });

    describe('性能测试 - HTML清理', () => {
      it('应该在合理时间内清理大量嵌套标签', () => {
        let html = '文本';
        // 创建100层嵌套
        for (let i = 0; i < 100; i++) {
          html = `<strong>${html}</strong>`;
        }

        const startTime = performance.now();
        const result = cleanupHtml(html);
        const endTime = performance.now();

        expect(result).toBe('<strong>文本</strong>');
        expect(endTime - startTime).toBeLessThan(100);
      });

      it('应该在合理时间内处理大量相邻标签', () => {
        let html = '';
        // 创建1000个相邻的相同标签
        for (let i = 0; i < 1000; i++) {
          html += `<strong>${i}</strong>`;
        }

        const startTime = performance.now();
        const result = cleanupHtml(html);
        const endTime = performance.now();

        expect(result).toBe('<strong>' + Array.from({ length: 1000 }, (_, i) => i).join('') + '</strong>');
        expect(endTime - startTime).toBeLessThan(200);
      });
    });
  });
});
