import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectPWAInstallPlatform } from "../src/42go/pwa/install-platform.ts";
import { shouldReloadPWAInstallDocument } from "../src/42go/pwa/document-identity.ts";
import {
  matchPWAPathPattern,
  validatePWAInstallTargetDeclarations,
  validatePWAManifestPathTemplate,
  validatePWAPathPattern,
} from "../src/42go/pwa/path-pattern.ts";
import { validatePWAInstallTarget } from "../src/42go/pwa/validation.ts";

const icons = {
  faviconIco: "/icons/favicon.ico",
  favicon16: "/icons/favicon-16.png",
  favicon32: "/icons/favicon-32.png",
  appleTouch180: "/icons/apple-180.png",
  manifest192: "/icons/manifest-192.png",
  manifest512: "/icons/manifest-512.png",
  maskable512: "/icons/maskable-512.png",
};

describe("PWA target path patterns", () => {
  const pattern = "/quicklists/:projectId/**";

  it("matches a canonical resource path and its nested pages", () => {
    assert.deepEqual(matchPWAPathPattern(pattern, "/quicklists/list-1"), {
      projectId: "list-1",
    });
    assert.deepEqual(
      matchPWAPathPattern(pattern, "/quicklists/list-1/info"),
      { projectId: "list-1" }
    );
  });

  it("rejects incomplete and unrelated paths", () => {
    assert.equal(matchPWAPathPattern(pattern, "/quicklists"), null);
    assert.equal(matchPWAPathPattern(pattern, "/books/list-1"), null);
  });

  it("rejects ambiguous pattern declarations", () => {
    assert.throws(() => validatePWAPathPattern("quicklists/:id"));
    assert.throws(() => validatePWAPathPattern("/quicklists/**/:id"));
    assert.throws(() => validatePWAPathPattern("/quicklists/:id/:id"));
    assert.throws(() =>
      validatePWAManifestPathTemplate({
        pattern,
        template: "/quicklists/:unknown",
      })
    );
    assert.throws(() =>
      validatePWAInstallTargetDeclarations([
        { pattern: "/quicklists/:id", resolver: "one" },
        { pattern: "/quicklists/:projectId", resolver: "two" },
      ])
    );
  });
});

describe("PWA install-target validation", () => {
  const target = {
    id: "/quicklists/list-1",
    name: "  Groceries   today  ",
    shortName: "Groceries",
    themeColor: "#ffffff",
    backgroundColor: "#000000",
    statusBarStyle: "default" as const,
    display: "standalone" as const,
    scope: "/quicklists/",
    startUrl: "/quicklists/list-1?source=installed",
    manifestPath: "/quicklists/list-1",
    icons,
    private: true,
  };

  it("normalizes names and preserves a safe same-origin launch URL", () => {
    const resolved = validatePWAInstallTarget(target);
    assert.equal(resolved.name, "Groceries today");
    assert.equal(resolved.startUrl, "/quicklists/list-1?source=installed");
  });

  it("rejects cross-origin, fragmented, and out-of-scope targets", () => {
    assert.throws(() =>
      validatePWAInstallTarget({ ...target, startUrl: "https://example.com" })
    );
    assert.throws(() =>
      validatePWAInstallTarget({ ...target, id: "/quicklists/list-1#copy" })
    );
    assert.throws(() =>
      validatePWAInstallTarget({ ...target, startUrl: "/books/list-1" })
    );
  });
});

describe("PWA installation instruction platform", () => {
  it("recognizes iPhone, iPad desktop mode, Chromium, and macOS Safari", () => {
    assert.equal(
      detectPWAInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone) AppleWebKit Safari",
        vendor: "Apple Computer, Inc.",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
      "ios"
    );
    assert.equal(
      detectPWAInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit Safari",
        vendor: "Apple Computer, Inc.",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
      "ios"
    );
    assert.equal(
      detectPWAInstallPlatform({
        userAgent: "Mozilla/5.0 Chrome/148.0.0.0 Safari/537.36",
        vendor: "Google Inc.",
        platform: "Linux x86_64",
        maxTouchPoints: 0,
      }),
      "chromium"
    );
    assert.equal(
      detectPWAInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh) Version/26.0 Safari/605.1.15",
        vendor: "Apple Computer, Inc.",
        platform: "MacIntel",
        maxTouchPoints: 0,
      }),
      "mac-safari"
    );
  });
});

describe("PWA document identity transitions", () => {
  it("reloads when client navigation crosses into a different virtual app", () => {
    assert.equal(
      shouldReloadPWAInstallDocument({
        currentHref:
          "/manifest.webmanifest?path=%2Fquicklists%2Flist-1",
        currentPathname: "/quicklists/list-1",
        initialHref: "/manifest.webmanifest",
        initialPathname: "/quicklists",
      }),
      true
    );
  });

  it("does not reload within one virtual app or loop on a direct request", () => {
    const manifestHref =
      "/manifest.webmanifest?path=%2Fquicklists%2Flist-1";

    assert.equal(
      shouldReloadPWAInstallDocument({
        currentHref: manifestHref,
        currentPathname: "/quicklists/list-1/info",
        initialHref: manifestHref,
        initialPathname: "/quicklists/list-1",
      }),
      false
    );
    assert.equal(
      shouldReloadPWAInstallDocument({
        currentHref: manifestHref,
        currentPathname: "/quicklists/list-1",
        initialHref: "/manifest.webmanifest",
        initialPathname: "/quicklists/list-1",
      }),
      false
    );
  });
});
