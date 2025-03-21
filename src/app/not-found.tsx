import { NotFound } from '@/components/not-found';

export default function NotFoundPage() {
  return (
    <NotFound
      title="Page Not Found"
      message="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
      fullPage={true}
    />
  );
}
