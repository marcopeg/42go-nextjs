# Abstract Configurable Components

The idea is to create a generic component that can render a configuration such as:

```tsx
const Foo = () => <div>foo</div>;

<Content
  items={[
    { type: "markdown", source: "hello **world" },
    { type: "link", label: "Login", href: "/login", variant: "primary" },
    {
      type: "component",
      component: Foo,
    },
    <Foo />,
  ]}
/>;
```

So this `Content` has a library of components that can render and maybe it could also receive _React Elements_ as in the `<Foo />` example so that we can simply pass down custom code.

NOTE: This is basically how the `Page` component works today, it should be a small refactor for naming and stuff.

## Customizable Sub-groups

It would be nice to have an intermediate component like the `PageToolbar` that can basically act as a proxy to the generic `Component` but filter the allowed types so that this filter automatically affects the TypeScript validation of the configuration that should be provided to this other component.

Don't know how to approach this yet, maybe it is even a plain overengineerization of the problem.
