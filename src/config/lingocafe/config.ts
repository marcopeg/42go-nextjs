import { TAppConfigItem } from '../../AppConfig';
import { HomePage } from './home-page';
import { PrivacyPage, TermsPage } from './legal-pages';
import { User, BookOpen } from 'lucide-react';
import { LingoCafeContent } from '@/app/(app)/(lingocafe)/_components/LingoCafeContent';
import { LingoCafeTermsPrivacy } from '@/app/(app)/(lingocafe)/_components/LingoCafeTermsPrivacy';
import { LingocafePreferences } from '@/app/(app)/(lingocafe)/_components/LingocafePreferences';

export default {
  name: 'LingoCafe',
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
      terms: TermsPage,
      privacy: PrivacyPage,
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
      items: [
        { type: 'component', component: LingoCafeTermsPrivacy },
        { type: 'component', component: LingocafePreferences },
        { type: 'component', component: LingoCafeContent },
        { type: 'AccountInfo' },
        // { type: 'TestRBAC' },
        { type: 'Logout' },
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
