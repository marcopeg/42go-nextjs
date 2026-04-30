import { type DocFile } from "@/42go/utils/docs";
import Markdown, {
  createHeading,
  createUL,
  createLI,
  createLink,
} from "../Markdown";

export const SidebarContent = ({
  doc,
  basePath,
}: {
  doc: DocFile;
  basePath: string;
}) => {
  return (
    <Markdown
      source={doc.content}
      components={{
        a: createLink({
          basePath,
          className:
            "text-sm text-neutral-500 font-extralight hover:text-primary transition-colors",
        }),
        h1: createHeading("h1", "text-base mb-0"),
        h2: createHeading("h2", "text-base  mb-0"),
        h3: createHeading("h3", "text-base  mb-0"),
        h4: createHeading("h4", "text-base  mb-0"),
        h5: createHeading("h5", "text-base  mb-0"),
        h6: createHeading("h6", "text-base  mb-0"),
        ul: createUL({ className: "pl-0  mb-8" }),
        li: createLI({ className: "pl-0" }),
      }}
    />
  );
};
