"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import Markdown from "@/42go/components/Markdown";

export interface TWaitlistBlock {
  type: "waitlist";
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonLabel?: string;
  feedback:
    | { type: "message"; content: string }
    | { type: "redirect"; url: string };
}

export const WaitlistBlock = (props: TWaitlistBlock) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        if (props.feedback.type === "redirect") {
          // Internal route: use Next.js router, else full reload
          if (props.feedback.url.startsWith("/")) {
            router.push(props.feedback.url);
          } else {
            window.location.href = props.feedback.url;
          }
        } else {
          setSuccess(true);
        }
        setEmail("");
      } else {
        let msg = "Invalid email or server error.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        toast.error(msg);
        alert(msg);
      }
    } catch {
      toast.error("Something went roundhouse wrong.");
      alert("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12">
      <ScrollAnimation type="slideUp" delay={0.05}>
        <div className="text-center mb-8">
          {props.title && (
            <h2 className="text-2xl font-bold mb-2">
              <Markdown source={props.title} />
            </h2>
          )}
          {props.subtitle && (
            <div className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              <Markdown source={props.subtitle} />
            </div>
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
                  source={props.feedback.content || "You're on the list!"}
                />
              </div>
            </div>
          </ScrollAnimation>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder={props.placeholder || "Enter your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-label="Email address"
              disabled={loading}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email}
            >
              {loading ? "Joining..." : props.buttonLabel || "Join Waitlist"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};
