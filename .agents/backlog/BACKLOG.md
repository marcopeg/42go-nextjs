# Project Backlog

A NextJS boilerplate that supports multi-website configuration, dynamic theming, user management, config-based feature flags and RBAC control and feature flags.

## In Progress

## Ready Tasks

- [UG00] 🔴 3/5 — Update Dependencies | [task](./ready/UG00.update-dependencies.md) | [plan](./ready/UG00.update-dependencies.plan.md)

## Drafts

### Tier 1: Deployable Baseline 🔴

- [AEM] 🔴 3/5 — Fix Docker build | [task](./ready/AEM.fix-docker-build.md)
- [TK89] 🔴 3/5 — Docker Image Security Review | [task](./drafts/TK89.docker-image-security-review.md)
- [ADO] 🔴 1/5 — If config.auth not defined, /login returns 404 | [task](./drafts/ADO.login-404-without-auth-config.md)
- [ADP] 🔴 1/5 — config.public.docs should enable docs without feature flag | [task](./drafts/ADP.docs-config-as-feature-flag.md)

### Tier 2: Policy & Auth Integrity 🔴/🟡

- [AEI] 🔴 2/5 — Extract Policy Utilities & Refactor Imports | [task](./drafts/AEI.extract-policy-utilities.md)
- [AEA] 🟡 2/5 — Policy & RBAC Testing Strategy | [task](./drafts/AEA.policy-testing-strategy.md)
- [AEG] 🔴 3/5 — Unified Policy Engine Tests Implementation | [task](./drafts/AEG.policy-engine-tests.md)
- [AEF] 🟡 2/5 — Design anyPolicy OR Helper | [task](./drafts/AEF.design-anypolicy-or-helper.md)
- [ADW] 🟡 3/5 — Client Policy Hook and Component | [task](./drafts/ADW.client-policy-hook-component.md)
- [AR08] 🟡 2/5 — Refactor 42go/auth/providers to expose single provider modules | [task](./drafts/AR08.refactor-auth-providers.md)
- [AAN] 🟡 2/5 — App-Specific Session Configuration | [task](./drafts/AAN.app-specific-session-config.md)

### Tier 3: Framework Plumbing 🟡

- [ADN] 🟡 3/5 — Config match function | [task](./drafts/ADN.config-match-function.md)
- [HX68] 🟡 3/5 — DynamicPages with custom layout | [task](./drafts/HX68.dynamic-pages-layout.md)
- [ABX] 🟡 2/5 — Improve user's menu | [task](./drafts/ABX.improve-user-menu.md)
- [ACM] 🟡 2/5 — docs: Parse relative url in articles | [task](./drafts/ACM.relative-url.md)
- [ADC] 🟡 3/5 — Add tenants table | [task](./ready/ADC.add-tenants-table.md)

### Tier 4: Content Blocks 🟢/🟡

- [AK87] 🟡 1/5 — HeroBlock: optional fields (title, subtitle, or actions only) | [task](./drafts/AK87.heroblock-optional-fields.md)
- [NC71] 🟢 1/5 — HeroBlock: add alignment option | [task](./drafts/NC71.heroblock-add-alignment.md)
- [GQ36] 🟢 2/5 — Add YouTube ContentBlock | [task](./drafts/GQ36.add-youtube-contentblock.md)
- [TR02] 🟢 2/5 — Add Image ContentBlock | [task](./drafts/TR02.add-image-contentblock.md)

### Tier 5: QuickList Domain Features 🟢

- [ADB] 🟡 2/5 — Reject invite | [task](./ready/ADB.reject-invite.md)
- [AQC] 🟢 1/5 — Copy email from project's shared list | [task](./drafts/AQC.copy-email-from-shared-list.md)
- [AQD] 🟢 2/5 — Animate check item as visible collapse | [task](./drafts/AQD.animate-check-item-collapse.md)

### Tier 6: RBAC Advanced (Defer) 🟢

- [ADR] 🟢 5/5 — EPIC - RBAC Refactor Policies | [task](./drafts/ADR.refactor-rbac-policies.md)
- [ADS] 🟢 3/5 — RBAC SQL Functions | [task](./drafts/ADS.sql-functions.md)
- [AAM] 🟢 4/5 — RBAC Advanced Features | [task](./drafts/AAM.rbac-advanced-features.md)

### Tier 7: Social Logins (On Demand) 🟢

- [ABL] 🟢 2/5 — Add social login: LinkedIn | [task](./drafts/ABL.add-social-login-linkedin.md)
- [ABK] 🟢 2/5 — Add social login: X | [task](./drafts/ABK.add-social-login-x.md)
- [TO37] 🟢 3/5 — Add social login: Apple | [task](./drafts/TO37.add-social-login-apple.md)
- [IK47] 🟢 2/5 — Add social login: Facebook | [task](./drafts/IK47.add-social-login-facebook.md)

### Tier 8: Documentation 🟢

- [ABH] 🟢 1/5 — Optimize App Config Documentation | [task](./drafts/ABH.optimize-app-config-documentation.md)
- [ABG] 🟢 1/5 — Optimize Feature Flags Documentation | [task](./drafts/ABG.optimize-feature-flags-documentation.md)
- [ABF] 🟢 1/5 — Optimize Route Groups Documentation | [task](./drafts/ABF.optimize-route-groups-documentation.md)
- [ABE] 🟢 1/5 — Optimize Theming Documentation | [task](./drafts/ABE.optimize-theming-documentation.md)
- [ABD] 🟢 1/5 — Optimize Database Documentation | [task](./drafts/ABD.optimize-database-documentation.md)
- [ACW] 🟢 2/5 — Document Getting Started with README information | [task](./drafts/ACW.document-getting-started.md)

### Tier 9: Big Bets (Park) 🟢

- [ABN] 🟢 5/5 — Migrate to Prisma ORM | [task](./drafts/ABN.migrate-to-prisma-orm.md)
- [AAT] 🟢 5/5 — Support i18n | [task](./drafts/AAT.support-i18n.md)
- [ADD] 🟢 2/5 — Implement CLI scripts | [task](./drafts/ADD.implement-cli-scripts.md)

## Completed

- [ADE] Remove middleware | [task](./completed/ADE.remove-middleware.md)
- [ACR] QuickList - API: delete project | [task](./completed/ACR.quicklist-api-delete-project.md)
- [AQB] Delete checked items | [task](./completed/AQB.delete-checked-items.md)
- [AQA] Fix quicklist reorder API | [task](./completed/AQA.fix-quicklist-reorder-api.md)
- [ADA] Accept invite | [task](./completed/ADA.accept-invite.md)
- [ABA] QuickList - invite collaborator | [task](./completed/ABA.quicklist-invite-collaborator.md)
- [ACU] QuickList - isolate data by app-id | [task](./completed/ACU.isolate-data-appid.md)
- [AAX] QuickList - create new list | [task](./completed/AAX.quicklist-create-new-list.md)
- [ACT] QuickList - support check/uncheck task in UI | [task](./completed/ACT.quicklist-support-check-uncheck-task-ui.md)
- [ACU] QuickList - support edit task title in UI | [task](./completed/ACU.quicklist-support-edit-task-title-ui.md)
- [AAZ] QuickList - edit list page | [task](./completed/AAZ.quicklist-edit-list-page.md)
- [ABY] QuickList - API: create project with initial task | [task](./completed/ABY.quicklist-api-create-project.md)
- [ACG] QuickList - API: update task | [task](./completed/ACG.quicklist-api-update-task.md)
- [AAY] QuickList - view list page | [task](./completed/AAY.quicklist-view-list-page.md)
- [ACC] QuickList - API: get project with tasks | [task](./completed/ACC.quicklist-api-get-project.md)
- [AAW] QuickList - projects page | [task](./completed/AAW.quicklist-projects-page.md)
- [ABW] QuickList - API: list projects and invites | [task](./completed/ABW.quicklist-api-get-projects.md)
- [ABB] QuickList - data model | [task](./completed/ABB.quicklist-data-model.md)
- [AQE] Upgrade to major versions | [task](./completed/AQE.upgrade-to-major-versions.md)
- [ACZ] Make the app iPhone home-screen compatible | [task](./completed/ACZ.make-the-app-iphone-home-screen-compatible.md)
- [ACS] Devise how to test API through authenticated curl calls | [task](./completed/ACS.test-api.md)
- [ACT] App default page | [task](./completed/ACT.app-default-page.md)
- [AAO] Add app name to waitlist table
- [AAP] Add app name to feedback table
- [AEE] Protect feedback route with feature flag | [task](./completed/AEE.protect-feedback-route-with-feature-flag.md)
- [AED] Protect waitlist route with feature flag | [task](./completed/AED.protect-waitlist-route-with-feature-flag.md)
- [AEN] Move logout button to profile's page top bar | [task](./completed/AEN.move-logout-button-to-profile-top-bar.md)
- [AAL] RBAC Menu Integration | [task](./completed/AAL.rbac-menu-integration.md)
- [ACJ] Next standalone has .env file | [task](./completed/ACJ.next-standalone.md)
- [AEL] Stack Block Component | [task](./completed/AEL.stack-block-component.md)
- [AEK] Add Call To Action content block | [task](./completed/AEK.add-call-to-action-content-block.md)
- [AEJ] Fix protectPage Switch Fall-Through Bug | [task](./completed/AEJ.fix-protectpage-switch-fallthrough.md)
- [AEH] Remove Wildcard Grant Support | [task](./completed/AEH.remove-wildcard-grant-support.md)
- [ADT] Unified Policy Engine | [task](./completed/ADT.unified-policy-engine.md)
- [ADV] Protect SSR Pages with Policies | [task](./completed/ADV.protect-ssr-pages.md)
- [ADZ] API Route Policy Guard uses Policies | [task](./completed/ADZ.api-route-policy-guard.md)
- [ADX] AppLayout Policy Integration | [task](./completed/ADX.applayout-policy-integration.md)
- [AEB] Consolidate RBAC Into Policy Engine | [task](./completed/AEB.consolidate-rbac-into-policy-engine.md)
- [ADU] Feature Flags Unification to AppConfig.features | [task](./completed/ADU.feature-flags-unification.md)
- [ADY] Cleanup Legacy Feature Flags | [task](./completed/ADY.cleanup-legacy-feature-flags.md)
- [AAK] RBAC Page & Route Protection | [task](./completed/AAK.rbac-page-route-protection.md)
- [AAJ] RBAC useGrants Hook & Client Components | [task](./completed/AAJ.rbac-usegrants-hook.md)
- [AAI] RBAC Database Schema & Core Infrastructure | [task](./completed/AAI.add-rbac.md)
- [ADL] docs: Links from the docs index page don't work | [task](./completed/ADL.docs-article-walls-links.md)
- [ADQ] Clean up AppConfig matching logic | [task](./completed/ADQ.clean-appconfig-match.md)
- [ACI] Add config.match.header | [task](./completed/ACI.config-match-header.md)
- [ADM] Import feedback block | [task](./completed/ADM.import-feedback-block.md)
- [ABT] Import waitlist block | [task](./completed/ABT.import-waitlist-block.md)
- [ABS] Import pricing block | [task](./completed/ABS.import-pricing-block.md)
- [ADF] Custom Actions Type (SUPERSEDED) | [task](./completed/ADF.custom-actions-type.md)
- [ADI] Create PublicLayout TActionItem Type | [task](./completed/ADI.create-publiclayout-tactionitem-type.md)
- [ADZ] API Route Policy Guard uses Policies | [task](./completed/ADZ.api-route-policy-guard.md)
- [ADX] AppLayout Policy Integration | [task](./completed/ADX.applayout-policy-integration.md)
- [AEB] Consolidate RBAC Into Policy Engine | [task](./completed/AEB.consolidate-rbac-into-policy-engine.md)
- [ADU] Feature Flags Unification to AppConfig.features | [task](./completed/ADU.feature-flags-unification.md)
- [ADY] Cleanup Legacy Feature Flags | [task](./completed/ADY.cleanup-legacy-feature-flags.md)
- [AAK] RBAC Page & Route Protection | [task](./completed/AAK.rbac-page-route-protection.md)
- [AAJ] RBAC useGrants Hook & Client Components | [task](./completed/AAJ.rbac-usegrants-hook.md)
- [AAI] RBAC Database Schema & Core Infrastructure | [task](./completed/AAI.add-rbac.md)
- [ADL] docs: Links from the docs index page don't work | [task](./completed/ADL.docs-article-walls-links.md)
- [ADQ] Clean up AppConfig matching logic | [task](./completed/ADQ.clean-appconfig-match.md)
- [ACI] Add config.match.header | [task](./completed/ACI.config-match-header.md)
- [ADM] Import feedback block | [task](./completed/ADM.import-feedback-block.md)
- [ABT] Import waitlist block | [task](./completed/ABT.import-waitlist-block.md)
- [ABS] Import pricing block | [task](./completed/ABS.import-pricing-block.md)
- [ADF] Custom Actions Type (SUPERSEDED) | [task](./completed/ADF.custom-actions-type.md)
- [ADI] Create PublicLayout TActionItem Type | [task](./completed/ADI.create-publiclayout-tactionitem-type.md)
- [ADJ] Create AppLayout TActionItem Type | [task](./completed/ADJ.create-applayout-tactionitem-type.md)
- [ADH] Rename HeaderLinks to ToolbarActions | [task](./completed/ADH.rename-headerlinks-toolbaractions.md)
- [ADG] Rename Toolbar API for Consistency | [task](./completed/ADG.rename-toolbar-api-consistency.md)
- [ADC] Implement client/server BlockContent | [task](./completed/ADC.block-content-client-server.md)
- [ABQ] Add App layout | [task](./completed/ABQ.app-layout.md)
- [AAU] Implement public layout | [task](./completed/AAU.implement-public-layout.md)
- [ADA] Move components/auth to 42go folder
- [ACY] Move components/layouts into 42go folder
- [ABZ] Fix public links in toolbar | [task](./completed/ABZ.public-toolbar-links.md)
- [ACX] Abstract configurable components | [task](./completed/ACX.abstract-configurable-components.md)
- [ACV] Document Pages/hero
- [ACU] Document Pages/markdown
- [ACS] Document Markdown component and types
- [ACT] Implement & document custom component in Pages
- [ACQ] Create Basic UI POC for User Dashboard | [task](./completed/ACQ.create-basic-ui-poc-user-dashboard.md)
- [ACP] Create Custom Terms and Conditions | [task](./completed/ACP.create-custom-terms-conditions.md)
- [ACO] Create Custom Landing Page for Calendar Config | [task](./completed/ACO.create-custom-landing-page-calendar.md)
- [ACN] Create Calendar App Config | [task](./completed/ACN.create-calendar-app-config.md)
- [ACH] Create a Markdown block | [task](./completed/ACH.create-markdown-block.md)
- [ACL] Simplify boot for new developers | [task](./completed/ACL.simplify-boot.md)
- [ACD] Move config.docs to config.public.docs | [task](./completed/ACD.move-config-docs-to-config-public-docs.md)
- [ACB] Move config.pages to config.public.pages
- [ACE] Move config.meta to config.public.meta | [task](./completed/ACE.move-config-meta-to-config-public-meta.md)
- [ACF] Add config.match.url to receive a regexp | [task](./completed/ACF.config-match-url.md)
- [ACA] Render docs | [task](./completed/ACA.render-docs.md)
- [ABV] Fix AppTitle's with config data source | [task](./completed/ABV.app-title-data.md)
- [ABR] Import Hero block | [task](./completed/ABR.import-hero-block.md)
- [ABU] Import dark-mode background color | [task](./completed/ABU.import-dark-mode-background.md)
- [ABP] Add Public layout | [task](./completed/ABP.public-layout.md)
- [ABO] Production build | [task](./completed/ABO.production-build.md)
- [ABM] Support social login from different app configuration | [task](./completed/ABM.support-social-login-different-app-configuration.md)
- [ABJ] Make each login strategy conditional based on env vars | [task](./completed/ABJ.make-login-strategy-conditional-on-env-vars.md)
- [ABI] Refactor login code (improve modularization) | [task](./completed/ABI.refactor-login-code-improve-modularization.md)
- [ABB] Implement Dynamic Authentication Strategy | [task](./completed/ABB.implement-dynamic-authentication-strategy.md)
- [AAN] Add social login: Google | [task](./completed/AAN.add-social-login-google.md)
- [AAL] Add social login: GitHub | [task](./completed/AAL.add-social-login-github.md)
- [ABC] Optimize Memory Bank for LLM Consumption | [task](./completed/ABC.optimize-memory-bank-for-llm-consumption.md)
- [ABA] Use Database Users Table to Authenticate Users | [task](./completed/ABA.use-database-users-table-to-authenticate.md)
- [AAH] Add login support | [task](./completed/AAH.add-login-support.md)
- [AAJ] Add ARCHITECTURE.md to the Memory Bank | [task](./completed/AAJ.add-architecture-md-to-the-memory-bank.md)
- [AAW] Simplify db support to Postgres | [task](./completed/AAW.simplify-db-support-to-postgres.md)
- [AAG] Add Database connection pool | [task](./completed/AAG.add-database-connection-pool.md)
- [AAC] Support different public layout based on App-config | [task](./completed/AAC.support-different-public-layout-based-on-app-config.md)
- [AAB] Support different CSS projects by App-config
- [AAV] Implement Button component | [task](./completed/AAV.implement-button-component.md)
- [AAF] Support accent color in App config | [task](./completed/AAF.support-accent-color.md)
- [AAU] Implement public layout | [task](./completed/AAU.implement-public-layout.md)
- [AAE] Support default theme in App config | [task](./completed/AAE.default-theme-from-config.md)
- [AAS] Layout's metadata should come from the configuration | [task](./completed/AAS.layout-medatada-from-config.md)
- [AAD] General dark-mode support | [task](./completed/AAD.general-dark-mode-support.md)
- [AAA] Initialize backlog | [task](./completed/AAA.initialize-backlog.md)
- [AAP] API routes ACL with App config feature flags
- [AAQ] Page routes ACL with App config feature flags
- [AAR] Identify App config by Request properties
- [AEC] Abstract Panel Component | [task](./completed/AEC.abstract-panel-component.md)

## Archived
