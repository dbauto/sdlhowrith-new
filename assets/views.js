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
    const seg = (k, cls) => c[k] ? `<span class="${cls}" style="width:${c[k] / a * 100}%" title="${k}: ${c[k]}"></span>` : '';
    const leg = (k, color, filter) => `<button type="button" data-go="${link}${link.includes('?') ? '&' : '?'}status=${filter}"><i style="background:${color}"></i>${k} <b class="tnum">${c[k]}</b></button>`;
    return `<div class="readiness">
      <div><div class="pct">${s.pct ?? '—'}<small>%</small></div><div class="small muted">${s.points} of ${s.applicable} applicable requirements</div></div>
      <div><div class="stack-bar" role="img" aria-label="Complete ${c['Complete']}, partially complete ${c['Partially Complete']}, at risk ${c['At Risk']}, missing ${c['Missing']}">${seg('Complete', 'b-complete')}${seg('Partially Complete', 'b-partial')}${seg('At Risk', 'b-atrisk')}${seg('Missing', 'b-missing')}</div>
      <div class="legend">${leg('Complete', 'var(--success)', 'complete')}${leg('Partially Complete', '#E0A43A', 'partial')}${leg('At Risk', 'var(--orange)', 'atrisk')}${leg('Missing', 'var(--danger)', 'missing')}<span class="muted">Not applicable ${c['Not Applicable']}</span></div>
      ${compact ? '' : `<details class="explain"><summary>${icon('chevron-right')}How is this calculated?</summary><div class="explain-body">
        Each ISO 9001 requirement is mapped to the processes, controls and evidence that satisfy it and given a status by the QMS Manager.<br>
        <span class="formula">Readiness = (Complete × 1 + Partially complete × 0.5 + At risk × 0 + Missing × 0) ÷ applicable requirements</span><br>
        <span class="formula">= (${c['Complete']} + ${c['Partially Complete']} × 0.5) ÷ ${s.applicable} = ${s.points} ÷ ${s.applicable} = <b>${s.pct}%</b></span><br>
        Not-applicable requirements (${c['Not Applicable']}) are excluded. This is a readiness indicator, not a certification result.</div></details>`}</div></div>`;
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) Q.go(b.dataset.go); });

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
    const cell = (href, label, v, d, cls = 'bad', ic = '') => `<a href="${href}"><span class="k">${ic ? icon(ic) : ''}${label}</span><div class="v ${v ? cls : ''}">${v}</div><div class="d">${d}</div></a>`;
    const strip = `<div class="attention-strip" role="list" aria-label="What requires attention">
      ${cell('#/documents?status=overdue', 'Overdue documents', docsOverdue.length, `review date passed · ${S.documents.filter(Q.docDueSoon).length} due in 30 days`)}
      ${cell('#/review?show=all', 'Pending approvals', approvals.length, `${mineApprovals} assigned to you`, 'warn')}
      ${cell('#/risks?level=High', 'High risks', high.length, `${S.risks.filter(r => Q.riskOpen(r)).length} open risks & opportunities`)}
      ${cell('#/qms/objectives?status=below', 'KPIs below target', kpiBelow.length, `of ${S.kpis.length} KPIs measured`, 'warn')}
      ${cell('#/evidence?status=gaps', 'Evidence gaps', gaps.length, `${S.evidence.filter(e => e.status === 'Pending verification').length} awaiting verification`)}
      ${cell('#/capa?status=overdue', 'Overdue actions', overdueActions.length, `${openActions.length} corrective actions open`)}</div>`;

    // Needs your action
    const work = [
      ...Q.myWorkflows().map(w => { const d = Q.doc(w.doc); const verb = w.stage === 'review' ? 'Review' : w.stage === 'approval' ? 'Approve' : 'Publish'; return { due: w.due, ic: w.stage === 'publication' ? 'send' : w.stage === 'approval' ? 'stamp' : 'file-search', title: `${verb}: ${d.title} Rev ${w.rev}`, meta: `${Q.plabel(d.process)} · due ${Q.fmt(w.due)}`, overdue: w.due < today, btn: `<a class="btn sm" href="#/review/${w.id}">Open Review</a>` }; }),
      ...S.actions.filter(a => a.owner === me && !Q.actionClosed(a)).map(a => ({ due: a.due, ic: 'list-checks', title: `Corrective action: ${a.title}`, meta: `${a.id} · ${a.stage} · due ${Q.fmt(a.due)}`, overdue: a.due < today, btn: `<a class="btn sm" href="#/capa?focus=${a.id}">View</a>` })),
      ...S.documents.filter(d => d.owner === me && Q.docOverdue(d)).map(d => ({ due: d.nextReview, ic: 'calendar-clock', title: `Periodic review: ${d.title}`, meta: `${d.id} · review was due ${Q.fmt(d.nextReview)}`, overdue: true, btn: `<button class="btn sm" type="button" data-action="create-revision" data-id="${d.id}">Create Revision</button>` }))
    ].sort((a, b) => a.due < b.due ? -1 : 1);
    const workHtml = work.length ? `<ul class="worklist">${work.map(w => `<li><span class="w-kind">${icon(w.ic)}</span><div class="w-main"><div class="w-title">${esc(w.title)}</div><div class="w-meta">${w.overdue ? `<span class="date-overdue">Overdue</span> · ` : ''}${esc(w.meta)}</div></div>${w.btn}</li>`).join('')}</ul>` : '<div class="empty"><h3>Nothing needs your action today.</h3></div>';

    // Process status table
    const procRows = () => Q.topProcesses().map(p => ({ ...p, id: p.process_id, s: Q.stats(p.process_id) }));
    const procTable = Q.table({
      id: 'ovproc', rows: procRows, key: r => r.id, noun: 'processes', caption: 'Process status', foot: false,
      tools: `${Q.seg('Show', [['all', 'All processes', procRows().length], ['attn', 'Needs attention', procRows().filter(r => r.s.health !== 'ok').length]], 'all')}<span class="right">Counts include subprocesses. Select a process name to open its workspace.</span>`,
      segs: { attn: r => r.s.health !== 'ok' },
      columns: [
        { key: 'name', label: 'Process', sort: r => r.display_order, render: r => `<a class="proc" href="#/process/${r.id}"><b>${esc(r.process_code)}</b><span class="title">${esc(r.name)}</span></a>` },
        { key: 'owner', label: 'Owner', sort: r => Q.pname(r.owner), render: r => `<span class="nowrap">${esc(Q.pname(r.owner))}</span>` },
        { key: 'health', label: 'Status', sort: r => ({ risk: 0, attn: 1, ok: 2 })[r.s.health], render: r => Q.health(r.s.health) },
        { key: 'docs', label: 'Docs overdue', cls: 'c-num', sort: r => r.s.docsOverdue, render: r => Q.num(r.s.docsOverdue) },
        { key: 'risks', label: 'High risks', cls: 'c-num', sort: r => r.s.highRisks, render: r => Q.num(r.s.highRisks) },
        { key: 'kpi', label: 'KPIs off target', cls: 'c-num', sort: r => r.s.kpisBelow, render: r => Q.num(r.s.kpisBelow, 'warnv') },
        { key: 'ev', label: 'Evidence gaps', cls: 'c-num', sort: r => r.s.evGaps, render: r => Q.num(r.s.evGaps) },
        { key: 'ca', label: 'Open actions', cls: 'c-num', sort: r => r.s.actions, render: r => r.s.actions ? `${r.s.actions}${r.s.actionsOverdue ? ` <span class="attn">(${r.s.actionsOverdue} overdue)</span>` : ''}` : '<span class="zero">—</span>' },
        { key: 'iso', label: 'ISO readiness', sort: r => r.s.iso.pct ?? -1, render: r => Q.miniProgress(r.s.iso.pct) }
      ]
    });

    const upcoming = S.documents.filter(d => d.nextReview && d.nextReview >= today && Q.days(today, d.nextReview) <= 60).sort((a, b) => a.nextReview < b.nextReview ? -1 : 1);
    const mgmt = S.managementActions;
    return {
      title: 'Overview',
      html: Q.pageHead({ title: 'Overview', sub: `What needs attention across ${esc(S.organization.name)}'s processes today, ${Q.fmt(today)}.` }) +
        strip +
        `<div class="grid-halves section" style="margin-top:24px">
          <section class="panel"><div class="panel-head"><h2>ISO 9001 readiness</h2><span class="muted small">${esc(S.organization.standard)}</span><div class="actions"><a class="btn sm" href="#/evidence?view=clause">Open by clause</a></div></div><div class="panel-pad">${Q.readinessBlock(S.iso)}
            <p class="small" style="margin-top:14px"><b>Largest gaps:</b> ${S.iso.filter(r => ['Missing', 'At Risk'].includes(r.status)).map(r => `<a href="#/evidence?view=clause&c=${r.clause}">${r.clause} ${esc(r.title)}</a>`).join(' · ')}</p></div></section>
          <section class="panel"><div class="panel-head"><h2>Needs your action</h2><span class="muted small">${work.length}</span></div>${workHtml}</section>
        </div>
        <section class="section"><div class="section-head"><h2>Process status</h2><span class="sub">Which processes have problems?</span></div>${procTable}</section>
        <div class="grid-halves section">
          <section class="panel"><div class="panel-head"><h2>Upcoming document reviews</h2><span class="muted small">next 60 days</span><div class="actions"><a class="btn sm ghost" href="#/documents?status=overdue">View overdue</a></div></div>
            ${upcoming.length ? `<ul class="worklist">${upcoming.map(d => `<li><div class="w-main"><div class="w-title">${esc(d.title)}</div><div class="w-meta tnum">${esc(d.id)} · Rev ${esc(d.rev)} · ${esc(Q.pname(d.owner))}</div></div><span class="date-soon nowrap">${Q.fmt(d.nextReview)}</span><button class="btn sm" type="button" data-action="open-doc" data-id="${d.id}">Open Document</button></li>`).join('')}</ul>` : '<div class="empty">No reviews due in the next 60 days.</div>'}</section>
          <section class="panel"><div class="panel-head"><h2>Management actions</h2><span class="muted small">from management review</span><div class="actions"><a class="btn sm ghost" href="#/mgmt-review/actions">Management Review</a></div></div>
            <ul class="worklist">${mgmt.map(a => `<li><div class="w-main"><div class="w-title">${esc(a.title)}</div><div class="w-meta">${esc(a.id)} · ${esc(Q.pname(a.owner))} · ${esc(Q.plabel(a.process))}</div></div><span class="nowrap">${Q.dueDate(a.due)}</span></li>`).join('')}</ul></section>
        </div>`
    };
  };

  /* =================== Shared registers =================== */
  Q.riskTable = (id, { process = null, initialFilters } = {}) => {
    const rows = () => Q.S.risks.filter(r => !process || Q.inProc(r.process, process));
    const all = rows();
    return Q.table({ id, rows, noun: 'risks & opportunities', caption: 'Risks and opportunities', search: r => `${r.id} ${r.title} ${r.treatment} ${Q.pname(r.owner)}`, initialFilters,
      tools: `${searchBox('risks')}${procFilter(process)}<select class="select" data-filter="kind" aria-label="Type"><option value="all">Risks & opportunities</option><option>Risk</option><option>Opportunity</option></select>
        <select class="select" data-filter="level" aria-label="Rating"><option value="all">All ratings</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select class="select" data-filter="cell" aria-label="Matrix cell" hidden><option value="all">All cells</option>${[1,2,3,4,5].flatMap(l => [1,2,3,4,5].map(i => `<option value="${l}x${i}">L${l} × I${i}</option>`)).join('')}</select>
`, footExtra: () => '<span style="margin-left:auto">Rating = likelihood × impact (1–5 each). High ≥ 15 · Medium 8–12 · Low ≤ 6</span>',
      filters: { process: (r, v) => Q.inProc(r.process, v), kind: (r, v) => r.kind === v, level: (r, v) => Q.riskLevel(r) === v, cell: (r, v) => `${r.likelihood}x${r.impact}` === v },
      columns: [
        { key: 'id', label: 'ID', cls: 'c-id', sort: r => r.id, render: r => esc(r.id) },
        { key: 'title', label: 'Risk / opportunity', sort: r => r.title, render: r => `<span class="title">${esc(r.title)}</span><span class="sub">${esc(r.treatment)}</span>` },
        ...procCol(process),
        { key: 'kind', label: 'Type', sort: r => r.kind, render: r => esc(r.kind) },
        { key: 'l', label: 'L', cls: 'c-num', render: r => r.likelihood },
        { key: 'i', label: 'I', cls: 'c-num', render: r => r.impact },
        { key: 'rating', label: 'Rating', sort: r => Q.riskScore(r), render: r => { const l = Q.riskLevel(r); return `<span class="tnum" style="display:inline-block;width:22px;font-weight:600">${Q.riskScore(r)}</span>${Q.st(r.kind === 'Opportunity' ? l + ' benefit' : l, r.kind === 'Opportunity' ? 'info' : { High: 'danger', Medium: 'warning', Low: 'neutral' }[l])}`; } },
        { key: 'owner', label: 'Owner', sort: r => Q.pname(r.owner), render: r => `<span class="nowrap">${esc(Q.pname(r.owner))}</span>` },
        { key: 'due', label: 'Treatment due', cls: 'c-date', sort: r => r.due, render: r => Q.dueDate(r.due, r.status === 'Monitoring') },
        { key: 'status', label: 'Status', sort: r => r.status, render: r => Q.st(r.status, { 'Open': 'warning', 'In treatment': 'info', 'Monitoring': 'success', 'Evaluating': 'neutral', 'Closed': 'muted' }[r.status]) },
        { key: 'act', label: 'Actions', cls: 'c-actions', render: r => `<button class="btn sm" type="button" data-action="assess-risk" data-id="${r.id}">${icon('gauge')}Reassess</button>` }
      ], empty: '<h3>No risks or opportunities recorded</h3><p>Add risks that could affect this process achieving its outputs.</p>' });
  };
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
    tools: `${searchBox('findings')}${procFilter(process)}<select class="select" data-filter="type" aria-label="Finding type"><option value="all">All types</option><option>Major nonconformity</option><option>Minor nonconformity</option><option>Observation</option><option>Opportunity for improvement</option></select><select class="select" data-filter="status" aria-label="Status"><option value="all">Open & closed</option><option>Open</option><option>Closed</option></select>`,
    filters: { process: (f, v) => Q.inProc(f.process, v), type: (f, v) => f.type === v, status: (f, v) => f.status === v },
    columns: [
      { key: 'id', label: 'ID', cls: 'c-id', sort: f => f.id, render: f => esc(f.id) },
      { key: 'title', label: 'Finding', sort: f => f.title, render: f => `<span class="title">${esc(f.title)}</span><span class="sub">Audit ${esc(f.audit)} · ${esc(Q.S.audits.find(a => a.id === f.audit)?.title || '')}</span>` },
      ...procCol(process),
      { key: 'type', label: 'Type', sort: f => f.type, render: f => Q.st(f.type, f.type.startsWith('Major') ? 'danger' : f.type.startsWith('Minor') ? 'warning' : 'neutral') },
      { key: 'clause', label: 'Clause', cls: 'c-num', render: f => `<span class="clause">${esc(f.clause)}</span>` },
      { key: 'raised', label: 'Raised', cls: 'c-date', sort: f => f.raised, render: f => Q.fmt(f.raised) },
      { key: 'status', label: 'Status', sort: f => f.status, render: f => Q.st(f.status, f.status === 'Open' ? 'warning' : 'muted') },
      { key: 'ca', label: 'Corrective action', render: f => f.action ? `<a href="#/capa?focus=${f.action}" class="nowrap">${esc(f.action)}</a>` : '<span class="muted">Not required</span>' }
    ], empty: '<h3>No audit findings for this process</h3>' });
  Q.actionTable = (id, { process = null, initialFilters } = {}) => Q.table({ id, rows: () => Q.S.actions.filter(a => !process || Q.inProc(a.process, process)), noun: 'corrective actions', caption: 'Corrective actions', initialFilters,
    search: a => `${a.id} ${a.title} ${a.source} ${a.rootCause}`,
    tools: `${searchBox('corrective actions')}${procFilter(process)}<select class="select" data-filter="status" aria-label="Status"><option value="all">All statuses</option><option value="open">Open</option><option value="overdue">Overdue</option><option value="closed">Closed</option></select>`,
    filters: { process: (a, v) => Q.inProc(a.process, v), status: (a, v) => v === 'open' ? !Q.actionClosed(a) : v === 'overdue' ? Q.actionOverdue(a) : Q.actionClosed(a) },
    columns: [
      { key: 'id', label: 'ID', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
      { key: 'title', label: 'Corrective action', sort: a => a.title, render: a => `<span class="title">${esc(a.title)}</span><span class="sub">Source: ${a.source.startsWith('F-') ? `<a href="#/audit/findings?focus=${a.source}">${esc(a.source)}</a>` : esc(a.source)}</span>` },
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
  const TABS = [['overview', 'Overview'], ['documents', 'Documents'], ['risks', 'Risks & Opportunities'], ['kpis', 'Objectives & KPIs'], ['evidence', 'Evidence'], ['audit', 'Audit & Actions'], ['iso', 'ISO Mapping']];
  Q.views.process = parts => {
    const pid = parts[0], tab = parts[1] || 'overview';
    const p = Q.proc(pid);
    if (!p) return { title: 'Process not found', html: Q.pageHead({ title: 'Process not found', sub: 'It may have been archived or removed from the process structure.' }) + '<a class="btn" href="#/settings/processes">Open Process Structure</a>' };
    const s = Q.stats(pid), parent = Q.proc(p.parent_process_id), kids = Q.children(pid);
    const note = { documents: s.docsOverdue ? `${s.docsOverdue} overdue` : '', risks: s.highRisks ? `${s.highRisks} high` : '', kpis: s.kpisBelow ? `${s.kpisBelow} below` : '', evidence: s.evGaps ? `${s.evGaps} missing` : '', audit: s.actionsOverdue ? `${s.actionsOverdue} overdue` : '', iso: s.isoGaps ? `${s.isoGaps} gaps` : '' };
    const tabs = `<div class="tabs" role="tablist" aria-label="Process workspace">${TABS.map(([k, l]) => `<a role="tab" href="#/process/${pid}${k === 'overview' ? '' : '/' + k}" aria-selected="${k === tab}">${l}${note[k] ? `<span class="tab-note">${note[k]}</span>` : ''}</a>`).join('')}</div>`;
    const crumbs = [['QMS', '#/qms/scope'], ['Processes', '#/qms/processes'], ...(parent ? [[`${parent.process_code} ${parent.name}`, `#/process/${parent.process_id}`]] : []), [`${p.process_code} ${p.name}`, `#/process/${pid}`], ...(tab !== 'overview' ? [[TABS.find(t => t[0] === tab)[1]]] : [])];
    const head = Q.pageHead({ crumbs, title: `<span class="proc-code">${esc(p.process_code)}</span>${esc(p.name)}`,
      meta: `<div class="meta-line"><span>Process Owner <b>${esc(Q.pname(p.owner))}</b> · ${esc(Q.person(p.owner).title)}</span><span>Department <b>${esc(p.department)}</b></span><span>ISO 9001 <b>${p.iso.join(', ')}</b></span>${kids.length ? `<span>${kids.length} subprocesses</span>` : ''}${parent ? `<span>Subprocess of <a href="#/process/${parent.process_id}">${esc(parent.name)}</a></span>` : ''}</div>`,
      actions: Q.menu('Add to this process', [
        { label: 'Connect Document', icon: 'file-plus', data: { action: 'connect-doc', process: pid } },
        { label: 'Link Evidence', icon: 'paperclip', data: { action: 'link-evidence', process: pid } },
        { label: 'Add Risk or Opportunity', icon: 'shield-alert', data: { action: 'assess-risk', process: pid } },
        { label: 'Add KPI', icon: 'target', data: { action: 'toast', title: 'Add KPI', msg: 'KPI entry form is not part of this mock.' } },
        { label: 'Record Improvement Opportunity', icon: 'route', data: { action: 'add-improvement', process: pid } }
      ], { icon: 'plus', text: 'Add', cls: 'btn' }) + `<a class="btn" href="#/settings/processes?select=${pid}">${icon('pencil')}Edit Process</a>` });
    let body = '';
    if (tab === 'overview') body = processOverview(p, s, kids);
    else if (tab === 'documents') body = Q.docTable('p-docs', { process: pid, hideProcess: true });
    else if (tab === 'risks') body = Q.riskTable('p-risks', { process: pid });
    else if (tab === 'kpis') body = Q.kpiTable('p-kpis', { process: pid });
    else if (tab === 'evidence') body = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn" type="button" data-action="link-evidence" data-process="${pid}">${icon('link')}Link Evidence</button></div>` + Q.evTable('p-ev', { process: pid });
    else if (tab === 'audit') body = `<section class="section"><div class="section-head"><h2>Audit findings</h2></div>${Q.findingTable('p-find', { process: pid })}</section>
      <section class="section"><div class="section-head"><h2>Corrective actions</h2><span class="sub">Finding → root cause → action → effectiveness</span></div>${Q.actionTable('p-ca', { process: pid })}</section>
      <section class="section"><div class="section-head"><h2>Improvement opportunities</h2><span class="sub">Including bottlenecks that could be automated in future</span><div class="actions"><button class="btn sm" type="button" data-action="add-improvement" data-process="${pid}">${icon('plus')}Record Opportunity</button></div></div>${Q.improvementTable('p-imp', { process: pid })}</section>`;
    else if (tab === 'iso') body = `<section class="panel" style="margin-bottom:20px"><div class="panel-pad">${Q.readinessBlock(Q.isoForProcess(pid), { link: `#/process/${pid}/iso` })}</div></section>` + Q.isoTable('p-iso', { process: pid });
    return { title: `${p.name}${tab !== 'overview' ? ' · ' + TABS.find(t => t[0] === tab)[1] : ''}`, nav: 'process', html: head + tabs + body };
  };

  function processOverview(p, s, kids) {
    const pid = p.process_id, today = Q.today();
    const items = [
      ...Q.S.documents.filter(d => Q.inProc(d.process, pid) && Q.docOverdue(d)).map(d => ['calendar-clock', `Document review overdue: ${d.title}`, `${d.id} · due ${Q.fmt(d.nextReview)}`, `<button class="btn sm" type="button" data-action="open-doc" data-id="${d.id}">Open Document</button>`]),
      ...Q.S.workflows.filter(w => Q.inProc(Q.doc(w.doc)?.process, pid)).map(w => ['file-check', `${Q.wfStatus(w)}: ${Q.doc(w.doc).title} Rev ${w.rev}`, `Waiting for ${Q.wfAssignees(w).map(Q.pname).join(', ')} · due ${Q.fmt(w.due)}`, `<a class="btn sm" href="#/review/${w.id}">Open Review</a>`]),
      ...Q.S.risks.filter(r => Q.inProc(r.process, pid) && r.kind === 'Risk' && Q.riskLevel(r) === 'High').map(r => ['shield-alert', `High risk: ${r.title}`, `${r.id} · score ${Q.riskScore(r)} · treatment due ${Q.fmt(r.due)}`, `<a class="btn sm" href="#/process/${pid}/risks">View</a>`]),
      ...Q.S.kpis.filter(k => Q.inProc(k.process, pid) && !Q.kpiOk(k)).map(k => ['target', `Below target: ${k.name}`, `${Q.kpiFmt(k.actual, k)} vs target ${k.dir} ${Q.kpiFmt(k.target, k)} · ${k.period}`, `<a class="btn sm" href="#/process/${pid}/kpis">View</a>`]),
      ...Q.S.evidence.filter(e => Q.inProc(e.process, pid) && Q.evGap(e)).map(e => ['paperclip', `${e.status === 'Missing' ? 'Missing evidence' : 'Evidence link unavailable'}: ${e.name}`, `Control: ${e.control} · ISO ${e.iso}`, `<button class="btn sm" type="button" data-action="link-evidence" data-process="${e.process}" data-control="${esc(e.control)}" data-name="${esc(e.name)}" data-replace="${e.id}">Link Evidence</button>`]),
      ...Q.S.actions.filter(a => Q.inProc(a.process, pid) && !Q.actionClosed(a)).map(a => ['list-checks', `${Q.actionOverdue(a) ? 'Overdue corrective action' : 'Open corrective action'}: ${a.title}`, `${a.id} · ${a.stage} · due ${Q.fmt(a.due)}`, `<a class="btn sm" href="#/process/${pid}/audit">View</a>`])
    ];
    const coverage = e => {
      const d = e.doc && Q.doc(e.doc), ev = e.ev && Q.S.evidence.find(x => x.id === e.ev);
      const parts = [];
      if (d) parts.push(`<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${d.id}">${esc(d.id)}</button> ${d.rev ? `Rev ${esc(d.rev)}` : ''} ${d.status !== 'Published' ? Q.st(d.status) : Q.docOverdue(d) ? '<span class="date-overdue small">review overdue</span>' : ''}`);
      if (ev) parts.push(`${Q.st(ev.status === 'Verified' ? 'Evidence verified' : ev.status, Q.EV_KIND[ev.status])}`);
      if (!d && !ev) parts.push(e.kind === 'Activity' || e.kind === 'Record' ? '<span class="muted small">Recorded in registers</span>' : '<span class="st danger">No controlled document linked</span>');
      return parts.join(' · ');
    };
    const act = Q.S.activity.filter(a => Q.inProc(a.process, pid)).slice(0, 6);
    const hl = (ic, label, v, href, kind = 'attn') => `<li>${icon(ic)}<a href="${href}">${label}</a><span class="v ${v ? kind : 'zero'}">${v || '—'}</span></li>`;
    return `<div class="grid-2">
      <div style="display:flex;flex-direction:column;gap:24px;min-width:0">
        <section class="panel"><div class="panel-head"><h2>Needs attention in this process</h2><span class="muted small">${items.length}</span></div>
          ${items.length ? `<ul class="worklist">${items.map(([ic, t, m, b]) => `<li><span class="w-kind">${icon(ic)}</span><div class="w-main"><div class="w-title">${esc(t)}</div><div class="w-meta">${esc(m)}</div></div>${b}</li>`).join('')}</ul>` : '<div class="empty"><h3>Nothing needs attention.</h3><p>Documents are current, KPIs are on target and evidence is linked.</p></div>'}</section>
        <section class="panel"><div class="panel-head"><h2>Process definition</h2></div><div class="panel-pad"><dl class="kv">
          <dt>Purpose</dt><dd>${esc(p.purpose)}</dd>
          <dt>Inputs</dt><dd>${p.inputs.map(esc).join(' · ')}</dd>
          <dt>Outputs</dt><dd>${p.outputs.map(esc).join(' · ')}</dd>
          <dt>Responsible roles</dt><dd>${p.roles.map(esc).join(' · ')}</dd>
          <dt>Process owner</dt><dd>${esc(Q.pname(p.owner))}, ${esc(Q.person(p.owner).title)}</dd></dl></div></section>
        ${kids.length ? `<section class="panel"><div class="panel-head"><h2>Subprocesses</h2></div><ul class="worklist">${kids.map(k => { const ks = Q.stats(k.process_id); return `<li><div class="w-main"><div class="w-title"><a href="#/process/${k.process_id}">${esc(k.process_code)} ${esc(k.name)}</a></div><div class="w-meta">${esc(k.purpose)}</div></div>${Q.health(ks.health)}</li>`; }).join('')}</ul></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Process elements</h2><span class="muted small">What this process consists of, and what controls or evidences each element</span></div>
          <ul class="elements">${p.elements.map(e => `<li><span class="title">${esc(e.name)}</span><span class="kind">${esc(e.kind)}</span><span>${coverage(e)}</span></li>`).join('')}</ul></section>
      </div>
      <div style="display:flex;flex-direction:column;gap:24px;min-width:0">
        <section class="panel"><div class="panel-head"><h2>Process health</h2><div class="actions">${Q.health(s.health)}</div></div>
          <ul class="health-list">
            ${hl('files', 'Documents overdue for review', s.docsOverdue, `#/process/${pid}/documents`)}
            ${hl('file-check', 'Documents in workflow', s.docsInWorkflow, `#/process/${pid}/documents`, 'warnv')}
            ${hl('shield-alert', 'High risks', s.highRisks, `#/process/${pid}/risks`)}
            ${hl('target', 'KPIs below target', s.kpisBelow, `#/process/${pid}/kpis`, 'warnv')}
            ${hl('paperclip', 'Evidence gaps', s.evGaps, `#/process/${pid}/evidence`)}
            ${hl('search-check', 'Open audit findings', s.findings, `#/process/${pid}/audit`, 'warnv')}
            ${hl('list-checks', 'Overdue corrective actions', s.actionsOverdue, `#/process/${pid}/audit`)}
          </ul></section>
        <section class="panel"><div class="panel-head"><h2>ISO 9001 readiness</h2><div class="actions"><a class="btn sm ghost" href="#/process/${pid}/iso">Mapping</a></div></div><div class="panel-pad">${Q.readinessBlock(Q.isoForProcess(pid), { link: `#/process/${pid}/iso`, compact: true })}</div></section>
        <section class="panel"><div class="panel-head"><h2>Recent activity</h2></div>${act.length ? `<ul class="activity">${act.map(a => `<li><span>${Q.who(a.who)} ${esc(a.text)}</span><span class="when">${Q.fmt(a.date)}</span></li>`).join('')}</ul>` : '<div class="empty small">No recent activity.</div>'}</section>
      </div></div>`;
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
