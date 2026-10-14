"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FaxNumberOption = {
  id: string;
  number: string;
  label: string;
};

export function SendFaxForm({ numbers }: { numbers: FaxNumberOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/faxes", {
        method: "POST",
        body: data,
      });
      const json = (await res.json()) as {
        fax?: { id: string };
        error?: string;
      };

      if (!res.ok && !json.fax) {
        setError(json.error ?? "Failed to send fax");
        setPending(false);
        return;
      }

      if (json.fax?.id) {
        router.push(`/faxes/${json.fax.id}`);
        router.refresh();
        return;
      }

      setError(json.error ?? "Unexpected response");
      setPending(false);
    } catch {
      setError("Network error while sending fax");
      setPending(false);
    }
  }

  if (numbers.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No company fax numbers are configured. Add them via{" "}
        <code className="rounded bg-amber-100 px-1">FAX_NUMBERS</code> and run{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code>.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <label htmlFor="fromNumber" className="mb-1 block text-sm font-medium text-slate-700">
          From (company number)
        </label>
        <select
          id="fromNumber"
          name="fromNumber"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          defaultValue={numbers[0]?.number}
        >
          {numbers.map((n) => (
            <option key={n.id} value={n.number}>
              {n.label} ({n.number})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="toNumber" className="mb-1 block text-sm font-medium text-slate-700">
          To
        </label>
        <input
          id="toNumber"
          name="toNumber"
          type="tel"
          required
          placeholder="+357xxxxxxxx"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="file" className="mb-1 block text-sm font-medium text-slate-700">
          PDF document
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Internal note for this fax"
        />
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send fax"}
      </button>
    </form>
  );
}
