import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CrankSense" },
      {
        name: "description",
        content:
          "About CrankSense: an academic predictive-maintenance prototype for small-engine motorcycles, with a rule-based assessment and a machine-learning demo on public industrial data.",
      },
      { property: "og:title", content: "About CrankSense" },
      {
        property: "og:description",
        content:
          "Why predictive maintenance matters for small-engine motorcycles, and how CrankSense was built.",
      },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="border-b border-border">
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <div className="tick mb-4">About the project</div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          AI-Based Predictive Maintenance for{" "}
          <span className="text-ember">Small Engine Motorcycles</span>
        </h1>

        <div className="mt-12 space-y-6 text-muted-foreground text-lg leading-relaxed">
          <p>
            Predictive maintenance aims to improve vehicle reliability, reduce unexpected breakdowns and
            lower maintenance costs. CrankSense is an academic prototype that explores this idea for
            motorcycles below 100cc, using readings a mechanic can take: crankshaft vibration, engine
            noise, vehicle age, idle RPM and tailpipe HC and CO from a pollution test.
          </p>
          <p>
            The motorcycle verdict comes from a transparent <span className="text-foreground">rule-based
            score</span> with fixed thresholds. It is not a trained model and its thresholds have not yet
            been validated against inspection data. Separately, the project includes a machine-learning
            demo: <span className="text-foreground">Logistic Regression</span>,{" "}
            <span className="text-foreground">Decision Tree</span> and{" "}
            <span className="text-foreground">Random Forest</span> are compared with cross-validation on the
            public AI4I 2020 dataset of synthetic <span className="text-foreground">industrial</span>{" "}
            machines. That demo shows the workflow; it does not predict motorcycle failures.
          </p>
          <p>
            Future work is to collect real, labelled motorcycle data, validate the rules, train
            motorcycle-specific models, and add live sensors.
          </p>
        </div>
        <div className="mt-16 grid sm:grid-cols-2 gap-px bg-border border border-border">
          <Fact k="Target vehicle" v="Sub-100cc motorcycles" />
          <Fact k="Rule-based inputs" v="8 (mechanical + emissions)" />
          <Fact k="ML demo models" v="Logistic · Decision Tree · Random Forest" />
          <Fact k="ML demo data" v="AI4I 2020 (industrial, synthetic)" />
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            to="/diagnose"
            className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
          >
            Try the diagnosis →
          </Link>
          <Link
            to="/models"
            className="px-6 py-3 rounded-sm border border-border hover:bg-secondary transition"
          >
            See the model metrics
          </Link>
        </div>
      </div>
    </article>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background p-6">
      <div className="tick">{k}</div>
      <div className="mt-2 font-mono text-foreground">{v}</div>
    </div>
  );
}
