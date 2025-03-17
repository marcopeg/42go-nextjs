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
import { Check } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  delay: number;
}

export function PricingWall() {
  const tiers: PricingTier[] = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out the platform',
      features: ['Up to 3 projects', 'Basic analytics', 'Community support', '1 team member'],
      cta: 'Get Started',
      delay: 0.1,
    },
    {
      name: 'Pro',
      price: '$29',
      description: 'For serious developers and small teams',
      features: [
        'Unlimited projects',
        'Advanced analytics',
        'Priority support',
        'Up to 5 team members',
        'Custom domains',
        'API access',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
      delay: 0.2,
    },
    {
      name: 'Enterprise',
      price: '$99',
      description: 'For large teams with advanced needs',
      features: [
        'Everything in Pro',
        'Unlimited team members',
        'Dedicated support',
        'Custom integrations',
        'Advanced security',
        'SLA guarantees',
      ],
      cta: 'Contact Sales',
      delay: 0.3,
    },
  ];

  return (
    <section className="py-16">
      <ScrollAnimation type="fade" delay={0.05}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that&apos;s right for you and start building today.
          </p>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, index) => (
          <ScrollAnimation key={index} type="scale" delay={tier.delay} className="h-full">
            <Card
              className={`h-full flex flex-col ${
                tier.highlighted ? 'border-accent shadow-lg relative' : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-extrabold">{tier.price}</span>
                  <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/month</span>
                </div>
                <CardDescription className="mt-2">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-accent flex-shrink-0 mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    tier.highlighted ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                  }`}
                  variant={tier.highlighted ? 'default' : 'outline'}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          </ScrollAnimation>
        ))}
      </div>
    </section>
  );
}
