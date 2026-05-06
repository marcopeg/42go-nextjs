import { TAppConfigItem } from '../../AppConfig';

import { User, ListTodo } from 'lucide-react';

export default {
  name: '',
  match: {
    url: ['^quicklist.42go.dev+$', '^ql42go.ngrok.app+$'],
  },
  features: ['api:waitlist', 'api:quicklists', 'api:profile', 'page:quicklists'],
  auth: {
    providers: [
      {
        type: 'credentials' as const,
        config: {},
      },
      {
        type: 'google' as const,
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: 'select_account',
        },
      },
    ],
  },
  public: {
    toolbar: {
      disabled: true,
    },
    footer: {
      disabled: true,
    },
    pages: {
      HomePage: {
        items: [
          {
            type: 'hero',
            title: 'Quick**List**',
            subtitle: 'todos, **made simple** ❤️',
            actions: [
              {
                href: '/login',
                label: 'Go!',
                style: 'primary',
              },
            ],
          },
          {
            type: 'pricing',
            title: 'Features',
            subtitle: 'For personal & Family use.',
            tiers: [
              {
                // name: "Features",
                // description: "For personal & Family use.",
                features: [
                  { text: 'Unlimited lists', status: 'included' },
                  { text: 'Unlimited tasks', status: 'included' },
                  { text: 'Share up to 5 people', status: 'included' },
                  { text: 'Drag and drop ordering', status: 'included' },
                  { text: 'Checked items to the bottom', status: 'included' },
                  { text: 'Mobile Web App', status: 'included' },
                ],
                cta: { label: 'Go!', href: '/login' },
                highlighted: true,
                badge: 'free',
              },
            ],
          },
        ],
      },
    },
    pwa: {
      name: 'QuickList',
      shortName: 'QuickList',
      themeColor: 'dark',
      backgroundColor: 'dark',
      startUrl: '/quicklists',
      scope: '/',
      display: 'standalone',
    },
  },
  app: {
    default: {
      page: '/quicklists',
    },
    profile: {
      items: [
        // { type: 'AccountInfo' },
        {
          type: 'ThemePreference',
          title: 'Theme',
          description: 'Choose how the app appearance should be determined.',
        },
        { type: 'Consent', source: 'profile', method: 'checkbox-submit' },
        { type: 'Logout' },
      ],
    },
    consent: {
      items: [
        {
          name: 'terms',
          required: true,
          version: 'quicklist-terms-2026-05-05',
          label: 'I accept the Terms and Conditions',
        },
        {
          name: 'privacy',
          required: true,
          version: 'quicklist-privacy-2026-05-05',
          label: 'I acknowledge the Privacy Policy',
        },
        {
          name: 'marketing',
          required: false,
          version: 'quicklist-marketing-2026-05-05',
          label: 'I consent to receive QuickList product updates',
        },
      ],
    },
    menu: {
      top: {
        items: [
          {
            title: 'Projects',
            href: '/quicklists',
            icon: ListTodo,
          },
        ],
      },
      mobile: {
        disableMore: true,
        items: [
          {
            title: 'Projects',
            href: '/quicklists',
            icon: ListTodo,
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
