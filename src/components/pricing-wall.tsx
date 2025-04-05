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

interface PricingTierProps {
  tier: {
    name: string;
    price: string;
    period: string;
    description: string;
    features: {
      text: string;
      status: string;
    }[];
    cta: {
      label: string;
      href: string;
    };
    highlighted?: boolean;
    badge?: string;
  };
  delay: number;
}

function PricingTier({ tier, delay }: PricingTierProps) {
  const getFeatureIcon = (status: string) => {
    switch (status) {
      case 'included':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'excluded':
        return <X className="h-4 w-4 text-red-500" />;
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <ScrollAnimation type="slide" direction="up" delay={delay} duration={0.6}>
      <Card className={`h-full ${tier.highlighted ? 'border-accent shadow-lg scale-105' : ''}`}>
        {tier.badge && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
              {tier.badge}
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{tier.name}</CardTitle>
          <div className="flex items-baseline mt-4">
            <span className="text-4xl font-bold">{tier.price}</span>
            <span className="text-muted-foreground ml-1">{tier.period}</span>
          </div>
          <CardDescription className="mt-2">{tier.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2 mt-1">{getFeatureIcon(feature.status)}</span>
                <span
                  className={
                    feature.status === 'excluded' ? 'text-muted-foreground line-through' : ''
                  }
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Link href={tier.cta.href} className="w-full">
            <Button
              className={`w-full ${
                tier.highlighted ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
              }`}
            >
              {tier.cta.label}
            </Button>
          </Link>
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
          <h2 className="text-3xl font-bold mb-2">
            {renderMarkdown(appConfig.landing?.pricing?.title || '')}
          </h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(appConfig.landing?.pricing?.subtitle || '')}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {appConfig.landing?.pricing?.tiers?.map((tier, index) => (
          <PricingTier key={index} tier={tier} delay={0.1 * (index + 1)} />
        ))}
      </div>
    </section>
  );
}
