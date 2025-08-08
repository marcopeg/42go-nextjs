import Link from "next/link";
import Markdown from "@/42go/components/Markdown";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Check, X, Clock } from "lucide-react";

export interface TPricingBlock {
  type: "pricing";
  title?: string;
  subtitle?: string;
  tiers: Array<{
    name: string;
    price: string;
    period: string;
    description: string;
    features: Array<{
      text: string;
      status: "included" | "excluded" | "coming-soon";
    }>;
    cta: {
      label: string;
      href: string;
    };
    highlighted?: boolean;
    badge?: string;
  }>;
}

export const PricingBlock = ({ data }: { data: TPricingBlock }) => {
  const { title, subtitle, tiers } = data;

  const getFeatureIcon = (status: string) => {
    switch (status) {
      case "included":
        return <Check className="h-4 w-4 text-green-500" />;
      case "excluded":
        return <X className="h-4 w-4 text-red-500" />;
      case "coming-soon":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <section className="py-16">
      {title && (
        <ScrollAnimation type="fade" delay={0.05}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">
              <Markdown source={title} />
            </h2>
            {subtitle && (
              <ScrollAnimation type="fade" delay={0.2}>
                <div className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  <Markdown source={subtitle} />
                </div>
              </ScrollAnimation>
            )}
          </div>
        </ScrollAnimation>
      )}
      <div
        className={`grid grid-cols-1 md:grid-cols-${Math.min(
          tiers.length,
          3
        )} gap-6 items-end`}
      >
        {tiers.map((tier, index) => (
          <ScrollAnimation key={index} type="slideUp" delay={0.1 * (index + 1)}>
            <div
              className={`relative flex flex-col h-full p-8 rounded-lg border bg-background shadow-sm transition-transform duration-300 ${
                tier.highlighted
                  ? "border-primary shadow-lg scale-105 z-10"
                  : ""
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      tier.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-center">
                  <Markdown source={tier.name} />
                </h3>
                <div className="flex items-baseline justify-center mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground ml-1">
                    {tier.period}
                  </span>
                </div>
                <div className="mt-2 text-center text-muted-foreground">
                  <Markdown source={tier.description} />
                </div>
              </div>
              <ul className="space-y-3 flex-1 min-h-[180px]">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2 mt-1">
                      {getFeatureIcon(feature.status)}
                    </span>
                    <span
                      className={
                        feature.status === "excluded"
                          ? "text-muted-foreground line-through"
                          : ""
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className={`mt-auto pt-8 flex items-end`}
                style={{
                  transform: tier.highlighted ? "translateY(-10px)" : "",
                }}
              >
                <Link href={tier.cta.href} className="w-full">
                  <Button className="w-full" variant="default">
                    {tier.cta.label}
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollAnimation>
        ))}
      </div>
    </section>
  );
};
