"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  const router = useRouter();

  // Function to go back
  const goBack = () => {
    router.back();
  };

  // Check if this is being rendered in a browser environment
  useEffect(() => {
    // Log the attempted path for debugging
    console.log("404 for path:", window.location.pathname);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex justify-center mb-4">
          <Image src="/logo.svg" alt="BreakRoom Logo" width={80} height={80} />
        </div>

        <div className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500">
          404
        </div>

        <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
          Page Not Found
        </h1>

        <p className="mb-6 text-gray-600 dark:text-gray-300">
          The chat room you&apos;re looking for might have been deleted,
          renamed, or is temporarily unavailable.
        </p>

        <div className="text-6xl mb-6">🔍</div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-transform hover:-translate-y-1"
          >
            Go to Home
          </Link>
          <button
            onClick={goBack}
            className="px-6 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 font-medium rounded-md transition-transform hover:-translate-y-1"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
