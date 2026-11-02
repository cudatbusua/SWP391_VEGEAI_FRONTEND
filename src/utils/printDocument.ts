/**
 * Prints a self-contained HTML document through a hidden iframe. The browser print dialog lets the
 * user pick "Save as PDF", which keeps Vietnamese diacritics correct without bundling a PDF font.
 */
export function printHtml(title: string, bodyHtml: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.dataset.printTitle = title;
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 28px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #065f46; }
    h2 { font-size: 15px; margin: 18px 0 6px; color: #065f46; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #ecfdf5; color: #065f46; }
    .right { text-align: right; white-space: nowrap; }
    .muted { color: #6b7280; }
    .day { margin-bottom: 16px; }
    .badge { display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 999px; padding: 1px 8px; font-size: 11px; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    li { margin: 2px 0; }
    footer { margin-top: 22px; font-size: 11px; color: #9ca3af; }
    @media print { body { margin: 12mm; } h2 { break-after: avoid; } table { break-inside: auto; } tr { break-inside: avoid; } }
  </style></head><body>${bodyHtml}
  <footer>Xuất từ VEGEAI — ${new Date().toLocaleString('vi-VN')}</footer></body></html>`);
  doc.close();

  const close = () => window.setTimeout(() => frame.remove(), 500);
  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    frame.contentWindow?.addEventListener('afterprint', close, { once: true });
    window.setTimeout(() => { if (document.body.contains(frame)) frame.remove(); }, 120_000);
  };
  if (doc.readyState === 'complete') window.setTimeout(run, 120);
  else frame.addEventListener('load', () => window.setTimeout(run, 120), { once: true });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const formatNumber = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) : '—';
