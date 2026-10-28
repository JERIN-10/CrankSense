import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { loadDiagnosis, scoreDiagnosis, type DiagInput } from "@/lib/diagnose";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Diagnosis results - CrankSense" },
      {
        name: "description",
        content: "Motorcycle maintenance baseline and a separately labelled experimental industrial ML demonstration.",
      },
    ],
    links: [{ rel: "canonical", href: "/results" }],
  }),
  component: ResultsPage,
});

type MlStatus = { model_ready: boolean; message: string; motorcycle_validated: boolean };
type EvaluationMetrics = {
  dataset: string;
  dataset_domain: string;
  dataset_url: string;
  rows_used: number;
  train_rows: number;
  test_rows: number;
  target: string;
  features: string[];
  random_state: number;
  test_metrics: {
    accuracy: number;
    precision_failure_class: number;
    recall_failure_class: number;
    f1_failure_class: number;
    roc_auc: number;
    confusion_matrix_labels_0_then_1: number[][];
  };
  caveats: string[];
};

type IndustrialPrediction = {
  predicted_failure: boolean;
  failure_probability: number;
  interpretation: string;
  dataset_domain: string;
  motorcycle_validated: boolean;
};

function ResultsPage() {
  const [input, setInput] = useState<DiagInput | null>(null);
  const [ready, setReady] = useState(false);
  const [mlStatus, setMlStatus] = useState<MlStatus | null>(null);
  const [evaluationMetrics, setEvaluationMetrics] = useState<EvaluationMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState("http://127.0.0.1:8000");
  const [machineType, setMachineType] = useState<"L" | "M" | "H">("L");
  const [airTemperature, setAirTemperature] = useState("300");
  const [processTemperature, setProcessTemperature] = useState("310");
  const [rotationalSpeed, setRotationalSpeed] = useState("1500");
  const [torque, setTorque] = useState("50");
  const [toolWear, setToolWear] = useState("150");
  const [prediction, setPrediction] = useState<IndustrialPrediction | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    setInput(loadDiagnosis());
    setReady(true);
    const configuredUrl = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:8000";
    setApiUrl(configuredUrl.replace(/\/$/, ""));
    fetch(`${configuredUrl.replace(/\/$/, "")}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then((data: MlStatus) => setMlStatus(data))
      .catch(() => setMlStatus(null));
    fetch(`${configuredUrl.replace(/\/$/, "")}/metrics`)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.detail === "string" ? body.detail : "Saved evaluation metrics are unavailable.");
        }
        return response.json();
      })
      .then((data: EvaluationMetrics) => { setEvaluationMetrics(data); setMetricsError(null); })
      .catch((error) => setMetricsError(error instanceof Error ? error.message : "Could not load evaluation metrics."));
  }, []);

  async function runIndustrialPrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPredicting(true);
    setPrediction(null);
    setPredictionError(null);
    try {
      const response = await fetch(`${apiUrl}/predict/industrial`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: machineType,
          air_temperature_k: Number(airTemperature),
          process_temperature_k: Number(processTemperature),
          rotational_speed_rpm: Number(rotationalSpeed),
          torque_nm: Number(torque),
          tool_wear_min: Number(toolWear),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : `Prediction failed (HTTP ${response.status}).`);
      }
      setPrediction(data as IndustrialPrediction);
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : "Could not contact the ML API.");
    } finally {
      setPredicting(false);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-muted-foreground">Loading...</div>;
  }

  if (!input) {
    return (
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="tick mb-4">Results</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">No diagnosis yet</h1>
          <p className="mt-6 max-w-xl text-muted-foreground">
            Add bike readings first to generate a maintenance verdict and repair plan.
          </p>
          <Link to="/diagnose" className="mt-8 inline-block px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember">
            Run a diagnosis
          </Link>
          <IndustrialMlPanel
            apiUrl={apiUrl}
            modelReady={Boolean(mlStatus?.model_ready)}
            machineType={machineType} setMachineType={setMachineType}
            airTemperature={airTemperature} setAirTemperature={setAirTemperature}
            processTemperature={processTemperature} setProcessTemperature={setProcessTemperature}
            rotationalSpeed={rotationalSpeed} setRotationalSpeed={setRotationalSpeed}
            torque={torque} setTorque={setTorque}
            toolWear={toolWear} setToolWear={setToolWear}
            prediction={prediction} predictionError={predictionError} predicting={predicting}
            onSubmit={runIndustrialPrediction}
          />
          <EvaluationDashboard metrics={evaluationMetrics} error={metricsError} />
        </div>
      </section>
    );
  }

  const result = scoreDiagnosis(input);

  return (
    <>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <div className="tick mb-4">Latest result</div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                {result.verdict === "Healthy" ? "Healthy" : result.verdict === "Service soon" ? "Service soon" : "Service now"}
              </h1>
              <p className="mt-5 text-muted-foreground">
                The score combines vibration, engine sound, age, idle RPM and tailpipe chemistry.
              </p>

              <div className="mt-6 border border-border bg-background p-5">
                <div className="tick">ML backend status</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mlStatus
                    ? mlStatus.model_ready
                      ? "Python API is online and its industrial-dataset model is loaded."
                      : "Python API is online, but the ML model has not been trained yet."
                    : "Python API is offline or not configured. The result below uses the existing rule-based baseline."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {mlStatus?.motorcycle_validated
                    ? "Motorcycle validation status reported by API."
                    : "The current public-data model is not validated for motorcycle diagnosis and is not used to calculate this score."}
                </p>
              </div>

              <div className="mt-10 border border-border bg-background p-8">
                <div className="tick">Risk score</div>
                <div className="mt-3 font-mono text-7xl text-foreground">{result.score}</div>
                <div className="mt-4 h-2 bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${result.score}%` }} />
                </div>
                <div className="mt-4 tick">Readings evaluated {result.filled} / 6</div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/repair" className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember">
                  Repair plan
                </Link>
                <Link to="/diagnose" className="px-6 py-3 rounded-sm border border-border hover:bg-secondary transition">
                  Re-run diagnosis
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-px bg-border border border-border">
              {result.flags.map((flag) => (
                <article key={flag.key} className="bg-background p-6 md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold">{flag.label}</h2>
                    <span className={`tick border border-border px-2 py-1 ${flag.level === "fail" ? "text-[oklch(0.72_0.18_30)]" : flag.level === "watch" ? "text-primary" : "text-muted-foreground"}`}>
                      {flag.level}
                    </span>
                  </div>
                  <p className="mt-3 text-muted-foreground">{flag.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <IndustrialMlPanel
        apiUrl={apiUrl}
        modelReady={Boolean(mlStatus?.model_ready)}
        machineType={machineType} setMachineType={setMachineType}
        airTemperature={airTemperature} setAirTemperature={setAirTemperature}
        processTemperature={processTemperature} setProcessTemperature={setProcessTemperature}
        rotationalSpeed={rotationalSpeed} setRotationalSpeed={setRotationalSpeed}
        torque={torque} setTorque={setTorque}
        toolWear={toolWear} setToolWear={setToolWear}
        prediction={prediction} predictionError={predictionError} predicting={predicting}
        onSubmit={runIndustrialPrediction}
      />
      <EvaluationDashboard metrics={evaluationMetrics} error={metricsError} />
    </>
  );
}

type IndustrialMlPanelProps = {
  apiUrl: string;
  modelReady: boolean;
  machineType: "L" | "M" | "H";
  setMachineType: (value: "L" | "M" | "H") => void;
  airTemperature: string;
  setAirTemperature: (value: string) => void;
  processTemperature: string;
  setProcessTemperature: (value: string) => void;
  rotationalSpeed: string;
  setRotationalSpeed: (value: string) => void;
  torque: string;
  setTorque: (value: string) => void;
  toolWear: string;
  setToolWear: (value: string) => void;
  prediction: IndustrialPrediction | null;
  predictionError: string | null;
  predicting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function IndustrialMlPanel(props: IndustrialMlPanelProps) {
  const fieldClass = "mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-foreground";
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="tick mb-4">Experimental ML demo</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Test the industrial model</h2>
          <p className="mt-4 text-muted-foreground">
            This form calls the trained Random Forest through FastAPI. It demonstrates the ML pipeline only; these inputs and predictions are for synthetic industrial machinery, not motorcycles.
          </p>
          <div className="mt-5 border border-primary/50 bg-secondary/40 p-4 text-sm">
            <strong>Research limitation:</strong> Do not use this output to decide whether a motorcycle is safe or needs repair.
            {" "}{props.modelReady ? "The API reports that a model is loaded." : "The API has not confirmed a loaded model; start FastAPI and train the model first."}
          </div>
        </div>

        <form onSubmit={props.onSubmit} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm">Machine type
            <select className={fieldClass} value={props.machineType} onChange={(e) => props.setMachineType(e.target.value as "L" | "M" | "H")}>
              <option value="L">L — Low</option><option value="M">M — Medium</option><option value="H">H — High</option>
            </select>
          </label>
          <label className="text-sm">Air temperature (K)
            <input className={fieldClass} type="number" min="250" max="400" step="any" required value={props.airTemperature} onChange={(e) => props.setAirTemperature(e.target.value)} />
          </label>
          <label className="text-sm">Process temperature (K)
            <input className={fieldClass} type="number" min="250" max="450" step="any" required value={props.processTemperature} onChange={(e) => props.setProcessTemperature(e.target.value)} />
          </label>
          <label className="text-sm">Rotational speed (rpm)
            <input className={fieldClass} type="number" min="1" max="10000" step="any" required value={props.rotationalSpeed} onChange={(e) => props.setRotationalSpeed(e.target.value)} />
          </label>
          <label className="text-sm">Torque (N·m)
            <input className={fieldClass} type="number" min="0" max="1000" step="any" required value={props.torque} onChange={(e) => props.setTorque(e.target.value)} />
          </label>
          <label className="text-sm">Tool wear (minutes)
            <input className={fieldClass} type="number" min="0" max="1000" step="any" required value={props.toolWear} onChange={(e) => props.setToolWear(e.target.value)} />
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={props.predicting} className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
              {props.predicting ? "Predicting…" : "Run experimental ML prediction"}
            </button>
            <span className="text-xs text-muted-foreground">API: {props.apiUrl}/predict/industrial</span>
          </div>
        </form>

        {props.predictionError && <div role="alert" className="mt-6 border border-destructive p-4 text-sm">Prediction failed: {props.predictionError}</div>}
        {props.prediction && (
          <div aria-live="polite" className="mt-8 border border-border bg-secondary/30 p-6 md:p-8">
            <div className="tick mb-3">Experimental prediction response</div>
            <h3 className="text-2xl font-bold">{props.prediction.predicted_failure ? "Failure predicted" : "No failure predicted"}</h3>
            <p className="mt-3 text-muted-foreground">Returned failure probability: <strong className="text-foreground">{(props.prediction.failure_probability * 100).toFixed(2)}%</strong></p>
            <p className="mt-2 text-sm text-muted-foreground">{props.prediction.interpretation}</p>
            <p className="mt-2 text-xs text-muted-foreground">Dataset domain: {props.prediction.dataset_domain}. Motorcycle validated: {props.prediction.motorcycle_validated ? "Yes" : "No"}.</p>
          </div>
        )}
      </div>
    </section>
  );
}


type EvaluationDashboardProps = { metrics: EvaluationMetrics | null; error: string | null };

function EvaluationDashboard({ metrics, error }: EvaluationDashboardProps) {
  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const metricCards = metrics ? [
    { label: "Accuracy", value: percent(metrics.test_metrics.accuracy), note: "All test records" },
    { label: "Failure precision", value: percent(metrics.test_metrics.precision_failure_class), note: "Predicted failures that were failures" },
    { label: "Failure recall", value: percent(metrics.test_metrics.recall_failure_class), note: "Actual failures detected" },
    { label: "Failure F1-score", value: percent(metrics.test_metrics.f1_failure_class), note: "Precision/recall balance" },
    { label: "ROC-AUC", value: metrics.test_metrics.roc_auc.toFixed(4), note: "Ranking discrimination on this split" },
  ] : [];
  const matrix = metrics?.test_metrics.confusion_matrix_labels_0_then_1;
  const maxCell = matrix ? Math.max(1, ...matrix.flat()) : 1;
  return (
    <section className="border-b border-border bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="max-w-4xl">
          <div className="tick mb-4">Model evaluation</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Held-out test performance</h2>
          <p className="mt-4 text-muted-foreground">These values are loaded from the saved <code>artifacts/metrics.json</code> generated by your training run. They are not hard-coded website claims.</p>
        </div>
        {error && <div role="status" className="mt-6 border border-primary/50 p-4 text-sm">Evaluation metrics could not be loaded: {error}. Confirm the model was trained and restart the FastAPI server.</div>}
        {!metrics && !error && <p className="mt-6 text-sm text-muted-foreground">Loading saved evaluation metrics…</p>}
        {metrics && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((item) => (
                <article key={item.label} className="border border-border bg-background p-5">
                  <div className="tick">{item.label}</div>
                  <div className="mt-3 text-3xl font-bold tracking-tight">{item.value}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.note}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <article className="border border-border bg-background p-6">
                <div className="tick mb-3">Confusion matrix</div>
                <h3 className="text-xl font-semibold">Actual vs. predicted</h3>
                <p className="mt-2 text-sm text-muted-foreground">Rows are actual labels; columns are predicted labels. Label 0 = no failure, label 1 = failure.</p>
                {matrix && (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse text-center text-sm">
                      <thead><tr><th className="border border-border p-3 text-muted-foreground">Actual ↓ / Predicted →</th><th className="border border-border p-3">No failure (0)</th><th className="border border-border p-3">Failure (1)</th></tr></thead>
                      <tbody>{matrix.map((row, rowIndex) => (
                        <tr key={rowIndex}><th className="border border-border p-3 text-left">{rowIndex === 0 ? "No failure (0)" : "Failure (1)"}</th>{row.map((cell, colIndex) => (
                          <td key={colIndex} className="border border-border p-3"><div className="font-mono text-xl font-semibold">{cell.toLocaleString()}</div><div className="mt-2 h-1.5 bg-secondary"><div className="h-full bg-primary" style={{ width: `${(cell / maxCell) * 100}%` }} /></div></td>
                        ))}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                <p className="mt-4 text-sm text-muted-foreground">Missed failures: {matrix?.[1]?.[0] ?? "—"}. False alarms: {matrix?.[0]?.[1] ?? "—"}.</p>
              </article>
              <article className="border border-border bg-background p-6">
                <div className="tick mb-3">Dataset & protocol</div>
                <h3 className="text-xl font-semibold">What was evaluated?</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">Dataset</dt><dd className="text-right font-medium">{metrics.dataset}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">Records used</dt><dd className="font-mono">{metrics.rows_used.toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">Training split</dt><dd className="font-mono">{metrics.train_rows.toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">Test split</dt><dd className="font-mono">{metrics.test_rows.toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-border pb-3"><dt className="text-muted-foreground">Random state</dt><dd className="font-mono">{metrics.random_state}</dd></div>
                  <div><dt className="text-muted-foreground">Features</dt><dd className="mt-2 flex flex-wrap gap-2">{metrics.features.map((feature) => <span key={feature} className="border border-border px-2 py-1 text-xs">{feature}</span>)}</dd></div>
                </dl>
                <a href={metrics.dataset_url} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm text-primary underline underline-offset-4">Open dataset source</a>
              </article>
            </div>
            <div className="mt-6 border border-primary/50 bg-background p-5">
              <div className="tick mb-2">Interpretation & limitations</div>
              <p className="text-sm leading-relaxed">{metrics.dataset_domain}. These metrics describe only this held-out random test split. The failure class is uncommon, so precision and recall are important alongside accuracy. This experiment does not establish real-world performance and is not validated for motorcycle engine diagnosis.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {metrics.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
