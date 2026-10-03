/* iQMS — Objectives & KPIs (Update 19): one generic KPI engine.
 *
 *   Quality objective → KPI definition → collection method → measurement records (optional)
 *   → calculation / consolidation → KPI period result → review / approval → evidence
 *
 * Collections in Q.S (all optional for a KPI):
 *   objectives   quality objectives              kpis         KPI definitions (existing records, extended)
 *   kpiResults   one record per KPI per period    kpiRecords   underlying measurement records
 *   kpiCycles    collection cycles                kpiImports   import batches
 *   kpiSurveys   survey / evaluation sources      kpiLog       definition and result history
 *
 * Backward compatibility: k.actual, k.period and k.trend are kept as a cache of the approved period
 * results (Q.kpiSync), so the Overview, process workspace, management review and search keep working. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const SEED = window.QMS_KPI || {};
  const K = Q.K = {};

  /* ============================================================ vocabulary */
  K.METHODS = {
    external: { label: 'Final result', long: 'Record final result', icon: 'file-check', desc: 'The KPI is calculated somewhere else (Excel, ERP, CRM, HRIS, a report). Only the official result is recorded here.' },
    manual: { label: 'Manual records', long: 'Manual measurement entry', icon: 'table', desc: 'Underlying records are entered in a table; iQMS calculates the result.' },
    import: { label: 'Excel / CSV import', long: 'Excel / CSV import', icon: 'upload', desc: 'Underlying records are imported from a spreadsheet with column mapping and validation.' },
    survey: { label: 'Survey', long: 'Survey / evaluation', icon: 'clipboard-check', desc: 'Responses to a survey or evaluation become measurement records.' },
    internal: { label: 'Internal QMS', long: 'Internal QMS data', icon: 'server', desc: 'Calculated from records already in iQMS (corrective actions, audits, documents).' },
    integration: { label: 'Integration', long: 'External system / integration', icon: 'plug', desc: 'Records come from a connected system (ERP, CRM, HRIS, SharePoint, API).' },
    legacy: { label: 'Existing record', long: 'Existing KPI record', icon: 'history', desc: 'Value recorded before collection methods were configured.' }
  };
  K.AGG = [
    ['external', 'No calculation — final result provided externally'], ['average', 'Average'], ['weighted', 'Weighted average'], ['percentage', 'Percentage (Σ numerator ÷ Σ denominator × 100)'],
    ['ratio', 'Ratio (Σ numerator ÷ Σ denominator)'], ['sum', 'Sum'], ['count', 'Count'], ['min', 'Minimum'], ['max', 'Maximum'], ['median', 'Median'], ['latest', 'Latest value'],
    ['passrate', 'Pass rate'], ['custom', 'Custom formula']];
  K.aggLabel = a => (K.AGG.find(x => x[0] === a) || [, a])[1];
  K.FREQ = ['Monthly', 'Quarterly', 'Semiannual', 'Annual', 'YTD'];
  K.DIMS = { person: 'Person', team: 'Team', department: 'Department', process: 'Process', project: 'Project', customer: 'Customer', supplier: 'Supplier', site: 'Site', branch: 'Branch', location: 'Location' };
  K.SOURCES = ['Existing KPI Record', 'Excel / Spreadsheet', 'ERP', 'CRM', 'HRIS', 'SharePoint', 'External Report', 'Other'];
  K.RSTATUS = { Draft: 'neutral', 'For Review': 'info', Approved: 'success', Returned: 'orange', Superseded: 'muted' };
  K.CSTATUS = ['Draft', 'Collecting', 'Ready to Calculate', 'Calculated', 'For Review', 'Approved', 'Closed'];
  K.CKIND = { Draft: 'neutral', Collecting: 'info', 'Ready to Calculate': 'warning', Calculated: 'info', 'For Review': 'info', Approved: 'success', Closed: 'muted' };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ============================================================ accessors */
  K.kpi = id => Q.S.kpis.find(k => k.id === id);
  K.results = (k, { all = false } = {}) => (Q.S.kpiResults || []).filter(r => r.kpi === k.id && (all || r.status !== 'Superseded')).sort((a, b) => a.key < b.key ? 1 : a.key > b.key ? -1 : (a.recordedAt < b.recordedAt ? 1 : -1));
  K.approved = k => K.results(k).filter(r => r.status === 'Approved');
  K.latest = k => K.approved(k)[0] || null;
  K.prev = k => K.approved(k)[1] || null;
  K.result = id => (Q.S.kpiResults || []).find(r => r.id === id);
  K.records = (k, period) => (Q.S.kpiRecords || []).filter(r => r.kpi === k.id && (!period || r.period === period));
  K.cycles = k => (Q.S.kpiCycles || []).filter(c => c.kpi === k.id).sort((a, b) => a.key < b.key ? 1 : -1);
  K.cycle = id => (Q.S.kpiCycles || []).find(c => c.id === id);
  K.survey = id => (Q.S.kpiSurveys || []).find(s => s.id === id);
  K.objective = id => (Q.S.objectives || []).find(o => o.id === id);
  K.objOf = k => K.objective(k.objectiveId) || (Q.S.objectives || []).find(o => o.name === k.objective);
  K.ok = (k, v) => k.dir === '≥' ? v >= k.target : k.dir === '≤' ? v <= k.target : Number(v) === Number(k.target);
  K.fmt = (v, k) => v == null || v === '' || isNaN(v) ? '—' : `${Math.round(v * 10) / 10}${k.unit || ''}`;
  K.targetText = k => `${k.dir} ${Q.kpiFmt(k.target, k)}`;
  K.statusBadge = (k, v) => v == null ? Q.ui.badge('No result', 'neutral') : K.ok(k, v) ? Q.ui.badge('On target', 'success') : Q.ui.badge('Below target', 'danger');
  K.methodOf = k => k.method || 'external';
  K.methodChip = m => `<span class="kp-method">${icon((K.METHODS[m] || K.METHODS.external).icon)}${esc((K.METHODS[m] || K.METHODS.external).label)}</span>`;
  K.dept = k => k.department || '';
  const uid = (p, list) => { let n = list.length + 1, id; do { id = `${p}-${String(n).padStart(4, '0')}`; n++; } while (list.some(x => x.id === id)); return id; };
  K.log = (k, text, kind = 'result', who = Q.me()) => { (Q.S.kpiLog = Q.S.kpiLog || []).unshift({ kpi: k.id, at: `${Q.today()} ${new Date().toTimeString().slice(0, 5)}`, who, text, kind }); };

  /* ============================================================ periods */
  // Sortable key (YYYY-MM) for a period label: "Q3 2026", "Sep 2026", "YTD Aug 2026", "H1 2026", "2026".
  K.key = (label, asOf) => {
    if (asOf) return asOf;
    const s = String(label || '').trim();
    let m = s.match(/Q([1-4])\s+(\d{4})/i); if (m) return `${m[2]}-${String(m[1] * 3).padStart(2, '0')}`;
    m = s.match(/H([12])\s+(\d{4})/i); if (m) return `${m[2]}-${m[1] === '1' ? '06' : '12'}`;
    m = s.match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/); if (m && MON.includes(m[1].slice(0, 1).toUpperCase() + m[1].slice(1, 3).toLowerCase())) return `${m[2]}-${String(MON.indexOf(m[1].slice(0, 1).toUpperCase() + m[1].slice(1, 3).toLowerCase()) + 1).padStart(2, '0')}`;
    m = s.match(/(\d{4})/); if (m) return `${m[1]}-12`;
    return '0000-00';
  };
  const ym = key => { const [y, m] = key.split('-').map(Number); return { y, m }; };
  K.label = (freq, key) => { const { y, m } = ym(key);
    if (freq === 'Quarterly') return `Q${Math.ceil(m / 3)} ${y}`; if (freq === 'Semiannual') return `H${m <= 6 ? 1 : 2} ${y}`; if (freq === 'Annual') return String(y);
    if (freq === 'YTD') return `YTD ${MON[m - 1]} ${y}`; return `${MON[m - 1]} ${y}`; };
  K.step = freq => ({ Quarterly: 3, Semiannual: 6, Annual: 12 })[freq] || 1;
  K.shiftKey = (key, months) => { const { y, m } = ym(key); const t = y * 12 + (m - 1) + months; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; };
  K.freqOf = period => /^Q[1-4]/i.test(period) ? 'Quarterly' : /^H[12]/i.test(period) ? 'Semiannual' : /^YTD/i.test(period) ? 'YTD' : /^\d{4}$/.test(period) ? 'Annual' : 'Monthly';
  // Period choices for a form: next period first, then the latest ones.
  K.periodOptions = k => { const last = K.latest(k)?.key || K.key(k.period), st = K.step(k.frequency);
    return [K.shiftKey(last, st), last, K.shiftKey(last, -st), K.shiftKey(last, -2 * st)].map(x => K.label(k.frequency, x)); };

  /* ============================================================ calculation */
  const num = v => v === '' || v == null || isNaN(Number(v)) ? null : Number(v);
  K.recValue = (k, r) => { if (num(r.value) != null) return num(r.value); const n = num(r.numerator), d = num(r.denominator); return n != null && d ? (k.unit === '%' ? n / d * 100 : n / d) : null; };
  const r1 = v => v == null || !isFinite(v) ? null : Math.round(v * 10) / 10;
  // Consolidate records with the KPI's aggregation rule. Never averages percentages unless the rule says so.
  K.calc = (k, recs, agg = k.aggregation) => {
    const rows = recs.filter(r => r.status !== 'Excluded'), warn = [];
    const vals = rows.map(r => K.recValue(k, r)).filter(v => v != null), sn = rows.reduce((s, r) => s + (num(r.numerator) || 0), 0), sd = rows.reduce((s, r) => s + (num(r.denominator) || 0), 0);
    const skipped = rows.length - vals.length;
    let value = null, how = '';
    const sorted = vals.slice().sort((a, b) => a - b);
    switch (agg) {
      case 'average': value = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null; how = `Average of ${vals.length} values`; break;
      case 'weighted': value = sd ? sn / sd * (k.unit === '%' ? 100 : 1) : null; how = `Weighted average: Σ ${k.numLabel || 'numerator'} ${sn} ÷ Σ ${k.denLabel || 'denominator'} ${sd}${k.unit === '%' ? ' × 100' : ''}`; break;
      case 'percentage': value = sd ? sn / sd * 100 : null; how = `Σ ${k.numLabel || 'numerator'} ${sn} ÷ Σ ${k.denLabel || 'denominator'} ${sd} × 100`; break;
      case 'ratio': value = sd ? sn / sd : null; how = `Σ numerator ${sn} ÷ Σ denominator ${sd}`; break;
      case 'sum': value = vals.reduce((s, v) => s + v, 0); how = `Sum of ${vals.length} values`; break;
      case 'count': value = rows.length; how = `Count of ${rows.length} records`; break;
      case 'min': value = sorted[0] ?? null; how = `Lowest of ${vals.length} values`; break;
      case 'max': value = sorted.at(-1) ?? null; how = `Highest of ${vals.length} values`; break;
      case 'median': value = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null; how = `Median of ${vals.length} values`; break;
      case 'latest': { const l = rows.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1).find(r => K.recValue(k, r) != null); value = l ? K.recValue(k, l) : null; how = 'Latest recorded value'; break; }
      case 'passrate': { const pass = rows.filter(r => r.status === 'Pass' || (r.status !== 'Fail' && K.recValue(k, r) != null && K.ok(k, K.recValue(k, r)))).length; value = rows.length ? pass / rows.length * 100 : null; how = `${pass} of ${rows.length} records pass`; break; }
      case 'custom': { const env = { SUM_NUM: sn, SUM_DEN: sd, COUNT: rows.length, SUM: vals.reduce((s, v) => s + v, 0), AVG: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0, MIN: sorted[0] || 0, MAX: sorted.at(-1) || 0 };
        const expr = (k.customFormula || 'SUM_NUM / SUM_DEN * 100').toUpperCase();
        if (/^[\sA-Z_0-9.+\-*/()]+$/.test(expr)) { try { value = Function(...Object.keys(env), `return (${expr});`)(...Object.values(env)); } catch (_) { warn.push('The custom formula could not be evaluated.'); } }
        else warn.push('The custom formula contains unsupported characters.');
        how = `Custom formula: ${k.customFormula || 'SUM_NUM / SUM_DEN * 100'}`; break; }
      default: value = null; how = 'Final result provided externally — no calculation';
    }
    if (skipped) warn.push(`${skipped} record${skipped === 1 ? ' has' : 's have'} no value and ${skipped === 1 ? 'was' : 'were'} left out.`);
    if (k.minSample && rows.length < k.minSample) warn.push(`Only ${rows.length} records — the minimum sample is ${k.minSample}.`);
    return { value: r1(value), n: rows.length, sumNum: sn, sumDen: sd, how, warnings: warn };
  };
  // Consolidation by the configured hierarchy (e.g. person → team → department → organization).
  K.rollup = (k, recs) => (k.hierarchy || []).filter(l => l !== 'person').map(level => {
    if (level === 'organization') return { level, groups: [{ name: Q.S.organization.name, ...K.calc(k, recs) }] };
    const by = {}; recs.forEach(r => { const g = r.dims?.[level] || '—'; (by[g] = by[g] || []).push(r); });
    return { level, groups: Object.entries(by).map(([name, rs]) => ({ name, ...K.calc(k, rs) })).sort((a, b) => a.name < b.name ? -1 : 1) };
  });

  /* ============================================================ keep the legacy fields in step */
  K.sync = k => {
    const ap = K.approved(k).slice().reverse();
    if (!ap.length) return;
    const last = ap.at(-1);
    k.actual = last.value; k.period = last.period; k.trend = ap.slice(-6).map(r => r.value);
    while (k.trend.length < 2) k.trend.unshift(k.trend[0]);
  };
  K.syncAll = () => Q.S.kpis.forEach(K.sync);

  /* ============================================================ results */
  // Create a period result. Earlier results for the same period are kept as Superseded.
  K.addResult = (k, o) => {
    const list = Q.S.kpiResults = Q.S.kpiResults || [];
    const r = { id: uid('KR', list), kpi: k.id, period: o.period, key: o.key || K.key(o.period, o.asOf), value: r1(Number(o.value)), numerator: num(o.numerator), denominator: num(o.denominator), unit: k.unit,
      target: k.target, dir: k.dir, method: o.method || 'external', source: o.source || { type: 'Other' }, records: o.records || 0, recordIds: o.recordIds || null, cycle: o.cycle || null, batch: o.batch || null,
      calc: o.calc || null, notes: o.notes || '', status: o.status || 'Approved', recordedBy: o.recordedBy || Q.me(), recordedAt: o.recordedAt || Q.today(),
      reviewedBy: o.reviewedBy || null, reviewedAt: o.reviewedAt || null, override: o.override || null };
    if (r.status === 'Approved') list.filter(x => x.kpi === k.id && x.period === r.period && x.status === 'Approved').forEach(x => { x.status = 'Superseded'; x.supersededBy = r.id; });
    list.push(r); K.sync(k); return r;
  };
  K.approve = (r, who = Q.me()) => {
    const k = K.kpi(r.kpi);
    Q.S.kpiResults.filter(x => x.kpi === r.kpi && x.period === r.period && x.status === 'Approved' && x.id !== r.id).forEach(x => { x.status = 'Superseded'; x.supersededBy = r.id; });
    Object.assign(r, { status: 'Approved', reviewedBy: who, reviewedAt: Q.today() });
    const c = r.cycle && K.cycle(r.cycle); if (c) { c.status = 'Approved'; c.resultId = r.id; }
    K.sync(k); K.log(k, `approved the ${r.period} result ${K.fmt(r.value, k)}`, 'approval', who);
  };

  /* ============================================================ start-up: migrate the existing KPI records */
  let rnd = 7; const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const reviewerFor = k => k.owner === 'maria' ? 'eric' : 'maria';
  const deptOf = id => Q.person(id).dept || '';
  function defaults(k) {
    const cfg = SEED.config?.[k.id] || {};
    Object.assign(k, { department: deptOf(k.owner), dataOwner: k.owner, reviewer: reviewerFor(k), frequency: K.freqOf(k.period), aggregation: 'external', method: 'external',
      formula: '', minSample: null, active: true, iso: ['6.2', '9.1.1'], notes: '', dims: [], hierarchy: [], description: '', numLabel: '', denLabel: '' }, cfg);
    delete k.cfg;
  }
  function buildObjectives() {
    const names = [...new Set(Q.S.kpis.map(k => k.objective))];
    Q.S.objectives = names.map((name, i) => { const ks = Q.S.kpis.filter(k => k.objective === name);
      return { id: `QO-${String(i + 1).padStart(2, '0')}`, name, description: '', owner: ks[0].owner, processes: [...new Set(ks.map(k => k.process))], department: deptOf(ks[0].owner),
        iso: ['6.2'], start: '2026-01-01', end: '2026-12-31', status: 'Active' }; });
    Q.S.kpis.forEach(k => { k.objectiveId = Q.S.objectives.find(o => o.name === k.objective)?.id; });
  }
  // The six values each KPI already had become period results, oldest first, ending at the current period.
  function legacyResults(k) {
    const n = k.trend.length, lastKey = K.key(k.period, /^YTD \d{4}$/.test(k.period) ? `${k.period.slice(-4)}-09` : null), st = K.step(k.frequency);
    return k.trend.map((v, i) => { const key = K.shiftKey(lastKey, -(n - 1 - i) * st), last = i === n - 1;
      return { period: last ? k.period : K.label(k.frequency, key), key, value: last ? k.actual : v, method: 'legacy', status: 'Approved',
        source: { type: 'Existing KPI Record', ref: 'KPI register — value recorded before collection methods were configured' },
        recordedBy: k.owner, recordedAt: Q.addDays(Q.today(), -(n - 1 - i) * 30 * st - 3), reviewedBy: reviewerFor(k), reviewedAt: Q.addDays(Q.today(), -(n - 1 - i) * 30 * st - 1) }; });
  }
  const recs = () => Q.S.kpiRecords;
  const addRec = (k, o) => { const r = { id: uid('MR', recs()), kpi: k.id, status: 'Valid', submittedBy: k.dataOwner || k.owner, ...o }; recs().push(r); return r; };
  function seedExtras() {
    const today = Q.today(), d = n => Q.addDays(today, n);
    // K-16 — new KPI with people → teams → departments → organization.
    (SEED.newKpis || []).forEach(nk => { if (K.kpi(nk.id)) return; const k = { id: nk.id, name: nk.name, process: nk.process, objective: nk.objective, target: nk.target, dir: nk.dir, actual: null, unit: nk.unit, trend: [], owner: nk.owner, period: nk.period };
      Q.S.kpis.push(k); defaults(k); Object.assign(k, nk.cfg); k.objectiveId = Q.S.objectives.find(o => o.name === k.objective)?.id; });
    const k16 = K.kpi('K-16');
    if (k16 && SEED.crew) {
      ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'].forEach((p, mi) => {
        const ids = SEED.crew.map(([who, team, dept], i) => { const den = dept === 'Electrical' ? 14 : 20, nmr = Math.max(8, Math.min(den, Math.round(den * (0.84 + mi * 0.012 + rand() * 0.12))));
          return addRec(k16, { period: p, date: d(-150 + mi * 30 + (i % 5)), dims: { person: who, team, department: dept }, numerator: nmr, denominator: den, source: 'Manual entry', ref: `Team lead sheet ${p}`, submittedBy: dept === 'Electrical' ? 'ana' : 'carlos', cycle: `KC-16-${mi}` }).id; });
        const rs = K.records(k16, p), c = K.calc(k16, rs);
        Q.S.kpiCycles.push({ id: `KC-16-${mi}`, kpi: 'K-16', period: p, key: K.key(p), method: 'manual', status: 'Closed', owner: 'carlos', expected: SEED.crew.length, created: d(-155 + mi * 30), resultId: null });
        const r = K.addResult(k16, { period: p, value: c.value, numerator: c.sumNum, denominator: c.sumDen, method: 'manual', records: rs.length, recordIds: ids, cycle: `KC-16-${mi}`, calc: { agg: k16.aggregation, how: c.how, n: c.n },
          source: { type: 'Manual measurement entry', ref: `${rs.length} installer records entered by team leads` }, recordedBy: 'carlos', recordedAt: d(-148 + mi * 30), reviewedBy: 'maria', reviewedAt: d(-146 + mi * 30) });
        Q.S.kpiCycles.at(-1).resultId = r.id;
      });
      // Sep 2026: collection in progress.
      Q.S.kpiCycles.push({ id: 'KC-2026-031', kpi: 'K-16', period: 'Sep 2026', key: '2026-09', method: 'manual', status: 'Collecting', owner: 'carlos', expected: SEED.crew.length, created: d(-12), resultId: null, due: d(5) });
      SEED.crew.forEach(([who, team, dept], i) => { const v = SEED.crewSep[i]; if (!v) return;
        addRec(k16, { period: 'Sep 2026', date: d(-8 + (i % 6)), dims: { person: who, team, department: dept }, numerator: v[0], denominator: v[1], source: 'Manual entry', ref: 'Team lead sheet Sep 2026', submittedBy: dept === 'Electrical' ? 'ana' : 'carlos', cycle: 'KC-2026-031' }); });
    }
    // K-01 — Q3 2026 result comes from 42 survey responses.
    const k01 = K.kpi('K-01'), q3 = Q.S.kpiResults.find(r => r.kpi === 'K-01' && r.period === 'Q3 2026' && r.status === 'Approved');
    if (k01 && q3 && SEED.csatQ3) {
      const ids = SEED.csatQ3.map((score, i) => addRec(k01, { period: 'Q3 2026', date: d(-88 + i * 2), dims: { customer: SEED.customers[i % SEED.customers.length], project: `SP-2026-${String(60 + i).padStart(3, '0')}` }, value: score, source: 'Survey', ref: `Response CS-${String(1180 + i)}`, submittedBy: 'grace', cycle: 'KC-2026-027' }).id);
      const c = K.calc(k01, K.records(k01, 'Q3 2026'));
      Q.S.kpiCycles.push({ id: 'KC-2026-027', kpi: 'K-01', period: 'Q3 2026', key: '2026-09', method: 'survey', status: 'Approved', owner: 'grace', expected: null, created: d(-92), resultId: q3.id, survey: 'SV-CSAT' });
      Object.assign(q3, { method: 'survey', value: c.value, records: ids.length, recordIds: ids, cycle: 'KC-2026-027', calc: { agg: 'average', how: c.how, n: c.n }, recordedBy: 'grace',
        source: { type: 'Survey', system: 'Survey tool', ref: 'Customer Satisfaction Survey — Q3 2026 responses' } });
    }
    // K-06 — method changed over time: 2025 external result → Q1 2026 Excel import → Q3 2026 ERP integration.
    const k06 = K.kpi('K-06');
    if (k06) {
      (SEED.otdEarly || []).forEach(([p, v, m], i) => K.addResult(k06, { period: p, value: v, method: m, recordedBy: 'joy', recordedAt: d(-440 + i * 30), reviewedBy: 'maria', reviewedAt: d(-438 + i * 30),
        records: m === 'import' ? 6 : 0, batch: m === 'import' ? `IMP-OTD-${p.slice(0, 3)}` : null,
        source: m === 'external' ? { type: 'Excel / Spreadsheet', system: 'Finance', ref: `Supplier delivery report ${p}`, link: 'https://heliossolar.sharepoint.com/sites/Finance/Reports/Supplier-OTD.xlsx' } : { type: 'Excel / Spreadsheet', system: 'ERP export', ref: `ERP receipts ${p}.xlsx` } }));
      Q.S.kpiResults.filter(r => r.kpi === 'K-06' && r.method === 'legacy').forEach(r => { const integ = r.key >= '2026-07';
        r.method = integ ? 'integration' : 'import';
        r.source = integ ? { type: 'Integration', system: 'ERP', ref: `Purchase order receipts — ${r.period} (sample sync)` } : { type: 'Excel / Spreadsheet', system: 'ERP export', ref: `ERP receipts ${r.period}.xlsx` };
        r.records = 6; if (!integ) r.batch = `IMP-OTD-${r.period.slice(0, 3)}`; });
      const sep = Q.S.kpiResults.find(r => r.kpi === 'K-06' && r.period === 'Sep 2026' && r.status === 'Approved');
      if (sep) { const split = [[28, 32], [22, 27], [19, 22], [24, 28], [15, 20], [18, 21]];
        sep.recordIds = (SEED.suppliers || []).map((s, i) => addRec(k06, { period: 'Sep 2026', date: d(-6), dims: { supplier: s }, numerator: split[i][0], denominator: split[i][1], source: 'ERP (sample sync)', ref: `PO receipts ${s}`, submittedBy: 'joy' }).id);
        const c = K.calc(k06, K.records(k06, 'Sep 2026')); Object.assign(sep, { value: c.value, numerator: c.sumNum, denominator: c.sumDen, records: c.n, calc: { agg: 'percentage', how: c.how, n: c.n } }); }
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].forEach((m, i) => Q.S.kpiImports.push({ id: `IMP-OTD-${m}`, kpi: 'K-06', period: `${m} 2026`, file: `ERP receipts ${m} 2026.xlsx`, rows: 6, imported: 6, rejected: 0, warnings: 0, by: 'joy', at: d(-260 + i * 30) }));
    }
    // K-11 — YTD result imported from the HRIS export (48 rows).
    const k11 = K.kpi('K-11'), ytd = Q.S.kpiResults.find(r => r.kpi === 'K-11' && r.status === 'Approved' && r.period === k11?.period);
    if (k11 && ytd) {
      const depts = ['Operations', 'Operations', 'Operations', 'Electrical', 'Engineering', 'Commercial', 'Supply Chain', 'Quality & Compliance'];
      let sn = 0, sd = 0; const rows = [];
      for (let i = 0; i < 48; i++) { const den = i < 8 ? 5 : 4, nmr = den - (i % 2 === 0 ? 1 : 0) - (i % 3 === 0 ? 1 : 0) - (i % 12 === 0 ? 1 : 0); rows.push([den, nmr]); sn += nmr; sd += den; }
      ytd.recordIds = rows.map(([den, nmr], i) => addRec(k11, { period: ytd.period, date: d(-5), dims: { person: `Employee ${String(i + 1).padStart(3, '0')}`, department: depts[i % depts.length] }, numerator: nmr, denominator: den, source: 'Excel / CSV import', ref: `Row ${i + 2}`, batch: 'IMP-2026-014', submittedBy: 'rosa' }).id);
      const c = K.calc(k11, K.records(k11, ytd.period));
      Q.S.kpiImports.push({ id: 'IMP-2026-014', kpi: 'K-11', period: ytd.period, file: 'HRIS_training_export_Sep2026.csv', rows: 50, imported: 48, rejected: 2, warnings: 3, by: 'rosa', at: d(-5),
        errors: [['51', 'Employee name missing'], ['52', 'Completed “n/a” is not a number']] });
      Object.assign(ytd, { method: 'import', value: c.value, numerator: c.sumNum, denominator: c.sumDen, records: c.n, batch: 'IMP-2026-014', calc: { agg: 'percentage', how: c.how, n: c.n }, recordedBy: 'rosa',
        source: { type: 'Excel / Spreadsheet', system: 'HRIS export', ref: 'HRIS_training_export_Sep2026.csv' } });
    }
    // K-14 — final results only, from the management review action log.
    Q.S.kpiResults.filter(r => r.kpi === 'K-14' && r.key >= '2026-07').forEach(r => Object.assign(r, { method: 'external', recordedBy: 'eric',
      source: { type: 'Excel / Spreadsheet', system: 'SharePoint', ref: `Management review action log — ${r.period}`, link: 'https://heliossolar.sharepoint.com/sites/QMS/Shared%20Documents/MR-action-log.xlsx' } }));
    // History entries.
    Q.S.kpis.forEach(k => { Q.S.kpiLog.push({ kpi: k.id, at: `${d(-270)} 09:00`, who: k.owner, text: `defined the KPI with target ${k.dir} ${Q.kpiFmt(k.target, k)}`, kind: 'definition' }); });
    Q.S.kpiLog.push({ kpi: 'K-06', at: `${d(-280)} 10:00`, who: 'joy', text: 'changed the collection method from Final result to Excel / CSV import (from Jan 2026)', kind: 'method' },
      { kpi: 'K-06', at: `${d(-95)} 10:00`, who: 'maria', text: 'changed the collection method from Excel / CSV import to Integration — ERP purchasing (from Jul 2026)', kind: 'method' },
      { kpi: 'K-11', at: `${d(-5)} 15:10`, who: 'rosa', text: 'imported HRIS_training_export_Sep2026.csv — 48 records imported, 2 rejected', kind: 'import' },
      { kpi: 'K-01', at: `${d(-120)} 11:00`, who: 'grace', text: 'connected the KPI to Customer Satisfaction Survey (minimum 10 responses per quarter)', kind: 'method' },
      { kpi: 'K-13', at: `${d(-60)} 09:30`, who: 'maria', text: 'set the KPI to calculate from the Corrective Action register', kind: 'method' },
      { kpi: 'K-11', at: `${d(-200)} 14:00`, who: 'maria', text: 'changed the target from ≥ 85% to ≥ 90%', kind: 'target' });
    Q.S.kpiLog.sort((a, b) => a.at < b.at ? 1 : -1);
  }
  K.init = () => {
    const S = Q.S;
    if (S.kpiModel === 2) return;
    S.kpiResults = []; S.kpiRecords = []; S.kpiCycles = []; S.kpiImports = []; S.kpiLog = []; S.kpiSurveys = JSON.parse(JSON.stringify(SEED.surveys || []));
    S.kpis.forEach(defaults);
    buildObjectives();
    S.kpis.forEach(k => legacyResults(k).forEach(r => K.addResult(k, r)));
    seedExtras();
    // Saved views that came with the app also show the source method.
    (S.savedViews?.kpis || []).forEach(v => { if (!v.seed || !Array.isArray(v.columns)) return;
      if (['k-all', 'k-below', 'k-on'].includes(v.id)) v.columns = ['name', 'process', 'target', 'actual', 'trend', 'period', 'status', 'method', 'owner'];
      else if (!v.columns.includes('method')) { const i = v.columns.indexOf('owner'); v.columns.splice(i < 0 ? v.columns.length : i, 0, 'method'); } });
    S.kpiModel = 2; K.syncAll(); Q.save();
  };
  const boot = Q.boot; Q.boot = () => { K.init(); boot(); };
})();
