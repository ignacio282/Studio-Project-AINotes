"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KebabIcon from "@/components/KebabIcon";
import ActionBottomSheet from "@/components/ui/ActionBottomSheet";
import { getFriendlyErrorMessage } from "@/lib/errors/user-facing";

export default function CharacterProfileMenu({ bookId, slug, name }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteCharacter = async () => {
    if (!bookId || !slug || isDeleting) return;

    try {
      setIsDeleting(true);
      setError("");
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
      setConfirmingDelete(false);
      router.push(`/books/${bookId}`);
      router.refresh();
    } catch (error) {
      setError(getFriendlyErrorMessage(error, "Unable to delete this character right now."));
    } finally {
      setIsDeleting(false);
    }
  };

  const closeSheet = () => {
    if (isDeleting) return;
    setOpen(false);
    setConfirmingDelete(false);
    setError("");
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
        onClose={closeSheet}
        title={error || (confirmingDelete ? `Delete ${name || "this character"}?` : "Character actions")}
        actions={
          confirmingDelete
            ? [
                {
                  id: "confirm-delete-character",
                  label: isDeleting ? "Deleting character..." : "Delete permanently",
                  onClick: handleDeleteCharacter,
                  disabled: isDeleting,
                  destructive: true,
                },
                {
                  id: "keep-character",
                  label: "Keep character",
                  onClick: () => {
                    setConfirmingDelete(false);
                    setError("");
                  },
                  disabled: isDeleting,
                },
              ]
            : [
                {
                  id: "delete-character",
                  label: "Delete character",
                  onClick: () => {
                    setConfirmingDelete(true);
                    setError("");
                  },
                  destructive: true,
                },
              ]
        }
      />
    </>
  );
}
