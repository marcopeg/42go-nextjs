"use client";

import { type HeadingElement } from "./TOCutils";

export const TOCLinks = ({ headings }: { headings: HeadingElement[] }) => {
  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();

    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    // Calculate offset for sticky header (adjust this value as needed)
    const headerOffset = 100; // pixels
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });

    // Update URL hash without jumping
    window.history.pushState(null, "", `#${targetId}`);
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.history.pushState(null, "", window.location.pathname);
  };

  return (
    <ul className="pl-0 ml-0">
      {headings.map((heading, index) => {
        const level = parseInt(heading.tagName.substring(1)); // H1=1, H2=2, H3=3
        const nextHeading = headings[index + 1];
        const nextLevel = nextHeading
          ? parseInt(nextHeading.tagName.substring(1))
          : null;
        const isLastInSubGroup = nextLevel && nextLevel <= level;

        // Calculate indentation based on heading level (H1=no indent, H2=indent, H3=more indent)
        let indentClass = "";
        if (level === 1) indentClass = "ml-0 pl-0";
        // Explicitly zero margin and padding for H1
        else if (level === 2) indentClass = "ml-0";
        else if (level === 3) indentClass = "ml-4";

        const marginClass = isLastInSubGroup ? "mb-2" : "";

        return (
          <li key={heading.id} className={`${indentClass} ${marginClass}`}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className="text-sm text-neutral-500 font-extralight hover:text-primary transition-colors"
            >
              {heading.textContent}
            </a>
          </li>
        );
      })}
      <li
        key={"top"}
        className="hidden lg:block border-t border-neutral-200 mt-2 pt-2"
      >
        <a
          href={`#_top_`}
          onClick={scrollToTop}
          className="text-sm text-neutral-500 font-extralight hover:text-primary transition-colors"
        >
          Back to top
        </a>
      </li>
    </ul>
  );
};
