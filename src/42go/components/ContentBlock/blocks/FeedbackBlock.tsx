"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Markdown } from "@/42go/components/Markdown/Markdown";

export interface TFeedbackBlock {
  type: "feedback";
  title?: string;
  subtitle?: string;
  emailPlaceholder?: string;
  messagePlaceholder?: string;
  buttonLabel?: string;
  showNewsletter?: boolean;
  newsletterLabel?: string;
  feedback:
    | { type: "message"; content: string }
    | { type: "redirect"; url: string };
  resetLabel?: string;
}

export function FeedbackBlock(props: TFeedbackBlock) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    if (!message) {
      toast({
        title: "Message required",
        description: "Please enter your feedback message.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, newsletter }),
      });
      const data = await res.json();
      if (data.success) {
        if (props.feedback.type === "redirect") {
          window.location.href = props.feedback.url;
        } else {
          setSuccess(true);
          // Keep email so the form is pre-filled after reset
          setMessage("");
          setNewsletter(false);
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Submission failed.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Submission failed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validation helpers
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const isMessageValid = message.trim().length > 0;
  const canSubmit = !loading && isEmailValid && isMessageValid;

  return (
    <section className="py-16">
      <ScrollAnimation type="slideUp">
        <div className="text-center mb-12">
          {props.title && (
            <h2 className="text-3xl font-bold mb-2">
              <Markdown source={props.title} />
            </h2>
          )}
          {props.subtitle && (
            <ScrollAnimation type="fade">
              <div className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <Markdown source={props.subtitle} />
              </div>
            </ScrollAnimation>
          )}
        </div>
      </ScrollAnimation>
      <div className="max-w-md mx-auto">
        {success && props.feedback.type === "message" ? (
          <ScrollAnimation type="scale" delay={0.1}>
            <div className="flex flex-col items-center justify-center gap-4 p-8 bg-green-50 dark:bg-green-900/30 rounded-xl shadow-md animate-fade-in">
              <svg
                className="w-16 h-16 text-green-500 mb-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M8 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-lg font-semibold text-green-700 dark:text-green-200 text-center">
                <Markdown
                  source={
                    props.feedback.type === "message"
                      ? props.feedback.content || "Thank you for your feedback!"
                      : "Thank you for your feedback!"
                  }
                />
              </div>
              <Button
                variant="link"
                className="text-sm text-gray-500 hover:text-primary mt-2"
                onClick={() => {
                  setSuccess(false);
                  // Don't clear email, only reset message and newsletter
                  setMessage("");
                  setNewsletter(false);
                  setTimeout(() => {
                    textareaRef.current?.focus();
                  }, 0);
                }}
              >
                {props.resetLabel || "Send new feedback"}
              </Button>
            </div>
          </ScrollAnimation>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-transparent">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder={props.emailPlaceholder || "Your email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                placeholder={props.messagePlaceholder || "Your feedback"}
                rows={5}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMessage(e.target.value)
                }
                ref={textareaRef}
                required
              />
            </div>
            {props.showNewsletter && (
              <div className="flex items-center space-x-2">
                <input
                  id="newsletter"
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="accent-primary"
                />
                <label htmlFor="newsletter" className="text-sm">
                  {props.newsletterLabel || "Subscribe to newsletter"}
                </label>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? "Sending..." : props.buttonLabel || "Send Feedback"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
