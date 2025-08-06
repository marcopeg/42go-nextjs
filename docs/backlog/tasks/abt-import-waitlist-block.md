# Import Waitlist Block [abt]

This story is about importing a _WaitlistBlock_ and its relative counterpart for backend and database migration from a legacy project. It should become one of the blocks available to the _ContentBlock_ component.

NOTE: this component should be added to the default _server_ components list so that it is possible to use it in a _DynamicPage_

## Feature Behavior Details

This is a "join the waitlist" feature.
The user provides their email to receive early access.
This task is only about saving the email in the db and provide a visual feedback.
The visual feedback can be a markdown message passed as configuration, or a redirect url that we should navigate to after adding the email.
Keep the backend at bare minimum implementation.
No need to send confirmation emails, that will be done by another system.
Validate the email both in the client and in the backend.

## Legacy sourcecode for inspiration

This legacy code is provided as a source of inspiration to build the functionality from a similar functionality that already existed.

**feedback-form.tsx**

```ts
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollAnimation } from "@/components/scroll-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import appConfig from "../../../app.config";
import { ReactNode } from "react";

// Simple markdown parser for basic formatting
function renderMarkdown(text: string): ReactNode {
  // Replace **text** with <span className="text-accent">text</span>
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
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

export function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const feedback = appConfig.landing?.feedback;

  if (!feedback) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message
      toast({
        title: feedback.form.success.title,
        description: feedback.form.success.message,
      });

      // Reset form
      setEmail("");
      setMessage("");
    } catch {
      // Show error message
      toast({
        title: feedback.form.errors.default.title,
        description: feedback.form.errors.default.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16">
      <ScrollAnimation
        type="slide"
        direction="down"
        delay={0.05}
        duration={0.6}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">
            {renderMarkdown(feedback.title)}
          </h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(feedback.subtitle)}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="max-w-md mx-auto">
        <Card>
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  rows={feedback.form.fields.message.rows}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? feedback.form.button.loadingLabel
                  : feedback.form.button.label}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
```

**input.tsx**

```ts
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
```

**card.tsx**

```ts
import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-[data-slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
```

**scroll-animation.tsx**

```ts
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { UIAnimation } from "@/components/ui-animation";

interface ScrollAnimationProps {
  children: ReactNode;
  type?: "fade" | "slide" | "scale" | "rotate" | "bounce";
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  whileHover?: boolean;
  whileTap?: boolean;
  disableOnMobile?: boolean;
  threshold?: number;
}

export function ScrollAnimation({
  children,
  threshold = 0.1,
  ...animationProps
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, no need to observe anymore
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        }
      },
      {
        threshold,
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return (
    <div ref={ref} className="min-h-[1px]">
      {isVisible && <UIAnimation {...animationProps}>{children}</UIAnimation>}
    </div>
  );
}
```

**use-toast.tsx**

```ts
// Inspired by react-hot-toast library
import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Define action types as const object
const ACTION_TYPES = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type Action =
  | {
      type: typeof ACTION_TYPES.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof ACTION_TYPES.UPDATE_TOAST;
      toast: Partial<ToasterToast>;
    }
  | {
      type: typeof ACTION_TYPES.DISMISS_TOAST;
      toastId?: ToasterToast["id"];
    }
  | {
      type: typeof ACTION_TYPES.REMOVE_TOAST;
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: ACTION_TYPES.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ACTION_TYPES.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case ACTION_TYPES.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case ACTION_TYPES.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case ACTION_TYPES.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({
      type: ACTION_TYPES.UPDATE_TOAST,
      toast: { ...props, id },
    });
  const dismiss = () =>
    dispatch({ type: ACTION_TYPES.DISMISS_TOAST, toastId: id });

  dispatch({
    type: ACTION_TYPES.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: ACTION_TYPES.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
```

**app/api/feedback/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";

// Check if reCAPTCHA is enabled
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const isCaptchaEnabled =
  !!RECAPTCHA_SECRET_KEY && RECAPTCHA_SECRET_KEY.length > 0;

// Function to verify reCAPTCHA token
async function verifyCaptcha(token: string): Promise<boolean> {
  // If captcha is disabled or token is the special 'captcha-disabled' value, return true
  if (!isCaptchaEnabled || token === "captcha-disabled") {
    return true;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
      }
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error verifying captcha:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, message, captchaToken } = await request.json();

    // Validate input
    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      );
    }

    // Only require captcha token if captcha is enabled
    if (isCaptchaEnabled && !captchaToken) {
      return NextResponse.json(
        { error: "Captcha token is required when captcha is enabled" },
        { status: 400 }
      );
    }

    // Verify captcha
    const isValidCaptcha = await verifyCaptcha(
      captchaToken || "captcha-disabled"
    );
    if (!isValidCaptcha) {
      return NextResponse.json(
        { error: "Invalid captcha. Please try again." },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent");

    // Insert feedback into database
    await db.insert(feedback).values({
      id: uuidv4(),
      email,
      message,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "An error occurred while submitting your feedback" },
      { status: 500 }
    );
  }
}
```

**add-feedback-table.migration.js**

```js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("feedback", (table) => {
    table.text("id").primary().notNullable();
    table.text("email").notNullable();
    table.text("message").notNullable();
    table.text("ip_address");
    table.text("user_agent");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("feedback");
};
```

Important notes on the legacy code:

- some frontend components are shadcn components and it might be better installing those instead of copying them over
- make sure you use the primary color correctly so that it implements the theme's leading color
- this legacy feature represent a feedback form, but the feature that we are implementing should implement a "join the waitlist" functionality where the user simply provide their email
