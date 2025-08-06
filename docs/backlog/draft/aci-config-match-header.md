# Add config.match.header [aci]

add a config.match.headers that should take a list of {kxey, value} where the key is a regexp to match a given header, or the case-insensitive header value, and the value is a list of possible regexp or case insensitive straght values to match and identify a configuration.

```ts
const config = {
  match: {
    header: [
      {
        key: "X-App",
        value: "foobar",
      },
    ],
  },
};
```
