/**
 * 格式化工具函数的单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectFormatState,
  removeFormat,
  applyFormat,
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
      const html = '这是普通文本';
      const state = detectFormatState(html);

      expect(state.bold).toBe(false);
      expect(state.italic).toBe(false);
      expect(state.underline).toBe(false);
    });

    it('应该检测到加粗格式', () => {
      const html = '<strong>加粗的文本</strong>';
      const state = detectFormatState(html);

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(false);
      expect(state.underline).toBe(false);
    });

    it('应该检测到多重格式', () => {
      const html = '<strong><em>加粗斜体</em></strong>';
      const state = detectFormatState(html);

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(true);
      expect(state.underline).toBe(false);
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

    it('应该保持其他格式', () => {
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

  describe('smartToggleFormat - 智能格式切换', () => {
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

    it('修复：123<strong>456</strong><em>78</em>9 全选加粗问题', () => {
      const input = '123<strong>456</strong><em>78</em>9';
      console.log('原始HTML:', input);

      // 第一次：应该给整个内容加粗
      const boldResult = smartToggleFormat(input, 'bold');
      console.log('处理后HTML:', boldResult);

      // 期望：保持原有结构，外层包strong
      expect(boldResult).toBe('<strong>123<strong>456</strong><em>78</em>9</strong>');

      // 第二次：应该移除加粗
      const unboldResult = smartToggleFormat(boldResult, 'bold');
      console.log('移除加粗后:', unboldResult);

      // 期望：回到原始状态
      expect(unboldResult).toBe('123456<em>78</em>9');
    });

    it('应该正确处理混合格式的文本', () => {
      const testCases = [
        {
          name: '混合文本和格式',
          input: 'a<strong>b</strong>c<em>d</em>e',
          expected: '<strong>a<strong>b</strong>c<em>d</em>e</strong>'
        },
        {
          name: '连续格式标签',
          input: '<strong>1</strong><em>2</em><u>3</u>',
          expected: '<strong><strong>1</strong><em>2</em><u>3</u></strong>'
        },
        {
          name: '嵌套格式',
          input: '<strong><em>nested</em></strong>',
          expected: '<em>nested</em>'
        }
      ];

      testCases.forEach(({ name, input, expected }) => {
        console.log(`\n测试: ${name}`);
        console.log('输入:', input);

        const result = smartToggleFormat(input, 'bold');
        console.log('输出:', result);
        console.log('期望:', expected);

        expect(result).toBe(expected);
      });
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
  });
});
