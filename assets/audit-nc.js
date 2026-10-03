/* iQMS — Audit Management: Nonconformity register, monitoring by process and the NC workspace
 * (details, discussion with @mentions and QMS references, corrective action, verification,
 * effectiveness, evidence snapshots, activity). An NC closes only after the auditor has
 * verified implementation and confirmed effectiveness — never because a response was entered. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM;

  /* ---------------- indicators ---------------- */
  const lastBy = (n, pred) => n.comments.filter(pred).map(c => c.at).sort().pop() || '';
  AM.needsResponse = f => { const n = f.nc; if (!AM.ncOpen(f) || ['Verification Required', 'Verified'].includes(n.status)) return false; const owner = n.ca?.owner || n.owner; const other = lastBy(n, c => c.who !== owner), mine = lastBy(n, c => c.who === owner); return (other && other > mine) || (n.status === 'Open' && !mine); };
  AM.newComment = (f, who = AM.actor()) => { const seen = f.nc.seen?.[who] || ''; return f.nc.comments.some(c => c.who !== who && c.at > seen); };
  AM.ncBadges = (f, who = AM.actor()) => {
    const out = [];
    if (AM.ncOverdue(f)) out.push('<span class="ind ind-bad">Overdue</span>');
    if (f.nc.status === 'Verification Required') out.push('<span class="ind ind-warn">Awaiting Verification</span>');
    if (AM.needsResponse(f)) out.push(`<span class="ind ind-info">${(f.nc.ca?.owner || f.nc.owner) === who ? 'Needs your response' : 'Needs Response'}</span>`);
    if (AM.newComment(f, who)) out.push('<span class="ind ind-new">New Comment</span>');
    return `<span class="inds">${out.join('')}</span>`;
  };
  const NCK = AM.NC_KIND;
  const ncSt = f => Q.st(f.nc.status, NCK[f.nc.status]);
  const clsBadge = f => `<span class="st ${f.nc.classification === 'Major' ? 'danger' : 'warning'}">${esc(f.nc.classification)} NC</span>`;

  /* ====================================================================== register */
  AM.ncRegister = q => {
    const S = Q.S, all = AM.ncs(), view = ['areas', 'trends'].includes(q.view) ? q.view : 'register';
    const open = all.filter(AM.ncOpen);
    const strip = `<div class="am-strip" role="list">${[
      ['Total NCs', all.length, `#/audits/nc?s=all`], ['Major', all.filter(f => f.nc.classification === 'Major').length, '#/audits/nc?s=all&cls=Major', 'bad'], ['Minor', all.filter(f => f.nc.classification === 'Minor').length, '#/audits/nc?s=all&cls=Minor'],
      ['Open', open.length, '#/audits/nc'], ['Overdue', all.filter(AM.ncOverdue).length, '#/audits/nc?s=overdue', 'bad'], ['Awaiting Verification', all.filter(f => f.nc.status === 'Verification Required').length, '#/audits/nc?s=verify', 'warn']
    ].map(([k, v, h, t]) => `<a role="listitem" href="${h}"><span class="k">${k}</span><span class="v${v && t ? ' ' + t : ''}">${v}</span></a>`).join('')}</div>`;
    const vt = AM.tabs([['register', 'Register', '#/audits/nc'], ['areas', 'By process', '#/audits/nc?view=areas'], ['trends', 'Trends', '#/audits/nc?view=trends']], view, 'Nonconformity view', 'tabs-sub');
    const head = AM.chrome('nc', { title: 'Nonconformities', crumbs: [['Audits', '#/audits'], ['Nonconformities']], sub: 'Every nonconformity raised in audits, with its corrective action and verification. Owners respond and auditors verify inside each NC.' });
    if (view === 'trends') return { title: 'Nonconformity trends · Audits', nav: 'audits', html: head + strip + vt + AM.ncTrends() };
    if (view === 'areas') return { title: 'Nonconformities by process · Audits', nav: 'audits', html: head + strip + vt + byArea(q) };
    const segs = { open: AM.ncOpen, overdue: AM.ncOverdue, response: AM.needsResponse, verify: f => f.nc.status === 'Verification Required', closed: f => !AM.ncOpen(f) };
    const seg = segs[q.s] ? q.s : q.s === 'all' ? 'all' : 'open';
    const opt = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const audits = [...new Set(all.map(f => f.audit))].sort().reverse(), areas = [...new Set(all.map(f => Q.rootId(f.process)))], clauses = [...new Set(all.map(f => f.clause.split('.').slice(0, 2).join('.')))].sort(AM.clSort);
    const auditors = [...new Set(all.map(f => f.auditor))], owners = [...new Set(all.map(f => f.nc.owner))];
    const init = Object.fromEntries(['audit', 'area', 'clause', 'auditor', 'owner', 'cls'].filter(k => q[k]).map(k => [k, q[k]]));
    const table = Q.table({ id: 'am-ncr', rows: () => AM.ncs().slice().sort((a, b) => (b.nc.last || '') < (a.nc.last || '') ? -1 : 1), key: f => f.nc.no, noun: 'nonconformities', caption: 'Nonconformity register', initialSeg: seg, initialFilters: Object.keys(init).length ? init : undefined, segs,
      search: f => `${f.nc.no} ${f.id} ${f.title} ${f.statement} ${f.clause} ${Q.pname(f.nc.owner)} ${f.audit}`,
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search NCs" aria-label="Search nonconformities"></div>
        <select class="select" data-filter="audit" aria-label="Audit"><option value="all">All audits</option>${opt(audits.map(x => [x, x]), q.audit)}</select>
        <select class="select" data-filter="area" aria-label="Process"><option value="all">All processes</option>${opt(areas.map(x => [x, Q.proc(x)?.name]), q.area)}</select>
        <select class="select" data-filter="clause" aria-label="Clause"><option value="all">All clauses</option>${opt(clauses.map(x => [x, x]), q.clause)}</select>
        <select class="select" data-filter="auditor" aria-label="Auditor"><option value="all">All auditors</option>${opt(auditors.map(x => [x, Q.pname(x)]), q.auditor)}</select>
        <select class="select" data-filter="owner" aria-label="Owner"><option value="all">All owners</option>${opt(owners.map(x => [x, Q.pname(x)]), q.owner)}</select>
        <select class="select" data-filter="cls" aria-label="Classification"><option value="all">Major & minor</option>${opt([['Major', 'Major'], ['Minor', 'Minor']], q.cls)}</select>
        ${Q.seg('Status', [['open', 'Open', AM.ncs().filter(segs.open).length], ['overdue', 'Overdue', AM.ncs().filter(segs.overdue).length], ['response', 'Awaiting response', AM.ncs().filter(segs.response).length], ['verify', 'Awaiting verification', AM.ncs().filter(segs.verify).length], ['closed', 'Closed', AM.ncs().filter(segs.closed).length], ['all', 'All', AM.ncs().length]], seg)}`,
      filters: { audit: (f, v) => f.audit === v, area: (f, v) => Q.inProc(f.process, v), clause: (f, v) => Q.clauseIn(f.clause, v), auditor: (f, v) => f.auditor === v, owner: (f, v) => f.nc.owner === v, cls: (f, v) => f.nc.classification === v },
      columns: [
        { key: 'no', label: 'NC Number', cls: 'c-id', sort: f => f.nc.no, render: f => `${esc(f.nc.no)}<span class="sub">${esc(f.id)}</span>` },
        { key: 'audit', label: 'Audit', sort: f => f.audit, render: f => `<a class="tnum nowrap" href="#/audits/a/${f.audit}">${esc(f.audit)}</a>` },
        { key: 'area', label: 'Process', sort: f => Q.proc(f.process)?.process_code, render: f => `<span class="nowrap">${esc(Q.proc(f.process)?.name)}</span>` },
        { key: 'cl', label: 'ISO Clause', sort: f => Q.clauseSort(f.clause), render: f => `<span class="clause">${esc(f.clause)}</span>` },
        { key: 't', label: 'Nonconformity', sort: f => f.title, render: f => `<span class="title">${esc(f.title)}</span>` },
        { key: 'k', label: 'Classification', sort: f => f.nc.classification, render: clsBadge },
        { key: 'o', label: 'Responsible Owner', sort: f => Q.pname(f.nc.owner), render: f => `<span class="nowrap">${esc(Q.pname(f.nc.owner))}</span>` },
        { key: 'r', label: 'Date Raised', cls: 'c-date', sort: f => f.raised, render: f => Q.fmt(f.raised) },
        { key: 'd', label: 'Due Date', cls: 'c-date', sort: f => f.nc.due, render: f => Q.dueDate(f.nc.due, ['Verification Required', 'Verified', 'Closed'].includes(f.nc.status)) },
        { key: 's', label: 'Status', sort: f => AM.NC_STATUSES.indexOf(f.nc.status), render: ncSt },
        { key: 'l', label: 'Last Activity', sort: f => f.nc.last || '', render: f => `<span class="nowrap small">${esc(AM.ago(f.nc.last))}</span>${AM.ncBadges(f)}` },
        { key: 'x', label: 'Actions', cls: 'c-actions', render: f => `<a class="btn sm" href="#/audits/nc/${f.nc.no}">Open NC</a>` }],
      empty: t => t.seg === 'open' ? '<h3>No open nonconformities</h3><p>Everything raised has been verified and closed.</p>' : '<h3>No matching nonconformities</h3><p>Try clearing a filter.</p>' });
    return { title: 'Nonconformities · Audits', nav: 'audits', html: head + strip + vt + table };
  };

  function byArea(q) {
    const who = AM.actor(), mine = q.mine === '1';
    const list = AM.ncs().filter(f => !mine || (f.nc.ca?.owner || f.nc.owner) === who || f.auditor === who);
    const groups = Object.entries(list.reduce((o, f) => { const r = Q.rootId(f.process); (o[r] = o[r] || []).push(f); return o; }, {})).sort((a, b) => b[1].filter(AM.ncOpen).length - a[1].filter(AM.ncOpen).length);
    return `<div class="am-mon-tools"><label class="checkbox"><input type="checkbox" data-mine ${mine ? 'checked' : ''}>Only NCs where ${esc(Q.pname(who))} is the owner or auditor</label><span class="small muted">Lead auditors and the QMS Manager see every process; process owners see what needs their response.</span></div>
      ${groups.map(([pid, fs]) => { const p = Q.proc(pid), open = fs.filter(AM.ncOpen); return `<section class="panel am-mon section"><div class="panel-head"><h2><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</h2>
        <span class="am-mon-stats"><span><b>${fs.length}</b> NC${fs.length === 1 ? '' : 's'}</span><span><b>${open.length}</b> open</span><span><b>${fs.filter(f => f.nc.status === 'Verification Required').length}</b> awaiting verification</span><span class="${fs.some(AM.ncOverdue) ? 'bad' : ''}"><b>${fs.filter(AM.ncOverdue).length}</b> overdue</span></span>
        <div class="actions"><a class="btn sm ghost" href="#/audits/nc?s=all&area=${pid}">In register</a></div></div>
        <ul class="mon-list">${fs.sort((a, b) => AM.ncOpen(b) - AM.ncOpen(a) || (a.nc.due < b.nc.due ? -1 : 1)).map(f => `<li class="${AM.ncOpen(f) ? '' : 'closed'}"><div class="ml-main"><div class="ml-top"><b class="tnum">${esc(f.nc.no)}</b><span class="clause">Clause ${esc(f.clause)}</span>${clsBadge(f)}${ncSt(f)}${AM.ncBadges(f)}</div>
          <div class="ml-t">${esc(f.title)}</div><div class="ml-meta">Owner <b>${esc(Q.pname(f.nc.ca?.owner || f.nc.owner))}</b> · Due ${Q.dueDate(f.nc.due, ['Verification Required', 'Verified', 'Closed'].includes(f.nc.status))} · ${f.nc.comments.length} comment${f.nc.comments.length === 1 ? '' : 's'} · Last activity ${esc(AM.ago(f.nc.last))} · ${esc(f.audit)}</div></div>
          <a class="btn sm" href="#/audits/nc/${f.nc.no}/discussion">Open NC Workspace</a></li>`).join('')}</ul></section>`; }).join('') || '<section class="panel"><div class="empty"><h3>Nothing here</h3><p>No nonconformities for this selection.</p></div></section>'}`;
  }
  document.addEventListener('change', e => { const c = e.target.closest('[data-mine]'); if (c) location.hash = `#/audits/nc?view=areas${c.checked ? '&mine=1' : ''}`; });

  /* ====================================================================== NC workspace */
  const TABS = [['details', 'Details'], ['discussion', 'Discussion'], ['action', 'Corrective Action'], ['evidence', 'Evidence'], ['activity', 'Activity']];
  let replyTo = null;
  AM.ncWorkspace = (no, tab, q) => {
    const f = AM.ncByNo(no);
    if (!f) return { title: 'NC not found', nav: 'audits', html: AM.chrome('nc', { title: 'Nonconformity not found', sub: `${esc(no)} does not exist.` }) };
    tab = TABS.some(t => t[0] === tab) ? tab : 'details';
    const n = f.nc, a = AM.audit(f.audit), who = AM.actor();
    const st = AM.NC_STATUSES, ci = st.indexOf(n.status);
    const primary = (() => {
      if (n.status === 'Open' && AM.ncCan('manage', f)) return `<button class="btn primary" type="button" data-action="nc-assign" data-no="${n.no}">${icon('user-check')}Assign Corrective Action</button>`;
      if (['Open', 'Action Assigned', 'In Progress'].includes(n.status) && AM.ncCan('respond', f)) return `<a class="btn primary" href="#/audits/nc/${n.no}/action">${icon('pencil')}${n.ca?.submitted ? 'Update Response' : 'Respond'}</a>`;
      if (n.status === 'Verification Required' && AM.ncCan('verify', f)) return `<a class="btn primary" href="#/audits/nc/${n.no}/action#verify">${icon('search-check')}Verify Implementation</a>`;
      if (n.status === 'Verified' && AM.ncCan('verify', f)) return `<a class="btn primary" href="#/audits/nc/${n.no}/action#verify">${icon('circle-check')}Confirm Effectiveness</a>`;
      return '';
    })();
    const more = AM.ncCan('manage', f) ? Q.menu(`More actions for ${n.no}`, [{ label: 'Edit NC Details', icon: 'pencil', data: { action: 'nc-edit', no: n.no } }, ...(n.status === 'Closed' ? [{ label: 'Reopen', icon: 'arrow-left', data: { action: 'nc-reopen', no: n.no } }] : [])], { text: 'More', cls: 'btn' }) : '';
    const meta = `<div class="meta-line"><span>Audit <a href="#/audits/a/${f.audit}"><b>${esc(f.audit)}</b></a> ${esc(a?.title || '')}</span><span>Area <b>${esc(Q.proc(f.process)?.name)}</b></span><span>Clause <b>${esc(f.clause)}</b> ${esc(AM.clTitle(f.clause))}</span><span>Owner <b>${esc(Q.pname(n.ca?.owner || n.owner))}</b></span><span>Due ${Q.dueDate(n.due, ['Verification Required', 'Verified', 'Closed'].includes(n.status))}</span></div>`;
    const head = Q.pageHead({ crumbs: [['Audits', '#/audits'], ['Nonconformities', '#/audits/nc'], [n.no]], pre: `<div class="am-id"><span class="tnum">${esc(n.no)}</span>${clsBadge(f)}${ncSt(f)}${AM.ncBadges(f)}</div>`, title: esc(f.title), meta, actions: primary + more });
    const life = `<ol class="am-life nc-life" aria-label="Nonconformity lifecycle">${st.map((s, i) => `<li class="${i < ci ? 'done' : i === ci ? 'current' : ''}"${i === ci ? ' aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>`;
    const tabs = AM.tabs(TABS.map(([k, l]) => [k, l, `#/audits/nc/${n.no}/${k}`, k === 'discussion' ? (n.comments.length || '') : '']), tab, 'Nonconformity');
    const body = { details, discussion, action, evidence, activity }[tab](f, q);
    return { title: `${n.no} · Nonconformities`, nav: 'audits', html: head + life + `<div class="am-nav">${tabs}${AM.actorSwitch()}</div>` + body.html,
      after: main => { n.seen = n.seen || {}; if (tab === 'discussion' || tab === 'details') { n.seen[who] = AM.now(); Q.save(); } body.after?.(main); if (location.hash.endsWith('#verify')) main.querySelector('#verify')?.scrollIntoView({ block: 'start' }); } };
  };

  function details(f) {
    const n = f.nc, a = AM.audit(f.audit), item = a?.checklist?.find(i => i.id === f.checklistItem);
    return { html: `<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Finding</h2></div><div class="panel-pad">
        <p class="nc-statement">${esc(f.statement)}</p>
        <dl class="dl-list dl-wide" style="margin-top:16px"><dt>Finding</dt><dd class="tnum">${esc(f.id)}</dd><dt>Audit</dt><dd><a href="#/audits/a/${f.audit}">${esc(f.audit)}</a> ${esc(a?.title || '')}</dd><dt>Area</dt><dd>${Q.pcell(f.process)}</dd><dt>Clause</dt><dd><span class="clause">${esc(f.clause)}</span> ${esc(AM.clTitle(f.clause))}</dd>
        <dt>Classification</dt><dd>${clsBadge(f)}</dd><dt>Raised by</dt><dd>${esc(Q.pname(f.auditor))} · ${Q.fmt(f.raised)}</dd><dt>Responsible owner</dt><dd>${esc(Q.pname(n.owner))}</dd><dt>Due date</dt><dd>${Q.dueDate(n.due, ['Verification Required', 'Verified', 'Closed'].includes(n.status))}</dd><dt>Status</dt><dd>${ncSt(f)}</dd>
        ${f.action ? `<dt>Corrective action</dt><dd><a href="#/capa?focus=${esc(f.action)}">${esc(f.action)}</a> in Corrective Action</dd>` : ''}
        ${AM.triggeredBy(n.no).length ? `<dt>Triggered audits</dt><dd>${AM.triggeredBy(n.no).map(x => `<a class="tnum" href="#/audits/a/${x.id}">${esc(x.id)}</a> ${esc(x.status)}`).join(', ')}</dd>` : ''}
        ${item ? `<dt>Checklist question</dt><dd><a href="#/audits/a/${f.audit}/checklist?q=${item.id}">${esc(item.clause)}</a> ${esc(item.question)}</dd>` : ''}</dl></div></section>
      <div><section class="panel"><div class="panel-head"><h2>Where it stands</h2></div><ul class="nc-steps">${[
        ['Raised and owner notified', true, `${Q.fmt(f.raised)}`],
        ['Owner response: correction and root cause', !!(n.ca?.rootCause), n.ca?.rootCause ? 'Recorded' : 'Waiting for the owner'],
        ['Corrective action and implementation evidence', !!n.ca?.submitted, n.ca?.submitted ? `Submitted ${Q.fmt(n.ca.submitted.date)}` : 'Not submitted'],
        ['Auditor verification', !!n.verification, n.verification ? `${esc(n.verification.result)} · ${esc(Q.pname(n.verification.by))}` : 'Not verified'],
        ['Effectiveness confirmed and closed', n.status === 'Closed', n.effectiveness ? `${esc(n.effectiveness.result)} · ${Q.fmt(n.effectiveness.date)}` : 'Open']
      ].map(([t, ok, d]) => `<li class="${ok ? 'ok' : ''}">${icon(ok ? 'circle-check' : 'circle')}<div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul></section>
      <section class="panel section"><div class="panel-head"><h2>Latest discussion</h2><div class="actions"><a class="btn sm ghost" href="#/audits/nc/${n.no}/discussion">Open Discussion</a></div></div>
        ${n.comments.length ? `<ul class="activity">${n.comments.slice(-2).map(c => `<li><span><b>${esc(Q.pname(c.who))}</b> ${fmtText(c.text)}</span><span class="when">${esc(AM.ago(c.at))}</span></li>`).join('')}</ul>` : '<div class="empty small">No comments yet.</div>'}</section></div></div>` };
  }

  /* ---------------- discussion ---------------- */
  const PEOPLE = () => Object.entries(Q.S.people).filter(([id]) => Q.S.users.some(u => u.id === id && u.status !== 'Deactivated'));
  const fmtText = t => {
    let h = esc(t);
    PEOPLE().forEach(([, p]) => { const first = p.name.split(' ')[0]; h = h.replace(new RegExp(`@(${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${first})\\b`, 'g'), '<b class="mention">@$1</b>'); });
    return h.replace(/\n/g, '<br>');
  };
  const roleOf = (f, who) => who === 'system' ? 'iQMS' : who === f.auditor ? 'Auditor' : AM.audit(f.audit)?.auditor === who ? 'Lead Auditor' : who === (f.nc.ca?.owner || f.nc.owner) ? `Owner · ${Q.person(who).title}` : Q.person(who).title;
  const refChip = id => { const d = Q.doc(id), e = Q.S.evidence.find(x => x.id === id); return d ? `<button class="ref-chip" type="button" data-action="open-doc" data-id="${esc(id)}">${icon('file-text')}${esc(d.title)} <span class="tnum">Rev ${esc(d.rev || d.workingRev)}</span></button>` : e ? `<a class="ref-chip" href="#/evidence?focus=${esc(id)}">${icon('paperclip')}${esc(e.name)}</a>` : ''; };
  function discussion(f) {
    const n = f.nc, can = AM.ncCan('comment', f), who = AM.actor();
    const tops = n.comments.filter(c => !c.parent), kids = id => n.comments.filter(c => c.parent === id);
    const comment = (c, reply) => `<article class="cm${reply ? ' reply' : ''}${c.who === who ? ' mine' : ''}" id="cm-${c.id}"><span class="avatar sm">${esc(Q.initials(c.who))}</span><div class="cm-main"><header><b>${esc(Q.pname(c.who))}</b><span class="cm-role">${esc(roleOf(f, c.who))}</span><time class="cm-at" title="${esc(c.at)}">${AM.at(c.at)}</time></header>
      <div class="cm-text">${fmtText(c.text)}</div>${c.refs?.length ? `<div class="cm-refs">${c.refs.map(refChip).join('')}</div>` : ''}${can && !reply ? `<button class="link-btn small" type="button" data-reply="${c.id}">Reply</button>` : ''}</div></article>`;
    // Threads in time order, with system events placed between them.
    const items = [...tops.map(c => ({ at: c.at, html: `<div class="thread">${comment(c)}${kids(c.id).map(k => comment(k, true)).join('')}</div>` })), ...n.events.map(e => ({ at: e.at, html: `<div class="sys-ev">${icon('activity')}<span><b>${e.who === 'system' ? 'iQMS' : esc(Q.pname(e.who))}</b> ${esc(e.text)}</span><time>${AM.at(e.at)}</time></div>` }))].sort((x, y) => x.at < y.at ? -1 : 1);
    const rep = replyTo && n.comments.find(c => c.id === replyTo);
    const docs = [...Q.S.documents.filter(d => !['Obsolete'].includes(d.status)).map(d => [d.id, `${d.id} · ${d.title} (Rev ${d.rev || d.workingRev})`]), ...Q.S.evidence.map(e => [e.id, `${e.id} · ${e.name}`])];
    return { html: `<div class="disc"><section class="panel disc-feed">${items.map(x => x.html).join('') || '<div class="empty small">No discussion yet. Start it below.</div>'}</section>
      ${can && n.status !== 'Closed' ? `<section class="panel composer" id="composer"><div class="panel-pad">${rep ? `<div class="replying">Replying to <b>${esc(Q.pname(rep.who))}</b> <button class="link-btn small" type="button" data-reply-x>Cancel reply</button></div>` : ''}
        <label class="field"><span>Comment as ${esc(Q.pname(who))}</span><div class="mention-wrap"><textarea class="textarea" rows="3" id="cmText" placeholder="Write a comment. Type @ to mention someone."></textarea><div class="mention-pop" id="mentionPop" hidden role="listbox" aria-label="Mention someone"></div></div></label>
        <div class="cm-refs" id="cmRefs"></div>
        <div class="composer-bar"><label class="field cm-ref-pick"><span class="sr-only">Reference a QMS document or record</span><select class="select" id="cmRef"><option value="">${'Reference QMS document or record…'}</option>${docs.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label><button class="btn primary" type="button" data-post>Post Comment</button></div></div></section>` : n.status === 'Closed' ? '<p class="small muted">This NC is closed. Reopen it to continue the discussion.</p>' : '<p class="small muted">Viewers can read the discussion but not comment.</p>'}</div>`,
      after: main => {
        const ta = main.querySelector('#cmText'), pop = main.querySelector('#mentionPop'), refs = [], refBox = main.querySelector('#cmRefs');
        main.querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => { replyTo = b.dataset.reply; Q.render({ noFocus: true, keepScroll: true }); document.querySelector('#cmText')?.focus(); }));
        main.querySelector('[data-reply-x]')?.addEventListener('click', () => { replyTo = null; Q.render({ noFocus: true, keepScroll: true }); });
        if (!ta) return;
        main.querySelector('#cmRef').addEventListener('change', e => { const v = e.target.value; if (v && !refs.includes(v)) { refs.push(v); refBox.innerHTML = refs.map(r => `<span class="ref-wrap">${refChip(r)}<button type="button" class="cl-x" data-unref="${esc(r)}" aria-label="Remove reference">${icon('x')}</button></span>`).join(''); Q.refreshIcons(); } e.target.value = ''; e.target._combo?.sync?.(); });
        refBox.addEventListener('click', e => { const x = e.target.closest('[data-unref]'); if (!x) return; e.stopPropagation(); refs.splice(refs.indexOf(x.dataset.unref), 1); x.parentElement.remove(); });
        // @mentions: suggestions from active users while typing after "@".
        let sel = 0, matches = [];
        const word = () => { const m = ta.value.slice(0, ta.selectionStart).match(/@([\w]*)$/); return m ? m[1] : null; };
        const show = () => { const w = word(); if (w === null) { pop.hidden = true; return; } matches = PEOPLE().filter(([, p]) => p.name.toLowerCase().includes(w.toLowerCase())).slice(0, 6); sel = 0; pop.innerHTML = matches.map(([id, p], i) => `<button type="button" role="option" aria-selected="${i === sel}" data-pick="${id}"><span class="avatar sm">${esc(Q.initials(id))}</span>${esc(p.name)}<span class="muted small">${esc(p.title)}</span></button>`).join(''); pop.hidden = !matches.length; };
        const pick = id => { const p = Q.person(id), w = word(); ta.setRangeText(`${p.name.split(' ')[0]} `, ta.selectionStart - w.length, ta.selectionStart, 'end'); pop.hidden = true; ta.focus(); };
        ta.addEventListener('input', show);
        ta.addEventListener('keydown', e => { if (pop.hidden) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') main.querySelector('[data-post]').click(); return; } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length; pop.querySelectorAll('[data-pick]').forEach((b, i) => b.setAttribute('aria-selected', String(i === sel))); } else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[sel][0]); } else if (e.key === 'Escape') { pop.hidden = true; } });
        pop.addEventListener('mousedown', e => { const b = e.target.closest('[data-pick]'); if (b) { e.preventDefault(); pick(b.dataset.pick); } });
        main.querySelector('[data-post]').addEventListener('click', () => {
          const text = ta.value.trim(); if (!text) { ta.focus(); return; }
          n.comments.push({ id: 'c' + Date.now().toString(36), who: AM.actor(), at: AM.now(), text, refs: refs.slice(), parent: replyTo });
          const mentioned = PEOPLE().filter(([, p]) => new RegExp(`@(${p.name}|${p.name.split(' ')[0]})\\b`).test(text)).map(([id]) => id);
          if (mentioned.length) AM.ncLog(f, `notified ${mentioned.map(Q.pname).join(', ')} (mentioned)`, 'system');
          n.last = AM.now(); n.seen = { ...(n.seen || {}), [AM.actor()]: AM.now() }; replyTo = null;
          Q.save(); Q.render({ noFocus: true, keepScroll: true }); Q.syncNotifDot?.(); Q.toast('Comment posted', mentioned.length ? `${mentioned.map(Q.pname).join(', ')} notified` : '');
        });
      } };
  }

  /* ---------------- corrective action, verification, effectiveness ---------------- */
  function action(f) {
    const n = f.nc, ca = n.ca, canR = AM.ncCan('respond', f) && ['Open', 'Action Assigned', 'In Progress'].includes(n.status), canV = AM.ncCan('verify', f);
    const ro = canR ? '' : 'readonly disabled';
    const evList = (ca.evidence || []).map((s, i) => `<li>${AM.snapLine(s)}${canR ? `<button type="button" class="cl-x" data-unev="${i}" aria-label="Remove reference">${icon('x')}</button>` : ''}</li>`).join('');
    const pick = [...Q.S.documents.filter(d => !['Obsolete'].includes(d.status) && (Q.inProc(d.process, f.process) || Q.docIso(d).some(c => Q.clauseIn(c, f.clause.split('.').slice(0, 2).join('.'))))).map(d => [`doc|${d.id}`, `${d.id} · ${d.title} (Rev ${d.rev || d.workingRev})`]), ...Q.S.evidence.filter(e => Q.inProc(e.process, f.process)).map(e => [`evidence|${e.id}`, `${e.id} · ${e.name}`])];
    return { html: `<section class="panel"><div class="panel-head"><h2>Owner response</h2><span class="muted small">${ca.submitted ? `Submitted by ${esc(Q.pname(ca.submitted.by))} · ${Q.fmt(ca.submitted.date)}` : canR ? 'Saved as a draft until you submit it for verification' : 'Waiting for the owner'}</span></div>
        ${!canR ? `<div class="panel-pad"><dl class="dl-list dl-wide"><dt>Immediate correction</dt><dd>${esc(ca.correction || '—')}</dd><dt>Root cause</dt><dd>${esc(ca.rootCause || '—')}</dd><dt>Corrective action</dt><dd>${esc(ca.action || '—')}</dd><dt>Responsible owner</dt><dd>${esc(Q.pname(ca.owner || n.owner))}</dd><dt>Due date</dt><dd>${Q.fmt(ca.due || n.due)}</dd><dt>Implementation</dt><dd>${esc(ca.impl)}</dd><dt>Evidence of implementation</dt><dd>${evList ? `<ul class="snap-list">${evList}</ul>` : '—'}</dd></dl>${['Open', 'Action Assigned', 'In Progress'].includes(n.status) ? `<p class="small muted" style="margin-top:12px">${esc(Q.pname(ca.owner || n.owner))} completes this section. Switch “Viewing as” to see it as the owner.</p>` : ''}</div>` : `
        <form class="panel-pad" id="caForm"><div class="form-grid">
          <label class="field full"><span>Immediate correction <span class="req">*</span></span><textarea class="textarea" name="correction" rows="2" ${ro} placeholder="What was done straight away to contain or fix this case">${esc(ca.correction)}</textarea></label>
          <label class="field full"><span>Root cause <span class="req">*</span></span><textarea class="textarea" name="rootCause" rows="2" ${ro} placeholder="Why it happened (e.g. 5 whys), not who">${esc(ca.rootCause)}</textarea></label>
          <label class="field full"><span>Corrective action <span class="req">*</span></span><textarea class="textarea" name="action" rows="2" ${ro} placeholder="What changes so it does not happen again">${esc(ca.action)}</textarea></label>
          <label class="field"><span>Responsible owner</span><select class="select" name="owner" ${ro}>${Q.peopleOptions(ca.owner || n.owner)}</select></label>
          <label class="field"><span>Due date</span><input class="input" type="date" name="due" value="${esc(ca.due || n.due)}" ${ro}></label>
          <label class="field"><span>Implementation status</span><select class="select" name="impl" ${ro}>${['Not started', 'In progress', 'Implemented'].map(x => `<option${x === ca.impl ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
          <div class="field full"><span>Evidence of implementation (QMS references)</span>${evList ? `<ul class="snap-list" id="caEv">${evList}</ul>` : '<p class="small muted">No references yet. Reference the updated documents or records already in iQMS.</p>'}
            ${canR ? `<label class="field" style="margin-top:6px"><span class="sr-only">Reference QMS evidence</span><select class="select" data-ca-ref><option value="">Reference QMS document or record…</option>${pick.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>` : ''}</div>
        </div>${canR ? `<div class="form-actions"><button class="btn" type="button" data-ca-save>Save Draft</button><button class="btn primary" type="button" data-ca-submit>Submit for Verification</button><span class="small muted">Submitting asks the auditor to verify. It does not close the NC.</span></div><p class="auth-err" role="alert" id="caErr"></p>` : ''}</form>`}</section>
      <section class="panel section" id="verify"><div class="panel-head"><h2>Auditor verification</h2><span class="muted small">Was the action implemented as described?</span></div><div class="panel-pad">
        ${n.verification ? `<p>${Q.st(n.verification.result, n.verification.result === 'Implemented' ? 'success' : 'danger')} by <b>${esc(Q.pname(n.verification.by))}</b> · ${Q.fmt(n.verification.date)}</p><p class="small">${esc(n.verification.note)}</p>`
          : n.status === 'Verification Required' && canV ? `<form id="verForm"><label class="field"><span>Verification note <span class="req">*</span></span><textarea class="textarea" name="note" rows="2" required placeholder="What you sampled and saw"></textarea></label><div class="form-actions"><button class="btn primary" type="button" data-ver="ok">${icon('circle-check')}Verify Implementation</button><button class="btn" type="button" data-ver="return">Return to Owner</button></div></form>`
          : `<p class="small muted">${n.status === 'Verification Required' ? 'Waiting for the auditor. The owner cannot verify their own action.' : 'Available once the owner submits the corrective action.'}</p>`}</div></section>
      <section class="panel section"><div class="panel-head"><h2>Effectiveness and closure</h2><span class="muted small">Has the problem stopped recurring?</span></div><div class="panel-pad">
        ${n.effectiveness ? `<p>${Q.st(n.effectiveness.result, n.effectiveness.result === 'Effective' ? 'success' : 'danger')} by <b>${esc(Q.pname(n.effectiveness.by))}</b> · ${Q.fmt(n.effectiveness.date)}</p><p class="small">${esc(n.effectiveness.note)}</p>`
          : n.status === 'Verified' && canV ? `<form id="effForm"><label class="field"><span>Effectiveness review <span class="req">*</span></span><textarea class="textarea" name="note" rows="2" required placeholder="e.g. no recurrence in the records sampled since implementation"></textarea></label><div class="form-actions"><button class="btn primary" type="button" data-eff="ok">${icon('circle-check')}Effective — Close NC</button><button class="btn danger" type="button" data-eff="no">Not Effective — Reopen Action</button></div></form>`
          : '<p class="small muted">Available after implementation is verified.</p>'}</div></section>`,
      after: main => {
        const form = main.querySelector('#caForm'), err = t => { const e = main.querySelector('#caErr'); if (e) e.textContent = t; };
        const collect = () => { const v = Q.formValues(form); Object.assign(ca, { correction: v.correction.trim(), rootCause: v.rootCause.trim(), action: v.action.trim(), owner: v.owner, due: v.due, impl: v.impl }); };
        main.querySelector('[data-ca-ref]')?.addEventListener('change', e => { if (!e.target.value) return; collect(); const [kind, id] = e.target.value.split('|'); if (!ca.evidence.some(s => s.kind === kind && s.id === id)) ca.evidence.push(AM.snap({ kind, id }, AM.actor(), Q.today())); Q.save(); Q.render({ noFocus: true, keepScroll: true }); });
        main.querySelectorAll('[data-unev]').forEach(b => b.addEventListener('click', () => { collect(); ca.evidence.splice(+b.dataset.unev, 1); Q.save(); Q.render({ noFocus: true, keepScroll: true }); }));
        main.querySelector('[data-ca-save]')?.addEventListener('click', () => { collect(); if (['Open', 'Action Assigned'].includes(n.status)) { AM.setNcStatus(f, 'In Progress'); AM.ncLog(f, 'started the corrective action'); } else AM.ncLog(f, 'updated the corrective action draft'); AM.syncCA(f); Q.save(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Draft saved', n.no); });
        main.querySelector('[data-ca-submit]')?.addEventListener('click', () => {
          collect();
          const missing = [['correction', 'immediate correction'], ['rootCause', 'root cause'], ['action', 'corrective action']].filter(([k]) => !ca[k]).map(x => x[1]);
          if (missing.length) { err(`Add the ${missing.join(', ')}.`); return; }
          if (ca.impl !== 'Implemented') { err('Set the implementation status to Implemented before asking for verification.'); return; }
          if (!ca.evidence.length) { err('Reference at least one QMS document or record that shows the action was implemented.'); return; }
          ca.submitted = { by: AM.actor(), date: Q.today() }; AM.setNcStatus(f, 'Verification Required'); AM.ncLog(f, 'submitted the corrective action and requested verification');
          const au = AM.audit(f.audit); if (au) AM.log(au, `${n.no}: corrective action submitted by ${Q.pname(AM.actor())}`);
          Q.save(); Q.render({ noFocus: true }); Q.toast('Submitted for verification', `${Q.pname(f.auditor)} will verify ${n.no}.`);
        });
        main.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
          const vf = main.querySelector('#verForm'); if (!Q.validate(vf)) return; const note = Q.formValues(vf).note.trim();
          if (b.dataset.ver === 'ok') { n.verification = { result: 'Implemented', by: AM.actor(), date: Q.today(), note }; AM.setNcStatus(f, 'Verified'); AM.ncLog(f, 'verified implementation'); }
          else { n.verification = null; ca.submitted = null; AM.setNcStatus(f, 'In Progress'); AM.ncLog(f, 'returned the corrective action to the owner'); n.comments.push({ id: 'c' + Date.now().toString(36), who: AM.actor(), at: AM.now(), text: `Returned for more work: ${note}`, refs: [], parent: null }); }
          const au = AM.audit(f.audit); if (au) AM.log(au, `${n.no}: ${b.dataset.ver === 'ok' ? 'implementation verified' : 'returned to the owner'}`);
          Q.save(); Q.render({ noFocus: true }); Q.toast(b.dataset.ver === 'ok' ? 'Implementation verified' : 'Returned to owner', n.no);
        }));
        main.querySelectorAll('[data-eff]').forEach(b => b.addEventListener('click', () => {
          const ef = main.querySelector('#effForm'); if (!Q.validate(ef)) return; const note = Q.formValues(ef).note.trim(), ok = b.dataset.eff === 'ok';
          if (ok) { n.effectiveness = { result: 'Effective', by: AM.actor(), date: Q.today(), note }; AM.setNcStatus(f, 'Closed'); AM.ncLog(f, 'confirmed effectiveness and closed the NC'); }
          else { n.effectiveness = null; n.verification = null; ca.submitted = null; ca.impl = 'In progress'; AM.setNcStatus(f, 'In Progress'); AM.ncLog(f, `found the action not effective and reopened it — ${note}`); }
          const au = AM.audit(f.audit); if (au) { AM.log(au, `${n.no}: ${ok ? 'closed (effective)' : 'reopened (not effective)'}`); }
          Q.save(); Q.render({ noFocus: true });
          const left = au ? AM.findingsOf(au.id).filter(AM.ncOpen).length : 0;
          Q.toast(ok ? 'NC closed' : 'NC reopened', ok && au && !left && ['Published', 'Follow-up'].includes(au.status) ? `All NCs of ${au.id} are closed — the audit can now be closed.` : n.no);
        }));
      } };
  }

  function evidence(f) {
    const n = f.nc;
    return { html: `<div class="callout small" style="margin-bottom:16px">${icon('lock')}<span>Evidence is recorded as it was when reviewed: document, revision, status, who reviewed it and when. If a document is revised later, the record still shows the revision that was reviewed.</span></div>
      <section class="panel"><div class="panel-head"><h2>Evidence at the time of the finding</h2><span class="muted small">${esc(f.audit)} · ${Q.fmt(f.raised)}</span></div><div class="panel-pad">${f.evidence?.length ? `<ul class="snap-list">${f.evidence.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : '<p class="small muted">No evidence was referenced.</p>'}</div></section>
      <section class="panel section"><div class="panel-head"><h2>Evidence of implementation</h2><span class="muted small">referenced by the owner</span></div><div class="panel-pad">${n.ca?.evidence?.length ? `<ul class="snap-list">${n.ca.evidence.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : '<p class="small muted">None yet.</p>'}</div></section>` };
  }

  function activity(f) {
    const n = f.nc, all = [...n.events.map(e => ({ ...e })), ...n.comments.map(c => ({ at: c.at, who: c.who, text: `commented: “${c.text.length > 120 ? c.text.slice(0, 120) + '…' : c.text}”` }))].sort((x, y) => x.at < y.at ? 1 : -1);
    return { html: `<section class="panel"><ul class="activity am-act">${all.map(e => `<li><span class="avatar sm">${e.who === 'system' ? icon('bell') : esc(Q.initials(e.who))}</span><span><b>${e.who === 'system' ? 'iQMS' : esc(Q.pname(e.who))}</b> ${esc(e.text)}</span><span class="when">${AM.at(e.at)}</span></li>`).join('')}</ul></section>` };
  }

  /* ---------------- manager actions ---------------- */
  Q.actions['nc-assign'] = d => {
    const f = AM.ncByNo(d.no), n = f.nc;
    const m = Q.openModal({ size: 's', title: `Assign corrective action — ${esc(n.no)}`, body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Responsible owner</span><select class="select" name="owner">${Q.peopleOptions(n.owner)}</select></label><label class="field"><span>Response due</span><input class="input" type="date" name="due" value="${esc(n.due)}"></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Assign</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const v = Q.formValues(m.querySelector('form')); Object.assign(n, { owner: v.owner, due: v.due }); Object.assign(n.ca, { owner: v.owner, due: v.due }); AM.setNcStatus(f, 'Action Assigned'); AM.ncLog(f, `assigned the corrective action to ${Q.pname(v.owner)}, due ${Q.fmt(v.due)}`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Corrective action assigned', `${Q.pname(v.owner)} · ${f.action || ''}`); });
  };
  Q.actions['nc-edit'] = d => {
    const f = AM.ncByNo(d.no), n = f.nc;
    const m = Q.openModal({ size: 'm', title: `Edit ${esc(n.no)}`, sub: 'Changes are recorded in the activity log and flow into the audit report.', body: `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Classification</span><select class="select" name="cls">${['Minor', 'Major'].map(x => `<option${x === n.classification ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Clause</span><input class="input tnum" name="clause" value="${esc(f.clause)}"></label>
      <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(n.owner)}</select></label>
      <label class="field"><span>Due date</span><input class="input" type="date" name="due" value="${esc(n.due)}"></label>
      <label class="field full"><span>Title</span><input class="input" name="title" value="${esc(f.title)}"></label>
      <label class="field full"><span>Statement</span><textarea class="textarea" name="statement" rows="3">${esc(f.statement)}</textarea></label>
      <label class="field full"><span>Reason for change <span class="req">*</span></span><input class="input" name="reason" required></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const fm = m.querySelector('form'); if (!Q.validate(fm)) return; const v = Q.formValues(fm), ch = [];
      if (v.cls !== n.classification) { ch.push(`classification ${n.classification} → ${v.cls}`); n.classification = v.cls; f.type = v.cls === 'Major' ? 'Major nonconformity' : 'Minor nonconformity'; const a = AM.audit(f.audit), it = a?.checklist?.find(i => i.id === f.checklistItem); if (it) it.result = f.type; }
      if (v.clause !== f.clause) { ch.push(`clause ${f.clause} → ${v.clause}`); f.clause = v.clause; }
      if (v.owner !== n.owner) { ch.push(`owner → ${Q.pname(v.owner)}`); n.owner = v.owner; n.ca.owner = v.owner; }
      if (v.due !== n.due) { ch.push(`due → ${Q.fmt(v.due)}`); n.due = v.due; }
      if (v.title !== f.title || v.statement !== f.statement) { ch.push('statement edited'); f.title = v.title; f.statement = v.statement; }
      AM.ncLog(f, `edited the NC (${ch.join('; ') || 'no field changes'}) — ${v.reason}`); AM.syncCA(f); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('NC updated', n.no); });
  };
  Q.actions['nc-reopen'] = d => { const f = AM.ncByNo(d.no); Q.confirm({ title: `Reopen ${esc(d.no)}?`, confirm: 'Reopen', body: '<p>The corrective action goes back to In Progress. History is kept.</p>', onConfirm: () => { f.nc.effectiveness = null; AM.setNcStatus(f, 'In Progress'); AM.ncLog(f, 'reopened the NC'); Q.save(); Q.render({ noFocus: true }); } }); };
})();
