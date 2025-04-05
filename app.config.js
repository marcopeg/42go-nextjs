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
  title: 'Cursor Boilerplate',
  subtitle: 'Build fast s**t that nobody wants',

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
          {
            title: 'Settings',
            href: '/app/settings',
            icon: Settings,
          },
          {
            title: 'Documents',
            href: '/app/documents',
            icon: FileText,
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
        },
        {
          title: 'Settings',
          href: '/app/settings',
          icon: Settings,
        },
      ],
    },
  },

  // Landing page configuration
  landing: {
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
    // Testimonials section on the landing page
    testimonials: {
      title: 'Trusted by Developers Worldwide',
      subtitle: 'Join hundreds of companies building better products with our boilerplate',
      adopters: [
        { id: 1, name: 'TechCorp', logo: 'TC' },
        { id: 2, name: 'InnovateLabs', logo: 'IL' },
        { id: 3, name: 'FutureSystems', logo: 'FS' },
        { id: 4, name: 'DataFlow', logo: 'DF' },
        { id: 5, name: 'CloudNine', logo: 'CN' },
        { id: 6, name: 'DevStudio', logo: 'DS' },
      ],
      quotes: [
        {
          id: 1,
          content:
            "This boilerplate saved us weeks of setup time. The authentication system is robust and the UI components are beautiful. We've been able to focus on building our product instead of infrastructure.",
          author: {
            name: 'Sarah Johnson',
            role: 'CTO',
            company: 'FinTech Innovations',
            avatar: 'SJ',
          },
        },
        {
          id: 2,
          content:
            "I've used many boilerplates before, but this one stands out for its clean architecture and thoughtful design. The documentation is excellent and it was easy to customize to our needs.",
          author: {
            name: 'Michael Chen',
            role: 'Lead Developer',
            company: 'HealthTech Solutions',
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
    // Feedback section on the landing page
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
