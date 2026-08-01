import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { describe, it } from "node:test";

import { activateQuickShareFilesystemRelease } from "../src/lib/quickshare/server/filesystem-publisher.ts";
import { compileQuickShareWebPage } from "../src/lib/quickshare/server/web-page-compiler-core.ts";

const execFile = promisify(execFileCallback);

const curl = async (url: string, headers = false) => {
  const { stdout } = await execFile("curl", ["--silent", "--show-error", "--fail", ...(headers ? ["-D", "-"] : []), "-H", "Host: s.42go.dev", url]);
  return stdout;
};

describe("QuickShare web-page static publication", () => {
  it("serves compiled HTML, JavaScript, CSS, and managed assets through Nginx without editor authority", async () => {
    // Docker Desktop does not expose every host temporary directory to bind
    // mounts. Keep this disposable fixture inside the mounted workspace.
    const root = await mkdtemp(path.join(process.cwd(), ".quickshare-web-page-test-"));
    const container = `quickshare-web-page-${process.pid}-${Date.now()}`;
    const port = 18100 + (process.pid % 400);
    const priorRoot = process.env.QUICKSHARE_PUBLICATION_ROOT;
    process.env.QUICKSHARE_PUBLICATION_ROOT = root;
    try {
      const bundle = compileQuickShareWebPage({
        title: "Static page",
        content: {
          html: '<main><img src="assets/logo.png"><h1>Static page</h1></main>',
          css: 'h1 { color: green; background-image: url("assets/logo.png"); }',
          javascript: 'document.documentElement.dataset.staticPage = "ready";',
          assets: [{ path: "assets/logo.png", contentType: "image/png", data: Buffer.from("fake-png").toString("base64") }],
        },
      });
      await activateQuickShareFilesystemRelease({
        appId: "quickshare", accountId: "account-42", resourceId: "resource-42", releaseId: "release-01",
        bundle, nextIdentifier: { kind: "short", shortCode: "page42" }, previousIdentifier: null,
      });
      const stable = await readFile(path.join(root, "page42", "index.html"), "utf8");
      const sidecars = [...stable.matchAll(/\/_quickshare\/releases\/quickshare\/resource-42\/release-01\/(assets\/[^"']+)/g)].map((match) => match[1]);
      assert.equal(sidecars.length, 3);
      assert.throws(() => compileQuickShareWebPage({ title: "Broken", content: { html: "<main>broken</main>", css: "", javascript: 'import packageName from "not-supported";', assets: [] } }));
      assert.equal(await readFile(path.join(root, "page42", "index.html"), "utf8"), stable);

      await execFile("docker", ["run", "-d", "--rm", "--name", container, "-p", `${port}:8080`, "-v", `${path.resolve("infra/quickshare-nginx/nginx.conf")}:/etc/nginx/conf.d/default.conf:ro`, "-v", `${root}:/srv/quickshare-public:ro`, "nginx:1.27-alpine"]);
      let delivered = "";
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try { delivered = await curl(`http://127.0.0.1:${port}/page42`); break; }
        catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
      }
      if (!delivered) {
        const [{ stdout: response }, { stdout: logs }, { stdout: files }] = await Promise.all([
          execFile("curl", ["--silent", "-i", "-H", "Host: s.42go.dev", `http://127.0.0.1:${port}/page42`]),
          execFile("docker", ["logs", container]),
          execFile("docker", ["exec", container, "sh", "-c", "find /srv/quickshare-public -maxdepth 8 -print; ls -la /srv/quickshare-public; ls -la /srv/quickshare-public/page42"]),
        ]);
        throw new Error(`Nginx did not serve the generated page. Response: ${response}; logs: ${logs}; files: ${files}`);
      }
      assert.match(delivered, /Static page/);
      for (const assetPath of sidecars) {
        const response = await curl(`http://127.0.0.1:${port}/_quickshare/releases/quickshare/resource-42/release-01/${assetPath}`, true);
        assert.match(response, /HTTP\/1\.1 200/);
        assert.match(response, /Cache-Control: public, max-age=31536000, immutable/i);
        assert.doesNotMatch(response, /Set-Cookie:/i);
      }
    } finally {
      await execFile("docker", ["rm", "-f", container]).catch(() => undefined);
      if (priorRoot === undefined) delete process.env.QUICKSHARE_PUBLICATION_ROOT;
      else process.env.QUICKSHARE_PUBLICATION_ROOT = priorRoot;
      await rm(root, { recursive: true, force: true });
    }
  });
});
