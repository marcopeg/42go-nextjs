'use client';

import { ScrollAnimation } from '@/components/scroll-animation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import appConfig from '../../app.config';
import { ReactNode } from 'react';
import { TestimonialConfig } from '@/lib/app.config';

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

export function AdoptersTestimonials() {
  const testimonials = appConfig.landing?.testimonials as TestimonialConfig | undefined;

  if (!testimonials) {
    return null;
  }

  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{renderMarkdown(testimonials.title)}</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(testimonials.subtitle)}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      {/* Adopters Grid */}
      {testimonials.adopters && testimonials.adopters.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {testimonials.adopters.map(adopter => (
            <ScrollAnimation key={adopter.id} type="fade" delay={0.1} duration={0.5}>
              <Card className="h-24 flex items-center justify-center">
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{adopter.logo}</div>
                </CardContent>
              </Card>
            </ScrollAnimation>
          ))}
        </div>
      )}

      {/* Testimonials Grid */}
      {testimonials.quotes && testimonials.quotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.quotes.map(quote => (
            <ScrollAnimation key={quote.id} type="slide" direction="up" delay={0.1} duration={0.6}>
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex flex-col h-full">
                    <div className="flex-grow">
                      <p className="text-lg italic mb-6">&ldquo;{quote.content}&rdquo;</p>
                    </div>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        <AvatarImage src={`/avatars/${quote.author.avatar}.jpg`} />
                        <AvatarFallback>{quote.author.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{quote.author.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.author.role} at {quote.author.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollAnimation>
          ))}
        </div>
      )}
    </section>
  );
}
