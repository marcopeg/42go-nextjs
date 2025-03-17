# Setting Up reCAPTCHA

This document explains how to set up Google reCAPTCHA v2 for the feedback form in this application.

## Prerequisites

- A Google account
- Access to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)

## Step 1: Register a new site on reCAPTCHA

1. Go to the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with your Google account
3. Click on the "+" (Add) button to register a new site
4. Fill in the form:
   - Label: Enter a name for your site (e.g., "My Next.js App Feedback Form")
   - reCAPTCHA type: Select "reCAPTCHA v2" and "I'm not a robot" Checkbox
   - Domains: Add your domain(s) where the reCAPTCHA will be used (e.g., `localhost`, `yourdomain.com`)
   - Accept the Terms of Service
   - Click "Submit"

## Step 2: Get your reCAPTCHA keys

After registering your site, you'll receive two keys:

- **Site Key**: Used in the frontend code
- **Secret Key**: Used in the backend to verify the captcha response

## Step 3: Configure environment variables

Add the following environment variables to your `.env.local` file:

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

> **Note**: The `NEXT_PUBLIC_` prefix is required for the site key as it needs to be accessible in the client-side code.

## Step 4: Verification

The application is already configured to:

- Dynamically load the reCAPTCHA component on the client side
- Verify the reCAPTCHA token on the server side
- Enable/disable reCAPTCHA based on the presence of the environment variables

## How it works

### Frontend Implementation

The feedback form in `src/components/feedback-form.tsx` uses the reCAPTCHA component:

```typescript
// Dynamically import ReCAPTCHA to avoid SSR issues
const ReCAPTCHA = dynamic(() => import('react-google-recaptcha'), {
  ssr: false,
});

// Check if reCAPTCHA is enabled
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const isCaptchaEnabled = !!RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.length > 0;
```

The form will only show the reCAPTCHA if it's enabled:

```typescript
{
  isCaptchaEnabled && (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        key="recaptcha"
        sitekey={RECAPTCHA_SITE_KEY || ''}
        onChange={handleCaptchaChange}
        // ...
      />
    </div>
  );
}
```

### Backend Verification

The API route in `src/app/api/feedback/route.ts` verifies the reCAPTCHA token:

```typescript
// Function to verify reCAPTCHA token
async function verifyCaptcha(token: string): Promise<boolean> {
  // If captcha is disabled or token is the special 'captcha-disabled' value, return true
  if (!isCaptchaEnabled || token === 'captcha-disabled') {
    return true;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return false;
  }
}
```

## Troubleshooting

1. **reCAPTCHA not appearing**: Make sure the `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is correctly set in your environment variables.

2. **Verification failing**: Check that the `RECAPTCHA_SECRET_KEY` is correctly set and that your domain is listed in the reCAPTCHA admin console.

3. **Local development**: reCAPTCHA works on `localhost` by default, but if you're using a different local domain, make sure to add it to the allowed domains in the reCAPTCHA admin console.

4. **Network errors**: If you're behind a proxy or firewall, ensure that requests to `https://www.google.com/recaptcha/` are allowed.

## Additional Resources

- [reCAPTCHA Developer Guide](https://developers.google.com/recaptcha/docs/display)
- [react-google-recaptcha Documentation](https://github.com/dozoisch/react-google-recaptcha)
