export type DiagInput = {
  vibration: string;
  sound: string;
  year: string;
  make: string;
  cc: string;
  rpm: string;
  hc: string;
  co: string;
};

export type Flag = {
  label: string;
  level: "ok" | "watch" | "fail";
  note: string;
  key: string;
};

export const EMPTY_INPUT: DiagInput = {
  vibration: "",
  sound: "",
  year: "",
  make: "",
  cc: "",
  rpm: "",
  hc: "",
  co: "",
};

const STORAGE_KEY = "cranksense.diag.v1";

export function saveDiagnosis(input: DiagInput) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {}
}

export function loadDiagnosis(): DiagInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiagInput;
  } catch {
    return null;
  }
}

export function clearDiagnosis() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

const num = (s: string) => (s == null || String(s).trim() === "" ? NaN : Number(s));

export function scoreDiagnosis(i: DiagInput) {
  const v = num(i.vibration);
  const s = num(i.sound);
  const y = num(i.year);
  const cc = num(i.cc);
  const rpm = num(i.rpm);
  const hc = num(i.hc);
  const co = num(i.co);

  const flags: Flag[] = [];
  let risk = 0;
  let filled = 0;

  if (!isNaN(v)) {
    filled++;
    if (v >= 7) { risk += 28; flags.push({ key: "vibration", label: "Crankshaft vibration", level: "fail", note: `${v.toFixed(1)} mm/s — bearings, mounts or balancer worn` }); }
    else if (v >= 4) { risk += 14; flags.push({ key: "vibration", label: "Crankshaft vibration", level: "watch", note: `${v.toFixed(1)} mm/s — above the healthy band (<4)` }); }
    else flags.push({ key: "vibration", label: "Crankshaft vibration", level: "ok", note: `${v.toFixed(1)} mm/s — within healthy band` });
  }

  if (!isNaN(s)) {
    filled++;
    if (s >= 90) { risk += 22; flags.push({ key: "sound", label: "Engine noise", level: "fail", note: `${s.toFixed(0)} dB — exhaust leak or tappet noise likely` }); }
    else if (s >= 84) { risk += 11; flags.push({ key: "sound", label: "Engine noise", level: "watch", note: `${s.toFixed(0)} dB — louder than nominal` }); }
    else flags.push({ key: "sound", label: "Engine noise", level: "ok", note: `${s.toFixed(0)} dB — nominal` });
  }

  if (!isNaN(y)) {
    filled++;
    const age = new Date().getFullYear() - y;
    if (age >= 12) { risk += 18; flags.push({ key: "age", label: "Vehicle age", level: "fail", note: `${age} yrs — high-wear era` }); }
    else if (age >= 6) { risk += 9; flags.push({ key: "age", label: "Vehicle age", level: "watch", note: `${age} yrs — mid-life service window` }); }
    else flags.push({ key: "age", label: "Vehicle age", level: "ok", note: `${age} yrs — young` });
  }

  if (!isNaN(rpm)) {
    filled++;
    if (rpm < 1100 || rpm > 2000) { risk += 14; flags.push({ key: "rpm", label: "Idle RPM", level: "fail", note: `${rpm} rpm — out of healthy 1300–1700 band` }); }
    else if (rpm < 1300 || rpm > 1800) { risk += 7; flags.push({ key: "rpm", label: "Idle RPM", level: "watch", note: `${rpm} rpm — drifting from spec` }); }
    else flags.push({ key: "rpm", label: "Idle RPM", level: "ok", note: `${rpm} rpm — on spec` });
  }

  if (!isNaN(hc)) {
    filled++;
    if (hc >= 4500) { risk += 20; flags.push({ key: "hc", label: "Hydrocarbons (HC) at idle", level: "fail", note: `${hc.toFixed(0)} ppm — incomplete combustion` }); }
    else if (hc >= 1500) { risk += 10; flags.push({ key: "hc", label: "Hydrocarbons (HC) at idle", level: "watch", note: `${hc.toFixed(0)} ppm — above clean idle` }); }
    else flags.push({ key: "hc", label: "Hydrocarbons (HC) at idle", level: "ok", note: `${hc.toFixed(0)} ppm — clean burn` });
  }

  if (!isNaN(co)) {
    filled++;
    if (co >= 4.5) { risk += 18; flags.push({ key: "co", label: "Carbon monoxide (CO) at idle", level: "fail", note: `${co.toFixed(2)} % — rich mixture / carb tune` }); }
    else if (co >= 3.5) { risk += 9; flags.push({ key: "co", label: "Carbon monoxide (CO) at idle", level: "watch", note: `${co.toFixed(2)} % — borderline rich` }); }
    else flags.push({ key: "co", label: "Carbon monoxide (CO) at idle", level: "ok", note: `${co.toFixed(2)} % — within spec` });
  }

  if (!isNaN(cc) && cc > 100) {
    flags.push({ key: "cc", label: "Displacement", level: "watch", note: `${cc}cc — above the sub-100cc band this prototype is designed for` });
  }

  const score = Math.min(100, risk);
  let verdict: "Healthy" | "Service soon" | "Service now";
  if (score >= 45) verdict = "Service now";
  else if (score >= 22) verdict = "Service soon";
  else verdict = "Healthy";

  const confidence = Math.round(50 + (filled / 6) * 44);

  return { score, verdict, flags, filled, confidence };
}

// Estimate annual CO2 / CO / HC emissions for the ridden condition.
// Reference baseline: a healthy sub-100cc 4-stroke at ~60 km/L emits
// roughly 38 g CO2 / km. We scale by combustion-health multipliers
// derived from the idle CO and HC readings.
export function estimateEmissions(i: DiagInput, kmPerYear = 8000) {
  const co = num(i.co);
  const hc = num(i.hc);
  const cc = num(i.cc);
  const year = num(i.year);

  const baseCO2 = 38; // g/km healthy sub-100cc
  const ccFactor = isNaN(cc) ? 1 : Math.max(0.85, Math.min(1.3, cc / 97));
  const ageFactor = isNaN(year) ? 1 : Math.max(1, 1 + Math.max(0, (new Date().getFullYear() - year) - 4) * 0.015);

  // Rich mixture → more CO2 + much more CO.
  const coMult = isNaN(co) ? 1 : 1 + Math.max(0, co - 2) * 0.06;
  const hcMult = isNaN(hc) ? 1 : 1 + Math.max(0, hc - 800) * 0.00008;

  const co2PerKm = baseCO2 * ccFactor * ageFactor * coMult * hcMult; // g/km
  const coPerKm = isNaN(co) ? 0 : (co / 3) * 6 * coMult; // g/km, rough scaling
  const hcPerKm = isNaN(hc) ? 0 : (hc / 1500) * 0.9 * hcMult; // g/km

  return {
    kmPerYear,
    co2PerKm: Math.round(co2PerKm * 10) / 10,
    co2PerYearKg: Math.round((co2PerKm * kmPerYear) / 1000),
    coPerKm: Math.round(coPerKm * 100) / 100,
    coPerYearKg: Math.round((coPerKm * kmPerYear) / 1000),
    hcPerKm: Math.round(hcPerKm * 1000) / 1000,
    hcPerYearKg: Math.round((hcPerKm * kmPerYear) / 1000),
  };
}

export type Repair = {
  title: string;
  detail: string;
  priority: "now" | "soon" | "monitor";
  cost: string;
};

export function repairPlan(i: DiagInput): Repair[] {
  const out: Repair[] = [];
  const { flags, verdict } = scoreDiagnosis(i);
  const has = (key: string, level: Flag["level"]) =>
    flags.some((f) => f.key === key && f.level === level);

  if (has("vibration", "fail")) {
    out.push({
      title: "Inspect crankshaft, big-end bearing and engine mounts",
      detail:
        "Open the clutch cover, check crank end-play and big-end radial play. Replace worn bearings, rubber mounts and balancer chain tensioner.",
      priority: "now",
      cost: "₹1,800 – ₹4,500",
    });
  } else if (has("vibration", "watch")) {
    out.push({
      title: "Tighten engine mounts and balance wheels",
      detail: "Re-torque the four mounting bolts to spec, true the wheels, and balance front/rear.",
      priority: "soon",
      cost: "₹250 – ₹700",
    });
  }

  if (has("sound", "fail")) {
    out.push({
      title: "Adjust valve clearance, check exhaust gasket",
      detail:
        "Set intake/exhaust tappet clearance (typically 0.05 / 0.08 mm cold). Replace cracked exhaust gasket and silencer packing if rattling.",
      priority: "now",
      cost: "₹350 – ₹1,200",
    });
  } else if (has("sound", "watch")) {
    out.push({
      title: "Service the air filter and check tappet noise",
      detail: "Clean or replace the foam/paper air filter and listen for tappet ticking when warm.",
      priority: "soon",
      cost: "₹150 – ₹400",
    });
  }

  if (has("rpm", "fail") || has("rpm", "watch")) {
    out.push({
      title: "Reset idle and clean the carburettor / throttle body",
      detail:
        "Drain float bowl, clean pilot jet and idle air passage, then set idle to 1500 ± 100 rpm. On FI bikes, run a throttle-body learn cycle.",
      priority: has("rpm", "fail") ? "now" : "soon",
      cost: "₹300 – ₹900",
    });
  }

  if (has("hc", "fail")) {
    out.push({
      title: "Replace spark plug and check ignition timing",
      detail:
        "High HC means unburnt fuel. Fit a new plug at the correct gap (~0.6–0.7 mm), inspect HT cap, and verify CDI/ignition timing.",
      priority: "now",
      cost: "₹120 – ₹500",
    });
  } else if (has("hc", "watch")) {
    out.push({
      title: "Inspect spark plug and HT lead",
      detail: "Clean the plug, check electrode colour (light tan = healthy) and replace if eroded.",
      priority: "soon",
      cost: "₹80 – ₹250",
    });
  }

  if (has("co", "fail")) {
    out.push({
      title: "Lean the mixture and service the air intake",
      detail:
        "High CO = rich mixture. Replace air filter, lower the carb air-screw by 1/4–1/2 turn (or recalibrate FI), and verify the choke fully disengages.",
      priority: "now",
      cost: "₹200 – ₹700",
    });
  } else if (has("co", "watch")) {
    out.push({
      title: "Replace air filter, verify choke",
      detail: "A clogged filter or stuck choke commonly pushes CO into the 3.5–4.5 % band.",
      priority: "soon",
      cost: "₹150 – ₹400",
    });
  }

  if (has("age", "fail")) {
    out.push({
      title: "Full engine oil + filter change with flush",
      detail:
        "On bikes older than 12 years, switch to 10W-30 JASO MA2, change oil filter mesh, and flush the wet clutch.",
      priority: "soon",
      cost: "₹400 – ₹900",
    });
  }

  if (out.length === 0) {
    out.push({
      title: verdict === "Healthy" ? "Routine 3,000 km service" : "Preventive service recommended",
      detail:
        "Change engine oil, clean air filter, lubricate chain, check brake pads and tyre pressure.",
      priority: "monitor",
      cost: "₹300 – ₹600",
    });
  }

  return out;
}
