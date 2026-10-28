import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  BS_NORMS,
  EMPTY_BIKE_FORM,
  bikeToForm,
  createBike,
  loadBikes,
  lookupDtc,
  maintenanceRiskScore,
  saveBikes,
  type Bike,
  type BikeForm,
  type BsNorm,
  type DiagnosticEntry,
} from "@/lib/bikes";

export const Route = createFileRoute("/my-bikes")({
  head: () => ({
    meta: [
      { title: "My Bikes - CrankSense" },
      {
        name: "description",
        content:
          "Store motorcycles, service history, engine symptoms, OBD fault codes and maintenance risk in CrankSense.",
      },
    ],
    links: [{ rel: "canonical", href: "/my-bikes" }],
  }),
  component: MyBikesPage,
});

function MyBikesPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BikeForm>(EMPTY_BIKE_FORM);
  const [dtc, setDtc] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadBikes();
    setBikes(stored);
    setSelectedId(stored[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveBikes(bikes);
  }, [bikes, ready]);

  const selectedBike = useMemo(
    () => bikes.find((bike) => bike.id === selectedId) ?? bikes[0] ?? null,
    [bikes, selectedId],
  );



  const update = (key: keyof BikeForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_BIKE_FORM);
  };

  const submitBike = (event: FormEvent) => {
    event.preventDefault();
    if (!form.model.trim() || !form.manufacturer.trim()) return;

    if (editingId) {
      const updatedAt = new Date().toISOString();
      setBikes((current) =>
        current.map((bike) => (bike.id === editingId ? { ...bike, ...form, updatedAt } : bike)),
      );
      setSelectedId(editingId);
    } else {
      const bike = createBike(form);
      setBikes((current) => [bike, ...current]);
      setSelectedId(bike.id);
    }
    resetForm();
  };

  const editBike = (bike: Bike) => {
    setEditingId(bike.id);
    setForm(bikeToForm(bike));
    setSelectedId(bike.id);
  };

  const deleteBike = (id: string) => {
    setBikes((current) => current.filter((bike) => bike.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) resetForm();
  };

  const addDtc = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBike || !dtc.trim()) return;

    const info = lookupDtc(dtc);
    const entry: DiagnosticEntry = {
      ...info,
      id: crypto.randomUUID(),
      enteredAt: new Date().toISOString(),
      active: true,
    };

    setBikes((current) =>
      current.map((bike) =>
        bike.id === selectedBike.id
          ? { ...bike, diagnostics: [entry, ...bike.diagnostics], updatedAt: new Date().toISOString() }
          : bike,
      ),
    );
    setDtc("");
  };

  const toggleFault = (bikeId: string, entryId: string) => {
    setBikes((current) =>
      current.map((bike) =>
        bike.id === bikeId
          ? {
              ...bike,
              diagnostics: bike.diagnostics.map((entry) =>
                entry.id === entryId ? { ...entry, active: !entry.active } : entry,
              ),
              updatedAt: new Date().toISOString(),
            }
          : bike,
      ),
    );
  };

  const deleteFault = (bikeId: string, entryId: string) => {
    setBikes((current) =>
      current.map((bike) =>
        bike.id === bikeId
          ? {
              ...bike,
              diagnostics: bike.diagnostics.filter((entry) => entry.id !== entryId),
              updatedAt: new Date().toISOString(),
            }
          : bike,
      ),
    );
  };

  const risk = selectedBike ? maintenanceRiskScore(selectedBike) : null;

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-muted-foreground">Loading...</div>;
  }

  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="tick mb-4">Garage</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              My <span className="text-ember">Bikes</span>
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Track motorcycles, service notes, engine symptoms and active OBD faults in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-border border border-border min-w-[280px]">
            <Metric label="Bikes" value={String(bikes.length)} />
            <Metric label="Active DTC" value={String(bikes.reduce((sum, bike) => sum + bike.diagnostics.filter((d) => d.active).length, 0))} />
            <Metric label="Risk" value={risk ? `${risk.score}` : "--"} />
          </div>
        </div>

        <div className="mt-12 grid xl:grid-cols-12 gap-8">
          <form onSubmit={submitBike} className="xl:col-span-5 bg-background border border-border p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <div className="tick">{editingId ? "Edit motorcycle" : "Add motorcycle"}</div>
                <h2 className="mt-2 text-2xl font-semibold">{editingId ? "Update profile" : "Bike profile"}</h2>
              </div>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs font-mono uppercase tracking-[0.18em] border border-border px-3 py-2 hover:bg-secondary transition">
                  Cancel
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Model" hint="Splendor Plus, CT 100">
                <input className="diag-input" value={form.model} onChange={update("model")} required />
              </Field>
              <Field label="Manufacturer" hint="Hero, Honda, TVS, Bajaj">
                <input className="diag-input" value={form.manufacturer} onChange={update("manufacturer")} required />
              </Field>
              <Field label="Year" hint="Manufacturing year">
                <input className="diag-input" inputMode="numeric" value={form.year} onChange={update("year")} placeholder="2018" />
              </Field>
              <Field label="BS norm" hint="Emission standard">
                <select className="diag-input" value={form.bsNorm} onChange={(e) => setForm((current) => ({ ...current, bsNorm: e.target.value as BsNorm }))}>
                  {BS_NORMS.map((norm) => (
                    <option key={norm} value={norm}>{norm}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kilometers" hint="Odometer reading">
                <input className="diag-input" inputMode="numeric" value={form.kilometersDriven} onChange={update("kilometersDriven")} placeholder="24500" />
              </Field>
              <Field label="Engine noise" hint="dB(A), warm idle">
                <input className="diag-input" inputMode="decimal" value={form.engineNoise} onChange={update("engineNoise")} placeholder="82" />
              </Field>
              <Field label="Crank vibration" hint="mm/s RMS">
                <input className="diag-input" inputMode="decimal" value={form.crankshaftVibration} onChange={update("crankshaftVibration")} placeholder="3.8" />
              </Field>
            </div>

            <div className="mt-5 grid gap-5">
              <Field label="Service history" hint="Recent work, oil changes, parts replaced">
                <textarea className="diag-input min-h-24 resize-y" value={form.serviceHistory} onChange={update("serviceHistory")} />
              </Field>
              <Field label="Maintenance notes" hint="Owner or mechanic observations">
                <textarea className="diag-input min-h-24 resize-y" value={form.maintenanceNotes} onChange={update("maintenanceNotes")} />
              </Field>
            </div>

            <button type="submit" className="mt-8 w-full px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember">
              {editingId ? "Save changes" : "Add bike"}
            </button>
          </form>

          <div className="xl:col-span-7 space-y-8">
            <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
              {bikes.length === 0 ? (
                <div className="md:col-span-2 bg-background p-8 text-muted-foreground">
                  Add your first motorcycle to start tracking service condition and OBD diagnostics.
                </div>
              ) : (
                bikes.map((bike) => {
                  const bikeRisk = maintenanceRiskScore(bike);
                  return (
                    <article key={bike.id} className={`bg-background p-6 cursor-pointer ${selectedBike?.id === bike.id ? "outline outline-1 outline-primary -outline-offset-1" : ""}`} onClick={() => setSelectedId(bike.id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="tick">{bike.manufacturer}</div>
                          <h3 className="mt-2 text-xl font-semibold">{bike.model}</h3>
                        </div>
                        <span className={`tick border border-border px-2 py-1 ${bikeRisk.label === "High" ? "text-[oklch(0.72_0.18_30)]" : bikeRisk.label === "Watch" ? "text-primary" : ""}`}>
                          {bikeRisk.label}
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                        <SmallStat label="Year" value={bike.year || "--"} />
                        <SmallStat label="BS" value={bike.bsNorm} />
                        <SmallStat label="Km" value={bike.kilometersDriven || "--"} />
                      </div>
                      <div className="mt-5 h-2 bg-secondary">
                        <div className="h-full bg-primary" style={{ width: `${bikeRisk.score}%` }} />
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" className="px-3 py-2 text-xs border border-border hover:bg-secondary transition" onClick={(e) => { e.stopPropagation(); editBike(bike); }}>
                          Edit
                        </button>
                        <button type="button" className="px-3 py-2 text-xs border border-border hover:bg-secondary transition" onClick={(e) => { e.stopPropagation(); deleteBike(bike.id); }}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {selectedBike && risk && (
              <div className="bg-background border border-border p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
                  <div>
                    <div className="tick">Selected bike</div>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {selectedBike.manufacturer} {selectedBike.model}
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      {selectedBike.year || "Year not set"} / {selectedBike.bsNorm} /{" "}
                      {selectedBike.kilometersDriven || "0"} km
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="tick">Risk score</div>
                    <div className="font-mono text-4xl text-foreground">{risk.score}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 py-8 border-b border-border">
                  <Readout label="Engine noise" value={selectedBike.engineNoise ? `${selectedBike.engineNoise} dB(A)` : "--"} />
                  <Readout label="Crankshaft vibration" value={selectedBike.crankshaftVibration ? `${selectedBike.crankshaftVibration} mm/s` : "--"} />
                  <Readout label="Service history" value={selectedBike.serviceHistory || "No service history recorded."} large />
                  <Readout label="Maintenance notes" value={selectedBike.maintenanceNotes || "No maintenance notes recorded."} large />
                </div>
{selectedBike.bsNorm === "BS6" ? (
  <>
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div>
        <div className="tick">OBD Diagnostics</div>
        <h2 className="mt-2 text-2xl font-semibold">
          Fault Code History
        </h2>
        <p className="mt-2 text-muted-foreground">
          Active fault codes add {risk.obdRisk} points to the maintenance risk score.
        </p>
      </div>
    </div>

    <form
      onSubmit={addDtc}
      className="mt-8 flex flex-col sm:flex-row gap-3"
    >
      <input
        className="diag-input flex-1"
        value={dtc}
        onChange={(e) => setDtc(e.target.value.toUpperCase())}
        placeholder="Enter DTC code (P0335, P0300, P0171...)"
      />

      <button
        type="submit"
        className="px-6 py-3 rounded-sm bg-primary text-primary-foreground"
      >
        Add Code
      </button>
    </form>

    <div className="mt-8 space-y-4">
      {selectedBike.diagnostics.length === 0 ? (
        <div className="border border-border p-4">
          No diagnostic codes recorded.
        </div>
      ) : (
        selectedBike.diagnostics.map((entry) => (
          <div
            key={entry.id}
            className="border border-border p-4 rounded"
          >
            <div className="flex justify-between items-center">
              <strong>{entry.code}</strong>
              <span>{entry.active ? "Active" : "Cleared"}</span>
            </div>

            <p className="mt-2">{entry.description}</p>

            <p className="mt-2">
              Severity: {entry.severity}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => toggleFault(selectedBike.id, entry.id)}
                className="border border-border px-3 py-2"
              >
                {entry.active ? "Mark Cleared" : "Mark Active"}
              </button>

              <button
                type="button"
                onClick={() => deleteFault(selectedBike.id, entry.id)}
                className="border border-border px-3 py-2"
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </>
) : (
<div className="mt-8 border border-border p-6 rounded">
    <div className="tick">OBD Diagnostics</div>

    <h2 className="mt-2 text-xl font-semibold">
      Not Available
    </h2>

    <p className="mt-3 text-muted-foreground">
      OBD diagnostics are available only for BS6 motorcycles.
    </p>

    <ul className="mt-4 space-y-2 text-muted-foreground">
      <li>• Manufacturing year</li>
      <li>• Kilometers driven</li>
      <li>• Engine noise</li>
      <li>• Crankshaft vibration</li>
      <li>• Service history</li>
      <li>• Maintenance notes</li>
    </ul>
  </div>
)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background px-4 py-5 text-center">
      <div className="tick">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="tick">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2">
        <div className="font-medium mb-2">
          {label}
        </div>

        {children}

        <div className="tick mt-2">
          {hint}
        </div>
      </div>
    </label>
  );
}


function Readout({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="tick">{label}</div>
      <div className={large ? "mt-2 text-sm" : "mt-2"}>
        {value}
      </div>
    </div>
  );
}