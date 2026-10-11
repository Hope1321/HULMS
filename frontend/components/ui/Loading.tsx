export default function Loading() {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

        <p className="mt-3 text-sm text-gray-500">
          Loading...
        </p>
      </div>
    </div>
  );
}