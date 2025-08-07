# Add config.match.header [aci]

add a config.match.headers that should take a list of {kxey, value} where the key is a regexp to match a given header, or the case-insensitive header value, and the value is a list of possible regexp or case insensitive straght values to match and identify a configuration.

The system should be smart enough to figure out whether the key/value is a plain string or a regexp.

**key**: if string should be matched case insensitive, if regexp, apply as it is
**value**: if string should be matched exactly as it is, if regexp apply as it is, if a list, apply one at the time

**list matching**: for lists of items at both "keys" or "value" level there is an optional "mode" key that accepts "any" or "all" as values (defaults to "any"). If all, then all the contitions must be true. If any, a positive match is reached at the first hit.

**Example:**

```ts
const config = {
  match: {
    header: {
      mode: "any/all (default to any)",
      keys: [
        {
          key: "X-App",
          value: "foobar",
        },
        {
          key: /^X-App.*/i,
          value: [/.*/],
          mode: "any/all (default to any)",
        },
      ],
    },
  },
};
```
