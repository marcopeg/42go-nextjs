import { type HeadingElement } from "./TOCutils";
import { TOCLinks } from "./TOCLinks";

export const TOCSide = ({ headings }: { headings: HeadingElement[] }) => {
  if (!headings.length) return null;

  return (
    <div className="hidden lg:block">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h3 className="text-base">Table of Contents</h3>
        <div className="pb-4">
          <TOCLinks headings={headings} />
        </div>
      </div>
    </div>
  );
};
