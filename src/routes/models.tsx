import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models & metrics — CrankSense" },
      {
        name: "description",
        content:
          "Evaluation of Logistic Regression, Decision Tree and Random Forest on the public AI4I 2020 industrial dataset. All numbers are read from the saved training output.",
      },
    ],
    links: [{ rel: "canonical", href: "/models" }],
  }),
  component: ModelsPage,
});

type TestMetrics = {
  accuracy: number;
  precision_failure_class: number;
  recall_failure_class: number;
  f1_failure_class: number;
  roc_auc: number;
  confusion_matrix_labels_0_then_1: number[][];
};

type ModelResult = {
  cv_mean: { f1: number };
  test_metrics: TestMetrics;
};

type Metrics = {
  dataset: string;
  dataset_domain: string;
  test_rows: number;
  selected_model?: string;
  selection_rule?: string;
  majority_baseline_accuracy?: number;
  test_metrics: TestMetrics;
  model_comparison?: Record<string, ModelResult>;
  caveats?: string[];
};

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const roadmap = [
  { p: "Next", t: "Real motorcycle data", d: "Collect readings (vibration, sound, idle RPM, HC, CO) from many motorcycles, with inspection outcomes as labels." },
  { p: "Then", t: "Validate the rules", d: "Check the rule-based thresholds against the labelled data and expert inspection." },
  { p: "Then", t: "Train a motorcycle model", d: "Train and cross-validate models on that data, splitting by motorcycle to avoid leakage." },
  { p: "Later", t: "Sensors and deployment", d: "Live vibration and temperature sensing, logging, and a hosted deployment." },
];

function ModelsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = (import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    fetch(`${url}/metrics`)
      .then(async (response) => {
        if (!response.ok) throw new Error("The API answered, but no saved metrics were found. Run train.py first.");
        return response.json();
      })
      .then((data: Metrics) => setMetrics(data))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not reach the API. Start the backend first."),
      );
  }, []);

  const comparison = metrics?.model_comparison ? Object.entries(metrics.model_comparison) : [];
  const cm = metrics?.test_metrics.confusion_matrix_labels_0_then_1;

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="tick mb-4">Models</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
            Industrial-data <span className="text-ember">model comparison</span>
          </h1>
          <p className="mt-6 max-w-3xl text-muted-foreground">
            These models are trained on the public AI4I 2020 dataset of synthetic{" "}
            <span className="text-foreground">industrial machines</span>, not motorcycles. They demonstrate the
            machine-learning workflow only. Every number on this page is read from the saved training output
            (<code>metrics.json</code>) served by the API; none is typed in by hand.
          </p>

          {error && (
            <div role="status" className="mt-10 border border-primary/50 p-4 text-sm">
              Metrics could not be loaded: {error}
            </div>
          )}

          {metrics && comparison.length === 0 && (
            <div role="status" className="mt-10 border border-primary/50 p-4 text-sm">
              The saved metrics come from an older training run with a single model. Run{" "}
              <code>python train.py</code> in the <code>ml-backend</code> folder to compare three models.
            </div>
          )}

          {comparison.length > 0 && (
            <div className="mt-12 border border-border bg-background overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="p-4 tick">Model</th>
                    <th className="p-4 tick">CV F1</th>
                    <th className="p-4 tick">Test accuracy</th>
                    <th className="p-4 tick">Test precision</th>
                    <th className="p-4 tick">Test recall</th>
                    <th className="p-4 tick">Test F1</th>
                    <th className="p-4 tick">ROC AUC</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(([name, r]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="p-4 font-medium">
                        {name}
                        {name === metrics?.selected_model && (
                          <span className="ml-3 tick text-primary border border-primary px-2 py-0.5">Selected</span>
                        )}
                      </td>
                      <td className="p-4 font-mono">{pct(r.cv_mean.f1)}</td>
                      <td className="p-4 font-mono">{pct(r.test_metrics.accuracy)}</td>
                      <td className="p-4 font-mono">{pct(r.test_metrics.precision_failure_class)}</td>
                      <td className="p-4 font-mono">{pct(r.test_metrics.recall_failure_class)}</td>
                      <td className="p-4 font-mono">{pct(r.test_metrics.f1_failure_class)}</td>
                      <td className="p-4 font-mono">{r.test_metrics.roc_auc.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {metrics && (
            <p className="mt-4 text-sm text-muted-foreground max-w-3xl">
              Precision, recall and F1 are for the rare <em>failure</em> class.
              {metrics.selection_rule ? ` The selected model has the ${metrics.selection_rule}.` : ""}
              {metrics.majority_baseline_accuracy !== undefined
                ? ` A trivial classifier that always answers "no failure" would already score ${pct(metrics.majority_baseline_accuracy)} accuracy, so accuracy alone is not meaningful.`
                : ""}
            </p>
          )}
        </div>
      </section>

      {metrics && cm && (
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <div className="tick mb-4">Confusion matrix</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {metrics.selected_model ?? "Model"} on the <span className="text-ember">held-out test set</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Rows are the actual class and columns the predicted class, on {metrics.test_rows} test records. Top-left
                and bottom-right are correct predictions. Bottom-left are missed failures.
              </p>
            </div>
            <div className="lg:col-span-7 border border-border bg-background overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-4 tick"></td>
                    <td className="p-4 tick">Pred no failure</td>
                    <td className="p-4 tick">Pred failure</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 tick">Actual no failure</td>
                    <td className="p-4 font-mono text-primary font-semibold">{cm[0][0]}</td>
                    <td className="p-4 font-mono">{cm[0][1]}</td>
                  </tr>
                  <tr>
                    <td className="p-4 tick">Actual failure</td>
                    <td className="p-4 font-mono">{cm[1][0]}</td>
                    <td className="p-4 font-mono text-primary font-semibold">{cm[1][1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="tick mb-4">Roadmap</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">
            From industrial demo to <span className="text-ember">real motorcycles</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl">These are proposals, not features that exist today.</p>
          <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {roadmap.map((r) => (
              <li key={r.t} className="bg-background p-8">
                <div className="font-mono text-xs tracking-[0.2em] text-primary">{r.p}</div>
                <div className="mt-4 text-xl font-semibold">{r.t}</div>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{r.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <Link
              to="/diagnose"
              className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
            >
              Try the diagnosis →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
