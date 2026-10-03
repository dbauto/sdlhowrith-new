/* iQMS v2 — sample organization data.
 *
 * Everything below is CONFIGURATION + SAMPLE RECORDS for one organization.
 * The UI never hard-codes these processes: the sidebar, workspace, tables and
 * reports are generated from `processes`, so a client with 8 or 20 processes,
 * different names or a different hierarchy needs no UI change.
 *
 * Conceptual keys follow the target data model:
 *   organization_id, process_id, parent_process_id, display_order, process_code
 * Display codes ("01", "07") are ordering labels only — hierarchy comes from
 * parent_process_id, never from the number.
 */
(() => {
  'use strict';
  const ORG = 'org-helios';

  const organization = {
    organization_id: ORG,
    name: 'Helios Solar Installations',
    initials: 'HS',
    industry: 'Solar installation',
    template: 'Solar Installation Company',
    // Level names are configurable per organization (e.g. Department → Process).
    hierarchyLabels: ['Process', 'Subprocess'],
    standard: 'ISO 9001:2026',
    today: '2026-09-27'
  };

  // reportsTo draws the organization chart (QMS → Organization & Scope, clause 5.3).
  const people = {
    maria: { name: 'Maria Santos', title: 'Quality & Compliance Manager', dept: 'Quality & Compliance', email: 'maria.santos@heliossolar.example', reportsTo: 'eric' },
    eric: { name: 'Eric Navarro', title: 'Managing Director', dept: 'Executive Management', email: 'eric.navarro@heliossolar.example', reportsTo: null },
    daniel: { name: 'Daniel Reyes', title: 'Engineering Manager', dept: 'Engineering', email: 'daniel.reyes@heliossolar.example', reportsTo: 'eric' },
    kim: { name: 'Kim Dela Cruz', title: 'Design Engineer', dept: 'Engineering', email: 'kim.delacruz@heliossolar.example', reportsTo: 'daniel' },
    grace: { name: 'Grace Lim', title: 'Sales & Customer Relations Manager', dept: 'Commercial', email: 'grace.lim@heliossolar.example', reportsTo: 'eric' },
    marco: { name: 'Marco Villanueva', title: 'Site Assessment Lead', dept: 'Engineering', email: 'marco.villanueva@heliossolar.example', reportsTo: 'daniel' },
    joy: { name: 'Joy Aquino', title: 'Procurement & Supply Chain Manager', dept: 'Supply Chain', email: 'joy.aquino@heliossolar.example', reportsTo: 'eric' },
    ben: { name: 'Ben Castillo', title: 'Warehouse Supervisor', dept: 'Operations', email: 'ben.castillo@heliossolar.example', reportsTo: 'carlos' },
    carlos: { name: 'Carlos Mendoza', title: 'Operations Manager', dept: 'Operations', email: 'carlos.mendoza@heliossolar.example', reportsTo: 'eric' },
    ana: { name: 'Ana Cruz', title: 'Commissioning Lead', dept: 'Operations', email: 'ana.cruz@heliossolar.example', reportsTo: 'carlos' },
    lea: { name: 'Lea Garcia', title: 'After-Sales Coordinator', dept: 'Commercial', email: 'lea.garcia@heliossolar.example', reportsTo: 'grace' },
    rosa: { name: 'Rosa Tan', title: 'People & Administration Manager', dept: 'People & Administration', email: 'rosa.tan@heliossolar.example', reportsTo: 'eric' },
    paolo: { name: 'Paolo Ramos', title: 'Equipment Coordinator', dept: 'Operations', email: 'paolo.ramos@heliossolar.example', reportsTo: 'carlos' },
    nina: { name: 'Nina Flores', title: 'Document Control Coordinator', dept: 'Quality & Compliance', email: 'nina.flores@heliossolar.example', reportsTo: 'maria' },
    aaron: { name: 'Aaron Lim', title: 'IT & Systems Administrator', dept: 'People & Administration', email: 'aaron.lim@heliossolar.example', reportsTo: 'rosa' },
    jun: { name: 'Jun Bautista', title: 'Installation Technician', dept: 'Operations', email: 'jun.bautista@heliossolar.example', reportsTo: 'carlos' },
    rick: { name: 'Rick Soriano', title: 'Former Site Engineer', dept: 'Operations', email: 'rick.soriano@heliossolar.example', reportsTo: 'carlos' }
  };
  const currentUser = 'maria';

  /* ---------- Process structure (first client configuration) ----------
   * element kinds: Procedure · Form · Record · Register · Plan · Activity · Policy
   * `doc` links an element to a controlled document, `ev` to evidence.        */
  const P = (id, code, name, owner, department, iso, purpose, inputs, outputs, roles, elements, parent = null) =>
    ({ process_id: id, organization_id: ORG, parent_process_id: parent, display_order: Number(code.split('.').pop()), process_code: code, name, owner, department, iso, purpose, inputs, outputs, roles, elements, status: 'active' });

  const processes = [
    P('p01', '01', 'QMS & Organization', 'maria', 'Quality', ['4.1', '4.2', '4.3', '4.4', '5.2', '5.3', '7.5'],
      'Defines the management-system boundaries, policy, organization, responsibilities and process architecture.',
      ['Business strategy', 'Interested-party needs', 'Legal & regulatory requirements'], ['QMS scope', 'Quality policy', 'Process map', 'Defined roles'],
      ['Quality Manager', 'General Manager', 'Document Controller'],
      [['QMS Scope', 'Policy', 'QMS-MAN-001'], ['Quality Policy', 'Policy', 'QMS-POL-001'], ['Organization', 'Record', 'QMS-ORG-001'], ['Roles & Responsibilities', 'Register', 'QMS-PRO-002'], ['Context & Interested Parties', 'Register', 'QMS-REG-003'], ['Process Map', 'Record', 'QMS-MAP-001']]),
    P('p02', '02', 'Sales & Customer', 'grace', 'Sales', ['8.2', '9.1.2'],
      'Controls how customer needs are understood, quoted, reviewed, agreed and monitored.',
      ['Customer enquiry', 'Utility & net-metering rules', 'Site assessment report'], ['Signed contract', 'Approved proposal', 'Customer feedback'],
      ['Sales Manager', 'Sales Engineers'],
      [['Customer Requirements', 'Form', 'SAL-FRM-002'], ['Sales Procedure', 'Procedure', 'SAL-PRO-001'], ['Contract Review', 'Procedure', 'SAL-PRO-003'], ['Proposal', 'Form', 'SAL-TPL-004'], ['Customer Feedback', 'Procedure', 'SAL-PRO-005']]),
    P('p03', '03', 'Site Assessment', 'marco', 'Operations', ['8.2.3', '8.3.3'],
      'Establishes a consistent basis for surveying a site and recording design-critical conditions.',
      ['Signed enquiry', 'Customer utility bills', 'Roof / land access'], ['Site survey checklist', 'Site photos', 'Site assessment report'],
      ['Site Assessment Lead', 'Site Surveyors'],
      [['Site Assessment Procedure', 'Procedure', 'SIT-PRO-001'], ['Site Survey Checklist', 'Form', 'SIT-CHK-002'], ['Site Photos', 'Record', null, 'E-004'], ['Site Assessment Report', 'Form', 'SIT-TPL-004']]),
    P('p04', '04', 'Engineering & Design', 'daniel', 'Engineering', ['8.3'],
      'Turns verified customer requirements and site inputs into reviewed, controlled installation designs.',
      ['Site assessment report', 'Customer requirements', 'Applicable codes & standards'], ['Approved design package', 'Drawings (layout, SLD)', 'Bill of materials'],
      ['Engineering Manager', 'Design Engineers'],
      [['Design Procedure', 'Procedure', 'ENG-PRO-001'], ['Design Inputs', 'Form', 'ENG-FRM-002'], ['Design Outputs', 'Procedure', 'ENG-PRO-003'], ['Design Review', 'Activity', 'ENG-FRM-004', 'E-005'], ['Drawings', 'Record', 'ENG-STD-005'], ['Design Changes', 'Procedure', 'ENG-PRO-006', 'E-006']]),
    P('p05', '05', 'Procurement & Suppliers', 'joy', 'Procurement', ['8.4'],
      'Controls purchasing requirements and the selection, evaluation and monitoring of suppliers.',
      ['Approved bill of materials', 'Project schedule'], ['Purchase orders', 'Approved supplier list', 'Supplier scorecards'],
      ['Procurement Manager', 'Buyers'],
      [['Procurement Procedure', 'Procedure', 'PRC-PRO-001'], ['Approved Supplier List', 'Register', 'PRC-REG-002'], ['Supplier Evaluation', 'Form', 'PRC-FRM-003', 'E-008'], ['Purchase Orders', 'Record', null, 'E-010'], ['Supplier Performance', 'Procedure', 'PRC-PRO-004', 'E-009']]),
    P('p06', '06', 'Materials & Warehouse', 'ben', 'Operations', ['8.5.2', '8.5.4', '8.7'],
      'Protects conformity through receiving, inspection, identification, storage and segregation of materials.',
      ['Deliveries', 'Purchase orders'], ['Accepted & identified stock', 'Quarantined nonconforming materials'],
      ['Warehouse Supervisor', 'Storekeepers'],
      [['Receiving Procedure', 'Procedure', 'WHS-PRO-001'], ['Receiving Inspection', 'Form', 'WHS-CHK-002', 'E-010'], ['Material Identification', 'Procedure', 'WHS-WI-003'], ['Storage', 'Procedure', 'WHS-WI-004'], ['Nonconforming Materials', 'Procedure', 'WHS-PRO-005', 'E-011']]),
    P('p07', '07', 'Project Installation', 'carlos', 'Operations', ['8.1', '8.5.1'],
      'Plans and controls field installation, inspections and work instructions, and retains project records.',
      ['Approved design package', 'Materials on site', 'Competent crew'], ['Installed system', 'Installation checklist', 'Site inspection record'],
      ['Projects Manager', 'Site Supervisors', 'Installers'],
      [['Project Plan', 'Plan', 'INS-PLN-001'], ['Installation Procedure', 'Procedure', 'INS-PRO-002'], ['Work Instructions', 'Procedure', 'INS-WI-003'], ['Installation Checklist', 'Form', 'INS-CHK-005', 'E-012'], ['Site Inspection', 'Activity', 'INS-FRM-006', 'E-013'], ['Project Records', 'Record', null, 'E-014']]),
    P('p07a', '07.1', 'Planning', 'carlos', 'Operations', ['8.1'], 'Schedules crews, materials and permits for each project.', ['Signed contract', 'Design package'], ['Project plan'], ['Projects Manager'], [['Project Plan', 'Plan', 'INS-PLN-001']], 'p07'),
    P('p07b', '07.2', 'Installation', 'carlos', 'Operations', ['8.5.1'], 'Performs mounting, cabling and inverter installation to approved instructions.', ['Project plan', 'Work instructions'], ['Installed system'], ['Site Supervisors', 'Installers'], [['Work Instructions', 'Procedure', 'INS-WI-003'], ['Installation Checklist', 'Form', 'INS-CHK-005', 'E-012']], 'p07'),
    P('p07c', '07.3', 'Site Inspection', 'carlos', 'Operations', ['8.5.1', '8.6'], 'Inspects completed installation before testing and commissioning.', ['Installed system'], ['Site inspection record'], ['Site Supervisors'], [['Site Inspection', 'Activity', 'INS-FRM-006', 'E-013']], 'p07'),
    P('p08', '08', 'Testing & Commissioning', 'ana', 'Operations', ['8.6', '7.1.5'],
      'Verifies installed-system performance and records commissioning and customer acceptance.',
      ['Inspected installation', 'Calibrated test equipment'], ['Test records', 'Commissioning report', 'Acceptance certificate'],
      ['Commissioning Lead', 'Test Technicians'],
      [['Testing Procedure', 'Procedure', 'TST-PRO-001'], ['Test Records', 'Record', 'TST-FRM-002', 'E-015'], ['Commissioning Checklist', 'Form', 'TST-CHK-003'], ['Commissioning Report', 'Form', 'TST-TPL-004', 'E-016'], ['Acceptance', 'Form', 'TST-FRM-005', 'E-017']]),
    P('p09', '09', 'Handover & After-Sales', 'lea', 'Customer Service', ['8.5.5', '9.1.2'],
      'Controls customer handover, warranty support, service requests and complaint handling.',
      ['Accepted system', 'Handover pack'], ['Customer handover record', 'Resolved service requests', 'Complaint records'],
      ['After-Sales Manager', 'Service Technicians'],
      [['Handover Procedure', 'Procedure', 'HND-PRO-001'], ['Customer Handover', 'Record', 'HND-PAK-002', 'E-018'], ['Warranty', 'Policy', 'HND-POL-003'], ['Service Requests', 'Procedure', 'HND-PRO-004'], ['Customer Complaints', 'Procedure', 'HND-PRO-005', 'E-019']]),
    P('p10', '10', 'People & Competence', 'rosa', 'People', ['7.2', '7.3'],
      'Defines competence needs and retains evidence of training, qualification and evaluation.',
      ['Role requirements', 'Licensing rules'], ['Competency matrix', 'Training records'],
      ['HR & Training Lead', 'Line managers'],
      [['Competency Requirements', 'Register', 'HR-REG-001'], ['Competency Matrix', 'Register', 'HR-MAT-002'], ['Training Plan', 'Plan', 'HR-PLN-003'], ['Training Records', 'Record', null, 'E-020'], ['Competency Evaluation', 'Procedure', 'HR-PRO-004', 'E-021']]),
    P('p11', '11', 'Equipment & Resources', 'paolo', 'Operations', ['7.1.3', '7.1.5'],
      'Keeps equipment, measuring instruments, vehicles, PPE and tools suitable and available.',
      ['Equipment purchases', 'Calibration schedule'], ['Equipment register', 'Calibration certificates'],
      ['Equipment Coordinator'],
      [['Equipment Register', 'Register', 'EQP-REG-001'], ['Calibration / Verification', 'Procedure', 'EQP-PRO-002', 'E-022'], ['Maintenance', 'Plan', 'EQP-PLN-003'], ['PPE / Tools', 'Procedure', 'EQP-PRO-004']]),
    P('p12', '12', 'Risk & Objectives', 'maria', 'Quality', ['6.1', '6.2', '9.1.3'],
      'Connects process risks and opportunities with treatment, quality objectives and KPI monitoring.',
      ['Process risks', 'Context register', 'Performance data'], ['Risk register', 'Quality objectives', 'KPI reports'],
      ['Quality Manager', 'Process Owners'],
      [['Risk Register', 'Register', 'RSK-PRO-001'], ['Risk Treatment', 'Activity', 'RSK-PRO-001'], ['Quality Objectives', 'Plan', 'QOB-PLN-001'], ['KPI Monitoring', 'Procedure', 'KPI-PRO-003', 'E-026']]),
    P('p13', '13', 'Audit & Improvement', 'maria', 'Quality', ['9.2', '10.2', '10.3'],
      'Checks conformity and drives correction, root-cause analysis, corrective action and effectiveness review.',
      ['Audit programme', 'Findings', 'Complaints'], ['Audit reports', 'Corrective actions', 'Effectiveness reviews'],
      ['Quality Manager', 'Internal Auditors'],
      [['Audit Program', 'Plan', 'AUD-PLN-002'], ['Internal Audit', 'Procedure', 'AUD-PRO-001', 'E-024'], ['Findings', 'Record'], ['Nonconformity', 'Procedure', 'AUD-PRO-003'], ['Root Cause', 'Activity'], ['Corrective Action', 'Activity', 'AUD-PRO-003'], ['Effectiveness', 'Activity']]),
    P('p14', '14', 'Management Review', 'eric', 'Management', ['5.1', '9.3'],
      'Provides a controlled forum for reviewing QMS performance, decisions and follow-up actions.',
      ['KPI results', 'Audit results', 'Customer feedback', 'Risk status'], ['Decisions', 'Management actions', 'Resource changes'],
      ['General Manager', 'Quality Manager'],
      [['Agenda', 'Form', 'MR-TPL-002'], ['Inputs', 'Record'], ['Meeting Records', 'Record', null, 'E-025'], ['Decisions', 'Record'], ['Action Tracking', 'Activity']])
  ].map(p => ({ ...p, elements: p.elements.map(([name, kind, doc = null, ev = null]) => ({ name, kind, doc, ev })) }));

  /* ---------- Controlled documents ----------
   * [id, title, process, type, activeRev, status, owner, updated, nextReview, workingRev]
   * activeRev = the published (controlled) revision; null when never published.
   * status    = lifecycle status of the latest revision.                        */
  const D = [
    ['QMS-MAN-001', 'QMS Scope Statement', 'p01', 'Manual', '02', 'Published', 'maria', '2026-03-10', '2027-03-10'],
    ['QMS-POL-001', 'Quality Policy', 'p01', 'Policy', '04', 'Published', 'eric', '2026-01-15', '2027-01-15'],
    ['QMS-ORG-001', 'Organization Chart', 'p01', 'Record', '06', 'Published', 'maria', '2026-07-02', '2027-07-02'],
    ['QMS-PRO-001', 'Document Control Procedure', 'p01', 'Procedure', '03', 'Published', 'nina', '2026-02-01', '2027-02-01'],
    ['QMS-PRO-002', 'Roles & Responsibilities Matrix', 'p01', 'Register', '03', 'In Review', 'maria', '2026-09-12', '2026-11-30', '04'],
    ['QMS-REG-003', 'Context & Interested Parties Register', 'p01', 'Register', '02', 'Published', 'maria', '2025-09-15', '2026-09-15'],
    ['QMS-MAP-001', 'Process Map', 'p01', 'Record', '05', 'Published', 'maria', '2026-05-20', '2027-05-20'],
    ['SAL-PRO-001', 'Sales Procedure', 'p02', 'Procedure', '04', 'Published', 'grace', '2025-10-20', '2026-10-20'],
    ['SAL-FRM-002', 'Customer Requirements Form', 'p02', 'Form', '03', 'Published', 'grace', '2026-04-08', '2027-04-08'],
    ['SAL-PRO-003', 'Contract Review Procedure', 'p02', 'Procedure', '02', 'Approval in Progress', 'grace', '2026-09-16', '2027-01-20', '03'],
    ['SAL-TPL-004', 'Proposal Template', 'p02', 'Form', '05', 'Published', 'grace', '2026-06-01', '2027-06-01'],
    ['SAL-PRO-005', 'Customer Feedback Procedure', 'p02', 'Procedure', '01', 'Published', 'grace', '2025-09-01', '2026-09-01'],
    ['SIT-PRO-001', 'Site Assessment Procedure', 'p03', 'Procedure', '03', 'Published', 'marco', '2026-04-22', '2027-04-22'],
    ['SIT-CHK-002', 'Site Survey Checklist', 'p03', 'Checklist', '06', 'In Review', 'marco', '2026-09-19', '2027-03-01', '07'],
    ['SIT-WI-003', 'Site Photo Capture Instruction', 'p03', 'Work Instruction', '02', 'Published', 'marco', '2026-02-14', '2027-02-14'],
    ['SIT-TPL-004', 'Site Assessment Report Template', 'p03', 'Form', '03', 'Published', 'marco', '2026-05-05', '2027-05-05'],
    ['ENG-PRO-001', 'Design Procedure', 'p04', 'Procedure', '03', 'Published', 'daniel', '2026-06-12', '2027-06-12'],
    ['ENG-FRM-002', 'Design Input Checklist', 'p04', 'Checklist', '04', 'Published', 'daniel', '2026-06-12', '2027-06-12'],
    ['ENG-PRO-003', 'Design Output & Verification Procedure', 'p04', 'Procedure', '02', 'Changes Requested', 'kim', '2026-09-24', '2027-02-10', '03'],
    ['ENG-FRM-004', 'Design Review Record', 'p04', 'Form', '03', 'Published', 'daniel', '2026-03-03', '2027-03-03'],
    ['ENG-STD-005', 'Drawing Standard — PV Layout & Single-Line Diagrams', 'p04', 'Standard', '05', 'Published', 'kim', '2025-09-10', '2026-09-10'],
    ['ENG-PRO-006', 'Design Change Control Procedure', 'p04', 'Procedure', '02', 'Approval in Progress', 'daniel', '2026-09-18', '2027-01-15', '03'],
    ['PRC-PRO-001', 'Procurement Procedure', 'p05', 'Procedure', '05', 'Published', 'joy', '2026-01-28', '2027-01-28'],
    ['PRC-REG-002', 'Approved Supplier List', 'p05', 'Register', '12', 'Published', 'joy', '2026-07-05', '2026-10-05'],
    ['PRC-FRM-003', 'Supplier Evaluation Form', 'p05', 'Form', '04', 'In Review', 'joy', '2026-09-20', '2027-02-28', '05'],
    ['PRC-PRO-004', 'Supplier Performance Monitoring Procedure', 'p05', 'Procedure', '02', 'Published', 'joy', '2025-08-30', '2026-08-30'],
    ['WHS-PRO-001', 'Receiving Procedure', 'p06', 'Procedure', '03', 'Published', 'ben', '2026-02-11', '2027-02-11'],
    ['WHS-CHK-002', 'Receiving Inspection Checklist', 'p06', 'Checklist', '04', 'Published', 'ben', '2026-02-11', '2027-02-11'],
    ['WHS-WI-003', 'Material Identification & Traceability', 'p06', 'Work Instruction', '02', 'Published', 'ben', '2026-03-19', '2027-03-19'],
    ['WHS-WI-004', 'Storage & Handling of PV Modules and Batteries', 'p06', 'Work Instruction', '03', 'Published', 'ben', '2026-05-27', '2027-05-27'],
    ['WHS-PRO-005', 'Control of Nonconforming Materials', 'p06', 'Procedure', null, 'Draft', 'ben', '2026-09-23', null, '00'],
    ['INS-PLN-001', 'Project Plan Template', 'p07a', 'Plan', '04', 'Published', 'carlos', '2026-04-02', '2027-04-02'],
    ['INS-PRO-002', 'Installation Procedure', 'p07', 'Procedure', '06', 'Published', 'carlos', '2026-05-14', '2027-05-14'],
    ['INS-WI-003', 'Rooftop Mounting Work Instruction', 'p07b', 'Work Instruction', '05', 'Published', 'carlos', '2026-05-14', '2027-05-14'],
    ['INS-WI-004', 'DC Cabling & Inverter Installation', 'p07b', 'Work Instruction', '04', 'Approval in Progress', 'carlos', '2026-09-21', '2027-03-21', '05'],
    ['INS-CHK-005', 'Installation Checklist', 'p07b', 'Checklist', '07', 'Published', 'carlos', '2026-06-30', '2027-06-30'],
    ['INS-FRM-006', 'Site Inspection Record', 'p07c', 'Form', '03', 'Published', 'carlos', '2026-01-09', '2027-01-09'],
    ['TST-PRO-001', 'Testing Procedure', 'p08', 'Procedure', '04', 'Published', 'ana', '2026-03-30', '2027-03-30'],
    ['TST-FRM-002', 'Test Record — IV Curve & Insulation', 'p08', 'Form', '03', 'Published', 'ana', '2026-03-30', '2027-03-30'],
    ['TST-CHK-003', 'Commissioning Checklist', 'p08', 'Checklist', '05', 'Published', 'ana', '2026-07-18', '2027-07-18'],
    ['TST-TPL-004', 'Commissioning Report Template', 'p08', 'Form', '02', 'Approved', 'ana', '2026-09-25', '2027-09-25', '03'],
    ['TST-FRM-005', 'Customer Acceptance Certificate', 'p08', 'Form', '02', 'Published', 'ana', '2026-02-02', '2027-02-02'],
    ['HND-PRO-001', 'Handover Procedure', 'p09', 'Procedure', '03', 'Published', 'lea', '2026-04-15', '2027-04-15'],
    ['HND-PAK-002', 'Customer Handover Pack', 'p09', 'Form', '04', 'Published', 'lea', '2026-04-15', '2027-04-15'],
    ['HND-POL-003', 'Warranty Policy', 'p09', 'Policy', '02', 'Published', 'lea', '2025-09-20', '2026-09-20'],
    ['HND-PRO-004', 'Service Request Handling', 'p09', 'Procedure', '02', 'Published', 'lea', '2026-01-12', '2027-01-12'],
    ['HND-PRO-005', 'Customer Complaint Handling', 'p09', 'Procedure', '03', 'Published', 'lea', '2026-06-08', '2027-06-08'],
    ['HR-REG-001', 'Competency Requirements', 'p10', 'Register', '03', 'Published', 'rosa', '2026-02-20', '2027-02-20'],
    ['HR-MAT-002', 'Competency Matrix', 'p10', 'Register', '09', 'Published', 'rosa', '2026-08-29', '2027-02-28'],
    ['HR-PLN-003', 'Training Plan 2026', 'p10', 'Plan', '02', 'Published', 'rosa', '2026-01-05', '2026-12-31'],
    ['HR-PRO-004', 'Training & Competency Evaluation Procedure', 'p10', 'Procedure', '03', 'Published', 'rosa', '2026-02-20', '2027-02-20'],
    ['EQP-REG-001', 'Equipment Register', 'p11', 'Register', '14', 'Published', 'paolo', '2026-09-02', '2026-12-02'],
    ['EQP-PRO-002', 'Calibration & Verification Procedure', 'p11', 'Procedure', '03', 'Published', 'paolo', '2026-03-11', '2027-03-11'],
    ['EQP-PLN-003', 'Preventive Maintenance Plan', 'p11', 'Plan', '02', 'Published', 'paolo', '2026-01-19', '2027-01-19'],
    ['EQP-PRO-004', 'PPE & Tool Control Procedure', 'p11', 'Procedure', '02', 'Published', 'paolo', '2025-09-25', '2026-09-25'],
    ['RSK-PRO-001', 'Risk & Opportunity Management Procedure', 'p12', 'Procedure', '02', 'Published', 'maria', '2026-02-06', '2027-02-06'],
    ['QOB-PLN-001', 'Quality Objectives 2026', 'p12', 'Plan', '01', 'Published', 'eric', '2026-01-10', '2026-12-31'],
    ['KPI-PRO-003', 'KPI Monitoring Procedure', 'p12', 'Procedure', '01', 'Published', 'maria', '2026-01-10', '2027-01-10'],
    ['AUD-PRO-001', 'Internal Audit Procedure', 'p13', 'Procedure', '04', 'Published', 'maria', '2026-02-25', '2027-02-25'],
    ['AUD-PLN-002', 'Audit Programme 2026', 'p13', 'Plan', '02', 'Published', 'maria', '2026-04-01', '2026-12-31'],
    ['AUD-PRO-003', 'Nonconformity & Corrective Action Procedure', 'p13', 'Procedure', '03', 'Published', 'maria', '2026-02-25', '2027-02-25'],
    ['MR-PRO-001', 'Management Review Procedure', 'p14', 'Procedure', '02', 'Published', 'eric', '2026-01-22', '2027-01-22'],
    ['MR-TPL-002', 'Management Review Agenda Template', 'p14', 'Form', '02', 'Published', 'maria', '2026-01-22', '2027-01-22']
  ];

  const folderFor = pid => ({ p01: '01 QMS & Organization', p02: '02 Sales & Customer', p03: '03 Site Assessment', p04: '04 Engineering & Design', p05: '05 Procurement & Suppliers', p06: '06 Materials & Warehouse', p07: '07 Project Installation', p07a: '07 Project Installation', p07b: '07 Project Installation', p07c: '07 Project Installation', p08: '08 Testing & Commissioning', p09: '09 Handover & After-Sales', p10: '10 People & Competence', p11: '11 Equipment & Resources', p12: '12 Risk & Objectives', p13: '13 Audit & Improvement', p14: '14 Management Review' })[pid];

  const docExtras = {
    'ENG-PRO-001': { refs: ['QMS-PRO-001', 'SIT-PRO-001'], related: ['ENG-FRM-002', 'ENG-FRM-004', 'ENG-PRO-006'], evidence: ['E-005', 'E-007'], iso: ['8.3.1', '8.3.2', '8.3.4'],
      description: 'Defines how solar installation designs are planned, developed from verified inputs, reviewed, verified and released for procurement and installation.' },
    'ENG-STD-005': { sourceState: 'unavailable' },
    'QMS-PRO-001': { related: ['QMS-MAP-001'], iso: ['7.5'], description: 'Defines creation, review, approval, publication, revision, distribution and withdrawal of controlled documents.' },
    'PRC-PRO-004': { evidence: ['E-009'], iso: ['8.4.1'] },
    'SAL-PRO-005': { evidence: ['E-001'], iso: ['9.1.2'] },
    'TST-PRO-001': { evidence: ['E-015', 'E-016'], iso: ['8.6'], refs: ['EQP-PRO-002'] }
  };

  /* Classification decides how a document is registered and what iQMS can read:
   *   Public · Internal                  → file uploaded to iQMS (shown in the viewer, read for assessment)
   *   Confidential · Highly Confidential → SharePoint link only; iQMS keeps the owner's description.
   * Anything not listed here is Internal.                                                   */
  const docClass = {
    'QMS-POL-001': 'Public', 'QMS-MAN-001': 'Public', 'HND-POL-003': 'Public',
    'QMS-REG-003': 'Confidential', 'SAL-PRO-003': 'Confidential', 'ENG-STD-005': 'Confidential', 'PRC-PRO-004': 'Confidential', 'PRC-FRM-003': 'Confidential',
    'PRC-REG-002': 'Highly Confidential', 'HR-MAT-002': 'Highly Confidential'
  };
  // Descriptions the owners gave for link-only documents: what the document covers, without its content.
  const restrictedDesc = {
    'QMS-REG-003': 'Register of internal and external issues and of interested parties with their requirements. Reviewed yearly by top management and used as an input to risk assessment and management review. Covers clauses 4.1 and 4.2.',
    'SAL-PRO-003': 'Procedure for reviewing customer contracts before acceptance: requirement checks, capability and capacity confirmation, commercial approval limits and how contract changes are recorded. Covers clause 8.2.',
    'ENG-STD-005': 'Company drawing standard for PV layouts and single-line diagrams: title blocks, symbols, layer naming, revision marking and the checks a drawing must pass before release. Referenced by the Design Procedure. Covers clause 8.3.',
    'PRC-PRO-004': 'Procedure for monitoring supplier performance: delivery, quality and responsiveness scoring, review frequency, thresholds for re-evaluation and removal from the approved list. Covers clause 8.4.',
    'PRC-FRM-003': 'Form used to evaluate a new or existing supplier against selection criteria (quality system, capacity, pricing terms, references) and to record the approval decision. Covers clause 8.4.',
    'PRC-REG-002': 'List of approved suppliers with their approved scope, evaluation date, performance rating and commercial terms. Updated after every evaluation; checked before each purchase order. Covers clause 8.4.',
    'HR-MAT-002': 'Matrix of each employee against the competencies required for their role, with qualification, licence and training status and expiry dates. Used to plan training and to assign licensed work. Covers clause 7.2.'
  };
  const fileSize = id => `${120 + (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 880} KB`;

  const documents = D.map(([id, title, process, type, rev, status, owner, updated, nextReview, workingRev = null]) => {
    const x = docExtras[id] || {};
    const fileRev = workingRev && status !== 'Published' ? workingRev : rev;
    const classification = docClass[id] || 'Internal';
    const link = ['Confidential', 'Highly Confidential'].includes(classification);
    const file = `${title.replace(/[—/]/g, '-')} Rev ${fileRev || '00'}.docx`;
    return {
      id, organization_id: ORG, title, process, type, rev, workingRev, status, owner, updated, nextReview,
      classification, department: people[owner].dept,
      effective: rev ? updated : null,
      description: restrictedDesc[id] || x.description || `Controlled ${type.toLowerCase()} for the ${title.toLowerCase()} activities of this process.`,
      // Link-only documents: who described the content and accepted the disclaimer.
      declared: link ? { by: owner, date: updated } : null,
      iso: x.iso || null,
      refs: x.refs || [], related: x.related || [], evidence: x.evidence || [],
      source: link
        ? { mode: 'link', system: 'SharePoint', site: 'Helios QMS', library: 'Restricted Documents', folder: folderFor(process), file,
          state: x.sourceState || 'connected', verified: x.sourceState === 'unavailable' ? '2026-09-02' : '2026-09-26' }
        : { mode: 'upload', system: 'iQMS', site: '', library: 'Document library', folder: folderFor(process), file, size: fileSize(id),
          state: 'connected', verified: updated }
    };
  });

  /* ---------- Revision history (auto-generated, with hand-written key docs) ---------- */
  const revisionNotes = {
    'ENG-PRO-001': [
      ['00', 'Initial issue of the design procedure.', 'daniel', '2023-02-14'],
      ['01', 'Added string-sizing verification and peer review for systems above 50 kWp.', 'kim', '2024-01-22'],
      ['02', 'Aligned design inputs with revised Site Survey Checklist; added battery storage designs.', 'kim', '2025-05-30'],
      ['03', 'Added design review gate before procurement release and drawing standard reference.', 'daniel', '2026-06-12']
    ],
    'QMS-PRO-001': [
      ['00', 'Initial issue.', 'nina', '2023-01-09'],
      ['01', 'Introduced SharePoint as the controlled document store.', 'nina', '2024-02-01'],
      ['02', 'Separated review, approval and publication steps.', 'maria', '2025-02-03'],
      ['03', 'Added link-only external documents and periodic review rules.', 'nina', '2026-02-01']
    ]
  };
  const revisions = {};
  documents.forEach(doc => {
    const list = [];
    if (revisionNotes[doc.id]) {
      revisionNotes[doc.id].forEach(([rev, summary, author, date]) => list.push({ rev, summary, author, date, reviewers: ['maria'], approval: 'Approved', published: date, state: 'Superseded' }));
    } else if (doc.rev) {
      const n = parseInt(doc.rev, 10);
      // Last publication: the working revision's date is not the publication date.
      const base = doc.workingRev && doc.nextReview ? `${Number(doc.nextReview.slice(0, 4)) - 1}${doc.nextReview.slice(4)}` : doc.updated;
      const year = parseInt(base.slice(0, 4), 10);
      for (let i = Math.max(0, n - 3); i <= n; i++) {
        const date = `${year - (n - i)}${base.slice(4)}`;
        list.push({ rev: String(i).padStart(2, '0'), summary: i === 0 ? 'Initial issue.' : i === n ? 'Periodic review; clarified responsibilities and records.' : 'Updated to reflect process changes.', author: doc.owner, date, reviewers: ['maria'], approval: 'Approved', published: date, state: 'Superseded' });
      }
    }
    if (list.length) list[list.length - 1].state = 'Published';
    if (doc.workingRev) list.push({ rev: doc.workingRev, summary: '', author: doc.owner, date: doc.updated, reviewers: [], approval: '', published: null, state: doc.status });
    revisions[doc.id] = list;
    const active = list.find(r => r.state === 'Published');
    doc.effective = active ? active.published : null;
  });
  const workingSummaries = {
    'QMS-PRO-002': 'Adds responsibilities for the new commissioning team and document controller role.',
    'SAL-PRO-003': 'Adds net-metering eligibility check and technical sign-off before contract signature.',
    'SIT-CHK-002': 'Adds mandatory roof structural assessment (corrective action CA-2026-04).',
    'ENG-PRO-003': 'Adds verification calculations for battery storage designs.',
    'ENG-PRO-006': 'Requires customer approval for design changes that affect system output.',
    'PRC-FRM-003': 'Adds delivery-performance and warranty-claim criteria to supplier evaluation.',
    'WHS-PRO-005': 'New procedure for quarantine, disposition and supplier return of nonconforming materials.',
    'INS-WI-004': 'Updates torque values and adds inverter manufacturer checklist references.',
    'TST-TPL-004': 'Adds battery storage commissioning section and customer signature block.'
  };
  Object.entries(workingSummaries).forEach(([id, s]) => { const r = revisions[id]?.find(x => x.state !== 'Published' && x.state !== 'Superseded'); if (r) r.summary = s; });

  /* ---------- Active review / approval / publication workflows ----------
   * One active workflow per document revision — a second one cannot be started. */
  const workflows = [
    { id: 'WF-118', doc: 'QMS-PRO-002', rev: '04', stage: 'review', startedBy: 'maria', started: '2026-09-12', due: '2026-09-26',
      reviewers: [{ who: 'eric', state: 'Completed', date: '2026-09-15' }, { who: 'maria', state: 'Pending' }], approvers: [{ who: 'eric', state: 'Not started' }], publisher: 'nina',
      comments: [{ who: 'eric', date: '2026-09-15', text: 'Please confirm who approves commissioning reports now that the team has grown.' }] },
    { id: 'WF-121', doc: 'SAL-PRO-003', rev: '03', stage: 'approval', startedBy: 'grace', started: '2026-09-16', due: '2026-09-29',
      reviewers: [{ who: 'daniel', state: 'Completed', date: '2026-09-18' }, { who: 'maria', state: 'Completed', date: '2026-09-19' }], approvers: [{ who: 'maria', state: 'Pending' }], publisher: 'nina',
      comments: [{ who: 'daniel', date: '2026-09-18', text: 'Technical sign-off step is clear. OK from engineering.' }] },
    { id: 'WF-123', doc: 'ENG-PRO-006', rev: '03', stage: 'approval', startedBy: 'daniel', started: '2026-09-18', due: '2026-09-30',
      reviewers: [{ who: 'kim', state: 'Completed', date: '2026-09-19' }, { who: 'maria', state: 'Completed', date: '2026-09-22' }], approvers: [{ who: 'eric', state: 'Pending' }], publisher: 'maria',
      comments: [{ who: 'maria', date: '2026-09-22', text: 'Reviewed against 8.3.6 — change records and customer approval are now covered.' }] },
    { id: 'WF-124', doc: 'SIT-CHK-002', rev: '07', stage: 'review', startedBy: 'marco', started: '2026-09-19', due: '2026-10-03',
      reviewers: [{ who: 'daniel', state: 'Pending' }, { who: 'carlos', state: 'Completed', date: '2026-09-21' }], approvers: [{ who: 'maria', state: 'Not started' }], publisher: 'nina', comments: [] },
    { id: 'WF-125', doc: 'PRC-FRM-003', rev: '05', stage: 'review', startedBy: 'joy', started: '2026-09-20', due: '2026-10-06',
      reviewers: [{ who: 'maria', state: 'Pending' }], approvers: [{ who: 'eric', state: 'Not started' }], publisher: 'nina', comments: [] },
    { id: 'WF-126', doc: 'INS-WI-004', rev: '05', stage: 'approval', startedBy: 'carlos', started: '2026-09-21', due: '2026-10-02',
      reviewers: [{ who: 'ana', state: 'Completed', date: '2026-09-23' }], approvers: [{ who: 'maria', state: 'Pending' }], publisher: 'nina', comments: [] },
    { id: 'WF-119', doc: 'ENG-PRO-003', rev: '03', stage: 'review', startedBy: 'kim', started: '2026-09-10', due: '2026-09-24', changesRequested: true,
      reviewers: [{ who: 'daniel', state: 'Completed', date: '2026-09-15' }, { who: 'maria', state: 'Changes requested', date: '2026-09-24' }], approvers: [{ who: 'daniel', state: 'Not started' }], publisher: 'nina',
      comments: [{ who: 'maria', date: '2026-09-24', text: 'Section 5 needs the verification calculation template reference, and battery sizing records must be listed as retained evidence.' }] },
    { id: 'WF-127', doc: 'TST-TPL-004', rev: '03', stage: 'publication', startedBy: 'ana', started: '2026-09-14', due: '2026-09-30',
      reviewers: [{ who: 'carlos', state: 'Completed', date: '2026-09-17' }], approvers: [{ who: 'maria', state: 'Approved', date: '2026-09-25' }], publisher: 'maria', comments: [] }
  ];

  /* ---------- Risks & opportunities ---------- */
  const R = (id, kind, title, process, l, i, treatment, owner, due, status, links = []) => ({ id, kind, title, process, likelihood: l, impact: i, treatment, owner, due, status, links });
  const risks = [
    R('R-001', 'Risk', 'Inverter supplier delivery delays', 'p05', 4, 4, 'Qualify a second inverter supplier; dual-source top three SKUs.', 'joy', '2026-10-31', 'In treatment', ['PRC-PRO-001']),
    R('R-002', 'Risk', 'Roof structural condition not assessed before design', 'p03', 3, 5, 'Mandatory structural check in Site Survey Checklist Rev 07.', 'marco', '2026-10-15', 'In treatment', ['SIT-CHK-002']),
    R('R-004', 'Risk', 'Working-at-height incident during rooftop installation', 'p07', 3, 5, 'Harness inspection before each job; weekly toolbox talks recorded.', 'carlos', '2026-10-10', 'Open', ['INS-WI-003']),
    R('R-003', 'Risk', 'String-sizing errors in system design', 'p04', 2, 4, 'Peer design review for all systems above 50 kWp.', 'daniel', '2026-12-31', 'Monitoring', ['ENG-PRO-001']),
    R('R-005', 'Risk', 'PV module damage during storage and transport', 'p06', 3, 3, 'Racking and handling instruction; damage logged at receipt.', 'ben', '2026-11-30', 'Monitoring', ['WHS-WI-004']),
    R('R-006', 'Risk', 'Out-of-calibration test instruments used on site', 'p11', 3, 4, 'Calibration recall list and visible tag system.', 'paolo', '2026-10-01', 'In treatment', ['EQP-PRO-002']),
    R('R-007', 'Risk', 'Loss of licensed electricians', 'p10', 3, 4, 'Cross-training plan and retention review.', 'rosa', '2026-12-15', 'Open'),
    R('R-008', 'Risk', 'Contract scope misunderstood by customer', 'p02', 3, 3, 'Contract review includes scope walkthrough with customer.', 'grace', '2026-10-30', 'In treatment', ['SAL-PRO-003']),
    R('R-009', 'Risk', 'Commissioning test failures delay acceptance', 'p08', 2, 3, 'Pre-commissioning inspection checklist.', 'ana', '2026-12-31', 'Monitoring'),
    R('R-010', 'Risk', 'Warranty claim backlog exceeds response target', 'p09', 3, 3, 'Weekly claim triage; supplier escalation path.', 'lea', '2026-11-15', 'Open'),
    R('R-011', 'Risk', 'Changes to net-metering regulations', 'p01', 3, 4, 'Quarterly regulatory watch reported to management review.', 'eric', '2026-12-31', 'Monitoring'),
    R('R-012', 'Risk', 'Audit programme slips during peak installation season', 'p13', 3, 3, 'Schedule audits outside peak months; train two more auditors.', 'maria', '2026-11-30', 'Open', ['AUD-PLN-002']),
    R('O-001', 'Opportunity', 'Offer remote monitoring subscription at handover', 'p09', 4, 3, 'Pilot with 20 customers in Q4.', 'lea', '2026-12-31', 'Evaluating'),
    R('O-002', 'Opportunity', 'Digital site survey with geotagged photos', 'p03', 4, 3, 'Trial survey app on three projects.', 'marco', '2026-11-30', 'Evaluating'),
    R('O-003', 'Opportunity', 'Supplier scorecards generated from ERP data', 'p05', 3, 3, 'Scope integration with ERP purchasing module.', 'joy', '2027-01-31', 'Evaluating')
  ];

  /* ---------- Objectives & KPIs ---------- */
  const K = (id, name, process, objective, target, dir, actual, unit, trend, owner, period) => ({ id, name, process, objective, target, dir, actual, unit, trend, owner, period });
  const kpis = [
    K('K-01', 'Customer satisfaction', 'p02', 'Delight customers from quote to handover', 90, '≥', 87, '%', [91, 90, 89, 88, 88, 87], 'grace', 'Q3 2026'),
    K('K-02', 'Proposal-to-contract conversion', 'p02', 'Grow residential sales', 30, '≥', 34, '%', [28, 29, 31, 33, 32, 34], 'grace', 'Q3 2026'),
    K('K-03', 'Site surveys completed within 5 days', 'p03', 'Shorten time to proposal', 95, '≥', 92, '%', [96, 95, 94, 93, 91, 92], 'marco', 'Sep 2026'),
    K('K-04', 'Designs right first time', 'p04', 'Reduce design rework', 95, '≥', 96, '%', [93, 94, 94, 95, 96, 96], 'daniel', 'Sep 2026'),
    K('K-05', 'Design reviews before release', 'p04', 'Reduce design rework', 100, '=', 100, '%', [100, 100, 100, 100, 100, 100], 'daniel', 'Sep 2026'),
    K('K-06', 'Supplier on-time delivery', 'p05', 'Reliable material supply', 92, '≥', 84, '%', [90, 89, 88, 86, 85, 84], 'joy', 'Sep 2026'),
    K('K-07', 'Receiving inspection rejects', 'p06', 'Only conforming materials to site', 2, '≤', 1.4, '%', [2.1, 1.9, 1.7, 1.6, 1.5, 1.4], 'ben', 'Sep 2026'),
    K('K-08', 'Installations completed on schedule', 'p07', 'Deliver projects on time', 90, '≥', 88, '%', [91, 90, 90, 89, 88, 88], 'carlos', 'Sep 2026'),
    K('K-15', 'Lost-time incidents', 'p07', 'Zero harm on site', 0, '=', 0, '', [0, 0, 1, 0, 0, 0], 'carlos', 'YTD 2026'),
    K('K-09', 'First-pass acceptance', 'p08', 'Systems accepted without rework', 95, '≥', 97, '%', [94, 95, 96, 96, 97, 97], 'ana', 'Sep 2026'),
    K('K-10', 'Complaints answered within 48 h', 'p09', 'Responsive after-sales service', 95, '≥', 96, '%', [92, 93, 95, 95, 96, 96], 'lea', 'Sep 2026'),
    K('K-11', 'Training plan completion', 'p10', 'Competent, licensed workforce', 90, '≥', 78, '%', [60, 64, 69, 72, 75, 78], 'rosa', 'YTD 2026'),
    K('K-12', 'Overdue calibrations', 'p11', 'Reliable measurement', 0, '=', 1, '', [0, 0, 0, 0, 1, 1], 'paolo', 'Sep 2026'),
    K('K-13', 'Corrective actions closed on time', 'p13', 'Effective improvement', 85, '≥', 71, '%', [82, 80, 78, 75, 73, 71], 'maria', 'YTD 2026'),
    K('K-14', 'Management actions closed', 'p14', 'Decisions followed through', 90, '≥', 92, '%', [85, 87, 88, 90, 91, 92], 'eric', 'YTD 2026')
  ];

  /* ---------- Evidence (from any source system) ---------- */
  const E = (id, name, process, control, system, record, date, owner, status, iso, doc = null) => ({ id, name, process, control, source: { system, record }, date, owner, status, iso, doc });
  const evidence = [
    E('E-001', 'Customer satisfaction survey results — Q3 2026', 'p02', 'Customer Feedback', 'CRM', 'Survey report CSAT-2026-Q3', '2026-09-05', 'grace', 'Verified', '9.1.2', 'SAL-PRO-005'),
    E('E-002', 'Contract review — project SP-2026-118', 'p02', 'Contract Review', 'CRM', 'Deal SP-2026-118 · review checklist', '2026-08-11', 'grace', 'Verified', '8.2.3', 'SAL-PRO-003'),
    E('E-003', 'Site survey — project SP-2026-121', 'p03', 'Site Survey Checklist', 'SharePoint', 'Projects / SP-2026-121 / Survey', '2026-08-20', 'marco', 'Verified', '8.2.3', 'SIT-CHK-002'),
    E('E-004', 'Site photos — project SP-2026-124', 'p03', 'Site Photos', 'Upload', 'SP-2026-124-photos.zip', '2026-09-18', 'marco', 'Pending verification', '8.3.3', 'SIT-WI-003'),
    E('E-005', 'Design review record — project SP-2026-118', 'p04', 'Design Review', 'SharePoint', 'Engineering / SP-2026-118 / Design Review.pdf', '2026-08-28', 'daniel', 'Verified', '8.3.4', 'ENG-FRM-004'),
    E('E-006', 'Design change approval — ECN-2026-014', 'p04', 'Design Changes', 'SharePoint', 'Engineering / Changes / ECN-2026-014.pdf', '2026-07-30', 'kim', 'Link unavailable', '8.3.6', 'ENG-PRO-006'),
    E('E-007', 'Design verification calculations — SP-2026-121', 'p04', 'Design Outputs', 'SharePoint', 'Not linked', null, 'kim', 'Missing', '8.3.5', 'ENG-PRO-003'),
    E('E-008', 'Supplier evaluation — SunVolt Inverters 2026', 'p05', 'Supplier Evaluation', 'ERP', 'Vendor V-1042 · evaluation', '2026-06-14', 'joy', 'Verified', '8.4.1', 'PRC-FRM-003'),
    E('E-009', 'Supplier performance scorecard — Q3 2026', 'p05', 'Supplier Performance', 'ERP', 'Not linked (kept in spreadsheet)', null, 'joy', 'Missing', '8.4.1', 'PRC-PRO-004'),
    E('E-010', 'Goods receipt & inspection log — September', 'p06', 'Receiving Inspection', 'ERP', 'Goods receipts GR-2026-09', '2026-09-26', 'ben', 'Verified', '8.4.2', 'WHS-CHK-002'),
    E('E-011', 'Quarantine log — nonconforming materials', 'p06', 'Nonconforming Materials', 'SharePoint', 'Warehouse / Quarantine log.xlsx', '2026-09-22', 'ben', 'Pending verification', '8.7', 'WHS-PRO-005'),
    E('E-012', 'Installation checklist — project SP-2026-110', 'p07', 'Installation Checklist', 'SharePoint', 'Projects / SP-2026-110 / Installation', '2026-09-08', 'carlos', 'Verified', '8.5.1', 'INS-CHK-005'),
    E('E-013', 'Site inspection record — project SP-2026-110', 'p07', 'Site Inspection', 'Upload', 'SP-2026-110-inspection.pdf', '2026-09-10', 'carlos', 'Verified', '8.5.1', 'INS-FRM-006'),
    E('E-014', 'Toolbox talk attendance — September', 'p07', 'Work Instructions (safety)', 'HRIS', 'Not linked', null, 'carlos', 'Missing', '7.3', 'INS-WI-003'),
    E('E-015', 'IV curve & insulation test records — SP-2026-110', 'p08', 'Test Records', 'SharePoint', 'Projects / SP-2026-110 / Tests', '2026-09-12', 'ana', 'Verified', '8.6', 'TST-FRM-002'),
    E('E-016', 'Commissioning report — project SP-2026-105', 'p08', 'Commissioning Report', 'SharePoint', 'Projects / SP-2026-105 / Commissioning.pdf', '2026-09-03', 'ana', 'Verified', '8.6', 'TST-TPL-004'),
    E('E-017', 'Customer acceptance certificate — SP-2026-105', 'p08', 'Acceptance', 'Upload', 'SP-2026-105-acceptance-signed.pdf', '2026-09-04', 'ana', 'Verified', '8.6', 'TST-FRM-005'),
    E('E-018', 'Handover acknowledgement — SP-2026-105', 'p09', 'Customer Handover', 'CRM', 'Deal SP-2026-105 · handover task', '2026-09-06', 'lea', 'Pending verification', '8.5.5', 'HND-PAK-002'),
    E('E-019', 'Complaint log — Q3 2026', 'p09', 'Customer Complaints', 'CRM', 'Cases CC-2026-Q3', '2026-09-25', 'lea', 'Verified', '9.1.2', 'HND-PRO-005'),
    E('E-020', 'Training records — electrical safety 2026', 'p10', 'Training Records', 'HRIS', 'Course ES-2026 · completions', '2026-08-30', 'rosa', 'Verified', '7.2', 'HR-PLN-003'),
    E('E-021', 'Competency evaluation — installer intake 3', 'p10', 'Competency Evaluation', 'HRIS', 'Not linked', null, 'rosa', 'Missing', '7.2', 'HR-PRO-004'),
    E('E-022', 'Calibration certificate — insulation tester IT-04', 'p11', 'Calibration / Verification', 'Upload', 'IT-04-cal-2026.pdf', '2026-05-18', 'paolo', 'Verified', '7.1.5', 'EQP-PRO-002'),
    E('E-023', 'Calibration certificate — clamp meter CM-07', 'p11', 'Calibration / Verification', 'Upload', 'Expired 12 Sep 2026 — renewal not linked', null, 'paolo', 'Missing', '7.1.5', 'EQP-PRO-002'),
    E('E-024', 'Internal audit report — IA-2026-03 Procurement', 'p13', 'Internal Audit', 'SharePoint', 'Quality / Audits / IA-2026-03.pdf', '2026-08-21', 'maria', 'Verified', '9.2', 'AUD-PRO-001'),
    E('E-025', 'Management review minutes — H1 2026', 'p14', 'Meeting Records', 'SharePoint', 'Management / Reviews / MR-2026-H1.docx', '2026-07-15', 'eric', 'Verified', '9.3', 'MR-PRO-001'),
    E('E-026', 'Quality objectives monitoring — Q3 2026', 'p12', 'KPI Monitoring', 'SharePoint', 'Quality / KPIs / Q3-2026.xlsx', '2026-09-24', 'maria', 'Pending verification', '6.2', 'KPI-PRO-003')
  ];

  /* ---------- ISO 9001 requirements mapped to processes ---------- */
  const I = (clause, title, processes, controls, ev, status, note = '') => ({ clause, title, processes, controls, evidence: ev, status, note });
  const iso = [
    I('4.1', 'Understanding the organization and its context', ['p01'], ['QMS-REG-003'], [], 'Partially Complete', 'Context register review overdue since 15 Sep 2026.'),
    I('4.2', 'Needs and expectations of interested parties', ['p01'], ['QMS-REG-003'], [], 'Partially Complete', 'Same register; review overdue.'),
    I('4.3', 'Scope of the quality management system', ['p01'], ['QMS-MAN-001'], [], 'Complete'),
    I('4.4', 'QMS and its processes', ['p01'], ['QMS-MAP-001'], [], 'Complete'),
    I('5.1', 'Leadership and commitment', ['p14'], ['MR-PRO-001'], ['E-025'], 'Complete'),
    I('5.2', 'Quality policy', ['p01'], ['QMS-POL-001'], [], 'Complete'),
    I('5.3', 'Roles, responsibilities and authorities', ['p01'], ['QMS-PRO-002'], [], 'At Risk', 'Rev 04 review overdue; commissioning team roles not yet defined.'),
    // ISO 9001:2026 separates risks (6.1.2) and opportunities (6.1.3); 2015 had one clause 6.1.
    I('6.1.2', 'Actions to address risks', ['p12'], ['RSK-PRO-001'], [], 'Partially Complete', 'Three high risks with treatment due in October.'),
    I('6.1.3', 'Actions to address opportunities', ['p12'], ['RSK-PRO-001'], [], 'Partially Complete', 'Three opportunities recorded; expected benefit not yet evaluated.'),
    I('6.2', 'Quality objectives and planning to achieve them', ['p12'], ['QOB-PLN-001', 'KPI-PRO-003'], ['E-026'], 'Partially Complete', 'Q3 monitoring evidence awaiting verification.'),
    I('7.1.3', 'Infrastructure', ['p11'], ['EQP-REG-001', 'EQP-PLN-003'], [], 'Complete'),
    I('7.1.5', 'Monitoring and measuring resources', ['p11', 'p08'], ['EQP-PRO-002'], ['E-022', 'E-023'], 'At Risk', 'Clamp meter CM-07 calibration expired 12 Sep 2026.'),
    I('7.1.6', 'Organizational knowledge', ['p10'], ['HR-REG-001'], [], 'Missing', 'No documented approach to retaining design and installation know-how.'),
    I('7.2', 'Competence', ['p10'], ['HR-REG-001', 'HR-MAT-002', 'HR-PRO-004'], ['E-020', 'E-021'], 'Partially Complete', 'Competency evaluation for installer intake 3 not linked.'),
    I('7.3', 'Awareness', ['p10', 'p07'], ['HR-PLN-003'], ['E-014'], 'Partially Complete', 'Toolbox talk attendance for September not linked.'),
    I('7.5', 'Documented information', ['p01'], ['QMS-PRO-001'], [], 'Complete'),
    I('8.1', 'Operational planning and control', ['p07'], ['INS-PLN-001', 'INS-PRO-002'], [], 'Complete'),
    I('8.2', 'Requirements for products and services', ['p02', 'p03'], ['SAL-PRO-001', 'SAL-PRO-003', 'SAL-FRM-002'], ['E-002', 'E-003'], 'Complete'),
    I('8.3', 'Design and development of products and services', ['p04', 'p03'], ['ENG-PRO-001', 'ENG-FRM-002', 'ENG-PRO-003', 'ENG-FRM-004', 'ENG-PRO-006'], ['E-005', 'E-006', 'E-007'], 'Partially Complete', 'Verification evidence missing for SP-2026-121; ECN-2026-014 link unavailable.'),
    I('8.4', 'Control of externally provided processes, products and services', ['p05', 'p06'], ['PRC-PRO-001', 'PRC-REG-002', 'PRC-PRO-004'], ['E-008', 'E-009', 'E-010'], 'At Risk', 'Major finding F-2026-07 open; supplier performance monitoring overdue.'),
    I('8.5.1', 'Control of production and service provision', ['p07'], ['INS-PRO-002', 'INS-WI-003', 'INS-CHK-005'], ['E-012', 'E-013'], 'Complete'),
    I('8.5.2', 'Identification and traceability', ['p06'], ['WHS-WI-003'], ['E-010'], 'Complete'),
    I('8.5.3', 'Property belonging to customers or external providers', ['p06'], [], [], 'Not Applicable', 'Justified in QMS scope: no customer-supplied materials are handled.'),
    I('8.5.4', 'Preservation', ['p06'], ['WHS-WI-004'], [], 'Complete'),
    I('8.5.5', 'Post-delivery activities', ['p09'], ['HND-PRO-001', 'HND-POL-003', 'HND-PRO-004'], ['E-018'], 'Partially Complete', 'Warranty policy review overdue; handover evidence pending verification.'),
    I('8.6', 'Release of products and services', ['p08', 'p07'], ['TST-PRO-001', 'TST-CHK-003', 'TST-FRM-005'], ['E-015', 'E-016', 'E-017'], 'Complete'),
    I('8.7', 'Control of nonconforming outputs', ['p06', 'p08'], ['WHS-PRO-005'], ['E-011'], 'Missing', 'Control of Nonconforming Materials has never been published (Rev 00 draft).'),
    I('9.1.2', 'Customer satisfaction', ['p02', 'p09'], ['SAL-PRO-005', 'HND-PRO-005'], ['E-001', 'E-019'], 'Partially Complete', 'Procedure review overdue; satisfaction 87% against 90% target.'),
    I('9.1.3', 'Analysis and evaluation', ['p12'], ['KPI-PRO-003'], ['E-026'], 'Partially Complete', 'Q3 KPI analysis pending verification.'),
    I('9.2', 'Internal audit', ['p13'], ['AUD-PRO-001', 'AUD-PLN-002'], ['E-024'], 'Partially Complete', '4 of 6 planned audits completed; 2 scheduled for Q4.'),
    I('9.3', 'Management review', ['p14'], ['MR-PRO-001', 'MR-TPL-002'], ['E-025'], 'Complete'),
    I('10.2', 'Nonconformity and corrective action', ['p13'], ['AUD-PRO-003'], [], 'At Risk', 'Two corrective actions overdue; effectiveness not yet verified for CA-2026-04.'),
    I('10.3', 'Continual improvement', ['p13'], ['AUD-PRO-003'], [], 'Partially Complete', 'Improvement opportunities recorded but not yet prioritised.')
  ];

  /* ---------- Audits, findings, corrective actions, improvements ---------- */
  const audits = [
    { id: 'IA-2026-01', title: 'Site Assessment & Design', processes: ['p03', 'p04'], date: '2026-04-09', auditor: 'maria', status: 'Completed' },
    { id: 'IA-2026-02', title: 'Equipment & Warehouse', processes: ['p11', 'p06'], date: '2026-06-18', auditor: 'maria', status: 'Completed' },
    { id: 'IA-2026-03', title: 'Procurement & Suppliers', processes: ['p05'], date: '2026-08-21', auditor: 'maria', status: 'Completed' },
    { id: 'IA-2026-04', title: 'People & Competence', processes: ['p10'], date: '2026-09-10', auditor: 'nina', status: 'Completed' },
    { id: 'IA-2026-05', title: 'Installation, Testing & Commissioning', processes: ['p07', 'p08'], date: '2026-10-14', auditor: 'maria', status: 'Planned' },
    { id: 'IA-2026-06', title: 'Sales, Handover & After-Sales', processes: ['p02', 'p09'], date: '2026-11-18', auditor: 'nina', status: 'Planned' }
  ];
  const findings = [
    { id: 'F-2026-07', title: 'Supplier performance not monitored for 2 of 5 critical suppliers', process: 'p05', audit: 'IA-2026-03', type: 'Major nonconformity', clause: '8.4.1', raised: '2026-08-21', status: 'Open', action: 'CA-2026-09' },
    { id: 'F-2026-08', title: 'Approved Supplier List not updated after supplier removal', process: 'p05', audit: 'IA-2026-03', type: 'Minor nonconformity', clause: '8.4.1', raised: '2026-08-21', status: 'Open', action: 'CA-2026-10' },
    { id: 'F-2026-05', title: 'Clamp meter used on site past calibration due date', process: 'p11', audit: 'IA-2026-02', type: 'Minor nonconformity', clause: '7.1.5', raised: '2026-06-18', status: 'Open', action: 'CA-2026-06' },
    { id: 'F-2026-04', title: 'Site survey missed roof structural check on two projects', process: 'p03', audit: 'IA-2026-01', type: 'Minor nonconformity', clause: '8.3.3', raised: '2026-04-09', status: 'Closed', action: 'CA-2026-04' },
    { id: 'F-2026-09', title: 'Training records incomplete for new installers', process: 'p10', audit: 'IA-2026-04', type: 'Observation', clause: '7.2', raised: '2026-09-10', status: 'Open', action: null },
    { id: 'F-2026-10', title: 'Commissioning checklists overlap and could be consolidated', process: 'p08', audit: 'IA-2026-04', type: 'Opportunity for improvement', clause: '10.3', raised: '2026-09-10', status: 'Open', action: null }
  ];
  const actions = [
    { id: 'CA-2026-04', title: 'Add mandatory structural check to site survey', process: 'p03', source: 'F-2026-04', rootCause: 'Checklist did not include a roof structural item.', owner: 'marco', due: '2026-09-30', stage: 'Effectiveness', status: 'Awaiting effectiveness review' },
    { id: 'CA-2026-06', title: 'Calibration recall list and visible tag system', process: 'p11', source: 'F-2026-05', rootCause: 'No recall trigger when a calibration due date passes.', owner: 'paolo', due: '2026-08-31', stage: 'Action', status: 'In progress' },
    { id: 'CA-2026-09', title: 'Introduce quarterly supplier scorecards', process: 'p05', source: 'F-2026-07', rootCause: 'Under investigation', owner: 'joy', due: '2026-10-31', stage: 'Root cause', status: 'In progress' },
    { id: 'CA-2026-10', title: 'Update ASL when a supplier status changes', process: 'p05', source: 'F-2026-08', rootCause: 'ASL owned by one buyer; no trigger on status change.', owner: 'joy', due: '2026-09-15', stage: 'Action', status: 'In progress' },
    { id: 'CA-2026-11', title: 'Inverter fault after handover — project SP-2026-098', process: 'p09', source: 'Complaint CC-2026-022', rootCause: 'Under investigation', owner: 'lea', due: '2026-10-20', stage: 'Root cause', status: 'In progress' },
    { id: 'CA-2026-03', title: 'Commissioning reports missing customer signature', process: 'p08', source: 'Complaint CC-2026-011', rootCause: 'Signature block optional on template.', owner: 'ana', due: '2026-06-30', stage: 'Closed', status: 'Closed — effective' }
  ];
  const improvements = [
    { id: 'IO-01', process: 'p05', area: 'Supplier Evaluation', issue: 'Manual data entry between ERP and the supplier spreadsheet', proposal: 'Workflow automation', kind: 'Automation opportunity', status: 'Proposed', owner: 'joy' },
    { id: 'IO-02', process: 'p03', area: 'Site Photos', issue: 'Photos emailed from site and re-uploaded by hand', proposal: 'Direct upload from a survey app to the project folder', kind: 'Automation opportunity', status: 'Under review', owner: 'marco' },
    { id: 'IO-03', process: 'p09', area: 'Customer Handover', issue: 'Handover pack assembled manually from six sources', proposal: 'Assemble pack automatically from project records', kind: 'Automation opportunity', status: 'Proposed', owner: 'lea' },
    { id: 'IO-04', process: 'p08', area: 'Commissioning Checklist', issue: 'Two overlapping checklists', proposal: 'Consolidate into one checklist', kind: 'Improvement opportunity', status: 'Proposed', owner: 'ana' }
  ];
  const managementActions = [
    { id: 'MA-2026-07', title: 'Approve budget for second inverter supplier qualification', owner: 'eric', due: '2026-10-15', status: 'Open', process: 'p05' },
    { id: 'MA-2026-08', title: 'Recruit two licensed electricians', owner: 'rosa', due: '2026-11-30', status: 'Open', process: 'p10' },
    { id: 'MA-2026-05', title: 'Launch customer satisfaction follow-up calls', owner: 'grace', due: '2026-09-30', status: 'Open', process: 'p02' }
  ];

  const activity = [
    ['2026-09-26', 'nina', 'p06', 'uploaded the goods receipt log for September', 'E-010'],
    ['2026-09-25', 'maria', 'p08', 'approved Commissioning Report Template Rev 03', 'TST-TPL-004'],
    ['2026-09-24', 'maria', 'p04', 'requested changes to Design Output & Verification Procedure Rev 03', 'ENG-PRO-003'],
    ['2026-09-23', 'ben', 'p06', 'created draft Control of Nonconforming Materials Rev 00', 'WHS-PRO-005'],
    ['2026-09-22', 'maria', 'p04', 'completed review of Design Change Control Procedure Rev 03', 'ENG-PRO-006'],
    ['2026-09-21', 'carlos', 'p07', 'started approval for DC Cabling & Inverter Installation Rev 05', 'INS-WI-004'],
    ['2026-09-20', 'joy', 'p05', 'started review of Supplier Evaluation Form Rev 05', 'PRC-FRM-003'],
    ['2026-09-19', 'marco', 'p03', 'started review of Site Survey Checklist Rev 07', 'SIT-CHK-002'],
    ['2026-09-18', 'daniel', 'p04', 'started approval for Design Change Control Procedure Rev 03', 'ENG-PRO-006'],
    ['2026-09-10', 'nina', 'p10', 'recorded audit IA-2026-04 with 2 findings', 'IA-2026-04']
  ].map(([date, who, process, text, ref]) => ({ date, who, process, text, ref }));

  /* ---------- Users & access (process-scoped, inherited by documents) ---------- */
  const allP = level => Object.fromEntries(processes.filter(p => !p.parent_process_id).map(p => [p.process_id, level]));
  const scoped = (manage = [], view = [], contribute = []) => { const a = allP('none'); manage.forEach(p => a[p] = 'manage'); contribute.forEach(p => a[p] = 'contribute'); view.forEach(p => a[p] = 'view'); return a; };
  const users = [
    { id: 'maria', role: 'QMS Manager', status: 'Active', lastActive: '2026-09-27', access: allP('manage') },
    { id: 'aaron', role: 'Administrator', status: 'Active', lastActive: '2026-09-26', access: allP('view') },
    { id: 'eric', role: 'Approver', status: 'Active', lastActive: '2026-09-25', access: allP('view') },
    { id: 'daniel', role: 'Process Owner', status: 'Active', lastActive: '2026-09-27', access: scoped(['p04'], ['p02', 'p05', 'p06', 'p08'], ['p03', 'p07']) },
    { id: 'grace', role: 'Process Owner', status: 'Active', lastActive: '2026-09-26', access: scoped(['p02'], ['p03', 'p04', 'p09']) },
    { id: 'marco', role: 'Process Owner', status: 'Active', lastActive: '2026-09-24', access: scoped(['p03'], ['p02', 'p04']) },
    { id: 'joy', role: 'Process Owner', status: 'Active', lastActive: '2026-09-27', access: scoped(['p05'], ['p04', 'p06']) },
    { id: 'ben', role: 'Process Owner', status: 'Active', lastActive: '2026-09-23', access: scoped(['p06'], ['p05', 'p07']) },
    { id: 'carlos', role: 'Process Owner', status: 'Active', lastActive: '2026-09-26', access: scoped(['p07'], ['p04', 'p06', 'p08', 'p11'], ['p10']) },
    { id: 'ana', role: 'Process Owner', status: 'Active', lastActive: '2026-09-25', access: scoped(['p08'], ['p07', 'p11']) },
    { id: 'lea', role: 'Process Owner', status: 'Active', lastActive: '2026-09-22', access: scoped(['p09'], ['p02', 'p08']) },
    { id: 'rosa', role: 'Process Owner', status: 'Active', lastActive: '2026-09-21', access: scoped(['p10'], ['p01']) },
    { id: 'paolo', role: 'Process Owner', status: 'Active', lastActive: '2026-09-19', access: scoped(['p11'], ['p07', 'p08']) },
    { id: 'kim', role: 'Reviewer', status: 'Active', lastActive: '2026-09-24', access: scoped([], ['p03', 'p05'], ['p04']) },
    { id: 'nina', role: 'Custom', status: 'Active', lastActive: '2026-09-26', access: allP('contribute') },
    { id: 'jun', role: 'Viewer', status: 'Invited', lastActive: null, access: scoped([], ['p07', 'p08']) },
    { id: 'rick', role: 'Reviewer', status: 'Deactivated', lastActive: '2026-05-30', access: allP('none') }
  ];

  const roles = {
    'Administrator': { desc: 'Manages users, integrations and settings. Does not approve documents.', perms: ['view', 'manageUsers', 'manageProcess'] },
    'QMS Manager': { desc: 'Owns the QMS: configures processes, reviews, approves and publishes.', perms: ['view', 'create', 'edit', 'review', 'approve', 'publish', 'manageProcess'] },
    'Process Owner': { desc: 'Manages documents, risks, KPIs and evidence for owned processes.', perms: ['view', 'create', 'edit', 'review'] },
    'Reviewer': { desc: 'Reviews content of document revisions assigned to them.', perms: ['view', 'review'] },
    'Approver': { desc: 'Authorizes revisions after review.', perms: ['view', 'review', 'approve'] },
    'Viewer': { desc: 'Reads published documents in permitted processes.', perms: ['view'] },
    'Custom': { desc: 'Permissions set individually.', perms: ['view', 'create', 'edit', 'publish'] }
  };

  const integrations = [
    { id: 'm365', name: 'Microsoft 365', kind: 'Document storage — SharePoint & OneDrive', status: 'Connected', icon: 'cloud',
      tenant: 'heliossolar.onmicrosoft.com', site: 'Helios QMS', library: 'Restricted Documents', scope: 'Selected site only (Helios QMS) — validate links; file content is not read', lastTest: '2026-09-26 16:40', linked: 64 },
    { id: 'crm', name: 'CRM', kind: 'Customer records, contracts, feedback, complaints', status: 'Planned', icon: 'handshake' },
    { id: 'erp', name: 'ERP', kind: 'Purchasing, suppliers, goods receipts', status: 'Planned', icon: 'package' },
    { id: 'hris', name: 'HRIS', kind: 'Training records, competencies', status: 'Planned', icon: 'users' },
    { id: 'gdrive', name: 'Google Drive', kind: 'Document storage', status: 'Not configured', icon: 'hard-drive' },
    { id: 'upload', name: 'Uploaded files', kind: 'Files stored in iQMS when no source system exists', status: 'Enabled', icon: 'upload' }
  ];

  const templates = ['Solar Installation Company', 'Manufacturing', 'Construction', 'Healthcare', 'Recruitment', 'Logistics', 'Professional Services'];

  /* ---------- v3: process categories for the process map (configuration) ---------- */
  // Categories are organization configuration (Settings → Process Structure → Categories).
  // Each top-level process has one; subprocesses inherit their parent's.
  const processCategories = [
    { id: 'management', name: 'Management', description: 'Direct, plan, check and improve the system', color: '#6E56CF', icon: 'landmark' },
    { id: 'core', name: 'Core', description: 'Realize the product — from enquiry to after-sales', color: '#0E7C86', icon: 'workflow' },
    { id: 'support', name: 'Support', description: 'Provide the resources the core processes depend on', color: '#2F6FB6', icon: 'package' }
  ];
  const catOf = { p01: 'management', p12: 'management', p13: 'management', p14: 'management',
    p02: 'core', p03: 'core', p04: 'core', p07: 'core', p08: 'core', p09: 'core',
    p05: 'support', p06: 'support', p10: 'support', p11: 'support' };
  processes.forEach(p => { p.category = catOf[p.process_id] || catOf[p.parent_process_id] || 'support'; });

  /* ---------- v3: organization context & QMS scope (clauses 4.1–4.3) ---------- */
  const context = {
    scopeDoc: 'QMS-MAN-001', contextDoc: 'QMS-REG-003', orgChartDoc: 'QMS-ORG-001',
    scope: 'Design, supply, installation, testing, commissioning and after-sales service of grid-tied and hybrid solar PV systems (with battery storage) for residential and commercial customers.',
    sites: [
      { name: 'Head office & design centre', address: 'Quezon City, Metro Manila', activities: 'Sales, engineering & design, procurement, QMS management' },
      { name: 'Warehouse', address: 'Valenzuela City, Metro Manila', activities: 'Receiving, storage, dispatch of materials' },
      { name: 'Customer project sites', address: 'Luzon (temporary sites)', activities: 'Installation, inspection, testing & commissioning' }
    ],
    exclusions: [{ clause: '8.5.3', title: 'Property belonging to customers or external providers', reason: 'No customer-supplied materials or equipment are handled; all components are procured by Helios.' }],
    issues: {
      internal: ['Rapid growth of installation crews (from 6 to 11 crews in 2026)', 'Dependence on a small pool of licensed electricians', 'Knowledge held by a few senior design engineers'],
      external: ['Changes to net-metering rules and utility interconnection requirements', 'Inverter supply-chain lead times', 'Typhoon season affecting rooftop installation schedules']
    },
    parties: [
      { party: 'Customers (residential & commercial)', needs: 'Reliable system output, on-time installation, warranty support', monitoring: 'CSAT survey, complaints (9.1.2)' },
      { party: 'Distribution utilities', needs: 'Compliant interconnection, correct documentation', monitoring: 'Net-metering application results' },
      { party: 'Suppliers (modules, inverters, batteries)', needs: 'Clear purchase requirements, timely payment', monitoring: 'Supplier scorecards (8.4)' },
      { party: 'Employees & subcontractors', needs: 'Safe work, training, clear responsibilities', monitoring: 'Training records, toolbox talks' },
      { party: 'Regulators (DOE, LGUs)', needs: 'Permits, electrical code compliance', monitoring: 'Permit register, regulatory watch' }
    ]
  };

  /* ---------- v3: policies (clause 5.2) ---------- */
  const policies = {
    quality: { doc: 'QMS-POL-001', approvedBy: 'eric',
      statement: 'Helios Solar Installations designs and installs solar energy systems that customers can rely on for decades. We commit to:',
      commitments: ['Understand and meet customer, utility and regulatory requirements on every project', 'Design right first time, verified before anything is purchased or installed', 'Work safely and competently, with trained and licensed people', 'Select and monitor suppliers who share our standard of quality', 'Set measurable quality objectives, review them, and continually improve our quality management system'],
      communicated: { acknowledged: 44, total: 48, lastCampaign: '2026-02-10' } },
    others: ['HND-POL-003']
  };

  /* ---------- v3: management reviews (clause 9.3) ---------- */
  const managementReviews = [
    { id: 'MR-2026-H2', title: 'Management Review — H2 2026', date: '2026-12-09', chair: 'eric', status: 'Scheduled', attendees: ['eric', 'maria', 'daniel', 'carlos', 'joy', 'grace'] },
    { id: 'MR-2026-H1', title: 'Management Review — H1 2026', date: '2026-07-15', chair: 'eric', status: 'Held', minutes: 'E-025', decisions: 6, attendees: ['eric', 'maria', 'daniel', 'carlos', 'joy', 'grace', 'rosa'] },
    { id: 'MR-2025-H2', title: 'Management Review — H2 2025', date: '2026-01-20', chair: 'eric', status: 'Held', decisions: 5, attendees: ['eric', 'maria', 'daniel', 'carlos', 'grace'] }
  ];
  managementActions.forEach(a => { a.review = 'MR-2026-H1'; });
  managementActions.push(
    { id: 'MA-2026-02', title: 'Hire a dedicated document controller', owner: 'eric', due: '2026-04-30', status: 'Closed', process: 'p01', review: 'MR-2025-H2' },
    { id: 'MA-2026-03', title: 'Add battery storage to the design procedure', owner: 'daniel', due: '2026-06-30', status: 'Closed', process: 'p04', review: 'MR-2025-H2' },
    { id: 'MA-2026-06', title: 'Train two additional internal auditors', owner: 'maria', due: '2026-10-31', status: 'Open', process: 'p13', review: 'MR-2026-H1' }
  );

  /* ---------- v3: saved views (per record type) ----------
   * The views the mock shipped with are seeded here as ordinary saved views
   * (seed: true). Users can edit, rename, reorder or delete them, add their own,
   * and "Restore default views" brings the seeded ones back.
   * filters: [{ field, op, value }] — all must match. group: none | process | clause. */
  const DOC_COLS = ['id', 'title', 'process', 'type', 'rev', 'status', 'owner', 'updated', 'nextReview'];
  const KPI_COLS = ['name', 'process', 'target', 'actual', 'trend', 'period', 'status', 'method', 'owner'];
  const RISK_COLS = ['id', 'title', 'process', 'kind', 'rating', 'owner', 'due', 'status'];
  const V = (id, name, filters = [], extra = {}) => ({ id, name, seed: true, scope: 'shared', owner: 'maria', filters, columns: DOC_COLS, group: 'none', sort: null, ...extra });
  const savedViews = {
    documents: [
      V('v-all', 'All documents', [], { columns: ['id', 'title', 'process', 'type', 'classification', 'rev', 'status', 'owner', 'nextReview'] }),
      V('v-published', 'Published', [{ field: 'status', op: 'in', value: ['Published'] }]),
      V('v-workflow', 'In workflow', [{ field: 'inRouting', op: 'is_true' }]),
      V('v-overdue', 'Review overdue', [{ field: 'overdue', op: 'is_true' }], { sort: { key: 'nextReview', dir: 1 } }),
      V('v-draft', 'Draft', [{ field: 'status', op: 'in', value: ['Draft'] }]),
      V('v-restricted', 'Confidential', [{ field: 'classification', op: 'in', value: ['Confidential', 'Highly Confidential'] }], { columns: ['id', 'title', 'classification', 'process', 'owner', 'department', 'source', 'nextReview'] }),
      V('v-process', 'By process', [], { group: 'process', columns: ['id', 'title', 'type', 'rev', 'status', 'owner', 'nextReview'] }),
      V('v-clause', 'By ISO 9001 clause', [], { group: 'clause', columns: ['id', 'title', 'process', 'rev', 'status', 'nextReview'] })
    ],
    risks: [
      V('r-all', 'All', [], { columns: RISK_COLS }),
      V('r-risks', 'Risks', [{ field: 'kind', op: 'in', value: ['Risk'] }], { columns: RISK_COLS }),
      V('r-opps', 'Opportunities', [{ field: 'kind', op: 'in', value: ['Opportunity'] }], { columns: RISK_COLS }),
      V('r-high', 'High risks', [{ field: 'kind', op: 'in', value: ['Risk'] }, { field: 'level', op: 'in', value: ['High'] }], { columns: RISK_COLS, sort: { key: 'rating', dir: -1 } }),
      V('r-process', 'By process', [], { group: 'process', columns: ['id', 'title', 'kind', 'rating', 'owner', 'due', 'status'] })
    ],
    kpis: [
      V('k-all', 'All KPIs', [], { columns: KPI_COLS }),
      V('k-below', 'Below target', [{ field: 'status', op: 'in', value: ['Below target'] }], { columns: KPI_COLS }),
      V('k-on', 'On target', [{ field: 'status', op: 'in', value: ['On target'] }], { columns: KPI_COLS }),
      V('k-process', 'By process', [], { group: 'process', columns: ['name', 'target', 'actual', 'trend', 'owner', 'period', 'status'] })
    ]
  };

  /* ---------- v3: process workspace tabs (organization configuration) ----------
   * Same template for every process; the organization chooses which tabs show,
   * their names and order. emptyTabs: 'mute' shows empty tabs greyed, 'hide' hides them. */
  const workspace = {
    emptyTabs: 'mute',
    v20: true, // Update 20: Summary first, Definition and Activity as their own tabs
    tabs: [['overview', 'Summary'], ['definition', 'Definition'], ['documents', 'Documents'], ['risks', 'Risks & Opportunities'], ['kpis', 'Objectives & KPIs'], ['evidence', 'Evidence'], ['audit', 'Audit & Actions'], ['iso', 'ISO Mapping'], ['activity', 'Activity']]
      .map(([key, label]) => ({ key, label, visible: true }))
  };

  /* ---------- Monthly history for the Material theme's chart cards (last 6 months, oldest first) ----------
   * readiness: ISO 9001 readiness % (the last month is replaced by the live score)
   * reviewsOnTime: % of periodic document reviews completed by their due date
   * actionsClosed: corrective actions closed in the month, and how many of them on time */
  const trends = {
    readiness: [44, 47, 51, 54, 58, 61],
    reviewsOnTime: [71, 76, 74, 80, 83, 79],
    actionsClosed: [[3, 2], [4, 3], [2, 2], [5, 3], [4, 4], [3, 2]]
  };

  window.QMS_DATA = { trends, organization, people, currentUser, processes, documents, revisions, workflows, risks, kpis, evidence, iso, audits, findings, actions, improvements, managementActions, activity, users, roles, integrations, templates, context, policies, managementReviews, savedViews, processCategories, workspace };
})();
