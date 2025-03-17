import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

// Check if reCAPTCHA is enabled
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const isCaptchaEnabled = !!RECAPTCHA_SECRET_KEY && RECAPTCHA_SECRET_KEY.length > 0;

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

export async function POST(request: NextRequest) {
  try {
    const { email, message, captchaToken } = await request.json();

    // Validate input
    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
    }

    // Only require captcha token if captcha is enabled
    if (isCaptchaEnabled && !captchaToken) {
      return NextResponse.json(
        { error: 'Captcha token is required when captcha is enabled' },
        { status: 400 }
      );
    }

    // Verify captcha
    const isValidCaptcha = await verifyCaptcha(captchaToken || 'captcha-disabled');
    if (!isValidCaptcha) {
      return NextResponse.json({ error: 'Invalid captcha. Please try again.' }, { status: 400 });
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent');

    // Insert feedback into database
    await db.insert(feedback).values({
      id: uuidv4(),
      email,
      message,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting your feedback' },
      { status: 500 }
    );
  }
}
