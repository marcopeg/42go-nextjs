import Markdown from "@/42go/components/Markdown";
import { type MDFile } from "@/42go/utils/md";
import { DocHeader } from "./DocHeader";
import { extractHeadings } from "./TOCutils";
import { TOCInline } from "./TOCInline";
import { TOCSide } from "./TOCSide";

interface DocPageProps {
  doc: MDFile;
  basePath: string;
  slug: string[];
}

export const DocPage = ({ doc, basePath, slug }: DocPageProps) => {
  const headings = extractHeadings(doc.content);

  return (
    <div
      className={
        headings.length > 0
          ? "lg:grid lg:grid-cols-[3fr_1fr] lg:gap-6 xl:gap-8"
          : ""
      }
    >
      <div className="max-w-2xl" id="_top_">
        <DocHeader {...doc.data} />

        <TOCInline headings={headings} />

        <Markdown
          source={doc.content}
          basePath={[basePath, ...slug].join("/")}
        />
      </div>

      <TOCSide headings={headings} />
    </div>
  );
};
