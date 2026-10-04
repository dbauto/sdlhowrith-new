/* iQMS — Overview: QMS Health + Team Activity (Update 21).
 *
 *  QMS HEALTH answers "how well are the operational QMS controls performing?" — it is NOT ISO readiness
 *  (that stays in the ISO 9001 readiness card with its own formula). Three measured rings + current priorities.
 *
 *    Document control  = controlled documents within their periodic-review date ÷ controlled documents that require
 *                        periodic review × 100. "Require periodic review" = issued (has a revision), has a next-review
 *                        date and is not Obsolete/Superseded. Drafts without an issued revision are excluded.
 *    Action performance = corrective actions not overdue ÷ all tracked corrective actions × 100.
 *                        The data holds no completion dates, so an on-time completion rate cannot be calculated
 *                        honestly. This is the defensible substitute: closed actions + open actions still within their
 *                        due date, over every corrective action in the register (Q.actionOverdue = open and past due).
 *    KPI performance   = KPIs meeting target ÷ KPIs with a current measured result × 100 (KPIs with no result excluded).
 *
 *    Ring state (shown as text as well as colour): ≥ 85 % on target (success) · 70–84 % needs attention (warning)
 *    · < 70 % critical (danger) · no denominator → "—" / "Not enough data" (neutral).
 *
 *  TEAM ACTIVITY has two modes switched by pill tabs:
 *    Open work       — open QMS work aggregated BY PERSON (one row per person, most urgent first).
 *    Recent activity — chronological feed normalised from the existing histories (no module is rewritten).
 *  Both respect the signed-in user's access: QMS Manager / Administrator see the whole organisation; other roles see
 *  only processes in their access map; Viewers see only their own work. Confidential documents are masked for people
 *  without manage access to that process.
 *
 *  Colours come only from the shared semantic tokens (success / warning / danger / info / neutral) so the card
 *  palette kit stays the single source of the final colours. */
(() => {
  'use strict';
  const { esc, icon } = Q, U = Q.ui;
  const pct = (n, d) => d ? Math.round(n / d * 100) : null;
  const toneOf = v => v == null ? 'neutral' : v >= 85 ? 'success' : v >= 70 ? 'warning' : 'danger';
  const STATE_TXT = { success: 'On target', warning: 'Needs attention', danger: 'Critical', neutral: 'Not enough data' };
  const days = d => Q.days(Q.today(), d);

  /* ====================================================================== access scope */
  const OPEN_ROLES = ['QMS Manager', 'Administrator'];
  Q.teamScope = () => {
    const me = Q.me(), u = Q.S.users.find(x => x.id === me) || { role: 'Viewer', access: {} };
    const org = OPEN_ROLES.includes(u.role);
    const access = u.access || {};
    const procOk = pid => org || !pid || !!access[Q.rootId?.(pid) || pid] || !!access[pid];
    const manage = pid => org || access[Q.rootId?.(pid) || pid] === 'manage' || access[pid] === 'manage';
    return { me, role: u.role, org, ownOnly: u.role === 'Viewer', procOk, manage };
  };
  const SECRET = new Set(['Confidential', 'Highly Confidential']);
  const docVisible = (d, sc) => !SECRET.has(d?.classification) || sc.manage(d.process) || d.owner === sc.me;
  const docLabel = (d, sc) => d ? (docVisible(d, sc) ? `${d.id} ${d.title}` : 'a confidential document') : '';

  /* ====================================================================== QMS health */
  Q.qmsHealth = () => {
    const S = Q.S;
    const req = S.documents.filter(d => d.nextReview && d.rev && !['Obsolete', 'Superseded'].includes(d.status));
    const docOk = req.filter(d => !Q.docOverdue(d)).length;
    const acts = S.actions, actOk = acts.filter(a => !Q.actionOverdue(a)).length;
    const measured = S.kpis.filter(k => k.actual != null && k.actual !== '' && !isNaN(Number(k.actual))), kOk = measured.filter(Q.kpiOk).length;
    return [
      { key: 'docs', name: 'Document Control', value: pct(docOk, req.length), href: '#/documents?status=overdue', icon: 'files',
        detail: req.length ? `${docOk} of ${req.length} within review date` : 'No documents require periodic review',
        info: 'Controlled documents within their periodic-review date ÷ issued documents that require periodic review.' },
      { key: 'actions', name: 'Action Performance', value: pct(actOk, acts.length), href: '#/capa?status=overdue', icon: 'list-checks',
        detail: acts.length ? `${actOk} of ${acts.length} not overdue` : 'No corrective actions recorded',
        info: 'Corrective actions that are closed or still within their due date ÷ all corrective actions. Completion dates are not recorded yet, so this is an on-time status rate, not an on-time completion rate.' },
      { key: 'kpis', name: 'KPI Performance', value: pct(kOk, measured.length), href: '#/qms/objectives?status=below', icon: 'target',
        detail: measured.length ? `${kOk} of ${measured.length} meeting target` : 'No KPI results recorded',
        info: 'KPIs meeting their target ÷ KPIs with a current measured result. KPIs without a result are excluded.' }
    ].map(m => ({ ...m, tone: toneOf(m.value) }));
  };

  /* Current priorities: at most 4, ordered overdue → critical → due soon → normal, then by size. */
  Q.qmsPriorities = (sc = Q.teamScope()) => {
    const S = Q.S, AM = Q.AM, out = [], see = x => sc.procOk(x.process) && (!sc.ownOnly || x.owner === sc.me);
    const P = (rank, ic, title, meta, nav, n = 1) => out.push({ rank, ic, title, meta, ...nav, n });
    const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    const caOver = S.actions.filter(a => Q.actionOverdue(a) && see(a));
    if (caOver.length) P(0, 'list-checks', `Close ${n(caOver.length, 'overdue corrective action', 'overdue corrective actions')}`, caOver.map(a => a.id).join(', '), caOver.length === 1 ? { href: `#/capa?focus=${caOver[0].id}` } : { href: '#/capa?status=overdue' }, caOver.length);
    const docOver = S.documents.filter(d => Q.docOverdue(d) && see(d));
    if (docOver.length) P(0, 'calendar-clock', `Review ${n(docOver.length, 'overdue document', 'overdue documents')}`, 'Periodic review date passed', docOver.length === 1 && docVisible(docOver[0], sc) ? { action: 'open-doc', data: { id: docOver[0].id } } : { href: '#/documents?status=overdue' }, docOver.length);
    if (AM) {
      const A = S.audits.filter(a => a.status !== 'Draft' && sc.procOk(a.process) && (!sc.ownOnly || a.auditor === sc.me));
      A.filter(AM.overdue).forEach(a => P(0, 'clipboard-check', `Schedule the ${AM.pname(a)} audit`, `${a.id} · past its first session`, { href: `#/audits/a/${a.id}` }));
      const ncOver = AM.ncs().filter(f => AM.ncOverdue(f) && sc.procOk(f.process) && (!sc.ownOnly || f.nc.owner === sc.me));
      if (ncOver.length) P(0, 'search-check', `Respond to ${n(ncOver.length, 'overdue nonconformity', 'overdue nonconformities')}`, ncOver.map(f => f.nc.no).join(', '), ncOver.length === 1 ? { href: `#/audits/nc/${ncOver[0].nc.no}` } : { href: '#/audits/nc?s=overdue' }, ncOver.length);
      const ver = AM.ncs().filter(f => f.nc.status === 'Verification Required' && sc.procOk(f.process));
      if (ver.length) P(1, 'badge-check', `Verify ${n(ver.length, 'corrective action', 'corrective actions')}`, ver.map(f => f.nc.no).join(', '), ver.length === 1 ? { href: `#/audits/nc/${ver[0].nc.no}` } : { href: '#/audits/nc?s=verify' }, ver.length);
      A.filter(a => a.status === 'In Progress').forEach(a => { const end = (a.sessions || []).map(s => s.date).sort().pop(); P(end && days(end) <= 7 ? 2 : 3, 'clipboard-check', `Complete the ${AM.pname(a)} audit`, `${a.id}${end ? ` · fieldwork ends ${Q.fmt(end)}` : ''}`, { href: `#/audits/a/${a.id}` }); });
    }
    const kBelow = S.kpis.filter(k => !Q.kpiOk(k) && see(k));
    if (kBelow.length) P(1, 'target', `Act on ${n(kBelow.length, 'KPI below target', 'KPIs below target')}`, 'Latest results', { href: '#/qms/objectives?status=below' }, kBelow.length);
    const week = S.documents.filter(d => !Q.docOverdue(d) && d.nextReview && days(d.nextReview) >= 0 && days(d.nextReview) <= 7 && see(d));
    if (week.length) P(2, 'calendar-clock', `Review ${n(week.length, 'document', 'documents')} due this week`, week.map(d => d.id).join(', '), { href: '#/documents' }, week.length);
    if (Q.K) { const pend = S.kpis.filter(see).flatMap(k => Q.K.results(k).filter(r => r.status === 'For Review'));
      if (pend.length) P(2, 'clipboard-check', `Approve ${n(pend.length, 'KPI result', 'KPI results')}`, 'Submitted for review', { href: '#/qms/objectives' }, pend.length); }
    return out.sort((a, b) => a.rank - b.rank || b.n - a.n).slice(0, 4);
  };

  const ring = (m, size = 96) => {
    const r = 40, c = 2 * Math.PI * r, v = m.value == null ? 0 : Math.max(0, Math.min(100, m.value));
    return `<span class="qh-ring tone-${m.tone}" role="img" aria-label="${esc(m.name)}: ${m.value == null ? 'not enough data' : m.value + ' percent'}, ${STATE_TXT[m.tone].toLowerCase()}" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="${r}"/>${v ? `<circle class="val" cx="50" cy="50" r="${r}" style="--c:${c.toFixed(1)}" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>` : ''}</svg>
      <span class="qh-val tnum">${m.value == null ? '—' : `${m.value}<small>%</small>`}</span></span>`;
  };
  const RANK = [['triangle-alert', 'danger', 'Overdue'], ['circle-dot', 'warning', 'Critical'], ['clock-3', 'warning', 'Due soon'], ['circle', 'neutral', 'Open']];
  const healthCard = () => {
    const ms = Q.qmsHealth(), pr = Q.qmsPriorities();
    const none = ms.every(m => m.value == null);
    const row = p => { const [ic, k, lbl] = RANK[p.rank], attrs = p.href ? `href="${esc(p.href)}"` : `role="button" tabindex="0" data-action="${esc(p.action)}"${Object.entries(p.data || {}).map(([a, v]) => ` data-${a}="${esc(v)}"`).join('')}`;
      return `<li><a class="qh-pr tone-${k}" ${attrs}><span class="qh-pr-ic">${icon(ic)}</span><span class="qh-pr-main"><b>${esc(p.title)}</b><small title="${esc(p.meta)}">${esc(p.meta)}</small></span>${U.badge(lbl, k)}</a></li>`; };
    return `<section class="panel ui-card qh-card" aria-labelledby="qh-t">
      <header class="qh-head"><span class="qh-tile">${icon('activity')}</span><span class="qh-titles"><h2 id="qh-t">QMS Health</h2><span>Current performance</span></span>${U.info('How well the operational QMS controls are performing now — documents, corrective actions and KPIs. ISO 9001 readiness is measured separately.')}</header>
      ${none ? `<div class="ui-empty qh-empty">${icon('gauge')}<span>No measurable data yet</span></div>` : `<ul class="qh-rings">${ms.map(m => `<li><a class="qh-metric" href="${esc(m.href)}">${ring(m)}
        <span class="qh-name">${esc(m.name)} ${U.info(m.info)}</span><span class="qh-state tone-${m.tone}">${STATE_TXT[m.tone]}</span><span class="qh-detail">${esc(m.detail)}</span></a></li>`).join('')}</ul>`}
      <div class="qh-pr-head">${icon('target')}<h3>Current priorities</h3></div>
      ${pr.length ? `<ul class="qh-prs">${pr.map(row).join('')}</ul>` : `<div class="ui-empty">${icon('circle-check')}<span>Nothing overdue or due soon.</span></div>`}
      <footer class="qh-foot"><a class="ui-link" href="#/qms/processes">View process status${icon('chevron-right')}</a></footer></section>`;
  };

  /* ====================================================================== open work (by person) */
  const ORDER = ['Overdue', 'Action needed', 'Due soon', 'Awaiting response', 'In audit', 'Reviewing', 'On track'];
  const KIND = { Overdue: 'danger', 'Action needed': 'warning', 'Due soon': 'warning', 'Awaiting response': 'info', 'In audit': 'info', Reviewing: 'info', 'On track': 'success' };
  const NOUN = { review: ['review', 'reviews'], approval: ['approval', 'approvals'], publish: ['to publish', 'to publish'], docrev: ['doc review due', 'doc reviews due'], action: ['corrective action', 'corrective actions'],
    ncresp: ['NC response', 'NC responses'], ncver: ['NC to verify', 'NCs to verify'], audit: ['audit question left', 'audit questions left'], auditsched: ['audit to schedule', 'audits to schedule'],
    report: ['audit report', 'audit reports'], kpi: ['KPI result to approve', 'KPI results to approve'], risk: ['risk treatment', 'risk treatments'], mgmt: ['management action', 'management actions'] };
  const timeState = (due, base) => !due ? base : due < Q.today() ? 'Overdue' : days(due) <= 7 && base === 'On track' ? 'Due soon' : base;
  Q.teamWork = (sc = Q.teamScope()) => {
    const S = Q.S, AM = Q.AM, K = Q.K, items = [];
    const add = (who, kind, n, state, title, nav, process, due) => { if (!who || !sc.procOk(process) || (sc.ownOnly && who !== sc.me)) return; items.push({ who, kind, n, state, title, process, due, ...nav }); };
    S.workflows.forEach(w => { const d = Q.doc(w.doc); if (!d) return; const kind = w.stage === 'review' ? 'review' : w.stage === 'approval' ? 'approval' : 'publish';
      Q.wfAssignees(w).forEach(who => add(who, kind, 1, w.due && w.due < Q.today() ? 'Overdue' : kind === 'review' ? timeState(w.due, 'Reviewing') : 'Action needed', `${kind === 'review' ? 'Review' : kind === 'approval' ? 'Approve' : 'Publish'} ${docLabel(d, sc)} Rev ${w.rev}`, { href: `#/review/${w.id}` }, d.process, w.due)); });
    S.documents.forEach(d => { if (!d.nextReview || !d.rev || ['Obsolete', 'Superseded'].includes(d.status)) return; const dd = days(d.nextReview);
      if (dd <= 14) add(d.owner, 'docrev', 1, dd < 0 ? 'Overdue' : 'Due soon', `Periodic review of ${docLabel(d, sc)}`, docVisible(d, sc) ? { action: 'open-doc', data: { id: d.id } } : {}, d.process, d.nextReview); });
    S.actions.filter(a => !Q.actionClosed(a)).forEach(a => add(a.owner, 'action', 1, timeState(a.due, 'On track'), `${a.id} ${a.title}`, { href: `#/capa?focus=${a.id}` }, a.process, a.due));
    if (AM) {
      AM.ncs().filter(AM.ncOpen).forEach(f => { const a = AM.audit?.(f.audit);
        if (f.nc.status === 'Verification Required') add(a?.auditor, 'ncver', 1, 'Action needed', `Verify ${f.nc.no}`, { href: `#/audits/nc/${f.nc.no}` }, f.process);
        else if (f.nc.status !== 'Verified') add(f.nc.owner, 'ncresp', 1, f.nc.due && f.nc.due < Q.today() ? 'Overdue' : 'Awaiting response', `Respond to ${f.nc.no}`, { href: `#/audits/nc/${f.nc.no}` }, f.process, f.nc.due); });
      S.audits.filter(a => a.status !== 'Draft').forEach(a => {
        if (AM.overdue(a)) add(a.auditor, 'auditsched', 1, 'Overdue', `Schedule ${a.id} ${AM.pname(a)} audit`, { href: `#/audits/a/${a.id}` }, a.process);
        if (a.status === 'In Progress') (a.assignments || []).forEach(s => { if (s.submitted) return; const left = AM.itemsOf(a, s.who).filter(i => !AM.complete(i)).length;
          if (left) add(s.who, 'audit', left, 'In audit', `${left} question${left === 1 ? '' : 's'} left in ${a.id} ${AM.pname(a)} audit`, { href: `#/audits/a/${a.id}/checklist` }, a.process); });
        if (a.report?.status === 'For Review') add(a.report.reviewer, 'report', 1, 'Action needed', `Review the ${a.id} audit report`, { href: `#/audits/a/${a.id}/report` }, a.process);
      });
    }
    if (K) S.kpis.forEach(k => { const n = K.results(k).filter(r => r.status === 'For Review').length; if (n) add(k.reviewer || 'maria', 'kpi', n, 'Action needed', `Approve ${n} result${n === 1 ? '' : 's'} for ${k.name}`, { href: `#/qms/objectives/k/${k.id}/results` }, k.process); });
    S.risks.filter(r => (Q.riskOpen ? Q.riskOpen(r) : r.status !== 'Closed') && r.due).forEach(r => { const dd = days(r.due); if (dd <= 30) add(r.owner, 'risk', 1, timeState(r.due, 'On track'), `Treat ${r.id} ${r.title}`, { href: `#/risks?focus=${r.id}` }, r.process, r.due); });
    S.managementActions.filter(a => a.status !== 'Closed').forEach(a => add(a.owner, 'mgmt', 1, timeState(a.due, 'On track'), `${a.id} ${a.title}`, { href: '#/mgmt-review/actions' }, a.process, a.due));
    // Aggregate by person
    const people = new Map();
    items.forEach(i => { const p = people.get(i.who) || { who: i.who, items: [] }; p.items.push(i); people.set(i.who, p); });
    return [...people.values()].map(p => {
      const state = ORDER.find(s => p.items.some(i => i.state === s)) || 'On track', counts = {};
      p.items.forEach(i => { counts[i.kind] = (counts[i.kind] || 0) + i.n; });
      const over = p.items.filter(i => i.state === 'Overdue').length;
      const parts = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${NOUN[k][n === 1 ? 0 : 1]}`);
      return { ...p, state, over, total: p.items.reduce((t, i) => t + i.n, 0), summary: [over ? `${over} overdue` : '', ...parts].filter(Boolean).slice(0, 3).join(' · ') };
    }).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || b.over - a.over || b.total - a.total || Q.pname(a.who).localeCompare(Q.pname(b.who)));
  };

  /* ====================================================================== recent activity (normalised feed) */
  const msOf = at => { const [d, t] = String(at).split(' '); return new Date(`${d}T${t || '12:00'}:00`).getTime(); };
  Q.teamActivity = (sc = Q.teamScope()) => {
    const S = Q.S, AM = Q.AM, ev = [], seen = new Set();
    const push = e => { if (!e.at || !e.who || !sc.procOk(e.process) || (sc.ownOnly && e.who !== sc.me)) return; const k = e.key || `${e.who}|${String(e.at).slice(0, 10)}|${e.text}`; if (seen.has(k)) return; seen.add(k); ev.push(e); };
    // Workflow reviews / approvals (dated per person)
    S.workflows.forEach(w => { const d = Q.doc(w.doc); if (!d) return;
      (w.reviewers || []).filter(r => r.state === 'Completed' && r.date).forEach(r => push({ at: r.date, who: r.who, text: `reviewed ${docLabel(d, sc)} Rev ${w.rev}`, process: d.process, key: `${r.who}|${r.date}|${d.id}`, ...(docVisible(d, sc) ? { href: `#/review/${w.id}` } : {}) }));
      (w.approvers || []).filter(r => r.state === 'Completed' && r.date).forEach(r => push({ at: r.date, who: r.who, text: `approved ${docLabel(d, sc)} Rev ${w.rev}`, process: d.process, key: `${r.who}|${r.date}|${d.id}`, ...(docVisible(d, sc) ? { href: `#/review/${w.id}` } : {}) }));
      if (w.started && w.startedBy) push({ at: w.started, who: w.startedBy, text: `started routing ${docLabel(d, sc)} Rev ${w.rev}`, process: d.process, ...(docVisible(d, sc) ? { href: `#/review/${w.id}` } : {}) }); });
    // General activity log
    S.activity.forEach(a => { const d = Q.doc(a.ref), hidden = d && !docVisible(d, sc);
      push({ at: a.date, who: a.who, text: hidden ? 'updated a confidential document' : a.text, process: a.process, key: d ? `${a.who}|${a.date}|${d.id}` : undefined, ...(d && !hidden ? { action: 'open-doc', data: { id: d.id } } : {}) }); });
    // Document revisions published
    Object.entries(S.revisions || {}).forEach(([id, revs]) => { const d = Q.doc(id); if (!d) return; (revs || []).filter(r => r.published).forEach(r => push({ at: r.published, who: r.author, text: `published ${docLabel(d, sc)} Rev ${r.rev}`, process: d.process, ...(docVisible(d, sc) ? { action: 'open-doc', data: { id } } : {}) })); });
    // Audit activity
    if (AM) S.audits.forEach(a => (a.activity || []).forEach(x => push({ at: x.at, who: x.who, text: `${x.text} · ${a.id}`, process: a.process, href: `#/audits/a/${a.id}/activity` })));
    // KPI log
    (S.kpiLog || []).forEach(x => { const k = S.kpis.find(y => y.id === x.kpi); push({ at: x.at, who: x.who, text: `${x.text}${k ? ` · ${k.name}` : ''}`, process: k?.process, href: k ? `#/qms/objectives/k/${k.id}/history` : undefined }); });
    // Only things that have happened: planned items stored with a future timestamp are not activity.
    const now = Date.now();
    return ev.map(e => ({ ...e, ms: msOf(e.at) })).filter(e => e.ms <= now + 6e4).sort((a, b) => b.ms - a.ms);
  };
  const ago = e => { const now = Date.now(), diff = now - e.ms, hasTime = String(e.at).includes(' ');
    if (hasTime && diff >= 0 && diff < 36e5) return `${Math.max(1, Math.round(diff / 6e4))} min ago`;
    if (hasTime && diff >= 0 && diff < 864e5 && String(e.at).startsWith(Q.today())) return `${Math.round(diff / 36e5)} h ago`;
    const dd = -days(String(e.at).slice(0, 10)); return dd <= 0 ? 'Today' : dd === 1 ? 'Yesterday' : dd < 7 ? `${dd} days ago` : Q.fmt(String(e.at).slice(0, 10)); };

  /* ====================================================================== team activity card */
  const PREF = { view: 'work', rows: 5, filter: 'all', period: 30, avatars: true };
  const prefs = () => ({ ...PREF, ...(Q.UI.teamActivity || {}) });
  const setPref = (k, v) => { Q.UI.teamActivity = { ...prefs(), [k]: v }; Q.saveUI(); };
  // The selected tab is remembered for the session; "Default view" (gear) decides the tab a new session opens on.
  const curTab = () => { try { return sessionStorage.getItem('iqms.ta.tab') || prefs().view; } catch (_) { return prefs().view; } };
  const setTab = t => { try { sessionStorage.setItem('iqms.ta.tab', t); } catch (_) { /* ignore */ } };
  const teamOf = me => { const out = new Set([me]); const walk = id => Object.entries({ ...Q.S.people, ...(Q.S.orgMembers || {}) }).forEach(([k, p]) => { if (p.reportsTo === id && !out.has(k)) { out.add(k); walk(k); } }); walk(me); return out; };
  const av = (id, show) => show ? `<span class="avatar sm ta-av" aria-hidden="true">${esc(Q.initials(id))}</span>` : '';
  const teamCard = () => {
    const o = prefs(), sc = Q.teamScope(), tab = curTab(), me = sc.me;
    const inFilter = id => o.filter === 'dept' ? Q.person(id).dept === Q.person(me).dept : o.filter === 'team' ? teamOf(me).has(id) : true;
    const work = Q.teamWork(sc).filter(p => inFilter(p.who)), rows = Number(o.rows) || 5;
    const since = Date.now() - Number(o.period) * 864e5, feed = Q.teamActivity(sc).filter(e => e.ms >= since);
    const wRow = p => `<li><a class="ta-row" role="button" tabindex="0" data-action="ta-person" data-who="${esc(p.who)}">${av(p.who, o.avatars)}
      <span class="ta-main"><b>${esc(Q.pname(p.who))}</b><small title="${esc(`${Q.person(p.who).title || ''} · ${p.summary}`)}">${Q.person(p.who).title ? `<span class="ta-role">${esc(Q.person(p.who).title)} · </span>` : ''}${esc(p.summary)}</small></span>
      ${U.badge(p.state, KIND[p.state])}</a></li>`;
    const aRow = e => { const attrs = e.href ? `href="${esc(e.href)}"` : e.action ? `role="button" tabindex="0" data-action="${esc(e.action)}"${Object.entries(e.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}` : '';
      return `<li><${attrs ? 'a' : 'div'} class="ta-row${attrs ? '' : ' static'}" ${attrs}>${av(e.who, o.avatars)}<span class="ta-main"><b>${esc(Q.pname(e.who))}</b><small title="${esc(e.text)}">${esc(e.text)}</small></span><time class="ta-time tnum" datetime="${esc(e.at)}">${esc(ago(e))}</time></${attrs ? 'a' : 'div'}></li>`; };
    const panel = (key, html) => `<div class="ta-panel" role="tabpanel" id="ta-p-${key}" aria-labelledby="ta-t-${key}"${tab === key ? '' : ' hidden'}>${html}</div>`;
    const scopeNote = sc.org ? 'Whole organization' : sc.ownOnly ? 'Your own work' : 'Processes you can access';
    const opt = (name, val, label, cur) => `<label class="ta-opt"><input type="radio" name="${name}" value="${val}" ${String(cur) === String(val) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
    return `<section class="panel ui-card ta-card" aria-labelledby="ta-title" data-ta>
      <header class="ta-head"><h2 id="ta-title">Team Activity</h2>
        <div class="ta-pills" role="tablist" aria-label="Team Activity view">
          <button type="button" role="tab" id="ta-t-work" aria-controls="ta-p-work" aria-selected="${tab === 'work'}" tabindex="${tab === 'work' ? 0 : -1}" data-ta-tab="work">Open Work</button>
          <button type="button" role="tab" id="ta-t-recent" aria-controls="ta-p-recent" aria-selected="${tab === 'recent'}" tabindex="${tab === 'recent' ? 0 : -1}" data-ta-tab="recent">Recent Activity</button></div>
        <span class="ta-gear-wrap"><button type="button" class="icon-btn ta-gear" aria-label="Team Activity settings" aria-haspopup="true" aria-expanded="false" data-ta-gear>${icon('settings')}</button>
          <form class="ta-pop" hidden aria-label="Team Activity settings">
            <fieldset><legend>Default view</legend>${opt('view', 'work', 'Open Work', o.view)}${opt('view', 'recent', 'Recent Activity', o.view)}</fieldset>
            <fieldset><legend>Rows to show</legend>${[5, 8, 10].map(n => opt('rows', n, String(n), o.rows)).join('')}</fieldset>
            <fieldset><legend>Open work</legend>${opt('filter', 'all', sc.org ? 'All organization' : 'Everyone I can see', o.filter)}${opt('filter', 'dept', 'My department', o.filter)}${opt('filter', 'team', 'My team', o.filter)}</fieldset>
            <fieldset><legend>Recent activity</legend>${opt('period', 1, '24 hours', o.period)}${opt('period', 7, '7 days', o.period)}${opt('period', 30, '30 days', o.period)}</fieldset>
            <fieldset><legend>Display</legend>${opt('avatars', 'true', 'Show avatars', String(o.avatars))}${opt('avatars', 'false', 'Hide avatars', String(o.avatars))}</fieldset>
            <p class="ta-scope">${icon('lock')}${esc(scopeNote)}</p></form></span></header>
      ${panel('work', work.length ? `<ul class="ta-list">${work.slice(0, rows).map(wRow).join('')}</ul>` : `<div class="ui-empty ta-empty">${icon('circle-check')}<span><b>No open work</b>Everyone's assigned QMS work is currently up to date.</span></div>`)}
      ${panel('recent', feed.length ? `<ul class="ta-list">${feed.slice(0, rows).map(aRow).join('')}</ul>` : `<div class="ui-empty ta-empty">${icon('history')}<span><b>No recent activity</b>No QMS activity has been recorded in the selected period.</span></div>`)}
      <footer class="ta-foot"><button type="button" class="ta-foot-btn" data-action="ta-person" data-who="" ${tab === 'work' ? '' : 'hidden'} data-ta-foot="work">View all assigned work${icon('chevron-right')}</button>
        <button type="button" class="ta-foot-btn" data-action="ta-feed" ${tab === 'recent' ? '' : 'hidden'} data-ta-foot="recent">View all activity${icon('chevron-right')}</button></footer></section>`;
  };

  /* Work detail: one person, or everyone in scope. Rows open the record. */
  Q.actions['ta-person'] = d => {
    const sc = Q.teamScope(), list = Q.teamWork(sc).filter(p => !d.who || p.who === d.who);
    const item = i => { const attrs = i.href ? `href="${esc(i.href)}" data-close` : i.action ? `role="button" tabindex="0" data-close data-action="${esc(i.action)}"${Object.entries(i.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}` : '';
      return `<li><${attrs ? 'a' : 'div'} class="ui-row" ${attrs}><span class="ui-row-main"><span class="ui-row-title">${esc(i.title)}</span><span class="ui-row-meta">${esc(Q.proc(i.process)?.name || 'Organization')}${i.due ? ` · due ${Q.fmt(i.due)}` : ''}</span></span><span class="ui-row-right">${U.badge(i.state, KIND[i.state])}</span></${attrs ? 'a' : 'div'}></li>`; };
    Q.openModal({ size: 'm', title: d.who ? esc(Q.pname(d.who)) : 'Team workload', sub: d.who ? esc(Q.person(d.who).title || '') : `${list.length} people with open QMS work · ${sc.org ? 'whole organization' : 'within your access'}`,
      body: `<div class="modal-body ta-modal">${list.length ? list.map(p => `${d.who ? '' : `<h3 class="ta-mh">${esc(Q.pname(p.who))} ${U.badge(p.state, KIND[p.state])}</h3>`}<ul class="ui-list">${p.items.slice().sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state)).map(item).join('')}</ul>`).join('') : '<p class="muted">No open work.</p>'}</div>`,
      foot: '<button class="btn" type="button" data-close>Close</button>' });
  };
  Q.actions['ta-feed'] = () => {
    const o = prefs(), since = Date.now() - Number(o.period) * 864e5, feed = Q.teamActivity().filter(e => e.ms >= since);
    Q.openModal({ size: 'm', title: 'Recent activity', sub: `Last ${o.period === 1 || o.period === '1' ? '24 hours' : `${o.period} days`} · ${feed.length} events`,
      body: `<div class="modal-body"><ul class="ta-list">${feed.map(e => `<li><${e.href ? `a href="${esc(e.href)}" data-close` : 'div'} class="ta-row">${av(e.who, true)}<span class="ta-main"><b>${esc(Q.pname(e.who))}</b><small>${esc(e.text)}</small></span><time class="ta-time tnum">${esc(ago(e))}</time></${e.href ? 'a' : 'div'}></li>`).join('') || '<p class="muted">No activity.</p>'}</ul></div>`,
      foot: '<button class="btn" type="button" data-close>Close</button>' });
  };

  // Pill tabs (click + arrow keys), gear popover, settings
  const selectTab = (card, t, focus) => { setTab(t);
    card.querySelectorAll('[data-ta-tab]').forEach(b => { const on = b.dataset.taTab === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    card.querySelectorAll('.ta-panel').forEach(p => { p.hidden = p.id !== `ta-p-${t}`; });
    card.querySelectorAll('[data-ta-foot]').forEach(f => { f.hidden = f.dataset.taFoot !== t; }); };
  document.addEventListener('click', e => {
    const tb = e.target.closest?.('[data-ta-tab]'); if (tb) { selectTab(tb.closest('[data-ta]'), tb.dataset.taTab); return; }
    const g = e.target.closest?.('[data-ta-gear]');
    if (g) { const pop = g.parentElement.querySelector('.ta-pop'), open = pop.hidden; pop.hidden = !open; g.setAttribute('aria-expanded', open); if (open) pop.querySelector('input:checked')?.focus(); return; }
    document.querySelectorAll('.ta-pop:not([hidden])').forEach(p => { if (!p.contains(e.target)) { p.hidden = true; p.parentElement.querySelector('[data-ta-gear]').setAttribute('aria-expanded', 'false'); } });
  });
  document.addEventListener('keydown', e => {
    const tb = e.target.closest?.('[data-ta-tab]');
    if (tb && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const t = tb.dataset.taTab === 'work' ? 'recent' : 'work'; selectTab(tb.closest('[data-ta]'), e.key === 'Home' ? 'work' : e.key === 'End' ? 'recent' : t, true); }
    if (e.key === 'Escape') { const pop = document.querySelector('.ta-pop:not([hidden])'); if (pop) { pop.hidden = true; const g = pop.parentElement.querySelector('[data-ta-gear]'); g.setAttribute('aria-expanded', 'false'); g.focus(); } }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.ta-row[role="button"], .qh-pr[role="button"]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('change', e => {
    const f = e.target.closest?.('.ta-pop'); if (!f) return;
    const { name, value } = e.target;
    setPref(name, name === 'rows' || name === 'period' ? Number(value) : name === 'avatars' ? value === 'true' : value);
    if (name === 'view') setTab(value);
    Q.render({ noFocus: true, keepScroll: true });
    const g = document.querySelector('[data-ta-gear]'); if (g) { g.click(); document.querySelector(`.ta-pop [name="${name}"][value="${value}"]`)?.focus(); }
  });

  /* ====================================================================== page-builder components */
  const ensureAudits = () => { try { Q.AM?.init?.(); } catch (_) { /* audits not loaded */ } };
  Q.component('overview-qms-health', { pages: ['overview'], group: 'Overview', name: 'QMS Health', icon: 'activity', minWidth: 4, minHeight: 360,
    desc: 'Operational QMS performance across documents, actions and KPIs.', render: () => { ensureAudits(); return healthCard(); } });
  Q.component('overview-team-activity', { pages: ['overview'], group: 'Overview', name: 'Team Activity', icon: 'users', minWidth: 4, minHeight: 360,
    desc: 'People with open QMS work and recent system activity.', render: () => { ensureAudits(); return teamCard(); } });

  // Default layout: QMS Health + Team Activity side by side under the attention summary.
  const L = Q.PAGES.overview?.layout?.zones?.top;
  if (L && !Object.values(Q.PAGES.overview.layout.zones).flat().some(b => b.type === 'overview-qms-health')) {
    const at = L.findIndex(b => b.type === 'overview-attention') + 1;
    L.splice(at, 0, { id: 'ov-health', type: 'overview-qms-health', size: { w: 6, h: 0 } }, { id: 'ov-team', type: 'overview-team-activity', size: { w: 6, h: 0 } });
  }
  // A customised Overview gets the two cards once, in the same place (it can still remove or move them).
  const saved = Q.S.pageLayouts?.overview;
  if (saved && !Q.S.overviewU21) {
    const all = Object.values(saved.zones || {}).flat();
    if (!all.some(b => b.type === 'overview-qms-health' || b.type === 'overview-team-activity')) {
      const z = saved.zones.top || (saved.zones.top = []), at = z.findIndex(b => b.type === 'overview-attention') + 1;
      z.splice(at > 0 ? at : 0, 0, { id: 'ov-health', type: 'overview-qms-health', size: { w: 6, h: 0 } }, { id: 'ov-team', type: 'overview-team-activity', size: { w: 6, h: 0 } });
    }
    Q.S.overviewU21 = true; Q.save();
  }
})();

/* Update 24 — the Overview dashboard arrangement ("Narrow + wide"). A customised Overview is moved to it once:
 * cards the user removed stay removed, cards they added keep their size and go to the bottom zone. */
(() => {
  const Q = window.Q, saved = Q.S.pageLayouts?.overview;
  if (!saved || Q.S.overviewU24) return;
  const def = Q.PAGES.overview.layout, mine = Object.values(saved.zones || {}).flat();
  const has = t => mine.some(b => b.type === t), inDef = Object.values(def.zones).flat().map(b => b.type);
  const zones = {}; Object.entries(def.zones).forEach(([z, list]) => { zones[z] = list.filter(b => has(b.type)).map(b => ({ ...b, size: { ...b.size } })); });
  zones.bottom = [...(zones.bottom || []), ...mine.filter(b => !inDef.includes(b.type))];
  Q.S.pageLayouts.overview = { layout: def.layout, zones };
  Q.S.overviewU24 = true; Q.save();
})();
