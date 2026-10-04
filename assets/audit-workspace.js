/* iQMS — Audit Management: the process audit workspace (#/audits/a/<id>/<tab>).
 * Tabs: Overview · Plan · Checklist · Findings & NCs · Report · Activity. One audit = one process,
 * so there is no area navigation. Auditors work in "My Checklist": only the questions assigned to them,
 * and they cannot submit their audit work while required questions are unanswered. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM;
  const fam = AM.fam;
  const rr = () => Q.render({ noFocus: true, keepScroll: true });
  const close = () => Q.closeAllModals();
  const findA = d => AM.audit(d.id);
  const opts = (list, sel) => list.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');

  const WTABS = [['overview', 'Summary'], ['plan', 'Plan'], ['checklist', 'Checklist'], ['findings', 'Findings & NCs'], ['report', 'Report'], ['activity', 'Activity']];
  AM.workspace = (id, tab, q, sub) => {
    const a = AM.audit(id);
    if (!a) {
      const lg = AM.legacy(id);
      if (lg) return { title: `${id} · Audits`, nav: 'audits', html: AM.chrome('list', { title: `${esc(id)} was split into process audits`, crumbs: [['Audits', '#/audits'], ['Audit Register', '#/audits/list'], [id]], sub: `“${esc(lg.title)}” covered ${lg.processes.length} processes. One audit now covers one process, so it was converted on ${Q.fmt(lg.migrated)}.` }) + `<section class="panel"><ul class="worklist">${lg.splitInto.map(x => { const s = AM.audit(x); return s ? `<li><div class="w-main"><div class="w-title"><b class="tnum">${esc(s.id)}</b> ${esc(s.title)}</div><div class="w-meta">${esc(AM.pname(s))} · ${AM.dateRange(s)}</div></div>${AM.badge(s)}<a class="btn sm" href="#/audits/a/${s.id}">Open Audit</a></li>` : ''; }).join('')}</ul></section>` };
      return { title: 'Audit not found', nav: 'audits', html: AM.chrome('list', { title: 'Audit not found', sub: `${esc(id)} does not exist.` }) };
    }
    if (a.status === 'Draft') { location.replace(`#/audits/new?draft=${a.id}`); return { title: 'Draft', nav: 'audits', html: '' }; }
    if (tab === 'report' && sub === 'edit') return AM.reportEditor(a, q);
    if (tab === 'print') return AM.printView(a, q);
    if (tab === 'actions') tab = 'findings';
    tab = WTABS.some(t => t[0] === tab) ? tab : 'overview';
    AM.refresh(a);
    const fs = AM.findingsOf(a.id), ncs = fs.filter(f => f.nc), me = AM.actor(), mine = AM.asg(a, me);
    const primary = (() => {
      const plan = AM.can('plan', a);
      if (a.status === 'Planned' && plan) return `<a class="btn primary" href="#/audits/a/${a.id}/plan#sessions">${icon('calendar')}Schedule Sessions</a>`;
      if (a.status === 'Scheduled' && plan) return `<a class="btn primary" href="#/audits/a/${a.id}/checklist">${icon('clipboard-list')}Prepare Checklist</a>`;
      if (a.status === 'Preparation' && plan) return `<button class="btn primary" type="button" data-action="am-start" data-id="${a.id}">${icon('play')}Start Audit</button>`;
      if (a.status === 'In Progress') return AM.can('fieldwork', a) ? `<button class="btn primary" type="button" data-action="am-fieldwork" data-id="${a.id}">${icon('circle-check')}Complete Fieldwork</button>` : mine && AM.itemsOf(a, me).length ? `<a class="btn primary" href="#/audits/a/${a.id}/checklist?view=mine">${icon('clipboard-check')}My Checklist</a>` : '';
      if (a.status === 'Reporting') return `<a class="btn primary" href="#/audits/a/${a.id}/report">${icon('file-text')}Open Report</a>`;
      if (a.status === 'Follow-up' && AM.can('report', a)) { const b = AM.closeBlockers(a); return `<button class="btn primary" type="button" data-action="am-close" data-id="${a.id}" ${b.length ? `disabled title="Cannot close: ${esc(b.join('; '))}"` : ''}>${icon('circle-check')}Close Audit</button>`; }
      return '';
    })();
    const more = AM.can('plan', a) ? Q.menu(`More actions for ${a.id}`, [{ label: 'Edit Plan', icon: 'pencil', data: { action: 'am-edit-plan', id: a.id } }, { label: 'Add Session', icon: 'calendar', data: { action: 'am-session', id: a.id } }, { label: 'Add Auditor', icon: 'user-plus', data: { action: 'am-asg-add', id: a.id } }, { label: 'Change Lead Auditor', icon: 'user-round', data: { action: 'am-lead', id: a.id } }, '-', { label: 'Print Audit Plan', icon: 'download', data: { action: 'go', href: `#/audits/a/${a.id}/print?kind=plan` } }], { text: 'More', icon: 'ellipsis', cls: 'btn' }) : `<a class="btn" href="#/audits/a/${a.id}/print?kind=plan">${icon('download')}Audit Plan</a>`;
    const steps = AM.STATUSES.slice(1), ci = steps.indexOf(a.status);
    const life = `<ol class="am-life" aria-label="Audit lifecycle">${steps.map((s, i) => `<li class="${i < ci ? 'done' : i === ci ? 'current' : ''}"${i === ci ? ' aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>`;
    const meta = `<div class="meta-line"><span>${Q.pcell(a.process)}</span><span>${AM.dateRange(a)}${(a.sessions || []).length ? ` · ${a.sessions.length} session${a.sessions.length === 1 ? '' : 's'}` : ''}</span><span>Lead Auditor <b>${esc(Q.pname(a.auditor))}</b></span><span><b>${a.assignments.length}</b> on the team</span><span><b>${a.clauses.length}</b> clauses</span><span><b>${fs.length}</b> findings${ncs.length ? ` · ${ncs.filter(AM.ncOpen).length} open NC` : ''}</span>${a.programme ? `<span><a href="#/audits/programme?p=${a.programme}">${esc(AM.progName(a.programme))}</a></span>` : ''}</div>`;
    const head = Q.pageHead({ crumbs: [['Audits', '#/audits'], ['Audit Register', '#/audits/list'], [a.id]], pre: `<div class="am-id"><span class="tnum">${esc(a.id)}</span>${AM.badge(a)}${AM.triggerChip(a)}</div>`, title: esc(a.title), meta, actions: primary + more });
    const myN = mine ? AM.itemsOf(a, me).length : 0;
    const counts = { checklist: a.checklist && AM.counted(a).length ? `${AM.counted(a).filter(AM.complete).length}/${AM.counted(a).length}` : '', findings: fs.length || '' };
    const tabsHtml = AM.tabs(WTABS.map(([k, l]) => [k, l, `#/audits/a/${a.id}/${k}${k === 'checklist' && myN && a.status === 'In Progress' ? '?view=mine' : ''}`, counts[k] || '']), tab, 'Audit');
    const body = { overview: wsOverview, plan: wsPlan, checklist: wsChecklist, findings: wsFindings, report: AM.reportTab, activity: wsActivity }[tab](a, q);
    return { title: `${a.id} · Audits`, nav: 'audits', html: head + life + `<div class="am-nav">${tabsHtml}${AM.actorSwitch()}</div>` + body.html,
      after: main => { body.after?.(main); if (location.hash.includes('#sessions')) main.querySelector('#sessions')?.scrollIntoView({ block: 'start' }); } };
  };

  /* ====================================================================== overview */
  AM.closeBlockers = a => {
    const out = [];
    if (a.report.status !== 'Published') out.push('the audit report is not published');
    const open = AM.findingsOf(a.id).filter(AM.ncOpen);
    if (open.length) out.push(`${open.length} nonconformit${open.length === 1 ? 'y is' : 'ies are'} still open (${open.map(f => f.nc.no).join(', ')}) — follow-up and effectiveness verification must be complete`);
    return out;
  };
  AM.fieldworkBlockers = a => {
    const req = AM.counted(a).filter(i => i.required && !AM.complete(i)), by = {};
    req.forEach(i => { (by[i.assignee || 'unassigned'] = by[i.assignee || 'unassigned'] || []).push(i); });
    const pending = a.assignments.filter(s => s.role !== 'Observer' && AM.itemsOf(a, s.who).length && !s.submitted);
    return { req, by, pending, noEvidence: AM.counted(a).filter(i => i.type === 'assessment' && i.result && i.result !== 'N/A' && !(i.reviewed || []).length && !(i.external || []).length) };
  };
  // Each item: [kind, text, href] — the row links to where it is fixed.
  function attention(a) {
    const out = [], me = AM.actor(), at = t => `#/audits/a/${a.id}/${t}`;
    if (['Planned', 'Scheduled'].includes(a.status)) AM.prepGaps(a).forEach(g => out.push(['info', `To get ready: ${g}`, /checklist|question/i.test(g) ? at('checklist') : /session/i.test(g) ? at('plan#sessions') : at('plan')]));
    a.assignments.filter(s => AM.indep(a, s) === 'Potential Conflict').forEach(s => out.push(['bad', `${Q.pname(s.who)} has a potential independence conflict (${AM.conflictOf(s.who, a.process)})`, at('plan')]));
    const nc = a.assignments.filter(s => AM.indep(a, s) === 'Needs Confirmation'); if (nc.length && !['Reporting', 'Follow-up', 'Closed'].includes(a.status)) out.push(['warn', `Independence not yet confirmed by ${nc.map(s => Q.pname(s.who)).join(', ')}`, at('plan')]);
    const conf = (a.sessions || []).flatMap(s => AM.sessionConflicts(a, s)); if (conf.length && a.status !== 'Closed') out.push(['bad', `${conf.length} scheduling conflict${conf.length === 1 ? '' : 's'}`, at('plan#sessions')]);
    if (a.status === 'In Progress') { const b = AM.fieldworkBlockers(a); if (b.req.length) out.push(['warn', `${b.req.length} required question${b.req.length === 1 ? '' : 's'} not answered`, at('checklist')]); if (b.pending.length) out.push(['warn', `Audit work not yet submitted by ${b.pending.map(s => Q.pname(s.who)).join(', ')}`, at('plan')]); }
    if (a.status === 'Reporting') out.push(['info', `Report ${a.report.status === 'Not started' ? 'not yet generated' : a.report.status.toLowerCase()}`, at('report')]);
    AM.findingsOf(a.id).filter(f => f.migrationReview && !f.migrationReview.resolved).forEach(f => out.push(['bad', `Migration review required: ${f.id} — ${f.migrationReview.reason}`, at('findings')]));
    AM.findingsOf(a.id).filter(AM.ncOverdue).forEach(f => out.push(['bad', `${f.nc.no} overdue — owner ${Q.pname(f.nc.owner)}`, `#/audits/nc/${f.nc.no}`]));
    if (AM.asg(a, me) && a.status === 'In Progress' && !AM.asg(a, me).submitted && AM.itemsOf(a, me).length) { const left = AM.itemsOf(a, me).filter(i => !AM.complete(i)).length; if (left) out.push(['info', `You have ${left} question${left === 1 ? '' : 's'} left in your checklist`, at('checklist?view=mine')]); }
    return out;
  }
  AM.progressTable = a => {
    const rows = a.assignments.map(s => { const it = AM.itemsOf(a, s.who), d = it.filter(AM.complete).length, st = AM.asgStatus(a, s); return `<tr><td><span class="user-cell"><span class="avatar sm">${esc(Q.initials(s.who))}</span><span><span class="title">${esc(Q.pname(s.who))}</span><span class="sub">${esc(s.role)}</span></span></span></td><td class="small tnum">${s.clauses?.length ? esc(s.clauses.join(', ')) : esc(s.scope || (s.role === 'Lead Auditor' ? 'Unassigned clauses' : '—'))}</td><td>${it.length ? `${Q.miniProgress(Math.round(d / it.length * 100))}<span class="sub">${d} / ${it.length}</span>` : '<span class="muted small">—</span>'}</td><td>${Q.st(st, AM.ASG_KIND[st])}${s.submitted ? `<span class="sub">${Q.fmt(s.submitted.date)}</span>` : ''}</td></tr>`; }).join('');
    const all = AM.counted(a), done = all.filter(AM.complete).length, sub = a.assignments.filter(s => s.submitted).length, need = a.assignments.filter(s => AM.itemsOf(a, s.who).length).length;
    return `<div class="table-scroll"><table class="dt"><caption class="sr-only">Auditor progress</caption><thead><tr><th>Auditor</th><th>Assigned clauses / scope</th><th>Questions</th><th>Status</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>Overall</th><td class="small">${sub} / ${need} assignments submitted</td><td>${all.length ? `${Q.miniProgress(Math.round(done / all.length * 100))}<span class="sub">${done} / ${all.length}</span>` : '—'}</td><td></td></tr></tfoot></table></div>`;
  };
  /* Update 20 — Summary: stage, checklist progress, findings and next session, then one attention list.
   * Auditor progress moved to Plan → Audit team (answered / total per auditor). */
  function wsOverview(a) {
    const fs = AM.findingsOf(a.id), ncs = fs.filter(f => f.nc), openNc = fs.filter(AM.ncOpen), next = AM.sortedSessions(a).find(s => s.date >= Q.today());
    const all = AM.counted(a), done = all.filter(AM.complete).length, steps = AM.STATUSES.slice(1), ci = steps.indexOf(a.status);
    const KIND = { bad: ['triangle-alert', 'danger', 'Action needed', 'danger'], warn: ['clock-3', 'warning', 'Pending', 'warning'], info: ['info', 'info', 'Next step', ''] };
    const TYPE = h => /nc\//.test(h) ? 'Nonconformity' : /checklist/.test(h) ? 'Checklist' : /sessions/.test(h) ? 'Schedule' : /report/.test(h) ? 'Report' : /findings/.test(h) ? 'Finding' : 'Plan';
    const rows = attention(a).sort((x, y) => ['bad', 'warn', 'info'].indexOf(x[0]) - ['bad', 'warn', 'info'].indexOf(y[0]))
      .map(([k, t, href]) => ({ icon: KIND[k][0], title: t, kind: TYPE(href), href, right: Q.ui.badge(KIND[k][2], KIND[k][1]), tone: KIND[k][3] }));
    const bars = a.assignments.filter(s => AM.itemsOf(a, s.who).length).map(s => { const it = AM.itemsOf(a, s.who), d = it.filter(AM.complete).length, p = Math.round(d / it.length * 100);
      return { label: Q.pname(s.who), pct: p, value: `${d}/${it.length}`, note: s.submitted ? `${s.role} · submitted` : s.role, href: `#/audits/a/${a.id}/plan`, tone: p < 100 && a.status === 'In Progress' ? 'warning' : '' }; });
    return { html: Q.ui.summary({
      stats: [
        { label: 'Stage', value: a.status, icon: 'activity', note: ci >= 0 && ci < steps.length - 1 ? `Next: ${steps[ci + 1]}` : 'complete' },
        { label: 'Findings', value: fs.length, icon: 'search-check', href: `#/audits/a/${a.id}/findings`, tone: openNc.length ? 'warning' : null, note: `${ncs.length} NC · ${openNc.length} open` },
        { label: 'Next session', value: next ? Q.fmt(next.date).replace(/ \d{4}$/, '') : '—', icon: 'calendar', href: `#/audits/a/${a.id}/plan#sessions`, note: next ? `${next.start}–${next.end} · ${next.title}` : `${(a.sessions || []).length} sessions` }],
      breakdown: { title: 'Checklist progress', link: { href: `#/audits/a/${a.id}/checklist`, text: 'Checklist' }, rings: { outer: { pct: all.length ? done / all.length * 100 : 0, label: a.checklist && all.length ? `Completeness · ${done} of ${all.length} answered` : 'Completeness · checklist not built' }, inner: { pct: Q.isoScore(Q.isoForProcess(a.process)).pct, label: 'ISO readiness', note: Q.proc(a.process)?.name || 'audited process' } }, bars, empty: 'No questions assigned yet.' },
      attention: rows, search: 'Search…', empty: 'Nothing needs attention.' }) };
  }

  /* ====================================================================== plan */
  function wsPlan(a) {
    const can = AM.can('plan', a), me = AM.actor(), def = (Q.proc(a.process)?.iso || []).slice().sort(AM.clSort).join(), custom = a.clauses.slice().sort(AM.clSort).join() !== def;
    const conf = (a.sessions || []).flatMap(s => AM.sessionConflicts(a, s));
    const team = a.assignments.map(s => { const st = AM.indep(a, s), c = AM.conflictOf(s.who, a.process), n = AM.itemsOf(a, s.who).length, answered = AM.itemsOf(a, s.who).filter(AM.complete).length; return `<tr><td><span class="user-cell"><span class="avatar sm">${esc(Q.initials(s.who))}</span><span><span class="title">${esc(Q.pname(s.who))}</span><span class="sub">${esc(Q.person(s.who).title)}</span></span></span></td><td>${esc(s.role)}</td>
      <td class="small tnum">${s.clauses?.length ? esc(s.clauses.join(', ')) : esc(s.scope || (s.role === 'Lead Auditor' ? 'Questions not assigned to others' : s.role === 'Observer' ? 'Observer' : '—'))}</td><td class="c-num">${n ? `${Q.miniProgress(Math.round(answered / n * 100))}<span class="sub tnum">${answered} / ${n}</span>` : '<span class="zero">—</span>'}</td><td class="small">${(a.sessions || []).filter(x => x.auditors.includes(s.who)).length}</td>
      <td>${Q.st(st, AM.INDEP_KIND[st])}${c ? `<span class="sub">${esc(c)}</span>` : ''}${s.confirmedAt ? `<span class="sub">${AM.at(s.confirmedAt)}</span>` : ''}${s.who === me && st !== 'Independent' && st !== 'Not required' && a.status !== 'Closed' ? ` <button class="btn sm" type="button" data-action="am-independence" data-id="${a.id}">Confirm</button>` : ''}</td>
      <td class="c-actions">${can && !s.submitted ? `<button class="btn sm" type="button" data-action="am-asg-edit" data-id="${a.id}" data-who="${s.who}">Edit</button>${s.role !== 'Lead Auditor' && !answered ? `<button class="icon-btn" type="button" data-action="am-asg-rm" data-id="${a.id}" data-who="${s.who}" aria-label="Remove ${esc(Q.pname(s.who))}">${icon('x')}</button>` : ''}` : s.submitted ? '<span class="small muted">Submitted</span>' : ''}</td></tr>`; }).join('');
    return { html: `<div class="grid-halves">
      <section class="panel"><div class="panel-head"><h2>Audit plan</h2>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-edit-plan" data-id="${a.id}">${icon('pencil')}Edit Plan</button></div>` : ''}</div><div class="panel-pad"><dl class="dl-list dl-wide">
        <dt>Audit number</dt><dd class="tnum">${esc(a.id)}</dd><dt>Process</dt><dd>${Q.pcell(a.process)}</dd><dt>Trigger</dt><dd>${AM.triggerChip(a)}${a.trigger?.type === 'Triggered' ? `<div class="small">${AM.recordLink(a.trigger.source, a.trigger.record)}</div><div class="small muted">${esc(a.trigger.reason || '')}</div>` : ''}</dd>
        <dt>Programme</dt><dd>${esc(AM.progName(a.programme) || 'Not in a programme')}</dd><dt>Planned period</dt><dd>${esc(a.plannedPeriod || '—')}</dd>
        <dt>Objective</dt><dd>${esc(a.objective)}</dd><dt>Scope</dt><dd>${esc(a.scope)}</dd><dt>Criteria</dt><dd>${esc(a.criteria)}</dd>${a.description ? `<dt>Notes</dt><dd>${esc(a.description)}</dd>` : ''}</dl></div></section>
      <section class="panel"><div class="panel-head"><h2>Applicable clauses</h2>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-clauses" data-id="${a.id}">${icon('pencil')}Edit Clauses</button></div>` : ''}</div><div class="panel-pad"><div class="cl-chips">${a.clauses.map(c => `<span class="cl-chip ro" title="${esc(AM.clTitle(c))}"><b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}</span>`).join('')}</div><p class="small muted">${custom ? 'Customized for this audit' : 'Suggested from Process Configuration'} · master data in <a href="#/settings/clause-map">Settings → Process ↔ ISO Clauses</a></p></div></section></div>
      <section class="panel section" id="sessions"><div class="panel-head"><h2>Schedule and sessions</h2><span class="muted small">${AM.dateRange(a)} · ${esc(a.mode || 'On-site')}${a.location ? ` · ${esc(a.location)}` : ''}</span>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-session" data-id="${a.id}">${icon('plus')}Add Session</button></div>` : ''}</div>
        ${AM.sessionTable(a.sessions || [], can, conf, a.id)}
        ${conf.length ? `<div class="callout warning small" style="margin:12px var(--s5)">${icon('triangle-alert')}<span><b>Scheduling conflict</b>${conf.map(c => { const o = c.x.a === a ? c.y : c.x, m = c.x.a === a ? c.x : c.y; return `${esc(Q.pname(c.who))}: “${esc(m.s.title)}” ${Q.fmt(m.s.date)} ${esc(m.s.start)}–${esc(m.s.end)} overlaps ${esc(o.a.id)} “${esc(o.s.title)}” ${esc(o.s.start)}–${esc(o.s.end)}.`; }).join(' ')} Reschedule one of the sessions, or keep it if the overlap is intended.</span></div>` : ''}</section>
      <section class="panel section"><div class="panel-head"><h2>Audit team and assignments</h2><span class="muted small">${a.assignments.length} people</span>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-asg-add" data-id="${a.id}">${icon('user-plus')}Add Auditor</button></div>` : ''}</div>
        <div class="table-scroll"><table class="dt"><caption class="sr-only">Auditor assignments</caption><thead><tr><th>Auditor</th><th>Role</th><th>Assigned clauses / scope</th><th class="c-num">Answered</th><th>Sessions</th><th>Independence</th><th class="c-actions">Actions</th></tr></thead><tbody>${team}</tbody></table></div>
        <p class="panel-pad small muted" style="border-top:1px solid var(--border)">${icon('shield-check')} Each auditor confirms: “I am not auditing work for which I am directly responsible.” Potential conflicts are flagged from process ownership and department; the Lead Auditor decides. Clause assignments decide which questions appear in each auditor’s checklist — nobody else can answer them.</p></section>` };
  }
  Q.actions['am-edit-plan'] = d => {
    const a = findA(d), m = Q.openModal({ size: 'l', title: `Edit plan — ${esc(a.id)}`, body: `<form class="modal-body"><div class="form-grid">
      <label class="field full"><span>Audit title <span class="req">*</span></span><input class="input" name="title" required value="${esc(a.title)}"></label>
      <label class="field"><span>Planned period</span><input class="input" name="plannedPeriod" value="${esc(a.plannedPeriod || '')}"></label>
      <label class="field"><span>Audit mode</span><select class="select" name="mode">${opts(['On-site', 'Remote', 'Hybrid'], a.mode || 'On-site')}</select></label>
      <label class="field full"><span>Location</span><input class="input" name="location" value="${esc(a.location || '')}"></label>
      <label class="field full"><span>Objective <span class="req">*</span></span><textarea class="textarea" name="objective" required rows="2">${esc(a.objective)}</textarea></label>
      <label class="field full"><span>Scope</span><textarea class="textarea" name="scope" rows="2">${esc(a.scope)}</textarea></label>
      <label class="field full"><span>Criteria</span><textarea class="textarea" name="criteria" rows="2">${esc(a.criteria)}</textarea></label>
      ${a.trigger?.type === 'Triggered' ? `<label class="field full"><span>Trigger reason</span><textarea class="textarea" name="reason" rows="2">${esc(a.trigger.reason || '')}</textarea></label>` : ''}
      <label class="field full"><span>Notes</span><textarea class="textarea" name="description" rows="2">${esc(a.description || '')}</textarea></label></div></form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Plan</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); if (v.reason != null) a.trigger.reason = v.reason; delete v.reason; Object.assign(a, v); AM.log(a, 'edited the audit plan'); Q.save(); close(); rr(); Q.toast('Plan saved', a.id); });
  };
  Q.actions['am-clauses'] = d => {
    const a = findA(d), p = Q.proc(a.process), def = (p.iso || []).slice();
    const m = Q.openModal({ size: 'm', title: `Applicable clauses — ${esc(a.id)}`, sub: `Suggested from Process Configuration: ${esc(def.join(', '))}. Changes apply to this audit only.`, body: `<form class="modal-body"><div class="cl-pick">${Object.keys(AM.CL).sort(AM.clSort).filter(c => c.split('.').length <= 3).map(c => `<label class="checkbox small${c.split('.').length === 3 ? ' sub' : ''}"><input type="checkbox" name="c" value="${c}" ${a.clauses.includes(c) ? 'checked' : ''}><b class="tnum">${esc(c)}</b> ${esc(AM.CL[c])}</label>`).join('')}</div>
      ${a.checklist ? '<p class="small muted" style="margin-top:12px">New clauses get suggested questions (before fieldwork). Questions of removed clauses are kept if answered.</p>' : ''}</form>`,
      foot: '<button class="btn" type="button" data-defaults>Restore Process Defaults</button><span class="wz-gap"></span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Clauses</button>' });
    m.querySelector('[data-defaults]').addEventListener('click', () => m.querySelectorAll('[name="c"]').forEach(x => { x.checked = def.includes(x.value); }));
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const next = [...m.querySelectorAll('[name="c"]:checked')].map(x => x.value); if (!next.length) { Q.toast('Choose at least one clause'); return; }
      const added = next.filter(c => !a.clauses.includes(c)), removed = a.clauses.filter(c => !next.includes(c));
      a.clauses = next.sort(AM.clSort);
      if (a.checklist && AM.can('build', a)) {
        a.checklist = a.checklist.filter(i => !i.clause || !removed.some(c => fam(c, i.clause)) || i.result || i.answer != null || next.some(c => fam(c, i.clause)));
        added.forEach(c => { let sec = a.sections.find(s => s.clause === c); if (!sec) { sec = AM.newSection(c); a.sections.push(sec); } AM.questionsFor(c).forEach(qn => a.checklist.push(AM.newItem({ section: sec.id, clause: qn.clause, question: qn.q, expected: qn.ev.slice() }))); });
        a.sections = a.sections.filter(s => a.checklist.some(i => i.section === s.id) || !s.clause || next.includes(s.clause));
        AM.applyAssignments(a);
      }
      AM.log(a, `changed applicable clauses${added.length ? ` — added ${added.join(', ')}` : ''}${removed.length ? ` — removed ${removed.join(', ')}` : ''}`);
      Q.save(); close(); rr(); Q.toast('Clauses saved', `${next.length} clauses`);
    });
  };
  Q.actions['am-session'] = d => {
    const a = findA(d), s = d.s ? a.sessions.find(x => x.id === d.s) : null;
    AM.sessionModal(s, { team: a.assignments.map(x => x.who), list: a.sessions, defDate: AM.endDate(a) || Q.today(), loc: a.location, done: (out, isNew) => {
      a.assignments.forEach(x => { x.sessions = a.sessions.filter(y => y.auditors.includes(x.who)).map(y => y.id); });
      AM.refresh(a); AM.log(a, `${isNew ? 'added' : 'rescheduled'} session “${out.title}” — ${Q.fmt(out.date)} ${out.start}–${out.end}`);
      Q.save(); rr(); const c = AM.sessionConflicts(a, out); Q.toast(isNew ? 'Session added' : 'Session saved', c.length ? `Scheduling conflict: ${c.map(x => Q.pname(x.who)).join(', ')} is booked in another audit at that time.` : `${Q.fmt(out.date)} ${out.start}–${out.end}`);
    } });
  };
  Q.actions['am-session-del'] = d => { const a = findA(d), s = a.sessions.find(x => x.id === d.s); Q.confirm({ title: `Delete session “${esc(s.title)}”?`, danger: true, confirm: 'Delete', body: `<p>${Q.fmt(s.date)} ${esc(s.start)}–${esc(s.end)}</p>`, onConfirm: () => { a.sessions = a.sessions.filter(x => x !== s); a.assignments.forEach(x => { x.sessions = (x.sessions || []).filter(y => y !== s.id); }); AM.refresh(a); AM.log(a, `deleted session “${s.title}” (${Q.fmt(s.date)})`); Q.save(); rr(); } }); };
  const asgForm = (a, s = {}, isNew) => { const pool = (Q.S.auditors || []).filter(x => isNew ? !a.assignments.some(y => y.who === x.who) : x.who === s.who), choices = [...new Set([...a.clauses, ...a.clauses.flatMap(AM.subsOf)])].sort(AM.clSort);
    return `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Auditor</span><select class="select" name="who" ${isNew ? '' : 'disabled'}>${pool.map(x => `<option value="${x.who}"${x.who === s.who ? ' selected' : ''}>${esc(Q.pname(x.who))} — ${esc(x.level)}${AM.conflictOf(x.who, a.process) ? ' (potential conflict)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Role</span><select class="select" name="role" ${s.role === 'Lead Auditor' ? 'disabled' : ''}>${opts(s.role === 'Lead Auditor' ? ['Lead Auditor'] : AM.ROLES.slice(1), s.role || 'Auditor')}</select></label>
      <fieldset class="field full"><legend class="lg">Assigned clauses</legend><p class="help" style="margin:0 0 6px">Questions in these clauses go to this auditor’s checklist only.${s.role === 'Lead Auditor' ? ' The Lead Auditor also answers questions no one else is assigned.' : ''}</p><div class="cl-pick narrow">${choices.map(c => `<label class="checkbox small${c.split('.').length === 3 ? ' sub' : ''}"><input type="checkbox" name="c" value="${c}" ${(s.clauses || []).includes(c) ? 'checked' : ''}><b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}</label>`).join('')}</div></fieldset>
      <label class="field full"><span>Scope / note</span><input class="input" name="scope" value="${esc(s.scope || '')}" placeholder="e.g. Technical evidence review"></label>
      ${isNew ? '<label class="checkbox full"><input type="checkbox" name="allSessions" checked>Add to all audit sessions</label>' : ''}</div></form>`; };
  Q.actions['am-asg-add'] = d => {
    const a = findA(d); if (!(Q.S.auditors || []).some(x => !a.assignments.some(y => y.who === x.who))) { Q.toast('Everyone qualified is already on the team'); return; }
    const m = Q.openModal({ size: 'l', title: `Add auditor — ${esc(a.id)}`, body: asgForm(a, {}, true), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Auditor</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'), v = Q.formValues(f), cl = new FormData(f).getAll('c');
      const s = { id: AM.uid('as'), who: v.who, role: v.role, clauses: cl, scope: v.scope, independent: null, confirmedAt: null, sessions: [], submitted: null, comments: '', conclusion: '' }; a.assignments.push(s);
      if (v.allSessions) a.sessions.forEach(x => { if (!x.auditors.includes(v.who)) x.auditors.push(v.who); });
      s.sessions = a.sessions.filter(x => x.auditors.includes(v.who)).map(x => x.id);
      if (s.role === 'Technical Expert' && !cl.length && a.checklist && AM.can('build', a)) { const sec = AM.newSection('', `Technical review — ${v.scope || Q.pname(v.who)}`); a.sections.push(sec); a.checklist.push(AM.newItem({ section: sec.id, question: `Review technical evidence: ${v.scope || 'specifications, certificates and test reports'}`, type: 'evidence', assignee: v.who, manual: true })); }
      AM.applyAssignments(a); AM.refresh(a); AM.log(a, `added ${Q.pname(v.who)} as ${v.role}${cl.length ? ` (clauses ${cl.join(', ')})` : ''}`); Q.save(); close(); rr(); Q.toast('Auditor added', `${Q.pname(v.who)} · ${AM.itemsOf(a, v.who).length} questions assigned`); });
  };
  Q.actions['am-asg-edit'] = d => {
    const a = findA(d), s = AM.asg(a, d.who), m = Q.openModal({ size: 'l', title: `Assignment — ${esc(Q.pname(s.who))}`, body: asgForm(a, s, false), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Assignment</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'), v = Q.formValues(f), cl = new FormData(f).getAll('c');
      const moving = AM.counted(a).filter(i => i.assignee && AM.complete(i)); const before = Object.fromEntries(moving.map(i => [i.id, i.assignee]));
      Object.assign(s, { role: s.role === 'Lead Auditor' ? s.role : v.role, clauses: cl, scope: v.scope }); AM.applyAssignments(a);
      // Answered questions keep the auditor who answered them.
      moving.forEach(i => { if (i.assignee !== before[i.id]) { i.assignee = before[i.id]; i.manual = true; } });
      AM.refresh(a); AM.log(a, `changed ${Q.pname(s.who)}'s assignment: ${s.role}${cl.length ? `, clauses ${cl.join(', ')}` : ''}`); Q.save(); close(); rr(); Q.toast('Assignment saved', `${AM.itemsOf(a, s.who).length} questions now assigned to ${Q.pname(s.who)}`); });
  };
  Q.actions['am-asg-rm'] = d => { const a = findA(d), s = AM.asg(a, d.who); Q.confirm({ title: `Remove ${esc(Q.pname(s.who))}?`, danger: true, confirm: 'Remove', body: '<p>Their questions go back to the auditor whose clauses match, or the Lead Auditor.</p>', onConfirm: () => { a.assignments = a.assignments.filter(x => x !== s); a.sessions.forEach(x => { x.auditors = x.auditors.filter(w => w !== s.who); }); AM.items(a).forEach(i => { if (i.assignee === s.who) { i.assignee = null; i.manual = false; } }); AM.applyAssignments(a); AM.refresh(a); AM.log(a, `removed ${Q.pname(s.who)} from the audit team`); Q.save(); rr(); } }); };
  Q.actions['am-lead'] = d => {
    const a = findA(d), leads = (Q.S.auditors || []).filter(x => x.level === 'Lead Auditor').map(x => x.who);
    const m = Q.openModal({ size: 's', title: 'Change Lead Auditor', body: `<form class="modal-body"><label class="field"><span>Lead Auditor</span><select class="select" name="who">${leads.map(w => `<option value="${w}"${w === a.auditor ? ' selected' : ''}>${esc(Q.pname(w))}${AM.conflictOf(w, a.process) ? ' (potential conflict)' : ''}</option>`).join('')}</select></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Change</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const w = Q.formValues(m.querySelector('form')).who; if (w === a.auditor) { close(); return; } const old = AM.asg(a, a.auditor); const ex = AM.asg(a, w);
      if (ex) { ex.role = 'Lead Auditor'; if (old) old.role = 'Auditor'; } else if (old) { Object.assign(old, { who: w, independent: null, confirmedAt: null }); a.sessions.forEach(x => { const i = x.auditors.indexOf(a.auditor); if (i >= 0) x.auditors[i] = w; }); AM.items(a).forEach(i => { if (i.assignee === a.auditor && !AM.complete(i)) i.assignee = w; }); }
      AM.log(a, `changed the Lead Auditor from ${Q.pname(a.auditor)} to ${Q.pname(w)}`); a.auditor = w; AM.applyAssignments(a); Q.save(); close(); rr(); });
  };
  Q.actions['am-independence'] = d => {
    const a = findA(d), s = AM.asg(a, AM.actor()), c = AM.conflictOf(s.who, a.process);
    const m = Q.openModal({ size: 'm', title: 'Confirm independence', body: `<form class="modal-body"><p>I, <b>${esc(Q.pname(s.who))}</b>, confirm that I am not auditing work for which I am directly responsible in ${esc(a.id)} ${esc(AM.pname(a))}.</p>${c ? `<div class="callout warning small" style="margin:12px 0">${icon('triangle-alert')}<span><b>Potential conflict: ${esc(c)}</b>Explain why your audit work is still independent (for example, you do not perform or supervise the activities you audit). The Lead Auditor sees this note.</span></div><label class="field"><span>Justification <span class="req">*</span></span><textarea class="textarea" name="note" rows="3" required></textarea></label>` : ''}</form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>I Confirm</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(s, { independent: true, confirmedAt: AM.now(), independenceNote: v.note || '' }); AM.log(a, `confirmed auditor independence${v.note ? ` — ${v.note}` : ''}`); Q.save(); close(); rr(); Q.toast('Independence confirmed'); });
  };

  /* ====================================================================== lifecycle */
  Q.actions['am-start'] = d => {
    const a = findA(d); AM.refresh(a);
    if (a.status !== 'Preparation') { Q.toast('Not ready to start', `First ${AM.prepGaps(a).join(', ')}.`); return; }
    const pending = a.assignments.filter(s => ['Needs Confirmation', 'Potential Conflict'].includes(AM.indep(a, s)));
    const go = () => { a.status = 'In Progress'; AM.log(a, 'held the opening meeting and started the audit'); Q.save(); Q.render({ noFocus: true }); Q.toast('Audit started', 'Each auditor now sees their questions in My Checklist.'); };
    if (pending.length) Q.confirm({ title: 'Independence not confirmed', confirm: 'Start Anyway', danger: true, body: `<p>${pending.map(s => `${esc(Q.pname(s.who))} (${esc(AM.indep(a, s).toLowerCase())})`).join(', ')}. Starting is recorded in the activity log; you can resolve it before fieldwork is complete.</p>`, onConfirm: go });
    else Q.confirm({ title: `Start ${esc(a.id)}?`, confirm: 'Start Audit', body: '<p>Records the opening meeting and opens the checklist for assessment.</p>', onConfirm: go });
  };
  Q.actions['am-submit-work'] = d => {
    const a = findA(d), me = AM.actor(), s = AM.asg(a, me), mine = AM.itemsOf(a, me), left = mine.filter(i => i.required && !AM.complete(i)), fs = AM.findingsOf(a.id).filter(f => f.auditor === me);
    if (left.length) { const m = Q.openModal({ size: 'm', title: 'Your checklist is not complete', body: `<div class="modal-body"><p>${left.length} required question${left.length === 1 ? ' is' : 's are'} not answered. Answer ${left.length === 1 ? 'it' : 'them'} — use N/A with a reason where a question does not apply.</p><ul class="fb-ul small">${left.map(i => `<li><b class="tnum">${esc(i.clause || '—')}</b> ${esc(i.question)}</li>`).join('')}</ul></div>`, foot: `<a class="btn primary" href="#/audits/a/${a.id}/checklist?view=mine&f=open">Show Unanswered</a>` }); m.querySelector('a').addEventListener('click', close); return; }
    const m = Q.openModal({ size: 'm', title: 'Submit My Audit Work', sub: `${mine.length} of ${mine.length} questions answered · ${fs.length} finding${fs.length === 1 ? '' : 's'} raised`, body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Auditor conclusion <span class="req">*</span></span><textarea class="textarea" name="conclusion" required rows="3" placeholder="Is what you audited effective? Main strengths and weaknesses.">${esc(s.conclusion || '')}</textarea></label>
      <label class="field"><span>Auditor comments</span><textarea class="textarea" name="comments" rows="3" placeholder="Sampling, interviews, limitations">${esc(s.comments || '')}</textarea></label></div><p class="small muted">After submitting, your answers are read-only. The Lead Auditor can reopen your assignment if something needs correcting.</p></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Submit Audit Work</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(s, { conclusion: v.conclusion.trim(), comments: v.comments.trim(), submitted: { by: me, date: Q.today(), at: AM.now() } });
      AM.log(a, `submitted audit work (${mine.length} questions)`); Q.save(); close(); rr(); const need = a.assignments.filter(x => AM.itemsOf(a, x.who).length), sub = need.filter(x => x.submitted).length; Q.toast('Audit work submitted', `${sub} of ${need.length} auditor assignments submitted${sub === need.length ? ' — the Lead Auditor can complete fieldwork.' : '.'}`); });
  };
  Q.actions['am-reopen-work'] = d => { const a = findA(d), s = AM.asg(a, d.who); Q.confirm({ title: `Reopen ${esc(Q.pname(s.who))}'s work?`, confirm: 'Reopen', body: '<p>Their answers become editable again and they need to submit again.</p>', onConfirm: () => { s.submitted = null; AM.log(a, `reopened ${Q.pname(s.who)}'s audit work`); Q.save(); rr(); } }); };
  Q.actions['am-fieldwork'] = d => {
    const a = findA(d), b = AM.fieldworkBlockers(a);
    if (b.req.length || b.pending.length) {
      Q.openModal({ size: 'm', title: 'Fieldwork cannot be completed yet', body: `<div class="modal-body">${b.req.length ? `<h3 class="wz-h">${b.req.length} required question${b.req.length === 1 ? '' : 's'} unanswered</h3><ul class="fb-ul small">${Object.entries(b.by).map(([w, list]) => `<li><b>${esc(w === 'unassigned' ? 'Unassigned' : Q.pname(w))}</b>: ${list.length} — ${list.slice(0, 3).map(i => esc(i.clause || i.question.slice(0, 40))).join(', ')}${list.length > 3 ? '…' : ''}</li>`).join('')}</ul>` : ''}
        ${b.pending.length ? `<h3 class="wz-h">Audit work not submitted</h3><ul class="fb-ul small">${b.pending.map(s => `<li><b>${esc(Q.pname(s.who))}</b> (${esc(s.role)}) — ${esc(AM.asgStatus(a, s))}, ${AM.itemsOf(a, s.who).filter(AM.complete).length} / ${AM.itemsOf(a, s.who).length}</li>`).join('')}</ul>` : ''}</div>`, foot: '<button class="btn primary" type="button" data-close>OK</button>' });
      return;
    }
    const m = Q.openModal({ size: 'm', title: 'Complete fieldwork', sub: `${AM.counted(a).length} questions answered · ${a.assignments.filter(s => s.submitted).length} assignments submitted`, body: `<form class="modal-body">${b.noEvidence.length ? `<div class="callout warning small" style="margin-bottom:12px">${icon('triangle-alert')}<span><b>${b.noEvidence.length} assessed question${b.noEvidence.length === 1 ? ' has' : 's have'} no evidence recorded as reviewed</b>${b.noEvidence.slice(0, 4).map(i => esc(`${i.clause} ${i.question.slice(0, 50)}`)).join('; ')}${b.noEvidence.length > 4 ? '…' : ''}</span></div><label class="checkbox"><input type="checkbox" name="ack" required>I acknowledge the questions without recorded evidence (e.g. assessed by interview or observation)</label>` : ''}
      <label class="field" style="margin-top:12px"><span>Closing meeting note</span><textarea class="textarea" name="note" rows="2" placeholder="Held with the process owner; findings presented and acknowledged"></textarea></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Complete Fieldwork</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (b.noEvidence.length && !f.querySelector('[name=ack]').checked) { Q.toast('Acknowledge the missing evidence first'); return; } const v = Q.formValues(f);
      a.status = 'Reporting'; a.fieldwork = { by: AM.actor(), date: Q.today(), noEvidenceAck: b.noEvidence.length, note: v.note || '' }; AM.log(a, `completed fieldwork — all assignments submitted${b.noEvidence.length ? `; acknowledged ${b.noEvidence.length} question(s) without recorded evidence` : ''}${v.note ? `. ${v.note}` : ''}`); Q.save(); close(); Q.go(`#/audits/a/${a.id}/report`); Q.toast('Fieldwork complete', 'Generate the audit report next.'); });
  };
  Q.actions['am-close'] = d => { const a = findA(d), b = AM.closeBlockers(a); if (b.length) { Q.toast('Cannot close yet', b.join('; ')); return; } Q.confirm({ title: `Close ${esc(a.id)}?`, confirm: 'Close Audit', body: '<p>The report is published and every nonconformity is closed after effectiveness verification. The audit becomes read-only.</p>', onConfirm: () => { a.status = 'Closed'; a.closed = Q.today(); AM.log(a, 'closed the audit — all nonconformities closed and effective'); Q.save(); Q.render({ noFocus: true }); Q.toast('Audit closed', a.id); } }); };

  /* ====================================================================== checklist */
  let openItem = null;
  function wsChecklist(a, q) {
    const build = AM.can('build', a), me = AM.actor(), mine = AM.asg(a, me);
    const auditors = a.assignments.filter(s => s.role !== 'Observer').map(s => [s.who, `${Q.pname(s.who)} (${s.role})`]);
    // Before fieldwork: the checklist builder.
    if (['Planned', 'Scheduled', 'Preparation'].includes(a.status)) {
      if (!a.checklist || !a.sections) {
        const tpls = Q.S.auditTemplates.filter(t => t.status === 'Active' && (!t.process || t.process === a.process)), def = tpls.find(t => t.process === a.process);
        return { html: `<section class="panel"><div class="empty"><h3>Checklist not built</h3><p>Questions are generated from the process and its applicable clauses, then customized here.</p>${build ? `<div class="apb-choice three" style="text-align:left;margin-top:16px"><button type="button" class="apb-opt" data-action="am-gen" data-id="${a.id}" data-src="default"><b>Load process default checklist</b><span class="small muted">${def ? esc(def.name) : `${a.clauses.length} clause sections`}</span></button>${tpls.length ? `<button type="button" class="apb-opt" data-action="am-gen" data-id="${a.id}" data-src="template" data-tpl="${esc((def || tpls[0]).id)}"><b>Use existing template</b><span class="small muted">${esc((def || tpls[0]).name)}</span></button>` : `<a class="apb-opt" href="#/audits/templates"><b>Use existing template</b><span class="small muted">No active template for ${esc(AM.pname(a))} — create one in Checklist Templates.</span></a>`}<button type="button" class="apb-opt" data-action="am-gen" data-id="${a.id}" data-src="blank"><b>Start blank</b><span class="small muted">Add sections and questions.</span></button></div>` : ''}</div></section>` };
      }
      const gaps = AM.prepGaps(a);
      return { html: `<div class="callout small" style="margin-bottom:12px">${icon('clipboard-list')}<span><b>Preparation — checklist builder</b>Add, edit, reorder and assign questions. Each auditor will see only their assigned questions in “My Checklist” when the audit starts.${gaps.length ? ` Still to do: ${esc(gaps.join(', '))}.` : ' The audit is ready to start.'}</span></div>
        ${build ? `<div class="cb-tools"><span class="grow"></span><button class="btn sm ghost" type="button" data-cb-tpl>${icon('download')}Save as Template</button></div>` : ''}${AM.builderHtml(a, { edit: build, mode: 'audit', auditors })}`,
        after: main => { if (!build) return; AM.builderWire(main, a, { mode: 'audit', auditors, changed: () => { AM.applyAssignments(a); AM.refresh(a); Q.save(); rr(); }, log: t => AM.log(a, t) }); main.querySelector('[data-cb-tpl]')?.addEventListener('click', () => AM.saveAsTemplate(a, a.process)); } };
    }
    // Fieldwork and after: the live audit form.
    if (q.q && AM.items(a).some(i => i.id === q.q)) { openItem = q.q; q.view = 'all'; }
    const live = a.status === 'In Progress', myItems = mine ? AM.itemsOf(a, me) : [];
    const view = q.view === 'all' || !myItems.length ? 'all' : 'mine', f = q.f || 'all';
    const base = AM.items(a).filter(i => view === 'all' || i.assignee === me || (!AM.answerable(i) && AM.secItems(a, i.section).some(x => x.assignee === me)));
    const match = i => !AM.answerable(i) ? f === 'all' : f === 'all' || (f === 'open' ? !AM.complete(i) : f === 'done' ? AM.complete(i) : f === 'findings' ? i.result && !['Conforming', 'N/A'].includes(i.result) : true);
    const list = base.filter(match);
    const done = myItems.filter(AM.complete).length, reqLeft = myItems.filter(i => i.required && !AM.complete(i)).length;
    const header = mine && myItems.length ? `<div class="mycl"><div class="mycl-main"><b>${view === 'mine' ? 'My Checklist' : 'All Questions'}</b><span class="small muted">${esc(Q.pname(me))} · ${esc(mine.role)}${mine.clauses?.length ? ` · clauses ${esc(mine.clauses.join(', '))}` : ''}${mine.scope ? ` · ${esc(mine.scope)}` : ''}</span></div>
      <div class="mycl-n"><span><b class="tnum">${myItems.length}</b> assigned</span><span><b class="tnum">${done}</b> completed</span><span class="${myItems.length - done ? 'warnv' : ''}"><b class="tnum">${myItems.length - done}</b> remaining</span></div>
      ${mine.submitted ? `<span class="st success">${icon('circle-check')}Submitted ${Q.fmt(mine.submitted.date)}</span>` : live ? `<button class="btn primary" type="button" data-action="am-submit-work" data-id="${a.id}" ${reqLeft ? `title="${reqLeft} required question${reqLeft === 1 ? '' : 's'} unanswered"` : ''}>${icon('send')}Submit Audit Work</button>` : ''}</div>` : '';
    const note = live ? (mine && !myItems.length ? `<div class="callout small" style="margin-bottom:12px">${icon('info')}<span>No questions are assigned to you in this audit. You can view all questions read-only.</span></div>` : !mine ? `<div class="callout small" style="margin-bottom:12px">${icon('eye')}<span>You are not on this audit team — the checklist is read-only for you.</span></div>` : '')
      : `<div class="callout small" style="margin-bottom:12px">${icon('lock')}<span>Fieldwork is complete — the checklist is read-only.</span></div>`;
    const leadPanel = (AM.can('fieldwork', a) || AM.isLead(a)) && live ? `<details class="explain lead-sub"><summary>${icon('users')}Auditor submissions (${a.assignments.filter(s => s.submitted).length} / ${a.assignments.filter(s => AM.itemsOf(a, s.who).length).length})</summary>${AM.progressTable(a)}${a.assignments.filter(s => s.submitted).map(s => `<p class="small" style="margin:8px var(--s5)"><b>${esc(Q.pname(s.who))}</b>: ${esc(s.conclusion)} <button class="link-btn small" type="button" data-action="am-reopen-work" data-id="${a.id}" data-who="${s.who}">Reopen</button></p>`).join('')}</details>` : '';
    const fl = [['all', 'All'], ['open', 'Not answered'], ['done', 'Answered'], ['findings', 'With findings']];
    const qs = o => `#/audits/a/${a.id}/checklist?${new URLSearchParams({ view, f, ...o })}`;
    const html = `${note}${header}${leadPanel}<div class="cl-tools">${mine && myItems.length ? `<div class="seg" role="group" aria-label="Questions shown"><a class="seg-a" href="${qs({ view: 'mine' })}" aria-current="${view === 'mine'}">My Questions <span class="n">${myItems.length}</span></a><a class="seg-a" href="${qs({ view: 'all' })}" aria-current="${view === 'all'}">All Questions <span class="n">${AM.counted(a).length}</span></a></div>` : ''}
        <div class="seg" role="group" aria-label="Filter questions">${fl.map(([k, l]) => `<a class="seg-a" href="${qs({ f: k })}" aria-current="${k === f}">${l} <span class="n">${base.filter(AM.answerable).filter(i => k === 'all' || (k === 'open' ? !AM.complete(i) : k === 'done' ? AM.complete(i) : i.result && !['Conforming', 'N/A'].includes(i.result))).length}</span></a>`).join('')}</div></div>
      ${a.sections.filter(s => list.some(i => i.section === s.id)).map(s => { const its = list.filter(i => i.section === s.id), ans = its.filter(AM.answerable); return `<section class="cl-group"><header>${s.clause ? `<span class="clause">${esc(s.clause)}</span>` : ''}<h3>${esc(s.title)}</h3><span class="muted small">${ans.filter(AM.complete).length}/${ans.length}</span></header><ul class="cl-items">${its.map(i => clItem(a, i)).join('')}</ul></section>`; }).join('') || '<div class="empty small">No questions match this filter.</div>'}`;
    return { html, after: main => { if (openItem) main.querySelector(`[data-item="${openItem}"]`)?.scrollIntoView({ block: 'nearest' }); } };
  }
  Q.actions['am-gen'] = d => { const a = findA(d); AM.genChecklist(a, { source: d.src, template: d.tpl }); if (d.src === 'blank') a.sections.push(AM.newSection('', 'General')); AM.refresh(a); AM.log(a, `built the checklist (${AM.counted(a).length} questions${d.src === 'template' ? ` from template ${Q.S.auditTemplates.find(t => t.id === d.tpl)?.name}` : d.src === 'default' ? ' from the process default' : ''})`); Q.save(); rr(); Q.toast('Checklist built', `${AM.counted(a).length} questions assigned by clause. Review and customize them.`); };
  const answerText = i => { if (i.type === 'assessment') return i.result ? `<span class="st ${AM.typeKind(i.result)}">${esc(AM.short(i.result))}</span>` : '<span class="st neutral">Not answered</span>';
    if (i.type === 'evidence') return (i.reviewed || []).length || i.answer === 'Reviewed' ? `<span class="st success">Reviewed</span>` : '<span class="st neutral">Not reviewed</span>';
    if (i.type === 'docref') return (i.docs || []).length ? `<span class="st success">${esc(i.docs.join(', '))}</span>` : '<span class="st neutral">No document</span>';
    return i.answer != null && String(i.answer).trim() !== '' ? `<span class="st ${i.answer === 'No' ? 'warning' : 'success'}">${esc(String(i.answer).length > 24 ? String(i.answer).slice(0, 24) + '…' : i.answer)}</span>` : '<span class="st neutral">Not answered</span>'; };
  function clItem(a, i) {
    if (i.type === 'heading') return `<li class="cl-heading"><b>${esc(i.question)}</b></li>`;
    if (i.type === 'instruction') return `<li class="cl-instr">${icon('info')}<span>${esc(i.question)}</span></li>`;
    const open = openItem === i.id, sys = AM.systemEvidence(a.process, i.clause), linked = (i.docs || []).map(id => ({ kind: 'doc', id })).filter(x => !sys.some(s => s.kind === 'doc' && s.id === x.id));
    const all = [...sys, ...linked], rev = new Set((i.reviewed || []).map(s => s.kind + s.id)), can = AM.can('assess', a, i);
    const row = `<button type="button" class="cl-row" data-toggle-item="${i.id}" aria-expanded="${open}"><span class="tnum cl-sub">${esc(i.clause || '—')}</span><span class="cl-q">${esc(i.question)}${i.required ? '' : ' <span class="small muted">(optional)</span>'}</span><span class="cl-who" title="Assigned to ${esc(Q.pname(i.assignee))}"><span class="avatar xs">${esc(Q.initials(i.assignee))}</span></span><span class="cl-ev small muted" title="Evidence reviewed">${icon('files')}${(i.reviewed || []).length}/${all.length}</span>${i.notes ? `<span class="small muted" title="Has notes">${icon('message-square')}</span>` : ''}${answerText(i)}${icon('chevron-down', 'cl-chev')}</button>`;
    if (!open) return `<li data-item="${i.id}">${row}</li>`;
    const finding = i.finding && Q.S.findings.find(f => f.id === i.finding);
    const related = (() => { const r = Q.S.risks.filter(x => Q.inProc(x.process, a.process) && Q.riskOpen(x)).slice(0, 2), k = Q.S.kpis.filter(x => Q.inProc(x.process, a.process)).slice(0, 2), pf = i.clause ? Q.S.findings.filter(f => f.audit !== a.id && Q.inProc(f.process, a.process) && fam(f.clause, i.clause)).slice(0, 3) : [];
      const L = [...pf.map(f => `<li>${icon('search-check')}<span>Previous finding <b>${esc(f.nc?.no || f.id)}</b> (${esc(AM.short(f.type))}, ${esc(f.audit)}): ${esc(f.title)} — ${esc(f.status)}</span></li>`), ...r.map(x => `<li>${icon('shield-alert')}<span>Risk <a href="#/risks?focus=${x.id}">${esc(x.id)}</a> ${esc(x.title)} (${esc(Q.riskLevel(x))})</span></li>`), ...k.map(x => `<li>${icon('target')}<span>KPI <a href="#/qms/objectives?focus=${x.id}">${esc(x.name)}</a>: ${esc(Q.kpiFmt(x.actual, x))} vs ${esc(x.dir)} ${esc(Q.kpiFmt(x.target, x))} ${Q.kpiOk(x) ? '' : '<span class="st danger">below target</span>'}</span></li>`)];
      return L.length ? `<div class="ci-sec"><h4>Related QMS information</h4><ul class="rel-list">${L.join('')}</ul></div>` : ''; })();
    const answerUI = (() => {
      if (i.type === 'assessment') return `${can ? `<div class="assess" role="radiogroup" aria-label="Assessment">${AM.RESULTS.map(([v, l, k]) => `<button type="button" role="radio" class="as-${k}" aria-checked="${i.result === v}" data-action="am-assess" data-id="${a.id}" data-item="${i.id}" data-r="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : `<p>${answerText(i)}</p>`}${i.result === 'N/A' ? `<label class="field"><span>Reason not applicable <span class="req">*</span></span><input class="input" data-na="${i.id}" data-audit="${a.id}" value="${esc(i.naReason || '')}" ${can ? '' : 'readonly'} placeholder="Why this question does not apply"></label>` : ''}`;
      if (i.type === 'yesno') return `${can ? `<div class="assess three" role="radiogroup" aria-label="Answer">${['Yes', 'No', 'N/A'].map(v => `<button type="button" role="radio" aria-checked="${i.answer === v}" data-action="am-answer" data-id="${a.id}" data-item="${i.id}" data-v="${v}">${v}</button>`).join('')}</div>` : `<p>${answerText(i)}</p>`}${i.answer === 'N/A' ? `<label class="field"><span>Reason <span class="req">*</span></span><input class="input" data-na="${i.id}" data-audit="${a.id}" value="${esc(i.naReason || '')}" ${can ? '' : 'readonly'}></label>` : ''}`;
      if (i.type === 'choice') return `<label class="field"><span class="sr-only">Answer</span><select class="select" data-ans="${i.id}" data-audit="${a.id}" ${can ? '' : 'disabled'}><option value="">Choose…</option>${opts(i.options, i.answer)}</select></label>`;
      if (i.type === 'number') return `<label class="field"><span class="sr-only">Answer</span><input class="input" type="number" data-ans="${i.id}" data-audit="${a.id}" value="${esc(i.answer ?? '')}" ${can ? '' : 'readonly'}></label>`;
      if (i.type === 'date') return `<label class="field"><span class="sr-only">Answer</span><input class="input" type="date" data-ans="${i.id}" data-audit="${a.id}" value="${esc(i.answer ?? '')}" ${can ? '' : 'readonly'}></label>`;
      if (i.type === 'text') return `<label class="field"><span class="sr-only">Answer</span><textarea class="textarea" rows="3" data-ans="${i.id}" data-audit="${a.id}" ${can ? '' : 'readonly'}>${esc(i.answer ?? '')}</textarea></label>`;
      if (i.type === 'evidence') return `<p class="small">${(i.reviewed || []).length ? `${i.reviewed.length} record${i.reviewed.length === 1 ? '' : 's'} marked reviewed` : 'Mark the evidence you reviewed in the list.'}</p>${can && !(i.reviewed || []).length ? `<button class="btn sm" type="button" data-action="am-answer" data-id="${a.id}" data-item="${i.id}" data-v="${i.answer === 'Reviewed' ? '' : 'Reviewed'}">${i.answer === 'Reviewed' ? 'Undo' : 'Mark as reviewed (outside iQMS)'}</button>` : ''}`;
      if (i.type === 'docref') return `${(i.docs || []).map(id => `<span class="ref-chip">${icon('file-text')}${esc(id)}</span>`).join(' ')}${can ? `<button class="btn sm" type="button" data-action="am-q-link" data-id="${a.id}" data-item="${i.id}">${icon('link')}Reference Document</button>` : ''}`;
      return '';
    })();
    return `<li data-item="${i.id}" class="open">${row}<div class="ci-body">
      <div class="ci-main">
        <div class="ci-sec"><h4>Question <span class="muted small">${esc(AM.itemType(i.type))} · assigned to ${esc(Q.pname(i.assignee))}${i.required ? ' · required' : ' · optional'}</span></h4><p>${esc(i.question)}</p></div>
        <div class="ci-sec"><h4>Expected evidence</h4>${(i.expected || []).length ? `<ul class="exp-list">${i.expected.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted small">None listed.</p>'}</div>
        <div class="ci-sec"><h4>Available QMS evidence <span class="muted small">${sys.some(x => x.area) ? `no document is mapped to ${esc(i.clause || 'this question')} — showing ${esc(AM.pcode(a))} process documents` : `found from process ${esc(AM.pcode(a))}${i.clause ? ` and clause ${esc(i.clause)}` : ''}`}</span></h4>
          ${all.length ? `<ul class="sysev">${all.map(x => { const inf = AM.evInfo(x), done = rev.has(x.kind + x.id), s = (i.reviewed || []).find(r => r.kind + r.id === x.kind + x.id); return `<li class="${done ? 'done' : ''}"><span class="se-ic">${done ? icon('circle-check') : icon(x.kind === 'doc' ? 'file-text' : 'paperclip')}</span><div class="se-main"><b>${esc(inf.title)}</b><span>${esc(inf.sub)} · ${esc(inf.status)}${inf.restricted ? ' · Confidential: link only' : ''}${s ? ` · reviewed Rev ${esc(s.rev)} by ${esc(Q.pname(s.by))}, ${Q.fmt(s.date)}${x.kind === 'doc' && Q.doc(x.id)?.rev !== s.rev ? ` <span class="snap-moved">now Rev ${esc(Q.doc(x.id).rev)}</span>` : ''}` : ''}</span></div>
            <div class="se-acts">${x.kind === 'doc' ? `<button class="btn sm ghost" type="button" data-action="open-doc" data-id="${esc(x.id)}">View</button>` : `<a class="btn sm ghost" href="#/evidence?focus=${esc(x.id)}">View</a>`}${can ? `<button class="btn sm${done ? '' : ' primary-soft'}" type="button" data-action="am-ev-toggle" data-id="${a.id}" data-item="${i.id}" data-kind="${x.kind}" data-ev="${esc(x.id)}" aria-pressed="${done}">${done ? 'Reviewed' : 'Mark Reviewed'}</button>` : ''}${can && done ? `<button class="btn sm ghost" type="button" data-action="am-raise" data-id="${a.id}" data-item="${i.id}" data-ref="${x.kind}|${esc(x.id)}">Reference in Finding</button>` : ''}</div></li>`; }).join('')}</ul>` : '<p class="muted small">No documents or records in iQMS are mapped to this question. That may itself be a finding.</p>'}
          ${(i.external || []).map(x => `<div class="ext-ref">${icon('link')}<span><b>External: ${esc(x.ref)}</b> ${esc(x.note || '')} <span class="muted small">— ${esc(Q.pname(x.by))}, ${Q.fmt(x.date)}</span></span></div>`).join('')}
          ${can ? `<button class="link-btn small" type="button" data-action="am-ext" data-id="${a.id}" data-item="${i.id}">${icon('plus')}Add External Evidence Reference</button><span class="small muted"> — only for something reviewed outside iQMS</span>` : ''}</div>
        ${related}</div>
      <div class="ci-side">
        <div class="ci-sec"><h4>Auditor notes</h4><label class="field"><span class="sr-only">Auditor notes</span><textarea class="textarea" rows="4" data-notes="${i.id}" data-audit="${a.id}" ${can ? '' : 'readonly'} placeholder="What was sampled, who was interviewed, what was seen">${esc(i.notes || '')}</textarea></label></div>
        <div class="ci-sec"><h4>${i.type === 'assessment' ? 'Assessment' : 'Answer'}</h4>${answerUI}${i.by ? `<p class="small muted">${esc(Q.pname(i.by))} · ${Q.fmt(i.date)}</p>` : ''}
          ${finding ? `<div class="ci-finding">${icon('search-check')}<span><b>${esc(finding.id)}${finding.nc ? ` / ${esc(finding.nc.no)}` : ''}</b> ${esc(finding.title)}<br>${finding.nc ? `<a class="btn sm" href="#/audits/nc/${finding.nc.no}">Open NC</a>` : `<span class="small muted">${esc(finding.type)} · ${esc(finding.status)}</span>`}</span></div>`
            : i.result && !['Conforming', 'N/A'].includes(i.result) && can ? `<button class="btn sm primary" type="button" data-action="am-raise" data-id="${a.id}" data-item="${i.id}">${icon('plus')}${AM.isNcType(i.result) ? 'Create Nonconformity' : 'Record Finding'}</button>` : ''}</div>
        ${!can && AM.audit(a.id).status === 'In Progress' && i.assignee !== AM.actor() ? `<p class="small muted">${icon('lock')} Assigned to ${esc(Q.pname(i.assignee))} — only they can answer it.</p>` : ''}</div></div></li>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-toggle-item]'); if (!b) return; openItem = openItem === b.dataset.toggleItem ? null : b.dataset.toggleItem; rr(); document.querySelector(`[data-toggle-item="${b.dataset.toggleItem}"]`)?.focus({ preventScroll: true }); });
  const itemOf = d => { const a = AM.audit(d.id || d.audit); return [a, a.checklist.find(x => x.id === (d.item || d.notes || d.ans || d.na))]; };
  const stamp = i => { i.by = AM.actor(); i.date = Q.today(); };
  const guard = (a, i) => { if (!AM.can('assess', a, i)) { Q.toast('Not your question', `Assigned to ${Q.pname(i.assignee)}. Only the assigned auditor can answer it while their work is open.`); return false; } return true; };
  document.addEventListener('focusout', e => {
    const t = e.target.closest?.('[data-notes],[data-ans],[data-na]'); if (!t || t.readOnly || t.disabled) return;
    const [a, i] = itemOf(t.dataset); if (!i || !AM.can('assess', a, i)) return;
    if (t.dataset.notes != null) { if (i.notes === t.value) return; i.notes = t.value; Q.save(); Q.toast('Notes saved'); return; }
    if (t.dataset.na != null) { if (i.naReason === t.value) return; i.naReason = t.value; stamp(i); Q.save(); rr(); return; }
  });
  document.addEventListener('change', e => { const t = e.target.closest?.('[data-ans]'); if (!t) return; const [a, i] = itemOf(t.dataset); if (!i || !guard(a, i)) return; i.answer = t.value === '' ? null : i.type === 'number' ? +t.value : t.value; stamp(i); AM.log(a, `answered ${i.clause || ''} “${i.question.slice(0, 40)}”`); Q.save(); rr(); });
  Q.actions['am-assess'] = d => {
    const [a, i] = itemOf(d); if (!guard(a, i)) return; const prev = i.result;
    if (i.finding && prev !== d.r) { Q.toast('A finding is linked', `Change the classification in ${i.finding} instead, so the record and the checklist stay consistent.`); return; }
    i.result = prev === d.r ? null : d.r; if (i.result !== 'N/A') i.naReason = ''; stamp(i);
    if (i.result) AM.log(a, `assessed ${i.clause || 'a question'} as ${AM.short(i.result)}${i.result === 'N/A' ? ' (reason required)' : ''}`);
    Q.save(); rr(); if (i.result === 'N/A') setTimeout(() => document.querySelector(`[data-na="${i.id}"]`)?.focus(), 30);
  };
  Q.actions['am-answer'] = d => { const [a, i] = itemOf(d); if (!guard(a, i)) return; i.answer = i.answer === d.v || d.v === '' ? null : d.v; if (i.answer !== 'N/A') i.naReason = ''; stamp(i); Q.save(); rr(); if (i.answer === 'N/A') setTimeout(() => document.querySelector(`[data-na="${i.id}"]`)?.focus(), 30); };
  Q.actions['am-ev-toggle'] = d => {
    const [a, i] = itemOf(d); if (!guard(a, i)) return; const k = d.kind + d.ev, at = i.reviewed.findIndex(s => s.kind + s.id === k);
    if (at >= 0) i.reviewed.splice(at, 1);
    else { const s = AM.snap({ kind: d.kind, id: d.ev }, AM.actor(), Q.today()); i.reviewed.push(s); AM.log(a, `reviewed ${s.title}${s.kind === 'doc' ? ` Rev ${s.rev}` : ''} for ${i.clause || 'a question'}`); }
    if (i.type === 'evidence') stamp(i); Q.save(); rr();
  };
  Q.actions['am-ext'] = d => {
    const [a, i] = itemOf(d); if (!guard(a, i)) return;
    const m = Q.openModal({ size: 's', title: 'Add external evidence reference', sub: 'For something reviewed that is not in iQMS (e.g. an ERP screen, a site visit, a paper form).', body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Reference <span class="req">*</span></span><input class="input" name="ref" required autofocus placeholder="e.g. ERP PO-2026-0412"></label><label class="field"><span>Note</span><input class="input" name="note" placeholder="What it showed"></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Reference</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); i.external.push({ ref: v.ref, note: v.note, by: AM.actor(), date: Q.today() }); AM.log(a, `added external evidence reference “${v.ref}”`); Q.save(); close(); rr(); });
  };
  Q.actions['am-q-link'] = d => { const [a, i] = itemOf(d); if (!guard(a, i)) return; const docs = Q.S.documents.filter(x => !['Obsolete', 'Superseded'].includes(x.status));
    const m = Q.openModal({ size: 'm', title: 'Reference QMS document', body: `<form class="modal-body"><label class="field"><span>Document</span><select class="select" name="doc">${docs.map(x => `<option value="${x.id}"${Q.inProc(x.process, a.process) ? '' : ''}>${esc(x.id)} · ${esc(x.title)}</option>`).join('')}</select></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Reference</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const v = Q.formValues(m.querySelector('form')); if (!i.docs.includes(v.doc)) i.docs.push(v.doc); stamp(i); AM.log(a, `referenced ${v.doc} for ${i.clause || 'a question'}`); Q.save(); close(); rr(); }); };

  /* ====================================================================== findings & NCs */
  Q.actions['am-raise'] = d => {
    const a = AM.audit(d.id), i = d.item ? a.checklist.find(x => x.id === d.item) : null, p = Q.proc(a.process);
    if (i && !AM.can('assess', a, i)) { Q.toast('Not your question', `Assigned to ${Q.pname(i.assignee)}.`); return; }
    const type = i?.result && !['Conforming', 'N/A'].includes(i.result) ? i.result : 'Minor nonconformity', refs = i ? i.reviewed.slice() : [];
    if (d.ref && i) { const [k, id] = d.ref.split('|'); if (!refs.some(s => s.kind === k && s.id === id)) refs.push(AM.snap({ kind: k, id }, AM.actor(), Q.today())); }
    const m = Q.openModal({ size: 'l', title: 'Record finding', sub: `${esc(a.id)} · ${esc(p.name)}${i ? ` · clause ${esc(i.clause)}` : ''}`, body: `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Classification <span class="req">*</span></span><select class="select" name="type">${AM.FINDING_TYPES.map(t => `<option${t === type ? ' selected' : ''}>${t}</option>`).join('')}</select><span class="help">Minor and major nonconformities get an NC number, an owner and a due date.</span></label>
      <label class="field"><span>ISO clause <span class="req">*</span></span><input class="input tnum" name="clause" required value="${esc(i?.clause || '')}"></label>
      <label class="field full"><span>Short title <span class="req">*</span></span><input class="input" name="title" required placeholder="e.g. Initial evaluation missing for two approved suppliers"></label>
      <label class="field full"><span>Finding statement <span class="req">*</span></span><textarea class="textarea" name="statement" required rows="3" placeholder="Requirement, what was found, objective evidence">${esc(i?.notes || '')}</textarea></label>
      <div class="field full nc-only"><span>Responsible owner and due date</span><div class="form-grid"><select class="select" name="owner" aria-label="Responsible owner">${Q.peopleOptions(p.owner)}</select><input class="input" type="date" name="due" value="${Q.addDays(Q.today(), 30)}" aria-label="Due date"></div></div>
      <div class="field full"><span>Evidence referenced</span>${refs.length ? `<ul class="snap-list">${refs.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : '<p class="small muted">None — mark evidence as reviewed in the checklist to reference it here.</p>'}</div></div></form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Record Finding</button>' });
    const sync = () => m.querySelectorAll('.nc-only').forEach(el => { el.hidden = !AM.isNcType(m.querySelector('[name="type"]').value); });
    m.querySelector('[name="type"]').addEventListener('change', sync); sync();
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), yr = Q.today().slice(0, 4), S = Q.S;
      const fid = `F-${yr}-${String(Math.max(0, ...S.findings.filter(x => x.id.startsWith(`F-${yr}-`)).map(x => +x.id.split('-')[2])) + 1).padStart(2, '0')}`;
      const fnd = { id: fid, audit: a.id, process: a.process, clause: v.clause.trim(), type: v.type, auditor: AM.actor(), raised: Q.today(), status: 'Open', action: null, title: v.title.trim(), statement: v.statement.trim(), evidence: refs, checklistItem: i?.id || null };
      if (AM.isNcType(v.type)) {
        const no = `NC-${yr}-${String(Math.max(0, ...AM.ncs().filter(x => x.nc.no.startsWith(`NC-${yr}-`)).map(x => +x.nc.no.split('-')[2])) + 1).padStart(3, '0')}`;
        fnd.nc = { no, classification: /major/i.test(v.type) ? 'Major' : 'Minor', owner: v.owner, due: v.due, status: 'Open', ca: { correction: '', rootCause: '', action: '', owner: v.owner, due: v.due, impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null, comments: [], events: [], seen: {} };
        AM.ncLog(fnd, 'raised the nonconformity'); AM.ncLog(fnd, `notified ${Q.pname(v.owner)} (process owner)`, 'system');
      }
      S.findings.push(fnd);
      if (i) { i.finding = fid; i.result = v.type; i.by = i.by || AM.actor(); i.date = i.date || Q.today(); }
      AM.log(a, `raised ${fid}${fnd.nc ? ` / ${fnd.nc.no}` : ''} (${AM.short(v.type)}, clause ${fnd.clause})`);
      Q.save(); close(); rr(); Q.toast(fnd.nc ? 'Nonconformity raised' : 'Finding recorded', fnd.nc ? `${fnd.nc.no} · ${Q.pname(v.owner)} has been notified` : fid);
    });
  };
  function wsFindings(a) {
    const rows = () => AM.findingsOf(a.id), ncs = AM.findingsOf(a.id).filter(f => f.nc), canRec = AM.can('record', a);
    return { html: `<div class="section-head" style="margin-top:0"><h2>Findings</h2><span class="sub">Structured records: classification, clause, statement and the evidence reviewed. Nonconformities get an NC number; their corrective action is managed in the NC workspace.</span>${canRec ? `<div class="actions"><button class="btn" type="button" data-action="am-raise" data-id="${a.id}">${icon('plus')}Record Finding</button></div>` : ''}</div>` +
      Q.table({ id: 'am-f-' + a.id, rows, noun: 'findings', caption: 'Findings', expand: f => `<div class="exp-pad"><p>${esc(f.statement)}</p>${f.evidence?.length ? `<h4 class="small">Evidence</h4><ul class="snap-list">${f.evidence.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : ''}${f.migrationReview ? `<p class="small warnv">${icon('triangle-alert')} ${esc(f.migrationReview.reason)}${f.migrationReview.resolved ? ` — resolved: ${esc(f.migrationReview.resolved)}` : ''}</p>` : ''}</div>`,
        columns: [
          { key: 'id', label: 'Finding', cls: 'c-id', sort: f => f.id, render: f => `${esc(f.id)}${f.nc ? `<span class="sub">${esc(f.nc.no)}</span>` : ''}` },
          { key: 't', label: 'Finding statement', render: f => `<button class="title-btn" type="button" data-expand>${esc(f.title)}</button><span class="sub">raised by ${esc(Q.pname(f.auditor))} · ${Q.fmt(f.raised)}</span>${f.migrationReview && !f.migrationReview.resolved ? '<span class="sub"><span class="ind ind-bad">Migration Review Required</span></span>' : ''}` },
          { key: 'c', label: 'Clause', sort: f => Q.clauseSort(f.clause), render: f => `<span class="clause">${esc(f.clause)}</span>` },
          { key: 'k', label: 'Classification', sort: f => f.type, render: f => `<span class="st ${AM.typeKind(f.type)}">${esc(AM.short(f.type))}</span>` },
          { key: 'o', label: 'Owner', render: f => f.nc ? `<span class="nowrap">${esc(Q.pname(f.nc.owner))}</span>` : '<span class="muted">—</span>' },
          { key: 'ca', label: 'Corrective action', render: f => f.nc ? `<span class="small">${f.nc.ca?.action ? esc(f.nc.ca.action) : '<span class="muted">Awaiting response</span>'}</span>${f.nc.verification ? `<span class="sub">Verified · ${esc(Q.pname(f.nc.verification.by))}</span>` : ''}` : '<span class="muted">—</span>' },
          { key: 's', label: 'Status', sort: f => f.status, render: f => f.nc ? `${Q.st(f.nc.status, AM.NC_KIND[f.nc.status])}${AM.ncBadges(f)}` : Q.st(f.status, f.status === 'Closed' ? 'muted' : 'neutral') },
          { key: 'x', label: 'Actions', cls: 'c-actions', render: f => `${f.migrationReview && !f.migrationReview.resolved && AM.can('configure') ? `<button class="btn sm" type="button" data-action="am-mig-resolve" data-id="${f.id}">Resolve</button>` : ''}${f.nc ? `<a class="btn sm" href="#/audits/nc/${f.nc.no}">Open NC</a>` : f.status === 'Open' && AM.can('report', a) ? `<button class="btn sm" type="button" data-action="am-f-close" data-id="${f.id}">Acknowledge</button>` : ''}` }],
        empty: '<h3>No findings yet</h3><p>Findings are recorded from the checklist during the audit.</p>' }) +
      (ncs.length ? `<p class="small muted" style="margin-top:12px">${icon('info')} ${ncs.filter(AM.ncOpen).length} of ${ncs.length} nonconformities open. Correction, root cause, corrective action, implementation evidence, auditor verification and effectiveness are handled in each NC workspace; publishing the report does not close them.</p>` : '') };
  }
  Q.actions['am-f-close'] = d => { const f = Q.S.findings.find(x => x.id === d.id), a = AM.audit(f.audit); f.status = 'Closed'; AM.log(a, `acknowledged ${f.id} (${AM.short(f.type)}) with the auditee`); Q.save(); rr(); Q.toast('Finding acknowledged', f.id); };
  Q.actions['am-mig-resolve'] = d => {
    const f = Q.S.findings.find(x => x.id === d.id), targets = Q.S.audits.filter(a => a.status !== 'Draft' && (a.process === Q.rootId(f.process) || a.process === f.process));
    const m = Q.openModal({ size: 'm', title: `Resolve migration review — ${esc(f.id)}`, sub: esc(f.migrationReview.reason), body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Decision</span><select class="select" name="to"><option value="">Keep in ${esc(f.audit)} (justify below)</option>${targets.map(a => `<option value="${a.id}">Move to ${esc(a.id)} — ${esc(a.title)} (${esc(AM.dateText(a))})</option>`).join('')}</select><span class="help">${targets.length ? `Audits of ${esc(Q.proc(f.process)?.name)}.` : `There is no audit of ${esc(Q.proc(f.process)?.name)} — create one to move the finding there.`}</span></label><label class="field"><span>Note <span class="req">*</span></span><textarea class="textarea" name="note" required rows="2"></textarea></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Resolve</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const fm = m.querySelector('form'); if (!Q.validate(fm)) return; const v = Q.formValues(fm), from = AM.audit(f.audit);
      if (v.to) { f.audit = v.to; AM.log(AM.audit(v.to), `received ${f.id} from ${from?.id} after migration review — ${v.note}`); }
      f.migrationReview.resolved = `${v.to ? `moved to ${v.to}` : 'kept'} by ${Q.pname(AM.actor())} on ${Q.fmt(Q.today())}: ${v.note}`; if (from) AM.log(from, `resolved migration review for ${f.id}: ${f.migrationReview.resolved}`); Q.save(); close(); rr(); Q.toast('Migration review resolved', f.id); });
  };

  /* ====================================================================== activity */
  function wsActivity(a) {
    const nc = AM.findingsOf(a.id).filter(f => f.nc).flatMap(f => [...f.nc.events.map(e => ({ ...e, text: `${f.nc.no}: ${e.text}` })), ...f.nc.comments.map(c => ({ at: c.at, who: c.who, text: `${f.nc.no}: commented — “${c.text.length > 90 ? c.text.slice(0, 90) + '…' : c.text}”` }))]);
    const rep = (a.report.history || []).map(h => ({ ...h, text: `Report: ${h.text}` }));
    const all = [...a.activity, ...nc, ...rep].sort((x, y) => x.at < y.at ? 1 : -1);
    return { html: `<div class="section-head" style="margin-top:0"><h2>Activity</h2><span class="sub">Audit trail: who did what and when. Entries cannot be edited or deleted.</span></div><section class="panel"><ul class="activity am-act">${all.map(e => `<li><span class="avatar sm">${e.who === 'system' ? icon('bell') : esc(Q.initials(e.who))}</span><span><b>${e.who === 'system' ? 'iQMS' : esc(Q.pname(e.who))}</b> ${esc(e.text)}</span><span class="when">${AM.at(e.at)}</span></li>`).join('') || '<li class="muted">No activity yet.</li>'}</ul></section>` };
  }
})();
