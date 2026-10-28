// Tests for the rule-based motorcycle assessment (src/lib/diagnose.ts).
// Run with:  npm run test:rules
import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_INPUT, scoreDiagnosis, repairPlan, estimateEmissions } from "../src/lib/diagnose.ts";

const input = (o: Partial<typeof EMPTY_INPUT>) => ({ ...EMPTY_INPUT, ...o });
const thisYear = new Date().getFullYear();

test("empty input gives score 0 and Healthy", () => {
  const r = scoreDiagnosis(EMPTY_INPUT);
  assert.equal(r.score, 0);
  assert.equal(r.verdict, "Healthy");
  assert.equal(r.filled, 0);
});

test("healthy readings give Healthy", () => {
  const r = scoreDiagnosis(input({ vibration: "2", sound: "75", year: String(thisYear - 2), rpm: "1500", hc: "800", co: "2" }));
  assert.equal(r.score, 0);
  assert.equal(r.verdict, "Healthy");
});

test("vibration thresholds: <4 ok, 4-7 watch (+14), >=7 fail (+28)", () => {
  assert.equal(scoreDiagnosis(input({ vibration: "3.9" })).score, 0);
  assert.equal(scoreDiagnosis(input({ vibration: "4" })).score, 14);
  assert.equal(scoreDiagnosis(input({ vibration: "6.9" })).score, 14);
  assert.equal(scoreDiagnosis(input({ vibration: "7" })).score, 28);
});

test("idle RPM bands", () => {
  assert.equal(scoreDiagnosis(input({ rpm: "1500" })).score, 0);
  assert.equal(scoreDiagnosis(input({ rpm: "1850" })).score, 7);
  assert.equal(scoreDiagnosis(input({ rpm: "1250" })).score, 7);
  assert.equal(scoreDiagnosis(input({ rpm: "2100" })).score, 14);
  assert.equal(scoreDiagnosis(input({ rpm: "1000" })).score, 14);
});

test("verdict cut-offs: 22 -> Service soon, 45 -> Service now", () => {
  assert.equal(scoreDiagnosis(input({ vibration: "5" })).verdict, "Healthy"); // 14
  assert.equal(scoreDiagnosis(input({ vibration: "5", sound: "86" })).verdict, "Service soon"); // 14 + 11 = 25
  assert.equal(scoreDiagnosis(input({ vibration: "8", sound: "95" })).verdict, "Service now"); // 28 + 22 = 50
});

test("score is capped at 100", () => {
  const r = scoreDiagnosis(input({ vibration: "9", sound: "95", year: "1990", rpm: "3000", hc: "9000", co: "9" }));
  assert.equal(r.score, 100);
});

test("sample bike from the Diagnose page: 14+11+age+7+10+9", () => {
  const age = thisYear - 2014;
  const agePts = age >= 12 ? 18 : age >= 6 ? 9 : 0;
  const r = scoreDiagnosis(input({ vibration: "5.8", sound: "86", year: "2014", make: "Honda", cc: "97", rpm: "1850", hc: "2400", co: "3.9" }));
  assert.equal(r.score, 14 + 11 + agePts + 7 + 10 + 9);
});

test("confidence only reflects how many readings were entered", () => {
  assert.equal(scoreDiagnosis(input({ vibration: "2" })).confidence, Math.round(50 + (1 / 6) * 44));
});

test("displacement above 100cc adds a note but no points", () => {
  const r = scoreDiagnosis(input({ cc: "150" }));
  assert.equal(r.score, 0);
  assert.ok(r.flags.some((f) => f.key === "cc"));
});

test("repair plan always returns at least one item", () => {
  assert.ok(repairPlan(EMPTY_INPUT).length >= 1);
  assert.equal(repairPlan(input({ vibration: "8" }))[0].priority, "now");
});

test("emissions estimate is positive", () => {
  const e = estimateEmissions(input({ co: "3", hc: "1500", cc: "97", year: "2018" }));
  assert.ok(e.co2PerKm > 0 && e.co2PerYearKg > 0);
});
