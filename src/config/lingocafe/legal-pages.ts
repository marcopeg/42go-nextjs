import type { Page } from "@/42go/components/DynamicPage";

export const TermsPage: Page = {
  meta: {
    title: "LingoCafe Terms and Conditions",
    description: "The terms for using LingoCafe.",
  },
  items: [
    {
      type: "markdown",
      source: `# LingoCafe Terms and Conditions

These terms describe the basic conditions for using LingoCafe.

By using LingoCafe, you agree to use the service responsibly and only for lawful personal learning purposes.

LingoCafe may change available features, content, or service availability over time.

These placeholder terms should be reviewed and replaced with final legal copy before production use.`,
    },
  ],
};

export const PrivacyPage: Page = {
  meta: {
    title: "LingoCafe Privacy Policy",
    description: "How LingoCafe handles profile and consent information.",
  },
  items: [
    {
      type: "markdown",
      source: `# LingoCafe Privacy Policy

LingoCafe stores profile information needed to provide the reading experience, including your language preferences and reading level.

LingoCafe also stores required legal acknowledgements and optional consent preferences in your profile data. These records include the saved value, timestamp, source, method, and statement or document version shown at the time.

Marketing updates and Early Birds participation are optional. You can change those preferences from your profile.

This placeholder privacy policy should be reviewed and replaced with final legal copy before production use.`,
    },
  ],
};
