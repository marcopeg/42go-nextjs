import { z } from 'zod';

const safeImageMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const safeHttpUrl = z
  .string()
  .url()
  .max(2_048)
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        context.addIssue({ code: 'custom', message: 'Links must use http or https URLs.' });
      }
    } catch {
      context.addIssue({ code: 'custom', message: 'Links must be valid URLs.' });
    }
  });

export const quickShareLinksPageConfigSchema = z
  .object({
    profileImage: z
      .object({
        contentType: z.enum(safeImageMimeTypes),
        data: z
          .string()
          .min(4)
          .regex(base64Pattern, 'Profile image must be Base64 encoded.')
          .max(2_796_204),
        alt: z.string().trim().max(160),
      })
      .strict()
      .optional(),
    displayName: z.string().trim().min(1).max(100),
    biography: z.string().trim().max(500),
    links: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9_-]{1,64}$/i),
            label: z.string().trim().min(1).max(100),
            url: safeHttpUrl,
          })
          .strict()
      )
      .max(32)
      .superRefine((links, context) => {
        if (new Set(links.map(link => link.id)).size !== links.length) {
          context.addIssue({ code: 'custom', message: 'Every link needs a unique ID.' });
        }
      }),
    visual: z
      .object({
        theme: z.enum(['forest', 'ocean', 'sunset']),
        buttonStyle: z.enum(['rounded', 'pill']),
        alignment: z.enum(['center', 'left']),
      })
      .strict(),
  })
  .strict();

export type QuickShareLinksPageConfig = z.infer<typeof quickShareLinksPageConfigSchema>;

export const createQuickShareLinksPageConfig = (): QuickShareLinksPageConfig => ({
  displayName: 'Your name',
  biography: 'A short introduction for your visitors.',
  links: [{ id: 'website', label: 'My website', url: 'https://example.com' }],
  visual: { theme: 'forest', buttonStyle: 'rounded', alignment: 'center' },
});

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const themeClass = (theme: QuickShareLinksPageConfig['visual']['theme']) => `theme-${theme}`;

export const createQuickShareLinksPageCss = () =>
  `:root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;min-width:320px;background:var(--background);color:var(--foreground)}main{min-height:100vh;padding:48px 20px;background:radial-gradient(circle at top,var(--glow),transparent 42%)}.shell{width:min(100%,640px);margin:0 auto;text-align:var(--align)}.avatar{display:block;width:104px;height:104px;margin:0 auto 20px;border:3px solid var(--surface);border-radius:50%;object-fit:cover;box-shadow:0 12px 28px #0003}.avatar-placeholder{display:grid;place-items:center;width:104px;height:104px;margin:0 auto 20px;border:3px solid var(--surface);border-radius:50%;background:var(--surface);font-size:34px;font-weight:700;color:var(--accent)}h1{margin:0;font-size:clamp(28px,6vw,42px);line-height:1.1;letter-spacing:-.03em}p{margin:14px auto 0;max-width:52ch;color:var(--muted);font-size:17px;line-height:1.55}.links{display:grid;gap:12px;margin:32px 0 0;padding:0;list-style:none}.links a{display:block;padding:16px 20px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--foreground);font-weight:650;text-decoration:none;box-shadow:0 2px 10px #0000000d;transition:transform .16s ease,background .16s ease,border-color .16s ease}.links a:hover{transform:translateY(-1px);border-color:var(--accent);background:color-mix(in srgb,var(--surface) 94%,var(--accent))}.links a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.theme-forest{--background:#f1f7f1;--foreground:#142518;--muted:#4d6553;--surface:#fff;--border:#c9d9cc;--accent:#247348;--focus:#2f9e5d;--glow:#d7f0dc;--radius:12px}.theme-ocean{--background:#eef7fb;--foreground:#122b3c;--muted:#466576;--surface:#fff;--border:#c5dce8;--accent:#147ba7;--focus:#238fbf;--glow:#d3edf8;--radius:12px}.theme-sunset{--background:#fff5ee;--foreground:#3d2118;--muted:#795548;--surface:#fffdfb;--border:#f0d2c2;--accent:#bd5c38;--focus:#d16b43;--glow:#ffe0cb;--radius:12px}.button-pill{--radius:999px}@media (prefers-reduced-motion:reduce){.links a{transition:none}.links a:hover{transform:none}}`;

export const renderQuickShareLinksPageDocument = (input: {
  config: QuickShareLinksPageConfig;
  title: string;
  cssHref: string;
  profileImageHref?: string;
}) => {
  const { config } = input;
  const image =
    input.profileImageHref && config.profileImage
      ? `<img class="avatar" src="${escapeHtml(input.profileImageHref)}" alt="${escapeHtml(config.profileImage.alt || `${config.displayName} profile image`)}">`
      : `<div class="avatar-placeholder" aria-hidden="true">${escapeHtml(config.displayName.slice(0, 1).toUpperCase())}</div>`;
  const links = config.links
    .map(
      link =>
        `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title><link rel="stylesheet" href="${escapeHtml(input.cssHref)}"></head><body class="${themeClass(config.visual.theme)} ${config.visual.buttonStyle === 'pill' ? 'button-pill' : 'button-rounded'}"><main><section class="shell" style="--align:${config.visual.alignment}">${image}<h1>${escapeHtml(config.displayName)}</h1>${config.biography ? `<p>${escapeHtml(config.biography)}</p>` : ''}<ol class="links" aria-label="Links">${links}</ol></section></main></body></html>`;
};
