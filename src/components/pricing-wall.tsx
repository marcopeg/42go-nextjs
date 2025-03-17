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
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Simple, Transparent Pricing</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the plan that&apos;s right for you and start building today.
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, index) => (
          <ScrollAnimation
            key={index}
            type={tier.highlighted ? 'scale' : 'slide'}
            direction={
              tier.highlighted
                ? undefined
                : index === 0
                  ? 'right'
                  : index === 2
                    ? 'left'
                    : undefined
            }
            delay={tier.delay}
            duration={0.6}
            className="h-full"
          >
            <Card
              className={`h-full flex flex-col ${
                tier.highlighted ? 'border-accent shadow-lg relative' : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <ScrollAnimation type="scale" delay={tier.delay + 0.4} duration={0.3} whileHover>
                    <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </ScrollAnimation>
                </div>
              )}
              <CardHeader>
                <ScrollAnimation type="fade" delay={tier.delay + 0.2} duration={0.4}>
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-extrabold">{tier.price}</span>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </ScrollAnimation>
              </CardHeader>
              <CardContent className="flex-grow">
                <ScrollAnimation type="fade" delay={tier.delay + 0.3} duration={0.5}>
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <ScrollAnimation
                          type="scale"
                          delay={tier.delay + 0.3 + featureIndex * 0.05}
                          duration={0.3}
                        >
                          <Check className="h-5 w-5 text-accent flex-shrink-0 mr-2" />
                        </ScrollAnimation>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollAnimation>
              </CardContent>
              <CardFooter>
                <ScrollAnimation
                  type="scale"
                  delay={tier.delay + 0.5}
                  duration={0.4}
                  whileHover
                  whileTap
                >
                  <Button
                    className={`w-full ${
                      tier.highlighted ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                    }`}
                    variant={tier.highlighted ? 'default' : 'outline'}
                  >
                    {tier.cta}
                  </Button>
                </ScrollAnimation>
              </CardFooter>
            </Card>
          </ScrollAnimation>
        ))}
      </div>
    </section>
  );
}
