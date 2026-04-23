---
taskId: ABL
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Add Social Login: LinkedIn [abl]

Implement LinkedIn OAuth authentication as a social login option. This will allow users to authenticate using their LinkedIn account, following the same patterns established for GitHub authentication.

The implementation should integrate seamlessly with the existing authentication system and support both development and production environments.

## Acceptance Criteria

- [ ] Set up LinkedIn OAuth application and obtain API credentials
- [ ] Implement LinkedIn authentication strategy using NextAuth.js
- [ ] Add LinkedIn OAuth configuration to environment variables
- [ ] Create LinkedIn login button component matching existing design
- [ ] Integrate LinkedIn authentication with the database user system
- [ ] Handle LinkedIn-specific user profile data and avatar
- [ ] Add LinkedIn authentication to the login page
- [ ] Implement proper error handling for LinkedIn OAuth flow
- [ ] Add LinkedIn authentication documentation
- [ ] Test LinkedIn authentication in both development and production environments
- [ ] Ensure LinkedIn authentication respects environment variable conditions
- [ ] Add LinkedIn-specific user profile fields if needed (professional info)
- [ ] Handle LinkedIn OAuth scope and permissions properly
- [ ] Consider LinkedIn's specific API rate limits and requirements
