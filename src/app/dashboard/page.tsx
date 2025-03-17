import { Metadata } from 'next';
import { UserDashboard } from '@/components/auth/user-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'User dashboard',
};

export default function DashboardPage() {
  return <UserDashboard />;
}
