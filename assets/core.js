/* iQMS v2 — core: state, derived data, shared components, router. */
(() => {
  'use strict';
  const SEED = window.QMS_DATA;
  const STORE_KEY = 'iqms.v3.data';
  const UI_KEY = 'iqms.v3.ui';
  const clone = v => JSON.parse(JSON.stringify(v));

  const Q = window.Q = { views: {}, actions: {}, tables: {} };

  /* ---------------- State (browser-local; sample data) ---------------- */
  function loadData() {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && s.v === 4 && s.data) return s.data; } catch (_) { /* storage unavailable */ }
    return clone(SEED);
  }
  Q.S = loadData();
  Q.save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 4, data: Q.S })); } catch (_) { /* ignore */ } };
  /* "Today" is the real date in the organization's time zone (Settings → Regional).
   * Sample records are written relative to the seed's date, so every date in the data
   * moves forward by the same number of days: overdue items stay overdue by the same amount. */
  Q.realToday = (tz = Q.S?.settings?.regional?.timeZone || 'Asia/Manila') => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (_) { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  };
  const DATE_RE = /^(\d{4}-\d{2}-\d{2})(?=$|[T ])/;
  const shiftDates = (v, n) => {
    if (typeof v === 'string') { const m = v.match(DATE_RE); if (!m) return v; const x = new Date(m[1] + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) + v.slice(10); }
    if (Array.isArray(v)) return v.map(x => shiftDates(x, n));
    if (v && typeof v === 'object') { Object.keys(v).forEach(k => { v[k] = shiftDates(v[k], n); }); return v; }
    return v;
  };
  const anchorToToday = () => {
    const from = Q.S.organization.today, to = Q.realToday();
    if (!from || from === to) return;
    const n = Math.round((new Date(to) - new Date(from)) / 864e5);
    if (n > 0) { shiftDates(Q.S, n); Q.S.organization.today = to; Q.save(); }
  };
  anchorToToday();
  // Sample records added by a later build to data saved by an earlier one: move their dates to "today" the same way.
  Q.shifted = obj => { const n = Math.round((new Date(Q.today()) - new Date(SEED.organization.today)) / 864e5); return n > 0 ? shiftDates(clone(obj), n) : clone(obj); };
  Q.resetData = () => { Q.S = clone(SEED); try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ } anchorToToday(); };
  Q.UI = (() => { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (_) { return {}; } })();
  Q.saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(Q.UI)); } catch (_) { /* ignore */ } };

  /* ---------------- Helpers ---------------- */
  const esc = Q.esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Q.icon = (name, cls = '') => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;
  Q.refreshIcons = () => { if (window.lucide) window.lucide.createIcons(); };
  Q.today = () => Q.S.organization.today;
  Q.me = () => Q.S.currentUser;
  Q.person = id => Q.S.people[id] || { name: id || '—', title: '', dept: '' };
  Q.pname = id => id ? Q.person(id).name : '—';
  Q.initials = id => Q.pname(id).split(' ').map(s => s[0]).slice(0, 2).join('');
  Q.who = id => id === Q.me() ? `${esc(Q.pname(id))} <span class="muted">(you)</span>` : esc(Q.pname(id));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* Date format follows Settings → Regional (default "27 Sep 2026"). */
  Q.DATE_FORMATS = { 'd MMM yyyy': '2 Oct 2026', 'dd/MM/yyyy': '02/10/2026', 'MM/dd/yyyy': '10/02/2026', 'yyyy-MM-dd': '2026-10-02' };
  Q.fmt = d => {
    if (!d) return '—';
    const [y, m, day] = d.slice(0, 10).split('-');
    switch (Q.S.settings?.regional?.dateFormat) {
      case 'dd/MM/yyyy': return `${day}/${m}/${y}`;
      case 'MM/dd/yyyy': return `${m}/${day}/${y}`;
      case 'yyyy-MM-dd': return `${y}-${m}-${day}`;
      default: return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
    }
  };
  Q.days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  Q.addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  Q.addYears = (d, n) => `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;
  Q.uid = p => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

  /* ---------------- Processes ---------------- */
  Q.proc = id => Q.S.processes.find(p => p.process_id === id);
  Q.byOrder = (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name);
  Q.topProcesses = (includeArchived = false) => Q.S.processes.filter(p => !p.parent_process_id && (includeArchived || p.status === 'active')).sort(Q.byOrder);
  Q.children = (id, includeArchived = false) => Q.S.processes.filter(p => p.parent_process_id === id && (includeArchived || p.status === 'active')).sort(Q.byOrder);
  Q.rootId = id => { const p = Q.proc(id); return p && p.parent_process_id ? Q.rootId(p.parent_process_id) : id; };
  Q.inProc = (recordPid, pid) => { if (!pid || pid === 'all') return true; let cur = Q.proc(recordPid); while (cur) { if (cur.process_id === pid) return true; cur = Q.proc(cur.parent_process_id); } return false; };
  /* Standard edition: the mock now follows ISO 9001:2026. Data saved in a browser by an
   * earlier build is upgraded once (edition label + clause 6.1 split into 6.1.2 / 6.1.3). */
  if (!Q.S.organization.edition2026) {
    if (Q.S.organization.standard === 'ISO 9001:2015') Q.S.organization.standard = 'ISO 9001:2026';
    const i = Q.S.iso.findIndex(r => r.clause === '6.1');
    if (i >= 0 && !Q.S.iso.some(r => r.clause === '6.1.2')) Q.S.iso.splice(i, 1, ...JSON.parse(JSON.stringify(SEED.iso.filter(r => ['6.1.2', '6.1.3'].includes(r.clause)))));
    Q.S.organization.edition2026 = true; Q.save();
  }
  Q.standard = () => Q.S.organization.standard || 'ISO 9001:2026';
  /* Document classification decides how a document is registered and what iQMS can read.
   *   upload → the file is stored in iQMS, shown in the viewer and read for the assessment.
   *   link   → the file stays in SharePoint; iQMS keeps the link and the owner's description only. */
  Q.CLASSES = [
    { key: 'Public', mode: 'upload', icon: 'globe', tone: 'pub', hint: 'Can be shared outside the organization.' },
    { key: 'Internal', mode: 'upload', icon: 'building-2', tone: 'int', hint: 'For employees. The usual level for controlled documents.' },
    { key: 'Confidential', mode: 'link', icon: 'lock', tone: 'conf', hint: 'Limited to named roles or departments.' },
    { key: 'Highly Confidential', mode: 'link', icon: 'lock-keyhole', tone: 'high', hint: 'Personal, commercial or legal data. Strictly need-to-know.' }
  ];
  Q.docClass = d => Q.CLASSES.find(c => c.key === d.classification) || Q.CLASSES[1];
  Q.docRestricted = d => Q.docClass(d).mode === 'link';
  Q.docDept = d => d.department || Q.person(d.owner).dept || 'No department';
  Q.departments = () => [...new Set([...Object.values(Q.S.people).map(p => p.dept), ...Q.S.documents.map(d => d.department)].filter(Boolean))].sort();
  Q.classChip = d => { const c = Q.docClass(d); return `<span class="cls-chip ${c.tone}" title="${esc(c.mode === 'link' ? 'Link only — iQMS keeps a description, not the file' : 'Uploaded to iQMS')}">${Q.icon(c.icon)}${esc(c.key)}</span>`; };
  Q.RESTRICTED_NOTE = 'iQMS cannot open or read this document. It is counted in the ISO 9001 readiness assessment from the description its owner provided, and iQMS has not checked that description against the document itself. The owner is responsible for keeping the description accurate.';
  // Data saved in a browser by an earlier build: give every document a classification and a source mode.
  if (Q.S.documents.some(d => !d.classification)) {
    Q.S.documents.forEach(d => {
      if (d.classification) return;
      const s = SEED.documents.find(x => x.id === d.id);
      d.classification = s ? s.classification : 'Internal';
      d.department = d.department || Q.person(d.owner).dept;
      if (Q.docRestricted(d)) { d.source = { ...d.source, mode: 'link', library: 'Restricted Documents' }; d.declared = d.declared || { by: d.owner, date: d.updated }; if (s) d.description = s.description; }
      else d.source = { ...d.source, mode: 'upload', system: 'iQMS', site: '', library: 'Document library', state: 'connected', size: s?.source.size || '240 KB', verified: d.updated };
    });
    Q.save();
  }
  /* Process categories (organization configuration). Subprocesses inherit the parent's. */
  if (!Q.S.processCategories) {
    Q.S.processCategories = JSON.parse(JSON.stringify(SEED.processCategories));
    const map = { Management: 'management', Core: 'core', Support: 'support' };
    Q.S.processes.forEach(p => { if (map[p.category]) p.category = map[p.category]; });
    Q.save();
  }
  Q.categories = () => Q.S.processCategories;
  Q.catOf = p => { const root = p && Q.proc(Q.rootId(p.process_id)); return Q.S.processCategories.find(c => c.id === (root || p)?.category) || null; };
  Q.catChip = (c, withIcon = true) => c ? `<span class="cat-chip" style="--c:${c.color}">${withIcon ? Q.icon(c.icon || 'folder') : '<i class="dot"></i>'}${esc(c.name)}</span>` : '<span class="cat-chip none">Uncategorized</span>';
  Q.CAT_COLORS = ['#6E56CF', '#0E7C86', '#2F6FB6', '#B43F7E', '#5E7A1F', '#8A5A2B', '#475569'];
  Q.CAT_ICONS = ['landmark', 'workflow', 'package', 'users', 'shield-alert', 'target', 'network', 'handshake', 'cloud', 'files'];
  Q.plabel = id => { const p = Q.proc(id); return p ? `${p.process_code} ${p.name}` : '—'; };
  Q.pcell = id => { const p = Q.proc(id); if (!p) return '—'; return `<a class="proc" href="#/process/${p.process_id}" title="${esc(p.process_code + ' ' + p.name)}"><b>${esc(p.process_code)}</b>${esc(p.name)}</a>`; };
  Q.processOptions = (selected = 'all', { all = 'All processes', withChildren = true } = {}) => {
    let html = all ? `<option value="all">${esc(all)}</option>` : '';
    Q.topProcesses().forEach(p => {
      html += `<option value="${p.process_id}"${p.process_id === selected ? ' selected' : ''}>${esc(p.process_code + ' ' + p.name)}</option>`;
      if (withChildren) Q.children(p.process_id).forEach(c => { html += `<option value="${c.process_id}"${c.process_id === selected ? ' selected' : ''}>&nbsp;&nbsp;&nbsp;${esc(c.process_code + ' ' + c.name)}</option>`; });
    });
    return html;
  };
  Q.peopleOptions = (selected, filter = () => true) => Object.entries(Q.S.people).filter(([id]) => filter(id)).map(([id, p]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${esc(p.name)} — ${esc(p.title)}</option>`).join('');

  /* ---------------- Documents & workflows ---------------- */
  Q.doc = id => Q.S.documents.find(d => d.id === id);
  Q.wf = id => Q.S.workflows.find(w => w.id === id);
  Q.wfForDoc = docId => Q.S.workflows.find(w => w.doc === docId);
  Q.docOverdue = d => !!(d.nextReview && d.nextReview < Q.today() && d.rev && !['Obsolete', 'Superseded'].includes(d.status));
  Q.docDueSoon = d => !!(d.nextReview && !Q.docOverdue(d) && Q.days(Q.today(), d.nextReview) <= 30);
  Q.docIso = d => [...new Set([...(d.iso || []), ...Q.S.iso.filter(r => r.controls.includes(d.id)).map(r => r.clause)])];

  /* ---------------- ISO 9001 clause structure (the standard, not org config) ---------------- */
  Q.CLAUSES = [['4', 'Context of the organization'], ['5', 'Leadership'], ['6', 'Planning'], ['7', 'Support'], ['8', 'Operation'], ['9', 'Performance evaluation'], ['10', 'Improvement']];
  Q.clauseTitle = c => (Q.CLAUSES.find(x => x[0] === c) || [])[1] || '';
  Q.clauseTop = c => String(c).split('.')[0];
  // A record mapped to 8.3.4 satisfies requirement 8.3 and top-level clause 8.
  Q.clauseIn = (rec, target) => rec === target || rec.startsWith(target + '.');
  Q.clauseSort = c => c.split('.').map(x => x.padStart(2, '0')).join('.');
  Q.reqsIn = top => Q.S.iso.filter(r => Q.clauseTop(r.clause) === top).sort((a, b) => Q.clauseSort(a.clause) < Q.clauseSort(b.clause) ? -1 : 1);
  Q.docsForClause = c => Q.S.documents.filter(d => Q.docIso(d).some(x => Q.clauseIn(x, c) || Q.clauseIn(c, x)));
  Q.evForClause = c => Q.S.evidence.filter(e => e.iso && (Q.clauseIn(e.iso, c) || Q.clauseIn(c, e.iso)));
  Q.nextRev = r => String((parseInt(r || '-1', 10) || 0) + (r ? 1 : 0)).padStart(2, '0');
  Q.wfAssignees = w => {
    if (!w) return [];
    if (w.changesRequested) return [w.startedBy];
    if (w.stage === 'review') return w.reviewers.filter(r => r.state === 'Pending').map(r => r.who);
    if (w.stage === 'approval') return w.approvers.filter(r => r.state === 'Pending').map(r => r.who);
    if (w.stage === 'publication') return [w.publisher];
    return [];
  };
  Q.wfStatus = w => w.changesRequested ? 'Changes Requested' : w.stage === 'review' ? 'In Review' : w.stage === 'approval' ? 'Approval in Progress' : 'Approved';
  Q.wfStageLabel = w => w.changesRequested ? 'Review — changes requested' : { review: 'Review', approval: 'Approval', publication: 'Publication' }[w.stage];
  Q.assignedToMe = w => Q.wfAssignees(w).includes(Q.me()) && !w.changesRequested;
  Q.myWorkflows = () => Q.S.workflows.filter(Q.assignedToMe);

  const DOC_STATUS = { 'Published': 'success', 'Draft': 'neutral', 'In Review': 'info', 'Changes Requested': 'orange', 'Approval in Progress': 'warning', 'Approved': 'success outline', 'Superseded': 'muted', 'Obsolete': 'muted' };
  Q.st = (text, kind) => `<span class="st ${kind || DOC_STATUS[text] || 'neutral'}">${esc(text)}</span>`;
  Q.docStatus = d => {
    const base = Q.st(d.status);
    return base;
  };
  Q.reviewDate = (date, isOverdue, soon) => {
    if (!date) return '<span class="muted">—</span>';
    if (isOverdue) return `<span class="date-overdue" title="Review overdue">${Q.icon('triangle-alert')} ${Q.fmt(date)}<span class="sr-only"> (overdue)</span></span>`;
    if (soon) return `<span class="date-soon" title="Due within 30 days">${Q.fmt(date)}</span>`;
    return Q.fmt(date);
  };
  Q.dueDate = (date, closed = false) => {
    if (!date) return '—';
    if (!closed && date < Q.today()) return `<span class="date-overdue" title="Overdue">${Q.icon('triangle-alert')} ${Q.fmt(date)}<span class="sr-only"> (overdue)</span></span>`;
    if (!closed && Q.days(Q.today(), date) <= 7) return `<span class="date-soon">${Q.fmt(date)}</span>`;
    return Q.fmt(date);
  };

  /* ---------------- Risks, KPIs, evidence, actions ---------------- */
  Q.riskScore = r => r.likelihood * r.impact;
  Q.riskLevel = r => { const s = Q.riskScore(r); return s >= 15 ? 'High' : s >= 8 ? 'Medium' : 'Low'; };
  Q.riskOpen = r => !['Closed'].includes(r.status);
  Q.kpiOk = k => k.dir === '≥' ? k.actual >= k.target : k.dir === '≤' ? k.actual <= k.target : k.actual === k.target;
  Q.kpiFmt = (v, k) => `${v}${k.unit}`;
  Q.evGap = e => e.status === 'Missing' || e.status === 'Link unavailable';
  Q.actionClosed = a => a.stage === 'Closed';
  Q.actionOverdue = a => !Q.actionClosed(a) && a.due < Q.today();

  /* ---------------- ISO readiness (documented formula) ---------------- */
  Q.ISO_POINTS = { 'Complete': 1, 'Partially Complete': 0.5, 'At Risk': 0, 'Missing': 0 };
  Q.ISO_KIND = { 'Complete': 'success', 'Partially Complete': 'warning', 'At Risk': 'orange', 'Missing': 'danger', 'Not Applicable': 'muted' };
  Q.isoScore = reqs => {
    const c = { 'Complete': 0, 'Partially Complete': 0, 'At Risk': 0, 'Missing': 0, 'Not Applicable': 0 };
    reqs.forEach(r => { c[r.status]++; });
    const applicable = reqs.length - c['Not Applicable'];
    const points = c['Complete'] + c['Partially Complete'] * 0.5;
    return { counts: c, applicable, points, pct: applicable ? Math.round(points / applicable * 100) : null, total: reqs.length };
  };
  Q.isoForProcess = pid => Q.S.iso.filter(r => r.processes.some(p => Q.inProc(p, pid) || Q.inProc(pid, p)));

  /* ---------------- Process statistics ---------------- */
  Q.stats = pid => {
    const inP = x => Q.inProc(x, pid);
    const docs = Q.S.documents.filter(d => inP(d.process));
    const risks = Q.S.risks.filter(r => inP(r.process) && Q.riskOpen(r));
    const kpis = Q.S.kpis.filter(k => inP(k.process));
    const ev = Q.S.evidence.filter(e => inP(e.process));
    const findings = Q.S.findings.filter(f => inP(f.process) && f.status !== 'Closed');
    const actions = Q.S.actions.filter(a => inP(a.process) && !Q.actionClosed(a));
    const iso = Q.isoScore(Q.isoForProcess(pid));
    const s = {
      docs: docs.length, docsOverdue: docs.filter(Q.docOverdue).length, docsInWorkflow: docs.filter(d => Q.wfForDoc(d.id)).length,
      highRisks: risks.filter(r => r.kind === 'Risk' && Q.riskLevel(r) === 'High').length, openRisks: risks.length,
      kpis: kpis.length, kpisBelow: kpis.filter(k => !Q.kpiOk(k)).length,
      evidence: ev.length, evGaps: ev.filter(Q.evGap).length,
      findings: findings.length, majorFindings: findings.filter(f => f.type.startsWith('Major')).length,
      actions: actions.length, actionsOverdue: actions.filter(Q.actionOverdue).length,
      iso, isoGaps: iso.counts['Missing'] + iso.counts['At Risk']
    };
    const score = s.docsOverdue + s.highRisks + s.kpisBelow + s.evGaps + s.actionsOverdue * 2 + s.majorFindings * 2;
    s.health = score >= 5 || s.majorFindings ? 'risk' : score >= 1 ? 'attn' : 'ok';
    return s;
  };
  Q.health = h => ({
    ok: `<span class="health ok">${Q.icon('circle-check')}On track</span>`,
    attn: `<span class="health attn">${Q.icon('circle-dot')}Needs attention</span>`,
    risk: `<span class="health risk">${Q.icon('triangle-alert')}At risk</span>`
  })[h];
  Q.miniProgress = pct => pct == null ? '<span class="muted">—</span>' : `<span class="mini-progress"><span class="track"><span class="fill" style="width:${pct}%"></span></span>${pct}%</span>`;
  Q.num = (n, cls = 'attn') => n ? `<span class="${cls}">${n}</span>` : '<span class="zero">0</span>';

  /* ---------------- Page chrome ---------------- */
  Q.crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map((c, i) => i < items.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a>${Q.icon('chevron-right')}` : `<span aria-current="page">${esc(c[0])}</span>`).join('')}</nav>`;
  Q.pageHead = ({ title, sub = '', actions = '', crumbs = null, pre = '', meta = '' }) =>
    `${crumbs ? Q.crumbs(crumbs) : ''}<div class="page-head"><div>${pre}<h1 tabindex="-1"${sub ? ` class="page-title-tip" data-sub="${esc(sub)}" aria-description="${esc(sub)}"` : ''}>${title}</h1>${meta}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
  Q.seg = (name, items, current) => `<div class="seg" role="group" aria-label="${esc(name)}">${items.map(([v, l, n]) => `<button type="button" data-seg="${v}" aria-pressed="${v === current}">${esc(l)}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
  Q.sparkline = (vals, ok) => {
    const w = 84, h = 24, min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
    const pts = vals.map((v, i) => [2 + i * (w - 4) / (vals.length - 1), h - 3 - (v - min) / rng * (h - 6)]);
    const last = pts[pts.length - 1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="#9AA5A0" stroke-width="1.5" points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.8" fill="${ok ? 'var(--success)' : 'var(--danger)'}"/></svg>`;
  };

  /* ---------------- Toast ---------------- */
  Q.toast = (title, msg = '') => {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = `${Q.icon('circle-check')}<div><b>${esc(title)}</b>${esc(msg)}</div>`;
    host.append(el); Q.refreshIcons();
    setTimeout(() => el.remove(), 4200);
  };

  /* ---------------- Modals (stackable, focus-trapped) ---------------- */
  const stack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  Q.openModal = ({ size = 'm', title, sub = '', body, foot = '', headActions = '', onMount, label }) => {
    const root = document.createElement('div');
    root.className = 'modal-root';
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    root.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head"><div style="min-width:0"><h2 id="${id}">${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
      <div class="actions">${headActions}<button class="icon-btn" type="button" data-close aria-label="Close${label ? ' ' + esc(label) : ''}">${Q.icon('x')}</button></div></div>
      ${body}${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const prev = document.activeElement;
    document.getElementById('modalHost').append(root);
    document.querySelector('.main').inert = true; document.getElementById('sidebar').inert = true;
    stack.forEach(m => { m.root.inert = true; });
    const entry = { root, prev };
    stack.push(entry);
    root.addEventListener('mousedown', e => { if (e.target === root) Q.closeModal(); });
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => Q.closeModal()));
    Q.refreshIcons();
    if (onMount) onMount(root.querySelector('.modal'));
    Q.enhanceSelects(root);
    const first = root.querySelector('[autofocus]') || root.querySelector('.modal-body ' + FOCUSABLE) || root.querySelector(FOCUSABLE);
    first && first.focus();
    return root.querySelector('.modal');
  };
  Q.closeModal = () => {
    const entry = stack.pop(); if (!entry) return;
    entry.root.remove();
    if (stack.length) stack[stack.length - 1].root.inert = false;
    else { document.querySelector('.main').inert = false; document.getElementById('sidebar').inert = false; }
    if (entry.prev && document.contains(entry.prev)) entry.prev.focus();
  };
  Q.closeAllModals = () => { while (stack.length) Q.closeModal(); };
  Q.modalOpen = () => stack.length > 0;
  document.addEventListener('keydown', e => {
    if (!stack.length) return;
    const top = stack[stack.length - 1].root;
    if (e.key === 'Escape') { if (openCombo) return; e.preventDefault(); Q.closeModal(); return; }
    if (e.key === 'Tab') {
      const f = [...top.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    }
  });
  Q.confirm = ({ title, body, confirm = 'Confirm', danger = false, onConfirm }) => {
    const m = Q.openModal({ size: 's', title, body: `<div class="modal-body">${body}</div>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" type="button" data-ok>${esc(confirm)}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => { Q.closeModal(); onConfirm(); });
  };
  Q.formValues = form => Object.fromEntries(new FormData(form).entries());
  Q.validate = form => {
    let ok = true;
    form.querySelectorAll('[required]').forEach(el => {
      const bad = !String(el.value || '').trim();
      const shown = el._combo ? el._combo.btn : el; // styled dropdowns show the state on their button
      shown.setAttribute('aria-invalid', bad ? 'true' : 'false');
      shown.style.borderColor = bad ? 'var(--danger)' : '';
      if (bad && ok) { shown.focus(); ok = false; }
    });
    return ok;
  };

  /* ---------------- Menus (kebab / add) ---------------- */
  Q.closeMenus = except => document.querySelectorAll('.menu').forEach(m => { if (m !== except) { m.hidden = true; m.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-menu-toggle]');
    if (t) {
      const m = t.nextElementSibling; const open = m.hidden; Q.closeMenus(m); m.hidden = !open; t.setAttribute('aria-expanded', String(open)); menuOpenedAt = Date.now();
      // Inside a scrolling table the menu would be clipped: float it in the viewport instead.
      if (open && t.closest('.table-scroll, .table-tools, .vtabs')) {
        const r = t.getBoundingClientRect(); m.classList.add('floating');
        const w = m.offsetWidth, h = m.offsetHeight;
        m.style.left = `${Math.max(8, Math.min(r.left < innerWidth / 2 ? r.left : r.right - w, innerWidth - w - 8))}px`;
        m.style.top = `${r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
      }
      if (open) m.querySelector('button:not([disabled])')?.focus({ preventScroll: true }); e.stopPropagation(); return;
    }
    if (!e.target.closest('.menu')) Q.closeMenus();
  });
  let menuOpenedAt = 0;
  window.addEventListener('scroll', e => { if (Date.now() - menuOpenedAt > 250 && !e.target.closest?.('.menu')) Q.closeMenus(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !stack.length) { const open = [...document.querySelectorAll('.menu')].find(m => !m.hidden); if (open) { Q.closeMenus(); open.previousElementSibling?.focus(); } } });
  Q.menu = (label, items, { icon = 'ellipsis', text = '', cls = 'btn sm', align = '' } = {}) =>
    `<div class="menu-wrap"><button class="${cls}" type="button" data-menu-toggle aria-haspopup="true" aria-expanded="false" aria-label="${esc(label)}">${icon ? Q.icon(icon) : ''}${text ? esc(text) : ''}</button><div class="menu" role="menu" hidden style="${align}">${items.map(it => it === '-' ? '<hr>' : it.note ? `<p class="menu-note">${it.note}</p>` : `<button type="button" role="menuitem" ${it.disabled ? 'disabled' : ''} class="${it.cls || ''}" ${Object.entries(it.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}${it.title ? ` title="${esc(it.title)}"` : ''}>${it.icon ? Q.icon(it.icon) : ''}${esc(it.label)}</button>`).join('')}</div></div>`;

  /* ---------------- Global delegated actions ---------------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = Q.actions[el.dataset.action];
    if (fn) { e.preventDefault(); Q.closeMenus(); fn(el.dataset, el, e); }
  });
  Q.actions.toast = d => Q.toast(d.title || 'Not in this mock', d.msg || '');
  Q.actions['export-selected'] = (d, el) => { const w = el.closest('.table-wrap'); if (w) Q.exportTable(w.id.slice(3)); };

  /* ---------------- Table engine (v3 — 21st.dev data-table style) ----------------
   * Click targets, one job each:
   *   checkbox / row body → select      chevron → expand details
   *   title link (cfg)    → open        ⋯ menu  → row actions
   * Options: selectable, expand(r) → html, pageSize, selectionBar(keys) → buttons
   * (shown in a "N selected ▾" toolbar menu), search, filters, segs, sort.      */
  const tableTitle = noun => { const n = String(noun || 'Records'); return n.charAt(0).toUpperCase() + n.slice(1); };
  // Icon square per kind of record (by the table's noun); tone comes from the row's status pill.
  const NOUN_ICON = [[/document|template/i, 'file-text'], [/kpi|result/i, 'gauge'], [/risk|opportunit/i, 'shield-alert'], [/corrective|action/i, 'list-checks'],
    [/evidence|record/i, 'paperclip'], [/nonconform|finding/i, 'search-check'], [/audit/i, 'clipboard-check'], [/process/i, 'workflow'], [/user|session/i, 'user-round'],
    [/objective/i, 'target'], [/requirement/i, 'badge-check'], [/workflow|request/i, 'git-branch'], [/improvement/i, 'sparkles'], [/webhook|key|event/i, 'plug']];
  const nounIcon = noun => (NOUN_ICON.find(([re]) => re.test(noun || '')) || [0, 'circle'])[1];
  const OWNER_COL = /^(owner|process owner|responsible owner|assignee|assigned to|responsible|lead auditor|auditor|raised by|approver|reviewer|chair|author|user)$/i;
  const byName = () => { const m = {}; Object.entries(Q.S.people || {}).forEach(([id, p]) => { m[p.name] = id; }); return m; };
  const textOf = html => String(html).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
  Q.table = cfg => {
    // Filter state survives re-renders within the session; URL-provided filters win.
    const prev = Q.tables[cfg.id];
    const fresh = cfg.initialFilters || cfg.initialSeg;
    const t = Q.tables[cfg.id] = prev && !fresh ? Object.assign(prev, { cfg }) : { q: '', filters: {}, sort: null, seg: cfg.segDefault || 'all', page: 1, cfg };
    if (cfg.initialFilters) Object.assign(t.filters, cfg.initialFilters);
    if (cfg.initialSeg) t.seg = cfg.initialSeg;
    if ('initialSort' in cfg) t.sort = cfg.initialSort ? { ...cfg.initialSort } : null; // saved views own their sort
    t.selected = new Set(); t.expanded = null; t.page = t.page || 1;
    const exp = cfg.tools && cfg.exportable !== false ? `<button class="btn sm table-export" type="button" data-export title="Download the rows in this table as a CSV file (opens in Excel)">${Q.icon('download')}Export</button>` : '';
    // Every table uses the board ("Needs attention") look: title + count, pill search and filters, icon squares,
    // owner avatars, status pills, round pager. Behaviour is unchanged. Tune with board: { title, icon(r) → { icon, tone },
    // owner(r) → person id }, or opt out with board: false.
    const bd = cfg.board === false ? null : cfg.board || {};
    const title = bd && cfg.tools && bd.title !== false ? `<h2 class="tw-title">${esc(bd.title || tableTitle(cfg.noun))}<span class="ui-count tnum" data-tw-count></span></h2>` : '';
    const tools = cfg.tools ? `<div class="table-tools">${title}${cfg.tools}${bd && !cfg.tools.includes('ui-bt-sp') ? '<span class="ui-bt-sp"></span>' : ''}${exp}</div>` : '';
    return `<div class="table-wrap${cfg.bare ? ' bare' : ''}${bd ? ' bt-skin' : ''}" id="tw-${cfg.id}">${tools}<div id="tb-${cfg.id}"></div></div>`;
  };
  Q.tableRows = id => {
    const t = Q.tables[id], c = t.cfg;
    let rows = c.rows();
    if (t.q && c.search) { const q = t.q.toLowerCase(); rows = rows.filter(r => c.search(r).toLowerCase().includes(q)); }
    Object.entries(t.filters).forEach(([k, v]) => { if (v && v !== 'all' && c.filters?.[k]) rows = rows.filter(r => c.filters[k](r, v)); });
    if (c.segs && t.seg && t.seg !== 'all') rows = rows.filter(r => c.segs[t.seg](r));
    if (t.sort) { const col = c.columns.find(x => x.key === t.sort.key); if (col?.sort) rows = [...rows].sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * t.sort.dir; }); }
    return rows;
  };
  const pageRange = (page, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1], lo = Math.max(2, page - 1), hi = Math.min(total - 1, page + 1);
    if (lo > 2) out.push('…');
    for (let i = lo; i <= hi; i++) out.push(i);
    if (hi < total - 1) out.push('…');
    out.push(total); return out;
  };
  const SORT_IDLE = '<svg class="sort-ic idle" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>';
  const SORT_UP = '<svg class="sort-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
  const SORT_DOWN = '<svg class="sort-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="tick" d="m3.6 8.2 2.8 2.8 6-6"/><path class="dash" d="M4 8h8"/></svg>';
  const checkbox = (checked, label, attrs = '', mixed = false) => `<label class="tcheck${checked ? ' on' : ''}${mixed ? ' mixed' : ''}"><input type="checkbox" class="row-check" ${checked ? 'checked' : ''} aria-label="${esc(label)}" ${attrs}>${CHECK}</label>`;

  Q.renderTable = (id, { animate = false } = {}) => {
    const t = Q.tables[id], c = t.cfg, host = document.getElementById('tb-' + id);
    if (!host) return;
    // FLIP: remember row positions so a re-sort can glide rows to their new place.
    const before = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches ? new Map([...host.querySelectorAll('tbody tr[data-key]')].map(tr => [tr.dataset.key, tr.getBoundingClientRect().top])) : null;
    const all = Q.tableRows(id);
    const key = c.key || (r => r.id);
    [...t.selected].forEach(k => { if (!all.some(r => key(r) === k)) t.selected.delete(k); });
    const pages = c.pageSize ? Math.max(1, Math.ceil(all.length / c.pageSize)) : 1;
    t.page = Math.min(Math.max(1, t.page || 1), pages);
    const rows = c.pageSize ? all.slice((t.page - 1) * c.pageSize, t.page * c.pageSize) : all;
    const exp = typeof c.expand === 'function';
    const nCols = c.columns.length + (c.selectable ? 1 : 0) + (exp ? 1 : 0);
    const pageSel = rows.filter(r => t.selected.has(key(r))).length;
    const head = `${c.selectable ? `<th class="c-check">${checkbox(rows.length && pageSel === rows.length, 'Select all rows on this page', 'data-check-all', pageSel > 0 && pageSel < rows.length)}</th>` : ''}${exp ? '<th class="c-exp"><span class="sr-only">Details</span></th>' : ''}${c.columns.map(col => {
      const sorted = t.sort?.key === col.key;
      const aria = col.sort ? ` aria-sort="${sorted ? (t.sort.dir > 0 ? 'ascending' : 'descending') : 'none'}"` : '';
      return `<th class="${col.cls || ''}${col.sort ? ' sortable' : ''}${sorted ? ' sorted' : ''}"${aria}${col.width || col.min ? ` style="${col.width ? 'width:' + col.width + ';' : ''}${col.min ? 'min-width:' + col.min : ''}"` : ''} scope="col">${col.sort ? `<button type="button" class="th-sort" data-sort="${col.key}">${esc(col.label)}${sorted ? (t.sort.dir > 0 ? SORT_UP : SORT_DOWN) : SORT_IDLE}</button>` : esc(col.label)}</th>`;
    }).join('')}`;
    // With rows selected, the header row becomes the selection toolbar ("N selected ▾"),
    // so nothing above the table moves. The column widths stay as they are.
    const selHead = c.selectable && c.selectionBar && t.selected.size
      ? `${head.split('</th>').slice(0, c.selectable ? 1 : 0).join('</th>')}${c.selectable ? '</th>' : ''}<th class="sel-head" colspan="${nCols - 1}" scope="col"><div class="sel-head-in"><div class="menu-wrap"><button type="button" class="btn sm sel-btn" data-menu-toggle aria-haspopup="true" aria-expanded="false">${t.selected.size} selected${Q.icon('chevron-down')}</button><div class="menu sel-menu" role="menu" hidden>${c.selectionBar([...t.selected])}</div></div><button type="button" class="btn sm ghost" data-clear-sel>Clear selection</button><span class="small muted">${t.selected.size === 1 ? 'Actions for this document are in the menu' : 'Ctrl-click or use the checkboxes to add rows'}</span></div></th>`
      : null;
    const bd = c.board === false ? null : c.board || {};
    const names = bd ? byName() : {};
    // The item column: the first one that is not an id, number, date or menu column.
    // Prefer the column that holds the record's title (a .title / .doc-link element) on the first row.
    const plain = bd ? c.columns.map((col, i) => [col, i]).filter(([col]) => !/c-(id|num|date|actions|menu)\b/.test(col.cls || '') && col.label) : [];
    const first = rows[0] ? c.columns.map(col => col.render(rows[0])) : [];
    const itemCol = !bd || bd.icon === false ? -1 : (plain.find(([, i]) => /class="[^"]*\b(title|doc-link)\b/.test(first[i] || '')) || plain[0] || [0, -1])[1];
    const toneOf = html => /class="st (danger)/.test(html) ? 'danger' : /class="st (warning|orange)/.test(html) ? 'warning' : '';
    const cells = r => {
      const out = c.columns.map(col => col.render(r));
      if (!bd) return out;
      c.columns.forEach((col, ci) => {
        if (!OWNER_COL.test(col.label || '') || out[ci].includes('avatar')) return;
        const id = bd.owner && col.key === 'owner' ? bd.owner(r) : names[textOf(out[ci])];
        if (id) out[ci] = `<span class="user-cell"><span class="avatar sm">${esc(Q.initials(id))}</span><span class="nowrap">${esc(Q.pname(id))}</span></span>`;
      });
      if (itemCol >= 0 && !out[itemCol].includes('avatar')) {
        const ic = bd.icon ? bd.icon(r) || {} : { icon: nounIcon(c.noun), tone: toneOf(out.join('')) };
        out[itemCol] = `<span class="ui-bt-item"><span class="ui-bt-icon${ic.tone ? ' ' + ic.tone : ''}">${Q.icon(ic.icon || 'circle')}</span><span class="ui-bt-main">${out[itemCol]}</span></span>`;
      }
      return out;
    };
    const body = rows.map(r => {
      const k = key(r), sel = t.selected.has(k), open = exp && t.expanded === k;
      return `<tr class="${c.selectable ? 'selectable' : ''}${sel ? ' selected' : ''}${open ? ' expanded' : ''}${c.rowClass ? ' ' + c.rowClass(r) : ''}" data-key="${esc(k)}"${c.selectable ? ` aria-selected="${sel}"` : ''}>${c.selectable ? `<td class="c-check">${checkbox(sel, 'Select ' + (c.rowLabel ? c.rowLabel(r) : k))}</td>` : ''}${exp ? `<td class="c-exp"><button type="button" class="exp-btn" data-expand aria-expanded="${open}" aria-controls="x-${esc(id)}-${esc(k)}" aria-label="${open ? 'Hide' : 'Show'} details for ${esc(c.rowLabel ? c.rowLabel(r) : k)}">${Q.icon('chevron-down')}</button></td>` : ''}${cells(r).map((h, ci) => `<td class="${c.columns[ci].cls || ''}">${h}</td>`).join('')}</tr>` +
        (exp ? `<tr class="exp-row${open ? ' open' : ''}" id="x-${esc(id)}-${esc(k)}" aria-hidden="${!open}"><td colspan="${nCols}"><div class="exp-grid"><div class="exp-inner">${open ? c.expand(r) : ''}</div></div></td></tr>` : '');
    }).join('');
    const empty = typeof c.empty === 'function' ? c.empty(t) : c.empty;
    const from = all.length ? (t.page - 1) * (c.pageSize || all.length) + 1 : 0, to = c.pageSize ? Math.min(t.page * c.pageSize, all.length) : all.length;
    const pager = c.pageSize && pages > 1 ? `<nav class="pager" aria-label="Pagination"><button type="button" class="pg" data-page="${t.page - 1}" ${t.page <= 1 ? 'disabled' : ''} aria-label="Previous page">${Q.icon('chevron-right', 'flip-x')}</button>${pageRange(t.page, pages).map(p => p === '…' ? '<span class="pg-gap" aria-hidden="true">…</span>' : `<button type="button" class="pg" data-page="${p}" ${p === t.page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}<button type="button" class="pg" data-page="${t.page + 1}" ${t.page >= pages ? 'disabled' : ''} aria-label="Next page">${Q.icon('chevron-right')}</button></nav>` : '';
    const total = c.rows().length;
    const foot = c.foot === false ? '' : `<div class="table-foot"><span>${c.pageSize && pages > 1 ? `Showing ${from} to ${to} of ${all.length}` : `${all.length} of ${total}`} ${esc(c.noun || 'records')}${c.pageSize && pages > 1 && all.length !== total ? ` <span class="muted">(filtered from ${total})</span>` : ''}</span>${c.footExtra ? c.footExtra() : ''}${pager}</div>`;
    host.innerHTML = rows.length
      ? `<div class="table-scroll"><table class="dt${c.tight ? ' tight' : ''}${exp ? ' has-exp' : ''}"><caption class="sr-only">${esc(c.caption || c.id)}</caption><thead><tr${selHead ? ' class="sel-mode"' : ''}>${selHead || head}</tr></thead><tbody>${body}</tbody></table></div>${foot}`
      : `<div class="empty">${empty || '<h3>No matching records</h3><p>Try clearing a filter.</p>'}</div>`;
    const cnt = document.querySelector(`#tw-${CSS.escape(id)} [data-tw-count]`); if (cnt) cnt.textContent = all.length;
    Q.refreshIcons();
    if (before) host.querySelectorAll('tbody tr[data-key]').forEach(tr => {
      const y0 = before.get(tr.dataset.key); if (y0 == null) { tr.classList.add('row-in'); return; }
      const dy = y0 - tr.getBoundingClientRect().top; if (!dy) return;
      tr.style.transform = `translateY(${dy}px)`; tr.style.transition = 'none';
      requestAnimationFrame(() => { tr.style.transition = 'transform .36s cubic-bezier(.32,.72,0,1)'; tr.style.transform = ''; });
    });
    if (c.after) c.after(host);
  };
  Q.initTable = id => {
    const t = Q.tables[id], c = t.cfg, wrap = document.getElementById('tw-' + id);
    if (!wrap) return;
    const key = c.key || (r => r.id);
    const reset = () => { t.page = 1; Q.renderTable(id); };
    wrap.querySelectorAll('[data-filter]').forEach(el => {
      const k = el.dataset.filter;
      if (t.filters[k]) { el.value = t.filters[k]; el._combo?.sync(); }
      el.addEventListener('change', () => { t.filters[k] = el.value; reset(); });
    });
    const s = wrap.querySelector('[data-search]');
    if (s) {
      s.value = t.q || '';
      const box = s.closest('.search-input');
      let clear = null;
      if (box) { clear = document.createElement('button'); clear.type = 'button'; clear.className = 'search-clear'; clear.setAttribute('aria-label', 'Clear search'); clear.innerHTML = Q.icon('x'); clear.hidden = !s.value; box.append(clear); Q.refreshIcons();
        clear.addEventListener('click', () => { s.value = ''; t.q = ''; clear.hidden = true; reset(); s.focus(); }); }
      let timer;
      s.addEventListener('input', () => { if (clear) clear.hidden = !s.value; clearTimeout(timer); timer = setTimeout(() => { t.q = s.value; reset(); }, 160); });
    }
    wrap.querySelectorAll('[data-seg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seg === t.seg)));
    wrap.querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => {
      t.seg = b.dataset.seg; wrap.querySelectorAll('[data-seg]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); reset();
    }));
    wrap.addEventListener('click', e => {
      const sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) { const k = sortBtn.dataset.sort; t.sort = t.sort?.key === k ? (t.sort.dir > 0 ? { key: k, dir: -1 } : null) : { key: k, dir: 1 }; t.page = 1; Q.renderTable(id, { animate: true }); c.onSort?.(t.sort ? { ...t.sort } : null); wrap.querySelector(`[data-sort="${k}"]`)?.focus(); return; }
      if (e.target.closest('[data-export]')) { Q.exportTable(id); return; }
      const pg = e.target.closest('[data-page]');
      if (pg && !pg.disabled) { t.page = +pg.dataset.page; Q.renderTable(id); wrap.querySelector('[data-page][aria-current]')?.focus(); return; }
      if (e.target.closest('[data-clear-sel]')) { t.selected.clear(); Q.closeMenus(); Q.renderTable(id); return; }
      const ex = e.target.closest('[data-expand]');
      if (ex) { const k = ex.closest('tr').dataset.key; t.expanded = t.expanded === k ? null : k; Q.renderTable(id); document.querySelector(`#tb-${CSS.escape(id)} tr[data-key="${CSS.escape(k)}"] [data-expand]`)?.focus(); return; }
      if (!c.selectable) return;
      if (e.target.closest('[data-check-all]')) { const rows = pageRows(id); const allOn = rows.every(r => t.selected.has(key(r))); rows.forEach(r => allOn ? t.selected.delete(key(r)) : t.selected.add(key(r))); Q.renderTable(id); document.querySelector(`#tb-${CSS.escape(id)} [data-check-all]`)?.focus(); return; }
      const tr = e.target.closest('tbody tr[data-key]');
      if (!tr) return;
      const onCheck = e.target.closest('.tcheck');
      if (!onCheck && e.target.closest('button, a, select, .menu-wrap, input, label')) return;
      if (onCheck && e.target.tagName !== 'INPUT') return; // the label forwards a click to its input
      const k = tr.dataset.key;
      // Checkbox or Ctrl/Cmd-click toggles multi-selection; a plain row click selects just that row.
      if (onCheck || e.ctrlKey || e.metaKey) t.selected.has(k) ? t.selected.delete(k) : t.selected.add(k);
      else if (t.selected.size === 1 && t.selected.has(k)) t.selected.clear();
      else { t.selected.clear(); t.selected.add(k); }
      Q.renderTable(id);
      document.querySelector(`#tb-${CSS.escape(id)} tr[data-key="${CSS.escape(k)}"] .row-check`)?.focus();
    });
    Q.renderTable(id);
  };
  /* Export: every row that matches the current search / filters / view (all pages),
   * in the current sort, with the visible columns — or only the selected rows. */
  Q.exportTable = (id, keys = null) => {
    const t = Q.tables[id], c = t.cfg, key = c.key || (r => r.id);
    let rows = Q.tableRows(id);
    const only = keys || (t.selected.size ? [...t.selected] : null);
    if (only) rows = rows.filter(r => only.includes(key(r)));
    const cols = c.columns.filter(col => col.label && !/c-actions|c-menu/.test(col.cls || ''));
    const tmp = document.createElement('div');
    const text = html => { tmp.innerHTML = String(html ?? '').replace(/(<\/[a-z0-9]+>)/gi, '$1 ').replace(/></g, '> <'); tmp.querySelectorAll('.sr-only, svg').forEach(n => n.remove()); tmp.querySelectorAll('.sub').forEach(n => n.prepend(' — ')); return tmp.textContent.replace(/\s+/g, ' ').trim(); };
    const cell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [cols.map(col => cell(col.label)), ...rows.map(r => cols.map(col => cell(col.exportText ? col.exportText(r) : text(col.render(r)))))].map(l => l.join(',')).join('\r\n');
    const name = `${(c.noun || 'records').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Q.today()}.csv`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Q.toast('Export ready', `${rows.length} ${c.noun || 'rows'}${only ? ' (selected)' : ''} · ${name}`);
  };
  const pageRows = id => { const t = Q.tables[id], c = t.cfg, all = Q.tableRows(id); return c.pageSize ? all.slice((t.page - 1) * c.pageSize, t.page * c.pageSize) : all; };

  /* ---------------- Styled dropdown (progressive enhancement of <select class="select">) ----------------
   * The native <select> stays in the form (value, required, change events); a button
   * and a listbox replace its look. Process codes ("07.1") and "Name — Title" labels
   * get their own styling; indented options (subprocesses) are shown as children.
   * Long lists get a search box. Keyboard: ↑ ↓ Home End Enter Esc, type to search.  */
  let openCombo = null;
  const closeCombo = (focusBtn = false) => { if (!openCombo) return; const c = openCombo; openCombo = null; c.pop.remove(); c.btn.setAttribute('aria-expanded', 'false'); if (focusBtn) c.btn.focus(); };
  const optHtml = (o, i, selected) => {
    const raw = o.textContent, sub = /^[   ]{2,}/.test(raw), t = raw.replace(/^[   ]+/, '');
    const m = /^(\d{2}(?:\.\d+)*)\s+(.*)$/.exec(t), dash = t.split(' — ');
    const label = m ? `<span class="oc">${esc(m[1])}</span><span class="ot">${esc(m[2])}</span>` : dash.length === 2 ? `<span class="ot">${esc(dash[0])}</span><span class="os">${esc(dash[1])}</span>` : `<span class="ot">${esc(t)}</span>`;
    return `<li role="option" id="${o._cid}" data-i="${i}" class="${sub ? 'sub' : ''}${o.disabled ? ' dis' : ''}" aria-selected="${selected}" aria-disabled="${o.disabled}">${label}<span class="ck">${Q.icon('check')}</span></li>`;
  };
  const labelOf = sel => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent.replace(/^[   ]+/, '') : ''; };
  Q.enhanceSelects = root => {
    root.querySelectorAll('select.select').forEach(sel => {
      if (sel._combo || sel.hidden || sel.multiple || sel.closest('[hidden]') || sel.dataset.native != null) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'select combo-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
      const lab = sel.getAttribute('aria-label') || sel.closest('label')?.querySelector('span')?.textContent?.replace('*', '').trim() || '';
      if (lab) btn.setAttribute('aria-label', lab);
      btn.disabled = sel.disabled;
      if (sel.style.width) btn.style.width = sel.style.width;
      sel.classList.add('combo-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
      sel.after(btn);
      const sync = () => { btn.innerHTML = `<span class="cb-label">${esc(labelOf(sel)) || '&nbsp;'}</span>`; btn.classList.toggle('placeholder', !sel.value); btn.disabled = sel.disabled; if (sel.style.borderColor) btn.style.borderColor = sel.style.borderColor; };
      sel._combo = { btn, sync };
      sync();
      sel.addEventListener('change', sync);
      new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
      const open = (typed = '') => {
        closeCombo(); Q.closeMenus?.();
        const opts = [...sel.options]; opts.forEach((o, i) => { o._cid = o._cid || `cb${Math.random().toString(36).slice(2, 8)}`; });
        const search = opts.length > 9;
        const pop = document.createElement('div'); pop.className = 'combo-pop';
        // "Select…" placeholders aren't real choices: keep them out of the list.
        const isPh = o => o.value === '' && /^select/i.test(o.textContent.trim());
        pop.innerHTML = `${search ? `<div class="cb-search">${Q.icon('search')}<input type="text" placeholder="Search…" aria-label="Search options" value="${esc(typed)}"></div>` : ''}<ul role="listbox" tabindex="-1" aria-label="${esc(lab || 'Options')}">${opts.map((o, i) => isPh(o) ? '' : optHtml(o, i, i === sel.selectedIndex)).join('')}</ul><p class="cb-none" hidden>No matches</p>`;
        document.body.append(pop); Q.refreshIcons();
        const r = btn.getBoundingClientRect(), w = Math.max(r.width, 240);
        pop.style.width = `${w}px`; pop.style.left = `${Math.min(r.left, innerWidth - w - 8)}px`;
        const h = Math.min(pop.offsetHeight, 340), below = innerHeight - r.bottom - 8;
        pop.style.top = `${below >= h || below > r.top ? r.bottom + 4 : Math.max(8, r.top - h - 4)}px`;
        const list = pop.querySelector('ul'), input = pop.querySelector('input');
        let active = sel.selectedIndex;
        const items = () => [...list.querySelectorAll('li:not([hidden]):not(.dis)')];
        const setActive = li => { list.querySelectorAll('.active').forEach(x => x.classList.remove('active')); if (!li) return; li.classList.add('active'); active = +li.dataset.i; (input || list).setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); };
        const choose = li => { if (!li || li.classList.contains('dis')) return; sel.selectedIndex = +li.dataset.i; sel.dispatchEvent(new Event('change', { bubbles: true })); closeCombo(true); };
        const filter = () => { const q = input.value.trim().toLowerCase(); let any = false; list.querySelectorAll('li').forEach(li => { const on = !q || li.textContent.toLowerCase().includes(q); li.hidden = !on; any = any || on; }); pop.querySelector('.cb-none').hidden = any; setActive(items()[0]); };
        pop.addEventListener('mousedown', e => e.preventDefault());
        pop.addEventListener('click', e => choose(e.target.closest('li')));
        pop.addEventListener('mousemove', e => { const li = e.target.closest('li:not(.dis)'); if (li && !li.classList.contains('active')) setActive(li); });
        const key = e => {
          const its = items(), i = its.findIndex(li => +li.dataset.i === active);
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(its[Math.min(its.length - 1, i + 1)] || its[0]); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(its[Math.max(0, i - 1)] || its[0]); }
          else if (e.key === 'Home') { e.preventDefault(); setActive(its[0]); }
          else if (e.key === 'End') { e.preventDefault(); setActive(its[its.length - 1]); }
          else if (e.key === 'Enter') { e.preventDefault(); choose(its[i] || its[0]); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCombo(true); }
          else if (e.key === 'Tab') closeCombo();
          else if (!input && e.key.length === 1) { const hit = its.find(li => li.textContent.replace(/^\d[\d.]*\s*/, '').toLowerCase().startsWith(e.key.toLowerCase())); if (hit) setActive(hit); }
        };
        openCombo = { btn, pop, sel };
        btn.setAttribute('aria-expanded', 'true');
        if (input) { input.addEventListener('input', filter); input.addEventListener('keydown', key); input.focus(); if (typed) filter(); else setActive(list.querySelector(`li[data-i="${active}"]`) || items()[0]); }
        else { list.addEventListener('keydown', key); list.focus(); setActive(list.querySelector(`li[data-i="${active}"]`) || items()[0]); }
      };
      btn.addEventListener('click', () => openCombo?.btn === btn ? closeCombo(true) : open());
      btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } else if (e.key.length === 1 && /\S/.test(e.key) && sel.options.length > 9) { e.preventDefault(); open(e.key); } });
    });
  };
  document.addEventListener('mousedown', e => { if (openCombo && !openCombo.pop.contains(e.target) && e.target !== openCombo.btn && !openCombo.btn.contains(e.target)) closeCombo(); }, true);
  window.addEventListener('scroll', e => { if (openCombo && !openCombo.pop.contains(e.target)) closeCombo(); }, true);
  window.addEventListener('resize', () => closeCombo());

  /* ---------------- Router ---------------- */
  Q.route = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: Object.fromEntries(new URLSearchParams(qs || '')) };
  };
  Q.go = hash => { if (location.hash === hash) Q.render(); else location.hash = hash; };
  let lastPath = null;
  Q.render = (opts = {}) => {
    const { parts, q } = Q.route();
    let name = parts[0] || 'overview';
    // v3 aliases: old v2 links keep working.
    if (name === 'iso') { location.replace('#/evidence?view=clause'); return; }
    if (name === 'kpis') { location.replace('#/qms/objectives' + (location.hash.includes('?') ? '?' + location.hash.split('?')[1] : '')); return; }
    // Update 14: Internal Audit became the Audits module.
    if (name === 'audit' && !['actions', 'improvements'].includes(parts[1])) { location.replace(parts[1] === 'findings' ? '#/audits/nc?s=all' : parts[1] === 'coverage' ? '#/audits/programme?view=coverage' : '#/audits'); return; }
    if (name === 'audit' && parts[1] === 'actions') { location.replace('#/capa' + (location.hash.includes('?') ? '?' + location.hash.split('?')[1] : '')); return; }
    if (name === 'audit' && parts[1] === 'improvements') { location.replace('#/capa/improvements'); return; }
    if (name === 'reports') { location.replace('#/mgmt-review/reports'); return; }
    // Signed out: only the sign-in page is reachable.
    if (Q.UI.signedOut && name !== 'signin') { location.replace('#/signin'); return; }
    if (!Q.UI.signedOut && name === 'signin') { location.replace('#/overview'); return; }
    const view = Q.views[name] || Q.views.overview;
    Q.closeMenus();
    if (!opts.keepModals) Q.closeAllModals();
    const out = view(parts.slice(1), q) || {};
    const main = document.getElementById('main');
    main.innerHTML = out.html || '';
    main.className = out.full ? 'full' : 'page';
    document.title = `${out.title || 'iQMS'} · iQMS`;
    const tt = document.getElementById('topbarTitle'); if (tt) tt.textContent = (out.title || 'iQMS').split(' · ')[0];
    document.body.classList.toggle('auth', !!out.auth);
    Q.refreshIcons();
    if (out.after) out.after(main);
    main.querySelectorAll('[id^="tw-"]').forEach(w => Q.initTable(w.id.slice(3)));
    Q.enhanceSelects(main);
    Q.syncSidebar?.(out.nav || name, parts);
    const path = parts.slice(0, 2).join('/');
    if (lastPath !== null && path !== lastPath && !opts.noFocus) { window.scrollTo(0, 0); main.querySelector('h1')?.focus({ preventScroll: true }); }
    lastPath = path;
    if (q.focus) setTimeout(() => {
      const row = main.querySelector(`tr[data-key="${CSS.escape(q.focus)}"]`);
      if (row) { row.classList.add('flash'); row.scrollIntoView({ block: 'center' }); }
    }, 30);
  };
  window.addEventListener('hashchange', () => Q.render());
})();
