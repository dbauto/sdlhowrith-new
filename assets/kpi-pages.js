/* iQMS — Objectives & KPIs (Update 19): pages.
 *   #/qms/objectives/k/<id>[/overview|measurements|collection|results|evidence|history]   KPI detail
 *   #/qms/objectives/c/<cycle id>                                                          collection cycle
 *   #/qms/objectives/goals                                                                 quality objectives */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const K = Q.K;
  const TABS = [['overview', 'Overview'], ['measurements', 'Measurements'], ['collection', 'Collection'], ['results', 'Results'], ['evidence', 'Evidence'], ['history', 'History']];
  const crumbs = extra => [['QMS', '#/qms/scope'], ['Objectives & KPIs', '#/qms/objectives'], ...extra];
  const dimsOf = k => (k.dims && k.dims.length ? k.dims : null);
  const fmt = (v, k) => K.fmt(v, k);

  /* ---------- trend chart: approved results over time, target line, method on hover ---------- */
  K.chart = (k, results) => {
    const pts = results.slice().reverse().slice(-12); if (pts.length < 2) return '<p class="small muted">The trend appears after two approved results.</p>';
    const W = 640, H = 200, L = 44, R = 30, T = 12, B = 30, vals = pts.map(r => r.value).concat(k.target);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.2 || 1; lo = Math.max(k.unit === '%' ? 0 : -Infinity, lo - pad); hi = hi + pad;
    const x = i => L + i * (W - L - R) / (pts.length - 1), y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const ticks = [lo, (lo + hi) / 2, hi].map(v => Math.round(v * 10) / 10);
    return `<svg class="kp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(k.name)} results: ${pts.map(r => `${r.period} ${fmt(r.value, k)}`).join(', ')}">
      ${ticks.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}${esc(k.unit || '')}</text>`).join('')}
      <line class="tg" x1="${L}" x2="${W - R}" y1="${y(k.target)}" y2="${y(k.target)}"/><text class="tgl" x="${W - R}" y="${y(k.target) - 5}" text-anchor="end">Target ${esc(k.dir)} ${k.target}${esc(k.unit || '')}</text>
      <polyline class="ln" points="${pts.map((r, i) => `${x(i)},${y(r.value)}`).join(' ')}"/>
      ${pts.map((r, i) => `<g class="pt ${K.ok(k, r.value) ? 'ok' : 'bad'}"><circle cx="${x(i)}" cy="${y(r.value)}" r="4"/><title>${esc(r.period)}: ${fmt(r.value, k)} · ${esc(K.METHODS[r.method]?.label || r.method)}</title></g>`).join('')}
      ${pts.map((r, i) => (pts.length <= 8 || i % 2 === pts.length % 2 || i === pts.length - 1) ? `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(/^YTD [A-Z]/.test(r.period) ? r.period.replace(/^YTD /, '') : r.period)}</text>` : '').join('')}
    </svg>`;
  };
  const metric = (label, value, note = '', tone = '') => `<div class="kp-metric${tone ? ' ' + tone : ''}"><span>${esc(label)}</span><b class="tnum">${value}</b>${note ? `<em>${note}</em>` : ''}</div>`;

  /* ============================================================ KPI detail */
  function detail(k, tab, q) {
    const cur = K.latest(k), prev = K.prev(k), results = K.results(k), pending = results.filter(r => ['For Review', 'Draft', 'Returned'].includes(r.status));
    const diff = cur && prev ? Math.round((cur.value - prev.value) * 10) / 10 : null, obj = K.objOf(k), M = K.METHODS[K.methodOf(k)];
    const meta = `<div class="kp-headmeta"><span class="kp-meta"><span class="tnum">${esc(k.id)}</span>${obj ? `<span>Objective: ${esc(obj.name)}</span>` : ''}${k.process ? `<span>${Q.pcell(k.process)}</span>` : '<span>Organization level</span>'}${k.department ? `<span>${esc(k.department)}</span>` : ''}<span>Owner ${esc(Q.pname(k.owner))}</span><span>${esc(k.frequency)}</span>${k.active === false ? Q.ui.badge('Inactive') : ''}</span></div>`;
    const head = Q.pageHead({ crumbs: crumbs([[k.name]]), title: esc(k.name), sub: k.description || '', meta,
      actions: `${K.collectMenu(k)}<button class="btn primary" type="button" data-action="kpi-record" data-id="${k.id}">${icon('plus')}Record Result</button>${Q.menu(`More actions for ${k.name}`, [{ label: 'Edit KPI', icon: 'pencil', data: { action: 'kpi-edit', id: k.id } }, { label: 'Configure Collection', icon: 'settings', data: { action: 'kpi-edit', id: k.id, step: 4 } }, { label: 'Start Collection Cycle', icon: 'calendar', data: { action: 'kpi-cycle', id: k.id } }, '-', ...(k.process ? [{ label: 'Open process workspace', icon: 'workflow', data: { action: 'go', href: `#/process/${k.process}/kpis` } }] : [])], { text: '', icon: 'ellipsis', cls: 'btn', align: 'min-width:230px' })}` });
    const tabs = `<div class="tabs kp-tabs" role="tablist" aria-label="KPI sections">${TABS.map(([t, l]) => `<a role="tab" href="#/qms/objectives/k/${k.id}/${t}" aria-selected="${t === tab}">${l}${t === 'results' && pending.length ? `<span class="tab-n">${pending.length}</span>` : t === 'measurements' && K.records(k).length ? `<span class="tab-n">${K.records(k).length}</span>` : ''}</a>`).join('')}</div>`;
    let body = '';
    if (tab === 'overview') {
      const okNow = cur && K.ok(k, cur.value);
      body = `${pending.length ? `<div class="callout small kp-callout">${icon('info')}<span><b>${pending.length} result${pending.length === 1 ? '' : 's'} not yet approved</b>${pending.map(r => `<button class="link-btn" type="button" data-action="kpi-result" data-id="${r.id}">${esc(r.period)} ${fmt(r.value, k)} — ${esc(r.status)}</button>`).join(' · ')}</span></div>` : ''}
        <div class="kp-metrics">
          ${metric('Current result', cur ? `<button class="kp-num-link" type="button" data-action="kpi-result" data-id="${cur.id}" title="Where does this number come from?">${fmt(cur.value, k)}</button>` : '—', cur ? `${esc(cur.period)} · ${K.statusBadge(k, cur.value)}` : 'No approved result yet', cur ? (okNow ? 'ok' : 'bad') : '')}
          ${metric('Target', esc(K.targetText(k)), esc(k.frequency))}
          ${metric('Previous result', prev ? fmt(prev.value, k) : '—', prev ? esc(prev.period) : '')}
          ${metric('Difference', diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff}${esc(k.unit || '')}`, diff == null ? '' : (k.dir === '≤' ? diff <= 0 : diff >= 0) ? 'improved' : 'worsened', diff == null || diff === 0 ? '' : (k.dir === '≤' ? diff < 0 : diff > 0) ? 'ok' : 'bad')}
          ${metric('Records used', cur ? (cur.records ? String(cur.records) : '—') : '—', cur ? (cur.records ? esc(K.METHODS[cur.method]?.label || '') : 'Final result recorded directly') : '')}
        </div>
        <div class="kp-two"><section class="panel"><div class="panel-head"><h2>Trend</h2><span class="muted small">Approved results · hover a point for its source</span></div><div class="panel-pad">${K.chart(k, K.approved(k))}</div></section>
          <section class="panel"><div class="panel-head"><h2>Definition</h2><button class="btn sm ghost" type="button" data-action="kpi-edit" data-id="${k.id}" style="margin-left:auto">${icon('pencil')}Edit</button></div><div class="panel-pad"><dl class="kp-dl">
            ${k.description ? `<dt>Description</dt><dd>${esc(k.description)}</dd>` : ''}<dt>Objective</dt><dd>${obj ? `<a href="#/qms/objectives/goals">${esc(obj.name)}</a>` : esc(k.objective || '—')}</dd>
            <dt>Process</dt><dd>${k.process ? Q.pcell(k.process) : 'Organization level'}</dd><dt>Department</dt><dd>${esc(k.department || '—')}</dd>
            <dt>Data source</dt><dd>${K.methodChip(K.methodOf(k))}${k.survey ? ` · ${esc(K.survey(k.survey)?.name || '')}` : k.integration ? ` · ${esc(k.integration.system)}` : k.internal ? ` · ${esc(k.internal.module)}` : ''}</dd>
            <dt>Aggregation</dt><dd>${esc(K.aggLabel(k.aggregation))}</dd>${k.formula ? `<dt>Formula</dt><dd>${esc(k.formula)}</dd>` : ''}
            <dt>Last updated</dt><dd>${cur ? `${Q.fmt(cur.reviewedAt || cur.recordedAt)} · ${esc(Q.pname(cur.recordedBy))}` : '—'}</dd><dt>ISO 9001</dt><dd class="tnum">${esc((k.iso || []).join(', ') || '—')}</dd></dl></div></section></div>`;
    } else if (tab === 'measurements') {
      const all = K.records(k), periods = [...new Set(all.map(r => r.period))].sort((a, b) => K.key(a) < K.key(b) ? 1 : -1), per = periods.includes(q.period) ? q.period : periods[0];
      if (!all.length) body = `<section class="panel"><div class="kp-empty">${icon('file-check')}<div><h3>This KPI currently receives final results directly.</h3><p>Each period’s official result is recorded with its source (report, spreadsheet or system). Measurement records are optional — add them if you want iQMS to calculate the result.</p>
        <div class="kp-empty-acts"><button class="btn primary" type="button" data-action="kpi-record" data-id="${k.id}">${icon('plus')}Record Result</button><button class="btn" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="manual">${icon('table')}Add Measurements</button><button class="btn" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="import">${icon('upload')}Import</button></div></div></div></section>`;
      else {
        const recs = all.filter(r => r.period === per), dims = [...new Set(recs.flatMap(r => Object.keys(r.dims || {})))], frac = recs.some(r => r.numerator != null), calc = K.calc(k, recs), roll = K.rollup(k, recs);
        const res = K.results(k).find(r => r.period === per && r.status !== 'Superseded');
        body = `<div class="kp-bar"><label class="field inline"><span>Period</span><select class="select sm" data-kp-period>${periods.map(p => `<option${p === per ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
            <span class="small muted">${recs.length} records · ${esc(K.aggLabel(k.aggregation))} = <b class="tnum">${fmt(calc.value, k)}</b>${res ? ` · result ${res.status === 'Approved' ? 'approved' : res.status.toLowerCase()}` : ' · not calculated yet'}</span><span class="grow"></span>
            <button class="btn sm" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="manual" data-period="${esc(per)}">${icon('plus')}Add Measurement</button><button class="btn sm" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="import" data-period="${esc(per)}">${icon('upload')}Import</button><button class="btn sm" type="button" data-kp-export>${icon('download')}Export</button></div>
          ${roll.length ? `<section class="panel kp-roll-panel"><div class="panel-head"><h2>Consolidation</h2><span class="muted small">${esc(k.hierarchy.map(h => h === 'organization' ? 'Organization' : K.DIMS[h]).join(' → '))} · same rule at every level</span></div><div class="kp-rolls">${roll.map(l => `<div class="kp-roll-col"><h4>${esc(l.level === 'organization' ? 'Organization' : K.DIMS[l.level])}</h4><ul>${l.groups.map(g => `<li><span>${esc(g.name)}</span><b class="tnum ${K.ok(k, g.value) ? '' : 'bad'}">${fmt(g.value, k)}</b><em>${g.n}</em></li>`).join('')}</ul></div>`).join('')}</div></section>` : ''}
          ${Q.table({ id: `kpm-${k.id}-${per}`, rows: () => recs, key: r => r.id, noun: 'records', caption: 'Measurement records', search: r => `${Object.values(r.dims || {}).join(' ')} ${r.ref || ''}`,
            tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search records" aria-label="Search records"></div>`,
            columns: [{ key: 'id', label: 'Record', cls: 'c-id', sort: r => r.id, render: r => `<span class="tnum small">${esc(r.id)}</span>` }, { key: 'per', label: 'Period', render: r => esc(r.period) },
              ...dims.map(d => ({ key: 'd' + d, label: K.DIMS[d] || d[0].toUpperCase() + d.slice(1), sort: r => r.dims?.[d] || '', render: r => esc(r.dims?.[d] || '—') })),
              ...(frac ? [{ key: 'n', label: k.numLabel || 'Numerator', cls: 'c-num', sort: r => Number(r.numerator), render: r => r.numerator ?? '—' }, { key: 'dn', label: k.denLabel || 'Denominator', cls: 'c-num', sort: r => Number(r.denominator), render: r => r.denominator ?? '—' }] : []),
              { key: 'v', label: 'Value', cls: 'c-num', sort: r => K.recValue(k, r) ?? -1, render: r => `<b class="tnum">${fmt(K.recValue(k, r), k)}</b>` },
              { key: 'src', label: 'Source', render: r => `<span class="small">${esc(r.source || '—')}${r.ref ? `<span class="sub">${esc(r.ref)}</span>` : ''}</span>` },
              { key: 'st', label: 'Status', render: r => Q.ui.badge(r.status || 'Valid', r.status === 'Excluded' ? 'neutral' : 'success') }] })}`;
      }
    } else if (tab === 'collection') {
      const cycles = K.cycles(k), g = k.integration, sv = k.survey && K.survey(k.survey);
      body = `<div class="kp-two"><section class="panel"><div class="panel-head"><h2>Collection method</h2><button class="btn sm" type="button" data-action="kpi-edit" data-id="${k.id}" data-step="4" style="margin-left:auto">${icon('settings')}Configure Collection</button></div><div class="panel-pad">
          <div class="kp-method-card">${icon(M.icon)}<div><b>${esc(M.long)}</b><p>${esc(M.desc)}</p></div></div>
          <dl class="kp-dl" style="margin-top:14px"><dt>Data source</dt><dd>${sv ? `${esc(sv.name)} (${esc(sv.kind)})` : g ? `${esc(g.system)} — ${esc(g.dataset)}` : k.internal ? `${esc(k.internal.module)} module` : k.method === 'import' ? 'Excel / CSV files' : k.method === 'manual' ? 'Entered by contributors' : esc(k.sourceRef || 'Report or spreadsheet held outside iQMS')}</dd>
            <dt>Frequency</dt><dd>${esc(k.frequency)}</dd><dt>Formula</dt><dd>${esc(k.formula || '—')}</dd><dt>Aggregation</dt><dd>${esc(K.aggLabel(k.aggregation))}</dd>
            <dt>Data owner</dt><dd>${esc(Q.pname(k.dataOwner || k.owner))}</dd><dt>Reviewer</dt><dd>${esc(Q.pname(k.reviewer))}</dd><dt>Minimum sample</dt><dd>${k.minSample || '—'}</dd>
            <dt>Dimensions</dt><dd>${(k.dims || []).length ? k.dims.map(d => esc(K.DIMS[d])).join(', ') : '—'}${(k.hierarchy || []).length ? `<span class="sub">Consolidated by ${esc(k.hierarchy.map(h => h === 'organization' ? 'Organization' : K.DIMS[h]).join(' → '))}</span>` : ''}</dd>
            ${g ? `<dt>Integration</dt><dd>${esc(g.connection)}<span class="sub">${esc(g.refresh)} · last sync ${Q.fmt(Q.addDays(Q.today(), g.lastSync || 0))} · ${esc(g.status)}</span></dd>` : ''}</dl>
          ${(k.methodHistory || []).length ? `<h4 class="kp-h4">Method over time</h4><ol class="kp-mhist">${k.methodHistory.map(h => `<li><b>${esc(h.from)}</b>${K.methodChip(h.method)}<span class="muted small">${esc(h.note || '')}</span></li>`).join('')}</ol><p class="small muted">Earlier results keep the method they were recorded with, so the trend stays continuous.</p>` : ''}</div></section>
        <section class="panel"><div class="panel-head"><h2>Collection cycles</h2><button class="btn sm primary" type="button" data-action="kpi-cycle" data-id="${k.id}" style="margin-left:auto">${icon('plus')}Start Collection Cycle</button></div>
          ${cycles.length ? `<ul class="ui-list">${cycles.map(c => { const n = K.records(k, c.period).filter(r => r.cycle === c.id).length, r = c.resultId && K.result(c.resultId);
            return `<li><a class="ui-row" href="#/qms/objectives/c/${c.id}"><span class="ui-row-icon">${icon(K.METHODS[c.method]?.icon || 'calendar')}</span><span class="ui-row-main"><span class="ui-row-title">${esc(c.period)} · ${esc(c.id)}</span><span class="ui-row-meta">${n} records${c.expected ? ` of ${c.expected} expected` : ''}${r ? ` · ${fmt(r.value, k)}` : ''}</span></span><span class="ui-row-right">${Q.ui.badge(c.status, K.CKIND[c.status])}</span><span class="ui-row-go">${icon('chevron-right')}</span></a></li>`; }).join('')}</ul>`
          : `<div class="ui-empty">${icon('calendar')}<span>${k.method === 'external' ? 'Final results are recorded directly — no collection cycles needed.' : 'No collection cycles yet.'}</span></div>`}</section></div>`;
    } else if (tab === 'results') {
      const all = K.results(k, { all: true });
      body = Q.table({ id: `kpr-${k.id}`, rows: () => all, key: r => r.id, noun: 'results', caption: 'Period results', initialSort: { key: 'p', dir: -1 },
        tools: `<span class="small muted">Click a result to see where the number came from.</span>`,
        columns: [{ key: 'p', label: 'Period', sort: r => r.key + r.recordedAt, render: r => `<button class="doc-link" type="button" data-action="kpi-result" data-id="${r.id}">${esc(r.period)}</button>` },
          { key: 'v', label: 'Result', cls: 'c-num', sort: r => r.value, render: r => `<b class="tnum ${K.ok(k, r.value) ? '' : 'kp-bad'}">${fmt(r.value, k)}</b>` },
          { key: 't', label: 'Target', cls: 'c-num', render: r => `${esc(r.dir || k.dir)} ${Q.kpiFmt(r.target ?? k.target, k)}` },
          { key: 's', label: 'Status', render: r => r.status === 'Superseded' ? '<span class="muted small">—</span>' : K.statusBadge(k, r.value) },
          { key: 'm', label: 'Method', sort: r => r.method, render: r => K.methodChip(r.method) },
          { key: 'n', label: 'Records', cls: 'c-num', sort: r => r.records, render: r => r.records ? String(r.records) : '<span class="zero">—</span>' },
          { key: 'src', label: 'Source', render: r => `<span class="small kp-src" title="${esc(r.source?.ref || '')}">${esc(r.source?.ref || r.source?.type || '—')}</span>` },
          { key: 'a', label: 'Approval', sort: r => r.status, render: r => Q.ui.badge(r.status, K.RSTATUS[r.status]) }] });
    } else if (tab === 'evidence') {
      const res = K.results(k), links = res.filter(r => r.source?.link), imps = (Q.S.kpiImports || []).filter(b => b.kpi === k.id), cyc = K.cycles(k), sv = k.survey && K.survey(k.survey);
      const sysRecs = K.records(k).filter(r => ['CAPA'].includes(r.source));
      const sec = (title, items, empty) => `<section class="panel"><div class="panel-head"><h2>${title}</h2><span class="muted small">${items.length}</span></div>${items.length ? `<ul class="ui-list">${items.join('')}</ul>` : `<div class="ui-empty">${icon('circle')}<span>${empty}</span></div>`}</section>`;
      const row = (ic, title, meta, href, extra = '') => `<li><a class="ui-row" ${href.startsWith('#') ? `href="${href}"` : href.startsWith('http') ? `href="${esc(href)}" target="_blank" rel="noopener"` : href}><span class="ui-row-icon">${icon(ic)}</span><span class="ui-row-main"><span class="ui-row-title">${esc(title)}</span><span class="ui-row-meta">${esc(meta)}</span></span>${extra}<span class="ui-row-go">${icon('chevron-right')}</span></a></li>`;
      body = `<div class="kp-ev">
        ${sec('Source references', res.filter(r => r.source?.ref && r.method !== 'legacy').slice(0, 12).map(r => row(K.METHODS[r.method]?.icon || 'file', r.source.ref, `${r.period} · ${r.source.type}${r.source.system ? ` · ${r.source.system}` : ''}`, `role="button" tabindex="0" data-action="kpi-result" data-id="${r.id}"`, `<span class="ui-row-right tnum">${fmt(r.value, k)}</span>`)), 'No source references recorded yet.')}
        ${sec('External links', links.map(r => row('link', r.source.link.replace(/^https?:\/\//, ''), `${r.period} · ${r.source.ref || r.source.type}`, r.source.link)), 'No links — add a SharePoint or report link when recording a result.')}
        ${sec('Imported files', imps.map(b => row('upload', b.file, `${b.id} · ${b.period} · ${b.imported} imported, ${b.rejected} rejected · ${Q.pname(b.by)} ${Q.fmt(b.at)}`, `#/qms/objectives/k/${k.id}/measurements?period=${encodeURIComponent(b.period)}`)), 'No imports.')}
        ${sec('Survey batches', sv ? [...new Set(K.records(k).filter(r => r.source === 'Survey').map(r => r.period))].map(p => row('clipboard-check', `${sv.name} — ${p}`, `${K.records(k, p).filter(r => r.source === 'Survey').length} responses`, `#/qms/objectives/k/${k.id}/measurements?period=${encodeURIComponent(p)}`)) : [], 'Not connected to a survey.')}
        ${sec('System records', sysRecs.map(r => row('server', r.dims.record, `${r.period} · ${r.source}`, `#/capa?focus=${encodeURIComponent(r.ref)}`)), 'No iQMS records used.')}
        ${sec('Collection cycles', cyc.map(c => row('calendar', `${c.period} · ${c.id}`, `${K.METHODS[c.method]?.long || c.method} · ${c.status}`, `#/qms/objectives/c/${c.id}`)), 'No collection cycles.')}</div>`;
    } else {
      const log = (Q.S.kpiLog || []).filter(x => x.kpi === k.id), KIND = { definition: 'Definition', target: 'Target', method: 'Collection method', result: 'Result', approval: 'Approval', import: 'Import', calc: 'Calculation', cycle: 'Collection', records: 'Records', override: 'Override' };
      const resEv = K.results(k, { all: true }).filter(r => r.method !== 'legacy').map(r => ({ at: `${r.reviewedAt || r.recordedAt} 12:00`, who: r.reviewedBy || r.recordedBy, text: `${r.status === 'Approved' ? 'approved' : r.status === 'Superseded' ? 'superseded' : r.status.toLowerCase()} — ${r.period} ${fmt(r.value, k)} (${K.METHODS[r.method]?.label})`, kind: 'approval' }));
      const all = [...log, ...resEv.filter(e => !log.some(l => l.text.includes(e.text.split(' — ')[1]?.split(' (')[0] || '§')))].sort((a, b) => a.at < b.at ? 1 : -1);
      body = `<section class="panel"><div class="panel-head"><h2>History</h2><span class="muted small">Definition changes, target and method changes, results, imports and recalculations</span></div>
        <ol class="tl kp-hist">${all.slice(0, 60).map(e => `<li class="tl-item"><span class="tl-mark"><span class="avatar sm">${esc(Q.initials(e.who))}</span></span><div class="tl-body"><div class="tl-head"><b>${esc(Q.pname(e.who))}</b> <span class="muted">${esc(e.text)}</span></div><div class="tl-foot"><span class="tl-when">${Q.fmt(e.at.slice(0, 10))}</span>${Q.ui.badge(KIND[e.kind] || 'Change', e.kind === 'target' || e.kind === 'method' ? 'warning' : e.kind === 'approval' ? 'success' : 'neutral')}</div></div></li>`).join('') || '<li class="muted">No history.</li>'}</ol></section>`;
    }
    return { title: `${k.name} · KPIs`, nav: 'qms', html: head + tabs + `<div class="kp-tab-body">${body}</div>`,
      after: main => {
        main.querySelector('[data-kp-period]')?.addEventListener('change', e => Q.go(`#/qms/objectives/k/${k.id}/measurements?period=${encodeURIComponent(e.target.value)}`));
        main.querySelector('[data-kp-export]')?.addEventListener('click', () => { const per = main.querySelector('[data-kp-period]').value, recs = K.records(k, per), dims = [...new Set(recs.flatMap(r => Object.keys(r.dims || {})))];
          const rows = [['Record', 'Period', ...dims, 'Numerator', 'Denominator', 'Value', 'Source', 'Reference'], ...recs.map(r => [r.id, r.period, ...dims.map(d => r.dims?.[d] || ''), r.numerator ?? '', r.denominator ?? '', K.recValue(k, r) ?? '', r.source || '', r.ref || ''])];
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${k.id}_${per.replace(/\s+/g, '_')}_records.csv`; document.body.append(a); a.click(); setTimeout(() => a.remove(), 300); });
      } };
  }

  /* ============================================================ collection cycle */
  function cyclePage(c) {
    const k = K.kpi(c.kpi), recs = K.records(k, c.period).filter(r => r.cycle === c.id && r.status !== 'Excluded'), res = c.resultId && K.result(c.resultId), calc = K.calc(k, recs);
    const first = dimsOf(k)?.[0] || 'person', expected = c.expected || null, pct = expected ? Math.round(recs.length / expected * 100) : null;
    const crew = k.id === 'K-16' ? (window.QMS_KPI?.crew || []).map(x => ({ name: x[0], team: x[1] })) : (c.contributors || []).map(n => ({ name: n }));
    const subm = new Set(recs.map(r => r.dims?.[first]));
    const contributors = crew.map(x => ({ ...x, done: subm.has(x.name) }));
    const st = c.status, can = [k.owner, k.dataOwner, 'maria'].includes(Q.me()), rev = [k.reviewer, 'maria'].includes(Q.me());
    const btn = (op, label, primary = false, ic = '') => `<button class="btn${primary ? ' primary' : ''}" type="button" data-action="kpi-cycle-act" data-id="${c.id}" data-op="${op}">${ic ? icon(ic) : ''}${label}</button>`;
    const acts = ['Approved', 'Closed'].includes(st) ? (st === 'Approved' && can ? btn('close', 'Close Cycle') : '')
      : `${can ? btn('request', 'Request Inputs', false, 'send') : ''}${can && !['For Review'].includes(st) ? `<button class="btn" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="manual" data-cycle="${c.id}">${icon('plus')}Add Records</button><button class="btn" type="button" data-action="kpi-collect" data-id="${k.id}" data-how="import" data-cycle="${c.id}">${icon('upload')}Import Records</button>` : ''}
        ${can && ['Collecting', 'Ready to Calculate', 'Calculated', 'Draft'].includes(st) && recs.length ? btn('calc', 'Calculate', false, 'hash') : ''}${can && st === 'Calculated' ? btn('submit', 'Submit for Review', true) : ''}${rev && st === 'For Review' ? btn('approve', 'Approve Result', true, 'check') : ''}`;
    const steps = K.CSTATUS, ci = steps.indexOf(st);
    const html = Q.pageHead({ crumbs: crumbs([[k.name, `#/qms/objectives/k/${k.id}/collection`], [c.id]]), title: `KPI Collection Cycle — ${esc(c.period)}`, actions: acts, meta: `<div class="kp-headmeta"><span class="kp-meta"><span class="tnum">${esc(c.id)}</span><span>${esc(k.name)}</span><span>${K.methodChip(c.method)}</span><span>Owner ${esc(Q.pname(c.owner))}</span>${c.due ? `<span>Due ${Q.fmt(c.due)}</span>` : ''}</span></div>` }) +
      `<ol class="am-life kp-life">${steps.map((s, i) => `<li class="${i < ci ? 'done' : i === ci ? 'current' : ''}">${s}</li>`).join('')}</ol>
      <div class="kp-metrics">${metric('Expected records', expected ?? '—')}${metric('Received', recs.length)}${metric('Missing', expected ? Math.max(0, expected - recs.length) : '—', '', expected && expected > recs.length ? 'bad' : '')}${metric('Completion', pct == null ? '—' : `${pct}%`, pct == null ? '' : `<span class="kp-prog"><i style="width:${Math.min(100, pct)}%"></i></span>`)}${metric('Current result', res ? `<button class="kp-num-link" type="button" data-action="kpi-result" data-id="${res.id}">${fmt(res.value, k)}</button>` : calc.value == null ? '—' : fmt(calc.value, k), res ? `${esc(res.status)}` : calc.value == null ? '' : 'preview, not calculated', res ? (K.ok(k, res.value) ? 'ok' : 'bad') : '')}${metric('Target', esc(K.targetText(k)))}</div>
      ${calc.warnings.length && !['Approved', 'Closed'].includes(st) ? `<div class="callout warning small" style="margin-bottom:12px">${icon('triangle-alert')}<span>${calc.warnings.map(esc).join(' ')}</span></div>` : ''}
      <div class="kp-two rev">${contributors.length ? `<section class="panel"><div class="panel-head"><h2>Contributors</h2><span class="muted small">${contributors.filter(x => x.done).length} of ${contributors.length} submitted</span></div><ul class="kp-contrib">${contributors.map(x => `<li><span class="avatar xs">${esc(x.name.split(' ').map(s => s[0]).slice(0, 2).join(''))}</span><span class="kp-c-main"><b>${esc(x.name)}</b>${x.team ? `<span>${esc(x.team)}</span>` : ''}</span>${x.done ? Q.ui.badge('Submitted', 'success') : `${Q.ui.badge('Missing', 'danger')}${['Approved', 'Closed'].includes(st) ? '' : `<button class="btn sm ghost" type="button" data-action="kpi-cycle-act" data-id="${c.id}" data-op="remind" data-who="${esc(x.name)}">Send Reminder</button>`}`}</li>`).join('')}</ul></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Records</h2><span class="muted small">${recs.length} · ${esc(K.aggLabel(k.aggregation))}</span><a class="ui-link" href="#/qms/objectives/k/${k.id}/measurements?period=${encodeURIComponent(c.period)}">All records${icon('chevron-right')}</a></div>
          ${recs.length ? `<div class="table-scroll" style="max-height:460px"><table class="dt tight"><thead><tr><th>${esc(K.DIMS[first] || 'Subject')}</th>${(dimsOf(k) || []).slice(1).map(d => `<th>${esc(K.DIMS[d])}</th>`).join('')}${recs[0].numerator != null ? `<th class="c-num">${esc(k.numLabel || 'Numerator')}</th><th class="c-num">${esc(k.denLabel || 'Denominator')}</th>` : ''}<th class="c-num">Value</th></tr></thead><tbody>${recs.map(r => `<tr><td>${esc(r.dims?.[first] || '—')}</td>${(dimsOf(k) || []).slice(1).map(d => `<td>${esc(r.dims?.[d] || '—')}</td>`).join('')}${recs[0].numerator != null ? `<td class="c-num tnum">${r.numerator ?? '—'}</td><td class="c-num tnum">${r.denominator ?? '—'}</td>` : ''}<td class="c-num tnum">${fmt(K.recValue(k, r), k)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="ui-empty">${icon('inbox')}<span>No records yet.</span></div>`}</section></div>`;
    return { title: `${c.id} · KPIs`, nav: 'qms', html };
  }

  /* ============================================================ quality objectives */
  function goalsPage() {
    const S = Q.S, list = S.objectives || [];
    return { title: 'Quality Objectives · QMS', nav: 'qms', html: Q.pageHead({ crumbs: crumbs([['Quality objectives']]), title: 'Quality Objectives', sub: 'What the organization commits to improve (ISO 9001 clause 6.2), each measured through one or more KPIs.',
      actions: `<a class="btn" href="#/qms/objectives">${icon('target')}KPI Register</a><button class="btn primary" type="button" data-action="kpi-obj-new">${icon('plus')}Add Objective</button>` }) +
      Q.table({ id: 'kp-goals', rows: () => list, key: o => o.id, noun: 'objectives', caption: 'Quality objectives', search: o => `${o.name} ${Q.pname(o.owner)}`,
        tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search objectives" aria-label="Search objectives"></div>`,
        columns: [{ key: 'id', label: 'ID', cls: 'c-id', sort: o => o.id, render: o => esc(o.id) }, { key: 'n', label: 'Objective', sort: o => o.name, render: o => `<span class="title">${esc(o.name)}</span>${o.description ? `<span class="sub">${esc(o.description)}</span>` : ''}` },
          { key: 'p', label: 'Processes', render: o => o.processes.map(p => Q.pcell(p)).join('<br>') || '—' }, { key: 'd', label: 'Department', render: o => esc(o.department || '—') },
          { key: 'k', label: 'KPIs', render: o => { const ks = S.kpis.filter(k => k.objectiveId === o.id), below = ks.filter(k => !Q.kpiOk(k)); return `${ks.map(k => `<a class="nowrap" href="#/qms/objectives/k/${k.id}">${esc(k.name)}</a>`).join('<br>')}${below.length ? `<span class="sub">${below.length} below target</span>` : ''}`; } },
          { key: 'o', label: 'Owner', sort: o => Q.pname(o.owner), render: o => esc(Q.pname(o.owner)) }, { key: 'dt', label: 'Period', render: o => `<span class="nowrap small">${Q.fmt(o.start)} – ${Q.fmt(o.end)}</span>` },
          { key: 's', label: 'Status', render: o => Q.ui.badge(o.status, o.status === 'Active' ? 'success' : 'neutral') },
          { key: 'x', label: '', cls: 'c-actions', render: o => `<button class="btn sm" type="button" data-action="kpi-obj-edit" data-id="${o.id}">Edit</button>` }] }) };
  }
  const objForm = o => `<form class="modal-body"><div class="form-grid"><label class="field full"><span>Objective <span class="req">*</span></span><input class="input" name="name" required value="${esc(o.name || '')}"></label>
    <label class="field full"><span>Description</span><textarea class="textarea" name="description" rows="2">${esc(o.description || '')}</textarea></label>
    <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(o.owner || Q.me())}</select></label><label class="field"><span>Department</span><input class="input" name="department" value="${esc(o.department || '')}"></label>
    <label class="field"><span>Start</span><input class="input" type="date" name="start" value="${esc(o.start || Q.today())}"></label><label class="field"><span>End</span><input class="input" type="date" name="end" value="${esc(o.end || Q.addDays(Q.today(), 365))}"></label>
    <label class="field"><span>ISO clauses</span><input class="input" name="iso" value="${esc((o.iso || ['6.2']).join(', '))}"></label><label class="field"><span>Status</span><select class="select" name="status">${['Active', 'Planned', 'Achieved', 'Closed'].map(s => `<option${s === (o.status || 'Active') ? ' selected' : ''}>${s}</option>`).join('')}</select></label></div></form>`;
  const objSave = (o, m, isNew) => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), old = o.name;
    Object.assign(o, { name: v.name.trim(), description: v.description.trim(), owner: v.owner, department: v.department, start: v.start, end: v.end, iso: v.iso.split(/[,\s]+/).filter(Boolean), status: v.status });
    if (isNew) Q.S.objectives.push(o); else Q.S.kpis.filter(k => k.objectiveId === o.id).forEach(k => { k.objective = o.name; });
    if (!isNew && old !== o.name) Q.S.kpis.filter(k => k.objectiveId === o.id).forEach(k => K.log(k, `objective renamed to “${o.name}”`, 'definition'));
    Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast(isNew ? 'Objective added' : 'Objective saved', o.name); };
  Q.actions['kpi-obj-new'] = () => { const o = { id: `QO-${String((Q.S.objectives.length + 1)).padStart(2, '0')}`, processes: [] }; const m = Q.openModal({ size: 'm', title: 'Add Quality Objective', body: objForm(o), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Objective</button>' }); m.querySelector('[data-ok]').addEventListener('click', () => objSave(o, m, true)); };
  Q.actions['kpi-obj-edit'] = d => { const o = K.objective(d.id), m = Q.openModal({ size: 'm', title: `Edit ${esc(o.id)}`, body: objForm(o), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' }); m.querySelector('[data-ok]').addEventListener('click', () => objSave(o, m, false)); };

  /* ============================================================ routing */
  K.route = (parts, q) => {
    const [kind, id, tab] = parts;
    if (kind === 'goals') return goalsPage();
    if (kind === 'k') { const k = K.kpi(id); if (!k) return { title: 'KPI not found', nav: 'qms', html: Q.pageHead({ crumbs: crumbs([['Not found']]), title: 'KPI not found', sub: `${esc(id || '')} does not exist.` }) };
      return detail(k, TABS.some(t => t[0] === tab) ? tab : 'overview', q); }
    if (kind === 'c') { const c = K.cycle(id); if (!c) return { title: 'Cycle not found', nav: 'qms', html: Q.pageHead({ crumbs: crumbs([['Not found']]), title: 'Collection cycle not found' }) }; return cyclePage(c); }
    return null;
  };
})();
