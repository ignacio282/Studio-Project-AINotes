import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_PASSWORD = process.env.QA_SEED_PASSWORD || "ScribaQa123!";
const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const QA_USERS = [
  { key: "new", email: "qa.new@scriba.local", label: "First-time user (0 books)" },
  { key: "empty", email: "qa.empty@scriba.local", label: "Empty states (books, no notes)" },
  { key: "active", email: "qa.active@scriba.local", label: "Active reader (books + notes + characters)" },
  { key: "edge", email: "qa.edge@scriba.local", label: "Edge content (long text / odd metadata)" },
];

function isoDaysAgo(days, hour = 9) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

async function listAllUsersByEmail() {
  const byEmail = new Map();
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];
    users.forEach((user) => {
      const email = String(user.email || "").toLowerCase();
      if (email) byEmail.set(email, user);
    });
    if (users.length < perPage) break;
    page += 1;
  }
  return byEmail;
}

async function ensureUser(email) {
  const usersByEmail = await listAllUsersByEmail();
  const existing = usersByEmail.get(email.toLowerCase());
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), qa: true },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: QA_PASSWORD,
    email_confirm: true,
    user_metadata: { qa: true },
  });
  if (error) throw error;
  return data.user;
}

async function safeDelete(queryPromise) {
  const { error } = await queryPromise;
  if (!error) return;
  if (error.code === "42P01") return; // table does not exist
  throw error;
}

async function clearUserData(userId) {
  const { data: books, error: booksError } = await supabase.from("books").select("id").eq("user_id", userId);
  if (booksError) throw booksError;
  const bookIds = (books || []).map((row) => row.id).filter(Boolean);
  if (bookIds.length === 0) return;

  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("id")
    .in("book_id", bookIds);
  if (notesError) throw notesError;
  const noteIds = (notes || []).map((row) => row.id).filter(Boolean);

  if (noteIds.length > 0) {
    await safeDelete(supabase.from("note_prompts").delete().in("note_id", noteIds));
  }
  await safeDelete(supabase.from("book_chapter_memory").delete().in("book_id", bookIds));
  await safeDelete(supabase.from("characters").delete().in("book_id", bookIds));
  await safeDelete(supabase.from("notes").delete().in("book_id", bookIds));
  await safeDelete(supabase.from("books").delete().in("id", bookIds));
}

async function insertBook(userId, payload) {
  const { data, error } = await supabase
    .from("books")
    .insert({ ...payload, user_id: userId })
    .select("id,title")
    .single();
  if (error) throw error;
  return data;
}

async function seedEmptyUser(userId) {
  const current = await insertBook(userId, {
    title: "The Quiet Harbor",
    author: "M. Sato",
    total_chapters: 18,
    status: "reading",
    created_at: isoDaysAgo(2, 10),
    updated_at: isoDaysAgo(0, 9),
  });

  await insertBook(userId, {
    title: "Glass Meridian",
    author: "I. Noor",
    total_chapters: 24,
    status: "paused",
    created_at: isoDaysAgo(10, 11),
    updated_at: isoDaysAgo(6, 11),
  });

  return { currentBookId: current.id };
}

async function seedActiveUser(userId) {
  const active = await insertBook(userId, {
    title: "The Ember Trials",
    author: "A. Rivera",
    total_chapters: 28,
    status: "reading",
    created_at: isoDaysAgo(14, 8),
    updated_at: isoDaysAgo(0, 8),
  });
  const toRead = await insertBook(userId, {
    title: "North of Lanterns",
    author: "K. Bell",
    total_chapters: 20,
    status: "paused",
    created_at: isoDaysAgo(6, 8),
    updated_at: isoDaysAgo(3, 8),
  });
  await insertBook(userId, {
    title: "A Field of Echoes",
    author: "R. Ames",
    total_chapters: 16,
    status: "completed",
    created_at: isoDaysAgo(40, 8),
    updated_at: isoDaysAgo(21, 8),
  });

  const notesPayload = [
    {
      id: randomUUID(),
      book_id: active.id,
      user_id: userId,
      chapter_number: 1,
      created_at: isoDaysAgo(5, 20),
      content:
        "Lena reaches the Ember District and realizes the city maps are intentionally outdated. I think the archive council is hiding routes.",
      ai_summary: {
        summary: ["Lena arrives in the Ember District and discovers the official maps are manipulated."],
        characters: ["Lena Ortiz", "Archivist Vale"],
        setting: ["Ember District", "Old Transit Archive"],
        relationships: ["Lena distrusts Archivist Vale's official narrative."],
        reflections: ["It feels like the city itself is designed to erase memory."],
        extras: [],
      },
    },
    {
      id: randomUUID(),
      book_id: active.id,
      user_id: userId,
      chapter_number: 2,
      created_at: isoDaysAgo(3, 20),
      content:
        "Vale gives Lena a partial key and says she can only open one gate. That sounded like a test. Rowan appears and already knows Lena's brother.",
      ai_summary: {
        summary: ["Vale gives Lena a partial key while Rowan reveals prior ties to her family."],
        characters: ["Lena Ortiz", "Archivist Vale", "Rowan Pike"],
        setting: ["Gate Corridor", "Archive Vault"],
        relationships: ["Rowan knows Lena's brother.", "Vale is testing Lena's choices."],
        reflections: ["I don't trust Rowan yet, but he might be useful."],
        extras: [],
      },
    },
    {
      id: randomUUID(),
      book_id: active.id,
      user_id: userId,
      chapter_number: 3,
      created_at: isoDaysAgo(1, 20),
      content:
        "Lena opens the wrong gate on purpose to see who follows her. Rowan follows. Vale's warning about 'mirror records' probably means fake histories exist in parallel.",
      ai_summary: {
        summary: ["Lena deliberately opens a decoy gate and confirms Rowan is tracking her."],
        characters: ["Lena Ortiz", "Rowan Pike", "Archivist Vale"],
        setting: ["Mirror Gate", "Lower Stack"],
        relationships: ["Lena tests Rowan's loyalty.", "Vale hints at parallel false records."],
        reflections: ["The fake-history idea makes every memory in the book feel unstable."],
        extras: [
          { title: "Themes", items: ["Memory control", "Trust vs survival"] },
        ],
      },
    },
  ];

  const { data: insertedNotes, error: noteError } = await supabase
    .from("notes")
    .insert(notesPayload)
    .select("id,chapter_number");
  if (noteError) throw noteError;

  const charactersPayload = [
    {
      book_id: active.id,
      user_id: userId,
      slug: "lena-ortiz",
      name: "Lena Ortiz",
      role: "Courier turned investigator",
      short_bio: "A determined reader of hidden systems who questions official history.",
    },
    {
      book_id: active.id,
      user_id: userId,
      slug: "archivist-vale",
      name: "Archivist Vale",
      role: "Archive council keeper",
      short_bio: "A guarded authority figure who reveals information selectively.",
    },
    {
      book_id: active.id,
      user_id: userId,
      slug: "rowan-pike",
      name: "Rowan Pike",
      role: "Unclear ally",
      short_bio: "A resourceful outsider with connections to Lena's family.",
    },
  ];
  const { error: charError } = await supabase.from("characters").upsert(charactersPayload, {
    onConflict: "book_id,slug",
  });
  if (charError) throw charError;

  const firstNote = (insertedNotes || []).find((n) => n.chapter_number === 1);
  return {
    activeBookId: active.id,
    toReadBookId: toRead.id,
    noteId: firstNote?.id || (insertedNotes || [])[0]?.id || "",
    chapterNumber: firstNote?.chapter_number || 1,
    characterSlug: "lena-ortiz",
  };
}

async function seedEdgeUser(userId) {
  const book = await insertBook(userId, {
    title:
      "The Impossibly Long and Somewhat Chaotic Title About Cartographers, Time Loops, and Tea Rooms",
    author: "",
    total_chapters: 9,
    status: "reading",
    created_at: isoDaysAgo(7, 9),
    updated_at: isoDaysAgo(0, 7),
  });

  const { error: noteError } = await supabase.from("notes").insert({
    id: randomUUID(),
    book_id: book.id,
    user_id: userId,
    chapter_number: 1,
    created_at: isoDaysAgo(0, 7),
    content:
      "Testing a very long note body to validate wrapping, truncation, and spacing. ".repeat(12),
    ai_summary: {
      summary: ["A stress-test note with unusually long narrative text for UI checks."],
      characters: ["C. Bellweather the Third"],
      setting: ["Tea Room of Returning Tuesdays"],
      relationships: [],
      reflections: ["UI should stay readable with long strings."],
      extras: [],
    },
  });
  if (noteError) throw noteError;
  return { edgeBookId: book.id };
}

function buildOutput(seed) {
  const lines = [];
  lines.push("Scriba QA Seed Output");
  lines.push("");
  lines.push(`Password for all QA users: ${QA_PASSWORD}`);
  lines.push("");
  lines.push("Users:");
  QA_USERS.forEach((user) => {
    lines.push(`- ${user.email} (${user.label})`);
  });
  lines.push("");
  lines.push("Recommended test URLs:");
  lines.push(`- ${BASE_URL}/login`);
  lines.push(`- ${BASE_URL}/home?qa=loading`);
  lines.push(`- ${BASE_URL}/home?qa=empty`);
  lines.push(`- ${BASE_URL}/home?qa=error`);
  lines.push(`- ${BASE_URL}/library?qa=loading`);
  lines.push(`- ${BASE_URL}/library?qa=empty`);
  lines.push("");
  lines.push("Concrete URLs for qa.active:");
  lines.push(`- ${BASE_URL}/home`);
  lines.push(`- ${BASE_URL}/library`);
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}`);
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}?startNote=1`);
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}/assistant`);
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}/assistant?qa=empty`);
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}/journal?chapter=4&bookTitle=The%20Ember%20Trials&chapterTitle=Chapter%204`);
  lines.push(
    `- ${BASE_URL}/books/${seed.active.activeBookId}/chapters/${seed.active.chapterNumber}/notes/${seed.active.noteId}`,
  );
  lines.push(`- ${BASE_URL}/books/${seed.active.activeBookId}/characters/${seed.active.characterSlug}`);
  lines.push("");
  lines.push("Concrete URLs for qa.empty:");
  lines.push(`- ${BASE_URL}/library`);
  lines.push(`- ${BASE_URL}/books/${seed.empty.currentBookId}`);
  lines.push("");
  lines.push("Concrete URLs for qa.edge:");
  lines.push(`- ${BASE_URL}/books/${seed.edge.edgeBookId}`);
  lines.push("");
  lines.push("Note:");
  lines.push("- qa.new has no books, so after login you should be redirected to /onboarding.");
  lines.push("- QA query flags work only outside production: ?qa=loading | ?qa=empty | ?qa=error");
  return lines.join("\n");
}

async function main() {
  const seeded = {};
  for (const entry of QA_USERS) {
    const user = await ensureUser(entry.email);
    await clearUserData(user.id);

    if (entry.key === "empty") {
      seeded.empty = await seedEmptyUser(user.id);
    } else if (entry.key === "active") {
      seeded.active = await seedActiveUser(user.id);
    } else if (entry.key === "edge") {
      seeded.edge = await seedEdgeUser(user.id);
    } else {
      seeded.new = {};
    }
    console.log(`Seeded ${entry.email}`);
  }

  const output = buildOutput(seeded);
  writeFileSync("qa-seed-output.txt", output, "utf8");
  console.log("Done. Wrote qa-seed-output.txt");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
