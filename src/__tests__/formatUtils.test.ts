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
