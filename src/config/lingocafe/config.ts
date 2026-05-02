import { TAppConfigItem } from '../../AppConfig';
import { HomePage } from './home-page';

export default {
  name: 'LingoCafe',
  logo: '/lingocafe/logo.png',
  match: {
    url: ['^read.lingocafe.app+$', '^lc42go.ngrok.app+$'],
  },
  features: ['page:books', 'api:lingocafe'],
  theme: {
    default: 'light',
  },
  public: {
    meta: {
      title: 'LingoCafe',
      description: 'A focused language-learning app with simple sign-in.',
      keywords: ['lingocafe', 'language learning', 'google login', 'auth'],
      authors: [{ name: 'LingoCafe' }],
    },
    toolbar: {
      disabled: true,
    },
    pages: {
      HomePage,
    },
    footer: {
      disabled: true,
    },
    pwa: {
      name: 'LingoCafe',
      shortName: 'LingoCafe',
      description: 'A focused language-learning app with simple sign-in.',
      themeColor: 'light',
      backgroundColor: 'light',
      startUrl: '/books',
      scope: '/',
      display: 'standalone',
      icons: {
        appleTouch180: '/lingocafe/favicon/favicon-180x180.png',
        manifest192: '/lingocafe/favicon/favicon-192x192.png',
        manifest512: '/lingocafe/favicon/favicon-512x512.png',
      },
    },
  },
  auth: {
    providers: [
      {
        type: 'credentials' as const,
        config: {},
      },
      {
        type: 'google' as const,
        config: {
          clientId: process.env.LC_GOOGLE_CLIENT_ID!,
          clientSecret: process.env.LC_GOOGLE_CLIENT_SECRET!,
          prompt: 'select_account',
        },
      },
    ],
    logout: {
      url: '/',
    },
  },
  app: {
    default: {
      page: '/books',
    },
  },
} as const satisfies TAppConfigItem;
