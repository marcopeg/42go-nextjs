# Improve User Menu [abx]

Right now the PublicLayout imports the user menu from `import { UserMenu } from "@/components/auth/UserMenu";` (in `@/components/layouts/public/Header.tsx`) but this has to change.

First, the user's menu should be places within the "layout/public" folder because it is specific to this layout.

Second, it should either show a primary "Login" button if the user is not logged in, else it should should the user's avatar or a fallback generic user icon if the user is logged in.

**Anonymous params**

If the user is NOT logged in, the button should get configuration from:

```ts
const config = {
  app1: {
    public: {
      publicCta: {
        label: "Sign in",
        href: "/login",
        style: "primary", // that is default value and can be omitted
      },
    },
  },
};
```

**Logged in params**

If the user is logged in, then we should render the avatar with a fallback on a generic user icon. That will trigger a popover with links:

```ts
const config = {
  app1: {
    public: {
      userCta: {
        event: "hover|click", // optional, default "hover"
        title: "What to show on mouse hover", // optional
        label: "Dashboard", // optional
        style: "primary", // optional, defaults to "primary" if a label is provided
        href: "/dashboard", // optional, if provided it replaces the popover menu behavior
        items: [
          {
            label: "Dashboard",
            href: "/dashboard",
            divider: true,
          },
          {
            label: "Logout",
            href: "/logout",
            style: "primary",
          },
        ],
      },
    },
  },
};
```

**User call to action control:**

The attribute `userCta.event` is optional and defaults to "hover" and it is used as trigger for the popover menu. in mobile it is fixed to the touch event so this particular param has no effects on mobile.

The attribute `title` is what to show on mouse-hover on the cta. If empty/missing omit the behavior.

The attribute `label` is optional. If provided, render a button instead of the user's avatar. In this case the `style` is applied to the button and if an `href` is also provided, then it completely skips rendering the popover with the links and it behaves as a single button implementing the `href` pattern.

**Popover menu items:**

In this case the default visualization for the items is a text button that transition to an outline on mouse hover (or touch feedback on mobile).

the optional param `divider` will add an horizontal divider after that particular item.

on mobile, the entire menu should act as a slide-in full screen page that comes from the right side of the screen.
