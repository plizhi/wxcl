import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseAIResponse } from '../ai';

describe('parseAIResponse', () => {
  it('parses valid JSON object', () => {
    const result = parseAIResponse<{ name: string; age: number }>(
      '{"name": "小明", "age": 10}'
    );
    expect(result).toEqual({ name: '小明', age: 10 });
  });

  it('parses valid JSON array', () => {
    const result = parseAIResponse<string[]>(
      '["item1", "item2", "item3"]'
    );
    expect(result).toEqual(['item1', 'item2', 'item3']);
  });

  it('parses nested JSON', () => {
    const result = parseAIResponse<{ strengths: string[]; opportunity_axis1: { dimension: string } }>(
      '{"strengths": ["亮点1", "亮点2"], "opportunity_axis1": {"dimension": "自主"}}'
    );
    expect(result?.strengths).toEqual(['亮点1', '亮点2']);
    expect(result?.opportunity_axis1.dimension).toBe('自主');
  });

  it('returns null for invalid JSON', () => {
    expect(parseAIResponse('not json at all')).toBeNull();
    expect(parseAIResponse('{ broken json }')).toBeNull();
    expect(parseAIResponse('')).toBeNull();
  });

  it('parses JSON with extra whitespace', () => {
    const result = parseAIResponse<{ key: string }>(
      '  {"key": "value"}  '
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('parses numbers and booleans', () => {
    const result = parseAIResponse<{ count: number; active: boolean }>(
      '{"count": 42, "active": true}'
    );
    expect(result?.count).toBe(42);
    expect(result?.active).toBe(true);
  });

  it('handles empty object', () => {
    const result = parseAIResponse<Record<string, unknown>>('{}');
    expect(result).toEqual({});
  });

  it('handles null value in JSON', () => {
    const result = parseAIResponse<{ value: null }>('{"value": null}');
    expect(result).toEqual({ value: null });
  });
});
