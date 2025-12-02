import { describe, it, expect } from 'vitest';
import { findSafeSplitPoint } from '../lib/context-manager';
import type { ModelMessage } from 'ai';

describe('findSafeSplitPoint', () => {
  describe('basic split point calculation', () => {
    it('should return 0 when keepRecentCount >= messages.length', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ];

      expect(findSafeSplitPoint(messages, 5)).toBe(0);
      expect(findSafeSplitPoint(messages, 2)).toBe(0);
    });

    it('should return correct split point for simple messages', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Response 3' },
      ];

      // Keep last 2 messages: should split at index 4
      expect(findSafeSplitPoint(messages, 2)).toBe(4);

      // Keep last 4 messages: should split at index 2
      expect(findSafeSplitPoint(messages, 4)).toBe(2);
    });

    it('should return 0 for empty messages array', () => {
      expect(findSafeSplitPoint([], 5)).toBe(0);
    });

    it('should return messages.length when keepRecentCount is 0', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];

      expect(findSafeSplitPoint(messages, 0)).toBe(2);
    });
  });

  describe('tool call boundary detection', () => {
    it('should not split between assistant tool-call and tool response', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me check that' },
            { type: 'tool-call', toolCallId: 'call_1', toolName: 'getTool', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_1', toolName: 'getTool', output: { type: 'text', value: 'result' } }] },
        { role: 'assistant', content: 'Here is the result' },
      ];

      // If we try to keep last 2 messages, ideal split would be at index 4
      // But index 4 is a tool response, so it should backtrack to index 3
      // (the assistant message with tool-call)
      expect(findSafeSplitPoint(messages, 2)).toBe(3);
    });

    it('should handle assistant with tool-call followed by tool response', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Old message' },
        { role: 'assistant', content: 'Old response' },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', toolCallId: 'call_1', toolName: 'tool', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_1', toolName: 'tool', output: { type: 'text', value: 'data' } }] },
        { role: 'user', content: 'New message' },
      ];

      // Keep last 2 messages: ideal split at index 3
      // Index 3 is tool response, should backtrack to index 2 (assistant with tool-call)
      expect(findSafeSplitPoint(messages, 2)).toBe(2);
    });

    it('should handle multiple tool calls in sequence', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Start' },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', toolCallId: 'call_1', toolName: 'tool1', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_1', toolName: 'tool1', output: { type: 'text', value: 'r1' } }] },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', toolCallId: 'call_2', toolName: 'tool2', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_2', toolName: 'tool2', output: { type: 'text', value: 'r2' } }] },
        { role: 'assistant', content: 'Final response' },
      ];

      // Keep last 3: ideal would be index 3, but that's in the middle of tool sequence
      // Should backtrack to index 3 (second assistant with tool-call)
      expect(findSafeSplitPoint(messages, 3)).toBe(3);
    });
  });

  describe('tool response without matching assistant', () => {
    it('should handle tool message when no matching assistant found within search window', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'call_1', toolName: 'tool', output: { type: 'text', value: 'orphan' } }] },
        { role: 'assistant', content: 'Response 3' },
      ];

      // Keep last 2: ideal split at index 5
      // Index 5 is tool message, but no matching assistant within search window
      // Should return ideal split point
      expect(findSafeSplitPoint(messages, 2)).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle messages with only text content', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'World' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'Good' },
      ];

      expect(findSafeSplitPoint(messages, 2)).toBe(2);
    });

    it('should handle assistant message with mixed content (text and tool-call)', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Old' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me help' },
            { type: 'tool-call', toolCallId: 'c1', toolName: 't1', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 't1', output: { type: 'text', value: 'data' } }] },
        { role: 'user', content: 'New' },
      ];

      // Keep last 2: would be index 2 (tool), should backtrack to index 1 (assistant)
      expect(findSafeSplitPoint(messages, 2)).toBe(1);
    });

    it('should handle assistant without tool-call followed by tool message', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: [{ type: 'text', text: 'Response without tool' }] },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 't1', output: { type: 'text', value: 'orphan' } }] },
        { role: 'user', content: 'Message 2' },
      ];

      // Keep last 2: ideal is index 2
      // Index 2 is tool, but previous assistant has no tool-call
      // Should stay at ideal split
      expect(findSafeSplitPoint(messages, 2)).toBe(2);
    });

    it('should respect search window limit of 3 messages', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 't1', input: {} }]
        },
        { role: 'user', content: 'M1' },
        { role: 'assistant', content: 'R1' },
        { role: 'user', content: 'M2' },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c2', toolName: 't2', output: { type: 'text', value: 'data' } }] },
        { role: 'assistant', content: 'Latest' },
      ];

      // Keep last 2: ideal is index 4 (tool message)
      // Search window is indices 4, 3, 2, 1 (max 3 back from ideal)
      // Should not find matching assistant at index 0 (outside window)
      expect(findSafeSplitPoint(messages, 2)).toBe(4);
    });
  });

  describe('boundary conditions', () => {
    it('should handle split point at very beginning', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'M1' },
        { role: 'assistant', content: 'R1' },
      ];

      expect(findSafeSplitPoint(messages, 10)).toBe(0);
    });

    it('should handle split point at very end', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'M1' },
        { role: 'assistant', content: 'R1' },
      ];

      expect(findSafeSplitPoint(messages, 0)).toBe(2);
    });

    it('should handle single message', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Only message' },
      ];

      expect(findSafeSplitPoint(messages, 0)).toBe(1);
      expect(findSafeSplitPoint(messages, 1)).toBe(0);
    });
  });

  describe('complex tool interaction scenarios', () => {
    it('should handle nested tool calls with proper boundaries', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Start' },
        { role: 'assistant', content: 'Ok' },
        {
          role: 'assistant',
          content: [
            { type: 'tool-call', toolCallId: 'c1', toolName: 't1', input: {} },
            { type: 'tool-call', toolCallId: 'c2', toolName: 't2', input: {} }
          ]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 't1', output: { type: 'text', value: 'r1' } }] },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c2', toolName: 't2', output: { type: 'text', value: 'r2' } }] },
        { role: 'assistant', content: 'Done' },
        { role: 'user', content: 'Latest' },
      ];

      // Keep last 3: ideal split at index 4
      // Index 4 is a tool result, should backtrack to index 2 (assistant with tool-calls)
      expect(findSafeSplitPoint(messages, 3)).toBe(2);
    });

    it('should handle tool call at split boundary correctly', () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'Old 1' },
        { role: 'assistant', content: 'Old Response 1' },
        { role: 'user', content: 'Old 2' },
        {
          role: 'assistant',
          content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 't1', input: {} }]
        },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 't1', output: { type: 'text', value: 'data' } }] },
        { role: 'assistant', content: 'Recent' },
      ];

      // Keep last 2: ideal is index 4, but should preserve tool sequence
      expect(findSafeSplitPoint(messages, 2)).toBe(3);
    });
  });
});
