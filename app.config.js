/**
 * Application configuration
 * This file contains global settings that can be changed by developers
 */

// Import the Layers icon from lucide-react
// For all available icons, see: https://lucide.dev/icons/
import { Aperture, Shield, Palette, Database, Terminal, Brain } from 'lucide-react';

/**
 * Default application configuration
 */

const appConfig = {
  // Default icon is Layers from Lucide
  icon: Aperture,
  title: 'Cursor Boilerplate',
  subtitle: 'Build fast s**t that nobody wants',
  // Hero section on the landing page
  hero: {
    title: 'Build Your SaaS **Faster** With Our Modern Boilerplate',
    subtitle:
      'Everything you need to launch your next web application. Authentication, UI components, and database integration — all pre-configured and ready to go.',
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
  // Pricing section on the landing page
  pricing: {
    title: 'Simple, Transparent Pricing',
    subtitle: "Choose the plan that's right for you and start building today.",
    tiers: [
      {
        name: 'Free',
        price: '$0',
        period: '/month',
        description: 'Perfect for trying out the platform',
        features: [
          { text: 'Up to 3 projects', status: 'included' },
          { text: 'Basic analytics', status: 'included' },
          { text: 'Community support', status: 'included' },
          { text: '1 team member', status: 'included' },
          { text: 'Custom domains', status: 'excluded' },
          { text: 'API access', status: 'coming-soon' },
        ],
        cta: {
          label: 'Get Started',
          href: '/register',
        },
      },
      {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For serious developers and small teams',
        features: [
          { text: 'Unlimited projects', status: 'included' },
          { text: 'Advanced analytics', status: 'included' },
          { text: 'Priority support', status: 'included' },
          { text: 'Up to 5 team members', status: 'included' },
          { text: 'Custom domains', status: 'included' },
          { text: 'API access', status: 'coming-soon' },
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
        price: '$99',
        period: '/month',
        description: 'For large teams with advanced needs',
        features: [
          { text: 'Everything in Pro', status: 'included' },
          { text: 'Unlimited team members', status: 'included' },
          { text: 'Dedicated support', status: 'included' },
          { text: 'Custom integrations', status: 'included' },
          { text: 'Advanced security', status: 'included' },
          { text: 'SLA guarantees', status: 'included' },
        ],
        cta: {
          label: 'Contact Sales',
          href: '/contact',
        },
      },
    ],
  },
  // Features showcased on the landing page
  features: {
    title: 'Powerful Features',
    subtitle: 'Everything you need to build modern web applications, right out of the box.',
    items: [
      {
        icon: Brain,
        title: 'AI Optimized',
        abstract:
          'Build with Cursor for Cursor, the AI-powered code editor. Use the power of AI to write code faster and smarter.',
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
