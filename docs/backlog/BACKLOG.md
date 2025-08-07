# Project Backlog

A NextJS boilerplate that supports multi-website configuration, dynamic theming, user management, config-based feature flags and RBAC control and feature flags.

(LastID: adm)

## Current Task

## Upcoming Tasks

- [abs] Import pricing block [🔗](./tasks/abs-import-pricing-block.md)
- [abt] Import waitlist block [🔗](./tasks/abt-import-waitlist-block.md)
- [adm] Import feedback block [🔗](./tasks/adm-import-feedback-block.md)

## Drafts

- [adl] 🪲 docs: Links from the docs index page don't work [🔗](./draft/adl-docs-article-walls-links.md)
- [abx] Improve user's menu [🔗](./draft/abx-improve-user-menu.md)
- [ade] [DynamicPages with custom layout](./draft/ade-dynamic-pages-layout.md)
- [acj] Next standalone has `.env` file [🔗](./draft/acj-next-standalone.md)
- [acz] Document Getting started with README's information
- [acr] Create an "clientAppPage" that applies feature flags to a client page
- [acm] 🪲 docs: Parse relative url in articles [🔗](./draft/acm-relative-url.md)
- [aai] Add RBAC to the users system [🔗](./draft/aai-add-rbac.md)
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
- [aao] Add social login: Apple
- [abn] Migrate to Prisma ORM
- [aci] Add `config.match.header` [🔗](./draft/aci-config-match-header.md)
- [] Add `config.match.fn = async (request): bool` that let match programmatically
- [add] [Implement CLI scripts](./draft/add-implement-cli-scripts.md)
- [] if `config.auth` is not defined, the `/login` should return a 404
- [] `config.public.docs` if present should be enough to enable the documents even without explicit feature flag. this config should be a feature flag in itself.

## Completed Tasks

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
