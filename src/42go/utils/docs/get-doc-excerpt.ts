import { type MDFile } from "../md";

export const getDocExcerpt = (doc: MDFile, trimAt: number = 15): string => {
  // 1. Frontmatter excerpt
  if (
    doc.data?.excerpt &&
    typeof doc.data.excerpt === "string" &&
    doc.data.excerpt.trim()
  ) {
    return doc.data.excerpt.trim();
  }

  // 2. First trimAt chars of plain content, rounded to word, no formatting
  if (doc.content && typeof doc.content === "string" && doc.content.trim()) {
    // Remove markdown formatting (basic)
    const plain = doc.content
      .replace(/`[^`]*`/g, "") // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove links
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italics
      .replace(/#+\s*/g, "") // Remove headings
      .replace(/>\s*/g, "") // Remove blockquotes
      .replace(/!\[[^\]]*\]\([^\)]*\)/g, "") // Remove images
      .replace(/^-\s+/gm, "") // Remove list dashes
      .replace(/\r?\n/g, " ") // Newlines to space
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();
    // Take first trimAt chars, round to closest word
    if (plain.length > trimAt) {
      let cut = plain.slice(0, trimAt);
      const nextSpace = plain.indexOf(" ", trimAt);
      if (nextSpace !== -1) cut = plain.slice(0, nextSpace);
      return cut.trim();
    }
    return plain;
  }

  // Chuck Norris fallback
  return "";
};
