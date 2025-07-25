# Use config info in App's title [abv]

I see now that the app's title is dynamic but subtitle and icons are not

```ts
const config = {
  app1: {
    public: {
      toolbar: {
        title: "",
        subtitle: "",
        icon: "",
        href: "/",
      },
    },
  },
};
```

- if toolbar's title is empty/missing, it should fallback on "app1.name"
- if subtitle is empty/missing, it should be skipped
- if the icon is empty/missing, it should be skipped
- apply the link to each item in solation if an href is provided, it should be SEO compliant

Regarding the icon, it should be easy to change it to an icon from a standard library (we have lucide?) or a custom image.
