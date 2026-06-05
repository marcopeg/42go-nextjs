import Image from 'next/image';
import type { Page } from '@/42go/components/DynamicPage';
import {
  LingoCafeLandingLogo,
  LingoCafeLandingThemeSwitch,
} from '@/config/lingocafe/LingoCafeLandingFooter';

const lingoCafeAssetsBasePath = (
  process.env.LC_ASSETS_BASE_PATH?.trim() || 'https://assets.lingocafe.app'
).replace(/\/+$/, '');

const LingoCafeScreensStrip = () => {
  const images = [
    {
      src: `${lingoCafeAssetsBasePath}/mkt/landing/17-surprise-shelf.webp`,
      alt: 'Books shelf screen',
    },
    {
      src: `${lingoCafeAssetsBasePath}/mkt/landing/18-surprise-reader.webp`,
      alt: 'Reader screen',
    },
    {
      src: `${lingoCafeAssetsBasePath}/mkt/landing/19-surprise-chapters.webp`,
      alt: 'Chapter contents screen',
    },
    {
      src: `${lingoCafeAssetsBasePath}/mkt/landing/20-surprise-settings.webp`,
      alt: 'Reading preferences screen',
    },
  ];

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-2 items-end gap-x-3 gap-y-12 px-6 md:grid-cols-4 md:gap-8">
      {images.map(image => (
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={588}
          height={1280}
          sizes="(max-width: 768px) 50vw, 15rem"
          unoptimized
          className="h-auto w-full"
        />
      ))}
    </section>
  );
};

export const HomePage: Page = {
  items: [
    {
      type: 'hero',
      margin: {
        top: {
          base: '28',
          md: '18',
        },
        bottom: {
          base: '20',
          md: '20',
        },
      },
      title: '**Expand** your Vocabulary with **Engaging** Books',
      subtitle: ' ',
      actions: [
        {
          label: 'Start Reading Now!',
          href: '/login',
          style: 'primary',
        },
      ],
    },
    {
      type: 'image',
      image: {
        src: `${lingoCafeAssetsBasePath}/mkt/landing/books.webp`,
        alt: 'LingoCafe book carousel reader preview',
        width: 4939,
        height: 1796,
        sizes: '(max-width: 768px) 100vw, 1200px',
        unoptimized: true,
        align: 'top',
        style: 'transparent',
        animation: 'slideUp',
      },
      margin: {
        top: '0',
        bottom: {
          base: '20',
          md: '18',
        },
      },
    },
    {
      type: 'component',
      component: LingoCafeScreensStrip,
      margin: {
        top: {
          base: '20',
          md: '16',
        },
        bottom: {
          base: '20',
          md: '18',
        },
      },
    },
    {
      type: 'markdown',
      margin: {
        top: {
          base: '20',
          md: '18',
        },
        bottom: '0',
      },
      source:
        '## Learn a language by reading books you actually finish\n\n1. Choose a book that matches your level and interests.\n2. Read one short chapter without switching apps.\n3. Use context to understand new words as they appear.\n4. Track your chapter progress and always know where to continue.\n5. Come back tomorrow, keep reading, and build vocabulary through repetition.',
    },
    {
      type: 'cta',
      action: {
        label: 'Start Reading Now!',
        href: '/login',
        variant: 'default',
        size: 'hero',
      },
      align: 'center',
      margin: {
        top: {
          base: '20',
          md: '18',
        },
        bottom: {
          base: '12',
          md: '12',
        },
      },
    },
    {
      type: 'component',
      component: LingoCafeLandingLogo,
      margin: {
        top: {
          base: '16',
          md: '16',
        },
        bottom: {
          base: '4',
          md: '4',
        },
      },
    },
    {
      type: 'component',
      component: LingoCafeLandingThemeSwitch,
      margin: {
        top: '4',
        bottom: {
          base: '10',
          md: '10',
        },
      },
    },
  ],
};
