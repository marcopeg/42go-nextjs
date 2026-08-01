import type { Page } from '@/42go/components/DynamicPage';

export const QuickShareHomePage: Page = {
  items: [
    {
      type: 'hero',
      margin: {
        top: { base: '28', md: '18' },
        bottom: { base: '20', md: '18' },
      },
      title: 'Share what matters, **when you are ready**',
      subtitle:
        'Create drafts, choose the right public address, and publish only the version you want people to see.',
      actions: [{ label: 'Sign in to QuickShare', href: '/login', style: 'primary' }],
    },
  ],
};
