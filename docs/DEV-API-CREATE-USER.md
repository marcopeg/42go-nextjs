# Create New User - Dev API

> 🧐 [What is a Dev API?](./DEV-API.md)

---

## Endpoint

This API let you create a new user for the username/password login method.

```bash
http://localhost:3000/api/dev/create-user?username=foobar
```

This will create the user "foobar" with password "foobar".

## Case Sensitivity

If you set `username=Foobar` then take into account that:

- username: case insensitive
- password: case sensitive

You will be able to login witn `foobar/Foobar` but not `foobar/foobar`.

## Shortcuts

- [Create user "John"](http://localhost:3000/api/dev/create-user?username=John)
- [Create user "Jane"](http://localhost:3000/api/dev/create-user?username=Jane)
- [Create user "Mike"](http://localhost:3000/api/dev/create-user?username=mike)
- [Create user "Valerie"](http://localhost:3000/api/dev/create-user?username=valerie)
