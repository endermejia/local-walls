/**
 * Regular expression pattern used to match mention syntax: @[Name](UUID)
 */
export const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export interface MentionSegment {
  text: string;
  mention?: {
    name: string;
    id: string;
  };
}

/**
 * Parses text and returns an array of segments (text and mentions).
 *
 * @param text The text to parse.
 * @returns Array of MentionSegment objects.
 */
export function parseMentions(
  text: string | null | undefined,
): MentionSegment[] {
  if (!text) {
    return [];
  }

  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  let match;

  // Reset lastIndex since MENTION_PATTERN is a global regex
  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      segments.push({ text: text.substring(lastIndex, match.index) });
    }

    // Add the mention
    segments.push({
      text: `@${match[1]}`,
      mention: {
        name: match[1],
        id: match[2],
      },
    });

    lastIndex = MENTION_PATTERN.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex) });
  }

  return segments;
}

/**
 * Extracts mentions from text and returns an array of unique user IDs.
 *
 * @param text The text to parse for mentions.
 * @returns Array of unique user IDs (UUIDs) found in the text.
 */
export function extractMentionIds(text: string): string[] {
  if (!text) {
    return [];
  }

  const ids = new Set<string>();
  let match;

  // Reset lastIndex because MENTION_PATTERN is global
  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    // match[2] corresponds to the ID captured by ([^)]+)
    const id = match[2];
    if (id) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}
