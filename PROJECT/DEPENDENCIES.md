# Dependencies

This files contains brief explanation of the dependencies of the app.

## NextJS

🔗 https://nextjs.org/

Full stack Typescript framework.

## next-themes

🔗 https://github.com/pacocoursey/next-themes

**Version**: ^0.4.6

**Purpose**: Robust theme management for Next.js applications with perfect support for SSR/SSG.

**Key Features**:

- Automatic system theme detection
- Theme persistence via localStorage
- Hydration-safe theme switching
- TypeScript support
- Zero-config setup with sensible defaults

**Why Chosen**:

- Industry standard for Next.js theme management
- Excellent SSR/hydration handling prevents flash of incorrect theme
- Lightweight and performant
- Active maintenance and community support
- Perfect integration with Tailwind CSS class-based dark mode

**Integration**:

- Used in `src/lib/config/ThemeProvider.tsx` as the core theme provider
- Configured with class-based theme switching (`attribute="class"`)
- Integrated with Tailwind's `darkMode: ["class"]` configuration
- Provides theme context throughout the application via React Context
