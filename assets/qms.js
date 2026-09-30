/* iQMS v3 — pages for the client's menu:
 *   1 QMS (Organization & Scope, Policies, Processes, Objectives & KPIs)
 *   3 Risks & Opportunities (register + matrix + assessment tool)
 *   4 Evidence (by ISO subclause · by process · all records)
 *   5 Internal Audit · 6 Management Review · 7 Corrective Action
 * Documented Information (2) lives in documents.js; Settings (8) in admin.js. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const tabs = (items, cur, label) => `<div class="tabs" role="tablist" aria-label="${esc(label)}">${items.map(([k, l, href, note]) => `<a role="tab" href="${href}" aria-selected="${k === cur}">${l}${note ? `<span class="tab-note">${note}</span>` : ''}</a>`).join('')}</div>`;
  const docChip = id => { const d = Q.doc(id); if (!d) return ''; return `<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${esc(id)}">${esc(id)}</button> <span class="small muted">${esc(d.title)} · Rev ${esc(d.rev || '—')}</span>${Q.docOverdue(d) ? ' <span class="small date-overdue">review overdue</span>' : d.status !== 'Published' ? ` ${Q.st(d.status)}` : ''}`; };
  const qmsCrumbs = label => [['QMS', '#/qms/scope'], [label]];

  /* ============================== 1. QMS ============================== */
  Q.views.qms = (parts, q) => {
    const sec = parts[0] || 'scope';
    const fn = { scope: scopePage, policies: policiesPage, processes: processesPage, objectives: objectivesPage }[sec] || scopePage;
    return fn(q);
  };

  function scopePage() {
    const S = Q.S, c = S.context, o = S.organization;
    const scopeDoc = Q.doc(c.scopeDoc), ctxDoc = Q.doc(c.contextDoc);
    return { title: 'Organization & Scope', nav: 'qms', html:
      Q.pageHead({ crumbs: qmsCrumbs('Organization & Scope'), title: 'Organization & Scope', sub: 'Who we are, what the QMS covers, and the context it operates in — ISO 9001 clauses 4.1–4.4.',
        actions: `<a class="btn" href="#/settings/organization">${icon('pencil')}Edit Organization</a>` }) +
      (Q.docOverdue(ctxDoc) ? `<div class="callout warning" style="margin-bottom:20px">${icon('calendar-clock')}<span><b>Context & Interested Parties Register review is overdue</b>Was due ${Q.fmt(ctxDoc.nextReview)}. Issues and interested parties below may be out of date — this is also an input to the next management review.</span><button class="btn sm" type="button" data-action="create-revision" data-id="${ctxDoc.id}" style="margin-left:auto">Create Revision</button></div>` : '') +
      `<div class="grid-2">
        <div style="display:flex;flex-direction:column;gap:24px;min-width:0">
          <section class="panel"><div class="panel-head"><h2>QMS scope</h2><span class="clause small muted">4.3</span><div class="actions"><button class="btn sm" type="button" data-action="open-doc" data-id="${scopeDoc.id}">${icon('file-text')}Open ${esc(scopeDoc.id)}</button></div></div>
            <div class="panel-pad"><p class="scope-statement">${esc(c.scope)}</p><p class="small muted" style="margin-top:10px">Source: ${docChip(scopeDoc.id)}</p></div></section>
          <section class="panel"><div class="panel-head"><h2>Sites covered</h2><span class="muted small">${c.sites.length}</span></div>
            <div class="table-scroll"><table class="dt"><thead><tr><th>Site</th><th>Location</th><th>Activities in scope</th></tr></thead><tbody>${c.sites.map(x => `<tr><td><span class="title">${esc(x.name)}</span></td><td>${esc(x.address)}</td><td class="small">${esc(x.activities)}</td></tr>`).join('')}</tbody></table></div></section>
          <section class="panel"><div class="panel-head"><h2>Context of the organization</h2><span class="clause small muted">4.1</span><div class="actions"><button class="btn sm ghost" type="button" data-action="open-doc" data-id="${ctxDoc.id}">Open register</button></div></div>
            <div class="panel-pad grid-halves" style="gap:24px"><div><h3 style="font-size:14px;margin-bottom:8px">Internal issues</h3><ul class="bullets">${c.issues.internal.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><h3 style="font-size:14px;margin-bottom:8px">External issues</h3><ul class="bullets">${c.issues.external.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></section>
          <section class="panel"><div class="panel-head"><h2>Interested parties</h2><span class="clause small muted">4.2</span></div>
            <div class="table-scroll"><table class="dt"><thead><tr><th>Interested party</th><th>Relevant needs & expectations</th><th>How we monitor</th></tr></thead><tbody>${c.parties.map(x => `<tr><td><span class="title">${esc(x.party)}</span></td><td class="small">${esc(x.needs)}</td><td class="small">${esc(x.monitoring)}</td></tr>`).join('')}</tbody></table></div></section>
        </div>
        <div style="display:flex;flex-direction:column;gap:24px;min-width:0">
          <section class="panel"><div class="panel-head"><h2>Organization</h2></div><div class="panel-pad"><dl class="dl-list">
            <dt>Name</dt><dd><b>${esc(o.name)}</b></dd><dt>Industry</dt><dd>${esc(o.industry)}</dd><dt>Standard</dt><dd>${esc(o.standard)}</dd>
            <dt>Processes</dt><dd><a href="#/qms/processes">${Q.topProcesses().length} processes</a> · ${S.processes.filter(p => p.parent_process_id && p.status === 'active').length} subprocesses</dd>
            <dt>People</dt><dd>${S.users.filter(u => u.status === 'Active').length} active users</dd>
            <dt>Top management</dt><dd>${esc(Q.pname('eric'))}, ${esc(Q.person('eric').title)}</dd>
            <dt>QMS representative</dt><dd>${esc(Q.pname('maria'))}, ${esc(Q.person('maria').title)}</dd></dl></div></section>
          <section class="panel"><div class="panel-head"><h2>Exclusions</h2><span class="muted small">justified in scope</span></div>
            <ul class="worklist">${c.exclusions.map(x => `<li><div class="w-main"><div class="w-title"><span class="clause">${esc(x.clause)}</span> ${esc(x.title)}</div><div class="w-meta">${esc(x.reason)}</div></div></li>`).join('')}</ul></section>
          <section class="panel"><div class="panel-head"><h2>Structure & responsibilities</h2><span class="clause small muted">5.3</span></div>
            <ul class="link-list" style="padding:4px 20px">${[c.orgChartDoc, 'QMS-PRO-002', 'QMS-MAP-001'].map(id => { const d = Q.doc(id); return `<li>${icon('file-text')}<div class="ll-main"><b>${esc(d.title)}</b><span>${esc(d.id)} · Rev ${esc(d.rev)}${d.workingRev && d.status !== 'Published' ? ` → ${esc(d.workingRev)} ${esc(d.status.toLowerCase())}` : ''}</span></div><button class="btn sm" type="button" data-action="open-doc" data-id="${d.id}">Open</button></li>`; }).join('')}</ul></section>
        </div></div>` };
  }

  function policiesPage() {
    const S = Q.S, pol = S.policies.quality, d = Q.doc(pol.doc), a = pol.communicated;
    const pct = Math.round(a.acknowledged / a.total * 100);
    const others = S.documents.filter(x => x.type === 'Policy' && x.id !== pol.doc);
    return { title: 'Policies', nav: 'qms', html:
      Q.pageHead({ crumbs: qmsCrumbs('Policies'), title: 'Policies', sub: 'The quality policy and other policies that set direction for the QMS — ISO 9001 clause 5.2.',
        actions: `<button class="btn" type="button" data-action="create-revision" data-id="${d.id}">${icon('git-branch-plus')}Revise Quality Policy</button>` }) +
      `<div class="grid-2"><div style="display:flex;flex-direction:column;gap:24px;min-width:0">
        <section class="policy-card" aria-labelledby="qp"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><h2 id="qp" style="font-size:20px">Quality Policy</h2>${Q.st('Published')}<span class="small muted tnum">${esc(d.id)} · Rev ${esc(d.rev)}</span></div>
          <blockquote>${esc(pol.statement)}</blockquote><ol>${pol.commitments.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
          <div class="policy-sign"><span>Approved by <b>${esc(Q.pname(pol.approvedBy))}</b>, ${esc(Q.person(pol.approvedBy).title)}</span><span>Effective <b>${Q.fmt(d.effective)}</b></span><span>Next review <b>${Q.fmt(d.nextReview)}</b></span><button class="link-btn" type="button" data-action="open-doc" data-id="${d.id}">Open controlled copy</button></div></section>
        <section class="panel"><div class="panel-head"><h2>Other policies</h2><span class="muted small">${others.length}</span></div>
          ${others.length ? `<ul class="worklist">${others.map(x => `<li><span class="w-kind">${icon('scroll-text')}</span><div class="w-main"><div class="w-title">${esc(x.title)}</div><div class="w-meta">${esc(x.id)} · Rev ${esc(x.rev)} · ${esc(Q.plabel(x.process))} · owner ${esc(Q.pname(x.owner))}</div></div>${Q.reviewDate(x.nextReview, Q.docOverdue(x), Q.docDueSoon(x))}<button class="btn sm" type="button" data-action="open-doc" data-id="${x.id}">Open</button></li>`).join('')}</ul>` : '<div class="empty">No other policies.</div>'}</section>
      </div><div style="display:flex;flex-direction:column;gap:24px;min-width:0">
        <section class="panel"><div class="panel-head"><h2>Communicated & understood</h2><span class="clause small muted">5.2.2 · 7.3</span></div><div class="panel-pad">
          <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:32px;font-weight:600" class="tnum">${pct}%</span><span class="muted">acknowledged</span></div>
          <div class="stack-bar" style="margin:8px 0"><span class="b-complete" style="width:${pct}%"></span></div>
          <p class="small muted">${a.acknowledged} of ${a.total} employees acknowledged Rev ${esc(d.rev)} · last campaign ${Q.fmt(a.lastCampaign)}</p>
          <button class="btn sm" type="button" style="margin-top:12px" data-action="toast" data-title="Reminder sent" data-msg="${a.total - a.acknowledged} employees will be asked to read and acknowledge the Quality Policy.">${icon('send')}Remind ${a.total - a.acknowledged} people</button></div></section>
        <section class="panel"><div class="panel-head"><h2>Measured through</h2><div class="actions"><a class="btn sm ghost" href="#/qms/objectives">Objectives & KPIs</a></div></div>
          <ul class="health-list">${[...new Set(S.kpis.map(k => k.objective))].slice(0, 7).map(o => { const ks = S.kpis.filter(k => k.objective === o); const below = ks.filter(k => !Q.kpiOk(k)).length; return `<li>${icon('target')}<span>${esc(o)}</span><span class="v ${below ? 'attn' : 'zero'}" style="font-size:12px;white-space:nowrap">${below ? `${below} below target` : 'on target'}</span></li>`; }).join('')}</ul></section>
      </div></div>` };
  }

  function processesPage(q) {
    const view = q.view === 'table' ? 'table' : 'map';
    const tops = Q.topProcesses().map(p => ({ ...p, id: p.process_id, s: Q.stats(p.process_id) }));
    // Process card: type + status · name, purpose, Open · team avatars + ISO readiness.
    const STATUS = { ok: ['On track', 'ok'], attn: ['Needs attention', 'attn'], risk: ['At risk', 'risk'] };
    const AV = ['#DDEFE5', '#E3ECFA', '#FBEBD3', '#F3E1F0', '#E6E4FA', '#DCEFF1', '#F7E3DE'];
    const avatar = (id, extra = '') => { const n = [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0); return `<span class="av${extra}" style="background:${AV[n % AV.length]}" title="${esc(Q.pname(id))} — ${esc(Q.person(id).title)}">${esc(Q.initials(id))}</span>`; };
    const team = p => {
      // Team = people who manage or contribute to THIS process (not org-wide roles that touch every process).
      const everywhere = u => Q.topProcesses().every(x => ['manage', 'contribute'].includes(u.access?.[x.process_id]));
      const others = Q.S.users.filter(u => u.status === 'Active' && u.id !== p.owner && ['manage', 'contribute'].includes(u.access?.[p.id]) && !everywhere(u)).map(u => u.id);
      return [p.owner, ...others];
    };
    const issues = s => [s.docsOverdue && `${s.docsOverdue} doc${s.docsOverdue > 1 ? 's' : ''} overdue`, s.kpisBelow && `${s.kpisBelow} KPI${s.kpisBelow > 1 ? 's' : ''} below target`, s.highRisks && `${s.highRisks} high risk${s.highRisks > 1 ? 's' : ''}`, s.evGaps && `${s.evGaps} evidence gap${s.evGaps > 1 ? 's' : ''}`, s.actionsOverdue && `${s.actionsOverdue} action${s.actionsOverdue > 1 ? 's' : ''} overdue`].filter(Boolean);
    const card = p => {
      const s = p.s, [label, cls] = STATUS[s.health], kids = Q.children(p.id).length, t = team(p), pct = s.iso.pct ?? 0, iss = issues(s);
      return `<article class="proc-card" aria-labelledby="pc-${p.id}">
        <div class="pc-top"><span class="pc-type">${icon('building-2')}${esc(p.department || 'No department')}${kids ? ` · ${kids} subprocesses` : ''}</span><span class="pc-badge ${cls}">${label}</span></div>
        <div class="pc-main"><div class="pc-text"><h3 id="pc-${p.id}"><a href="#/process/${p.id}"><span class="pc-code">${esc(p.process_code)}</span>${esc(p.name)}</a></h3><p class="pc-desc" title="${esc(p.purpose)}">${esc(p.purpose)}</p></div>
          <a class="btn sm pc-open" href="#/process/${p.id}" aria-label="Open ${esc(p.name)}">Open</a></div>
        <p class="pc-issues">${iss.length ? iss.slice(0, 2).map(x => `<span>${esc(x)}</span>`).join('') + (iss.length > 2 ? `<span class="more">+${iss.length - 2} more</span>` : '') : `<span class="ok">${s.docs} document${s.docs === 1 ? '' : 's'} · ${s.kpis} KPI${s.kpis === 1 ? '' : 's'} · nothing overdue</span>`}</p>
        <div class="pc-foot"><div class="pc-team" aria-label="Owner and team">${t.slice(0, 3).map((id, i) => avatar(id, i === 0 ? ' owner' : '')).join('')}${t.length > 3 ? `<span class="av more" title="${esc(t.slice(3).map(Q.pname).join(', '))}">+${t.length - 3}</span>` : ''}</div>
          <div class="pc-progress" title="ISO 9001 readiness for this process: ${s.iso.points} of ${s.iso.applicable} applicable requirements"><span class="pc-plabel">ISO readiness</span><span class="bar"><span style="width:${pct}%"></span></span><b class="tnum">${s.iso.pct == null ? '—' : pct + '%'}</b></div></div>
      </article>`;
    };
    // One section per configured category, with its colour, icon and description.
    const band = c => {
      const list = tops.filter(p => (Q.catOf(p)?.id || null) === (c ? c.id : null));
      if (!c && !list.length) return '';
      const attn = list.filter(p => p.s.health !== 'ok').length;
      return `<section class="cat-band" style="--c:${c ? c.color : '#667085'}" aria-labelledby="cat-${c ? c.id : 'none'}">
        <header class="cat-head"><span class="cat-ic">${icon(c ? c.icon || 'folder' : 'folder')}</span>
          <div class="cat-title"><h2 id="cat-${c ? c.id : 'none'}">${esc(c ? c.name : 'Uncategorized')} processes</h2><p>${esc(c ? c.description || '' : 'Processes without a category. Assign one in Settings → Process Structure.')}</p></div>
          <div class="cat-stats"><span><b class="tnum">${list.length}</b> process${list.length === 1 ? '' : 'es'}</span>${attn ? `<span class="attn"><b class="tnum">${attn}</b> need attention</span>` : list.length ? '<span class="ok">All on track</span>' : ''}</div></header>
        ${list.length ? `<div class="pc-grid">${list.map(card).join('')}</div>` : `<div class="cat-empty">No processes in this category yet. <a href="#/settings/processes">Add or move a process</a></div>`}</section>`;
    };
    // One grid of process cards in display order (no category grouping on this page).
    const map = `<div class="pc-grid">${tops.map(card).join('')}</div>`;
    const table = Q.table({ id: 'qmsproc', rows: () => tops, key: r => r.id, noun: 'processes', caption: 'Process register',
      columns: [
        { key: 'name', label: 'Process', sort: r => r.display_order, render: r => `<a class="proc" href="#/process/${r.id}"><b>${esc(r.process_code)}</b><span class="title">${esc(r.name)}</span></a>` },
        { key: 'cat', label: 'Category', sort: r => Q.categories().findIndex(c => c.id === Q.catOf(r)?.id), render: r => Q.catChip(Q.catOf(r)) },
        { key: 'owner', label: 'Owner', sort: r => Q.pname(r.owner), render: r => `<span class="nowrap">${esc(Q.pname(r.owner))}</span>` },
        { key: 'iso', label: 'ISO 9001', render: r => `<span class="small tnum">${esc(r.iso.join(', '))}</span>` },
        { key: 'health', label: 'Status', sort: r => ({ risk: 0, attn: 1, ok: 2 })[r.s.health], render: r => Q.health(r.s.health) },
        { key: 'docs', label: 'Documents', cls: 'c-num', sort: r => r.s.docs, render: r => `<a href="#/documents?view=process&p=${r.id}">${r.s.docs}</a>` },
        { key: 'kpi', label: 'KPIs off target', cls: 'c-num', sort: r => r.s.kpisBelow, render: r => Q.num(r.s.kpisBelow, 'warnv') },
        { key: 'risk', label: 'High risks', cls: 'c-num', sort: r => r.s.highRisks, render: r => Q.num(r.s.highRisks) },
        { key: 'isor', label: 'ISO readiness', sort: r => r.s.iso.pct ?? -1, render: r => Q.miniProgress(r.s.iso.pct) }
      ] });
    return { title: 'Processes', nav: 'qms', html:
      Q.pageHead({ crumbs: qmsCrumbs('Processes'), title: 'Processes', sub: 'The processes of the QMS and how they interact — ISO 9001 clause 4.4. Open a process for its documents, risks, KPIs, evidence and audits.',
        actions: `<a class="btn" href="#/settings/processes">${icon('network')}Edit Process Structure</a>` }) +
      `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${Q.seg('View', [['map', 'Cards'], ['table', 'Register']], view).replace(/data-seg="(\w+)"/g, 'data-go="#/qms/processes?view=$1"')}
        <span class="small muted">${tops.length} processes · ${tops.filter(p => p.s.health !== 'ok').length} need attention</span></div>` +
      (view === 'table' ? table : map) };
  }

  /* ---------- Objectives & KPIs — same saved-views design as Documented Information ---------- */
  const KT = 'kpis';
  const kDelta = k => Math.round((k.trend[k.trend.length - 1] - k.trend[0]) * 10) / 10;
  Q.RECORDS.kpis = () => Q.S.kpis;
  Q.FIELDS.kpis = [
    { key: 'name', label: 'KPI', type: 'text', locked: true, min: '240px', get: k => k.name, sort: k => k.name,
      render: k => `<button type="button" class="doc-link" data-expand title="Show details">${esc(k.name)}</button><span class="sub">Objective: ${esc(k.objective)}</span>` },
    { key: 'objective', label: 'Objective', type: 'enum', options: () => [...new Set(Q.S.kpis.map(k => k.objective))].sort(), get: k => k.objective, sort: k => k.objective, render: k => esc(k.objective) },
    { key: 'process', label: 'Process', type: 'process', get: k => k.process, sort: k => Q.proc(k.process)?.process_code, render: k => Q.pcell(k.process) },
    { key: 'target', label: 'Target', type: 'number', cls: 'c-num', get: k => k.target, sort: k => k.target, render: k => `${esc(k.dir)} ${Q.kpiFmt(k.target, k)}` },
    { key: 'actual', label: 'Actual', type: 'number', cls: 'c-num', get: k => k.actual, sort: k => k.actual, render: k => `<span class="kpi-val" style="color:${Q.kpiOk(k) ? 'inherit' : 'var(--danger)'}">${Q.kpiFmt(k.actual, k)}</span>` },
    { key: 'trend', label: 'Trend (6 periods)', type: 'number', get: kDelta, sort: kDelta,
      render: k => { const dlt = kDelta(k); return `<span style="display:inline-flex;align-items:center;gap:8px">${Q.sparkline(k.trend, Q.kpiOk(k))}<span class="small muted tnum">${dlt > 0 ? '▲' : dlt < 0 ? '▼' : '■'} ${Math.abs(dlt)}${esc(k.unit)}</span></span>`; } },
    { key: 'owner', label: 'Owner', type: 'person', get: k => k.owner, sort: k => Q.pname(k.owner), render: k => `<span class="nowrap">${esc(Q.pname(k.owner))}</span>` },
    { key: 'period', label: 'Period', type: 'enum', options: () => [...new Set(Q.S.kpis.map(k => k.period))].sort(), get: k => k.period, sort: k => k.period, render: k => `<span class="nowrap">${esc(k.period)}</span>` },
    { key: 'status', label: 'Status', type: 'enum', options: () => ['On target', 'Below target'], get: k => Q.kpiOk(k) ? 'On target' : 'Below target', sort: k => Q.kpiOk(k) ? 1 : 0, render: k => Q.kpiOk(k) ? Q.st('On target', 'success') : Q.st('Below target', 'danger') }
  ];
  const kpiMenu = k => Q.menu(`Actions for ${k.name}`, [
    { label: 'Record new value…', icon: 'plus', data: { action: 'kpi-record', id: k.id } },
    { label: 'Edit KPI', icon: 'pencil', data: { action: 'toast', title: 'Edit KPI', msg: 'The KPI definition form is not part of this mock.' } },
    '-',
    { label: 'Open process workspace', icon: 'workflow', data: { action: 'go', href: `#/process/${k.process}/kpis` } },
    { label: 'Open Quality Objectives plan', icon: 'file-text', data: { action: 'open-doc', id: 'QOB-PLN-001' } }
  ], { align: 'min-width:240px' });
  Q.actions.go = d => Q.go(d.href);
  const kpiExpand = k => {
    const risks = Q.S.risks.filter(r => Q.inProc(r.process, k.process) && Q.riskOpen(r)), cas = Q.S.actions.filter(a => Q.inProc(a.process, k.process) && !Q.actionClosed(a));
    return `<div class="doc-exp">
      <div><h4>Measurement</h4><p><b style="color:var(--text)">${Q.kpiFmt(k.actual, k)}</b> against target ${esc(k.dir)} ${Q.kpiFmt(k.target, k)} · ${esc(k.period)}</p>
        <div class="kpi-hist" aria-label="Last 6 periods">${k.trend.map((x, i) => `<span class="${i === k.trend.length - 1 ? 'now' : ''}"><b class="tnum">${x}${esc(k.unit)}</b><i>${i === k.trend.length - 1 ? 'Latest' : `−${k.trend.length - 1 - i}`}</i></span>`).join('')}</div></div>
      <div><h4>Objective</h4><p>${esc(k.objective)}</p><h4 style="margin-top:10px">Owner</h4><p>${esc(Q.pname(k.owner))} · ${esc(Q.plabel(k.process))}</p></div>
      <div><h4>In this process</h4><ul><li>${risks.length} open risk${risks.length === 1 ? '' : 's'} &amp; opportunities</li><li>${cas.length} open corrective action${cas.length === 1 ? '' : 's'}</li><li>Method: <button class="link-btn" type="button" data-action="open-doc" data-id="KPI-PRO-003">KPI-PRO-003</button></li></ul></div>
      <div class="acts"><button class="btn sm primary" type="button" data-action="kpi-record" data-id="${k.id}">${icon('plus')}Record new value</button><a class="btn sm" href="#/process/${k.process}/kpis">${icon('workflow')}Open process workspace</a></div></div>`;
  };
  const kpiSel = keys => keys.length === 1
    ? `<button class="btn sm primary" type="button" data-action="kpi-record" data-id="${keys[0]}">${icon('plus')}Record new value</button><button class="btn sm" type="button" data-action="go" data-href="#/process/${Q.S.kpis.find(k => k.id === keys[0]).process}/kpis">${icon('workflow')}Open process workspace</button>`
    : `<button class="btn sm" type="button" data-action="export-selected">${icon('download')}Export selected</button><button class="btn sm" type="button" data-action="toast" data-title="Reminder sent" data-msg="Owners of ${keys.length} KPIs were asked to record this period's values.">${icon('bell')}Ask owners for values</button>`;
  // One KPI table for the register page and the process workspace tab.
  Q.kpiTable = (id, { process = null, columns = null, where = null, initialSort, bare = false, extraTools = '' } = {}) => {
    const cols = (columns || Q.FIELDS.kpis.map(f => f.key)).map(k => Q.field(KT, k)).filter(Boolean)
      .filter(f => !(f.key === 'process' && process && !Q.children(process).length))
      .map(f => ({ key: f.key, label: f.key === 'process' && process ? 'Subprocess' : f.label, cls: f.cls, min: f.min, sort: f.sort, render: f.render }));
    cols.push({ key: 'actions', label: '', cls: 'c-actions c-menu', render: k => `<span class="row-menu">${kpiMenu(k)}</span>` });
    return Q.table({ id, rows: () => Q.S.kpis.filter(k => (!process || Q.inProc(k.process, process)) && (!where || where(k))), columns: cols,
      selectable: true, tight: true, noun: 'KPIs', caption: 'Objectives and KPIs', rowLabel: k => k.name, bare, expand: kpiExpand, selectionBar: kpiSel,
      search: k => `${k.name} ${k.objective} ${Q.pname(k.owner)}`, ...(Q.tables[id] ? {} : { initialSort }),
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search KPIs or objectives" aria-label="Search KPIs"></div>${extraTools}`,
      empty: '<h3>No KPIs match this view</h3><p>Change the view’s filters, or clear the search.</p>' });
  };
  Q.actions['kpi-record'] = d => {
    const k = Q.S.kpis.find(x => x.id === d.id);
    const m = Q.openModal({ size: 's', title: 'Record new value', sub: `${esc(k.name)} · target ${esc(k.dir)} ${Q.kpiFmt(k.target, k)}`,
      body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr 1fr">
        <label class="field"><span>Value${k.unit ? ` (${esc(k.unit)})` : ''} <span class="req">*</span></span><input class="input" type="number" step="any" name="val" required autofocus value=""></label>
        <label class="field"><span>Period <span class="req">*</span></span><input class="input" name="period" required value="${esc(k.period)}"></label></div>
        <p class="small muted" style="margin-top:10px">Previous: ${Q.kpiFmt(k.actual, k)} (${esc(k.period)}). The trend keeps the last 6 periods.</p></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Record Value</button>` });
    const ok = () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), n = Number(v.val);
      k.trend = [...k.trend.slice(1), n]; k.actual = n; k.period = v.period; Q.save(); Q.closeAllModals(); Q.render({ noFocus: true });
      Q.toast('Value recorded', `${k.name}: ${Q.kpiFmt(n, k)} — ${Q.kpiOk(k) ? 'on target' : 'below target'}`); };
    m.querySelector('[data-ok]').addEventListener('click', ok); m.querySelector('form').addEventListener('submit', e => { e.preventDefault(); ok(); });
  };

  Q.viewPage(KT, { route: '#/qms/objectives', noun: 'KPIs', groups: [['none', 'None'], ['process', 'Process']],
    legacy: q => q.focus ? { id: 'k-all', extra: { focus: q.focus } } : q.status === 'below' ? { id: 'k-below', fallback: 'k-all' } : q.status === 'on' ? { id: 'k-on', fallback: 'k-all' } : q.process ? { group: 'process', fallback: 'k-all', extra: { p: q.process } } : null });
  function objectivesPage(q) {
    const r = Q.vwResolve(KT, q);
    if (r.redirect) { location.replace(r.redirect); return { title: 'Objectives & KPIs', nav: 'qms', html: '' }; }
    const v = r.v, where = Q.matcher(KT, v.filters), plan = Q.doc('QOB-PLN-001');
    Q.vwRemember(KT);
    const objs = [...new Set(Q.S.kpis.map(k => k.objective))];
    let body, leaf = null;
    if (v.group === 'process') {
      const inV = Q.S.kpis.filter(where), n = id => inV.filter(k => Q.inProc(k.process, id)).length;
      const top = Q.topProcesses(), p = Q.proc(q.p) || top.find(x => n(x.process_id)) || top[0], pid = p.process_id;
      const below = id => inV.filter(k => Q.inProc(k.process, id) && !Q.kpiOk(k)).length;
      const row = x => `<a href="${Q.vwHash(KT, v, { p: x.process_id })}" ${x.process_id === pid ? 'aria-current="true"' : ''}><span class="code">${esc(x.process_code)}</span><span class="nm">${esc(x.name)}</span>${below(x.process_id) ? `<i class="flag bad" title="${below(x.process_id)} below target"></i>` : ''}<span class="n">${n(x.process_id)}</span></a>`;
      leaf = `${p.process_code} ${p.name}`;
      body = `<div class="vc-body"><div class="vc-summary">${Q.vwSummary(KT, v)}</div><div class="browse"><nav class="browse-tree" aria-label="Processes"><h3>Processes</h3>${top.map(row).join('')}</nav><section>
        <div class="browse-head"><div><h2><span class="proc-code">${esc(p.process_code)}</span>${esc(p.name)}</h2><p class="sub">Owner ${esc(Q.pname(p.owner))} · ${n(pid)} KPIs${v.filters.length ? ' in this view' : ''}${below(pid) ? ` · <span class="date-overdue">${below(pid)} below target</span>` : ''}</p></div>
        <div class="actions"><a class="btn sm" href="#/process/${pid}/kpis">${icon('workflow')}Open process workspace</a></div></div>
        ${Q.kpiTable(Q.vwTableId(KT, v, pid), { process: pid, columns: v.columns, where, initialSort: v.sort })}</section></div></div>`;
    } else body = Q.kpiTable(Q.vwTableId(KT, v), { columns: v.columns, where, initialSort: v.sort, bare: true, extraTools: Q.vwSummary(KT, v) });
    return { title: 'Objectives & KPIs', nav: 'qms', html:
      Q.pageHead({ crumbs: [['QMS', '#/qms/scope'], ['Objectives & KPIs', '#/qms/objectives?v=' + (Q.viewList(KT)[0]?.id || '')], ...(leaf ? [[v.name, Q.vwHash(KT, v)], [leaf]] : [[v.name]])], title: 'Objectives & KPIs', sub: `Quality objectives and how each process is measured against them — ISO 9001 clauses 6.2 and 9.1. ${objs.length} objectives · ${Q.S.kpis.length} KPIs.`,
        actions: `<button class="btn" type="button" data-action="open-doc" data-id="${plan.id}">${icon('file-text')}${esc(plan.title)}</button><button class="btn primary" type="button" data-action="toast" data-title="Add KPI" data-msg="KPI entry form is not part of this mock.">${icon('plus')}Add KPI</button>` }) +
      Q.vwCard(KT, v, body), after: main => Q.vwAfter(KT, main) };
  }

  /* ============================== 3. Risks & Opportunities ============================== */
  const LIKE = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
  const IMP = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];
  const RESPONSE = { High: 'Treatment plan required. Process owner reviews monthly; reported to management review.', Medium: 'Treat or monitor. Reviewed quarterly by the process owner.', Low: 'Accept and monitor. Reviewed at the annual risk review.' };
  const levelOf = s => s >= 15 ? 'High' : s >= 8 ? 'Medium' : 'Low';

  Q.views.risks = (parts, q) => {
    const tab = parts[0] === 'matrix' ? 'matrix' : 'register';
    const S = Q.S, open = S.risks.filter(Q.riskOpen);
    const high = open.filter(r => r.kind === 'Risk' && Q.riskLevel(r) === 'High').length;
    const head = Q.pageHead({ title: 'Risks & Opportunities', sub: `Identify, rate and treat risks and opportunities for every process — ISO 9001 clause 6.1. ${open.length} open · ${high} high.`,
      actions: `<button class="btn" type="button" data-action="open-doc" data-id="RSK-PRO-001">${icon('file-text')}Method</button><button class="btn primary" type="button" data-action="assess-risk">${icon('gauge')}Assess New Risk</button>` });
    const t = tabs([['register', 'Register', '#/risks'], ['matrix', 'Risk matrix', '#/risks/matrix', high ? `${high} high` : '']], tab, 'Risks');
    if (tab === 'register') {
      const init = q.level ? { level: q.level } : q.process ? { process: q.process } : q.cell ? { cell: q.cell } : undefined;
      return { title: 'Risks & Opportunities', nav: 'risks', html: head + t + (q.cell ? `<p class="small" style="margin:-8px 0 12px">Showing matrix cell <b>Likelihood ${q.cell[0]} × Impact ${q.cell[2]}</b> · <a href="#/risks">Clear</a></p>` : '') + Q.riskTable('risks', { initialFilters: init }) };
    }
    const sel = q.cell;
    const risks = open.filter(r => r.kind === 'Risk');
    let grid = '';
    for (let l = 5; l >= 1; l--) {
      grid += `<span class="ax">${l}</span>`;
      for (let i = 1; i <= 5; i++) {
        const n = risks.filter(r => r.likelihood === l && r.impact === i).length, sc = l * i, lv = levelOf(sc);
        grid += `<button type="button" class="${{ High: 'hi', Medium: 'md', Low: 'lo' }[lv]}${n ? '' : ' empty'}" data-go="#/risks/matrix?cell=${l}x${i}" aria-pressed="${sel === `${l}x${i}`}" aria-label="Likelihood ${l} ${LIKE[l - 1]}, impact ${i} ${IMP[i - 1]}: ${n} risks, score ${sc} ${lv}"><span class="s">${sc}</span>${n || '·'}</button>`;
      }
    }
    grid += `<span></span>${[1, 2, 3, 4, 5].map(i => `<span class="ax">${i}</span>`).join('')}`;
    const inCell = sel ? risks.filter(r => `${r.likelihood}x${r.impact}` === sel) : risks.filter(r => Q.riskLevel(r) === 'High');
    const list = `<section class="panel"><div class="panel-head"><h2>${sel ? `Cell L${sel[0]} × I${sel[2]}` : 'High risks'}</h2><span class="muted small">${inCell.length}</span>${sel ? '<div class="actions"><a class="btn sm ghost" href="#/risks/matrix">Show high risks</a></div>' : ''}</div>
      ${inCell.length ? `<ul class="worklist">${inCell.map(r => `<li><div class="w-main"><div class="w-title">${esc(r.title)}</div><div class="w-meta">${esc(r.id)} · ${esc(Q.plabel(r.process))} · ${esc(Q.pname(r.owner))} · treatment due ${Q.fmt(r.due)}</div><div class="w-meta">${esc(r.treatment)}</div></div><button class="btn sm" type="button" data-action="assess-risk" data-id="${r.id}">Reassess</button></li>`).join('')}</ul>` : '<div class="empty small">No open risks in this cell.</div>'}</section>`;
    const opps = open.filter(r => r.kind === 'Opportunity');
    return { title: 'Risk matrix · Risks & Opportunities', nav: 'risks', html: head + t +
      `<div class="heat-wrap"><span class="heat-y">Likelihood →</span><div><div class="heat" role="group" aria-label="Risk matrix: likelihood by impact">${grid}</div><div class="heat-x">Impact →</div>
        <div class="legend" style="margin-top:14px"><span><i style="background:#F8CFC9"></i>High ≥ 15</span><span><i style="background:#FBEBC7"></i>Medium 8–12</span><span><i style="background:#EEF3F0"></i>Low ≤ 6</span></div>
        <p class="small muted" style="margin-top:8px">Open risks only. Select a cell to list its risks. ${opps.length} opportunities are tracked separately in the register.</p></div>
      ${list}</div>` };
  };

  Q.actions['assess-risk'] = d => {
    const S = Q.S, r = d.id ? S.risks.find(x => x.id === d.id) : null;
    const pid = r?.process || (d.process && d.process !== 'undefined' ? d.process : '');
    const scale = (name, labels, val) => `<div class="rating-scale" role="radiogroup">${labels.map((l, i) => `<label title="${esc(l)}"><input type="radio" name="${name}" value="${i + 1}" ${val === i + 1 ? 'checked' : ''}><span>${i + 1}</span></label>`).join('')}</div><div class="rating-help"><span>${esc(labels[0])}</span><span>${esc(labels[4])}</span></div>`;
    const m = Q.openModal({ size: 'l', title: r ? `Reassess ${esc(r.id)}` : 'Assess New Risk or Opportunity', sub: 'Rating = likelihood × impact (1–5 each). The response follows from the rating.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field"><span>Type</span><select class="select" name="kind"><option${r?.kind === 'Risk' ? ' selected' : ''}>Risk</option><option${r?.kind === 'Opportunity' ? ' selected' : ''}>Opportunity</option></select></label>
        <label class="field"><span>Process <span class="req">*</span></span><select class="select" name="process" required><option value="">Select…</option>${Q.processOptions(pid, { all: '' })}</select></label>
        <label class="field full"><span>Description <span class="req">*</span></span><input class="input" name="title" required value="${esc(r?.title || '')}" placeholder="e.g. Inverter supplier delivery delays" ${r ? '' : 'autofocus'}></label>
        <div class="field"><span>Likelihood</span>${scale('l', LIKE, r?.likelihood || 3)}</div>
        <div class="field"><span>Impact</span>${scale('i', IMP, r?.impact || 3)}</div>
        <div class="field full"><div class="score-preview" aria-live="polite"><span class="num" data-score></span><div><div data-level></div><div class="small muted" data-resp></div></div></div></div>
        <label class="field full"><span>Treatment / action <span class="req">*</span></span><textarea class="textarea" name="treatment" required>${esc(r?.treatment || '')}</textarea></label>
        <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(r?.owner || Q.proc(pid)?.owner || Q.me())}</select></label>
        <label class="field"><span>Treatment due</span><input class="input" type="date" name="due" value="${esc(r?.due || Q.addDays(Q.today(), 30))}"></label>
        <label class="field"><span>Status</span><select class="select" name="status">${['Open', 'In treatment', 'Monitoring', 'Evaluating', 'Closed'].map(x => `<option${(r?.status || 'Open') === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Linked document</span><select class="select" name="doc"><option value="">None</option>${S.documents.map(x => `<option value="${x.id}"${r?.links?.[0] === x.id ? ' selected' : ''}>${esc(x.id + ' · ' + x.title)}</option>`).join('')}</select></label>
      </div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${r ? 'Save Assessment' : 'Add to Register'}</button>`,
      onMount: el => {
        const upd = () => { const f = el.querySelector('form'), l = +f.l.value, i = +f.i.value, s = l * i, lv = levelOf(s), opp = f.kind.value === 'Opportunity';
          el.querySelector('[data-score]').textContent = s;
          el.querySelector('[data-level]').innerHTML = Q.st(opp ? `${lv} benefit` : `${lv} risk`, opp ? 'info' : { High: 'danger', Medium: 'warning', Low: 'neutral' }[lv]) + ` <span class="small muted">${esc(LIKE[l - 1])} × ${esc(IMP[i - 1])}</span>`;
          el.querySelector('[data-resp]').textContent = opp ? 'Evaluate and decide whether to pursue; record the decision.' : RESPONSE[lv]; };
        el.querySelector('form').addEventListener('change', upd); upd();
      } });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      const rec = { kind: v.kind, title: v.title, process: v.process, likelihood: +v.l, impact: +v.i, treatment: v.treatment, owner: v.owner, due: v.due, status: v.status, links: v.doc ? [v.doc] : [] };
      if (r) Object.assign(r, rec);
      else { const pre = v.kind === 'Opportunity' ? 'O' : 'R'; const n = S.risks.filter(x => x.id.startsWith(pre + '-')).length + 1; S.risks.push({ id: `${pre}-${String(n).padStart(3, '0')}`, ...rec }); }
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true });
      Q.toast(r ? 'Assessment saved' : 'Added to register', `Rating ${rec.likelihood * rec.impact} · ${levelOf(rec.likelihood * rec.impact)}`);
    });
  };

  /* ============================== 4. Evidence ============================== */
  Q.views.evidence = (_, q) => {
    const S = Q.S, view = ['process', 'list'].includes(q.view) ? q.view : 'clause';
    const counts = {}; S.evidence.forEach(e => { counts[e.source.system] = (counts[e.source.system] || 0) + 1; });
    const gaps = S.evidence.filter(Q.evGap).length;
    const head = Q.pageHead({ title: 'Evidence', sub: `Records that prove the QMS works — organized by ISO 9001 subclause and by process. ${S.evidence.length} records · ${gaps} gaps.`,
      actions: `<button class="btn" type="button" data-action="toast" data-title="Export" data-msg="Evidence pack by clause would be exported to PDF for the certification body.">${icon('download')}Export Audit Pack</button><button class="btn primary" type="button" data-action="link-evidence">${icon('link')}Link Evidence</button>` });
    const bar = `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${Q.seg('View', [['clause', 'By ISO subclause'], ['process', 'By process'], ['list', 'All records']], view).replace(/data-seg="(\w+)"/g, 'data-go="#/evidence?view=$1"')}
      <span class="small muted">Sources: ${Object.entries(counts).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')} · <a href="#/settings/integrations">Manage</a></span></div>`;
    let body;
    if (view === 'list') body = Q.evTable('ev', { initialSeg: q.status });
    else if (view === 'process') body = evByProcess(q.p);
    else body = `<section class="panel" style="margin-bottom:20px"><div class="panel-head"><h2>ISO 9001 readiness</h2><span class="small muted">${esc(S.organization.standard)}</span></div><div class="panel-pad">${Q.readinessBlock(S.iso)}</div></section>` + evByClause(q.c, q.status);
    return { title: 'Evidence', nav: 'evidence', html: head + bar + body };
  };

  const evRows = list => list.length ? `<table class="dt tight"><thead><tr><th>Evidence</th><th>Source</th><th class="c-date">Record date</th><th>Verification</th><th class="c-actions"></th></tr></thead><tbody>${list.map(e => `<tr data-key="${esc(e.id)}"><td><span class="title">${esc(e.name)}</span><span class="sub">${esc(e.id)} · ${esc(Q.plabel(e.process))} · control: ${esc(e.control)}</span></td><td class="small"><b>${esc(e.source.system)}</b><span class="sub" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(e.source.record)}">${esc(e.source.record)}</span></td><td class="c-date">${Q.fmt(e.date)}</td><td>${Q.st(e.status, Q.EV_KIND[e.status])}</td><td class="c-actions">${Q.evGap(e) ? `<button class="btn sm" type="button" data-action="link-evidence" data-process="${e.process}" data-control="${esc(e.control)}" data-name="${esc(e.name)}" data-replace="${e.id}">${icon('link')}${e.status === 'Missing' ? 'Link' : 'Relink'}</button>` : `<button class="btn sm" type="button" data-action="toast" data-title="Open source record" data-msg="${esc(e.source.record)} would open in ${esc(e.source.system)}.">${icon('external-link')}Open</button>`}</td></tr>`).join('')}</tbody></table>` : '';
  const reqEvidence = r => [...new Map([...r.evidence.map(id => Q.S.evidence.find(e => e.id === id)).filter(Boolean), ...Q.evForClause(r.clause)].map(e => [e.id, e])).values()];
  const reqBlock = r => {
    const ev = reqEvidence(r), docs = r.controls.map(Q.doc).filter(Boolean);
    return `<section class="clause-block"><header><span class="clause">${esc(r.clause)}</span><h3>${esc(r.title)}</h3><span class="proc-chips">${r.processes.map(Q.pcell).join('')}</span>${Q.st(r.status, Q.ISO_KIND[r.status])}</header>
      ${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}
      ${docs.length ? `<div class="note" style="background:none">${icon('file-text')} Controls: ${docs.map(d => `<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${d.id}" title="${esc(d.title)}">${esc(d.id)}</button>`).join(', ')}</div>` : ''}
      ${ev.length ? `<div class="table-scroll">${evRows(ev)}</div>` : r.status === 'Not Applicable' ? '<div class="gap" style="color:var(--text-3)">Not applicable — excluded in the QMS scope.</div>' : r.status === 'Complete' ? `<div class="gap" style="color:var(--text-3)">${icon('circle-check')}Satisfied by the controlling documents above; no separate records linked.<button class="btn sm ghost" type="button" data-action="link-evidence" data-process="${r.processes[0]}" style="margin-left:auto">${icon('link')}Link Evidence</button></div>` : `<div class="gap">${icon('paperclip')}No evidence record linked.<button class="btn sm" type="button" data-action="link-evidence" data-process="${r.processes[0]}" style="margin-left:auto">${icon('link')}Link Evidence</button></div>`}</section>`;
  };

  function evByClause(sel, status) {
    const S = Q.S, statusMap = { complete: 'Complete', partial: 'Partially Complete', atrisk: 'At Risk', missing: 'Missing' };
    const top = Q.CLAUSES.find(c => c[0] === Q.clauseTop(sel || '')) ? Q.clauseTop(sel) : '4';
    const focus = sel && sel.includes('.') ? sel : null;
    const worst = reqs => reqs.some(r => ['Missing', 'At Risk'].includes(r.status)) ? 'bad' : reqs.some(r => r.status === 'Partially Complete') ? 'warn' : 'ok';
    const tree = `<nav class="browse-tree" aria-label="ISO 9001 clauses"><h3>Clauses & subclauses</h3>${Q.CLAUSES.map(([c, t]) => {
      const reqs = Q.reqsIn(c), gaps = reqs.filter(r => ['Missing', 'At Risk'].includes(r.status)).length;
      return `<a href="#/evidence?view=clause&c=${c}" ${c === top && !focus && !status ? 'aria-current="true"' : ''}><span class="code">${c}</span><span class="nm">${esc(t)}</span><i class="flag ${worst(reqs)}" title="${gaps ? gaps + ' at risk or missing' : 'Status'}"></i><span class="n">${Q.evForClause(c).length}</span></a>` +
        (c === top && !status ? `<div class="child">${reqs.map(r => `<a href="#/evidence?view=clause&c=${r.clause}" ${focus === r.clause ? 'aria-current="true"' : ''}><span class="code">${esc(r.clause)}</span><span class="nm">${esc(r.title)}</span><i class="flag ${worst([r])}"></i><span class="n">${reqEvidence(r).length}</span></a>`).join('')}</div>` : '');
    }).join('')}</nav>`;
    let head, reqs;
    if (status && statusMap[status]) {
      reqs = S.iso.filter(r => r.status === statusMap[status]);
      head = `<div class="browse-head"><div><h2>${esc(statusMap[status])}</h2><p class="sub">${reqs.length} requirements across all clauses · <a href="#/evidence?view=clause">Show by clause</a></p></div></div>`;
    } else {
      reqs = Q.reqsIn(top).filter(r => !focus || r.clause === focus);
      head = `<div class="browse-head"><div><h2><span class="proc-code">${esc(focus || top)}</span>${esc(focus ? S.iso.find(r => r.clause === focus)?.title : Q.clauseTitle(top))}</h2><p class="sub">${reqs.length} requirement${reqs.length === 1 ? '' : 's'} · each shows its processes, controlling documents and evidence.</p></div>
        <div class="actions"><a class="btn sm" href="#/documents?view=clause&c=${esc(focus || top)}">${icon('files')}Documents for this clause</a></div></div>`;
    }
    return `<div class="browse">${tree}<section>${head}${reqs.map(reqBlock).join('') || '<div class="empty panel"><h3>No requirements</h3></div>'}</section></div>`;
  }

  function evByProcess(sel) {
    const top = Q.topProcesses(), pid = Q.proc(sel) ? sel : top[0].process_id, p = Q.proc(pid), S = Q.S;
    const gaps = id => S.evidence.filter(e => Q.inProc(e.process, id) && Q.evGap(e)).length;
    const tree = `<nav class="browse-tree" aria-label="Processes"><h3>Processes</h3>${top.map(x => `<a href="#/evidence?view=process&p=${x.process_id}" ${x.process_id === pid ? 'aria-current="true"' : ''}><span class="code">${esc(x.process_code)}</span><span class="nm">${esc(x.name)}</span>${gaps(x.process_id) ? `<i class="flag bad" title="${gaps(x.process_id)} gaps"></i>` : ''}<span class="n">${S.evidence.filter(e => Q.inProc(e.process, x.process_id)).length}</span></a>`).join('')}</nav>`;
    const els = p.elements.filter(e => e.ev || e.kind === 'Record' || e.kind === 'Activity');
    const elRows = els.map(e => { const ev = e.ev && S.evidence.find(x => x.id === e.ev); return `<li><span class="title">${esc(e.name)}</span><span class="kind">${esc(e.kind)}</span><span>${ev ? `${Q.st(ev.status, Q.EV_KIND[ev.status])} <span class="small muted">${esc(ev.id)} · ISO ${esc(ev.iso)}</span>` : '<span class="muted small">No evidence record expected / not yet defined</span>'}</span></li>`; }).join('');
    return `<div class="browse">${tree}<section>
      <div class="browse-head"><div><h2><span class="proc-code">${esc(p.process_code)}</span>${esc(p.name)}</h2><p class="sub">Owner ${esc(Q.pname(p.owner))} · ISO 9001 ${esc(p.iso.join(', '))}</p></div><div class="actions"><a class="btn sm" href="#/process/${pid}/evidence">${icon('workflow')}Open in process workspace</a><button class="btn sm primary" type="button" data-action="link-evidence" data-process="${pid}">${icon('link')}Link Evidence</button></div></div>
      ${elRows ? `<section class="panel" style="margin-bottom:20px"><div class="panel-head"><h2>Expected records</h2><span class="muted small">process elements that must leave evidence</span></div><ul class="elements">${elRows}</ul></section>` : ''}
      ${Q.evTable('ev-proc-' + pid, { process: pid })}</section></div>`;
  }

  /* ============================== 5. Internal Audit ============================== */
  Q.views.audit = (parts, q) => {
    const S = Q.S, tab = ['findings', 'coverage'].includes(parts[0]) ? parts[0] : 'programme';
    const done = S.audits.filter(a => a.status === 'Completed').length, next = S.audits.filter(a => a.status === 'Planned').sort((a, b) => a.date < b.date ? -1 : 1)[0];
    const openF = S.findings.filter(f => f.status === 'Open');
    const audited = new Set(S.audits.flatMap(a => a.processes));
    const notCovered = Q.topProcesses().filter(p => !audited.has(p.process_id));
    const head = Q.pageHead({ title: 'Internal Audit', sub: 'The audit programme, audit findings and process coverage — ISO 9001 clause 9.2.',
      actions: `<button class="btn" type="button" data-action="open-doc" data-id="AUD-PRO-001">${icon('file-text')}Audit Procedure</button><button class="btn primary" type="button" data-action="toast" data-title="Plan audit" data-msg="Audit planning form is not part of this mock.">${icon('plus')}Plan Audit</button>` });
    const strip = `<div class="pipeline">
      <div><div class="k">Programme ${esc(Q.today().slice(0, 4))}</div><div class="v">${done} / ${S.audits.length}</div><div class="d">audits completed</div></div>
      <div><div class="k">Next audit</div><div class="v" style="font-size:18px;line-height:32px">${next ? Q.fmt(next.date) : '—'}</div><div class="d">${next ? esc(next.title) + ' · ' + esc(Q.pname(next.auditor)) : 'None planned'}</div></div>
      <div><div class="k">Open findings</div><div class="v" style="color:${openF.length ? 'var(--danger)' : 'inherit'}">${openF.length}</div><div class="d">${openF.filter(f => f.type.startsWith('Major')).length} major · ${openF.filter(f => f.type.startsWith('Minor')).length} minor</div></div>
      <div><div class="k">Processes not in programme</div><div class="v" style="color:${notCovered.length ? 'var(--warning)' : 'inherit'}">${notCovered.length}</div><div class="d">of ${Q.topProcesses().length} processes</div></div></div>`;
    const t = tabs([['programme', 'Audit programme', '#/audit'], ['findings', 'Findings', '#/audit/findings', openF.length ? `${openF.length} open` : ''], ['coverage', 'Process coverage', '#/audit/coverage', notCovered.length ? `${notCovered.length} not covered` : '']], tab, 'Internal audit');
    let body;
    if (tab === 'findings') body = Q.findingTable('finds');
    else if (tab === 'coverage') {
      const rows = () => Q.topProcesses().map(p => { const au = S.audits.filter(a => a.processes.some(x => Q.inProc(x, p.process_id) || x === p.process_id)); const last = au.filter(a => a.status === 'Completed').sort((a, b) => a.date < b.date ? 1 : -1)[0]; const plan = au.find(a => a.status === 'Planned'); return { ...p, id: p.process_id, last, plan, f: S.findings.filter(f => Q.inProc(f.process, p.process_id) && f.status === 'Open').length }; });
      body = `<p class="small muted" style="margin:-8px 0 12px">ISO 9001 9.2.2 — every process should be audited within the audit cycle, with frequency based on importance, changes and previous results.</p>` + Q.table({ id: 'cov', rows, noun: 'processes', caption: 'Audit coverage by process', columns: [
        { key: 'p', label: 'Process', sort: r => r.display_order, render: r => Q.pcell(r.id) },
        { key: 'o', label: 'Owner', render: r => esc(Q.pname(r.owner)) },
        { key: 'last', label: 'Last audited', cls: 'c-date', sort: r => r.last?.date || '', render: r => r.last ? `${Q.fmt(r.last.date)}<span class="sub">${esc(r.last.id)}</span>` : '<span class="muted">—</span>' },
        { key: 'plan', label: 'Planned', cls: 'c-date', sort: r => r.plan?.date || '9', render: r => r.plan ? `${Q.fmt(r.plan.date)}<span class="sub">${esc(r.plan.id)}</span>` : '<span class="muted">—</span>' },
        { key: 'f', label: 'Open findings', cls: 'c-num', sort: r => r.f, render: r => Q.num(r.f) },
        { key: 's', label: 'Coverage', sort: r => r.last ? 2 : r.plan ? 1 : 0, render: r => r.last ? Q.st('Audited', 'success') : r.plan ? Q.st('Planned', 'info') : Q.st('Not in programme', 'danger') },
        { key: 'a', label: '', cls: 'c-actions', render: r => r.last || r.plan ? `<a class="btn sm ghost" href="#/process/${r.id}/audit">Open</a>` : `<button class="btn sm" type="button" data-action="toast" data-title="Add to programme" data-msg="${esc(r.process_code + ' ' + r.name)} would be added to the audit programme.">${icon('plus')}Add to programme</button>` }] });
    } else body = Q.table({ id: 'prog', rows: () => S.audits, noun: 'audits', caption: 'Audit programme', columns: [
      { key: 'id', label: 'ID', cls: 'c-id', render: a => esc(a.id) },
      { key: 't', label: 'Audit', render: a => `<span class="title">${esc(a.title)}</span>` },
      { key: 'p', label: 'Processes audited', render: a => a.processes.map(p => `<div>${Q.pcell(p)}</div>`).join('') },
      { key: 'd', label: 'Date', cls: 'c-date', sort: a => a.date, render: a => Q.fmt(a.date) },
      { key: 'au', label: 'Lead auditor', render: a => esc(Q.pname(a.auditor)) },
      { key: 'f', label: 'Findings', cls: 'c-num', render: a => { const n = S.findings.filter(f => f.audit === a.id).length; return n ? `<a href="#/audit/findings">${n}</a>` : '<span class="zero">—</span>'; } },
      { key: 's', label: 'Status', render: a => Q.st(a.status, a.status === 'Completed' ? 'success' : 'neutral') },
      { key: 'x', label: '', cls: 'c-actions', render: a => a.status === 'Completed' ? `<button class="btn sm" type="button" data-action="toast" data-title="Audit report" data-msg="${esc(a.id)} report would open from SharePoint.">${icon('file-text')}Report</button>` : `<button class="btn sm" type="button" data-action="toast" data-title="Audit checklist" data-msg="A checklist for ${esc(a.title)} would be prepared from the mapped ISO clauses and process documents.">${icon('clipboard-list')}Prepare checklist</button>` }] });
    return { title: 'Internal Audit', nav: 'audit', html: head + strip + t + body };
  };

  /* ============================== 6. Management Review ============================== */
  Q.views['mgmt-review'] = (parts, q) => {
    const S = Q.S, tab = ['actions', 'meetings', 'reports'].includes(parts[0]) ? parts[0] : 'inputs';
    const next = S.managementReviews.find(r => r.status === 'Scheduled'), last = S.managementReviews.find(r => r.status === 'Held');
    const openMA = S.managementActions.filter(a => a.status !== 'Closed');
    const head = Q.pageHead({ title: 'Management Review', sub: 'Top management reviews the QMS at planned intervals — ISO 9001 clause 9.3. Inputs are assembled live from the rest of iQMS.',
      actions: `<button class="btn" type="button" data-action="open-doc" data-id="MR-PRO-001">${icon('file-text')}Procedure</button><button class="btn primary" type="button" data-action="toast" data-title="Input pack generated" data-msg="The 9.3.2 input pack for ${esc(next?.id || 'the next review')} would be exported to Word from the current data.">${icon('download')}Generate Input Pack</button>` });
    const callout = next ? `<div class="callout" style="margin-bottom:20px">${icon('calendar')}<span><b>Next review: ${esc(next.title)} · ${Q.fmt(next.date)}</b><span class="dl"><span>Chair <b>${esc(Q.pname(next.chair))}</b></span><span>In <b>${Q.days(Q.today(), next.date)} days</b></span><span>Attendees <b>${next.attendees.map(Q.pname).join(', ')}</b></span><span>Last review <b>${Q.fmt(last.date)}</b></span></span></span></div>` : '';
    const t = tabs([['inputs', 'Review inputs (9.3.2)', '#/mgmt-review'], ['actions', 'Decisions & actions (9.3.3)', '#/mgmt-review/actions', openMA.length ? `${openMA.length} open` : ''], ['meetings', 'Meetings', '#/mgmt-review/meetings'], ['reports', 'Reports', '#/mgmt-review/reports']], tab, 'Management review');
    let body;
    if (tab === 'inputs') body = mrInputs(last);
    else if (tab === 'actions') body = Q.table({ id: 'ma', rows: () => S.managementActions, noun: 'management actions', caption: 'Management review actions', segDefault: 'open',
      tools: Q.seg('Status', [['open', 'Open', openMA.length], ['all', 'All', S.managementActions.length]], 'open'), segs: { open: a => a.status !== 'Closed' },
      columns: [
        { key: 'id', label: 'ID', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
        { key: 't', label: 'Decision / action', sort: a => a.title, render: a => `<span class="title">${esc(a.title)}</span>` },
        { key: 'r', label: 'From review', sort: a => a.review, render: a => `<span class="nowrap tnum">${esc(a.review)}</span>` },
        { key: 'p', label: 'Process', render: a => Q.pcell(a.process) },
        { key: 'o', label: 'Owner', sort: a => Q.pname(a.owner), render: a => `<span class="nowrap">${esc(Q.pname(a.owner))}</span>` },
        { key: 'd', label: 'Due', cls: 'c-date', sort: a => a.due, render: a => Q.dueDate(a.due, a.status === 'Closed') },
        { key: 's', label: 'Status', render: a => a.status === 'Closed' ? Q.st('Closed', 'muted') : a.due < Q.today() ? Q.st('Overdue', 'danger') : Q.st('Open', 'info') }] });
    else if (tab === 'meetings') body = `<section class="panel"><ul class="worklist">${S.managementReviews.map(r => `<li><span class="w-kind">${icon(r.status === 'Held' ? 'circle-check' : 'calendar')}</span><div class="w-main"><div class="w-title">${esc(r.title)}</div><div class="w-meta">${esc(r.id)} · ${Q.fmt(r.date)} · chair ${esc(Q.pname(r.chair))} · ${r.attendees.length} attendees${r.decisions ? ` · ${r.decisions} decisions` : ''}</div></div>${Q.st(r.status, r.status === 'Held' ? 'success' : 'info')}${r.minutes ? `<a class="btn sm" href="#/evidence?view=list&focus=${r.minutes}">${icon('paperclip')}Minutes</a>` : `<button class="btn sm" type="button" data-action="toast" data-title="Agenda" data-msg="Agenda would be created from ${esc('MR-TPL-002')} with the current inputs.">${icon('clipboard-list')}Prepare agenda</button>`}</li>`).join('')}</ul></section>`;
    else body = Q.reportsBody(q.r);
    return { title: 'Management Review', nav: 'mgmt-review', html: head + callout + t + body };
  };

  function mrInputs(last) {
    const S = Q.S, k = id => S.kpis.find(x => x.id === id);
    const csat = k('K-01'), otd = k('K-06'), train = k('K-11');
    const lastMA = S.managementActions.filter(a => a.review === last.id), lastOpen = lastMA.filter(a => a.status !== 'Closed');
    const kOn = S.kpis.filter(Q.kpiOk).length;
    const procs = Q.topProcesses().map(p => Q.stats(p.process_id));
    const openCA = S.actions.filter(a => !Q.actionClosed(a)), overCA = openCA.filter(Q.actionOverdue);
    const openF = S.findings.filter(f => f.status === 'Open');
    const iso = Q.isoScore(S.iso), evOk = S.evidence.filter(e => e.status === 'Verified').length;
    const highR = S.risks.filter(r => r.kind === 'Risk' && Q.riskOpen(r) && Q.riskLevel(r) === 'High');
    const ctx = Q.doc(S.context.contextDoc);
    const kv = x => `<b>${Q.kpiFmt(x.actual, x)}</b> vs target ${esc(x.dir)} ${Q.kpiFmt(x.target, x)}`;
    const items = [
      ['a', 'Status of actions from previous management reviews', `${last.id} actions`, `<b>${lastMA.length - lastOpen.length} of ${lastMA.length}</b> closed · ${lastOpen.length} open`, lastOpen.some(a => a.due < Q.today()), '#/mgmt-review/actions'],
      ['b', 'Changes in external and internal issues', 'Context & Interested Parties Register', Q.docOverdue(ctx) ? `Register review <b>overdue</b> since ${Q.fmt(ctx.nextReview)}` : 'Register current', Q.docOverdue(ctx), '#/qms/scope'],
      ['c1', 'Customer satisfaction and feedback', 'KPI K-01 · complaint log', `CSAT ${kv(csat)}`, !Q.kpiOk(csat), '#/qms/objectives'],
      ['c2', 'Extent to which quality objectives have been met', 'Objectives & KPIs', `<b>${kOn} of ${S.kpis.length}</b> KPIs on target`, kOn < S.kpis.length, '#/qms/objectives?status=below'],
      ['c3', 'Process performance and conformity of products and services', 'Process register', `<b>${procs.filter(s => s.health === 'risk').length}</b> at risk · ${procs.filter(s => s.health === 'attn').length} need attention`, procs.some(s => s.health === 'risk'), '#/qms/processes'],
      ['c4', 'Nonconformities and corrective actions', 'Corrective Action', `<b>${openCA.length}</b> open · ${overCA.length} overdue`, overCA.length > 0, '#/capa'],
      ['c5', 'Monitoring and measurement results', 'Evidence · ISO readiness', `Readiness <b>${iso.pct}%</b> · ${evOk} of ${S.evidence.length} records verified`, S.evidence.some(Q.evGap), '#/evidence'],
      ['c6', 'Audit results', 'Internal Audit', `<b>${S.audits.filter(a => a.status === 'Completed').length} of ${S.audits.length}</b> audits · ${openF.length} open findings (${openF.filter(f => f.type.startsWith('Major')).length} major)`, openF.some(f => f.type.startsWith('Major')), '#/audit'],
      ['c7', 'Performance of external providers', 'KPI K-06 · supplier scorecards', `On-time delivery ${kv(otd)}`, !Q.kpiOk(otd), '#/process/p05'],
      ['d', 'Adequacy of resources', 'KPI K-11 · risk R-007', `Training plan ${kv(train)}`, !Q.kpiOk(train), '#/process/p10'],
      ['e', 'Effectiveness of actions taken to address risks and opportunities', 'Risks & Opportunities', `<b>${highR.length}</b> high risks open · ${S.risks.filter(r => r.status === 'In treatment').length} in treatment`, highR.length > 0, '#/risks/matrix'],
      ['f', 'Opportunities for improvement', 'Corrective Action · improvements', `<b>${S.improvements.length}</b> recorded · ${S.improvements.filter(i => i.status === 'Proposed').length} not yet prioritised`, false, '#/capa/improvements']
    ];
    const attn = items.filter(i => i[4]).length;
    return `<p class="small muted" style="margin:-8px 0 12px">${attn} of ${items.length} inputs need discussion. Values are live — they will match the data on the day the pack is generated.</p>
      <section class="panel"><ul class="mr-inputs">${items.map(([ref, t, src, val, bad, href]) => `<li><span class="ref">9.3.2 ${esc(ref)}</span><div><div class="t"><a href="${href}" style="color:inherit">${esc(t)}</a></div><div class="src">Source: ${esc(src)}</div></div><div class="val">${val}</div><div>${bad ? Q.st('Needs discussion', 'warning') : Q.st('On track', 'success')}</div></li>`).join('')}</ul></section>`;
  }

  /* ============================== 7. Corrective Action ============================== */
  Q.views.capa = (parts, q) => {
    const S = Q.S, tab = parts[0] === 'improvements' ? 'improvements' : 'actions';
    const st = s => S.actions.filter(a => a.stage === s).length, over = S.actions.filter(Q.actionOverdue).length;
    const head = Q.pageHead({ title: 'Corrective Action', sub: `Nonconformities from audits, complaints and processes — correction, root cause, action and effectiveness (ISO 9001 clause 10.2). ${over} overdue.`,
      actions: `<button class="btn" type="button" data-action="open-doc" data-id="AUD-PRO-003">${icon('file-text')}Procedure</button><button class="btn primary" type="button" data-action="raise-ca">${icon('plus')}Raise Corrective Action</button>` });
    const strip = `<div class="pipeline">${[['Root cause', 'Step 1 · investigate why'], ['Action', 'Step 2 · implement the fix'], ['Effectiveness', 'Step 3 · verify it worked'], ['Closed', 'effective and closed']].map(([s, d], i) => `<div><div class="k">${esc(s)}</div><div class="v">${st(s)}</div><div class="d">${esc(d)}${i < 3 && S.actions.filter(a => a.stage === s && Q.actionOverdue(a)).length ? ` · <span class="date-overdue">${S.actions.filter(a => a.stage === s && Q.actionOverdue(a)).length} overdue</span>` : ''}</div></div>`).join('')}</div>`;
    const t = tabs([['actions', 'Corrective actions', '#/capa', over ? `${over} overdue` : ''], ['improvements', 'Improvement opportunities (10.3)', '#/capa/improvements']], tab, 'Corrective action');
    const body = tab === 'improvements' ? Q.improvementTable('imps') : Q.actionTable('cas', { initialFilters: q.status ? { status: q.status } : undefined });
    return { title: 'Corrective Action', nav: 'capa', html: head + strip + t + body };
  };
  Q.actions['raise-ca'] = () => {
    const S = Q.S, openF = S.findings.filter(f => f.status === 'Open' && !f.action);
    const m = Q.openModal({ size: 'm', title: 'Raise Corrective Action', sub: 'Starts at step 1 — root cause investigation.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field full"><span>Nonconformity <span class="req">*</span></span><input class="input" name="title" required autofocus placeholder="What went wrong?"></label>
        <label class="field"><span>Source</span><select class="select" name="source"><option value="">Other (complaint, process, supplier)</option>${openF.map(f => `<option value="${f.id}">${esc(f.id)} · ${esc(f.title)}</option>`).join('')}</select></label>
        <label class="field"><span>Process <span class="req">*</span></span><select class="select" name="process" required><option value="">Select…</option>${Q.processOptions('', { all: '' })}</select></label>
        <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(Q.me())}</select></label>
        <label class="field"><span>Due</span><input class="input" type="date" name="due" value="${Q.addDays(Q.today(), 30)}"></label>
      </div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Raise</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      const id = `CA-2026-${String(Math.max(...S.actions.map(a => +a.id.split('-')[2])) + 1).padStart(2, '0')}`;
      S.actions.push({ id, title: v.title, process: v.process, source: v.source || 'Process nonconformity', rootCause: 'Under investigation', owner: v.owner, due: v.due, stage: 'Root cause', status: 'In progress' });
      if (v.source) { const fi = S.findings.find(x => x.id === v.source); if (fi) fi.action = id; }
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Corrective action raised', `${id} · step 1 of 3: root cause`);
    });
  };
})();
