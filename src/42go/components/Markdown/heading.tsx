import React from "react";

export const createHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
};

export function createHeading(
  Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
  className: string
): React.FC<React.HTMLAttributes<HTMLHeadingElement>> {
  const HeadingComponent = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
  >(({ children }, ref) => {
    return React.createElement(
      Tag,
      { className, ref, id: createHeadingId(children as string) },
      children
    );
  });
  HeadingComponent.displayName = `Markdown${Tag.toUpperCase()}`;
  return HeadingComponent;
}
