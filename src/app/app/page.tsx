'use client';

import { redirect } from 'next/navigation';

// Redirect to the dashboard by default
export default function AppIndexPage() {
  redirect('/app/dashboard');
}
