import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { cn } from "@/42go/utils/utils";
import type { Components } from "react-markdown";

// Utility type: require at least one of a set of keys
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

interface THeroContentFields {
  title?: string;
  subtitle?: string;
  actions?: Array<{
    label: string;
    href: string;
    style: "primary" | "secondary";
  }>;
}

type THeroAlignment = "left" | "center" | "right";

export type THeroBlock = {
  type: "hero";
  alignment?: THeroAlignment;
  backgroundImage?: string;
} & RequireAtLeastOne<THeroContentFields, "title" | "subtitle" | "actions">;

const heroAlignmentClasses: Record<
  THeroAlignment,
  {
    section: string;
    content: string;
    actions: string;
    backgroundPosition: string;
  }
> = {
  left: {
    section: "text-left",
    content: "mr-auto text-left",
    actions: "items-start sm:justify-start",
    backgroundPosition: "left center",
  },
  center: {
    section: "text-center",
    content: "mx-auto text-center",
    actions: "justify-center",
    backgroundPosition: "center",
  },
  right: {
    section: "text-right",
    content: "ml-auto text-right",
    actions: "items-end sm:justify-end",
    backgroundPosition: "right center",
  },
};

// Custom markdown components for accent styling
const markdownComponentsH1: Components = {
  strong: ({ children }) => <span className="text-primary">{children}</span>,
  p: ({ children }) => <span>{children}</span>,
};
const markdownComponentsH2: Components = {
  strong: ({ children }) => <span className="text-foreground">{children}</span>,
  p: ({ children }) => <span>{children}</span>,
};

export const HeroBlock = ({ data }: { data: THeroBlock }) => {
  const { title, subtitle, backgroundImage } = data;
  const alignment = data.alignment ?? "center";
  const alignmentClasses = heroAlignmentClasses[alignment];
  const actions = data.actions?.filter(Boolean) ?? [];
  const hasTitle = Boolean(title);
  const hasSubtitle = Boolean(subtitle);
  const hasActions = actions.length > 0;

  // Runtime safety: if misconfigured (shouldn't happen due to types), render nothing.
  if (!hasTitle && !hasSubtitle && !hasActions) return null;

  return (
    <section
      className={cn(
        "w-full py-10 md:py-20 flex flex-col items-center justify-center",
        alignmentClasses.section
      )}
    >
      <div
        className="hero-block relative w-full max-w-6xl mx-auto px-6"
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: alignmentClasses.backgroundPosition,
                borderRadius: "0.5rem",
              }
            : undefined
        }
      >
        {backgroundImage && (
          <div className="absolute inset-0 bg-black/50 rounded-lg" />
        )}

        <div className="relative z-10 py-16">
          {hasTitle && (
            <ScrollAnimation type="fade" delay={0.1}>
              <h1
                className={cn(
                  "text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl",
                  alignmentClasses.content
                )}
              >
                <ReactMarkdown components={markdownComponentsH1}>
                  {title as string}
                </ReactMarkdown>
              </h1>
            </ScrollAnimation>
          )}

          {!hasTitle && hasSubtitle && (
            // Escalate subtitle to h1 semantics if no title provided
            <ScrollAnimation type="fade" delay={0.1}>
              <h1
                className={cn(
                  "text-3xl md:text-5xl font-semibold tracking-tight mb-4 max-w-3xl",
                  alignmentClasses.content
                )}
              >
                <ReactMarkdown components={markdownComponentsH2}>
                  {subtitle as string}
                </ReactMarkdown>
              </h1>
            </ScrollAnimation>
          )}

          {hasTitle && hasSubtitle && (
            <ScrollAnimation type="fade" delay={0.2}>
              <p
                className={cn(
                  "text-xl text-muted-foreground mb-8 max-w-2xl",
                  alignmentClasses.content
                )}
              >
                <ReactMarkdown components={markdownComponentsH2}>
                  {subtitle as string}
                </ReactMarkdown>
              </p>
            </ScrollAnimation>
          )}

          {hasActions && (
            <ScrollAnimation
              type={hasTitle || hasSubtitle ? "scale" : "fade"}
              delay={0.3}
            >
              <div
                className={cn(
                  "flex flex-col sm:flex-row gap-4 mt-4",
                  alignmentClasses.actions
                )}
              >
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="lg"
                    variant={action.style === "primary" ? "default" : "outline"}
                    asChild
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            </ScrollAnimation>
          )}
        </div>
      </div>
    </section>
  );
};
