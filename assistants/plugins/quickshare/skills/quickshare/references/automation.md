# QuickShare automation protocol

The client obtains its contract by authenticating to discovery at runtime. The contract specifies the currently available resource types, template configurations, request and response JSON Schemas, operation methods and URI templates, errors, and lifecycle effects. Do not copy those volatile details into this file or prompts.

The stable client intents are `discover`, `list`, `read`, `create`, `save`, `identifier`, `publish`, `unpublish`, and `delete`. Each intent resolves its operation from discovery on each invocation. A removed or deprecated operation is refused and reports any replacement supplied by discovery.

Inputs are JSON objects from `--input FILE` or `--input-stdin`. The client checks the supplied JSON against the operation's discovered request schema before sending it. GET request fields become query values; other request fields become JSON. URI path parameters are substituted only from the command's resource UUID and the discovered URI template.

Every operation with a discovered destructive or disruptive effect requires `--yes`. The client reads the affected resource before refusing or executing an effectful operation, so its confirmation message can identify the public route transition. It never sends a bearer token in a URL, error, or normal output.

Useful error classes include missing credentials, authentication or authorization failure, unavailable/deprecated capability, local schema validation failure, conflict, remote validation failure, and network failure. For conflicts, fetch discovery and the resource again before creating a new request.
