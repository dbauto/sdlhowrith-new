/* iQMS — Audit Management, model 2 (Update 15). THE RULE: ONE AUDIT = ONE PROCESS.
 *
 *   Audit Programme  → groups and monitors many process audits (planning layer only)
 *   Process Audit    → trigger (planned / triggered by a risk, NC, complaint …), plan, applicable clauses,
 *                      schedule with sessions, auditor assignments, checklist, existing QMS evidence,
 *                      findings, nonconformities, one controlled audit report, follow-up, activity
 *
 * Records reuse the existing stores: Q.S.audits, Q.S.auditProgrammes, Q.S.findings (NCs carry `nc`),
 * Q.S.actions (corrective actions), Q.S.documents / revisions (evidence and snapshots), the processes'
 * "ISO 9001 clauses" (Settings → Process ↔ ISO Clauses) and Q.S.people / users.
 *
 * This file: constants, model helpers, assignment enforcement, evidence, permissions, migration from
 * model 1, Overview, Programme, Calendar, Audit Register, clause mapping settings, ISO readiness hook.
 * Plan Builder + checklist templates: audit-builder.js. Audit workspace: audit-workspace.js.
 * NC register / workspace: audit-nc.js. Report, editor, print: audit-report.js. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM = {};
  const SEED = window.QMS_DATA;

  /* ====================================================================== constants */
  AM.STATUSES = ['Draft', 'Planned', 'Scheduled', 'Preparation', 'In Progress', 'Reporting', 'Follow-up', 'Closed'];
  AM.ST_KIND = { Draft: 'muted', Planned: 'neutral', Scheduled: 'info', Preparation: 'info', 'In Progress': 'warning', Reporting: 'orange', 'Follow-up': 'orange', Closed: 'success', Overdue: 'danger' };
  AM.PROG_STATUSES = ['Draft', 'For Approval', 'Approved', 'Active', 'Completed', 'Archived'];
  AM.PROG_KIND = { Draft: 'neutral', 'For Approval': 'info', Approved: 'success outline', Active: 'success', Completed: 'muted', Archived: 'muted' };
  AM.TRIGGER_SOURCES = ['Risk', 'Nonconformity', 'Corrective Action Follow-up', 'Customer Complaint', 'Incident', 'Performance / KPI Issue', 'Previous Audit Finding', 'Management Request', 'Other'];
  AM.ROLES = ['Lead Auditor', 'Auditor', 'Technical Expert', 'Observer'];
  AM.ASG_KIND = { 'Not Started': 'neutral', 'In Progress': 'warning', 'Ready to Submit': 'info', Submitted: 'success', 'No questions': 'muted' };
  AM.NC_STATUSES = ['Open', 'Action Assigned', 'In Progress', 'Verification Required', 'Verified', 'Closed'];
  AM.NC_KIND = { Open: 'danger', 'Action Assigned': 'warning', 'In Progress': 'info', 'Verification Required': 'orange', Verified: 'success outline', Closed: 'muted' };
  AM.REPORT_KIND = { 'Not started': 'neutral', Draft: 'neutral', 'For Review': 'info', Approved: 'success outline', Published: 'success' };
  AM.RESULTS = [
    ['Conforming', 'Conforming', 'success'], ['Observation', 'Observation', 'info'], ['Opportunity for improvement', 'OFI', 'info'],
    ['Minor nonconformity', 'Minor NC', 'warning'], ['Major nonconformity', 'Major NC', 'danger'], ['N/A', 'N/A', 'muted']];
  AM.FINDING_TYPES = AM.RESULTS.slice(1, 5).map(r => r[0]);
  AM.isNcType = t => /nonconformity/i.test(t || '');
  AM.short = t => (AM.RESULTS.find(r => r[0] === t) || [, t])[1];
  AM.typeKind = t => (AM.RESULTS.find(r => r[0] === t) || [, , 'neutral'])[2];
  // Checklist item types. Headings and instructions structure the form; they are not answered.
  AM.ITEM_TYPES = [['assessment', 'Audit assessment'], ['yesno', 'Yes / No / N/A'], ['text', 'Text / auditor notes'], ['choice', 'Multiple choice'], ['number', 'Numeric'], ['date', 'Date'], ['evidence', 'Evidence review'], ['docref', 'Document reference'], ['heading', 'Section heading'], ['instruction', 'Instruction / guidance']];
  AM.itemType = t => (AM.ITEM_TYPES.find(x => x[0] === t) || [, t])[1];
  AM.answerable = i => !['heading', 'instruction'].includes(i.type);

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
  AM.fam = fam;

  /* Question bank: suggestions only. The Lead Auditor edits, adds and removes questions per audit. */
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
    ['7.1.2', 'Are enough competent people available to operate the process?', ['Headcount plan', 'Competency requirements']],
    ['7.1.3', 'Is the infrastructure needed for the process provided and maintained?', ['Equipment register', 'Maintenance plan']],
    ['7.1.5', 'Are measuring instruments calibrated or verified at intervals, identified and safeguarded?', ['Calibration register', 'Calibration certificates', 'Recall records']],
    ['7.2', 'Are competence requirements defined, and is competence evaluated before people work unsupervised?', ['Competency requirements', 'Training records', 'Competence evaluations']],
    ['7.3', 'Are people aware of the quality policy, relevant objectives and the implications of not conforming?', ['Toolbox talk attendance', 'Interviews']],
    ['7.4', 'Is it defined what is communicated to external providers and internally, when, and by whom?', ['Procurement Procedure', 'Purchase orders']],
    ['7.5', 'Are the process documents controlled (approved, current revision available at point of use) and records retained?', ['Document register', 'Records at point of use']],
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
    ['8.5.1', 'Is the work carried out under controlled conditions (current work instructions, competent people, inspections)?', ['Work instructions', 'Inspection checklists', 'Site records']],
    ['8.5.2', 'Can materials and installed equipment be identified and traced (serial numbers, batches)?', ['Traceability records', 'Goods receipt log']],
    ['8.5.4', 'Are materials preserved during storage, handling and transport?', ['Storage conditions', 'Preservation work instruction']],
    ['8.5.5', 'Are warranty and post-delivery obligations met?', ['Warranty claims log', 'Service records']],
    ['8.6', 'Is release to the customer authorized only after planned tests are completed and recorded?', ['Commissioning reports', 'Test records']],
    ['8.7', 'Are nonconforming outputs identified, segregated and dispositioned, with records kept?', ['Nonconforming material records', 'Disposition decisions']],
    ['9.1', 'Does the process monitor and analyse the performance indicators assigned to it?', ['KPI results', 'Trend analysis']],
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
    if (!list.length) list = [[clause, `Is clause ${clause} (${AM.clTitle(clause)}) implemented in this process, with evidence retained?`, ['Procedures', 'Records']]];
    return list.map(([c, q, ev]) => ({ clause: Q.clauseIn(c, clause) ? c : clause, q, ev }));
  };

  /* ====================================================================== accessors */
  AM.audit = id => Q.S.audits.find(a => a.id === id);
  AM.prog = id => Q.S.auditProgrammes.find(p => p.id === id);
  AM.progName = id => AM.prog(id)?.name || '';
  AM.progAudits = pid => Q.S.audits.filter(a => a.programme === pid && a.status !== 'Draft');
  AM.findingsOf = id => Q.S.findings.filter(f => f.audit === id);
  AM.ncs = () => Q.S.findings.filter(f => f.nc);
  AM.ncByNo = no => Q.S.findings.find(f => f.nc?.no === no);
  AM.ncOpen = f => f.nc && f.nc.status !== 'Closed';
  // Overdue = the owner's part is late. Once submitted for verification or verified, the clock is with the auditor.
  AM.ncOverdue = f => AM.ncOpen(f) && !['Verification Required', 'Verified'].includes(f.nc.status) && f.nc.due && f.nc.due < Q.today();
  AM.pname = a => Q.proc(a.process)?.name || '—';
  AM.pcode = a => Q.proc(a.process)?.process_code || '';
  // Dates come from the audit sessions (one audit can take several days; it is still one audit).
  AM.sortedSessions = a => (a.sessions || []).slice().sort((x, y) => (x.date + x.start) < (y.date + y.start) ? -1 : 1);
  AM.startDate = a => AM.sortedSessions(a)[0]?.date || null;
  AM.endDate = a => AM.sortedSessions(a).slice(-1)[0]?.date || null;
  AM.dateRange = a => { const s = AM.startDate(a), e = AM.endDate(a); return !s ? `<span class="muted">${esc(a.plannedPeriod || 'Not scheduled')}</span>` : e !== s ? `${Q.fmt(s)} – ${Q.fmt(e)}` : Q.fmt(s); };
  AM.dateText = a => { const s = AM.startDate(a), e = AM.endDate(a); return !s ? (a.plannedPeriod || 'Not scheduled') : e !== s ? `${Q.fmt(s)} – ${Q.fmt(e)}` : Q.fmt(s); };
  AM.overdue = a => ['Planned', 'Scheduled', 'Preparation'].includes(a.status) && !!AM.startDate(a) && AM.startDate(a) < Q.today();
  AM.badge = a => `${Q.st(a.status, AM.ST_KIND[a.status])}${AM.overdue(a) ? ` ${Q.st('Overdue', 'danger')}` : ''}`;
  AM.triggerLabel = a => a.trigger?.type === 'Triggered' ? `Triggered · ${a.trigger.source || 'Other'}` : 'Planned';
  AM.triggerChip = a => a.trigger?.type === 'Triggered' ? `<span class="trig trig-t" title="${esc(a.trigger.reason || '')}">${icon('flag')}Triggered · ${esc(a.trigger.source || 'Other')}${a.trigger.record ? ` <b class="tnum">${esc(a.trigger.record)}</b>` : ''}</span>` : '<span class="trig">Planned</span>';
  // Link to the record that triggered an audit (risk, NC, corrective action …).
  AM.recordLink = (source, rec) => {
    if (!rec) return '<span class="muted">—</span>';
    const S = Q.S;
    if (source === 'Risk') { const r = S.risks.find(x => x.id === rec); return r ? `<a href="#/risks?focus=${esc(rec)}"><b class="tnum">${esc(rec)}</b> ${esc(r.title)}</a>` : esc(rec); }
    if (source === 'Nonconformity' || source === 'Previous Audit Finding') { const f = AM.ncByNo(rec) || S.findings.find(x => x.id === rec); return f ? `<a href="${f.nc ? `#/audits/nc/${f.nc.no}` : `#/audits/a/${f.audit}/findings`}"><b class="tnum">${esc(rec)}</b> ${esc(f.title)}</a>` : esc(rec); }
    if (source === 'Corrective Action Follow-up') { const c = S.actions.find(x => x.id === rec); return c ? `<a href="#/capa?focus=${esc(rec)}"><b class="tnum">${esc(rec)}</b> ${esc(c.title)}</a>` : esc(rec); }
    if (source === 'Performance / KPI Issue') { const k = S.kpis.find(x => x.id === rec); return k ? `<a href="#/qms/objectives?focus=${esc(rec)}"><b class="tnum">${esc(rec)}</b> ${esc(k.name)}</a>` : esc(rec); }
    return esc(rec);
  };
  // Audits started because of a record (risk, NC, corrective action …) — shown as a link back on that record.
  AM.triggeredBy = rec => Q.S.audits.filter(a => a.trigger?.type === 'Triggered' && a.trigger.record === rec && a.status !== 'Draft');
  // Records that can trigger an audit, by source.
  AM.recordOptions = (source, pid) => {
    const S = Q.S, near = x => !pid || Q.inProc(x.process, pid) || Q.inProc(pid, x.process);
    const sortP = list => list.slice().sort((a, b) => near(b) - near(a));
    if (source === 'Risk') return sortP(S.risks.filter(r => r.kind === 'Risk' && Q.riskOpen(r))).map(r => [r.id, `${r.id} · ${r.title}`]);
    if (source === 'Nonconformity') return sortP(AM.ncs()).map(f => [f.nc.no, `${f.nc.no} · ${f.title}`]);
    if (source === 'Previous Audit Finding') return sortP(S.findings).map(f => [f.nc?.no || f.id, `${f.nc?.no || f.id} · ${f.title}`]);
    if (source === 'Corrective Action Follow-up') return sortP(S.actions).map(c => [c.id, `${c.id} · ${c.title}`]);
    if (source === 'Performance / KPI Issue') return sortP(S.kpis).map(k => [k.id, `${k.id} · ${k.name}`]);
    return [];
  };
  AM.now = () => `${Q.today()} ${new Date().toTimeString().slice(0, 5)}`;
  AM.at = s => { if (!s) return ''; const [d, t] = String(s).split(' '); return `${Q.fmt(d)}${t ? ` · ${t}` : ''}`; };
  AM.ago = s => { if (!s) return ''; const [d, t = '12:00'] = String(s).split(' '); const mins = Math.round((Date.now() - new Date(`${d}T${t}:00`)) / 6e4); if (mins < 1) return 'just now'; if (mins < 60) return `${mins} min ago`; if (mins < 1440) return `${Math.round(mins / 60)} h ago`; const days = Math.round(mins / 1440); return days < 31 ? `${days} d ago` : Q.fmt(d); };
  let seq = 0;
  AM.uid = p => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

  /* ====================================================================== checklist & assignments
   * A checklist item is answered by exactly one auditor (item.assignee). Assigning clauses to an auditor
   * assigns the matching questions; the Lead Auditor can also assign a single question to someone. */
  AM.items = a => a.checklist || [];
  AM.counted = a => AM.items(a).filter(AM.answerable);
  AM.complete = i => {
    if (!AM.answerable(i)) return true;
    if (i.type === 'assessment') return !!i.result && (i.result !== 'N/A' || !!(i.naReason || '').trim());
    if (i.type === 'evidence') return (i.reviewed || []).length > 0 || i.answer === 'Reviewed';
    if (i.type === 'docref') return (i.docs || []).length > 0 || !!String(i.answer || '').trim();
    if (i.type === 'yesno' && i.answer === 'N/A') return !!(i.naReason || '').trim();
    return i.answer != null && String(i.answer).trim() !== '';
  };
  AM.progress = (a, who) => { const it = AM.counted(a).filter(i => !who || i.assignee === who); return it.length ? Math.round(it.filter(AM.complete).length / it.length * 100) : 0; };
  AM.asg = (a, who) => (a.assignments || []).find(x => x.who === who);
  AM.itemsOf = (a, who) => AM.counted(a).filter(i => i.assignee === who);
  AM.lead = a => a.auditor;
  AM.asgStatus = (a, s) => {
    if (s.submitted) return 'Submitted';
    const mine = AM.itemsOf(a, s.who); if (!mine.length) return 'No questions';
    const done = mine.filter(AM.complete); if (!done.length) return 'Not Started';
    return mine.filter(i => i.required).every(AM.complete) ? 'Ready to Submit' : 'In Progress';
  };
  // Which auditor a question goes to: the auditor whose assigned clauses match it most specifically, else the Lead Auditor.
  AM.assigneeFor = (a, clause) => {
    let best = null, depth = -1;
    (a.assignments || []).filter(s => s.role !== 'Observer').forEach(s => (s.clauses || []).forEach(c => { if (fam(c, clause)) { const d = c.split('.').length; if (d > depth) { depth = d; best = s.who; } } }));
    return best || a.auditor;
  };
  AM.applyAssignments = a => { AM.items(a).forEach(i => { if (!AM.answerable(i)) { i.assignee = null; return; } if (!i.manual || !AM.asg(a, i.assignee)) { i.assignee = AM.assigneeFor(a, i.clause); i.manual = false; } }); };
  AM.newItem = (o = {}) => ({ id: AM.uid('q'), section: null, clause: '', question: '', type: 'assessment', required: true, assignee: null, manual: false, expected: [], docs: [], options: [], answer: null, result: null, naReason: '', notes: '', reviewed: [], external: [], finding: null, by: null, date: null, ...o });
  AM.newSection = (clause, title) => ({ id: AM.uid('sec'), clause: clause || '', title: title || (clause ? AM.clTitle(clause) : 'Section') });
  // Build sections and questions: from a template, or from the applicable clauses (process default), or empty.
  AM.genChecklist = (a, { source = 'default', template = null } = {}) => {
    const sections = [], items = [];
    const tpl = source === 'template' ? Q.S.auditTemplates.find(t => t.id === template) : source === 'default' ? Q.S.auditTemplates.find(t => t.process === a.process && t.status === 'Active') : null;
    if (tpl) {
      const map = {};
      tpl.sections.forEach(s => { const sec = AM.newSection(s.clause, s.title); map[s.key] = sec; sections.push(sec); });
      tpl.items.forEach(t => items.push(AM.newItem({ section: map[t.sec]?.id, clause: map[t.sec]?.clause || '', question: t.question, type: t.type, required: t.required, expected: (t.expected || []).slice(), options: (t.options || []).slice() })));
      // Clauses of the audit the template does not cover still get questions.
      a.clauses.filter(c => !tpl.sections.some(s => s.clause && fam(s.clause, c))).forEach(c => { const sec = AM.newSection(c); sections.push(sec); AM.questionsFor(c).forEach(qn => items.push(AM.newItem({ section: sec.id, clause: qn.clause, question: qn.q, expected: qn.ev.slice() }))); });
    } else if (source !== 'blank') {
      a.clauses.slice().sort(AM.clSort).forEach(c => { const sec = AM.newSection(c); sections.push(sec); AM.questionsFor(c).forEach(qn => items.push(AM.newItem({ section: sec.id, clause: qn.clause, question: qn.q, expected: qn.ev.slice() }))); });
    }
    // A technical expert without clauses gets a technical review section of their own.
    (a.assignments || []).filter(s => s.role === 'Technical Expert' && !(s.clauses || []).length).forEach(s => {
      const sec = AM.newSection('', `Technical review — ${s.scope || Q.pname(s.who)}`); sections.push(sec);
      [['evidence', `Review technical evidence: ${s.scope || 'specifications, certificates and test reports'}`, ['Supplier specifications', 'Certificates of conformity']], ['assessment', 'Is the technical evidence adequate for the products and services provided?', ['Technical records']], ['text', 'Technical expert notes', [], false]]
        .forEach(([type, q, ev, req = true]) => items.push(AM.newItem({ section: sec.id, clause: '', question: q, type, expected: ev, required: req, assignee: s.who, manual: true })));
    });
    a.sections = sections; a.checklist = items; AM.applyAssignments(a);
    return a;
  };
  AM.sectionOf = (a, i) => (a.sections || []).find(s => s.id === i.section);
  AM.secItems = (a, sid) => AM.items(a).filter(i => i.section === sid);

  /* ====================================================================== people, roles, permissions
   * In the product this is the signed-in user; the mock lets a reviewer switch role ("Viewing as"). */
  AM.actors = () => {
    const S = Q.S, out = new Map(), add = (id, r) => { if (S.people[id] && S.users.some(u => u.id === id && u.status !== 'Deactivated') && !out.has(id)) out.set(id, r); };
    add(Q.me(), 'QMS Manager · Lead Auditor');
    (S.auditors || []).forEach(x => add(x.who, x.level === 'Observer' ? 'Approver · Observer' : x.level));
    Q.topProcesses().forEach(p => add(p.owner, `Process owner · ${p.name}`));
    add('jun', 'Viewer');
    return [...out.entries()];
  };
  AM.actor = () => (Q.UI.auditActor && AM.actors().some(([id]) => id === Q.UI.auditActor) ? Q.UI.auditActor : Q.me());
  const userRole = id => Q.S.users.find(u => u.id === id)?.role || '';
  AM.isQM = (who = AM.actor()) => ['QMS Manager', 'Administrator'].includes(userRole(who));
  AM.isLead = (a, who = AM.actor()) => a.auditor === who;
  AM.onTeam = (a, who = AM.actor()) => (a.assignments || []).some(s => s.who === who);
  AM.isAuditorOn = (a, who = AM.actor()) => (a.assignments || []).some(s => s.who === who && s.role !== 'Observer');
  AM.can = (what, a, x) => {
    const who = AM.actor(), qm = AM.isQM(who), lead = a && AM.isLead(a, who);
    switch (what) {
      case 'create': case 'configure': return qm;
      case 'programme': return qm;
      case 'plan': return (qm || lead) && a.status !== 'Closed'; // plan, schedule, sessions, team, clauses
      case 'build': return (qm || lead) && ['Draft', 'Planned', 'Scheduled', 'Preparation'].includes(a.status); // edit the checklist
      case 'assess': { const s = AM.asg(a, who); return a.status === 'In Progress' && !!x && x.assignee === who && !!s && !s.submitted; }
      case 'submitWork': { const s = AM.asg(a, who); return a.status === 'In Progress' && !!s && !s.submitted && AM.itemsOf(a, who).length > 0; }
      case 'fieldwork': return (qm || lead) && a.status === 'In Progress';
      case 'record': return a.status === 'In Progress' && (AM.isAuditorOn(a, who) || qm);
      case 'report': return qm || lead;
      case 'review': return a.report.reviewer === who;
      case 'approve': return a.report.approver === who;
      default: return false;
    }
  };
  AM.ncCan = (what, f) => {
    const who = AM.actor(), a = AM.audit(f.audit), auditor = f.auditor === who || (a && (AM.isLead(a, who) || AM.isAuditorOn(a, who))), owner = f.nc.owner === who || f.nc.ca?.owner === who;
    switch (what) {
      case 'comment': return userRole(who) !== 'Viewer';
      case 'respond': return owner || AM.isQM(who);
      case 'verify': return (auditor || AM.isQM(who)) && !owner;
      case 'manage': return auditor || AM.isQM(who);
      default: return false;
    }
  };
  // Independence: an auditor must not audit work they are directly responsible for (owner or same department).
  AM.conflictOf = (who, pid) => { const p = Q.proc(pid); if (!p) return ''; if (p.owner === who) return `owns ${p.name}`; if (Q.person(who).dept && Q.person(who).dept === p.department) return `works in ${p.department}`; return ''; };
  AM.indep = (a, s) => s.role === 'Observer' ? 'Not required' : AM.conflictOf(s.who, a.process) && s.independent !== true ? 'Potential Conflict' : s.independent === true ? 'Independent' : 'Needs Confirmation';
  AM.INDEP_KIND = { 'Not required': 'muted', 'Potential Conflict': 'danger', Independent: 'success', 'Needs Confirmation': 'warning' };

  /* ====================================================================== activity */
  AM.log = (a, text, who = AM.actor()) => { (a.activity = a.activity || []).unshift({ at: AM.now(), who, text }); };
  AM.ncLog = (f, text, who = AM.actor()) => { f.nc.events.push({ at: AM.now(), who, text }); f.nc.last = AM.now(); };

  /* ====================================================================== evidence (existing QMS records) */
  // The revision that was current on a date: historical audit evidence keeps the revision reviewed.
  AM.revAt = (docId, date) => {
    const d = Q.doc(docId); if (!d) return '';
    const pub = (Q.S.revisions[docId] || []).filter(r => r.published && r.published <= date).sort((x, y) => x.published < y.published ? 1 : -1)[0];
    return pub?.rev || d.rev || d.workingRev || '';
  };
  AM.systemEvidence = (pid, clause) => {
    const out = [], seen = new Set(), push = x => { if (!seen.has(x.kind + x.id)) { seen.add(x.kind + x.id); out.push(x); } };
    const docOk = d => d && !['Obsolete', 'Superseded'].includes(d.status);
    if (clause) {
      Q.S.documents.filter(d => docOk(d) && Q.inProc(d.process, pid) && Q.docIso(d).some(c => fam(c, clause))).forEach(d => push({ kind: 'doc', id: d.id }));
      Q.S.iso.filter(r => fam(r.clause, clause)).forEach(r => {
        r.controls.map(Q.doc).filter(docOk).filter(d => r.processes.some(p => Q.inProc(pid, p) || Q.inProc(p, pid)) || Q.inProc(d.process, pid) || ['7.5', '9.2', '10.2'].some(c => fam(c, clause))).forEach(d => push({ kind: 'doc', id: d.id }));
        (r.evidence || []).forEach(e => { const ev = Q.S.evidence.find(x => x.id === e); if (ev && Q.inProc(ev.process, pid)) push({ kind: 'evidence', id: ev.id }); });
      });
      Q.S.evidence.filter(e => Q.inProc(e.process, pid) && e.iso && fam(e.iso, clause)).forEach(e => push({ kind: 'evidence', id: e.id }));
    }
    // Nothing mapped to this clause: the process's own procedures, registers and records are still the evidence.
    if (!out.length) Q.S.documents.filter(d => docOk(d) && Q.inProc(d.process, pid) && ['Procedure', 'Register', 'Form', 'Record', 'Work Instruction', 'Checklist'].includes(d.type)).slice(0, 4).forEach(d => push({ kind: 'doc', id: d.id, area: true }));
    return out.slice(0, 8);
  };
  AM.processEvidence = pid => { const out = new Map(); (Q.proc(pid)?.iso || []).forEach(c => AM.systemEvidence(pid, c).forEach(x => out.set(x.kind + x.id, x))); return [...out.values()]; };
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
  // Everything already in the QMS about a process — loaded when a process is chosen for an audit.
  AM.processContext = pid => {
    const S = Q.S, p = Q.proc(pid), inP = x => Q.inProc(x, pid);
    const prev = S.audits.filter(a => a.process === pid && a.status !== 'Draft').sort((a, b) => (AM.startDate(b) || '') < (AM.startDate(a) || '') ? -1 : 1);
    return { p, owner: p.owner, dept: p.department, clauses: (p.iso || []).slice().sort(AM.clSort), docs: S.documents.filter(d => inP(d.process) && !['Obsolete', 'Superseded'].includes(d.status)),
      evidence: S.evidence.filter(e => inP(e.process)), risks: S.risks.filter(r => inP(r.process) && Q.riskOpen(r)), kpis: S.kpis.filter(k => inP(k.process)),
      audits: prev, findings: S.findings.filter(f => inP(f.process)), openNcs: AM.ncs().filter(f => inP(f.process) && AM.ncOpen(f)), openCas: S.actions.filter(c => inP(c.process) && !Q.actionClosed(c)) };
  };

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

  /* ====================================================================== schedule: sessions and conflicts */
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  AM.allSessions = () => Q.S.audits.filter(a => a.status !== 'Draft').flatMap(a => (a.sessions || []).map(s => ({ a, s })));
  // Overlapping sessions of the same auditor in different audits.
  // Only audits whose fieldwork is still ahead can clash; sessions shared by audits split from one pre-Update-15 audit are not conflicts.
  const live = a => !['Reporting', 'Follow-up', 'Closed'].includes(a.status);
  AM.conflicts = (list = AM.allSessions()) => {
    const out = [], by = {};
    list.forEach(x => (x.s.auditors || []).forEach(w => { (by[w] = by[w] || []).push(x); }));
    Object.entries(by).forEach(([w, xs]) => { for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) { const p = xs[i], q = xs[j]; if (p.a.id !== q.a.id && p.s.date === q.s.date && toMin(p.s.start) < toMin(q.s.end) && toMin(q.s.start) < toMin(p.s.end) && live(p.a) && live(q.a) && !(p.a.migration?.split && p.a.migration.from === q.a.migration?.from)) out.push({ who: w, x: p, y: q }); } });
    return out;
  };
  AM.sessionConflicts = (a, s) => AM.conflicts().filter(c => (c.x.a === a && c.x.s === s) || (c.y.a === a && c.y.s === s));
  // Pre-fieldwork status follows the facts instead of being clicked through.
  AM.ready = a => !!(a.checklist && AM.counted(a).length && AM.counted(a).every(i => i.assignee && AM.asg(a, i.assignee)) && a.assignments.length && (a.sessions || []).length);
  AM.refresh = a => { if (['Planned', 'Scheduled', 'Preparation'].includes(a.status)) a.status = !(a.sessions || []).length ? 'Planned' : AM.ready(a) ? 'Preparation' : 'Scheduled'; };
  AM.prepGaps = a => { const out = []; if (!(a.sessions || []).length) out.push('schedule the audit sessions'); if (!a.checklist || !AM.counted(a).length) out.push('build the checklist'); else if (AM.counted(a).some(i => !i.assignee || !AM.asg(a, i.assignee))) out.push('assign every question to an auditor'); return out; };

  /* ====================================================================== migration from model 1
   * Model 1 (Update 14) let one audit hold several areas. Model 2: one audit = one process.
   * Single-area audits are converted; multi-area audits are split into one audit per process. Findings follow
   * their process; a finding whose process was never part of its audit is flagged "Migration Review Required". */
  AM.migrate = S => {
    const today = Q.today(), legacy = S.auditLegacy = S.auditLegacy || [], out = [];
    (S.auditProgrammes || []).forEach(p => {
      p.name = p.name || p.title || `${p.year} Internal Audit Programme`; p.period = p.period || `Jan – Dec ${p.year}`; p.purpose = p.purpose || ''; p.notes = p.notes || '';
      if (p.status === 'Approved' && S.audits.some(a => a.programme === p.id && ['In Progress', 'Reporting', 'Published', 'Follow-up', 'Closed'].includes(a.status))) p.status = 'Active';
    });
    const statusMap = st => ({ 'Checklist Ready': 'Preparation', Published: 'Follow-up' }[st] || st);
    S.audits.forEach(old => {
      if (!old.areas) { out.push(old); return; }
      const multi = old.areas.length > 1, ids = [];
      old.areas.forEach((ar, idx) => {
        const pid = ar.process, p = Q.proc(pid) || { name: pid, iso: [] }, id = multi ? `${old.id}${String.fromCharCode(65 + idx)}` : old.id; ids.push(id);
        const clauses = (ar.clauses || p.iso || []).slice().sort(AM.clSort);
        const qualifiedLead = w => (S.auditors || []).some(x => x.who === w && x.level === 'Lead Auditor');
        const lead = !multi || ar.auditor === old.auditor || !ar.auditor || !qualifiedLead(ar.auditor) ? old.auditor : ar.auditor;
        const asgs = [{ id: AM.uid('as'), who: lead, role: 'Lead Auditor', clauses: [], sessions: [], scope: '', independent: (old.team.find(t => t.who === lead) || {}).independent ?? null, confirmedAt: (old.team.find(t => t.who === lead) || {}).confirmedAt || null, submitted: null, comments: '', conclusion: '' }];
        const add = (who, role, cl, extra = {}) => { if (!who) return; const ex = asgs.find(s => s.who === who); if (ex) { ex.clauses = [...new Set([...ex.clauses, ...cl])]; return ex; } const t = old.team.find(x => x.who === who) || {}; const s = { id: AM.uid('as'), who, role, clauses: cl, sessions: [], scope: '', independent: t.independent ?? null, confirmedAt: t.confirmedAt || null, submitted: null, comments: '', conclusion: '', ...extra }; asgs.push(s); return s; };
        // The area auditor did the area's work: they hold its clauses (unless they are the lead).
        const worker = ar.auditor && ar.auditor !== lead ? add(ar.auditor, 'Auditor', clauses.slice()) : asgs[0];
        old.team.filter(t => t.who !== lead && t.who !== ar.auditor && (t.areas.includes(pid) || (!t.areas.length && t.role === 'Observer'))).forEach(t => add(t.who, t.role === 'Lead Auditor' ? 'Auditor' : t.role, (t.clauses || []).slice(), { scope: t.role === 'Technical Expert' && !(t.clauses || []).length ? 'Technical review' : '' }));
        if (ar.status === 'Submitted' && ar.submitted) Object.assign(worker, { submitted: { by: ar.submitted.by, date: ar.submitted.date }, conclusion: ar.conclusion || '', comments: ar.comments || '' });
        else if (ar.conclusion) Object.assign(worker, { conclusion: ar.conclusion, comments: ar.comments || '' });
        // Sessions from the old single schedule.
        const sessions = [];
        if (old.date) {
          const auditors = asgs.map(s => s.who), end = old.endDate || old.date, S0 = (title, date, start, endT) => sessions.push({ id: AM.uid('ss'), title, date, start, end: endT, location: old.location || '', auditors: auditors.slice(), notes: '' });
          const plus = (t, m) => { const x = toMin(t) + m; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
          S0('Opening meeting', old.date, old.opening || old.start || '08:30', plus(old.opening || old.start || '08:30', 30));
          for (let d = old.date, n = 0; d <= end && n < 10; d = Q.addDays(d, 1), n++) S0(n ? `Fieldwork — day ${n + 1}` : 'Fieldwork', d, n ? (old.start || '08:30') : plus(old.opening || old.start || '08:30', 30), old.end || '16:30');
          S0('Closing meeting', end, old.closing || '16:00', plus(old.closing || '16:00', 30));
        }
        // Checklist of this area only.
        const sections = [], secBy = {};
        const items = (old.checklist || []).filter(i => i.area === pid).map(i => {
          const cl = i.sub || i.clause, top = i.clause || cl; if (!secBy[top]) { const s = AM.newSection(top); secBy[top] = s; sections.push(s); }
          const by = i.by && asgs.some(s => s.who === i.by) ? i.by : null;
          return { id: i.id, section: secBy[top].id, clause: cl, question: i.question, type: 'assessment', required: true, assignee: by, manual: !!by, expected: i.expected || [], docs: i.docs || [], options: [], answer: null, result: i.result || null,
            naReason: i.result === 'N/A' ? 'Recorded as N/A before the Update 15 migration' : '', notes: i.notes || '', reviewed: i.reviewed || [], external: i.external || [], finding: i.finding || null, by: i.by || null, date: i.date || null };
        });
        const st = statusMap(old.status);
        const a = { id, programme: old.programme || null, process: pid, title: multi ? `${p.name} Internal Audit` : (old.title || `${p.name} Internal Audit`),
          trigger: old.type === 'Follow-up Audit' ? { type: 'Triggered', source: 'Previous Audit Finding', record: ((old.objective || '').match(/NC-\d{4}-\d{3}/) || [])[0] || null, reason: old.objective || '' } : old.type === 'Special Audit' ? { type: 'Triggered', source: 'Other', record: null, reason: old.description || old.objective || '' } : { type: 'Planned', source: null, record: null, reason: '' },
          objective: old.objective || '', scope: multi ? `${p.name}: ${old.scope || ''}` : old.scope || '', criteria: old.criteria || '', description: multi ? `Split from ${old.id} “${old.title}”, which covered ${old.areas.length} processes, during the Update 15 migration (one audit = one process).${old.description ? ' ' + old.description : ''}` : old.description || '',
          clauses, plannedPeriod: old.plannedPeriod || '', auditor: lead, location: old.location || '', mode: /remote/i.test(old.location || '') ? 'Remote' : 'On-site', sessions, assignments: asgs, sections: items.length ? sections : null, checklist: old.checklist ? items : null,
          status: multi && st === 'In Progress' && ar.status === 'Submitted' ? 'Reporting' : st, fieldwork: null, closed: old.closed || null, migration: { from: old.id, date: today, split: multi }, activity: [] };
        if (a.checklist) { AM.applyAssignments(a); if (!a.sections.length) a.sections = null; }
        if (['Reporting', 'Follow-up', 'Closed'].includes(a.status)) a.fieldwork = { by: lead, date: ar.submitted?.date || old.endDate || old.date || today, migrated: true };
        // Report: a single-area report carries over as is; a multi-area report becomes the legacy record.
        const r = old.report || { status: 'Not started' };
        if (!multi) a.report = { ...r, history: r.history || [], revisions: r.revisions || [] };
        else if (r.status === 'Published') a.report = { status: 'Published', rev: r.rev ?? 0, published: r.published, reviewer: r.reviewer, approver: r.approver, reviewed: r.reviewed || null, approved: r.approved || null, compiled: r.compiled || r.published, sections: r.sections || null, history: (r.history || []).map(h => ({ ...h, text: `${h.text} (consolidated report ${old.id})` })), revisions: (r.revisions || []).map(v => ({ ...v, legacy: old.id })), legacyOf: old.id };
        else a.report = { status: 'Not started', rev: null, reviewer: r.reviewer || 'nina', approver: r.approver || 'eric', history: [], revisions: [], legacyOf: ['Draft', 'For Review', 'Approved'].includes(r.status) ? old.id : null, legacyDraft: ['Draft', 'For Review', 'Approved'].includes(r.status) ? r.sections || null : null };
        a.activity = (old.activity || []).map(x => ({ ...x, text: multi ? `${x.text} [${old.id}]` : x.text }));
        a.activity.unshift({ at: AM.now(), who: 'system', text: multi ? `converted from multi-process audit ${old.id} (split into one audit per process)` : `converted to the Update 15 process-audit model` });
        AM.refresh(a); out.push(a);
      });
      if (multi) legacy.push({ id: old.id, title: old.title, processes: old.areas.map(x => x.process), splitInto: ids, report: old.report?.status || 'Not started', migrated: today });
      // Findings follow their process.
      S.findings.filter(f => f.audit === old.id).forEach(f => {
        const idx = old.areas.findIndex(ar => ar.process === f.process || ar.process === Q.rootId(f.process) || Q.inProc(f.process, ar.process));
        if (idx >= 0) { f.audit = ids[idx]; return; }
        f.audit = ids[0];
        f.migrationReview = { reason: `Process ${Q.proc(f.process)?.name || f.process} was not part of ${old.id} (${old.areas.map(ar => Q.proc(ar.process)?.name).join(', ')}).`, legacyAudit: old.id, date: today };
      });
    });
    S.audits = out;
    S.findings.filter(f => f.audit && !S.audits.some(a => a.id === f.audit) && !f.migrationReview).forEach(f => { f.migrationReview = { reason: `Audit ${f.audit} no longer exists.`, legacyAudit: f.audit, date: today }; });
    S.auditModel = 2;
  };
  AM.legacy = id => (Q.S.auditLegacy || []).find(x => x.id === id);

  /* ====================================================================== init */
  AM.init = () => {
    const S = Q.S;
    if (S.auditModel === 2) return;
    if (S.auditModel === 1) { AM.migrate(S); S.auditTemplates = S.auditTemplates || Q.shifted(SEED.auditTemplates); addSeedRisk(S); Q.save(); return; }
    // Data from before Update 14: bring in the sample audit data (dates moved to today).
    if (!S.audits[0]?.sessions) {
      const take = k => Q.shifted(SEED[k]);
      S.audits = take('audits'); S.findings = take('findings');
      S.processes.forEach(p => { const s = SEED.processes.find(x => x.process_id === p.process_id); if (s) p.iso = s.iso.slice(); });
      ['CA-2026-04', 'CA-2026-10'].forEach(id => { const s = SEED.actions.find(x => x.id === id), t = S.actions.find(x => x.id === id); if (s && t) Object.assign(t, { stage: s.stage, status: s.status }); });
      addSeedRisk(S);
    }
    S.auditors = S.auditors || Q.shifted(SEED.auditors);
    S.auditProgrammes = S.auditProgrammes || Q.shifted(SEED.auditProgrammes);
    S.auditTemplates = S.auditTemplates || Q.shifted(SEED.auditTemplates);
    S.audits.forEach(seedAudit);
    S.findings.forEach(f => { if (f.nc) f.nc.last = f.nc.last || [...f.nc.events, ...f.nc.comments].map(x => x.at).sort().pop(); });
    S.auditModel = 2; Q.save();
  };
  function addSeedRisk(S) { if (!S.risks.some(r => r.id === 'R-013')) { const r = SEED.risks.find(x => x.id === 'R-013'); if (r) S.risks.push(Q.shifted(r)); } }
  // Sample audits: ids, generated checklist filled as far as each audit has progressed, report history, activity.
  function seedAudit(a) {
    if (a.seeded) return;
    a.seeded = true; a.activity = a.activity || []; a.clauses = a.clauses || (Q.proc(a.process)?.iso || []).slice().sort(AM.clSort);
    a.sessions.forEach(s => { s.id = s.id || AM.uid('ss'); s.location = s.location ?? a.location; });
    a.assignments.forEach(s => Object.assign(s, { id: s.id || AM.uid('as'), sessions: a.sessions.filter(x => x.auditors.includes(s.who)).map(x => x.id), confirmedAt: s.independent ? `${AM.startDate(a) ? Q.addDays(AM.startDate(a), -7) : Q.today()} 10:00` : null, submitted: null, comments: '', conclusion: '' }));
    a.report = { history: [], revisions: [], ...a.report };
    const fieldwork = ['In Progress', 'Reporting', 'Follow-up', 'Closed'].includes(a.status);
    if (fieldwork || a.status === 'Preparation') AM.genChecklist(a);
    const fs = AM.findingsOf(a.id), done = ['Reporting', 'Follow-up', 'Closed'].includes(a.status), demo = SEED.auditDemo?.[a.id] || {};
    const end = AM.endDate(a) || Q.today();
    if (fieldwork) {
      a.assignments.forEach(s => {
        const mine = AM.itemsOf(a, s.who), share = done ? 1 : (demo[s.who]?.[0] ?? 0), n = Math.round(mine.length * share);
        mine.slice(0, n).forEach((it, k) => {
          const date = (a.sessions.find(x => x.auditors.includes(s.who) && !/meeting/i.test(x.title)) || a.sessions[0])?.date || end;
          const f = it.type === 'assessment' ? fs.find(x => fam(x.clause, it.clause) && !AM.items(a).some(o => o.finding === x.id) && (x.auditor === s.who || !a.assignments.some(o => o.who === x.auditor))) : null;
          Object.assign(it, { by: s.who, date });
          if (it.type === 'assessment') Object.assign(it, { result: f ? f.type : 'Conforming', finding: f?.id || null, reviewed: AM.systemEvidence(a.process, it.clause).slice(0, 2).map(x => AM.snap(x, s.who, date)),
            notes: f ? f.statement : ['Sampled records were complete, current and approved.', 'Interviewed the process owner; practice matches the procedure.', 'Records sampled for the period; no gaps found.'][k % 3] });
          else if (it.type === 'evidence') it.reviewed = AM.systemEvidence(a.process, it.clause).slice(0, 2).map(x => AM.snap(x, s.who, date));
          else if (it.type === 'yesno') it.answer = 'Yes'; else if (it.type === 'number') it.answer = 5; else if (it.type === 'date') it.answer = date; else if (it.type === 'choice') it.answer = it.options[0] || 'Yes';
          else if (it.type === 'docref') it.docs = AM.systemEvidence(a.process, it.clause).filter(x => x.kind === 'doc').slice(0, 1).map(x => x.id);
          else it.answer = 'No issues observed.';
          if (f) f.checklistItem = it.id;
        });
        if (done || demo[s.who]?.[1]) Object.assign(s, { submitted: { by: s.who, date: end }, conclusion: s.role === 'Lead Auditor' ? 'Process effective with the findings recorded.' : 'Assigned clauses assessed; results recorded in the checklist.', comments: '' });
      });
      // Findings raised outside the generated questions still need a checklist line.
      fs.filter(f => !AM.items(a).some(o => o.finding === f.id)).forEach(f => { let sec = a.sections.find(s => s.clause && fam(s.clause, f.clause)); if (!sec) { sec = AM.newSection(f.clause); a.sections.push(sec); } a.checklist.push(AM.newItem({ section: sec.id, clause: f.clause, question: `Specific check: ${f.title}`, assignee: f.auditor && AM.asg(a, f.auditor) ? f.auditor : a.auditor, manual: true, result: f.type, reviewed: f.evidence || [], finding: f.id, by: f.auditor, date: f.raised, notes: f.statement })); f.checklistItem = a.checklist.slice(-1)[0].id; });
      if (done) a.fieldwork = { by: a.auditor, date: end };
    }
    // History for the activity log and report.
    const L = (date, who, text, t = '09:00') => date && a.activity.push({ at: `${date} ${t}`, who, text });
    const first = AM.startDate(a), created = first ? Q.addDays(first, -45) : Q.addDays(Q.today(), -20);
    L(created, 'maria', `created the audit plan (${AM.triggerLabel(a)})`);
    L(created, 'maria', `assigned the audit team: ${a.assignments.map(s => `${Q.pname(s.who)} (${s.role})`).join(', ')}`, '09:05');
    if (first) L(Q.addDays(first, -30), a.auditor, `scheduled ${a.sessions.length} session${a.sessions.length === 1 ? '' : 's'} from ${Q.fmt(first)}`);
    if (a.checklist) L(first ? Q.addDays(first, -7) : created, a.auditor, `prepared the checklist (${AM.counted(a).length} questions from ${a.clauses.length} clauses)`);
    if (fieldwork) L(first, a.auditor, 'held the opening meeting and started the audit', a.sessions[0]?.start || '08:30');
    fs.forEach(f => L(f.raised, f.auditor, `raised ${f.id}${f.nc ? ` / ${f.nc.no}` : ''} (${AM.short(f.type)}, clause ${f.clause})`, '14:00'));
    a.assignments.filter(s => s.submitted).forEach(s => L(s.submitted.date, s.who, 'submitted audit work', '16:30'));
    if (done) L(end, a.auditor, 'completed fieldwork — all assignments submitted', '17:00');
    const r = a.report;
    if (['Draft', 'For Review', 'Approved', 'Published'].includes(r.status)) { const d = Q.addDays(end, 2); L(d, a.auditor, 'generated the audit report (draft)', '10:00'); r.history.push({ at: `${d} 10:00`, who: a.auditor, text: 'Generated draft Rev 0' }); r.compiled = d; }
    if (['For Review', 'Approved', 'Published'].includes(r.status)) { const d = r.submitted || Q.addDays(end, 4); L(d, a.auditor, `submitted the report for review to ${Q.pname(r.reviewer)}`, '11:00'); r.history.push({ at: `${d} 11:00`, who: a.auditor, text: `Submitted for review to ${Q.pname(r.reviewer)}` }); }
    if (r.status === 'Published') {
      const d = r.published; r.reviewed = { by: r.reviewer, date: Q.addDays(d, -2) }; r.approved = { by: r.approver, date: Q.addDays(d, -1) };
      L(r.reviewed.date, r.reviewer, 'completed the report review', '15:00'); L(r.approved.date, r.approver, 'approved the audit report', '16:00'); L(d, a.auditor, `published the audit report Rev ${r.rev}`, '09:30');
      r.history.push({ at: `${r.reviewed.date} 15:00`, who: r.reviewer, text: 'Review completed' }, { at: `${r.approved.date} 16:00`, who: r.approver, text: 'Approved' }, { at: `${d} 09:30`, who: a.auditor, text: `Published Rev ${r.rev}` });
    }
    if (a.status === 'Closed') L(a.closed, a.auditor, 'closed the audit — all nonconformities closed and effective', '16:30');
    a.activity.sort((x, y) => x.at < y.at ? 1 : -1);
  }

  /* ====================================================================== module chrome */
  const SECTIONS = [['overview', 'Overview', '#/audits'], ['programme', 'Programme', '#/audits/programme'], ['calendar', 'Calendar', '#/audits/calendar'], ['list', 'Audits', '#/audits/list'], ['nc', 'Nonconformities', '#/audits/nc'], ['reports', 'Reports', '#/audits/reports']];
  AM.tabs = (items, cur, label, cls = '') => `<div class="tabs ${cls}" role="tablist" aria-label="${esc(label)}">${items.map(([k, l, href, note]) => `<a role="tab" href="${href}" aria-selected="${k === cur}">${l}${note ? `<span class="tab-n">${note}</span>` : ''}</a>`).join('')}</div>`;
  AM.actorSwitch = () => `<label class="actor-switch" title="Demo only: in the product this is the signed-in user. Switch to see what each role can do."><span>${icon('user-round')}Viewing as</span><select class="select" data-actor>${AM.actors().map(([id, r]) => `<option value="${id}"${id === AM.actor() ? ' selected' : ''}>${esc(Q.pname(id))} — ${esc(r)}</option>`).join('')}</select></label>`;
  document.addEventListener('change', e => { const s = e.target.closest('[data-actor]'); if (!s) return; Q.UI.auditActor = s.value; Q.saveUI(); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Viewing as ' + Q.pname(s.value), 'Actions on this page now follow that person’s role.'); });
  AM.chrome = (sec, { title, sub, actions = '', crumbs = null }) => Q.pageHead({ title, sub, crumbs, actions }) +
    `<div class="am-nav">${AM.tabs(SECTIONS.map(([k, l, h]) => [k, l, h, k === 'nc' ? AM.ncs().filter(AM.ncOpen).length || '' : '']), sec, 'Audit management')}${AM.actorSwitch()}</div>`;
  AM.createBtn = (extra = {}) => AM.can('create') ? `<a class="btn primary" href="#/audits/new${Object.keys(extra).length ? '?' + new URLSearchParams(extra) : ''}">${icon('plus')}Create Audit</a>` : '';
  const procDoc = `<button class="btn" type="button" data-action="open-doc" data-id="AUD-PRO-001">${icon('file-text')}Audit Procedure</button>`;
  Q.actions['am-create'] = d => { const p = {}; ['process', 'programme', 'source', 'record'].forEach(k => { if (d[k]) p[k] = d[k]; }); if (d.source) p.trigger = 'Triggered'; Q.go('#/audits/new' + (Object.keys(p).length ? '?' + new URLSearchParams(p) : '')); };

  const ROUTES = {};
  AM.route = (name, fn) => { ROUTES[name] = fn; };
  Q.views.audits = (parts, q) => {
    AM.init();
    Q.S.audits.forEach(AM.refresh);
    const sec = parts[0] || 'overview';
    if (sec === 'a' && parts[1]) return AM.workspace(parts[1], parts[2], q, parts[3]);
    if (sec === 'nc' && parts[1]) return AM.ncWorkspace(parts[1], parts[2], q);
    if (sec === 'nc') return AM.ncRegister(q);
    if (sec === 'reports') return AM.reportsList(q);
    return (ROUTES[sec] || ROUTES.overview)(parts.slice(1), q);
  };

  /* ====================================================================== overview */
  const strip = cells => `<div class="am-strip" role="list">${cells.map(([k, v, d, href, tone]) => `<a role="listitem" href="${href}"><span class="k">${esc(k)}</span><span class="v${v && tone ? ' ' + tone : ''}">${v}</span>${d ? `<span class="d">${d}</span>` : ''}</a>`).join('')}</div>`;
  AM.strip = strip;
  const hbars = (rows, href) => { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<ul class="hbars">${rows.map(([l, n, sub, h]) => `<li><a href="${h || href}"><span class="hb-l">${l}</span><span class="hb-bar"><i style="width:${n / max * 100}%"></i></span><span class="hb-n tnum">${n}</span></a>${sub ? `<span class="hb-sub">${sub}</span>` : ''}</li>`).join('')}</ul>` : '<div class="empty small">No findings yet.</div>'; };
  AM.monthBars = (vals, labels, title) => {
    const W = 300, H = 120, max = Math.max(1, ...vals), bw = 22, step = (W - 30) / vals.length;
    return `<svg class="chart mini-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${labels.map((l, i) => `${l} ${vals[i]}`).join(', ')}">
      <line class="mc-base" x1="20" x2="${W - 6}" y1="${H - 22}" y2="${H - 22}"/>${vals.map((v, i) => { const x = 24 + i * step + (step - bw) / 2, h = v / max * (H - 40), y = H - 22 - h; return `${v ? `<path class="mc-bar" d="M${x} ${H - 22}V${y + 3}q0 -3 3 -3h${bw - 6}q3 0 3 3V${H - 22}Z"/>` : ''}<text class="mc-v" x="${x + bw / 2}" y="${y - 4}" text-anchor="middle">${v || ''}</text><text class="mc-l" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text><rect class="hit" x="${x - 6}" y="10" width="${bw + 12}" height="${H - 32}" data-tip="${esc(`${labels[i]}: ${v} nonconformit${v === 1 ? 'y' : 'ies'} raised`)}"/>`; }).join('')}</svg>`;
  };
  AM.sessionLine = ({ a, s }, conflicts = []) => `<li><div class="w-main"><div class="w-title"><span class="tnum">${esc(s.start)}–${esc(s.end)}</span> · <a href="#/audits/a/${a.id}">${esc(a.id)}</a> ${esc(AM.pname(a))} — ${esc(s.title)}</div><div class="w-meta">${Q.fmt(s.date)} · ${s.auditors.map(Q.pname).map(esc).join(', ')}${s.location ? ` · ${esc(s.location)}` : ''}</div>${conflicts.length ? `<div class="inds"><span class="ind ind-bad">Scheduling conflict</span></div>` : ''}</div>${AM.triggerChip(a)}<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a></li>`;
  AM.hbars = hbars;
  // NC trend and open findings by process — shown on Nonconformities → Trends (Update 20).
  AM.ncTrends = () => {
    const S = Q.S, ncs = AM.ncs(), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = Array.from({ length: 6 }, (_, i) => Q.addDays(Q.today().slice(0, 8) + '15', -30 * (5 - i)).slice(0, 7));
    const byProc = Object.entries(S.findings.filter(f => f.status !== 'Closed' && AM.audit(f.audit)).reduce((o, f) => { const r = Q.rootId(f.process); (o[r] = o[r] || []).push(f); return o; }, {})).sort((a, b) => b[1].length - a[1].length).slice(0, 8)
      .map(([pid, list]) => [`<b class="tnum">${esc(Q.proc(pid)?.process_code)}</b> ${esc(Q.proc(pid)?.name)}`, list.length, `${list.filter(f => AM.isNcType(f.type)).length} NC · ${list.filter(f => !AM.isNcType(f.type)).length} other`, `#/audits/nc?s=all&area=${pid}`]);
    return `<div class="am-charts two">
      <section class="panel"><div class="panel-head"><h2>NC trend</h2><span class="muted small">raised per month</span></div><div class="panel-pad">${AM.monthBars(months.map(m => ncs.filter(f => f.raised.startsWith(m)).length), months.map(m => MON[+m.slice(5, 7) - 1]), 'Nonconformities raised per month')}</div></section>
      <section class="panel"><div class="panel-head"><h2>Open findings by process</h2></div><div class="panel-pad">${hbars(byProc, '#/audits/nc')}</div></section></div>`;
  };
  /* Update 20 — the Audits landing page is a short Summary: four numbers, one "Needs attention" list
   * and the next sessions. Status counts live in Audits, charts in Nonconformities → Trends. */
  AM.route('overview', () => {
    const S = Q.S, A = S.audits.filter(a => a.status !== 'Draft'), today = Q.today();
    const over = A.filter(AM.overdue), active = A.filter(a => ['In Progress', 'Reporting'].includes(a.status));
    const ncs = AM.ncs(), open = ncs.filter(AM.ncOpen), ncOver = ncs.filter(AM.ncOverdue), ver = ncs.filter(f => f.nc.status === 'Verification Required');
    const overCA = S.actions.filter(c => Q.actionOverdue(c) && S.findings.some(f => f.action === c.id && f.nc));
    const conf = AM.conflicts().filter(c => c.x.s.date >= Q.addDays(today, -7));
    const yr = today.slice(0, 4), prog = S.auditProgrammes.find(p => p.year === +yr && !['Archived'].includes(p.status)) || S.auditProgrammes[0];
    const pa = prog ? AM.progAudits(prog.id) : [], pdone = pa.filter(a => ['Follow-up', 'Closed'].includes(a.status)).length;
    const review = S.findings.filter(f => f.migrationReview && !f.migrationReview.resolved);
    const upcoming = AM.allSessions().filter(x => x.s.date >= today && !['Closed'].includes(x.a.status)).sort((x, y) => (x.s.date + x.s.start) < (y.s.date + y.s.start) ? -1 : 1);
    const att = [
      ...review.map(f => ({ icon: 'triangle-alert', title: f.title, meta: `${f.id} · could not be matched to a process audit`, kind: 'Migration review', owner: AM.audit(f.audit)?.auditor, href: `#/audits/a/${f.audit}/findings`, right: Q.ui.badge('Review', 'warning'), tone: 'warning' })),
      ...over.map(a => ({ icon: 'clipboard-check', title: `${AM.pname(a)} audit`, meta: `${a.id} · ${a.status}`, kind: 'Audit', owner: a.auditor, due: AM.sortedSessions(a)[0]?.date, href: `#/audits/a/${a.id}`, right: Q.ui.badge('Overdue', 'danger'), tone: 'danger' })),
      ...ncOver.map(f => ({ icon: 'search-check', title: f.title, meta: `${f.nc.no} · ${Q.proc(f.process)?.name || ''}`, kind: 'Nonconformity', owner: f.nc.owner, due: f.nc.due, href: `#/audits/nc/${f.nc.no}`, right: Q.ui.badge('Response overdue', 'danger'), tone: 'danger' })),
      ...overCA.map(c => ({ icon: 'list-checks', title: c.title, meta: `${c.id} · from an audit NC`, kind: 'Corrective action', owner: c.owner, due: c.due, href: `#/capa?status=overdue`, right: Q.ui.badge('Overdue', 'danger'), tone: 'danger' })),
      ...ver.map(f => ({ icon: 'badge-check', title: f.title, meta: `${f.nc.no} · ${Q.proc(f.process)?.name || ''}`, kind: 'Verification', owner: AM.audit(f.audit)?.auditor, due: f.nc.due, href: `#/audits/nc/${f.nc.no}`, right: Q.ui.badge('To verify', 'warning') })),
      ...conf.map(c => ({ icon: 'users', title: `${Q.pname(c.who)} double-booked`, meta: `${c.x.a.id} ${c.x.s.start}–${c.x.s.end} overlaps ${c.y.a.id} ${c.y.s.start}–${c.y.s.end}`, kind: 'Schedule conflict', owner: c.who, due: c.x.s.date, href: `#/audits/calendar?m=${c.x.s.date.slice(0, 7)}&auditor=${c.who}`, right: Q.ui.badge('Conflict', 'warning') }))];
    // Breakdown: checklist progress of the audits that are running now.
    const live = A.filter(a => ['Preparation', 'In Progress', 'Reporting'].includes(a.status)).slice(0, 5);
    const bars = live.map(a => { const all = AM.counted(a), d = all.filter(AM.complete).length, p = all.length ? Math.round(d / all.length * 100) : 0; return { label: `${a.id} ${AM.pname(a)}`, pct: p, value: all.length ? `${d}/${all.length}` : '—', note: `${a.status} · checklist`, href: `#/audits/a/${a.id}/checklist`, tone: AM.overdue(a) ? 'danger' : '' }; });
    const progPct = pa.length ? Math.round(pdone / pa.length * 100) : 0;
    return { title: 'Audits', nav: 'audits', html: AM.chrome('overview', { title: 'Audits', sub: 'Internal audits, one process per audit — ISO 9001 clause 9.2. Nonconformities and corrective actions — clause 10.2.', actions: procDoc + `<a class="btn" href="#/audits/calendar">${icon('calendar')}Calendar</a>` }) +
      Q.ui.summary({
        stats: [
          { label: 'Audits in progress', value: active.length, icon: 'clipboard-check', href: '#/audits/list?s=progress', note: `${A.filter(a => ['Scheduled', 'Preparation'].includes(a.status)).length} scheduled next` },
          { label: 'Open nonconformities', value: open.length, icon: 'search-check', href: '#/audits/nc', tone: open.some(f => f.nc.classification === 'Major') ? 'danger' : null, note: `${open.filter(f => f.nc.classification === 'Major').length} major · ${ver.length} to verify` },
          { label: 'Overdue items', value: over.length + ncOver.length + overCA.length, icon: 'calendar-clock', tone: over.length + ncOver.length + overCA.length ? 'danger' : null, href: '#/audits/nc?s=overdue', note: `${over.length} audit${over.length === 1 ? '' : 's'} · ${ncOver.length} NC${ncOver.length === 1 ? '' : 's'} · ${overCA.length} action${overCA.length === 1 ? '' : 's'}` },
          { label: 'Sessions next 14 days', value: upcoming.filter(x => x.s.date <= Q.addDays(today, 14)).length, icon: 'calendar', href: '#/audits/calendar?view=agenda', note: upcoming[0] ? `next ${Q.fmt(upcoming[0].s.date)}` : 'none scheduled' }],
        breakdown: { title: prog ? prog.name : 'Audit programme', link: { href: `#/audits/programme${prog ? `?p=${prog.id}&view=summary` : ''}`, text: 'Programme' }, rings: { outer: { pct: progPct, label: `Completeness · ${pdone} of ${pa.length} reported` }, inner: { pct: Q.isoScore(S.iso.filter(r => ['9.2', '10.2'].some(c => r.clause === c || r.clause.startsWith(c + '.')))).pct, label: 'ISO readiness', note: 'clauses 9.2 and 10.2' } }, bars, empty: 'No audits running.' },
        attention: att, search: 'Search audits, NCs, actions…', empty: 'Nothing overdue. No NCs waiting for verification.', action: AM.createBtn() }) };
  });

  /* ====================================================================== programme */
  AM.route('programme', (parts, q) => {
    const S = Q.S, progs = S.auditProgrammes.filter(p => q.archived || p.status !== 'Archived'), yr = Q.today().slice(0, 4);
    const pid = S.auditProgrammes.some(p => p.id === q.p) ? q.p : (progs.find(p => p.year === +yr) || progs[0])?.id;
    const prog = AM.prog(pid), view = ['summary', 'coverage'].includes(q.view) ? q.view : 'audits', canP = AM.can('programme');
    const head = AM.chrome('programme', { title: 'Audit Programme', crumbs: [['Audits', '#/audits'], ['Programme']], sub: 'What processes are planned for audit, when, why, by whom, and where each stands. Audit execution happens inside each process audit.', actions: canP ? `<button class="btn" type="button" data-action="am-prog-new">${icon('plus')}Create Audit Programme</button>` : '' });
    if (!prog) return { title: 'Programme · Audits', nav: 'audits', html: head + `<section class="panel"><div class="empty"><h3>No audit programme yet</h3><p>Create the annual programme, then add the process audits it plans.</p>${canP ? `<button class="btn primary" type="button" data-action="am-prog-new">${icon('plus')}Create Audit Programme</button>` : ''}</div></section>` };
    const list = AM.progAudits(prog.id), done = list.filter(a => ['Follow-up', 'Closed'].includes(a.status)).length;
    const next = { Draft: ['For Approval', 'Submit for Approval'], 'For Approval': ['Approved', 'Approve Programme'], Approved: ['Active', 'Activate'], Active: ['Completed', 'Mark Completed'], Completed: ['Archived', 'Archive'] }[prog.status];
    const canNext = next && (next[0] === 'Approved' ? AM.actor() === 'eric' || AM.isQM() && false : canP);
    const sel = `<div class="am-prog-head"><div class="seg" role="group" aria-label="Programme">${progs.map(p => `<a class="seg-a" href="#/audits/programme?p=${p.id}${view !== 'audits' ? '&view=' + view : ''}" aria-current="${p.id === pid}">${esc(p.name.replace(/ Internal Audit Programme$/, ''))}</a>`).join('')}</div>
      <div class="am-prog-meta"><b>${esc(prog.name)}</b> ${Q.st(prog.status, AM.PROG_KIND[prog.status])}<span class="small muted">${esc(prog.period || '')} · Owner ${esc(Q.pname(prog.owner))}${prog.approvedBy ? ` · Approved by ${esc(Q.pname(prog.approvedBy))} ${Q.fmt(prog.approved)}` : ''} · ${list.length} process audits · ${done} reported${prog.doc ? ` · <button class="link-btn" type="button" data-action="open-doc" data-id="${prog.doc}">${esc(prog.doc)}</button>` : ''}</span></div>
      <div class="am-prog-acts">${next && (canNext || next[0] === 'Approved') ? `<button class="btn sm" type="button" data-action="am-prog-status" data-id="${prog.id}" data-to="${next[0]}">${icon(next[0] === 'Approved' ? 'stamp' : 'chevron-right')}${next[1]}</button>` : ''}${canP && prog.status !== 'Archived' ? Q.menu('Programme actions', [{ label: 'Edit Programme', icon: 'pencil', data: { action: 'am-prog-edit', id: prog.id } }, { label: 'Add Process Audit', icon: 'plus', data: { action: 'am-create', programme: prog.id } }, { label: 'Add Existing Audit', icon: 'link', data: { action: 'am-prog-add', id: prog.id } }, '-', { label: 'Open Calendar', icon: 'calendar', data: { action: 'go', href: `#/audits/calendar?prog=${prog.id}` } }], { text: 'More', cls: 'btn sm' }) : ''}</div></div>
      ${prog.purpose ? `<p class="small muted am-prog-purpose">${esc(prog.purpose)}</p>` : ''}`;
    const vt = AM.tabs([['audits', 'Planned audits', `#/audits/programme?p=${pid}`, list.length], ['summary', 'Programme Summary', `#/audits/programme?p=${pid}&view=summary`], ['coverage', 'Process & clause coverage', `#/audits/programme?p=${pid}&view=coverage`]], view, 'Programme view', 'tabs-sub');
    const body = view === 'summary' ? programmeSummary(prog) : view === 'coverage' ? coverage(prog) : programmeAudits(prog, canP);
    return { title: `${prog.name} · Audits`, nav: 'audits', html: head + sel + vt + body };
  });
  function programmeAudits(prog, canP) {
    const rows = () => AM.progAudits(prog.id).slice().sort((a, b) => (Q.proc(a.process)?.display_order || 0) - (Q.proc(b.process)?.display_order || 0) || ((AM.startDate(a) || a.plannedPeriod) < (AM.startDate(b) || b.plannedPeriod) ? -1 : 1));
    return `<div class="section-head" style="margin-top:0"><h2>Planned process audits</h2><span class="sub">One row per process audit. The programme plans; the audit holds the checklist, evidence and findings.</span><div class="actions">${canP && prog.status !== 'Archived' ? `<button class="btn" type="button" data-action="am-prog-add" data-id="${prog.id}">${icon('link')}Add Existing Audit</button><a class="btn primary" href="#/audits/new?programme=${prog.id}">${icon('plus')}Add Process Audit</a>` : ''}</div></div>` +
      Q.table({ id: 'am-prog-' + prog.id, rows, noun: 'process audits', caption: prog.name, search: a => `${a.id} ${a.title} ${AM.pname(a)} ${Q.pname(a.auditor)}`,
        tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search audits, processes, auditors" aria-label="Search programme"></div><select class="select" data-filter="status" aria-label="Audit status"><option value="all">All statuses</option>${AM.STATUSES.slice(1).map(s => `<option>${s}</option>`).join('')}<option>Overdue</option></select>`,
        filters: { status: (a, v) => v === 'Overdue' ? AM.overdue(a) : a.status === v },
        columns: [
          { key: 'p', label: 'Process', sort: a => Q.proc(a.process)?.display_order, render: a => `${Q.pcell(a.process)}<span class="sub tnum">${esc(a.id)}</span>` },
          { key: 't', label: 'Audit', render: a => `<a class="title" href="#/audits/a/${a.id}">${esc(a.title)}</a><span class="sub">${AM.triggerChip(a)}</span>` },
          { key: 'per', label: 'Planned', sort: a => a.plannedPeriod, render: a => `<span class="nowrap">${esc(a.plannedPeriod || '—')}</span>` },
          { key: 'd', label: 'Scheduled', cls: 'c-date', sort: a => AM.startDate(a) || '9', render: a => AM.startDate(a) ? `${AM.dateRange(a)}<span class="sub">${a.sessions.length} session${a.sessions.length === 1 ? '' : 's'}</span>` : '<span class="muted">Not scheduled</span>' },
          { key: 'l', label: 'Lead Auditor', sort: a => Q.pname(a.auditor), render: a => `<span class="nowrap">${esc(Q.pname(a.auditor))}</span><span class="sub">${a.assignments.length} on team</span>` },
          { key: 's', label: 'Status', sort: a => AM.STATUSES.indexOf(a.status), render: a => AM.badge(a) },
          { key: 'f', label: 'Findings', cls: 'c-num', render: a => { const f = AM.findingsOf(a.id), nc = f.filter(x => x.nc); return f.length ? `${f.length}${nc.length ? `<span class="sub">${nc.length} NC</span>` : ''}` : '<span class="zero">—</span>'; } },
          { key: 'x', label: 'Actions', cls: 'c-actions', render: a => `<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a>${canP && ['Draft', 'Planned', 'Scheduled'].includes(a.status) ? Q.menu(`More for ${a.id}`, [{ label: 'Open Plan', icon: 'clipboard-list', data: { action: 'go', href: `#/audits/a/${a.id}/plan` } }, { label: 'Remove from Programme', icon: 'x', data: { action: 'am-prog-remove', id: a.id } }]) : ''}` }],
        empty: '<h3>No process audits in this programme</h3><p>Add a process audit for each process the programme should cover.</p>' });
  }
  function programmeSummary(prog) {
    const S = Q.S, list = AM.progAudits(prog.id), ids = new Set(list.map(a => a.id)), fs = S.findings.filter(f => ids.has(f.audit)), ncs = fs.filter(f => f.nc), open = ncs.filter(AM.ncOpen);
    const repeat = fs.filter(f => S.findings.some(o => o !== f && o.process === f.process && fam(o.clause, f.clause) && o.raised < f.raised && o.audit !== f.audit)), done = list.filter(a => ['Follow-up', 'Closed'].includes(a.status));
    const overCA = S.actions.filter(c => Q.actionOverdue(c) && fs.some(f => f.action === c.id));
    const extra = S.audits.filter(a => !a.programme && a.status !== 'Draft' && (AM.startDate(a) || '').startsWith(String(prog.year)));
    return strip([['Programme completion', `${list.length ? Math.round(done.length / list.length * 100) : 0}%`, `${done.length} of ${list.length} reported`, '#'], ['Audits completed', list.filter(a => a.status === 'Closed').length, 'closed', '#/audits/list?s=closed'], ['Audits overdue', list.filter(AM.overdue).length, 'past first session', '#/audits/list?s=overdue', 'bad'],
        ['Major NCs', ncs.filter(f => f.nc.classification === 'Major').length, '', '#/audits/nc?s=all&cls=Major', 'bad'], ['Minor NCs', ncs.filter(f => f.nc.classification === 'Minor').length, '', '#/audits/nc?s=all&cls=Minor'], ['Open NCs', open.length, '', '#/audits/nc'], ['Repeat findings', repeat.length, 'same process & clause as before', '#', repeat.length ? 'warn' : ''], ['Overdue corrective actions', overCA.length, '', '#/capa?status=overdue', 'bad']]) +
      `<section class="panel"><div class="panel-head"><h2>By process</h2><span class="muted small">Combined reporting across process audits — each audit still has its own controlled report.</span></div><div class="table-scroll"><table class="dt"><caption class="sr-only">Programme summary by process</caption><thead><tr><th>Process</th><th>Audit</th><th>Dates</th><th>Status</th><th class="c-num">Findings</th><th class="c-num">Major NC</th><th class="c-num">Minor NC</th><th class="c-num">Open NC</th><th>Report</th></tr></thead><tbody>
      ${list.slice().sort((a, b) => (Q.proc(a.process)?.display_order || 0) - (Q.proc(b.process)?.display_order || 0)).map(a => { const f = AM.findingsOf(a.id), n = f.filter(x => x.nc); return `<tr><td>${Q.pcell(a.process)}</td><td><a href="#/audits/a/${a.id}" class="tnum">${esc(a.id)}</a></td><td class="nowrap">${AM.dateRange(a)}</td><td>${AM.badge(a)}</td><td class="c-num">${f.length || '<span class="zero">—</span>'}</td><td class="c-num">${Q.num(n.filter(x => x.nc.classification === 'Major').length)}</td><td class="c-num">${n.filter(x => x.nc.classification === 'Minor').length || '<span class="zero">—</span>'}</td><td class="c-num">${Q.num(n.filter(AM.ncOpen).length)}</td><td>${Q.st(a.report.status, AM.REPORT_KIND[a.report.status])}</td></tr>`; }).join('')}</tbody></table></div></section>
      ${extra.length ? `<section class="panel section"><div class="panel-head"><h2>Triggered audits outside this programme</h2><span class="muted small">Shown for monitoring; not counted as programme audits unless added.</span></div><ul class="worklist">${extra.map(a => `<li><div class="w-main"><div class="w-title"><a href="#/audits/a/${a.id}">${esc(a.id)}</a> ${esc(a.title)}</div><div class="w-meta">${esc(AM.pname(a))} · ${AM.dateRange(a)}</div></div>${AM.triggerChip(a)}${AM.badge(a)}${AM.can('programme') ? `<button class="btn sm" type="button" data-action="am-prog-link" data-id="${a.id}" data-p="${prog.id}">Add to Programme</button>` : ''}</li>`).join('')}</ul></section>` : ''}`;
  }
  function coverage(prog) {
    const list = AM.progAudits(prog.id);
    const rows = () => Q.topProcesses().map(p => { const au = list.filter(a => a.process === p.process_id), cl = [...new Set(au.flatMap(a => a.clauses))], map = (p.iso || []); return { ...p, id: p.process_id, au, covered: map.filter(c => cl.some(x => fam(x, c))).length, map: map.length }; });
    return `<p class="small muted" style="margin:0 0 12px">Read-only view. The process ↔ clause mapping is master data — edit it in <a href="#/settings/clause-map">Settings → Process ↔ ISO Clauses</a>.</p>` + Q.table({ id: 'am-cov-' + prog.id, rows, noun: 'processes', caption: 'Coverage by process', columns: [
      { key: 'p', label: 'Process', sort: r => r.display_order, render: r => Q.pcell(r.id) },
      { key: 'o', label: 'Owner', render: r => esc(Q.pname(r.owner)) },
      { key: 'a', label: 'Audits in programme', render: r => r.au.length ? r.au.map(a => `<a class="tnum" href="#/audits/a/${a.id}">${esc(a.id)}</a> ${AM.badge(a)}`).join('<br>') : '<span class="muted">—</span>' },
      { key: 'c', label: 'Mapped clauses covered', render: r => `${Q.miniProgress(r.map ? Math.round(r.covered / r.map * 100) : 0)}<span class="sub">${r.covered} of ${r.map}</span>` },
      { key: 's', label: 'Coverage', sort: r => r.au.length, render: r => r.au.some(a => ['Follow-up', 'Closed'].includes(a.status)) ? Q.st('Audited', 'success') : r.au.length ? Q.st('Planned', 'info') : Q.st('Not in programme', 'danger') },
      { key: 'x', label: 'Actions', cls: 'c-actions', render: r => !r.au.length && AM.can('create') ? `<a class="btn sm" href="#/audits/new?programme=${prog.id}&process=${r.id}">${icon('plus')}Add Audit</a>` : '' }] });
  }
  const progForm = (p = {}) => `<form class="modal-body"><div class="form-grid">
    <label class="field full"><span>Programme name <span class="req">*</span></span><input class="input" name="name" required value="${esc(p.name || '')}" placeholder="e.g. 2027 Internal Audit Programme"></label>
    <label class="field"><span>Year <span class="req">*</span></span><input class="input" type="number" name="year" required min="2020" max="2100" value="${esc(p.year || +Q.today().slice(0, 4) + 1)}"></label>
    <label class="field"><span>Period</span><input class="input" name="period" value="${esc(p.period || '')}" placeholder="e.g. Jan – Dec 2027"></label>
    <label class="field full"><span>Purpose <span class="req">*</span></span><textarea class="textarea" name="purpose" required rows="2" placeholder="Why these audits, and how frequency was decided">${esc(p.purpose || '')}</textarea></label>
    <label class="field"><span>Owner</span><select class="select" name="owner">${Q.peopleOptions(p.owner || AM.actor())}</select></label>
    <label class="field"><span>Status</span><select class="select" name="status">${(p.id ? AM.PROG_STATUSES : ['Draft', 'For Approval']).map(s => `<option${s === (p.status || 'Draft') ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
    <label class="field full"><span>Notes</span><textarea class="textarea" name="notes" rows="2">${esc(p.notes || '')}</textarea></label></div></form>`;
  Q.actions['am-prog-new'] = () => {
    const m = Q.openModal({ size: 'm', title: 'Create Audit Programme', sub: 'The programme plans which process audits happen in the period. Add the audits next.', body: progForm(), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Create Programme</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), S = Q.S;
      let id = `AP-${v.year}`; for (let n = 2; S.auditProgrammes.some(p => p.id === id); n++) id = `AP-${v.year}-${n}`;
      S.auditProgrammes.push({ id, name: v.name.trim(), year: +v.year, period: v.period || `Jan – Dec ${v.year}`, purpose: v.purpose.trim(), owner: v.owner, status: v.status, notes: v.notes, approvedBy: null, approved: null, doc: null, created: Q.today() });
      Q.audit?.('Audits', `created audit programme ${v.name}`); Q.save(); Q.closeAllModals(); Q.go(`#/audits/programme?p=${id}`); Q.toast('Programme created', 'Add the process audits it plans.');
    });
  };
  Q.actions['am-prog-edit'] = d => {
    const p = AM.prog(d.id), m = Q.openModal({ size: 'm', title: `Edit ${esc(p.name)}`, body: progForm(p), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(p, { name: v.name.trim(), year: +v.year, period: v.period, purpose: v.purpose.trim(), owner: v.owner, status: v.status, notes: v.notes }); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Programme saved'); });
  };
  Q.actions['am-prog-status'] = d => {
    const p = AM.prog(d.id), to = d.to;
    if (to === 'Approved' && AM.actor() !== 'eric') { Q.toast('Waiting for approval', `${p.name} is with ${Q.pname('eric')}. Switch “Viewing as” to Eric Navarro to approve it.`); return; }
    Object.assign(p, { status: to }, to === 'Approved' ? { approvedBy: AM.actor(), approved: Q.today() } : {});
    Q.audit?.('Audits', `${p.name}: status changed to ${to}`); Q.save(); Q.render({ noFocus: true }); Q.toast(`Programme ${to.toLowerCase()}`, p.name);
  };
  Q.actions['am-prog-add'] = d => {
    const p = AM.prog(d.id), cands = Q.S.audits.filter(a => a.programme !== p.id && a.status !== 'Draft' && !['Closed'].includes(a.status));
    const m = Q.openModal({ size: 'm', title: `Add existing audit to ${esc(p.name)}`, sub: 'For example a triggered audit that should now count in the programme.', body: `<form class="modal-body">${cands.length ? `<div class="am-pick">${cands.map(a => `<label class="checkbox"><input type="checkbox" name="a" value="${a.id}"><span><b class="tnum">${esc(a.id)}</b> ${esc(a.title)} <span class="muted small">· ${esc(AM.pname(a))} · ${esc(AM.triggerLabel(a))}${a.programme ? ` · now in ${esc(AM.progName(a.programme))}` : ''}</span></span></label>`).join('')}</div>` : '<p class="muted">No other open audits.</p>'}</form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add to Programme</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const ids = [...m.querySelectorAll('[name="a"]:checked')].map(x => x.value); ids.forEach(id => { const a = AM.audit(id); a.programme = p.id; AM.log(a, `added to ${p.name}`); }); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast(`${ids.length} audit${ids.length === 1 ? '' : 's'} added`, p.name); });
  };
  Q.actions['am-prog-link'] = d => { const a = AM.audit(d.id), p = AM.prog(d.p); a.programme = p.id; AM.log(a, `added to ${p.name}`); Q.save(); Q.render({ noFocus: true }); Q.toast('Added to programme', `${a.id} now counts in ${p.name}`); };
  Q.actions['am-prog-remove'] = d => { const a = AM.audit(d.id); Q.confirm({ title: `Remove ${esc(a.id)} from the programme?`, confirm: 'Remove', body: '<p>The audit is kept and stays in the Audit Register and calendar; it no longer counts in the programme.</p>', onConfirm: () => { const p = AM.progName(a.programme); a.programme = null; AM.log(a, `removed from ${p}`); Q.save(); Q.render({ noFocus: true }); } }); };

  /* ====================================================================== calendar */
  AM.route('calendar', (parts, q) => {
    const S = Q.S, view = ['week', 'agenda'].includes(q.view) ? q.view : 'month';
    const f = { prog: q.prog || 'all', proc: q.proc || 'all', auditor: q.auditor || 'all', status: q.status || 'all', trig: q.trig || 'all' };
    const match = ({ a, s }) => (f.prog === 'all' || (f.prog === 'none' ? !a.programme : a.programme === f.prog)) && (f.proc === 'all' || a.process === f.proc) && (f.auditor === 'all' || s.auditors.includes(f.auditor)) && (f.status === 'all' || a.status === f.status) && (f.trig === 'all' || (f.trig === 'Planned' ? a.trigger?.type !== 'Triggered' : a.trigger?.type === 'Triggered' && (f.trig === 'Triggered' || a.trigger.source === f.trig)));
    const all = AM.allSessions().filter(match), conf = AM.conflicts(all);
    const isConf = (a, s) => conf.some(c => (c.x.a === a && c.x.s === s) || (c.y.a === a && c.y.s === s));
    const firstUp = all.filter(x => x.s.date >= Q.today()).sort((x, y) => x.s.date < y.s.date ? -1 : 1)[0]?.s.date;
    const m = /^\d{4}-\d{2}$/.test(q.m || '') ? q.m : (q.d || firstUp || Q.today()).slice(0, 7);
    const [y, mo] = m.split('-').map(Number), MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const qs = o => '#/audits/calendar?' + new URLSearchParams(Object.fromEntries(Object.entries({ view, m, ...f, ...o }).filter(([, v]) => v && v !== 'all' && !(v === 'month' && true)))).toString();
    const ev = ({ a, s }, compact) => `<button type="button" class="cal-ev ce-${esc(a.status.replace(/\s/g, '-').toLowerCase())}${isConf(a, s) ? ' conf' : ''}${a.trigger?.type === 'Triggered' ? ' trg' : ''}" data-cal="${a.id}|${s.id}" title="${esc(`${a.id} ${AM.pname(a)} · ${s.title} · ${s.start}–${s.end} · ${s.auditors.map(Q.pname).join(', ')}`)}">${compact ? `<span class="tnum">${esc(s.start)}</span> <b>${esc(AM.pname(a))}</b>` : `<b class="tnum">${esc(a.id)}</b> ${esc(AM.pname(a))}`}${compact ? '' : ` — ${esc(s.title)}`}${isConf(a, s) ? icon('triangle-alert') : ''}</button>`;
    const byDate = d => all.filter(x => x.s.date === d).sort((x, z) => x.s.start < z.s.start ? -1 : 1);
    let grid = '', nav = '';
    if (view === 'month') {
      const first = new Date(Date.UTC(y, mo - 1, 1)), startDow = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const prev = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`, next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
      nav = `<a class="btn sm" href="${qs({ m: prev })}" aria-label="Previous month">${icon('chevron-right', 'flip-x')}</a><h2>${MON[mo - 1]} ${y}</h2><a class="btn sm" href="${qs({ m: next })}" aria-label="Next month">${icon('chevron-right')}</a>`;
      const cells = []; for (let i = 0; i < startDow; i++) cells.push('<div class="cal-d empty" aria-hidden="true"></div>');
      for (let d = 1; d <= days; d++) { const iso = `${m}-${String(d).padStart(2, '0')}`, list = byDate(iso); cells.push(`<div class="cal-d${iso === Q.today() ? ' today' : ''}"><span class="cal-n">${d}</span>${list.slice(0, 3).map(x => ev(x, true)).join('')}${list.length > 3 ? `<a class="cal-more" href="${qs({ view: 'agenda', d: iso, m: iso.slice(0, 7) })}">+${list.length - 3} more</a>` : ''}</div>`); }
      grid = `<div class="cal" role="grid" aria-label="Audit calendar ${MON[mo - 1]} ${y}">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="cal-h">${x}</div>`).join('')}${cells.join('')}</div>`;
    } else if (view === 'week') {
      const d0 = /^\d{4}-\d{2}-\d{2}$/.test(q.d || '') ? q.d : (m === Q.today().slice(0, 7) ? Q.today() : firstUp && firstUp.startsWith(m) ? firstUp : `${m}-01`);
      const dt = new Date(d0 + 'T00:00:00Z'), mon = Q.addDays(d0, -((dt.getUTCDay() + 6) % 7)), week = Array.from({ length: 7 }, (_, i) => Q.addDays(mon, i));
      nav = `<a class="btn sm" href="${qs({ d: Q.addDays(mon, -7), m: Q.addDays(mon, -7).slice(0, 7) })}" aria-label="Previous week">${icon('chevron-right', 'flip-x')}</a><h2>Week of ${Q.fmt(mon)}</h2><a class="btn sm" href="${qs({ d: Q.addDays(mon, 7), m: Q.addDays(mon, 7).slice(0, 7) })}" aria-label="Next week">${icon('chevron-right')}</a>`;
      grid = `<div class="cal-week">${week.map(d => `<div class="cw-day${d === Q.today() ? ' today' : ''}"><div class="cw-h"><b>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][week.indexOf(d)]}</b> ${Q.fmt(d).replace(/,? \d{4}$/, '')}</div>${byDate(d).map(x => `<div class="cw-ev">${ev(x, true)}<span class="small muted">${esc(x.s.title)} · ${x.s.auditors.map(w => esc(Q.pname(w).split(' ')[0])).join(', ')}</span></div>`).join('') || '<span class="small muted">—</span>'}</div>`).join('')}</div>`;
    } else {
      const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || '') ? q.from : q.d || `${m}-01`, to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || '') ? q.to : Q.addDays(from, 60);
      const list = all.filter(x => x.s.date >= from && x.s.date <= to).sort((x, z) => (x.s.date + x.s.start) < (z.s.date + z.s.start) ? -1 : 1), dates = [...new Set(list.map(x => x.s.date))];
      nav = `<h2>Agenda</h2><form class="cal-range" data-cal-range><label class="field inline"><span>From</span><input class="input" type="date" name="from" value="${from}"></label><label class="field inline"><span>To</span><input class="input" type="date" name="to" value="${to}"></label><button class="btn sm" type="submit">Apply</button></form>`;
      grid = dates.length ? `<div class="cal-agenda">${dates.map(d => `<div class="ca-day"><div class="ca-date"><b>${Q.fmt(d)}</b>${d === Q.today() ? ' <span class="tag">Today</span>' : ''}</div><ul>${list.filter(x => x.s.date === d).map(x => `<li><span class="ca-time tnum">${esc(x.s.start)}–${esc(x.s.end)}</span><span class="ca-main">${ev(x, false)}<span class="small muted">${x.s.auditors.map(Q.pname).map(esc).join(' / ')}${x.s.location ? ` · ${esc(x.s.location)}` : ''}</span></span>${AM.triggerChip(x.a)}${AM.badge(x.a)}</li>`).join('')}</ul></div>`).join('')}</div>` : '<div class="empty small">No audit sessions in this date range.</div>';
    }
    const unscheduled = S.audits.filter(a => a.status !== 'Draft' && !(a.sessions || []).length && (f.prog === 'all' || a.programme === f.prog) && (f.proc === 'all' || a.process === f.proc) && !['Closed'].includes(a.status));
    const sel = (name, label, opts) => `<label class="field"><span class="sr-only">${label}</span><select class="select" data-cal-f="${name}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(f[name]) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const auditors = [...new Set([...(S.auditors || []).map(x => x.who), ...AM.allSessions().flatMap(x => x.s.auditors)])];
    const filters = `<div class="cal-filters">${sel('prog', 'Programme', [['all', 'All programmes'], ...S.auditProgrammes.map(p => [p.id, p.name]), ['none', 'Not in a programme']])}${sel('proc', 'Process', [['all', 'All processes'], ...Q.topProcesses().map(p => [p.process_id, `${p.process_code} ${p.name}`])])}${sel('auditor', 'Auditor', [['all', 'All auditors'], ...auditors.map(w => [w, Q.pname(w)])])}${sel('status', 'Status', [['all', 'All statuses'], ...AM.STATUSES.slice(1).map(s => [s, s])])}${sel('trig', 'Audit trigger', [['all', 'All triggers'], ['Planned', 'Planned'], ['Triggered', 'Triggered (any)'], ...AM.TRIGGER_SOURCES.map(s => [s, `Triggered · ${s}`])])}</div>`;
    const vt = `<div class="seg" role="group" aria-label="Calendar view">${[['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda']].map(([k, l]) => `<a class="seg-a" href="${qs({ view: k })}" aria-current="${k === view}">${l}</a>`).join('')}</div>`;
    return { title: 'Calendar · Audits', nav: 'audits', html: AM.chrome('calendar', { title: 'Audit Calendar', crumbs: [['Audits', '#/audits'], ['Calendar']], sub: 'Scheduled audit sessions across programme and triggered audits. Select a session for details.', actions: AM.createBtn() }) + filters +
      `${conf.length ? `<div class="callout warning small" style="margin:0 0 12px">${icon('triangle-alert')}<span><b>${conf.length} scheduling conflict${conf.length === 1 ? '' : 's'}</b>${conf.slice(0, 3).map(c => `${esc(Q.pname(c.who))} on ${Q.fmt(c.x.s.date)}: ${esc(c.x.a.id)} ${esc(c.x.s.start)}–${esc(c.x.s.end)} and ${esc(c.y.a.id)} ${esc(c.y.s.start)}–${esc(c.y.s.end)}`).join('; ')}. Review and reschedule one of the sessions.</span></div>` : ''}
      <div class="cal-wrap"><section class="panel"><div class="panel-head cal-head">${nav}<div class="actions">${vt}</div></div>${grid}
        <div class="cal-legend small muted"><span><i class="lg lg-plan"></i>Planned audit</span><span><i class="lg lg-trg"></i>Triggered audit</span><span><i class="lg lg-conf"></i>Scheduling conflict</span><span><i class="lg lg-done"></i>Closed</span></div></section>
        <aside class="panel"><div class="panel-head"><h3>Not yet scheduled</h3><span class="muted small">${unscheduled.length}</span></div><ul class="worklist cal-list">${unscheduled.map(a => `<li><div class="w-main"><div class="w-title"><a href="#/audits/a/${a.id}">${esc(a.id)}</a> ${esc(AM.pname(a))}</div><div class="w-meta">${esc(a.plannedPeriod || '—')} · ${esc(Q.pname(a.auditor))} · ${esc(AM.triggerLabel(a))}</div></div>${AM.can('plan', a) ? `<a class="btn sm" href="#/audits/a/${a.id}/plan#sessions">Schedule</a>` : ''}</li>`).join('') || '<li class="muted small">Everything is scheduled.</li>'}</ul></aside></div>`,
      after: main => {
        main.querySelectorAll('[data-cal-f]').forEach(s => s.addEventListener('change', () => { location.hash = qs({ [s.dataset.calF]: s.value }); }));
        main.querySelector('[data-cal-range]')?.addEventListener('submit', e => { e.preventDefault(); const v = Q.formValues(e.target); location.hash = qs({ from: v.from, to: v.to, d: '' }); });
      } };
  });
  // Session details (popover / drawer). Reschedule is an explicit action, never a drag.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cal]'); if (!b) return;
    const [aid, sid] = b.dataset.cal.split('|'), a = AM.audit(aid), s = a?.sessions.find(x => x.id === sid); if (!s) return;
    const c = AM.sessionConflicts(a, s);
    const m = Q.openModal({ size: 'drawer', title: `${esc(a.id)} · ${esc(s.title)}`, sub: esc(AM.pname(a)), body: `<div class="modal-body"><dl class="dl-list dl-wide">
      <dt>Audit</dt><dd><a href="#/audits/a/${a.id}">${esc(a.title)}</a></dd><dt>Process</dt><dd>${Q.pcell(a.process)}</dd><dt>Trigger</dt><dd>${AM.triggerChip(a)}</dd><dt>Session</dt><dd>${esc(s.title)}</dd>
      <dt>Time</dt><dd>${Q.fmt(s.date)} · ${esc(s.start)}–${esc(s.end)}</dd><dt>Location</dt><dd>${esc(s.location || a.location || '—')}${a.mode ? ` · ${esc(a.mode)}` : ''}</dd><dt>Lead Auditor</dt><dd>${esc(Q.pname(a.auditor))}</dd>
      <dt>Assigned auditors</dt><dd>${s.auditors.map(Q.pname).map(esc).join(', ') || '—'}</dd><dt>Status</dt><dd>${AM.badge(a)}</dd>${s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ''}</dl>
      ${c.length ? `<div class="callout warning small" style="margin-top:12px">${icon('triangle-alert')}<span><b>Scheduling conflict</b>${c.map(x => { const o = x.x.s === s ? x.y : x.x; return `${esc(Q.pname(x.who))} is also in ${esc(o.a.id)} “${esc(o.s.title)}” ${esc(o.s.start)}–${esc(o.s.end)}.`; }).join(' ')}</span></div>` : ''}</div>`,
      foot: `<a class="btn" href="#/audits/a/${a.id}/plan">Open Plan</a>${AM.can('plan', a) ? `<button class="btn" type="button" data-resched>${icon('calendar')}Reschedule</button>` : ''}<a class="btn primary" href="#/audits/a/${a.id}">Open Audit</a>` });
    m.querySelectorAll('a').forEach(x => x.addEventListener('click', () => Q.closeAllModals()));
    m.querySelector('[data-resched]')?.addEventListener('click', () => { Q.closeAllModals(); Q.actions['am-session']({ id: a.id, s: s.id }); });
  });

  /* ====================================================================== audit register */
  AM.route('list', (parts, q) => {
    const S = Q.S, all = () => S.audits;
    const G = { draft: a => a.status === 'Draft', planned: a => a.status === 'Planned', scheduled: a => ['Scheduled', 'Preparation'].includes(a.status), progress: a => a.status === 'In Progress', reporting: a => a.status === 'Reporting', followup: a => a.status === 'Follow-up', closed: a => a.status === 'Closed', overdue: AM.overdue };
    const segs = [['all', 'All', S.audits.length], ...[['draft', 'Drafts'], ['planned', 'Planned'], ['scheduled', 'Scheduled'], ['progress', 'In progress'], ['reporting', 'Reporting'], ['followup', 'Follow-up'], ['closed', 'Closed'], ['overdue', 'Overdue']].map(([k, l]) => [k, l, S.audits.filter(G[k]).length]).filter(x => x[0] !== 'draft' || x[2])];
    const table = Q.table({ id: 'am-list', rows: () => all().slice().sort((a, b) => (AM.startDate(b) || '9999') < (AM.startDate(a) || '9999') ? -1 : 1), noun: 'audits', caption: 'Audit register', initialSeg: G[q.s] ? q.s : undefined, segs: G,
      initialFilters: q.proc ? { proc: q.proc } : undefined,
      search: a => `${a.id} ${a.title} ${AM.pname(a)} ${Q.pname(a.auditor)} ${AM.triggerLabel(a)} ${a.trigger?.record || ''}`,
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search audits" aria-label="Search audits"></div>
        <select class="select" data-filter="proc" aria-label="Process"><option value="all">All processes</option>${Q.topProcesses().map(p => `<option value="${p.process_id}">${esc(p.process_code + ' ' + p.name)}</option>`).join('')}</select>
        <select class="select" data-filter="trig" aria-label="Audit trigger"><option value="all">All triggers</option><option value="Planned">Planned</option><option value="Triggered">Triggered</option></select>
        <select class="select" data-filter="prog" aria-label="Programme"><option value="all">All programmes</option>${S.auditProgrammes.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}<option value="none">Not in a programme</option></select>
        ${Q.seg('Status', segs, G[q.s] ? q.s : 'all')}`,
      filters: { proc: (a, v) => a.process === v, trig: (a, v) => (a.trigger?.type || 'Planned') === v, prog: (a, v) => v === 'none' ? !a.programme : a.programme === v },
      columns: [
        { key: 'id', label: 'Audit No.', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
        { key: 'p', label: 'Process', sort: a => Q.proc(a.process)?.display_order, render: a => Q.pcell(a.process) },
        { key: 't', label: 'Audit', sort: a => a.title, render: a => `<a class="title" href="#/audits/${a.status === 'Draft' ? `new?draft=${a.id}` : `a/${a.id}`}">${esc(a.title)}</a><span class="sub">${AM.triggerChip(a)}${a.programme ? ` · ${esc(AM.progName(a.programme))}` : ''}</span>` },
        { key: 'd', label: 'Dates', cls: 'c-date', sort: a => AM.startDate(a) || '9', render: a => AM.dateRange(a) },
        { key: 'l', label: 'Lead Auditor', sort: a => Q.pname(a.auditor), render: a => `<span class="nowrap">${esc(Q.pname(a.auditor))}</span><span class="sub">${(a.assignments || []).length} auditor${(a.assignments || []).length === 1 ? '' : 's'}</span>` },
        { key: 'c', label: 'Checklist', sort: a => AM.progress(a), render: a => a.checklist && AM.counted(a).length ? `${Q.miniProgress(AM.progress(a))}<span class="sub">${AM.counted(a).filter(AM.complete).length} / ${AM.counted(a).length}</span>` : '<span class="muted small">Not built</span>' },
        { key: 'f', label: 'Open NCs', cls: 'c-num', sort: a => AM.findingsOf(a.id).filter(AM.ncOpen).length, render: a => Q.num(AM.findingsOf(a.id).filter(AM.ncOpen).length) },
        { key: 'r', label: 'Report', render: a => Q.st(a.report.status, AM.REPORT_KIND[a.report.status]) },
        { key: 's', label: 'Status', sort: a => AM.STATUSES.indexOf(a.status), render: a => AM.badge(a) },
        { key: 'x', label: 'Actions', cls: 'c-actions', render: a => a.status === 'Draft' ? `<a class="btn sm" href="#/audits/new?draft=${a.id}">Continue Draft</a>` : `<a class="btn sm" href="#/audits/a/${a.id}">Open Audit</a>` }] });
    return { title: 'Audit Register · Audits', nav: 'audits', html: AM.chrome('list', { title: 'Audit Register', crumbs: [['Audits', '#/audits'], ['Audit Register']], sub: 'Every process audit — programme and triggered. One audit covers one process.', actions: `<a class="btn" href="#/audits/templates">${icon('clipboard-list')}Checklist Templates</a>` + AM.createBtn() }) + table };
  });

  /* ====================================================================== process ↔ clause mapping (master data, Settings)
   * Rows are processes (top level), columns the clauses any process maps to. Audits read it as suggestions. */
  let mxEdit = null;
  Q.settingsViews = Q.settingsViews || {};
  Q.settingsViews['clause-map'] = q => {
    const procs = Q.topProcesses(), cols = [...new Set([...procs.flatMap(p => p.iso || []), ...(q.addc ? [q.addc] : [])])].sort(AM.clSort);
    const map = mxEdit || Object.fromEntries(procs.map(p => [p.process_id, (p.iso || []).slice()]));
    const groups = [...new Set(cols.map(c => c.split('.')[0]))];
    const selA = q.area || '', selC = q.clause || '', canEdit = AM.can('configure');
    const answer = selA ? `<b>${esc(Q.proc(selA)?.name)}</b>: ${map[selA].slice().sort(AM.clSort).map(c => `<span class="clause">${esc(c)}</span>`).join(', ') || 'no clauses mapped'}` : selC ? `<b>Clause ${esc(selC)}</b> ${esc(AM.clTitle(selC))}: ${procs.filter(p => map[p.process_id].some(c => fam(c, selC))).map(p => esc(p.process_code + ' ' + p.name)).join(', ') || 'no process responsible'}` : 'Choose a process to see its clauses, or a clause to see which processes are responsible for it.';
    return { html: `<section class="panel"><div class="panel-head"><h2>Process ↔ ISO 9001 clauses</h2><span class="muted small">Master data</span></div><div class="panel-pad"><p class="small muted" style="margin:0 0 12px">The clauses each process is responsible for. When an audit of a process is created, these are loaded as <b>Suggested from Process Configuration</b>; each audit can add or remove clauses for itself. The same list appears as “ISO 9001 clauses” in Process Structure.</p>
      <div class="mx-tools"><label class="field"><span>What clauses apply to this process?</span><select class="select" data-mx="area"><option value="">Choose a process…</option>${procs.map(p => `<option value="${p.process_id}"${p.process_id === selA ? ' selected' : ''}>${esc(p.process_code + ' ' + p.name)}</option>`).join('')}</select></label>
        <label class="field"><span>What processes are responsible for this clause?</span><select class="select" data-mx="clause"><option value="">Choose a clause…</option>${Object.keys(AM.CL).sort(AM.clSort).map(c => `<option value="${c}"${c === selC ? ' selected' : ''}>${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label>
        <div class="mx-actions">${canEdit ? (mxEdit ? `<button class="btn" type="button" data-mx-cancel>Cancel</button><button class="btn primary" type="button" data-mx-save>Save Mapping</button>` : `<button class="btn" type="button" data-mx-edit>${icon('pencil')}Edit Mapping</button>`) : '<span class="small muted">Only the QMS Manager can change the mapping.</span>'}</div></div>
      <p class="mx-answer" role="status">${answer}</p></div>
      <div class="table-scroll mx-scroll"><table class="dt mx"><caption class="sr-only">Process–clause matrix</caption>
        <thead><tr><th class="c-sticky" rowspan="2" scope="col">Process</th>${groups.map(g => `<th class="mx-g" colspan="${cols.filter(c => c.split('.')[0] === g).length}" scope="colgroup">${esc(g)} ${esc(Q.clauseTitle(g))}</th>`).join('')}<th rowspan="2" class="c-num" scope="col">Clauses</th></tr>
        <tr>${cols.map(c => `<th class="mx-c${selC && fam(c, selC) ? ' hl' : ''}" scope="col" title="${esc(c + ' ' + AM.clTitle(c))}"><button type="button" class="link-btn" data-mx-col="${c}">${esc(c)}</button></th>`).join('')}</tr></thead>
        <tbody>${procs.map(p => `<tr class="${selA === p.process_id ? 'hl' : ''}"><th class="c-sticky" scope="row"><button type="button" class="link-btn mx-row" data-mx-row="${p.process_id}"><b class="tnum">${esc(p.process_code)}</b> ${esc(p.name)}</button></th>${cols.map(c => { const on = map[p.process_id].includes(c); return `<td class="mx-cell${selC && fam(c, selC) ? ' hl' : ''}">${mxEdit ? `<input type="checkbox" class="row-check" data-mxp="${p.process_id}" data-mxc="${c}" ${on ? 'checked' : ''} aria-label="${esc(p.name)} — clause ${c}">` : on ? `<span class="mx-on" aria-label="mapped">✓</span>` : ''}</td>`; }).join('')}<td class="c-num tnum">${map[p.process_id].length}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th class="c-sticky" scope="row">Processes per clause</th>${cols.map(c => { const n = procs.filter(p => map[p.process_id].includes(c)).length; return `<td class="c-num tnum${n ? '' : ' mx-gap'}">${n}</td>`; }).join('')}<td></td></tr></tfoot></table></div>
      ${mxEdit ? `<div class="mx-add panel-pad"><label class="field"><span>Add a clause column</span><select class="select" data-mx-addc><option value="">Choose a clause…</option>${Object.keys(AM.CL).filter(c => !cols.includes(c)).sort(AM.clSort).map(c => `<option value="${c}">${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label></div>` : ''}</section>` };
  };
  const mxGo = o => { const { q } = Q.route(); const p = new URLSearchParams({ ...q, ...o }); Object.entries(o).forEach(([k, v]) => { if (!v) p.delete(k); }); location.hash = '#/settings/clause-map?' + p; };
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-mx]'); if (s) { mxGo({ area: '', clause: '', [s.dataset.mx]: s.value }); return; }
    const c = e.target.closest('[data-mxp]'); if (c && mxEdit) { const l = mxEdit[c.dataset.mxp]; c.checked ? l.push(c.dataset.mxc) : l.splice(l.indexOf(c.dataset.mxc), 1); return; }
    const add = e.target.closest('[data-mx-addc]'); if (add && add.value) mxGo({ addc: add.value });
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-mx-edit]')) { mxEdit = Object.fromEntries(Q.topProcesses().map(p => [p.process_id, (p.iso || []).slice()])); Q.render({ noFocus: true, keepScroll: true }); }
    else if (e.target.closest('[data-mx-cancel]')) { mxEdit = null; Q.render({ noFocus: true, keepScroll: true }); }
    else if (e.target.closest('[data-mx-save]')) {
      const changed = Q.topProcesses().filter(p => (p.iso || []).slice().sort().join() !== mxEdit[p.process_id].slice().sort().join());
      changed.forEach(p => { p.iso = mxEdit[p.process_id].slice().sort(AM.clSort); });
      mxEdit = null; Q.save(); if (changed.length) Q.audit?.('Settings', `changed the process–clause mapping for ${changed.map(p => p.name).join(', ')}`); Q.render({ noFocus: true, keepScroll: true }); Q.toast('Mapping saved', changed.length ? `${changed.length} process${changed.length === 1 ? '' : 'es'} changed. New audits use the new suggestions; existing audits keep their clauses.` : 'No changes.');
    } else {
      const r = e.target.closest('[data-mx-row]'), c = e.target.closest('[data-mx-col]');
      if (r || c) mxGo({ area: r ? r.dataset.mxRow : '', clause: c ? c.dataset.mxCol : '' });
    }
  });

  /* ====================================================================== ISO readiness connection */
  AM.clauseAudit = r => {
    const c = r.clause, fs = Q.S.findings.filter(f => fam(f.clause, c)), open = fs.filter(AM.ncOpen);
    const overdueCA = open.filter(f => AM.ncOverdue(f) || (f.action && Q.S.actions.some(x => x.id === f.action && Q.actionOverdue(x))));
    const audited = Q.S.audits.filter(a => a.checklist?.some(i => i.result && fam(i.clause, c))).sort((a, b) => (AM.startDate(a) || '') < (AM.startDate(b) || '') ? 1 : -1);
    const planned = Q.S.audits.filter(a => a.status !== 'Draft' && !a.checklist?.some(i => i.result) && (a.clauses || []).some(x => fam(x, c)) && a.status !== 'Closed').sort((a, b) => (AM.startDate(a) || '9') < (AM.startDate(b) || '9') ? -1 : 1)[0];
    const last = audited[0];
    const docs = r.status === 'Missing' ? 'Missing' : r.controls.length ? 'Documented' : 'No controlling document';
    return `<div class="aud-strip"><span>Documentation <b>${esc(docs)}</b></span><span>Audit ${last ? `<a href="#/audits/a/${last.id}"><b>${last.status === 'In Progress' ? 'In progress' : 'Completed'}</b> ${esc(last.id)}${AM.startDate(last) ? ` · ${Q.fmt(AM.startDate(last))}` : ''}</a>` : planned ? `<a href="#/audits/a/${planned.id}">Planned ${esc(planned.id)}${AM.startDate(planned) ? ` · ${Q.fmt(AM.startDate(planned))}` : ''}</a>` : '<b class="warnv">Not audited</b>'}</span>
      <span>Open NC ${open.length ? `<a class="attn" href="#/audits/nc?clause=${encodeURIComponent(c)}">${open.length}</a>` : '<b>0</b>'}</span><span>Overdue corrective action ${overdueCA.length ? `<b class="attn">${overdueCA.length}</b>` : '<b>0</b>'}</span></div>`;
  };

  /* boot: data upgrade before the first render */
  const boot = Q.boot; Q.boot = () => { AM.init(); boot(); };
})();
