/* iQMS — shell: sidebar navigation (generated from the process structure) and global search. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const sb = document.getElementById('sidebar');
  const nav = document.getElementById('sbNav');
  const foot = document.getElementById('sbFoot');
  const pin = document.getElementById('sbPin');
  const desktop = () => matchMedia('(min-width: 1024px)').matches;
  Q.UI.groups = Q.UI.groups || {};

  /* ---------- Sidebar (v3: the client's 8-item menu) ----------
   * 1 QMS (Organization & Scope, Policies, Processes, Objectives & KPIs)
   * 2 Documented Information — hover list: processes + ISO clauses are VIEWS of one library
   * 3 Risks & Opportunities · 4 Evidence · 5 Internal Audit · 6 Management Review
   * 7 Corrective Action · 8 Settings                                                     */
  const item = (href, key, iconName, label, extra = '', attrs = '') =>
    `<a class="sb-item" href="${href}" data-nav="${key}" title="${esc(label)}"${attrs}>${icon(iconName)}<span class="lbl">${esc(label)}</span>${extra}</a>`;
  const sub = (href, key, label, extra = '') =>
    `<a class="sb-item sb-sub" href="${href}" data-nav="${key}" title="${esc(label)}"><span class="lbl">${esc(label)}</span>${extra}</a>`;

  Q.renderSidebar = () => {
    const S = Q.S;
    document.getElementById('orgName').textContent = S.organization.name;
    document.getElementById('orgMeta').textContent = S.organization.industry;
    document.getElementById('orgMark').textContent = S.organization.initials;
    const me = Q.person(Q.me());
    document.getElementById('meName').textContent = me.name;
    document.getElementById('meTitle').textContent = me.title;
    document.getElementById('meAvatar').textContent = Q.initials(Q.me());

    const mine = Q.myWorkflows().length;
    const qmsOpen = !Q.UI.groups.qms;
    nav.innerHTML =
      item('#/overview', 'overview', 'layout-dashboard', 'Overview') +
      `<div class="sb-parent" data-open="${qmsOpen}">
        <button class="sb-item sb-parent-row" type="button" data-toggle-group="qms" data-nav-parent="qms" aria-expanded="${qmsOpen}" title="QMS">${icon('landmark')}<span class="lbl">QMS</span>${icon('chevron-down', 'caret')}</button>
        <div class="sb-children">
          ${sub('#/qms/scope', 'qms-scope', 'Organization & Scope')}
          ${sub('#/qms/policies', 'qms-policies', 'Policies')}
          ${sub('#/qms/processes', 'qms-processes', 'Processes')}
          ${sub('#/qms/objectives', 'qms-objectives', 'Objectives & KPIs')}
        </div></div>` +
      item('#/documents', 'documents', 'files', 'Documented Information',
        `${mine ? `<span class="count" title="${mine} awaiting your action">${mine}</span>` : ''}<span class="fly-caret" aria-hidden="true">${icon('chevron-right')}</span>`,
        ' aria-haspopup="true" aria-expanded="false" aria-controls="docFly" data-fly="docs"') +
      `<div class="sb-drawer-only">${sub('#/documents?view=process', 'documents-process', 'By process')}${sub('#/documents?view=clause', 'documents-clause', 'By ISO 9001 clause')}${sub('#/review', 'review', 'Routing', mine ? `<span class="count">${mine}</span>` : '')}</div>` +
      item('#/risks', 'risks', 'shield-alert', 'Risks & Opportunities') +
      item('#/evidence', 'evidence', 'paperclip', 'Evidence') +
      item('#/audits', 'audits', 'search-check', 'Audits', (() => { const n = Q.AM ? Q.AM.ncs().filter(f => Q.AM.ncOpen(f) && (Q.AM.needsResponse(f) && (f.nc.ca?.owner || f.nc.owner) === Q.me() || f.nc.status === 'Verification Required' && f.auditor === Q.me())).length : 0; return n ? `<span class="count" title="${n} nonconformit${n === 1 ? 'y needs' : 'ies need'} your action">${n}</span>` : ''; })()) +
      item('#/mgmt-review', 'mgmt-review', 'presentation', 'Management Review') +
      item('#/capa', 'capa', 'list-checks', 'Corrective Action') +
      flyoutHtml();
    foot.innerHTML = item('#/settings', 'settings', 'settings', 'Settings');
    Q.refreshIcons();
    Q.syncSidebar();
  };

  /* ---------- Documented Information hover list ---------- */
  function flyoutHtml() {
    const S = Q.S, docs = S.documents;
    const count = pid => docs.filter(d => Q.inProc(d.process, pid)).length;
    const overdue = pid => docs.filter(d => Q.inProc(d.process, pid) && Q.docOverdue(d)).length;
    const cCount = c => Q.docsForClause(c).length;
    const mine = Q.myWorkflows().length, inWf = S.workflows.length, od = docs.filter(Q.docOverdue).length;
    return `<div class="sb-fly" id="docFly" role="menu" aria-label="Documented Information" hidden>
      <div class="fly-head"><b>Documented Information</b><span>One library — browse it by process or by ISO 9001 clause.</span></div>
      <div class="fly-quick">
        <a role="menuitem" data-fk="list" href="#/documents?view=list">${icon('files')}<span>All documents</span><em>${docs.length}</em></a>
        <a role="menuitem" data-fk="routing" href="#/review">${icon('route')}<span>Routing</span><em${mine ? ' class="hot"' : ''}>${mine ? `${mine} for you` : inWf}</em></a>
        <a role="menuitem" data-fk="overdue" href="#/documents?status=overdue">${icon('calendar-clock')}<span>Review overdue</span><em${od ? ' class="bad"' : ''}>${od}</em></a>
      </div>
      <div class="fly-cols">
        <div><h4>By process</h4>${Q.topProcesses().map(p => { const o = overdue(p.process_id); return `<a role="menuitem" data-fk="process:${p.process_id}" href="#/documents?group=process&p=${p.process_id}"><span class="code">${esc(p.process_code)}</span><span class="nm">${esc(p.name)}</span>${o ? `<i class="dot" title="${o} overdue"></i>` : ''}<em>${count(p.process_id)}</em></a>`; }).join('')}</div>
        <div><h4>By ISO 9001 clause</h4>${Q.CLAUSES.map(([c, t]) => `<a role="menuitem" data-fk="clause:${c}" href="#/documents?group=clause&c=${c}"><span class="code">${c}</span><span class="nm">${esc(t)}</span><em>${cCount(c)}</em></a>`).join('')}
          <p class="fly-note">A document can support several clauses, so clause counts overlap. Process counts don't — each document belongs to one process.</p></div>
      </div></div>`;
  }
  let flyTimer, flyAnchor = null;
  const fly = () => document.getElementById('docFly');
  function openFly(anchor, focusFirst = false) {
    const f = fly(); if (!f || !desktop()) return;
    clearTimeout(flyTimer);
    flyAnchor = anchor;
    f.hidden = false; anchor.setAttribute('aria-expanded', 'true');
    const r = anchor.getBoundingClientRect(), h = f.offsetHeight;
    // Sidebar may still be animating open; anchor to its expanded width.
    f.style.left = `${(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sb-expanded'), 10) || sb.getBoundingClientRect().right) - 1}px`;
    f.style.top = `${Math.max(8, Math.min(r.top - 12, innerHeight - h - 8))}px`;
    if (focusFirst) f.querySelector('a')?.focus();
  }
  function closeFly(now = false) {
    clearTimeout(flyTimer);
    const run = () => { const f = fly(); if (f) f.hidden = true; flyAnchor?.setAttribute('aria-expanded', 'false'); flyAnchor = null; };
    now ? run() : (flyTimer = setTimeout(run, 180));
  }
  Q.closeFly = () => closeFly(true);
  nav.addEventListener('mouseover', e => {
    const a = e.target.closest('[data-fly]');
    if (a) { clearTimeout(flyTimer); if (fly().hidden) flyTimer = setTimeout(() => openFly(a), 140); return; }
    if (e.target.closest('#docFly')) { clearTimeout(flyTimer); return; }
    if (e.target.closest('.sb-item')) closeFly();
  });
  nav.addEventListener('mouseout', e => { if (e.target.closest('[data-fly], #docFly') && !e.relatedTarget?.closest?.('[data-fly], #docFly')) closeFly(); });
  nav.addEventListener('keydown', e => {
    const a = e.target.closest('[data-fly]');
    if (a && (e.key === 'ArrowRight' || ((e.key === 'Enter' || e.key === ' ') && e.shiftKey))) { e.preventDefault(); openFly(a, true); return; }
    const f = e.target.closest('#docFly');
    if (!f) return;
    const links = [...f.querySelectorAll('a')], i = links.indexOf(document.activeElement);
    if (e.key === 'Escape' || e.key === 'ArrowLeft') { e.preventDefault(); const anchor = flyAnchor; closeFly(true); anchor?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (links[i + 1] || links[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (links[i - 1] || links[links.length - 1]).focus(); }
  });
  nav.addEventListener('click', e => { if (e.target.closest('#docFly a')) closeFly(true); });

  let current = { name: 'overview', parts: [], q: {} };
  Q.syncSidebar = (name, parts) => {
    if (name) current = { name, parts: parts || [], q: Q.route().q };
    let key = current.name;
    if (key === 'process') key = 'qms-processes';
    if (key === 'qms') key = 'qms-' + (current.parts[1] || 'scope');
    if (key === 'review') key = 'documents';
    if (key === 'setup') key = 'settings';
    sb.querySelectorAll('[data-nav]').forEach(a => {
      let on = a.dataset.nav === key;
      // Drawer-only shortcuts (small screens) mirror the Documents view.
      if (a.closest('.sb-drawer-only')) on = (current.name === 'review' && a.dataset.nav === 'review') || (current.name === 'documents' && a.dataset.nav === 'documents-' + (current.q.view || ''));
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    // Hover list shows where you are; the sidebar item returns to the last documents view.
    let fk = null;
    if (current.name === 'review') fk = 'routing';
    else if (current.name === 'documents' && current.q.v && Q.viewGet) {
      const q = current.q, v = Q.viewGet('documents', q.v), g = v && v.group;
      if (g === 'process') fk = 'process:' + Q.rootId(Q.proc(q.p) ? q.p : Q.topProcesses()[0]?.process_id);
      else if (g === 'clause') fk = q.c === 'none' ? null : 'clause:' + Q.clauseTop(q.c || '4');
      else if (v) fk = v.id === 'v-all' ? 'list' : v.id === 'v-overdue' ? 'overdue' : null;
    }
    sb.querySelectorAll('#docFly [data-fk]').forEach(a => { const on = a.dataset.fk === fk; a.classList.toggle('current', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
    const docItem = sb.querySelector('[data-fly]');
    if (docItem) docItem.setAttribute('href', Q.UI.docsView && Q.UI.docsView.startsWith('#/documents') ? Q.UI.docsView : '#/documents');
    const parentOn = key.startsWith('qms-');
    sb.querySelector('[data-nav-parent="qms"]')?.classList.toggle('child-active', parentOn);
  };

  nav.addEventListener('click', e => {
    const t = e.target.closest('[data-toggle-group]');
    if (t) {
      const id = t.dataset.toggleGroup; Q.UI.groups[id] = !Q.UI.groups[id]; Q.saveUI();
      const g = t.closest('.sb-group, .sb-parent'); if (g.classList.contains('sb-parent')) g.dataset.open = String(!Q.UI.groups[id]); else g.dataset.collapsed = String(!!Q.UI.groups[id]); t.setAttribute('aria-expanded', String(!Q.UI.groups[id]));
    }
  });
  sb.addEventListener('click', e => { if (e.target.closest('a.sb-item') && !desktop()) setDrawer(false); });

  /* Hover-expand + pin (desktop). */
  const scrim = document.getElementById('sbScrim');
  const setExpanded = on => {
    sb.classList.toggle('expanded', on || document.body.classList.contains('sb-pinned') || !desktop());
    if (!sb.classList.contains('expanded')) Q.closeFly?.();
    // The hover-expanded sidebar floats over the page: dim the page so it reads as a layer.
    scrim?.classList.toggle('on', desktop() && on && !document.body.classList.contains('sb-pinned'));
  };
  const setPinned = on => {
    document.body.classList.toggle('sb-pinned', on);
    pin.setAttribute('aria-pressed', String(on));
    const label = on ? 'Unpin sidebar' : 'Pin sidebar';
    pin.setAttribute('aria-label', label); pin.title = label;
    pin.innerHTML = icon(on ? 'pin-off' : 'pin'); Q.refreshIcons();
    sb.classList.toggle('pinned', on);
    setExpanded(on || sb.matches(':hover'));
    Q.UI.pinned = on; Q.saveUI();
  };
  pin.addEventListener('click', () => setPinned(!document.body.classList.contains('sb-pinned')));
  let leaveTimer;
  sb.addEventListener('mouseover', () => { clearTimeout(leaveTimer); if (desktop() && !sb.classList.contains('expanded')) setExpanded(true); });
  sb.addEventListener('mouseleave', () => { leaveTimer = setTimeout(() => { if (!sb.contains(document.activeElement) || document.activeElement === document.body) setExpanded(false); }, 120); });
  sb.addEventListener('focusin', () => setExpanded(true));
  sb.addEventListener('focusout', () => requestAnimationFrame(() => { if (!sb.contains(document.activeElement) && !sb.matches(':hover')) setExpanded(false); }));

  /* Drawer (< 1024 px). */
  const menuBtn = document.getElementById('menuBtn');
  let backdrop = null;
  function setDrawer(open) {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { backdrop = document.createElement('div'); backdrop.className = 'nav-backdrop'; backdrop.addEventListener('click', () => setDrawer(false)); document.body.append(backdrop); sb.querySelector('a.sb-item')?.focus(); }
    else { backdrop?.remove(); backdrop = null; }
  }
  menuBtn.addEventListener('click', () => setDrawer(!document.body.classList.contains('nav-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setDrawer(false); menuBtn.focus(); } });
  matchMedia('(min-width: 1024px)').addEventListener('change', () => { setDrawer(false); setPinned(!!Q.UI.pinned); setExpanded(false); });

  /* ---------- Global search (all record types) ---------- */
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchResults');
  const index = () => {
    const S = Q.S, out = [];
    Q.S.processes.filter(p => p.status === 'active').forEach(p => out.push({ g: 'Processes', icon: 'workflow', t: `${p.process_code} ${p.name}`, m: `Owner: ${Q.pname(p.owner)}`, go: () => Q.go(`#/process/${p.process_id}`), s: `${p.process_code} ${p.name} ${p.purpose}` }));
    S.documents.forEach(d => out.push({ g: 'Documents', icon: 'file-text', t: d.title, m: `${d.id} · Rev ${d.rev || d.workingRev} · ${Q.plabel(d.process)}`, go: () => Q.openDocument(d.id), s: `${d.id} ${d.title} ${d.type}` }));
    S.risks.forEach(r => out.push({ g: 'Risks & Opportunities', icon: 'shield-alert', t: r.title, m: `${r.id} · ${r.kind} · ${Q.plabel(r.process)}`, go: () => Q.go(`#/risks?focus=${r.id}`), s: `${r.id} ${r.title} ${r.treatment}` }));
    S.kpis.forEach(k => out.push({ g: 'KPIs', icon: 'target', t: k.name, m: `${Q.plabel(k.process)} · actual ${Q.kpiFmt(k.actual, k)} vs target ${k.dir} ${Q.kpiFmt(k.target, k)}`, go: () => Q.go(`#/qms/objectives?focus=${k.id}`), s: `${k.name} ${k.objective}` }));
    S.evidence.forEach(e => out.push({ g: 'Evidence', icon: 'paperclip', t: e.name, m: `${e.source.system} · ${e.status} · ${Q.plabel(e.process)}`, go: () => Q.go(`#/evidence?focus=${e.id}`), s: `${e.id} ${e.name} ${e.control} ${e.source.record}` }));
    S.findings.forEach(f => out.push({ g: 'Audit findings & actions', icon: 'search-check', t: f.title, m: `${f.id} · ${f.type} · ${Q.plabel(f.process)}`, go: () => Q.go(f.nc ? `#/audits/nc/${f.nc.no}` : `#/audits/a/${f.audit}/findings`), s: `${f.id} ${f.nc?.no || ''} ${f.title}` }));
    S.audits.forEach(a => out.push({ g: 'Audits', icon: 'search-check', t: `${a.id} ${a.title}`, m: `${Q.proc(a.process)?.name || ''} · ${Q.AM ? Q.AM.triggerLabel(a) : ''} · ${a.status} · lead ${Q.pname(a.auditor)}`, go: () => Q.go(`#/audits/a/${a.id}`), s: `${a.id} ${a.title} ${a.type}` }));
    S.actions.forEach(a => out.push({ g: 'Audit findings & actions', icon: 'list-checks', t: a.title, m: `${a.id} · Corrective action · ${a.status}`, go: () => Q.go(`#/capa?focus=${a.id}`), s: `${a.id} ${a.title} ${a.rootCause}` }));
    return out;
  };
  let results = [];
  const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const renderSearch = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { close(); return; }
    results = index().filter(r => r.s.toLowerCase().includes(q) || r.t.toLowerCase().includes(q));
    const groups = {};
    results.forEach(r => { (groups[r.g] = groups[r.g] || []).push(r); });
    let i = 0;
    box.innerHTML = results.length ? Object.entries(groups).map(([g, list]) => `<h4>${esc(g)} <span class="muted">${list.length}</span></h4>` + list.slice(0, 5).map(r => `<button type="button" role="option" data-i="${results.indexOf(r)}" id="sr-${i++}">${icon(r.icon)}<span><span class="r-title">${esc(r.t)}</span><br><span class="r-meta">${esc(r.m)}</span></span></button>`).join('')).join('')
      : `<p class="none">No results for “${esc(input.value)}”. Search covers processes, documents, risks, KPIs, evidence, findings and corrective actions.</p>`;
    box.hidden = false; input.setAttribute('aria-expanded', 'true'); Q.refreshIcons();
  };
  input.addEventListener('input', renderSearch);
  input.addEventListener('focus', () => input.value && renderSearch());
  box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const r = results[b.dataset.i]; close(); input.value = ''; r.go(); } });
  document.getElementById('search').addEventListener('keydown', e => {
    const opts = [...box.querySelectorAll('[data-i]')];
    const idx = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && !box.hidden) { e.preventDefault(); (opts[idx + 1] || opts[0])?.focus(); }
    else if (e.key === 'ArrowUp' && !box.hidden) { e.preventDefault(); idx <= 0 ? input.focus() : opts[idx - 1].focus(); }
    else if (e.key === 'Enter' && document.activeElement === input) { opts[0]?.click(); }
    else if (e.key === 'Escape') { close(); input.focus(); }
  });
  document.addEventListener('mousedown', e => { if (!e.target.closest('#search')) close(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); } });

  /* ---------- Boot ---------- */
  Q.boot = () => {
    if (!window.__iqmsScrollbars) {
      window.__iqmsScrollbars = true;
      let scrollTimer;
      document.addEventListener('scroll', e => {
        const el = e.target;
        if (!(el instanceof Element) || el === document.documentElement || el === document.body) return;
        const style = getComputedStyle(el);
        if (!['auto', 'scroll'].includes(style.overflow) && !['auto', 'scroll'].includes(style.overflowY) && !['auto', 'scroll'].includes(style.overflowX)) return;
        el.classList.add('is-scrolling'); clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => el.classList.remove('is-scrolling'), 1000);
      }, true);
    }
    Q.renderSidebar();
    setPinned(!!Q.UI.pinned && desktop());
    setExpanded(false);
    if (!location.hash) history.replaceState(null, '', '#/overview');
    Q.render();
  };
})();
