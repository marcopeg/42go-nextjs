import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollAnimation } from '@/components/scroll-animation';

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
  const features = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      ),
      title: 'Secure Authentication',
      description:
        'Multiple authentication options including password-based and social logins with comprehensive security features.',
      delay: 0.1,
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M20 7h-9" />
          <path d="M14 17H5" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
        </svg>
      ),
      title: 'Modern UI Framework',
      description:
        'Beautiful, responsive UI with Tailwind CSS and Shadcn components, featuring light/dark mode and customizable themes.',
      delay: 0.2,
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      ),
      title: 'Database Integration',
      description:
        'Powerful database management with DrizzleORM and PostgreSQL, including migration tools and Drizzle Studio.',
      delay: 0.3,
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="m7 11 2-2-2-2" />
          <path d="M11 13h4" />
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        </svg>
      ),
      title: 'Developer Experience',
      description:
        'Enhanced DX with TypeScript, ESLint, Prettier, and Husky for code quality and consistency.',
      delay: 0.4,
    },
  ];

  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Powerful Features</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to build modern web applications, right out of the box.
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
