/* iQMS — Organization chart (ISO 9001 clause 5.3), drawn from people and their reporting lines.
 * It is live: change someone's manager and the chart redraws. The controlled copy (QMS-ORG-001)
 * shows the same chart in the document viewer, and the page says when the chart has changed
 * since that copy was last published, so the change goes through document control.          */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const SEED = window.QMS_DATA;

  /* Upgrade old browser data to the realistic sample hierarchy. Earlier builds
   * sometimes stored reportsTo:null for everyone, which made the first person
   * look like the whole organization. Only fictional *.example sample people
   * are updated; customer-created people and reporting lines are preserved. */
  const ORG_SAMPLE_VERSION = 2;
  Q.S.context = Q.S.context || {};
  if ((Q.S.context.orgChartSampleVersion || 0) < ORG_SAMPLE_VERSION) {
    Object.entries(SEED.people).forEach(([id, seed]) => {
      const person = Q.S.people[id];
      if (!person || !String(person.email || '').endsWith('.example')) return;
      person.title = seed.title;
      person.dept = seed.dept;
      person.reportsTo = seed.reportsTo ?? null;
    });
    Q.S.context.orgChartSampleVersion = ORG_SAMPLE_VERSION;
    delete Q.S.context.orgChartChanged;
    Q.save();
  }

  /* ---------- Model ---------- */
  const active = () => Q.S.users.filter(u => u.status !== 'Deactivated').map(u => u.id).filter(id => Q.S.people[id]);
  const managerOf = id => { const m = Q.S.people[id]?.reportsTo; return m && active().includes(m) ? m : null; };
  const reportsOf = id => active().filter(x => managerOf(x) === id).sort((a, b) => Q.pname(a).localeCompare(Q.pname(b)));
  const descendants = id => reportsOf(id).flatMap(r => [r, ...descendants(r)]);
  const owned = id => Q.topProcesses().filter(p => p.owner === id);
  Q.orgModel = () => {
    const people = active(), tops = people.filter(id => !managerOf(id));
    // The top of the chart is whoever has no manager and the most people under them.
    const root = tops.sort((a, b) => descendants(b).length - descendants(a).length)[0] || null;
    return { root, unplaced: tops.filter(id => id !== root), count: people.length };
  };
  const qmsRep = () => Q.proc('p01')?.owner;
  const DEPT_COLORS = ['#1F6F4A', '#1F5FAD', '#6E56CF', '#B4540A', '#0E7C86', '#B43F7E', '#5E7A1F', '#8A5A2B', '#475569'];
  const deptColor = dept => { const all = [...new Set(active().map(id => Q.person(id).dept))].sort(); return DEPT_COLORS[Math.max(0, all.indexOf(dept)) % DEPT_COLORS.length]; };

  /* ---------- Rendering ---------- */
  const badge = id => {
    const out = [];
    if (id === Q.orgModel().root) out.push('<span class="oc-badge top">Top management</span>');
    if (id === qmsRep()) out.push('<span class="oc-badge">QMS representative</span>');
    return out.join('');
  };
  const node = (id, { interactive = true } = {}) => {
    const p = Q.person(id), procs = owned(id), n = descendants(id).length;
    const inner = `<span class="oc-strip" style="background:${deptColor(p.dept)}"></span>
      <span class="oc-top"><span class="avatar sm">${esc(Q.initials(id))}</span><span class="oc-id"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span></span>
      <span class="oc-meta"><span class="oc-dept">${esc(p.dept)}</span>${n ? `<span class="oc-n" title="${n} people report to ${esc(p.name)} directly or indirectly">${icon('users')}${n}</span>` : ''}</span>
      ${procs.length ? `<span class="oc-procs">${procs.map(x => `<span class="oc-proc" title="Process owner: ${esc(x.process_code + ' ' + x.name)}">${esc(x.process_code)}</span>`).join('')}</span>` : ''}
      ${badge(id)}`;
    return interactive
      ? `<button type="button" class="oc-node" data-action="oc-person" data-id="${esc(id)}" data-dept="${esc(p.dept)}" aria-label="${esc(`${p.name}, ${p.title}, ${p.dept}${procs.length ? `, owns ${procs.map(x => x.process_code).join(', ')}` : ''}. Open details`)}">${inner}</button>`
      : `<div class="oc-node" data-dept="${esc(p.dept)}">${inner}</div>`;
  };
  // Below the second level, people stack vertically so a wide team doesn't run off the page.
  const stack = (id, o) => { const r = reportsOf(id); return r.length ? `<ul class="oc-stack">${r.map(x => `<li>${node(x, o)}${stack(x, o)}</li>`).join('')}</ul>` : ''; };
  Q.orgChartHtml = (o = {}) => {
    const m = Q.orgModel(); if (!m.root) return '<div class="empty"><h3>No people yet</h3><p>Add users in Settings → Users & Access.</p></div>';
    const heads = reportsOf(m.root);
    return `<div class="oc-scroll"><div class="oc" role="tree" aria-label="Organization chart">
      <div class="oc-root">${node(m.root, o)}</div>
      ${heads.length ? `<ul class="oc-level">${heads.map(h => `<li>${node(h, o)}${stack(h, o)}</li>`).join('')}</ul>` : ''}</div></div>
      ${m.unplaced.length ? `<div class="oc-unplaced"><b>${icon('circle-help')}Not placed yet</b><span class="small muted">No manager set. Select a person to choose who they report to.</span><div class="oc-unplaced-list">${m.unplaced.map(id => node(id, o)).join('')}</div></div>` : ''}`;
  };
  // Printable layout for the controlled copy: top management, then one block per department head.
  const compactHtml = () => {
    const m = Q.orgModel(); if (!m.root) return '';
    const rows = (id, depth) => reportsOf(id).map(x => `<li style="--d:${depth}"><b>${esc(Q.pname(x))}</b><span>${esc(Q.person(x).title)}</span>${owned(x).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}</li>${rows(x, depth + 1)}`).join('');
    return `<div class="ocp"><div class="ocp-root">${node(m.root, { interactive: false })}</div><div class="ocp-grid">${reportsOf(m.root).map(h => { const p = Q.person(h); return `<section class="ocp-block" style="--c:${deptColor(p.dept)}"><header><b>${esc(p.name)}</b><span>${esc(p.title)}</span>${owned(h).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}${h === qmsRep() ? '<span class="oc-badge">QMS representative</span>' : ''}</header>${reportsOf(h).length ? `<ul>${rows(h, 0)}</ul>` : ''}</section>`; }).join('')}</div></div>`;
  };
  const listHtml = () => {
    const m = Q.orgModel(); if (!m.root) return '';
    const item = id => { const p = Q.person(id), r = reportsOf(id); return `<li><button type="button" class="oc-li" data-action="oc-person" data-id="${esc(id)}" data-dept="${esc(p.dept)}"><b>${esc(p.name)}</b><span>${esc(p.title)} · ${esc(p.dept)}</span>${owned(id).map(x => `<span class="oc-proc">${esc(x.process_code)}</span>`).join('')}</button>${r.length ? `<ul>${r.map(item).join('')}</ul>` : ''}</li>`; };
    return `<ul class="oc-list">${item(m.root)}</ul>${m.unplaced.length ? `<p class="small muted" style="margin-top:12px">Not placed yet: ${m.unplaced.map(id => esc(Q.pname(id))).join(', ')}</p>` : ''}`;
  };
  // Has a reporting line changed since the controlled copy was published?
  const staleNote = () => {
    const d = Q.doc(Q.S.context.orgChartDoc), changed = Q.S.context.orgChartChanged;
    if (!d) return '';
    if (changed && (!d.effective || changed > d.effective))
      return `<div class="callout warning oc-note">${icon('triangle-alert')}<span><b>The chart has changed since ${esc(d.id)} Rev ${esc(d.rev || '—')} was published.</b>The controlled copy still shows the old structure. Create a revision and send it for approval so the change is controlled.</span><button class="btn sm" type="button" data-action="create-revision" data-id="${esc(d.id)}">Create Revision</button></div>`;
    return `<p class="oc-ctl small muted">${icon('file-check')}Matches the controlled copy <button class="link-btn" type="button" data-action="open-doc" data-id="${esc(d.id)}">${esc(d.id)} Rev ${esc(d.rev || '—')}</button>, published ${Q.fmt(d.effective)}.</p>`;
  };

  /* ---------- Component on QMS → Organization & Scope ---------- */
  Q.component('org-chart', { group: 'Organization & context', name: 'Organization chart', icon: 'network', desc: 'Live chart of who reports to whom, with process owners and department colours (clause 5.3). Select a person to change their manager.',
    render: (b, ctx) => {
      const view = Q.UI.ocView || (matchMedia('(max-width: 720px)').matches ? 'list' : 'chart'), depts = [...new Set(active().map(id => Q.person(id).dept))].sort();
      return `<section class="panel oc-panel" id="org-chart"><div class="panel-head"><h2>${esc(ctx.title('Organization chart'))}</h2><span class="clause small muted">5.3</span><span class="muted small">${Q.orgModel().count} people</span>
        <div class="actions">${Q.seg('View', [['chart', 'Chart'], ['list', 'List']], view).replace(/data-seg=/g, 'data-oc-view=')}
          <label class="oc-filter"><span class="sr-only">Highlight department</span><select class="select" data-oc-dept><option value="">All departments</option>${depts.map(d => `<option${d === Q.UI.ocDept ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select></label></div></div>
        <div class="panel-pad${Q.UI.ocDept ? ' oc-filtering' : ''}" data-oc-host data-dept-on="${esc(Q.UI.ocDept || '')}">${staleNote()}${view === 'list' ? listHtml() : Q.orgChartHtml()}
          <p class="small muted oc-foot">Built from Settings → Users &amp; Access. Codes on a card are the processes that person owns. Deactivated users are not shown.</p></div></section>`;
    } });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-oc-view]'); if (!b) return;
    Q.UI.ocView = b.dataset.ocView; Q.saveUI(); Q.render({ noFocus: true, keepScroll: true });
    document.querySelector(`[data-oc-view="${b.dataset.ocView}"]`)?.focus();
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-oc-dept]'); if (!s) return;
    Q.UI.ocDept = s.value; Q.saveUI();
    const host = document.querySelector('[data-oc-host]'); if (!host) return;
    host.classList.toggle('oc-filtering', !!s.value);
    host.querySelectorAll('[data-dept]').forEach(n => n.classList.toggle('oc-dim', !!s.value && n.dataset.dept !== s.value));
  });
  // Apply a remembered department highlight after each render.
  const paintDept = () => { const d = Q.UI.ocDept; document.querySelectorAll('[data-oc-host] [data-dept]').forEach(n => n.classList.toggle('oc-dim', !!d && n.dataset.dept !== d)); };
  window.addEventListener('hashchange', () => setTimeout(paintDept, 0));
  const render = Q.render; Q.render = (o = {}) => { const y = scrollY; render(o); if (o.keepScroll) scrollTo(0, y); paintDept(); };

  /* ---------- Person details: change who someone reports to ---------- */
  Q.actions['oc-person'] = d => {
    const id = d.id, p = Q.person(id), u = Q.S.users.find(x => x.id === id), mgr = managerOf(id), reps = reportsOf(id), procs = owned(id);
    const blocked = new Set([id, ...descendants(id)]); // can't report to yourself or to someone under you
    const m = Q.openModal({ size: 'm', title: esc(p.name), sub: `${esc(p.title)} · ${esc(p.dept)}`,
      body: `<form class="modal-body"><dl class="dl-list dl-wide">
          <dt>Email</dt><dd>${esc(p.email || '—')}</dd>
          <dt>Role in iQMS</dt><dd>${esc(u?.role || '—')}</dd>
          <dt>Processes owned</dt><dd>${procs.length ? procs.map(x => `<a href="#/process/${x.process_id}" data-close>${esc(x.process_code + ' ' + x.name)}</a>`).join('<br>') : '<span class="muted">None</span>'}</dd>
          <dt>Direct reports</dt><dd>${reps.length ? reps.map(r => esc(Q.pname(r))).join(', ') : '<span class="muted">None</span>'}</dd></dl>
        <label class="field" style="margin-top:20px"><span>Reports to</span><select class="select" name="reportsTo"><option value="">Nobody — top of the organization</option>${active().filter(x => !blocked.has(x)).sort((a, b) => Q.pname(a).localeCompare(Q.pname(b))).map(x => `<option value="${x}"${x === mgr ? ' selected' : ''}>${esc(Q.pname(x))} — ${esc(Q.person(x).title)}</option>`).join('')}</select>
          <span class="help">People who report to ${esc(p.name.split(' ')[0])} move with them. Changing this flags the controlled copy (${esc(Q.S.context.orgChartDoc)}) for revision.</span></label></form>`,
      foot: `<button class="btn" type="button" data-action="edit-access" data-id="${esc(id)}" style="margin-right:auto">Edit Access</button><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const v = m.querySelector('[name="reportsTo"]').value || null;
      if (v === (p.reportsTo || null)) { Q.closeModal(); return; }
      Q.S.people[id].reportsTo = v; Q.S.context.orgChartChanged = Q.today(); Q.save();
      Q.audit?.('Users & access', `changed ${p.name}’s manager to ${v ? Q.pname(v) : 'nobody (top of the organization)'}`);
      Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Reporting line changed', `${p.name} → ${v ? Q.pname(v) : 'top of the organization'}`);
    });
  };

  /* ---------- The controlled copy shows the chart, not a procedure template ---------- */
  Q.orgChartPaper = (d, rev, draft) => `<article class="paper paper-wide" aria-label="Document preview">
      ${draft ? `<p class="callout warning" style="margin-bottom:18px">${icon('file-text')}<span><b>Draft for ${esc(Q.wfForDoc(d.id)?.stage || 'review')} — Rev ${esc(rev)}</b>Not a controlled copy. The active controlled version is ${d.rev ? 'Rev ' + esc(d.rev) : 'not yet published'}.</span></p>` : ''}
      <div class="paper-head"><div class="co">${esc(Q.S.organization.name)}<span>Quality Management System · ${esc(Q.plabel(Q.rootId(d.process)))}</span></div>
      <table><tr><td>Document</td><td><b>${esc(d.id)}</b></td></tr><tr><td>Revision</td><td><b>${esc(rev || '—')}</b></td></tr><tr><td>Effective</td><td>${draft ? 'On publication' : Q.fmt(d.effective)}</td></tr><tr><td>Owner</td><td>${esc(Q.pname(d.owner))}</td></tr></table></div>
      <h2>${esc(d.title)}</h2>
      <p class="small">Reporting lines, top management and process owners of ${esc(Q.S.organization.name)} (${esc(Q.standard())} clause 5.3). Responsibilities and authorities are in QMS-PRO-002 Roles &amp; Responsibilities Matrix.</p>
      <div class="paper-chart">${compactHtml()}</div>
      <p class="small muted">Approved by ${esc(Q.pname(Q.orgModel().root))}. ${draft ? '' : `Live view: <a href="#/qms/scope">QMS → Organization &amp; Scope</a>.`}</p>
      <div class="foot"><span>${esc(d.id)} · Rev ${esc(rev || '—')}</span><span>Controlled copy only when viewed in iQMS</span><span>Page 1 of 1</span></div>
    </article>`;
})();
