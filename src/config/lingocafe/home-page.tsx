import type { Page } from '@/42go/components/DynamicPage';

const lingoCafeAssetsBasePath = (
  process.env.LC_ASSETS_BASE_PATH?.trim() || 'https://assets.lingocafe.app'
).replace(/\/+$/, '');

export const HomePage: Page = {
  items: [
    {
      type: 'hero',
      title: '**LingoCafe.app**',
      subtitle: '**Expand Your Vocabulary** with Engaging Books',
      actions: [
        {
          label: 'Start Learning for Free!',
          href: '/login',
          style: 'primary',
        },
      ],
      // alignment: 'left',
    },
    {
      type: 'image',
      image: {
        src: `${lingoCafeAssetsBasePath}/mkt/s2.landing-side-540.webp`,
        alt: 'Image ContentBlock stacked layout example',
        width: 1080,
        height: 1350,
        // sizes: '(max-width: 400px) 100vw, 400px',
        align: 'left',
        // style: 'transparent',
        animation: 'slideUp',
      },
      content: {
        valign: 'center',
        animation: 'fade',
        path: './src/config/lingocafe/s1.md',
      },
    },
    {
      type: 'cta',
      action: {
        label: 'Start Learning for Free!',
        href: '/login',
        variant: 'default',
        size: 'hero',
      },
      align: 'center',
    },
  ],
};
