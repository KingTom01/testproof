"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  COPY,
  EMPTY_REPORT,
  LANGUAGES,
  SAMPLES,
  type Language,
  type Report,
  type Severity,
} from "./i18n";

type Evidence = {
  id: string;
  name: string;
  size: number;
  url: string;
};

function cleanInline(value: string) {
  return value.trim().replace(/[\r\n]+/g, " ");
}

function createMarkdown(report: Report, evidence: Evidence[], language: Language) {
  const t = COPY[language];
  const steps = report.steps
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);
  const title = cleanInline(report.title) || t.markdown.untitled;

  return [
    `# ${title}`,
    "",
    `> **${t.markdown.severity}:** ${t.severityLabels[report.severity]}`,
    "",
    `## ${t.markdown.environment}`,
    report.environment.trim() || t.markdown.notProvided,
    "",
    `## ${t.markdown.steps}`,
    steps.length
      ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : t.markdown.noSteps,
    "",
    `## ${t.markdown.expected}`,
    report.expected.trim() || t.markdown.notProvided,
    "",
    `## ${t.markdown.actual}`,
    report.actual.trim() || t.markdown.notProvided,
    "",
    `## ${t.markdown.evidence}`,
    evidence.length
      ? evidence.map((item) => `- ${item.name}`).join("\n")
      : t.markdown.noEvidence,
    "",
    "---",
    t.markdown.generated,
  ].join("\n");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isLanguage(value: string | null): value is Language {
  return value === "zh-CN" || value === "zh-TW" || value === "en";
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh-CN");
  const [report, setReport] = useState<Report>(EMPTY_REPORT);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = COPY[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("testproof-language");
    if (isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  const markdown = useMemo(
    () => createMarkdown(report, evidence, language),
    [report, evidence, language],
  );
  const completed = [
    report.title,
    report.environment,
    report.steps,
    report.expected,
    report.actual,
  ].filter((value) => value.trim()).length;

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setNotice("");
    window.localStorage.setItem("testproof-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

  function updateField(field: keyof Report, value: string) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function addFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setNotice(t.invalidFiles);
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
    setNotice(t.filesAdded(images.length));
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
      setNotice(t.copied);
    } catch {
      setNotice(t.copyBlocked);
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    const safeName = (report.title || "testproof-report")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    link.href = URL.createObjectURL(blob);
    link.download = `${safeName || "testproof-report"}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(t.downloaded);
  }

  function resetReport() {
    evidence.forEach((item) => URL.revokeObjectURL(item.url));
    setEvidence([]);
    setReport(EMPTY_REPORT);
    setNotice(t.resetDone);
  }

  return (
    <main data-language={language}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label={t.home}>
          <span className="brand-mark">T<span aria-hidden="true">✓</span></span>
          <span>TestProof</span>
        </a>
        <div className="topbar-actions">
          <div className="language-switch" role="group" aria-label="Language / 语言">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={language === item.code ? "is-active" : ""}
                aria-pressed={language === item.code}
                aria-label={item.fullLabel}
                onClick={() => changeLanguage(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="privacy-note"><span className="status-dot" /> {t.privacy}</div>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.heroLine1}<br />{t.heroLine2}</h1>
          <p className="hero-copy">{t.heroCopy}</p>
        </div>
        <aside className="hero-card" aria-label={t.checklistLabel}>
          <span className="card-kicker">{t.checklistTitle}</span>
          {t.checklist.map((item, index) => (
            <div key={item}><b>0{index + 1}</b><span>{item}</span></div>
          ))}
        </aside>
      </section>

      <section className="workspace" aria-label={t.composeTitle}>
        <div className="builder-panel">
          <div className="panel-heading">
            <div>
              <p className="step-label">{t.composeStep}</p>
              <h2>{t.composeTitle}</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setReport(SAMPLES[language])}>
              {t.useExample}
            </button>
          </div>

          <div className="field-grid">
            <label className="field field-wide">
              <span>{t.bugSummary} <em>{t.required}</em></span>
              <input
                value={report.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder={t.bugPlaceholder}
              />
            </label>

            <label className="field severity-field">
              <span>{t.severity}</span>
              <select
                value={report.severity}
                onChange={(event) => updateField("severity", event.target.value as Severity)}
              >
                {(Object.keys(t.severityLabels) as Severity[]).map((severity) => (
                  <option key={severity} value={severity}>{t.severityLabels[severity]}</option>
                ))}
              </select>
            </label>

            <label className="field environment-field">
              <span>{t.environment}</span>
              <input
                value={report.environment}
                onChange={(event) => updateField("environment", event.target.value)}
                placeholder={t.environmentPlaceholder}
              />
            </label>

            <label className="field field-wide">
              <span>{t.steps} <em>{t.onePerLine}</em></span>
              <textarea
                value={report.steps}
                onChange={(event) => updateField("steps", event.target.value)}
                placeholder={t.stepsPlaceholder}
                rows={5}
              />
            </label>

            <label className="field result-field expected-field">
              <span>{t.expected}</span>
              <textarea
                value={report.expected}
                onChange={(event) => updateField("expected", event.target.value)}
                placeholder={t.expectedPlaceholder}
                rows={4}
              />
            </label>

            <label className="field result-field actual-field">
              <span>{t.actual}</span>
              <textarea
                value={report.actual}
                onChange={(event) => updateField("actual", event.target.value)}
                placeholder={t.actualPlaceholder}
                rows={4}
              />
            </label>
          </div>

          <div className="evidence-heading">
            <div>
              <p className="step-label">{t.attachStep}</p>
              <h3>{t.evidenceTitle}</h3>
            </div>
            <span>{t.fileCount(evidence.length)}</span>
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
            <span className="upload-mark" aria-hidden="true">+</span>
            <b>{t.dropTitle}</b>
            <small>{t.dropHelp}</small>
          </div>

          {evidence.length > 0 && (
            <div className="evidence-list" aria-label={t.attachedScreenshots}>
              {evidence.map((item, index) => (
                <article className="evidence-item" key={item.id}>
                  <img src={item.url} alt={t.evidenceAlt(index + 1, item.name)} />
                  <div className="evidence-meta">
                    <b><span>{String(index + 1).padStart(2, "0")}</span>{item.name}</b>
                    <small>{formatBytes(item.size)}</small>
                  </div>
                  <div className="evidence-actions">
                    <button type="button" onClick={() => moveEvidence(index, -1)} disabled={index === 0} aria-label={t.moveUp(item.name)}>↑</button>
                    <button type="button" onClick={() => moveEvidence(index, 1)} disabled={index === evidence.length - 1} aria-label={t.moveDown(item.name)}>↓</button>
                    <button className="remove-button" type="button" onClick={() => removeEvidence(item.id)} aria-label={t.remove(item.name)}>×</button>
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
                <p className="step-label">{t.exportStep}</p>
                <h2>{t.previewTitle}</h2>
              </div>
              <span className="completion">{t.complete(completed)}</span>
            </div>
            <div className="preview-window">
              <div className="window-bar"><span /><span /><span /><b>bug-report.md</b></div>
              <pre aria-label={t.previewLabel}>{markdown}</pre>
            </div>
            <div className="export-actions">
              <button className="primary-button" type="button" onClick={copyMarkdown}>{t.copy} <span aria-hidden="true">↗</span></button>
              <button className="secondary-button" type="button" onClick={downloadMarkdown}>{t.download}</button>
            </div>
            <button className="reset-button" type="button" onClick={resetReport}>{t.reset}</button>
            <p className="notice" aria-live="polite">{notice || t.ready}</p>
          </div>
        </aside>
      </section>

      <footer>
        <span>{t.footerProduct}</span>
        <span>{t.footerTagline}</span>
      </footer>
    </main>
  );
}
