/**
 * PRINT SUBSYSTEM — ISOLATED SAFE STYLESHEET
 *
 * This module exports a CSS string that is injected directly into the hidden
 * iframe used for printing and PDF generation. It is the ONLY stylesheet
 * loaded in that context — the parent application stylesheets are intentionally
 * excluded to avoid html2canvas crashing on modern CSS color functions
 * (oklch, oklab, lab, lch) that Tailwind v4 and shadcn/ui use internally.
 *
 * ─────────────────────────────────────────────────────────────
 * HTML2CANVAS COMPATIBILITY RULES
 * ─────────────────────────────────────────────────────────────
 * html2canvas (used by html2pdf.js) does NOT support:
 *   - oklch()   — Tailwind v4 default color space
 *   - oklab()   — Modern CSS color
 *   - lab()     — CSS Color Level 4
 *   - lch()     — CSS Color Level 4
 *
 * This file MUST use ONLY:
 *   - Hex colors   (#ffffff, #1e293b, …)
 *   - rgb()        (rgb(255, 255, 255))
 *   - rgba()       (rgba(0, 0, 0, 0.5))
 *
 * Do NOT reference any CSS custom properties (var(--something)) here.
 * Do NOT use any Tailwind theme tokens that resolve through CSS variables.
 * ─────────────────────────────────────────────────────────────
 *
 * HOW TO CUSTOMISE PRINT TEMPLATE STYLES
 * ─────────────────────────────────────────────────────────────
 * Edit ONLY this file. Changes here affect all print templates uniformly.
 * The templates (IntakeReceiptTemplate, SaleInvoiceTemplate, etc.) use the
 * CSS class names defined below — add new safe classes here as needed.
 */

export const printStyles = `

/* ── Reset & Base ─────────────────────────────────────────── */

* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #ffffff;
}

/* ── Print isolation wrapper ──────────────────────────────── */

.print-page {
  background: #ffffff;
  color: #1a1a1a;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  width: 100%;
  min-height: 100%;
}

/* ── Print container ──────────────────────────────────────── */

.print-container {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  color: #1a1a1a;
}

/* ── Watermark ────────────────────────────────────────────── */

.print-watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 5rem;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.03);
  text-transform: uppercase;
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.5rem;
  z-index: 0;
}

/* ── Page break rules ─────────────────────────────────────── */

.no-break {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

tr {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

thead {
  display: table-header-group !important;
}

/* ── Landscape mode ───────────────────────────────────────── */

.print-landscape {
  width: 100%;
}

/* ── Flexbox Utilities ────────────────────────────────────── */

.flex          { display: flex; }
.inline-block  { display: inline-block; }
.flex-wrap     { flex-wrap: wrap; }
.justify-between { justify-content: space-between; }
.justify-end   { justify-content: flex-end; }
.items-start   { align-items: flex-start; }
.items-center  { align-items: center; }
.gap-2         { gap: 0.5rem; }

/* ── Grid Utilities ───────────────────────────────────────── */

.grid          { display: grid; }
.grid-cols-2   { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3   { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4   { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.col-span-2    { grid-column: span 2 / span 2; }

/* ── Gap Utilities ────────────────────────────────────────── */

.gap-4         { gap: 1rem; }
.gap-6         { gap: 1.5rem; }
.gap-x-4       { column-gap: 1rem; }
.gap-y-1       { row-gap: 0.25rem; }
.gap-y-2       { row-gap: 0.5rem; }

/* ── Padding Utilities ────────────────────────────────────── */

.p-0           { padding: 0; }
.p-3           { padding: 0.75rem; }
.p-4           { padding: 1rem; }
.p-6           { padding: 1.5rem; }
.px-2          { padding-left: 0.5rem;  padding-right: 0.5rem; }
.px-3          { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4          { padding-left: 1rem;    padding-right: 1rem; }
.py-0\\.5      { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1          { padding-top: 0.25rem;  padding-bottom: 0.25rem; }
.py-1\\.5      { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.py-2          { padding-top: 0.5rem;   padding-bottom: 0.5rem; }
.py-2\\.5      { padding-top: 0.625rem; padding-bottom: 0.625rem; }
.py-3          { padding-top: 0.75rem;  padding-bottom: 0.75rem; }
.py-3\\.5      { padding-top: 0.875rem; padding-bottom: 0.875rem; }
.py-4          { padding-top: 1rem;     padding-bottom: 1rem; }
.pb-1          { padding-bottom: 0.25rem; }
.pb-4          { padding-bottom: 1rem; }
.pt-2          { padding-top: 0.5rem; }
.pt-4          { padding-top: 1rem; }
.pl-2          { padding-left: 0.5rem; }
.pl-4          { padding-left: 1rem; }
.pl-6          { padding-left: 1.5rem; }
.pr-4          { padding-right: 1rem; }

/* ── Margin Utilities ─────────────────────────────────────── */

.mb-1          { margin-bottom: 0.25rem; }
.mb-2          { margin-bottom: 0.5rem; }
.mb-3          { margin-bottom: 0.75rem; }
.mb-6          { margin-bottom: 1.5rem; }
.mt-0\\.5      { margin-top: 0.125rem; }
.mt-1          { margin-top: 0.25rem; }
.mt-1\\.5      { margin-top: 0.375rem; }
.mt-2          { margin-top: 0.5rem; }
.mt-8          { margin-top: 2rem; }

/* ── Space-y utilities ────────────────────────────────────── */

.space-y-1 > * + * { margin-top: 0.25rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-2\\.5 > * + * { margin-top: 0.625rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

/* ── Sizing ───────────────────────────────────────────────── */

.w-full        { width: 100%; }
.w-80          { width: 20rem; }
.max-w-sm      { max-width: 24rem; }
.min-h-\\[400px\\] { min-height: 400px; }
.max-w-\\[120px\\] { max-width: 120px; }

/* ── Overflow ─────────────────────────────────────────────── */

.overflow-hidden { overflow: hidden; }
.truncate        { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Position ─────────────────────────────────────────────── */

.relative      { position: relative; }
.z-10          { z-index: 10; }

/* ── Border & Rounding ────────────────────────────────────── */

.border         { border: 1px solid #e2e8f0; }
.border-b       { border-bottom: 1px solid #e2e8f0; }
.border-t       { border-top: 1px solid #e2e8f0; }
.border-l       { border-left: 1px solid #e2e8f0; }
.border-l-2     { border-left-width: 2px; border-left-style: solid; border-left-color: #e2e8f0; }
.border-r       { border-right: 1px solid #e2e8f0; }
.border-collapse { border-collapse: collapse; }
.rounded        { border-radius: 0.25rem; }
.rounded-lg     { border-radius: 0.5rem; }
.rounded-xl     { border-radius: 0.75rem; }
.rounded-full   { border-radius: 9999px; }

/* Specific border colors (safe hex only) */
.border-slate-200   { border-color: #e2e8f0; }
.border-slate-300   { border-color: #cbd5e1; }
.border-emerald-100 { border-color: #d1fae5; }
.border-emerald-200 { border-color: #a7f3d0; }
.border-rose-100    { border-color: #ffe4e6; }
.border-rose-200    { border-color: #fecdd3; }

/* ── Typography ───────────────────────────────────────────── */

.text-2xl      { font-size: 1.5rem;   line-height: 2rem; }
.text-lg       { font-size: 1.125rem; line-height: 1.75rem; }
.text-sm       { font-size: 0.875rem; line-height: 1.25rem; }
.text-xs       { font-size: 0.75rem;  line-height: 1rem; }

.font-black    { font-weight: 900; }
.font-bold     { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium   { font-weight: 500; }
.font-mono     { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.italic        { font-style: italic; }

.text-right    { text-align: right; }
.text-center   { text-align: center; }
.uppercase     { text-transform: uppercase; }

.tracking-tight   { letter-spacing: -0.025em; }
.tracking-wider   { letter-spacing: 0.05em; }
.tracking-widest  { letter-spacing: 0.1em; }
.leading-relaxed  { line-height: 1.625; }
.opacity-85       { opacity: 0.85; }
.opacity-70       { opacity: 0.70; }

/* Arbitrary text sizes (Tailwind JIT-style — resolved by class name) */
[class*="text-["] { font-size: inherit; }

/* ── Slate colours (safe hex) ─────────────────────────────── */

.text-slate-900  { color: #0f172a; }
.text-slate-800  { color: #1e293b; }
.text-slate-700  { color: #334155; }
.text-slate-600  { color: #475569; }
.text-slate-500  { color: #64748b; }
.text-slate-400  { color: #94a3b8; }

.bg-slate-100    { background-color: #f1f5f9; }
.bg-slate-50     { background-color: #f8fafc; }

/* ── Emerald (safe hex) ───────────────────────────────────── */

.text-emerald-950 { color: #022c22; }
.text-emerald-800 { color: #065f46; }
.text-emerald-700 { color: #047857; }
.text-emerald-600 { color: #059669; }
.bg-emerald-50    { background-color: #ecfdf5; }
.bg-emerald-100   { background-color: #d1fae5; }

/* ── Rose (safe hex) ──────────────────────────────────────── */

.text-rose-950   { color: #450a0a; }
.text-rose-800   { color: #9f1239; }
.text-rose-700   { color: #be123c; }
.text-rose-600   { color: #e11d48; }
.bg-rose-50      { background-color: #fff1f2; }

/* ── Print-safe primary colour aliases ────────────────────── */
/* These replace text-primary / border-primary/20 which resolve */
/* through CSS variables and crash html2canvas.                  */

.print-text-primary   { color: #1d4ed8; }
.print-border-primary { border-color: rgba(29, 78, 216, 0.2); }

/* ── Divide utilities ─────────────────────────────────────── */

.divide-rose-100\\/50 > * + * { border-top: 1px solid rgba(254, 228, 230, 0.5); }

/* ── Transparency background helpers ──────────────────────── */

.bg-slate-50\\/50  { background-color: rgba(248, 250, 252, 0.5); }
.bg-slate-50\\/30  { background-color: rgba(248, 250, 252, 0.3); }
.bg-slate-50\\/20  { background-color: rgba(248, 250, 252, 0.2); }
.bg-slate-50\\/10  { background-color: rgba(248, 250, 252, 0.1); }
.bg-emerald-50\\/10 { background-color: rgba(236, 253, 245, 0.1); }
.bg-emerald-50\\/5  { background-color: rgba(236, 253, 245, 0.05); }
.bg-rose-50\\/30    { background-color: rgba(255, 241, 242, 0.3); }

/* Hover background (no interactivity in print, but html2canvas captures the class) */
.hover\\:bg-slate-50:hover { background-color: #f8fafc; }

/* ── @media print overrides ───────────────────────────────── */

@media print {
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  .hide-on-print {
    display: none !important;
  }
}
`;
