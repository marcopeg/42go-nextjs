import { Metadata } from 'next';
import { LoginPage } from '@/components/auth/login-page';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPageWrapper() {
  return <LoginPage />;
}
