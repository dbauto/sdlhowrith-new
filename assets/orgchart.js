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
  /* ---------- Flow canvas (Update 20c): node cards on a dotted canvas, square connectors with handles,
   * department labels where the tree branches, pan / zoom / fit controls. One column per department head;
   * everyone under a head is chained below them in reporting order. ---------- */
  const FW = 236, FH = 82, GX = 36, GY = 46, TOP = 40;
  const chain = id => reportsOf(id).flatMap(x => [{ id: x, by: id }, ...chain(x)]);
  const fnode = (id, x, y, by, print = false) => {
    const p = Q.person(id), procs = owned(id), n = descendants(id).length, m = Q.orgModel();
    const foot = id === m.root ? `${icon('circle-check')}<span>Top management · ${m.count} people</span>`
      : by && by !== m.root ? `${icon('user-round')}<span>Reports to ${esc(Q.pname(by))}</span>`
      : procs.length ? `${icon('circle-check')}<span>Owns ${procs.map(x => esc(x.process_code)).join(' · ')}</span>`
      : `<i class="fl-dash" aria-hidden="true"></i><span>${n ? `${n} ${n === 1 ? 'person' : 'people'} in team` : 'No process owned'}</span>`;
    const tags = [id === qmsRep() ? 'QMS rep' : '', by && by !== m.root && procs.length ? procs.map(x => x.process_code).join(' · ') : ''].filter(Boolean);
    const tag = print ? 'div' : 'button';
    return `<${tag} ${print ? '' : 'type="button" '}class="fl-node${id === m.root ? ' root' : ''}" style="left:${x}px;top:${y}px;--c:${deptColor(p.dept)}" ${print ? '' : `data-action="oc-person" data-id="${esc(id)}" `}data-dept="${esc(p.dept)}"
        ${print ? '' : `aria-label="${esc(`${p.name}, ${p.title}, ${p.dept}. Open details`)}"`}>
      <span class="fl-h"><span class="fl-ic">${esc(Q.initials(id))}</span><span class="fl-t"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span>${print ? '' : `<span class="fl-more" aria-hidden="true">${icon('ellipsis')}</span>`}</span>
      <span class="fl-f">${foot}${tags.length ? `<em>${esc(tags.join(' · '))}</em>` : ''}</span>${print ? '' : '<i class="fl-hd top"></i><i class="fl-hd bot"></i>'}</${tag}>`;
  };
  Q.orgFlowHtml = ({ print = false } = {}) => {
    const m = Q.orgModel(); if (!m.root) return '<div class="empty"><h3>No people yet</h3><p>Add users in Settings → Users & Access.</p></div>';
    const heads = reportsOf(m.root), cols = Math.max(1, heads.length), W = cols * FW + (cols - 1) * GX;
    const rootX = (W - FW) / 2, rootY = TOP, busY = rootY + FH + 44, headY = busY + 44;
    const nodes = [fnode(m.root, rootX, rootY, null, print)], paths = [], labels = [], plus = [];
    let H = headY + FH;
    const cx = x => x + FW / 2;
    paths.push(`M${cx(rootX)} ${rootY + FH} V${busY}`);
    if (heads.length > 1) paths.push(`M${cx(0)} ${busY} H${cx((cols - 1) * (FW + GX))}`);
    heads.forEach((h, i) => {
      const x = i * (FW + GX); let y = headY;
      paths.push(`M${cx(x)} ${busY} V${headY}`);
      labels.push(`<span class="fl-label" style="left:${cx(x)}px;top:${busY}px;--c:${deptColor(Q.person(h).dept)}">${esc(Q.person(h).dept)}</span>`);
      nodes.push(fnode(h, x, y, null, print));
      chain(h).forEach(c => { paths.push(`M${cx(x)} ${y + FH} V${y + FH + GY}`); y += FH + GY; nodes.push(fnode(c.id, x, y, c.by, print)); });
      if (!print) paths.push(`M${cx(x)} ${y + FH} V${y + FH + 26}`);
      plus.push(`<button type="button" class="fl-plus" style="left:${cx(x)}px;top:${y + FH + 26}px" data-action="go" data-href="#/settings/users" title="Add a person to ${esc(Q.person(h).dept)}" aria-label="Add a person to ${esc(Q.person(h).dept)}">${icon('plus')}</button>`);
      H = Math.max(H, y + FH + (print ? 8 : 60));
    });
    const depts = new Set(active().map(id => Q.person(id).dept)).size;
    if (print) return { W, H, html: `<div class="fl-world" style="width:${W}px;height:${H}px"><svg class="fl-edges" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${paths.map(d => `<path d="${d}"/>`).join('')}</svg>${labels.join('')}${nodes.join('')}</div>` };
    return `<div class="fl" data-fl data-w="${W}" data-h="${H}">
      <div class="fl-bar"><span class="fl-crumb">Organization <span aria-hidden="true">›</span> <b>${esc(Q.S.organization.name)}</b></span><span class="fl-sub">${m.count} people, ${depts} departments</span></div>
      <div class="fl-vp" data-fl-vp tabindex="0" aria-label="Organization chart canvas. Drag to move, use the zoom buttons to zoom.">
        <div class="fl-world" data-fl-world style="width:${W}px;height:${H}px">
          <svg class="fl-edges" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${paths.map(d => `<path d="${d}"/>`).join('')}</svg>
          ${labels.join('')}${nodes.join('')}${plus.join('')}</div></div>
      <div class="fl-ctl" role="toolbar" aria-label="Canvas controls">
        <button type="button" data-fl-z="out" aria-label="Zoom out">${icon('zoom-out')}</button><span data-fl-pct class="tnum">100%</span><button type="button" data-fl-z="in" aria-label="Zoom in">${icon('zoom-in')}</button>
        <span class="fl-sep"></span><button type="button" data-fl-z="fit" aria-label="Fit to view" title="Fit to view">${icon('maximize')}</button></div></div>`;
  };
  // Pan (drag), zoom (buttons, Ctrl/⌘ + wheel) and fit. A drag never opens a card.
  Q.orgFlowWire = root => {
    const fl = root.querySelector('[data-fl]'); if (!fl) return;
    const vp = fl.querySelector('[data-fl-vp]'), world = fl.querySelector('[data-fl-world]'), pct = fl.querySelector('[data-fl-pct]');
    const W = +fl.dataset.w, H = +fl.dataset.h; let k = 1, tx = 0, ty = 0;
    const apply = () => { world.style.transform = `translate(${tx}px,${ty}px) scale(${k})`; pct.textContent = `${Math.round(k * 100)}%`; };
    const fit = () => { const vw = vp.clientWidth, vh = vp.clientHeight; k = Math.max(.3, Math.min(1, (vw - 48) / W, (vh - 84) / H)); tx = (vw - W * k) / 2; ty = Math.max(12, (vh - 64 - H * k) / 2); apply(); };
    const zoomAt = (nk, px = vp.clientWidth / 2, py = vp.clientHeight / 2) => { nk = Math.max(.3, Math.min(1.6, nk)); tx = px - (px - tx) * nk / k; ty = py - (py - ty) * nk / k; k = nk; apply(); };
    // Size the canvas to the chart at a readable zoom, then fit.
    const vw = vp.clientWidth, kk = Math.max(.55, Math.min(1, (vw - 48) / W)); vp.style.height = `${Math.min(860, Math.max(420, H * kk + 110))}px`; fit();
    fl.querySelector('.fl-ctl').addEventListener('click', e => { const b = e.target.closest('[data-fl-z]'); if (!b) return; const z = b.dataset.flZ; z === 'fit' ? fit() : zoomAt(k * (z === 'in' ? 1.2 : 1 / 1.2)); });
    vp.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const r = vp.getBoundingClientRect(); zoomAt(k * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    let drag = null, moved = false;
    vp.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, tx, ty }; moved = false; });
    window.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!moved && Math.hypot(dx, dy) < 4) return; moved = true; vp.classList.add('grabbing'); tx = drag.tx + dx; ty = drag.ty + dy; apply(); });
    window.addEventListener('pointerup', () => { drag = null; vp.classList.remove('grabbing'); });
    vp.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    vp.addEventListener('keydown', e => { const st = 40, m = { ArrowLeft: [st, 0], ArrowRight: [-st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key]; if (m && e.target === vp) { e.preventDefault(); tx += m[0]; ty += m[1]; apply(); } if ((e.key === '+' || e.key === '=') && e.target === vp) zoomAt(k * 1.2); if (e.key === '-' && e.target === vp) zoomAt(k / 1.2); });
  };
  // Printable layout for the controlled copy: top management, then one block per department head.
  const compactHtml = () => {
    const m = Q.orgModel(); if (!m.root) return '';
    const rows = (id, depth) => reportsOf(id).map(x => `<li style="--d:${depth}"><b>${esc(Q.pname(x))}</b><span>${esc(Q.person(x).title)}</span>${owned(x).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}</li>${rows(x, depth + 1)}`).join('');
    return `<div class="ocp"><div class="ocp-root">${node(m.root, { interactive: false })}</div><div class="ocp-grid">${reportsOf(m.root).map(h => { const p = Q.person(h); return `<section class="ocp-block" style="--c:${deptColor(p.dept)}"><header><span class="avatar sm">${esc(Q.initials(h))}</span><span class="ocp-person"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span><span class="ocp-codes">${owned(h).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}</span>${h === qmsRep() ? '<span class="oc-badge">QMS representative</span>' : ''}</header>${reportsOf(h).length ? `<ul>${rows(h, 0)}</ul>` : '<p class="ocp-empty">No direct reports</p>'}<footer>${esc(p.dept)}</footer></section>`; }).join('')}</div></div>`;
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
        <div class="actions"><button class="btn sm" type="button" data-action="oc-print" title="Print the chart on one landscape page">${icon('file-down')}Print</button>${Q.seg('View', [['chart', 'Chart'], ['list', 'List']], view).replace(/data-seg=/g, 'data-oc-view=')}
          <label class="oc-filter"><span class="sr-only">Highlight department</span><select class="select" data-oc-dept><option value="">All departments</option>${depts.map(d => `<option${d === Q.UI.ocDept ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select></label></div></div>
        <div class="panel-pad${Q.UI.ocDept ? ' oc-filtering' : ''}" data-oc-host data-dept-on="${esc(Q.UI.ocDept || '')}">${staleNote()}${view === 'list' ? listHtml() : Q.orgFlowHtml() + unplacedHtml()}
          <p class="small muted oc-foot">Drag the canvas to move around; use the controls or Ctrl + scroll to zoom. Built from Settings → Users &amp; Access. Codes on a card are the processes that person owns. Deactivated users are not shown.</p></div></section>`;
    }, after: main => Q.orgFlowWire(main) });
  const unplacedHtml = () => { const m = Q.orgModel(); return m.unplaced.length ? `<div class="oc-unplaced"><b>${icon('circle-help')}Not placed yet</b><span class="small muted">No manager set. Select a person to choose who they report to.</span><div class="oc-unplaced-list">${m.unplaced.map(id => node(id)).join('')}</div></div>` : ''; };
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

  /* ---------- Print: the same layout as a static diagram on one A4 landscape page ----------
   * No menus, handles, add buttons, canvas dots or controls; scaled to fit; document header and footer. */
  Q.actions['oc-print'] = () => {
    const f = Q.orgFlowHtml({ print: true }); if (!f.W) { window.print(); return; }
    const d = Q.doc(Q.S.context.orgChartDoc), org = Q.S.organization, m = Q.orgModel();
    const PW = 1040, PH = 610, k = Math.min(1, PW / f.W, PH / f.H); // printable area of A4 landscape at 10 mm margins, less header and footer
    document.querySelector('.oc-print-sheet')?.remove();
    const sheet = document.createElement('div'); sheet.className = 'oc-print-sheet';
    sheet.innerHTML = `<header class="ocs-head"><div><b>${esc(org.name)}</b><span>Organization Chart · ${esc(Q.standard())} clause 5.3</span></div>
        <table><tr><td>Document</td><td><b>${esc(d?.id || '—')}</b></td><td>Revision</td><td><b>${esc(d?.rev || '—')}</b></td></tr><tr><td>Printed</td><td>${Q.fmt(Q.today())}</td><td>People</td><td>${m.count}</td></tr></table></header>
      <div class="ocs-chart" style="width:${f.W * k}px;height:${f.H * k}px"><div class="ocs-scale" style="transform:scale(${k})">${f.html}</div></div>
      <footer class="ocs-foot"><span>Codes on a card are the processes that person owns.</span><span>${Q.S.context.orgChartChanged && d?.effective && Q.S.context.orgChartChanged > d.effective ? 'Live chart — differs from the controlled copy' : 'Uncontrolled when printed'}</span></footer>`;
    document.body.appendChild(sheet);
    const page = document.createElement('style'); page.id = 'oc-page'; page.textContent = '@page { size: A4 landscape; margin: 10mm; }'; document.head.appendChild(page);
    document.body.classList.add('print-oc'); Q.refreshIcons();
    const done = () => { document.body.classList.remove('print-oc'); sheet.remove(); page.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };

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
