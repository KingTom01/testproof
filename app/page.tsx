"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  COPY,
  EMPTY_REPORT,
  JIRA_COPY,
  LANGUAGES,
  SAMPLES,
  type DefectType,
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
  const j = JIRA_COPY[language];
  const steps = report.steps
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);
  const title = cleanInline(report.title) || t.markdown.untitled;

  return [
    `# ${title}`,
    "",
    `| ${j.defectType} | ${j.defectTypes[report.defectType]} |`,
    `| --- | --- |`,
    `| ${j.identifiedEnvironment} | ${report.identifiedEnvironment || j.notProvided} |`,
    `| ${t.markdown.severity} | ${t.severityLabels[report.severity]} |`,
    "",
    `## ${j.description}`,
    report.description.trim() || t.markdown.notProvided,
    "",
    `## ${j.environmentDetails}`,
    `| ${j.operatingSystem} | ${report.operatingSystem || j.notProvided} |`,
    `| --- | --- |`,
    `| ${j.deviceModel} | ${report.deviceModel || j.notProvided} |`,
    `| ${j.pageTested} | ${report.pageTested || j.notProvided} |`,
    `| ${j.languagesTested} | ${report.languagesTested || j.notProvided} |`,
    `| ${j.browserVersion} | ${report.browserVersion || j.notProvided} |`,
    `| ${j.role} | ${report.role || j.notProvided} |`,
    "",
    `## ${j.preconditions}`,
    report.preconditions.trim() || t.markdown.notProvided,
    "",
    `## ${j.journey}`,
    steps.length
      ? steps.map((step, index) => `**Step ${index + 1}:** ${step}`).join("\n\n")
      : t.markdown.noSteps,
    "",
    `## ${j.actual}`,
    report.actual.trim() || t.markdown.notProvided,
    "",
    `## ${j.expected}`,
    report.expected.trim() || t.markdown.notProvided,
    "",
    `## ${j.impact}`,
    report.impact.trim() || t.markdown.notProvided,
    "",
    `## ${j.developerChecking}`,
    report.developerChecking.trim() || t.markdown.notProvided,
    "",
    `## ${j.remark}`,
    report.remark.trim() || t.markdown.notProvided,
    "",
    `## ${j.evidence}`,
    evidence.length
      ? evidence.map((item) => `- ${item.name}`).join("\n")
      : t.markdown.noEvidence,
    "",
    "---",
    j.generated,
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
  const j = JIRA_COPY[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("testproof-language");
    if (isLanguage(savedLanguage)) {
      const timer = window.setTimeout(() => setLanguage(savedLanguage), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const markdown = useMemo(
    () => createMarkdown(report, evidence, language),
    [report, evidence, language],
  );
  const completed = [
    report.title,
    report.description,
    report.operatingSystem,
    report.steps,
    report.expected,
    report.actual,
  ].filter((value) => value.trim()).length;
  const stepLines = report.steps.split("\n").map((item) => item.trim()).filter(Boolean);
  const environmentRows: Array<[string, string]> = [
    [j.operatingSystem, report.operatingSystem], [j.deviceModel, report.deviceModel],
    [j.pageTested, report.pageTested], [j.languagesTested, report.languagesTested],
    [j.browserVersion, report.browserVersion], [j.role, report.role],
  ];

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setNotice("");
    window.localStorage.setItem("testproof-language", nextLanguage);
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
      .replace(/[<>:"/\\|?*]+/g, "-")
      .split("")
      .filter((character) => character.charCodeAt(0) > 31)
      .join("")
      .replace(/\s+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    link.href = URL.createObjectURL(blob);
    link.download = `${safeName || "testproof-report"}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(t.downloaded);
  }

  function printReport() {
    window.print();
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

            <div className="form-section-title field-wide">{j.basic}</div>
            <label className="field"><span>{j.defectType}</span><select value={report.defectType} onChange={(event) => updateField("defectType", event.target.value as DefectType)}>{(Object.keys(j.defectTypes) as DefectType[]).map((item) => <option key={item} value={item}>{j.defectTypes[item]}</option>)}</select></label>
            <label className="field"><span>{j.identifiedEnvironment}</span><select value={report.identifiedEnvironment} onChange={(event) => updateField("identifiedEnvironment", event.target.value)}><option>DEV</option><option>SIT</option><option>UAT</option><option>PROD</option></select></label>
            <label className="field field-wide"><span>{t.severity}</span><select value={report.severity} onChange={(event) => updateField("severity", event.target.value as Severity)}>{(Object.keys(t.severityLabels) as Severity[]).map((severity) => <option key={severity} value={severity}>{t.severityLabels[severity]}</option>)}</select></label>

            <div className="form-section-title field-wide">{j.description}</div>
            <label className="field field-wide"><span>{j.description}</span><textarea value={report.description} onChange={(event) => updateField("description", event.target.value)} placeholder={j.descriptionPlaceholder} rows={4} /></label>
            <label className="field field-wide"><span>{j.preconditions}</span><textarea value={report.preconditions} onChange={(event) => updateField("preconditions", event.target.value)} placeholder={j.preconditionsPlaceholder} rows={3} /></label>

            <div className="form-section-title field-wide">{j.environmentDetails}</div>
            {([
              ["operatingSystem", j.operatingSystem], ["deviceModel", j.deviceModel], ["pageTested", j.pageTested],
              ["languagesTested", j.languagesTested], ["browserVersion", j.browserVersion], ["role", j.role],
            ] as Array<[keyof Report, string]>).map(([field, label]) => <label className="field" key={field}><span>{label}</span><input value={report[field]} onChange={(event) => updateField(field, event.target.value)} /></label>)}

            <div className="form-section-title field-wide">{j.journey}</div>
            <label className="field field-wide"><span>{t.steps} <em>{t.onePerLine}</em></span><textarea value={report.steps} onChange={(event) => updateField("steps", event.target.value)} placeholder={t.stepsPlaceholder} rows={6} /></label>
            <label className="field result-field actual-field"><span>{j.actual}</span><textarea value={report.actual} onChange={(event) => updateField("actual", event.target.value)} placeholder={t.actualPlaceholder} rows={4} /></label>
            <label className="field result-field expected-field"><span>{j.expected}</span><textarea value={report.expected} onChange={(event) => updateField("expected", event.target.value)} placeholder={t.expectedPlaceholder} rows={4} /></label>
            <label className="field field-wide"><span>{j.impact}</span><textarea value={report.impact} onChange={(event) => updateField("impact", event.target.value)} placeholder={j.impactPlaceholder} rows={3} /></label>
            <label className="field field-wide"><span>{j.developerChecking}</span><textarea value={report.developerChecking} onChange={(event) => updateField("developerChecking", event.target.value)} placeholder={j.developerPlaceholder} rows={3} /></label>
            <label className="field field-wide"><span>{j.remark}</span><textarea value={report.remark} onChange={(event) => updateField("remark", event.target.value)} placeholder={j.remarkPlaceholder} rows={3} /></label>
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
                <h2>{j.preview}</h2>
              </div>
              <span className="completion">{t.complete(completed)}</span>
            </div>
            <article className="jira-report" aria-label={t.previewLabel}>
              <div className="jira-report-topline"><span>{j.draft}</span><b>TestProof</b></div>
              <h3>{cleanInline(report.title) || t.markdown.untitled}</h3>
              <div className="jira-meta-grid">
                <div><small>{j.defectType}</small><b>{j.defectTypes[report.defectType]}</b></div>
                <div><small>{j.identifiedEnvironment}</small><b>{report.identifiedEnvironment}</b></div>
                <div><small>{t.severity}</small><b className={`severity-pill severity-${report.severity}`}>{t.severityLabels[report.severity]}</b></div>
              </div>

              <section><h4 className="jira-heading description-heading">ⓘ {j.description}</h4><p>{report.description || j.notProvided}</p></section>
              <section><h4 className="jira-heading environment-heading">▣ {j.environmentDetails}</h4><table><tbody>{environmentRows.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value || j.notProvided}</td></tr>)}</tbody></table></section>
              <section><h4 className="jira-heading neutral-heading">◆ {j.preconditions}</h4><p>{report.preconditions || j.notProvided}</p></section>
              <section><h4 className="jira-heading neutral-heading">↳ {j.journey}</h4><div className="jira-steps">{stepLines.length ? stepLines.map((step, index) => <p key={`${step}-${index}`}><b>{j.step} {index + 1}:</b> {step}</p>) : <p>{t.markdown.noSteps}</p>}</div></section>
              <section><h4 className="jira-heading actual-heading">✕ {j.actual}</h4><p>{report.actual || j.notProvided}</p></section>
              <section><h4 className="jira-heading expected-heading">● {j.expected}</h4><p>{report.expected || j.notProvided}</p></section>
              <section><h4 className="jira-heading neutral-heading">◈ {j.impact}</h4><p>{report.impact || j.notProvided}</p></section>
              <section><h4 className="jira-heading neutral-heading">⌕ {j.developerChecking}</h4><p>{report.developerChecking || j.notProvided}</p></section>
              <section><h4 className="jira-heading neutral-heading">✎ {j.remark}</h4><p>{report.remark || j.notProvided}</p></section>
              <section><h4 className="jira-heading evidence-heading-bar">▧ {j.evidence}</h4>{evidence.length ? <div className="jira-evidence">{evidence.map((item, index) => <figure key={item.id}><img src={item.url} alt={t.evidenceAlt(index + 1, item.name)} /><figcaption>{index + 1}. {item.name}</figcaption></figure>)}</div> : <p>{j.noEvidence}</p>}</section>
              <div className="jira-footer">{j.generated}</div>
            </article>
            <div className="export-actions">
              <button className="primary-button" type="button" onClick={copyMarkdown}>{t.copy} <span aria-hidden="true">↗</span></button>
              <button className="secondary-button" type="button" onClick={downloadMarkdown}>{t.download}</button>
              <button className="secondary-button print-button" type="button" onClick={printReport}>{j.printPdf}</button>
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
