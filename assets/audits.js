/* iQMS — Audit Management (ISO 9001 clause 9.2): programme → plan → schedule → team → areas & clauses →
 * checklist → existing QMS evidence → conduct → findings → nonconformities → corrective action →
 * report → review/approval → publish → follow-up → effectiveness → closure.
 *
 * Records reuse the existing stores: Q.S.audits (programme), Q.S.findings (every finding; NCs carry `nc`),
 * Q.S.actions (corrective actions, synced from NCs), Q.S.documents / revisions (evidence and snapshots),
 * processes' "ISO 9001 clauses" (the area–clause mapping) and Q.S.people / users (auditors, owners).
 * NC register and NC workspace: audit-nc.js. Reports, editor and print: audit-report.js. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM = {};
  const SEED = window.QMS_DATA;

  /* ====================================================================== constants */
  AM.STATUSES = ['Planned', 'Scheduled', 'Checklist Ready', 'In Progress', 'Reporting', 'Published', 'Follow-up', 'Closed'];
  AM.ST_KIND = { Planned: 'neutral', Scheduled: 'info', 'Checklist Ready': 'info', 'In Progress': 'warning', Reporting: 'orange', Published: 'success outline', 'Follow-up': 'orange', Closed: 'success', Overdue: 'danger' };
  AM.TYPES = ['Internal Audit', 'Process Audit', 'Department Audit', 'Follow-up Audit', 'Special Audit'];
  AM.ROLES = ['Lead Auditor', 'Auditor', 'Technical Expert', 'Observer'];
  AM.NC_STATUSES = ['Open', 'Action Assigned', 'In Progress', 'Verification Required', 'Verified', 'Closed'];
  AM.NC_KIND = { Open: 'danger', 'Action Assigned': 'warning', 'In Progress': 'info', 'Verification Required': 'orange', Verified: 'success outline', Closed: 'muted' };
  AM.REPORT_KIND = { 'Not started': 'neutral', Draft: 'neutral', 'For Review': 'info', Approved: 'success outline', Published: 'success' };
  // Checklist assessment → finding type (the finding register keeps the existing type names).
  AM.RESULTS = [
    ['Conforming', 'Conforming', 'success'], ['Observation', 'Observation', 'info'], ['Opportunity for improvement', 'OFI', 'info'],
    ['Minor nonconformity', 'Minor NC', 'warning'], ['Major nonconformity', 'Major NC', 'danger'], ['N/A', 'N/A', 'muted']];
  AM.FINDING_TYPES = AM.RESULTS.slice(1, 5).map(r => r[0]);
  AM.isNcType = t => /nonconformity/i.test(t || '');
  AM.short = t => (AM.RESULTS.find(r => r[0] === t) || [, t])[1];
  AM.typeKind = t => (AM.RESULTS.find(r => r[0] === t) || [, , 'neutral'])[2];

  /* ISO 9001 clause titles (structure of the 2015/2026 editions). */
  AM.CL = {
    '4.1': 'Understanding the organization and its context', '4.2': 'Needs and expectations of interested parties', '4.3': 'Scope of the QMS', '4.4': 'QMS and its processes',
    '5.1': 'Leadership and commitment', '5.1.1': 'General', '5.1.2': 'Customer focus', '5.2': 'Quality policy', '5.3': 'Organizational roles, responsibilities and authorities',
    '6.1': 'Actions to address risks and opportunities', '6.2': 'Quality objectives and planning to achieve them', '6.3': 'Planning of changes',
    '7.1': 'Resources', '7.1.1': 'General', '7.1.2': 'People', '7.1.3': 'Infrastructure', '7.1.4': 'Environment for the operation of processes', '7.1.5': 'Monitoring and measuring resources', '7.1.6': 'Organizational knowledge',
    '7.2': 'Competence', '7.3': 'Awareness', '7.4': 'Communication', '7.5': 'Documented information', '7.5.1': 'General', '7.5.2': 'Creating and updating', '7.5.3': 'Control of documented information',
    '8.1': 'Operational planning and control', '8.2': 'Requirements for products and services', '8.2.1': 'Customer communication', '8.2.2': 'Determining requirements', '8.2.3': 'Review of requirements', '8.2.4': 'Changes to requirements',
    '8.3': 'Design and development', '8.3.1': 'General', '8.3.2': 'Design and development planning', '8.3.3': 'Design and development inputs', '8.3.4': 'Design and development controls', '8.3.5': 'Design and development outputs', '8.3.6': 'Design and development changes',
    '8.4': 'Control of externally provided processes, products and services', '8.4.1': 'General', '8.4.2': 'Type and extent of control', '8.4.3': 'Information for external providers',
    '8.5': 'Production and service provision', '8.5.1': 'Control of production and service provision', '8.5.2': 'Identification and traceability', '8.5.3': 'Property belonging to customers or external providers', '8.5.4': 'Preservation', '8.5.5': 'Post-delivery activities', '8.5.6': 'Control of changes',
    '8.6': 'Release of products and services', '8.7': 'Control of nonconforming outputs',
    '9.1': 'Monitoring, measurement, analysis and evaluation', '9.1.1': 'General', '9.1.2': 'Customer satisfaction', '9.1.3': 'Analysis and evaluation', '9.2': 'Internal audit', '9.3': 'Management review',
    '10.1': 'General', '10.2': 'Nonconformity and corrective action', '10.3': 'Continual improvement'
  };
  AM.clTitle = c => {
    const t = AM.CL[c] || Q.S.iso.find(r => r.clause === c)?.title || Q.clauseTitle(c) || '';
    if (t !== 'General') return t;
    const parent = c.split('.').slice(0, -1).join('.'); return `${AM.CL[parent] || parent} — General`;
  };
  AM.subsOf = c => Object.keys(AM.CL).filter(k => k.startsWith(c + '.') && k.split('.').length === c.split('.').length + 1);
  AM.clSort = (a, b) => Q.clauseSort(a) < Q.clauseSort(b) ? -1 : Q.clauseSort(a) > Q.clauseSort(b) ? 1 : 0;
  const fam = (a, b) => Q.clauseIn(a, b) || Q.clauseIn(b, a);

  /* Question bank: suggestions only. Auditors edit, add and remove questions per audit. */
  const QB = [
    ['4.1', 'Has the organization determined internal and external issues relevant to its purpose, and are they reviewed?', ['Context & Interested Parties Register', 'Management review minutes']],
    ['4.2', 'Are interested parties and their relevant requirements identified and monitored?', ['Context & Interested Parties Register']],
    ['4.3', 'Is the QMS scope documented, including justification for any requirement that is not applicable?', ['QMS Scope Statement']],
    ['4.4', 'Are QMS processes, their sequence, interaction, owners and performance indicators defined?', ['Process map', 'Process definitions']],
    ['5.1', 'Does top management demonstrate leadership and accountability for the QMS (policy, objectives, reviews, resources)?', ['Management review minutes', 'Resource decisions']],
    ['5.2', 'Is the quality policy approved, communicated, understood and available to interested parties?', ['Quality Policy', 'Acknowledgement records']],
    ['5.3', 'Are responsibilities and authorities assigned, communicated and understood?', ['Roles & Responsibilities Matrix', 'Organization chart', 'Interviews']],
    ['6.1', 'Are risks and opportunities determined, and are actions planned and evaluated for effectiveness?', ['Risk register', 'Treatment plans']],
    ['6.2', 'Are quality objectives measurable, monitored and supported by plans (what, who, when, how evaluated)?', ['Quality Objectives plan', 'KPI results']],
    ['7.1.2', 'Are enough competent people available to operate the area’s processes?', ['Headcount plan', 'Competency requirements']],
    ['7.1.3', 'Is the infrastructure needed for the processes provided and maintained?', ['Equipment register', 'Maintenance plan']],
    ['7.1.5', 'Are measuring instruments calibrated or verified at intervals, identified and safeguarded?', ['Calibration register', 'Calibration certificates', 'Recall records']],
    ['7.2', 'Are competence requirements defined, and is competence evaluated before people work unsupervised?', ['Competency requirements', 'Training records', 'Competence evaluations']],
    ['7.3', 'Are people aware of the quality policy, relevant objectives and the implications of not conforming?', ['Toolbox talk attendance', 'Interviews']],
    ['7.4', 'Is it defined what is communicated to external providers and internally, when, and by whom?', ['Procurement Procedure', 'Purchase orders']],
    ['7.5', 'Are the area’s documents controlled (approved, current revision available at point of use) and records retained?', ['Document register', 'Records at point of use']],
    ['8.1', 'Is operational work planned with criteria, resources and the records needed to show it was carried out as planned?', ['Project plans', 'Work instructions']],
    ['8.2.3', 'Are customer requirements reviewed before committing to supply, and are changes handled?', ['Contract review records', 'Change records']],
    ['8.2', 'Are customer requirements determined, reviewed before acceptance and communicated?', ['Quotation and contract review records']],
    ['8.3.3', 'Are design inputs complete, unambiguous and based on site data?', ['Design Input Checklist', 'Site survey']],
    ['8.3.4', 'Are design reviews and verification performed and recorded with the people involved?', ['Design review records', 'Verification records']],
    ['8.3.6', 'Are design changes identified, reviewed, approved and recorded?', ['Design change records']],
    ['8.4.1', 'Are external providers evaluated and selected according to defined criteria before approval?', ['Supplier evaluation records', 'Approved Supplier List', 'Supplier performance records']],
    ['8.4.1', 'Is supplier performance monitored and re-evaluated, and does the Approved Supplier List reflect current status?', ['Supplier scorecards', 'Approved Supplier List']],
    ['8.4.2', 'Is the type and extent of control (inspection, certificates) defined for purchased products?', ['Receiving inspection records', 'Certificates of conformity']],
    ['8.4.3', 'Do purchase orders communicate requirements (specifications, approvals, competence) to providers?', ['Purchase orders', 'Supplier specifications']],
    ['8.5.1', 'Is installation carried out under controlled conditions (current work instructions, competent people, inspections)?', ['Installation work instructions', 'Inspection checklists', 'Site records']],
    ['8.5.2', 'Can materials and installed equipment be identified and traced (serial numbers, batches)?', ['Traceability records', 'Goods receipt log']],
    ['8.5.4', 'Are materials preserved during storage, handling and transport?', ['Storage conditions', 'Preservation work instruction']],
    ['8.5.5', 'Are warranty and post-delivery obligations met?', ['Warranty claims log', 'Service records']],
    ['8.6', 'Is release to the customer authorized only after planned tests are completed and recorded?', ['Commissioning reports', 'Test records']],
    ['8.7', 'Are nonconforming outputs identified, segregated and dispositioned, with records kept?', ['Nonconforming material records', 'Disposition decisions']],
    ['9.1', 'Does the area monitor and analyse the performance indicators assigned to it?', ['KPI results', 'Trend analysis']],
    ['9.1.2', 'Is customer satisfaction monitored and acted on?', ['Survey results', 'Complaint log']],
    ['9.1.3', 'Are data analysed to evaluate performance and the effectiveness of the QMS?', ['KPI analysis', 'Management review input']],
    ['9.2', 'Is the audit programme planned on importance and previous results, and are auditors independent?', ['Audit programme', 'Audit reports']],
    ['9.3', 'Does management review cover all required inputs and record decisions and actions?', ['Management review minutes', 'Action log']],
    ['10.2', 'Are nonconformities corrected, root causes determined and corrective actions verified for effectiveness?', ['Corrective action records', 'Effectiveness reviews']],
    ['10.3', 'Are opportunities for improvement identified and acted on?', ['Improvement register']]
  ];
  AM.questionsFor = clause => {
    let list = QB.filter(([c]) => c === clause);
    if (!list.length) list = QB.filter(([c]) => Q.clauseIn(c, clause)); // 8.4 → 8.4.1, 8.4.2 …
    if (!list.length) list = QB.filter(([c]) => Q.clauseIn(clause, c)).slice(0, 1); // 8.4.1 → 8.4 question
    if (!list.length) list = [[clause, `Is clause ${clause} (${AM.clTitle(clause)}) implemented in this area, with evidence retained?`, ['Procedures', 'Records']]];
    return list.map(([c, q, ev]) => ({ sub: Q.clauseIn(c, clause) ? c : clause, q, ev }));
  };

  /* ====================================================================== accessors */
  AM.audit = id => Q.S.audits.find(a => a.id === id);
  AM.findingsOf = id => Q.S.findings.filter(f => f.audit === id);
  AM.ncs = () => Q.S.findings.filter(f => f.nc);
  AM.ncByNo = no => Q.S.findings.find(f => f.nc?.no === no);
  AM.ncOpen = f => f.nc && f.nc.status !== 'Closed';
  // Overdue = the owner's part is late. Once submitted for verification or verified, the clock is with the auditor.
  AM.ncOverdue = f => AM.ncOpen(f) && !['Verification Required', 'Verified'].includes(f.nc.status) && f.nc.due && f.nc.due < Q.today();
  AM.overdue = a => ['Planned', 'Scheduled', 'Checklist Ready'].includes(a.status) && !!a.date && a.date < Q.today();
  AM.badge = a => `${Q.st(a.status, AM.ST_KIND[a.status])}${AM.overdue(a) ? ` ${Q.st('Overdue', 'danger')}` : ''}`;
  AM.area = (a, pid) => a.areas.find(x => x.process === pid);
  AM.clausesOf = (a, ar) => (ar.clauses || Q.proc(ar.process)?.iso || []).slice().sort(AM.clSort);
  AM.items = (a, pid) => (a.checklist || []).filter(i => !pid || pid === 'all' || i.area === pid);
  AM.progress = (a, pid) => { const it = AM.items(a, pid); return it.length ? Math.round(it.filter(i => i.result).length / it.length * 100) : 0; };
  AM.allClauses = a => [...new Set(a.areas.flatMap(ar => AM.clausesOf(a, ar)))].sort(AM.clSort);
  AM.dateRange = a => !a.date ? `<span class="muted">${esc(a.plannedPeriod || 'Not scheduled')}</span>` : a.endDate && a.endDate !== a.date ? `${Q.fmt(a.date)} – ${Q.fmt(a.endDate)}` : Q.fmt(a.date);
  AM.now = () => `${Q.today()} ${new Date().toTimeString().slice(0, 5)}`;
  AM.at = s => { if (!s) return ''; const [d, t] = String(s).split(' '); return `${Q.fmt(d)}${t ? ` · ${t}` : ''}`; };
  AM.ago = s => { if (!s) return ''; const [d, t = '12:00'] = String(s).split(' '); const mins = Math.round((Date.now() - new Date(`${d}T${t}:00`)) / 6e4); if (mins < 1) return 'just now'; if (mins < 60) return `${mins} min ago`; if (mins < 1440) return `${Math.round(mins / 60)} h ago`; const days = Math.round(mins / 1440); return days < 31 ? `${days} d ago` : Q.fmt(d); };

  /* Who is acting. In the product this is the signed-in user; the mock lets a reviewer switch role
   * so every step (auditor, area owner, reviewer, approver) can be demonstrated. */
  AM.actors = () => {
    const S = Q.S, out = new Map(), add = (id, r) => { if (S.people[id] && S.users.some(u => u.id === id && u.status !== 'Deactivated') && !out.has(id)) out.set(id, r); };
    add(Q.me(), 'QMS Manager · Lead Auditor');
    (S.auditors || []).forEach(x => add(x.who, x.level === 'Observer' ? 'Approver · Observer' : x.level));
    Q.topProcesses().forEach(p => add(p.owner, `Area owner · ${p.name}`));
    add('jun', 'Viewer');
    return [...out.entries()];
  };
  AM.actor = () => (Q.UI.auditActor && AM.actors().some(([id]) => id === Q.UI.auditActor) ? Q.UI.auditActor : Q.me());
  const userRole = id => Q.S.users.find(u => u.id === id)?.role || '';
  AM.isQM = (who = AM.actor()) => ['QMS Manager', 'Administrator'].includes(userRole(who));
  AM.isLead = (a, who = AM.actor()) => a.auditor === who;
  AM.isAuditorOf = (a, pid, who = AM.actor()) => AM.area(a, pid)?.auditor === who || a.team.some(t => t.who === who && ['Lead Auditor', 'Auditor'].includes(t.role) && (!t.areas.length || t.areas.includes(pid)));
  AM.onTeam = (a, who = AM.actor()) => a.team.some(t => t.who === who);
  AM.can = (what, a, x) => {
    const who = AM.actor(), qm = AM.isQM(who), lead = a && AM.isLead(a, who);
    switch (what) {
      case 'create': case 'configure': return qm;
      case 'plan': return qm || lead; // edit plan, reschedule, team, clauses
      case 'assess': return a.status === 'In Progress' && (AM.isAuditorOf(a, x, who) || lead) && AM.area(a, x)?.status !== 'Submitted';
      case 'prepare': return ['Scheduled', 'Checklist Ready', 'In Progress'].includes(a.status) && (qm || lead || AM.isAuditorOf(a, x, who));
      case 'submitArea': return (AM.area(a, x)?.auditor === who || lead) && a.status === 'In Progress';
      case 'report': return qm || lead;
      case 'review': return a.report.reviewer === who;
      case 'approve': return a.report.approver === who;
      default: return false;
    }
  };
  AM.ncCan = (what, f) => {
    const who = AM.actor(), a = AM.audit(f.audit), auditor = f.auditor === who || (a && (AM.isLead(a, who) || AM.isAuditorOf(a, f.process, who))), owner = f.nc.owner === who || f.nc.ca?.owner === who;
    switch (what) {
      case 'comment': return userRole(who) !== 'Viewer';
      case 'respond': return owner || AM.isQM(who);
      case 'verify': return (auditor || AM.isQM(who)) && !owner;
      case 'manage': return auditor || AM.isQM(who);
      default: return false;
    }
  };

  /* ====================================================================== activity */
  AM.log = (a, text, who = AM.actor()) => { (a.activity = a.activity || []).unshift({ at: AM.now(), who, text }); };
  AM.ncLog = (f, text, who = AM.actor()) => { f.nc.events.push({ at: AM.now(), who, text }); f.nc.last = AM.now(); };

  /* ====================================================================== evidence */
  // The revision that was current on a date: historical audit evidence keeps the revision reviewed.
  AM.revAt = (docId, date) => {
    const d = Q.doc(docId); if (!d) return '';
    const pub = (Q.S.revisions[docId] || []).filter(r => r.published && r.published <= date).sort((x, y) => x.published < y.published ? 1 : -1)[0];
    return pub?.rev || d.rev || d.workingRev || '';
  };
  AM.systemEvidence = (pid, clause) => {
    const out = [], seen = new Set(), push = x => { if (!seen.has(x.kind + x.id)) { seen.add(x.kind + x.id); out.push(x); } };
    const docOk = d => d && !['Obsolete', 'Superseded'].includes(d.status);
    // Documents of this area that support the clause, then the documents that control it anywhere (e.g. 7.5 → Control of Documents).
    Q.S.documents.filter(d => docOk(d) && Q.inProc(d.process, pid) && Q.docIso(d).some(c => fam(c, clause))).forEach(d => push({ kind: 'doc', id: d.id }));
    Q.S.iso.filter(r => fam(r.clause, clause)).forEach(r => {
      r.controls.map(Q.doc).filter(docOk).filter(d => r.processes.some(p => Q.inProc(pid, p) || Q.inProc(p, pid)) || Q.inProc(d.process, pid) || ['7.5', '9.2', '10.2'].some(c => fam(c, clause))).forEach(d => push({ kind: 'doc', id: d.id }));
      (r.evidence || []).forEach(e => { const ev = Q.S.evidence.find(x => x.id === e); if (ev && Q.inProc(ev.process, pid)) push({ kind: 'evidence', id: ev.id }); });
    });
    Q.S.evidence.filter(e => Q.inProc(e.process, pid) && e.iso && fam(e.iso, clause)).forEach(e => push({ kind: 'evidence', id: e.id }));
    // Nothing mapped to this clause: the area's own procedures, registers and records are still the evidence an auditor reviews.
    if (!out.length) Q.S.documents.filter(d => docOk(d) && Q.inProc(d.process, pid) && ['Procedure', 'Register', 'Form', 'Record', 'Work Instruction', 'Checklist'].includes(d.type)).slice(0, 3).forEach(d => push({ kind: 'doc', id: d.id, area: true }));
    return out.slice(0, 8);
  };
  AM.evInfo = x => {
    if (x.kind === 'doc') { const d = Q.doc(x.id); return d ? { title: d.title, rev: d.rev || d.workingRev || '—', status: d.status, sub: `${d.id} · Rev ${d.rev || d.workingRev || '—'}`, restricted: Q.docRestricted(d) } : { title: x.id, rev: '', status: 'Not found', sub: x.id }; }
    if (x.kind === 'evidence') { const e = Q.S.evidence.find(v => v.id === x.id); return e ? { title: e.name, rev: 'Current', status: e.status, sub: `${e.id} · ${e.source.system}` } : { title: x.id, rev: '', status: 'Not found', sub: x.id }; }
    return { title: x.title || x.ref, rev: '', status: 'External', sub: x.note || 'External reference' };
  };
  AM.snap = (x, by, date) => { const i = AM.evInfo(x); return { kind: x.kind, id: x.id, title: i.title, rev: x.kind === 'doc' ? AM.revAt(x.id, date) || i.rev : 'Current', status: i.status, by, date }; };
  // A snapshot line: what was reviewed, and whether the live document has moved on since.
  AM.snapLine = s => {
    const d = s.kind === 'doc' ? Q.doc(s.id) : null, moved = d && s.rev && d.rev && s.rev !== d.rev;
    const open = s.kind === 'doc' ? `<button class="link-btn" type="button" data-action="open-doc" data-id="${esc(s.id)}">${esc(s.title)}</button>` : s.kind === 'evidence' ? `<a href="#/evidence?focus=${esc(s.id)}">${esc(s.title)}</a>` : esc(s.title);
    return `<span class="snap">${icon(s.kind === 'doc' ? 'file-text' : s.kind === 'evidence' ? 'paperclip' : 'link')}<span>${open} <span class="muted tnum">${s.kind === 'doc' ? `Rev ${esc(s.rev)}` : esc(s.rev || '')}${s.status ? ` · ${esc(s.status)}` : ''}</span>${moved ? ` <span class="snap-moved" title="The document has been revised since this audit. The audit keeps the revision that was reviewed.">now Rev ${esc(d.rev)}</span>` : ''}<span class="snap-by">Reviewed by ${esc(Q.pname(s.by))} · ${Q.fmt(s.date)}</span></span></span>`;
  };

  /* ====================================================================== checklist */
  let seq = 0;
  const itemId = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;
  AM.buildChecklist = (a, pid) => {
    const ar = AM.area(a, pid), out = [];
    AM.clausesOf(a, ar).forEach(cl => AM.questionsFor(cl).forEach(qn => out.push({ id: itemId(), area: pid, clause: cl, sub: qn.sub, question: qn.q, expected: qn.ev.slice(), docs: [], notes: '', result: null, reviewed: [], external: [], finding: null, by: null, date: null })));
    return out;
  };
  AM.prepareChecklist = a => { a.checklist = a.areas.flatMap(ar => AM.buildChecklist(a, ar.process)); };

  /* ====================================================================== corrective action sync
   * An NC's corrective action is also a record in the Corrective Action register (Q.S.actions). */
  const CA_STAGE = { Open: 'Root cause', 'Action Assigned': 'Root cause', 'In Progress': 'Action', 'Verification Required': 'Action', Verified: 'Effectiveness', Closed: 'Closed' };
  AM.syncCA = f => {
    if (!f.nc) return;
    const n = f.nc, stage = CA_STAGE[n.status];
    let ca = f.action && Q.S.actions.find(x => x.id === f.action);
    if (!ca && n.status === 'Open') return; // nothing to track until someone is assigned
    if (!ca) {
      const yr = Q.today().slice(0, 4), max = Math.max(0, ...Q.S.actions.filter(x => x.id.startsWith(`CA-${yr}-`)).map(x => +x.id.split('-')[2]));
      ca = { id: `CA-${yr}-${String(max + 1).padStart(2, '0')}`, process: f.process, source: f.id, owner: n.owner, due: n.due };
      Q.S.actions.push(ca); f.action = ca.id;
    }
    Object.assign(ca, { title: n.ca?.action || `Corrective action for ${n.no}: ${f.title}`, rootCause: n.ca?.rootCause || 'Under investigation', owner: n.ca?.owner || n.owner, due: n.ca?.due || n.due, stage,
      status: { 'Root cause': 'In progress', Action: n.status === 'Verification Required' ? 'Awaiting verification' : 'In progress', Effectiveness: 'Awaiting effectiveness review', Closed: 'Closed — effective' }[stage] });
  };
  AM.setNcStatus = (f, status) => { f.nc.status = status; f.status = status; AM.syncCA(f); };

  /* ====================================================================== init / migration */
  AM.init = () => {
    const S = Q.S;
    if (S.auditModel !== 1) {
      // Data saved by an earlier build has the simpler audit shape: bring in the Update 14 sample (dates moved to today).
      if (!S.audits[0]?.team) {
        const take = k => Q.shifted(SEED[k]);
        S.audits = take('audits'); S.findings = take('findings');
        S.processes.forEach(p => { const s = SEED.processes.find(x => x.process_id === p.process_id); if (s) p.iso = s.iso.slice(); });
        ['CA-2026-04', 'CA-2026-10'].forEach(id => { const s = SEED.actions.find(x => x.id === id), t = S.actions.find(x => x.id === id); if (s && t) Object.assign(t, { stage: s.stage, status: s.status }); });
      }
      S.auditors = S.auditors || Q.shifted(SEED.auditors);
      S.auditProgrammes = S.auditProgrammes || Q.shifted(SEED.auditProgrammes);
      S.audits.forEach(a => seedAudit(a));
      S.findings.forEach(f => { if (f.nc) f.nc.last = f.nc.last || [...f.nc.events, ...f.nc.comments].map(x => x.at).sort().pop(); });
      S.auditModel = 1; Q.save();
    }
  };
  // Demo state: generate the checklist from each area's clauses, then fill it as far as the audit has progressed.
  function seedAudit(a) {
    a.activity = a.activity || [];
    a.report = a.report || { status: 'Not started', rev: null };
    a.report.history = a.report.history || [];
    a.report.revisions = a.report.revisions || [];
    if (!a.checklist && !['Planned', 'Scheduled'].includes(a.status)) {
      AM.prepareChecklist(a);
      const prog = SEED.auditDemo?.[a.id] || {};
      a.areas.forEach(ar => {
        const items = AM.items(a, ar.process), n = Math.round(items.length * (prog[ar.process] || 0));
        const fs = AM.findingsOf(a.id).filter(f => f.process === ar.process);
        items.slice(0, n).forEach((it, i) => {
          const f = fs.find(x => fam(x.clause, it.sub) && !items.some(o => o.finding === x.id));
          const date = Q.addDays(a.date, Math.min(i % 3, Q.days(a.date, a.endDate || a.date)));
          Object.assign(it, { result: f ? f.type : 'Conforming', finding: f?.id || null, by: ar.auditor, date,
            reviewed: AM.systemEvidence(ar.process, it.sub).slice(0, 3).map(x => AM.snap(x, ar.auditor, date)),
            notes: f ? f.statement : ['Sampled records were complete, current and approved.', 'Interviewed the process owner; practice matches the procedure.', 'Records sampled for the last quarter; no gaps found.'][i % 3] });
          if (f) f.checklistItem = it.id;
        });
        // Findings raised outside the generated questions still need a checklist line.
        fs.filter(f => !items.some(o => o.finding === f.id)).forEach(f => a.checklist.push({ id: itemId(), area: ar.process, clause: f.clause, sub: f.clause, question: `Specific check: ${f.title}`, expected: [], docs: [], notes: f.statement, result: f.type, reviewed: f.evidence || [], external: [], finding: f.id, by: f.auditor, date: f.raised }));
      });
    }
    if (!a.activity.length) {
      const L = (date, who, text, t = '09:00') => date && a.activity.push({ at: `${date} ${t}`, who, text });
      const created = a.date ? Q.addDays(a.date, -60) : (Q.S.auditProgrammes.find(p => p.id === a.programme)?.approved || Q.addDays(Q.today(), -30));
      L(created, 'maria', 'created the audit plan');
      L(created, 'maria', `assigned the audit team: ${a.team.map(t => `${Q.pname(t.who)} (${t.role})`).join(', ')}`, '09:05');
      if (a.date) L(Q.addDays(a.date, -45), a.auditor, `scheduled the audit for ${Q.fmt(a.date)}`);
      if (a.checklist) L(Q.addDays(a.date, -10), a.auditor, `prepared the checklist (${a.checklist.length} questions from ${AM.allClauses(a).length} clauses)`);
      if (['In Progress', 'Reporting', 'Published', 'Follow-up', 'Closed'].includes(a.status)) L(a.date, a.auditor, 'held the opening meeting and started the audit', a.opening || '08:30');
      AM.findingsOf(a.id).forEach(f => L(f.raised, f.auditor, `raised ${f.id}${f.nc ? ` / ${f.nc.no}` : ''} (${AM.short(f.type)}, clause ${f.clause})`, '14:00'));
      a.areas.filter(ar => ar.submitted).forEach(ar => L(ar.submitted.date, ar.submitted.by, `submitted the ${Q.proc(ar.process)?.name} area results`, '17:00'));
      const r = a.report;
      if (['Draft', 'For Review', 'Approved', 'Published'].includes(r.status)) { const d = Q.addDays(a.endDate || a.date, 2); L(d, a.auditor, 'compiled the audit report (draft)', '10:00'); r.history.push({ at: `${d} 10:00`, who: a.auditor, text: 'Compiled draft Rev 0' }); r.compiled = d; }
      if (['For Review', 'Approved', 'Published'].includes(r.status)) { const d = r.submitted || Q.addDays(a.endDate || a.date, 4); L(d, a.auditor, `submitted the report for review to ${Q.pname(r.reviewer)}`, '11:00'); r.history.push({ at: `${d} 11:00`, who: a.auditor, text: `Submitted for review to ${Q.pname(r.reviewer)}` }); }
      if (r.status === 'Published') {
        const d = r.published; r.reviewed = { by: r.reviewer, date: Q.addDays(d, -2) }; r.approved = { by: r.approver, date: Q.addDays(d, -1) };
        L(r.reviewed.date, r.reviewer, 'completed the report review', '15:00'); L(r.approved.date, r.approver, 'approved the audit report', '16:00'); L(d, a.auditor, `published the audit report Rev ${r.rev}`, '09:30');
        r.history.push({ at: `${r.reviewed.date} 15:00`, who: r.reviewer, text: 'Review completed' }, { at: `${r.approved.date} 16:00`, who: r.approver, text: 'Approved' }, { at: `${d} 09:30`, who: a.auditor, text: `Published Rev ${r.rev}` });
      }
      if (a.status === 'Closed') L(a.closed, a.auditor, 'closed the audit — all nonconformities closed and effective', '16:30');
      a.activity.sort((x, y) => x.at < y.at ? 1 : -1);
    }
  }

  /* ====================================================================== module chrome */
  const SECTIONS = [['overview', 'Overview', '#/audits'], ['programme', 'Audit Programme', '#/audits/programme'], ['list', 'Audits', '#/audits/list'], ['nc', 'Nonconformities', '#/audits/nc'], ['reports', 'Reports', '#/audits/reports']];
  AM.tabs = (items, cur, label, cls = '') => `<div class="tabs ${cls}" role="tablist" aria-label="${esc(label)}">${items.map(([k, l, href, note]) => `<a role="tab" href="${href}" aria-selected="${k === cur}">${l}${note ? `<span class="tab-n">${note}</span>` : ''}</a>`).join('')}</div>`;
  AM.actorSwitch = () => `<label class="actor-switch" title="Demo only: in the product this is the signed-in user. Switch to see what each role can do."><span>${icon('user-round')}Viewing as</span><select class="select" data-actor>${AM.actors().map(([id, r]) => `<option value="${id}"${id === AM.actor() ? ' selected' : ''}>${esc(Q.pname(id))} — ${esc(r)}</option>`).join('')}</select></label>`;
  document.addEventListener('change', e => { const s = e.target.closest('[data-actor]'); if (!s) return; Q.UI.auditActor = s.value; Q.saveUI(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Viewing as ' + Q.pname(s.value), 'Actions on this page now follow that person’s role.'); });
  AM.chrome = (sec, { title, sub, actions = '', crumbs = null }) => Q.pageHead({ title, sub, crumbs, actions }) +
    `<div class="am-nav">${AM.tabs(SECTIONS.map(([k, l, h]) => [k, l, h, k === 'nc' ? AM.ncs().filter(AM.ncOpen).length || '' : '']), sec, 'Audit management')}${AM.actorSwitch()}</div>`;
  const createBtn = () => AM.can('create') ? `<button class="btn primary" type="button" data-action="am-create">${icon('plus')}Create Audit</button>` : '';
  const procDoc = `<button class="btn" type="button" data-action="open-doc" data-id="AUD-PRO-001">${icon('file-text')}Audit Procedure</button>`;

  Q.views.audits = (parts, q) => {
    AM.init();
    const sec = parts[0] || 'overview';
    if (sec === 'a' && parts[1]) return AM.workspace(parts[1], parts[2], q, parts[3]);
    if (sec === 'nc' && parts[1]) return AM.ncWorkspace(parts[1], parts[2], q);
    const fn = { overview, programme, list: auditList, nc: q2 => AM.ncRegister(q2), reports: q2 => AM.reportsList(q2) }[sec] || overview;
    return fn(q);
  };

  /* ====================================================================== overview */
  const strip = cells => `<div class="am-strip" role="list">${cells.map(([k, v, d, href, tone]) => `<a role="listitem" href="${href}"><span class="k">${esc(k)}</span><span class="v${v && tone ? ' ' + tone : ''}">${v}</span>${d ? `<span class="d">${d}</span>` : ''}</a>`).join('')}</div>`;
  const hbars = (rows, href) => { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<ul class="hbars">${rows.map(([l, n, sub, h]) => `<li><a href="${h || href}"><span class="hb-l">${l}</span><span class="hb-bar"><i style="width:${n / max * 100}%"></i></span><span class="hb-n tnum">${n}</span></a>${sub ? `<span class="hb-sub">${sub}</span>` : ''}</li>`).join('')}</ul>` : '<div class="empty small">No findings yet.</div>'; };
  AM.monthBars = (vals, labels, title) => {
    const W = 300, H = 120, max = Math.max(1, ...vals), bw = 22, step = (W - 30) / vals.length;
    return `<svg class="chart mini-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${labels.map((l, i) => `${l} ${vals[i]}`).join(', ')}">
      <line class="mc-base" x1="20" x2="${W - 6}" y1="${H - 22}" y2="${H - 22}"/>${vals.map((v, i) => { const x = 24 + i * step + (step - bw) / 2, h = v / max * (H - 40), y = H - 22 - h; return `${v ? `<path class="mc-bar" d="M${x} ${H - 22}V${y + 3}q0 -3 3 -3h${bw - 6}q3 0 3 3V${H - 22}Z"/>` : ''}<text class="mc-v" x="${x + bw / 2}" y="${y - 4}" text-anchor="middle">${v || ''}</text><text class="mc-l" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text><rect class="hit" x="${x - 6}" y="10" width="${bw + 12}" height="${H - 32}" data-tip="${esc(`${labels[i]}: ${v} nonconformit${v === 1 ? 'y' : 'ies'} raised`)}"/>`; }).join('')}</svg>`;
  };
  function overview() {
    const S = Q.S, A = S.audits, yr = Q.today().slice(0, 4), cur = A.filter(a => a.programme === `AP-${yr}`);
    const n = st => A.filter(a => st.includes(a.status)).length, over = A.filter(AM.overdue);
    const ncs = AM.ncs(), open = ncs.filter(AM.ncOpen), od = ncs.filter(AM.ncOverdue), ver = ncs.filter(f => f.nc.status === 'Verification Required');
    const audStrip = strip([
      ['Planned', n(['Planned']), 'not yet scheduled', '#/audits/list?s=planned'],
      ['Scheduled', n(['Scheduled', 'Checklist Ready']), `${n(['Checklist Ready'])} checklist ready`, '#/audits/list?s=scheduled'],
      ['In Progress', n(['In Progress']), 'fieldwork', '#/audits/list?s=progress', 'warn'],
      ['Reporting', n(['Reporting']), 'report in preparation', '#/audits/list?s=reporting'],
      ['Follow-up', n(['Published', 'Follow-up']), 'NCs still open', '#/audits/list?s=followup'],
      ['Completed', n(['Closed']), 'closed', '#/audits/list?s=closed'],
      ['Overdue', over.length, 'past planned date', '#/audits/list?s=overdue', 'bad']]);
    const ncStrip = strip([
      ['Nonconformities', ncs.length, 'all audits', '#/audits/nc?s=all'],
      ['Major', ncs.filter(f => f.nc.classification === 'Major').length, `${open.filter(f => f.nc.classification === 'Major').length} open`, '#/audits/nc?s=all&cls=Major', 'bad'],
      ['Minor', ncs.filter(f => f.nc.classification === 'Minor').length, `${open.filter(f => f.nc.classification === 'Minor').length} open`, '#/audits/nc?s=all&cls=Minor'],
      ['Open', open.length, 'not closed', '#/audits/nc'],
      ['Overdue', od.length, 'past due date', '#/audits/nc?s=overdue', 'bad'],
      ['Awaiting verification', ver.length, 'auditor to verify', '#/audits/nc?s=verify', 'warn']]);
    const upcoming = A.filter(a => a.date && a.date >= Q.today() && !['Closed'].includes(a.status)).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 5);
    const active = A.filter(a => ['In Progress', 'Reporting'].includes(a.status) || AM.overdue(a));
    const done = cur.filter(a => ['Published', 'Follow-up', 'Closed'].includes(a.status)).length;
    const attention = open.slice().sort((x, y) => (AM.ncOverdue(y) - AM.ncOverdue(x)) || (x.nc.due < y.nc.due ? -1 : 1)).slice(0, 6);
    const overCA = S.actions.filter(c => Q.actionOverdue(c) && Q.S.findings.some(f => f.action === c.id && f.nc && AM.ncOverdue(f)));
    // NC trend: raised per month, last 6 months
    const months = Array.from({ length: 6 }, (_, i) => Q.addDays(Q.today().slice(0, 8) + '15', -30 * (5 - i)).slice(0, 7));
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = months.map(m => ncs.filter(f => f.raised.startsWith(m)).length);
    const allF = S.findings.filter(f => f.audit && AM.audit(f.audit));
    const byArea = Object.entries(allF.filter(f => f.status !== 'Closed').reduce((o, f) => { const r = Q.rootId(f.process); (o[r] = o[r] || []).push(f); return o; }, {})).sort((a, b) => b[1].length - a[1].length).slice(0, 6)
      .map(([pid, list]) => [`<b class="tnum">${esc(Q.proc(pid)?.process_code)}</b> ${esc(Q.proc(pid)?.name)}`, list.length, `${list.filter(f => AM.isNcType(f.type)).length} NC · ${list.filter(f => !AM.isNcType(f.type)).length} other`, `#/audits/nc?s=all&area=${pid}`]);
    const byClause = Object.entries(allF.reduce((o, f) => { const c = f.clause.split('.').slice(0, 2).join('.'); (o[c] = o[c] || []).push(f); return o; }, {})).sort((a, b) => b[1].length - a[1].length).slice(0, 6)
      .map(([c, list]) => [`<b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}`, list.length, `${list.filter(f => AM.isNcType(f.type)).length} NC`, `#/audits/nc?s=all&clause=${c}`]);
    return { title: 'Audits', nav: 'audits', html: AM.chrome('overview', { title: 'Audits', sub: `Plan, conduct and follow up internal audits — ISO 9001 clause 9.2. Nonconformities and corrective actions — clause 10.2.`, actions: procDoc + createBtn() }) +
      `<h2 class="am-h">Audits</h2>${audStrip}<h2 class="am-h">Nonconformities</h2>${ncStrip}
      <div class="grid-halves section">
        <section class="panel"><div class="panel-head"><h2>Upcoming audits</h2><span class="muted small">${upcoming.length}</span><div class="actions"><a class="btn sm ghost" href="#/audits/programme?view=calendar">Calendar</a></div></div>
          ${upcoming.length ? `<ul class="worklist">${upcoming.map(a => `<li><div class="w-main"><div class="w-title">${esc(a.title)}</div><div class="w-meta">${esc(a.id)} · ${AM.dateRange(a)} · Lead Auditor: ${esc(Q.pname(a.auditor))} · ${a.areas.length} area${a.areas.length === 1 ? '' : 's'}</div></div>${AM.badge(a)}<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a></li>`).join('')}</ul>` : '<div class="empty small">No audits scheduled.</div>'}</section>
        <section class="panel"><div class="panel-head"><h2>${esc(yr)} programme progress</h2><span class="muted small">${done} of ${cur.length} audits reported</span><div class="actions"><a class="btn sm ghost" href="#/audits/programme">Programme</a></div></div>
          <div class="panel-pad"><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${cur.length}" aria-valuenow="${done}" aria-label="Programme completion"><span style="width:${cur.length ? done / cur.length * 100 : 0}%"></span></div>
          ${active.map(a => `<div class="am-active"><div class="am-active-h"><a href="#/audits/a/${a.id}"><b>${esc(a.id)}</b> ${esc(a.title)}</a>${AM.badge(a)}</div>${a.status === 'In Progress' || a.status === 'Reporting' ? a.areas.map(ar => `<div class="am-arow"><span>${esc(Q.proc(ar.process)?.name)}</span>${Q.miniProgress(AM.progress(a, ar.process))}<span class="small ${ar.status === 'Submitted' ? 'ok' : 'muted'}">${esc(ar.status)}</span></div>`).join('') : `<p class="small muted">Planned for ${Q.fmt(a.date)} — not started.</p>`}</div>`).join('')}</div></section>
      </div>
      <div class="grid-halves section">
        <section class="panel"><div class="panel-head"><h2>Open findings needing attention</h2><span class="muted small">${open.length} open NCs</span><div class="actions"><a class="btn sm ghost" href="#/audits/nc?view=areas">By area</a></div></div>
          ${attention.length ? `<ul class="worklist">${attention.map(f => `<li><div class="w-main"><div class="w-title"><span class="tnum">${esc(f.nc.no)}</span> · ${esc(f.title)}</div><div class="w-meta">${esc(Q.proc(f.process)?.name)} · clause ${esc(f.clause)} · owner ${esc(Q.pname(f.nc.owner))} · due ${Q.dueDate(f.nc.due, ['Verification Required', 'Verified'].includes(f.nc.status))}</div>${AM.ncBadges(f)}</div><a class="btn sm" href="#/audits/nc/${f.nc.no}">Open NC</a></li>`).join('')}</ul>` : '<div class="empty small">No open nonconformities.</div>'}</section>
        <section class="panel"><div class="panel-head"><h2>Overdue corrective actions</h2><span class="muted small">${overCA.length}</span><div class="actions"><a class="btn sm ghost" href="#/capa?status=overdue">Corrective Action</a></div></div>
          ${overCA.length ? `<ul class="worklist">${overCA.map(c => { const f = Q.S.findings.find(x => x.action === c.id); return `<li><div class="w-main"><div class="w-title">${esc(c.id)} · ${esc(c.title)}</div><div class="w-meta">${esc(f.nc.no)} · ${esc(Q.pname(c.owner))} · due ${Q.dueDate(c.due)}</div></div><a class="btn sm" href="#/audits/nc/${f.nc.no}/action">Open NC</a></li>`; }).join('')}</ul>` : '<div class="empty small">No overdue corrective actions.</div>'}</section>
      </div>
      <div class="am-charts section">
        <section class="panel"><div class="panel-head"><h2>NC trend</h2><span class="muted small">raised per month</span></div><div class="panel-pad">${AM.monthBars(trend, months.map(m => MON[+m.slice(5, 7) - 1]), 'Nonconformities raised per month')}</div></section>
        <section class="panel"><div class="panel-head"><h2>Open findings by area</h2></div><div class="panel-pad">${hbars(byArea, '#/audits/nc')}</div></section>
        <section class="panel"><div class="panel-head"><h2>Findings by ISO clause</h2><span class="muted small">all audits</span></div><div class="panel-pad">${hbars(byClause, '#/audits/nc')}</div></section>
      </div>` };
  }

  /* ====================================================================== programme */
  function programme(q) {
    const S = Q.S, view = ['calendar', 'matrix', 'coverage'].includes(q.view) ? q.view : 'table';
    const yr = Q.today().slice(0, 4), pid = S.auditProgrammes.some(p => p.id === q.p) ? q.p : (S.auditProgrammes.find(p => p.id === `AP-${yr}`)?.id || S.auditProgrammes[0].id);
    const prog = S.auditProgrammes.find(p => p.id === pid), list = () => S.audits.filter(a => a.programme === pid);
    const vt = [['table', 'Programme', `#/audits/programme?p=${pid}`], ['calendar', 'Calendar', `#/audits/programme?p=${pid}&view=calendar`], ['matrix', 'Area–Clause Matrix', `#/audits/programme?p=${pid}&view=matrix`], ['coverage', 'Process coverage', `#/audits/programme?p=${pid}&view=coverage`]];
    const head = `<div class="am-prog-head"><div class="seg" role="group" aria-label="Programme">${S.auditProgrammes.map(p => `<a class="seg-a" href="#/audits/programme?p=${p.id}${view !== 'table' ? '&view=' + view : ''}" aria-current="${p.id === pid}">${esc(String(p.year))}</a>`).join('')}</div>
      <div class="am-prog-meta"><b>${esc(prog.title)}</b> ${Q.st(prog.status, prog.status === 'Approved' ? 'success' : 'neutral')}<span class="small muted">${prog.approvedBy ? `Approved by ${esc(Q.pname(prog.approvedBy))} · ${Q.fmt(prog.approved)}` : 'Not yet approved'} · ${list().length} audits${prog.doc ? ` · <button class="link-btn" type="button" data-action="open-doc" data-id="${prog.doc}">${esc(prog.doc)}</button>` : ''}</span></div>
      ${prog.status !== 'Approved' && (AM.isQM() || AM.actor() === 'eric') ? `<button class="btn sm" type="button" data-action="am-approve-prog" data-id="${prog.id}">${icon('stamp')}${AM.actor() === 'eric' ? 'Approve Programme' : 'Submit for Approval'}</button>` : ''}</div>`;
    let body;
    if (view === 'calendar') body = calendar(list(), q);
    else if (view === 'matrix') body = matrix(q);
    else if (view === 'coverage') body = coverage();
    else body = Q.table({ id: 'am-prog-' + pid, rows: list, noun: 'audits', caption: prog.title, search: a => `${a.id} ${a.title} ${a.areas.map(x => Q.proc(x.process)?.name).join(' ')} ${Q.pname(a.auditor)}`,
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search audits, areas, auditors" aria-label="Search programme"></div>
        <select class="select" data-filter="status" aria-label="Audit status"><option value="all">All statuses</option>${AM.STATUSES.map(s => `<option>${s}</option>`).join('')}<option>Overdue</option></select>`,
      filters: { status: (a, v) => v === 'Overdue' ? AM.overdue(a) : a.status === v },
      columns: [
        { key: 'area', label: 'Area / Process', sort: a => Q.proc(a.areas[0]?.process)?.process_code, render: a => `<a class="title" href="#/audits/a/${a.id}">${esc(a.title)}</a><span class="sub tnum">${esc(a.id)} · ${a.areas.map(x => esc(Q.proc(x.process)?.process_code)).join(', ')}</span>` },
        { key: 'type', label: 'Audit Type', sort: a => a.type, render: a => `<span class="nowrap">${esc(a.type)}</span>` },
        { key: 'period', label: 'Planned Period', sort: a => a.plannedPeriod, render: a => `<span class="nowrap">${esc(a.plannedPeriod || '—')}</span>` },
        { key: 'date', label: 'Scheduled Date', cls: 'c-date', sort: a => a.date || '9', render: a => a.date ? `${Q.fmt(a.date)}${a.endDate && a.endDate !== a.date ? `<span class="sub">to ${Q.fmt(a.endDate)}</span>` : ''}` : '<span class="muted">Not scheduled</span>' },
        { key: 'lead', label: 'Lead Auditor', sort: a => Q.pname(a.auditor), render: a => `<span class="nowrap">${esc(Q.pname(a.auditor))}</span>` },
        { key: 'team', label: 'Audit Team', render: a => `<span class="av-row">${a.team.filter(t => t.role !== 'Lead Auditor').map(t => `<span class="avatar sm" title="${esc(Q.pname(t.who))} — ${esc(t.role)}">${esc(Q.initials(t.who))}</span>`).join('') || '<span class="muted small">—</span>'}</span>` },
        { key: 'cl', label: 'Applicable Clauses', render: a => { const c = AM.allClauses(a); return `<span class="small tnum" title="${esc(c.join(', '))}">${esc(c.slice(0, 4).join(', '))}${c.length > 4 ? ` +${c.length - 4}` : ''}</span>`; } },
        { key: 'prep', label: 'Preparation', render: a => AM.prepStatus(a) },
        { key: 'status', label: 'Audit Status', sort: a => AM.STATUSES.indexOf(a.status), render: a => AM.badge(a) },
        { key: 'f', label: 'Findings', cls: 'c-num', sort: a => AM.findingsOf(a.id).length, render: a => { const f = AM.findingsOf(a.id), nc = f.filter(x => x.nc); return f.length ? `${f.length}${nc.length ? `<span class="sub">${nc.length} NC</span>` : ''}` : '<span class="zero">—</span>'; } },
        { key: 'act', label: 'Actions', cls: 'c-actions', render: a => `<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a>${AM.can('plan', a) ? Q.menu(`More actions for ${a.id}`, [{ label: 'Edit Plan', icon: 'pencil', data: { action: 'am-edit-plan', id: a.id } }, { label: a.date ? 'Reschedule' : 'Schedule', icon: 'calendar', data: { action: 'am-schedule', id: a.id } }, { label: 'Assign Auditor', icon: 'user-plus', data: { action: 'am-team', id: a.id } }]) : ''}` }] });
    return { title: 'Audit Programme · Audits', nav: 'audits', html: AM.chrome('programme', { title: 'Audit Programme', crumbs: [['Audits', '#/audits'], ['Audit Programme']], sub: 'Annual programme of internal audits — what is audited, when, by whom and against which clauses (ISO 9001 9.2.2).', actions: procDoc + createBtn() }) + head + AM.tabs(vt, view, 'Programme view', 'tabs-sub') + body };
  }
  AM.prepStatus = a => {
    if (a.status === 'Planned') return Q.st('Not scheduled', 'neutral');
    if (a.team.some(t => t.independent === null || t.independent === false)) return Q.st('Confirm independence', 'warning');
    if (a.areas.some(ar => !ar.auditor)) return Q.st('Assign auditor', 'warning');
    if (!a.checklist) return Q.st('To prepare', 'neutral');
    return `${Q.st('Ready', 'success')}<span class="sub">${a.checklist.length} questions</span>`;
  };
  Q.actions['am-approve-prog'] = d => {
    const p = Q.S.auditProgrammes.find(x => x.id === d.id);
    if (AM.actor() !== 'eric') { Q.toast('Sent for approval', `${p.title} → ${Q.pname('eric')}. Switch “Viewing as” to Eric Navarro to approve it.`); return; }
    Object.assign(p, { status: 'Approved', approvedBy: 'eric', approved: Q.today() }); Q.save(); Q.audit?.('Audits', `approved ${p.title}`); Q.render({ noFocus: true }); Q.toast('Programme approved', p.title);
  };

  function calendar(list, q) {
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const scheduled = list.filter(a => a.date).sort((a, b) => a.date < b.date ? -1 : 1);
    const m = /^\d{4}-\d{2}$/.test(q.m || '') ? q.m : (scheduled.find(a => a.date.slice(0, 7) >= Q.today().slice(0, 7))?.date || scheduled[0]?.date || Q.today()).slice(0, 7);
    const [y, mo] = m.split('-').map(Number), first = new Date(Date.UTC(y, mo - 1, 1)), startDow = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const prev = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`, next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
    const pp = q.p ? `p=${q.p}&` : '';
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push('<div class="cal-d empty" aria-hidden="true"></div>');
    for (let d = 1; d <= days; d++) {
      const iso = `${m}-${String(d).padStart(2, '0')}`, ev = Q.S.audits.filter(a => a.date && a.date <= iso && (a.endDate || a.date) >= iso);
      cells.push(`<div class="cal-d${iso === Q.today() ? ' today' : ''}"><span class="cal-n">${d}</span>${ev.map(a => `<a class="cal-ev st-${esc(a.status.replace(/\s/g, '-').toLowerCase())}${AM.overdue(a) ? ' od' : ''}" href="#/audits/a/${a.id}" title="${esc(`${a.id} ${a.title} · ${a.start || ''}–${a.end || ''} · ${a.location || ''} · opening ${a.opening || '—'}, closing ${a.closing || '—'}`)}">${esc(a.title)}</a>`).join('')}</div>`);
    }
    const unscheduled = list.filter(a => !a.date);
    return `<div class="cal-wrap"><section class="panel"><div class="panel-head"><a class="btn sm" href="#/audits/programme?${pp}view=calendar&m=${prev}" aria-label="Previous month">${icon('chevron-right', 'flip-x')}</a><h2>${MON[mo - 1]} ${y}</h2><a class="btn sm" href="#/audits/programme?${pp}view=calendar&m=${next}" aria-label="Next month">${icon('chevron-right')}</a><div class="actions small muted cal-hint">Hover an audit for times, location and meetings</div></div>
      <div class="cal" role="grid" aria-label="Audit calendar ${MON[mo - 1]} ${y}">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="cal-h">${x}</div>`).join('')}${cells.join('')}</div></section>
      <aside class="panel"><div class="panel-head"><h3>Schedule</h3><span class="muted small">this programme</span></div><ul class="worklist cal-list">${scheduled.map(a => `<li><div class="w-main"><div class="w-title">${esc(a.title)}</div><div class="w-meta">${AM.dateRange(a)} · ${esc(a.start || '')}${a.end ? '–' + esc(a.end) : ''} · ${esc(Q.pname(a.auditor))}</div></div>${AM.badge(a)}</li>`).join('') || '<li class="muted small">Nothing scheduled.</li>'}</ul>
        ${unscheduled.length ? `<div class="panel-head" style="border-top:1px solid var(--border)"><h3>Not yet scheduled</h3></div><ul class="worklist cal-list">${unscheduled.map(a => `<li><div class="w-main"><div class="w-title">${esc(a.title)}</div><div class="w-meta">${esc(a.plannedPeriod)} · ${esc(Q.pname(a.auditor))}</div></div>${AM.can('plan', a) ? `<button class="btn sm" type="button" data-action="am-schedule" data-id="${a.id}">Schedule</button>` : ''}</li>`).join('')}</ul>` : ''}</aside></div>`;
  }

  /* Area–Clause Matrix: rows are areas (top-level processes), columns the clauses any area maps to. */
  let mxEdit = null;
  function matrix(q) {
    const procs = Q.topProcesses(), cols = [...new Set([...procs.flatMap(p => p.iso), ...(q.addc ? [q.addc] : [])])].sort(AM.clSort);
    const map = mxEdit || Object.fromEntries(procs.map(p => [p.process_id, p.iso.slice()]));
    const groups = [...new Set(cols.map(c => c.split('.')[0]))];
    const selA = q.area || '', selC = q.clause || '';
    const canEdit = AM.can('configure');
    const answer = selA ? `<b>${esc(Q.proc(selA)?.name)}</b>: ${map[selA].slice().sort(AM.clSort).map(c => `<span class="clause">${esc(c)}</span>`).join(', ') || 'no clauses mapped'}` : selC ? `<b>Clause ${esc(selC)}</b> ${esc(AM.clTitle(selC))}: ${procs.filter(p => map[p.process_id].some(c => fam(c, selC))).map(p => esc(p.process_code + ' ' + p.name)).join(', ') || 'no area responsible'}` : 'Choose an area to see its clauses, or a clause to see which areas are responsible for it.';
    return `<div class="mx-tools"><label class="field"><span>What clauses apply to this area?</span><select class="select" data-mx="area"><option value="">Choose an area…</option>${procs.map(p => `<option value="${p.process_id}"${p.process_id === selA ? ' selected' : ''}>${esc(p.process_code + ' ' + p.name)}</option>`).join('')}</select></label>
        <label class="field"><span>What areas are responsible for this clause?</span><select class="select" data-mx="clause"><option value="">Choose a clause…</option>${Object.keys(AM.CL).sort(AM.clSort).map(c => `<option value="${c}"${c === selC ? ' selected' : ''}>${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label>
        <div class="mx-actions">${canEdit ? (mxEdit ? `<button class="btn" type="button" data-mx-cancel>Cancel</button><button class="btn primary" type="button" data-mx-save>Save Mapping</button>` : `<button class="btn" type="button" data-mx-edit>${icon('pencil')}Edit Mapping</button>`) : '<span class="small muted">Only the QMS Manager can change the mapping.</span>'}</div></div>
      <p class="mx-answer" role="status">${answer}</p>
      ${mxEdit ? `<div class="callout small" style="margin-bottom:12px">${icon('info')}<span>Tick the clauses each area is responsible for. These are the defaults suggested when an audit of that area is created; each audit can still add or remove clauses. The same list appears as “ISO 9001 clauses” in Settings → Process Structure.</span></div>` : ''}
      <section class="panel"><div class="table-scroll mx-scroll"><table class="dt mx"><caption class="sr-only">Area–clause matrix</caption>
        <thead><tr><th class="c-sticky" rowspan="2" scope="col">Area / Process</th>${groups.map(g => `<th class="mx-g" colspan="${cols.filter(c => c.split('.')[0] === g).length}" scope="colgroup">${esc(g)} ${esc(Q.clauseTitle(g))}</th>`).join('')}<th rowspan="2" class="c-num" scope="col">Clauses</th></tr>
        <tr>${cols.map(c => `<th class="mx-c${selC && fam(c, selC) ? ' hl' : ''}" scope="col" title="${esc(c + ' ' + AM.clTitle(c))}"><button type="button" class="link-btn" data-mx-col="${c}">${esc(c)}</button></th>`).join('')}</tr></thead>
        <tbody>${procs.map(p => `<tr class="${selA === p.process_id ? 'hl' : ''}"><th class="c-sticky" scope="row"><button type="button" class="link-btn mx-row" data-mx-row="${p.process_id}"><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</button></th>${cols.map(c => { const on = map[p.process_id].includes(c); return `<td class="mx-cell${selC && fam(c, selC) ? ' hl' : ''}">${mxEdit ? `<input type="checkbox" class="row-check" data-mxp="${p.process_id}" data-mxc="${c}" ${on ? 'checked' : ''} aria-label="${esc(p.name)} — clause ${c}">` : on ? `<span class="mx-on" aria-label="mapped">✓</span>` : ''}</td>`; }).join('')}<td class="c-num tnum">${map[p.process_id].length}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th class="c-sticky" scope="row">Areas per clause</th>${cols.map(c => { const n = procs.filter(p => map[p.process_id].includes(c)).length; return `<td class="c-num tnum${n ? '' : ' mx-gap'}">${n}</td>`; }).join('')}<td></td></tr></tfoot></table></div></section>
      ${mxEdit ? `<div class="mx-add"><label class="field"><span>Add a clause column</span><select class="select" data-mx-addc><option value="">Choose a clause…</option>${Object.keys(AM.CL).filter(c => !cols.includes(c)).sort(AM.clSort).map(c => `<option value="${c}">${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label></div>` : ''}`;
  }
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-mx]'); if (s) { const { q } = Q.route(); const p = new URLSearchParams({ ...q, view: 'matrix' }); p.delete('area'); p.delete('clause'); if (s.value) p.set(s.dataset.mx, s.value); location.hash = '#/audits/programme?' + p; return; }
    const c = e.target.closest('[data-mxp]'); if (c && mxEdit) { const l = mxEdit[c.dataset.mxp]; c.checked ? l.push(c.dataset.mxc) : l.splice(l.indexOf(c.dataset.mxc), 1); return; }
    const add = e.target.closest('[data-mx-addc]'); if (add && add.value) { const { q } = Q.route(); location.hash = '#/audits/programme?' + new URLSearchParams({ ...q, view: 'matrix', addc: add.value }); }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-mx-edit]')) { mxEdit = Object.fromEntries(Q.topProcesses().map(p => [p.process_id, p.iso.slice()])); Q.render({ noFocus: true, keepScroll: true }); }
    else if (e.target.closest('[data-mx-cancel]')) { mxEdit = null; Q.render({ noFocus: true, keepScroll: true }); }
    else if (e.target.closest('[data-mx-save]')) {
      const changed = Q.topProcesses().filter(p => p.iso.slice().sort().join() !== mxEdit[p.process_id].slice().sort().join());
      changed.forEach(p => { p.iso = mxEdit[p.process_id].slice().sort(AM.clSort); });
      mxEdit = null; Q.save(); if (changed.length) Q.audit?.('Audits', `changed the area–clause mapping for ${changed.map(p => p.name).join(', ')}`); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Mapping saved', changed.length ? `${changed.length} area${changed.length === 1 ? '' : 's'} changed. New audits use the new defaults.` : 'No changes.');
    } else {
      const r = e.target.closest('[data-mx-row]'), c = e.target.closest('[data-mx-col]');
      if (r || c) { const { q } = Q.route(); const p = new URLSearchParams({ ...q, view: 'matrix' }); p.delete('area'); p.delete('clause'); p.set(r ? 'area' : 'clause', r ? r.dataset.mxRow : c.dataset.mxCol); location.hash = '#/audits/programme?' + p; }
    }
  });

  function coverage() {
    const S = Q.S;
    const rows = () => Q.topProcesses().map(p => { const au = S.audits.filter(a => a.areas.some(ar => ar.process === p.process_id)); const last = au.filter(a => ['Published', 'Follow-up', 'Closed', 'Reporting'].includes(a.status)).sort((a, b) => a.date < b.date ? 1 : -1)[0]; const plan = au.filter(a => !['Published', 'Follow-up', 'Closed', 'Reporting'].includes(a.status)).sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1)[0]; return { ...p, id: p.process_id, last, plan, f: S.findings.filter(f => Q.inProc(f.process, p.process_id) && f.status !== 'Closed').length }; });
    return `<p class="small muted" style="margin:0 0 12px">ISO 9001 9.2.2 — every process should be audited within the audit cycle, with frequency based on importance, changes and previous results.</p>` + Q.table({ id: 'am-cov', rows, noun: 'processes', caption: 'Audit coverage by process', columns: [
      { key: 'p', label: 'Process', sort: r => r.display_order, render: r => Q.pcell(r.id) },
      { key: 'o', label: 'Owner', render: r => esc(Q.pname(r.owner)) },
      { key: 'last', label: 'Last audited', cls: 'c-date', sort: r => r.last?.date || '', render: r => r.last ? `${Q.fmt(r.last.date)}<span class="sub">${esc(r.last.id)}</span>` : '<span class="muted">—</span>' },
      { key: 'plan', label: 'Next audit', cls: 'c-date', sort: r => r.plan?.date || '9', render: r => r.plan ? `${r.plan.date ? Q.fmt(r.plan.date) : esc(r.plan.plannedPeriod)}<span class="sub">${esc(r.plan.id)}</span>` : '<span class="muted">—</span>' },
      { key: 'f', label: 'Open findings', cls: 'c-num', sort: r => r.f, render: r => Q.num(r.f) },
      { key: 's', label: 'Coverage', sort: r => r.last ? 2 : r.plan ? 1 : 0, render: r => r.last ? Q.st('Audited', 'success') : r.plan ? Q.st('Planned', 'info') : Q.st('Not in programme', 'danger') },
      { key: 'a', label: 'Actions', cls: 'c-actions', render: r => r.last || r.plan ? `<a class="btn sm" href="#/audits/a/${(r.plan || r.last).id}">Open Audit</a>` : AM.can('create') ? `<button class="btn sm" type="button" data-action="am-create" data-area="${r.id}">${icon('plus')}Plan Audit</button>` : '' }] });
  }

  /* ====================================================================== audits list */
  function auditList(q) {
    const S = Q.S;
    const G = { planned: a => a.status === 'Planned', scheduled: a => ['Scheduled', 'Checklist Ready'].includes(a.status), progress: a => a.status === 'In Progress', reporting: a => a.status === 'Reporting', followup: a => ['Published', 'Follow-up'].includes(a.status), closed: a => a.status === 'Closed', overdue: AM.overdue };
    const segs = [['all', 'All', S.audits.length], ...[['planned', 'Planned'], ['scheduled', 'Scheduled'], ['progress', 'In progress'], ['reporting', 'Reporting'], ['followup', 'Follow-up'], ['closed', 'Closed'], ['overdue', 'Overdue']].map(([k, l]) => [k, l, S.audits.filter(G[k]).length])];
    const table = Q.table({ id: 'am-list', rows: () => S.audits.slice().sort((a, b) => (b.date || '9999') < (a.date || '9999') ? -1 : 1), noun: 'audits', caption: 'Audits', initialSeg: G[q.s] ? q.s : undefined, segs: G,
      search: a => `${a.id} ${a.title} ${a.type} ${Q.pname(a.auditor)} ${a.areas.map(x => Q.proc(x.process)?.name).join(' ')}`,
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search audits" aria-label="Search audits"></div>${Q.seg('Status', segs, G[q.s] ? q.s : 'all')}`,
      columns: [
        { key: 'id', label: 'Audit No.', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
        { key: 't', label: 'Audit', sort: a => a.title, render: a => `<a class="title" href="#/audits/a/${a.id}">${esc(a.title)}</a><span class="sub">${esc(a.type)} · ${esc(S.auditProgrammes.find(p => p.id === a.programme)?.title || '')}</span>` },
        { key: 'areas', label: 'Areas', render: a => `<span class="small">${a.areas.map(x => esc(Q.proc(x.process)?.name)).join(', ')}</span>` },
        { key: 'd', label: 'Dates', cls: 'c-date', sort: a => a.date || '9', render: a => AM.dateRange(a) },
        { key: 'l', label: 'Lead Auditor', sort: a => Q.pname(a.auditor), render: a => `<span class="nowrap">${esc(Q.pname(a.auditor))}</span>` },
        { key: 'p', label: 'Checklist', sort: a => AM.progress(a), render: a => a.checklist ? Q.miniProgress(AM.progress(a)) : '<span class="muted small">Not prepared</span>' },
        { key: 'f', label: 'Open NCs', cls: 'c-num', sort: a => AM.findingsOf(a.id).filter(AM.ncOpen).length, render: a => Q.num(AM.findingsOf(a.id).filter(AM.ncOpen).length) },
        { key: 'r', label: 'Report', render: a => Q.st(a.report.status, AM.REPORT_KIND[a.report.status]) },
        { key: 's', label: 'Status', sort: a => AM.STATUSES.indexOf(a.status), render: a => AM.badge(a) },
        { key: 'x', label: 'Actions', cls: 'c-actions', render: a => `<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a>` }] });
    return { title: 'Audits', nav: 'audits', html: AM.chrome('list', { title: 'Audits', crumbs: [['Audits', '#/audits'], ['All audits']], sub: 'Every audit across programmes. Open an audit for its plan, checklist, findings and report.', actions: createBtn() }) + table };
  }

  /* ====================================================================== create audit wizard */
  Q.actions['am-create'] = d => wizard({ areas: d.area ? [d.area] : [] });
  function wizard(init) {
    const S = Q.S, yr = Q.today().slice(0, 4);
    const W = { step: 0, title: '', type: 'Internal Audit', programme: S.auditProgrammes.find(p => p.id === `AP-${yr}`)?.id || S.auditProgrammes[0].id, areas: init.areas.slice(), objective: '', scope: '', criteria: 'ISO 9001:2026, the Helios QMS manual and procedures, customer and statutory requirements', description: '',
      clauses: {}, lead: AM.isQM() ? AM.actor() : 'maria', team: [], areaAuditor: {}, auditee: {}, plannedPeriod: '', date: '', endDate: '', start: '08:30', end: '16:30', location: '', remote: false, opening: '08:30', closing: '16:00' };
    const STEPS = ['Audit details', 'Areas & ISO clauses', 'Audit team', 'Schedule'];
    const auditorsList = () => S.auditors.map(x => x.who);
    const conflicts = (who, areas) => areas.filter(pid => { const p = Q.proc(pid); return p && (p.owner === who || Q.person(who).dept === p.department); });
    const m = Q.openModal({ size: 'l', title: 'Create Audit', sub: 'Four short steps. Everything can be changed later in the audit plan.', body: '<div class="modal-body wz-body"></div>', foot: '<div class="wz-foot"></div>' });
    const body = m.querySelector('.wz-body'), foot = m.querySelector('.wz-foot');
    const read = () => { body.querySelectorAll('[name]').forEach(el => { if (el.type === 'checkbox' && el.name === 'area') return; if (el.name in W) W[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); };
    const draw = () => {
      const st = `<ol class="wz-steps">${STEPS.map((s, i) => `<li class="${i < W.step ? 'done' : i === W.step ? 'current' : ''}"><span class="n">${i < W.step ? icon('check') : i + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
      let h = '';
      if (W.step === 0) h = `<div class="form-grid">
          <label class="field full"><span>Audit title <span class="req">*</span></span><input class="input" name="title" required value="${esc(W.title)}" placeholder="e.g. Annual Internal QMS Audit ${esc(yr)}"></label>
          <label class="field"><span>Audit type</span><select class="select" name="type">${AM.TYPES.map(t => `<option${t === W.type ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="field"><span>Programme</span><select class="select" name="programme">${S.auditProgrammes.map(p => `<option value="${p.id}"${p.id === W.programme ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
          <fieldset class="field full"><legend class="lg">Areas / processes to audit <span class="req">*</span></legend><p class="help" style="margin:0 0 6px">One audit can cover several areas; each area can have its own auditor.</p><div class="wz-areas">${Q.topProcesses().map(p => `<label class="checkbox"><input type="checkbox" name="area" value="${p.process_id}" ${W.areas.includes(p.process_id) ? 'checked' : ''}><span><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</span></label>`).join('')}</div></fieldset>
          <label class="field full"><span>Audit objective <span class="req">*</span></span><textarea class="textarea" name="objective" required rows="2" placeholder="What the audit must determine">${esc(W.objective)}</textarea></label>
          <label class="field full"><span>Audit scope</span><textarea class="textarea" name="scope" rows="2" placeholder="Activities, locations and period covered">${esc(W.scope)}</textarea></label>
          <label class="field full"><span>Audit criteria</span><input class="input" name="criteria" value="${esc(W.criteria)}"></label>
          <label class="field full"><span>Description</span><textarea class="textarea" name="description" rows="2">${esc(W.description)}</textarea></label></div>`;
      else if (W.step === 1) h = `<p class="help">Clauses are suggested from each area’s configuration (Area–Clause Matrix). Add, remove or narrow them to subclauses for this audit only.</p>${W.areas.map(pid => { const p = Q.proc(pid), cl = W.clauses[pid]; return `<section class="wz-area"><header><b class="tnum">${esc(p.process_code)}</b> <b>${esc(p.name)}</b><span class="tag">${icon('sparkles')}Suggested from Area configuration</span></header>
          <div class="cl-chips">${cl.slice().sort(AM.clSort).map(c => `<span class="cl-chip" title="${esc(AM.clTitle(c))}"><b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}<button type="button" class="cl-x" data-rm="${pid}|${c}" aria-label="Remove clause ${esc(c)} from ${esc(p.name)}">${icon('x')}</button></span>`).join('') || '<span class="muted small">No clauses — add at least one.</span>'}</div>
          ${cl.filter(c => AM.subsOf(c).length).map(c => `<div class="cl-subs"><span class="small muted">Narrow ${esc(c)} to subclauses:</span>${AM.subsOf(c).map(sc => `<label class="checkbox small"><input type="checkbox" data-sub="${pid}|${c}|${sc}">${esc(sc)} ${esc(AM.CL[sc])}</label>`).join('')}</div>`).join('')}
          <label class="field cl-add"><span class="sr-only">Add clause to ${esc(p.name)}</span><select class="select" data-add="${pid}"><option value="">+ Add clause…</option>${Object.keys(AM.CL).filter(c => !cl.includes(c)).sort(AM.clSort).map(c => `<option value="${c}">${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label></section>`; }).join('')}`;
      else if (W.step === 2) {
        const leadC = conflicts(W.lead, W.areas);
        h = `<div class="form-grid"><label class="field"><span>Lead Auditor <span class="req">*</span></span><select class="select" name="lead">${auditorsList().filter(w => S.auditors.find(x => x.who === w).level === 'Lead Auditor').map(w => `<option value="${w}"${w === W.lead ? ' selected' : ''}>${esc(Q.pname(w))}</option>`).join('')}</select></label></div>
          <h3 class="wz-h">Who audits each area</h3><table class="dt wz-team"><thead><tr><th>Area</th><th>Auditor</th><th>Auditee</th><th>Independence</th></tr></thead><tbody>${W.areas.map(pid => { const p = Q.proc(pid), au = W.areaAuditor[pid] || W.lead, c = conflicts(au, [pid]).length; return `<tr><td><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</td>
            <td><select class="select" data-aa="${pid}" aria-label="Auditor for ${esc(p.name)}">${auditorsList().filter(w => ['Lead Auditor', 'Auditor'].includes(S.auditors.find(x => x.who === w).level)).map(w => `<option value="${w}"${w === au ? ' selected' : ''}>${esc(Q.pname(w))}</option>`).join('')}</select></td>
            <td><select class="select" data-ae="${pid}" aria-label="Auditee for ${esc(p.name)}">${Q.peopleOptions(W.auditee[pid] || p.owner)}</select></td>
            <td>${c ? `<span class="st warning">${esc(Q.pname(au))} works in this area</span>` : '<span class="st success">Independent</span>'}</td></tr>`; }).join('')}</tbody></table>
          <h3 class="wz-h">Other team members <span class="muted small">optional</span></h3>${W.team.map((t, i) => `<div class="wz-member"><select class="select" data-tw="${i}" aria-label="Team member">${Q.peopleOptions(t.who)}</select><select class="select" data-tr="${i}" aria-label="Role">${AM.ROLES.slice(1).map(r => `<option${r === t.role ? ' selected' : ''}>${r}</option>`).join('')}</select><input class="input" data-tc="${i}" value="${esc(t.clauses.join(', '))}" placeholder="Clauses (optional), e.g. 8.4" aria-label="Clauses for this member"><button class="btn sm ghost" type="button" data-trm="${i}" aria-label="Remove member">${icon('x')}</button></div>`).join('')}
          <button class="btn sm" type="button" data-tadd>${icon('user-plus')}Add Team Member</button>
          <div class="callout ${leadC.length || W.areas.some(pid => conflicts(W.areaAuditor[pid] || W.lead, [pid]).length) ? 'warning' : ''}" style="margin-top:16px">${icon('shield-check')}<span><b>Auditor independence (ISO 9001 9.2.2 c)</b>Each auditor confirms in the audit plan that they are not auditing work for which they are directly responsible. Conflicts above are flagged from process ownership and department.</span></div>`;
      } else h = `<div class="form-grid">
          <label class="field"><span>Planned period</span><select class="select" name="plannedPeriod">${['', ...[yr, +yr + 1].flatMap(y => ['Q1', 'Q2', 'Q3', 'Q4'].map(qq => `${qq} ${y}`))].map(x => `<option${x === W.plannedPeriod ? ' selected' : ''} value="${x}">${x || 'Choose…'}</option>`).join('')}</select><span class="help">Enough for the programme. Add dates now or later.</span></label>
          <label class="field"><span>Location</span><input class="input" name="location" value="${esc(W.location)}" placeholder="e.g. Head office, Quezon City"></label>
          <label class="field"><span>Start date</span><input class="input" type="date" name="date" value="${esc(W.date)}"></label>
          <label class="field"><span>End date</span><input class="input" type="date" name="endDate" value="${esc(W.endDate)}"></label>
          <label class="field"><span>Start time</span><input class="input" type="time" name="start" value="${esc(W.start)}"></label>
          <label class="field"><span>End time</span><input class="input" type="time" name="end" value="${esc(W.end)}"></label>
          <label class="field"><span>Opening meeting</span><input class="input" type="time" name="opening" value="${esc(W.opening)}"></label>
          <label class="field"><span>Closing meeting</span><input class="input" type="time" name="closing" value="${esc(W.closing)}"></label>
          <label class="checkbox full"><input type="checkbox" name="remote" ${W.remote ? 'checked' : ''}>Remote audit (video call and shared screens)</label></div>
          <div class="wz-sum"><b>Summary</b><span>${esc(W.title)} · ${esc(W.type)}</span><span>${W.areas.length} area${W.areas.length === 1 ? '' : 's'} · ${W.areas.reduce((n, pid) => n + W.clauses[pid].length, 0)} clause selections · Lead ${esc(Q.pname(W.lead))}</span><span>Status after creating: <b>${W.date ? 'Scheduled' : 'Planned'}</b></span></div>`;
      body.innerHTML = st + `<div class="wz-panel">${h}</div><p class="auth-err" role="alert" id="wzErr"></p>`;
      foot.innerHTML = `<button class="btn" type="button" data-close>Cancel</button><span class="wz-gap"></span>${W.step ? '<button class="btn" type="button" data-wz="-1">Back</button>' : ''}<button class="btn primary" type="button" data-wz="1">${W.step === 3 ? 'Create Audit' : 'Continue'}</button>`;
      Q.refreshIcons(); Q.enhanceSelects(m); body.querySelector('input, select, textarea')?.focus();
    };
    const err = t => { const e = body.querySelector('#wzErr'); if (e) e.textContent = t; };
    m.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'area') { W.areas = [...body.querySelectorAll('[name="area"]:checked')].map(x => x.value); return; }
      if (t.dataset.add && t.value) { W.clauses[t.dataset.add].push(t.value); read(); draw(); return; }
      if (t.dataset.sub) { const [pid, c, sc] = t.dataset.sub.split('|'); const l = W.clauses[pid]; if (t.checked) { if (l.includes(c)) l.splice(l.indexOf(c), 1); l.push(sc); } else { l.splice(l.indexOf(sc), 1); if (!l.some(x => Q.clauseIn(x, c))) l.push(c); } read(); draw(); return; }
      if (t.dataset.aa) { W.areaAuditor[t.dataset.aa] = t.value; read(); draw(); return; }
      if (t.dataset.ae) { W.auditee[t.dataset.ae] = t.value; return; }
      if (t.dataset.tw) W.team[+t.dataset.tw].who = t.value;
      if (t.dataset.tr) W.team[+t.dataset.tr].role = t.value;
      if (t.name === 'lead') { read(); draw(); }
    });
    m.addEventListener('input', e => { if (e.target.dataset.tc) W.team[+e.target.dataset.tc].clauses = e.target.value.split(',').map(x => x.trim()).filter(Boolean); });
    m.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm]'); if (rm) { const [pid, c] = rm.dataset.rm.split('|'); W.clauses[pid] = W.clauses[pid].filter(x => x !== c); read(); draw(); return; }
      if (e.target.closest('[data-tadd]')) { read(); W.team.push({ who: 'kim', role: 'Auditor', clauses: [] }); draw(); return; }
      const trm = e.target.closest('[data-trm]'); if (trm) { read(); W.team.splice(+trm.dataset.trm, 1); draw(); return; }
      const b = e.target.closest('[data-wz]'); if (!b) return;
      read();
      if (+b.dataset.wz < 0) { W.step--; draw(); return; }
      if (W.step === 0) {
        if (!W.title.trim()) { err('Give the audit a title.'); return; }
        if (!W.areas.length) { err('Choose at least one area to audit.'); return; }
        if (!W.objective.trim()) { err('State the audit objective.'); return; }
        W.areas.forEach(pid => { if (!W.clauses[pid]) W.clauses[pid] = (Q.proc(pid).iso || []).slice(); });
        Object.keys(W.clauses).forEach(pid => { if (!W.areas.includes(pid)) delete W.clauses[pid]; });
        if (!W.scope.trim()) W.scope = W.areas.map(pid => Q.proc(pid).name).join(', ') + '.';
      }
      if (W.step === 1 && W.areas.some(pid => !W.clauses[pid].length)) { err('Each area needs at least one clause.'); return; }
      if (W.step === 3) { if (W.date && W.endDate && W.endDate < W.date) { err('The end date is before the start date.'); return; } return create(); }
      W.step++; draw();
    });
    function create() {
      const year = (W.date || W.plannedPeriod.slice(-4) || yr).slice(0, 4), max = Math.max(0, ...S.audits.filter(a => a.id.startsWith(`IA-${year}-`)).map(a => +a.id.split('-')[2]));
      const id = `IA-${year}-${String(max + 1).padStart(2, '0')}`, prog = S.auditProgrammes.find(p => p.year === +year)?.id || W.programme;
      const areaAud = pid => W.areaAuditor[pid] || W.lead;
      const team = [{ who: W.lead, role: 'Lead Auditor', areas: W.areas.filter(pid => areaAud(pid) === W.lead), clauses: [], independent: null }];
      W.areas.forEach(pid => { const au = areaAud(pid); if (au !== W.lead) { const t = team.find(x => x.who === au); t ? t.areas.push(pid) : team.push({ who: au, role: 'Auditor', areas: [pid], clauses: [], independent: null }); } });
      W.team.forEach(t => { if (!team.some(x => x.who === t.who)) team.push({ who: t.who, role: t.role, areas: [], clauses: t.clauses, independent: t.role === 'Observer' ? true : null }); });
      const a = { id, programme: prog, title: W.title.trim(), type: W.type, processes: W.areas.slice(), auditor: W.lead, date: W.date || null, endDate: W.endDate || W.date || null, start: W.start, end: W.end, location: W.remote ? `Remote${W.location ? ' · ' + W.location : ''}` : W.location, opening: W.opening, closing: W.closing,
        plannedPeriod: W.plannedPeriod || (W.date ? `Q${Math.ceil(+W.date.slice(5, 7) / 3)} ${W.date.slice(0, 4)}` : ''), status: W.date ? 'Scheduled' : 'Planned', objective: W.objective.trim(), scope: W.scope.trim(), criteria: W.criteria.trim(), description: W.description.trim(),
        team, areas: W.areas.map(pid => ({ process: pid, auditee: W.auditee[pid] || Q.proc(pid).owner, auditor: areaAud(pid), clauses: W.clauses[pid].slice().sort(AM.clSort), status: 'Not started' })),
        report: { status: 'Not started', rev: null, reviewer: W.lead === 'maria' ? 'nina' : 'maria', approver: 'eric', history: [], revisions: [] }, activity: [] };
      AM.log(a, 'created the audit plan'); AM.log(a, `assigned the audit team: ${team.map(t => `${Q.pname(t.who)} (${t.role})`).join(', ')}`);
      if (a.date) AM.log(a, `scheduled the audit for ${Q.fmt(a.date)}`);
      S.audits.push(a); Q.save(); Q.audit?.('Audits', `created audit ${id} ${a.title}`); Q.closeAllModals(); Q.go(`#/audits/a/${id}/plan`); Q.toast('Audit created', `${id} · ${a.status}. Next: ${a.date ? 'prepare the checklist' : 'schedule it'}.`);
    }
    draw();
  }

  /* ====================================================================== plan edits */
  const findA = d => AM.audit(d.id);
  Q.actions['am-schedule'] = d => {
    const a = findA(d);
    const m = Q.openModal({ size: 'm', title: `${a.date ? 'Reschedule' : 'Schedule'} ${esc(a.id)}`, sub: esc(a.title), body: `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Start date <span class="req">*</span></span><input class="input" type="date" name="date" required value="${esc(a.date || '')}"></label>
      <label class="field"><span>End date</span><input class="input" type="date" name="endDate" value="${esc(a.endDate || '')}"></label>
      <label class="field"><span>Start time</span><input class="input" type="time" name="start" value="${esc(a.start || '08:30')}"></label>
      <label class="field"><span>End time</span><input class="input" type="time" name="end" value="${esc(a.end || '16:30')}"></label>
      <label class="field"><span>Opening meeting</span><input class="input" type="time" name="opening" value="${esc(a.opening || '08:30')}"></label>
      <label class="field"><span>Closing meeting</span><input class="input" type="time" name="closing" value="${esc(a.closing || '16:00')}"></label>
      <label class="field full"><span>Location / remote</span><input class="input" name="location" value="${esc(a.location || '')}" placeholder="e.g. Head office, or Remote (Teams)"></label>
      ${a.date ? '<label class="field full"><span>Reason for change <span class="req">*</span></span><input class="input" name="reason" required placeholder="Recorded in the audit activity"></label>' : ''}</div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${a.date ? 'Reschedule' : 'Schedule'}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      if (v.endDate && v.endDate < v.date) { Q.toast('Check the dates', 'The end date is before the start date.'); return; }
      const old = a.date; Object.assign(a, { date: v.date, endDate: v.endDate || v.date, start: v.start, end: v.end, opening: v.opening, closing: v.closing, location: v.location });
      if (a.status === 'Planned') a.status = 'Scheduled';
      AM.log(a, old ? `rescheduled the audit from ${Q.fmt(old)} to ${Q.fmt(v.date)} — ${v.reason}` : `scheduled the audit for ${Q.fmt(v.date)}`);
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast(old ? 'Audit rescheduled' : 'Audit scheduled', `${a.id} · ${Q.fmt(v.date)}`);
    });
  };
  Q.actions['am-edit-plan'] = d => {
    const a = findA(d);
    const m = Q.openModal({ size: 'l', title: `Edit plan — ${esc(a.id)}`, body: `<form class="modal-body"><div class="form-grid">
      <label class="field full"><span>Audit title <span class="req">*</span></span><input class="input" name="title" required value="${esc(a.title)}"></label>
      <label class="field"><span>Audit type</span><select class="select" name="type">${AM.TYPES.map(t => `<option${t === a.type ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Planned period</span><input class="input" name="plannedPeriod" value="${esc(a.plannedPeriod || '')}"></label>
      <label class="field full"><span>Objective <span class="req">*</span></span><textarea class="textarea" name="objective" required rows="2">${esc(a.objective)}</textarea></label>
      <label class="field full"><span>Scope</span><textarea class="textarea" name="scope" rows="2">${esc(a.scope)}</textarea></label>
      <label class="field full"><span>Criteria</span><input class="input" name="criteria" value="${esc(a.criteria)}"></label>
      <label class="field full"><span>Description</span><textarea class="textarea" name="description" rows="2">${esc(a.description || '')}</textarea></label></div></form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Plan</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; Object.assign(a, Q.formValues(f)); AM.log(a, 'edited the audit plan'); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Plan saved', a.id); });
  };
  Q.actions['am-team'] = d => {
    const a = findA(d), S = Q.S;
    const m = Q.openModal({ size: 'l', title: `Audit team — ${esc(a.id)}`, sub: 'Assign who audits each area. Auditors confirm independence themselves in the plan.', body: `<form class="modal-body">
      <table class="dt wz-team"><thead><tr><th>Area</th><th>Auditor</th><th>Auditee</th></tr></thead><tbody>${a.areas.map(ar => { const p = Q.proc(ar.process); return `<tr><td><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</td><td><select class="select" name="au-${ar.process}" aria-label="Auditor for ${esc(p.name)}"><option value="">Not assigned</option>${S.auditors.filter(x => ['Lead Auditor', 'Auditor'].includes(x.level)).map(x => `<option value="${x.who}"${x.who === ar.auditor ? ' selected' : ''}>${esc(Q.pname(x.who))} — ${esc(x.level)}</option>`).join('')}</select></td><td><select class="select" name="ae-${ar.process}" aria-label="Auditee for ${esc(p.name)}">${Q.peopleOptions(ar.auditee || p.owner)}</select></td></tr>`; }).join('')}</tbody></table>
      <label class="field" style="margin-top:16px;max-width:360px"><span>Add team member</span><select class="select" name="addWho"><option value="">—</option>${Object.keys(S.people).filter(w => !a.team.some(t => t.who === w)).map(w => `<option value="${w}">${esc(Q.pname(w))} — ${esc(Q.person(w).title)}</option>`).join('')}</select></label>
      <label class="field" style="max-width:360px"><span>Role</span><select class="select" name="addRole">${AM.ROLES.slice(1).map(r => `<option>${r}</option>`).join('')}</select></label></form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Team</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const v = Q.formValues(m.querySelector('form')), changes = [];
      a.areas.forEach(ar => {
        const au = v['au-' + ar.process] || null, ae = v['ae-' + ar.process];
        if (au !== ar.auditor) { changes.push(`${Q.proc(ar.process).name}: ${au ? Q.pname(au) : 'unassigned'}`); ar.auditor = au; if (au && !a.team.some(t => t.who === au)) a.team.push({ who: au, role: 'Auditor', areas: [ar.process], clauses: [], independent: null }); else if (au) { const t = a.team.find(x => x.who === au); if (!t.areas.includes(ar.process)) t.areas.push(ar.process); t.independent = null; } }
        ar.auditee = ae;
      });
      if (v.addWho) { a.team.push({ who: v.addWho, role: v.addRole, areas: [], clauses: [], independent: v.addRole === 'Observer' ? true : null }); changes.push(`added ${Q.pname(v.addWho)} (${v.addRole})`); }
      if (changes.length) AM.log(a, `changed the audit team — ${changes.join('; ')}`);
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Team saved', changes.length ? changes.join('; ') : 'No changes');
    });
  };
  Q.actions['am-clauses'] = d => {
    const a = findA(d), ar = AM.area(a, d.area), p = Q.proc(ar.process), cl = AM.clausesOf(a, ar);
    const m = Q.openModal({ size: 'm', title: `Clauses — ${esc(p.name)}`, sub: `Suggested from Area configuration: ${esc((p.iso || []).join(', '))}. Changes apply to this audit only.`, body: `<form class="modal-body"><div class="cl-pick">${Object.keys(AM.CL).sort(AM.clSort).filter(c => c.split('.').length <= 3).map(c => `<label class="checkbox small${c.split('.').length === 3 ? ' sub' : ''}"><input type="checkbox" name="c" value="${c}" ${cl.includes(c) ? 'checked' : ''}><b class="tnum">${esc(c)}</b> ${esc(AM.CL[c])}</label>`).join('')}</div>
      ${a.checklist ? '<p class="small muted" style="margin-top:12px">Questions are added for new clauses. Questions for removed clauses are kept if they have been assessed.</p>' : ''}</form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Clauses</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const next = [...m.querySelectorAll('[name="c"]:checked')].map(x => x.value); if (!next.length) { Q.toast('Choose at least one clause'); return; }
      const added = next.filter(c => !cl.includes(c)), removed = cl.filter(c => !next.includes(c));
      ar.clauses = next.sort(AM.clSort);
      if (a.checklist) {
        a.checklist = a.checklist.filter(i => i.area !== ar.process || !removed.includes(i.clause) || i.result);
        added.forEach(c => AM.questionsFor(c).forEach(qn => a.checklist.push({ id: itemId(), area: ar.process, clause: c, sub: qn.sub, question: qn.q, expected: qn.ev.slice(), docs: [], notes: '', result: null, reviewed: [], external: [], finding: null, by: null, date: null })));
      }
      AM.log(a, `changed ${p.name} clauses${added.length ? ` — added ${added.join(', ')}` : ''}${removed.length ? ` — removed ${removed.join(', ')}` : ''}`);
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Clauses saved', `${p.name}: ${next.length} clauses`);
    });
  };
  Q.actions['am-independence'] = d => {
    const a = findA(d), t = a.team.find(x => x.who === AM.actor());
    Q.confirm({ title: 'Confirm independence', confirm: 'I Confirm', body: `<p>I, <b>${esc(Q.pname(t.who))}</b>, confirm that I am not auditing work for which I am directly responsible in ${esc(a.id)} ${esc(a.title)}${t.areas.length ? ` (${t.areas.map(pid => esc(Q.proc(pid).name)).join(', ')})` : ''}.</p>`,
      onConfirm: () => { t.independent = true; t.confirmedAt = AM.now(); AM.log(a, 'confirmed auditor independence'); Q.save(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Independence confirmed'); } });
  };

  /* ====================================================================== lifecycle actions */
  Q.actions['am-prepare'] = d => {
    const a = findA(d);
    if (!a.date) { Q.toast('Schedule the audit first'); return; }
    if (a.areas.some(ar => !ar.auditor)) { Q.toast('Assign an auditor to every area first', 'Use Assign Auditor in the plan.'); return; }
    if (!a.checklist) AM.prepareChecklist(a);
    a.status = 'Checklist Ready'; AM.log(a, `prepared the checklist (${a.checklist.length} questions from ${AM.allClauses(a).length} clauses)`);
    Q.save(); Q.go(`#/audits/a/${a.id}/checklist`); Q.toast('Checklist prepared', `${a.checklist.length} questions generated from the applicable clauses. Edit, add or remove questions before the audit.`);
  };
  Q.actions['am-start'] = d => {
    const a = findA(d), pending = a.team.filter(t => t.independent !== true && t.role !== 'Observer');
    const go = () => { a.status = 'In Progress'; AM.log(a, 'held the opening meeting and started the audit'); Q.save(); Q.render({ noFocus: true }); Q.toast('Audit started', 'Auditors can now assess their checklist items.'); };
    if (pending.length) Q.confirm({ title: 'Independence not confirmed', confirm: 'Start Anyway', danger: true, body: `<p>${pending.map(t => esc(Q.pname(t.who))).join(', ')} ${pending.length === 1 ? 'has' : 'have'} not confirmed independence yet. Starting is recorded in the activity log.</p>`, onConfirm: go });
    else Q.confirm({ title: `Start ${esc(a.id)}?`, confirm: 'Start Audit', body: '<p>Records the opening meeting and opens the checklist for assessment.</p>', onConfirm: go });
  };
  Q.actions['am-reporting'] = d => { const a = findA(d); a.status = 'Reporting'; AM.log(a, 'held the closing meeting; audit moved to reporting'); Q.save(); Q.go(`#/audits/a/${a.id}/report`); Q.toast('Closing meeting recorded', 'Compile the audit report next.'); };
  Q.actions['am-close'] = d => {
    const a = findA(d);
    Q.confirm({ title: `Close ${esc(a.id)}?`, confirm: 'Close Audit', body: '<p>All nonconformities are closed and the report is published. The audit becomes read-only.</p>',
      onConfirm: () => { a.status = 'Closed'; a.closed = Q.today(); AM.log(a, 'closed the audit — all nonconformities closed'); Q.save(); Q.render({ noFocus: true }); Q.toast('Audit closed', a.id); } });
  };
  AM.closeBlockers = a => {
    const out = [];
    if (a.report.status !== 'Published') out.push('the audit report is not published');
    const open = AM.findingsOf(a.id).filter(AM.ncOpen);
    if (open.length) out.push(`${open.length} nonconformit${open.length === 1 ? 'y is' : 'ies are'} still open (${open.map(f => f.nc.no).join(', ')})`);
    return out;
  };

  /* ====================================================================== workspace */
  const WTABS = [['overview', 'Overview'], ['plan', 'Plan'], ['checklist', 'Checklist'], ['findings', 'Findings'], ['actions', 'Corrective Actions'], ['report', 'Report'], ['activity', 'Activity']];
  AM.workspace = (id, tab, q, sub) => {
    const a = AM.audit(id);
    if (!a) return { title: 'Audit not found', nav: 'audits', html: AM.chrome('list', { title: 'Audit not found', sub: `${esc(id)} does not exist.` }) };
    if (tab === 'report' && sub === 'edit') return AM.reportEditor(a, q);
    if (tab === 'print') return AM.printView(a, q);
    tab = WTABS.some(t => t[0] === tab) ? tab : 'overview';
    const area = a.areas.some(ar => ar.process === q.area) ? q.area : (a.areas.length === 1 ? a.areas[0].process : 'all');
    const fs = AM.findingsOf(a.id), ncs = fs.filter(f => f.nc);
    const primary = (() => {
      const can = AM.can('plan', a);
      if (!can && !AM.can('report', a)) return '';
      if (a.status === 'Planned') return `<button class="btn primary" type="button" data-action="am-schedule" data-id="${a.id}">${icon('calendar')}Schedule Audit</button>`;
      if (a.status === 'Scheduled') return `<button class="btn primary" type="button" data-action="am-prepare" data-id="${a.id}">${icon('clipboard-list')}Prepare Checklist</button>`;
      if (a.status === 'Checklist Ready') return `<button class="btn primary" type="button" data-action="am-start" data-id="${a.id}">${icon('play')}Start Audit</button>`;
      if (a.status === 'In Progress') { const left = a.areas.filter(ar => ar.status !== 'Submitted'); return `<button class="btn primary" type="button" data-action="am-reporting" data-id="${a.id}" ${left.length ? `disabled title="Waiting for ${left.map(ar => Q.proc(ar.process).name).join(', ')}"` : ''}>${icon('file-text')}Move to Reporting</button>`; }
      if (a.status === 'Reporting') return `<a class="btn primary" href="#/audits/a/${a.id}/report">${icon('file-text')}Open Report</a>`;
      if (['Published', 'Follow-up'].includes(a.status)) { const b = AM.closeBlockers(a); return `<button class="btn primary" type="button" data-action="am-close" data-id="${a.id}" ${b.length ? `disabled title="Cannot close: ${esc(b.join('; '))}"` : ''}>${icon('circle-check')}Close Audit</button>`; }
      return '';
    })();
    const more = AM.can('plan', a) && a.status !== 'Closed' ? Q.menu(`More actions for ${a.id}`, [{ label: 'Edit Plan', icon: 'pencil', data: { action: 'am-edit-plan', id: a.id } }, { label: a.date ? 'Reschedule' : 'Schedule', icon: 'calendar', data: { action: 'am-schedule', id: a.id } }, { label: 'Assign Auditor', icon: 'user-plus', data: { action: 'am-team', id: a.id } }, '-', { label: 'Print Audit Plan', icon: 'download', data: { action: 'am-print', id: a.id, kind: 'plan' } }], { text: 'More', icon: 'ellipsis', cls: 'btn' }) : '';
    const steps = AM.STATUSES, ci = steps.indexOf(a.status);
    const life = `<ol class="am-life" aria-label="Audit lifecycle">${steps.map((s, i) => `<li class="${i < ci ? 'done' : i === ci ? 'current' : ''}"${i === ci ? ' aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>`;
    const meta = `<div class="meta-line"><span>${AM.dateRange(a)}${a.start ? ` · ${esc(a.start)}–${esc(a.end)}` : ''}</span><span>Lead Auditor <b>${esc(Q.pname(a.auditor))}</b></span><span><b>${a.areas.length}</b> area${a.areas.length === 1 ? '' : 's'}</span><span><b>${AM.allClauses(a).length}</b> clauses</span><span><b>${fs.length}</b> findings${ncs.length ? ` · ${ncs.filter(AM.ncOpen).length} open NC` : ''}</span>${a.location ? `<span class="ml-loc">${icon('map')}${esc(a.location)}</span>` : ''}</div>`;
    const head = Q.pageHead({ crumbs: [['Audits', '#/audits'], ['Audits', '#/audits/list'], [a.id]], pre: `<div class="am-id"><span class="tnum">${esc(a.id)}</span>${AM.badge(a)}<span class="muted small">${esc(a.type)}</span></div>`, title: esc(a.title), meta, actions: primary + more });
    const counts = { checklist: a.checklist ? `${AM.items(a, area).filter(i => i.result).length}/${AM.items(a, area).length}` : '', findings: fs.filter(f => area === 'all' || f.process === area).length || '', actions: ncs.filter(f => (area === 'all' || f.process === area) && AM.ncOpen(f)).length || '' };
    const qs = area !== 'all' && a.areas.length > 1 ? `?area=${area}` : '';
    const tabsHtml = AM.tabs(WTABS.map(([k, l]) => [k, l, `#/audits/a/${a.id}/${k}${qs}`, counts[k] || '']), tab, 'Audit');
    const areaSel = a.areas.length > 1 && ['overview', 'checklist', 'findings', 'actions'].includes(tab) ? `<nav class="area-nav" aria-label="Audited areas"><a href="#/audits/a/${a.id}/${tab}" aria-current="${area === 'all'}">All Areas</a>${a.areas.map(ar => { const pc = AM.progress(a, ar.process); return `<a href="#/audits/a/${a.id}/${tab}?area=${ar.process}" aria-current="${area === ar.process}"><b class="tnum">${esc(Q.proc(ar.process).process_code)}</b> ${esc(Q.proc(ar.process).name)}<span class="an-st ${ar.status === 'Submitted' ? 'ok' : ''}">${ar.status === 'Submitted' ? icon('check') : a.checklist ? pc + '%' : ''}</span></a>`; }).join('')}</nav>` : '';
    const body = { overview: wsOverview, plan: wsPlan, checklist: wsChecklist, findings: wsFindings, actions: wsActions, report: AM.reportTab, activity: wsActivity }[tab](a, area, q);
    return { title: `${a.id} · Audits`, nav: 'audits', html: head + life + `<div class="am-nav">${tabsHtml}${AM.actorSwitch()}</div>` + areaSel + body.html, after: body.after };
  };

  function wsOverview(a, area) {
    const fs = AM.findingsOf(a.id);
    const rows = a.areas.filter(ar => area === 'all' || ar.process === area).map(ar => { const p = Q.proc(ar.process), it = AM.items(a, ar.process), f = fs.filter(x => x.process === ar.process); return `<tr>
      <td><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}<span class="sub">${AM.clausesOf(a, ar).length} clauses</span></td><td>${ar.auditor ? esc(Q.pname(ar.auditor)) : '<span class="st warning">Not assigned</span>'}</td><td>${esc(Q.pname(ar.auditee))}</td>
      <td>${a.checklist ? `${Q.miniProgress(AM.progress(a, ar.process))}<span class="sub">${it.filter(i => i.result).length} of ${it.length} assessed</span>` : '<span class="muted small">Not prepared</span>'}</td>
      <td class="c-num">${f.length ? `${f.length}<span class="sub">${f.filter(x => x.nc).length} NC</span>` : '<span class="zero">—</span>'}</td>
      <td>${Q.st(ar.status, ar.status === 'Submitted' ? 'success' : ar.status === 'In progress' ? 'warning' : 'neutral')}${ar.submitted ? `<span class="sub">${Q.fmt(ar.submitted.date)}</span>` : ''}</td>
      <td class="c-actions">${a.checklist ? `<a class="btn sm" href="#/audits/a/${a.id}/checklist?area=${ar.process}">Open Checklist</a>` : ''}${ar.status === 'Submitted' ? `<a class="btn sm ghost" href="#/audits/a/${a.id}/print?area=${ar.process}">Area Report</a>` : ''}</td></tr>`; }).join('');
    const sub = a.areas.filter(ar => ar.status === 'Submitted').length;
    return { html: `<section class="panel"><div class="panel-head"><h2>Area progress</h2><span class="muted small">${sub} of ${a.areas.length} areas submitted — the consolidated report can be compiled when all are in</span><div class="actions"><a class="btn sm ghost" href="#/audits/a/${a.id}/report">Report</a></div></div><div class="table-scroll"><table class="dt"><caption class="sr-only">Area progress</caption><thead><tr><th>Area</th><th>Auditor</th><th>Auditee</th><th>Checklist</th><th class="c-num">Findings</th><th>Status</th><th class="c-actions">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <div class="grid-halves section">
        <section class="panel"><div class="panel-head"><h2>Audit plan</h2><div class="actions"><a class="btn sm ghost" href="#/audits/a/${a.id}/plan">Open Plan</a></div></div><div class="panel-pad"><dl class="dl-list">
          <dt>Objective</dt><dd>${esc(a.objective)}</dd><dt>Scope</dt><dd>${esc(a.scope)}</dd><dt>Criteria</dt><dd>${esc(a.criteria)}</dd><dt>Schedule</dt><dd>${AM.dateRange(a)}${a.start ? `, ${esc(a.start)}–${esc(a.end)}` : ''}<br>${esc(a.location || '')}${a.opening ? `<br>Opening ${esc(a.opening)} · closing ${esc(a.closing)}` : ''}</dd></dl></div></section>
        <section class="panel"><div class="panel-head"><h2>Audit team</h2><span class="muted small">${a.team.length} people</span></div><ul class="team-list">${a.team.map(t => `<li><span class="avatar sm">${esc(Q.initials(t.who))}</span><div><b>${esc(Q.pname(t.who))}</b><span>${esc(t.role)}${t.areas.length ? ` · ${t.areas.map(pid => esc(Q.proc(pid).name)).join(', ')}` : ''}${t.clauses.length ? ` · ${esc(t.clauses.join(', '))}` : ''}</span></div>${t.independent === true ? `<span class="st success" title="Independence confirmed">${icon('shield-check')}Independent</span>` : t.role === 'Observer' ? '' : '<span class="st warning">To confirm</span>'}</li>`).join('')}</ul></section></div>` };
  }

  function wsPlan(a) {
    const can = AM.can('plan', a), me = a.team.find(t => t.who === AM.actor());
    const conflict = (t) => t.areas.filter(pid => { const p = Q.proc(pid); return p.owner === t.who || Q.person(t.who).dept === p.department; });
    return { html: `<div class="grid-halves">
      <section class="panel"><div class="panel-head"><h2>Audit details</h2>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-edit-plan" data-id="${a.id}">${icon('pencil')}Edit Plan</button></div>` : ''}</div><div class="panel-pad"><dl class="dl-list dl-wide">
        <dt>Audit number</dt><dd class="tnum">${esc(a.id)}</dd><dt>Type</dt><dd>${esc(a.type)}</dd><dt>Programme</dt><dd>${esc(Q.S.auditProgrammes.find(p => p.id === a.programme)?.title || '—')}</dd><dt>Planned period</dt><dd>${esc(a.plannedPeriod || '—')}</dd>
        <dt>Objective</dt><dd>${esc(a.objective)}</dd><dt>Scope</dt><dd>${esc(a.scope)}</dd><dt>Criteria</dt><dd>${esc(a.criteria)}</dd>${a.description ? `<dt>Description</dt><dd>${esc(a.description)}</dd>` : ''}</dl></div></section>
      <section class="panel"><div class="panel-head"><h2>Schedule</h2>${can && a.status !== 'Closed' ? `<div class="actions"><button class="btn sm" type="button" data-action="am-schedule" data-id="${a.id}">${icon('calendar')}${a.date ? 'Reschedule' : 'Schedule'}</button></div>` : ''}</div><div class="panel-pad"><dl class="dl-list dl-wide">
        <dt>Dates</dt><dd>${AM.dateRange(a)}</dd><dt>Time</dt><dd>${a.start ? `${esc(a.start)} – ${esc(a.end)}` : '—'}</dd><dt>Location</dt><dd>${esc(a.location || '—')}</dd><dt>Opening meeting</dt><dd>${esc(a.opening || '—')}</dd><dt>Closing meeting</dt><dd>${esc(a.closing || '—')}</dd></dl></div></section></div>
      <section class="panel section"><div class="panel-head"><h2>Audit team</h2><span class="muted small">${a.team.length} people</span>${can ? `<div class="actions"><button class="btn sm" type="button" data-action="am-team" data-id="${a.id}">${icon('user-plus')}Assign Auditor</button></div>` : ''}</div>
        <div class="table-scroll"><table class="dt"><caption class="sr-only">Audit team</caption><thead><tr><th>Member</th><th>Role</th><th>Assigned areas</th><th>Clauses</th><th>Independence</th></tr></thead><tbody>${a.team.map(t => { const c = conflict(t); return `<tr><td><span class="user-cell"><span class="avatar sm">${esc(Q.initials(t.who))}</span><span><span class="title">${esc(Q.pname(t.who))}</span><span class="sub">${esc(Q.person(t.who).title)}</span></span></span></td><td>${esc(t.role)}</td><td>${t.areas.map(pid => esc(Q.proc(pid).name)).join(', ') || '<span class="muted">Overall audit</span>'}</td><td class="tnum small">${esc(t.clauses.join(', ') || 'All in assigned areas')}</td>
          <td>${t.role === 'Observer' ? '<span class="muted small">Not required</span>' : t.independent === true ? `${Q.st('Confirmed', 'success')}<span class="sub">${t.confirmedAt ? AM.at(t.confirmedAt) : ''}</span>` : `${c.length ? `<span class="st danger">${icon('triangle-alert')}Conflict: works in ${c.map(pid => esc(Q.proc(pid).name)).join(', ')}</span>` : Q.st('Not yet confirmed', 'warning')}${me === t && !c.length ? ` <button class="btn sm" type="button" data-action="am-independence" data-id="${a.id}">Confirm</button>` : ''}`}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="panel-pad small muted" style="border-top:1px solid var(--border)">${icon('shield-check')} Each auditor confirms: “I am not auditing work for which I am directly responsible.” Conflicts are flagged from process ownership and department.</p></section>
      <section class="panel section"><div class="panel-head"><h2>Areas & applicable clauses</h2></div><ul class="plan-areas">${a.areas.map(ar => { const p = Q.proc(ar.process), cl = AM.clausesOf(a, ar), def = (p.iso || []).slice().sort(AM.clSort).join(), custom = ar.clauses && ar.clauses.slice().sort(AM.clSort).join() !== def; return `<li><div class="pa-h"><b class="tnum">${esc(p.process_code)}</b> <b>${esc(p.name)}</b><span class="muted small">Auditee ${esc(Q.pname(ar.auditee))} · Auditor ${ar.auditor ? esc(Q.pname(ar.auditor)) : '—'}</span>${can && a.status !== 'Closed' ? `<button class="btn sm" type="button" data-action="am-clauses" data-id="${a.id}" data-area="${ar.process}">${icon('pencil')}Edit Clauses</button>` : ''}</div>
        <div class="cl-chips">${cl.map(c => `<span class="cl-chip ro" title="${esc(AM.clTitle(c))}"><b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}</span>`).join('')}</div><span class="small muted">${custom ? 'Customized for this audit' : 'Suggested from Area configuration'}</span></li>`; }).join('')}</ul></section>` };
  }

  /* ---------------- checklist ---------------- */
  let openItem = null;
  function wsChecklist(a, area, q) {
    if (!a.checklist) return { html: `<section class="panel"><div class="empty"><h3>Checklist not prepared</h3><p>${a.status === 'Planned' ? 'Schedule the audit first.' : 'The checklist is generated from each area’s applicable clauses. You can then edit, add and remove questions.'}</p>${a.status === 'Scheduled' && AM.can('plan', a) ? `<button class="btn primary" type="button" data-action="am-prepare" data-id="${a.id}">${icon('clipboard-list')}Prepare Checklist</button>` : ''}</div></section>` };
    const f = q.f || 'all', items = AM.items(a, area).filter(i => f === 'all' || (f === 'open' ? !i.result : f === 'findings' ? i.result && !['Conforming', 'N/A'].includes(i.result) : i.result === 'Conforming'));
    const groups = [...new Set(items.map(i => `${i.area}|${i.clause}`))];
    const areaObj = area !== 'all' ? AM.area(a, area) : null;
    const assessNote = a.status === 'In Progress' ? '' : `<div class="callout small" style="margin-bottom:12px">${icon('info')}<span>${['Scheduled', 'Checklist Ready'].includes(a.status) ? 'Preparation: edit questions, expected evidence and linked documents. Assessment opens when the Lead Auditor starts the audit.' : 'The audit is past fieldwork; the checklist is read-only.'}</span></div>`;
    const submitBar = areaObj && a.status === 'In Progress' ? (() => { const it = AM.items(a, area), left = it.filter(i => !i.result).length; return areaObj.status === 'Submitted' ? `<div class="cl-submit ok">${icon('circle-check')}<span><b>${esc(Q.proc(area).name)} results submitted</b> by ${esc(Q.pname(areaObj.submitted.by))} · ${Q.fmt(areaObj.submitted.date)}</span><a class="btn sm" href="#/audits/a/${a.id}/print?area=${area}">Area Report</a></div>`
      : AM.can('submitArea', a, area) ? `<div class="cl-submit">${icon('send')}<span><b>${left ? `${left} question${left === 1 ? '' : 's'} not assessed` : 'All questions assessed'}</b>Submit the area results when the area is complete. They feed the consolidated report.</span><button class="btn sm primary" type="button" data-action="am-submit-area" data-id="${a.id}" data-area="${area}">Submit Area Results</button></div>` : ''; })() : '';
    const filt = [['all', 'All'], ['open', 'Not assessed'], ['conf', 'Conforming'], ['findings', 'With findings']];
    const html = `${assessNote}${submitBar}<div class="cl-tools"><div class="seg" role="group" aria-label="Filter questions">${filt.map(([k, l]) => `<a class="seg-a" href="#/audits/a/${a.id}/checklist?${new URLSearchParams({ ...(area !== 'all' && a.areas.length > 1 ? { area } : {}), f: k })}" aria-current="${k === f}">${l} <span class="n">${AM.items(a, area).filter(i => k === 'all' || (k === 'open' ? !i.result : k === 'findings' ? i.result && !['Conforming', 'N/A'].includes(i.result) : i.result === 'Conforming')).length}</span></a>`).join('')}</div>
        <span class="small muted">${area === 'all' && a.areas.length > 1 ? 'Choose an area above to work on it, or review all areas here.' : ''}</span></div>
      ${groups.map(g => { const [pid, cl] = g.split('|'), its = items.filter(i => i.area === pid && i.clause === cl); return `<section class="cl-group"><header><span class="clause">${esc(cl)}</span><h3>${esc(AM.clTitle(cl))}</h3>${area === 'all' && a.areas.length > 1 ? `<span class="tag">${esc(Q.proc(pid).name)}</span>` : ''}<span class="muted small">${its.filter(i => i.result).length}/${its.length}</span>${AM.can('prepare', a, pid) ? `<button class="btn sm ghost" type="button" data-action="am-q-add" data-id="${a.id}" data-area="${pid}" data-clause="${cl}">${icon('plus')}Add Question</button>` : ''}</header>
        <ul class="cl-items">${its.map(i => clItem(a, i)).join('')}</ul></section>`; }).join('') || '<div class="empty small">No questions match this filter.</div>'}`;
    return { html, after: main => { if (openItem) main.querySelector(`[data-item="${openItem}"]`)?.scrollIntoView({ block: 'nearest' }); } };
  }
  function clItem(a, i) {
    const open = openItem === i.id, sys = AM.systemEvidence(i.area, i.sub), linked = i.docs.map(id => ({ kind: 'doc', id })).filter(x => !sys.some(s => s.kind === 'doc' && s.id === x.id));
    const all = [...sys, ...linked], rev = new Set(i.reviewed.map(s => s.kind + s.id));
    const canAssess = AM.can('assess', a, i.area), canPrep = AM.can('prepare', a, i.area);
    const res = i.result ? `<span class="st ${AM.typeKind(i.result)}">${esc(AM.short(i.result))}</span>` : '<span class="st neutral">Not assessed</span>';
    const row = `<button type="button" class="cl-row" data-toggle-item="${i.id}" aria-expanded="${open}"><span class="tnum cl-sub">${esc(i.sub)}</span><span class="cl-q">${esc(i.question)}</span><span class="cl-ev small muted" title="Evidence reviewed">${icon('files')}${i.reviewed.length}/${all.length}</span>${i.notes ? `<span class="small muted" title="Has notes">${icon('message-square')}</span>` : ''}${res}${icon('chevron-down', 'cl-chev')}</button>`;
    if (!open) return `<li data-item="${i.id}">${row}</li>`;
    const finding = i.finding && Q.S.findings.find(f => f.id === i.finding);
    const related = (() => { const r = Q.S.risks.filter(x => Q.inProc(x.process, i.area) && Q.riskOpen(x)).slice(0, 2), k = Q.S.kpis.filter(x => Q.inProc(x.process, i.area)).slice(0, 2), pf = Q.S.findings.filter(f => f.audit !== a.id && Q.inProc(f.process, i.area) && fam(f.clause, i.sub)).slice(0, 3);
      const L = [...pf.map(f => `<li>${icon('search-check')}<span>Previous finding <b>${esc(f.id)}</b> (${esc(AM.short(f.type))}, ${esc(f.audit)}): ${esc(f.title)} — ${esc(f.status)}</span></li>`), ...r.map(x => `<li>${icon('shield-alert')}<span>Risk <a href="#/risks?focus=${x.id}">${esc(x.id)}</a> ${esc(x.title)} (${esc(Q.riskLevel(x))})</span></li>`), ...k.map(x => `<li>${icon('target')}<span>KPI <a href="#/qms/objectives?focus=${x.id}">${esc(x.name)}</a>: ${esc(Q.kpiFmt(x.actual, x))} vs ${esc(x.dir)} ${esc(Q.kpiFmt(x.target, x))} ${Q.kpiOk(x) ? '' : '<span class="st danger">below target</span>'}</span></li>`)];
      return L.length ? `<div class="ci-sec"><h4>Related QMS information</h4><ul class="rel-list">${L.join('')}</ul></div>` : ''; })();
    return `<li data-item="${i.id}" class="open">${row}<div class="ci-body">
      <div class="ci-main">
        <div class="ci-sec"><h4>Question</h4><p>${esc(i.question)}</p>${canPrep ? `<div class="ci-acts">${Q.menu('Question actions', [{ label: 'Edit Question', icon: 'pencil', data: { action: 'am-q-edit', id: a.id, item: i.id } }, { label: 'Link QMS Document', icon: 'link', data: { action: 'am-q-link', id: a.id, item: i.id } }, '-', { label: 'Remove Question', icon: 'trash-2', cls: 'danger', data: { action: 'am-q-rm', id: a.id, item: i.id }, disabled: !!i.result }], { text: 'Edit', icon: 'pencil', cls: 'btn sm ghost' })}</div>` : ''}</div>
        <div class="ci-sec"><h4>Expected evidence</h4>${i.expected.length ? `<ul class="exp-list">${i.expected.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted small">None listed.</p>'}</div>
        <div class="ci-sec"><h4>Available QMS evidence <span class="muted small">${sys.some(x => x.area) ? `no document is mapped to ${esc(i.sub)} — showing area ${esc(Q.proc(i.area).process_code)} documents` : `found from area ${esc(Q.proc(i.area).process_code)} and clause ${esc(i.sub)}`}</span></h4>
          ${all.length ? `<ul class="sysev">${all.map(x => { const inf = AM.evInfo(x), done = rev.has(x.kind + x.id), s = i.reviewed.find(r => r.kind + r.id === x.kind + x.id); return `<li class="${done ? 'done' : ''}"><span class="se-ic">${done ? icon('circle-check') : icon(x.kind === 'doc' ? 'file-text' : 'paperclip')}</span><div class="se-main"><b>${esc(inf.title)}</b><span>${esc(inf.sub)} · ${esc(inf.status)}${inf.restricted ? ' · Confidential: link only' : ''}${s ? ` · reviewed Rev ${esc(s.rev)} by ${esc(Q.pname(s.by))}, ${Q.fmt(s.date)}${x.kind === 'doc' && Q.doc(x.id)?.rev !== s.rev ? ` <span class="snap-moved">now Rev ${esc(Q.doc(x.id).rev)}</span>` : ''}` : ''}</span></div>
            <div class="se-acts">${x.kind === 'doc' ? `<button class="btn sm ghost" type="button" data-action="open-doc" data-id="${esc(x.id)}">View</button>` : `<a class="btn sm ghost" href="#/evidence?focus=${esc(x.id)}">View</a>`}${canAssess ? `<button class="btn sm${done ? '' : ' primary-soft'}" type="button" data-action="am-ev-toggle" data-id="${a.id}" data-item="${i.id}" data-kind="${x.kind}" data-ev="${esc(x.id)}" aria-pressed="${done}">${done ? 'Reviewed' : 'Mark Reviewed'}</button>` : ''}${canAssess && done ? `<button class="btn sm ghost" type="button" data-action="am-raise" data-id="${a.id}" data-item="${i.id}" data-ref="${x.kind}|${esc(x.id)}">Reference in Finding</button>` : ''}</div></li>`; }).join('')}</ul>` : '<p class="muted small">No documents or records in iQMS are mapped to this clause for this area. That may itself be a finding.</p>'}
          ${i.external.map(x => `<div class="ext-ref">${icon('link')}<span><b>External: ${esc(x.ref)}</b> ${esc(x.note || '')} <span class="muted small">— ${esc(Q.pname(x.by))}, ${Q.fmt(x.date)}</span></span></div>`).join('')}
          ${canAssess ? `<button class="link-btn small" type="button" data-action="am-ext" data-id="${a.id}" data-item="${i.id}">${icon('plus')}Add External Evidence Reference</button><span class="small muted"> — only for something reviewed outside iQMS</span>` : ''}</div>
        ${related}</div>
      <div class="ci-side">
        <div class="ci-sec"><h4>Auditor review</h4><p class="small">Evidence reviewed: <b>${i.reviewed.length} of ${all.length}</b></p>
          <label class="field"><span>Auditor notes</span><textarea class="textarea" rows="4" data-notes="${i.id}" data-audit="${a.id}" ${canAssess ? '' : 'readonly'} placeholder="What was sampled, who was interviewed, what was seen">${esc(i.notes)}</textarea></label></div>
        <div class="ci-sec"><h4>Assessment</h4>${canAssess ? `<div class="assess" role="radiogroup" aria-label="Assessment">${AM.RESULTS.map(([v, l, k]) => `<button type="button" role="radio" class="as-${k}" aria-checked="${i.result === v}" data-action="am-assess" data-id="${a.id}" data-item="${i.id}" data-r="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : `<p>${res}</p>`}
          ${i.by ? `<p class="small muted">${esc(Q.pname(i.by))} · ${Q.fmt(i.date)}</p>` : ''}
          ${finding ? `<div class="ci-finding">${icon('search-check')}<span><b>${esc(finding.id)}${finding.nc ? ` / ${esc(finding.nc.no)}` : ''}</b> ${esc(finding.title)}<br>${finding.nc ? `<a class="btn sm" href="#/audits/nc/${finding.nc.no}">Open NC</a>` : `<span class="small muted">${esc(finding.type)} · ${esc(finding.status)}</span>`}</span></div>`
            : i.result && !['Conforming', 'N/A'].includes(i.result) && canAssess ? `<button class="btn sm primary" type="button" data-action="am-raise" data-id="${a.id}" data-item="${i.id}">${icon('plus')}${AM.isNcType(i.result) ? 'Create Nonconformity' : 'Record Finding'}</button>` : ''}</div></div></div></li>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-toggle-item]'); if (!b) return; openItem = openItem === b.dataset.toggleItem ? null : b.dataset.toggleItem; Q.render({ noFocus: true, keepScroll: true }); document.querySelector(`[data-toggle-item="${b.dataset.toggleItem}"]`)?.focus({ preventScroll: true }); });
  document.addEventListener('focusout', e => {
    const t = e.target.closest?.('[data-notes]'); if (!t || t.readOnly) return;
    const a = AM.audit(t.dataset.audit), i = a?.checklist.find(x => x.id === t.dataset.notes); if (!i || i.notes === t.value) return;
    i.notes = t.value; markArea(a, i.area); Q.save(); Q.toast('Notes saved');
  });
  const markArea = (a, pid) => { const ar = AM.area(a, pid); if (ar && ar.status === 'Not started') ar.status = 'In progress'; };
  const itemOf = d => { const a = AM.audit(d.id); return [a, a.checklist.find(x => x.id === d.item)]; };
  Q.actions['am-assess'] = d => {
    const [a, i] = itemOf(d); const prev = i.result;
    if (i.finding && prev !== d.r) { Q.toast('A finding is linked', `Change the classification in ${i.finding} instead, so the record and the checklist stay consistent.`); return; }
    i.result = prev === d.r ? null : d.r; i.by = AM.actor(); i.date = Q.today(); markArea(a, i.area);
    if (i.result) AM.log(a, `assessed ${i.sub} (${Q.proc(i.area).name}) as ${AM.short(i.result)}`);
    Q.save(); Q.render({ noFocus: true, keepScroll: true });
  };
  Q.actions['am-ev-toggle'] = d => {
    const [a, i] = itemOf(d), k = d.kind + d.ev, at = i.reviewed.findIndex(s => s.kind + s.id === k);
    if (at >= 0) i.reviewed.splice(at, 1);
    else { const s = AM.snap({ kind: d.kind, id: d.ev }, AM.actor(), Q.today()); i.reviewed.push(s); AM.log(a, `reviewed ${s.title}${s.kind === 'doc' ? ` Rev ${s.rev}` : ''} for ${i.sub}`); }
    markArea(a, i.area); Q.save(); Q.render({ noFocus: true, keepScroll: true });
  };
  Q.actions['am-ext'] = d => {
    const [a, i] = itemOf(d);
    const m = Q.openModal({ size: 's', title: 'Add external evidence reference', sub: 'For something reviewed that is not in iQMS (e.g. an ERP screen, a site visit, a paper form).', body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Reference <span class="req">*</span></span><input class="input" name="ref" required autofocus placeholder="e.g. ERP PO-2026-0412"></label><label class="field"><span>Note</span><input class="input" name="note" placeholder="What it showed"></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Reference</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); i.external.push({ ref: v.ref, note: v.note, by: AM.actor(), date: Q.today() }); AM.log(a, `added external evidence reference “${v.ref}” for ${i.sub}`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); });
  };
  const qForm = (i = {}) => `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr">
    <label class="field"><span>Subclause</span><input class="input tnum" name="sub" value="${esc(i.sub || '')}"></label>
    <label class="field"><span>Audit question <span class="req">*</span></span><textarea class="textarea" name="question" required rows="3">${esc(i.question || '')}</textarea></label>
    <label class="field"><span>Expected evidence</span><textarea class="textarea" name="expected" rows="3" placeholder="One per line">${esc((i.expected || []).join('\n'))}</textarea><span class="help">One per line.</span></label></div></form>`;
  Q.actions['am-q-edit'] = d => { const [a, i] = itemOf(d); const m = Q.openModal({ size: 'm', title: 'Edit question', body: qForm(i), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(i, { sub: v.sub || i.sub, question: v.question.trim(), expected: v.expected.split('\n').map(x => x.trim()).filter(Boolean) }); AM.log(a, `edited checklist question ${i.sub}`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); }); };
  Q.actions['am-q-add'] = d => { const a = AM.audit(d.id); const m = Q.openModal({ size: 'm', title: `Add question — ${esc(d.clause)}`, body: qForm({ sub: d.clause }), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Question</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); const it = { id: itemId(), area: d.area, clause: d.clause, sub: v.sub || d.clause, question: v.question.trim(), expected: v.expected.split('\n').map(x => x.trim()).filter(Boolean), docs: [], notes: '', result: null, reviewed: [], external: [], finding: null, by: null, date: null };
      const last = a.checklist.map(x => x.area === d.area && x.clause === d.clause).lastIndexOf(true); a.checklist.splice(last + 1, 0, it); openItem = it.id; AM.log(a, `added a checklist question for ${it.sub}`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); }); };
  Q.actions['am-q-rm'] = d => { const [a, i] = itemOf(d); Q.confirm({ title: 'Remove question?', danger: true, confirm: 'Remove', body: `<p>${esc(i.question)}</p>`, onConfirm: () => { a.checklist.splice(a.checklist.indexOf(i), 1); AM.log(a, `removed a checklist question for ${i.sub}`); Q.save(); Q.render({ noFocus: true, keepScroll: true }); } }); };
  Q.actions['am-q-link'] = d => { const [a, i] = itemOf(d); const docs = Q.S.documents.filter(x => !['Obsolete', 'Superseded'].includes(x.status));
    const m = Q.openModal({ size: 'm', title: 'Link QMS document', sub: 'The document appears with the available evidence for this question.', body: `<form class="modal-body"><label class="field"><span>Document</span><select class="select" name="doc">${docs.map(x => `<option value="${x.id}">${esc(x.id)} · ${esc(x.title)}</option>`).join('')}</select></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Link</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const v = Q.formValues(m.querySelector('form')); if (!i.docs.includes(v.doc)) i.docs.push(v.doc); AM.log(a, `linked ${v.doc} to checklist question ${i.sub}`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true }); }); };
  Q.actions['am-submit-area'] = d => {
    const a = AM.audit(d.id), ar = AM.area(a, d.area), it = AM.items(a, d.area), left = it.filter(i => !i.result).length, fs = AM.findingsOf(a.id).filter(f => f.process === d.area);
    const m = Q.openModal({ size: 'm', title: `Submit ${esc(Q.proc(d.area).name)} results`, sub: `${it.length - left} of ${it.length} questions assessed · ${fs.length} findings`, body: `<form class="modal-body">${left ? `<div class="callout warning small" style="margin-bottom:12px">${icon('triangle-alert')}<span>${left} question${left === 1 ? ' is' : 's are'} not assessed. Mark them N/A or assess them, or explain in the comments.</span></div>` : ''}
      <div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Area conclusion <span class="req">*</span></span><textarea class="textarea" name="conclusion" required rows="3" placeholder="Is the area effective? Main strengths and weaknesses.">${esc(ar.conclusion || '')}</textarea></label>
      <label class="field"><span>Auditor comments</span><textarea class="textarea" name="comments" rows="3" placeholder="Sampling, interviews, limitations">${esc(ar.comments || '')}</textarea></label></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Submit Area Results</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(ar, { conclusion: v.conclusion.trim(), comments: v.comments.trim(), status: 'Submitted', submitted: { by: AM.actor(), date: Q.today() } });
      AM.log(a, `submitted the ${Q.proc(d.area).name} area results`); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); const n = a.areas.filter(x => x.status === 'Submitted').length; Q.toast('Area results submitted', `${n} of ${a.areas.length} areas complete${n === a.areas.length ? ' — the Lead Auditor can move the audit to reporting.' : ''}`); });
  };

  /* ---------------- record a finding / raise NC ---------------- */
  Q.actions['am-raise'] = d => {
    const a = AM.audit(d.id), i = d.item ? a.checklist.find(x => x.id === d.item) : null;
    const pid = i?.area || (d.area && d.area !== 'all' ? d.area : a.areas[0].process), p = Q.proc(pid);
    const type = i?.result && !['Conforming', 'N/A'].includes(i.result) ? i.result : 'Minor nonconformity';
    const refs = i ? i.reviewed.slice() : [];
    if (d.ref && i) { const [k, id] = d.ref.split('|'); if (!refs.some(s => s.kind === k && s.id === id)) refs.push(AM.snap({ kind: k, id }, AM.actor(), Q.today())); }
    const m = Q.openModal({ size: 'l', title: 'Record finding', sub: `${esc(a.id)} · ${esc(p.name)}${i ? ` · clause ${esc(i.sub)}` : ''}`, body: `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Classification <span class="req">*</span></span><select class="select" name="type">${AM.FINDING_TYPES.map(t => `<option${t === type ? ' selected' : ''}>${t}</option>`).join('')}</select><span class="help">Minor and major nonconformities get an NC number, an owner and a due date.</span></label>
      <label class="field"><span>ISO clause <span class="req">*</span></span><input class="input tnum" name="clause" required value="${esc(i?.sub || '')}"></label>
      ${!i && a.areas.length > 1 ? `<label class="field"><span>Area</span><select class="select" name="area">${a.areas.map(ar => `<option value="${ar.process}"${ar.process === pid ? ' selected' : ''}>${esc(Q.proc(ar.process).name)}</option>`).join('')}</select></label>` : ''}
      <label class="field full"><span>Short title <span class="req">*</span></span><input class="input" name="title" required placeholder="e.g. Initial evaluation missing for two approved suppliers"></label>
      <label class="field full"><span>Finding statement <span class="req">*</span></span><textarea class="textarea" name="statement" required rows="3" placeholder="Requirement, what was found, objective evidence">${esc(i?.notes || '')}</textarea></label>
      <div class="field full nc-only"><span>Responsible owner and due date</span><div class="form-grid"><select class="select" name="owner" aria-label="Responsible owner">${Q.peopleOptions(AM.area(a, pid)?.auditee || p.owner)}</select><input class="input" type="date" name="due" value="${Q.addDays(Q.today(), 30)}" aria-label="Due date"></div></div>
      <div class="field full"><span>Evidence referenced</span>${refs.length ? `<ul class="snap-list">${refs.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : '<p class="small muted">None — mark evidence as reviewed in the checklist to reference it here.</p>'}</div></div></form>`,
      foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Record Finding</button>' });
    const sync = () => m.querySelectorAll('.nc-only').forEach(el => { el.hidden = !AM.isNcType(m.querySelector('[name="type"]').value); });
    m.querySelector('[name="type"]').addEventListener('change', sync); sync();
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), area = v.area || pid, yr = Q.today().slice(0, 4), S = Q.S;
      const fid = `F-${yr}-${String(Math.max(0, ...S.findings.filter(x => x.id.startsWith(`F-${yr}-`)).map(x => +x.id.split('-')[2])) + 1).padStart(2, '0')}`;
      const fnd = { id: fid, audit: a.id, process: area, clause: v.clause.trim(), type: v.type, auditor: AM.actor(), raised: Q.today(), status: 'Open', action: null, title: v.title.trim(), statement: v.statement.trim(), evidence: refs, checklistItem: i?.id || null };
      if (AM.isNcType(v.type)) {
        const no = `NC-${yr}-${String(Math.max(0, ...AM.ncs().filter(x => x.nc.no.startsWith(`NC-${yr}-`)).map(x => +x.nc.no.split('-')[2])) + 1).padStart(3, '0')}`;
        fnd.nc = { no, classification: /major/i.test(v.type) ? 'Major' : 'Minor', owner: v.owner, due: v.due, status: 'Open', ca: { correction: '', rootCause: '', action: '', owner: v.owner, due: v.due, impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null, comments: [], events: [], seen: {} };
        AM.ncLog(fnd, 'raised the nonconformity'); AM.ncLog(fnd, `notified ${Q.pname(v.owner)} (area owner)`, 'system');
      }
      S.findings.push(fnd);
      if (i) { i.finding = fid; i.result = v.type; i.by = i.by || AM.actor(); i.date = i.date || Q.today(); }
      AM.log(a, `raised ${fid}${fnd.nc ? ` / ${fnd.nc.no}` : ''} (${AM.short(v.type)}, clause ${fnd.clause})`);
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true, keepScroll: true });
      Q.toast(fnd.nc ? 'Nonconformity raised' : 'Finding recorded', fnd.nc ? `${fnd.nc.no} · ${Q.pname(v.owner)} has been notified` : fid);
    });
  };

  function wsFindings(a, area) {
    const rows = () => AM.findingsOf(a.id).filter(f => area === 'all' || f.process === area);
    return { html: `<div class="section-head" style="margin-top:0"><h2>Findings</h2><span class="sub">Structured records: classification, clause, statement and the evidence reviewed. Nonconformities get an NC number and follow-up.</span>${a.status === 'In Progress' && (AM.can('plan', a) || a.areas.some(ar => AM.isAuditorOf(a, ar.process))) ? `<div class="actions"><button class="btn" type="button" data-action="am-raise" data-id="${a.id}" data-area="${area}">${icon('plus')}Record Finding</button></div>` : ''}</div>` +
      Q.table({ id: 'am-f-' + a.id, rows, noun: 'findings', caption: 'Findings', expand: f => `<div class="exp-pad"><p>${esc(f.statement)}</p>${f.evidence?.length ? `<h4 class="small">Evidence</h4><ul class="snap-list">${f.evidence.map(s => `<li>${AM.snapLine(s)}</li>`).join('')}</ul>` : ''}</div>`,
        columns: [
          { key: 'id', label: 'Finding', cls: 'c-id', sort: f => f.id, render: f => `${esc(f.id)}${f.nc ? `<span class="sub">${esc(f.nc.no)}</span>` : ''}` },
          { key: 't', label: 'Finding statement', render: f => `<button class="title-btn" type="button" data-expand>${esc(f.title)}</button><span class="sub">${esc(Q.proc(f.process)?.name)} · raised by ${esc(Q.pname(f.auditor))} · ${Q.fmt(f.raised)}</span>` },
          { key: 'c', label: 'Clause', sort: f => Q.clauseSort(f.clause), render: f => `<span class="clause">${esc(f.clause)}</span>` },
          { key: 'k', label: 'Classification', sort: f => f.type, render: f => `<span class="st ${AM.typeKind(f.type)}">${esc(AM.short(f.type))}</span>` },
          { key: 'o', label: 'Owner', render: f => f.nc ? `<span class="nowrap">${esc(Q.pname(f.nc.owner))}</span>` : '<span class="muted">—</span>' },
          { key: 's', label: 'Status', sort: f => f.status, render: f => f.nc ? Q.st(f.nc.status, AM.NC_KIND[f.nc.status]) : Q.st(f.status, f.status === 'Closed' ? 'muted' : 'neutral') },
          { key: 'x', label: 'Actions', cls: 'c-actions', render: f => f.nc ? `<a class="btn sm" href="#/audits/nc/${f.nc.no}">Open NC</a>` : f.status === 'Open' && AM.can('plan', a) ? `<button class="btn sm" type="button" data-action="am-f-close" data-id="${f.id}">Acknowledge</button>` : '' }],
        empty: '<h3>No findings yet</h3><p>Findings are recorded from the checklist during the audit.</p>' }) };
  }
  Q.actions['am-f-close'] = d => { const f = Q.S.findings.find(x => x.id === d.id), a = AM.audit(f.audit); f.status = 'Closed'; AM.log(a, `acknowledged ${f.id} (${AM.short(f.type)}) with the auditee`); Q.save(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Finding acknowledged', f.id); };

  function wsActions(a, area) {
    const ncs = AM.findingsOf(a.id).filter(f => f.nc && (area === 'all' || f.process === area));
    return { html: `<div class="section-head" style="margin-top:0"><h2>Corrective actions</h2><span class="sub">Each nonconformity follows: raised → owner responds → root cause → correction → corrective action → evidence → auditor verification → closed. Publishing the report does not close them.</span></div>` +
      (ncs.length ? `<section class="panel"><div class="table-scroll"><table class="dt"><caption class="sr-only">Corrective actions</caption><thead><tr><th>NC</th><th>Nonconformity</th><th>Owner</th><th>Corrective action</th><th class="c-date">Due</th><th>Verification</th><th>Status</th><th class="c-actions">Actions</th></tr></thead><tbody>${ncs.map(f => `<tr><td class="c-id">${esc(f.nc.no)}<span class="sub">${esc(f.nc.classification)}</span></td><td><span class="title">${esc(f.title)}</span><span class="sub">${esc(Q.proc(f.process).name)} · ${esc(f.clause)}</span></td><td class="nowrap">${esc(Q.pname(f.nc.owner))}</td>
        <td><span class="small">${f.nc.ca?.action ? esc(f.nc.ca.action) : '<span class="muted">Not yet submitted</span>'}</span>${f.action ? `<span class="sub"><a href="#/capa?focus=${f.action}">${esc(f.action)}</a> · ${esc(f.nc.ca?.impl || '')}</span>` : ''}</td><td class="c-date">${Q.dueDate(f.nc.due, ['Verification Required', 'Verified', 'Closed'].includes(f.nc.status))}</td>
        <td>${f.nc.verification ? `${Q.st(f.nc.verification.result, 'success')}<span class="sub">${esc(Q.pname(f.nc.verification.by))}</span>` : '<span class="muted small">—</span>'}</td><td>${Q.st(f.nc.status, AM.NC_KIND[f.nc.status])}</td><td class="c-actions"><a class="btn sm" href="#/audits/nc/${f.nc.no}/action">Open NC</a></td></tr>`).join('')}</tbody></table></div></section>` : '<section class="panel"><div class="empty"><h3>No nonconformities</h3><p>Corrective actions appear here when a minor or major nonconformity is raised.</p></div></section>') };
  }

  function wsActivity(a) {
    const nc = AM.findingsOf(a.id).filter(f => f.nc).flatMap(f => [...f.nc.events.map(e => ({ ...e, text: `${f.nc.no}: ${e.text}` })), ...f.nc.comments.map(c => ({ at: c.at, who: c.who, text: `${f.nc.no}: commented — “${c.text.length > 90 ? c.text.slice(0, 90) + '…' : c.text}”` }))]);
    const rep = (a.report.history || []).map(h => ({ ...h, text: `Report: ${h.text}` }));
    const all = [...a.activity, ...nc, ...rep].sort((x, y) => x.at < y.at ? 1 : -1);
    return { html: `<div class="section-head" style="margin-top:0"><h2>Activity</h2><span class="sub">Audit trail: who did what and when. Entries cannot be edited or deleted.</span></div><section class="panel"><ul class="activity am-act">${all.map(e => `<li><span class="avatar sm">${e.who === 'system' ? icon('bell') : esc(Q.initials(e.who))}</span><span><b>${e.who === 'system' ? 'iQMS' : esc(Q.pname(e.who))}</b> ${esc(e.text)}</span><span class="when">${AM.at(e.at)}</span></li>`).join('') || '<li class="muted">No activity yet.</li>'}</ul></section>` };
  }

  /* ---------------- print the plan (simple; the reports have the full layout) ---------------- */
  Q.actions['am-print'] = d => { Q.go(`#/audits/a/${d.id}/print?kind=${d.kind || 'report'}`); };

  /* ====================================================================== ISO readiness connection
   * Readiness is not only "a document exists": each requirement also shows its audit status,
   * open nonconformities and overdue corrective actions. */
  AM.fam = fam;
  AM.clauseAudit = r => {
    const c = r.clause, fs = Q.S.findings.filter(f => fam(f.clause, c)), open = fs.filter(AM.ncOpen);
    const overdueCA = open.filter(f => AM.ncOverdue(f) || (f.action && Q.S.actions.some(x => x.id === f.action && Q.actionOverdue(x))));
    const audited = Q.S.audits.filter(a => a.checklist?.some(i => i.result && fam(i.sub, c))).sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
    const planned = Q.S.audits.filter(a => !a.checklist?.some(i => i.result) && a.areas.some(ar => AM.clausesOf(a, ar).some(x => fam(x, c))) && a.status !== 'Closed').sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1)[0];
    const last = audited[0];
    const docs = r.status === 'Missing' ? 'Missing' : r.controls.length ? 'Documented' : 'No controlling document';
    return `<div class="aud-strip"><span>Documentation <b>${esc(docs)}</b></span><span>Audit ${last ? `<a href="#/audits/a/${last.id}"><b>${last.status === 'In Progress' ? 'In progress' : 'Completed'}</b> ${esc(last.id)}${last.date ? ` · ${Q.fmt(last.date)}` : ''}</a>` : planned ? `<a href="#/audits/a/${planned.id}">Planned ${esc(planned.id)}${planned.date ? ` · ${Q.fmt(planned.date)}` : ''}</a>` : '<b class="warnv">Not audited</b>'}</span>
      <span>Open NC ${open.length ? `<a class="attn" href="#/audits/nc?clause=${encodeURIComponent(c)}">${open.length}</a>` : '<b>0</b>'}</span><span>Overdue corrective action ${overdueCA.length ? `<b class="attn">${overdueCA.length}</b>` : '<b>0</b>'}</span></div>`;
  };

  /* boot: data upgrade before the first render */
  const boot = Q.boot; Q.boot = () => { AM.init(); boot(); };
})();
