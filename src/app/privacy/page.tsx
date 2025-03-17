import { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Our commitment to protecting your privacy and personal data',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1 h-4 w-4"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Home
        </Link>
      </div>

      <div className="mb-8 flex flex-col items-start gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
          <CardDescription>Our commitment to protecting your privacy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            At [Your Company Name], we respect your privacy and are committed to protecting your
            personal data. This Privacy Policy explains how we collect, use, and safeguard your
            information when you use our services.
          </p>
          <p>
            Please read this Privacy Policy carefully. By accessing or using our services, you
            acknowledge that you have read, understood, and agree to be bound by the terms of this
            Privacy Policy.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Information We Collect</CardTitle>
          <CardDescription>Types of data we collect and process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-semibold">Personal Information</h3>
          <p>We may collect personal information that you provide directly to us, such as:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and contact information (email address, phone number)</li>
            <li>Account credentials (username, password)</li>
            <li>Profile information (profile picture, bio)</li>
            <li>Payment and billing information</li>
            <li>Communications and correspondence with us</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6">Usage Information</h3>
          <p>
            We automatically collect certain information about your use of our services, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Log data (IP address, browser type, pages visited)</li>
            <li>Device information (hardware model, operating system)</li>
            <li>Usage patterns and preferences</li>
            <li>Cookies and similar technologies</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How We Use Your Information</CardTitle>
          <CardDescription>Purposes for which we process your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>We use the information we collect for various purposes, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Providing, maintaining, and improving our services</li>
            <li>Processing transactions and managing your account</li>
            <li>Communicating with you about our services</li>
            <li>Personalizing your experience</li>
            <li>Analyzing usage patterns and trends</li>
            <li>Protecting against fraud and unauthorized access</li>
            <li>Complying with legal obligations</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Data Sharing and Disclosure</CardTitle>
          <CardDescription>How and when we share your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Service providers who perform services on our behalf</li>
            <li>Business partners with your consent</li>
            <li>Legal authorities when required by law</li>
            <li>In connection with a business transaction (merger, acquisition, etc.)</li>
          </ul>
          <p className="mt-4">We do not sell your personal information to third parties.</p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Rights and Choices</CardTitle>
          <CardDescription>Control over your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Depending on your location, you may have certain rights regarding your personal
            information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Accessing and updating your information</li>
            <li>Requesting deletion of your data</li>
            <li>Objecting to certain processing activities</li>
            <li>Data portability</li>
            <li>Withdrawing consent</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at [privacy@yourcompany.com].
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>How we protect your information</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction.
            However, no method of transmission over the Internet or electronic storage is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Changes to This Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the &ldquo;Last
            updated&rdquo; date. You are advised to review this Privacy Policy periodically for any
            changes.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            [Your Company Name]
            <br />
            [Address]
            <br />
            [Email]
            <br />
            [Phone]
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center mt-12">
        <Button asChild variant="outline">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}
