import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AppLayout keeps the standard mobile More item wired to its existing drawer", async () => {
  const layout = await readSource("src/42go/layouts/app/AppLayout.tsx");

  assert.match(layout, /onMoreClick=\{\(\) => setIsMobileMenuOpen\(true\)\}/);
  assert.match(layout, /!hideMobileMenu && isMobileMenuOpen/);
  assert.match(layout, /<SidebarMenu/);
  assert.doesNotMatch(layout, /AppLayoutMobileMenuProvider/);
});

test("LingoCafe declaratively restricts the standard mobile More item to backoffice users", async () => {
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
  const moreIndex = config.indexOf("more:", mobileIndex);
  const policyIndex = config.indexOf("require: { role: 'backoffice' }", moreIndex);
  const mobileItemsIndex = config.indexOf("items:", moreIndex);

  assert.ok(mobileIndex >= 0);
  assert.ok(moreIndex > mobileIndex);
  assert.ok(policyIndex > moreIndex);
  assert.ok(mobileItemsIndex > policyIndex);
  assert.doesNotMatch(config.slice(mobileIndex, mobileItemsIndex), /disableMore: true/);
  assert.doesNotMatch(config, /toolbarActions|AppLayoutMobileMenuTrigger/);
  assert.doesNotMatch(profilePage, /profile\?\.toolbarActions/);
  assert.doesNotMatch(defaultConfig, /mobile:\s*\{\s*more:/);
  assert.doesNotMatch(quicklistConfig, /mobile:\s*\{\s*more:/);
});
