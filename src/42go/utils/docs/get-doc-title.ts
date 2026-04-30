import { type MDFile } from "../md";

export const getDocTitle = (doc: MDFile, trimAt: number = 15): string => {
  // 1. Frontmatter title
  if (
    doc.data?.title &&
    typeof doc.data.title === "string" &&
    doc.data.title.trim()
  ) {
    return doc.data.title.trim();
  }

  // 2. First markdown heading
  const headingMatch = doc.content.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }

  // 3. First X chars of excerpt
  if (doc.excerpt && typeof doc.excerpt === "string" && doc.excerpt.trim()) {
    return doc.excerpt.trim().slice(0, trimAt);
  }

  // 4. First X chars of content
  if (doc.content && typeof doc.content === "string" && doc.content.trim()) {
    return doc.content.trim().slice(0, trimAt);
  }

  // 5. Filename logic
  if (doc.path) {
    const parts = doc.path.split("/").filter(Boolean);
    const file = parts.pop() || "";
    let name = file.replace(/\.[^.]+$/, "");
    if (["readme", "index"].includes(name.toLowerCase()) && parts.length) {
      name = parts.pop()!;
    }
    return name;
  }

  // Chuck Norris fallback
  return "Untitled";
};
