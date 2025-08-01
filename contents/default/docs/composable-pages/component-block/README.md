---
title: Component Block
---

A _Custom Component_ is a [Page Block](./README.md) that renders a custom React component.

## Example

If we define a simple component:

```tsx
// SayHello.tsx
export const SayHello = ({ name }: { name: string }) => {
  return <div>Hello {name}</div>;
};
```

```ts
// Import your component
import { SayHello } from "./SayHello";

// Render it
const config = {
  public: {
    pages: {
      HomePage: {
        items: [
          { type: "component", component: SayHello, props: { name: "Marco" } },
        ],
      },
    },
  },
};
```

## Params

### component

It's a React functional component primitive (not an _Element_!)

### props

It's the list of properties to pass to the component at instanciation time.

> This let you use the same component multiple times.
