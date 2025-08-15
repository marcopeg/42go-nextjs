# Project Backlog

A NextJS boilerplate that supports multi-website configuration, dynamic theming, user management, config-based feature flags and RBAC control and feature flags.

(LastID: aen)

## Current Task

## Upcoming Tasks

- [abx] Improve user's menu [🔗](./draft/abx-improve-user-menu.md)

## Drafts

- [aei] Extract Policy Utilities & Refactor Imports [🔗](./draft/aei-extract-policy-utilities.md)
- [aam] RBAC Advanced Features 🔗 [story](./tasks/aam-rbac-advanced-features.md)
- [ads] RBAC SQL Functions [🔗](./draft/ads-sql-functions.md)
- [adr] EPIC - RBAC Refactor Policies [🔗](./draft/adr-refactor-rbac-policies.md)
- [adw] Client Policy Hook and Component [🔗](./draft/adw-client-policy-hook-component.md)
- [aea] Policy & RBAC Testing Strategy [🔗](./draft/aea-policy-testing-strategy.md)
- [aef] Design anyPolicy OR Helper [🔗](./draft/aef-design-anypolicy-or-helper.md)
- [aeg] Unified Policy Engine Tests Implementation [🔗](./draft/aeg-policy-engine-tests.md)
- [aem] fix docker build [🔗](./draft/aem-fix-docker-build.md)
- [aan] App-Specific Session Configuration [🔗](./draft/aan-app-specific-session-config.md)
- [ade] [DynamicPages with custom layout](./draft/ade-dynamic-pages-layout.md)
- [acz] Document Getting started with README's information
- [acm] 🪲 docs: Parse relative url in articles [🔗](./draft/acm-relative-url.md)
- [aat] Support i18n
- [abd] Optimize Database Documentation [🔗](./draft/abd-optimize-database-documentation.md)
- [abe] Optimize Theming Documentation [🔗](./draft/abe-optimize-theming-documentation.md)
- [abf] Optimize Route Groups Documentation [🔗](./draft/abf-optimize-route-groups-documentation.md)
- [abg] Optimize Feature Flags Documentation [🔗](./draft/abg-optimize-feature-flags-documentation.md)
- [abh] Optimize App Config Documentation [🔗](./draft/abh-optimize-app-config-documentation.md)
- [adb] Refactor `42go/auth/providers` to expose single providers modules with types
- [abl] Add social login: LinkedIn [🔗](./draft/abl-add-social-login-linkedin.md)
- [abk] Add social login: X [🔗](./draft/abk-add-social-login-x.md)
- [aam] Add social login: Facebook
- [aao] Add app name to waitlist table [🔗](./draft/aao-add-app-name-to-waitlist.md)
- [aap] Add app name to feedback table [🔗](./draft/aap-add-app-name-to-feedback.md)
- [aao] Add social login: Apple
- [abn] Migrate to Prisma ORM
- [add] [Implement CLI scripts](./draft/add-implement-cli-scripts.md)
- [ado] if `config.auth` is not defined, the `/login` should return a 404
- [adp] `config.public.docs` if present should be enough to enable the documents even without explicit feature flag. this config should be a feature flag in itself.
- [adn] Add `config.match.fn = async (request): bool` that let match programmatically [🔗](./tasks/adn-config-match-function.md)
- [] Add "youtube" ContentBlock
- [] Add "image" ContentBlock
- [] HeroBlock: should be possibel to set only one among "title", "subtitle", or "actions" but at least one, so that it can work only as a title block
- [] HeroBlock: add the "aligment" (left, center, right) so to apply it to the contents (optional, default "center")

## Completed Tasks

- [aee] Protect feedback route with feature flag [🔗](./draft/aee-protect-feedback-route-with-feature-flag.md)
- [aed] Protect waitlist route with feature flag [🔗](./draft/aed-protect-waitlist-route-with-feature-flag.md)
- [aen] Move logout button to the profile's page top bar [🔗](./draft/aen-move-logout-button-to-profile-top-bar.md)
- [aal] RBAC Menu Integration 🔗 [story](./tasks/aal-rbac-menu-integration.md)
- [acj] 🦲 Next standalone has `.env` file [🔗](./archive/acj-next-standalone.md) ✅ COMPLETE - .env excluded from images, runtime env injection, docs + verification script
- [ael] Stack Block Component [🔗](./archive/ael-stack-block-component.md)
- [aek] Add Call To Action content block [🔗](./archive/aek-add-call-to-action-content-block.md) (refined – ready to plan k2)
- [aej] Fix protectPage Switch Fall-Through Bug [🔗](./archive/aej-fix-protectpage-switch-fallthrough.md)
- [aeh] Remove Wildcard Grant Support [🔗](./archive/aeh-remove-wildcard-grant-support.md)
- [adt] Unified Policy Engine [🔗](./archive/adt-unified-policy-engine.md)
- [adv] Protect SSR Pages with Policies [🔗](./archive/adv-protect-ssr-pages.md)
- [adz] API Route Policy Guard uses Policies [🔗](./archive/adz-api-route-policy-guard.md) ✅ COMPLETE - Unified protectRoute with feature inference, per-policy overrides, routes migrated; tests deferred to [aea]
- [adv] Protect SSR Pages with Policies [🔗](./archive/adv-protect-ssr-pages.md)
- [adx] AppLayout Policy Integration [🔗](./archive/adx-applayout-policy-integration.md)
- [aeb] Consolidate RBAC Into Policy Engine [🔗](./archive/aeb-consolidate-rbac-into-policy-engine.md) ✅ COMPLETE - Legacy RBAC surface removed, unified policy engine sole API.
- [adu] Feature Flags Unification to AppConfig.features [🔗](./archive/adu-feature-flags-unification.md) ✅ COMPLETE - Single features[] list, legacy flags bridged then purged.
- [ady] Cleanup Legacy Feature Flags [🔗](./archive/ady-cleanup-legacy-feature-flags.md) ✅ COMPLETE - Removed deprecated config & bridge, docs updated.
- [aak] RBAC Page & Route Protection 🔗 [story](./archive/aak-rbac-page-route-protection.md)
- [aaj] RBAC useGrants Hook & Client Components 🔗 [story](./archive/aaj-rbac-usegrants-hook.md)
- [aai] RBAC Database Schema & Core Infrastructure 🔗 [story](./archive/aai-add-rbac.md)
- [adl] 🪲 docs: Links from the docs index page don't work [🔗](./archive/adl-docs-article-walls-links.md)
- [adq] Clean up AppConfig matching logic [🔗](./archive/adq-clean-appconfig-match.md)
- [aci] Add `config.match.header` [🔗](./archive/aci-config-match-header.md)
- [adm] Import feedback block [🔗](./archive/adm-import-feedback-block.md)
- [abt] Import waitlist block [🔗](./archive/abt-import-waitlist-block.md)
- [abs] Import pricing block [🔗](./archive/abs-import-pricing-block.md)
- [adf] [Custom Actions Type - SUPERSEDED](./archive/adf-custom-actions-type.md) ⚠️ Split into adg-adk
- [adi] [Create PublicLayout TActionItem Type](./archive/adi-create-publiclayout-tactionitem-type.md) 🔗
- [adj] [Create AppLayout TActionItem Type](./archive/adj-create-applayout-tactionitem-type.md) 🔗
- [adh] [Rename HeaderLinks to ToolbarActions](./archive/adh-rename-headerlinks-toolbaractions.md) 🔗
- [adg] [Rename Toolbar API for Consistency](./archive/adg-rename-toolbar-api-consistency.md) 🔗 ✅ COMPLETE - All toolbar and header actions are now consistent. No mercy for legacy props.
- [adc] [Implement client/server BlockContent](./archive/adc-block-content-client-server.md)
- [abq] Add App layout [🔗](./archive/abq-app-layout.md)
- [aau] Implement public layout
- [ada] Move `components/auth` to `42go` folder
- [acy] Move `components/layouts` into `42go` folder
- [abz] Fix public links in toolbar [🔗](./archive/abz-public-toolbar-links.md)
- [acx] Abstract configurable components [🔗](./archive/acx-abstract-configurable-components.md)
- [acv] Document Pages/hero
- [acu] Document Pages/markdown
- [acs] Document Markdown component and types
- [act] Implement & document custom component in Pages
- [acq] Create Basic UI POC for User Dashboard [🔗](./archive/acq-create-basic-ui-poc-user-dashboard.md)
- [acp] Create Custom Terms and Conditions [🔗](./archive/acp-create-custom-terms-conditions.md)
- [aco] Create Custom Landing Page for Calendar Config [🔗](./archive/aco-create-custom-landing-page-calendar.md)
- [acn] Create Calendar App Config [🔗](./archive/acn-create-calendar-app-config.md) ✅ COMPLETE - Calendar app config, custom fuchsia theme, credentials auth only
- [ach] Create a Markdown block [🔗](./archive/ach-create-markdown-block.md)
- [acl] Simplify boot for new developers [🔗](./archive/acl-simplify-boot.md)
- [acd] Move `config.docs` to `config.public.docs` [🔗](./archive/acd-move-config-docs-to-config-public-docs.md)
- [acb] Move `config.pages` to `config.public.pages`
- [ace] Move `config.meta` to `config.public.meta`
- [acf] Add `config.match.url` to receive a regexp [🔗](./archive/acf-config-match-url.md)
- [aca] Render docs [🔗](./archive/aca-render-docs.md)
- [abv] Fix AppTitle's with config data source [🔗](./archive/abv-app-title-data.md) ✅ COMPLETE - Dynamic AppTitle with toolbar config, Lucide icons, proper fallbacks, and optimized bundle
- [abr] Import Hero block [🔗](./archive/abr-import-hero-block.md)
- [abu] Import dark-mode background color [🔗](./archive/abu-import-dark-mode-background.md)
- [abp] Add Public layout [🔗](./archive/abp-public-layout.md) ✅ COMPLETE - Advanced public layout with CMS system, dynamic routing, and URL-based feature flags
- [abo] Production build [🔗](./archive/abo-production-build.md) ✅ COMPLETE - Optimized Docker builds with Next.js standalone output and production deployment automation
- [abm] Support social login from different app configuration [🔗](./archive/abm-support-social-login-different-app-configuration.md) ✅ COMPLETE - Multi-app OAuth with per-app provider configuration and frontend filtering
- [abj] Make each login strategy conditional based on environment variables [🔗](./archive/abj-make-login-strategy-conditional-on-env-vars.md) ✅ COMPLETE - Completed by task [abm]
- [abi] Refactor login code (improve modularization) [🔗](./archive/abi-refactor-login-code-improve-modularization.md) ✅ COMPLETE - Completed by task [abm]
- [abb] Implement Dynamic Authentication Strategy [🔗](./archive/abb-implement-dynamic-authentication-strategy.md) ✅ COMPLETE - Completed by task [abm]
- [aan] Add social login: Google [🔗](./archive/aan-add-social-login-google.md) ✅ COMPLETE - Production-ready Google OAuth integration with comprehensive documentation
- [aal] Add social login: GitHub [🔗](./archive/aal-add-social-login-github.md) ✅ COMPLETE - Production-ready GitHub OAuth integration
- [abc] Optimize Memory Bank for LLM Consumption [🔗](./archive/abc-optimize-memory-bank-for-llm-consumption.md)
- [aba] Use Database Users Table to Authenticate Users [🔗](./archive/aba-use-database-users-table-to-authenticate.md)
- [aah] Add login support [🔗](./archive/aah-add-login-support.md)
- [aaj] Add `ARCHITECTURE.md` to the Memory Bank [🔗](./archive/aaj-add-architecture-md-to-the-memory-bank.md)
- [aaw] Simplify db support to Postgres [🔗](./archive/aaw-simplify-db-support-to-postgres.md)
- [aag] Add Database connection pool [🔗](./archive/aag-add-database-connection-pool.md)
- [aac] Support different public layout based on App-config [🔗](./archive/aac-support-different-public-layout-based-on-app-config.md)
- [aab] Support different CSS projects by App-config
- [aav] Implement Button component [🔗](./archive/aav-implement-button-component.md)
- [aaf] Support accent color in App config [🔗](./archive/aaf-support-accent-color.md
- [aau] Implement public layout [🔗](./archive/aau-implement-public-layout.md)
- [aae] Support default theme in App config [🔗](./archive/aae-default-theme-from-config.md)
- [aas] Layout's metadata should come from the configuration [🔗](./archive/aas-layout-medatada-from-config.md)
- [aad] General dark-mode support [🔗](./archive/aad-general-dark-mode-support.md)
- [aaa] Initialize backlog [🔗](./archive/aaa-initialize-backlog.md)
- [aap] API routes ACL with App config feature flags
- [aaq] Page routes ACL with cApp config feature flags
- [aar] Identify App config by Request properties

- [aec] Abstract Panel Component [🔗](./draft/aec-abstract-panel-component.md) ✅ COMPLETE - SRP panel primitives + SimplePanel sugar, policy-aware panels, profile page refactored
