import { Metadata } from 'next';
import { RegisterPage } from '@/components/auth/register-page';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account',
};

export default function RegisterPageWrapper() {
  return <RegisterPage />;
}
