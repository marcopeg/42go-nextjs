'use client';

import { useState, useRef } from 'react';
import { ScrollAnimation } from '@/components/scroll-animation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import dynamic from 'next/dynamic';

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
        title: 'Missing information',
        description: 'Please provide both email and message.',
        variant: 'destructive',
      });
      return;
    }

    // Only check for captcha token if captcha is enabled
    if (isCaptchaEnabled && !captchaToken) {
      toast({
        title: 'CAPTCHA required',
        description: 'Please complete the CAPTCHA verification.',
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
        throw new Error(data.error || 'Something went wrong');
      }

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback! We will get back to you soon.',
      });

      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit feedback',
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
          <h2 className="text-3xl font-bold mb-2">Get in Touch</h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions or feedback? We&apos;d love to hear from you.
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.3} duration={0.6}>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
            <CardDescription>
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Your message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
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
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </ScrollAnimation>
    </section>
  );
}
