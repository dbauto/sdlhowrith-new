/* iQMS — Objectives & KPIs (Update 19): sample configuration for the generic KPI engine.
 * Existing KPI records in data.js stay as they are; at start-up kpi.js turns their values into
 * period results (method "Existing KPI record") and then applies the configuration below.
 * Only labels and relative day offsets are stored here, so the data follows the app's "today". */
(() => {
  'use strict';
  const D = window.QMS_KPI = {};

  // Per-KPI configuration on top of the existing definition. Anything not listed keeps the defaults
  // (final result recorded directly, reviewer = Quality Manager).
  D.config = {
    'K-01': { department: 'Commercial', method: 'survey', aggregation: 'average', frequency: 'Quarterly', minSample: 10, dataOwner: 'grace', reviewer: 'maria',
      formula: 'Average of normalized response scores (0–100) for the quarter', dims: ['customer', 'project'], survey: 'SV-CSAT',
      description: 'Overall satisfaction of customers after handover, from the post-handover survey.' },
    'K-04': { method: 'manual', aggregation: 'percentage', frequency: 'Monthly', dims: ['project', 'person'], formula: 'Designs accepted first time ÷ designs released × 100',
      numLabel: 'Accepted first time', denLabel: 'Designs released', description: 'Share of released designs accepted by site and customer without rework.' },
    'K-06': { department: 'Supply Chain', method: 'integration', aggregation: 'percentage', frequency: 'Monthly', formula: 'On-time deliveries ÷ total deliveries × 100', dims: ['supplier'],
      numLabel: 'On-time deliveries', denLabel: 'Deliveries',
      integration: { system: 'ERP', connection: 'ERP — Purchasing (not connected in this demo)', dataset: 'Purchase order receipts', mapping: 'Receipt date ≤ promised date → on time', refresh: 'Monthly, 2nd working day', lastSync: -4, status: 'Sample data' },
      methodHistory: [{ from: 'Jul 2025', method: 'external', note: 'Monthly supplier report from Finance (Excel)' }, { from: 'Jan 2026', method: 'import', note: 'ERP receipts exported to Excel and imported' }, { from: 'Jul 2026', method: 'integration', note: 'ERP purchasing integration' }],
      description: 'Deliveries received on or before the promised date, all suppliers.' },
    'K-11': { department: 'People & Administration', method: 'import', aggregation: 'percentage', frequency: 'YTD', dims: ['person', 'department'], formula: 'Training completed ÷ training assigned × 100',
      numLabel: 'Completed', denLabel: 'Assigned', dataOwner: 'rosa', description: 'Planned trainings completed year-to-date, from the HRIS training export.' },
    'K-13': { method: 'internal', aggregation: 'percentage', frequency: 'YTD', reviewer: 'eric', formula: 'Corrective actions closed by their due date ÷ corrective actions due in the period × 100',
      internal: { module: 'CAPA', numerator: 'Corrective actions closed on or before their due date', denominator: 'Corrective actions whose due date falls in the period' },
      description: 'On-time closure of corrective actions, calculated from the Corrective Action register.' },
    'K-14': { method: 'external', aggregation: 'external', frequency: 'YTD', reviewer: 'maria', sourceSystem: 'Excel / Spreadsheet', sourceRef: 'Management review action log',
      description: 'Management review actions closed by their due date, reported by the Managing Director’s office.' }
  };

  // A new KPI that shows people → teams → departments → organization consolidation.
  D.newKpis = [
    { id: 'K-16', name: 'Installation productivity', process: 'p07', objective: 'Deliver projects on time', target: 90, dir: '≥', unit: '%', owner: 'carlos', period: 'Sep 2026',
      cfg: { department: 'Operations', method: 'manual', aggregation: 'weighted', frequency: 'Monthly', dataOwner: 'carlos', reviewer: 'maria', minSample: 20,
        dims: ['person', 'team', 'department'], hierarchy: ['person', 'team', 'department', 'organization'],
        formula: 'Sum of jobs completed ÷ sum of jobs planned × 100 (weighted by planned jobs)', numLabel: 'Jobs completed', denLabel: 'Jobs planned',
        description: 'Installation jobs completed against plan, per installer, consolidated to team, department and organization.' },
      history: [['Apr 2026', 88.4], ['May 2026', 89.6], ['Jun 2026', 90.8], ['Jul 2026', 91.5], ['Aug 2026', 89.9]] }
  ];

  // Installers for K-16 (measurement subjects — not system users).
  D.crew = [
    ['Ana Reyes', 'Install Team A', 'Operations'], ['John Bautista', 'Install Team A', 'Operations'], ['Marco Dizon', 'Install Team A', 'Operations'], ['Lea Santos', 'Install Team A', 'Operations'],
    ['Paolo Cruz', 'Install Team A', 'Operations'], ['Rina Flores', 'Install Team A', 'Operations'], ['Joel Ramos', 'Install Team A', 'Operations'], ['Carla Mendoza', 'Install Team A', 'Operations'],
    ['Nico Garcia', 'Install Team B', 'Operations'], ['Bea Torres', 'Install Team B', 'Operations'], ['Leo Villanueva', 'Install Team B', 'Operations'], ['Mia Navarro', 'Install Team B', 'Operations'],
    ['Ramon Aquino', 'Install Team B', 'Operations'], ['Ivy Castillo', 'Install Team B', 'Operations'], ['Dante Lim', 'Install Team B', 'Operations'], ['Faye Tan', 'Install Team B', 'Operations'],
    ['Arnel Pascual', 'Electrical Team', 'Electrical'], ['Joy Salazar', 'Electrical Team', 'Electrical'], ['Ken Ocampo', 'Electrical Team', 'Electrical'], ['Liza Domingo', 'Electrical Team', 'Electrical'],
    ['Ben Morales', 'Electrical Team', 'Electrical'], ['Gina Robles', 'Electrical Team', 'Electrical'], ['Rey Fajardo', 'Electrical Team', 'Electrical'], ['Tess Valdez', 'Electrical Team', 'Electrical']
  ];
  // Sep 2026 submissions: [completed, planned]; null = not submitted yet.
  D.crewSep = [[18, 20], [17, 20], [19, 20], [20, 20], [15, 18], [16, 18], [18, 18], null, [19, 20], [21, 22], [17, 20], [16, 18],
    [18, 20], null, [20, 22], [17, 18], [12, 14], [13, 14], [14, 14], [11, 14], [13, 14], null, [14, 14], [12, 14]];

  D.surveys = [
    { id: 'SV-CSAT', name: 'Customer Satisfaction Survey', kind: 'Survey', owner: 'grace', scale: '6 questions, 1–5 scale, normalized to 0–100', channel: 'Email after handover', status: 'Active',
      note: 'Responses are collected by the survey tool. Each response becomes a KPI measurement record for the quarter.' },
    { id: 'SV-SUPP', name: 'Supplier Evaluation', kind: 'Evaluation', owner: 'joy', scale: '8 criteria, weighted score 0–100', channel: 'Buyer evaluation', status: 'Active', note: 'Used by supplier scorecards.' },
    { id: 'SV-TRN', name: 'Training Effectiveness Evaluation', kind: 'Evaluation', owner: 'rosa', scale: '5 questions, 1–5 scale', channel: 'After each course', status: 'Draft', note: '' }
  ];
  D.customers = ['Reyes Residence', 'Santos Family', 'Bayview Hotel', 'Greenfield School', 'Luzon Cold Storage', 'Mabini Clinic', 'Cruz Bakery', 'Tan Residence', 'Del Rosario Farm', 'Pacific Plaza',
    'Garcia Residence', 'Hilltop Chapel', 'Sunrise Apartments', 'Rivera Warehouse', 'Lopez Residence'];
  // 42 Q3 2026 response scores (0–100). Their average is the Q3 2026 result.
  D.csatQ3 = [92, 88, 80, 95, 84, 90, 79, 93, 87, 82, 96, 85, 78, 91, 89, 83, 94, 80, 86, 92, 79, 90, 88, 84, 97, 81, 86, 89, 79, 93, 85, 90, 82, 88, 94, 79, 87, 91, 83, 86, 92, 87];

  // K-06 history before the six existing values (kept as earlier period results).
  D.otdEarly = [['Jul 2025', 93, 'external'], ['Aug 2025', 92, 'external'], ['Sep 2025', 92, 'external'], ['Oct 2025', 91, 'external'], ['Nov 2025', 91, 'external'], ['Dec 2025', 90, 'external'],
    ['Jan 2026', 91, 'import'], ['Feb 2026', 90, 'import'], ['Mar 2026', 90, 'import']];
  D.suppliers = ['SolarMax Trading', 'Inverter Hub PH', 'RackPro Mounting', 'CableWorks Inc.', 'BatteryOne Asia', 'Metro Fasteners'];
})();
