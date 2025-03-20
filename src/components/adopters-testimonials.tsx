'use client';

import { ScrollAnimation } from '@/components/scroll-animation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
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

export function AdoptersTestimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const { testimonials } = appConfig;

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

      {/* Adopters Logos */}
      <ScrollAnimation type="fade" delay={0.3} duration={0.7}>
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          {testimonials.adopters.map((adopter, index) => (
            <ScrollAnimation
              key={adopter.id}
              type="scale"
              delay={0.3 + index * 0.1}
              duration={0.4}
              className="flex items-center justify-center"
            >
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center text-2xl font-bold">
                {adopter.logo}
              </div>
              <div className="mt-2 text-sm font-medium text-center">{adopter.name}</div>
            </ScrollAnimation>
          ))}
        </div>
      </ScrollAnimation>

      {/* Testimonials */}
      <div className="max-w-4xl mx-auto">
        <ScrollAnimation type="fade" delay={0.4} duration={0.6}>
          <Card className="border-accent/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="relative">
                {testimonials.quotes.map((quote, index) => (
                  <div
                    key={quote.id}
                    className={`transition-opacity duration-500 ${
                      index === activeTestimonial ? 'opacity-100' : 'opacity-0 absolute inset-0'
                    }`}
                  >
                    <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
                      <div className="text-xl italic mb-6 text-center">
                        &ldquo;{renderMarkdown(quote.content)}&rdquo;
                      </div>
                      <div className="flex items-center justify-center">
                        <Avatar className="h-12 w-12 mr-4">
                          <AvatarImage src={`/avatars/${quote.id}.png`} alt={quote.author.name} />
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {quote.author.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{quote.author.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {quote.author.role}, {quote.author.company}
                          </div>
                        </div>
                      </div>
                    </ScrollAnimation>
                  </div>
                ))}
              </div>

              {/* Testimonial Navigation */}
              <div className="flex justify-center mt-8 gap-2">
                {testimonials.quotes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === activeTestimonial
                        ? 'bg-accent scale-125'
                        : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`View testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollAnimation>
      </div>
    </section>
  );
}
