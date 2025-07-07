# Support Social Login from Different App Configuration [abm]

## Task Description

The current OAuth implementation needs to handle multiple app configurations that may run on different domains. Each app configuration could potentially have its own domain, which creates a challenge for OAuth redirect URIs since OAuth providers typically require specific, pre-configured redirect URLs.

## Problem Statement

Different app configurations are likely matching different domains, creating two main challenges:

1. OAuth clients must either accept multiple redirect URLs (if the provider supports it)
2. We need to setup specific OAuth clients for each domain/app configuration

## Goals

- Analyze the current OAuth implementation to understand domain dependencies
- Research best practices for multi-domain OAuth configurations
- Design a solution that supports multiple app configurations with different domains
- Implement the chosen approach for existing social login providers (GitHub, Google)
- Ensure the solution is scalable for future OAuth providers

## Acceptance Criteria

- [ ] Analyze current OAuth redirect URI configuration and domain dependencies
- [ ] Research OAuth provider capabilities for multiple redirect URIs
- [ ] Document different approaches with pros/cons analysis
- [ ] Choose the optimal approach for our multi-app architecture
- [ ] Implement domain-aware OAuth configuration
- [ ] Update existing GitHub and Google OAuth integrations
- [ ] Test OAuth flows across different app configurations/domains
- [ ] Update documentation with multi-domain OAuth setup instructions
- [ ] Ensure backward compatibility with single-domain setups

## Technical Considerations

- OAuth redirect URIs are typically hardcoded during client registration
- Some providers allow multiple redirect URIs, others are more restrictive
- App configuration resolution happens at runtime, but OAuth setup is often build-time
- Need to balance security with flexibility
- Consider environment-specific configurations (dev, staging, prod)

## Research Areas

1. **Provider Capabilities**: Which OAuth providers support multiple redirect URIs?
2. **Dynamic Configuration**: Can we resolve OAuth client credentials based on request domain?
3. **Security Implications**: How to maintain security across multiple domains?
4. **Developer Experience**: How to simplify setup for new app configurations?

## Potential Approaches

1. **Multiple OAuth Apps**: Create separate OAuth applications for each domain
2. **Wildcard/Multiple Redirects**: Use providers that support multiple redirect URIs
3. **Proxy/Gateway**: Route all OAuth through a single domain with internal routing
4. **Hybrid Approach**: Combine multiple strategies based on provider capabilities
