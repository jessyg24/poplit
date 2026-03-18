"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleWatchlist,
  updateWatchlistReason,
  searchUsersByPenName,
} from "../actions";

// ── Remove from Watchlist ──────────────────────────────────────────────────

export function RemoveFromWatchlistButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Remove this user from the watchlist?")) return;
    startTransition(async () => {
      const result = await toggleWatchlist(userId, false);
      if (result.error) {
        setFeedback(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {feedback && <span className="text-xs text-red-500">{feedback}</span>}
    </div>
  );
}

// ── Inline Edit Reason ─────────────────────────────────────────────────────

export function EditReasonInline({
  userId,
  currentReason,
}: {
  userId: string;
  currentReason: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentReason ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateWatchlistReason(userId, value.trim());
      if (result.error) {
        setFeedback(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-1">
        <span className="text-[var(--color-text)]">{currentReason || "No reason given"}</span>
        <button
          onClick={() => setEditing(true)}
          className="invisible text-xs text-[var(--color-primary)] hover:underline group-hover:visible"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm text-[var(--color-text)]"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="whitespace-nowrap text-xs text-green-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "..." : "Save"}
      </button>
      <button
        onClick={() => { setEditing(false); setValue(currentReason ?? ""); setFeedback(null); }}
        className="text-xs text-[var(--color-text-secondary)] hover:underline"
      >
        Cancel
      </button>
      {feedback && <span className="text-xs text-red-500">{feedback}</span>}
    </div>
  );
}

// ── Add to Watchlist Form ──────────────────────────────────────────────────

export function AddToWatchlistForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; pen_name: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; pen_name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    const result = await searchUsersByPenName(query.trim());
    setSearchResults(result.users);
    setIsSearching(false);
  }

  function handleSubmit() {
    if (!selectedUser) {
      setFeedback({ type: "error", msg: "Please select a user" });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleWatchlist(selectedUser.id, true, reason.trim() || undefined);
      if (result.error) {
        setFeedback({ type: "error", msg: result.error });
      } else {
        setFeedback({ type: "success", msg: `${selectedUser.pen_name} added to watchlist` });
        setTimeout(() => {
          setOpen(false);
          resetForm();
          router.refresh();
        }, 800);
      }
    });
  }

  function resetForm() {
    setQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setReason("");
    setFeedback(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
      >
        Add to Watchlist
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Add User to Watchlist</h3>
        <button
          onClick={() => { setOpen(false); resetForm(); }}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          Cancel
        </button>
      </div>

      {/* User search */}
      {!selectedUser ? (
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Search User by Pen Name</label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
              placeholder="Enter pen name..."
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-md bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser({ id: u.id, pen_name: u.pen_name }); setSearchResults([]); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-surface)] transition-colors"
                >
                  <span className="font-medium text-[var(--color-text)]">{u.pen_name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-[var(--color-text)]">User: <strong>{selectedUser.pen_name}</strong></span>
          <button
            onClick={() => setSelectedUser(null)}
            className="text-xs text-red-500 hover:underline"
          >
            Change
          </button>
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Reason</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
        placeholder="Why is this user being watched?"
      />

      {feedback && (
        <p className={`mb-2 text-xs ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {feedback.msg}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Adding..." : "Add to Watchlist"}
      </button>
    </div>
  );
}
