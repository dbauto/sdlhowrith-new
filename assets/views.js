/* iQMS v2 — Overview, Process Workspace, cross-process registers, ISO 9001 readiness, reports.
 * Every register is one component used in two contexts: inside a process, and organization-wide. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  Q.EV_KIND = { 'Verified': 'success', 'Pending verification': 'info', 'Missing': 'danger', 'Link unavailable': 'orange' };
  const SRC_ICON = { SharePoint: 'cloud', OneDrive: 'cloud', CRM: 'handshake', ERP: 'package', HRIS: 'users', Upload: 'upload', 'Google Drive': 'hard-drive' };
  const procFilter = process => process ? '' : `<select class="select" data-filter="process" aria-label="Process">${Q.processOptions()}</select>`;
  const searchBox = label => `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search ${label}" aria-label="Search ${label}"></div>`;
  const procCol = process => process && !Q.children(process).length ? [] : [{ key: 'process', label: process ? 'Subprocess' : 'Process', sort: r => Q.proc(r.process)?.process_code, render: r => Q.pcell(r.process) }];

  /* =================== Readiness summary (used on Overview, ISO page, process) =================== */
  Q.readinessBlock = (reqs, { link = '#/evidence?view=clause', compact = false } = {}) => {
    const s = Q.isoScore(reqs), c = s.counts, a = s.applicable || 1;
    // Link-only documents that support these requirements: assessed from a description, not from content.
    const locked = Q.S.documents.filter(d => Q.docRestricted(d) && Q.docIso(d).some(cl => reqs.some(r => r.clause === cl)));
    const seg = (k, cls) => c[k] ? `<span class="${cls}" style="width:${c[k] / a * 100}%" title="${k}: ${c[k]}"></span>` : '';
    const leg = (k, color, filter) => `<button type="button" data-go="${link}${link.includes('?') ? '&' : '?'}status=${filter}"><i style="background:${color}"></i>${k} <b class="tnum">${c[k]}</b></button>`;
    return `<div class="readiness">
      <div><div class="pct">${s.pct ?? '—'}<small>%</small></div><div class="small muted">${s.points} of ${s.applicable} applicable requirements</div></div>
      <div><div class="stack-bar" role="img" aria-label="Complete ${c['Complete']}, partially complete ${c['Partially Complete']}, at risk ${c['At Risk']}, missing ${c['Missing']}">${seg('Complete', 'b-complete')}${seg('Partially Complete', 'b-partial')}${seg('At Risk', 'b-atrisk')}${seg('Missing', 'b-missing')}</div>
      <div class="legend">${leg('Complete', 'var(--success)', 'complete')}${leg('Partially Complete', '#E0A43A', 'partial')}${leg('At Risk', 'var(--orange)', 'atrisk')}${leg('Missing', 'var(--danger)', 'missing')}<span class="muted">Not applicable ${c['Not Applicable']}</span></div>
      ${locked.length ? `<p class="rd-note">${icon('lock')}<span><b>${locked.length} supporting document${locked.length === 1 ? ' is' : 's are'} Confidential.</b> ${compact ? 'Counted from the owner’s description only.' : 'They are counted from the description their owner provided; iQMS has not read their content.'} <a href="#/documents?v=v-restricted">View them</a></span></p>` : ''}
      ${(() => { const nc = Q.S.findings.filter(f => f.nc && f.nc.status !== 'Closed' && reqs.some(r => Q.AM?.fam(f.clause, r.clause))); return nc.length ? `<p class="rd-note rd-audit">${icon('search-check')}<span><b>${nc.length} open audit nonconformit${nc.length === 1 ? 'y' : 'ies'}</b> on ${new Set(nc.map(f => f.clause.split('.').slice(0, 2).join('.'))).size} clause${new Set(nc.map(f => f.clause.split('.').slice(0, 2).join('.'))).size === 1 ? '' : 's'} (${[...new Set(nc.map(f => f.clause.split('.').slice(0, 2).join('.')))].sort().join(', ')}). Requirement status should reflect them. <a href="#/audits/nc">View NCs</a></span></p>` : ''; })()}
      ${compact ? '' : `<details class="explain"><summary>${icon('chevron-right')}How is this calculated?</summary><div class="explain-body">
        Each ISO 9001 requirement is mapped to the processes, controls and evidence that satisfy it and given a status by the QMS Manager.<br>
        <span class="formula">Readiness = (Complete × 1 + Partially complete × 0.5 + At risk × 0 + Missing × 0) ÷ applicable requirements</span><br>
        <span class="formula">= (${c['Complete']} + ${c['Partially Complete']} × 0.5) ÷ ${s.applicable} = ${s.points} ÷ ${s.applicable} = <b>${s.pct}%</b></span><br>
        Not-applicable requirements (${c['Not Applicable']}) are excluded. Confidential and Highly Confidential documents are not read by iQMS; they count through the description their owner provided. This is a readiness indicator, not a certification result.</div></details>`}</div></div>`;
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) Q.go(b.dataset.go); });


  const readinessGauge = score => {
    const total = 34, c = score.counts, a = score.applicable || 1;
    const completeEnd = c['Complete'] / a;
    const partialEnd = (c['Complete'] + c['Partially Complete']) / a;
    const cx = 110, cy = 104, inner = 67, outer = 84;
    const segs = Array.from({ length: total }, (_, i) => {
      const r = (i + .5) / total;
      const cls = r <= completeEnd ? 'complete' : r <= partialEnd ? 'partial' : 'gap';
      const a0 = Math.PI + Math.PI * i / (total - 1);
      const x1 = (cx + Math.cos(a0) * inner).toFixed(2);
      const y1 = (cy + Math.sin(a0) * inner).toFixed(2);
      const x2 = (cx + Math.cos(a0) * outer).toFixed(2);
      const y2 = (cy + Math.sin(a0) * outer).toFixed(2);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" style="--rd-i:${i}"/>`;
    }).join('');
    return `<svg class="rd-gauge" viewBox="0 0 220 112" role="img" aria-label="ISO 9001 readiness ${score.pct ?? 0}%">${segs}</svg>`;
  };

  Q.actions['readiness-detail'] = () => {
    const S = Q.S, s = Q.isoScore(S.iso);
    const gaps = S.iso.filter(r => ['Missing', 'At Risk'].includes(r.status));
    Q.openModal({
      size: 'l',
      title: 'ISO 9001 readiness',
      sub: `${esc(S.organization.standard)} · ${s.pct ?? '—'}% readiness`,
      body: `<div class="modal-body">
        <div class="rd-modal-summary rd-modal-gauge-card">
          ${readinessGauge(s)}
          <span class="rd-modal-gauge-center">
            <span class="rd-modal-gauge-label">Readiness</span>
            <span class="rd-modal-gauge-pct tnum">${s.pct ?? '—'}<small>%</small></span>
          </span>
        </div>
        ${Q.readinessBlock(S.iso)}
        <div class="rd-gap-list">
          <h3>Largest gaps</h3>
          ${gaps.length ? `<ul>${gaps.map(r => `<li><span class="clause">${esc(r.clause)}</span><span>${esc(r.title)}</span>${Q.st(r.status, Q.ISO_KIND[r.status])}</li>`).join('')}</ul>` : '<p class="muted">No missing or at-risk requirements.</p>'}
        </div>
      </div>`,
      foot: `<span class="left">Readiness is an internal QMS indicator, not a certification result.</span><button class="btn" type="button" data-close>Close</button><a class="btn primary" href="#/evidence?view=clause" data-close>Open by clause</a>`
    });
  };

  /* =================== Overview =================== */
  Q.views.overview = () => {
    const S = Q.S, me = Q.me(), today = Q.today();
    const docsOverdue = S.documents.filter(Q.docOverdue);
    const approvals = S.workflows.filter(w => ['approval', 'publication'].includes(w.stage) && !w.changesRequested);
    const high = S.risks.filter(r => r.kind === 'Risk' && Q.riskOpen(r) && Q.riskLevel(r) === 'High');
    const kpiBelow = S.kpis.filter(k => !Q.kpiOk(k));
    const gaps = S.evidence.filter(Q.evGap);
    const openActions = S.actions.filter(a => !Q.actionClosed(a));
    const overdueActions = openActions.filter(Q.actionOverdue);
    const mineApprovals = approvals.filter(Q.assignedToMe).length;
    // Four headline numbers. Everything else lives in the lists and the process table below.
    const U = Q.ui, dueSoon = S.documents.filter(Q.docDueSoon).length;
    const strip = U.stats([
      { label: 'Overdue corrective actions', value: overdueActions.length, href: '#/capa?status=overdue', icon: 'list-checks', tone: overdueActions.length ? 'danger' : 'success', note: `${openActions.length} open in total` },
      { label: 'High risks', value: high.length, href: '#/risks?level=High', icon: 'shield-alert', tone: high.length ? 'danger' : 'success', note: `${S.risks.filter(r => Q.riskOpen(r)).length} open risks & opportunities` },
      { label: 'Documents overdue for review', value: docsOverdue.length, href: '#/documents?status=overdue', icon: 'calendar-clock', tone: docsOverdue.length ? 'warning' : 'success', note: `${dueSoon} more due in 30 days` },
      { label: 'KPIs below target', value: kpiBelow.length, href: '#/qms/objectives?status=below', icon: 'target', tone: kpiBelow.length ? 'warning' : 'success', note: `of ${S.kpis.length} KPIs measured` }
    ]);

    // Needs your action: one line per item, the whole row opens it.
    const work = [
      ...Q.myWorkflows().map(w => { const d = Q.doc(w.doc); const verb = w.stage === 'review' ? 'Review' : w.stage === 'approval' ? 'Approve' : 'Publish'; return { due: w.due, icon: w.stage === 'publication' ? 'send' : w.stage === 'approval' ? 'stamp' : 'file-search', title: d.title, meta: `${verb} Rev ${w.rev} · ${Q.plabel(d.process)}`, href: `#/review/${w.id}` }; }),
      ...S.actions.filter(a => a.owner === me && !Q.actionClosed(a)).map(a => ({ due: a.due, icon: 'list-checks', title: a.title, meta: `Corrective action ${a.id} · ${a.stage}`, href: `#/capa?focus=${a.id}` })),
      ...S.documents.filter(d => d.owner === me && Q.docOverdue(d)).map(d => ({ due: d.nextReview, icon: 'calendar-clock', title: d.title, meta: `Periodic review · ${d.id}`, action: 'create-revision', data: { id: d.id } }))
    ].sort((a, b) => a.due < b.due ? -1 : 1).map(w => ({ ...w, tone: w.due < today ? 'danger' : null, right: U.due(w.due) }));

    // Process status: four columns. Issue counts become chips, and a process with nothing open shows nothing.
    const procRows = () => Q.topProcesses().map(p => ({ ...p, id: p.process_id, s: Q.stats(p.process_id) }));
    const pl = (n, one, many = one + 's') => n === 1 ? one : many;
    const issues = s => [
      { n: s.actionsOverdue, label: pl(s.actionsOverdue, 'overdue action'), kind: 'danger' },
      { n: s.highRisks, label: pl(s.highRisks, 'high risk'), kind: 'danger' },
      { n: s.docsOverdue, label: pl(s.docsOverdue, 'overdue doc'), kind: 'warning' },
      { n: s.kpisBelow, label: pl(s.kpisBelow, 'KPI below', 'KPIs below'), kind: 'warning' },
      { n: s.evGaps, label: pl(s.evGaps, 'evidence gap'), kind: 'orange' },
      { n: s.actions - (s.actionsOverdue || 0), label: pl(s.actions - (s.actionsOverdue || 0), 'open action'), kind: 'neutral' }];
    const issueCount = s => (s.actionsOverdue || 0) + s.highRisks + s.docsOverdue + s.kpisBelow + s.evGaps + (s.actions - (s.actionsOverdue || 0));
    const procTable = Q.table({
      id: 'ovproc', rows: procRows, key: r => r.id, noun: 'processes', caption: 'Process status', foot: false,
      tools: Q.seg('Show', [['all', 'All', procRows().length], ['attn', 'Needs attention', procRows().filter(r => r.s.health !== 'ok').length]], 'all'),
      segs: { attn: r => r.s.health !== 'ok' },
      columns: [
        { key: 'name', label: 'Process', cls: 'c-sticky', sort: r => r.display_order, render: r => `<a class="ui-proc" href="#/process/${r.id}" title="Owner: ${esc(Q.pname(r.owner))}"><b>${esc(r.process_code)}</b><span>${esc(r.name)}</span></a>` },
        { key: 'health', label: 'Status', sort: r => ({ risk: 0, attn: 1, ok: 2 })[r.s.health], render: r => Q.health(r.s.health) },
        { key: 'issues', label: 'Open issues', sort: r => issueCount(r.s), render: r => U.chips(issues(r.s)) },
        { key: 'iso', label: 'ISO readiness', cls: 'c-iso', sort: r => r.s.iso.pct ?? -1, render: r => Q.miniProgress(r.s.iso.pct) }
      ]
    });

    const upcoming = S.documents.filter(d => d.nextReview && d.nextReview >= today && Q.days(today, d.nextReview) <= 60).sort((a, b) => a.nextReview < b.nextReview ? -1 : 1);
    const mgmt = S.managementActions.filter(a => a.status !== 'Closed').sort((a, b) => a.due < b.due ? -1 : 1);
    const orgName = S.organization.name;
    Q.overviewParts = {
      welcome: Q.themeOverview?.() || '',
      attention: strip,
      readiness: (() => {
        const rs = Q.isoScore(S.iso), c = rs.counts;
        const gapCount = c['At Risk'] + c['Missing'];
        return `<button class="iso-ready-card" type="button" data-action="readiness-detail" aria-label="Open ISO 9001 readiness details">
          <span class="irc-head">
            <span class="irc-title">ISO 9001 readiness</span>
            <span class="irc-details">Details</span>
          </span>
          <span class="irc-gauge-section">
            <span class="irc-gauge-wrap">
              ${readinessGauge(rs)}
              <span class="irc-center">
                <span class="irc-center-label">Readiness</span>
                <span class="irc-pct tnum">${rs.pct ?? '—'}<small>%</small></span>
              </span>
            </span>
          </span>
          <span class="irc-metrics" aria-label="Readiness status breakdown">
            <span class="irc-metric" title="Complete requirements">
              <span class="irc-metric-icon complete">${icon('circle-check')}</span>
              <span class="irc-metric-copy"><span>All clear</span><b class="tnum">${c['Complete']}</b></span>
            </span>
            <span class="irc-metric" title="Partially complete requirements">
              <span class="irc-metric-icon partial">${icon('clock-alert')}</span>
              <span class="irc-metric-copy"><span>Needs attention</span><b class="tnum">${c['Partially Complete']}</b></span>
            </span>
            <span class="irc-metric" title="At risk or missing requirements">
              <span class="irc-metric-icon gap">${icon('triangle-alert')}</span>
              <span class="irc-metric-copy"><span>Critical</span><b class="tnum">${gapCount}</b></span>
            </span>
          </span>
        </button>`;
      })(),
      work: U.card({ title: 'Needs your action', count: work.length, body: U.list(work, { empty: 'Nothing needs your action today.' }), flush: true, cls: 'ov-work' }),
      processes: U.card({ title: 'Process status', info: 'Counts include subprocesses. Status reflects open items; ISO readiness is scored separately.', body: procTable, flush: true, cls: 'ov-proc' }),
      reviews: U.card({ title: 'Upcoming document reviews', info: 'Controlled documents whose periodic review falls in the next 60 days.', link: { href: '#/documents?status=overdue', text: 'Overdue' }, flush: true,
        body: U.list(upcoming.map(d => ({ icon: 'file-text', title: d.title, meta: `${d.id} · Rev ${d.rev} · ${Q.pname(d.owner)}`, action: 'open-doc', data: { id: d.id }, right: U.due(d.nextReview) })), { empty: 'No reviews due in the next 60 days.' }) }),
      actions: U.card({ title: 'Management actions', count: mgmt.length, link: { href: '#/mgmt-review/actions', text: 'Management Review' }, flush: true,
        body: U.list(mgmt.map(a => ({ icon: 'presentation', title: a.title, meta: `${Q.pname(a.owner)} · ${Q.proc(a.process)?.name || ''}`, href: '#/mgmt-review/actions', right: U.due(a.due) })), { empty: 'No open management actions.' }) })
    };
    return Q.pageView('overview', { title: 'Overview', nav: 'overview', sub: `${Q.fmt(today)} · ${esc(orgName)}` });
  };

  /* =================== Shared registers =================== */
  Q.evTable = (id, { process = null, initialSeg } = {}) => {
    const rows = () => Q.S.evidence.filter(e => !process || Q.inProc(e.process, process));
    const all = rows();
    const systems = [...new Set(all.map(e => e.source.system))];
    return Q.table({ id, rows, noun: 'evidence records', caption: 'Evidence', search: e => `${e.id} ${e.name} ${e.control} ${e.source.system} ${e.source.record}`, initialSeg,
      tools: `${searchBox('evidence')}${procFilter(process)}<select class="select" data-filter="system" aria-label="Source system"><option value="all">All sources</option>${systems.map(s => `<option>${s}</option>`).join('')}</select>
        ${Q.seg('Verification', [['all', 'All', all.length], ['verified', 'Verified', all.filter(e => e.status === 'Verified').length], ['pending', 'Pending', all.filter(e => e.status === 'Pending verification').length], ['gaps', 'Gaps', all.filter(Q.evGap).length]], initialSeg || 'all')}`,
      filters: { process: (e, v) => Q.inProc(e.process, v), system: (e, v) => e.source.system === v },
      segs: { verified: e => e.status === 'Verified', pending: e => e.status === 'Pending verification', gaps: Q.evGap },
      columns: [
        { key: 'name', label: 'Evidence', min: '260px', sort: e => e.name, render: e => `<span class="title">${esc(e.name)}</span><span class="sub">Control: ${esc(e.control)}</span>` },
        ...procCol(process),
        { key: 'iso', label: 'ISO', cls: 'c-num', sort: e => e.iso, render: e => `<span class="clause">${esc(e.iso)}</span>` },
        { key: 'src', label: 'Source', sort: e => e.source.system, render: e => `<span class="nowrap" style="display:inline-flex;gap:6px;align-items:center">${icon(SRC_ICON[e.source.system] || 'link')}${esc(e.source.system)}</span><span class="sub" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(e.source.record)}">${esc(e.source.record)}</span>` },
        { key: 'date', label: 'Record date', cls: 'c-date', sort: e => e.date || '', render: e => Q.fmt(e.date) },
        { key: 'owner', label: 'Owner', sort: e => Q.pname(e.owner), render: e => `<span class="nowrap">${esc(Q.pname(e.owner))}</span>` },
        { key: 'status', label: 'Verification', sort: e => e.status, render: e => Q.st(e.status, Q.EV_KIND[e.status]) },
        { key: 'act', label: 'Actions', cls: 'c-actions', render: e => Q.evGap(e) ? `<button class="btn sm" type="button" data-action="link-evidence" data-process="${e.process}" data-control="${esc(e.control)}" data-name="${esc(e.name)}" data-replace="${e.id}">${icon('link')}${e.status === 'Missing' ? 'Link Evidence' : 'Relink'}</button>` : `<button class="btn sm" type="button" data-action="toast" data-title="Open source record" data-msg="${esc(e.source.record)} would open in ${esc(e.source.system)}.">${icon('external-link')}Open Source</button>` }
      ], empty: t => t.seg === 'gaps' ? '<h3>No evidence gaps</h3><p>Every required record is linked.</p>' : '<h3>No evidence linked yet</h3><p>Link records from SharePoint, CRM, ERP, HRIS or upload a file.</p>' });
  };
  Q.findingTable = (id, { process = null } = {}) => Q.table({ id, rows: () => Q.S.findings.filter(f => !process || Q.inProc(f.process, process)), noun: 'findings', caption: 'Audit findings',
    search: f => `${f.id} ${f.title} ${f.audit}`,
    tools: `${searchBox('findings')}${procFilter(process)}<select class="select" data-filter="type" aria-label="Finding type"><option value="all">All types</option><option>Major nonconformity</option><option>Minor nonconformity</option><option>Observation</option><option>Opportunity for improvement</option></select><select class="select" data-filter="status" aria-label="Status"><option value="all">Open & closed</option><option>Open</option><option>Action Assigned</option><option>In Progress</option><option>Verification Required</option><option>Verified</option><option>Closed</option></select>`,
    filters: { process: (f, v) => Q.inProc(f.process, v), type: (f, v) => f.type === v, status: (f, v) => f.status === v },
    columns: [
      { key: 'id', label: 'ID', cls: 'c-id', sort: f => f.id, render: f => esc(f.id) },
      { key: 'title', label: 'Finding', sort: f => f.title, render: f => `<span class="title">${esc(f.title)}</span><span class="sub">Audit ${esc(f.audit)} · ${esc(Q.S.audits.find(a => a.id === f.audit)?.title || '')}</span>` },
      ...procCol(process),
      { key: 'type', label: 'Type', sort: f => f.type, render: f => Q.st(f.type, f.type.startsWith('Major') ? 'danger' : f.type.startsWith('Minor') ? 'warning' : 'neutral') },
      { key: 'clause', label: 'Clause', cls: 'c-num', render: f => `<span class="clause">${esc(f.clause)}</span>` },
      { key: 'raised', label: 'Raised', cls: 'c-date', sort: f => f.raised, render: f => Q.fmt(f.raised) },
      { key: 'status', label: 'Status', sort: f => f.status, render: f => Q.st(f.status, f.status === 'Closed' ? 'muted' : f.status === 'Open' ? 'warning' : 'info') },
      { key: 'ca', label: 'Corrective action', render: f => f.action ? `<a href="#/capa?focus=${f.action}" class="nowrap">${esc(f.action)}</a>` : '<span class="muted">Not required</span>' },
      { key: 'open', label: 'Actions', cls: 'c-actions', render: f => f.nc ? `<a class="btn sm" href="#/audits/nc/${f.nc.no}">Open NC</a>` : `<a class="btn sm ghost" href="#/audits/a/${f.audit}/findings">Open Audit</a>` }
    ], empty: '<h3>No audit findings for this process</h3>' });
  Q.actionTable = (id, { process = null, initialFilters } = {}) => Q.table({ id, rows: () => Q.S.actions.filter(a => !process || Q.inProc(a.process, process)), noun: 'corrective actions', caption: 'Corrective actions', initialFilters,
    search: a => `${a.id} ${a.title} ${a.source} ${a.rootCause}`,
    tools: `${searchBox('corrective actions')}${procFilter(process)}<select class="select" data-filter="status" aria-label="Status"><option value="all">All statuses</option><option value="open">Open</option><option value="overdue">Overdue</option><option value="closed">Closed</option></select>`,
    filters: { process: (a, v) => Q.inProc(a.process, v), status: (a, v) => v === 'open' ? !Q.actionClosed(a) : v === 'overdue' ? Q.actionOverdue(a) : Q.actionClosed(a) },
    columns: [
      { key: 'id', label: 'ID', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
      { key: 'title', label: 'Corrective action', sort: a => a.title, render: a => `<span class="title">${esc(a.title)}</span><span class="sub">Source: ${a.source.startsWith('F-') ? (() => { const f = Q.S.findings.find(x => x.id === a.source); return f?.nc ? `<a href="#/audits/nc/${f.nc.no}">${esc(f.nc.no)}</a> (${esc(f.audit)})` : `<a href="#/audits/a/${f?.audit}/findings">${esc(a.source)}</a>`; })() : esc(a.source)}</span>` },
      ...procCol(process),
      { key: 'root', label: 'Root cause', render: a => `<span class="small">${esc(a.rootCause)}</span>` },
      { key: 'stage', label: 'Stage', render: a => { const st = ['Root cause', 'Action', 'Effectiveness', 'Closed']; const i = st.indexOf(a.stage); return `<span class="nowrap">${i < 3 ? `Step ${i + 1} of 3 · ` : ''}${esc(a.stage)}</span>`; } },
      { key: 'owner', label: 'Owner', sort: a => Q.pname(a.owner), render: a => `<span class="nowrap">${esc(Q.pname(a.owner))}</span>` },
      { key: 'due', label: 'Due', cls: 'c-date', sort: a => a.due, render: a => Q.dueDate(a.due, Q.actionClosed(a)) },
      { key: 'status', label: 'Status', sort: a => a.status, render: a => Q.actionClosed(a) ? Q.st(a.status, 'muted') : Q.actionOverdue(a) ? Q.st('Overdue', 'danger') : Q.st(a.status, a.stage === 'Effectiveness' ? 'warning' : 'info') }
    ], empty: '<h3>No corrective actions</h3><p>Corrective actions are raised from findings, complaints and nonconformities.</p>' });
  Q.improvementTable = (id, { process = null } = {}) => Q.table({ id, rows: () => Q.S.improvements.filter(i => !process || Q.inProc(i.process, process)), noun: 'opportunities', caption: 'Improvement opportunities', foot: !process,
    columns: [
      { key: 'id', label: 'ID', cls: 'c-id', render: i => esc(i.id) },
      { key: 'area', label: 'Where', render: i => `<span class="title">${esc(i.area)}</span>` },
      ...procCol(process),
      { key: 'issue', label: 'Observed issue', render: i => esc(i.issue) },
      { key: 'prop', label: 'Potential improvement', render: i => esc(i.proposal) },
      { key: 'kind', label: 'Kind', render: i => `<span class="tag">${esc(i.kind)}</span>` },
      { key: 'owner', label: 'Owner', render: i => `<span class="nowrap">${esc(Q.pname(i.owner))}</span>` },
      { key: 'status', label: 'Status', render: i => Q.st(i.status, 'neutral') }
    ], empty: '<h3>No improvement opportunities recorded</h3><p>Record bottlenecks or manual work here — for example candidates for future workflow automation.</p>' });
  Q.isoTable = (id, { process = null, initialSeg } = {}) => {
    const rows = () => (process ? Q.isoForProcess(process) : Q.S.iso).map(r => ({ ...r, id: r.clause }));
    const all = rows();
    const n = k => all.filter(r => r.status === k).length;
    return Q.table({ id, rows, noun: 'requirements', caption: 'ISO 9001 requirement mapping', search: r => `${r.clause} ${r.title} ${r.note} ${r.controls.join(' ')}`, initialSeg,
      tools: `${searchBox('requirements')}${procFilter(process)}${Q.seg('Status', [['all', 'All', all.length], ['complete', 'Complete', n('Complete')], ['partial', 'Partial', n('Partially Complete')], ['atrisk', 'At risk', n('At Risk')], ['missing', 'Missing', n('Missing')], ['na', 'N/A', n('Not Applicable')]], initialSeg || 'all')}`,
      filters: { process: (r, v) => r.processes.some(p => Q.inProc(p, v)) },
      segs: { complete: r => r.status === 'Complete', partial: r => r.status === 'Partially Complete', atrisk: r => r.status === 'At Risk', missing: r => r.status === 'Missing', na: r => r.status === 'Not Applicable' },
      columns: [
        { key: 'clause', label: 'Clause', cls: 'c-num', sort: r => r.clause.split('.').map(x => x.padStart(2, '0')).join('.'), render: r => `<span class="clause">${esc(r.clause)}</span>` },
        { key: 'title', label: 'Requirement', sort: r => r.title, render: r => `<span class="title">${esc(r.title)}</span>${r.note ? `<span class="sub">${esc(r.note)}</span>` : ''}` },
        { key: 'proc', label: 'Process', render: r => r.processes.map(p => `<div>${Q.pcell(p)}</div>`).join('') },
        { key: 'controls', label: 'Controls / documents', render: r => r.controls.length ? r.controls.map(c => { const d = Q.doc(c); return d ? `<div><button class="link-btn tnum" type="button" data-action="open-doc" data-id="${c}" title="${esc(d.title)}">${esc(c)}</button> ${d.status !== 'Published' ? `<span class="small muted">${esc(d.status)}</span>` : Q.docOverdue(d) ? '<span class="small date-overdue">review overdue</span>' : ''}</div>` : ''; }).join('') : '<span class="muted">None</span>' },
        { key: 'ev', label: 'Evidence', render: r => { const ev = r.evidence.map(e => Q.S.evidence.find(x => x.id === e)).filter(Boolean); if (!ev.length) return '<span class="muted">—</span>'; const g = ev.filter(Q.evGap).length; return `<a href="#/evidence?focus=${ev[0].id}" class="nowrap">${ev.length} linked</a>${g ? ` <span class="attn nowrap">· ${g} missing</span>` : ''}`; } },
        { key: 'status', label: 'Status', sort: r => ['Missing', 'At Risk', 'Partially Complete', 'Complete', 'Not Applicable'].indexOf(r.status), render: r => Q.st(r.status, Q.ISO_KIND[r.status]) }
      ] });
  };

  /* =================== Link Evidence modal =================== */
  Q.actions['link-evidence'] = d => {
    const pid = d.process && d.process !== 'undefined' ? d.process : 'all';
    const root = Q.proc(Q.rootId(pid));
    const m = Q.openModal({ size: 'l', title: 'Link Evidence', sub: 'Evidence proves an activity occurred. Link the record where it lives — it does not need to be uploaded.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field full"><span>Evidence name <span class="req">*</span></span><input class="input" name="name" required value="${esc(d.name || '')}" autofocus></label>
        <label class="field"><span>Process <span class="req">*</span></span><select class="select" name="process" required><option value="">Select…</option>${Q.processOptions(pid, { all: '' })}</select></label>
        <label class="field"><span>Requirement / control <span class="req">*</span></span><select class="select" name="control" required>${root ? root.elements.map(e => `<option${e.name === d.control ? ' selected' : ''}>${esc(e.name)}</option>`).join('') : '<option value="">Select a process first</option>'}</select></label>
        <label class="field"><span>Source system <span class="req">*</span></span><select class="select" name="system" required>${Q.S.integrations.filter(i => i.id !== 'gdrive').map(i => `<option value="${i.id === 'm365' ? 'SharePoint' : i.id === 'upload' ? 'Upload' : i.name}">${esc(i.id === 'm365' ? 'SharePoint / OneDrive (Microsoft 365)' : i.name)}${i.status === 'Planned' ? ' — manual reference until connected' : ''}</option>`).join('')}</select></label>
        <label class="field"><span>Record date</span><input class="input" type="date" name="date" value="${Q.today()}"></label>
        <label class="field full"><span>Source record or link <span class="req">*</span></span><input class="input" name="record" required placeholder="e.g. https://…sharepoint.com/… or CRM case CC-2026-031"></label>
        <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(root?.owner || Q.me())}</select></label>
        <label class="field"><span>Related document</span><select class="select" name="doc"><option value="">None</option>${Q.S.documents.filter(x => pid === 'all' || Q.inProc(x.process, pid)).map(x => `<option value="${x.id}"${x.id === d.doc ? ' selected' : ''}>${esc(x.id + ' · ' + x.title)}</option>`).join('')}</select></label>
      </div></form>`,
      foot: `<span class="left">New evidence starts as “Pending verification”.</span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Link Evidence</button>`,
      onMount: el => el.querySelector('[name="process"]').addEventListener('change', e => { const r = Q.proc(Q.rootId(e.target.value)); el.querySelector('[name="control"]').innerHTML = r ? r.elements.map(x => `<option>${esc(x.name)}</option>`).join('') : ''; }) });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return;
      const v = Q.formValues(f);
      const iso = Q.S.iso.find(r => r.processes.includes(Q.rootId(v.process)))?.clause || '';
      const rec = { id: d.replace || `E-${String(Q.S.evidence.length + 1).padStart(3, '0')}`, name: v.name, process: v.process, control: v.control, source: { system: v.system, record: v.record }, date: v.date, owner: v.owner, status: 'Pending verification', iso, doc: v.doc || null };
      if (d.replace) { const i = Q.S.evidence.findIndex(e => e.id === d.replace); rec.iso = Q.S.evidence[i].iso; Q.S.evidence[i] = rec; } else Q.S.evidence.push(rec);
      if (v.doc) { const doc = Q.doc(v.doc); if (doc && !doc.evidence.includes(rec.id)) doc.evidence.push(rec.id); }
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true });
      Q.toast('Evidence linked', `${rec.id} · pending verification by the process owner.`);
    });
  };

  /* =================== Process Workspace =================== */
  /* One template for every process. Tabs come from Settings → Process Workspace
   * (show/hide, rename, reorder); each tab shows how many records it holds, and empty
   * tabs are muted or hidden. Documents, Risks and KPIs tabs use the same saved views
   * as their main pages, filtered to this process (and its subprocesses).          */
  Q.WS_TABS = { overview: 'Summary', definition: 'Definition', documents: 'Documents', risks: 'Risks & Opportunities', kpis: 'Objectives & KPIs', evidence: 'Evidence', audit: 'Audit & Actions', iso: 'ISO Mapping', activity: 'Activity' };
  const NO_COUNT = new Set(['overview', 'definition', 'activity']);
  Q.wsConfig = () => {
    const S = Q.S;
    if (!S.workspace) { S.workspace = JSON.parse(JSON.stringify(window.QMS_DATA.workspace)); Q.save(); }
    // Update 20: saved configurations get the new Definition and Activity tabs once; a renamed Overview keeps its name.
    if (!S.workspace.v20) {
      const t = S.workspace.tabs, ov = t.find(x => x.key === 'overview');
      if (ov && ov.label === 'Overview') ov.label = 'Summary';
      if (!t.some(x => x.key === 'definition')) t.splice(t.findIndex(x => x.key === 'overview') + 1, 0, { key: 'definition', label: 'Definition', visible: true });
      if (!t.some(x => x.key === 'activity')) t.push({ key: 'activity', label: 'Activity', visible: true });
      S.workspace.v20 = true; Q.save();
    }
    return S.workspace;
  };
  const tabCount = (k, s) => ({ documents: s.docs, risks: Q.S.risks.filter(r => Q.inProc(r.process, s.pid)).length, kpis: s.kpis, evidence: s.evidence,
    audit: Q.S.findings.filter(f => Q.inProc(f.process, s.pid)).length + Q.S.actions.filter(a => Q.inProc(a.process, s.pid)).length + Q.S.improvements.filter(i => Q.inProc(i.process, s.pid)).length, iso: s.iso.total })[k];
  Q.views.process = (parts, q = {}) => {
    const pid = parts[0];
    const p = Q.proc(pid);
    if (!p) return { title: 'Process not found', html: Q.pageHead({ title: 'Process not found', sub: 'It may have been archived or removed from the process structure.' }) + '<a class="btn" href="#/settings/processes">Open Process Structure</a>' };
    const cfg = Q.wsConfig(), s = { ...Q.stats(pid), pid }, parent = Q.proc(p.parent_process_id), kids = Q.children(pid);
    const shown = cfg.tabs.filter(t => t.key === 'overview' || t.visible);
    let tab = parts[1] || 'overview';
    if (!shown.some(t => t.key === tab)) { location.replace(`#/process/${pid}`); return { title: p.name, nav: 'process', html: '' }; }
    const label = k => (cfg.tabs.find(t => t.key === k)?.label) || Q.WS_TABS[k];
    const note = { documents: s.docsOverdue ? `${s.docsOverdue} overdue` : '', risks: s.highRisks ? `${s.highRisks} high` : '', kpis: s.kpisBelow ? `${s.kpisBelow} below` : '', evidence: s.evGaps ? `${s.evGaps} missing` : '', audit: s.actionsOverdue ? `${s.actionsOverdue} overdue` : '', iso: s.isoGaps ? `${s.isoGaps} gaps` : '' };
    const tabsHtml = `<div class="tabs ws-tabs" role="tablist" aria-label="Process workspace">${shown.map(t => {
      const n = NO_COUNT.has(t.key) ? null : tabCount(t.key, s), empty = n === 0;
      if (empty && cfg.emptyTabs === 'hide' && t.key !== tab) return '';
      return `<a role="tab" href="#/process/${pid}${t.key === 'overview' ? '' : '/' + t.key}" aria-selected="${t.key === tab}" class="${empty ? 'empty' : ''}" ${empty ? 'title="Nothing recorded for this process yet"' : ''}>${esc(t.label || Q.WS_TABS[t.key])}${note[t.key] ? `<span class="tab-note" title="${n} in total">${note[t.key]}</span>` : n != null ? `<span class="tab-n">${n}</span>` : ''}</a>`;
    }).join('')}<a class="ws-config" href="#/settings/workspace" title="Choose which tabs every process shows">${icon('settings')}<span class="sr-only">Configure process workspace tabs</span></a></div>`;
    const crumbs = [['QMS', '#/qms/scope'], ['Processes', '#/qms/processes'], ...(parent ? [[`${parent.process_code} ${parent.name}`, `#/process/${parent.process_id}`]] : []), [`${p.process_code} ${p.name}`, `#/process/${pid}`], ...(tab !== 'overview' ? [[label(tab)]] : [])];
    const head = Q.pageHead({ crumbs, title: `<span class="proc-code">${esc(p.process_code)}</span>${esc(p.name)}`,
      meta: `<div class="meta-line"><span>Process Owner <b>${esc(Q.pname(p.owner))}</b> · ${esc(Q.person(p.owner).title)}</span><span>Department <b>${esc(p.department)}</b></span><span>ISO 9001 <b>${p.iso.join(', ')}</b></span>${kids.length ? `<span>${kids.length} subprocesses</span>` : ''}${parent ? `<span>Subprocess of <a href="#/process/${parent.process_id}">${esc(parent.name)}</a></span>` : ''}</div>`,
      actions: Q.menu('Add to this process', [
        { label: 'Register Document', icon: 'file-plus', data: { action: 'connect-doc', process: pid } },
        { label: 'Link Evidence', icon: 'paperclip', data: { action: 'link-evidence', process: pid } },
        { label: 'Add Risk or Opportunity', icon: 'shield-alert', data: { action: 'assess-risk', process: pid } },
        { label: 'Add KPI', icon: 'target', data: { action: 'toast', title: 'Add KPI', msg: 'KPI entry form is not part of this mock.' } },
        { label: 'Record Improvement Opportunity', icon: 'route', data: { action: 'add-improvement', process: pid } }
      ], { icon: 'plus', text: 'Add', cls: 'btn' }) + `<a class="btn" href="#/settings/processes?select=${pid}">${icon('pencil')}Edit Process</a>` });
    // Saved views inside the process: same views as the main page, filtered to this process.
    const viewTab = (type, tableFn, extraBody = null) => {
      const ctx = { route: `#/process/${pid}/${tab}`, base: r => Q.inProc(r.process, pid), hide: ['process'] };
      const r = Q.vwResolve(type, q, ctx);
      if (r.redirect) return { redirect: r.redirect };
      const v = r.v, where = Q.vwWhere(type, v);
      const flag = { documents: Q.docGroupFlag, kpis: Q.kpiGroupFlag, risks: Q.riskGroupFlag }[type];
      const g = (extraBody && extraBody(v, where)) || (Q.vwFieldGroup(v.group) ? Q.vwGrouped(type, v, where, q, tableFn, { process: pid, flag })
        : { html: tableFn(Q.vwTableId(type, v, 'in-' + pid), { process: pid, columns: v.columns, where, initialSort: v.sort, bare: true, extraTools: Q.vwSummary(type, v) }) });
      return { html: Q.vwCard(type, v, g.html, g.side), after: main => Q.vwAfter(type, main) };
    };
    let body = '', after = null, res = null;
    if (tab === 'overview') body = processSummary(p, s, kids);
    else if (tab === 'definition') body = processDefinition(p, kids);
    else if (tab === 'activity') body = processActivity(p);
    else if (tab === 'documents') res = viewTab('documents', Q.docTable, (v, where) => v.group === 'clause' ? Q.docsByClause(v, v, where, q.c || (Q.CLAUSES.find(([k]) => Q.docsForClause(k).some(where)) || ['4'])[0]) : null);
    else if (tab === 'risks') res = viewTab('risks', Q.riskTable);
    else if (tab === 'kpis') res = viewTab('kpis', Q.kpiTable);
    else if (tab === 'evidence') body = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn" type="button" data-action="link-evidence" data-process="${pid}">${icon('link')}Link Evidence</button></div>` + Q.evTable('p-ev', { process: pid });
    else if (tab === 'audit') body = `<section class="section"><div class="section-head"><h2>Audit findings</h2></div>${Q.findingTable('p-find', { process: pid })}</section>
      <section class="section"><div class="section-head"><h2>Corrective actions</h2><span class="sub">Finding → root cause → action → effectiveness</span></div>${Q.actionTable('p-ca', { process: pid })}</section>
      <section class="section"><div class="section-head"><h2>Improvement opportunities</h2><span class="sub">Including bottlenecks that could be automated in future</span><div class="actions"><button class="btn sm" type="button" data-action="add-improvement" data-process="${pid}">${icon('plus')}Record Opportunity</button></div></div>${Q.improvementTable('p-imp', { process: pid })}</section>`;
    else if (tab === 'iso') body = `<section class="panel" style="margin-bottom:20px"><div class="panel-pad">${Q.readinessBlock(Q.isoForProcess(pid), { link: `#/process/${pid}/iso` })}</div></section>` + Q.isoTable('p-iso', { process: pid });
    if (res?.redirect) { location.replace(res.redirect); return { title: p.name, nav: 'process', html: '' }; }
    if (res) { body = res.html; after = res.after; }
    const empty = !NO_COUNT.has(tab) && tabCount(tab, s) === 0;
    const emptyNote = empty ? `<div class="callout" style="margin-bottom:16px">${icon('info')}<span><b>Nothing recorded for ${esc(p.name)} yet</b>This tab is part of every process. Add the first record with <b>Add</b> above, or hide empty tabs in <a href="#/settings/workspace">Settings → Process Workspace</a>.</span></div>` : '';
    return { title: `${p.name}${tab !== 'overview' ? ' · ' + label(tab) : ''}`, nav: 'process', html: head + tabsHtml + emptyNote + body, after };
  };

  /* Update 20 — the workspace opens on a short Summary: four numbers and one "Needs attention" list.
   * Definition, Activity and ISO readiness have their own tabs. */
  const HEALTH = { ok: ['On track', 'success'], attn: ['Needs attention', 'warning'], risk: ['At risk', 'danger'] };
  Q.processAttention = pid => [
    ...Q.S.documents.filter(d => Q.inProc(d.process, pid) && Q.docOverdue(d)).map(d => ({ icon: 'file-text', title: d.title, meta: `${d.id} · Rev ${d.rev}`, kind: 'Document', owner: d.owner, due: d.nextReview, action: 'open-doc', data: { id: d.id }, right: Q.ui.badge('Review overdue', 'danger'), tone: 'danger', w: 1 })),
    ...Q.S.risks.filter(r => Q.inProc(r.process, pid) && r.kind === 'Risk' && Q.riskLevel(r) === 'High').map(r => ({ icon: 'shield-alert', title: r.title, meta: `${r.id} · score ${Q.riskScore(r)}`, kind: 'Risk', owner: r.owner, due: r.due, href: `#/process/${pid}/risks?focus=${r.id}`, right: Q.ui.badge('High risk', 'danger'), tone: 'danger', w: 2 })),
    ...Q.S.actions.filter(a => Q.inProc(a.process, pid) && !Q.actionClosed(a)).map(a => ({ icon: 'list-checks', title: a.title, meta: `${a.id} · ${a.stage}`, kind: 'Corrective action', owner: a.owner, due: a.due, href: `#/process/${pid}/audit`, right: Q.actionOverdue(a) ? Q.ui.badge('Overdue', 'danger') : Q.ui.badge('Open', 'info'), tone: Q.actionOverdue(a) ? 'danger' : '', w: Q.actionOverdue(a) ? 3 : 7 })),
    ...Q.S.kpis.filter(k => Q.inProc(k.process, pid) && !Q.kpiOk(k)).map(k => ({ icon: 'target', title: k.name, meta: `${Q.kpiFmt(k.actual, k)} vs target ${k.dir} ${Q.kpiFmt(k.target, k)}`, kind: 'KPI', owner: k.owner, dueText: k.period, href: Q.K ? `#/qms/objectives/k/${k.id}` : `#/process/${pid}/kpis`, right: Q.ui.badge('Below target', 'danger'), tone: 'warning', w: 4 })),
    ...Q.S.evidence.filter(e => Q.inProc(e.process, pid) && Q.evGap(e)).map(e => ({ icon: 'paperclip', title: e.name, meta: `Control: ${e.control} · ISO ${e.iso}`, kind: 'Evidence', owner: Q.proc(e.process)?.owner, action: 'link-evidence', data: { process: e.process, control: e.control, name: e.name, replace: e.id }, right: Q.ui.badge(e.status === 'Missing' ? 'Missing' : 'Unavailable', 'warning'), tone: 'warning', w: 5 })),
    ...Q.S.workflows.filter(w => Q.inProc(Q.doc(w.doc)?.process, pid)).map(w => ({ icon: 'file-check', title: `${Q.doc(w.doc).title} Rev ${w.rev}`, meta: `Waiting for ${Q.wfAssignees(w).map(Q.pname).join(', ')}`, kind: 'Document review', owner: Q.wfAssignees(w)[0], due: w.due, href: `#/review/${w.id}`, right: Q.ui.badge(Q.wfStatus(w), 'info'), w: 6 }))
  ].sort((x, y) => x.w - y.w);
  function processSummary(p, s, kids) {
    const pid = p.process_id, [hl, hk] = HEALTH[s.health] || HEALTH.ok, S = Q.S, inP = x => Q.inProc(x.process, pid);
    const pct = (n, t) => t ? Math.round(n / t * 100) : 100;
    const docs = S.documents.filter(inP), ev = S.evidence.filter(inP), kp = S.kpis.filter(inP), ca = S.actions.filter(inP);
    const iso = Q.isoForProcess(pid), isoPct = Q.isoScore(iso).pct ?? 0;
    const bar = (label, n, t, note, tab) => ({ label, pct: pct(n, t), value: t ? `${n}/${t}` : '—', note, href: `#/process/${pid}/${tab}`, tone: t && n < t ? (pct(n, t) < 50 ? 'danger' : 'warning') : '' });
    return Q.ui.summary({
      stats: [
        { label: 'Process health', value: hl, icon: 'activity', tone: hk === 'success' ? null : hk, note: s.findings ? `${s.findings} open audit finding${s.findings === 1 ? '' : 's'}` : 'no open findings', href: `#/process/${pid}/audit` },
        { label: 'Documents overdue', value: s.docsOverdue, icon: 'files', tone: s.docsOverdue ? 'danger' : null, note: `of ${s.docs} documents`, href: `#/process/${pid}/documents` },
        { label: 'High risks', value: s.highRisks, icon: 'shield-alert', tone: s.highRisks ? 'danger' : null, note: `${s.openRisks} open risks & opportunities`, href: `#/process/${pid}/risks` },
        { label: 'KPIs below target', value: s.kpisBelow, icon: 'target', tone: s.kpisBelow ? 'warning' : null, note: `of ${s.kpis} KPIs`, href: `#/process/${pid}/kpis` }],
      breakdown: { title: 'Process controls', link: { href: `#/process/${pid}/iso`, text: 'ISO Mapping' }, rings: {
          outer: { pct: pct(docs.filter(d => !Q.docOverdue(d)).length + ev.filter(e => !Q.evGap(e)).length + kp.filter(Q.kpiOk).length + ca.filter(a => !Q.actionOverdue(a)).length, docs.length + ev.length + kp.length + ca.length), label: 'Completeness' },
          inner: { pct: isoPct, label: 'ISO readiness', note: `${iso.length} requirement${iso.length === 1 ? "" : "s"} mapped` } },
        bars: [
          bar('Documents current', docs.filter(d => !Q.docOverdue(d)).length, docs.length, 'not overdue for review', 'documents'),
          bar('Evidence linked', ev.filter(e => !Q.evGap(e)).length, ev.length, 'no missing links', 'evidence'),
          bar('KPIs on target', kp.filter(Q.kpiOk).length, kp.length, kp[0] ? kp[0].period : 'no KPIs', 'kpis'),
          bar('Actions on time', ca.filter(a => !Q.actionOverdue(a)).length, ca.length, 'corrective actions', 'audit')] },
      attention: Q.processAttention(pid), search: 'Search documents, risks, KPIs…', empty: 'Nothing needs attention. Documents are current, KPIs are on target and evidence is linked.',
      action: `<button class="btn primary" type="button" data-action="link-evidence" data-process="${pid}">${icon('link')}Link Evidence</button>` });
  }
  function processDefinition(p, kids) {
    const coverage = e => {
      const d = e.doc && Q.doc(e.doc), ev = e.ev && Q.S.evidence.find(x => x.id === e.ev);
      const parts = [];
      if (d) parts.push(`<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${d.id}">${esc(d.id)}</button> ${d.rev ? `Rev ${esc(d.rev)}` : ''} ${d.status !== 'Published' ? Q.st(d.status) : Q.docOverdue(d) ? '<span class="date-overdue small">review overdue</span>' : ''}`);
      if (ev) parts.push(`${Q.st(ev.status === 'Verified' ? 'Evidence verified' : ev.status, Q.EV_KIND[ev.status])}`);
      if (!d && !ev) parts.push(e.kind === 'Activity' || e.kind === 'Record' ? '<span class="muted small">Recorded in registers</span>' : '<span class="st danger">No controlled document linked</span>');
      return parts.join(' · ');
    };
    const list = xs => xs?.length ? `<ul class="bullets">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">—</span>';
    return `<div class="tab-split"><div class="tab-stack">
        ${Q.ui.card({ title: 'Process definition', info: 'ISO 9001 clause 4.4.1 — inputs, outputs, responsibilities.', actions: `<a class="ui-link" href="#/settings/processes?select=${p.process_id}">Edit${icon('chevron-right')}</a>`, body: `<dl class="kv">
          <dt>Purpose</dt><dd>${esc(p.purpose)}</dd><dt>Inputs</dt><dd>${list(p.inputs)}</dd><dt>Outputs</dt><dd>${list(p.outputs)}</dd>
          <dt>Responsible roles</dt><dd>${list(p.roles)}</dd><dt>Process owner</dt><dd>${esc(Q.pname(p.owner))}, ${esc(Q.person(p.owner).title)}</dd></dl>` })}
        <section class="panel"><div class="panel-head"><h2>Process elements</h2><span class="muted small">${(p.elements || []).length}</span>${Q.ui.info('What this process consists of, and what controls or evidences each element.')}</div>
          ${(p.elements || []).length ? `<ul class="elements">${p.elements.map(e => `<li><span class="title">${esc(e.name)}</span><span class="kind">${esc(e.kind)}</span><span>${coverage(e)}</span></li>`).join('')}</ul>` : '<div class="empty small">No elements defined.</div>'}</section>
      </div><div class="tab-stack">
        ${kids.length ? Q.ui.card({ title: 'Subprocesses', count: kids.length, flush: true, body: Q.ui.list(kids.map(k => ({ icon: 'workflow', title: `${k.process_code} ${k.name}`, meta: k.purpose, href: `#/process/${k.process_id}` }))) }) : ''}
        ${Q.ui.card({ title: 'ISO 9001 clauses', link: { href: `#/process/${p.process_id}/iso`, text: 'ISO Mapping' }, body: `<div class="ui-demo-row">${(p.iso || []).map(c => Q.ui.badge(c)).join(' ') || '<span class="muted">None mapped.</span>'}</div>` })}
      </div></div>`;
  }
  function processActivity(p) {
    const act = Q.S.activity.filter(a => Q.inProc(a.process, p.process_id));
    return `<section class="panel" style="max-width:880px"><div class="panel-head"><h2>Activity</h2><span class="muted small">${act.length}</span></div>${act.length ? `<ul class="activity">${act.map(a => `<li><span>${Q.who(a.who)} ${esc(a.text)}</span><span class="when">${Q.fmt(a.date)}</span></li>`).join('')}</ul>` : '<div class="empty small">No activity recorded for this process yet.</div>'}</section>`;
  }
  Q.actions['add-improvement'] = d => {
    const root = Q.proc(Q.rootId(d.process));
    const m = Q.openModal({ size: 'm', title: 'Record Improvement Opportunity', sub: esc(Q.plabel(d.process)),
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field"><span>Where <span class="req">*</span></span><select class="select" name="area" required>${root.elements.map(e => `<option>${esc(e.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Kind</span><select class="select" name="kind"><option>Improvement opportunity</option><option>Automation opportunity</option></select><span class="help">Automation opportunities are captured for future planning only.</span></label>
        <label class="field full"><span>Observed issue or bottleneck <span class="req">*</span></span><textarea class="textarea" name="issue" required placeholder="e.g. Manual data entry between ERP and spreadsheet"></textarea></label>
        <label class="field full"><span>Potential improvement</span><input class="input" name="proposal"></label>
      </div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Record Opportunity</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      Q.S.improvements.push({ id: `IO-${String(Q.S.improvements.length + 1).padStart(2, '0')}`, process: d.process, area: v.area, issue: v.issue, proposal: v.proposal || '—', kind: v.kind, status: 'Proposed', owner: root.owner });
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Opportunity recorded');
    });
  };

  /* =================== Reports (process-aware) =================== */
  const REPORTS = [
    ['iso', 'ISO Readiness by Process', 'Requirements mapped to each process and their status.', s => [['Requirements', s.iso.total], ['Readiness', s.iso.pct == null ? '—' : s.iso.pct + '%'], ['Gaps', s.isoGaps]]],
    ['risks', 'Risks by Process', 'Open risks and opportunities, and high-rated risks.', s => [['Open', s.openRisks], ['High', s.highRisks]]],
    ['docs', 'Overdue Documents by Process', 'Documents past their periodic review date or in workflow.', s => [['Documents', s.docs], ['Overdue', s.docsOverdue], ['In workflow', s.docsInWorkflow]]],
    ['kpis', 'KPIs by Process', 'KPIs measured and those below target.', s => [['KPIs', s.kpis], ['Below target', s.kpisBelow]]],
    ['findings', 'Audit Findings by Process', 'Open findings, including major nonconformities.', s => [['Open findings', s.findings], ['Major', s.majorFindings]]],
    ['actions', 'Corrective Actions by Process', 'Open and overdue corrective actions.', s => [['Open', s.actions], ['Overdue', s.actionsOverdue]]],
    ['evidence', 'Evidence Gaps by Process', 'Evidence records and missing or unavailable links.', s => [['Linked', s.evidence], ['Gaps', s.evGaps]]]
  ];
  Q.reportsBody = key => {
    const cur = REPORTS.find(r => r[0] === key) || REPORTS[0];
    const rows = Q.topProcesses().map(p => ({ p, s: Q.stats(p.process_id) }));
    const cols = cur[3](rows[0].s).map(c => c[0]);
    return `<div class="settings-layout"><nav class="settings-nav" aria-label="Reports">${REPORTS.map(r => `<a href="#/mgmt-review/reports?r=${r[0]}" ${r === cur ? 'aria-current="page"' : ''}>${esc(r[1])}</a>`).join('')}</nav>
      <section><div class="section-head"><h2>${esc(cur[1])}</h2><span class="sub">${esc(cur[2])}</span><div class="actions"><button class="btn sm" type="button" data-action="toast" data-title="Export" data-msg="${esc(cur[1])} would be exported to Excel.">${icon('download')}Export</button></div></div>
      <div class="table-wrap"><div class="table-scroll"><table class="dt"><caption class="sr-only">${esc(cur[1])}</caption><thead><tr><th>Process</th><th>Owner</th>${cols.map(c => `<th class="c-num">${esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rows.map(({ p, s }) => `<tr><td>${Q.pcell(p.process_id)}</td><td>${esc(Q.pname(p.owner))}</td>${cur[3](s).map(([k, v], i) => `<td class="c-num">${i > 0 && Number(v) > 0 ? `<span class="${/Gaps|Overdue|High|Below|Major/.test(k) ? 'attn' : ''}">${v}</span>` : v === 0 ? '<span class="zero">0</span>' : v}</td>`).join('')}<td class="c-actions"><a class="btn sm ghost" href="#/process/${p.process_id}">Open</a></td></tr>`).join('')}
      </tbody></table></div></div></section></div>`;
  };
})();
