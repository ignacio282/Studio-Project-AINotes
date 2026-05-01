export default function ScribaLoadingScreen({
  title = "Preparing Scriba",
  message = "Organizing your reading memory...",
  status,
  overlay = false,
}) {
  return (
    <div
      className={[
        overlay ? "fixed inset-0 z-[80]" : "min-h-screen",
        "flex items-center justify-center bg-[var(--color-accent)] px-8 text-white",
      ].join(" ")}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {status || title}
      </div>

      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scriba-logo-white.svg" alt="" className="scriba-logo-breathe h-20 w-20" />
        </div>

        <h1 className="type-h2 mt-8 text-white">{title}</h1>
        <p className="type-body mt-3 max-w-[28ch] text-white/82">{message}</p>
      </div>
    </div>
  );
}
