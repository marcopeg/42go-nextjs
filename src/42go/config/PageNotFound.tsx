import Link from "next/link";

export const PageNotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-2xl mt-4">Page Not Found</p>
      <p className="mt-2">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link href="/" className="mt-6 px-4 py-2 text-blue-600 hover:underline">
        Go back home
      </Link>
    </div>
  );
};
