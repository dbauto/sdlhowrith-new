/* iQMS v2 — document control: library, viewer modal, Documents in Review, review page, revision & workflow modals. */
(() => {
  'use strict';
  const { esc, icon } = Q;

  /* How the file reaches iQMS — see Q.CLASSES in core.js.
   *   upload: stored in iQMS, shown in the viewer.   link: stays in SharePoint, description only. */
  const uploaded = d => d.source.mode === 'upload';
  Q.openLabel = d => uploaded(d) ? 'Download' : `Open in ${d.source.system}`;
  const openBtn = (d, cls = 'btn sm') => `<button class="${cls}" type="button" data-action="open-source" data-id="${esc(d.id)}" ${d.source.state === 'connected' ? '' : 'disabled title="Source access unavailable"'}>${icon(uploaded(d) ? 'download' : 'external-link')}${esc(Q.openLabel(d))}</button>`;
  const declaredBy = d => d.declared ? `Provided by ${esc(Q.pname(d.declared.by))} · ${Q.fmt(d.declared.date)}` : `Provided by ${esc(Q.pname(d.owner))}`;

  /* =================== Shared document table =================== */
  Q.docTable = (id, { process = null, initialFilters, initialSeg, hideProcess = false, compact = false, pageSize = 0, columns = null, where = null, initialSort, bare = false, extraTools = '', title = '', toolsEnd = '' } = {}) => {
    if (columns) return docViewTable(id, { process, pageSize, columns, where, initialSort, bare, extraTools, title, toolsEnd });
    const rows = () => Q.S.documents.filter(d => !process || Q.inProc(d.process, process));
    const all = rows();
    const segs = {
      published: d => d.status === 'Published',
      workflow: d => !!Q.wfForDoc(d.id),
      overdue: d => Q.docOverdue(d),
      draft: d => d.status === 'Draft'
    };
    const types = [...new Set(Q.S.documents.map(d => d.type))].sort();
    const tools = `
      <div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search ID, name or owner" aria-label="Search documents"></div>
      ${process ? (Q.children(process).length ? `<select class="select" data-filter="process" aria-label="Subprocess"><option value="all">All subprocesses</option>${Q.children(process).map(c => `<option value="${c.process_id}">${esc(c.process_code + ' ' + c.name)}</option>`).join('')}</select>` : '') : `<select class="select" data-filter="process" aria-label="Process">${Q.processOptions()}</select>`}
      <select class="select" data-filter="type" aria-label="Document type"><option value="all">All types</option>${types.map(t => `<option>${esc(t)}</option>`).join('')}</select>
      ${Q.seg('Document status', [['all', 'All', all.length], ['published', 'Published', all.filter(segs.published).length], ['workflow', 'In workflow', all.filter(segs.workflow).length], ['overdue', 'Review overdue', all.filter(segs.overdue).length], ['draft', 'Draft', all.filter(segs.draft).length]], initialSeg || 'all')}`;
    const cols = [
      { key: 'id', label: 'Document ID', cls: 'c-id', sort: d => d.id, render: d => esc(d.id) },
      { key: 'title', label: 'Document name', min: '200px', sort: d => d.title, render: d => `<button type="button" class="doc-link" data-action="open-doc" data-id="${esc(d.id)}" title="Open ${esc(d.id)}">${esc(d.title)}</button>` },
      ...(hideProcess && !(process && Q.children(process).length) ? [] : [{ key: 'process', label: process ? 'Subprocess' : 'Process', sort: d => Q.proc(d.process)?.process_code, render: d => Q.pcell(d.process) }]),
      { key: 'type', label: 'Type', sort: d => d.type, render: d => esc(d.type) },
      { key: 'rev', label: 'Rev', cls: 'c-rev', sort: d => d.rev || '', render: d => `${d.rev ? esc(d.rev) : '<span class="muted" title="Not yet published">—</span>'}${d.workingRev && d.status !== 'Published' ? ` <span class="rev-next" title="Rev ${esc(d.workingRev)} in progress">→ ${esc(d.workingRev)}</span>` : ''}` },
      { key: 'status', label: 'Status', sort: d => d.status, render: d => Q.docStatus(d) },
      { key: 'owner', label: 'Owner', sort: d => Q.pname(d.owner), render: d => `<span class="nowrap">${esc(Q.pname(d.owner))}</span>` },
      ...(compact ? [] : [{ key: 'updated', label: 'Last updated', cls: 'c-date hide-lg', sort: d => d.updated, render: d => Q.fmt(d.updated) }]),
      { key: 'next', label: 'Next review', cls: 'c-date', sort: d => d.nextReview || '9999', render: d => Q.reviewDate(d.nextReview, Q.docOverdue(d), Q.docDueSoon(d)) },
      { key: 'actions', label: '', cls: 'c-actions c-menu', render: d => `<span class="row-menu">${Q.docMenu(d)}</span>` }
    ];
    return Q.table({
      id, rows, columns: cols, selectable: true, tight: true, noun: 'documents', caption: 'Controlled documents',
      rowLabel: d => d.title, search: d => `${d.id} ${d.title} ${Q.pname(d.owner)} ${d.type}`,
      filters: { process: (d, v) => Q.inProc(d.process, v), type: (d, v) => d.type === v }, segs,
      initialFilters, initialSeg, tools, pageSize, expand: Q.docExpand,
      empty: t => `<h3>No documents match these filters</h3><p>${t.seg === 'overdue' ? 'No documents are overdue for review.' : 'Clear a filter or register a document.'}</p>`,
      selectionBar: keys => keys.length === 1 ? Q.docSelectionActions(Q.doc(keys[0]))
        : `<button class="btn sm" type="button" data-action="export-selected">${icon('download')}Export selected</button>
          <button class="btn sm" type="button" data-action="toast" data-title="Change owner" data-msg="An owner picker would reassign ${keys.length} documents.">${icon('user-check')}Change owner…</button>
          <button class="btn sm" type="button" data-action="toast" data-title="Reminder sent" data-msg="Owners of ${keys.length} selected documents were reminded of upcoming periodic reviews.">${icon('bell')}Remind owners</button>`
    });
  };

  const docSelBar = keys => keys.length === 1 ? Q.docSelectionActions(Q.doc(keys[0]))
    : `<button class="btn sm" type="button" data-action="export-selected">${icon('download')}Export selected</button>
      <button class="btn sm" type="button" data-action="toast" data-title="Change owner" data-msg="An owner picker would reassign ${keys.length} documents.">${icon('user-check')}Change owner…</button>
      <button class="btn sm" type="button" data-action="toast" data-title="Reminder sent" data-msg="Owners of ${keys.length} selected documents were reminded of upcoming periodic reviews.">${icon('bell')}Remind owners</button>`;
  /* Saved-view table: columns and filter come from the view; search stays per session. */
  function docViewTable(id, { process, pageSize, columns, where, initialSort, bare, extraTools, title = '', toolsEnd = '' }) {
    const fcol = f => ({ key: f.key, label: f.key === 'process' && process ? 'Subprocess' : f.label, cls: f.cls, min: f.min, sort: f.sort, render: f.render });
    const cols = columns.map(k => Q.field('documents', k)).filter(Boolean).filter(f => !(f.key === 'process' && process && !Q.children(process).length)).map(fcol);
    cols.push({ key: 'actions', label: '', cls: 'c-actions c-menu', render: d => `<span class="row-menu">${Q.docMenu(d)}</span>` });
    return Q.table({
      id, rows: () => Q.S.documents.filter(d => (!process || Q.inProc(d.process, process)) && (!where || where(d))), columns: cols,
      selectable: true, tight: true, noun: 'documents', caption: 'Controlled documents', rowLabel: d => d.title,
      search: d => `${d.id} ${d.title} ${Q.pname(d.owner)} ${d.type}`, pageSize, expand: Q.docExpand, bare,
      // Header sorting is temporary; the view's default sort applies when the table is first shown.
      ...(Q.tables[id] ? {} : { initialSort }),
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search ID, name or owner" aria-label="Search documents"></div>${extraTools}${toolsEnd ? `<span class="ui-bt-sp"></span>${toolsEnd}` : ''}`,
      ...(title !== '' ? { board: { title } } : {}),
      empty: '<h3>No documents match this view</h3><p>Change the filters, or clear the search.</p>', selectionBar: docSelBar });
  }

  /* Expanded row: what you'd otherwise open the viewer to find out. */
  Q.docExpand = d => {
    const w = Q.wfForDoc(d.id), wr = d.workingRev && (Q.S.revisions[d.id] || []).find(r => r.rev === d.workingRev);
    const ev = [...new Set([...d.evidence, ...Q.S.evidence.filter(e => e.doc === d.id).map(e => e.id)])].map(id => Q.S.evidence.find(e => e.id === id)).filter(Boolean);
    const iso = Q.docIso(d), risks = Q.S.risks.filter(r => r.links.includes(d.id));
    return `<div class="doc-exp">
      <div><h4>${Q.docRestricted(d) ? "Owner's description" : 'About'}</h4><p>${esc(d.description)}</p>
        <p style="margin-top:8px">${Q.classChip(d)}${Q.docRestricted(d) ? ' <span class="muted">iQMS has this description only — it does not read the file.</span>' : ''}</p>
        ${wr ? `<p style="margin-top:6px"><b style="color:var(--text)">Rev ${esc(d.rev || '—')} → ${esc(wr.rev)}:</b> ${esc(wr.summary || 'No change summary yet.')}</p>` : `<p style="margin-top:6px" class="muted">Active revision ${esc(d.rev ? 'Rev ' + d.rev : '—')}${d.effective ? ', effective ' + Q.fmt(d.effective) : ''}.</p>`}</div>
      <div><h4>Routing</h4>${w ? `<ul><li>${Q.st(Q.wfStatus(w))} · Rev ${esc(w.rev)}</li><li>Waiting on <b style="color:var(--text)">${esc(Q.wfAssignees(w).map(Q.pname).join(', ') || '—')}</b></li><li>Due ${Q.dueDate(w.due)}</li></ul>` : `<p class="muted">Not in routing.</p>`}
        <h4 style="margin-top:10px">File</h4><p>${d.source.state !== 'connected' ? '<span class="src-bad">Access unavailable</span>' : uploaded(d) ? `Stored in iQMS · ${esc(d.source.size || '')}` : `${esc(d.source.system)} link · ${esc(d.source.folder)}`}</p></div>
      <div><h4>Linked</h4><ul>
        <li>ISO 9001 ${iso.length ? iso.map(c => `<a href="#/documents?view=clause&c=${esc(c)}" class="clause">${esc(c)}</a>`).join(', ') : '<span class="muted">not mapped</span>'}</li>
        <li>${ev.length ? `${ev.length} evidence record${ev.length > 1 ? 's' : ''}${ev.some(Q.evGap) ? ` · <span class="date-overdue">${ev.filter(Q.evGap).length} gap</span>` : ''}` : '<span class="muted">No evidence linked</span>'}</li>
        ${risks.length ? `<li>${risks.length} linked risk${risks.length > 1 ? 's' : ''}</li>` : ''}
        <li>Owner ${esc(Q.pname(d.owner))}</li></ul></div>
      <div class="acts"><button class="btn sm primary" type="button" data-action="open-doc" data-id="${esc(d.id)}">${icon('file-text')}Open Document</button>${w ? `<button class="btn sm" type="button" data-action="open-review" data-id="${w.id}">${icon('route')}Open Review</button>` : ''}${openBtn(d)}</div>
    </div>`;
  };

  Q.canCreateRevision = d => {
    if (!d) return { ok: false };
    if (d.workingRev) return { ok: false, why: `Rev ${d.workingRev} is already in progress (${d.status}). Only one working revision can exist at a time.` };
    if (d.status !== 'Published') return { ok: false, why: 'Only a published document can be revised.' };
    return { ok: true };
  };
  Q.canStartWorkflow = d => {
    const w = Q.wfForDoc(d.id);
    if (w) return { ok: false, w, why: `${w.stage === 'review' ? 'Review' : 'Approval'} in progress for Rev ${w.rev} — started by ${Q.pname(w.startedBy)} on ${Q.fmt(w.started)}.` };
    if (!d.workingRev) return { ok: false, why: 'Create a revision first. The published revision cannot be re-approved.' };
    return { ok: true };
  };
  Q.docSelectionActions = d => {
    const w = Q.wfForDoc(d.id), rev = Q.canCreateRevision(d), wfOk = Q.canStartWorkflow(d);
    return `<button class="btn sm primary" type="button" data-action="open-doc" data-id="${esc(d.id)}">${icon('file-text')}Open Document</button>
      ${w ? `<button class="btn sm" type="button" data-action="open-review" data-id="${w.id}">Open Review</button>` : ''}
      <button class="btn sm" type="button" data-action="create-revision" data-id="${esc(d.id)}" ${rev.ok ? '' : 'disabled'} title="${esc(rev.why || '')}">Create Revision</button>
      <button class="btn sm" type="button" data-action="request-review" data-id="${esc(d.id)}" ${wfOk.ok ? '' : 'disabled'} title="${esc(wfOk.why || '')}">Request Review</button>
      <button class="btn sm" type="button" data-action="request-approval" data-id="${esc(d.id)}" ${wfOk.ok ? '' : 'disabled'} title="${esc(wfOk.why || '')}">Request Approval</button>
      ${w ? `<span class="small" style="color:var(--warning)">${icon('lock')} ${w.stage === 'review' ? 'Review' : 'Approval'} in progress · ${esc(Q.wfAssignees(w).map(Q.pname).join(', '))}</span>` : (!rev.ok || !wfOk.ok) ? `<span class="small muted">${esc(!wfOk.ok && d.workingRev ? wfOk.why : rev.why || '')}</span>` : ''}`;
  };
  Q.docMenu = d => {
    const w = Q.wfForDoc(d.id), rev = Q.canCreateRevision(d), wfOk = Q.canStartWorkflow(d);
    return Q.menu(`Actions for ${d.id} ${d.title}`, [
      { label: 'Open Document', icon: 'file-text', data: { action: 'open-doc', id: d.id } },
      ...(w ? [{ label: 'Open Review', icon: 'file-check', data: { action: 'open-review', id: w.id } }] : []),
      '-',
      { label: 'Create Revision', icon: 'git-branch-plus', data: { action: 'create-revision', id: d.id }, disabled: !rev.ok, title: rev.why },
      { label: 'Request Review', icon: 'send', data: { action: 'request-review', id: d.id }, disabled: !wfOk.ok, title: wfOk.why },
      { label: 'Request Approval', icon: 'stamp', data: { action: 'request-approval', id: d.id }, disabled: !wfOk.ok, title: wfOk.why },
      ...(!wfOk.ok && wfOk.w ? [{ note: esc(wfOk.why) }] : []),
      '-',
      { label: Q.openLabel(d), icon: uploaded(d) ? 'download' : 'external-link', data: { action: 'open-source', id: d.id }, disabled: d.source.state !== 'connected', title: d.source.state !== 'connected' ? 'Source access unavailable' : '' }
    ], { align: 'min-width:240px' });
  };

  /* =================== Documented Information (organization-wide) ===================
   * ONE library. "List", "By process" and "By ISO 9001 clause" are views of the same
   * records — a document is never duplicated. Routing = review → approval → publication. */
  Q.docTabs = cur => {
    const mine = Q.myWorkflows().length, all = Q.S.workflows.length;
    return `<div class="tabs page-tabs" role="tablist" aria-label="Documented Information">
      <a role="tab" href="${Q.UI.docsView && Q.UI.docsView.startsWith('#/documents') ? Q.UI.docsView : '#/documents'}" aria-selected="${cur === 'library'}">${icon('library')}Library<span class="muted small tnum">${Q.S.documents.length}</span></a>
      <a role="tab" href="#/review" aria-selected="${cur === 'routing'}">${icon('route')}Routing<span class="muted small tnum">${all}</span>${mine ? `<span class="tab-note" style="color:var(--accent)">${mine} for you</span>` : ''}</a></div>`;
  };
  const docHead = (crumbs = null) => Q.pageHead({ crumbs, title: 'Documented Information', sub: 'Controlled documents (ISO 9001 clause 7.5). Public and Internal documents are uploaded to iQMS; Confidential documents stay in SharePoint and are registered by link and description.',
    actions: `<button class="btn primary" type="button" data-action="connect-doc">${icon('file-plus')}Register Document</button>` });
  /* ---------- Saved views on the Library ----------
   * One card holds the view tabs, the toolbar and the table (see Q.viewPage in
   * saved-views.js). The views the mock shipped with are seeded defaults.        */
  const T = 'documents';
  Q.viewPage(T, { route: '#/documents', noun: 'documents', groups: [['none', 'None'], ['process', 'Process'], ['clause', 'ISO 9001 clause'], ['owner', 'Owner'], ['department', 'Department']],
    // Old links (?view=, ?status=, ?process=, ?group=) open the matching default view.
    legacy: q => {
      const group = q.group || (['process', 'clause'].includes(q.view) ? q.view : null);
      if (group) return { group, fallback: 'v-all' };
      if (q.status) return { id: { overdue: 'v-overdue', published: 'v-published', workflow: 'v-workflow', draft: 'v-draft' }[q.status], fallback: 'v-all' };
      if (q.process) return { group: 'process', fallback: 'v-all', extra: { p: q.process } };
      if (q.view === 'list') return { id: 'v-all' };
      return null;
    } });
  const hashFor = (v, extra) => Q.vwHash(T, v, extra);
  Q.docGroupFlag = { test: d => Q.docOverdue(d), title: 'overdue for review' };
  Q.views.documents = (_, q) => {
    const r = Q.vwResolve(T, q);
    if (r.redirect) { location.replace(r.redirect); return { title: 'Documented Information', nav: 'documents', html: '' }; }
    const v = r.v, where = Q.matcher(T, v.filters);
    Q.vwRemember(T); Q.UI.docsView = location.hash; Q.saveUI();
    let body, leaf = null, side = '';
    if (v.group === 'process') { const p = Q.proc(q.p) || Q.topProcesses().find(x => Q.S.documents.some(d => where(d) && Q.inProc(d.process, x.process_id))) || Q.topProcesses()[0]; leaf = `${p.process_code} ${p.name}`; ({ html: body, side } = docsByProcess(v, v, where, p.process_id)); }
    else if (v.group === 'clause') { const c = q.c || (Q.CLAUSES.find(([k]) => Q.docsForClause(k).some(where)) || ['4'])[0]; leaf = c === 'none' ? 'Not mapped to a clause' : `${c} ${c.includes('.') ? Q.S.iso.find(x => x.clause === c)?.title || '' : Q.clauseTitle(c)}`; ({ html: body, side } = docsByClause(v, v, where, c)); }
    else if (Q.vwFieldGroup(v.group)) { const g = Q.vwGrouped(T, v, where, q, Q.docTable, { flag: Q.docGroupFlag }); leaf = g.leaf; body = g.html; side = g.side; }
    else body = Q.docTable(Q.vwTableId(T, v), { columns: v.columns, where, pageSize: 10, initialSort: v.sort, bare: true, extraTools: Q.vwSummary(T, v) });
    const crumbs = [['Documented Information', '#/documents?view=list'], ...(leaf ? [[v.name, hashFor(v)], [leaf]] : [[v.name]])];
    return { title: `${leaf || v.name} · Documented Information`, nav: 'documents', html: docHead(crumbs) + Q.docTabs('library') + Q.vwCard(T, v, body, side), after: main => Q.vwAfter(T, main) };
  };

  function docsByProcess(v, dr, where, pid) {
    const top = Q.topProcesses(), p = Q.proc(pid), docs = Q.S.documents.filter(where);
    const n = id => docs.filter(d => Q.inProc(d.process, id)).length;
    const od = id => docs.filter(d => Q.inProc(d.process, id) && Q.docOverdue(d)).length;
    const item = (x, child = false) => ({ href: hashFor(v, { p: x.process_id }), on: x.process_id === pid, child, label: `${x.process_code} ${x.name}`, n: n(x.process_id), bad: od(x.process_id) });
    return { side: Q.gSide('Processes', top.flatMap(x => [item(x), ...Q.children(x.process_id).map(c => item(c, true))])),
      html: Q.docTable(Q.vwTableId(T, v, pid), { process: pid, columns: dr.columns, where, initialSort: dr.sort, bare: true, title: false, extraTools: Q.vwSummary(T, v) }) };
  }

  Q.docsByClause = (...a) => docsByClause(...a);
  function docsByClause(v, dr, where, sel) {
    const S = Q.S;
    const top = Q.CLAUSES.find(c => c[0] === Q.clauseTop(sel || '')) ? Q.clauseTop(sel) : '4';
    const focus = sel && sel.includes('.') ? sel : null;
    const inView = list => list.filter(where);
    const unmapped = inView(S.documents.filter(d => !Q.docIso(d).length));
    const worst = reqs => reqs.some(r => ['Missing', 'At Risk'].includes(r.status)) ? 'bad' : reqs.some(r => r.status === 'Partially Complete') ? 'warn' : 'ok';
    const items = Q.CLAUSES.flatMap(([c, t]) => [{ href: hashFor(v, { c }), on: c === top && !focus && sel !== 'none', label: `${c} ${t}`, n: inView(Q.docsForClause(c)).length, bad: worst(Q.reqsIn(c)) === 'bad' },
      ...(c === top ? Q.reqsIn(c).map(r => ({ href: hashFor(v, { c: r.clause }), on: focus === r.clause, child: true, label: `${r.clause} ${r.title}`, n: inView(Q.docsForClause(r.clause)).length, bad: ['Missing', 'At Risk'].includes(r.status) })) : [])]);
    items.push({ href: hashFor(v, { c: 'none' }), on: sel === 'none', label: 'Not mapped to a clause', n: unmapped.length });
    const selected = sel === 'none' ? unmapped : inView(Q.docsForClause(focus || top));
    const tableWhere = d => sel === 'none' ? !Q.docIso(d).length : Q.docIso(d).some(c => Q.clauseIn(c, focus || top));
    const html = selected.length ? Q.docTable(Q.vwTableId(T, v, `clause-${String(sel).replace(/[^a-z0-9]+/gi, '_')}`), { columns: dr.columns, where: d => where(d) && tableWhere(d), pageSize: 10, initialSort: dr.sort, bare: true, title: false, extraTools: Q.vwSummary(T, v) })
      : `<div class="vc-body"><div class="vc-summary">${Q.vwSummary(T, v)}</div><div class="empty panel"><h3>No documents in this view for ${esc(sel === 'none' ? 'unmapped documents' : focus || top)}</h3><p>Change the view filters or choose another clause.</p></div></div>`;
    return { side: Q.gSide(`${Q.standard()} clauses`, items), html };
  }

  /* =================== Document viewer modal =================== */
  /* Link-only documents: iQMS never has the content, so the preview is the owner's description plus the disclaimer. */
  Q.restrictedPanel = (d, rev, draft = false) => `<article class="paper restricted" aria-label="Document content is not available in iQMS">
      <div class="rs-top"><span class="rs-icon">${icon(Q.docClass(d).icon)}</span><div><h2>This document is not stored in iQMS</h2>
        <p>${Q.classChip(d)} It stays in ${esc(d.source.system)}. iQMS keeps the link, the revision and routing records, and the description below.</p></div></div>
      ${draft ? `<p class="callout warning">${icon('file-text')}<span>${Q.wfForDoc(d.id) ? `<b>Draft for ${esc(Q.wfForDoc(d.id).stage)} — Rev ${esc(rev)}</b>Open the file in ${esc(d.source.system)} to check its content. iQMS records your decision; it cannot show the file.` : `<b>Draft — Rev ${esc(rev)}</b>Not a controlled copy. The active controlled version is ${d.rev ? 'Rev ' + esc(d.rev) : 'not yet published'}.`}</span></p>` : ''}
      <section class="rs-desc"><h3>Description of the document</h3><p>${esc(d.description)}</p><p class="rs-by">${declaredBy(d)}</p></section>
      <div class="callout warning rs-note">${icon('triangle-alert')}<div><b>Disclaimer — assessed from the description only</b><p>${esc(Q.RESTRICTED_NOTE)}</p></div></div>
      <div class="rs-open">${openBtn(d, 'btn primary')}<span class="muted small">${d.source.state === 'connected' ? `Opens with your own ${esc(d.source.system)} permission.` : 'The link could not be reached at the last check.'}</span></div>
      <div class="foot"><span>${esc(d.id)} · Rev ${esc(rev || '—')}</span><span>${esc(d.classification)}</span><span>${esc(d.source.library)} / ${esc(d.source.folder)}</span></div>
    </article>`;
  Q.paper = (d, rev, draft = false) => {
    if (Q.docRestricted(d)) return Q.restrictedPanel(d, rev, draft);
    if (Q.orgChartPaper && d.id === Q.S.context?.orgChartDoc) return Q.orgChartPaper(d, rev, draft);
    const p = Q.proc(d.process), root = Q.proc(Q.rootId(d.process));
    const els = (root?.elements || []).filter(e => e.kind !== 'Activity');
    const recs = (root?.elements || []).filter(e => ['Record', 'Form', 'Register'].includes(e.kind));
    const isoList = Q.docIso(d);
    return `<article class="paper" aria-label="Document preview">
      ${draft ? `<p class="callout warning" style="margin-bottom:18px">${icon('file-text')}<span><b>Draft for ${esc(Q.wfForDoc(d.id)?.stage || 'review')} — Rev ${esc(rev)}</b>Not a controlled copy. The active controlled version is ${d.rev ? 'Rev ' + esc(d.rev) : 'not yet published'}.</span></p>` : ''}
      <div class="paper-head"><div class="co">${esc(Q.S.organization.name)}<span>Quality Management System · ${esc(Q.plabel(Q.rootId(d.process)))}</span></div>
      <table><tr><td>Document</td><td><b>${esc(d.id)}</b></td></tr><tr><td>Revision</td><td><b>${esc(rev || '—')}</b></td></tr><tr><td>Effective</td><td>${draft ? 'On publication' : Q.fmt(d.effective)}</td></tr><tr><td>Owner</td><td>${esc(Q.pname(d.owner))}</td></tr></table></div>
      <h2>${esc(d.title)}</h2>
      <h3>1. Purpose</h3><p>${esc(d.description)}</p>
      <h3>2. Scope</h3><p>Applies to all ${esc(p?.name.toLowerCase() || '')} activities performed by ${esc(Q.S.organization.name)} employees and subcontractors.</p>
      <h3>3. Responsibilities</h3><table class="resp"><tr><th>Role</th><th>Responsibility</th></tr><tr><td>Process Owner (${esc(Q.person(root?.owner).title)})</td><td>Maintains this document and ensures it is followed.</td></tr>${(root?.roles || []).slice(1).map(r => `<tr><td>${esc(r)}</td><td>Perform the activities described and retain the required records.</td></tr>`).join('')}</table>
      <h3>4. Method</h3><ol>${els.slice(0, 6).map(e => `<li>${esc(e.name)} — perform and record as described in the related ${esc(e.kind.toLowerCase())}.</li>`).join('')}</ol>
      <h3>5. Records</h3><ul>${recs.map(e => `<li>${esc(e.name)}</li>`).join('') || '<li>As defined by the process owner.</li>'}</ul>
      <h3>6. References</h3><ul>${[...d.refs.map(r => `${r} ${Q.doc(r)?.title || ''}`), ...isoList.map(c => `${Q.standard()} clause ${c}`)].map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
      <div class="foot"><span>${esc(d.id)} · Rev ${esc(rev || '—')}</span><span>Controlled copy only when viewed in iQMS</span><span>Page 1 of 1</span></div>
    </article>`;
  };
  Q.sourceBlock = d => Q.classChip(d) + (uploaded(d)
    ? `<span class="src-ok">${icon('circle-check')}Stored in iQMS</span><span class="file">${esc(d.source.file)}</span><span class="muted">${esc(d.source.size || '')} · uploaded ${Q.fmt(d.source.verified)}</span>`
    : d.source.state === 'connected'
      ? `<span class="src-lock">${icon('lock')}Link only</span><span>${esc(d.source.system)} · ${esc(d.source.library)} / ${esc(d.source.folder)}</span><span class="file">${esc(d.source.file)}</span><span class="muted">Link checked ${Q.fmt(d.source.verified)} · not read by iQMS</span>`
      : `<span class="src-bad">${icon('triangle-alert')}Access unavailable</span><span class="file">${esc(d.source.file)}</span><span class="muted">Link last checked ${Q.fmt(d.source.verified)}</span>`);

  /* ---------- Revision routing timeline: who started the revision, each review, approval and publication ---------- */
  const STAGE_KIND = { Draft: 'neutral', Review: 'info', Approval: 'warning', Publication: 'accent', Published: 'success', Changes: 'orange' };
  const avatars = ids => `<span class="tl-avatars">${ids.slice(0, 4).map(w => `<span class="avatar xs" title="${esc(Q.pname(w))}">${esc(Q.initials(w))}</span>`).join('')}${ids.length > 4 ? `<span class="avatar xs more">+${ids.length - 4}</span>` : ''}</span>`;
  const chip = (ic, label, value, kind = '') => `<span class="tl-chip ${kind}">${ic ? icon(ic) : ''}${label ? `<span>${esc(label)}</span>` : ''}${value ? `<b>${esc(value)}</b>` : ''}</span>`;
  // Events for a revision that is being routed now (live from the workflow), oldest first; open steps follow as "waiting".
  Q.wfTrail = (w, r) => {
    const ev = [], used = new Set();
    const note = (who, date) => { const c = w.comments.find((x, i) => !used.has(i) && x.who === who && x.date === date); if (c) used.add(w.comments.indexOf(c)); return c?.text || ''; };
    ev.push({ at: w.started, who: w.startedBy, verb: 'started routing for', obj: `Rev ${w.rev}`, desc: r?.summary || '', icon: 'route', stage: 'Review',
      chips: [avatars(w.reviewers.map(x => x.who)), chip('', 'Reviewers', String(w.reviewers.length)), chip('calendar', 'Due', Q.fmt(w.due))] });
    w.reviewers.filter(x => x.date).forEach(x => { const changes = x.state === 'Changes requested';
      ev.push({ at: x.date, who: x.who, verb: changes ? 'requested changes to' : 'completed review of', obj: `Rev ${w.rev}`, quote: note(x.who, x.date), stage: changes ? 'Changes' : 'Review', icon: changes ? 'message-square' : 'file-check' }); });
    w.approvers.filter(x => x.date).forEach(x => { const changes = x.state === 'Changes requested';
      ev.push({ at: x.date, who: x.who, verb: changes ? 'requested changes to' : 'approved', obj: `Rev ${w.rev}`, quote: note(x.who, x.date), stage: changes ? 'Changes' : 'Approval', icon: changes ? 'message-square' : 'stamp' }); });
    w.comments.forEach((c, i) => { if (!used.has(i)) ev.push({ at: c.date, who: c.who, verb: 'commented on', obj: `Rev ${w.rev}`, quote: c.text, stage: null, icon: 'message-square' }); });
    ev.sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
    // What is still open, in routing order.
    const waiting = [];
    if (w.changesRequested) waiting.push({ who: w.startedBy, verb: 'to submit an updated draft of', obj: `Rev ${w.rev}`, stage: 'Changes' });
    else {
      if (w.stage === 'review') w.reviewers.filter(x => x.state === 'Pending').forEach(x => waiting.push({ who: x.who, verb: 'to review', obj: `Rev ${w.rev}`, stage: 'Review', due: w.due }));
      if (['review', 'approval'].includes(w.stage)) w.approvers.filter(x => !['Approved'].includes(x.state)).forEach(x => waiting.push({ who: x.who, verb: 'to approve', obj: `Rev ${w.rev}`, stage: 'Approval', due: w.stage === 'approval' ? w.due : null }));
      waiting.push({ who: w.publisher, verb: 'to publish', obj: `Rev ${w.rev}`, stage: 'Publication' });
    }
    return ev.concat(waiting.map((x, i) => ({ ...x, pending: true, current: i === 0 && !w.changesRequested ? true : !!w.changesRequested })));
  };
  // Events for a revision that is no longer routed: stored at publication, or rebuilt from the revision record for older history.
  Q.revTrail = (d, r) => {
    const w = Q.S.workflows.find(x => x.doc === d.id && x.rev === r.rev);
    if (w) return Q.wfTrail(w, r);
    if (r.trail) return r.trail;
    if (!r.published) return [{ at: r.date, who: r.author, verb: 'started draft', obj: `Rev ${r.rev}`, desc: r.summary || '', icon: 'file-text', stage: 'Draft' }, { who: r.author, verb: 'to send', obj: `Rev ${r.rev}`, tail: 'for review', stage: 'Draft', pending: true, current: true }];
    const pub = r.published, reviewers = (r.reviewers || []).length ? r.reviewers : ['maria'];
    const approver = d.owner === 'eric' ? 'maria' : 'eric', publisher = 'nina';
    const day = n => Q.addDays(pub, -n);
    return [
      { at: day(21), who: r.author, verb: 'started routing for', obj: `Rev ${r.rev}`, desc: r.summary || '', icon: 'route', stage: 'Review', chips: [avatars(reviewers), chip('', 'Reviewers', String(reviewers.length))] },
      ...reviewers.map((x, i) => ({ at: day(12 - i), who: x, verb: 'completed review of', obj: `Rev ${r.rev}`, icon: 'file-check', stage: 'Review' })),
      { at: day(4), who: approver, verb: 'approved', obj: `Rev ${r.rev}`, icon: 'stamp', stage: 'Approval' },
      { at: pub, who: publisher, verb: 'published', obj: `Rev ${r.rev}`, icon: 'send', stage: 'Published', chips: [chip('calendar', 'Effective', Q.fmt(pub))] }];
  };
  Q.revTimeline = (events, { compact = false } = {}) => events.length ? `<ol class="tl${compact ? ' compact' : ''}">${events.map(e => `<li class="tl-item${e.pending ? ' pending' : ''}${e.current ? ' current' : ''}">
      <span class="tl-mark">${e.pending ? `<span class="tl-dot"></span>` : `<span class="avatar sm" title="${esc(Q.pname(e.who))}">${esc(Q.initials(e.who))}</span>`}</span>
      <div class="tl-body">
        <div class="tl-head">${e.pending ? `<span class="muted">Waiting for</span> <b>${esc(Q.pname(e.who))}</b> <span class="muted">${esc(e.verb)}</span> <b>${esc(e.obj)}</b>${e.tail ? ` <span class="muted">${esc(e.tail)}</span>` : ''}` : `<b>${esc(Q.pname(e.who))}</b> <span class="muted">${esc(e.verb)}</span> <b>${esc(e.obj)}</b>`}</div>
        ${e.desc ? `<p class="tl-desc">${esc(e.desc)}</p>` : ''}
        ${e.quote ? `<div class="tl-quote">${icon('message-square')}<span>${esc(e.quote)}</span></div>` : ''}
        ${e.chips?.length ? `<div class="tl-chips">${e.chips.join('')}</div>` : ''}
        <div class="tl-foot">${e.at ? `<span class="tl-when">${Q.fmt(e.at)}</span>` : e.due ? `<span class="tl-when">Due ${Q.fmt(e.due)}</span>` : ''}${e.stage ? Q.ui.badge(e.stage === 'Changes' ? 'Changes requested' : e.stage, STAGE_KIND[e.stage]) : ''}${e.current ? Q.ui.badge('Current step', 'info', { dot: true }) : ''}</div>
      </div></li>`).join('')}</ol>` : '<p class="muted small">No routing history.</p>';

  // Revision list. With { trail: true } each revision expands to its routing timeline (newest open by default).
  Q.revList = (d, { trail = false, openFirst = true } = {}) => {
    const list = [...(Q.S.revisions[d.id] || [])].reverse();
    if (!list.length) return '<p class="muted">No revisions yet.</p>';
    const head = r => `<div class="rev-top"><span class="rev-no">Rev ${esc(r.rev)}</span>${Q.st(r.state === 'Published' ? 'Published — active' : r.state, r.state === 'Published' ? 'success' : undefined)}</div>
      <div class="rev-sum">${esc(r.summary || 'No change summary yet.')}</div>
      <div class="rev-meta">${esc(Q.pname(r.author))} · ${r.published ? 'published ' + Q.fmt(r.published) : 'started ' + Q.fmt(r.date)}${r.approval ? ' · ' + esc(r.approval) : ''}</div>`;
    if (!trail) return `<ul class="rev-list">${list.map(r => `<li class="${r.state === 'Published' ? 'active-rev' : ''}">${head(r)}</li>`).join('')}</ul>`;
    return `<ul class="rev-list rev-trail">${list.map((r, i) => { const ev = Q.revTrail(d, r), done = ev.filter(e => !e.pending).length;
      return `<li class="${r.state === 'Published' ? 'active-rev' : ''}"><details${i === 0 && openFirst ? ' open' : ''}><summary>${head(r)}<span class="rev-toggle">${icon('chevron-down')}${done} step${done === 1 ? '' : 's'}${ev.some(e => e.pending) ? ' · in routing' : ''}</span></summary>${Q.revTimeline(ev, { compact: true })}</details></li>`; }).join('')}</ul>`;
  };
  Q.linkedItems = d => {
    const docRow = id => { const x = Q.doc(id); return x ? `<li>${icon('file-text')}<div class="ll-main"><b>${esc(x.title)}</b><span>${esc(x.id)} · Rev ${esc(x.rev || '—')}</span></div><button class="btn sm" type="button" data-action="open-doc" data-id="${esc(x.id)}" data-stack="1">Open</button></li>` : ''; };
    const ev = [...new Set([...d.evidence, ...Q.S.evidence.filter(e => e.doc === d.id).map(e => e.id)])].map(id => Q.S.evidence.find(e => e.id === id)).filter(Boolean);
    const risks = Q.S.risks.filter(r => r.links.includes(d.id));
    const iso = Q.docIso(d);
    return `<div class="side-section"><h3>References</h3>${d.refs.length ? `<ul class="link-list">${d.refs.map(docRow).join('')}</ul>` : '<p class="muted small">No references.</p>'}</div>
      <div class="side-section"><h3>Evidence</h3>${ev.length ? `<ul class="link-list">${ev.map(e => `<li>${icon('paperclip')}<div class="ll-main"><b>${esc(e.name)}</b><span>${esc(e.source.system)} · ${esc(e.id)}</span></div>${Q.st(e.status, Q.EV_KIND[e.status])}</li>`).join('')}</ul>` : '<p class="muted small">No evidence linked.</p>'}
        <button class="btn sm" type="button" data-action="link-evidence" data-doc="${esc(d.id)}" data-process="${esc(d.process)}" style="margin-top:8px">${icon('link')}Link Evidence</button></div>
      <div class="side-section"><h3>Related documents</h3>${d.related.length ? `<ul class="link-list">${d.related.map(docRow).join('')}</ul>` : '<p class="muted small">None.</p>'}</div>
      ${risks.length ? `<div class="side-section"><h3>Risks</h3><ul class="link-list">${risks.map(r => `<li>${icon('shield-alert')}<div class="ll-main"><b>${esc(r.title)}</b><span>${esc(r.id)} · ${Q.riskLevel(r)}</span></div></li>`).join('')}</ul></div>` : ''}
      <div class="side-section"><h3>ISO 9001 mapping</h3>${iso.length ? `<div class="chip-list">${iso.map(c => `<span class="tag">Clause ${esc(c)}</span>`).join('')}</div>` : '<p class="muted small">Not mapped.</p>'}</div>`;
  };
  Q.docDetails = d => {
    const w = Q.wfForDoc(d.id), rev = Q.canCreateRevision(d), wfOk = Q.canStartWorkflow(d);
    return `${w ? `<div style="margin-bottom:16px">${Q.lockCallout(w)}</div>` : ''}
      <div class="side-section"><dl class="dl-list">
        <dt>Document ID</dt><dd class="tnum">${esc(d.id)}</dd>
        <dt>Process</dt><dd>${Q.pcell(d.process)}</dd>
        <dt>Type</dt><dd>${esc(d.type)}</dd>
        <dt>Active revision</dt><dd><b class="tnum">${d.rev ? 'Rev ' + esc(d.rev) : 'Not yet published'}</b></dd>
        ${d.workingRev ? `<dt>Working revision</dt><dd class="tnum">Rev ${esc(d.workingRev)} · ${esc(d.status)}</dd>` : ''}
        <dt>Status</dt><dd>${Q.docStatus(d)}</dd>
        <dt>Owner</dt><dd>${esc(Q.pname(d.owner))}</dd>
        <dt>Department</dt><dd>${esc(Q.docDept(d))}</dd>
        <dt>Classification</dt><dd>${Q.classChip(d)}</dd>
        <dt>Effective</dt><dd>${Q.fmt(d.effective)}</dd>
        <dt>Next review</dt><dd>${Q.reviewDate(d.nextReview, Q.docOverdue(d), Q.docDueSoon(d))}</dd>
      </dl></div>
      <div class="side-section"><h3>${Q.docRestricted(d) ? 'Description of the document' : 'Description'}</h3><p class="small">${esc(d.description)}</p>
        ${Q.docRestricted(d) ? `<p class="small muted" style="margin-top:6px">${declaredBy(d)}</p><div class="callout warning small" style="margin-top:10px">${icon('triangle-alert')}<span><b>Assessed from the description only</b>${esc(Q.RESTRICTED_NOTE)}</span></div>` : ''}</div>
      <div class="side-section"><h3>File</h3>${uploaded(d) ? `<dl class="dl-list">
        <dt>Status</dt><dd><span class="src-ok">${icon('circle-check')}Stored in iQMS</span></dd>
        <dt>File</dt><dd>${esc(d.source.file)}</dd>
        <dt>Size</dt><dd>${esc(d.source.size || '—')}</dd>
        <dt>Uploaded</dt><dd>${Q.fmt(d.source.verified)}</dd>
        <dt>Read by iQMS</dt><dd>Yes — shown in the viewer and used in the assessment</dd></dl>` : `<dl class="dl-list">
        <dt>Status</dt><dd>${d.source.state === 'connected' ? `<span class="src-lock">${icon('lock')}Link only</span>` : `<span class="src-bad">${icon('triangle-alert')}Access unavailable</span>`}</dd>
        <dt>Location</dt><dd>${esc(d.source.system)} · ${esc(d.source.site)} / ${esc(d.source.library)} / ${esc(d.source.folder)}</dd>
        <dt>File</dt><dd>${esc(d.source.file)}</dd>
        <dt>Link checked</dt><dd>${Q.fmt(d.source.verified)}</dd>
        <dt>Read by iQMS</dt><dd>No — description only</dd></dl>
        ${d.source.state === 'connected' ? '' : `<button class="btn sm" type="button" data-action="check-connection" data-id="${esc(d.id)}" style="margin-top:10px">Check Connection</button>`}`}</div>
      <div class="side-section"><h3>Revision control</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn sm" type="button" data-action="create-revision" data-id="${esc(d.id)}" ${rev.ok ? '' : 'disabled'}>${icon('git-branch-plus')}Create Revision</button>
          <button class="btn sm" type="button" data-action="request-review" data-id="${esc(d.id)}" ${wfOk.ok ? '' : 'disabled'}>Request Review</button>
          <button class="btn sm" type="button" data-action="request-approval" data-id="${esc(d.id)}" ${wfOk.ok ? '' : 'disabled'}>Request Approval</button>
        </div>
        <p class="small muted" style="margin-top:8px">${esc(!rev.ok && rev.why ? rev.why : !wfOk.ok ? wfOk.why : 'Rev ' + d.workingRev + ' can be sent for review or approval.')}</p></div>`;
  };
  Q.lockCallout = w => {
    const who = Q.wfAssignees(w);
    return `<div class="callout ${w.changesRequested ? 'warning' : 'warning'}" role="status">${icon('lock')}<div><b>${w.changesRequested ? 'Changes requested' : w.stage === 'review' ? 'Review in progress' : 'Approval in Progress'} — Rev ${esc(w.rev)}</b>
      <div class="dl"><span>Started by <b>${esc(Q.pname(w.startedBy))}</b></span><span>Started <b>${Q.fmt(w.started)}</b></span><span>Current stage <b>${esc(Q.wfStageLabel(w))}</b></span><span>${w.stage === 'publication' ? 'Publisher' : w.changesRequested ? 'Waiting for' : w.stage === 'review' ? 'Current reviewer' : 'Current approver'} <b>${who.map(Q.pname).map(esc).join(', ') || '—'}</b></span></div>
      <p class="small" style="margin-top:6px">A second review or approval workflow can't be started for this document until this one is published or withdrawn.</p></div></div>`;
  };

  Q.openDocument = (id, tab = 'details', stackOnTop = false) => {
    const d = Q.doc(id); if (!d) return;
    if (!stackOnTop) Q.closeAllModals();
    const w = Q.wfForDoc(d.id);
    const showRev = d.rev || d.workingRev;
    const m = Q.openModal({
      size: 'viewer', label: 'document',
      title: `${esc(d.title)}`,
      sub: `<span class="tnum">${esc(d.id)} · ${d.rev ? `Rev ${esc(d.rev)} active` : 'Not yet published'}</span> · ${d.workingRev && d.status !== 'Published' ? `Rev ${esc(d.workingRev)} ` : ''}${Q.docStatus(d)} · ${esc(Q.plabel(d.process))}`,
      headActions: `${w ? `<button class="btn" type="button" data-action="open-review" data-id="${w.id}">${icon('file-check')}Open Review</button>` : ''}${openBtn(d, 'btn')}`,
      body: `<div class="source-bar">${Q.sourceBlock(d)}</div>
        <div class="viewer-body"><div class="viewer-preview">${Q.paper(d, d.rev || d.workingRev, !d.rev)}</div>
        <div class="viewer-side"><div class="tabs" role="tablist" aria-label="Document information">
          <button type="button" role="tab" data-vtab="details">Details</button>
          <button type="button" role="tab" data-vtab="revisions">Revisions</button>
          <button type="button" role="tab" data-vtab="linked">Linked items</button></div>
          <div class="viewer-side-body" role="tabpanel" tabindex="0" id="vpanel"></div></div></div>`,
      onMount: el => {
        const panel = el.querySelector('#vpanel');
        const setTab = t => {
          el.querySelectorAll('[data-vtab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vtab === t)));
          panel.innerHTML = t === 'details' ? Q.docDetails(d) : t === 'revisions' ? `<p class="small muted" style="margin-bottom:8px">Every revision is retained with its routing history. Only the published revision is the active controlled version.</p>${Q.revList(d, { trail: true })}` : Q.linkedItems(d);
          Q.refreshIcons();
        };
        el.querySelectorAll('[data-vtab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.vtab)));
        el.querySelector('[role="tablist"]').addEventListener('keydown', e => {
          if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
          const tabs = [...el.querySelectorAll('[data-vtab]')]; const i = tabs.indexOf(document.activeElement);
          const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); n.click();
        });
        setTab(tab);
      }
    });
    return m;
  };
  Q.actions['open-doc'] = d => Q.openDocument(d.id, 'details', d.stack === '1');
  Q.actions['open-source'] = d => { const doc = Q.doc(d.id); uploaded(doc) ? Q.toast('Download', `${doc.source.file} would download from iQMS. Not available in this mock.`) : Q.toast(`Open in ${doc.source.system}`, `${doc.source.file} would open in ${doc.source.system} (${doc.source.library}) with your own permission. Not available in this mock.`); };
  Q.actions['check-connection'] = d => Q.toast('Connection checked', `${Q.doc(d.id).source.file} is no longer at the linked location. Ask the owner to update the link.`);
  Q.actions['open-review'] = d => { Q.closeAllModals(); Q.go(`#/review/${d.id}`); };

  /* =================== Revision & workflow modals =================== */
  Q.actions['create-revision'] = d => {
    const doc = Q.doc(d.id), chk = Q.canCreateRevision(doc);
    if (!chk.ok) { Q.toast('Revision not created', chk.why); return; }
    const next = Q.nextRev(doc.rev);
    const m = Q.openModal({ size: 'm', title: 'Create Revision', sub: `${esc(doc.id)} · ${esc(doc.title)}`,
      body: `<form class="modal-body" id="revForm"><div class="callout" style="margin-bottom:16px">${icon('info')}<span>Rev ${esc(doc.rev)} stays the active controlled version until Rev ${esc(next)} is reviewed, approved and published. Nothing is overwritten.</span></div>
        <div class="form-grid">
          <label class="field"><span>New revision</span><input class="input tnum" value="Rev ${esc(next)}" readonly></label>
          <label class="field"><span>Author</span><select class="select" name="author">${Q.peopleOptions(doc.owner)}</select></label>
          <label class="field"><span>Reason for change <span class="req">*</span></span><select class="select" name="reason" required><option value="">Select…</option><option>Periodic review</option><option>Process change</option><option>Corrective action</option><option>Audit finding</option><option>Regulatory change</option><option>Customer requirement</option></select></label>
          <label class="field"><span>Related record</span><input class="input" name="ref" placeholder="e.g. CA-2026-09"></label>
          <label class="field full"><span>Change summary <span class="req">*</span></span><textarea class="textarea" name="summary" required placeholder="What will change in this revision and why"></textarea><span class="help">Shown in revision history and to reviewers.</span></label>
          ${Q.docRestricted(doc) ? `<label class="field full"><span>Description of the document <span class="req">*</span></span><textarea class="textarea" name="description" rows="4" required>${esc(doc.description)}</textarea><span class="help">${icon('lock')} Link only — revise the file in ${esc(doc.source.system)}. Update this description if Rev ${esc(next)} changes what the document covers; iQMS assesses the document from it.</span></label>`
            : `<label class="field full"><span>Revised file</span><input class="input file-input" type="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"><span class="help">Upload the revised file now, or add it before sending Rev ${esc(next)} for review. Rev ${esc(doc.rev)} stays available.</span></label>`}
        </div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Create Rev ${esc(next)}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return;
      const v = Q.formValues(f);
      doc.workingRev = next; doc.status = 'Draft'; doc.updated = Q.today();
      const up = f.querySelector('[name="file"]')?.files[0];
      if (up) { doc.source.file = up.name; doc.source.size = fileSizeLabel(up.size); doc.source.verified = Q.today(); }
      else doc.source.file = doc.source.file.replace(/Rev \w+\.docx$/, `Rev ${next}.docx`);
      if (Q.docRestricted(doc)) { doc.description = v.description.trim(); doc.declared = { by: Q.me(), date: Q.today() }; }
      Q.S.revisions[doc.id].push({ rev: next, summary: v.summary, author: v.author, date: Q.today(), reviewers: [], approval: '', published: null, state: 'Draft' });
      Q.S.activity.unshift({ date: Q.today(), who: Q.me(), process: doc.process, text: `created Rev ${next} of ${doc.title}`, ref: doc.id });
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.renderSidebar();
      Q.toast(`Rev ${next} created as a draft`, `Rev ${doc.rev} remains the active controlled version.`);
    });
  };

  const startWorkflow = (d, mode) => {
    const doc = Q.doc(d.id), chk = Q.canStartWorkflow(doc);
    if (!chk.ok) { Q.toast(mode === 'review' ? 'Review not started' : 'Approval not started', chk.why); return; }
    const owner = Q.proc(Q.rootId(doc.process))?.owner;
    const m = Q.openModal({ size: 'm', title: mode === 'review' ? 'Request Review' : 'Request Approval', sub: `${esc(doc.id)} · Rev ${esc(doc.workingRev)} · ${esc(doc.title)}`,
      body: `<form class="modal-body"><div class="form-grid">
        ${mode === 'review' ? `<fieldset class="fieldset full"><legend>Reviewers <span class="req">*</span></legend><p class="help">Reviewers check content. They can complete the review or request changes.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${['maria', owner, 'nina', 'eric'].filter((x, i, a) => x && a.indexOf(x) === i && x !== doc.owner).map((id, i) => `<label class="checkbox"><input type="checkbox" name="rv" value="${id}" ${i < 1 ? 'checked' : ''}>${esc(Q.pname(id))} <span class="muted small">${esc(Q.person(id).title)}</span></label>`).join('')}</div></fieldset>` :
          `<label class="field full"><span>Why is review not required? <span class="req">*</span></span><select class="select" name="skip" required><option value="">Select…</option><option>Editorial change only</option><option>Review completed outside iQMS (attach record)</option></select></label>`}
        <label class="field"><span>Approver <span class="req">*</span></span><select class="select" name="approver" required>${Q.peopleOptions(owner === doc.owner ? 'maria' : owner || 'maria', id => ['maria', 'eric', 'daniel', owner].includes(id))}</select><span class="help">Authorizes the revision after review.</span></label>
        <label class="field"><span>Due date <span class="req">*</span></span><input class="input" type="date" name="due" required value="${Q.addDays(Q.today(), 10)}"></label>
        <label class="field full"><span>Message</span><textarea class="textarea" name="msg" placeholder="Optional context for reviewers"></textarea></label>
      </div></form>`,
      foot: `<span class="left">Publication is a separate, final step after approval.</span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${mode === 'review' ? 'Send for Review' : 'Send for Approval'}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return;
      if (Q.wfForDoc(doc.id)) { Q.closeModal(); Q.toast('Approval in Progress', 'Another user started a workflow for this revision.'); return; }
      const v = Q.formValues(f);
      const reviewers = mode === 'review' ? [...f.querySelectorAll('[name="rv"]:checked')].map(x => ({ who: x.value, state: 'Pending' })) : [];
      if (mode === 'review' && !reviewers.length) { Q.toast('Select at least one reviewer'); return; }
      const w = { id: Q.uid('WF'), doc: doc.id, rev: doc.workingRev, stage: mode === 'review' ? 'review' : 'approval', startedBy: Q.me(), started: Q.today(), due: v.due,
        reviewers, approvers: [{ who: v.approver, state: mode === 'review' ? 'Not started' : 'Pending' }], publisher: 'nina', comments: v.msg ? [{ who: Q.me(), date: Q.today(), text: v.msg }] : [] };
      Q.S.workflows.push(w);
      doc.status = mode === 'review' ? 'In Review' : 'Approval in Progress';
      Q.S.activity.unshift({ date: Q.today(), who: Q.me(), process: doc.process, text: `started ${mode} of ${doc.title} Rev ${doc.workingRev}`, ref: doc.id });
      Q.save(); Q.closeAllModals(); Q.renderSidebar(); Q.render({ noFocus: true });
      Q.toast(mode === 'review' ? 'Sent for review' : 'Sent for approval', `${doc.id} Rev ${doc.workingRev}. Further workflows are blocked until this one finishes.`);
    });
  };
  Q.actions['request-review'] = d => startWorkflow(d, 'review');
  Q.actions['request-approval'] = d => startWorkflow(d, 'approval');

  /* Register Document — the classification decides the method:
   *   Public / Internal                  → upload the file (iQMS shows it and reads it)
   *   Confidential / Highly Confidential → SharePoint link + description + disclaimer (iQMS never opens it) */
  const fileSizeLabel = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
  const MIN_DESC = 60;
  Q.actions['connect-doc'] = d => {
    const pre = d.process || 'all';
    const types = ['Procedure', 'Work Instruction', 'Form', 'Checklist', 'Policy', 'Plan', 'Register', 'Standard', 'Record'];
    const st = { file: null, verified: false, deptTouched: false };
    const modeLine = c => c.mode === 'upload' ? `${icon('upload')}Upload the file` : `${icon('link')}SharePoint link + description`;
    const m = Q.openModal({ size: 'l', title: 'Register Document', sub: 'The classification decides how a document is registered: uploaded to iQMS, or linked from SharePoint with a description.',
      body: `<form class="modal-body reg" novalidate>
        <fieldset class="fieldset reg-step"><legend><span class="step-n">1</span>Classification <span class="req">*</span></legend>
          <div class="class-grid" role="radiogroup" aria-label="Classification">${Q.CLASSES.map(c => `<label class="class-opt ${c.tone}"><input type="radio" name="classification" value="${esc(c.key)}" ${c.key === 'Internal' ? 'checked' : ''}><span class="co-top">${icon(c.icon)}<b>${esc(c.key)}</b></span><span class="co-hint">${esc(c.hint)}</span><span class="co-mode">${modeLine(c)}</span></label>`).join('')}</div></fieldset>
        <fieldset class="fieldset reg-step"><legend><span class="step-n">2</span><span data-method-title></span></legend><div data-method></div></fieldset>
        <fieldset class="fieldset reg-step"><legend><span class="step-n">3</span>Details</legend><div class="form-grid">
          <label class="field full"><span>Document name <span class="req">*</span></span><input class="input" name="title" required></label>
          <label class="field"><span>Process <span class="req">*</span></span><select class="select" name="process" required><option value="">Select…</option>${Q.processOptions(pre, { all: '' })}</select></label>
          <label class="field"><span>Type <span class="req">*</span></span><select class="select" name="type" required><option value="">Select…</option>${types.map(t => `<option>${t}</option>`).join('')}</select></label>
          <label class="field"><span>Owner <span class="req">*</span></span><select class="select" name="owner" required>${Q.peopleOptions(Q.me())}</select></label>
          <label class="field"><span>Department <span class="req">*</span></span><select class="select" name="department" required>${Q.departments().map(x => `<option${x === Q.person(Q.me()).dept ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select><span class="help">Follows the owner's department unless you change it.</span></label>
          <label class="field full"><span>Current state</span><select class="select" name="state"><option value="draft">New draft (Rev 00)</option><option value="published">Already approved — import as published</option></select><span class="help">Imports keep their existing revision; no new approval is created.</span></label>
        </div></fieldset></form>`,
      foot: `<span class="left" data-foot-note></span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Register Document</button>` });
    const form = m.querySelector('form'), box = m.querySelector('[data-method]');
    const cls = () => Q.CLASSES.find(c => c.key === form.querySelector('[name="classification"]:checked').value);
    const setTitle = name => { const t = form.querySelector('[name="title"]'); if (!t.value) t.value = name.replace(/\.(docx?|xlsx?|pptx?|pdf)$/i, '').replace(/[ _-]+Rev[ _-]?\d+$/i, ''); };
    const fileRow = () => st.file
      ? `<div class="file-row">${icon('file-text')}<div><b>${esc(st.file.name)}</b><span>${esc(st.file.size)} · ready to upload</span></div><button class="btn sm" type="button" data-file-clear>Remove</button></div>`
      : `<div class="dropzone" data-drop tabindex="-1">${icon('upload')}<div><b>Drop the file here or <button type="button" class="linklike" data-pick>choose a file</button></b><span>PDF, Word, Excel or PowerPoint · up to 50 MB</span></div></div>`;
    const drawMethod = () => {
      const c = cls(), keep = form.querySelector('[name="description"]')?.value || '', url = form.querySelector('[name="url"]')?.value || '';
      m.querySelector('[data-method-title]').textContent = c.mode === 'upload' ? 'File' : 'Link and description';
      m.querySelector('[data-foot-note]').textContent = c.mode === 'upload' ? 'iQMS stores and reads the file.' : 'iQMS stores the link and description only.';
      box.innerHTML = c.mode === 'upload'
        ? `<input type="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" hidden><div data-file>${fileRow()}</div>
          <p class="help reg-help">${icon('eye')}${esc(c.key)} documents are stored in iQMS, shown in the document viewer and read for the ISO 9001 readiness assessment.</p>
          <label class="field" style="margin-top:12px"><span>Description</span><textarea class="textarea" name="description" rows="2" placeholder="Optional — a short summary helps people find the document.">${esc(keep)}</textarea></label>`
        : `<label class="field"><span>SharePoint link <span class="req">*</span></span><div style="display:flex;gap:8px"><input class="input" name="url" required value="${esc(url)}" placeholder="https://heliossolar.sharepoint.com/sites/HeliosQMS/…"><button class="btn" type="button" data-check>Check Link</button></div><span class="help" id="linkState">iQMS stores the link only. It does not open, copy or read the file.</span></label>
          <label class="field" style="margin-top:12px"><span>Description of the document <span class="req">*</span></span><textarea class="textarea" name="description" rows="4" required placeholder="What the document is for, what it covers, the controls or records it defines, and the ISO 9001 clauses it supports.">${esc(keep)}</textarea><span class="help"><b class="tnum" data-count>${keep.trim().length}</b> of at least ${MIN_DESC} characters. Describe the document — do not paste confidential content.</span></label>
          <div class="callout warning reg-note">${icon('triangle-alert')}<div><b>Disclaimer — ${esc(c.key)} documents are assessed from the description only</b><p>${esc(Q.RESTRICTED_NOTE)}</p>
            <label class="checkbox"><input type="checkbox" name="ack"><span>I confirm the description is accurate and contains no confidential content.</span></label></div></div>`;
      st.verified = false; Q.refreshIcons();
    };
    const setFile = f => { if (!f) return; st.file = { name: f.name, size: fileSizeLabel(f.size) }; box.querySelector('[data-file]').innerHTML = fileRow(); Q.refreshIcons(); setTitle(f.name); };
    const check = () => {
      const url = form.querySelector('[name="url"]').value.trim(), state = m.querySelector('#linkState');
      st.verified = /^https:\/\/[a-z0-9-]+\.sharepoint\.com\/sites\/HeliosQMS\//i.test(url);
      state.innerHTML = !url ? 'Paste a SharePoint link first.' : st.verified ? `<span class="src-ok">${icon('circle-check')}Link recognized</span> Helios QMS on SharePoint. iQMS did not open the file.` : `<span class="src-bad">${icon('triangle-alert')}Not accepted</span> Only links inside the Helios QMS SharePoint site can be registered.`;
      Q.refreshIcons();
      if (st.verified) setTitle(decodeURIComponent(url.split('/').pop() || ''));
      return st.verified;
    };
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'classification') drawMethod();
      else if (t.name === 'file') setFile(t.files[0]);
      else if (t.name === 'department') st.deptTouched = true;
      else if (t.name === 'owner' && !st.deptTouched) { const sel = form.querySelector('[name="department"]'), dept = Q.person(t.value).dept; if ([...sel.options].some(o => o.value === dept)) { sel.value = dept; sel._combo?.sync(); } }
    });
    form.addEventListener('input', e => { if (e.target.name === 'description') { const c = form.querySelector('[data-count]'); if (c) c.textContent = e.target.value.trim().length; } });
    form.addEventListener('click', e => {
      if (e.target.closest('[data-pick]')) form.querySelector('[name="file"]').click();
      else if (e.target.closest('[data-file-clear]')) { st.file = null; form.querySelector('[name="file"]').value = ''; box.querySelector('[data-file]').innerHTML = fileRow(); Q.refreshIcons(); }
      else if (e.target.closest('[data-check]')) check();
    });
    form.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
    form.addEventListener('dragleave', e => e.target.closest('[data-drop]')?.classList.remove('over'));
    form.addEventListener('drop', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); setFile(e.dataTransfer.files[0]); } });
    drawMethod();
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const c = cls(), link = c.mode === 'link';
      // Problems are shown next to the field they belong to.
      form.querySelectorAll('.field-err').forEach(x => x.remove()); form.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
      const fail = (anchor, msg, focus = anchor) => { anchor.insertAdjacentHTML('afterend', `<p class="field-err" role="alert">${icon('triangle-alert')}${esc(msg)}</p>`); Q.refreshIcons(); focus.focus(); return false; };
      if (!link && !st.file) { const z = box.querySelector('[data-drop]'); z.classList.add('invalid'); return fail(z, `Choose the file to upload. ${c.key} documents are stored in iQMS.`, box.querySelector('[data-pick]')); }
      if (link && !check()) return form.querySelector('[name="url"]').focus();
      if (link) {
        const desc = form.querySelector('[name="description"]');
        if (desc.value.trim().length < MIN_DESC) { desc.setAttribute('aria-invalid', 'true'); desc.style.borderColor = 'var(--danger)'; return fail(desc.nextElementSibling, `Write at least ${MIN_DESC} characters so the document can be considered in the assessment.`, desc); }
        desc.removeAttribute('aria-invalid'); desc.style.borderColor = '';
        const ack = form.querySelector('[name="ack"]');
        if (!ack.checked) { ack.closest('.checkbox').classList.add('invalid'); return fail(ack.closest('.checkbox'), 'Confirm this to register a link-only document.', ack); }
      }
      if (!Q.validate(form)) return;
      const v = Q.formValues(form);
      const prefix = (Q.S.documents.find(x => Q.rootId(x.process) === Q.rootId(v.process))?.id.split('-')[0]) || 'DOC';
      const code = { 'Procedure': 'PRO', 'Work Instruction': 'WI', 'Form': 'FRM', 'Checklist': 'CHK', 'Policy': 'POL', 'Plan': 'PLN', 'Register': 'REG', 'Standard': 'STD', 'Record': 'REC' }[v.type];
      const n = Q.S.documents.filter(x => x.id.startsWith(prefix + '-')).length + 1;
      const id = `${prefix}-${code}-${String(n).padStart(3, '0')}`;
      const pub = v.state === 'published', folder = Q.plabel(Q.rootId(v.process));
      const doc = { id, organization_id: Q.S.organization.organization_id, title: v.title, process: v.process, type: v.type, rev: pub ? '00' : null, workingRev: pub ? null : '00', status: pub ? 'Published' : 'Draft', owner: v.owner,
        classification: c.key, department: v.department, updated: Q.today(), nextReview: pub ? Q.addYears(Q.today(), 1) : null, effective: pub ? Q.today() : null,
        description: (v.description || '').trim() || `Controlled ${v.type.toLowerCase()} uploaded to iQMS.`, declared: link ? { by: Q.me(), date: Q.today() } : null, iso: null, refs: [], related: [], evidence: [],
        source: link ? { mode: 'link', system: 'SharePoint', site: 'Helios QMS', library: 'Restricted Documents', folder, file: decodeURIComponent(v.url.split('/').pop()), state: 'connected', verified: Q.today() }
          : { mode: 'upload', system: 'iQMS', site: '', library: 'Document library', folder, file: st.file.name, size: st.file.size, state: 'connected', verified: Q.today() } };
      Q.S.documents.push(doc);
      Q.S.revisions[id] = [{ rev: '00', summary: pub ? 'Imported as the current approved revision.' : 'Initial draft.', author: v.owner, date: Q.today(), reviewers: [], approval: pub ? 'Imported' : '', published: pub ? Q.today() : null, state: pub ? 'Published' : 'Draft' }];
      Q.S.activity.unshift({ date: Q.today(), who: Q.me(), process: doc.process, text: `registered ${doc.title} (${c.key})`, ref: doc.id });
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true });
      Q.toast('Document registered', `${id} · ${v.title} — ${link ? 'link and description saved' : 'file uploaded'}.`);
    });
  };

  /* =================== Documents in Review =================== */
  const reviewTable = (id, seg) => {
    const rows = () => Q.S.workflows.map(w => ({ ...w, d: Q.doc(w.doc) })).filter(r => r.d);
    const all = rows();
    const segs = { mine: r => Q.assignedToMe(r), all: () => true, changes: r => r.changesRequested };
    const tools = `${Q.seg('Show', [['mine', 'Assigned to me', all.filter(segs.mine).length], ['all', 'All in progress', all.length]], seg)}
      <select class="select" data-filter="stage" aria-label="Workflow stage"><option value="all">All stages</option><option value="review">Review</option><option value="approval">Approval</option><option value="publication">Publication</option></select>
      <select class="select" data-filter="process" aria-label="Process">${Q.processOptions()}</select>`;
    return Q.table({
      id, rows, key: r => r.id, selectable: true, tight: true, noun: 'workflows', caption: 'Documents in review', rowLabel: r => r.d.title, tools, segDefault: seg,
      expand: r => `<div class="rt-expand"><h4>Routing activity · ${esc(r.d.id)} Rev ${esc(r.rev)}</h4>${Q.revTimeline(Q.wfTrail(Q.wf(r.id), (Q.S.revisions[r.d.id] || []).find(x => x.rev === r.rev)), { compact: true })}</div>`,
      segs: { mine: segs.mine, all: segs.all }, initialSeg: seg,
      filters: { stage: (r, v) => r.stage === v && !r.changesRequested, process: (r, v) => Q.inProc(r.d.process, v) },
      columns: [
        { key: 'doc', label: 'Document', min: '200px', sort: r => r.d.title, render: r => `<span class="title">${esc(r.d.title)}</span><span class="sub tnum">${esc(r.d.id)}</span>` },
        { key: 'process', label: 'Process', sort: r => Q.proc(r.d.process)?.process_code, render: r => Q.pcell(r.d.process) },
        { key: 'rev', label: 'Revision', cls: 'c-rev', sort: r => r.rev, render: r => `${esc(r.rev)}` },
        { key: 'stage', label: 'Workflow Stage', sort: r => ['review', 'approval', 'publication'].indexOf(r.stage), render: r => {
          const list = r.stage === 'review' ? r.reviewers : r.stage === 'approval' ? r.approvers : null;
          const done = list ? list.filter(x => ['Completed', 'Approved'].includes(x.state)).length : null;
          return `${esc(Q.wfStageLabel(r))}${list ? `<span class="sub">${done} of ${list.length} complete</span>` : '<span class="sub">Approved, awaiting publication</span>'}`; } },
        { key: 'who', label: 'Current Reviewer / Approver', render: r => Q.wfAssignees(r).map(x => `<span class="nowrap">${Q.who(x)}</span>`).join('<br>') || '—' },
        { key: 'started', label: 'Started', cls: 'c-date hide-lg', sort: r => r.started, render: r => Q.fmt(r.started) },
        { key: 'due', label: 'Due', cls: 'c-date', sort: r => r.due, render: r => Q.dueDate(r.due) },
        { key: 'status', label: 'Status', sort: r => Q.wfStatus(r), render: r => Q.st(Q.wfStatus(r)) },
        { key: 'act', label: 'Action', cls: 'c-actions', render: r => `<button class="btn sm ${Q.assignedToMe(r) ? 'primary' : ''}" type="button" data-action="open-review" data-id="${r.id}">Open Review</button>` }
      ],
      empty: t => t.seg === 'mine' ? `<h3>No documents are currently awaiting your review.</h3><p>Items appear here when you are the current reviewer, approver or publisher.</p><button class="btn" type="button" data-show-all>View all in progress</button>` : '<h3>No documents are in review</h3><p>Start a review from a document’s working revision.</p>',
      after: host => host.querySelector('[data-show-all]')?.addEventListener('click', () => document.querySelector(`#tw-${id} [data-seg="all"]`).click()),
      selectionBar: keys => keys.length === 1 ? `<button class="btn sm primary" type="button" data-action="open-review" data-id="${keys[0]}">Open Review</button><button class="btn sm" type="button" data-action="open-doc" data-id="${Q.wf(keys[0]).doc}">Open Document</button>` : ''
    });
  };
  Q.views.review = (parts, q) => {
    if (parts[0]) return Q.reviewPage(parts[0]);
    return { title: 'Routing · Documented Information', nav: 'review',
      html: docHead([['Documented Information', '#/documents?view=list'], ['Routing']]) + Q.docTabs('routing') + `<p class="small muted" style="margin:-8px 0 16px">Each revision is routed <b style="color:var(--text)">Review → Approval → Publication</b>. One active route per document; the published revision stays in force until the new one is published.</p>` + reviewTable('wf', q.show || (Q.myWorkflows().length ? 'mine' : 'all')) };
  };

  /* =================== Document Review page (50:50 draggable split) =================== */
  Q.reviewPage = wfId => {
    const w = Q.wf(wfId);
    if (!w) return { title: 'Review not found', nav: 'review', html: Q.pageHead({ title: 'This review is no longer active', crumbs: [['Documented Information', '#/documents'], ['Routing', '#/review'], ['Not found']], sub: 'It may have been published or withdrawn. Published revisions are in the document’s revision history.' }) + `<a class="btn" href="#/review">Back to Routing</a>` };
    const d = Q.doc(w.doc), me = Q.me();
    const rev = (Q.S.revisions[d.id] || []).find(r => r.rev === w.rev) || { summary: '' };
    const steps = [['review', 'Review', 'Check content'], ['approval', 'Approval', 'Authorize revision'], ['publication', 'Publication', 'Make it the active version']];
    const idx = steps.findIndex(s => s[0] === w.stage);
    const myReview = w.stage === 'review' && !w.changesRequested && w.reviewers.find(r => r.who === me && r.state === 'Pending');
    const myApproval = w.stage === 'approval' && w.approvers.find(r => r.who === me && r.state === 'Pending');
    const myPublish = w.stage === 'publication' && w.publisher === me;
    const waiting = Q.wfAssignees(w).map(Q.pname).join(', ');
    let bar;
    if (myReview) bar = `<span class="note">You are a reviewer. Check the content, then complete your review.</span><button class="btn" type="button" data-rv="changes">Request Changes</button><button class="btn primary" type="button" data-rv="complete">Complete Review</button>`;
    else if (myApproval) bar = `<span class="note">Reviews are complete. Approving authorizes Rev ${esc(w.rev)}; publication follows.</span><button class="btn" type="button" data-rv="changes">Request Changes</button><button class="btn primary" type="button" data-rv="approve">Approve</button>`;
    else if (myPublish) bar = `<span class="note">Approved by ${esc(w.approvers.map(a => Q.pname(a.who)).join(', '))}. Publishing makes Rev ${esc(w.rev)} the active controlled version.</span><button class="btn primary" type="button" data-rv="publish">${icon('send')}Publish</button>`;
    else if (w.changesRequested) bar = `<span class="note">${icon('info')} Changes requested — waiting for ${esc(Q.pname(w.startedBy))} to submit an updated draft.</span><button class="btn" type="button" data-action="toast" data-title="Reminder sent" data-msg="Reminder sent to ${esc(Q.pname(w.startedBy))}.">Send Reminder</button>`;
    else bar = `<span class="note">Waiting for ${esc(waiting || '—')}. You have no action on this revision.</span><button class="btn" type="button" data-action="toast" data-title="Reminder sent" data-msg="Reminder sent to ${esc(waiting)}.">Send Reminder</button>`;

    const person = (x, role) => `<li><span class="avatar sm">${esc(Q.initials(x.who))}</span><div class="p-main">${Q.who(x.who)}<span>${esc(role)} · ${esc(Q.person(x.who).title)}</span></div>${Q.st(x.state + (x.date ? ' · ' + Q.fmt(x.date) : ''), { 'Completed': 'success', 'Approved': 'success', 'Pending': 'info', 'Changes requested': 'orange', 'Not started': 'neutral' }[x.state])}</li>`;

    const html = `<div class="review-page">
      <div class="review-head">${Q.crumbs([['Documented Information', '#/documents'], ['Routing', '#/review'], [`${d.id} Rev ${w.rev}`]])}
        <div class="page-head"><div><h1 tabindex="-1">${esc(d.title)}</h1><div class="meta-line"><span class="tnum">${esc(d.id)}</span><span>Proposed <b>Rev ${esc(w.rev)}</b> · active ${d.rev ? 'Rev ' + esc(d.rev) : 'none'}</span><span>${Q.pcell(d.process)}</span><span>Owner <b>${esc(Q.pname(d.owner))}</b></span><span>${Q.st(Q.wfStatus(w))}</span></div></div>
        <div class="actions"><span class="split-ratio" id="ratio" aria-hidden="true">50 : 50</span><button class="btn sm" type="button" id="resetSplit" title="Reset panels to 50:50">Reset 50:50</button><button class="btn sm" type="button" data-action="open-doc" data-id="${esc(d.id)}">${icon('file-text')}Open Document</button></div></div></div>
      <div class="split" id="split">
        <section class="split-left" id="splitLeft" aria-label="Revision details and workflow">
          <div class="review-left-inner">
            ${w.stage !== 'review' || w.changesRequested ? Q.lockCallout(w) : ''}
            <ol class="stepper" aria-label="Workflow stages">${steps.map(([k, l, s], i) => `<li class="${w.changesRequested && i === 0 ? 'changes' : i < idx ? 'done' : i === idx ? 'current' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="dot">${i < idx ? icon('check') : i + 1}</span><span><b>${l}</b><span>${w.changesRequested && i === 0 ? 'Changes requested' : s}</span></span></li>`).join('')}</ol>
            <section class="panel"><div class="panel-head"><h2>Change summary</h2></div><div class="panel-pad"><p>${esc(rev.summary || 'No summary provided.')}</p><dl class="dl-list" style="margin-top:12px"><dt>Started by</dt><dd>${Q.who(w.startedBy)} · ${Q.fmt(w.started)}</dd><dt>Due</dt><dd>${Q.dueDate(w.due)}</dd><dt>Effective</dt><dd>On publication</dd><dt>Classification</dt><dd>${Q.classChip(d)}</dd><dt>File</dt><dd>${d.source.state !== 'connected' ? `<span class="src-bad">${icon('triangle-alert')}Access unavailable</span> ` : uploaded(d) ? `<span class="src-ok">${icon('circle-check')}Stored in iQMS</span> ` : `<span class="src-lock">${icon('lock')}Link only</span> `}${esc(d.source.file)}</dd></dl></div></section>
            <section class="panel"><div class="panel-head"><h2>Reviewers &amp; approvers</h2></div><ul class="people-list">${w.reviewers.map(x => person(x, 'Reviewer')).join('')}${w.approvers.map(x => person(x, 'Approver')).join('')}<li><span class="avatar sm">${esc(Q.initials(w.publisher))}</span><div class="p-main">${Q.who(w.publisher)}<span>Publisher · ${esc(Q.person(w.publisher).title)}</span></div>${Q.st(w.stage === 'publication' ? 'Pending' : 'Not started', w.stage === 'publication' ? 'info' : 'neutral')}</li></ul></section>
            <section class="panel"><div class="panel-head"><h2>Comments</h2><span class="muted small">${w.comments.length}</span></div>
              <ul class="comments">${w.comments.map(c => `<li><span class="avatar sm">${esc(Q.initials(c.who))}</span><div class="c-body"><div class="c-meta">${Q.who(c.who)} · ${Q.fmt(c.date)}</div>${esc(c.text)}</div></li>`).join('') || '<li class="muted small">No comments yet.</li>'}</ul>
              <form class="comment-form" id="commentForm"><label class="sr-only" for="cText">Add a comment</label><textarea class="textarea" id="cText" placeholder="Add a comment for the audit trail"></textarea><button class="btn" type="submit">Comment</button></form></section>
            <section class="panel"><div class="panel-head"><h2>Linked items</h2></div><div class="panel-pad">${Q.linkedItems(d)}</div></section>
            <section class="panel"><div class="panel-head"><h2>Routing activity</h2><span class="muted small">Rev ${esc(w.rev)}</span></div><div class="panel-pad">${Q.revTimeline(Q.wfTrail(w, rev))}</div></section>
            <section class="panel"><div class="panel-head"><h2>Revision history</h2></div><div class="panel-pad">${Q.revList(d, { trail: true, openFirst: false })}</div></section>
          </div>
          <div class="action-bar">${bar}</div>
        </section>
        <div class="splitter" id="splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-controls="splitLeft" aria-label="Resize panels" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" title="Drag to resize · double-click to reset to 50:50"></div>
        <section class="split-right" aria-label="Document preview">${Q.paper(d, w.rev, true)}</section>
      </div></div>`;

    const after = main => {
      const split = main.querySelector('#split'), left = main.querySelector('#splitLeft'), bar = main.querySelector('#splitter'), ratio = main.querySelector('#ratio');
      const MIN = () => Math.min(420, split.clientWidth * 0.3);
      const set = pct => {
        const wTot = split.clientWidth - bar.offsetWidth, min = MIN();
        let px = Math.max(min, Math.min(wTot - min, wTot * pct / 100));
        const p = Math.round(px / wTot * 100);
        left.style.flexBasis = px + 'px';
        bar.setAttribute('aria-valuenow', String(p)); bar.setAttribute('aria-valuetext', `Details ${p}%, preview ${100 - p}%`);
        ratio.textContent = `${p} : ${100 - p}`;
      };
      let current = 50; set(current);
      bar.addEventListener('pointerdown', e => {
        bar.setPointerCapture(e.pointerId); bar.classList.add('dragging'); document.body.classList.add('resizing');
        const rect = split.getBoundingClientRect();
        const move = ev => { current = (ev.clientX - rect.left) / (rect.width - bar.offsetWidth) * 100; set(current); };
        const up = () => { bar.classList.remove('dragging'); document.body.classList.remove('resizing'); bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); current = Number(bar.getAttribute('aria-valuenow')); };
        bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
      });
      bar.addEventListener('dblclick', () => { current = 50; set(50); });
      main.querySelector('#resetSplit').addEventListener('click', () => { current = 50; set(50); });
      bar.addEventListener('keydown', e => {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowLeft') current -= step; else if (e.key === 'ArrowRight') current += step;
        else if (e.key === 'Home') current = 0; else if (e.key === 'End') current = 100; else if (e.key === 'Enter') current = 50; else return;
        e.preventDefault(); set(current); current = Number(bar.getAttribute('aria-valuenow'));
      });
      const ro = new ResizeObserver(() => set(current)); ro.observe(split);

      main.querySelector('#commentForm').addEventListener('submit', e => {
        e.preventDefault(); const t = main.querySelector('#cText').value.trim(); if (!t) return;
        w.comments.push({ who: me, date: Q.today(), text: t }); Q.save(); Q.render({ noFocus: true });
        Q.toast('Comment added');
      });
      main.querySelectorAll('[data-rv]').forEach(b => b.addEventListener('click', () => reviewAction(w, d, b.dataset.rv)));
    };
    return { title: `${d.id} Rev ${w.rev} — Review`, nav: 'review', html, after, full: true };
  };

  function reviewAction(w, d, kind) {
    const me = Q.me(), today = Q.today();
    const log = text => Q.S.activity.unshift({ date: today, who: me, process: d.process, text, ref: d.id });
    const done = (title, msg) => { Q.save(); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast(title, msg); };
    if (kind === 'complete') {
      const r = w.reviewers.find(x => x.who === me); r.state = 'Completed'; r.date = today;
      if (w.reviewers.every(x => x.state === 'Completed')) { w.stage = 'approval'; w.approvers.forEach(a => { a.state = 'Pending'; }); d.status = 'Approval in Progress'; }
      log(`completed review of ${d.title} Rev ${w.rev}`);
      done('Review completed', w.stage === 'approval' ? `All reviews complete. Sent to ${w.approvers.map(a => Q.pname(a.who)).join(', ')} for approval.` : 'Waiting for the remaining reviewers.');
    } else if (kind === 'approve') {
      const a = w.approvers.find(x => x.who === me); a.state = 'Approved'; a.date = today;
      if (w.approvers.every(x => x.state === 'Approved')) { w.stage = 'publication'; d.status = 'Approved'; }
      log(`approved ${d.title} Rev ${w.rev}`);
      done('Revision approved', w.stage === 'publication' ? `Ready for publication by ${Q.pname(w.publisher)}.` : 'Waiting for other approvers.');
    } else if (kind === 'changes') {
      const m = Q.openModal({ size: 'm', title: 'Request Changes', sub: `${esc(d.id)} Rev ${esc(w.rev)}`,
        body: `<form class="modal-body"><label class="field"><span>What needs to change? <span class="req">*</span></span><textarea class="textarea" name="c" required autofocus></textarea><span class="help">The author is notified. The revision returns to draft for updates.</span></label></form>`,
        foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Request Changes</button>` });
      m.querySelector('[data-ok]').addEventListener('click', () => {
        const f = m.querySelector('form'); if (!Q.validate(f)) return;
        const text = Q.formValues(f).c;
        const x = [...w.reviewers, ...w.approvers].find(p => p.who === me && ['Pending'].includes(p.state)); if (x) { x.state = 'Changes requested'; x.date = today; }
        w.changesRequested = true; d.status = 'Changes Requested'; w.comments.push({ who: me, date: today, text });
        log(`requested changes to ${d.title} Rev ${w.rev}`);
        Q.closeModal(); done('Changes requested', `${Q.pname(w.startedBy)} has been notified.`);
      });
    } else if (kind === 'publish') {
      Q.confirm({ title: 'Confirm Publication', confirm: 'Publish',
        body: `<p><b>${esc(d.id)} Rev ${esc(w.rev)}</b> — ${esc(d.title)}</p><ul style="margin:12px 0 0;padding-left:20px;line-height:24px"><li>Rev ${esc(w.rev)} becomes the active controlled version from <b>${Q.fmt(today)}</b>.</li>${d.rev ? `<li>Rev ${esc(d.rev)} is marked <b>Superseded</b> and stays in revision history.</li>` : ''}<li>Next periodic review: <b>${Q.fmt(Q.addYears(today, 1))}</b>.</li></ul>`,
        onConfirm: () => {
          const list = Q.S.revisions[d.id];
          list.forEach(r => { if (r.state === 'Published') r.state = 'Superseded'; });
          const r = list.find(x => x.rev === w.rev); const trail = Q.wfTrail(w, r).filter(e => !e.pending).concat({ at: today, who: me, verb: 'published', obj: `Rev ${w.rev}`, icon: 'send', stage: 'Published', chips: [`<span class="tl-chip">${icon('calendar')}<span>Effective</span><b>${Q.fmt(today)}</b></span>`] });
          Object.assign(r, { state: 'Published', published: today, approval: 'Approved', reviewers: w.reviewers.map(x => x.who), trail });
          Object.assign(d, { rev: w.rev, workingRev: null, status: 'Published', updated: today, effective: today, nextReview: Q.addYears(today, 1) });
          Q.S.workflows = Q.S.workflows.filter(x => x.id !== w.id);
          log(`published ${d.title} Rev ${w.rev}`);
          Q.save(); Q.renderSidebar(); Q.go('#/review');
          Q.toast(`Rev ${w.rev} published`, `${d.id} Rev ${w.rev} is now the active controlled version.`);
        } });
    }
  }
})();
