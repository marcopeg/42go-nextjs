import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollAnimation } from '@/components/scroll-animation';
import appConfig from '../../../app.config';
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

export function HeroSection() {
  return (
    <section className="w-full py-20 md:py-32 flex flex-col items-center justify-center text-center">
      <ScrollAnimation type="fade" delay={0.1}>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl">
          {renderMarkdown(appConfig.landing?.hero?.title || '')}
        </h1>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.2}>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          {renderMarkdown(appConfig.landing?.hero?.subtitle || '')}
        </p>
      </ScrollAnimation>

      <ScrollAnimation type="scale" delay={0.3} whileHover whileTap>
        <div className="flex flex-col sm:flex-row gap-4">
          {appConfig.landing?.hero?.actions?.map((action, index) => (
            <Link key={index} href={action.href} passHref>
              <Button
                size="lg"
                variant={action.role === 'primary' ? 'default' : 'outline'}
                className={
                  action.role === 'primary'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : ''
                }
              >
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollAnimation>
    </section>
  );
}
