"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type Evidence = {
  id: string;
  name: string;
  size: number;
  url: string;
};

type Report = {
  title: string;
  severity: string;
  environment: string;
  steps: string;
  expected: string;
  actual: string;
};

const EMPTY_REPORT: Report = {
  title: "",
  severity: "Medium",
  environment: "",
  steps: "",
  expected: "",
  actual: "",
};

const SAMPLE_REPORT: Report = {
  title: "Login button remains disabled with valid credentials",
  severity: "High",
  environment: "Chrome 140 · Windows 11 · UAT build 1.2.0",
  steps:
    "Open the login page\nEnter a valid email address\nEnter the correct password\nSelect Login",
  expected: "The user is authenticated and redirected to the dashboard.",
  actual: "The Login button remains disabled and no validation message appears.",
};

function cleanInline(value: string) {
  return value.trim().replace(/[\r\n]+/g, " ");
}

function createMarkdown(report: Report, evidence: Evidence[]) {
  const steps = report.steps
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);
  const title = cleanInline(report.title) || "Untitled bug report";

  return [
    `# ${title}`,
    "",
    `> **Severity:** ${report.severity}`,
    "",
    "## Environment",
    report.environment.trim() || "_Not provided_",
    "",
    "## Steps to reproduce",
    steps.length
      ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : "_No reproduction steps provided_",
    "",
    "## Expected result",
    report.expected.trim() || "_Not provided_",
    "",
    "## Actual result",
    report.actual.trim() || "_Not provided_",
    "",
    "## Evidence",
    evidence.length
      ? evidence.map((item) => `- ${item.name}`).join("\n")
      : "_No screenshots attached_",
    "",
    "---",
    "Generated locally with TestProof.",
  ].join("\n");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
  const [report, setReport] = useState<Report>(EMPTY_REPORT);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markdown = useMemo(() => createMarkdown(report, evidence), [report, evidence]);
  const completed = [
    report.title,
    report.environment,
    report.steps,
    report.expected,
    report.actual,
  ].filter((value) => value.trim()).length;

  function updateField(field: keyof Report, value: string) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function addFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setNotice("Choose PNG, JPG, GIF, or WebP screenshots.");
      return;
    }
    setEvidence((current) => [
      ...current,
      ...images.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      })),
    ]);
    setNotice(`${images.length} screenshot${images.length > 1 ? "s" : ""} added locally.`);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeEvidence(id: string) {
    setEvidence((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((entry) => entry.id !== id);
    });
  }

  function moveEvidence(index: number, direction: -1 | 1) {
    setEvidence((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("Markdown copied. Paste it into your issue tracker.");
    } catch {
      setNotice("Copy was blocked. Select the preview text and copy it manually.");
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    const safeName = (report.title || "testproof-report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    link.href = URL.createObjectURL(blob);
    link.download = `${safeName || "testproof-report"}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice("Markdown report downloaded.");
  }

  function resetReport() {
    evidence.forEach((item) => URL.revokeObjectURL(item.url));
    setEvidence([]);
    setReport(EMPTY_REPORT);
    setNotice("Started a fresh report.");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="TestProof home">
          <span className="brand-mark">T<span>✓</span></span>
          <span>TestProof</span>
        </a>
        <div className="privacy-note"><span className="status-dot" /> Your evidence stays on this device</div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Privacy-first QA evidence</p>
          <h1>Bug reports people<br />can reproduce.</h1>
          <p className="hero-copy">
            Turn test steps and screenshots into a clean, developer-ready report.
            No account. No upload. No guesswork.
          </p>
        </div>
        <aside className="hero-card" aria-label="Report quality checklist">
          <span className="card-kicker">A useful report has</span>
          <div><b>01</b><span>Clear reproduction steps</span></div>
          <div><b>02</b><span>Expected vs. actual</span></div>
          <div><b>03</b><span>Ordered visual evidence</span></div>
        </aside>
      </section>

      <section className="workspace" aria-label="Bug report builder">
        <div className="builder-panel">
          <div className="panel-heading">
            <div>
              <p className="step-label">01 / Compose</p>
              <h2>Build the evidence</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setReport(SAMPLE_REPORT)}>
              Use example
            </button>
          </div>

          <div className="field-grid">
            <label className="field field-wide">
              <span>Bug summary <em>Required</em></span>
              <input
                value={report.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="What failed, and under what condition?"
              />
            </label>

            <label className="field severity-field">
              <span>Severity</span>
              <select value={report.severity} onChange={(event) => updateField("severity", event.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>

            <label className="field environment-field">
              <span>Environment</span>
              <input
                value={report.environment}
                onChange={(event) => updateField("environment", event.target.value)}
                placeholder="Browser · OS · build"
              />
            </label>

            <label className="field field-wide">
              <span>Steps to reproduce <em>One step per line</em></span>
              <textarea
                value={report.steps}
                onChange={(event) => updateField("steps", event.target.value)}
                placeholder={"Open the login page\nEnter valid credentials\nSelect Login"}
                rows={5}
              />
            </label>

            <label className="field result-field expected-field">
              <span>Expected result</span>
              <textarea
                value={report.expected}
                onChange={(event) => updateField("expected", event.target.value)}
                placeholder="What should have happened?"
                rows={4}
              />
            </label>

            <label className="field result-field actual-field">
              <span>Actual result</span>
              <textarea
                value={report.actual}
                onChange={(event) => updateField("actual", event.target.value)}
                placeholder="What happened instead?"
                rows={4}
              />
            </label>
          </div>

          <div className="evidence-heading">
            <div>
              <p className="step-label">02 / Attach</p>
              <h3>Visual evidence</h3>
            </div>
            <span>{evidence.length} file{evidence.length === 1 ? "" : "s"}</span>
          </div>

          <div
            className={`dropzone ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} />
            <span className="upload-mark">＋</span>
            <b>Drop screenshots here</b>
            <small>or choose images · processed only in your browser</small>
          </div>

          {evidence.length > 0 && (
            <div className="evidence-list" aria-label="Attached screenshots">
              {evidence.map((item, index) => (
                <article className="evidence-item" key={item.id}>
                  <img src={item.url} alt={`Evidence ${index + 1}: ${item.name}`} />
                  <div className="evidence-meta">
                    <b><span>{String(index + 1).padStart(2, "0")}</span>{item.name}</b>
                    <small>{formatBytes(item.size)}</small>
                  </div>
                  <div className="evidence-actions">
                    <button type="button" onClick={() => moveEvidence(index, -1)} disabled={index === 0} aria-label={`Move ${item.name} up`}>↑</button>
                    <button type="button" onClick={() => moveEvidence(index, 1)} disabled={index === evidence.length - 1} aria-label={`Move ${item.name} down`}>↓</button>
                    <button className="remove-button" type="button" onClick={() => removeEvidence(item.id)} aria-label={`Remove ${item.name}`}>×</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="preview-panel">
          <div className="preview-sticky">
            <div className="panel-heading preview-heading">
              <div>
                <p className="step-label">03 / Export</p>
                <h2>Markdown preview</h2>
              </div>
              <span className="completion">{completed}/5 complete</span>
            </div>
            <div className="preview-window">
              <div className="window-bar"><span /><span /><span /><b>bug-report.md</b></div>
              <pre aria-label="Generated Markdown preview">{markdown}</pre>
            </div>
            <div className="export-actions">
              <button className="primary-button" type="button" onClick={copyMarkdown}>Copy Markdown <span>↗</span></button>
              <button className="secondary-button" type="button" onClick={downloadMarkdown}>Download .md</button>
            </div>
            <button className="reset-button" type="button" onClick={resetReport}>Clear report and start again</button>
            <p className="notice" aria-live="polite">{notice || "Ready when your evidence is."}</p>
          </div>
        </aside>
      </section>

      <footer>
        <span>TestProof · Open source QA utility</span>
        <span>Local by design. Useful by default.</span>
      </footer>
    </main>
  );
}
