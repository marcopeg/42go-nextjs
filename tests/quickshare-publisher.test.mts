import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  createQuickShareFixtureBundle,
  QuickShareBundleError,
  validateQuickShareReleaseBundle,
} from "../src/lib/quickshare/server/release-bundle.ts";
import {
  activateQuickShareFilesystemRelease,
  purgeQuickShareFilesystemResource,
  renameQuickShareFilesystemHandle,
} from "../src/lib/quickshare/server/filesystem-publisher.ts";

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");

describe("QuickShare publication contract", () => {
  it("accepts a complete hashed fixture and rejects malformed bundles before staging", () => {
    const valid = createQuickShareFixtureBundle();
    assert.equal(validateQuickShareReleaseBundle(valid).manifest.entry, "index.html");

    const missing = createQuickShareFixtureBundle('<img src="assets/missing.a1b2c3d4.png">');
    assert.throws(() => validateQuickShareReleaseBundle(missing), (error: unknown) => error instanceof QuickShareBundleError && error.code === "missing_reference");

    const mismatch = createQuickShareFixtureBundle();
    mismatch.files["assets/site.a1b2c3d4.css"] = Buffer.from("tampered");
    assert.throws(() => validateQuickShareReleaseBundle(mismatch), (error: unknown) => error instanceof QuickShareBundleError && error.code === "byte_size_mismatch");

    const traversal = createQuickShareFixtureBundle();
    traversal.manifest.files[1].path = "../escape.a1b2c3d4.css";
    assert.throws(() => validateQuickShareReleaseBundle(traversal), (error: unknown) => error instanceof QuickShareBundleError && error.code === "invalid_manifest");
  });

  it("validates CSS sidecar references and rejects protocol-relative or undeclared absolute references", () => {
    const css = Buffer.from('body { background: url("images/background.a1b2c3d4.png"); }');
    const image = Buffer.from("png");
    const html = Buffer.from('<link rel="stylesheet" href="assets/site.a1b2c3d4.css">');
    const bundle = {
      manifest: {
        version: "quickshare.release/v1" as const,
        entry: "index.html" as const,
        files: [
          { path: "index.html", contentType: "text/html; charset=utf-8", sha256: sha256(html), byteSize: html.byteLength },
          { path: "assets/site.a1b2c3d4.css", contentType: "text/css; charset=utf-8", sha256: sha256(css), byteSize: css.byteLength },
          { path: "assets/images/background.a1b2c3d4.png", contentType: "image/png", sha256: sha256(image), byteSize: image.byteLength },
        ],
      },
      files: { "index.html": html, "assets/site.a1b2c3d4.css": css, "assets/images/background.a1b2c3d4.png": image },
    };
    assert.equal(validateQuickShareReleaseBundle(bundle).localReferences.length, 2);

    const external = createQuickShareFixtureBundle('<script src="//cdn.example/asset.js"></script>');
    assert.throws(() => validateQuickShareReleaseBundle(external), (error: unknown) => error instanceof QuickShareBundleError && error.code === "protocol_relative_reference");
  });

  it("keeps the static origin isolated and makes filesystem operations compensable", async () => {
    const [publisher, nginx, compose] = await Promise.all([
      readFile("src/lib/quickshare/server/filesystem-publisher.ts", "utf8"),
      readFile("infra/quickshare-nginx/nginx.conf", "utf8"),
      readFile("docker-compose.prod.yml", "utf8"),
    ]);
    assert.match(publisher, /rollback: async/);
    assert.match(publisher, /purge-journal/);
    assert.match(publisher, /await handle\.sync\(\)/);
    assert.match(publisher, /await syncDirectory\(staging\)/);
    assert.match(publisher, /unsafe_stable_target/);
    assert.match(nginx, /location \/ \{ return 404; \}/);
    assert.doesNotMatch(nginx, /proxy_pass/);
    assert.match(nginx, /max-age=31536000, immutable/);
    assert.match(nginx, /Service-Worker-Allowed/);
    assert.match(compose, /quickshare-static/);
    assert.match(compose, /quickshare-publication-init/);
    assert.match(compose, /quickshare_publications:\/srv\/quickshare-public:ro/);
  });

  it("stages, switches, rolls back, and purges real fixture output under a temporary root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quickshare-publisher-"));
    const previousRoot = process.env.QUICKSHARE_PUBLICATION_ROOT;
    process.env.QUICKSHARE_PUBLICATION_ROOT = root;
    const common = { appId: "quickshare", accountId: "account-42", resourceId: "resource-42" };
    const short = { kind: "short" as const, shortCode: "alpha42" };
    const custom = { kind: "custom" as const, handle: "john", customId: "hello" };
    try {
      const first = await activateQuickShareFilesystemRelease({ ...common, releaseId: "release-01", bundle: createQuickShareFixtureBundle("<h1>one</h1>"), nextIdentifier: short, previousIdentifier: null });
      assert.match(await readFile(path.join(root, "alpha42", "index.html"), "utf8"), /one/);
      assert.equal(await readlink(path.join(root, "alpha42")), path.relative(path.join(root), path.join(root, ".quickshare", "entries", "quickshare", "resource-42", "release-01")));

      await activateQuickShareFilesystemRelease({ ...common, releaseId: "release-02", bundle: createQuickShareFixtureBundle("<h1>two</h1>"), nextIdentifier: short, previousIdentifier: short });
      assert.match(await readFile(path.join(root, "alpha42", "index.html"), "utf8"), /two/);
      assert.equal(await lstat(first.releaseDirectory).then((stat) => stat.isDirectory()), true);

      await activateQuickShareFilesystemRelease({ ...common, releaseId: "release-03", bundle: createQuickShareFixtureBundle("<h1>custom</h1>"), nextIdentifier: custom, previousIdentifier: short });
      await assert.rejects(lstat(path.join(root, "alpha42")));
      assert.match(await readFile(path.join(root, "john", "hello", "index.html"), "utf8"), /custom/);

      const reversible = await activateQuickShareFilesystemRelease({ ...common, releaseId: "release-04", bundle: createQuickShareFixtureBundle("<h1>rollback</h1>"), nextIdentifier: short, previousIdentifier: custom });
      await reversible.rollback();
      await assert.rejects(lstat(path.join(root, "alpha42")));
      assert.match(await readFile(path.join(root, "john", "hello", "index.html"), "utf8"), /custom/);

      const rename = await renameQuickShareFilesystemHandle({ appId: "quickshare", fromHandle: "john", toHandle: "jane" });
      await assert.rejects(lstat(path.join(root, "john", "hello")));
      assert.match(await readFile(path.join(root, "jane", "hello", "index.html"), "utf8"), /custom/);
      await rename.rollback();
      assert.match(await readFile(path.join(root, "john", "hello", "index.html"), "utf8"), /custom/);

      const purge = await purgeQuickShareFilesystemResource(common);
      await assert.rejects(lstat(path.join(root, "john", "hello")));
      await purge.rollback();
      assert.match(await readFile(path.join(root, "john", "hello", "index.html"), "utf8"), /custom/);
      const finalPurge = await purgeQuickShareFilesystemResource(common);
      await finalPurge.finalize();
      await assert.rejects(lstat(path.join(root, "_quickshare", "releases", "quickshare", "resource-42")));
    } finally {
      if (previousRoot === undefined) delete process.env.QUICKSHARE_PUBLICATION_ROOT;
      else process.env.QUICKSHARE_PUBLICATION_ROOT = previousRoot;
      await rm(root, { recursive: true, force: true });
    }
  });
});
