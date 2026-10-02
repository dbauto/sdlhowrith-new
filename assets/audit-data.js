/* iQMS — sample data for Audit Management (loaded after data.js, before core.js).
 * It extends the existing records instead of adding a parallel store:
 *   audits    → the audit programme (same array the rest of iQMS reads), now with plan, team, areas,
 *               checklist (generated on first load from the area's ISO clauses), report and activity
 *   findings  → every audit finding; nonconformities carry an `nc` block (number, owner, due date,
 *               lifecycle, corrective action, verification, discussion)
 *   actions   → corrective actions raised from NCs stay in the existing Corrective Action register
 * Dates are relative to the sample's "today" (27 Sep 2026) and move with the real date like the rest of the data. */
(() => {
  'use strict';
  const D = window.QMS_DATA;

  /* ---------- Area ↔ ISO clause mapping ----------
   * Lives on each process (Settings → Process Structure → "ISO 9001 clauses") and in the
   * Area–Clause Matrix (Audits → Audit Programme). These are sensible defaults only. */
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
    { id: 'AP-2026', title: '2026 Internal Audit Programme', year: 2026, status: 'Approved', owner: 'maria', approvedBy: 'eric', approved: '2026-01-15', doc: 'AUD-PLN-002' },
    { id: 'AP-2027', title: '2027 Internal Audit Programme', year: 2027, status: 'Draft', owner: 'maria', approvedBy: null, approved: null, doc: null }
  ];

  const T = (who, role, areas = [], clauses = [], independent = true) => ({ who, role, areas, clauses, independent });
  const A = (process, auditee, auditor, status, extra = {}) => ({ process, auditee, auditor, clauses: null, status, ...extra });
  const STD = 'ISO 9001:2026, the Helios QMS manual and procedures, customer and statutory requirements';

  D.audits = [
    { id: 'IA-2026-01', programme: 'AP-2026', title: 'Site Assessment & Design', type: 'Process Audit', processes: ['p03', 'p04'], auditor: 'maria',
      date: '2026-04-09', endDate: '2026-04-09', start: '08:30', end: '16:30', location: 'Head office, Quezon City', opening: '08:30', closing: '16:00', plannedPeriod: 'Q2 2026', status: 'Closed',
      objective: 'Confirm that site surveys and design reviews meet customer and code requirements.', scope: 'Site survey, structural assessment, PV design and design review for residential projects.', criteria: STD,
      team: [T('maria', 'Lead Auditor', ['p03', 'p04']), T('daniel', 'Technical Expert', ['p03'], [], true)],
      areas: [A('p03', 'marco', 'maria', 'Submitted', { submitted: { by: 'maria', date: '2026-04-10' }, conclusion: 'Effective, with one minor nonconformity on structural checks.' }), A('p04', 'daniel', 'maria', 'Submitted', { submitted: { by: 'maria', date: '2026-04-10' }, conclusion: 'Effective.' })],
      report: { status: 'Published', rev: 0, published: '2026-04-20', reviewer: 'nina', approver: 'eric' }, closed: '2026-09-20' },
    { id: 'IA-2026-02', programme: 'AP-2026', title: 'Equipment & Warehouse', type: 'Process Audit', processes: ['p11', 'p06'], auditor: 'maria',
      date: '2026-06-18', endDate: '2026-06-18', start: '08:30', end: '15:00', location: 'Warehouse, Valenzuela', opening: '08:30', closing: '14:30', plannedPeriod: 'Q2 2026', status: 'Follow-up',
      objective: 'Verify control of measuring equipment and of materials in storage.', scope: 'Calibration, tools and PPE; receiving, storage and preservation.', criteria: STD,
      team: [T('maria', 'Lead Auditor', ['p11', 'p06'])],
      areas: [A('p11', 'paolo', 'maria', 'Submitted', { submitted: { by: 'maria', date: '2026-06-19' }, conclusion: 'Partly effective: calibration recall not working.' }), A('p06', 'ben', 'maria', 'Submitted', { submitted: { by: 'maria', date: '2026-06-19' }, conclusion: 'Effective.' })],
      report: { status: 'Published', rev: 0, published: '2026-06-30', reviewer: 'nina', approver: 'eric' } },
    { id: 'IA-2026-03', programme: 'AP-2026', title: 'Procurement & Suppliers', type: 'Process Audit', processes: ['p05'], auditor: 'maria',
      date: '2026-08-21', endDate: '2026-08-21', start: '09:00', end: '15:30', location: 'Head office, Quezon City', opening: '09:00', closing: '15:00', plannedPeriod: 'Q3 2026', status: 'Follow-up',
      objective: 'Confirm suppliers are evaluated, approved and monitored, and that purchase requirements are communicated.', scope: 'Supplier selection and evaluation, Approved Supplier List, purchase orders and supplier performance.', criteria: STD,
      team: [T('maria', 'Lead Auditor', ['p05']), T('kim', 'Auditor', ['p05'], ['8.4.3'])],
      areas: [A('p05', 'joy', 'maria', 'Submitted', { submitted: { by: 'maria', date: '2026-08-22' }, conclusion: 'Not fully effective: supplier monitoring and ASL maintenance need corrective action.' })],
      report: { status: 'Published', rev: 0, published: '2026-08-29', reviewer: 'nina', approver: 'eric' } },
    { id: 'IA-2026-04', programme: 'AP-2026', title: 'People & Competence', type: 'Department Audit', processes: ['p10'], auditor: 'nina',
      date: '2026-09-10', endDate: '2026-09-10', start: '09:00', end: '12:00', location: 'Head office, Quezon City', opening: '09:00', closing: '11:45', plannedPeriod: 'Q3 2026', status: 'Reporting',
      objective: 'Check that competence needs are defined and that training and its effectiveness are recorded.', scope: 'Competence matrix, onboarding of installers, training records and toolbox talks.', criteria: STD,
      team: [T('nina', 'Lead Auditor', ['p10'])],
      areas: [A('p10', 'rosa', 'nina', 'Submitted', { submitted: { by: 'nina', date: '2026-09-12' }, conclusion: 'Effective, with an observation on onboarding records.' })],
      report: { status: 'For Review', rev: 0, reviewer: 'maria', approver: 'eric', submitted: '2026-09-15' } },
    { id: 'IA-2026-05', programme: 'AP-2026', title: 'Annual Internal QMS Audit 2026', type: 'Internal Audit', processes: ['p01', 'p10', 'p05', 'p04', 'p07'], auditor: 'maria',
      date: '2026-09-22', endDate: '2026-10-02', start: '08:30', end: '17:00', location: 'Head office and project sites (Luzon)', opening: '08:30', closing: '16:00', plannedPeriod: 'Q3 2026', status: 'In Progress',
      objective: 'Determine whether the QMS conforms to ISO 9001:2026 and Helios requirements and is effectively implemented and maintained, as input to the 2026 management review.',
      scope: 'All QMS processes at head office and two active installation sites: QMS & Organization, People & Competence, Procurement & Suppliers, Engineering & Design and Project Installation.', criteria: STD,
      description: 'Annual system audit before the certification body surveillance visit. Each area is audited by an auditor independent of it.',
      team: [T('maria', 'Lead Auditor', ['p05'], ['8.4']), T('nina', 'Auditor', ['p01', 'p10']), T('ana', 'Auditor', ['p04']), T('kim', 'Auditor', ['p07']), T('daniel', 'Technical Expert', ['p07'], ['8.5.1']), T('eric', 'Observer', [])],
      areas: [
        A('p01', 'maria', 'nina', 'Submitted', { submitted: { by: 'nina', date: '2026-09-24' }, conclusion: 'Effective. One observation on the overdue review of the roles matrix.' }),
        A('p10', 'rosa', 'nina', 'Submitted', { submitted: { by: 'nina', date: '2026-09-25' }, conclusion: 'Partly effective: competence evaluation of new installers not recorded.' }),
        A('p05', 'joy', 'maria', 'In progress'),
        A('p04', 'daniel', 'ana', 'Submitted', { submitted: { by: 'ana', date: '2026-09-26' }, conclusion: 'Effective. Design verification is well controlled.' }),
        A('p07', 'carlos', 'kim', 'In progress')],
      report: { status: 'Not started', rev: null, reviewer: 'nina', approver: 'eric' } },
    { id: 'IA-2026-06', programme: 'AP-2026', title: 'Sales, Handover & After-Sales', type: 'Process Audit', processes: ['p02', 'p09'], auditor: 'nina',
      date: '2026-11-18', endDate: '2026-11-18', start: '08:30', end: '16:00', location: 'Head office, Quezon City', opening: '08:30', closing: '15:30', plannedPeriod: 'Q4 2026', status: 'Checklist Ready',
      objective: 'Confirm customer requirements are reviewed before acceptance and that handover and warranty service meet commitments.', scope: 'Quotation, contract review, handover pack, warranty claims and customer feedback.', criteria: STD,
      team: [T('nina', 'Lead Auditor', ['p02']), T('ana', 'Auditor', ['p09'])],
      areas: [A('p02', 'grace', 'nina', 'Not started'), A('p09', 'lea', 'ana', 'Not started')],
      report: { status: 'Not started', rev: null, reviewer: 'maria', approver: 'eric' } },
    { id: 'IA-2026-07', programme: 'AP-2026', title: 'Calibration follow-up', type: 'Follow-up Audit', processes: ['p11'], auditor: 'nina',
      date: '2026-09-20', endDate: '2026-09-20', start: '09:00', end: '11:00', location: 'Warehouse, Valenzuela', opening: '09:00', closing: '10:45', plannedPeriod: 'Q3 2026', status: 'Scheduled',
      objective: 'Verify the corrective action for NC-2026-002 (calibration recall) is implemented and effective.', scope: 'Calibration register, recall tags and the CA-2026-06 records.', criteria: STD,
      team: [T('nina', 'Lead Auditor', ['p11'])],
      areas: [A('p11', 'paolo', 'nina', 'Not started')],
      report: { status: 'Not started', rev: null, reviewer: 'maria', approver: 'eric' } },
    // 2027 programme (draft): planned at period level; two are already scheduled.
    { id: 'IA-2027-01', programme: 'AP-2027', title: 'Procurement & Suppliers', type: 'Process Audit', processes: ['p05'], auditor: 'maria', date: '2027-02-15', endDate: '2027-02-15', start: '09:00', end: '15:30', location: 'Head office, Quezon City', opening: '09:00', closing: '15:00', plannedPeriod: 'Q1 2027', status: 'Checklist Ready',
      objective: 'Follow up on 2026 supplier nonconformities and confirm the scorecard process is effective.', scope: 'Supplier evaluation, ASL, scorecards.', criteria: STD,
      team: [T('maria', 'Lead Auditor', ['p05']), T('lea', 'Auditor', ['p05'], ['8.4.2'])], areas: [A('p05', 'joy', 'maria', 'Not started')], report: { status: 'Not started', rev: null, reviewer: 'nina', approver: 'eric' } },
    { id: 'IA-2027-02', programme: 'AP-2027', title: 'Engineering & Design', type: 'Process Audit', processes: ['p04'], auditor: 'nina', date: '2027-03-08', endDate: '2027-03-08', start: '09:00', end: '15:00', location: 'Head office, Quezon City', opening: '09:00', closing: '14:30', plannedPeriod: 'Q1 2027', status: 'Scheduled',
      objective: 'Confirm design inputs, verification and changes are controlled.', scope: 'Design and design change control for residential and commercial PV.', criteria: STD,
      team: [T('nina', 'Lead Auditor', ['p04']), T('ana', 'Auditor', ['p04'], ['8.3.6'])], areas: [A('p04', 'daniel', 'nina', 'Not started')], report: { status: 'Not started', rev: null, reviewer: 'maria', approver: 'eric' } },
    { id: 'IA-2027-03', programme: 'AP-2027', title: 'Installation & Testing', type: 'Process Audit', processes: ['p07', 'p08'], auditor: 'maria', date: null, endDate: null, start: '', end: '', location: '', opening: '', closing: '', plannedPeriod: 'Q2 2027', status: 'Planned',
      objective: 'Confirm installation and commissioning are carried out under controlled conditions.', scope: 'Project sites, installation work instructions, inspection and test records.', criteria: STD,
      team: [T('maria', 'Lead Auditor', [])], areas: [A('p07', 'carlos', null, 'Not started'), A('p08', 'ana', null, 'Not started')], report: { status: 'Not started', rev: null, reviewer: 'nina', approver: 'eric' } },
    { id: 'IA-2027-04', programme: 'AP-2027', title: 'Annual Internal QMS Audit 2027', type: 'Internal Audit', processes: ['p01', 'p12', 'p13', 'p14'], auditor: 'nina', date: null, endDate: null, start: '', end: '', location: '', opening: '', closing: '', plannedPeriod: 'Q3 2027', status: 'Planned',
      objective: 'System audit ahead of recertification.', scope: 'Management system processes.', criteria: STD,
      team: [T('nina', 'Lead Auditor', [])], areas: [A('p01', 'maria', null, 'Not started'), A('p12', 'maria', null, 'Not started'), A('p13', 'maria', null, 'Not started'), A('p14', 'eric', null, 'Not started')], report: { status: 'Not started', rev: null, reviewer: 'maria', approver: 'eric' } }
  ];

  /* ---------- Findings (all types). NCs carry an `nc` block. ---------- */
  const snap = (id, title, rev, status, by, date, kind = 'doc') => ({ kind, id, title, rev, status, by, date });
  const C = (id, who, at, text, refs = [], parent = null) => ({ id, who, at, text, refs, parent });
  const E = (at, who, text) => ({ at, who, text });
  D.findings = [
    { id: 'F-2026-04', audit: 'IA-2026-01', process: 'p03', clause: '8.3.3', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-04-09', status: 'Closed', action: 'CA-2026-04',
      title: 'Site survey missed roof structural check on two projects', statement: 'For projects SP-2026-031 and SP-2026-044 the site survey did not record a roof structural assessment, although the design relied on roof load capacity (8.3.3 design inputs).',
      evidence: [snap('SIT-CHK-002', 'Site Survey Checklist', '05', 'Published', 'maria', '2026-04-09')],
      nc: { no: 'NC-2026-001', classification: 'Minor', owner: 'marco', due: '2026-06-30', status: 'Closed',
        ca: { correction: 'Structural check done for both projects; no design change needed.', rootCause: 'The survey checklist had no roof structural item, so it depended on the surveyor remembering it.', action: 'Add a mandatory structural item to the Site Survey Checklist and brief surveyors.', owner: 'marco', due: '2026-06-30', impl: 'Implemented', evidence: [snap('SIT-CHK-002', 'Site Survey Checklist', '06', 'Published', 'marco', '2026-06-12')], submitted: { by: 'marco', date: '2026-06-12' } },
        verification: { result: 'Implemented', by: 'maria', date: '2026-06-20', note: 'Rev 06 of the checklist includes the item; 6 surveys sampled, all complete.' },
        effectiveness: { result: 'Effective', by: 'maria', date: '2026-09-18', note: 'No recurrence in 22 surveys since July.' },
        comments: [], events: [E('2026-04-09 15:40', 'maria', 'raised the nonconformity'), E('2026-06-12 10:05', 'marco', 'submitted the corrective action'), E('2026-06-20 14:00', 'maria', 'verified implementation'), E('2026-09-18 09:30', 'maria', 'confirmed effectiveness and closed the NC')] } },
    { id: 'F-2026-05', audit: 'IA-2026-02', process: 'p11', clause: '7.1.5', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-06-18', status: 'In Progress', action: 'CA-2026-06',
      title: 'Clamp meter used on site past calibration due date', statement: 'Clamp meter CM-07 was used for commissioning on 3 projects in June after its calibration expired on 31 May 2026.',
      evidence: [snap('EQP-PRO-002', 'Calibration & Verification Procedure', '03', 'Published', 'maria', '2026-06-18'), snap('E-022', 'Calibration certificate — insulation tester IT-04', 'Current', 'Verified', 'maria', '2026-06-18', 'evidence')],
      nc: { no: 'NC-2026-002', classification: 'Minor', owner: 'paolo', due: '2026-08-31', status: 'In Progress',
        ca: { correction: 'CM-07 withdrawn and recalibrated; readings on the 3 projects re-checked and within tolerance.', rootCause: 'No recall trigger when a calibration due date passes; tags were not visible on the instrument case.', action: 'Weekly recall list from the calibration register and coloured due-date tags on every instrument.', owner: 'paolo', due: '2026-08-31', impl: 'In progress', evidence: [], submitted: { by: 'paolo', date: '2026-07-02' } },
        verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-09-02 09:15', '@Paolo the recall list was due 31 Aug. What is left to do?'), C('c2', 'paolo', '2026-09-02 13:40', 'Tags are on all instruments. The weekly recall report needs IT to schedule it from the register — expected mid-October.', [], 'c1')],
        events: [E('2026-06-18 15:10', 'maria', 'raised the nonconformity'), E('2026-07-02 11:20', 'paolo', 'submitted the corrective action plan')] } },
    { id: 'F-2026-07', audit: 'IA-2026-03', process: 'p05', clause: '8.4.1', type: 'Major nonconformity', auditor: 'maria', raised: '2026-08-21', status: 'Action Assigned', action: 'CA-2026-09',
      title: 'Supplier performance not monitored for 2 of 5 critical suppliers', statement: 'No performance monitoring was recorded in 2026 for two of the five critical suppliers (inverters and mounting structures). The procedure requires quarterly monitoring. This is a systemic failure of 8.4.1 for critical suppliers.',
      evidence: [snap('PRC-PRO-004', 'Supplier Performance Monitoring Procedure', '02', 'Published', 'maria', '2026-08-21'), snap('E-009', 'Supplier performance scorecard — Q3 2026', 'Current', 'Missing', 'maria', '2026-08-21', 'evidence')],
      nc: { no: 'NC-2026-003', classification: 'Major', owner: 'joy', due: '2026-10-31', status: 'Action Assigned',
        ca: { correction: '', rootCause: '', action: '', owner: 'joy', due: '2026-10-31', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-08-25 09:30', '@Joy as a major NC this needs a root cause and plan within 30 days. Please also tell me which suppliers are affected.'), C('c2', 'joy', '2026-08-26 16:12', 'SunVolt Inverters and RackPro Structures. Starting the root-cause review with Eric this week.', [], 'c1')],
        events: [E('2026-08-21 15:20', 'maria', 'raised the nonconformity'), E('2026-08-22 08:00', 'maria', 'assigned the corrective action to Joy Aquino')] } },
    { id: 'F-2026-08', audit: 'IA-2026-03', process: 'p05', clause: '8.4.1', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-08-21', status: 'Verification Required', action: 'CA-2026-10',
      title: 'Approved Supplier List not updated after supplier removal', statement: 'A supplier suspended in June 2026 (BrightCable) was still listed as approved in the Approved Supplier List, and one purchase order was raised to it in July.',
      evidence: [snap('PRC-REG-002', 'Approved Supplier List', '11', 'Published', 'maria', '2026-08-21'), snap('PRC-PRO-001', 'Procurement Procedure', '05', 'Published', 'maria', '2026-08-21')],
      nc: { no: 'NC-2026-004', classification: 'Minor', owner: 'joy', due: '2026-09-15', status: 'Verification Required',
        ca: { correction: 'BrightCable removed from the ASL; the July order was reviewed and the cable was tested before use.', rootCause: 'The ASL is maintained by one buyer and nothing triggers an update when a supplier status changes.', action: 'Supplier status changes now go through the Supplier Evaluation Form, which updates the ASL; second buyer trained as back-up.', owner: 'joy', due: '2026-09-15', impl: 'Implemented', evidence: [snap('PRC-REG-002', 'Approved Supplier List', '12', 'Published', 'joy', '2026-09-12'), snap('E-008', 'Supplier evaluation — SunVolt Inverters 2026', 'Current', 'Verified', 'joy', '2026-09-12', 'evidence')], submitted: { by: 'joy', date: '2026-09-12' } },
        verification: null, effectiveness: null,
        comments: [
          C('c1', 'maria', '2026-09-08 10:24', '@Joy please confirm whether the ASL has been corrected and how status changes are triggered now.'),
          C('c2', 'joy', '2026-09-08 11:08', 'ASL Rev 12 is published without BrightCable. Status changes now go through the Supplier Evaluation Form — please review the updated records.', ['PRC-REG-002'], 'c1'),
          C('c3', 'maria', '2026-09-13 09:02', 'Thanks. I will sample three status changes from August–September when I verify.', [], 'c1')],
        events: [E('2026-08-21 15:25', 'maria', 'raised the nonconformity'), E('2026-09-12 16:40', 'joy', 'submitted the corrective action and requested verification')] } },
    { id: 'F-2026-09', audit: 'IA-2026-04', process: 'p10', clause: '7.2', type: 'Observation', auditor: 'nina', raised: '2026-09-10', status: 'Open', action: null,
      title: 'Training records incomplete for new installers', statement: 'Training attendance is recorded, but for 2 of 6 new installers the record does not show who confirmed they were competent to work unsupervised.', evidence: [snap('HR-REG-001', 'Competency Requirements', '03', 'Published', 'nina', '2026-09-10')] },
    { id: 'F-2026-10', audit: 'IA-2026-04', process: 'p08', clause: '10.3', type: 'Opportunity for improvement', auditor: 'nina', raised: '2026-09-10', status: 'Open', action: null,
      title: 'Commissioning checklists overlap and could be consolidated', statement: 'Two commissioning checklists cover the same insulation and polarity tests; one checklist would reduce duplicate entry.', evidence: [] },
    // IA-2026-05 (in progress, multi-area)
    { id: 'F-2026-21', audit: 'IA-2026-05', process: 'p05', clause: '8.4.1', type: 'Minor nonconformity', auditor: 'maria', raised: '2026-09-24', status: 'Open', action: null,
      title: 'Initial evaluation missing for two approved suppliers', statement: 'Two sampled approved suppliers (Luzon Fasteners, PV Connect) did not have documented initial supplier evaluations before being added to the Approved Supplier List.',
      evidence: [snap('PRC-REG-002', 'Approved Supplier List', '12', 'Published', 'maria', '2026-09-24'), snap('E-008', 'Supplier evaluation — SunVolt Inverters 2026', 'Current', 'Verified', 'maria', '2026-09-24', 'evidence')],
      nc: { no: 'NC-2026-005', classification: 'Minor', owner: 'joy', due: '2026-10-24', status: 'Open',
        ca: { correction: '', rootCause: '', action: '', owner: 'joy', due: '2026-10-24', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [C('c1', 'maria', '2026-09-25 10:24', '@Joy please confirm whether the missing supplier evaluations have now been completed, and when these two suppliers were added.'), C('c2', 'joy', '2026-09-26 11:08', 'Both were added in March during the rush for the Batangas project. Completing the evaluations this week.', [], 'c1')],
        events: [E('2026-09-24 14:05', 'maria', 'raised the nonconformity'), E('2026-09-24 14:05', 'system', 'notified Joy Aquino (area owner)')] } },
    { id: 'F-2026-22', audit: 'IA-2026-05', process: 'p10', clause: '7.2', type: 'Minor nonconformity', auditor: 'nina', raised: '2026-09-25', status: 'Action Assigned', action: null,
      title: 'Competence of new installers not evaluated', statement: 'For 2 of 6 installers hired in 2026, no evaluation of competence before unsupervised work was recorded (7.2 c, d). This repeats observation F-2026-09.',
      evidence: [snap('HR-REG-001', 'Competency Requirements', '03', 'Published', 'nina', '2026-09-25'), snap('E-020', 'Training records — electrical safety 2026', 'Current', 'Verified', 'nina', '2026-09-25', 'evidence')],
      nc: { no: 'NC-2026-006', classification: 'Minor', owner: 'rosa', due: '2026-10-30', status: 'Action Assigned',
        ca: { correction: '', rootCause: '', action: '', owner: 'rosa', due: '2026-10-30', impl: 'Not started', evidence: [], submitted: null }, verification: null, effectiveness: null,
        comments: [], events: [E('2026-09-25 11:30', 'nina', 'raised the nonconformity'), E('2026-09-25 11:31', 'nina', 'assigned the corrective action to Rosa Tan')] } },
    { id: 'F-2026-23', audit: 'IA-2026-05', process: 'p01', clause: '5.3', type: 'Observation', auditor: 'nina', raised: '2026-09-24', status: 'Open', action: null,
      title: 'Roles & Responsibilities Matrix review overdue', statement: 'The matrix (QMS-PRO-002 Rev 03) passed its review date; Rev 04 is in review. Responsibilities in practice matched the matrix in all 5 interviews.', evidence: [snap('QMS-PRO-002', 'Roles & Responsibilities Matrix', '03', 'Published', 'nina', '2026-09-24')] },
    { id: 'F-2026-24', audit: 'IA-2026-05', process: 'p04', clause: '8.3.4', type: 'Opportunity for improvement', auditor: 'ana', raised: '2026-09-26', status: 'Open', action: null,
      title: 'Design input checklist could record the reviewer’s licence number', statement: 'Design input checklists are signed but the PEE licence number of the reviewing engineer is not captured, which customers sometimes request.', evidence: [snap('ENG-FRM-002', 'Design Input Checklist', '04', 'Published', 'ana', '2026-09-26')] }
  ];

  /* Corrective actions raised from the NCs above stay in the existing Corrective Action register. */
  const ca = D.actions.find(a => a.id === 'CA-2026-04'); if (ca) Object.assign(ca, { stage: 'Closed', status: 'Closed — effective' });
  const ca10 = D.actions.find(a => a.id === 'CA-2026-10'); if (ca10) Object.assign(ca10, { stage: 'Action', status: 'Awaiting verification' });

  /* Area-report and checklist progress for the in-progress demo audit (applied when checklists are generated). */
  D.auditDemo = {
    'IA-2026-05': { p01: 1, p10: 1, p04: 1, p05: 0.8, p07: 0.6 },
    'IA-2026-04': { p10: 1 }, 'IA-2026-03': { p05: 1 }, 'IA-2026-02': { p11: 1, p06: 1 }, 'IA-2026-01': { p03: 1, p04: 1 }
  };
})();
