import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AppLayout keeps the standard mobile More item wired to its existing drawer", async () => {
  const layout = await readSource("src/42go/layouts/app/AppLayout.tsx");
  const modal = await readSource("src/42go/components/modal/Modal.tsx");
  const swipe = await readSource("src/42go/components/useSwipeableDismiss.ts");
  const bottomSheet = await readSource(
    "src/42go/components/SwipeableBottomSheet/SwipeableBottomSheet.tsx"
  );
  const conversationUi = await readSource(
    "src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"
  );

  assert.match(layout, /onMoreClick=\{\(\) => setIsMobileMenuOpen\(true\)\}/);
  assert.match(layout, /presentation="panel"/);
  assert.match(layout, /anchor="right"/);
  assert.match(layout, /swipeToClose/);
  assert.match(layout, /!w-4\/5/);
  assert.match(layout, /<SidebarMenu/);
  const sidebar = await readSource("src/42go/layouts/app/SidebarMenu.tsx");
  assert.match(
    sidebar,
    /border-t border-border p-3 \[&:not\(:has\(a\)\)\]:hidden/
  );
  assert.doesNotMatch(sidebar, /closeMobileMenu && "\[&:not\(:has/);
  assert.match(sidebar, /href="\/profile"/);
  assert.match(sidebar, /h-16 flex items-center border-t border-border p-3/);
  assert.doesNotMatch(layout, /Mobile Sidebar - Overlay/);
  assert.match(modal, /useSwipeableDismiss/);
  assert.match(modal, /data-\[state=open\]:slide-in-from-right/);
  assert.match(modal, /data-\[state=closed\]:slide-out-to-right/);
  assert.match(swipe, /passedDistance/);
  assert.match(swipe, /passedVelocity/);
  assert.match(swipe, /drag\.source === "backdrop"/);
  assert.match(swipe, /prefers-reduced-motion: reduce/);
  assert.match(swipe, /touchAction: horizontal \? "pan-y" : "none"/);
  assert.match(swipe, /startFromEdge && source === "surface"/);
  assert.match(swipe, /SWIPE_EDGE_SIZE = 32/);
  assert.match(swipe, /animateTo\([\s\S]*onDismiss\(\);[\s\S]*onCloseComplete\?\.\(\);/);
  assert.match(bottomSheet, /useSwipeableDismiss/);
  assert.match(conversationUi, /mobileSheetRef\.current\?\.close\(\)/);
  assert.match(conversationUi, /onCloseComplete=\{\(\) => \{/);
  assert.match(conversationUi, /if \(href\) router\.push\(href\)/);
  assert.doesNotMatch(layout, /AppLayoutMobileMenuProvider/);
});

test("LingoCafe shows More to everyone and disables its mobile Account entry", async () => {
  const [
    mobileBottomNav,
    appConfig,
    config,
    profilePage,
    defaultConfig,
    quicklistConfig,
  ] = await Promise.all([
    readSource("src/42go/layouts/app/MobileBottomNav.tsx"),
    readSource("src/AppConfig.ts"),
    readSource("src/config/lingocafe/config.ts"),
    readSource("src/app/(app)/profile/page.tsx"),
    readSource("src/config/default/config.ts"),
    readSource("src/config/quicklist/config.ts"),
  ]);

  assert.match(appConfig, /more\?: \{[\s\S]*policy\?: TAppLayoutNavItem\["policy"\]/);
  assert.match(mobileBottomNav, /const morePolicy = config\?\.app\?\.menu\?\.mobile\?\.more\?\.policy/);
  assert.match(mobileBottomNav, /morePolicy \? \(/);
  assert.match(mobileBottomNav, /policy=\{morePolicy\}/);
  assert.match(mobileBottomNav, /renderOnLoading=\{\(\) => null\}/);
  assert.match(mobileBottomNav, /renderOnError=\{\(\) => null\}/);
  assert.match(mobileBottomNav, /<span className="text-xs mt-1 font-medium">More<\/span>/);
  assert.match(mobileBottomNav, /min-w-0 flex-1/);

  const mobileIndex = config.indexOf("mobile:");
  const mobileItemsIndex = config.indexOf("items:", mobileIndex);
  const mobileMenuEndIndex = config.indexOf("collapsible:", mobileItemsIndex);

  assert.ok(mobileIndex >= 0);
  assert.ok(mobileItemsIndex > mobileIndex);
  assert.ok(mobileMenuEndIndex > mobileItemsIndex);
  assert.doesNotMatch(config.slice(mobileIndex, mobileItemsIndex), /disableMore: true/);
  assert.doesNotMatch(config.slice(mobileIndex, mobileItemsIndex), /more:/);
  assert.match(
    config.slice(mobileItemsIndex, mobileMenuEndIndex),
    /\/\/\s+title: 'Account',[\s\S]*\/\/\s+href: '\/profile'/
  );
  assert.doesNotMatch(config, /toolbarActions|AppLayoutMobileMenuTrigger/);
  assert.doesNotMatch(profilePage, /profile\?\.toolbarActions/);
  assert.doesNotMatch(defaultConfig, /mobile:\s*\{\s*more:/);
  assert.doesNotMatch(quicklistConfig, /mobile:\s*\{\s*more:/);
});
