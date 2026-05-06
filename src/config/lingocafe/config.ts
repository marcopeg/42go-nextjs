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
        { type: 'AccountInfo' },
        {
          type: 'component',
          component: LingocafePreferences,
          profileKeys: ['ownLang', 'targetLang', 'targetLevel'],
        },
        {
          type: 'ThemePreference',
          title: 'Theme Preferences',
          description: 'Choose how LingoCafe should look on this device.',
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
          purpose: 'Accept LingoCafe Terms and Conditions',
          legalBasis: 'contract',
          category: 'legal',
          statement: 'I accept the Terms and Conditions',
          label: 'I accept the Terms and Conditions',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'privacy',
          required: true,
          version: 'privacy-2026-05-04',
          purpose: 'Acknowledge LingoCafe Privacy Policy',
          legalBasis: 'legal-obligation',
          category: 'privacy',
          statement: 'I acknowledge the Privacy Policy',
          label: 'I acknowledge the Privacy Policy',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'mkt',
          required: false,
          version: 'mkt-2026-05-04',
          purpose: 'Receive LingoCafe content updates and offers',
          legalBasis: 'consent',
          category: 'marketing',
          statement: 'I consent to receive content updates and offers about LingoCafe services',
          label: 'I consent to receive content updates and offers about LingoCafe services',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        {
          name: 'alpha',
          required: false,
          version: 'alpha-2026-05-04',
          purpose: 'Join the LingoCafe Early Birds program',
          legalBasis: 'consent',
          category: 'program',
          statement:
            'I want to participate in the Early Birds program and receive all the features for free',
          label:
            'I want to participate in the Early Birds program and receive all the features for free',
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
