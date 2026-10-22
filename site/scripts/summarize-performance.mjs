import fs from "node:fs";
import assert from "node:assert/strict";

const report = JSON.parse(fs.readFileSync("artifacts/performance/browser.json", "utf8"));
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const rows = [];
for (const target of report.targets) {
  for (const route of [...new Set(report.samples.map((s) => s.route))]) {
    const samples = report.samples.filter((s) => s.target === target.name && s.route === route);
    assert(samples.length >= 3, `${target.name}${route}: incomplete measurements`);
    const values = (key, p = 0.75) => percentile(samples.map((s) => s[key]), p);
    rows.push({ target: target.name, route, samples: samples.length,
      lcpP75Ms: values("lcpMs"), fcpP75Ms: values("fcpMs"), clsP75: values("cls"),
      readyP75Ms: values("readyMs"), jsMedianBytes: values("jsBytes", 0.5), transferMedianBytes: values("transferBytes", 0.5),
    });
  }
}
const journeys = report.targets.map((target) => {
  const samples = report.journeys.filter((s) => s.target === target.name);
  return { target: target.name, samples: samples.length, totalP75Ms: percentile(samples.map((s) => s.totalMs), 0.75) };
});
const result = { generatedAt: report.generatedAt, revision: report.revision, conditions: report.conditions, rows, journeys, limitations: report.limitations };
fs.writeFileSync("artifacts/performance/summary.json", JSON.stringify(result, null, 2) + "\n");
let text = "| Route | Build | p75 LCP (ms) | p75 content ready (ms) | p75 CLS | Median JS bytes |\n|---|---|---:|---:|---:|---:|\n";
for (const r of rows) text += `| ${r.route} | ${r.target} | ${Math.round(r.lcpP75Ms)} | ${Math.round(r.readyP75Ms)} | ${r.clsP75.toFixed(3)} | ${Math.round(r.jsMedianBytes)} |\n`;
fs.writeFileSync("artifacts/performance/summary.md", text);
console.log(text);
// The budgets gate the static build, independently of whether a baseline was supplied.
// These are lab budgets, not field Core Web Vitals or claims about all users.
for (const row of rows.filter((r) => r.target === "static")) {
  assert(row.lcpP75Ms < 2500, `${row.route}: p75 LCP exceeds 2.5s`);
  assert(row.fcpP75Ms < 1800, `${row.route}: p75 FCP exceeds 1.8s`);
  assert(row.clsP75 <= 0.1, `${row.route}: p75 CLS exceeds 0.1`);
  assert(row.readyP75Ms < 3000, `${row.route}: p75 real content readiness exceeds 3s`);
}
