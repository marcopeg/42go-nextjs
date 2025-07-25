# Dynamic AppTitle links [abz]

Links on the right-side of the toolbar must be dynamic.

```js
const config = {
  app1: {
    public: {
      toolbar: {
        links: [
          {
            label: "Join Us!",
            href: "/login",
            style: "primary",
            sticky: true, // if true, it is forcefully kept for small screens also
          },
        ],
      },
    },
  },
};
```

This config should simply generate a list of links that should be rendered into the right-side of the public layout toolbar (`@/components/layouts/public/Header.tsx`) just before the "user menu".
