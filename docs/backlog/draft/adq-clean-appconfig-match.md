# Clean Up AppConfig Match Logic [adq]

> DEPENDS ON:
>
> - aci
> - adn
>
> Do not work on this taks until the dependencies are completed!

Now that each app's config has proper ways to self-match, we should cleanup the AppConfig.ts from the local `matchAppName` function and move the logc that implements the configuration into the `@/42go/lib/match` utility library and use it in `middleware.ts` so to minimize the code there and maximize library code.

There is another requirement for this task:

If an environment variable `APP_NAME=xxx` is provided, then the system will completely skip the matching and simply use the app config that is idenfied by that variable.

We should check at boot that such configuration exists, and exit with an error if it doesn't.
