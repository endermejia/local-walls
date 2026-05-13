import { describe, it, expect } from 'bun:test';
import { parseMentions } from './mentions.utils';

describe('parseMentions', () => {
  it('should return an empty array for null/undefined/empty input', () => {
    expect(parseMentions(null)).toEqual([]);
    expect(parseMentions(undefined)).toEqual([]);
    expect(parseMentions('')).toEqual([]);
  });

  it('should return a single segment for text without mentions', () => {
    const text = 'Hello world';
    const result = parseMentions(text);
    expect(result).toEqual([{ text: 'Hello world' }]);
  });

  it('should parse a single mention', () => {
    const text = 'Hello @[User Name](uuid-123)';
    const result = parseMentions(text);
    expect(result).toEqual([
      { text: 'Hello ' },
      {
        text: '@User Name',
        mention: { name: 'User Name', id: 'uuid-123' },
      },
    ]);
  });

  it('should parse multiple mentions', () => {
    const text = '@[User 1](id1) and @[User 2](id2)';
    const result = parseMentions(text);
    expect(result).toEqual([
      {
        text: '@User 1',
        mention: { name: 'User 1', id: 'id1' },
      },
      { text: ' and ' },
      {
        text: '@User 2',
        mention: { name: 'User 2', id: 'id2' },
      },
    ]);
  });

  it('should handle mentions at the end of text', () => {
    const text = 'Check this @[User](id)';
    const result = parseMentions(text);
    expect(result).toEqual([
      { text: 'Check this ' },
      {
        text: '@User',
        mention: { name: 'User', id: 'id' },
      },
    ]);
  });

  it('should handle text containing HTML special characters securely (implicitly by not parsing them)', () => {
    const text = 'Hello <script>alert(1)</script> @[User](id)';
    const result = parseMentions(text);
    expect(result).toEqual([
      { text: 'Hello <script>alert(1)</script> ' },
      {
        text: '@User',
        mention: { name: 'User', id: 'id' },
      },
    ]);
  });
});
