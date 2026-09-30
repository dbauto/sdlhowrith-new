# iQMS — UX audit and process-first redesign

Audit date: 27 September 2026
Audited build: `QMS/` (the "Zoho-style operations workspace" iteration: `index.html`, `app.js`, `calm.js`, `process-workspace.js`, `styles.css`, `calm.css`, `process-workspace.css`)
Improved build: `QMS-v2-process-centric/` (separate folder; the original is untouched)

---

## 1. Current UX problems found

### A. Navigation (does it reflect company processes?)

| Component | Problem | Change |
|---|---|---|
| Left rail (`.sideNav`, light surface) | Lists six fixed QMS modules (Documents, Records & evidence, Risks, Audits, Corrective actions, Process map). Processes are one link at the bottom, so users still browse "by QMS module" — the old mental model. | Processes become the first and largest sidebar group, listing the organization's configured top-level processes (read from data, not markup). Modules move to a secondary "Across all processes" group. |
| Sidebar colour/behaviour | The agreed dark-green, hover-expand, pinnable sidebar was replaced by a static light rail. `app.js` still contains pin/hover code that no longer has a visible control. Decisions 12–14 were reversed. | Restore dark-green sidebar: 64 px collapsed, 272 px expanded, expands on hover/focus, Pin control at the top, pinned state remembered. |
| Two competing navigations | Header tabs (Home, My work, Reports, Readiness) + sidebar "Navigate" (Overview, Process map) + "Operational modules" = three navigation zones for one app. "Home" (header) and "Overview" (sidebar) are the same page. | One navigation: the sidebar. The header holds only organization context, global search, notifications and the user menu. |
| "Operational modules" settings | Lets admins rename/hide modules in the rail — configuration of the wrong layer. What varies between clients is the **process structure**, not the module list. | Remove. Replace with Settings → Process Structure (hierarchy, codes, owners, order, archive). |
| Header notification badge (red "3") and nav counts (`1,428`, `137`…) | Floating counts that users can't act on; the red badge sits off-centre on the bell. | Remove decorative badges. Keep one count only where it drives action: "Documents in Review" (items awaiting *you*), as plain right-aligned text. |

### B. Process workspace (operational area or file folder?)

| Component | Problem | Change |
|---|---|---|
| Process detail page (`#/process`) | Explicitly states "No module is recreated inside the process page" and shows six link-cards ("Documents — No confirmed links — Open filtered view"). A process is a menu of exits, not a place to work. Directly contradicts the new requirement for a Process Workspace with tabs. | Real workspace: header (code, name, owner, department, ISO clauses) + tabs Overview · Documents · Risks & Opportunities · Objectives & KPIs · Evidence · Audit & Actions · ISO Mapping. Each tab renders the same shared component used in the organization-wide view, pre-filtered. |
| "Process items" list | The client's child items (Design Procedure, Site Photos, Risk Register…) are shown as a flat numbered list of plain names with an identical generic requirement text. It does not say whether an item is a document, a record, a register or an activity. | Items become typed **process elements** (Procedure / Form / Record / Register / Activity) linked to the documents/evidence that realise them, with a coverage state ("Controlled document linked", "Evidence missing"). |
| Process owner | Every process shows "Unassigned" and owner is buried in a right-hand box. | Owner visible in the workspace header line and in every process table; set in Process Structure. |
| Process map (card grid) | 14 large cards with 2-line descriptions and "6 process items · Unassigned". Scannable only for names; no health information. | Replaced by the Overview "Process status" table (one row per process with owner, attention counts and ISO readiness). The sidebar is the directory. |

### C. Dashboard ("Home")

| Component | Problem | Change |
|---|---|---|
| Four summary cards | "My work 3", "Enabled processes 14", "Verified data sources 0", "ISO 9001 assessment Not started". Only one is actionable; "14 processes" is not a problem statement. | An **attention strip**: six counts that each open a pre-filtered list — documents overdue for review, pending approvals, high risks, KPIs below target, missing evidence, overdue corrective actions. |
| "My work" and "Process map" hero cards | Two large marketing-style cards with icons and a paragraph each; "Open my work" appears twice on the same screen. | Removed. Replaced by "Needs your action" (a short work list with explicit action buttons) and a "Process status" table. |
| ISO readiness on dashboard | Only the text "Not started". Decision #1 (ISO 9001 readiness prominent) is not met. | Readiness % with a visible, expandable explanation of the calculation and a status breakdown, linking to the ISO 9001 Readiness page. |
| Solar "template preview" banner | Permanent green banner telling users the data isn't real. | One small "Sample data" tag in the header; no banner. |

### D. ISO readiness

The page has no requirements, no mapping and no gaps: it says a score is unavailable and shows three explanatory cards. A QMS manager can't see which requirements are satisfied, partial, missing or at risk, nor which process owns them. → Replace with a requirement register (Clause → Requirement → Process → Controls/documents → Evidence → Status) plus a "By process" view, statuses Complete / Partially complete / Missing / At risk / Not applicable, and a stated formula.

### E. Document control

| Component | Problem | Change |
|---|---|---|
| Document table rows | ~95 px tall (title + inline revision pill + code stacked), `Open document` button wraps onto two lines, "Primary space" is a legacy concept that competes with Process. Rev `2026.2` vs `03` vs `C` in one column. | 44 px rows; ID and name in separate columns; Process column; Rev column fixed-width, centred, tabular numerals; single-line "Open Document" button; row click only selects (checkbox + highlight + selection bar). |
| Status set | Effective, Current, Tracked, Closed, In approval, Review due, Draft, In review… "Effective" and "Current" mean the same; "Review due" is a date condition, not a lifecycle state. | Lifecycle statuses: Draft · In Review · Changes Requested · Approval in Progress · Approved · Published · Superseded · Obsolete. "Review overdue" is shown on the Next review date, not as a status. "Archived" merged into Obsolete. |
| Document viewer modal | Good concept (keep), but metadata panel uses 8–10 px labels in bordered mini-boxes, the "Traceability" tab + "View traceability" link preserve the removed Traceability page, and there is no source-file connection state. | Keep the modal. Right panel tabs: Details · Revisions · Linked items. Source block shows ✓ Connected / ⚠ Access unavailable with last-verified date and "Open in SharePoint". Linked items replace Traceability. |
| Review / approval | "My tasks" mixes revision requests, working revisions, approvals and acknowledgements in one card list; the approval panel offers "Reject / return", "Request changes" and "Publish" together, so review, approval and publication are not separated. No draggable split exists (README mentions "resizable panes", but there is no divider). | Separate stages: Review (Complete Review / Request Changes) → Approval (Approve / Request Changes) → Publication (Publish, with confirmation). New full-page Document Review with a 50:50 split, draggable and keyboard-resizable divider, 420 px minimum per side, double-click resets to 50:50. |
| Parallel workflows | Guard exists only for revision requests (toast). No visible "Approval in Progress" state. | "Approval in Progress" banner (Started by, Started, Current stage, Current approver); "Request Approval" disabled with the reason, everywhere it appears. |

### F–I. Risks, KPIs, Evidence, Audit

Risks, Audits and Corrective actions are empty placeholder pages ("No company records yet"). KPIs don't exist as a view (only a "KPIs & reports" link card). Evidence ("Records & evidence") is a legacy manufacturing register with no source-system concept. Nothing can be understood per process *and* organization-wide. → One register component per entity, used in both contexts; evidence shows **Source system** (SharePoint, CRM, ERP, HRIS, Upload) and verification state; findings link to corrective actions and processes.

### J. Users & access

The table puts a user-type dropdown, role pills with an edit pencil, a scope dropdown and five permission checkboxes **in every row**; the permission columns overflow horizontally (the "CON…" column is cut off at 1440 px). Five KPI cards above the table (Active users 48, Managers 9…) add no action. A "Selected user" panel duplicates row content. → Plain user table (Name, Email, Role, Department, Access, Status, Last active, Actions). All editing happens in a focused **Edit Access** modal: Role → Process access (per-process None/View/Contribute/Manage, inherited by documents) → grouped permissions.

### K. Visual system

- **Typography:** 511 declarations of 9–11.5 px text in `styles.css` alone (plus 124 more in the two override sheets); e.g. approval decision label is 8 px, comment textarea 9 px. Uppercase micro-labels ("ONE PERSONAL QUEUE", "PROCESS CONTEXT") everywhere.
- **Three stacked stylesheets** (`styles.css` 4,873 lines → `calm.css` → `process-workspace.css`) with 275 `!important` overrides; radii 5/6/7/8/9/10 px used interchangeably. Any fix lands in the wrong layer.
- **Icons:** one family (Lucide) — keep. But icon-only controls (zoom, expand, more) lack text for key actions.
- **Cards:** home, process map, process detail, readiness and users all rely on bordered cards with icon tiles; it reads as generated SaaS.

### L. Consistency

Same concept, different names: Home/Overview, My work/My tasks, Readiness/ISO readiness/ISO 9001 assessment, Records & evidence/Evidence, Audits/Internal Audit/Audit trail. Buttons: "Open document" vs "Open Document", "Start revision" vs "Request revision" vs "Register document". Process filter appears as a header dropdown on some pages and a chip on others.

---

## 2. Recommended information architecture

```
Organization (tenant)                         ← every object carries organization_id
└── Process structure (configurable depth)    ← process_id, parent_process_id, display_order, process_code
    └── Process
        ├── Overview (definition, health, attention, activity)
        ├── Documents            (controlled documents, revisions, workflows)
        ├── Risks & Opportunities
        ├── Objectives & KPIs
        ├── Evidence             (source system, verification)
        ├── Audit & Actions      (findings → corrective actions → effectiveness; improvement/automation opportunities)
        └── ISO Mapping          (requirement → control/document → evidence → status)

Cross-process views = the same records, unfiltered:
Documents · Documents in Review · Risks & Opportunities · Objectives & KPIs · Evidence · Audits & Corrective Actions · ISO 9001 Readiness · Reports
```

Hierarchy level names are configuration (e.g. *Process Area → Process → Subprocess* or *Department → Process*). Codes (`01`, `07`) are display codes only; hierarchy comes from `parent_process_id`.

## 3. Recommended sidebar / navigation

```
[Org switcher: Helios Solar Installations ▾]         [Pin]
Overview
PROCESSES                              [filter]  ▾
  01 QMS & Organization
  02 Sales & Customer
  …                                   (scrolls; subprocesses live inside the workspace)
  14 Management Review
ACROSS ALL PROCESSES                              ▾
  Documents
  Documents in Review                         3
  Risks & Opportunities
  Objectives & KPIs
  Evidence
  Audits & Corrective Actions
GOVERNANCE
  ISO 9001 Readiness
  Reports
──────────────
Settings
```

Collapsed (64 px): icons for fixed items, the two-digit process code for processes. The process list is generated from the configured structure, so a client with 8 or 20 processes needs no UI change.

## 4. Process workspace structure

Header: breadcrumb `Processes / 04 Engineering & Design` · code · name · one meta line (Owner · Department · ISO clauses) · actions *Add ▾* and *Edit process*.
Tabs: Overview · Documents · Risks & Opportunities · Objectives & KPIs · Evidence · Audit & Actions · ISO Mapping (counts only where there's something to act on).
Overview: left = "Needs attention in this process" list, process definition (purpose, inputs, outputs, roles), process elements with coverage, subprocesses; right = health summary, ISO readiness for this process, recent activity.

## 5. Dashboard redesign

1. Page header "Overview" + sample-data context.
2. Attention strip (6 actionable counts, each a link to a filtered list).
3. ISO 9001 readiness panel (percentage + breakdown + "How is this calculated?").
4. Process status table — the answer to "which processes have problems?".
5. Needs your action (approvals/reviews/overdue actions with explicit buttons) · Upcoming reviews & management actions.

## 6. Documents experience

Library table (shared by process tab) → row click selects → explicit **Open Document** opens the large viewer modal → **Open review** opens the full-page Document Review (50:50 draggable split) → stage actions Complete Review / Approve / **Publish** → publication creates the new active revision, previous revision becomes Superseded (never overwritten). "Create Revision" and "Request Approval" are focused modals; Request Approval is disabled while an approval is active.

## 7. Risks / KPI / Evidence / Audit

- **Risks & Opportunities:** register with L × I rating shown as number + level text; filter by process, type, rating, status.
- **Objectives & KPIs:** table with target, actual, small inline trend, owner, status (On target / Below target / No data). No chart wall.
- **Evidence:** Process → Requirement/Control → Evidence → Source system; verification (Verified / Pending / Missing / Link unavailable); "Missing" rows are the evidence gaps.
- **Audits & Corrective Actions:** tabs Findings · Corrective Actions · Audit Programme; finding ↔ action ↔ process linked; action stage shows Root cause → Action → Effectiveness.

## 8. User access redesign

Table + filters only. Actions: *Edit Access* (modal), *Deactivate* (confirm), *Delete* (confirm, typed name not required for a mock). Modal: Role (with description; changing permissions switches to "Custom"), Process access (per-process None/View/Contribute/Manage with "set all"), Permissions grouped Documents / Workflow / Administration. Document access inherits from process access.

## 9. Design system

| Token | Value |
|---|---|
| Type | Page title 26/32 semibold · Section 18/26 semibold · Body 14/22 · Table 14/20 · Secondary 13/18 · Minimum 12 (column meta only) |
| Spacing | 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| Sidebar | 272 px expanded · 64 px collapsed · dark green `#0E3B2C` |
| Header | 56 px |
| Controls | 36 px default · 32 px compact (table actions) |
| Table | header 40 px · row 44 px · cell padding 12 px · tabular numerals for IDs/revs/dates |
| Radius | 4 px (status, inputs inside tables) · 6 px (controls) · 8 px (panels, modals) |
| Borders | `#E3E7E5` default · `#CBD2CF` strong |
| Semantic | success `#1B7A4B` · info `#1F5FAD` · warning/amber `#9A6200` · changes `#B4540A` · danger `#B42318` · muted `#667085` |
| Icons | Lucide, 16 px in controls/tables, 18 px in nav, 1.75 stroke |
| Modals | S 480 · M 640 · L 880 · Viewer min(1280 px, 96 vw) × 92 vh |
| States | hover `#F4F7F5` · selected `#E8F2EC` + 3 px left accent · focus 2 px `#1F6F4A` ring with 2 px offset |

Status = small icon/dot + text, never a saturated filled pill.

## 10. Components to reuse

Lucide icon runtime (`vendor/lucide.min.js`); the document viewer modal concept; revision history model and "revision request already open" guard; process template data (14 groups with items); local persistence pattern for process structure; M365 "scope, not credentials" settings model; explicit `Open document` action; final `Publish` label; focus-trap/Escape behaviour of the mobile drawer.

## 11. Components / screens to redesign

Sidebar; header; Overview; process detail → Process Workspace; document table; document viewer right panel; My tasks → Documents in Review + Document Review page; ISO readiness; Users & access; Integrations; Process configuration.

## 12. Screens to combine or remove

- Remove: Traceability page (→ Linked items in documents), Operational modules settings, Process map card grid (→ sidebar + Overview table), "Spaces" concept and Manage spaces (→ Process), Document Types page from main navigation (→ settings later), QMS AI chat view (AI stays contextual, see setup assistant), duplicate Home/Overview.
- Combine: Audits + Corrective actions → Audits & Corrective Actions; My work + approvals → Documents in Review (plus "Needs your action" on Overview).

## 13. Screens to add

Process Workspace (with tabs) · Documents in Review · Document Review (split) · Objectives & KPIs · Evidence with sources · ISO 9001 requirement register · Reports catalogue (process-aware) · Settings → Process Structure (tree + details) · Settings → Integrations (sources list + Microsoft 365) · Process & QMS setup assistant (10-step, human-confirmed) · global search results grouped by object type.

## 14. Usability conflicts in the requirements

1. **Process items mix kinds.** The client's tree lists documents (*Design Procedure*), records (*Site Photos*, *Test Records*), registers (*Risk Register*) and activities (*Design Review*) at the same level. Treating all of them as sub-processes or all as documents would be wrong. → Modelled as typed *process elements* that link to documents/evidence.
2. **Processes 12 and 13 duplicate cross-process views.** "12 Risk & Objectives" and "13 Audit & Improvement" are processes, and the brief also asks for cross-process "Risks & Opportunities" and "Audit & Improvement" views. Identical sidebar labels would be ambiguous. → Cross-process items named "Risks & Opportunities", "Objectives & KPIs" and "Audits & Corrective Actions"; the process workspaces 12/13 hold the *method* (procedures, audit programme, objectives framework) while registers show all records.
3. **"Honest empty states" vs a demonstrable dashboard.** The previous iteration removed all sample activity to avoid fabricated claims, which left nothing to evaluate. → Sample records are back, clearly labelled once ("Sample data" in the header) rather than on every screen.
4. **Readiness % vs "no arbitrary scores".** → Score is a documented formula over requirement statuses (Complete = 1, Partial = 0.5, Missing/At risk = 0, N/A excluded) shown next to the number.
5. **Row click must not open, but users expect row interaction.** → Row click selects (checkbox + highlight + selection bar with Open Document); keyboard Space/Enter toggles selection; opening is always explicit.
6. **Hover-expand sidebar vs keyboard/touch.** Hover alone fails for keyboard and tablet users. → Expands on focus as well; Pin works on click; below 1024 px the sidebar is a drawer opened from the header.
7. **Publish as final approval action vs separate Approve step.** → Approval stage uses *Approve*; the final stage button is *Publish* (never "Approve"), matching decision #8 while keeping approval and publication separate as §18 requires.
8. **Status list size.** §13 lists nine statuses including Approved, Published, Archived and Obsolete. → Kept Approved (approved but not yet published) because publication is a separate step; merged Archived into Obsolete.
9. **Counts only when useful vs tab counts.** → Tabs show counts only for attention (e.g. "Risks 2 high"); plain totals omitted.
10. **Microsoft 365 as storage vs documents without a source.** Some records (e.g. site photos from a mobile app) won't live in SharePoint. → Source is a generic field (system + link + verification), M365 is one source.
