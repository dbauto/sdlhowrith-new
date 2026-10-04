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
    if (sec === 'objectives' && parts[1] && Q.K) { const v = Q.K.route(parts.slice(1), q); if (v) return v; }
    const fn = { scope: scopePage, policies: policiesPage, processes: processesPage, objectives: objectivesPage }[sec] || scopePage;
    return fn(q, parts.slice(1));
  };

  /* Update 20 — Organization & Scope and Policies are tabbed: one topic per tab, a short Summary first.
   * Each tab shows the same pre-made components as before, so tables, edits and exports behave the same. */
  const tabbedPage = ({ page, title, crumb, sub, actions, base, tabs, cur, body }) => {
    const t = tabs.find(x => x.key === cur) || tabs[0];
    const parts = body(t.key), comps = parts.filter(x => typeof x === 'object');
    const html = parts.map(x => typeof x === 'object' ? x.html : x).join('');
    return { title: `${title} · ${t.label}`.replace(/ · Summary$/, ''), nav: 'qms',
      html: Q.pageHead({ crumbs: qmsCrumbs(title), title, sub, actions })
        + Q.ui.tabs(tabs.map(x => ({ ...x, href: `${base}/${x.key}` })), t.key, `${title} sections`) + `<div class="tab-panel" role="tabpanel">${html}</div>`,
      after: main => comps.forEach(c => c.after(main)) };
  };
  const C = (type, zone = 'main') => Q.renderComp(type, { zone });
  const split = (mainHtml, sideHtml) => `<div class="tab-split"><div class="tab-stack">${mainHtml}</div><div class="tab-stack">${sideHtml}</div></div>`;
  // split() for components: keeps their after() hooks.
  const splitC = (mains, sides) => [`<div class="tab-split"><div class="tab-stack">`, ...mains, `</div><div class="tab-stack">`, ...sides, `</div></div>`];
  const soon = d => d?.nextReview && !Q.docOverdue(d) && Q.days(Q.today(), d.nextReview) <= 30;
  const docRow = d => {
    const over = Q.docOverdue(d), wf = !over && !soon(d) && d.status !== 'Published';
    return { icon: wf ? 'git-branch' : 'file-text', title: d.title, meta: `${d.id} · Rev ${wf && d.workingRev ? `${d.rev || '—'} → ${d.workingRev}` : d.rev || '—'}`, kind: 'Document', owner: d.owner, due: d.nextReview,
      action: 'open-doc', data: { id: d.id }, right: over ? Q.ui.badge('Review overdue', 'danger') : wf ? Q.ui.badge(d.status, 'info') : Q.ui.badge('Review due soon', 'warning'), tone: over ? 'danger' : '' };
  };
  const docNeeds = d => d && (Q.docOverdue(d) || soon(d) || (d.status !== 'Published' && d.status !== 'Obsolete' && !!d.workingRev));
  const pctOf = (n, t) => t ? Math.round(n / t * 100) : 100;
  const objOwner = name => Q.S.objectives?.find(o => o.name === name)?.owner;

  /* The four QMS pages are layouts of pre-made components (see pages.js). The functions
   * below only set the page header; what the page shows comes from its layout.         */
  const P = (type, extra = {}) => ({ id: `d-${type}`, type, ...extra });
  Q.page('scope', { fixed: true, title: 'Organization & Scope', route: '#/qms/scope', layout: { layout: '2-1', zones: {
    top: [P('context-review-alert')], main: [P('scope-statement'), P('sites'), P('context-issues'), P('parties')], side: [P('org-facts'), P('exclusions'), P('structure-docs')], bottom: [P('org-chart')] } } });
  Q.page('policies', { fixed: true, title: 'Policies', route: '#/qms/policies', layout: { layout: '2-1', zones: {
    main: [P('quality-policy'), P('other-policies')], side: [P('policy-ack'), P('objectives-health')] } } });
  Q.page('processes', { fixed: true, title: 'Processes', route: '#/qms/processes', layout: { layout: '1', zones: { top: [P('process-map')] } } });
  Q.page('objectives', { fixed: true, title: 'Objectives & KPIs', route: '#/qms/objectives', layout: { layout: '1', zones: { top: [P('kpi-views')] } } });

  function scopePage(q, [tab] = []) {
    const S = Q.S, c = S.context;
    const ctxDoc = Q.doc(c.contextDoc), scopeDoc = Q.doc(c.scopeDoc);
    const structDocs = [c.orgChartDoc, 'QMS-PRO-002', 'QMS-MAP-001'].map(Q.doc).filter(Boolean);
    const issues = c.issues.internal.length + c.issues.external.length;
    const tabs = [
      { key: 'summary', label: 'Summary' },
      { key: 'scope', label: 'Scope', n: c.sites.length },
      { key: 'context', label: 'Context', n: issues, tone: ctxDoc && Q.docOverdue(ctxDoc) ? 'danger' : '' },
      { key: 'parties', label: 'Interested Parties', n: c.parties.length },
      { key: 'organization', label: 'Organization' }];
    return tabbedPage({ page: 'scope', title: 'Organization & Scope', base: '#/qms/scope', tabs, cur: tab || 'summary',
      sub: 'Who we are, what the QMS covers, and the context it operates in — ISO 9001 clauses 4.1–4.4.',
      actions: `<a class="btn" href="#/settings/organization">${icon('pencil')}Edit Organization</a>`,
      body: k => {
        if (k === 'scope') return splitC([C('scope-statement'), C('sites')], [C('exclusions', 'side')]);
        if (k === 'context') return [C('context-review-alert'), C('context-issues')];
        if (k === 'parties') return [C('parties')];
        if (k === 'organization') return ['<div class="tab-stack"><div class="grid-halves">', C('org-facts', 'side'), C('structure-docs', 'side'), '</div>', C('org-chart'), '</div>'];
        // Summary (board): stat tiles + breakdown on the left, one table of what needs attention on the right.
        const keyDocs = [scopeDoc, ctxDoc, ...structDocs].filter((d, i, a) => d && a.indexOf(d) === i);
        const att = keyDocs.filter(docNeeds).map(docRow);
        c.parties.filter(x => !String(x.monitoring || '').trim()).forEach(x => att.push({ icon: 'users', title: x.party, meta: 'No monitoring method recorded', kind: 'Interested party', href: '#/qms/scope/parties', right: Q.ui.badge('Incomplete', 'warning') }));
        if (!c.issues.internal.length || !c.issues.external.length) att.push({ icon: 'globe', title: 'Context issues incomplete', meta: `${c.issues.internal.length} internal · ${c.issues.external.length} external`, kind: 'Context', href: '#/qms/scope/context', right: Q.ui.badge('Incomplete', 'warning') });
        const cur = keyDocs.filter(d => !Q.docOverdue(d)).length, mon = c.parties.filter(x => String(x.monitoring || '').trim()).length, act = c.sites.filter(x => String(x.activities || '').trim()).length;
        return [Q.ui.summary({
          stats: [
            { label: 'Sites in scope', value: c.sites.length, icon: 'building-2', href: '#/qms/scope/scope', note: `${c.exclusions.length} exclusion${c.exclusions.length === 1 ? '' : 's'}` },
            { label: 'Context issues', value: issues, icon: 'globe', href: '#/qms/scope/context', tone: ctxDoc && Q.docOverdue(ctxDoc) ? 'danger' : null, note: `${c.issues.internal.length} internal · ${c.issues.external.length} external` },
            { label: 'Interested parties', value: c.parties.length, icon: 'users', href: '#/qms/scope/parties', note: `${mon} monitored` }],
          breakdown: { title: 'Scope health', rings: { outer: { pct: pctOf(cur + mon + act, keyDocs.length + c.parties.length + c.sites.length), label: 'Completeness' },
              inner: { pct: Q.isoScore(S.iso.filter(r => r.clause.startsWith('4.'))).pct, label: 'ISO readiness', note: 'clauses 4.1–4.4' } },
            bars: [
              { label: 'Key documents current', pct: pctOf(cur, keyDocs.length), value: `${cur}/${keyDocs.length}`, note: 'scope, context, structure', href: '#/qms/scope/organization', tone: cur < keyDocs.length ? 'warning' : '' },
              { label: 'Parties with monitoring', pct: pctOf(mon, c.parties.length), value: `${mon}/${c.parties.length}`, note: 'clause 4.2', href: '#/qms/scope/parties' },
              { label: 'Sites with activities', pct: pctOf(act, c.sites.length), value: `${act}/${c.sites.length}`, note: 'clause 4.3', href: '#/qms/scope/scope' }] },
          attention: att, search: 'Search documents, parties…', empty: 'Scope, context and parties are up to date.',
          action: `<button class="btn primary" type="button" data-action="ctx-add" data-kind="parties">${icon('plus')}Add Interested Party</button>` })];
      } });
  }
  function policiesPage(q, [tab] = []) {
    const S = Q.S, pol = S.policies.quality, d = Q.doc(pol.doc), a = pol.communicated, pct = Math.round(a.acknowledged / a.total * 100);
    const others = S.documents.filter(x => x.type === 'Policy' && x.id !== pol.doc);
    const objs = [...new Set(S.kpis.map(k => k.objective))];
    const objBelow = objs.filter(o => S.kpis.some(k => k.objective === o && !Q.kpiOk(k)));
    const tabs = [
      { key: 'summary', label: 'Summary' },
      { key: 'quality', label: 'Quality Policy' },
      { key: 'other', label: 'Other Policies', n: others.length },
      { key: 'objectives', label: 'Objectives', n: objs.length }];
    return tabbedPage({ page: 'policies', title: 'Policies', base: '#/qms/policies', tabs, cur: tab || 'summary',
      sub: 'The quality policy and other policies that set direction for the QMS — ISO 9001 clause 5.2.',
      actions: `<button class="btn" type="button" data-action="create-revision" data-id="${d.id}">${icon('git-branch-plus')}Revise Quality Policy</button>`,
      body: k => {
        if (k === 'quality') return splitC([C('quality-policy')], [C('policy-ack', 'side')]);
        if (k === 'other') return [C('other-policies')];
        if (k === 'objectives') return [C('objectives-health')];
        const att = [d, ...others].filter(docNeeds).map(docRow);
        if (a.acknowledged < a.total) att.push({ icon: 'send', title: `${a.total - a.acknowledged} people have not acknowledged the Quality Policy`, meta: `Rev ${d.rev} · last campaign ${Q.fmt(a.lastCampaign)}`, kind: 'Communication', owner: d.owner, href: '#/qms/policies/quality', right: Q.ui.badge(`${pct}% acknowledged`, pct >= 90 ? 'success' : 'warning') });
        objBelow.forEach(o => { const n = S.kpis.filter(k => k.objective === o && !Q.kpiOk(k)).length; att.push({ icon: 'target', title: o, meta: (n2 => `${n2} KPI${n2 === 1 ? '' : 's'}`)(S.kpis.filter(k => k.objective === o).length), kind: 'Objective', owner: objOwner(o), href: Q.K ? '#/qms/objectives/goals' : '#/qms/policies/objectives', right: Q.ui.badge(`${n} KPI${n === 1 ? '' : 's'} below`, 'danger'), tone: 'danger' }); });
        const objPct = o => { const ks = S.kpis.filter(k => k.objective === o); return pctOf(ks.filter(Q.kpiOk).length, ks.length); };
        const bars = objs.map(o => ({ o, p: objPct(o) })).sort((x, y) => x.p - y.p).slice(0, 5)
          .map(({ o, p }) => ({ label: o, pct: p, value: `${p}%`, note: 'KPIs on target', href: '#/qms/policies/objectives', tone: p < 50 ? 'danger' : p < 100 ? 'warning' : '' }));
        return [Q.ui.summary({
          stats: [
            { label: 'Quality Policy', value: `Rev ${d.rev}`, icon: 'scroll-text', href: '#/qms/policies/quality', tone: Q.docOverdue(d) ? 'danger' : null, note: `Next review ${Q.fmt(d.nextReview)}` },
            { label: 'Other policies', value: others.length, icon: 'library', href: '#/qms/policies/other', note: `${others.filter(Q.docOverdue).length} review overdue` },
            { label: 'Objectives on target', value: `${objs.length - objBelow.length}/${objs.length}`, icon: 'target', href: '#/qms/policies/objectives', tone: objBelow.length ? 'warning' : null, note: 'all KPIs at or above target' }],
          breakdown: { title: 'Policy health', rings: {
              outer: { pct: Math.round((pctOf([d, ...others].filter(x => !Q.docOverdue(x)).length, others.length + 1) + pct + pctOf(objs.length - objBelow.length, objs.length)) / 3), label: 'Completeness' },
              inner: { pct: Q.isoScore(S.iso.filter(r => /^(5|6)\./.test(r.clause))).pct, label: 'ISO readiness', note: 'clauses 5 and 6' } },
            bars: [{ label: 'Quality Policy acknowledged', pct, value: `${a.acknowledged}/${a.total}`, note: 'clause 5.2.2', href: '#/qms/policies/quality', tone: pct < 80 ? 'warning' : '' }, ...bars.slice(0, 4)] },
          attention: att, search: 'Search policies, objectives…', empty: 'All policies are current and acknowledged.',
          action: `<button class="btn primary" type="button" data-action="toast" data-title="Reminder sent" data-msg="${a.total - a.acknowledged} employees will be asked to read and acknowledge the Quality Policy.">${icon('send')}Remind ${a.total - a.acknowledged} People</button>` })];
      } });
  }
  function processesPage(q) {
    // Old links (?view=table) set the display once; the Cards/Register switch remembers it after that.
    if (q.view) { Q.UI.procView = q.view === 'table' ? 'table' : 'map'; Q.saveUI(); location.replace('#/qms/processes'); return { title: 'Processes', nav: 'qms', html: '' }; }
    return Q.pageView('processes', { title: 'Processes', nav: 'qms', crumbs: qmsCrumbs('Processes'), sub: 'The processes of the QMS and how they interact — ISO 9001 clause 4.4. Open a process for its documents, risks, KPIs, evidence and audits.',
      actions: `<a class="btn" href="#/settings/processes">${icon('network')}Edit Process Structure</a>`, customize: false });
  }

  /* ---------------- Organization & context components ---------------- */
  const G1 = 'Organization & context';
  // Rows edited on the page need stable ids.
  const ctxRows = kind => { const list = Q.S.context[kind]; let ch = false; list.forEach(x => { if (!x.id) { x.id = `${kind.slice(0, 3)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; ch = true; } }); if (ch) Q.save(); return list; };
  const CTX = {
    sites: { one: 'site', title: 'Site', label: x => x.name, fields: [['name', 'Site', 'input', true], ['address', 'Location', 'input', true], ['activities', 'Activities in scope', 'textarea', true]] },
    parties: { one: 'interested party', title: 'Interested party', label: x => x.party, fields: [['party', 'Interested party', 'input', true], ['needs', 'Relevant needs & expectations', 'textarea', true], ['monitoring', 'How we monitor', 'textarea', false]] }
  };
  const ctxMenu = (kind, x) => `<span class="row-menu">${Q.menu(`Actions for ${CTX[kind].label(x)}`, [
    { label: 'Edit', icon: 'pencil', data: { action: 'ctx-edit', kind, id: x.id } }, '-',
    { label: 'Delete', icon: 'trash-2', cls: 'danger', data: { action: 'ctx-delete', kind, id: x.id } }], { align: 'min-width:160px' })}</span>`;
  const ctxTable = (kind, id, columns, noun, narrow) => Q.table({ id, rows: () => ctxRows(kind), noun, caption: noun, bare: true, rowLabel: CTX[kind].label,
    search: x => CTX[kind].fields.map(f => x[f[0]] || '').join(' '),
    tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search ${esc(noun)}" aria-label="Search ${esc(noun)}"></div>`,
    columns: [...(narrow ? columns.slice(0, 2) : columns), { key: 'actions', label: '', cls: 'c-actions c-menu', render: x => ctxMenu(kind, x) }],
    empty: `<h3>No ${esc(noun)} yet</h3><p>Add the first one with the button above.</p>` });
  const ctxForm = (kind, row) => {
    const K = CTX[kind];
    const m = Q.openModal({ size: 'm', title: `${row ? 'Edit' : 'Add'} ${K.one}`, sub: row ? esc(K.label(row)) : 'Shown on Organization & Scope and wherever this list is placed.',
      body: `<form class="modal-body"><div style="display:flex;flex-direction:column;gap:16px">${K.fields.map(([k, l, t, req], i) => `<label class="field"><span>${esc(l)}${req ? ' <span class="req">*</span>' : ''}</span>${t === 'textarea' ? `<textarea class="textarea" name="${k}" rows="3" ${req ? 'required' : ''}>${esc(row?.[k] || '')}</textarea>` : `<input class="input" name="${k}" ${req ? 'required' : ''} ${i === 0 ? 'autofocus' : ''} value="${esc(row?.[k] || '')}">`}</label>`).join('')}</div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${row ? 'Save Changes' : `Add ${K.title}`}</button>` });
    const ok = () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return;
      const v = Q.formValues(f); Object.keys(v).forEach(k => { v[k] = v[k].trim(); });
      if (row) Object.assign(row, v); else Q.S.context[kind].push({ id: `${kind.slice(0, 3)}-${Date.now().toString(36)}`, ...v });
      Q.save(); Q.closeModal(); Q.render({ noFocus: true }); Q.toast(row ? `${K.title} updated` : `${K.title} added`, K.label(row || v));
    };
    m.querySelector('[data-ok]').addEventListener('click', ok); m.querySelector('form').addEventListener('submit', e => { e.preventDefault(); ok(); });
  };
  Q.actions['ctx-add'] = d => ctxForm(d.kind, null);
  Q.actions['ctx-edit'] = d => ctxForm(d.kind, ctxRows(d.kind).find(x => x.id === d.id));
  Q.actions['ctx-delete'] = d => { const K = CTX[d.kind], list = ctxRows(d.kind), row = list.find(x => x.id === d.id); if (!row) return;
    Q.confirm({ title: `Delete this ${K.one}?`, body: `<p><b>${esc(K.label(row))}</b> is removed from the list. Update the controlled document if it lists it too.</p>`, confirm: 'Delete', danger: true,
      onConfirm: () => { list.splice(list.indexOf(row), 1); Q.save(); Q.render({ noFocus: true }); Q.toast(`${K.title} deleted`, K.label(row)); } }); };
  Q.actions['ctx-issues'] = () => {
    const c = Q.S.context;
    const m = Q.openModal({ size: 'l', title: 'Edit context issues', sub: 'ISO 9001 clause 4.1 — one issue per line.',
      body: `<form class="modal-body"><div class="form-grid"><label class="field"><span>Internal issues</span><textarea class="textarea" name="internal" rows="8">${esc(c.issues.internal.join('\n'))}</textarea></label><label class="field"><span>External issues</span><textarea class="textarea" name="external" rows="8">${esc(c.issues.external.join('\n'))}</textarea></label></div></form>`,
      foot: `<span class="left">Keep ${esc(c.contextDoc)} in step with this list.</span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Changes</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => { const v = Q.formValues(m.querySelector('form')), lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
      c.issues.internal = lines(v.internal); c.issues.external = lines(v.external); Q.save(); Q.closeModal(); Q.render({ noFocus: true }); Q.toast('Context issues updated', `${c.issues.internal.length} internal · ${c.issues.external.length} external`); });
  };

  Q.component('context-review-alert', { group: G1, name: 'Register review alert', icon: 'calendar-clock', desc: 'A warning shown only while the Context & Interested Parties Register is overdue for review.',
    hiddenNote: 'Shown only while the Context & Interested Parties Register is overdue for review.',
    render: () => { const d = Q.doc(Q.S.context.contextDoc); return d && Q.docOverdue(d) ? `<div class="callout warning qms-alert">${icon('triangle-alert')}<span class="qms-alert-copy"><b>${esc(d.title)} review is overdue</b><small>Was due ${Q.fmt(d.nextReview)}. Issues and interested parties may be out of date — this is also an input to the next management review.</small></span><span class="qms-alert-actions"><button class="btn sm ghost" type="button" data-action="dismiss-alert">Dismiss</button><button class="btn sm" type="button" data-action="create-revision" data-id="${d.id}">Create Revision</button></span></div>` : ''; } });
  Q.actions['dismiss-alert'] = () => document.querySelector('.qms-alert')?.remove();
  Q.component('scope-statement', { group: G1, name: 'QMS scope', icon: 'file-text', desc: 'The scope statement of the QMS with its controlled source document (clause 4.3).',
    render: (b, ctx) => { const c = Q.S.context, d = Q.doc(c.scopeDoc); return Q.panel({ title: ctx.title('QMS scope'), tag: '4.3', pad: true, actions: `<button class="btn sm" type="button" data-action="open-doc" data-id="${d.id}">${icon('file-text')}Open ${esc(d.id)}</button>`,
      body: `<p class="scope-statement">${esc(c.scope)}</p><p class="small muted" style="margin-top:10px">Source: ${docChip(d.id)}</p>` }); } });
  Q.component('sites', { group: G1, name: 'Sites covered', icon: 'building-2', desc: 'Sites in the scope of the QMS. Sort, search, export, add, edit and delete.',
    render: (b, ctx) => Q.panel({ title: ctx.title('Sites covered'), count: Q.S.context.sites.length, actions: `<button class="btn sm" type="button" data-action="ctx-add" data-kind="sites">${icon('plus')}Add Site</button>`,
      body: ctxTable('sites', `ctx-sites-${b.id}`, [
        { key: 'name', label: 'Site', sort: x => x.name, render: x => `<span class="title">${esc(x.name)}</span>` },
        { key: 'address', label: 'Location', sort: x => x.address, render: x => esc(x.address) },
        { key: 'activities', label: 'Activities in scope', sort: x => x.activities, render: x => `<span class="small">${esc(x.activities)}</span>` }], 'sites', ctx.zone === 'side') }) });
  Q.component('context-issues', { group: G1, name: 'Context of the organization', icon: 'globe', desc: 'Internal and external issues that affect the QMS (clause 4.1). Editable.',
    render: (b, ctx) => { const c = Q.S.context, col = (h, list) => `<div><h3 style="font-size:14px;margin-bottom:8px">${h}</h3>${list.length ? `<ul class="bullets">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted small">None recorded.</p>'}</div>`;
      return Q.panel({ title: ctx.title('Context of the organization'), tag: '4.1', actions: `<button class="btn sm ghost" type="button" data-action="open-doc" data-id="${esc(c.contextDoc)}">Open register</button><button class="btn sm" type="button" data-action="ctx-issues">${icon('pencil')}Edit</button>`,
        body: `<div class="panel-pad ${ctx.zone === 'side' ? 'stack-16' : 'grid-halves'}" style="gap:24px">${col('Internal issues', c.issues.internal)}${col('External issues', c.issues.external)}</div>` }); } });
  Q.component('parties', { group: G1, name: 'Interested parties', icon: 'users', desc: 'Interested parties, what they expect and how it is monitored (clause 4.2). Sort, search, export, add, edit and delete.',
    render: (b, ctx) => Q.panel({ title: ctx.title('Interested parties'), tag: '4.2', count: Q.S.context.parties.length, actions: `<button class="btn sm" type="button" data-action="ctx-add" data-kind="parties">${icon('plus')}Add Party</button>`,
      body: ctxTable('parties', `ctx-parties-${b.id}`, [
        { key: 'party', label: 'Interested party', sort: x => x.party, render: x => `<span class="title">${esc(x.party)}</span>` },
        { key: 'needs', label: 'Relevant needs & expectations', sort: x => x.needs, render: x => `<span class="small">${esc(x.needs)}</span>` },
        { key: 'monitoring', label: 'How we monitor', sort: x => x.monitoring, render: x => `<span class="small">${esc(x.monitoring)}</span>` }], 'interested parties', ctx.zone === 'side') }) });
  Q.component('org-facts', { group: G1, name: 'Organization', icon: 'building-2', desc: 'Name, industry, standard, number of processes and people, top management.',
    render: (b, ctx) => { const S = Q.S, o = S.organization; return Q.panel({ title: ctx.title('Organization'), pad: true, body: `<dl class="dl-list">
      <dt>Name</dt><dd><b>${esc(o.name)}</b></dd><dt>Industry</dt><dd>${esc(o.industry)}</dd><dt>Standard</dt><dd>${esc(Q.standard())}</dd>
      <dt>Processes</dt><dd><a href="#/qms/processes">${Q.topProcesses().length} processes</a> · ${S.processes.filter(p => p.parent_process_id && p.status === 'active').length} subprocesses</dd>
      <dt>People</dt><dd>${S.users.filter(u => u.status === 'Active').length} active users</dd>
      <dt>Top management</dt><dd>${esc(Q.pname('eric'))}, ${esc(Q.person('eric').title)}</dd>
      <dt>QMS representative</dt><dd>${esc(Q.pname('maria'))}, ${esc(Q.person('maria').title)}</dd></dl>` }); } });
  Q.component('exclusions', { group: G1, name: 'Exclusions', icon: 'ban', desc: 'Requirements that do not apply, with the justification from the scope.',
    render: (b, ctx) => { const list = Q.S.context.exclusions; return Q.panel({ title: ctx.title('Exclusions'), count: 'justified in scope',
      body: list.length ? `<ul class="worklist">${list.map(x => `<li><div class="w-main"><div class="w-title"><span class="clause">${esc(x.clause)}</span> ${esc(x.title)}</div><div class="w-meta">${esc(x.reason)}</div></div></li>`).join('')}</ul>` : '<div class="empty">No exclusions.</div>' }); } });
  Q.component('structure-docs', { group: G1, name: 'Structure & responsibilities', icon: 'network', desc: 'The organization chart, responsibilities matrix and process map (clause 5.3).',
    render: (b, ctx) => Q.panel({ title: ctx.title('Structure & responsibilities'), tag: '5.3',
      body: `<ul class="link-list" style="padding:4px 20px">${[Q.S.context.orgChartDoc, 'QMS-PRO-002', 'QMS-MAP-001'].map(Q.doc).filter(Boolean).map(d => `<li>${icon('file-text')}<div class="ll-main"><b>${esc(d.title)}</b><span>${esc(d.id)} · Rev ${esc(d.rev)}${d.workingRev && d.status !== 'Published' ? ` → ${esc(d.workingRev)} ${esc(d.status.toLowerCase())}` : ''}</span></div>${d.id === Q.S.context.orgChartDoc ? `<button class="btn sm ghost" type="button" data-action="oc-scroll">View Chart</button>` : ''}<button class="btn sm" type="button" data-action="open-doc" data-id="${d.id}">Open</button></li>`).join('')}</ul>` }) });
  Q.actions['oc-scroll'] = () => { if (!location.hash.startsWith('#/qms/scope/organization') && location.hash.startsWith('#/qms/scope')) { location.hash = '#/qms/scope/organization'; setTimeout(() => Q.actions['oc-scroll'](), 60); return; } const el = document.getElementById('org-chart'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.querySelector('.oc-node, .oc-li')?.focus({ preventScroll: true }); } else location.hash = '#/qms/scope/organization'; };

  /* ---------------- Policy components ---------------- */
  const G2 = 'Policy';
  Q.component('quality-policy', { group: G2, name: 'Quality Policy', icon: 'scroll-text', desc: 'The policy statement, its commitments, approval and review dates (clause 5.2).',
    render: () => { const pol = Q.S.policies.quality, d = Q.doc(pol.doc);
      return `<section class="policy-card" aria-labelledby="qp"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap"><h2 id="qp" style="font-size:20px">Quality Policy</h2>${Q.st('Published')}<span class="small muted tnum">${esc(d.id)} · Rev ${esc(d.rev)}</span></div>
        <blockquote>${esc(pol.statement)}</blockquote><ol>${pol.commitments.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
        <div class="policy-sign"><span>Approved by <b>${esc(Q.pname(pol.approvedBy))}</b>, ${esc(Q.person(pol.approvedBy).title)}</span><span>Effective <b>${Q.fmt(d.effective)}</b></span><span>Next review <b>${Q.fmt(d.nextReview)}</b></span><button class="link-btn" type="button" data-action="open-doc" data-id="${d.id}">Open controlled copy</button></div></section>`; } });
  Q.component('other-policies', { group: G2, name: 'Other policies', icon: 'library', desc: 'Every other controlled policy, as a live table from Documented Information.',
    render: (b, ctx) => { const main = Q.S.policies.quality.doc, where = d => d.type === 'Policy' && d.id !== main;
      return Q.panel({ title: ctx.title('Other policies'), count: Q.S.documents.filter(where).length, actions: '<a class="btn sm ghost" href="#/documents?v=v-all">All documents</a>',
        body: Q.docTable(`pol-others-${b.id}`, { columns: ctx.zone === 'side' ? ['title', 'nextReview'] : ['id', 'title', 'process', 'owner', 'classification', 'nextReview'], where, bare: true }) }); } });
  Q.component('policy-ack', { group: G2, name: 'Communicated & understood', icon: 'circle-check', desc: 'How many employees acknowledged the current Quality Policy (clauses 5.2.2 and 7.3).',
    render: (b, ctx) => { const pol = Q.S.policies.quality, d = Q.doc(pol.doc), a = pol.communicated, pct = Math.round(a.acknowledged / a.total * 100);
      return Q.panel({ title: ctx.title('Communicated & understood'), tag: '5.2.2 · 7.3', pad: true, body: `<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:32px;font-weight:600" class="tnum">${pct}%</span><span class="muted">acknowledged</span></div>
        <div class="stack-bar" style="margin:8px 0"><span class="b-complete" style="width:${pct}%"></span></div>
        <p class="small muted">${a.acknowledged} of ${a.total} employees acknowledged Rev ${esc(d.rev)} · last campaign ${Q.fmt(a.lastCampaign)}</p>
        <button class="btn sm" type="button" style="margin-top:12px" data-action="toast" data-title="Reminder sent" data-msg="${a.total - a.acknowledged} employees will be asked to read and acknowledge the Quality Policy.">${icon('send')}Remind ${a.total - a.acknowledged} people</button>` }); } });
  Q.component('objectives-health', { group: 'Objectives & processes', name: 'Objectives on target', icon: 'target', desc: 'Each quality objective with how many of its KPIs are below target.',
    render: (b, ctx) => Q.panel({ title: ctx.title('Measured through'), actions: '<a class="btn sm ghost" href="#/qms/objectives">Objectives & KPIs</a>',
      body: `<ul class="health-list">${[...new Set(Q.S.kpis.map(k => k.objective))].slice(0, 7).map(o => { const below = Q.S.kpis.filter(k => k.objective === o && !Q.kpiOk(k)).length; return `<li>${icon('target')}<span>${esc(o)}</span><span class="v ${below ? 'attn' : 'zero'}" style="font-size:12px;white-space:nowrap">${below ? `${below} below target` : 'on target'}</span></li>`; }).join('')}</ul>` }) });

  /* Card colours (Update 20h): 12 muted tones in the system's soft, earthy palette. White text passes WCAG AA (≥ 4.5:1) on every stop.
   * A process can pick one (Settings → Process Structure → Card colour); "Auto" spreads the palette so neighbours differ. */
  Q.CARD_COLORS = [['forest', 'Forest', '#2F7A57', '#1A4A35'], ['teal', 'Teal', '#22706B', '#134744'], ['slate', 'Slate blue', '#485F86', '#2C3B57'], ['terracotta', 'Terracotta', '#9A5A43', '#63382A'],
    ['sage', 'Sage', '#4E7862', '#2E4D3D'], ['plum', 'Plum', '#75507A', '#4A314F'], ['petrol', 'Petrol', '#2C6478', '#193F4E'], ['clay', 'Clay', '#866628', '#5A431B'],
    ['indigo', 'Dusty indigo', '#575A92', '#35375F'], ['olive', 'Olive', '#61702F', '#3F4720'], ['mauve', 'Mauve', '#8A5468', '#5A3343'], ['graphite', 'Graphite', '#4A5450', '#2B312F']];
  Q.cardColor = (p, i = 0) => Q.CARD_COLORS.find(c => c[0] === p?.cardColor) || Q.CARD_COLORS[i % Q.CARD_COLORS.length];
  Q.cardColorVars = c => `--g1:${c[2]};--g2:${c[3]};--gs:${c[3]}73`;

  /* Process cards tilt toward the pointer with a moving sheen (off for reduced motion and touch). */
  (() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    let cur = null;
    const reset = c => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); c.classList.remove('tilting'); };
    document.addEventListener('pointermove', e => {
      if (calm.matches || e.pointerType === 'touch') return;
      const c = e.target.closest?.('.fx-card');
      if (cur && cur !== c) { reset(cur); cur = null; }
      if (!c) return; cur = c;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.classList.add('tilting');
      c.style.setProperty('--ry', `${((x - .5) * 12).toFixed(2)}deg`); c.style.setProperty('--rx', `${((.5 - y) * 10).toFixed(2)}deg`);
      c.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); c.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } }, true);
  })();

  /* ---------------- Processes component ---------------- */
  Q.actions['proc-view'] = d => { Q.UI.procView = d.view; Q.saveUI(); Q.render({ noFocus: true }); };
  Q.component('process-map', { group: 'Objectives & processes', name: 'Processes', icon: 'workflow', desc: 'Every process as a card or as a register table, with status and ISO readiness.',
    render: () => processMap() });
  function processMap() {
    const view = Q.UI.procView === 'table' ? 'table' : 'map';
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
    // Process card (ReUI-style): readiness meter, three ring metrics with their trend, owner and team.
    const TONE = { ok: 'success', attn: 'warning', risk: 'danger' };
    const meter = (pct, tone, n = 34) => { const on = Math.round((pct || 0) / 100 * n); return `<span class="pc-meter ${tone}" role="img" aria-label="ISO readiness ${pct ?? 0}%">${Array.from({ length: n }, (_, i) => `<i${i < on ? ' class="on"' : ''}></i>`).join('')}</span>`; };
    const ring = (pct, tone) => { const n = 20, on = Math.round(Math.max(0, Math.min(100, pct || 0)) / 100 * n);
      return `<svg class="pc-ring ${tone}" viewBox="0 0 28 28" aria-hidden="true">${Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2, c = Math.cos(a), si = Math.sin(a); return `<line x1="${(14 + c * 9).toFixed(2)}" y1="${(14 + si * 9).toFixed(2)}" x2="${(14 + c * 13).toFixed(2)}" y2="${(14 + si * 13).toFixed(2)}"${i < on ? ' class="on"' : ''}/>`; }).join('')}</svg>`; };
    const arrow = up => `<svg viewBox="0 0 24 24" aria-hidden="true">${up ? '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' : '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>'}</svg>`;
    const trend = (up, good, text, val) => `<span class="pc-trend ${good ? 'good' : 'bad'}">${arrow(up)}<span>${esc(text)}</span>${val ? `<b>${esc(val)}</b>` : ''}</span>`;
    const metric = (label, value, ringHtml, trendHtml) => `<span class="pc-metric"><span class="pc-m-label" title="${esc(label)}">${esc(label)}</span><span class="pc-m-main"><b class="tnum">${esc(String(value))}</b></span>${trendHtml}</span>`;
    // Update 20g: gradient 3D cards (same content: icon, name, purpose, ISO readiness, code, status, clauses).
    const card = (p, i) => {
      const [label] = STATUS[p.s.health], tone = TONE[p.s.health], pct = Math.max(0, Math.min(100, p.s.iso.pct || 0));
      const clauses = p.iso || [], visibleClauses = clauses.slice(0, 3), moreClauses = Math.max(0, clauses.length - visibleClauses.length);
      const col = Q.cardColor(Q.proc(p.id), i);
      return `<a class="proc-card pc2 fx-card fx-${esc(col[0])}" style="${Q.cardColorVars(col)}" href="#/process/${p.id}" aria-labelledby="pc-${p.id}">
        <span class="fx-sheen" aria-hidden="true"></span>
        <span class="fx-top"><span class="pc2-icon" aria-hidden="true">${icon(p.icon || 'landmark')}</span><span class="fx-dot ${tone}" title="${esc(label)}" aria-hidden="true"></span></span>
        <span class="fx-body">
          <h3 id="pc-${p.id}">${esc(p.name)}</h3>
          <p class="pc2-desc" title="${esc(p.purpose)}">${esc(p.purpose)}</p>
          <span class="fx-ready"><span class="pc2-progress" role="img" aria-label="ISO readiness ${pct}%"><i style="width:${pct}%"></i></span><b class="tnum">${pct}%</b><small>ISO readiness</small></span>
          <span class="pc2-tags" aria-label="Process tags"><span class="pc2-tag code">${esc(p.process_code)}</span><span class="pc2-tag status-${tone}">${esc(label)}</span>${visibleClauses.map(c => `<span class="pc2-tag">${esc(c)}</span>`).join('')}${moreClauses ? `<span class="pc2-tag">+${moreClauses}</span>` : ''}</span>
        </span>
      </a>`;
    };
    /* Legacy dense-card renderer retained below for reference during migration. */
    const legacyCard = p => {
      const s = p.s, [label, cls] = STATUS[s.health], tone = TONE[s.health], pct = s.iso.pct;
      const clauses = (p.iso || []).slice(0, 4), moreClauses = Math.max(0, (p.iso || []).length - clauses.length);
      const kpi = Q.S.kpis.filter(k => Q.inProc(k.process, p.id)).sort((a, b) => Q.kpiOk(a) - Q.kpiOk(b))[0];
      const docOk = s.docs ? Math.round((s.docs - s.docsOverdue) / s.docs * 100) : 100;
      const evOk = s.evidence ? Math.round((s.evidence - s.evGaps) / s.evidence * 100) : 100;
      const none = '<span class="pc-trend muted">None linked</span>';
      const docM = metric('Documents', s.docs, ring(s.docs ? docOk : 0, s.docsOverdue ? 'warning' : 'success'),
        !s.docs ? none : s.docsOverdue ? trend(false, false, 'overdue', String(s.docsOverdue)) : trend(true, true, 'all current'));
      let kpiM;
      if (kpi) {
        const prev = kpi.trend[kpi.trend.length - 2] ?? kpi.actual, up = kpi.actual >= prev, better = kpi.dir === '≤' ? kpi.actual <= prev : kpi.actual >= prev;
        const ratio = kpi.dir === '≤' ? (kpi.actual <= kpi.target ? 100 : Math.max(0, 100 - (kpi.actual - kpi.target) / (kpi.target || 1) * 100)) : Math.min(100, kpi.actual / (kpi.target || 1) * 100);
        kpiM = metric(kpi.name, Q.kpiFmt(kpi.actual, kpi), ring(ratio, Q.kpiOk(kpi) ? 'success' : 'danger'),
          kpi.actual === prev ? '<span class="pc-trend muted">no change</span>' : trend(up, better, 'from', Q.kpiFmt(prev, kpi)));
      } else kpiM = metric('KPIs', '—', ring(0, 'neutral'), '<span class="pc-trend muted">Not set</span>');
      const evM = metric('Evidence', s.evidence, ring(s.evidence ? evOk : 0, s.evGaps ? 'danger' : 'success'),
        !s.evidence ? none : s.evGaps ? trend(false, false, 'missing', String(s.evGaps)) : trend(true, true, 'all verified'));
      const members = team(p);
      return `<a class="proc-card pc2 tone-${tone}" href="#/process/${p.id}" aria-labelledby="pc-${p.id}">
        <div class="pc2-head">
          <span class="pc2-icon" aria-hidden="true">${icon(p.icon || 'landmark')}</span>
          <span class="pc2-code tnum">${esc(p.process_code)}</span>
          <h3 id="pc-${p.id}">${esc(p.name)}</h3>
          ${Q.ui.info(p.purpose || p.name)}
        </div>
        <p class="pc2-desc" title="${esc(p.purpose)}">${esc(p.purpose)}</p>
        <div class="pc2-score"><span class="pc2-pct tnum">${pct ?? '—'}<small>%</small></span><span class="pc2-score-note">ISO readiness</span><span class="ui-badge ${tone} dot pc2-status">${label}</span></div>
        ${meter(pct, tone)}
        <div class="pc2-metrics">${docM}${kpiM}${evM}</div>
        <div class="pc2-foot">
          <span class="pc2-owner"><span>Owner:</span> <b>${esc(Q.pname(p.owner))}</b></span>
          <span class="pc2-team">${members.slice(0, 4).map((id, i) => avatar(id, i ? ' stack' : '')).join('')}<span class="pc2-members">${members.length} member${members.length === 1 ? '' : 's'}</span></span>
        </div>
        <div class="pc2-clauses" aria-label="Applicable ISO 9001 clauses"><span class="pc2-iso">ISO 9001</span>${clauses.length ? clauses.map(c => `<span>${esc(c)}</span>`).join('') : '<span>Not mapped</span>'}${moreClauses ? `<span>+${moreClauses}</span>` : ''}<span class="pc2-explore">Explore${icon('arrow-right')}</span></div>
      </a>`;
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
    const map = `<div class="proc-showcase"><div class="pc-grid pc2-grid">${tops.map(card).join('')}</div></div>`;
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
    return `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${Q.seg('View', [['map', 'Cards'], ['table', 'Register']], view).replace(/data-seg=/g, 'data-action="proc-view" data-view=')}
        <span class="small muted">${tops.length} processes · ${tops.filter(p => p.s.health !== 'ok').length} need attention</span></div>` +
      (view === 'table' ? table : map);
  }

  /* ---------- Objectives & KPIs — same saved-views design as Documented Information ---------- */
  const KT = 'kpis';
  const kDelta = k => Math.round((k.trend[k.trend.length - 1] - k.trend[0]) * 10) / 10;
  Q.RECORDS.kpis = () => Q.S.kpis;
  Q.FIELDS.kpis = [
    { key: 'name', label: 'KPI', type: 'text', locked: true, min: '240px', get: k => k.name, sort: k => k.name,
      render: k => `<a class="doc-link" href="#/qms/objectives/k/${esc(k.id)}">${esc(k.name)}</a><span class="sub kp-sub1" title="Objective: ${esc(k.objective)}">${esc(k.objective)}</span>` },
    { key: 'objective', label: 'Objective', type: 'enum', options: () => [...new Set(Q.S.kpis.map(k => k.objective))].sort(), get: k => k.objective, sort: k => k.objective, render: k => esc(k.objective) },
    { key: 'process', label: 'Process', type: 'process', get: k => k.process, sort: k => Q.proc(k.process)?.process_code, render: k => Q.pcell(k.process) },
    { key: 'target', label: 'Target', type: 'number', cls: 'c-num', get: k => k.target, sort: k => k.target, render: k => `${esc(k.dir)} ${Q.kpiFmt(k.target, k)}` },
    { key: 'department', label: 'Department', type: 'enum', options: () => [...new Set(Q.S.kpis.map(k => k.department).filter(Boolean))].sort(), get: k => k.department || '', sort: k => k.department || '', render: k => k.department ? `<span class="nowrap">${esc(k.department)}</span>` : '<span class="zero">—</span>' },
    { key: 'actual', label: 'Current Result', type: 'number', cls: 'c-num', get: k => k.actual, sort: k => k.actual, render: k => `<span class="kpi-val" style="color:${Q.kpiOk(k) ? 'inherit' : 'var(--danger)'}">${Q.kpiFmt(k.actual, k)}</span>` },
    { key: 'trend', label: 'Trend', type: 'number', cls: 'kpi-trend-cell', get: kDelta, sort: kDelta,
      render: k => { const dlt = kDelta(k), dir = dlt > 0 ? 'up' : dlt < 0 ? 'down' : 'flat'; return `<span class="kpi-trend ${dir}" aria-label="${dlt > 0 ? 'Up' : dlt < 0 ? 'Down' : 'No change'} ${Math.abs(dlt)}${esc(k.unit)}">${Q.sparkline(k.trend, Q.kpiOk(k))}<span class="kpi-trend-value tnum"><b aria-hidden="true">${dlt > 0 ? '▲' : dlt < 0 ? '▼' : '■'}</b>${Math.abs(dlt)}${esc(k.unit)}</span></span>`; } },
    { key: 'owner', label: 'Owner', type: 'person', get: k => k.owner, sort: k => Q.pname(k.owner), render: k => `<span class="nowrap">${esc(Q.pname(k.owner))}</span>` },
    { key: 'period', label: 'Period', type: 'enum', options: () => [...new Set(Q.S.kpis.map(k => k.period))].sort(), get: k => k.period, sort: k => k.period, render: k => `<span class="nowrap">${esc(k.period)}</span>` },
    { key: 'method', label: 'Source Method', type: 'enum', options: () => ['Final result', 'Manual records', 'Excel / CSV import', 'Survey', 'Internal QMS', 'Integration'], get: k => Q.K ? Q.K.METHODS[Q.K.methodOf(k)].label : '', sort: k => k.method || '', render: k => Q.K ? Q.K.methodChip(Q.K.methodOf(k)) : '' },
    { key: 'frequency', label: 'Frequency', type: 'enum', options: () => ['Monthly', 'Quarterly', 'Semiannual', 'Annual', 'YTD'], get: k => k.frequency || '', sort: k => k.frequency || '', render: k => esc(k.frequency || '—') },
    { key: 'status', label: 'Status', type: 'enum', options: () => ['On target', 'Below target'], get: k => Q.kpiOk(k) ? 'On target' : 'Below target', sort: k => Q.kpiOk(k) ? 1 : 0, render: k => Q.kpiOk(k) ? Q.st('On target', 'success') : Q.st('Below target', 'danger') }
  ];
  const kpiMenu = k => Q.menu(`Actions for ${k.name}`, [
    { label: 'Open KPI', icon: 'arrow-right', data: { action: 'go', href: `#/qms/objectives/k/${k.id}` } },
    { label: 'Record Result…', icon: 'plus', data: { action: 'kpi-record', id: k.id } },
    { label: 'Collect Data…', icon: 'table', data: { action: 'kpi-collect', id: k.id } },
    { label: 'Edit KPI', icon: 'pencil', data: { action: 'kpi-edit', id: k.id } },
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
      <div class="acts"><button class="btn sm primary" type="button" data-action="kpi-record" data-id="${k.id}">${icon('plus')}Record Result</button><a class="btn sm" href="#/qms/objectives/k/${k.id}">Open KPI</a><a class="btn sm" href="#/process/${k.process}/kpis">${icon('workflow')}Open process workspace</a></div></div>`;
  };
  const kpiSel = keys => keys.length === 1
    ? `<button class="btn sm primary" type="button" data-action="kpi-record" data-id="${keys[0]}">${icon('plus')}Record Result</button><a class="btn sm" href="#/qms/objectives/k/${keys[0]}">Open KPI</a><button class="btn sm" type="button" data-action="go" data-href="#/process/${Q.S.kpis.find(k => k.id === keys[0]).process}/kpis">${icon('workflow')}Open process workspace</button>`
    : `<button class="btn sm" type="button" data-action="export-selected">${icon('download')}Export selected</button><button class="btn sm" type="button" data-action="toast" data-title="Reminder sent" data-msg="Owners of ${keys.length} KPIs were asked to record this period's values.">${icon('bell')}Ask owners for values</button>`;
  // One KPI table for the register page and the process workspace tab.
  Q.kpiTable = (id, { process = null, columns = null, where = null, initialSort, bare = false, extraTools = '', toolsEnd = '', title = 'KPIs', pageSize = 8 } = {}) => {
    const cols = (columns || Q.FIELDS.kpis.map(f => f.key)).map(k => Q.field(KT, k)).filter(Boolean)
      .filter(f => !(f.key === 'process' && process && !Q.children(process).length))
      .map(f => ({ key: f.key, label: f.key === 'process' && process ? 'Subprocess' : f.label, cls: f.cls, min: f.min, sort: f.sort, render: f.render }));
    cols.push({ key: 'actions', label: '', cls: 'c-actions c-menu', render: k => `<span class="row-menu">${kpiMenu(k)}</span>` });
    return Q.table({ id, rows: () => Q.S.kpis.filter(k => (!process || Q.inProc(k.process, process)) && (!where || where(k))), columns: cols,
      selectable: true, tight: true, noun: 'KPIs', caption: 'Objectives and KPIs', rowLabel: k => k.name, bare, pageSize, expand: kpiExpand, selectionBar: kpiSel,
      board: { title, icon: k => ({ icon: 'gauge', tone: Q.kpiOk(k) ? 'success' : 'danger' }), owner: k => k.owner },
      search: k => `${k.name} ${k.objective} ${Q.pname(k.owner)}`, ...(Q.tables[id] ? {} : { initialSort }),
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search KPIs or objectives" aria-label="Search KPIs"></div>${extraTools}${toolsEnd ? `<span class="ui-bt-sp"></span>${toolsEnd}` : ''}`,
      empty: '<h3>No KPIs match this view</h3><p>Change the view’s filters, or clear the search.</p>' });
  };
  // Record Result, Collect Data, KPI detail and the definition editor: kpi.js, kpi-ui.js, kpi-pages.js (Update 19).

  Q.viewPage(KT, { route: '#/qms/objectives', noun: 'KPIs',
    legacy: q => q.focus ? { id: 'k-all', extra: { focus: q.focus } } : q.status === 'below' ? { id: 'k-below', fallback: 'k-all' } : q.status === 'on' ? { id: 'k-on', fallback: 'k-all' } : q.process ? { group: 'process', fallback: 'k-all', extra: { p: q.process } } : null });
  Q.kpiGroupFlag = { test: k => !Q.kpiOk(k), title: 'below target' };
  Q.riskGroupFlag = { test: r => r.kind === 'Risk' && Q.riskOpen(r) && Q.riskLevel(r) === 'High', title: 'high' };
  // The saved-views card for KPIs: built once per render, used by the page header (breadcrumb) and by the component.
  function kpiCard(q) {
    const r = Q.vwResolve(KT, q);
    if (r.redirect) return { redirect: r.redirect };
    const v = r.v, where = Q.matcher(KT, v.filters);
    Q.vwRemember(KT);
    let body, leaf = null, side = '';
    if (v.group === 'process') {
      const inV = Q.S.kpis.filter(where), n = id => inV.filter(k => Q.inProc(k.process, id)).length;
      const top = Q.topProcesses(), p = Q.proc(q.p) || top.find(x => n(x.process_id)) || top[0], pid = p.process_id;
      const below = id => inV.filter(k => Q.inProc(k.process, id) && !Q.kpiOk(k)).length;
      leaf = `${p.process_code} ${p.name}`;
      // Group list outside the view card (Reports-style menu); inside the card the table looks like an ungrouped view.
      side = Q.gSide('Processes', top.map(x => ({ href: Q.vwHash(KT, v, { p: x.process_id }), on: x.process_id === pid, label: `${x.process_code} ${x.name}`, n: n(x.process_id), bad: below(x.process_id) })));
      body = Q.kpiTable(Q.vwTableId(KT, v, pid), { process: pid, columns: v.columns, where, initialSort: v.sort, bare: true, title: false,
        extraTools: Q.vwSummary(KT, v) });
    } else if (Q.vwFieldGroup(v.group)) { const g = Q.vwGrouped(KT, v, where, q, Q.kpiTable, { flag: Q.kpiGroupFlag }); leaf = g.leaf; body = g.html; side = g.side || ''; }
    else body = Q.kpiTable(Q.vwTableId(KT, v), { columns: v.columns, where, initialSort: v.sort, bare: true, extraTools: Q.vwSummary(KT, v) });
    return { v, leaf, html: Q.vwCard(KT, v, body, side) };
  }
  Q.component('kpi-views', { group: 'Objectives & processes', name: 'Objectives & KPIs register', icon: 'target', pages: ['objectives'], desc: 'The KPI register with its saved views, filters, grouping and export.',
    render: (b, ctx) => kpiCard(ctx.q).html || '', after: main => Q.vwAfter(KT, main) });
  function objectivesPage(q) {
    const k = kpiCard(q);
    if (k.redirect) { location.replace(k.redirect); return { title: 'Objectives & KPIs', nav: 'qms', html: '' }; }
    const { v, leaf } = k, plan = Q.doc('QOB-PLN-001'), objs = [...new Set(Q.S.kpis.map(x => x.objective))];
    return Q.pageView('objectives', { customize: false, title: 'Objectives & KPIs', nav: 'qms', intro: Q.themeObjectives?.() || '',
      crumbs: [['QMS', '#/qms/scope'], ['Objectives & KPIs', '#/qms/objectives?v=' + (Q.viewList(KT)[0]?.id || '')], ...(leaf ? [[v.name, Q.vwHash(KT, v)], [leaf]] : [[v.name]])],
      sub: `Quality objectives and how each process is measured against them — ISO 9001 clauses 6.2 and 9.1. ${objs.length} objectives · ${Q.S.kpis.length} KPIs.`,
      actions: `<a class="btn" href="#/qms/objectives/goals">${icon('list-checks')}Quality Objectives</a><button class="btn" type="button" data-action="open-doc" data-id="${plan.id}">${icon('file-text')}${esc(plan.title)}</button><button class="btn primary" type="button" data-action="kpi-new">${icon('plus')}Add KPI</button>` });
  }

  /* ============================== 3. Risks & Opportunities ============================== */
  const LIKE = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
  const IMP = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];
  const RESPONSE = { High: 'Treatment plan required. Process owner reviews monthly; reported to management review.', Medium: 'Treat or monitor. Reviewed quarterly by the process owner.', Low: 'Accept and monitor. Reviewed at the annual risk review.' };
  const levelOf = s => s >= 15 ? 'High' : s >= 8 ? 'Medium' : 'Low';

  /* ---------- Risks & opportunities — same saved-views design ---------- */
  const RT = 'risks';
  const LVL_KIND = { High: 'danger', Medium: 'warning', Low: 'neutral' };
  const ratingCell = r => { const l = Q.riskLevel(r); return `<span class="tnum" style="display:inline-block;width:22px;font-weight:600">${Q.riskScore(r)}</span>${Q.st(r.kind === 'Opportunity' ? l + ' benefit' : l, r.kind === 'Opportunity' ? 'info' : LVL_KIND[l])}`; };
  const RSTATUS = { 'Open': 'warning', 'In treatment': 'info', 'Monitoring': 'success', 'Evaluating': 'neutral', 'Closed': 'muted' };
  Q.RECORDS.risks = () => Q.S.risks;
  Q.FIELDS.risks = [
    { key: 'id', label: 'ID', type: 'text', cls: 'c-id', get: r => r.id, sort: r => r.id, render: r => esc(r.id) },
    { key: 'title', label: 'Risk / opportunity', type: 'text', locked: true, min: '240px', get: r => r.title, sort: r => r.title,
      render: r => `<button type="button" class="doc-link" data-expand title="Show details">${esc(r.title)}</button><span class="sub">${esc(r.treatment)}</span>` },
    { key: 'process', label: 'Process', type: 'process', get: r => r.process, sort: r => Q.proc(r.process)?.process_code, render: r => Q.pcell(r.process) },
    { key: 'kind', label: 'Type', type: 'enum', options: () => ['Risk', 'Opportunity'], get: r => r.kind, sort: r => r.kind, render: r => esc(r.kind) },
    { key: 'likelihood', label: 'Likelihood', type: 'number', cls: 'c-num', get: r => r.likelihood, sort: r => r.likelihood, render: r => r.likelihood },
    { key: 'impact', label: 'Impact', type: 'number', cls: 'c-num', get: r => r.impact, sort: r => r.impact, render: r => r.impact },
    { key: 'rating', label: 'Rating', type: 'number', get: Q.riskScore, sort: Q.riskScore, render: ratingCell },
    { key: 'level', label: 'Level', type: 'enum', options: () => ['High', 'Medium', 'Low'], get: Q.riskLevel, sort: Q.riskScore, render: r => Q.st(Q.riskLevel(r), r.kind === 'Opportunity' ? 'info' : LVL_KIND[Q.riskLevel(r)]) },
    { key: 'owner', label: 'Owner', type: 'person', get: r => r.owner, sort: r => Q.pname(r.owner), render: r => `<span class="nowrap">${esc(Q.pname(r.owner))}</span>` },
    { key: 'due', label: 'Treatment due', type: 'date', cls: 'c-date', get: r => r.due, sort: r => r.due, render: r => Q.dueDate(r.due, r.status === 'Monitoring' || r.status === 'Closed') },
    { key: 'status', label: 'Status', type: 'enum', options: () => ['Open', 'In treatment', 'Monitoring', 'Evaluating', 'Closed'], get: r => r.status, sort: r => r.status, render: r => Q.st(r.status, RSTATUS[r.status]) },
    { key: 'linked', label: 'Linked documents', type: 'number', cls: 'c-num', get: r => r.links.length, sort: r => r.links.length, render: r => r.links.length ? r.links.map(id => `<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${esc(id)}">${esc(id)}</button>`).join(', ') : '<span class="zero">—</span>' }
  ];
  const riskMenu = r => Q.menu(`Actions for ${r.id}`, [
    { label: 'Reassess…', icon: 'gauge', data: { action: 'assess-risk', id: r.id } },
    ...r.links.map(id => ({ label: `Open ${id}`, icon: 'file-text', data: { action: 'open-doc', id } })),
    '-',
    { label: 'Open process workspace', icon: 'workflow', data: { action: 'go', href: `#/process/${r.process}/risks` } },
    { label: 'Show on risk matrix', icon: 'target', data: { action: 'go', href: `#/risks/matrix?cell=${r.likelihood}x${r.impact}` } },
    ...(Q.AM?.can('create') && Q.riskOpen(r) ? ['-', { label: 'Create Audit', icon: 'search-check', data: { action: 'am-create', process: r.process, source: 'Risk', record: r.id } }] : [])
  ], { align: 'min-width:230px' });
  const riskExpand = r => `<div class="doc-exp">
      <div><h4>Treatment</h4><p>${esc(r.treatment)}</p><p style="margin-top:6px">Due ${Q.dueDate(r.due, r.status === 'Monitoring' || r.status === 'Closed')} · ${Q.st(r.status, RSTATUS[r.status])}</p></div>
      <div><h4>Rating</h4><p><b style="color:var(--text)">${Q.riskScore(r)}</b> = likelihood ${r.likelihood} × impact ${r.impact}</p><p style="margin-top:4px">${ratingCell(r)}</p></div>
      <div><h4>Linked</h4><ul><li>${Q.pcell(r.process)}</li><li>Owner ${esc(Q.pname(r.owner))}</li><li>${r.links.length ? r.links.map(id => `<button class="link-btn tnum" type="button" data-action="open-doc" data-id="${esc(id)}">${esc(id)}</button>`).join(', ') : '<span class="muted">No linked document</span>'}</li>${(Q.AM?.triggeredBy(r.id) || []).map(a => `<li>Triggered audit <a class="tnum" href="#/audits/a/${a.id}">${esc(a.id)}</a> · ${esc(a.status)}</li>`).join('')}</ul></div>
      <div class="acts"><button class="btn sm primary" type="button" data-action="assess-risk" data-id="${r.id}">${icon('gauge')}Reassess</button><a class="btn sm" href="#/risks/matrix?cell=${r.likelihood}x${r.impact}">${icon('target')}Show on matrix</a>${Q.AM?.can('create') && Q.riskOpen(r) ? `<button class="btn sm" type="button" data-action="am-create" data-process="${r.process}" data-source="Risk" data-record="${r.id}">${icon('search-check')}Create Audit</button>` : ''}</div></div>`;
  const riskSel = keys => keys.length === 1
    ? `<button class="btn sm primary" type="button" data-action="assess-risk" data-id="${keys[0]}">${icon('gauge')}Reassess</button>`
    : `<button class="btn sm" type="button" data-action="export-selected">${icon('download')}Export selected</button><button class="btn sm" type="button" data-action="toast" data-title="Reminder sent" data-msg="Owners of ${keys.length} risks were asked to update their treatment status.">${icon('bell')}Remind owners</button>`;
  Q.riskTable = (id, { process = null, columns = null, where = null, initialSort, bare = false, extraTools = '', pageSize = 0, title = '', toolsEnd = '' } = {}) => {
    const cols = (columns || ['id', 'title', 'process', 'kind', 'rating', 'owner', 'due', 'status']).map(k => Q.field(RT, k)).filter(Boolean)
      .filter(f => !(f.key === 'process' && process && !Q.children(process).length))
      .map(f => ({ key: f.key, label: f.key === 'process' && process ? 'Subprocess' : f.label, cls: f.cls, min: f.min, sort: f.sort, render: f.render }));
    cols.push({ key: 'actions', label: '', cls: 'c-actions c-menu', render: r => `<span class="row-menu">${riskMenu(r)}</span>` });
    return Q.table({ id, rows: () => Q.S.risks.filter(r => (!process || Q.inProc(r.process, process)) && (!where || where(r))), columns: cols,
      selectable: true, tight: true, noun: 'risks & opportunities', caption: 'Risks and opportunities', rowLabel: r => r.title, bare, pageSize, expand: riskExpand, selectionBar: riskSel,
      search: r => `${r.id} ${r.title} ${r.treatment} ${Q.pname(r.owner)}`, ...(Q.tables[id] ? {} : { initialSort }),
      footExtra: () => '<span style="margin-left:auto">Rating = likelihood × impact (1–5 each) · High ≥ 15 · Medium 8–12 · Low ≤ 6</span>',
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search risks & opportunities" aria-label="Search risks"></div>${extraTools}${toolsEnd ? `<span class="ui-bt-sp"></span>${toolsEnd}` : ''}`, ...(title !== '' ? { board: { title } } : {}),
      empty: '<h3>No risks or opportunities match this view</h3><p>Change the view’s filters, or clear the search.</p>' });
  };
  Q.viewPage(RT, { route: '#/risks', noun: 'risks & opportunities',
    legacy: q => q.focus ? { id: 'r-all', extra: { focus: q.focus } } : q.level === 'High' ? { id: 'r-high', fallback: 'r-all' } : q.process ? { group: 'process', fallback: 'r-all', extra: { p: q.process } } : null });
  // Process-grouped browse, shared by the Risks page (KPIs has its own equivalent).
  const riskByProcess = (v, where, q) => {
    const inV = Q.S.risks.filter(where), n = id => inV.filter(r => Q.inProc(r.process, id)).length, top = Q.topProcesses();
    const p = Q.proc(q.p) || top.find(x => n(x.process_id)) || top[0], pid = p.process_id;
    const high = id => inV.filter(r => Q.inProc(r.process, id) && r.kind === 'Risk' && Q.riskLevel(r) === 'High').length;
    return { leaf: `${p.process_code} ${p.name}`,
      side: Q.gSide('Processes', top.map(x => ({ href: Q.vwHash(RT, v, { p: x.process_id }), on: x.process_id === pid, label: `${x.process_code} ${x.name}`, n: n(x.process_id), bad: high(x.process_id) }))),
      html: Q.riskTable(Q.vwTableId(RT, v, pid), { process: pid, columns: v.columns, where, initialSort: v.sort, bare: true, title: false, extraTools: Q.vwSummary(RT, v) }) };
  };

  Q.views.risks = (parts, q) => {
    const tab = parts[0] === 'matrix' ? 'matrix' : 'register';
    const S = Q.S, open = S.risks.filter(Q.riskOpen);
    const high = open.filter(r => r.kind === 'Risk' && Q.riskLevel(r) === 'High').length;
    const head = Q.pageHead({ title: 'Risks & Opportunities', sub: `Identify, rate and treat risks and opportunities for every process — ISO 9001 clause 6.1. ${open.length} open · ${high} high.`,
      actions: `<button class="btn" type="button" data-action="open-doc" data-id="RSK-PRO-001">${icon('file-text')}Method</button><button class="btn primary" type="button" data-action="assess-risk">${icon('gauge')}Assess New Risk</button>` });
    const t = tabs([['register', 'Register', '#/risks'], ['matrix', 'Risk matrix', '#/risks/matrix', high ? `${high} high` : '']], tab, 'Risks');
    if (tab === 'register') {
      if (q.cell) { location.replace(`#/risks/matrix?cell=${q.cell}`); return { title: 'Risks & Opportunities', nav: 'risks', html: '' }; }
      const r = Q.vwResolve(RT, q);
      if (r.redirect) { location.replace(r.redirect); return { title: 'Risks & Opportunities', nav: 'risks', html: '' }; }
      const v = r.v, where = Q.matcher(RT, v.filters); Q.vwRemember(RT);
      let body, side = '';
      if (v.group === 'process') ({ html: body, side } = riskByProcess(v, where, q));
      else if (Q.vwFieldGroup(v.group)) ({ html: body, side } = Q.vwGrouped(RT, v, where, q, Q.riskTable, { flag: Q.riskGroupFlag }));
      else body = Q.riskTable(Q.vwTableId(RT, v), { columns: v.columns, where, initialSort: v.sort, bare: true, extraTools: Q.vwSummary(RT, v) });
      return { title: 'Risks & Opportunities', nav: 'risks', html: head + t + Q.vwCard(RT, v, body, side), after: main => Q.vwAfter(RT, main) };
    }
    const sel = q.cell;
    const risks = open.filter(r => r.kind === 'Risk');
    let grid = '';
    for (let l = 5; l >= 1; l--) {
      grid += `<span class="ax">${l}</span>`;
      for (let i = 1; i <= 5; i++) {
        const n = risks.filter(r => r.likelihood === l && r.impact === i).length, sc = l * i, lv = levelOf(sc);
        grid += `<button type="button" class="${{ High: 'hi', Medium: 'md', Low: 'lo' }[lv]}${n ? '' : ' empty'}" data-go="#/risks/matrix?cell=${l}x${i}" aria-pressed="${sel === `${l}x${i}`}" aria-label="Likelihood ${l} ${LIKE[l - 1]}, impact ${i} ${IMP[i - 1]}: ${n} risks, score ${sc} ${lv}"><span class="s">${sc}</span><span class="lv" aria-hidden="true">${{ High: 'H', Medium: 'M', Low: 'L' }[lv]}</span>${n || '·'}</button>`;
      }
    }
    grid += `<span></span>${[1, 2, 3, 4, 5].map(i => `<span class="ax">${i}</span>`).join('')}`;
    const inCell = sel ? risks.filter(r => `${r.likelihood}x${r.impact}` === sel) : risks.filter(r => Q.riskLevel(r) === 'High');
    const list = `<section class="panel"><div class="panel-head"><h2>${sel ? `Cell L${sel[0]} × I${sel[2]}` : 'High risks'}</h2><span class="muted small">${inCell.length}</span>${sel ? '<div class="actions"><a class="btn sm ghost" href="#/risks/matrix">Show high risks</a></div>' : ''}</div>
      ${inCell.length ? `<ul class="worklist">${inCell.map(r => `<li><div class="w-main"><div class="w-title">${esc(r.title)}</div><div class="w-meta">${esc(r.id)} · ${esc(Q.plabel(r.process))} · ${esc(Q.pname(r.owner))} · treatment due ${Q.fmt(r.due)}</div><div class="w-meta">${esc(r.treatment)}</div></div><button class="btn sm" type="button" data-action="assess-risk" data-id="${r.id}">Reassess</button></li>`).join('')}</ul>` : '<div class="empty small">No open risks in this cell.</div>'}</section>`;
    const opps = open.filter(r => r.kind === 'Opportunity');
    return { title: 'Risk matrix · Risks & Opportunities', nav: 'risks', html: head + t +
      `<div class="heat-wrap"><span class="heat-y">Likelihood →</span><div><div class="heat" role="group" aria-label="Risk matrix: likelihood by impact">${grid}</div><div class="heat-x">Impact →</div>
        <div class="legend heat-legend" style="margin-top:14px"><span><i class="heat-key hi"></i><b>H</b> High ≥ 15</span><span><i class="heat-key md"></i><b>M</b> Medium 8–12</span><span><i class="heat-key lo"></i><b>L</b> Low ≤ 6</span></div>
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
  /* Update 22 — Evidence uses the board layout of Policies: pill tabs, a Summary first (stat tiles, an
   * "Evidence health" card with completeness/readiness rings and the weakest clauses, one "Needs attention"
   * table). The other tabs keep their content. Old links keep working: ?view=clause|process|list, and
   * ?c=, ?status= or ?p= without a view open the matching tab. */
  Q.views.evidence = (_, q) => {
    const S = Q.S;
    const view = ['summary', 'clause', 'process', 'list'].includes(q.view) ? q.view
      : q.c || q.status ? 'clause' : q.p ? 'process' : q.focus ? 'list' : 'summary';
    const counts = {}; S.evidence.forEach(e => { counts[e.source.system] = (counts[e.source.system] || 0) + 1; });
    const gaps = S.evidence.filter(Q.evGap).length, iso = Q.isoScore(S.iso);
    const atRisk = iso.counts['At Risk'] + iso.counts['Missing'];
    const head = Q.pageHead({ title: 'Evidence', sub: `Records that prove the QMS works — organized by ISO 9001 subclause and by process. ${S.evidence.length} records · ${gaps} gaps.`,
      actions: `<button class="btn" type="button" data-action="toast" data-title="Export" data-msg="Evidence pack by clause would be exported to PDF for the certification body.">${icon('download')}Export Audit Pack</button>${view === 'summary' ? '' : `<button class="btn primary" type="button" data-action="link-evidence">${icon('link')}Link Evidence</button>`}` });
    const tabs = [
      { key: 'summary', label: 'Summary' },
      { key: 'clause', label: 'By ISO subclause', n: atRisk, tone: atRisk ? 'danger' : '' },
      { key: 'process', label: 'By process', n: Q.topProcesses().length },
      { key: 'list', label: 'All records', n: S.evidence.length }];
    const bar = `<div class="ev-tabbar">${Q.ui.tabs(tabs.map(t => ({ ...t, href: `#/evidence?view=${t.key}` })), view, 'Evidence views')}
      <span class="small muted ev-sources">${icon('plug')}Sources: ${Object.entries(counts).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')} · <a href="#/settings/integrations">Manage</a></span></div>`;
    let body;
    if (view === 'list') body = Q.evTable('ev', { initialSeg: q.status });
    else if (view === 'process') body = evByProcess(q.p);
    else if (view === 'clause') body = `<section class="panel" style="margin-bottom:20px"><div class="panel-head"><h2>ISO 9001 readiness</h2><span class="small muted">${esc(S.organization.standard)}</span></div><div class="panel-pad">${Q.readinessBlock(S.iso)}</div></section>` + evByClause(q.c, q.status);
    else body = evSummary();
    return { title: view === 'summary' ? 'Evidence' : `Evidence · ${tabs.find(t => t.key === view).label}`, nav: 'evidence', html: head + bar + `<div class="tab-panel" role="tabpanel">${body}</div>` };
  };

  function evSummary() {
    const S = Q.S, iso = Q.isoScore(S.iso), c = iso.counts, pct = (n, t) => t ? Math.round(n / t * 100) : 100;
    const verified = S.evidence.filter(e => e.status === 'Verified').length, pending = S.evidence.filter(e => e.status === 'Pending verification');
    const gapList = S.evidence.filter(Q.evGap), ncOpen = S.findings.filter(f => f.nc && f.nc.status !== 'Closed');
    const pOwner = r => Q.proc(r.processes[0])?.owner;
    const att = [
      ...gapList.map(e => ({ icon: 'paperclip', title: e.name, meta: `${e.id} · ${Q.plabel(e.process)} · ISO ${e.iso || '—'}`, kind: 'Evidence gap', owner: e.owner,
        action: 'link-evidence', data: { process: e.process, control: e.control, name: e.name, replace: e.id }, right: Q.ui.badge(e.status, Q.EV_KIND[e.status]), tone: e.status === 'Missing' ? 'danger' : '' })),
      ...S.iso.filter(r => ['Missing', 'At Risk'].includes(r.status)).sort((a, b) => Q.clauseSort(a.clause) < Q.clauseSort(b.clause) ? -1 : 1)
        .map(r => ({ icon: 'list-checks', title: `${r.clause} ${r.title}`, meta: r.note || `${r.processes.map(Q.plabel).join(', ')}`, kind: 'Requirement', owner: pOwner(r),
          href: `#/evidence?view=clause&c=${r.clause}`, right: Q.ui.badge(r.status, Q.ISO_KIND[r.status]), tone: r.status === 'Missing' ? 'danger' : '' })),
      ...ncOpen.map(f => { const over = Q.AM?.ncOverdue(f); return { icon: 'search-check', title: f.title, meta: `${f.nc.no || f.id} · clause ${f.clause} · ${f.nc.classification || ''}`.replace(/ · $/, ''), kind: 'Audit NC', owner: f.nc.owner, due: f.nc.due,
        href: f.nc.no ? `#/audits/nc/${f.nc.no}` : `#/audits/nc?clause=${encodeURIComponent(f.clause)}`, right: Q.ui.badge(over ? 'Overdue' : f.nc.status, over ? 'danger' : 'info'), tone: over ? 'danger' : '' }; }),
      ...pending.map(e => ({ icon: 'badge-check', title: e.name, meta: `${e.id} · ${e.source.system} · ${Q.plabel(e.process)}`, kind: 'Verification', owner: e.owner,
        href: `#/evidence?view=list&status=pending`, right: Q.ui.badge('Pending verification', 'info') })),
      ...S.documents.filter(d => Q.docRestricted(d) && Q.docIso(d).length).map(d => ({ icon: 'file-lock', title: d.title, meta: `${d.id} · ISO ${Q.docIso(d).join(', ')} · counted from the owner’s description`, kind: 'Confidential document', owner: d.owner,
        action: 'open-doc', data: { id: d.id }, right: Q.ui.badge('Description only', 'muted') }))];
    const clauseBars = Q.CLAUSES.map(([k, t]) => { const s = Q.isoScore(Q.reqsIn(k)); return { k, t, s }; }).filter(x => x.s.pct != null).sort((a, b) => a.s.pct - b.s.pct)
      .map(({ k, t, s }) => ({ label: `${k} ${t}`, pct: s.pct, value: `${s.pct}%`, note: `${s.counts['Complete']}/${s.applicable} complete`, href: `#/evidence?view=clause&c=${k}`, tone: s.pct < 50 ? 'danger' : s.pct < 85 ? 'warning' : '' }));
    return Q.ui.summary({
      stats: [
        { label: 'Evidence records', value: S.evidence.length, icon: 'paperclip', href: '#/evidence?view=list', note: `${verified} verified · ${pending.length} pending` },
        { label: 'Evidence gaps', value: gapList.length, icon: 'link', href: '#/evidence?view=list&status=gaps', tone: gapList.length ? 'danger' : null, note: 'missing or link unavailable' },
        { label: 'Requirements complete', value: `${c['Complete']}/${iso.applicable}`, icon: 'list-checks', href: '#/evidence?view=clause', tone: c['At Risk'] + c['Missing'] ? 'warning' : null, note: `${c['At Risk']} at risk · ${c['Missing']} missing` }],
      breakdown: { title: 'Evidence health', link: { href: '#/evidence?view=clause', text: 'By clause' },
        rings: { outer: { pct: pct(verified, S.evidence.length), label: 'Completeness' }, inner: { pct: iso.pct, label: 'ISO readiness', note: 'all clauses' } },
        bars: clauseBars },
      attention: att, search: 'Search evidence, requirements, NCs…', empty: 'All evidence is linked and verified.',
      action: `<button class="btn primary" type="button" data-action="link-evidence">${icon('link')}Link Evidence</button>` });
  }

  const evRows = list => list.length ? `<table class="dt tight"><thead><tr><th>Evidence</th><th>Source</th><th class="c-date">Record date</th><th>Verification</th><th class="c-actions"></th></tr></thead><tbody>${list.map(e => `<tr data-key="${esc(e.id)}"><td><span class="title">${esc(e.name)}</span><span class="sub">${esc(e.id)} · ${esc(Q.plabel(e.process))} · control: ${esc(e.control)}</span></td><td class="small"><b>${esc(e.source.system)}</b><span class="sub" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(e.source.record)}">${esc(e.source.record)}</span></td><td class="c-date">${Q.fmt(e.date)}</td><td>${Q.st(e.status, Q.EV_KIND[e.status])}</td><td class="c-actions">${Q.evGap(e) ? `<button class="btn sm" type="button" data-action="link-evidence" data-process="${e.process}" data-control="${esc(e.control)}" data-name="${esc(e.name)}" data-replace="${e.id}">${icon('link')}${e.status === 'Missing' ? 'Link' : 'Relink'}</button>` : `<button class="btn sm" type="button" data-action="toast" data-title="Open source record" data-msg="${esc(e.source.record)} would open in ${esc(e.source.system)}.">${icon('external-link')}Open</button>`}</td></tr>`).join('')}</tbody></table>` : '';
  const reqEvidence = r => [...new Map([...r.evidence.map(id => Q.S.evidence.find(e => e.id === id)).filter(Boolean), ...Q.evForClause(r.clause)].map(e => [e.id, e])).values()];
  const reqBlock = r => {
    const ev = reqEvidence(r), docs = r.controls.map(Q.doc).filter(Boolean);
    return `<section class="clause-block"><header><span class="clause">${esc(r.clause)}</span><h3>${esc(r.title)}</h3><span class="proc-chips">${r.processes.map(Q.pcell).join('')}</span>${Q.st(r.status, Q.ISO_KIND[r.status])}</header>
      ${Q.AM?.clauseAudit(r) || ''}
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
    const tree = Q.gSide('Processes', top.map(x => ({ href: `#/evidence?view=process&p=${x.process_id}`, on: x.process_id === pid, label: `${x.process_code} ${x.name}`, n: S.evidence.filter(e => Q.inProc(e.process, x.process_id)).length, bad: gaps(x.process_id) })));
    const els = p.elements.filter(e => e.ev || e.kind === 'Record' || e.kind === 'Activity');
    const elRows = els.map(e => { const ev = e.ev && S.evidence.find(x => x.id === e.ev); return `<li><span class="title">${esc(e.name)}</span><span class="kind">${esc(e.kind)}</span><span>${ev ? `${Q.st(ev.status, Q.EV_KIND[ev.status])} <span class="small muted">${esc(ev.id)} · ISO ${esc(ev.iso)}</span>` : '<span class="muted small">No evidence record expected / not yet defined</span>'}</span></li>`; }).join('');
    return `<div class="kg-page">${tree}<section class="kg-pmain">
      <div class="browse-head"><div><h2><span class="proc-code">${esc(p.process_code)}</span>${esc(p.name)}</h2><p class="sub">Owner ${esc(Q.pname(p.owner))} · ISO 9001 ${esc(p.iso.join(', '))}</p></div><div class="actions"><a class="btn sm" href="#/process/${pid}/evidence">${icon('workflow')}Open in process workspace</a><button class="btn sm primary" type="button" data-action="link-evidence" data-process="${pid}">${icon('link')}Link Evidence</button></div></div>
      ${elRows ? `<section class="panel" style="margin-bottom:20px"><div class="panel-head"><h2>Expected records</h2><span class="muted small">process elements that must leave evidence</span></div><ul class="elements">${elRows}</ul></section>` : ''}
      ${Q.evTable('ev-proc-' + pid, { process: pid })}</section></div>`;
  }

  /* 5. Internal Audit moved to the Audits module (audits.js, audit-nc.js, audit-report.js). */

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
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search decisions and actions" aria-label="Search decisions and actions"></div>${Q.seg('Status', [['open', 'Open', openMA.length], ['all', 'All', S.managementActions.length]], 'open')}`, search: a => `${a.id} ${a.title} ${a.review} ${Q.pname(a.owner)} ${Q.plabel(a.process)}`, segs: { open: a => a.status !== 'Closed' },
      columns: [
        { key: 'id', label: 'ID', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
        { key: 't', label: 'Decision / action', sort: a => a.title, render: a => `<span class="title">${esc(a.title)}</span>` },
        { key: 'r', label: 'From review', sort: a => a.review, render: a => `<span class="nowrap tnum">${esc(a.review)}</span>` },
        { key: 'p', label: 'Process', render: a => Q.pcell(a.process) },
        { key: 'o', label: 'Owner', sort: a => Q.pname(a.owner), render: a => `<span class="nowrap">${esc(Q.pname(a.owner))}</span>` },
        { key: 'd', label: 'Due', cls: 'c-date', sort: a => a.due, render: a => Q.dueDate(a.due, a.status === 'Closed') },
        { key: 's', label: 'Status', render: a => a.status === 'Closed' ? Q.st('Closed', 'muted') : a.due < Q.today() ? Q.st('Overdue', 'danger') : Q.st('Open', 'info') }],
      expand: a => `<div class="exp-kv"><div><b>Management review</b><span class="tnum">${esc(a.review)}</span></div><div><b>Process</b><a href="#/process/${esc(a.process)}">${esc(Q.plabel(a.process))}</a></div><div><b>Owner</b><span>${esc(Q.pname(a.owner))}</span></div><div><b>Due</b><span>${Q.fmt(a.due)}</span></div></div>` });
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
    const openF = S.findings.filter(f => f.status !== 'Closed');
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
      ['c6', 'Audit results', 'Audits · nonconformity register', (() => { const yr = Q.today().slice(0, 4), cur = S.audits.filter(a => a.status !== 'Draft' && (a.programme === `AP-${yr}` || (Q.AM?.startDate(a) || '').startsWith(yr))), done = cur.filter(a => ['Follow-up', 'Closed'].includes(a.status)).length, nc = S.findings.filter(f => f.nc && f.nc.status !== 'Closed'); return `<b>${done} of ${cur.length}</b> audits reported · ${nc.length} open NCs (${nc.filter(f => f.nc.classification === 'Major').length} major) · ${openF.filter(f => !f.nc).length} other open findings`; })(), S.findings.some(f => f.nc && f.nc.classification === 'Major' && f.nc.status !== 'Closed'), '#/audits'],
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
    const S = Q.S, openF = S.findings.filter(f => f.status !== 'Closed' && !f.action && !f.nc);
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
