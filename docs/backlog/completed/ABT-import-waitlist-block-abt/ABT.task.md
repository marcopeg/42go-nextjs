---
taskId: ABT
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Import Waitlist Block [abt]

Create a WaitlistBlock component for the ContentBlock system that allows users to join a waitlist by providing their email address. This component will include both frontend UI and backend API integration.

## Goals

- [ ] Create WaitlistBlock component following existing ContentBlock patterns
- [ ] Add database migration for waitlist table
- [ ] Implement API endpoint for email submission
- [ ] Add client-side email validation and form handling
- [ ] Support both success message and redirect options for feedback
- [ ] Add WaitlistBlock to server ContentBlock exports
- [ ] Follow existing architecture patterns from HeroBlock/DemoBlock

## Acceptance Criteria

- [ ] WaitlistBlock component created in `/src/42go/components/ContentBlock/blocks/WaitlistBlock.tsx`
- [ ] Component follows ContentBlock interface pattern with TWaitlistBlock type
- [ ] Database migration creates `waitlists` table with UUID primary key and unique email constraint
- [ ] API endpoint at `/api/waitlist` handles POST requests with email validation
- [ ] Client-side form validates email format before submission
- [ ] Success feedback uses toast notifications or redirects based on configuration
- [ ] Component uses existing UI components (Button, Input) and Markdown for content
- [ ] Component uses simple Tailwind classes without Card wrapper components
- [ ] Component added to server ContentBlock blocksMap and exported types
- [ ] Error handling for duplicate emails (silently succeed) and server errors
- [ ] Mobile-responsive design consistent with other blocks

## Feature Behavior Details

This is a "join the waitlist" feature where users provide their email to receive early access notifications. The implementation focuses on:

- **Email Collection**: Simple form with email input and submit button
- **Database Storage**: Store email, timestamp, IP address, and user agent for analytics
- **Visual Feedback**: Either display markdown success message or redirect to thank-you page
- **Validation**: Client-side email format validation plus server-side validation
- **Minimal Backend**: Basic email storage without confirmation emails (handled by external systems)
- **Error Handling**: Graceful handling of duplicate emails and validation errors

## Development Plan

### Pre-Implementation Analysis

**Current Project State:**

- ✅ Markdown component available at `@/42go/components/Markdown`
- ✅ Button component available at `@/components/ui/button`
- ✅ ScrollAnimation component available at `@/components/ui/scroll-animation`
- ❓ Input component needs verification/installation
- ❓ Toast system needs verification/installation
- ❓ UUID extension for PostgreSQL needs installation in migration

**Dependencies Assessment:**

- Database: PostgreSQL with Knex.js, no UUID extension detected in existing migrations
- UI Components: shadcn/ui system partially installed
- Styling: Tailwind CSS with theme support
- Authentication: NextAuth.js with database sessions

### Implementation Strategy

#### Phase 1: Dependencies and Infrastructure (30 min)

1. **Install Missing UI Components**

   ```bash
   npx shadcn@latest add input toast
   ```

2. **Create Database Migration with UUID Support**

   - File: `/knex/migrations/20250807_waitlists.js`
   - Enable UUID extension idempotently
   - Create waitlists table with proper constraints

3. **Verify getDB() Integration**
   - Ensure database connection singleton works properly
   - Test migration execution `make migrate`

#### Phase 2: API Endpoint Implementation (45 min)

1. **Create Waitlist API Route**

   - File: `/src/app/api/waitlist/route.ts`
   - Use `appRoute` wrapper for multi-app compatibility
   - Implement email validation (client + server)
   - Handle duplicate emails silently (return success)
   - Store IP address and user agent for analytics

2. **API Features:**
   - Email format validation using built-in HTML5 + server regex
   - Graceful error handling with proper HTTP status codes
   - Request metadata capture (IP, User-Agent)
   - Multi-app support via existing `appRoute` pattern

#### Phase 3: WaitlistBlock Component (60 min)

1. **Create Component Structure**

   - File: `/src/42go/components/ContentBlock/blocks/WaitlistBlock.tsx`
   - Follow existing ContentBlock pattern from HeroBlock
   - Use `"use client"` directive for form interactivity

2. **Component Features:**

   - Form state management with React hooks
   - Email validation with HTML5 + regex
   - Toast notifications for success/error feedback
   - Redirect support for success flow
   - Markdown rendering for title/subtitle via `@/42go/components/Markdown`
   - ScrollAnimation integration for reveal effects
   - Mobile-responsive design with Tailwind classes

3. **Type Definition:**
   ```typescript
   interface TWaitlistBlock {
     type: "waitlist";
     title?: string;
     subtitle?: string;
     placeholder?: string;
     buttonLabel?: string;
     feedback:
       | { type: "message"; content: string }
       | { type: "redirect"; url: string };
   }
   ```

#### Phase 4: ContentBlock System Integration (15 min)

1. **Register Component**

   - Update `/src/42go/components/ContentBlock/server.tsx`
   - Add WaitlistBlock to blocksMap
   - Add TWaitlistBlock to ContentBlockItem union type
   - Export type for external usage

2. **Testing Integration**
   - Verify component appears in server ContentBlock
   - Test in dynamic pages context
   - Validate SSR compatibility

### Implementation Decisions

**Architecture Choices:**

- **Client-Side Component**: Uses `"use client"` for form interactivity while remaining in server ContentBlock
- **Toast vs Redirect**: Mutually exclusive feedback types enforced at TypeScript level
- **Database Strategy**: PostgreSQL UUID primary keys with auto-generation
- **Styling Approach**: Direct Tailwind classes, no Card wrapper components
- **Validation Strategy**: Client-side HTML5 + server-side regex validation

**Security Considerations:**

- Server-side email validation to prevent bypassing client checks
- IP address and User-Agent logging for analytics and abuse detection
- Silent duplicate handling to prevent email enumeration attacks
- Proper error handling without information leakage

**UX Decisions:**

- Toast notifications for immediate feedback
- Loading states during submission
- Form reset after successful submission
- Consistent visual design with existing blocks
- Mobile-first responsive approach

### File Structure

```
/src/42go/components/ContentBlock/blocks/
├── WaitlistBlock.tsx           # New component
├── HeroBlock.tsx              # Reference pattern
└── ...

/knex/migrations/
├── 20250807_create_waitlists_table.js  # New migration
└── ...

/src/app/api/
├── waitlist/
│   └── route.ts               # New API endpoint
└── ...
```

### Testing Strategy

1. **Component Testing:**

   - Form submission with valid email
   - Form submission with invalid email
   - Toast notification display
   - Redirect functionality
   - Loading states and error handling

2. **API Testing:**

   - Valid email submission
   - Invalid email format rejection
   - Duplicate email handling (silent success)
   - Database insertion verification
   - IP and User-Agent capture

3. **Integration Testing:**
   - ContentBlock registration
   - Dynamic page rendering
   - SSR compatibility
   - Multi-app support via appRoute

### Risk Mitigation

**Potential Issues:**

- UUID extension not available in PostgreSQL → Migration handles installation
- Toast component conflicts → Use latest shadcn implementation
- Form validation bypassed → Dual client/server validation
- Database connection issues → Leverage existing getDB() singleton

**Contingency Plans:**

- Fallback to text-based IDs if UUID fails
- Inline error messages if toast system fails
- Progressive enhancement for JavaScript-disabled users

## Next Steps

execute task (k3)

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
