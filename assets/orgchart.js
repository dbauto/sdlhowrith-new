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

  /* ---------- Model ----------
   * The chart holds two kinds of people: iQMS users (Q.S.people, with an account in Q.S.users) and
   * people who are only on the chart (Q.S.orgMembers — no login, not offered as owners or assignees).
   * Both carry reportsTo; anyone can have any number of direct reports. */
  const OM = () => (Q.S.orgMembers = Q.S.orgMembers || {});
  const isUser = id => Q.S.users.some(u => u.id === id);
  const P = id => Q.S.people[id] || OM()[id] || Q.person(id);
  const NM = id => id ? P(id).name : '—';
  const INI = id => NM(id).split(/\s+/).map(x => x[0] || '').slice(0, 2).join('').toUpperCase();
  const active = () => [...Q.S.users.filter(u => u.status !== 'Deactivated').map(u => u.id).filter(id => Q.S.people[id]), ...Object.keys(OM())];
  const managerOf = id => { const m = P(id)?.reportsTo; return m && active().includes(m) ? m : null; };
  const reportsOf = id => active().filter(x => managerOf(x) === id).sort((a, b) => NM(a).localeCompare(NM(b)));
  const descendants = id => reportsOf(id).flatMap(r => [r, ...descendants(r)]);
  Q.orgPerson = P; Q.orgName = NM;
  // Sample chart-only people (installers and an assistant) so the demo shows non-users and several direct reports.
  if (!Q.S.context?.orgMembersSeeded) {
    Object.assign(OM(), {
      'om-rico': { name: 'Rico Manalo', title: 'Solar Installer', dept: 'Operations', reportsTo: 'jun' },
      'om-lyn': { name: 'Lyn Bautista', title: 'Solar Installer', dept: 'Operations', reportsTo: 'jun' },
      'om-dan': { name: 'Dan Ocampo', title: 'Installer Helper', dept: 'Operations', reportsTo: 'jun' },
      'om-ella': { name: 'Ella Cruz', title: 'Admin Assistant', dept: 'People & Administration', reportsTo: 'rosa' }
    });
    Q.S.context = Q.S.context || {}; Q.S.context.orgMembersSeeded = true; Q.save();
  }
  const owned = id => Q.topProcesses().filter(p => p.owner === id);
  Q.orgModel = () => {
    const people = active(), tops = people.filter(id => !managerOf(id));
    // The top of the chart is whoever has no manager and the most people under them.
    const root = tops.sort((a, b) => descendants(b).length - descendants(a).length)[0] || null;
    return { root, unplaced: tops.filter(id => id !== root), count: people.length };
  };
  const qmsRep = () => Q.proc('p01')?.owner;
  const DEPT_COLORS = ['#1F6F4A', '#1F5FAD', '#6E56CF', '#B4540A', '#0E7C86', '#B43F7E', '#5E7A1F', '#8A5A2B', '#475569'];
  const deptColor = dept => { const all = [...new Set(active().map(id => P(id).dept))].sort(); return DEPT_COLORS[Math.max(0, all.indexOf(dept)) % DEPT_COLORS.length]; };

  /* ---------- Rendering ---------- */
  const badge = id => {
    const out = [];
    if (id === Q.orgModel().root) out.push('<span class="oc-badge top">Top management</span>');
    if (id === qmsRep()) out.push('<span class="oc-badge">QMS representative</span>');
    return out.join('');
  };
  const node = (id, { interactive = true } = {}) => {
    const p = P(id), procs = owned(id), n = descendants(id).length;
    const inner = `<span class="oc-strip" style="background:${deptColor(p.dept)}"></span>
      <span class="oc-top"><span class="avatar sm">${esc(INI(id))}</span><span class="oc-id"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span></span>
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
  /* ---------- Flow canvas (Update 20c/d): node cards on a dotted canvas, square connectors with handles,
   * department labels where the tree branches, pan / zoom / fit controls.
   * Layout is a real tree: a manager's direct reports each get their own connector.
   *   tree  — reports that have teams of their own sit side by side under a bus line;
   *   stack — reports without teams are listed under the manager on a rail with one elbow each (keeps the chart narrow);
   *   leaf  — nobody reports to this person. ---------- */
  const FW = 236, FH = 82, GX = 32, GY = 46, GYT = 76, IND = 30, GS = 18, TOP = 40;
  const fnode = (id, x, y, { by = null, side = false, print = false, rail = false, leaf = false } = {}) => {
    const p = P(id), procs = owned(id), n = descendants(id).length, m = Q.orgModel(), user = isUser(id);
    const foot = id === m.root ? `${icon('circle-check')}<span>Top management · ${m.count} people</span>`
      : !user ? `${icon('user-round')}<span>${by && by !== m.root ? `Reports to ${esc(NM(by))}` : 'Not an iQMS user'}</span>`
      : procs.length ? `${icon('circle-check')}<span>Owns ${procs.map(x => esc(x.process_code)).join(' · ')}</span>`
      : by && by !== m.root ? `${icon('user-round')}<span>Reports to ${esc(NM(by))}</span>`
      : `<i class="fl-dash" aria-hidden="true"></i><span>${n ? `${n} ${n === 1 ? 'person' : 'people'} in team` : 'No process owned'}</span>`;
    const tags = [id === qmsRep() ? 'QMS rep' : '', !user ? 'No login' : '', n && id !== m.root ? `${reportsOf(id).length} direct` : ''].filter(Boolean);
    const tag = print ? 'div' : 'button';
    const card = `<${tag} ${print ? '' : 'type="button" '}class="fl-node${id === m.root ? ' root' : ''}${user ? '' : ' guest'}" style="--c:${deptColor(p.dept)}" ${print ? '' : `data-action="oc-person" data-id="${esc(id)}" `}data-dept="${esc(p.dept)}"
        ${print ? '' : `aria-label="${esc(`${p.name}, ${p.title}, ${p.dept}${user ? '' : ', not an iQMS user'}. Open details`)}"`}>
      <span class="fl-h"><span class="fl-ic">${esc(INI(id))}</span><span class="fl-t"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span>${print ? '' : `<span class="fl-more" aria-hidden="true">${icon('ellipsis')}</span>`}</span>
      <span class="fl-f">${foot}${tags.length ? `<em>${esc(tags.join(' · '))}</em>` : ''}</span>${print ? '' : `${side ? '<i class="fl-hd left"></i>' : id === m.root ? '' : '<i class="fl-hd top"></i>'}${leaf ? '' : `<i class="fl-hd bot${rail ? ' rail' : ''}"></i>`}`}</${tag}>`;
    return `<div class="fl-item" style="left:${x}px;top:${y}px">${card}${print ? '' : `<button type="button" class="fl-add" data-action="oc-add" data-manager="${esc(id)}" title="Add a direct report to ${esc(p.name)}" aria-label="Add a direct report to ${esc(p.name)}">${icon('plus')}</button>`}</div>`;
  };
  const measure = (id, isRoot = false) => {
    const kids = reportsOf(id), sub = kids.map(k => measure(k));
    if (!kids.length) return { id, mode: 'leaf', w: FW, h: FH, kids: [] };
    // Below the top person, teams are listed under their manager on a rail (nested one step per level).
    if (!isRoot) return { id, mode: 'stack', w: Math.max(FW, IND + Math.max(...sub.map(c => c.w))), h: FH + sub.reduce((t, c) => t + GS + c.h, 0), kids: sub };
    const w = Math.max(FW, sub.reduce((t, c) => t + c.w, 0) + GX * (sub.length - 1));
    return { id, mode: 'tree', w, h: FH + GYT + 12 + Math.max(...sub.map(c => c.h)), kids: sub };
  };
  const cardX = (b, x) => b.mode === 'tree' ? x + (b.w - FW) / 2 : x;
  const layout = (b, x, y, out, { by = null, side = false, isRoot = false, print = false } = {}) => {
    const px = cardX(b, x), pcx = px + FW / 2;
    out.nodes.push(fnode(b.id, px, y, { by, side, print, rail: b.mode === 'stack', leaf: b.mode === 'leaf' }));
    if (b.mode === 'stack') {
      const rx = x + 14; let cy = y + FH + GS, last = cy;
      b.kids.forEach(c => { last = cy + FH / 2; out.paths.push(`M${rx} ${last} H${x + IND}`); layout(c, x + IND, cy, out, { by: b.id, side: true, print }); cy += c.h + GS; });
      out.paths.push(`M${rx} ${y + FH} V${last}`);
    } else if (b.mode === 'tree') {
      const gap = isRoot ? GYT + 12 : GY + 20, busY = y + FH + gap / 2, cy = y + FH + gap;
      let cx = x + (b.w - (b.kids.reduce((t, c) => t + c.w, 0) + GX * (b.kids.length - 1))) / 2;
      const centers = b.kids.map(c => { const at = cx; cx += c.w + GX; return { c, at, mid: cardX(c, at) + FW / 2 }; });
      out.paths.push(`M${pcx} ${y + FH} V${busY}`);
      if (centers.length > 1) out.paths.push(`M${Math.min(...centers.map(k => k.mid))} ${busY} H${Math.max(...centers.map(k => k.mid))}`);
      centers.forEach(({ c, at, mid }) => {
        out.paths.push(`M${mid} ${busY} V${cy}`);
        if (isRoot) out.labels.push(`<span class="fl-label" style="left:${mid}px;top:${busY}px;--c:${deptColor(P(c.id).dept)}">${esc(P(c.id).dept)}</span>`);
        layout(c, at, cy, out, { by: b.id, print });
      });
    }
  };
  Q.orgFlowHtml = ({ print = false } = {}) => {
    const m = Q.orgModel(); if (!m.root) return print ? { W: 0, H: 0, html: '' } : `<div class="empty"><h3>No people yet</h3><p>Add people with <b>Add Person</b>, or add users in Settings → Users & Access.</p></div>`;
    const tree = measure(m.root, true), W = tree.w, H = TOP + tree.h + (print ? 8 : 48), out = { nodes: [], paths: [], labels: [] };
    layout(tree, 0, TOP, out, { isRoot: true, print });
    const svg = `<svg class="fl-edges" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${out.paths.map(d => `<path d="${d}"/>`).join('')}</svg>`;
    if (print) return { W, H, html: `<div class="fl-world" style="width:${W}px;height:${H}px">${svg}${out.labels.join('')}${out.nodes.join('')}</div>` };
    const depts = new Set(active().map(id => P(id).dept)).size, guests = active().filter(id => !isUser(id)).length;
    return `<div class="fl" data-fl data-w="${W}" data-h="${H}">
      <div class="fl-bar"><span class="fl-crumb">Organization <span aria-hidden="true">›</span> <b>${esc(Q.S.organization.name)}</b></span><span class="fl-sub">${m.count} people · ${depts} departments${guests ? ` · ${guests} not iQMS users` : ''}</span>
        <button class="btn sm primary fl-addbtn" type="button" data-action="oc-add">${icon('user-plus')}Add Person</button></div>
      <div class="fl-vp" data-fl-vp tabindex="0" aria-label="Organization chart canvas. Drag to move, use the zoom buttons to zoom.">
        <div class="fl-world" data-fl-world style="width:${W}px;height:${H}px">${svg}${out.labels.join('')}${out.nodes.join('')}</div></div>
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
    const rows = (id, depth) => reportsOf(id).map(x => `<li style="--d:${depth}"><b>${esc(NM(x))}</b><span>${esc(P(x).title)}</span>${owned(x).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}</li>${rows(x, depth + 1)}`).join('');
    return `<div class="ocp"><div class="ocp-root">${node(m.root, { interactive: false })}</div><div class="ocp-grid">${reportsOf(m.root).map(h => { const p = P(h); return `<section class="ocp-block" style="--c:${deptColor(p.dept)}"><header><span class="avatar sm">${esc(INI(h))}</span><span class="ocp-person"><b>${esc(p.name)}</b><span>${esc(p.title)}</span></span><span class="ocp-codes">${owned(h).map(pr => `<span class="oc-proc">${esc(pr.process_code)}</span>`).join('')}</span>${h === qmsRep() ? '<span class="oc-badge">QMS representative</span>' : ''}</header>${reportsOf(h).length ? `<ul>${rows(h, 0)}</ul>` : '<p class="ocp-empty">No direct reports</p>'}<footer>${esc(p.dept)}</footer></section>`; }).join('')}</div></div>`;
  };
  const listHtml = () => {
    const m = Q.orgModel(); if (!m.root) return '';
    const item = id => { const p = P(id), r = reportsOf(id); return `<li><button type="button" class="oc-li" data-action="oc-person" data-id="${esc(id)}" data-dept="${esc(p.dept)}"><b>${esc(p.name)}</b><span>${esc(p.title)} · ${esc(p.dept)}</span>${owned(id).map(x => `<span class="oc-proc">${esc(x.process_code)}</span>`).join('')}</button>${r.length ? `<ul>${r.map(item).join('')}</ul>` : ''}</li>`; };
    return `<ul class="oc-list">${item(m.root)}</ul>${m.unplaced.length ? `<p class="small muted" style="margin-top:12px">Not placed yet: ${m.unplaced.map(id => esc(NM(id))).join(', ')}</p>` : ''}`;
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
      const view = Q.UI.ocView || (matchMedia('(max-width: 720px)').matches ? 'list' : 'chart'), depts = [...new Set(active().map(id => P(id).dept))].sort();
      return `<section class="panel oc-panel" id="org-chart"><div class="panel-head"><h2>${esc(ctx.title('Organization chart'))}</h2><span class="clause small muted">5.3</span><span class="muted small">${Q.orgModel().count} people</span>
        <div class="actions"><button class="btn sm" type="button" data-action="oc-print" title="Print the chart on one landscape page">${icon('file-down')}Print</button>${Q.seg('View', [['chart', 'Chart'], ['list', 'List']], view).replace(/data-seg=/g, 'data-oc-view=')}
          <label class="oc-filter"><span class="sr-only">Highlight department</span><select class="select" data-oc-dept><option value="">All departments</option>${depts.map(d => `<option${d === Q.UI.ocDept ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select></label></div></div>
        <div class="panel-pad${Q.UI.ocDept ? ' oc-filtering' : ''}" data-oc-host data-dept-on="${esc(Q.UI.ocDept || '')}">${staleNote()}${view === 'list' ? listHtml() : Q.orgFlowHtml() + unplacedHtml()}
          <p class="small muted oc-foot">Drag the canvas to move around; use the controls or Ctrl + scroll to zoom. Hover a card and press + to add a direct report — people on the chart don’t need an iQMS login (dashed cards). Users come from Settings → Users &amp; Access. Codes on a card are the processes that person owns. Deactivated users are not shown.</p></div></section>`;
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
    document.querySelector('.oc-print-sheet')?.remove(); document.getElementById('oc-page')?.remove();
    const sheet = document.createElement('div'); sheet.className = 'oc-print-sheet measuring';
    sheet.innerHTML = `<header class="ocs-head"><div><b>${esc(org.name)}</b><span>Organization Chart · ${esc(Q.standard())} clause 5.3</span></div>
        <table><tr><td>Document</td><td><b>${esc(d?.id || '—')}</b></td><td>Revision</td><td><b>${esc(d?.rev || '—')}</b></td></tr><tr><td>Printed</td><td>${Q.fmt(Q.today())}</td><td>People</td><td>${m.count}</td></tr></table></header>
      <div class="ocs-area"><div class="ocs-chart"><div class="ocs-scale">${f.html}</div></div></div>
      <footer class="ocs-foot"><span>Codes on a card are the processes that person owns. Dashed cards: not an iQMS user.</span><span>${Q.S.context.orgChartChanged && d?.effective && Q.S.context.orgChartChanged > d.effective ? 'Live chart — differs from the controlled copy' : 'Uncontrolled when printed'}</span></footer>`;
    document.body.appendChild(sheet); Q.refreshIcons();
    // Always one page: measure the space left for the chart on A4 (10 mm margins) in both orientations
    // and use the one that prints the chart larger. The sheet is locked to the page size, so nothing can spill over.
    const PAGE = { landscape: [277, 190], portrait: [190, 277] }, area = sheet.querySelector('.ocs-area');
    const fitFor = o => { sheet.style.width = `${PAGE[o][0]}mm`; sheet.style.height = `${PAGE[o][1]}mm`; return Math.min(1, (area.clientWidth - 2) / f.W, (area.clientHeight - 2) / f.H); };
    const kl = fitFor('landscape'), kp = fitFor('portrait'), orient = kp > kl * 1.05 ? 'portrait' : 'landscape', k = fitFor(orient);
    const chart = sheet.querySelector('.ocs-chart'); chart.style.width = `${f.W * k}px`; chart.style.height = `${f.H * k}px`; sheet.querySelector('.ocs-scale').style.transform = `scale(${k})`;
    sheet.classList.remove('measuring'); sheet.dataset.orient = orient; sheet.dataset.scale = k.toFixed(3);
    const page = document.createElement('style'); page.id = 'oc-page'; page.textContent = `@page { size: A4 ${orient}; margin: 10mm; }`; document.head.appendChild(page);
    document.body.classList.add('print-oc');
    const done = () => { document.body.classList.remove('print-oc'); sheet.remove(); page.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };

  const changed = what => { Q.S.context.orgChartChanged = Q.today(); Q.save(); Q.audit?.('Organization chart', what); };
  const depts = () => [...new Set([...active().map(id => P(id).dept), ...(Q.departments?.() || [])].filter(Boolean))].sort();
  const mgrOptions = (selected, blocked = new Set()) => `<option value="">Nobody — top of the organization</option>${active().filter(x => !blocked.has(x)).sort((a, b) => NM(a).localeCompare(NM(b))).map(x => `<option value="${x}"${x === selected ? ' selected' : ''}>${esc(NM(x))} — ${esc(P(x).title)}${isUser(x) ? '' : ' (no login)'}</option>`).join('')}`;
  const personFields = (p = {}) => `<div class="form-grid">
      <label class="field"><span>Full name <span class="req">*</span></span><input class="input" name="name" required value="${esc(p.name || '')}" autocomplete="off"></label>
      <label class="field"><span>Job title <span class="req">*</span></span><input class="input" name="title" required value="${esc(p.title || '')}" autocomplete="off"></label>
      <label class="field"><span>Department <span class="req">*</span></span><input class="input" name="dept" required list="oc-depts" value="${esc(p.dept || '')}" autocomplete="off"><datalist id="oc-depts">${depts().map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
      <label class="field"><span>Email</span><input class="input" name="email" type="email" value="${esc(p.email || '')}" placeholder="Optional"></label></div>`;

  /* ---------- Add a person: someone who is not an iQMS user, or connect an existing user ---------- */
  Q.actions['oc-add'] = d => {
    const mgr = d.manager && active().includes(d.manager) ? d.manager : '';
    const free = Q.S.users.filter(u => u.status !== 'Deactivated' && Q.S.people[u.id] && u.id !== mgr && !(mgr && [mgr, ...ancestors(mgr)].includes(u.id)));
    const m = Q.openModal({ size: 'm', title: mgr ? `Add a direct report to ${esc(NM(mgr))}` : 'Add person to the chart',
      sub: 'People on the chart do not need an iQMS account. A manager can have any number of direct reports.',
      body: `<form class="modal-body"><fieldset class="fieldset"><legend class="sr-only">Who</legend><div class="radio-stack">
          <label class="radio"><input type="radio" name="kind" value="new" checked><span><b>Someone without an iQMS account</b><span>Shown on the chart only. Not offered as a document owner, auditor or assignee.</span></span></label>
          <label class="radio"><input type="radio" name="kind" value="user"><span><b>An existing iQMS user</b><span>Moves that user (and their team) under the manager below.</span></span></label></div></fieldset>
        <div data-k="new" style="margin-top:16px">${personFields({ dept: mgr ? P(mgr).dept : '' })}</div>
        <div data-k="user" hidden style="margin-top:16px"><label class="field"><span>User <span class="req">*</span></span><select class="select" name="user"><option value="">Choose a user…</option>${free.sort((a, b) => NM(a.id).localeCompare(NM(b.id))).map(u => `<option value="${u.id}">${esc(NM(u.id))} — ${esc(P(u.id).title)}${managerOf(u.id) ? ` (now under ${esc(NM(managerOf(u.id)))})` : ''}</option>`).join('')}</select></label></div>
        <label class="field" style="margin-top:16px"><span>Reports to</span><select class="select" name="reportsTo">${mgrOptions(mgr)}</select></label></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${icon('user-plus')}Add to Chart</button>` });
    const kind = () => m.querySelector('[name="kind"]:checked').value;
    m.querySelectorAll('[name="kind"]').forEach(r => r.addEventListener('change', () => { m.querySelectorAll('[data-k]').forEach(x => { x.hidden = x.dataset.k !== kind(); }); }));
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'), v = Q.formValues(f), to = v.reportsTo || null;
      if (kind() === 'new') {
        const box = m.querySelector('[data-k="new"]'); if (!Q.validate(box)) return;
        const id = 'om-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        OM()[id] = { name: v.name.trim(), title: v.title.trim(), dept: v.dept.trim(), email: (v.email || '').trim(), reportsTo: to };
        changed(`added ${v.name.trim()} (no iQMS account)${to ? ` reporting to ${NM(to)}` : ''}`);
        Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Added to the chart', `${v.name.trim()}${to ? ` → reports to ${NM(to)}` : ''}`);
      } else {
        if (!v.user) { Q.toast('Choose a user', 'Pick the user to place under this manager.'); return; }
        if (to && [v.user, ...descendants(v.user)].includes(to)) { Q.toast('Not possible', `${NM(v.user)} cannot report to someone in their own team.`); return; }
        P(v.user).reportsTo = to; changed(`moved ${NM(v.user)} to report to ${to ? NM(to) : 'nobody'}`);
        Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Reporting line changed', `${NM(v.user)} → ${to ? NM(to) : 'top of the organization'}`);
      }
    });
  };
  const ancestors = id => { const out = []; let x = managerOf(id); while (x && !out.includes(x)) { out.push(x); x = managerOf(x); } return out; };

  /* ---------- Person details: reporting line for everyone; name, title and department for chart-only people ---------- */
  Q.actions['oc-person'] = d => {
    const id = d.id, p = P(id), u = Q.S.users.find(x => x.id === id), guest = !u, mgr = managerOf(id), reps = reportsOf(id), procs = owned(id);
    const blocked = new Set([id, ...descendants(id)]); // can't report to yourself or to someone under you
    const m = Q.openModal({ size: 'm', title: esc(p.name), sub: `${esc(p.title)} · ${esc(p.dept)}${guest ? ' · not an iQMS user' : ''}`,
      body: `<form class="modal-body">${guest ? personFields(p) : `<dl class="dl-list dl-wide">
          <dt>Email</dt><dd>${esc(p.email || '—')}</dd>
          <dt>Role in iQMS</dt><dd>${esc(u?.role || '—')}</dd>
          <dt>Processes owned</dt><dd>${procs.length ? procs.map(x => `<a href="#/process/${x.process_id}" data-close>${esc(x.process_code + ' ' + x.name)}</a>`).join('<br>') : '<span class="muted">None</span>'}</dd></dl>`}
        <dl class="dl-list dl-wide" style="margin-top:12px"><dt>Direct reports</dt><dd>${reps.length ? reps.map(r => esc(NM(r))).join(', ') : '<span class="muted">None</span>'}</dd></dl>
        <label class="field" style="margin-top:16px"><span>Reports to</span><select class="select" name="reportsTo">${mgrOptions(mgr, blocked)}</select>
          <span class="help">People who report to ${esc(p.name.split(' ')[0])} move with them. Changes flag the controlled copy (${esc(Q.S.context.orgChartDoc)}) for revision.</span></label></form>`,
      foot: `${guest ? `<button class="btn danger" type="button" data-rm style="margin-right:auto">${icon('trash-2')}Remove from Chart</button>` : `<button class="btn" type="button" data-action="edit-access" data-id="${esc(id)}" style="margin-right:auto">Edit Access</button>`}
        <button class="btn" type="button" data-action="oc-add" data-manager="${esc(id)}">${icon('user-plus')}Add Direct Report</button><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'), v = Q.formValues(f), to = v.reportsTo || null;
      if (guest) {
        if (!Q.validate(f)) return;
        Object.assign(OM()[id], { name: v.name.trim(), title: v.title.trim(), dept: v.dept.trim(), email: (v.email || '').trim(), reportsTo: to });
        changed(`updated ${v.name.trim()} on the organization chart`);
        Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Saved', v.name.trim()); return;
      }
      if (to === (p.reportsTo || null)) { Q.closeModal(); return; }
      P(id).reportsTo = to; changed(`changed ${p.name}’s manager to ${to ? NM(to) : 'nobody (top of the organization)'}`);
      Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Reporting line changed', `${p.name} → ${to ? NM(to) : 'top of the organization'}`);
    });
    m.querySelector('[data-rm]')?.addEventListener('click', () => Q.confirm({ title: `Remove ${esc(p.name)} from the chart?`,
      body: `<p>${reps.length ? `Their ${reps.length} direct report${reps.length === 1 ? '' : 's'} will report to ${esc(mgr ? NM(mgr) : 'nobody (top of the organization)')} instead.` : 'They have no direct reports.'}</p>`, confirm: 'Remove', danger: true,
      onConfirm: () => { reps.forEach(r => { P(r).reportsTo = mgr; }); delete OM()[id]; changed(`removed ${p.name} from the organization chart`); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Removed from the chart', p.name); } }));
  };

  /* ---------- The controlled copy shows the chart, not a procedure template ---------- */
  Q.orgChartPaper = (d, rev, draft) => `<article class="paper paper-wide" aria-label="Document preview">
      ${draft ? `<p class="callout warning" style="margin-bottom:18px">${icon('file-text')}<span><b>Draft for ${esc(Q.wfForDoc(d.id)?.stage || 'review')} — Rev ${esc(rev)}</b>Not a controlled copy. The active controlled version is ${d.rev ? 'Rev ' + esc(d.rev) : 'not yet published'}.</span></p>` : ''}
      <div class="paper-head"><div class="co">${esc(Q.S.organization.name)}<span>Quality Management System · ${esc(Q.plabel(Q.rootId(d.process)))}</span></div>
      <table><tr><td>Document</td><td><b>${esc(d.id)}</b></td></tr><tr><td>Revision</td><td><b>${esc(rev || '—')}</b></td></tr><tr><td>Effective</td><td>${draft ? 'On publication' : Q.fmt(d.effective)}</td></tr><tr><td>Owner</td><td>${esc(NM(d.owner))}</td></tr></table></div>
      <h2>${esc(d.title)}</h2>
      <p class="small">Reporting lines, top management and process owners of ${esc(Q.S.organization.name)} (${esc(Q.standard())} clause 5.3). Responsibilities and authorities are in QMS-PRO-002 Roles &amp; Responsibilities Matrix.</p>
      <div class="paper-chart">${compactHtml()}</div>
      <p class="small muted">Approved by ${esc(NM(Q.orgModel().root))}. ${draft ? '' : `Live view: <a href="#/qms/scope">QMS → Organization &amp; Scope</a>.`}</p>
      <div class="foot"><span>${esc(d.id)} · Rev ${esc(rev || '—')}</span><span>Controlled copy only when viewed in iQMS</span><span>Page 1 of 1</span></div>
    </article>`;
})();
