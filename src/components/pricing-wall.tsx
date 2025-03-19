import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollAnimation } from '@/components/scroll-animation';
import { Check, X, Clock } from 'lucide-react';
import appConfig from '../../app.config';
import { ReactNode } from 'react';

// Simple markdown parser for basic formatting
function renderMarkdown(text: string): ReactNode {
  // Replace **text** with <span className="text-accent">text</span>
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <span key={i} className="text-accent">
          {content}
        </span>
      );
    }
    return part;
  });
}

// Feature status icon mapping
const featureStatusIcons = {
  included: () => <Check className="h-5 w-5 text-accent flex-shrink-0 mr-2" />,
  excluded: () => <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mr-2" />,
  'coming-soon': () => (
    <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mr-2" />
  ),
};

interface PricingTierProps {
  tier: (typeof appConfig.pricing.tiers)[0];
  index: number;
  delay: number;
}

function PricingTier({ tier, index, delay }: PricingTierProps) {
  return (
    <ScrollAnimation
      type={tier.highlighted ? 'scale' : 'slide'}
      direction={
        tier.highlighted ? undefined : index === 0 ? 'right' : index === 2 ? 'left' : undefined
      }
      delay={delay}
      duration={0.6}
      className="h-full"
    >
      <Card
        className={`h-full flex flex-col ${
          tier.highlighted ? 'border-accent shadow-lg relative' : ''
        }`}
      >
        {tier.highlighted && tier.badge && (
          <div className="absolute -top-3 left-0 right-0 flex justify-center">
            <ScrollAnimation type="scale" delay={delay + 0.4} duration={0.3} whileHover>
              <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                {tier.badge}
              </span>
            </ScrollAnimation>
          </div>
        )}
        <CardHeader>
          <ScrollAnimation type="fade" delay={delay + 0.2} duration={0.4}>
            <CardTitle>{tier.name}</CardTitle>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-extrabold">{tier.price}</span>
              <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{tier.period}</span>
            </div>
            <CardDescription className="mt-2">{tier.description}</CardDescription>
          </ScrollAnimation>
        </CardHeader>
        <CardContent className="flex-grow">
          <ScrollAnimation type="fade" delay={delay + 0.3} duration={0.5}>
            <ul className="space-y-3">
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start">
                  <ScrollAnimation
                    type="scale"
                    delay={delay + 0.3 + featureIndex * 0.05}
                    duration={0.3}
                  >
                    {featureStatusIcons[feature.status as keyof typeof featureStatusIcons]?.() ||
                      featureStatusIcons['included']()}
                  </ScrollAnimation>
                  <span
                    className={`text-sm ${
                      feature.status === 'excluded' ? 'text-muted-foreground' : ''
                    }`}
                  >
                    {renderMarkdown(feature.text)}
                    {feature.status === 'coming-soon' && (
                      <span className="ml-1 text-xs text-yellow-500 dark:text-yellow-400">
                        (Coming Soon)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollAnimation>
        </CardContent>
        <CardFooter>
          <ScrollAnimation type="scale" delay={delay + 0.5} duration={0.4} whileHover whileTap>
            <Link href={tier.cta.href} className="w-full">
              <Button
                className={`w-full ${
                  tier.highlighted ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                }`}
                variant={tier.highlighted ? 'default' : 'outline'}
              >
                {tier.cta.label}
              </Button>
            </Link>
          </ScrollAnimation>
        </CardFooter>
      </Card>
    </ScrollAnimation>
  );
}

export function PricingWall() {
  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{renderMarkdown(appConfig.pricing.title)}</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(appConfig.pricing.subtitle)}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {appConfig.pricing.tiers.map((tier, index) => (
          <PricingTier key={index} tier={tier} index={index} delay={0.1 * (index + 1)} />
        ))}
      </div>
    </section>
  );
}
