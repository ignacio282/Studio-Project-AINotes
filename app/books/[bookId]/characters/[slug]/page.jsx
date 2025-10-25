import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Placeholder({ label }) {
  return <span className="text-[var(--color-text-disabled)]">{label}</span>;
}

export default async function CharacterProfilePage({ params }) {
  const { bookId, slug } = await params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("characters")
    .select("name,role,short_bio,full_bio,first_chapter,last_chapter,relationships,timeline")
    .eq("book_id", bookId)
    .eq("slug", slug)
    .single();

  const character = error ? null : data;

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      <header>
        <div className="text-xs text-[var(--color-secondary)]">Character Profile</div>
        <h1 className="mt-1 text-2xl font-medium" style={{ fontFamily: "var(--font-h2)" }}>
          {character?.name || "Unknown"}
        </h1>
      </header>

      <section className="rounded-xl bg-[var(--color-surface)] p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-semibold">Role:</span> {character?.role || <Placeholder label="Not clear yet" />}</div>
          <div>
            <span className="font-semibold">First appearance:</span>{" "}
            {Number.isFinite(character?.first_chapter) ? character.first_chapter : <Placeholder label="—" />}
          </div>
          <div>
            <span className="font-semibold">Last seen:</span>{" "}
            {Number.isFinite(character?.last_chapter) ? character.last_chapter : <Placeholder label="—" />}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">Summary</div>
        <div className="mt-2 text-sm leading-6">
          {character?.full_bio || character?.short_bio || (
            <Placeholder label="I’ll write a profile once there’s more about this character in your notes." />
          )}
        </div>
      </section>

      <section className="rounded-xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">Timeline</div>
        <div className="mt-3 space-y-3">
          {Array.isArray(character?.timeline) && character.timeline.length > 0 ? (
            character.timeline.map((t, idx) => (
              <div key={`${t.chapterNumber}-${idx}`} className="flex gap-3 text-sm">
                <div className="w-20 shrink-0 text-[var(--color-secondary)]">Ch. {t.chapterNumber}</div>
                <div className="flex-1 text-[var(--color-text-main)]">{t.snippet}</div>
              </div>
            ))
          ) : (
            <Placeholder label="No appearances yet" />
          )}
        </div>
      </section>

      <section className="rounded-xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">Relationships</div>
        <div className="mt-3 space-y-2 text-sm">
          {Array.isArray(character?.relationships) && character.relationships.length > 0 ? (
            character.relationships.map((r, idx) => (
              <div key={`${r.name}-${idx}`} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-secondary)]" aria-hidden />
                <span className="flex-1">{r.name} - {r.label}</span>
              </div>
            ))
          ) : (
            <Placeholder label="No relationships captured yet" />
          )}
        </div>
      </section>
    </div>
  );
}

