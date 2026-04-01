"use client";

import { FormEvent, useState } from "react";

export default function ClaudeAssistant() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const input = prompt.trim();
    if (!input) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }

      setResponse(data.text || "No response text returned.");
    } catch {
      setError("Unable to reach Claude API route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Claude Assistant</h2>
      <p className="mt-2 text-sm text-slate-600">
        Ask anything about EV buying, charging, finance, or comparisons.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          placeholder="Example: Compare BYD Atto 3 vs Tesla Model 3 for family use in city + highway driving."
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask Claude"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {response ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{response}</p>
        </div>
      ) : null}
    </section>
  );
}
