"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KebabIcon from "@/components/KebabIcon";
import ActionBottomSheet from "@/components/ui/ActionBottomSheet";

export default function CharacterProfileMenu({ bookId, slug, name }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCharacter = async () => {
    if (!bookId || !slug || isDeleting) return;
    const confirmed = window.confirm(`Delete ${name || "this character"} permanently?`);
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/characters/${encodeURIComponent(bookId)}/${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        let message = "Unable to delete character.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string" && payload.error.trim()) {
            message = payload.error;
          }
        } catch {}
        throw new Error(message);
      }

      setOpen(false);
      router.push(`/books/${bookId}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete character.";
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-1 text-[var(--color-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)]"
        aria-label="Open character actions"
      >
        <KebabIcon className="h-6 w-6" />
      </button>

      <ActionBottomSheet
        open={open}
        onClose={() => {
          if (isDeleting) return;
          setOpen(false);
        }}
        title="Character actions"
        actions={[
          {
            id: "delete-character",
            label: isDeleting ? "Deleting character..." : "Delete character",
            onClick: handleDeleteCharacter,
            disabled: isDeleting,
            destructive: true,
          },
        ]}
      />
    </>
  );
}
