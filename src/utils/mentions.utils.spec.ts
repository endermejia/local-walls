import { MENTION_PATTERN, extractMentionIds } from './mentions.utils';

describe('Mentions Utils', () => {
  describe('MENTION_PATTERN', () => {
    it('should match a valid mention', () => {
      const text = '@[John Doe](123-abc)';
      MENTION_PATTERN.lastIndex = 0;
      const match = MENTION_PATTERN.exec(text);
      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toBe('John Doe');
        expect(match[2]).toBe('123-abc');
      }
    });

    it('should not match invalid mentions', () => {
      const text = '@[John Doe(123-abc)';
      MENTION_PATTERN.lastIndex = 0;
      const match = MENTION_PATTERN.exec(text);
      expect(match).toBeNull();
    });
  });

  describe('extractMentionIds', () => {
    it('should return empty array for empty or null text', () => {
      expect(extractMentionIds('')).toEqual([]);
      expect(extractMentionIds(null as unknown as string)).toEqual([]);
      expect(extractMentionIds(undefined as unknown as string)).toEqual([]);
    });

    it('should extract a single mention ID', () => {
      const text = 'Hello @[User Name](uuid-1234)!';
      expect(extractMentionIds(text)).toEqual(['uuid-1234']);
    });

    it('should extract multiple mention IDs', () => {
      const text = 'Hey @[User1](id-1) and @[User2](id-2)!';
      expect(extractMentionIds(text)).toEqual(['id-1', 'id-2']);
    });

    it('should return unique IDs when mentions are duplicated', () => {
      const text = 'Hey @[User1](id-1) and again @[User1](id-1)!';
      expect(extractMentionIds(text)).toEqual(['id-1']);
    });

    it('should return empty array if no mentions are present', () => {
      const text = 'Just regular text with no mentions.';
      expect(extractMentionIds(text)).toEqual([]);
    });

    it('should parse mentions at the start and end of string correctly', () => {
      const text = '@[Start](id-start) text @[End](id-end)';
      expect(extractMentionIds(text)).toEqual(['id-start', 'id-end']);
    });
  });
});
