import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type ReactNode, type ChangeEvent } from "react";
import { EMPTY_INPUT, saveDiagnosis, type DiagInput }
from "@/lib/diagnose";
export const Route = createFileRoute("/diagnose")({
  head: () => ({
    meta: [
      { title: "Diagnose your bike — CrankSense" },
      {
        name: "description",
        content:
          "Enter vibration, sound, year, make, displacement, idle RPM, hydrocarbons and carbon monoxide from your pollution test. Get an instant maintenance verdict.",
      },
      { property: "og:title", content: "Diagnose your bike — CrankSense" },
      {
        property: "og:description",
        content: "Eight readings in, a maintenance verdict out, in under a second.",
      },
    ],
    links: [{ rel: "canonical", href: "/diagnose" }],
  }),
  component: DiagnosePage,
});

function DiagnosePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<DiagInput>(EMPTY_INPUT);

  const set = (k: keyof DiagInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const loadSample = () =>
    setForm({
      vibration: "5.8",
      sound: "86",
      year: "2014",
      make: "Honda",
      cc: "97",
      rpm: "1850",
      hc: "2400",
      co: "3.9",
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveDiagnosis(form);
    navigate({ to: "/results" });
  };

  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
          <div>
            <div className="tick mb-4">Add bike info</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">
              Enter the readings. <span className="text-ember">Get a verdict.</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              HC and CO must be captured <span className="text-foreground">at idle</span> during a
              standard pollution-under-control (PUC) test. All other readings are taken with the
              engine warm.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="text-xs font-mono uppercase tracking-[0.18em] px-4 py-2 border border-border hover:bg-secondary transition"
          >
            Load sample bike
          </button>
        </div>

        <form
          onSubmit={submit}
          className="bg-background border border-border p-6 md:p-10"
          noValidate
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Field label="Vibration" unit="mm/s RMS" hint="Crankshaft, warm idle">
              <NumInput value={form.vibration} onChange={set("vibration")} placeholder="3.2" />
            </Field>
            <Field label="Engine sound" unit="dB(A) @ 0.5 m" hint="Idle, quiet ambient">
              <NumInput value={form.sound} onChange={set("sound")} placeholder="78" />
            </Field>
            <Field label="Year of manufacture" unit="YYYY" hint="From RC book">
              <NumInput value={form.year} onChange={set("year")} placeholder="2018" />
            </Field>
            <Field label="Make" unit="brand" hint="Honda, Hero, TVS, Bajaj…">
              <input
                type="text"
                maxLength={40}
                value={form.make}
                onChange={set("make")}
                placeholder="Honda"
                className="diag-input"
              />
            </Field>
            <Field label="Displacement" unit="cc" hint="Sub-100cc band">
              <NumInput value={form.cc} onChange={set("cc")} placeholder="97" />
            </Field>
            <Field label="Idle RPM" unit="rpm" hint="Warm, no throttle">
              <NumInput value={form.rpm} onChange={set("rpm")} placeholder="1500" />
            </Field>
            <Field label="Hydrocarbons (HC)" unit="ppm · idle · PUC" hint="From pollution test">
              <NumInput value={form.hc} onChange={set("hc")} placeholder="1200" />
            </Field>
            <Field label="Carbon monoxide (CO)" unit="% vol · idle · PUC" hint="From pollution test">
              <NumInput value={form.co} onChange={set("co")} placeholder="2.8" />
            </Field>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
            >
              Diagnose engine →
            </button>
            <button
              type="button"
              onClick={() => setForm(EMPTY_INPUT)}
              className="px-6 py-3 rounded-sm border border-border hover:bg-secondary transition text-sm"
            >
              Reset
            </button>
            <Link to="/results" className="tick hover:text-foreground transition">
              View last result →
            </Link>
            <span className="tick ml-auto">Baseline · Rules-based</span>
          </div>
        </form>
      </div>
    </section>
  );
}

// type="text" with inputMode keeps mobile keyboards happy AND avoids
// silent browser validation that was blocking submits on small screens.
function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="diag-input"
    />
  );
}

function Field({
  label,
  unit,
  hint,
  children,
}: {
  label: string;
  unit: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground text-right">
          {unit}
        </span>
      </div>
      {children}
      <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
    </label>
  );
}
