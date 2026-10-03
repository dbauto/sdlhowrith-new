/* iQMS — sample data for Audit Management, model 2 (Update 15): ONE AUDIT = ONE PROCESS.
 * Loaded after data.js, before core.js. It extends the existing records:
 *   auditProgrammes → annual / periodic programmes; they group process audits (audit.programme)
 *   audits          → one process audit each: trigger, plan, clauses, sessions, auditor assignments,
 *                     checklist (generated on first load from the clauses and assignments), report, activity
 *   findings        → every audit finding; nonconformities carry an `nc` block
 *   actions         → corrective actions raised from NCs stay in the Corrective Action register
 *   auditTemplates  → reusable checklist templates
 * Data saved by Update 14 (model 1, several areas in one audit) is converted on load — see AM.migrate.
 * Dates are relative to the sample's "today" (27 Sep 2026) and move with the real date. */
(() => {
  'use strict';
  const D = window.QMS_DATA;

  /* ---------- Process ↔ ISO clause mapping (master data: Settings → Process ↔ ISO Clauses) ---------- */
  const CLAUSES = {
    p01: ['4.1', '4.2', '4.3', '4.4', '5.2', '5.3', '7.5'],
    p02: ['7.5', '8.2', '9.1.2', '10.2'],
    p03: ['7.5', '8.2.3', '8.3.3'],
    p04: ['7.5', '8.1', '8.3', '8.5.1', '8.6'],
    p05: ['7.4', '7.5', '8.1', '8.4', '8.7', '9.1', '10.2'],
    p06: ['8.5.2', '8.5.4', '8.7'],
    p07: ['7.5', '8.1', '8.5.1', '8.6', '9.1', '10.2'],
    p08: ['7.1.5', '8.6', '8.7'],
    p09: ['8.5.5', '9.1.2', '10.2'],
    p10: ['5.3', '7.1.2', '7.2', '7.3'],
    p11: ['7.1.3', '7.1.5'],
    p12: ['6.1', '6.2', '9.1.3'],
    p13: ['9.2', '10.2', '10.3'],
    p14: ['5.1', '9.3']
  };
  D.processes.forEach(p => { if (CLAUSES[p.process_id]) p.iso = CLAUSES[p.process_id]; });

  /* ---------- Qualified auditors (competence for 9.2 / 7.2) ---------- */
  D.auditors = [
    { who: 'maria', level: 'Lead Auditor', training: 'ISO 9001 Lead Auditor course, 2024' },
    { who: 'nina', level: 'Lead Auditor', training: 'ISO 9001 Lead Auditor course, 2025' },
    { who: 'kim', level: 'Auditor', training: 'Internal Auditor training, 2025' },
    { who: 'ana', level: 'Auditor', training: 'Internal Auditor training, 2024' },
    { who: 'lea', level: 'Auditor', training: 'Internal Auditor training, 2026' },
    { who: 'daniel', level: 'Technical Expert', training: 'PV system design (PEE licensed)' },
    { who: 'eric', level: 'Observer', training: '' }
  ];

  D.auditProgrammes = [
    { id: 'AP-2026', name: '2026 Internal Audit Programme', year: 2026, period: 'Jan – Dec 2026', status: 'Active', owner: 'maria', approvedBy: 'eric', approved: '2026-01-15', doc: 'AUD-PLN-002',
      purpose: 'Audit every QMS process at least once in 2026, with more frequent audits of processes with open risks or previous nonconformities (ISO 9001 9.2.2).', notes: 'Approved at the January management review.' }
  ];

  /* A risk that later triggers an audit (Update 15 test scenario). */
  D.risks.push({ id: 'R-013', kind: 'Risk', title: 'Critical supplier dependency — single source for mounting structures', process: 'p05', likelihood: 4, impact: 4,
    treatment: 'Qualify a second mounting-structure supplier; verify supplier-control measures by audit.', owner: 'joy', due: '2026-12-15', status: 'In treatment', links: ['PRC-PRO-001'] });

  /* ---------- Process audits ---------- */
  const STD = 'ISO 9001:2026; internal QMS procedures; customer requirements; statutory and regulatory requirements where applicable';
  const SE = (title, date, start, end, auditors, notes = '') => ({ title, date, start, end, auditors, notes });
  const AS = (who, role, clauses = [], extra = {}) => ({ who, role, clauses, scope: '', independent: true, ...extra });
  const P = (trigger = {}) => ({ type: 'Planned', source: null, record: null, reason: '', ...trigger });
  const R = (status = 'Not started', extra = {}) => ({ status, rev: status === 'Not started' ? null : 0, reviewer: 'nina', approver: 'eric', ...extra });
  const OFF = 'Head office, Quezon City';
  D.audits = [
    { id: 'IA-2026-01', programme: 'AP-2026', process: 'p03', trigger: P(), title: 'Site Assessment Internal Audit', auditor: 'maria', plannedPeriod: 'Q2 2026', status: 'Closed', location: OFF, mode: 'On-site',
      objective: 'Confirm that site surveys capture the inputs design depends on, including roof structure.', scope: 'Site survey, structural assessment and survey records for residential projects.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-04-09', '08:30', '09:00', ['maria', 'daniel']), SE('Survey records sampling', '2026-04-09', '09:00', '12:00', ['maria', 'daniel']), SE('Closing meeting', '2026-04-09', '15:30', '16:00', ['maria', 'daniel'])],
      assignments: [AS('maria', 'Lead Auditor', ['7.5', '8.2.3']), AS('daniel', 'Technical Expert', ['8.3.3'], { scope: 'Structural and design-input review' })],
      report: R('Published', { published: '2026-04-20', reviewer: 'nina' }), closed: '2026-09-20' },
    { id: 'IA-2026-02', programme: 'AP-2026', process: 'p11', trigger: P(), title: 'Equipment & Resources Internal Audit', auditor: 'maria', plannedPeriod: 'Q2 2026', status: 'Follow-up', location: 'Warehouse, Valenzuela', mode: 'On-site',
      objective: 'Verify control of measuring equipment, tools and PPE.', scope: 'Calibration register, instrument identification and recall, tools and PPE.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-06-18', '08:30', '09:00', ['maria']), SE('Calibration records and instruments', '2026-06-18', '09:00', '14:00', ['maria']), SE('Closing meeting', '2026-06-18', '14:30', '15:00', ['maria'])],
      assignments: [AS('maria', 'Lead Auditor')], report: R('Published', { published: '2026-06-30' }) },
    { id: 'IA-2026-03', programme: 'AP-2026', process: 'p06', trigger: P(), title: 'Materials & Warehouse Internal Audit', auditor: 'maria', plannedPeriod: 'Q2 2026', status: 'Closed', location: 'Warehouse, Valenzuela', mode: 'On-site',
      objective: 'Confirm materials are identified, traceable and preserved.', scope: 'Receiving, storage, preservation and issue of materials.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-06-19', '08:30', '09:00', ['maria']), SE('Storage walk-through and records', '2026-06-19', '09:00', '12:00', ['maria']), SE('Closing meeting', '2026-06-19', '13:30', '14:00', ['maria'])],
      assignments: [AS('maria', 'Lead Auditor')], report: R('Published', { published: '2026-06-30' }), closed: '2026-07-15' },
    { id: 'IA-2026-04', programme: 'AP-2026', process: 'p05', trigger: P(), title: 'Procurement & Supplier Management Internal Audit', auditor: 'maria', plannedPeriod: 'Q3 2026', status: 'Follow-up', location: OFF, mode: 'On-site',
      objective: 'Verify conformity and effectiveness of supplier qualification, selection, monitoring and purchasing controls.', scope: 'Supplier qualification through purchase order and supplier performance monitoring.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-08-21', '09:00', '09:30', ['maria', 'kim']), SE('Supplier evaluation records', '2026-08-21', '09:30', '12:00', ['maria']), SE('Purchase order sampling', '2026-08-21', '09:30', '12:00', ['kim']), SE('Closing meeting', '2026-08-21', '15:00', '15:30', ['maria', 'kim'])],
      assignments: [AS('maria', 'Lead Auditor', ['7.4', '7.5', '8.1', '8.4.1', '8.4.2', '8.7', '9.1', '10.2']), AS('kim', 'Auditor', ['8.4.3'])], report: R('Published', { published: '2026-08-29' }) },
    { id: 'IA-2026-05', programme: 'AP-2026', process: 'p10', trigger: P(), title: 'People & Competence Internal Audit', auditor: 'nina', plannedPeriod: 'Q3 2026', status: 'Reporting', location: OFF, mode: 'On-site',
      objective: 'Check that competence needs are defined and that training and its effectiveness are recorded.', scope: 'Competence matrix, onboarding of installers, training records and toolbox talks.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-09-10', '09:00', '09:15', ['nina']), SE('Training records review', '2026-09-10', '09:15', '12:00', ['nina']), SE('Interviews — site supervisors', '2026-09-11', '09:00', '11:00', ['nina']), SE('Closing meeting', '2026-09-11', '11:15', '11:45', ['nina'])],
      assignments: [AS('nina', 'Lead Auditor')], report: R('For Review', { reviewer: 'maria', submitted: '2026-09-15' }) },
    { id: 'IA-2026-06', programme: 'AP-2026', process: 'p08', trigger: P(), title: 'Testing & Commissioning Internal Audit', auditor: 'nina', plannedPeriod: 'Q3 2026', status: 'Closed', location: 'Project site SP-2026-110, Batangas', mode: 'On-site',
      objective: 'Confirm release to the customer happens only after planned tests are completed and recorded.', scope: 'Commissioning tests, test instruments and acceptance certificates.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-09-11', '13:00', '13:15', ['nina', 'kim']), SE('Commissioning witness and records', '2026-09-11', '13:15', '16:00', ['nina', 'kim']), SE('Closing meeting', '2026-09-11', '16:15', '16:30', ['nina', 'kim'])],
      assignments: [AS('nina', 'Lead Auditor', ['8.6', '8.7']), AS('kim', 'Auditor', ['7.1.5'])], report: R('Published', { published: '2026-09-18', reviewer: 'maria' }), closed: '2026-09-21' },
    { id: 'IA-2026-07', programme: 'AP-2026', process: 'p01', trigger: P(), title: 'QMS & Organization Internal Audit', auditor: 'nina', plannedPeriod: 'Q3 2026', status: 'Reporting', location: OFF, mode: 'On-site',
      objective: 'Determine whether the QMS context, scope, policy and roles are maintained, as input to the 2026 management review.', scope: 'Context and interested parties, QMS scope, quality policy, roles and responsibilities, documented information.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-09-22', '08:30', '09:00', ['nina']), SE('Context, scope and policy', '2026-09-22', '09:00', '12:00', ['nina']), SE('Roles interviews', '2026-09-23', '09:00', '11:30', ['nina']), SE('Closing meeting', '2026-09-23', '15:30', '16:00', ['nina'])],
      assignments: [AS('nina', 'Lead Auditor')], report: R('Not started', { reviewer: 'maria' }) },
    { id: 'IA-2026-08', programme: 'AP-2026', process: 'p04', trigger: P(), title: 'Engineering & Design Internal Audit', auditor: 'nina', plannedPeriod: 'Q3 2026', status: 'Reporting', location: OFF, mode: 'On-site',
      objective: 'Confirm design inputs, verification and design changes are controlled.', scope: 'Design input, design review and verification, and design change control for residential and commercial PV.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-09-24', '08:30', '09:00', ['nina', 'ana']), SE('Design records sampling', '2026-09-24', '09:00', '12:00', ['nina', 'ana']), SE('Closing meeting', '2026-09-24', '15:00', '15:30', ['nina', 'ana'])],
      assignments: [AS('nina', 'Lead Auditor', ['7.5', '8.1', '8.3.1', '8.3.2', '8.3.3', '8.3.5', '8.5.1', '8.6']), AS('ana', 'Auditor', ['8.3.4', '8.3.6'])], report: R('Draft', { reviewer: 'maria' }) },
    { id: 'IA-2026-09', programme: null, process: 'p05', title: 'Supplier Qualification Audit — mounting structures', auditor: 'maria', plannedPeriod: 'Q3 2026', status: 'In Progress', location: OFF, mode: 'Hybrid',
      trigger: { type: 'Triggered', source: 'Risk', record: 'R-013', reason: 'Verify whether supplier-control measures adequately address the critical single-source dependency for mounting structures.' },
      objective: 'Verify that critical suppliers are qualified before approval and that purchasing controls address the supplier dependency risk.', scope: 'Qualification of mounting-structure and inverter suppliers, purchase orders and incoming technical documentation (Jan–Sep 2026).', criteria: STD,
      sessions: [SE('Opening meeting', '2026-09-24', '09:00', '09:30', ['maria', 'kim', 'daniel']), SE('Supplier evaluation review', '2026-09-24', '09:30', '12:00', ['maria']), SE('Purchasing records review', '2026-09-25', '09:00', '12:00', ['kim']),
        SE('Technical documentation review', '2026-09-28', '09:00', '12:00', ['daniel']), SE('Closing meeting', '2026-09-29', '15:00', '16:00', ['maria', 'kim', 'daniel'])],
      assignments: [AS('maria', 'Lead Auditor', ['8.4.1', '10.2']), AS('kim', 'Auditor', ['8.4.2', '8.4.3']), AS('daniel', 'Technical Expert', [], { scope: 'Technical evidence review: supplier specifications, certificates and test reports', independent: null })],
      report: R('Not started') },
    { id: 'IA-2026-10', programme: 'AP-2026', process: 'p07', trigger: P(), title: 'Project Installation Internal Audit', auditor: 'nina', plannedPeriod: 'Q4 2026', status: 'Preparation', location: 'Project sites SP-2026-118 and SP-2026-121', mode: 'On-site',
      objective: 'Confirm installation is carried out under controlled conditions with current work instructions, competent people and recorded inspections.', scope: 'Two active installation sites: work instructions, inspection checklists, materials traceability and site records.', criteria: STD,
      sessions: [SE('Pre-audit document review', '2026-09-29', '14:00', '16:00', ['kim'], 'Remote review of project plans before the site visits.'), SE('Opening meeting', '2026-10-06', '08:00', '08:30', ['nina', 'kim', 'daniel']),
        SE('Site visit — SP-2026-118', '2026-10-06', '08:30', '15:00', ['nina', 'kim', 'daniel']), SE('Site visit — SP-2026-121', '2026-10-07', '08:30', '13:00', ['nina', 'kim']), SE('Closing meeting', '2026-10-07', '15:00', '15:30', ['nina', 'kim', 'daniel'])],
      assignments: [AS('nina', 'Lead Auditor', ['7.5', '8.1', '9.1', '10.2']), AS('kim', 'Auditor', ['8.5.1', '8.6']), AS('daniel', 'Technical Expert', [], { scope: 'Electrical installation workmanship', independent: null })], report: R() },
    { id: 'IA-2026-11', programme: 'AP-2026', process: 'p02', trigger: P(), title: 'Sales & Customer Internal Audit', auditor: 'nina', plannedPeriod: 'Q4 2026', status: 'Scheduled', location: OFF, mode: 'On-site',
      objective: 'Confirm customer requirements are determined and reviewed before acceptance, and customer satisfaction is monitored.', scope: 'Quotation, contract review, customer communication and customer feedback.', criteria: STD,
      sessions: [SE('Opening meeting', '2026-11-18', '08:30', '09:00', ['nina', 'ana']), SE('Contract review sampling', '2026-11-18', '09:00', '12:00', ['nina', 'ana']), SE('Closing meeting', '2026-11-18', '15:00', '15:30', ['nina', 'ana'])],
      assignments: [AS('nina', 'Lead Auditor', ['7.5', '8.2']), AS('ana', 'Auditor', ['9.1.2', '10.2'], { independent: null })], report: R() },
    { id: 'IA-2026-12', programme: 'AP-2026', process: 'p09', trigger: P(), title: 'Handover & After-Sales Internal Audit', auditor: 'maria', plannedPeriod: 'Q4 2026', status: 'Planned', location: '', mode: 'On-site',
      objective: 'Confirm handover and warranty service meet commitments and complaints are handled.', scope: 'Handover pack, warranty claims, service requests and complaints.', criteria: STD,
      sessions: [], assignments: [AS('maria', 'Lead Auditor', [], { independent: null })], report: R() },
    { id: 'IA-2026-13', programme: 'AP-2026', process: 'p12', trigger: P(), title: 'Risk & Objectives Internal Audit', auditor: 'nina', plannedPeriod: 'Q4 2026', status: 'Planned', location: '', mode: 'On-site',
      objective: 'Confirm risks and opportunities are determined and treated, and quality objectives are planned and monitored.', scope: 'Risk register, treatment plans, quality objectives and KPI monitoring.', criteria: STD,
      sessions: [], assignments: [AS('nina', 'Lead Auditor', [], { independent: null })], report: R() },
    { id: 'IA-2026-14', programme: null, process: 'p11', title: 'Calibration Recall Follow-up Audit', auditor: 'nina', plannedPeriod: 'Q3 2026', status: 'Scheduled', location: 'Warehouse, Valenzuela', mode: 'On-site',
      trigger: { type: 'Triggered', source: 'Nonconformity', record: 'NC-2026-002', reason: 'Verify the corrective action for the calibration recall nonconformity is implemented and effective.' },
      objective: 'Verify the corrective action for NC-2026-002 (calibration recall) is implemented and effective.', scope: 'Calibration register, recall tags and the CA-2026-06 records.', criteria: STD,
      sessions: [SE('Follow-up verification', '2026-09-20', '09:00', '11:00', ['nina'])], assignments: [AS('nina', 'Lead Auditor')], report: R() }
  ];

  /* ---------- Findings (all types). NCs carry an `nc` block. ---------- */
  const snap = (id, title, rev, status, by, date, kind = 'doc') => ({ kind, id, title, rev, status, by, date });
  const C = (id, who, at, text, refs = [], parent = null) => ({ id, who, at, text, refs, parent });
  const E = (at, who, text) => ({ at, who, text });
  D.findings = [
    { id: 'F-2026-04', audit: 'IA-2026-01', process: 'p03', clause: '8.3.3', type: 'Minor nonconformity', auditor: 'daniel', raised: '2026-04-09', status: 'Closed', action: 'CA-2026-04',
      title: 'Site survey missed roof structural check on two projects', statement: 'For projects SP-2026-031 and SP-2026-044 the site survey did not record a roof structural assessment, although the design relied on roof load capacity (8.3.3 design inputs).',
      evidence: [snap('SIT-CHK-002', 'Site Survey Checklist', '05', 'Published', 'daniel', '2026-04-09')],
      nc: { no: 'NC-2026-001', classification: 'Minor', owner: 'marco', due: '2026-06-30', status: 'Closed',
        ca: { correction: 'Structural check done for both projects; no design change needed.', rootCause: 'The survey checklist had no roof structural item, so it depended on the surveyor remembering it.', action: 'Add a mandatory structural item to the Site Survey Checklist and brief surveyors.', owner: 'marco', due: '2026-06-30', impl: 'Implemented', evidence: [snap('SIT-CHK-002', 'Site Survey Checklist', '06', 'Published', 'marco', '2026-06-12')], submitted: { by: 'marco', date: '2026-06-12' } },
        verification: { result: 'Implemented', by: 'maria', date: '2026-06-20', note: 'Rev 06 of the checklist includes the item; 6 surveys sampled, all complete.' },
        effectiveness: { result: 'Effective', by: 'maria', date: '2026-09-18', note: 'No recurrence in 22 surveys since July.' },
        comments: [], events: [E('2026-04-09 15:40', 'daniel', 'raised the nonconformity'), E('2026-06-12 10:05', 'marco', 'submitted the corrective action'), E('2026-06-20 14:00', 'maria', 'verified implementation'), E('2026-09-18 09:30', 'maria', 'confirmed effectiveness and closed the NC')] } },
    { id: 'F-2026-05', audit: 'IA-2026-02', process: 'p11', clause: '7.1.5', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-06-18', status: 'In Progress', action: 'CA-2026-06',
      title: 'Clamp meter used on site past calibration due date', statement: 'Clamp meter CM-07 was used for commissioning on 3 projects in June after its calibration expired on 31 May 2026.',
      evidence: [snap('EQP-PRO-002', 'Calibration & Verification Procedure', '03', 'Published', 'maria', '2026-06-18'), snap('E-022', 'Calibration certificate — insulation tester IT-04', 'Current', 'Verified', 'maria', '2026-06-18', 'evidence')],
      nc: { no: 'NC-2026-002', classification: 'Minor', owner: 'paolo', due: '2026-08-31', status: 'In Progress',
        ca: { correction: 'CM-07 withdrawn and recalibrated; readings on the 3 projects re-checked and within tolerance.', rootCause: 'No recall trigger when a calibration due date passes; tags were not visible on the instrument case.', action: 'Weekly recall list from the calibration register and coloured due-date tags on every instrument.', owner: 'paolo', due: '2026-08-31', impl: 'In progress', evidence: [], submitted: { by: 'paolo', date: '2026-07-02' } },
        verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-09-02 09:15', '@Paolo the recall list was due 31 Aug. What is left to do?'), C('c2', 'paolo', '2026-09-02 13:40', 'Tags are on all instruments. The weekly recall report needs IT to schedule it from the register — expected mid-October.', [], 'c1')],
        events: [E('2026-06-18 15:10', 'maria', 'raised the nonconformity'), E('2026-07-02 11:20', 'paolo', 'submitted the corrective action plan')] } },
    { id: 'F-2026-07', audit: 'IA-2026-04', process: 'p05', clause: '8.4.1', type: 'Major nonconformity', auditor: 'maria', raised: '2026-08-21', status: 'Action Assigned', action: 'CA-2026-09',
      title: 'Supplier performance not monitored for 2 of 5 critical suppliers', statement: 'No performance monitoring was recorded in 2026 for two of the five critical suppliers (inverters and mounting structures). The procedure requires quarterly monitoring. This is a systemic failure of 8.4.1 for critical suppliers.',
      evidence: [snap('PRC-PRO-004', 'Supplier Performance Monitoring Procedure', '02', 'Published', 'maria', '2026-08-21'), snap('E-009', 'Supplier performance scorecard — Q3 2026', 'Current', 'Missing', 'maria', '2026-08-21', 'evidence')],
      nc: { no: 'NC-2026-003', classification: 'Major', owner: 'joy', due: '2026-10-31', status: 'Action Assigned',
        ca: { correction: '', rootCause: '', action: '', owner: 'joy', due: '2026-10-31', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-08-25 09:30', '@Joy as a major NC this needs a root cause and plan within 30 days. Please also tell me which suppliers are affected.'), C('c2', 'joy', '2026-08-26 16:12', 'SunVolt Inverters and RackPro Structures. Starting the root-cause review with Eric this week.', [], 'c1')],
        events: [E('2026-08-21 15:20', 'maria', 'raised the nonconformity'), E('2026-08-22 08:00', 'maria', 'assigned the corrective action to Joy Aquino')] } },
    { id: 'F-2026-08', audit: 'IA-2026-04', process: 'p05', clause: '8.4.3', type: 'Minor nonconformity', auditor: 'kim', raised: '2026-08-21', status: 'Verification Required', action: 'CA-2026-10',
      title: 'Approved Supplier List not updated after supplier removal', statement: 'A supplier suspended in June 2026 (BrightCable) was still listed as approved in the Approved Supplier List, and one purchase order was raised to it in July.',
      evidence: [snap('PRC-REG-002', 'Approved Supplier List', '11', 'Published', 'kim', '2026-08-21'), snap('PRC-PRO-001', 'Procurement Procedure', '05', 'Published', 'kim', '2026-08-21')],
      nc: { no: 'NC-2026-004', classification: 'Minor', owner: 'joy', due: '2026-09-15', status: 'Verification Required',
        ca: { correction: 'BrightCable removed from the ASL; the July order was reviewed and the cable was tested before use.', rootCause: 'The ASL is maintained by one buyer and nothing triggers an update when a supplier status changes.', action: 'Supplier status changes now go through the Supplier Evaluation Form, which updates the ASL; second buyer trained as back-up.', owner: 'joy', due: '2026-09-15', impl: 'Implemented', evidence: [snap('PRC-REG-002', 'Approved Supplier List', '12', 'Published', 'joy', '2026-09-12'), snap('E-008', 'Supplier evaluation — SunVolt Inverters 2026', 'Current', 'Verified', 'joy', '2026-09-12', 'evidence')], submitted: { by: 'joy', date: '2026-09-12' } },
        verification: null, effectiveness: null,
        comments: [
          C('c1', 'maria', '2026-09-08 10:24', '@Joy please confirm whether the ASL has been corrected and how status changes are triggered now.'),
          C('c2', 'joy', '2026-09-08 11:08', 'ASL Rev 12 is published without BrightCable. Status changes now go through the Supplier Evaluation Form — please review the updated records.', ['PRC-REG-002'], 'c1'),
          C('c3', 'kim', '2026-09-13 09:02', 'Thanks. I will sample three status changes from August–September when I verify.', [], 'c1')],
        events: [E('2026-08-21 15:25', 'kim', 'raised the nonconformity'), E('2026-09-12 16:40', 'joy', 'submitted the corrective action and requested verification')] } },
    { id: 'F-2026-09', audit: 'IA-2026-05', process: 'p10', clause: '7.2', type: 'Observation', auditor: 'nina', raised: '2026-09-10', status: 'Open', action: null,
      title: 'Toolbox-talk attendance not linked to the competence matrix', statement: 'Toolbox-talk attendance is recorded on paper sheets and is not reflected in the competence matrix, so refresher training due dates are tracked by memory.', evidence: [snap('HR-REG-001', 'Competency Requirements', '03', 'Published', 'nina', '2026-09-10')] },
    { id: 'F-2026-22', audit: 'IA-2026-05', process: 'p10', clause: '7.2', type: 'Minor nonconformity', auditor: 'nina', raised: '2026-09-11', status: 'Action Assigned', action: null,
      title: 'Competence of new installers not evaluated', statement: 'For 2 of 6 installers hired in 2026, no evaluation of competence before unsupervised work was recorded (7.2 c, d).',
      evidence: [snap('HR-REG-001', 'Competency Requirements', '03', 'Published', 'nina', '2026-09-11'), snap('E-020', 'Training records — electrical safety 2026', 'Current', 'Verified', 'nina', '2026-09-11', 'evidence')],
      nc: { no: 'NC-2026-006', classification: 'Minor', owner: 'rosa', due: '2026-10-30', status: 'Action Assigned',
        ca: { correction: '', rootCause: '', action: '', owner: 'rosa', due: '2026-10-30', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [], events: [E('2026-09-11 11:30', 'nina', 'raised the nonconformity'), E('2026-09-11 11:31', 'nina', 'assigned the corrective action to Rosa Tan')] } },
    { id: 'F-2026-10', audit: 'IA-2026-06', process: 'p08', clause: '8.6', type: 'Opportunity for improvement', auditor: 'nina', raised: '2026-09-11', status: 'Closed', action: null,
      title: 'Commissioning checklists overlap and could be consolidated', statement: 'Two commissioning checklists cover the same insulation and polarity tests; one checklist would reduce duplicate entry.', evidence: [snap('TST-TPL-004', 'Commissioning Report Template', '03', 'Published', 'nina', '2026-09-11')] },
    { id: 'F-2026-23', audit: 'IA-2026-07', process: 'p01', clause: '5.3', type: 'Observation', auditor: 'nina', raised: '2026-09-23', status: 'Open', action: null,
      title: 'Roles & Responsibilities Matrix review overdue', statement: 'The matrix (QMS-PRO-002 Rev 03) passed its review date; Rev 04 is in review. Responsibilities in practice matched the matrix in all 5 interviews.', evidence: [snap('QMS-PRO-002', 'Roles & Responsibilities Matrix', '03', 'Published', 'nina', '2026-09-23')] },
    { id: 'F-2026-24', audit: 'IA-2026-08', process: 'p04', clause: '8.3.4', type: 'Opportunity for improvement', auditor: 'ana', raised: '2026-09-24', status: 'Open', action: null,
      title: 'Design input checklist could record the reviewer’s licence number', statement: 'Design input checklists are signed but the PEE licence number of the reviewing engineer is not captured, which customers sometimes request.', evidence: [snap('ENG-FRM-002', 'Design Input Checklist', '04', 'Published', 'ana', '2026-09-24')] },
    { id: 'F-2026-21', audit: 'IA-2026-09', process: 'p05', clause: '8.4.1', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-09-24', status: 'Open', action: null,
      title: 'Initial evaluation missing for two approved suppliers', statement: 'Two sampled approved suppliers (Luzon Fasteners, PV Connect) did not have documented initial supplier evaluations before being added to the Approved Supplier List.',
      evidence: [snap('PRC-REG-002', 'Approved Supplier List', '12', 'Published', 'maria', '2026-09-24'), snap('E-008', 'Supplier evaluation — SunVolt Inverters 2026', 'Current', 'Verified', 'maria', '2026-09-24', 'evidence')],
      nc: { no: 'NC-2026-005', classification: 'Minor', owner: 'joy', due: '2026-10-24', status: 'Open',
        ca: { correction: '', rootCause: '', action: '', owner: 'joy', due: '2026-10-24', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-09-25 10:24', '@Joy please confirm whether the missing supplier evaluations have now been completed, and when these two suppliers were added.'), C('c2', 'joy', '2026-09-26 11:08', 'Both were added in March during the rush for the Batangas project. Completing the evaluations this week.', [], 'c1')],
        events: [E('2026-09-24 14:05', 'maria', 'raised the nonconformity'), E('2026-09-24 14:05', 'system', 'notified Joy Aquino (process owner)')] } }
  ];

  /* Corrective actions raised from the NCs above stay in the existing Corrective Action register. */
  const ca = D.actions.find(a => a.id === 'CA-2026-04'); if (ca) Object.assign(ca, { stage: 'Closed', status: 'Closed — effective' });
  const ca10 = D.actions.find(a => a.id === 'CA-2026-10'); if (ca10) Object.assign(ca10, { stage: 'Action', status: 'Awaiting verification' });

  /* Checklist progress for the sample audits (share of each auditor's questions answered, and whether submitted). */
  D.auditDemo = {
    'IA-2026-09': { maria: [1, false], kim: [0.7, false], daniel: [0.34, false] },
    'IA-2026-10': {}
  };

  /* ---------- Checklist templates ---------- */
  const TI = (sec, question, o = {}) => ({ sec, question, type: o.type || 'assessment', required: o.required !== false, expected: o.expected || [], options: o.options || [] });
  D.auditTemplates = [
    { id: 'CT-001', name: 'Procurement Audit Checklist', process: 'p05', status: 'Active', updated: '2026-08-10', by: 'maria',
      description: 'Supplier qualification, selection, monitoring and purchasing controls.',
      sections: [{ key: 'g', clause: '', title: 'Before you start' }, { key: 's1', clause: '8.4.1', title: 'Supplier evaluation and approval' }, { key: 's2', clause: '8.4.2', title: 'Type and extent of control' }, { key: 's3', clause: '8.4.3', title: 'Information for external providers' }, { key: 's4', clause: '10.2', title: 'Supplier nonconformities' }],
      items: [
        TI('g', 'Sample at least five purchase orders from the period, including two critical suppliers.', { type: 'instruction', required: false }),
        TI('s1', 'Are suppliers evaluated before approval?', { expected: ['Supplier evaluation records', 'Approved Supplier List', 'Supplier performance records'] }),
        TI('s1', 'Is supplier performance monitored and re-evaluated at the defined frequency?', { expected: ['Supplier scorecards', 'Supplier Performance Monitoring Procedure'] }),
        TI('s1', 'Is the current revision of the Approved Supplier List available to buyers?', { type: 'yesno', expected: ['Approved Supplier List'] }),
        TI('s2', 'Is the type and extent of control (inspection, certificates) defined for purchased products?', { expected: ['Receiving inspection records', 'Certificates of conformity'] }),
        TI('s2', 'Number of receiving inspections sampled', { type: 'number' }),
        TI('s3', 'Do purchase orders communicate specifications, approvals and competence requirements?', { expected: ['Purchase orders', 'Supplier specifications'] }),
        TI('s3', 'Purchase orders reviewed', { type: 'evidence', expected: ['Purchase orders'] }),
        TI('s4', 'Are supplier nonconformities recorded and followed up?', { expected: ['Supplier corrective action requests'] })] },
    { id: 'CT-002', name: 'Installation Audit Checklist', process: 'p07', status: 'Active', updated: '2026-07-02', by: 'nina',
      description: 'Site audit of installation under controlled conditions.',
      sections: [{ key: 's1', clause: '8.5.1', title: 'Controlled conditions on site' }, { key: 's2', clause: '8.6', title: 'Release' }],
      items: [
        TI('s1', 'Are current work instructions available and followed on site?', { expected: ['Installation work instructions', 'Site records'] }),
        TI('s1', 'Are inspection checklists completed at the defined stages?', { expected: ['Installation Checklist'] }),
        TI('s1', 'Site safety observations', { type: 'text', required: false }),
        TI('s2', 'Is the system released only after the planned tests are recorded?', { expected: ['Commissioning reports'] })] },
    { id: 'CT-003', name: 'Engineering Design Audit Checklist', process: 'p04', status: 'Archived', updated: '2025-11-20', by: 'maria',
      description: 'Replaced by the clause-generated checklist in 2026.',
      sections: [{ key: 's1', clause: '8.3', title: 'Design and development' }],
      items: [TI('s1', 'Are design reviews recorded with the people involved?', { expected: ['Design review records'] })] }
  ];
})();
