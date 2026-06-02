import fs from "fs";
import Image from "next/image";
import path from "path";
import { cache, type ReactNode } from "react";
import Markdown from "@/42go/components/Markdown";
import { cn } from "@/42go/utils/utils";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import {
  resolveContentBlockPaddingProps,
  type TContentBlockPadding,
} from "@/42go/components/ContentBlock/render-component";

const readMarkdownFile = cache(async (filePath: string): Promise<string> => {
  return await fs.promises.readFile(/* turbopackIgnore: true */ filePath, "utf8");
});

export type TImageBlockAnimation = "none" | "fade" | "scale" | "slideUp";
export type TImageBlockAlign = "left" | "right" | "top" | "bottom";
export type TImageBlockStyle = "default" | "transparent";
export type TImageBlockVerticalAlign = "top" | "center" | "bottom";

export type TImageBlockContent = (
  | { source: string; path?: never }
  | { path: string; source?: never }
) & {
  valign?: TImageBlockVerticalAlign;
  animation?: TImageBlockAnimation;
};

export type TImageBlock = {
  type: "image";
  padding?: TContentBlockPadding;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes?: string;
    unoptimized?: boolean;
    style?: TImageBlockStyle;
    align?: TImageBlockAlign;
    valign?: TImageBlockVerticalAlign;
    animation?: TImageBlockAnimation;
  };
  content?: TImageBlockContent;
};

const imageOrderClasses: Record<TImageBlockAlign, string> = {
  left: "order-1",
  right: "order-1 md:order-2",
  top: "order-1",
  bottom: "order-1 md:order-2",
};

const contentOrderClasses: Record<TImageBlockAlign, string> = {
  left: "order-2",
  right: "order-2 md:order-1",
  top: "order-2",
  bottom: "order-2 md:order-1",
};

const verticalAlignClasses: Record<TImageBlockVerticalAlign, string> = {
  top: "self-start",
  center: "self-center",
  bottom: "self-end",
};

const imageFrameClasses: Record<TImageBlockStyle, string> = {
  default: "overflow-hidden rounded-lg border bg-muted/20",
  transparent: "overflow-visible bg-transparent",
};

const getLayoutClasses = (align: TImageBlockAlign, hasContent: boolean) => {
  if (!hasContent) return "flex justify-center";
  if (align === "top" || align === "bottom") {
    return "flex flex-col gap-8 md:gap-10";
  }
  return "grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10";
};

const resolveMarkdownContent = async (content: TImageBlockContent) => {
  if ("source" in content && content.source) return content.source;
  if (!("path" in content) || !content.path) return "";

  const filePath = path.isAbsolute(content.path)
    ? content.path
    : path.join(/* turbopackIgnore: true */ process.cwd(), content.path);

  return await readMarkdownFile(filePath);
};

const isLoopbackImageSource = (src: string) => {
  try {
    const { hostname } = new URL(src);
    return (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("127.")
    );
  } catch {
    return false;
  }
};

const MissingMarkdownWarning = ({ filePath }: { filePath: string }) => (
  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
    <h3 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">
      Unable to load markdown file
    </h3>
    <p className="text-sm text-yellow-700 dark:text-yellow-300">
      <strong>Path:</strong> {filePath}
    </p>
  </div>
);

const withAnimation = (
  children: ReactNode,
  animation: TImageBlockAnimation | undefined,
  className?: string
) => {
  if (!animation || animation === "none") {
    return className ? <div className={className}>{children}</div> : children;
  }
  return (
    <ScrollAnimation type={animation} className={className}>
      {children}
    </ScrollAnimation>
  );
};

export const ImageBlock = async ({ data }: { data: TImageBlock }) => {
  const { image, content } = data;
  const align = image.align ?? "left";
  const imageStyle = image.style ?? "default";
  const hasContent = Boolean(content);
  const unoptimized = image.unoptimized ?? isLoopbackImageSource(image.src);
  const paddingProps = resolveContentBlockPaddingProps(data.padding);
  const canVerticallyAlign = hasContent && (align === "left" || align === "right");
  const imageValign = image.valign ?? "center";
  const contentValign = content?.valign ?? "center";
  const imageSlotClasses = cn(
    imageOrderClasses[align],
    canVerticallyAlign && verticalAlignClasses[imageValign]
  );
  const contentSlotClasses = cn(
    contentOrderClasses[align],
    canVerticallyAlign && verticalAlignClasses[contentValign]
  );

  let markdown: ReactNode = null;

  if (content) {
    let markdownSource: string | null = null;
    const contentPath =
      "path" in content && typeof content.path === "string"
        ? content.path
        : "";

    try {
      markdownSource = await resolveMarkdownContent(content);
    } catch {
      markdown = <MissingMarkdownWarning filePath={contentPath} />;
    }

    if (markdownSource !== null) {
      markdown = <Markdown source={markdownSource} />;
    }
  }

  const imageNode = (
    <div
      className={cn(
        "w-full",
        imageFrameClasses[imageStyle],
        hasContent ? "max-w-2xl" : "max-w-4xl"
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={image.sizes}
        unoptimized={unoptimized}
        className="h-auto w-full object-cover"
      />
    </div>
  );

  const contentNode = hasContent ? (
    <div
      className={cn(
        "w-full max-w-2xl text-left"
      )}
    >
      {markdown}
    </div>
  ) : null;

  return (
    <section
      className={cn("w-full", paddingProps?.className)}
      style={paddingProps?.style}
      data-block="image"
    >
      <div
        className={cn(
          "mx-auto max-w-6xl items-center px-6",
          getLayoutClasses(align, hasContent)
        )}
      >
        {withAnimation(imageNode, image.animation, imageSlotClasses)}
        {contentNode && withAnimation(contentNode, content?.animation, contentSlotClasses)}
      </div>
    </section>
  );
};
