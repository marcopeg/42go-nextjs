'use client';

import { useState, useRef } from 'react';
import { ScrollAnimation } from '@/components/scroll-animation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import dynamic from 'next/dynamic';
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

// Dynamically import ReCAPTCHA to avoid SSR issues
const ReCAPTCHA = dynamic(() => import('react-google-recaptcha'), {
  ssr: false,
});

// Check if reCAPTCHA is enabled
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const isCaptchaEnabled = !!RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.length > 0;

// Define a type for the reCAPTCHA instance
type ReCaptchaInstance = {
  reset: () => void;
};

export function FeedbackForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaInstance | null>(null);
  const { toast } = useToast();
  const { feedback } = appConfig;

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const resetForm = () => {
    setEmail('');
    setMessage('');
    setCaptchaToken(null);
    if (isCaptchaEnabled && recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !message) {
      toast({
        title: feedback.form.errors.missing.title,
        description: feedback.form.errors.missing.message,
        variant: 'destructive',
      });
      return;
    }

    // Only check for captcha token if captcha is enabled
    if (isCaptchaEnabled && !captchaToken) {
      toast({
        title: feedback.form.errors.captcha.title,
        description: feedback.form.errors.captcha.message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message,
          captchaToken: captchaToken || 'captcha-disabled',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || feedback.form.errors.default.message);
      }

      toast({
        title: feedback.form.success.title,
        description: feedback.form.success.message,
      });

      resetForm();
    } catch (error) {
      toast({
        title: feedback.form.errors.default.title,
        description: error instanceof Error ? error.message : feedback.form.errors.default.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16">
      <ScrollAnimation type="slide" direction="down" delay={0.05} duration={0.6}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{renderMarkdown(feedback.title)}</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(feedback.subtitle)}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.3} duration={0.6}>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{feedback.form.title}</CardTitle>
            <CardDescription>{feedback.form.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {feedback.form.fields.email.label}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={feedback.form.fields.email.placeholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  {feedback.form.fields.message.label}
                </label>
                <Textarea
                  id="message"
                  placeholder={feedback.form.fields.message.placeholder}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={feedback.form.fields.message.rows}
                  required
                />
              </div>

              {isCaptchaEnabled && (
                <div className="flex justify-center my-4">
                  <ReCAPTCHA
                    key="recaptcha"
                    sitekey={RECAPTCHA_SITE_KEY || ''}
                    onChange={handleCaptchaChange}
                    onLoad={() => {
                      // Store the ref after the component is loaded
                      if (typeof window !== 'undefined') {
                        const recaptchaElement = document.querySelector('.g-recaptcha');
                        if (recaptchaElement) {
                          // @ts-expect-error - The global grecaptcha object is not typed
                          recaptchaRef.current = window.grecaptcha;
                        }
                      }
                    }}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isSubmitting || (isCaptchaEnabled && !captchaToken)}
              >
                {isSubmitting ? feedback.form.button.loadingLabel : feedback.form.button.label}
              </Button>
            </form>
          </CardContent>
        </Card>
      </ScrollAnimation>
    </section>
  );
}
