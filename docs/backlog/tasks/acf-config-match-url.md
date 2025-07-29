# Config Match Url [acf]

The goal is to refine `@/AppConfig`'s `matchAppName()` so to implement a regexp check defined in `config.match.url` so that i can write simple configs like:

- config.match.url=localhost.3000
- config.match.url=app1.localhost.3000
- config.match.url=marcopeg.com

(NOTE: these examples need to be converted to real regexp that can be used and applied by the function)
