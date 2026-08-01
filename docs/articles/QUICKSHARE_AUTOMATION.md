# QuickShare Automation API

QuickShare automation lives under `/api/quickshare/v1`. Every endpoint requires
`Authorization: Bearer <personal-token>` and ignores browser session cookies.
The token determines both the app and the owner; clients never supply either.

Start with `GET /api/quickshare/v1/discovery`. Its response is the live source
of truth for resource types, maintained template versions, JSON Schemas,
request paths, path parameters, defaults, limits, errors, and disruptive
lifecycle effects. A client should construct requests from discovery rather
than keeping a copied type catalog.

The stable v1 operation IDs are `resources.list`, `resources.create`,
`resources.read`, `resources.save`, `resources.set-identifier`,
`resources.publish`, `resources.unpublish`, `resources.delete`, and
`discovery.get`.

`save` only creates a draft revision. `publish` explicitly compiles and
activates the selected revision. `unpublish` removes static delivery but keeps
the account draft. `delete` is terminal and removes static delivery before the
database record; callers must use the discovery-defined confirmation value.

Resource responses always include `nextPublicUrl`. `publishedUrl` is null
before first publication and after unpublish. During a pending short-code or
custom-ID change it remains the old live URL while `nextPublicUrl` shows the
candidate; after publish they converge. No redirect is created for the old URL.

## Compatibility

Compatible changes keep an operation ID and contract version while discovery
adds optional fields, values, or capabilities. A capability scheduled for
retirement must remain visible with `deprecated`, `replacement`, and
`removalAt`. A breaking request or response change requires a new versioned
namespace and contract version; it does not silently repurpose a v1 operation.
