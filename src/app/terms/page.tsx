import { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using our services',
};

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Welcome to [Your Company Name]. These Terms of Service (&ldquo;Terms&rdquo;) govern your
            access to and use of our website, products, and services (collectively, the
            &ldquo;Services&rdquo;). Please read these Terms carefully before using our Services.
          </p>
          <p>
            By accessing or using our Services, you agree to be bound by these Terms and our Privacy
            Policy. If you do not agree to these Terms, you may not access or use the Services.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>&ldquo;Company&rdquo;</strong>, <strong>&ldquo;we&rdquo;</strong>,{' '}
              <strong>&ldquo;us&rdquo;</strong>, or <strong>&ldquo;our&rdquo;</strong> refers to
              [Your Company Name].
            </li>
            <li>
              <strong>&ldquo;User&rdquo;</strong>, <strong>&ldquo;you&rdquo;</strong>, or{' '}
              <strong>&ldquo;your&rdquo;</strong> refers to the individual or entity accessing or
              using our Services.
            </li>
            <li>
              <strong>&ldquo;Content&rdquo;</strong> refers to any information, data, text,
              software, graphics, messages, or other materials that are posted, uploaded, or
              otherwise made available through our Services.
            </li>
            <li>
              <strong>&ldquo;Account&rdquo;</strong> refers to a user&apos;s registration with our
              Services.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Registration and Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            To access certain features of our Services, you may be required to register for an
            account. When you register, you agree to provide accurate, current, and complete
            information about yourself and to update this information to keep it accurate, current,
            and complete.
          </p>
          <p>
            You are responsible for safeguarding your account credentials and for all activities
            that occur under your account. You agree to notify us immediately of any unauthorized
            use of your account or any other breach of security.
          </p>
          <p>
            We reserve the right to disable any user account at any time, including if we believe
            that you have violated these Terms.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Conduct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You agree not to use our Services to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violate any applicable law, regulation, or third-party rights</li>
            <li>
              Upload, post, or transmit any Content that is unlawful, harmful, threatening, abusive,
              harassing, defamatory, vulgar, obscene, or otherwise objectionable
            </li>
            <li>
              Impersonate any person or entity, or falsely state or otherwise misrepresent your
              affiliation with a person or entity
            </li>
            <li>
              Interfere with or disrupt the Services or servers or networks connected to the
              Services
            </li>
            <li>Attempt to gain unauthorized access to any part of the Services</li>
            <li>Use any robot, spider, scraper, or other automated means to access the Services</li>
            <li>Collect or harvest any information about other users</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Intellectual Property Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Our Services and their contents, features, and functionality are owned by [Your Company
            Name] and are protected by copyright, trademark, patent, trade secret, and other
            intellectual property or proprietary rights laws.
          </p>
          <p>
            You may not copy, modify, create derivative works of, publicly display, publicly
            perform, republish, or transmit any of the material obtained through our Services, or
            delete or alter any copyright, trademark, or other proprietary rights notices from
            copies of materials from our Services.
          </p>
          <p>
            By submitting, posting, or displaying Content on or through our Services, you grant us a
            worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt,
            publish, translate, create derivative works from, distribute, and display such Content
            in connection with providing our Services.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Subscription and Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Some of our Services may require a subscription or payment. By subscribing to our
            Services, you agree to pay all fees associated with the subscription plan you choose.
          </p>
          <p>
            We may change our fees at any time by posting the changes on our website or by notifying
            you directly. Your continued use of our Services after the fee change becomes effective
            constitutes your agreement to pay the changed amount.
          </p>
          <p>Unless otherwise stated, all fees are quoted in [Currency] and are non-refundable.</p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Termination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We may terminate or suspend your access to all or part of our Services, with or without
            notice, for any conduct that we, in our sole discretion, believe violates these Terms or
            is harmful to other users of our Services, us, or third parties, or for any other
            reason.
          </p>
          <p>
            Upon termination, your right to use our Services will immediately cease, and you must
            cease all use of our Services and delete any copies of our materials in your possession.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Disclaimer of Warranties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            OUR SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
            IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
            NON-INFRINGEMENT.
          </p>
          <p>
            WE DO NOT WARRANT THAT OUR SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE, THAT DEFECTS
            WILL BE CORRECTED, OR THAT OUR SERVICES OR THE SERVERS THAT MAKE THEM AVAILABLE ARE FREE
            OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            IN NO EVENT WILL WE, OUR AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES,
            AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL
            THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, OUR
            SERVICES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Indemnification</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            You agree to defend, indemnify, and hold harmless [Your Company Name], its affiliates,
            licensors, and service providers, and its and their respective officers, directors,
            employees, contractors, agents, licensors, suppliers, successors, and assigns from and
            against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or
            fees (including reasonable attorneys&apos; fees) arising out of or relating to your
            violation of these Terms or your use of our Services.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Governing Law and Jurisdiction</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            These Terms and any dispute or claim arising out of or in connection with them or their
            subject matter or formation shall be governed by and construed in accordance with the
            laws of [Your Jurisdiction], without giving effect to any choice or conflict of law
            provision or rule.
          </p>
          <p className="mt-4">
            Any legal suit, action, or proceeding arising out of, or related to, these Terms or our
            Services shall be instituted exclusively in the courts of [Your Jurisdiction].
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We may revise these Terms from time to time. The most current version will always be
            posted on our website. If a revision, in our sole discretion, is material, we will
            notify you via email or through our Services. By continuing to access or use our
            Services after revisions become effective, you agree to be bound by the revised Terms.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">If you have any questions about these Terms, please contact us at:</p>
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
