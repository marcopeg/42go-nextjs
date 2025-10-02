# Fix QuickList reorder API [aqa]

The QuickList reorder API is currently misbehaving:

- reorder items on mobile
- click on refresh

Often after refreshing the list the items appear in a different order compared to the drag'n'drop visual result before hitting refresh

## Acceptance Criteria

- [ ] Consistend "reorder -> refresh" final order result
- [ ] Clean up existing order-related api and frontend calls

## Proposal

After dnd reorder, make one single api call to some ".../reorder" api (find the best possible path name) passing the full list of sorted taks ids.

This api should turn this list into a sql statement to correctly update all the tasks' "position" property so to match the correct order.

NOTE: I'm a little worried that a LONG list would send a lot of content (many uuids in the request) but maybe this is overengineering?

NOTE: I'm a little worried that a LONG LIST would then cause many UPDATE statements on the db and I wonder if there is a better approach or to skip worrying about this stuff because now the system is just a personal note taking app that is used only by me and my wife...
