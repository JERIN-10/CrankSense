export type BsNorm = "BS2" | "BS3" | "BS4" | "BS6";

export type Severity = "low" | "medium" | "high" | "critical";

export type ObdCodeInfo = {
  code: string;
  description: string;
  likelyCauses: string[];
  recommendedFixes: string[];
  severity: Severity;
};

export type DiagnosticEntry = ObdCodeInfo & {
  id: string;
  enteredAt: string;
  active: boolean;
};

export type Bike = {
  id: string;
  model: string;
  manufacturer: string;
  year: string;
  bsNorm: BsNorm;
  kilometersDriven: string;
  serviceHistory: string;
  engineNoise: string;
  crankshaftVibration: string;
  maintenanceNotes: string;
  diagnostics: DiagnosticEntry[];
  createdAt: string;
  updatedAt: string;
};

export type BikeForm = Omit<Bike, "id" | "diagnostics" | "createdAt" | "updatedAt">;

export const BS_NORMS: BsNorm[] = ["BS2", "BS3", "BS4", "BS6"];

export const EMPTY_BIKE_FORM: BikeForm = {
  model: "",
  manufacturer: "",
  year: "",
  bsNorm: "BS6",
  kilometersDriven: "",
  serviceHistory: "",
  engineNoise: "",
  crankshaftVibration: "",
  maintenanceNotes: "",
};

const STORAGE_KEY = "cranksense.bikes.v1";

const DTC_LIBRARY: Record<string, ObdCodeInfo> = {
P0030: {
code: "P0030",
description: "Oxygen sensor heater circuit fault",
likelyCauses: ["Faulty O2 sensor", "Open circuit", "Blown fuse"],
recommendedFixes: ["Check wiring", "Test sensor heater", "Replace O2 sensor"],
severity: "medium",
},

P0101: {
code: "P0101",
description: "Mass air flow sensor performance issue",
likelyCauses: ["Dirty air filter", "Intake leak", "Faulty MAF sensor"],
recommendedFixes: ["Clean intake", "Replace filter", "Test sensor"],
severity: "medium",
},

P0115: {
code: "P0115",
description: "Engine coolant temperature sensor malfunction",
likelyCauses: ["Bad sensor", "Corroded connector", "Wiring fault"],
recommendedFixes: ["Inspect connector", "Replace sensor"],
severity: "medium",
},

P0120: {
code: "P0120",
description: "Throttle position sensor fault",
likelyCauses: ["TPS wear", "Connector issue", "Damaged wire"],
recommendedFixes: ["Check TPS voltage", "Replace TPS"],
severity: "high",
},

P0130: {
code: "P0130",
description: "Oxygen sensor circuit malfunction",
likelyCauses: ["Bad O2 sensor", "Exhaust leak"],
recommendedFixes: ["Inspect exhaust", "Replace sensor"],
severity: "medium",
},

P0171: {
code: "P0171",
description: "Fuel system too lean",
likelyCauses: ["Vacuum leak", "Weak fuel pump", "Dirty injector"],
recommendedFixes: ["Check intake", "Clean injector"],
severity: "high",
},

P0172: {
code: "P0172",
description: "Fuel system too rich",
likelyCauses: ["Clogged filter", "Leaking injector"],
recommendedFixes: ["Replace filter", "Check injector"],
severity: "high",
},

P0201: {
code: "P0201",
description: "Injector circuit malfunction",
likelyCauses: ["Injector fault", "Wiring issue"],
recommendedFixes: ["Test injector", "Repair wiring"],
severity: "high",
},

P0300: {
code: "P0300",
description: "Random cylinder misfire",
likelyCauses: ["Spark plug", "Ignition coil", "Low compression"],
recommendedFixes: ["Replace plug", "Check coil"],
severity: "critical",
},

P0301: {
code: "P0301",
description: "Cylinder 1 misfire",
likelyCauses: ["Spark plug", "Fuel injector"],
recommendedFixes: ["Replace plug", "Check injector"],
severity: "critical",
},

P0335: {
code: "P0335",
description: "Crankshaft position sensor malfunction",
likelyCauses: ["Failed crank sensor", "Pickup coil issue"],
recommendedFixes: ["Check pickup coil", "Replace sensor"],
severity: "critical",
},

P0340: {
code: "P0340",
description: "Camshaft position sensor malfunction",
likelyCauses: ["Faulty sensor", "Timing issue"],
recommendedFixes: ["Inspect timing", "Replace sensor"],
severity: "high",
},

P0351: {
code: "P0351",
description: "Ignition coil circuit fault",
likelyCauses: ["Bad ignition coil", "Connector issue"],
recommendedFixes: ["Replace coil"],
severity: "high",
},

P0420: {
code: "P0420",
description: "Catalytic converter efficiency below threshold",
likelyCauses: ["Failed catalyst", "Rich mixture"],
recommendedFixes: ["Inspect catalyst", "Fix fuel mixture"],
severity: "medium",
},

P0440: {
code: "P0440",
description: "Evaporative emission control malfunction",
likelyCauses: ["Loose fuel cap", "EVAP leak"],
recommendedFixes: ["Tighten cap", "Inspect hoses"],
severity: "low",
},

P0500: {
code: "P0500",
description: "Vehicle speed sensor fault",
likelyCauses: ["Speed sensor failure"],
recommendedFixes: ["Replace sensor"],
severity: "medium",
},

P0505: {
code: "P0505",
description: "Idle control system malfunction",
likelyCauses: ["Dirty throttle body", "IAC valve fault"],
recommendedFixes: ["Clean throttle body"],
severity: "medium",
},

P0562: {
code: "P0562",
description: "System voltage low",
likelyCauses: ["Weak battery", "Charging fault"],
recommendedFixes: ["Test battery", "Check regulator"],
severity: "medium",
},

P0606: {
code: "P0606",
description: "ECU processor fault",
likelyCauses: ["ECU failure"],
recommendedFixes: ["Reflash ECU", "Replace ECU"],
severity: "critical",
},

P0700: {
code: "P0700",
description: "Transmission control system fault",
likelyCauses: ["Control module issue"],
recommendedFixes: ["Scan transmission system"],
severity: "medium",
},

P1602: {
code: "P1602",
description: "Battery voltage interruption",
likelyCauses: ["Disconnected battery"],
recommendedFixes: ["Inspect battery terminals"],
severity: "low",
},
};

export function lookupDtc(code: string): ObdCodeInfo {
  const normalized = code.trim().toUpperCase();
  return (
    DTC_LIBRARY[normalized] ?? {
      code: normalized || "UNKNOWN",
      description: "Unknown powertrain code. Confirm the code format and service manual mapping.",
      likelyCauses: ["Manufacturer-specific fault", "Temporary wiring or sensor issue", "Incorrectly entered code"],
      recommendedFixes: ["Re-scan after clearing old faults", "Check the service manual for this model", "Inspect related connectors before replacing parts"],
      severity: "low",
    }
  );
}

export function loadBikes(): Bike[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Bike[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBikes(bikes: Bike[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bikes));
  } catch {}
}

export function createBike(form: BikeForm): Bike {
  const now = new Date().toISOString();
  return {
    ...form,
    id: crypto.randomUUID(),
    diagnostics: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function bikeToForm(bike: Bike): BikeForm {
  return {
    model: bike.model,
    manufacturer: bike.manufacturer,
    year: bike.year,
    bsNorm: bike.bsNorm,
    kilometersDriven: bike.kilometersDriven,
    serviceHistory: bike.serviceHistory,
    engineNoise: bike.engineNoise,
    crankshaftVibration: bike.crankshaftVibration,
    maintenanceNotes: bike.maintenanceNotes,
  };
}

const numeric = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const severityPoints: Record<Severity, number> = {
  low: 4,
  medium: 10,
  high: 18,
  critical: 28,
};

export function maintenanceRiskScore(bike: Bike) {
  const year = numeric(bike.year);
  const km = numeric(bike.kilometersDriven);
  const noise = numeric(bike.engineNoise);
  const vibration = numeric(bike.crankshaftVibration);
  let score = 0;

  if (!Number.isNaN(year)) {
    const age = new Date().getFullYear() - year;
    if (age >= 12) score += 16;
    else if (age >= 7) score += 8;
  }

  if (!Number.isNaN(km)) {
    if (km >= 70000) score += 18;
    else if (km >= 35000) score += 9;
  }

  if (!Number.isNaN(noise)) {
    if (noise >= 90) score += 22;
    else if (noise >= 84) score += 11;
  }

  if (!Number.isNaN(vibration)) {
    if (vibration >= 7) score += 28;
    else if (vibration >= 4) score += 14;
  }

  const activeFaults = bike.diagnostics.filter((d) => d.active);
  const obdRisk = activeFaults.reduce((sum, d) => sum + severityPoints[d.severity], 0);
  score += Math.min(40, obdRisk);

  const bounded = Math.min(100, score);
  const label = bounded >= 60 ? "High" : bounded >= 30 ? "Watch" : "Low";

  return {
    score: bounded,
    label,
    activeFaults: activeFaults.length,
    obdRisk: Math.min(40, obdRisk),
  };
}
