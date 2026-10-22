import { VFile } from "vfile";
import { matter } from "vfile-matter";

export const parseFrontmatter = <
  TData extends Record<string, unknown> = Record<string, unknown>,
>(source: string): { content: string; data: TData } => {
  const file = new VFile(source.replace(/^\uFEFF/, ""));
  matter(file, {
    strip: true,
    yaml: { customTags: ["timestamp"], merge: true },
  });

  const data = file.data.matter;
  if (Object.prototype.toString.call(data) !== "[object Object]") {
    throw new Error("Frontmatter must be a YAML mapping.");
  }

  return { content: String(file), data: data as TData };
};
