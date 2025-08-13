export default function UnauthorizedRoute() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-3xl font-bold text-red-600">Unauthorized</h1>
      <p className="text-gray-600">
        You don&apos;t have permission to access this page.
      </p>
    </div>
  );
}
