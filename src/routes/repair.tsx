import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadDiagnosis, repairPlan, scoreDiagnosis, type DiagInput } from "../lib/diagnose";

export const Route = createFileRoute("/repair")({
  head: () => ({
    meta: [
      { title: "Repair suggestions — CrankSense" },
      {
        name: "description",
        content:
          "Prioritised repair plan for your sub-100cc motorcycle: what to fix now, what to monitor, and rough workshop costs.",
      },
    ],
    links: [{ rel: "canonical", href: "/repair" }],
  }),
  component: RepairPage,
});

function RepairPage() {
  const [input, setInput] = useState<DiagInput | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setInput(loadDiagnosis());
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-muted-foreground">Loading…</div>;
  }

  const plan = input ? repairPlan(input) : [];
  const verdict = input ? scoreDiagnosis(input).verdict : null;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="tick mb-4">Suggestions</div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Repair <span className="text-ember">playbook</span>
        </h1>

        {!input ? (
          <>
            <p className="mt-6 text-muted-foreground max-w-xl">
              Run a diagnosis first — the suggestions below adapt to which signals failed.
            </p>
            <Link
              to="/diagnose"
              className="mt-8 inline-block px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
            >
              Add bike info →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-6 text-muted-foreground max-w-xl">
              Based on your last diagnosis ({verdict}), here is a prioritised plan. Costs are
              indicative workshop rates for sub-100cc bikes.
            </p>

            <ol className="mt-12 space-y-px bg-border border border-border">
              {plan.map((r, i) => (
                <li key={i} className="bg-background p-6 md:p-8 grid md:grid-cols-12 gap-6">
                  <div className="md:col-span-2">
                    <div className="font-mono text-xs tracking-[0.2em] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className={`mt-3 inline-block tick px-2 py-1 border border-border ${
                        r.priority === "now"
                          ? "text-[oklch(0.72_0.18_30)]"
                          : r.priority === "soon"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {r.priority === "now"
                        ? "Do now"
                        : r.priority === "soon"
                        ? "Do soon"
                        : "Monitor"}
                    </div>
                  </div>
                  <div className="md:col-span-8">
                    <div className="text-xl font-semibold">{r.title}</div>
                    <p className="mt-2 text-muted-foreground">{r.detail}</p>
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <div className="tick">Est. cost</div>
                    <div className="mt-1 font-mono text-foreground">{r.cost}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                to="/results"
                className="px-6 py-3 rounded-sm border border-border hover:bg-secondary transition"
              >
                ← Back to results
              </Link>
              <Link
                to="/diagnose"
                className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
              >
                Re-run diagnosis
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
