import { TAppConfigItem } from '../../AppConfig';
import { HomePage } from './home-page';
import { User, BookOpen } from 'lucide-react';
import { LingocafePreferences } from '@/app/(app)/(lingocafe)/_components/LingocafePreferences';
import { lingoCafeProfileSchema } from '@/config/lingocafe/profile-options';

export default {
  name: 'LingoCafe',
  match: {
    url: ['^read.lingocafe.app+$', '^lc42go.ngrok.app+$'],
  },
  features: ['page:books', 'api:lingocafe', 'api:profile'],
  theme: {
    default: 'system',
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
    profile: {
      schema: lingoCafeProfileSchema,
      items: [
        // { type: 'AccountInfo' },
        {
          type: 'component',
          component: LingocafePreferences,
          profileKeys: ['ownLang', 'targetLang', 'targetLevel'],
        },
        {
          type: 'ThemePreference',
          title: 'Theme',
          description: 'Choose how the app appearance should be determined.',
        },
        {
          type: 'Consent',
          title: 'Terms, Privacy, and Updates',
          description: 'Choose required acknowledgements and optional updates.',
          source: 'profile',
          method: 'checkbox-submit',
        },
        // { type: 'TestRBAC' },
        { type: 'Logout' },
      ],
    },
    consent: {
      items: [
        {
          name: 'terms',
          required: true,
          version: 'terms-2026-05-04',
          label:
            'I agree to the [Terms of Service](https://lingocafe.app/en/legal/terms-of-service/)',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'privacy',
          required: true,
          version: 'privacy-2026-05-04',
          label:
            'I have read and understood the [Privacy Policy](https://lingocafe.app/en/legal/privacy-policy/)',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'mkt',
          required: false,
          version: 'mkt-2026-05-04',
          label:
            'Keep me updated on new title releases and early access to new features.\n_You can unsubscribe at any time_',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'alpha',
          required: false,
          version: 'alpha-2026-05-04',
          label:
            'Join the Early Birds Programme — free, unlimited access while the app is in development, in exchange for sharing feedback through surveys, in-app prompts, and occasional interviews. Continued access requires participation.\n[Programme Terms](https://lingocafe.app/en/legal/early-birds-program/)',
          collect: ['source', 'method', 'ip', 'ua'],
        },
      ],
    },
    menu: {
      top: {
        items: [
          {
            title: 'Books',
            href: '/books',
            icon: BookOpen,
          },
        ],
      },
      mobile: {
        disableMore: true,
        items: [
          {
            title: 'Books',
            href: '/books',
            icon: BookOpen,
          },
          {
            title: 'Account',
            href: '/profile',
            icon: User,
          },
        ],
      },
      collapsible: {
        position: 'bottom',
      },
    },
  },
} as const satisfies TAppConfigItem;
