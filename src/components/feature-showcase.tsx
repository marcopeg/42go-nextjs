import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollAnimation } from '@/components/scroll-animation';
import appConfig from '../../app.config';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <ScrollAnimation type="scale" delay={delay} className="h-full" duration={0.5}>
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <ScrollAnimation type="fade" delay={delay + 0.2} duration={0.4}>
            <div className="mb-2 text-accent">{icon}</div>
          </ScrollAnimation>
          <ScrollAnimation type="slide" direction="up" delay={delay + 0.3} duration={0.4}>
            <CardTitle className="text-xl">{title}</CardTitle>
          </ScrollAnimation>
        </CardHeader>
        <CardContent>
          <ScrollAnimation type="fade" delay={delay + 0.4} duration={0.4}>
            <CardDescription className="text-sm">{description}</CardDescription>
          </ScrollAnimation>
        </CardContent>
      </Card>
    </ScrollAnimation>
  );
}

export function FeatureShowcase() {
  // Use features from app.config.js with delay added
  const features = appConfig.features.items.map((feature, index) => ({
    icon: <feature.icon className="h-8 w-8" />,
    title: feature.title,
    description: feature.abstract,
    delay: 0.1 * (index + 1),
  }));

  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{appConfig.features.title}</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {appConfig.features.subtitle}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            delay={feature.delay}
          />
        ))}
      </div>
    </section>
  );
}
