"use client";

import Link from "next/link";

export default function AppErrorPage({ onRetry, showReturnHome = false }) {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2A2A2A]">
      <main className="mx-auto w-full max-w-[390px] px-6">
        <div className="pt-[163px]">
          <div className="mx-auto h-24 w-24">
            <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
              <path
                d="M44 60H52V68H44V60ZM44 28H52V52H44V28ZM47.96 8C25.88 8 8 25.92 8 48C8 70.08 25.88 88 47.96 88C70.08 88 88 70.08 88 48C88 25.92 70.08 8 47.96 8ZM48 80C30.32 80 16 65.68 16 48C16 30.32 30.32 16 48 16C65.68 16 80 30.32 80 48C80 65.68 65.68 80 48 80Z"
                fill="#595853"
              />
            </svg>
          </div>

          <section className="py-4 text-center">
            <h1 className="type-h3 text-[#2A2A2A]">
              Something went wrong
            </h1>
            <p className="type-body mt-1 text-[#595853]">
              We are having some trouble showing your information, try refreshing this page
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-1 text-[#4C7B75]"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                  <path
                    d="M17.6498 6.35C16.1998 4.9 14.2098 4 11.9998 4C7.57977 4 4.00977 7.58 4.00977 12C4.00977 16.42 7.57977 20 11.9998 20C15.7298 20 18.8398 17.45 19.7298 14H17.6498C16.8298 16.33 14.6098 18 11.9998 18C8.68977 18 5.99977 15.31 5.99977 12C5.99977 8.69 8.68977 6 11.9998 6C13.6598 6 15.1398 6.69 16.2198 7.78L12.9998 11H19.9998V4L17.6498 6.35Z"
                    fill="#4C7B75"
                  />
                </svg>
                <span className="type-button">
                  Refresh page
                </span>
              </button>
              {showReturnHome ? (
                <Link
                  href="/home"
                  className="type-button px-1 text-[#4C7B75]"
                >
                  Return to home page
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
