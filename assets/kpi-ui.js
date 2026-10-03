/* iQMS — Objectives & KPIs (Update 19): actions and dialogs.
 * Record Result (fast path) · result traceability drawer · Collect Data (manual grid, Excel/CSV import,
 * survey, internal QMS data, integration) · collection cycles · KPI definition editor. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const K = Q.K;
  const rr = () => Q.render({ noFocus: true, keepScroll: true });
  const kOf = d => K.kpi(d.kpi || d.id);
  const opt = (list, sel) => list.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
  const usesFraction = k => ['percentage', 'weighted', 'ratio'].includes(k.aggregation) || !!k.numLabel;
  const dimsOf = k => (k.dims && k.dims.length ? k.dims : ['subject']);
  const dimLabel = d => K.DIMS[d] || 'Subject';
  const pctOrVal = (k, v) => K.fmt(v, k);
  const canReview = (k, r) => [k.reviewer, 'maria'].includes(Q.me()) && r.status === 'For Review';
  const done = (title, msg) => { Q.save(); Q.closeAllModals(); rr(); Q.toast(title, msg); };

  /* ============================================================ status preview */
  const preview = (k, v, period) => {
    const prev = K.approved(k).find(r => r.period !== period);
    if (v == null || v === '' || isNaN(v)) return `<div class="kp-prev muted small">Enter a result to see how it compares with the target.</div>`;
    const diff = prev ? Math.round((v - prev.value) * 10) / 10 : null;
    return `<div class="kp-prev"><div class="kp-prev-row"><span>Result</span><b class="tnum">${pctOrVal(k, v)}</b></div><div class="kp-prev-row"><span>Target</span><b class="tnum">${esc(K.targetText(k))}</b></div>
      <div class="kp-prev-row"><span>Status</span>${K.statusBadge(k, Number(v))}</div>${prev ? `<div class="kp-prev-row"><span>vs ${esc(prev.period)}</span><b class="tnum ${diff === 0 ? '' : (K.ok(k, v) === K.ok(k, prev.value) ? '' : '')}">${diff > 0 ? '+' : ''}${diff}${esc(k.unit || '')}</b></div>` : ''}</div>`;
  };

  /* ============================================================ Record Result (fast path) */
  K.recordResult = (k, { period } = {}) => {
    const prev = K.latest(k), periods = K.periodOptions(k), p0 = period || periods[0];
    const m = Q.openModal({ size: 'l', title: 'Record KPI Result', sub: `${esc(k.id)} · ${esc(k.name)} · target ${esc(K.targetText(k))}`,
      body: `<form class="modal-body kp-record"><div class="kp-record-grid"><div>
        <div class="form-grid">
          <label class="field"><span>Period <span class="req">*</span></span><input class="input" name="period" required list="kpPeriods" value="${esc(p0)}"><datalist id="kpPeriods">${periods.map(p => `<option value="${esc(p)}">`).join('')}</datalist><span class="help">${esc(k.frequency)} KPI</span></label>
          <label class="field"><span>Result <span class="req">*</span></span><span class="kp-input-unit"><input class="input tnum" type="number" step="any" name="value" required autofocus placeholder="e.g. 87">${k.unit ? `<i>${esc(k.unit)}</i>` : ''}</span></label>
          <label class="field"><span>Source</span><select class="select" name="type">${opt(K.SOURCES.slice(1), k.sourceSystem || 'Excel / Spreadsheet')}</select></label>
          <label class="field"><span>Source system</span><input class="input" name="system" placeholder="e.g. Excel, CRM, HRIS, Finance" value="${esc(k.sourceSystemName || '')}"></label>
          <label class="field full"><span>Source reference</span><input class="input" name="ref" placeholder="e.g. Q3 Customer Satisfaction Report" value="${esc(k.sourceRef ? `${k.sourceRef} — ` : '')}"></label>
          <label class="field full"><span>Source link</span><input class="input" type="url" name="link" placeholder="https://… (SharePoint, OneDrive, report URL)"></label>
        </div>
        <details class="kp-more"><summary>${icon('chevron-right')}Numerator and denominator (optional)</summary><div class="form-grid" style="margin-top:8px">
          <label class="field"><span>${esc(k.numLabel || 'Numerator')}</span><input class="input tnum" type="number" step="any" name="numerator"></label>
          <label class="field"><span>${esc(k.denLabel || 'Denominator')}</span><input class="input tnum" type="number" step="any" name="denominator"></label></div><p class="help" style="margin-top:4px">Leave the result empty to calculate it from these.</p></details>
        <label class="field full" style="margin-top:12px"><span>Notes</span><textarea class="textarea" name="notes" rows="2" placeholder="Anything reviewers should know about this result"></textarea></label>
      </div><aside class="kp-side">
        <h3>Check</h3><div id="kpPrev">${preview(k, null)}</div>
        <dl class="kp-dl"><dt>Previous result</dt><dd>${prev ? `${pctOrVal(k, prev.value)} · ${esc(prev.period)}` : '—'}</dd><dt>Recorded by</dt><dd>${esc(Q.pname(Q.me()))} · ${Q.fmt(Q.today())}</dd></dl>
        <div id="kpDup"></div>
        <label class="checkbox kp-review"><input type="checkbox" name="review" ${k.reviewer && k.reviewer !== Q.me() ? '' : 'disabled'}>Send to ${esc(Q.pname(k.reviewer))} for review before it counts</label>
      </aside></div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><span class="grow"></span><button class="btn" type="button" data-draft>Save Draft</button><button class="btn primary" type="button" data-ok>${icon('check')}Record Result</button>` });
    const f = m.querySelector('form'), val = () => { const v = Q.formValues(f); const n = Number(v.numerator), dn = Number(v.denominator); return v.value !== '' ? Number(v.value) : (v.numerator !== '' && dn ? (k.unit === '%' ? n / dn * 100 : n / dn) : null); };
    const upd = () => { const v = val(), per = f.period.value.trim(); m.querySelector('#kpPrev').innerHTML = preview(k, v == null ? null : Math.round(v * 10) / 10, per);
      const ex = K.results(k).find(r => r.period === per && r.status === 'Approved');
      m.querySelector('#kpDup').innerHTML = ex ? `<div class="callout warning small">${icon('info')}<span><b>${esc(per)} already has an approved result</b>${pctOrVal(k, ex.value)} from ${esc(K.METHODS[ex.method]?.label || ex.method)}. Recording a new one keeps it in the history as superseded.</span></div>` : '';
      Q.refreshIcons(); };
    f.addEventListener('input', upd); upd();
    const save = status => {
      if (!f.period.value.trim()) { Q.validate(f); return; }
      const v = val(); if (v == null || isNaN(v)) { f.value.setAttribute('aria-invalid', 'true'); f.value.style.borderColor = 'var(--danger)'; f.value.focus(); return; }
      const x = Q.formValues(f);
      const r = K.addResult(k, { period: x.period.trim(), value: v, numerator: x.numerator, denominator: x.denominator, method: 'external', notes: x.notes.trim(),
        source: { type: x.type, system: x.system.trim(), ref: x.ref.trim().replace(/ — $/, ''), link: x.link.trim() }, status: status || (x.review ? 'For Review' : 'Approved'),
        reviewedBy: !status && !x.review ? Q.me() : null, reviewedAt: !status && !x.review ? Q.today() : null });
      K.log(k, `${r.status === 'Draft' ? 'saved a draft' : 'recorded the'} ${r.period} result ${K.fmt(r.value, k)} (${x.type}${x.ref.trim() ? ` — ${x.ref.trim().replace(/ — $/, '')}` : ''})${r.status === 'For Review' ? ` and sent it to ${Q.pname(k.reviewer)} for review` : ''}`);
      done(r.status === 'Draft' ? 'Draft saved' : 'Result recorded', `${k.name} ${r.period}: ${K.fmt(r.value, k)} — ${K.ok(k, r.value) ? 'on target' : 'below target'}${r.status === 'For Review' ? ' · waiting for review' : ''}`);
    };
    m.querySelector('[data-ok]').addEventListener('click', () => save(null));
    m.querySelector('[data-draft]').addEventListener('click', () => save('Draft'));
    f.addEventListener('submit', e => { e.preventDefault(); save(null); });
  };
  Q.actions['kpi-record'] = d => K.recordResult(kOf(d), { period: d.period });

  /* ============================================================ result drawer: where did this number come from? */
  K.openResult = id => {
    const r = K.result(id), k = K.kpi(r.kpi), M = K.METHODS[r.method] || K.METHODS.external;
    const recs = (r.recordIds || []).map(x => (Q.S.kpiRecords || []).find(y => y.id === x)).filter(Boolean);
    const batch = r.batch && (Q.S.kpiImports || []).find(b => b.id === r.batch), cyc = r.cycle && K.cycle(r.cycle), sv = cyc?.survey && K.survey(cyc.survey);
    const sup = K.results(k, { all: true }).filter(x => x.period === r.period && x.id !== r.id);
    const origin = r.method === 'survey' ? `${r.records} survey responses${sv ? ` to <b>${esc(sv.name)}</b>` : ''}`
      : r.method === 'import' ? `${r.records} records imported${batch ? ` from <b>${esc(batch.file)}</b>` : ''}`
      : r.method === 'manual' ? `${r.records} measurement records entered manually`
      : r.method === 'internal' ? `Calculated automatically from <b>${r.records} ${esc(r.source?.system || 'iQMS')} records</b>`
      : r.method === 'integration' ? `${r.records ? `${r.records} records from ` : ''}<b>${esc(r.source?.system || 'external system')}</b>${/sample/i.test(r.source?.ref || '') ? ' (sample sync)' : ''}`
      : r.method === 'legacy' ? 'Recorded in the KPI register before collection methods were configured'
      : `Final result provided from <b>${esc(r.source?.ref || r.source?.type || 'an external source')}</b>`;
    const dims = recs.length ? Object.keys(recs[0].dims || {}) : [];
    const rows = recs.slice(0, 8).map(x => `<tr>${dims.map(dm => `<td>${esc(x.dims[dm] || '—')}</td>`).join('')}${usesFraction(k) || x.numerator != null ? `<td class="c-num tnum">${x.numerator ?? '—'}</td><td class="c-num tnum">${x.denominator ?? '—'}</td>` : ''}<td class="c-num tnum">${pctOrVal(k, K.recValue(k, x))}</td></tr>`).join('');
    const m = Q.openModal({ size: 'drawer', title: `${esc(k.name)} — ${esc(r.period)}`, sub: `${esc(k.id)} · result ${esc(r.id)}`, body: `<div class="modal-body kp-trace">
      <div class="kp-trace-head"><div><div class="kp-big tnum">${pctOrVal(k, r.value)}</div><div class="small muted">Target ${esc(K.targetText(k))}</div></div><div class="kp-trace-badges">${K.statusBadge(k, r.value)}${Q.ui.badge(r.status, K.RSTATUS[r.status])}</div></div>
      <section class="kp-trace-sec"><h3>Where this number comes from</h3>
        <p class="kp-origin">${icon(M.icon)}<span>${origin}</span></p>
        <dl class="kp-dl">
          <dt>Collection method</dt><dd>${K.methodChip(r.method)}</dd>
          <dt>Source</dt><dd>${esc(r.source?.type || '—')}${r.source?.system ? ` · ${esc(r.source.system)}` : ''}</dd>
          ${r.source?.ref ? `<dt>Reference</dt><dd>${esc(r.source.ref)}</dd>` : ''}
          ${r.source?.link ? `<dt>Source link</dt><dd><a href="${esc(r.source.link)}" target="_blank" rel="noopener">${icon('link')}${esc(r.source.link.replace(/^https?:\/\//, '').slice(0, 60))}${r.source.link.length > 66 ? '…' : ''}</a></dd>` : ''}
          ${r.calc ? `<dt>Calculation</dt><dd>${esc(K.aggLabel(r.calc.agg))}<span class="kp-how">${esc(r.calc.how)} = <b>${pctOrVal(k, r.value)}</b></span></dd>` : r.numerator != null && r.denominator != null ? `<dt>Inputs</dt><dd>${r.numerator} ÷ ${r.denominator}</dd>` : ''}
          ${batch ? `<dt>Import</dt><dd>${esc(batch.id)} · ${esc(batch.file)} · ${batch.imported} imported, ${batch.rejected} rejected · ${esc(Q.pname(batch.by))}, ${Q.fmt(batch.at)}</dd>` : ''}
          ${cyc ? `<dt>Collection cycle</dt><dd><a href="#/qms/objectives/c/${esc(cyc.id)}" data-close-all>${esc(cyc.id)}</a> · ${Q.ui.badge(cyc.status, K.CKIND[cyc.status])}</dd>` : ''}
          ${r.notes ? `<dt>Notes</dt><dd>${esc(r.notes)}</dd>` : ''}
        </dl>
        ${recs.length ? `<div class="kp-recs"><div class="kp-recs-head"><b>${recs.length} underlying record${recs.length === 1 ? '' : 's'}</b><a class="ui-link" href="#/qms/objectives/k/${esc(k.id)}/measurements?period=${encodeURIComponent(r.period)}" data-close-all>View all${icon('chevron-right')}</a></div>
          <div class="table-scroll"><table class="dt tight"><thead><tr>${dims.map(dm => `<th>${esc(K.DIMS[dm] || dm)}</th>`).join('')}${usesFraction(k) || recs[0].numerator != null ? `<th class="c-num">${esc(k.numLabel || 'Numerator')}</th><th class="c-num">${esc(k.denLabel || 'Denominator')}</th>` : ''}<th class="c-num">Value</th></tr></thead><tbody>${rows}</tbody></table></div>
          ${recs.length > 8 ? `<p class="small muted" style="margin-top:6px">Showing 8 of ${recs.length}.</p>` : ''}</div>` : r.records ? `<p class="small muted">${r.records} records were used. Their detail is held in the source system.</p>` : ''}
      </section>
      <section class="kp-trace-sec"><h3>Approval</h3><dl class="kp-dl"><dt>Recorded</dt><dd>${esc(Q.pname(r.recordedBy))} · ${Q.fmt(r.recordedAt)}</dd><dt>Reviewed</dt><dd>${r.reviewedBy ? `${esc(Q.pname(r.reviewedBy))} · ${Q.fmt(r.reviewedAt)}` : r.status === 'For Review' ? `Waiting for ${esc(Q.pname(k.reviewer))}` : '—'}</dd></dl>
        ${sup.length ? `<p class="small muted" style="margin-top:6px">${icon('history')} Other results for ${esc(r.period)}: ${sup.map(x => `${pctOrVal(k, x.value)} (${esc(x.status)}, ${esc(K.METHODS[x.method]?.label || x.method)})`).join(', ')}</p>` : ''}</section></div>`,
      foot: `${canReview(k, r) ? `<button class="btn" type="button" data-return>Return</button><button class="btn primary" type="button" data-approve>${icon('check')}Approve Result</button>` : r.status === 'Draft' && [k.owner, k.dataOwner, r.recordedBy].includes(Q.me()) ? `<button class="btn primary" type="button" data-submit>Submit for Review</button>` : ''}<button class="btn" type="button" data-close>Close</button>` });
    m.querySelectorAll('[data-close-all]').forEach(a => a.addEventListener('click', () => Q.closeAllModals()));
    m.querySelector('[data-approve]')?.addEventListener('click', () => { K.approve(r); done('Result approved', `${k.name} ${r.period}: ${K.fmt(r.value, k)}`); });
    m.querySelector('[data-return]')?.addEventListener('click', () => { r.status = 'Returned'; K.log(k, `returned the ${r.period} result for correction`); done('Result returned', `${Q.pname(r.recordedBy)} was notified.`); });
    m.querySelector('[data-submit]')?.addEventListener('click', () => { r.status = 'For Review'; K.log(k, `submitted the ${r.period} result for review`); done('Submitted for review', Q.pname(k.reviewer)); });
  };
  Q.actions['kpi-result'] = d => K.openResult(d.id);

  /* ============================================================ Collect Data */
  K.COLLECT = [['manual', 'Manual entry', 'Type or paste underlying records into a table.'], ['import', 'Import Excel / CSV', 'Upload a file, map its columns, validate, then import.'],
    ['survey', 'Survey / Evaluation', 'Use responses from a survey or evaluation.'], ['internal', 'Internal QMS source', 'Calculate from records already in iQMS.'], ['integration', 'External integration', 'ERP, CRM, HRIS, SharePoint or API.']];
  K.collectMenu = k => Q.menu(`Collect data for ${k.name}`, K.COLLECT.map(([key, label]) => ({ label, icon: K.METHODS[key].icon, data: { action: 'kpi-collect', id: k.id, how: key } })), { text: 'Collect Data', icon: 'chevron-down', cls: 'btn', align: 'min-width:230px' });
  Q.actions['kpi-collect'] = d => { const k = kOf(d);
    if (d.how) return ({ manual: K.manualEntry, import: K.importWizard, survey: K.surveyFlow, internal: K.internalFlow, integration: K.integrationFlow })[d.how](k, { period: d.period, cycle: d.cycle });
    const m = Q.openModal({ size: 'm', title: 'Collect Data', sub: `${esc(k.name)} · underlying records are consolidated into the period result`, body: `<div class="modal-body"><ul class="kp-choose">${K.COLLECT.map(([key, label, desc]) => `<li><button type="button" data-how="${key}">${icon(K.METHODS[key].icon)}<span><b>${esc(label)}</b><span>${esc(desc)}</span></span>${key === K.methodOf(k) ? Q.ui.badge('Configured', 'accent') : ''}</button></li>`).join('')}</ul>
      <p class="small muted" style="margin-top:12px">Already calculated somewhere else? <button class="link-btn" type="button" data-rec>Record the final result instead</button>.</p></div>` });
    m.querySelectorAll('[data-how]').forEach(b => b.addEventListener('click', () => { Q.closeModal(); Q.actions['kpi-collect']({ id: k.id, how: b.dataset.how }); }));
    m.querySelector('[data-rec]').addEventListener('click', () => { Q.closeModal(); K.recordResult(k); }); };

  // Open (not approved / closed) collection cycle for a period, created when needed.
  K.ensureCycle = (k, period, method) => {
    let c = (Q.S.kpiCycles || []).find(x => x.kpi === k.id && x.period === period && !['Approved', 'Closed'].includes(x.status));
    if (!c) { const list = Q.S.kpiCycles; let n = list.length + 1, id; do { id = `KC-${period.slice(-4)}-${String(n).padStart(3, '0')}`; n++; } while (list.some(x => x.id === id));
      c = { id, kpi: k.id, period, key: K.key(period), method, status: 'Collecting', owner: k.dataOwner || k.owner, expected: null, created: Q.today(), resultId: null }; list.push(c);
      K.log(k, `started collection cycle ${id} for ${period}`, 'cycle'); }
    return c;
  };
  // Calculate a cycle's records into a result (Draft → For Review, or Approved when no reviewer is set).
  K.calculateCycle = (k, c, { submit = true } = {}) => {
    const recs = K.records(k, c.period).filter(r => !r.cycle || r.cycle === c.id), res = K.calc(k, recs);
    if (res.value == null) return null;
    const old = c.resultId && K.result(c.resultId); if (old && old.status !== 'Approved') { old.status = 'Superseded'; }
    const r = K.addResult(k, { period: c.period, key: c.key, value: res.value, numerator: res.sumNum || null, denominator: res.sumDen || null, method: c.method, records: recs.length, recordIds: recs.map(x => x.id), cycle: c.id,
      batch: c.batch || null, calc: { agg: k.aggregation, how: res.how, n: res.n }, status: submit ? 'For Review' : 'Draft',
      source: c.method === 'survey' ? { type: 'Survey', system: 'Survey tool', ref: `${K.survey(c.survey)?.name || 'Survey'} — ${c.period} responses` } : c.method === 'import' ? { type: 'Excel / Spreadsheet', system: 'Import', ref: c.batchFile || 'Imported file' } : c.method === 'internal' ? { type: 'Internal QMS', system: c.module || 'iQMS', ref: `${recs.length} ${c.module || 'iQMS'} records` } : { type: 'Manual measurement entry', ref: `${recs.length} records` } });
    c.resultId = r.id; c.status = submit ? 'For Review' : 'Calculated';
    K.log(k, `calculated ${c.period} from ${recs.length} records: ${K.fmt(r.value, k)} (${K.aggLabel(k.aggregation)})${submit ? ` — sent to ${Q.pname(k.reviewer)} for review` : ''}`, 'calc');
    return r;
  };

  /* ---------- 2. Manual measurement entry (spreadsheet-like) ---------- */
  K.manualEntry = (k, { period, cycle } = {}) => {
    const cyc = cycle && K.cycle(cycle), per = cyc?.period || period || K.periodOptions(k)[0], dims = dimsOf(k), frac = usesFraction(k);
    const cols = [...dims.map(d => ({ key: 'd:' + d, label: dimLabel(d) })), ...(frac ? [{ key: 'numerator', label: k.numLabel || 'Numerator', num: true }, { key: 'denominator', label: k.denLabel || 'Denominator', num: true }] : [{ key: 'value', label: `Value${k.unit ? ` (${k.unit})` : ''}`, num: true }]), { key: 'notes', label: 'Notes' }];
    let rows = [{}, {}, {}];
    const grid = () => `<table class="kp-grid"><thead><tr><th class="kp-rn">#</th>${cols.map(c => `<th${c.num ? ' class="c-num"' : ''}>${esc(c.label)}</th>`).join('')}${frac ? '<th class="c-num">Result</th>' : ''}<th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="kp-rn">${i + 1}</td>${cols.map(c => `<td><input class="kp-cell${c.num ? ' tnum' : ''}" data-r="${i}" data-c="${c.key}" value="${esc(r[c.key] ?? '')}" ${c.num ? 'inputmode="decimal"' : ''} aria-label="${esc(c.label)} row ${i + 1}"></td>`).join('')}${frac ? `<td class="c-num tnum kp-calc">${(() => { const n = Number(r.numerator), d = Number(r.denominator); return r.numerator !== undefined && r.numerator !== '' && d ? K.fmt(k.unit === '%' ? n / d * 100 : n / d, k) : '—'; })()}</td>` : ''}<td class="kp-row-act"><button class="icon-btn" type="button" data-dup="${i}" aria-label="Duplicate row ${i + 1}" title="Duplicate">${icon('copy')}</button><button class="icon-btn" type="button" data-del="${i}" aria-label="Delete row ${i + 1}" title="Delete">${icon('trash-2')}</button></td></tr>`).join('')}</tbody></table>`;
    const toRec = r => ({ dims: Object.fromEntries(dims.map(d => [d, (r['d:' + d] || '').trim()])), numerator: r.numerator, denominator: r.denominator, value: r.value, notes: r.notes || '' });
    const filled = () => rows.filter(r => cols.some(c => String(r[c.key] ?? '').trim()));
    const summary = () => { const fr = filled(), res = K.calc(k, fr.map(toRec)); return `<span><b>${fr.length}</b> record${fr.length === 1 ? '' : 's'}</span><span>${esc(K.aggLabel(k.aggregation))}</span><span>Calculated <b class="tnum">${res.value == null ? '—' : K.fmt(res.value, k)}</b>${res.value == null ? '' : ' ' + K.statusBadge(k, res.value)}</span>${res.warnings.length ? `<span class="warnv">${esc(res.warnings[0])}</span>` : ''}`; };
    const m = Q.openModal({ size: 'l', title: 'Manual Measurement Entry', sub: `${esc(k.name)} · ${esc(K.aggLabel(k.aggregation))}`, body: `<div class="modal-body">
      <div class="kp-grid-tools"><label class="field inline"><span>Period</span><input class="input sm" id="kpPer" value="${esc(per)}" ${cyc ? 'readonly' : ''}></label><span class="grow"></span><span class="small muted">Tip: paste rows copied from Excel into any cell.</span><button class="btn sm" type="button" data-add>${icon('plus')}Add Row</button></div>
      <div class="kp-grid-wrap" id="kpGrid">${grid()}</div><div class="kp-grid-sum" id="kpSum">${summary()}</div></div>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><span class="grow"></span><button class="btn" type="button" data-save>Save Records</button><button class="btn primary" type="button" data-calc>${icon('hash')}Save &amp; Calculate Result</button>` });
    const host = m.querySelector('#kpGrid'), sum = m.querySelector('#kpSum');
    const redraw = (focus) => { host.innerHTML = grid(); Q.refreshIcons(); sum.innerHTML = summary(); if (focus) host.querySelector(`[data-r="${focus[0]}"][data-c="${focus[1]}"]`)?.focus(); };
    host.addEventListener('input', e => { const x = e.target.closest('.kp-cell'); if (!x) return; rows[+x.dataset.r][x.dataset.c] = x.value; sum.innerHTML = summary(); if (frac) { const r = rows[+x.dataset.r], n = Number(r.numerator), d = Number(r.denominator); x.closest('tr').querySelector('.kp-calc').textContent = r.numerator !== undefined && r.numerator !== '' && d ? K.fmt(k.unit === '%' ? n / d * 100 : n / d, k) : '—'; } });
    host.addEventListener('paste', e => { const x = e.target.closest('.kp-cell'), t = e.clipboardData?.getData('text') || ''; if (!x || !/[\t\n]/.test(t.trim())) return; e.preventDefault();
      const r0 = +x.dataset.r, c0 = cols.findIndex(c => c.key === x.dataset.c);
      t.replace(/\r/g, '').split('\n').filter(l => l.trim()).forEach((line, i) => { const r = rows[r0 + i] || (rows[r0 + i] = {}); line.split('\t').forEach((v, j) => { const c = cols[c0 + j]; if (c) r[c.key] = v.trim(); }); });
      redraw([r0, x.dataset.c]); });
    host.addEventListener('click', e => { const dup = e.target.closest('[data-dup]'), del = e.target.closest('[data-del]');
      if (dup) { const i = +dup.dataset.dup; rows.splice(i + 1, 0, { ...rows[i] }); redraw([i + 1, cols[0].key]); }
      if (del) { rows.splice(+del.dataset.del, 1); if (!rows.length) rows.push({}); redraw(); } });
    m.querySelector('[data-add]').addEventListener('click', () => { rows.push({}); redraw([rows.length - 1, cols[0].key]); });
    const save = calc => { const fr = filled(); if (!fr.length) { Q.toast('Add at least one record'); return; }
      const p = m.querySelector('#kpPer').value.trim() || per, c = cyc || K.ensureCycle(k, p, 'manual');
      fr.forEach(r => { const x = toRec(r); (Q.S.kpiRecords).push({ id: `MR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, kpi: k.id, period: c.period, cycle: c.id, date: Q.today(), dims: x.dims, numerator: x.numerator === '' ? null : x.numerator, denominator: x.denominator === '' ? null : x.denominator, value: x.value === '' ? null : x.value, notes: x.notes, status: 'Valid', source: 'Manual entry', submittedBy: Q.me() }); });
      K.log(k, `entered ${fr.length} measurement record${fr.length === 1 ? '' : 's'} for ${c.period}`, 'records');
      if (calc) { const r = K.calculateCycle(k, c); done(r ? 'Result calculated' : 'Records saved', r ? `${k.name} ${c.period}: ${K.fmt(r.value, k)} from ${r.records} records · sent for review` : 'No value could be calculated from these records.'); }
      else { if (c.status === 'Draft') c.status = 'Collecting'; done('Records saved', `${fr.length} records added to ${c.id}.`); } };
    m.querySelector('[data-save]').addEventListener('click', () => save(false));
    m.querySelector('[data-calc]').addEventListener('click', () => save(true));
  };

  /* ---------- 3. Excel / CSV import (5 steps) ---------- */
  K.parseCSV = text => { const delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : text.split('\n')[0].includes(';') && !text.split('\n')[0].includes(',') ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) { const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== '')); };
  const csvOf = rows => rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  K.sampleCSV = k => { const crew = (window.QMS_KPI?.crew || []).slice(0, 20);
    return csvOf([['Employee Name', 'Team', 'Department', 'Completed Jobs', 'Target Jobs', 'Month'], ...crew.map(([who, team, dept], i) => [who, team, dept, dept === 'Electrical' ? 12 + (i % 3) : 16 + (i % 5), dept === 'Electrical' ? 14 : 20, 'Oct 2026']),
      ['', 'Install Team B', 'Operations', 18, 20, 'Oct 2026'], ['Omar Lacson', 'Install Team B', 'Operations', 'n/a', 20, 'Oct 2026']]); };
  K.importWizard = (k, { period, cycle } = {}) => {
    const cyc = cycle && K.cycle(cycle), S = { step: 0, name: '', head: [], body: [], map: {}, period: cyc?.period || period || K.periodOptions(k)[0], skip: true, submit: true, result: null };
    const STEPS = ['Source File', 'Map Columns', 'Validate', 'Review Calculation', 'Import'];
    const dims = dimsOf(k), frac = usesFraction(k);
    const fields = [...dims.map(d => ({ key: 'd:' + d, label: dimLabel(d), req: d === dims[0] })), ...(frac ? [{ key: 'numerator', label: k.numLabel || 'Numerator', num: true, req: true }, { key: 'denominator', label: k.denLabel || 'Denominator', num: true, req: true }] : [{ key: 'value', label: 'Value', num: true, req: true }]),
      { key: 'period', label: 'Period' }, { key: 'date', label: 'Date' }, { key: 'notes', label: 'Notes' }];
    const guess = f => { const words = { 'd:person': /employee|name|person|staff|installer/i, 'd:team': /team|crew/i, 'd:department': /dept|department/i, 'd:project': /project/i, 'd:customer': /customer|client/i, 'd:supplier': /supplier|vendor/i, 'd:site': /site/i,
      numerator: /complet|achiev|on.?time|actual|done|numerator|pass/i, denominator: /target|assign|planned|total|denominator|expected/i, value: /value|score|result|%/i, period: /month|period|quarter/i, date: /date/i, notes: /note|comment|remark/i }[f.key];
      return S.head.findIndex(h => words && words.test(h)); };
    const validate = () => { const out = { ok: [], errors: [], warnings: [] }, seen = new Set();
      S.body.forEach((row, i) => { const get = key => S.map[key] >= 0 ? (row[S.map[key]] ?? '').trim() : ''; const n = i + 2, errs = [];
        fields.filter(f => f.req).forEach(f => { if (!get(f.key)) errs.push(`${f.label} missing`); });
        fields.filter(f => f.num).forEach(f => { const v = get(f.key); if (v && isNaN(Number(v))) errs.push(`${f.label} “${v}” is not a number`); });
        if (frac && get('denominator') && Number(get('denominator')) === 0) errs.push(`${fields.find(f => f.key === 'denominator').label} is zero`);
        if (errs.length) { out.errors.push([n, errs.join('; '), row]); return; }
        const id = get('d:' + dims[0]);
        if (seen.has(id)) out.warnings.push([n, `${dimLabel(dims[0])} “${id}” appears more than once`]); seen.add(id);
        if (get('period') && get('period') !== S.period) out.warnings.push([n, `Period “${get('period')}” differs from ${S.period}; imported into ${S.period}`]);
        if (frac && Number(get('numerator')) > Number(get('denominator'))) out.warnings.push([n, `${fields[dims.length].label} is above ${fields[dims.length + 1].label}`]);
        out.ok.push({ n, dims: Object.fromEntries(dims.map(d => [d, get('d:' + d)])), numerator: get('numerator') || null, denominator: get('denominator') || null, value: get('value') || null, date: get('date') || Q.today(), notes: get('notes') }); });
      return out; };
    const m = Q.openModal({ size: 'l', title: 'Import Measurement Records', sub: `${esc(k.name)} · Excel / CSV`, body: '<div class="modal-body" id="kpImp"></div>', foot: '<div class="kp-wz-foot" id="kpImpFoot"></div>' });
    const host = m.querySelector('#kpImp'), foot = m.querySelector('#kpImpFoot');
    const draw = () => {
      const steps = `<ol class="kp-steps">${STEPS.map((s, i) => `<li class="${i < S.step ? 'done' : i === S.step ? 'current' : ''}"><span class="n">${i < S.step ? icon('check') : i + 1}</span>${s}</li>`).join('')}</ol>`;
      let body = '', next = 'Continue', canNext = true;
      if (S.step === 0) {
        body = `<div class="kp-drop"><label class="kp-drop-zone">${icon('upload')}<b>${S.name ? esc(S.name) : 'Choose a CSV file'}</b><span>${S.name ? `${S.body.length} data rows · ${S.head.length} columns` : 'CSV or tab-separated text. For .xlsx files, use Excel “Save As → CSV”.'}</span><input type="file" accept=".csv,.tsv,.txt,text/csv" id="kpFile"></label>
          <div class="kp-drop-alt"><button class="btn sm" type="button" data-sample>${icon('file-text')}Use sample file (20 installers)</button><button class="btn sm ghost" type="button" data-tpl>${icon('download')}Download template</button></div>
          <details class="kp-more"><summary>${icon('chevron-right')}Or paste rows from Excel</summary><textarea class="textarea" id="kpPaste" rows="5" placeholder="Paste including the header row"></textarea><button class="btn sm" type="button" data-paste style="margin-top:6px">Use pasted rows</button></details>
          <label class="field inline" style="margin-top:12px"><span>Import into period</span><input class="input sm" id="kpImpPer" value="${esc(S.period)}" ${cyc ? 'readonly' : ''}></label></div>`;
        canNext = !!S.body.length;
      } else if (S.step === 1) {
        body = `<p class="small muted" style="margin:0 0 10px">Match each iQMS field to a column in <b>${esc(S.name)}</b>. Required fields are marked.</p><table class="dt tight kp-map"><thead><tr><th>iQMS field</th><th>Column in your file</th><th>First values</th></tr></thead><tbody>${fields.map(f => `<tr><td>${esc(f.label)}${f.req ? ' <span class="req">*</span>' : ''}</td><td><select class="select sm" data-map="${f.key}"><option value="-1">— Not imported —</option>${S.head.map((h, i) => `<option value="${i}"${S.map[f.key] === i ? ' selected' : ''}>${esc(h)}</option>`).join('')}</select></td><td class="small muted">${S.map[f.key] >= 0 ? S.body.slice(0, 3).map(r => esc(r[S.map[f.key]] ?? '')).join(' · ') : '—'}</td></tr>`).join('')}</tbody></table>`;
        canNext = fields.filter(f => f.req).every(f => S.map[f.key] >= 0);
      } else if (S.step === 2) {
        const v = S.v = validate();
        body = `<div class="kp-val"><div class="kp-val-n ok"><b>${v.ok.length}</b> valid rows</div><div class="kp-val-n bad"><b>${v.errors.length}</b> rows with errors</div><div class="kp-val-n warn"><b>${v.warnings.length}</b> warnings</div></div>
          ${v.errors.length || v.warnings.length ? `<div class="table-scroll" style="max-height:260px"><table class="dt tight"><thead><tr><th>Row</th><th>Type</th><th>Issue</th></tr></thead><tbody>${v.errors.map(([n, t]) => `<tr><td class="tnum">${n}</td><td>${Q.ui.badge('Error', 'danger')}</td><td>${esc(t)}</td></tr>`).join('')}${v.warnings.map(([n, t]) => `<tr><td class="tnum">${n}</td><td>${Q.ui.badge('Warning', 'warning')}</td><td>${esc(t)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small">${icon('circle-check')} Every row passed validation.</p>`}
          ${v.errors.length ? `<label class="checkbox" style="margin-top:10px"><input type="checkbox" id="kpSkip" ${S.skip ? 'checked' : ''}>Skip the ${v.errors.length} rows with errors and import the rest</label>` : ''}`;
        canNext = v.ok.length > 0 && (!v.errors.length || S.skip);
      } else if (S.step === 3) {
        const res = K.calc(k, S.v.ok), prev = K.latest(k), roll = K.rollup(k, S.v.ok);
        S.calc = res;
        body = `<div class="kp-review-calc"><div><div class="small muted">Calculated ${esc(S.period)} result</div><div class="kp-big tnum">${K.fmt(res.value, k)}</div><div>${K.statusBadge(k, res.value)} <span class="small muted">Target ${esc(K.targetText(k))}${prev ? ` · ${esc(prev.period)}: ${K.fmt(prev.value, k)}` : ''}</span></div></div>
          <dl class="kp-dl"><dt>Rule</dt><dd>${esc(K.aggLabel(k.aggregation))}</dd><dt>Working</dt><dd>${esc(res.how)}</dd><dt>Records used</dt><dd>${res.n}</dd></dl></div>
          ${res.warnings.length ? `<div class="callout warning small">${icon('triangle-alert')}<span>${res.warnings.map(esc).join(' ')}</span></div>` : ''}
          ${roll.length ? `<h4 class="kp-h4">Consolidation</h4>${roll.map(l => `<div class="kp-roll"><b>${esc(l.level === 'organization' ? 'Organization' : dimLabel(l.level))}</b>${l.groups.map(g => `<span>${esc(g.name)} <b class="tnum">${K.fmt(g.value, k)}</b> <span class="muted">(${g.n})</span></span>`).join('')}</div>`).join('')}` : ''}`;
      } else if (S.step === 4) {
        if (!S.result) body = `<p>Import <b>${S.v.ok.length}</b> records into <b>${esc(S.period)}</b>${S.v.errors.length ? ` and reject <b>${S.v.errors.length}</b>` : ''}.</p><label class="checkbox"><input type="checkbox" id="kpSubmit" ${S.submit ? 'checked' : ''}>Create the ${esc(S.period)} result (${K.fmt(S.calc.value, k)}) and send it to ${esc(Q.pname(k.reviewer))} for review</label>`;
        else { const b = S.result;
          body = `<div class="kp-val"><div class="kp-val-n ok"><b>${b.imported}</b> imported</div><div class="kp-val-n bad"><b>${b.rejected}</b> rejected</div><div class="kp-val-n warn"><b>${b.warnings}</b> warnings</div></div>
            <p>${icon('circle-check')} Import <b>${esc(b.id)}</b> saved.${b.resultId ? ` Calculated result <b>${K.fmt(K.result(b.resultId).value, k)}</b> for ${esc(S.period)} is waiting for review.` : ''}</p>
            ${b.rejected ? `<button class="btn sm" type="button" data-errors>${icon('download')}Download Error Rows</button>` : ''}`; }
        next = S.result ? 'Done' : `Import ${S.v.ok.length} Records`;
      }
      host.innerHTML = steps + `<div class="kp-wz-body">${body}</div>`;
      foot.innerHTML = `${S.step && !S.result ? '<button class="btn" type="button" data-back>Back</button>' : '<button class="btn" type="button" data-close-w>Cancel</button>'}<span class="grow"></span><button class="btn primary" type="button" data-next ${canNext ? '' : 'disabled'}>${esc(next)}</button>`;
      Q.refreshIcons(); Q.enhanceSelects(host);
      wire();
    };
    const load = (name, text) => { const rows = K.parseCSV(text); if (rows.length < 2) { Q.toast('Nothing to import', 'The file needs a header row and at least one data row.'); return; }
      S.name = name; S.head = rows[0].map(h => h.trim()); S.body = rows.slice(1); S.map = {}; fields.forEach(f => { const i = guess(f); if (i >= 0 && !Object.values(S.map).includes(i)) S.map[f.key] = i; }); draw(); };
    const wire = () => {
      host.querySelector('#kpFile')?.addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => load(f.name, String(rd.result)); rd.readAsText(f); });
      host.querySelector('[data-sample]')?.addEventListener('click', () => load('installer_productivity_Oct2026.csv', K.sampleCSV(k)));
      host.querySelector('[data-tpl]')?.addEventListener('click', () => download(`${k.id}_template.csv`, csvOf([fields.map(f => f.label)])));
      host.querySelector('[data-paste]')?.addEventListener('click', () => load('Pasted rows', host.querySelector('#kpPaste').value));
      host.querySelector('#kpImpPer')?.addEventListener('input', e => { S.period = e.target.value.trim(); });
      host.querySelectorAll('[data-map]').forEach(s => s.addEventListener('change', () => { S.map[s.dataset.map] = +s.value; draw(); }));
      host.querySelector('#kpSkip')?.addEventListener('change', e => { S.skip = e.target.checked; draw(); });
      host.querySelector('#kpSubmit')?.addEventListener('change', e => { S.submit = e.target.checked; });
      host.querySelector('[data-errors]')?.addEventListener('click', () => download(`${S.result.id}_error_rows.csv`, csvOf([['Row', 'Issue', ...S.head], ...S.v.errors.map(([n, t, row]) => [n, t, ...row])])));
      foot.querySelector('[data-close-w]')?.addEventListener('click', () => Q.closeModal());
      foot.querySelector('[data-back]')?.addEventListener('click', () => { S.step--; draw(); });
      foot.querySelector('[data-next]')?.addEventListener('click', () => {
        if (S.result) { Q.closeAllModals(); rr(); return; }
        if (S.step < 4) { S.step++; draw(); return; }
        // Import
        const c = cyc || K.ensureCycle(k, S.period, 'import'), id = (() => { let n = (Q.S.kpiImports || []).length + 1, x; do { x = `IMP-${S.period.slice(-4)}-${String(n).padStart(3, '0')}`; n++; } while (Q.S.kpiImports.some(b => b.id === x)); return x; })();
        S.v.ok.forEach(r => Q.S.kpiRecords.push({ id: `MR-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kpi: k.id, period: c.period, cycle: c.id, date: r.date, dims: r.dims, numerator: r.numerator, denominator: r.denominator, value: r.value, notes: r.notes, status: 'Valid', source: 'Excel / CSV import', ref: `${S.name} row ${r.n}`, batch: id, submittedBy: Q.me() }));
        const b = { id, kpi: k.id, period: c.period, file: S.name, rows: S.body.length, imported: S.v.ok.length, rejected: S.v.errors.length, warnings: S.v.warnings.length, by: Q.me(), at: Q.today(), errors: S.v.errors.map(([n, t]) => [String(n), t]), cycle: c.id };
        Q.S.kpiImports.push(b); c.batch = id; c.batchFile = S.name; c.method = c.method || 'import';
        K.log(k, `imported ${S.name} — ${b.imported} records imported, ${b.rejected} rejected, ${b.warnings} warnings (${c.period})`, 'import');
        if (S.submit) { const r = K.calculateCycle(k, c); b.resultId = r?.id; } else c.status = 'Ready to Calculate';
        Q.save(); S.result = b; draw();
      });
    };
    draw();
  };

  /* ---------- 4. Survey / evaluation ---------- */
  K.surveyFlow = (k, { period } = {}) => {
    const sv = K.survey(k.survey), periods = [...new Set([...K.periodOptions(k), ...K.records(k).filter(r => r.source === 'Survey').map(r => r.period)])];
    let per = period || (K.records(k).find(r => r.source === 'Survey')?.period) || periods[0];
    const m = Q.openModal({ size: 'm', title: 'Survey / Evaluation', sub: esc(k.name), body: '<div class="modal-body" id="kpSv"></div>', foot: '<div class="kp-wz-foot" id="kpSvFoot"></div>' });
    const draw = () => { const s = K.survey(k.survey), resp = K.records(k, per).filter(r => r.source === 'Survey'), res = K.calc(k, resp), cur = K.results(k).find(r => r.period === per && r.status === 'Approved');
      m.querySelector('#kpSv').innerHTML = `<label class="field"><span>Survey / evaluation source</span><select class="select" id="kpSvSel"><option value="">— Choose —</option>${opt(Q.S.kpiSurveys.map(x => [x.id, `${x.name} (${x.kind})`]), k.survey)}</select></label>
        ${s ? `<dl class="kp-dl" style="margin-top:10px"><dt>Scale</dt><dd>${esc(s.scale)}</dd><dt>Channel</dt><dd>${esc(s.channel)}</dd><dt>Owner</dt><dd>${esc(Q.pname(s.owner))}</dd><dt>Aggregation</dt><dd>${esc(K.aggLabel(k.aggregation))}${k.minSample ? ` · minimum ${k.minSample} responses` : ''}</dd></dl>
          <label class="field inline" style="margin-top:12px"><span>Period</span><select class="select sm" id="kpSvPer">${opt(periods, per)}</select></label>
          <div class="kp-sv-box">${resp.length ? `<div><b class="tnum">${resp.length}</b> responses received for ${esc(per)} · average <b class="tnum">${K.fmt(res.value, k)}</b> ${K.statusBadge(k, res.value)}</div>${res.warnings.length ? `<div class="small warnv">${esc(res.warnings.join(' '))}</div>` : ''}${cur ? `<div class="small muted">The approved ${esc(per)} result (${K.fmt(cur.value, k)}) was calculated from these responses.</div>` : ''}`
            : `<div>${icon('inbox')} No responses for ${esc(per)} yet.</div><div class="small muted">Responses arrive from the survey tool and become measurement records for the period. ${esc(s.note || '')}</div>`}</div>`
          : '<p class="small muted" style="margin-top:10px">Choose the survey or evaluation whose responses feed this KPI. The survey itself is built in the survey module.</p>'}`;
      m.querySelector('#kpSvFoot').innerHTML = `<button class="btn" type="button" data-close-s>Close</button><span class="grow"></span>${s && !resp.length ? '<button class="btn" type="button" data-req>Request Responses</button>' : ''}${s && resp.length && !cur ? `<button class="btn primary" type="button" data-calc>${icon('hash')}Calculate from ${resp.length} Responses</button>` : ''}${s && resp.length ? `<a class="btn" href="#/qms/objectives/k/${esc(k.id)}/measurements?period=${encodeURIComponent(per)}" data-go-recs>View Responses</a>` : ''}`;
      Q.refreshIcons(); Q.enhanceSelects(m);
      m.querySelector('#kpSvSel').addEventListener('change', e => { const old = k.survey; k.survey = e.target.value || null; if (k.survey && old !== k.survey) { k.method = 'survey'; K.log(k, `connected the KPI to ${K.survey(k.survey).name}`, 'method'); Q.save(); } draw(); });
      m.querySelector('#kpSvPer')?.addEventListener('change', e => { per = e.target.value; draw(); });
      m.querySelector('[data-close-s]').addEventListener('click', () => { Q.closeModal(); rr(); });
      m.querySelector('[data-go-recs]')?.addEventListener('click', () => Q.closeAllModals());
      m.querySelector('[data-req]')?.addEventListener('click', () => { K.log(k, `requested ${per} responses from ${K.survey(k.survey).name}`, 'cycle'); Q.save(); Q.toast('Request sent', `${Q.pname(K.survey(k.survey).owner)} was asked to send the survey for ${per}.`); });
      m.querySelector('[data-calc]')?.addEventListener('click', () => { const c = K.ensureCycle(k, per, 'survey'); c.survey = k.survey; resp.forEach(r => { r.cycle = r.cycle || c.id; }); const r = K.calculateCycle(k, c); done('Result calculated', `${k.name} ${per}: ${K.fmt(r.value, k)} from ${r.records} responses · sent for review`); });
    };
    draw();
  };

  /* ---------- 5. Internal QMS data ---------- */
  K.internalRows = (k, period) => {
    const year = (period.match(/\d{4}/) || [Q.today().slice(0, 4)])[0], today = Q.today();
    if ((k.internal?.module || 'CAPA') === 'CAPA') return Q.S.actions.filter(a => a.due && a.due.startsWith(year) && a.due <= today).map(a => ({ id: a.id, title: a.title, due: a.due, owner: a.owner, closed: Q.actionClosed(a), onTime: Q.actionClosed(a), href: `#/capa?focus=${a.id}` }));
    return [];
  };
  K.internalFlow = (k, { period } = {}) => {
    const per = period || K.label(k.frequency || 'YTD', Q.today().slice(0, 7)), cfg = k.internal;
    const m = Q.openModal({ size: 'l', title: 'Internal QMS Source', sub: esc(k.name), body: `<div class="modal-body" id="kpInt"></div>`, foot: '<div class="kp-wz-foot" id="kpIntFoot"></div>' });
    const draw = () => {
      const rows = cfg ? K.internalRows(k, per) : [], nmr = rows.filter(r => r.onTime).length, value = rows.length ? Math.round(nmr / rows.length * 1000) / 10 : null;
      m.querySelector('#kpInt').innerHTML = cfg ? `<dl class="kp-dl"><dt>Source</dt><dd>${esc(cfg.module)} module (Corrective Action register)</dd><dt>Numerator</dt><dd>${esc(cfg.numerator)}</dd><dt>Denominator</dt><dd>${esc(cfg.denominator)}</dd><dt>Formula</dt><dd>${esc(k.formula)}</dd><dt>Period</dt><dd>${esc(per)} (due dates in ${esc((per.match(/\d{4}/) || [''])[0])} up to today)</dd></dl>
        <div class="kp-review-calc" style="margin-top:12px"><div><div class="small muted">Calculated from ${rows.length} corrective actions</div><div class="kp-big tnum">${K.fmt(value, k)}</div>${value == null ? '' : K.statusBadge(k, value)}</div><dl class="kp-dl"><dt>${esc(cfg.numerator)}</dt><dd class="tnum">${nmr}</dd><dt>${esc(cfg.denominator)}</dt><dd class="tnum">${rows.length}</dd></dl></div>
        <div class="table-scroll" style="margin-top:12px"><table class="dt tight"><thead><tr><th>Corrective action</th><th>Owner</th><th class="c-date">Due</th><th>Closed on time</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="${r.href}" data-cl>${esc(r.id)}</a> <span class="muted">${esc(r.title)}</span></td><td>${esc(Q.pname(r.owner))}</td><td class="c-date">${Q.fmt(r.due)}</td><td>${r.onTime ? Q.ui.badge('Yes', 'success') : Q.ui.badge(r.closed ? 'Late' : 'Not closed', 'danger')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No corrective actions were due in this period.</td></tr>'}</tbody></table></div>
        <p class="small muted" style="margin-top:8px">Calculated from the corrective actions that are in iQMS today. Closed actions without a recorded closing date count as closed on time.</p>`
        : `<p>This KPI is not linked to iQMS data yet. Internal sources available:</p><ul class="kp-ul"><li><b>CAPA</b> — corrective actions closed on time, overdue actions</li><li><b>Audits</b> — audit programme completion, findings closure</li><li><b>Documents</b> — documents overdue for review, review performance</li></ul><p class="small muted">Set the source in <b>Edit KPI → Collection</b>.</p>`;
      m.querySelector('#kpIntFoot').innerHTML = `<button class="btn" type="button" data-close-i>Close</button><span class="grow"></span>${cfg ? '' : '<button class="btn" type="button" data-cfg>Configure Collection</button>'}${cfg && value != null ? `<button class="btn primary" type="button" data-calc>${icon('hash')}Calculate &amp; Send for Review</button>` : ''}`;
      Q.refreshIcons();
      m.querySelectorAll('[data-cl]').forEach(a => a.addEventListener('click', () => Q.closeAllModals()));
      m.querySelector('[data-close-i]').addEventListener('click', () => Q.closeModal());
      m.querySelector('[data-cfg]')?.addEventListener('click', () => { Q.closeModal(); K.editor(k, 4); });
      m.querySelector('[data-calc]')?.addEventListener('click', () => {
        const c = K.ensureCycle(k, per, 'internal'); c.module = cfg.module;
        K.records(k, per).filter(r => r.cycle === c.id).forEach(r => { r.status = 'Excluded'; });
        rows.forEach(r => Q.S.kpiRecords.push({ id: `MR-${r.id}-${Date.now().toString(36)}`, kpi: k.id, period: per, cycle: c.id, date: r.due, dims: { record: `${r.id} ${r.title}` }, numerator: r.onTime ? 1 : 0, denominator: 1, status: 'Valid', source: 'CAPA', ref: r.id, submittedBy: 'system' }));
        const res = K.calculateCycle(k, c); done('Result calculated', `${k.name} ${per}: ${K.fmt(res.value, k)} from ${res.records} corrective actions`); });
    };
    draw();
  };

  /* ---------- 6. External integration (architecture only) ---------- */
  K.integrationFlow = k => {
    const g = k.integration;
    Q.openModal({ size: 'm', title: 'External Integration', sub: esc(k.name), body: `<div class="modal-body">${g ? `<dl class="kp-dl"><dt>External system</dt><dd>${esc(g.system)}</dd><dt>Connection</dt><dd>${esc(g.connection)}</dd><dt>Dataset / object</dt><dd>${esc(g.dataset)}</dd><dt>Mapping</dt><dd>${esc(g.mapping)}</dd><dt>Refresh</dt><dd>${esc(g.refresh)}</dd><dt>Last sync</dt><dd>${Q.fmt(Q.addDays(Q.today(), g.lastSync || 0))}</dd><dt>Sync status</dt><dd>${Q.ui.badge(g.status || 'Not connected', 'warning')}</dd></dl>
        <div class="callout small" style="margin-top:12px">${icon('info')}<span><b>No live connection in this demo</b>Results for periods marked “Integration” are sample data. A real connection needs the integration service (credentials, scheduled sync, error handling).</span></div>`
      : `<p>No integration is configured for this KPI.</p><p class="small muted">Supported architecture: ERP, CRM, HRIS, Microsoft 365, SharePoint lists or an API. Each integration defines the connection, dataset, field mapping, refresh frequency and sync status. Configure it in <b>Edit KPI → Collection</b>.</p>`}</div>`,
      foot: `<button class="btn" type="button" data-close>Close</button><button class="btn" type="button" disabled title="Requires the integration service">${icon('history')}Sync Now</button>` });
  };

  /* ============================================================ collection cycles */
  K.startCycle = k => {
    const periods = K.periodOptions(k), prevSubjects = [...new Set(K.records(k, K.latest(k)?.period).map(r => r.dims?.[dimsOf(k)[0]]).filter(Boolean))];
    const m = Q.openModal({ size: 'm', title: 'Start Collection Cycle', sub: esc(k.name), body: `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Period <span class="req">*</span></span><input class="input" name="period" required value="${esc(periods[0])}" list="kpCyP"><datalist id="kpCyP">${periods.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
      <label class="field"><span>Collection method</span><select class="select" name="method">${opt(['manual', 'import', 'survey', 'internal', 'integration'].map(x => [x, K.METHODS[x].long]), ['manual', 'import', 'survey', 'internal', 'integration'].includes(k.method) ? k.method : 'manual')}</select></label>
      <label class="field"><span>Expected records</span><input class="input" type="number" name="expected" value="${prevSubjects.length || ''}" placeholder="e.g. 24"></label>
      <label class="field"><span>Due date</span><input class="input" type="date" name="due" value="${Q.addDays(Q.today(), 10)}"></label>
      <label class="field full"><span>Data owner</span><select class="select" name="owner">${Q.peopleOptions(k.dataOwner || k.owner)}</select></label></div>
      ${prevSubjects.length ? `<p class="small muted" style="margin-top:8px">${prevSubjects.length} ${esc(dimLabel(dimsOf(k)[0]).toLowerCase())}s from ${esc(K.latest(k).period)} are expected to submit.</p>` : ''}</form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Start Cycle</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      const c = K.ensureCycle(k, v.period.trim(), v.method); Object.assign(c, { expected: Number(v.expected) || null, due: v.due, owner: v.owner, contributors: prevSubjects });
      Q.save(); Q.closeAllModals(); Q.go(`#/qms/objectives/c/${c.id}`); Q.toast('Collection cycle started', `${c.id} · ${c.period}`); });
  };
  Q.actions['kpi-cycle'] = d => { const k = kOf(d); K.startCycle(k); };
  Q.actions['kpi-cycle-act'] = d => {
    const c = K.cycle(d.id), k = K.kpi(c.kpi);
    if (d.op === 'request') { K.log(k, `requested inputs for ${c.period} from contributors`, 'cycle'); Q.save(); rr(); Q.toast('Inputs requested', 'Contributors were notified (notifications are simulated in this demo).'); }
    if (d.op === 'remind') { Q.toast('Reminder sent', `${d.who} was reminded to submit ${c.period} data.`); }
    if (d.op === 'calc') { const r = K.calculateCycle(k, c, { submit: false }); Q.save(); rr(); Q.toast(r ? 'Calculated' : 'Nothing to calculate', r ? `${c.period}: ${K.fmt(r.value, k)} from ${r.records} records` : 'Add records first.'); }
    if (d.op === 'submit') { const r = K.result(c.resultId); if (r) { r.status = 'For Review'; c.status = 'For Review'; K.log(k, `submitted the ${c.period} result for review`); Q.save(); rr(); Q.toast('Submitted for review', Q.pname(k.reviewer)); } }
    if (d.op === 'approve') { const r = K.result(c.resultId); if (r) { K.approve(r); Q.save(); rr(); Q.toast('Result approved', `${k.name} ${c.period}: ${K.fmt(r.value, k)}`); } }
    if (d.op === 'close') { c.status = 'Closed'; K.log(k, `closed collection cycle ${c.id}`, 'cycle'); Q.save(); rr(); Q.toast('Cycle closed', c.id); }
  };

  /* ============================================================ KPI definition editor (7 sections) */
  const SECTIONS = ['Basic Information', 'Scope', 'Target', 'Measurement', 'Collection', 'Responsibility', 'Review'];
  K.editor = (k0, startAt = 0) => {
    const isNew = !k0, S = Q.S;
    const k = JSON.parse(JSON.stringify(k0 || { id: (() => { let n = S.kpis.length + 1, id; do { id = `K-${String(n).padStart(2, '0')}`; n++; } while (S.kpis.some(x => x.id === id)); return id; })(),
      name: '', description: '', objective: S.objectives[0]?.name || '', objectiveId: S.objectives[0]?.id, process: Q.topProcesses()[0].process_id, department: '', owner: Q.me(), dataOwner: Q.me(), reviewer: Q.me() === 'maria' ? 'eric' : 'maria',
      unit: '%', target: 90, dir: '≥', frequency: 'Monthly', aggregation: 'external', method: 'external', formula: '', minSample: null, active: true, iso: ['9.1.1'], notes: '', dims: [], hierarchy: [], actual: null, trend: [], period: '' }));
    let step = startAt;
    const depts = [...new Set(Object.values(S.people).map(p => p.dept).filter(Boolean).concat(['Operations', 'Electrical']))].sort();
    const m = Q.openModal({ size: 'l', title: isNew ? 'New KPI' : `Edit KPI — ${esc(k0.name)}`, sub: isNew ? 'Define what is measured, how it is collected and who is responsible.' : esc(k0.id), body: '<div class="modal-body kp-ed"><nav class="kp-ed-nav" id="kpEdNav"></nav><div class="kp-ed-body" id="kpEdBody"></div></div>', foot: '<div class="kp-wz-foot" id="kpEdFoot"></div>' });
    const read = () => { m.querySelectorAll('#kpEdBody [name]').forEach(el => { const n = el.name; if (el.type === 'checkbox') { if (n === 'dims' || n === 'hierarchy') return; k[n] = el.checked; } else k[n] = ['target', 'minSample'].includes(n) ? (el.value === '' ? null : Number(el.value)) : el.value; });
      const dims = [...m.querySelectorAll('#kpEdBody [name="dims"]')]; if (dims.length) k.dims = dims.filter(x => x.checked).map(x => x.value);
      const hi = [...m.querySelectorAll('#kpEdBody [name="hierarchy"]')]; if (hi.length) k.hierarchy = hi.filter(x => x.checked).map(x => x.value);
      if (k.objectiveId) k.objective = K.objective(k.objectiveId)?.name || k.objective;
      if (typeof k.iso === 'string') k.iso = k.iso.split(/[,\s]+/).filter(Boolean); };
    const sec = () => {
      const f = (label, html, full = false, help = '') => `<label class="field${full ? ' full' : ''}"><span>${label}</span>${html}${help ? `<span class="help">${help}</span>` : ''}</label>`;
      switch (step) {
        case 0: return `<div class="form-grid">${f('KPI name <span class="req">*</span>', `<input class="input" name="name" required value="${esc(k.name)}" placeholder="e.g. Customer satisfaction">`, true)}${f('KPI ID', `<input class="input" value="${esc(k.id)}" disabled>`)}${f('Status', `<select class="select" name="active"><option value="true"${k.active !== false ? ' selected' : ''}>Active</option><option value=""${k.active === false ? ' selected' : ''}>Inactive</option></select>`)}${f('Description', `<textarea class="textarea" name="description" rows="3">${esc(k.description || '')}</textarea>`, true)}${f('Quality objective', `<select class="select" name="objectiveId">${opt(S.objectives.map(o => [o.id, o.name]), k.objectiveId)}</select>`, true)}</div>`;
        case 1: return `<div class="form-grid">${f('Process', `<select class="select" name="process"><option value="">— Organization level —</option>${Q.topProcesses().map(p => `<option value="${p.process_id}"${p.process_id === k.process ? ' selected' : ''}>${esc(p.process_code)} ${esc(p.name)}</option>`).join('')}</select>`)}${f('Department', `<select class="select" name="department"><option value="">— Not department-specific —</option>${opt(depts, k.department)}</select>`)}${f('ISO 9001 clauses', `<input class="input" name="iso" value="${esc((k.iso || []).join(', '))}">`, false, 'e.g. 6.2, 9.1.1')}</div><p class="small muted" style="margin-top:10px">A KPI can belong to a process, a department, both, or the whole organization.</p>`;
        case 2: return `<div class="form-grid">${f('Unit', `<input class="input" name="unit" value="${esc(k.unit || '')}" placeholder="%, days, count…">`)}${f('Target operator', `<select class="select" name="dir">${opt([['≥', '≥ at least'], ['≤', '≤ at most'], ['=', '= exactly']], k.dir)}</select>`)}${f('Target <span class="req">*</span>', `<input class="input tnum" type="number" step="any" name="target" required value="${esc(k.target ?? '')}">`)}${f('Frequency', `<select class="select" name="frequency">${opt(K.FREQ, k.frequency)}</select>`)}</div>`;
        case 3: return `<div class="form-grid">${f('Aggregation', `<select class="select" name="aggregation">${opt(K.AGG, k.aggregation)}</select>`, true, 'How underlying records become the period result. Individual percentages are only averaged when “Average” is chosen.')}${f('Formula / calculation rule', `<input class="input" name="formula" value="${esc(k.formula || '')}" placeholder="e.g. Completed ÷ Assigned × 100">`, true)}${k.aggregation === 'custom' ? f('Custom formula', `<input class="input" name="customFormula" value="${esc(k.customFormula || 'SUM_NUM / SUM_DEN * 100')}">`, true, 'Use SUM_NUM, SUM_DEN, COUNT, SUM, AVG, MIN, MAX.') : ''}${f('Numerator label', `<input class="input" name="numLabel" value="${esc(k.numLabel || '')}" placeholder="e.g. Completed">`)}${f('Denominator label', `<input class="input" name="denLabel" value="${esc(k.denLabel || '')}" placeholder="e.g. Assigned">`)}${f('Minimum sample size', `<input class="input" type="number" name="minSample" value="${esc(k.minSample ?? '')}">`)}</div>
          <fieldset class="field full kp-fs"><legend>Dimensions recorded per measurement</legend><div class="kp-checks">${Object.entries(K.DIMS).map(([d, l]) => `<label class="checkbox"><input type="checkbox" name="dims" value="${d}" ${(k.dims || []).includes(d) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div></fieldset>
          <fieldset class="field full kp-fs"><legend>Consolidate results by (optional)</legend><div class="kp-checks">${['team', 'department', 'process', 'site', 'branch', 'organization'].map(d => `<label class="checkbox"><input type="checkbox" name="hierarchy" value="${d}" ${(k.hierarchy || []).includes(d) ? 'checked' : ''}>${esc(K.DIMS[d] || 'Organization')}</label>`).join('')}</div><span class="help">Only configured levels are consolidated.</span></fieldset>`;
        case 4: return `<div class="kp-methods">${['external', 'manual', 'import', 'survey', 'internal', 'integration'].map(x => `<label class="kp-mopt${k.method === x ? ' on' : ''}"><input type="radio" name="method" value="${x}" ${k.method === x ? 'checked' : ''}>${icon(K.METHODS[x].icon)}<span><b>${esc(K.METHODS[x].long)}</b><span>${esc(K.METHODS[x].desc)}</span></span></label>`).join('')}</div>
          ${k.method === 'survey' ? `<div class="form-grid" style="margin-top:12px">${f('Survey / evaluation', `<select class="select" name="survey"><option value="">— Choose —</option>${opt(S.kpiSurveys.map(x => [x.id, x.name]), k.survey)}</select>`)}</div>` : ''}
          ${k.method === 'internal' ? `<p class="small muted" style="margin-top:12px">Source: Corrective Action register (CAPA). Numerator: actions closed on or before their due date. Denominator: actions due in the period.</p>` : ''}
          ${k.method === 'integration' ? `<p class="small muted" style="margin-top:12px">The connection (system, dataset, mapping, refresh) is configured by an administrator once the integration service is available.</p>` : ''}`;
        case 5: return `<div class="form-grid">${f('KPI owner', `<select class="select" name="owner">${Q.peopleOptions(k.owner)}</select>`, false, 'Accountable for the KPI — not necessarily the person measured.')}${f('Data owner / collector', `<select class="select" name="dataOwner">${Q.peopleOptions(k.dataOwner)}</select>`)}${f('Reviewer / approver', `<select class="select" name="reviewer">${Q.peopleOptions(k.reviewer)}</select>`)}${f('Notes', `<textarea class="textarea" name="notes" rows="2">${esc(k.notes || '')}</textarea>`, true)}</div>`;
        default: return `<dl class="kp-dl kp-dl-wide"><dt>KPI</dt><dd><b>${esc(k.name || '—')}</b> (${esc(k.id)})</dd><dt>Objective</dt><dd>${esc(K.objective(k.objectiveId)?.name || '—')}</dd><dt>Scope</dt><dd>${k.process ? esc(Q.plabel(k.process)) : 'Organization'}${k.department ? ` · ${esc(k.department)}` : ''}</dd>
          <dt>Target</dt><dd>${esc(k.dir)} ${esc(k.target)}${esc(k.unit || '')} · ${esc(k.frequency)}</dd><dt>Measurement</dt><dd>${esc(K.aggLabel(k.aggregation))}${k.formula ? ` — ${esc(k.formula)}` : ''}${(k.dims || []).length ? ` · by ${k.dims.map(d => K.DIMS[d]).join(', ')}` : ''}</dd>
          <dt>Collection</dt><dd>${esc(K.METHODS[k.method].long)}</dd><dt>Responsibility</dt><dd>Owner ${esc(Q.pname(k.owner))} · data ${esc(Q.pname(k.dataOwner))} · reviewer ${esc(Q.pname(k.reviewer))}</dd></dl>`;
      } };
    const draw = () => {
      m.querySelector('#kpEdNav').innerHTML = SECTIONS.map((s, i) => `<button type="button" data-sec="${i}" class="${i === step ? 'on' : ''}"><span class="n">${i + 1}</span>${s}</button>`).join('');
      m.querySelector('#kpEdBody').innerHTML = `<h3 class="kp-ed-h">${SECTIONS[step]}</h3><form onsubmit="return false">${sec()}</form>`;
      m.querySelector('#kpEdFoot').innerHTML = `<button class="btn" type="button" data-close-e>Cancel</button><span class="grow"></span>${step ? '<button class="btn" type="button" data-prev>Back</button>' : ''}${step < 6 ? '<button class="btn" type="button" data-nxt>Next</button>' : ''}<button class="btn primary" type="button" data-save>${isNew ? 'Create KPI' : 'Save Changes'}</button>`;
      Q.refreshIcons(); Q.enhanceSelects(m);
      m.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => { read(); step = +b.dataset.sec; draw(); }));
      m.querySelectorAll('#kpEdBody [name="method"], #kpEdBody [name="aggregation"]').forEach(x => x.addEventListener('change', () => { read(); draw(); }));
      m.querySelector('[data-close-e]').addEventListener('click', () => Q.closeModal());
      m.querySelector('[data-prev]')?.addEventListener('click', () => { read(); step--; draw(); });
      m.querySelector('[data-nxt]')?.addEventListener('click', () => { read(); step++; draw(); });
      m.querySelector('[data-save]').addEventListener('click', save);
    };
    const save = () => { read(); k.active = k.active === true || k.active === 'true';
      if (!k.name.trim()) { step = 0; draw(); Q.toast('Give the KPI a name'); return; }
      if (k.target == null || isNaN(k.target)) { step = 2; draw(); Q.toast('Set a target'); return; }
      if (isNew) { k.period = K.label(k.frequency, Q.today().slice(0, 7)); S.kpis.push(k); K.log(k, `created the KPI with target ${k.dir} ${k.target}${k.unit || ''} (${K.METHODS[k.method].long})`, 'definition'); Q.save(); Q.closeAllModals(); Q.go(`#/qms/objectives/k/${k.id}`); Q.toast('KPI created', k.name); return; }
      const o = k0, changes = [];
      if (o.target !== k.target || o.dir !== k.dir) changes.push([`changed the target from ${o.dir} ${o.target}${o.unit || ''} to ${k.dir} ${k.target}${k.unit || ''}`, 'target']);
      if (o.method !== k.method) changes.push([`changed the collection method from ${K.METHODS[o.method]?.label} to ${K.METHODS[k.method].label} (from the next period; earlier results keep their method)`, 'method']);
      if (o.aggregation !== k.aggregation) changes.push([`changed the aggregation from ${K.aggLabel(o.aggregation)} to ${K.aggLabel(k.aggregation)}`, 'definition']);
      ['owner', 'dataOwner', 'reviewer'].forEach(x => { if (o[x] !== k[x]) changes.push([`changed the ${x === 'dataOwner' ? 'data owner' : x} from ${Q.pname(o[x])} to ${Q.pname(k[x])}`, 'definition']); });
      if (!changes.length && JSON.stringify(o) !== JSON.stringify(k)) changes.push(['updated the KPI definition', 'definition']);
      Object.assign(o, k); changes.forEach(([t, kind]) => K.log(o, t, kind));
      done('KPI saved', changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} recorded in the history` : 'No changes'); };
    draw();
  };
  Q.actions['kpi-edit'] = d => K.editor(kOf(d), +(d.step || 0));
  Q.actions['kpi-new'] = () => K.editor(null);
})();
