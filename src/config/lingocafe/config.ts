import { TAppConfigItem } from '../../AppConfig';
import { HomePage } from './home-page';
import { Bell, User, Users, BookOpen, MessagesSquare } from 'lucide-react';
import { LingocafePreferences } from '@/app/(app)/(lingocafe)/_components/LingocafePreferences';
import { hasCachedLingoCafeProfileCompletion } from '@/config/lingocafe/profile-completion-cache';
import { lingoCafeProfileSchema } from '@/config/lingocafe/profile-options';

export default {
  name: 'LingoCafe',
  match: {
    url: ['^read.lingocafe.app+$', '^lc42go.ngrok.app+$'],
  },
  qr: {
    active: true,
    pageURL: ['\\/books\\/[^/?#]+/?(?:[?#].*)?$'],
    title: {
      text: 'LingoCafe.app',
      position: 'left',
      alignment: 'center',
      icon: {
        src: '/app-icons/lingocafe/ui.png',
        alt: 'LingoCafe',
        position: 'top',
        alignment: 'center',
      },
    },
  },
  features: ['page:books', 'page:conversations', 'page:users', 'page:notifications', 'api:lingocafe', 'api:events', 'api:profile', 'api:users', 'api:notifications'],
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
      title: 'LingoCafe.app',
      subtitle: 'easy reading books & media',
      icon: '',
      href: '/',
      actions: [
        {
          type: 'link',
          label: 'Start Reading Now!',
          href: '/login',
          variant: 'default',
          size: 'sm',
        },
      ],
    },
    pages: {
      HomePage,
    },
    footer: {
      links: [
        {
          label: 'Terms',
          href: 'https://lingocafe.app/en/legal/terms-of-service/',
        },
        {
          label: 'Privacy',
          href: 'https://lingocafe.app/en/legal/privacy-policy/',
        },
        {
          label: 'Data Management',
          href: 'https://lingocafe.app/en/legal/data-management/',
        },
      ],
    },
    pwa: {
      id: '/books',
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
        type: 'email' as const,
        config: {
          from: 'LingoCafe <login@lingocafe.app>',
          subject: '{{code}} is your LingoCafe sign-in code',
          //body: 'code: {{code}}\n\nlink: {{url}}\n\nThis code will expire at {{expiry}}.',
          useStrategy: process.env.LC_EMAIL_AUTH_STRATEGY || 'console',
          strategies: {
            resend: {
              type: 'resend',
              apiKey: process.env.LC_RESEND_API_KEY,
            },
          },
        },
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
    notifications: {
      showInProfile: true,
      showHistoryLink: true,
    },
    default: {
      page: '/books',
    },
    profile: {
      schema: lingoCafeProfileSchema,
      guard: {
        slot: 'before',
        shouldBlock: () => !hasCachedLingoCafeProfileCompletion(),
        loader: () => import('@/app/(app)/(lingocafe)/_components/LingocafeOnboardingGuard'),
      },
      items: [
        // { type: 'TestRBAC' },
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
            '**Keep me updated** on new title releases and early access to new features.\n\n_You can unsubscribe at any time!_',
          collect: ['source', 'method', 'ip', 'ua'],
        },
        // {
        //   name: 'alpha',
        //   required: false,
        //   version: 'alpha-2026-05-04',
        //   label:
        //     '**Join Early Birds**\nGet early access to new features and help shape LingoCafe with occasional feedback.\n[Programme Terms](https://lingocafe.app/en/legal/early-birds-program/)',
        //   collect: ['source', 'method', 'ip', 'ua'],
        // },
      ],
    },
    events: {
      enabled: true,
      requireSession: true,
      allowAnonymous: false,
      batchSize: 10,
      flushIntervalMs: 5000,
    },
    menu: {
      top: {
        items: [
          {
            title: 'Books',
            href: '/books',
            icon: BookOpen,
          },
          {
            title: 'Conversations',
            href: '/conversations',
            icon: MessagesSquare,
            policy: {
              require: { feature: 'page:conversations', session: true },
            },
          },
        ],
      },
      bottom: {
        items: [
          {
            title: 'Users',
            href: '/backoffice/users',
            icon: Users,
            policy: {
              require: { role: 'backoffice' },
            },
          },
          {
            title: 'Notifications',
            href: '/backoffice/notifications',
            icon: Bell,
            policy: {
              require: {
                feature: 'page:notifications',
                session: true,
                role: 'backoffice',
                grants: ['notifications:list'],
              },
            },
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
            title: 'Conversations',
            href: '/conversations',
            icon: MessagesSquare,
            policy: {
              require: { feature: 'page:conversations', session: true },
            },
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
