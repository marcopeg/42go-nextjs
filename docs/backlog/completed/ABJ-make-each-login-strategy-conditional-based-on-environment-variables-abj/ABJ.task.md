---
taskId: ABJ
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-07-23T17:21:14+02:00
---

# Make Each Login Strategy Conditional Based on Environment Variables [abj]

## ✅ COMPLETED BY TASK [abm]

**This task was completed as part of [abm] Support social login from different app configuration** ([🔗](../ABM-support-social-login-from-different-app-configuration-abm/ABM.task.md))

**Implementation Achieved**:

- ✅ **Environment-Based Configuration**: Each app uses specific environment variables (e.g., `APP1_GITHUB_CLIENT_ID`)
- ✅ **Conditional Strategy Registration**: Providers only register when environment variables are available
- ✅ **Dynamic UI Filtering**: Login UI shows only configured and available strategies
- ✅ **Graceful Fallback**: Apps work with any combination of configured providers
- ✅ **Validation**: Environment variable validation in provider configuration
- ✅ **Documentation**: Complete setup guide with environment variable requirements

**Key Features Delivered**:

- Per-app environment variable mapping in AppConfig
- Conditional provider building in `getProviders()` function
- Frontend filtering based on available configuration
- Production-ready environment management
- Comprehensive setup documentation

---

## Original Task Description

Implement conditional loading and availability of authentication strategies based on environment variables. This will allow deployments to enable/disable specific authentication methods without code changes, improving flexibility and security.

Each authentication strategy (GitHub, Google, Facebook, X, LinkedIn, Apple, etc.) should only be available and initialized if the corresponding environment variables are properly configured.

## Acceptance Criteria

- [ ] Create environment variable checks for each authentication strategy
- [ ] Implement conditional strategy registration based on env vars
- [ ] Update authentication configuration to respect environment settings
- [ ] Ensure UI only shows available authentication options
- [ ] Add graceful handling when strategies are not configured
- [ ] Update documentation with required environment variables for each strategy
- [ ] Implement fallback behavior when no strategies are configured
- [ ] Add validation for required environment variables on startup
- [ ] Create helper functions to check strategy availability
- [ ] Update existing GitHub authentication to use conditional loading
- [ ] Test with various environment configurations
