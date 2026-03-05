/**
 * Regular expression pattern used to match mention syntax: @[Name](UUID)
 */
export const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

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
