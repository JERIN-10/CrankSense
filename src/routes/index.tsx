import { createFileRoute, Link } from "@tanstack/react-router";
import engineHero from "../assets/engine-hero.jpg";
import waveform from "../assets/waveform.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrankSense — AI Predictive Maintenance for Sub-100cc Motorcycles" },
      {
        name: "description",
        content:
          "CrankSense scores engine noise, vibration, age and tailpipe readings against maintenance thresholds, and includes a separate machine-learning demo on public industrial data.",
      },
      { property: "og:title", content: "CrankSense — Predictive Maintenance for Small Motorcycles" },
      {
        property: "og:description",
        content: "A maintenance-assessment prototype for small-engine motorcycles.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <Marquee />
      <Problem />
      <How />
      <Features />
    </>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0">
        <img
          src={engineHero}
          alt="Macro shot of a small motorcycle engine cylinder and crankshaft"
          width={1600}
          height={1200}
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/30" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 md:pt-36 md:pb-44">
        <div className="flex items-center gap-3 mb-8">
          <span className="tick">Predictive Maintenance</span>
          <span className="h-px w-12 bg-border" />
          <span className="tick">≤ 100 cc</span>
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-5xl">
          Hear the failure <span className="text-ember">before</span> it happens.
        </h1>
        <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
          CrankSense is an academic prototype for small-engine motorcycles. It compares the sound,
          shake, age and tailpipe readings you enter with maintenance thresholds and shows a service
          verdict. A separate machine-learning demo, trained on public industrial data, shows how
          predictive maintenance works.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/diagnose"
            className="px-6 py-3 rounded-sm bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-ember"
          >
            Run a diagnosis →
          </Link>
          <Link
            to="/about"
            className="px-6 py-3 rounded-sm border border-border text-foreground hover:bg-secondary transition"
          >
            About the project
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border max-w-3xl">
          <Stat k="2" v="Assessment paths" />
          <Stat k="8" v="Input signals" />
          <Stat k="Rules" v="Motorcycle verdict basis" />
          <Stat k="≤ 100cc" v="Target displacement" />
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background p-6">
      <div className="font-mono text-2xl md:text-3xl text-foreground">{k}</div>
      <div className="tick mt-2">{v}</div>
    </div>
  );
}

function Marquee() {
  const items = [
    "Vibration · mm/s",
    "Engine noise · dB",
    "Year",
    "Make",
    "Displacement · cc",
    "Idle RPM",
    "Hydrocarbons · ppm",
    "Carbon monoxide · %",
  ];
  return (
    <div className="border-b border-border bg-background py-6 overflow-hidden">
      <div className="flex gap-12 animate-[scroll_30s_linear_infinite] whitespace-nowrap font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
        {[...items, ...items, ...items].map((x, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="tick mb-6">The problem</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Small bikes break <span className="text-ember">silently</span>.
          </h2>
        </div>
        <div className="lg:col-span-7 space-y-6 text-muted-foreground text-lg leading-relaxed">
          <p>
            Sub-100cc motorcycles run on tight clearances and thin margins. By the time a rider
            notices something off, a worn bearing has usually scored the crank, a fouled plug has
            burned a valve, or a rich mixture has clogged the catalyst.
          </p>
          <p>
            Workshops still rely on the calendar — "service every 3,000 km" — instead of what the
            engine is actually telling them. CrankSense replaces guesswork with a transparent rule-based
            score built on the four signals a mechanic already feels: <span className="text-foreground">sound,
            shake, age</span> and <span className="text-foreground">tailpipe chemistry</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    { n: "01", t: "Capture", d: "Sensors and a quick pollution test record vibration, sound, idle RPM, HC and CO." },
    { n: "02", t: "Score", d: "Each reading is compared with fixed thresholds and adds risk points." },
    { n: "03", t: "Demo ML", d: "A separate model, trained on public industrial data, shows the predictive-maintenance workflow." },
    { n: "04", t: "Act", d: "The rider gets a verdict, risk score and a prioritised repair plan." },
  ];
  return (
    <section id="how" className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-16">
          <div>
            <div className="tick mb-4">How it works</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-xl">
              Four steps from <span className="text-ember">noise</span> to verdict.
            </h2>
          </div>
        </div>
        <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {steps.map((s) => (
            <li key={s.n} className="bg-background p-8">
              <div className="font-mono text-xs tracking-[0.2em] text-primary">{s.n}</div>
              <div className="mt-4 text-2xl font-semibold">{s.t}</div>
              <p className="mt-3 text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  const signals = [
    { t: "Vibration", d: "Crankshaft and frame oscillation in mm/s RMS — flags worn bearings and loose mounts." },
    { t: "Engine noise", d: "Idle sound pressure in dB(A) — picks up tappet rattle and exhaust leaks." },
    { t: "Hydrocarbons", d: "HC ppm at idle from the pollution test — exposes incomplete combustion." },
    { t: "Carbon monoxide", d: "CO % at idle — reveals a rich mixture, choked filter or dying catalyst." },
  ];
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="tick mb-6">Signals</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            The four things the model <span className="text-ember">listens for</span>.
          </h2>
          <div className="mt-10 border border-border bg-background overflow-hidden">
            <img
              src={waveform}
              alt="Abstract vibration waveform"
              width={1200}
              height={600}
              className="w-full h-auto opacity-80"
            />
          </div>
        </div>
        <ul className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-border border border-border self-start">
          {signals.map((s, i) => (
            <li key={s.t} className="bg-background p-8">
              <div className="font-mono text-xs tracking-[0.2em] text-primary">0{i + 1}</div>
              <div className="mt-4 text-xl font-semibold">{s.t}</div>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
