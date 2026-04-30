// import MarkdownRenderer from "@/components/docs/MarkdownRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { createHeading } from "./heading";
import { createLI, createOL, createUL } from "./list";
import { createLink } from "./link";
import { createP } from "./paragraph";
import { createCode, createPre } from "./code";
import { createBlockquote } from "./blockquote";
import {
  createTable,
  createTHead,
  createTBody,
  createTr,
  createTh,
  createTd,
} from "./table";

export interface MarkdownProps {
  source: string;
  basePath?: string; // Used to calculate relative urls
  components?: Record<string, React.ComponentType<{ [key: string]: unknown }>>;
}

export const Markdown = ({ source, basePath, components }: MarkdownProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        h1: createHeading("h1", "text-3xl font-bold mt-8 mb-4 group"),
        h2: createHeading("h2", "text-2xl font-bold mt-8 mb-3 group"),
        h3: createHeading("h3", "text-xl font-bold mt-6 mb-3 group"),
        h4: createHeading("h4", "text-lg font-bold mt-6 mb-3 group"),
        h5: createHeading("h5", "text-base font-bold mt-6 mb-3 group"),
        h6: createHeading("h6", "text-sm font-bold mt-6 mb-3 group"),
        ol: createOL(),
        ul: createUL(),
        li: createLI(),
        a: createLink({ basePath }),
        p: createP(),
        code: createCode(),
        pre: createPre(),
        blockquote: createBlockquote(),
        table: createTable(),
        thead: createTHead(),
        tbody: createTBody(),
        tr: createTr(),
        th: createTh(),
        td: createTd(),
        ...components,
      }}
    >
      {source}
    </ReactMarkdown>
  );
};
