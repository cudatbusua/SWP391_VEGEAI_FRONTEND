const blockTags = /<\/?(?:address|article|blockquote|dd|div|dl|dt|h[1-6]|li|ol|p|pre|section|ul)\b[^>]*>/gi;
const hiddenContent = /<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const entities: Record<string, string> = {
  amp: '&',
  apos: "'",
  ldquo: '“',
  lsquo: '‘',
  mdash: '—',
  ndash: '–',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
};

function decodeEntity(entity: string): string {
  if (entity[1] === '#') {
    const hexadecimal = entity[2]?.toLowerCase() === 'x';
    const value = Number.parseInt(entity.slice(hexadecimal ? 3 : 2, -1), hexadecimal ? 16 : 10);
    return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  }
  return entities[entity.slice(1, -1).toLowerCase()] ?? entity;
}

export function blogContentForEditor(content: string): string {
  if (!/<\/?[a-z][\s\S]*>/i.test(content)) return content;

  // Older posts store HTML; turn block boundaries into paragraphs before removing markup.
  return content
    .replace(hiddenContent, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(blockTags, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, decodeEntity)
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
