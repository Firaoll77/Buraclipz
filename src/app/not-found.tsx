import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="card-light p-8 sm:p-12 max-w-md w-full border-2 border-[#141414] bg-[#faf5ea] flex flex-col items-center gap-4">
        <span className="text-5xl font-extrabold text-[#ff8442] font-mono">404</span>
        <h1 className="text-2xl font-bold text-[#141414]">Page Not Found</h1>
        <p className="text-sm text-gray-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn-pill mt-4 bg-[#141414] hover:bg-[#2b2b2b] text-white text-sm font-semibold px-6 py-2.5 rounded-full"
        >
          Return to Homepage
        </Link>
      </div>
    </main>
  );
}

