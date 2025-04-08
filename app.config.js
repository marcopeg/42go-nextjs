/**
 * Application configuration
 * This file contains global settings that can be changed by developers
 */

// Import the Layers icon from lucide-react
// For all available icons, see: https://lucide.dev/icons/
import {
  Aperture,
  Shield,
  Palette,
  Database,
  Terminal,
  Brain,
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Bell,
  Home,
  LogOut,
  CreditCard,
} from 'lucide-react';

/**
 * Default application configuration
 */

const appConfig = {
  // Default icon is Layers from Lucide
  icon: Aperture,
  title: '42GO - NextJS',
  subtitle: 'AI friendly Starter Kit for your next SaaS.',

  // App-specific configurations (authenticated user experience)
  app: {
    // Mobile-specific configurations
    mobile: {
      menu: {
        width: '100%', // Width of the mobile menu as percentage of viewport
        items: [
          {
            title: 'Dashboard',
            href: '/app/dashboard',
            icon: LayoutDashboard,
          },
          // {
          //   title: 'Settings',
          //   href: '/app/settings',
          //   icon: Settings,
          // },
          {
            title: 'Documents',
            href: '/app/documents',
            icon: FileText,
            grants: ['documents:view'], // Only users with documents:view grant can see this
          },
          {
            title: 'Users',
            href: '/app/users',
            icon: Users,
            grants: ['users:view'], // Only users with users:view grant can see this
          },
        ],
      },
    },
    // Sidebar menu for logged-in users
    menu: {
      top: [
        {
          title: 'Dashboard',
          href: '/app/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Users',
          href: '/app/users',
          icon: Users,
          grants: ['users:list'],
        },
        {
          title: 'Documents',
          href: '/app/documents',
          icon: FileText,
        },
        {
          title: 'Notifications',
          href: '/app/notifications',
          icon: Bell,
        },
      ],
      bottom: [
        {
          title: 'Account',
          href: '/app/account',
          icon: Users,
        },
        {
          title: 'Subscription',
          href: '/app/subscription',
          icon: CreditCard,
          grants: ['subscription:view'], // Only users with subscription:view grant can see this
        },
        {
          title: 'Settings',
          href: '/app/settings',
          icon: Settings,
          grants: ['settings:view'], // Only users with settings:view grant can see this
        },
      ],
    },
  },

  // Landing page configuration
  landing: {
    // Hero section on the landing page (comment out to disable)
    hero: {
      title: 'Build Your SaaS **Faster** With Our **AI-Friendly** Starter Kit',
      subtitle:
        'Everything you need to launch your next SaaS. Auth, UI/UX, Database, APIs, AI, and more — all pre-configured and ready to go.',
      actions: [
        {
          label: 'Get Started',
          href: '/register',
          role: 'primary',
        },
        {
          label: 'View Documentation',
          href: 'https://github.com/marcopeg/cursor-boilerplate',
        },
      ],
    },
    // Features section on the landing page (comment out to disable)
    features: {
      title: '🔋 Batteries Included',
      subtitle: 'Everything you need to build modern web applications, right out of the box.',
      items: [
        {
          icon: Brain,
          title: 'Optimized for AI',
          abstract:
            'Build with Cursor for Cursor, the AI-powered code editor. Build products and features, code with AI.',
        },
        {
          icon: Shield,
          title: 'Authentication',
          abstract:
            'Multiple authentication options including password-based and social logins with comprehensive security features and documentation.',
        },
        {
          icon: Palette,
          title: 'Modern UI Framework',
          abstract:
            'Beautiful, responsive UI with Tailwind CSS and Shadcn components, featuring light/dark mode and customizable themes.',
        },
        {
          icon: Database,
          title: 'Database Integration',
          abstract:
            'Powerful database management with DrizzleORM and PostgreSQL, including migration tools and Drizzle Studio.',
        },
        {
          icon: Terminal,
          title: 'Developer Experience',
          abstract:
            'Enhanced DX with TypeScript, ESLint, Prettier, and Husky for code quality and consistency.',
        },
      ],
    },
    // Pricing section on the landing page (comment out to disable)
    pricing: {
      title: 'Simple, Transparent Pricing',
      subtitle: "Choose the plan that's right for you and start building today.",
      tiers: [
        {
          name: 'Community',
          price: '$0',
          period: '/month',
          description: 'Perfect for personal projects and learning',
          features: [
            { text: 'Source code', status: 'included' },
            { text: 'Documentation', status: 'included' },
            { text: 'GitHub Issues', status: 'included' },
            { text: 'Semantic Search on Docs & Q&A', status: 'excluded' },
            { text: 'Community Discord Server', status: 'coming-soon' },
            { text: 'Private Discord Channel', status: 'excluded' },
            { text: 'Private Q&A', status: 'excluded' },
            { text: 'Vote on Features', status: 'excluded' },
            { text: '2h of consulting', status: 'excluded' },
            { text: 'Newsletter', status: 'coming-soon' },
          ],
          cta: {
            label: 'Fork on GitHub',
            href: '/register',
          },
        },
        {
          name: 'Pro',
          price: '$29',
          period: '/month',
          description: 'For serious developers and small teams',
          features: [
            { text: 'Source code', status: 'included' },
            { text: 'Documentation', status: 'included' },
            { text: 'GitHub Issues', status: 'included' },
            { text: 'Semantic Search on Docs & Q&A', status: 'coming-soon' },
            { text: 'Community Discord Server', status: 'coming-soon' },
            { text: 'Private Discord Channel', status: 'coming-soon' },
            { text: 'Private Q&A', status: 'coming-soon' },
            { text: 'Vote on Features', status: 'excluded' },
            { text: '2h of consulting', status: 'excluded' },
            { text: 'Newsletter', status: 'coming-soon' },
          ],
          cta: {
            label: 'Start Free Trial',
            href: '/register?plan=pro',
          },
          highlighted: true,
          badge: 'Most Popular',
        },
        {
          name: 'Enterprise',
          price: '$299',
          period: '/month',
          description: 'For large teams with advanced needs',
          features: [
            { text: 'Source code', status: 'included' },
            { text: 'Documentation', status: 'included' },
            { text: 'GitHub Issues', status: 'included' },
            { text: 'Semantic Search on Docs & Q&A', status: 'coming-soon' },
            { text: 'Community Discord Server', status: 'coming-soon' },
            { text: 'Private Discord Channel', status: 'coming-soon' },
            { text: 'Private Q&A', status: 'coming-soon' },
            { text: 'Vote on Features', status: 'coming-soon' },
            { text: '2h of consulting', status: 'included' },
            { text: 'Newsletter', status: 'coming-soon' },
          ],
          cta: {
            label: 'Contact Sales',
            href: '/contact',
          },
        },
      ],
    },
    // Testimonials section on the landing page (comment out to disable)
    testimonials: {
      title: 'Trusted by Your Peers',
      subtitle: 'Many friends and colleagues are using this boilerplate.',
      // adopters: [
      //   { id: 1, name: 'TechCorp', logo: 'TC' },
      //   { id: 2, name: 'InnovateLabs', logo: 'IL' },
      //   { id: 3, name: 'FutureSystems', logo: 'FS' },
      //   { id: 4, name: 'DataFlow', logo: 'DF' },
      //   { id: 5, name: 'CloudNine', logo: 'CN' },
      //   { id: 6, name: 'DevStudio', logo: 'DS' },
      // ],
      quotes: [
        {
          id: 1,
          content:
            "Working with 42GO is fun, easy and productive. I've learned a lot from the community and the documentation is excellent.",
          author: {
            name: 'Sarah Connor',
            role: 'CTO',
            company: 'Skynet AI',
            avatar: 'SJ',
          },
        },
        {
          id: 2,
          content:
            'I can focus on my core features because all the infrastructure is already set up.',
          author: {
            name: 'R. Daneel Olivaw',
            role: 'Roboticist',
            company: 'Spacer Worlds',
            avatar: 'MC',
          },
        },
        {
          id: 3,
          content:
            'The developer experience is exceptional. From the first git clone to deployment, everything just works. The code quality is top-notch and the components are well-organized.',
          author: {
            name: 'Emily Rodriguez',
            role: 'Frontend Architect',
            company: 'E-commerce Platform',
            avatar: 'ER',
          },
        },
      ],
    },
    // Feedback section on the landing page (comment out to disable)
    feedback: {
      title: 'Get in Touch',
      subtitle: "Have questions or feedback? We'd love to hear from you.",
      form: {
        title: 'Send us a message',
        description: "Fill out the form below and we'll get back to you as soon as possible.",
        fields: {
          email: {
            label: 'Email',
            placeholder: 'your@email.com',
          },
          message: {
            label: 'Message',
            placeholder: 'Your message here...',
            rows: 4,
          },
        },
        button: {
          label: 'Send Message',
          loadingLabel: 'Sending...',
        },
        success: {
          title: 'Feedback submitted',
          message: 'Thank you for your feedback! We will get back to you soon.',
        },
        errors: {
          missing: {
            title: 'Missing information',
            message: 'Please provide both email and message.',
          },
          captcha: {
            title: 'CAPTCHA required',
            message: 'Please complete the CAPTCHA verification.',
          },
          default: {
            title: 'Error',
            message: 'Failed to submit feedback',
          },
        },
      },
    },

    // User-related configurations for the landing page
    user: {
      // Public menu for non-logged-in users
      menu: [
        {
          title: 'Home',
          href: '/',
          icon: Home,
        },
        {
          title: 'Dashboard',
          href: '/app/dashboard',
          icon: LayoutDashboard,
          requiresAuth: true,
        },
        {
          title: 'Settings',
          href: '/app/settings',
          icon: Settings,
          requiresAuth: true,
        },
        {
          title: 'Logout',
          href: '#',
          icon: LogOut,
          requiresAuth: true,
          action: 'logout',
        },
      ],
    },
  },
  theme: {
    accentColors: [
      {
        name: 'orange',
        value: '24 95% 50%',
        foreground: '0 0% 100%',
      },
      {
        name: 'blue',
        value: '221 83% 53%',
        foreground: '0 0% 100%',
      },
      {
        name: 'green',
        value: '142 71% 45%',
        foreground: '0 0% 100%',
      },
      {
        name: 'purple',
        value: '262 83% 58%',
        foreground: '0 0% 100%',
      },
      {
        name: 'pink',
        value: '330 81% 60%',
        foreground: '0 0% 100%',
      },
      {
        name: 'red',
        value: '0 84% 60%',
        foreground: '0 0% 100%',
      },
    ],
    // Default accent color name (must match one of the accent color names)
    defaultAccentColor: 'orange',
  },
};

export default appConfig;
