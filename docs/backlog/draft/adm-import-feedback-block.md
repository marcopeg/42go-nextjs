# Import Feedback Block [adm]

This task implements a _FeedbackBlock_ component for the ContentBlock system that allows users to submit feedback via email and message. This component will include both frontend UI and backend API integration.

The component follows the same architecture patterns as HeroBlock and WaitlistBlock, becoming one of the server-side ContentBlock components available for dynamic pages.

## Development Plan

### Implementation Strategy

#### Phase 1: Database Migration (15 min)

1. **Create Migration File**
   - File: `knex/migrations/[timestamp]_create_feedback_table.js`
   - Table structure: `feedback` with id (UUID), email, message, newsletter_subscription, ip_address, user_agent, created_at
   - Primary key: UUID with auto-generation
   - Email validation constraint

#### Phase 2: API Endpoint (30 min)

1. **Create API Route**

   - File: `app/api/feedback/route.ts`
   - Validate email format using regex
   - Validate required fields (email, message)
   - Store IP address and User-Agent for analytics
   - Return proper error responses for validation failures

2. **Request/Response Format:**

   ```typescript
   // Request
   {
     email: string;
     message: string;
     newsletter?: boolean;
   }

   // Response
   { success: true } | { error: string }
   ```

#### Phase 3: FeedbackBlock Component (60 min)

1. **Create Component Structure**

   - File: `/src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx`
   - Follow existing ContentBlock pattern from HeroBlock
   - Use `"use client"` directive for form interactivity

2. **Component Features:**

   - Form state management with React hooks
   - Email and message validation with HTML5 + regex
   - Toast notifications for success/error feedback (when available)
   - Redirect support for success flow
   - Markdown rendering for title/subtitle via `@/42go/components/Markdown`
   - ScrollAnimation integration for reveal effects
   - Mobile-responsive design with Tailwind classes

3. **Type Definition:**
   ```typescript
   interface TFeedbackBlock {
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
   }
   ```

#### Phase 4: ContentBlock System Integration (15 min)

1. **Register Component**

   - Update `/src/42go/components/ContentBlock/server.tsx`
   - Add FeedbackBlock to blocksMap
   - Add TFeedbackBlock to ContentBlockItem union type
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

- Server-side email and message validation to prevent bypassing client checks
- IP address and User-Agent logging for analytics and abuse detection
- Proper error handling without information leakage
- Newsletter field only saved when explicitly enabled in configuration

**UX Decisions:**

- Toast notifications for immediate feedback (when toast system is available)
- Loading states during submission
- Form reset after successful submission
- Consistent visual design with existing blocks
- Mobile-first responsive approach
- Newsletter checkbox only appears when enabled in configuration

### Dependencies Analysis

**Existing Infrastructure:**

- Database connection via `@/lib/db` (PostgreSQL + Knex)
- Button and Input components from `@/components/ui`
- ScrollAnimation from `@/components/ui/scroll-animation`
- Markdown rendering via `@/42go/components/Markdown`

**Missing Dependencies:**

- Toast system: The legacy code shows a complete toast implementation that would need to be added
- Textarea component: May need to be added to `@/components/ui` or use native textarea

**Installation Decisions:**

- **Use existing components where possible**: Button, Input from shadcn/ui
- **Consider adding Textarea**: Either install via shadcn or create simple wrapper
- **Toast system**: Evaluate if worth implementing or use simple alerts initially

### Files to Create/Modify

**Create:**

- `knex/migrations/[timestamp]_create_feedback_table.js` - Database migration
- `app/api/feedback/route.ts` - API endpoint
- `/src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx` - Main component

**Modify:**

- `/src/42go/components/ContentBlock/server.tsx` - Add FeedbackBlock to blocksMap
- `/src/42go/components/ContentBlock/server.tsx` - Add TFeedbackBlock to ContentBlockItem type

### Architecture Alignment

This implementation follows the established patterns:

1. **ContentBlock Pattern**: Same structure as HeroBlock with type definition and server registration
2. **Database Pattern**: UUID primary keys, Knex migrations, `@/lib/db` usage
3. **API Pattern**: Standard Next.js API routes with proper validation
4. **UI Pattern**: Tailwind classes, existing UI components, ScrollAnimation integration
5. **Form Pattern**: Client-side validation, loading states, proper error handling

## Next Steps

execute task (k3)

- [ ] Optional newsletter subscription checkbox when enabled in configuration

## Feature Behavior Details

The FeedbackBlock allows users to submit feedback with:

- **Email field** (required) - with client and server-side validation
- **Message field** (required) - for the actual feedback content
- **Newsletter checkbox** (optional) - only appears when enabled in configuration
- **Success feedback** - either markdown message or redirect URL after successful submission

**Backend requirements:**

- Save email, message, and newsletter subscription preference to database
- Include IP address and User-Agent for analytics and abuse detection
- Validate email format on server-side
- Return appropriate error messages for validation failures

**Frontend requirements:**

- Client-side email validation before submission
- Loading states during form submission
- Form reset after successful submission
- Toast notifications or redirect based on configuration
- Consistent visual design with other ContentBlock components

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

# Import Feedback Block [adm]

This task implements a _FeedbackBlock_ component for the ContentBlock system that allows users to submit feedback via email and message. This component will include both frontend UI and backend API integration.

The component follows the same architecture patterns as HeroBlock and WaitlistBlock, becoming one of the server-side ContentBlock components available for dynamic pages.

## Goals

- [ ] Create FeedbackBlock component following existing ContentBlock patterns
- [ ] Add database migration for feedbacks table (plural)
- [ ] Implement API endpoint for feedback submission with email and message fields
- [ ] Add optional newsletter subscription checkbox functionality (boolean field)
- [ ] Add client-side email validation and form handling
- [ ] Support both success message and redirect options for feedback
- [ ] Add FeedbackBlock to server ContentBlock exports
- [ ] Follow existing architecture patterns from HeroBlock/DemoBlock
- [ ] Install and use toast notifications system for user feedback

## Acceptance Criteria

- [ ] FeedbackBlock component created in `/src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx`
- [ ] Component follows ContentBlock interface pattern with TFeedbackBlock type
- [ ] Database migration creates `feedbacks` table (plural) with UUID primary key, email, message, and boolean newsletter_subscription field
- [ ] API endpoint at `/api/feedback` handles POST requests with email and message validation
- [ ] Client-side form validates email format and required fields before submission
- [ ] Toast notifications installed (via shadcn) and used for success/error feedback
- [ ] Component uses existing UI components (Button, Input, Textarea) and Markdown for content
- [ ] Component uses simple Tailwind classes without Card wrapper components
- [ ] Component added to server ContentBlock blocksMap and exported types
- [ ] Error handling for server errors and proper user feedback
- [ ] Mobile-responsive design consistent with other blocks
- [ ] Optional newsletter subscription checkbox when enabled in configuration (boolean value)

## Feature Behavior Details

The FeedbackBlock allows users to submit feedback with:

- **Email field** (required) - with client and server-side validation
- **Message field** (required) - for the actual feedback content
- **Newsletter checkbox** (optional) - boolean field, only appears when enabled in configuration
- **Success feedback** - either markdown message or redirect URL after successful submission

**Backend requirements:**

- Save email, message, and newsletter subscription preference (boolean) to `feedbacks` table
- Include IP address and User-Agent for analytics and abuse detection
- Validate email format on server-side
- Return appropriate error messages for validation failures

**Frontend requirements:**

- Client-side email validation before submission
- Loading states during form submission
- Form reset after successful submission
- Toast notifications for immediate feedback
- Consistent visual design with other ContentBlock components

## Development Plan

### Implementation Strategy

#### Phase 0: Dependencies Installation (10 min)

1. **Check and Install Toast System**

   - Check if toast components already exist in `@/components/ui`
   - If not installed: `npx shadcn@latest add toast`
   - If already exists: verify implementation and proceed

2. **Check and Install Textarea**
   - Check if textarea component exists in `@/components/ui`
   - If not installed: `npx shadcn@latest add textarea`
   - If already exists: proceed with existing implementation

#### Phase 1: Database Migration (15 min)

1. **Create Migration File**
   - File: `knex/migrations/[timestamp]_create_feedbacks_table.js`
   - Table structure: `feedbacks` (plural) with id (UUID), email, message, newsletter_subscription (boolean), ip_address, user_agent, created_at
   - Primary key: UUID with auto-generation
   - Email validation constraint

#### Phase 2: API Endpoint (30 min)

1. **Create API Route**

   - File: `app/api/feedback/route.ts`
   - Validate email format using regex
   - Validate required fields (email, message)
   - Store IP address and User-Agent for analytics
   - Return proper error responses for validation failures

2. **Request/Response Format:**

   ```typescript
   // Request
   {
     email: string;
     message: string;
     newsletter?: boolean;
   }

   // Response
   { success: true } | { error: string }
   ```

#### Phase 3: FeedbackBlock Component (60 min)

1. **Create Component Structure**

   - File: `/src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx`
   - Follow existing ContentBlock pattern from HeroBlock
   - Use `"use client"` directive for form interactivity

2. **Component Features:**

   - Form state management with React hooks
   - Email and message validation with HTML5 + regex
   - Toast notifications for success/error feedback
   - Redirect support for success flow
   - Markdown rendering for title/subtitle via `@/42go/components/Markdown`
   - ScrollAnimation integration for reveal effects
   - Mobile-responsive design with Tailwind classes

3. **Type Definition:**
   ```typescript
   interface TFeedbackBlock {
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
   }
   ```

#### Phase 4: ContentBlock System Integration (15 min)

1. **Register Component**

   - Update `/src/42go/components/ContentBlock/server.tsx`
   - Add FeedbackBlock to blocksMap
   - Add TFeedbackBlock to ContentBlockItem union type
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

- Server-side email and message validation to prevent bypassing client checks
- IP address and User-Agent logging for analytics and abuse detection
- Proper error handling without information leakage
- Newsletter field only saved when explicitly enabled in configuration

**UX Decisions:**

- Toast notifications for immediate feedback using shadcn toast system
- Loading states during submission
- Form reset after successful submission
- Consistent visual design with existing blocks
- Mobile-first responsive approach
- Newsletter checkbox only appears when enabled in configuration

### Dependencies Analysis

**Existing Infrastructure:**

- Database connection via `@/lib/db` (PostgreSQL + Knex)
- Button and Input components from `@/components/ui`
- ScrollAnimation from `@/components/ui/scroll-animation`
- Markdown rendering via `@/42go/components/Markdown`

**Required Dependencies:**

- Toast system: Install via `npx shadcn@latest add toast` if not present
- Textarea component: Install via `npx shadcn@latest add textarea` if not present

**Installation Strategy:**

- Check for existing components at execution time
- Install only missing dependencies via shadcn CLI
- Use existing components where already available

### Files to Create/Modify

**Create:**

- `knex/migrations/[timestamp]_create_feedbacks_table.js` - Database migration
- `app/api/feedback/route.ts` - API endpoint
- `/src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx` - Main component

**Modify:**

- `/src/42go/components/ContentBlock/server.tsx` - Add FeedbackBlock to blocksMap
- `/src/42go/components/ContentBlock/server.tsx` - Add TFeedbackBlock to ContentBlockItem type

**Potentially Install:**

- Toast components via shadcn (if not present)
- Textarea component via shadcn (if not present)

### Architecture Alignment

This implementation follows the established patterns:

1. **ContentBlock Pattern**: Same structure as HeroBlock with type definition and server registration
2. **Database Pattern**: UUID primary keys, Knex migrations, `@/lib/db` usage
3. **API Pattern**: Standard Next.js API routes with proper validation
4. **UI Pattern**: Tailwind classes, existing UI components, ScrollAnimation integration
5. **Form Pattern**: Client-side validation, loading states, proper error handling
6. **Toast Pattern**: Standard shadcn toast integration for user feedback

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

**add-feedbacks-table.migration.js**

```js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("feedbacks", (table) => {
    table.text("id").primary().notNullable();
    table.text("email").notNullable();
    table.text("message").notNullable();
    table.boolean("newsletter_subscription").defaultTo(false);
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
  return knex.schema.dropTableIfExists("feedbacks");
};
```

Important notes on the legacy code:

- some frontend components are shadcn components and it might be better installing those instead of copying them over
- make sure you use the primary color correctly so that it implements the theme's leading color
