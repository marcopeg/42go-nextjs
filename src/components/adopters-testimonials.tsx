'use client';

import { ScrollAnimation } from '@/components/scroll-animation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

interface Testimonial {
  id: number;
  content: string;
  author: {
    name: string;
    role: string;
    company: string;
    avatar: string;
  };
}

interface Adopter {
  id: number;
  name: string;
  logo: string;
}

export function AdoptersTestimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      content:
        "This boilerplate saved us weeks of setup time. The authentication system is robust and the UI components are beautiful. We've been able to focus on building our product instead of infrastructure.",
      author: {
        name: 'Sarah Johnson',
        role: 'CTO',
        company: 'FinTech Innovations',
        avatar: 'SJ',
      },
    },
    {
      id: 2,
      content:
        "I've used many boilerplates before, but this one stands out for its clean architecture and thoughtful design. The documentation is excellent and it was easy to customize to our needs.",
      author: {
        name: 'Michael Chen',
        role: 'Lead Developer',
        company: 'HealthTech Solutions',
        avatar: 'MC',
      },
    },
    {
      id: 3,
      content:
        'The developer experience is exceptional. From the first git clone to deployment, everything just works. The code quality is top-notch and the components are well-organized.',
      author: {
        name: 'Emily Rodriguez',
        role: 'Frontend Architect',
        company: 'E-commerce Platform',
        avatar: 'ER',
      },
    },
  ];

  const adopters: Adopter[] = [
    { id: 1, name: 'TechCorp', logo: 'TC' },
    { id: 2, name: 'InnovateLabs', logo: 'IL' },
    { id: 3, name: 'FutureSystems', logo: 'FS' },
    { id: 4, name: 'DataFlow', logo: 'DF' },
    { id: 5, name: 'CloudNine', logo: 'CN' },
    { id: 6, name: 'DevStudio', logo: 'DS' },
  ];

  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Trusted by Developers Worldwide</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join hundreds of companies building better products with our boilerplate
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      {/* Adopters Logos */}
      <ScrollAnimation type="fade" delay={0.3} duration={0.7}>
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          {adopters.map((adopter, index) => (
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
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id}
                    className={`transition-opacity duration-500 ${
                      index === activeTestimonial ? 'opacity-100' : 'opacity-0 absolute inset-0'
                    }`}
                  >
                    <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
                      <div className="text-xl italic mb-6 text-center">
                        &ldquo;{testimonial.content}&rdquo;
                      </div>
                      <div className="flex items-center justify-center">
                        <Avatar className="h-12 w-12 mr-4">
                          <AvatarImage
                            src={`/avatars/${testimonial.id}.png`}
                            alt={testimonial.author.name}
                          />
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {testimonial.author.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{testimonial.author.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {testimonial.author.role}, {testimonial.author.company}
                          </div>
                        </div>
                      </div>
                    </ScrollAnimation>
                  </div>
                ))}
              </div>

              {/* Testimonial Navigation */}
              <div className="flex justify-center mt-8 gap-2">
                {testimonials.map((_, index) => (
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
