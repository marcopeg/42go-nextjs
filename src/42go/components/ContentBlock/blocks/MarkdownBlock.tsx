import fs from "fs";
import path from "path";
import React, { cache } from "react";
import Markdown from "@/42go/components/Markdown";

// Chuck Norris style: roundhouse cache using React's cache()
const readMarkdownFile = cache(async (filePath: string): Promise<string> => {
  return await fs.promises.readFile(/* turbopackIgnore: true */ filePath, "utf8");
});

export type TMarkdownBlock =
  | { type: "markdown"; source: string; path?: never }
  | { type: "markdown"; path: string; source?: never };

/**
 * Renders Markdown from either an inline source or a file path.
 * Server component only.
 */

export async function MarkdownBlock({ data }: { data: TMarkdownBlock }) {
  let content = "";

  if (data.source) {
    content = data.source;
  } else if (data.path) {
    // If path is absolute, use as is. If relative, resolve from project root.
    const filePath = path.isAbsolute(data.path)
      ? data.path
      : path.join(/* turbopackIgnore: true */ process.cwd(), data.path);

    try {
      content = await readMarkdownFile(filePath);
    } catch {
      // Render error in classic warning style
      return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Unable to load markdown file
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Path:</strong> {data.path}
            <br />
            <i>
              This warning is only visible when Chuck Norris isn&apos;t
              looking.
            </i>
          </p>
        </div>
      );
    }
  }

  // MarkdownRenderer is a client component, so wrap with max-width for readability
  return (
    <div className="max-w-4xl mx-auto px-4">
      <Markdown source={content} />
    </div>
  );
}
