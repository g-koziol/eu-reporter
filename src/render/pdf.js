import { DEFAULT_WORK_FROM, DEFAULT_WORK_TO, DEFAULT_TARGET_HOURS, esc as appEsc } from '../config/defaults.js';
import { actionMinutes, fmtMin, iso, monthGrid } from '../utils/time.js';

function defaultEsc(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function buildPdfReportHtml(context) {
  const {
    currentMonth,
    getEffectiveConfig,
    getSelectedProfile,
    getSelectedProject,
    getLabels,
    ensureDay,
    getMonthTargetHours,
    formatPdfDate,
    esc = defaultEsc,
    monthGridFn = monthGrid,
    isoFn = iso
  } = context;

  const cfg = getEffectiveConfig();
  const profile = getSelectedProfile();
  const project = getSelectedProject();
  const labels = getLabels();
  const monthDays = monthGridFn(currentMonth).filter((dateObj) => {
    const [year, month] = currentMonth.split('-').map(Number);
    return dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
  });
  const allDays = monthDays.map((dateObj) => {
    const key = isoFn(dateObj);
    const day = ensureDay(key);
    return { key, day, dateObj };
  });
  const totalMinutes = allDays.reduce((sum, entry) => sum + (entry.day.actions || []).reduce((daySum, action) => daySum + actionMinutes(action), 0), 0);
  const totalActions = allDays.reduce((sum, entry) => sum + (entry.day.actions || []).length, 0);
  const holidayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const daysHtml = allDays.map(({ key, day, dateObj }) => {
    const actions = day.actions || [];
    const attributes = (cfg.dayFields || []).filter((field) => !['area', 'nextPlan', 'risks', 'notes'].includes(field.id));
    const dayFields = attributes.map((field) => {
      const value = day.extra && Object.prototype.hasOwnProperty.call(day.extra, field.id) ? day.extra[field.id] : (day[field.id] || '');
      return value ? `<div class="pdf-row"><div class="pdf-row-label">${esc(field.label || field.id)}</div><div>${esc(String(value))}</div></div>` : '';
    }).join('');

    const actionTable = actions.length ? `
      <table class="pdf-actions-table">
        <thead>
          <tr>
            <th>Typ</th>
            <th>Od</th>
            <th>Do</th>
            <th>Opis</th>
            <th>Uwagi</th>
            <th>Czas</th>
          </tr>
        </thead>
        <tbody>
          ${actions.map((action) => {
            const namedType = (cfg.workTypes || []).find((item) => item.id === action.workType) || (cfg.workTypes || [])[0] || { name: '-' };
            const attrValues = Object.entries(action.attrs || {}).map(([key, value]) => {
              const attr = (cfg.workTypes || []).flatMap((type) => type.attributes || []).find((item) => item.id === key);
              if (!value || !attr) return '';
              return `${esc(attr.label || attr.name || key)}: ${esc(String(value))}`;
            }).filter(Boolean).join('<br>');
            return `
              <tr>
                <td>${esc(namedType.name || '-')}</td>
                <td>${esc(action.from || '-')}</td>
                <td>${esc(action.to || '-')}</td>
                <td>${esc(action.description || '-')}</td>
                <td>${esc(action.notes || '') || (attrValues ? `<div>${attrValues}</div>` : '-')}</td>
                <td>${fmtMin(actionMinutes(action))}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '<div class="pdf-empty">Brak działań.</div>';

    const rows = [
      day.workFrom && day.workTo ? { label: 'Zakres dnia', value: `${day.workFrom} - ${day.workTo}` } : null,
      day.area ? { label: 'Obszar działania', value: day.area } : null,
      day.nextPlan ? { label: 'Plan dalszych działań', value: day.nextPlan } : null,
      day.risks ? { label: 'Trudności / ryzyka', value: day.risks } : null,
      day.notes ? { label: 'Uwagi do dnia', value: day.notes } : null,
      ...attributes.map((field) => {
        const value = day.extra && Object.prototype.hasOwnProperty.call(day.extra, field.id) ? day.extra[field.id] : (day[field.id] || '');
        return value ? { label: field.label || field.id, value } : null;
      })
    ].filter(Boolean);

    const fieldsHtml = rows.map((row) => `
      <div class="pdf-row">
        <div class="pdf-row-label">${esc(row.label)}</div>
        <div>${esc(String(row.value))}</div>
      </div>
    `).join('') || '<div class="pdf-empty">Brak wpisów do dnia.</div>';

    return `
      <section class="pdf-day">
        <h3>${holidayNames[(dateObj.getDay() + 6) % 7]} ${formatPdfDate ? formatPdfDate(key) : key}</h3>
        ${fieldsHtml}
        ${dayFields}
        ${actionTable}
      </section>
    `;
  }).join('');

  return `
    <div class="pdf-report">
      <div class="pdf-report-header">
        <h1 class="pdf-report-title">${esc(labels.title || 'Ewidencja działań projektowych')}</h1>
        <div class="pdf-report-meta">
          <span>Miesiąc: ${esc(currentMonth)}</span>
          <span>Profil: ${esc(profile ? profile.name : '-')}</span>
          <span>Projekt: ${esc(project ? project.name : '-')}</span>
        </div>
      </div>
      <div class="pdf-summary">
        <div class="pdf-summary-item"><strong>Wypracowano</strong><span>${fmtMin(totalMinutes)}</span></div>
        <div class="pdf-summary-item"><strong>Liczba działań</strong><span>${totalActions}</span></div>
        <div class="pdf-summary-item"><strong>Cel miesięczny</strong><span>${getMonthTargetHours()} h</span></div>
      </div>
      ${daysHtml}
    </div>
  `;
}

export function exportMonthPdf(context) {
  const reportHtml = buildPdfReportHtml(context);
  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    alert('Przeglądarka zablokowała okno PDF. Zezwól na wyskakujące okna i spróbuj ponownie.');
    return;
  }

  const doc = printWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport ${context.currentMonth}</title>
    <style>
      body { margin: 18px; font-family: Arial, sans-serif; color: #111827; background: #fff; }
      .pdf-report { color: #111827; }
      .pdf-report-header { border-bottom: 2px solid #dbe1ea; padding-bottom: 16px; margin-bottom: 18px; }
      .pdf-report-title { font-size: 28px; margin: 0 0 6px; }
      .pdf-report-meta { color: #4b5563; display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; }
      .pdf-summary { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 12px; margin-bottom: 18px; }
      .pdf-summary-item { background: #f8fafc; border: 1px solid #dbe1ea; border-radius: 10px; padding: 10px 12px; }
      .pdf-summary-item strong { display: block; font-size: 12px; color: #475569; margin-bottom: 4px; }
      .pdf-summary-item span { font-size: 20px; font-weight: 700; }
      .pdf-day { border: 1px solid #dbe1ea; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
      .pdf-day h3 { margin: 0 0 10px; font-size: 18px; }
      .pdf-row { display: grid; grid-template-columns: 160px 1fr; gap: 8px; margin-bottom: 8px; }
      .pdf-row-label { font-weight: 700; color: #374151; }
      .pdf-actions-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      .pdf-actions-table th, .pdf-actions-table td { border: 1px solid #dbe1ea; padding: 6px 8px; text-align: left; vertical-align: top; }
      .pdf-actions-table th { background: #f8fafc; }
      .pdf-empty { color: #6b7280; font-style: italic; }
      @media print { body { margin: 0; } .pdf-day { break-inside: avoid; page-break-inside: avoid; } }
    </style>
  </head><body>${reportHtml}</body></html>`);
  doc.close();
  printWindow.focus();
}
