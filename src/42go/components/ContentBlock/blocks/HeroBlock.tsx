import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import type { Components } from "react-markdown";

export interface THeroBlock {
  type: "hero";
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  actions?: Array<{
    label: string;
    href: string;
    style: "primary" | "secondary";
  }>;
}

// Custom markdown components for accent styling
const markdownComponentsH1: Components = {
  strong: ({ children }) => <span className="text-primary">{children}</span>,
  p: ({ children }) => <span>{children}</span>,
};
const markdownComponentsH2: Components = {
  strong: ({ children }) => <span className="text-foreground">{children}</span>,
  p: ({ children }) => <span>{children}</span>,
};

export function HeroBlock({ data }: { data: THeroBlock }) {
  const { title, subtitle, backgroundImage, actions } = data;

  return (
    <section className="w-full py-10 md:py-20 flex flex-col items-center justify-center text-center">
      <div
        className="hero-block relative w-full max-w-6xl mx-auto px-6"
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "0.5rem",
              }
            : undefined
        }
      >
        {backgroundImage && (
          <div className="absolute inset-0 bg-black/50 rounded-lg" />
        )}

        <div className="relative z-10 py-16">
          <ScrollAnimation type="fade" delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl mx-auto">
              <ReactMarkdown components={markdownComponentsH1}>
                {title}
              </ReactMarkdown>
            </h1>
          </ScrollAnimation>

          {subtitle && (
            <ScrollAnimation type="fade" delay={0.2}>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                <ReactMarkdown components={markdownComponentsH2}>
                  {subtitle}
                </ReactMarkdown>
              </p>
            </ScrollAnimation>
          )}

          {actions && actions.length > 0 && (
            <ScrollAnimation type="scale" delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
}
