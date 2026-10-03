# iQMS v3: client menu update

This is a copy of `QMS-v2-process-centric`, reworked around the client's feedback on navigation. The v2 folder was not modified, and nothing was committed or pushed.
Everything shown is fictional **sample data** for "Helios Solar Installations".

## Run it

```powershell
cd QMS-v3-client-menu
node scripts/serve.cjs
```

Open <http://127.0.0.1:4173>. You can also open `index.html` directly. Changes are kept in this browser's `localStorage` under a new key (`iqms.v3.*`), so v2 and v3 don't overwrite each other. To start over, use **Settings → About System → Reset Sample Data**. To see the sign-in screen, use **account menu → Sign out** (any password works; any 6 digits pass two-step verification).

## What changed: the client's menu

| # | Sidebar item | Route | What's there |
|---|---|---|---|
| — | Overview | `#/overview` | Unchanged dashboard. Its links now point to the new pages. |
| 1 | **QMS** (expandable) | | |
|   | Organization & Scope | `#/qms/scope` | Scope statement, sites, exclusions, internal and external issues, interested parties, structure docs (4.1–4.4, 5.3) |
|   | Policies | `#/qms/policies` | Quality policy text and commitments, approval, acknowledgement %, other policies (5.2) |
|   | Processes | `#/qms/processes` | **Process map** (management / core flow / support) or **Register** table. Each card opens the process workspace (4.4) |
|   | Objectives & KPIs | `#/qms/objectives` | KPI register (6.2, 9.1) |
| 2 | **Documented Information** + hover list | `#/documents`, `#/review` | **Library** (List / By process / By ISO 9001 clause) and **Routing** (review → approval → publication) |
| 3 | Risks & Opportunities | `#/risks`, `#/risks/matrix` | Register + 5×5 **risk matrix** + an **Assess / Reassess** tool with live scoring and the required response (6.1) |
| 4 | Evidence | `#/evidence` | **By ISO subclause** (with readiness), **By process** (expected records per process), All records |
| 5 | **Audits** (was Internal Audit) | `#/audits` | Audit Management module: programme, audits, nonconformities and reports. Old `#/audit` links redirect. |
| 6 | Management Review | `#/mgmt-review` | **9.3.2 inputs assembled live** (a–f), decisions and actions (9.3.3), meetings, reports |
| 7 | Corrective Action | `#/capa` | Stage pipeline (root cause → action → effectiveness → closed), corrective actions, improvement opportunities; **Raise Corrective Action** form |
| 8 | Settings | `#/settings` | Grouped: Workspace, People & access, Connections, Trust & compliance, Account (see Update 11) |

Old v2 links (`#/iso`, `#/kpis`, `#/audit/actions`, `#/reports`) redirect to their new homes.

## The Documents question (decision)

**Question from the client:** "Documents is the overall list. Processes are also documents, structured by process. Is that a view in the Documents tab or a submenu? We also want a per-ISO-clause view."

**Decision:** It's **one library with three views**, not separate lists and not separate menus.

- A document has exactly one record. It belongs to one process and can support several ISO clauses.
- **List**, **By process** and **By ISO 9001 clause** regroup the same records. Nothing is duplicated, so status, revision and routing are always the same wherever you look.
- The **hover list** on *Documented Information* is a shortcut into those views. It shows the 14 processes and clauses 4–10 side by side, plus All documents / Routing / Review overdue. This keeps the process list out of the main menu, as the client asked.
- **QMS → Processes** is different: it's the process *register* (owner, KPIs, risks, audits, health), and each process has its own workspace. The Documents tab inside a process workspace is the same "By process" view.
- **Clause view** shows each requirement with its status, the processes that carry it, and the documents that control it. It also flags requirements with no controlling document and lists documents that aren't mapped to any clause yet, which is useful for audit preparation.
- Evidence follows the same pattern (By subclause / By process / All), so an auditor can go clause → documents → evidence.

Why not a submenu: 14 processes plus 7 clauses would put 21 more rows in the sidebar, which is what the client called "too crowded". Separate "Process documents" pages would also suggest a second copy of the documents exists.

## Hover list behaviour

- Desktop: hover **Documented Information** (after a 140 ms delay, so passing over it doesn't trigger it). Move into the panel freely. It closes when you leave.
- Keyboard: focus the item and press **→** to open the list. **↑/↓** moves through it and **Esc/←** closes it and returns focus.
- Tablet or phone (< 1024 px): the hover list turns into inline shortcuts under Documented Information in the drawer (By process, By ISO 9001 clause, Routing).

## Tables (update 2): 21st.dev data-table style, built into the existing table code

This isn't a React port. It's the same design and behaviour rebuilt in the mock's own table code (`Q.table` in `assets/core.js`), so every table in the mock picks it up.

| Click on | Does |
|---|---|
| Round checkbox, or the rest of the row | Selects the row. Ctrl/Cmd-click or the checkboxes add more rows. The header checkbox shows – for a partial selection |
| Chevron ⌄ | Expands the row with a smooth open/close. For documents it shows: about/change summary, routing (who it's waiting on, when it's due), source, ISO clauses, evidence, and buttons for Open Document / Open Review / Open in SharePoint |
| **Document name** | Opens the document viewer |
| ⋯ at the end of the row | Row actions: Open Document, Open Review, Create Revision, Request Review/Approval, Open in SharePoint |
| Column header | Sorts. An arrow shows direction, an underline marks the sorted column, and rows glide to their new place |

- **Selection:** when rows are selected, the table's header row turns into **"N selected ▾"** + *Clear selection*. Nothing above the table moves. One selected document puts its actions in the menu. Several put Export / Change owner / Remind owners there.
- **Pagination:** "Showing 1 to 10 of 63" with numbered pages, only in **List** view. The By-process and By-clause lists aren't paged because they're short.
- **Search:** has a clear (×) button and waits briefly after you stop typing before it filters.
- The wide "Open Document" button on every row is gone. Opening is done with the name link, the ⋯ menu or the expanded row.

## Hover list update

- **It shows where you are.** The current process, clause, All documents, Routing or Review overdue entry is highlighted when you reopen the list.
- **The last view is remembered.** Clicking *Documented Information* in the sidebar (or the Library tab) returns to the last documents view you used, for example *By process → 05*. It's kept in the URL, so refresh and Back work.
- **Breadcrumbs name the view**, for example *Documented Information › By process › 05 Procurement & Suppliers*.

## Saved views (update 3): the Library tabs are data, not code

The tabs on **Documented Information → Library** are **saved views**. The views the mock had before are included as **defaults**: *All documents, Published, In workflow, Review overdue, Draft, By process, By ISO 9001 clause*. Users can edit, rename, reorder or delete any of them, add their own, and use **View ⚙ → Restore default views** to bring the defaults back. Restoring keeps the user's own views.

**A view is plain data** (`assets/data.js → savedViews`, stored in the browser in this mock):

```js
{ id, name, scope: 'personal' | 'shared', owner,
  filters: [{ field: 'owner', op: 'in', value: ['@me'] }, { field: 'nextReview', op: 'next', value: 60 }],
  columns: ['id', 'title', 'process', 'rev', 'nextReview', 'status'],
  group: 'none' | 'process' | 'clause',
  sort: { key: 'nextReview', dir: 1 } }
```

**The field list** (`assets/saved-views.js → Q.FIELDS.documents`) describes each field once: label, type, how to read it, how to show it, how to sort it. Filters, columns, chips and sorting all use it. Fields that are worked out from other data are included too: *Review overdue, Routing stage, Waiting on, ISO 9001 clauses, Evidence records, Department, Source link*.

| Field type | Conditions |
|---|---|
| text | contains · does not contain |
| choice (status, type, department, routing stage…) | is · is not (one or more values) |
| person (owner, waiting on) | is · is not, including **Me** |
| process | is in · is not in (subprocesses included) |
| ISO clause | includes (8 matches 8.3 and 8.3.4) · is not mapped |
| date | within the next N days · in the past · before · after · is empty · is set |
| yes/no | is yes · is no |
| number | more than · less than · equals |

**How it works on screen** (update 4)
- **One card** holds the view tabs, the toolbar and the table. The Library/Routing tabs sit above it.
- **Drag a view tab** left or right to reorder (a green marker shows where it will land); the order is saved.
- Every view tab has its own **⋯** menu (always visible on the active tab, on hover for the others): **Edit view…, Duplicate, Move left/right, Delete view, Restore default views**.
- **Edit view** opens one side panel with everything the view saves:
  - **Name** and **who can see it** (Only me / Everyone in the organization)
  - **Filters**: a condition builder with a live count ("8 documents match")
  - **Columns**: tick to show, arrows to reorder. The document name is always shown.
  - **Layout**: Group by None / Process / ISO 9001 clause, and a default sort
  - Buttons: **Save view · Save as new view · Delete view · Cancel**
- **+ New view** opens the same panel, empty.
- Under the tabs, a summary line shows what the view contains (for example "In routing", "Grouped by ISO clause"). Clicking it also opens Edit view.
- Temporary, not saved: search, sorting by clicking a column header, the current page. Everything else is changed only in Edit view, so there's no half-saved state.
- The columns and filters apply in every grouping, including the clause tables and the process tree counts.
- Old links still work: `?status=overdue`, `?view=clause&c=8.3`, `?process=p04` and the hover-list links open the matching default view, or *All documents* if that view was deleted.

**For the real build**, views would be stored per organization and user (`saved_view` table: id, org, owner, record_type, scope, definition JSON, position). Other registers (risks, evidence, KPIs, corrective actions) only need their own field list to get the same feature, because the table code and editors are shared.

## Update 5: Objectives & KPIs on saved views, and Export on every table

- **Objectives & KPIs** (`#/qms/objectives`) now uses the same design as Documented Information: one card, view tabs with ⋯ menus, drag to reorder, the Edit view panel and the summary line. Default views: *All KPIs, Below target, On target, By process*. KPI fields: KPI, Objective, Process, Target, Actual, Trend, Owner, Period, Status.
- **KPI rows**: clicking the KPI name or the chevron expands the row. It shows the last 6 values, the objective and owner, and counts of open risks and corrective actions in that process. **Record new value** updates the actual value and the trend. The ⋯ menu has Record new value, Edit KPI, Open process workspace, and Open the Quality Objectives plan. The KPIs tab in each process workspace uses the same table.
- The page-level view code is now shared (`Q.viewPage` in `assets/saved-views.js`). Another register needs only a field list and a `Q.viewPage(...)` registration.
- **Export**: every register table (documents, KPIs, risks, evidence, findings, corrective actions, routing…) has an **Export** button. It downloads a **CSV that opens in Excel** with the rows that match the current view, search and filters (all pages), in the current sort and with the visible columns. With rows selected, **Export selected** in the "N selected" menu exports only those rows.
- Risks table: the rating legend moved to the table footer so the toolbar fits on one line.

## Update 6: process cards and configurable categories

- **QMS → Processes → Cards**: each process is a card showing its department (and subprocess count), a status badge (On track / Needs attention / At risk), the code and name linking to its workspace, the purpose (2 lines), an **Open** button, up to 2 issue chips (e.g. "1 doc overdue"), avatars for the owner and team, and **ISO readiness** as the progress bar.
- **Categories are configuration now, not hard-coded.** They're managed in **Settings → Process Structure → Process categories**: add, edit (name, description, colour, icon), reorder and delete. Deleting a category that's in use asks where to move its processes. Defaults: Management, Core, Support.
- **Each process has a Category field**: required when adding a top-level process and editable on the process form. Subprocesses inherit their parent's category, which the form shows as "inherited from 07".
- **The Processes page has one section per category**: a coloured header with the category's icon, name and description, plus a count of processes and how many need attention. An empty category shows a prompt to add or move a process. Processes without a category appear under "Uncategorized". In the table view, category shows as a coloured chip.

## Update 7: process workspace tabs and Risks on saved views

- **One workspace template for every process, now configurable.** In **Settings → Process Workspace** you can show or hide tabs, rename them and reorder them. Overview is always first. The page shows a live preview and has a *Restore defaults* button. The ⚙ at the end of a process's tab bar links there.
- **Counts on each tab**, e.g. *Documents 6 · 1 overdue*. Tabs with no records either show greyed out with "—", or are hidden, depending on a setting. An empty tab you open shows a short "Nothing recorded yet" note.
- **Saved views inside the process.** The Documents, Risks & Opportunities and Objectives & KPIs tabs show the same saved views as their main pages, filtered to that process and its subprocesses. "By process" views are left out inside a process because they'd only have one group; "By ISO 9001 clause" works. Creating or editing a view there changes the same shared view. A "This process only" note shows that filter.
- **Risks & Opportunities → Register** now uses saved views too. Defaults: *All, Risks, Opportunities, High risks, By process*. Clicking a row's title expands it to show the treatment, the rating broken down as likelihood × impact, and linked documents. The ⋯ menu has Reassess, open a linked document, Open process workspace, and Show on risk matrix. The Risk matrix tab is unchanged.
- The Evidence and Audit & Actions tabs keep their current tables, because those registers don't have saved views yet.
- Fixed: closed row details no longer leave a blank gap under each table row.

## Update 8: ISO 9001:2026

- The mock now follows **ISO 9001:2026** (published 16 September 2026). The edition label comes from one setting, **Settings → Organization → Management system standard**, and shows on the readiness panels, the clause trees and document references. ISO 9001:2015 stays selectable for organizations still in their transition period.
- Clause **6.1** is split as in the 2026 edition: **6.1.2 Actions to address risks** and **6.1.3 Actions to address opportunities**. Readiness is now 19.5 of 32 applicable requirements (still 61%).
- Data saved in a browser by an earlier build is upgraded once on load (edition label and the 6.1 split).
- **Not yet checked against the published text:** the other clause titles and the management review input list (9.3.2 a–f) are carried over from the 2015 wording. Reported 2026 changes that aren't modelled as separate requirements include quality culture and ethical behaviour (5.1.1, 7.3) and the new item 5.2.1 e). Check these against the client's copy of the standard.

## Update 9: classification, two ways to register a document, group by owner and department

**Classification decides the registration method** (client rule):

| Classification | How it is registered | What iQMS holds | Read by iQMS |
|---|---|---|---|
| Public, Internal | **Upload** the file | The file, shown in the document viewer | Yes, used in the readiness assessment |
| Confidential, Highly Confidential | **SharePoint link + description** | The link and the owner's description only | No |

- **Register Document** (was "Connect Document") is one form in three steps: classification, then the file *or* the link and description, then the details. Choosing a classification switches step 2.
- Link-only documents need a description of at least 60 characters and a confirmed **disclaimer**: iQMS cannot open the document, it is counted in the assessment from the owner's description, and that description has not been checked against the document.
- The disclaimer is repeated wherever the document is read or counted: the viewer (which shows the description instead of a preview), the Details panel, the review page, and a note on the ISO 9001 readiness panel saying how many supporting documents are counted from a description only.
- A lock next to a document name marks link-only documents in every table. New columns and filters: **Classification**, **File** (uploaded / SharePoint link / access unavailable) and **Read by iQMS**. New default view: **Confidential**.
- **Create Revision** asks for the revised file (uploaded documents) or an updated description (link-only documents).
- **Department** is now stored on the document. It is asked at registration and follows the owner's department unless changed. Before this it was only read from the owner's profile.
- **Group by Owner** and **Group by Department** are available in Edit view → Layout for Documents, Objectives & KPIs and Risks, and inside a process workspace.
- Sample data: 3 Public, 53 Internal, 5 Confidential and 2 Highly Confidential documents. Data saved in a browser by an earlier build is upgraded once on load.
- Mock limits: no file is sent anywhere (only its name and size are kept), and link checking only tests the address pattern.

## Update 10: customizable QMS pages (pre-made components) and working tables

The four QMS pages (Organization & Scope, Policies, Processes, Objectives & KPIs) are no longer fixed screens. Each one is a **layout of pre-made components**, in the way Zoho pages are assembled from components.

- **Default setup:** every page ships with the layout it had before. Nothing changes until someone customizes it.
- **Customize page** (button on each QMS page, or Settings → Page Layouts) opens the page in edit mode:
  - drag a component to reorder it or move it to another area; the arrow and move buttons do the same from the keyboard
  - four areas: full width top, main column, side column, full width bottom
  - column presets: wide + side, two equal, one column
  - **Add component** opens the library; ✕ removes a component; ⚙ renames it and sets its options
  - **Save layout** applies it to everyone in the organization; **Restore default layout** brings the shipped layout back
- **Library (20 components, all pre-made):**
  - General: ISO 9001 readiness, Key figures, Upcoming document reviews, Management actions, Register view, Text note
  - Organization & context: Register review alert, QMS scope, Sites covered, Context of the organization, Interested parties, Organization, Exclusions, Structure & responsibilities
  - Policy: Quality Policy, Other policies, Communicated & understood
  - Objectives & processes: Objectives on target, Processes, Objectives & KPIs register
- **Register view** embeds any saved view from Documents, KPIs or Risks as a live table, and can be added more than once.
- **Tables on these pages now work.** Sites covered and Interested parties sort, search, export to CSV, and have Add, Edit and Delete. Context issues can be edited. Other policies is a live table from Documented Information.
- Not included: building a new component from scratch, adding a new page to the QMS menu, and per-user layouts (a layout is per organization).

## Update 11: UI review fixes and SaaS settings

**Fixes from the UI review**
- **Phone layout:** Settings → Process Structure, Page Layouts and the process workspace no longer scroll sideways at 390 px. Long tab bars fade at the edge to show they scroll. The top bar shows the page title, and search collapses to an icon that opens across the bar.
- **Tables:** Overview → Process status shows the owner under the process name, so ISO readiness fits at 1440 px. Users & Access shows the email under the name and the department under the role, so nothing is cut off and Department is visible again.
- **Sidebar:** the QMS item no longer looks selected on every page. The hover-expanded sidebar dims the page behind it.
- **Readability:** no text under 12 px (risk matrix scores, avatars, KPI history). The risk matrix cells show H/M/L and use patterns as well as colour, and the legend matches.
- **Overview cards by severity:** *Critical* (red: high risks, overdue actions), *Needs attention* (amber), *All clear* (green, when the count is 0), with a key under the cards.
- **Accessibility:** category delete buttons have labels; section titles no longer squeeze when the subtitle is long.
- **Dates:** "today" is the real date in the organization's time zone. Sample dates move forward by the same number of days, so overdue items stay overdue by the same amount.

**Top bar**
- **Help** menu: search help, keyboard shortcuts (also **?**), what's new, contact support, system status.
- **Notifications**: built from what's assigned to or owned by you (reviews, overdue documents and actions, high risks in your processes, open privacy breaches), with unread count and *Mark all as read*.
- **Account menu**: My profile, Settings, Switch organization, Keyboard shortcuts, About, **Sign out**.
- **Organization switcher** (account menu or the organization name in the expanded sidebar).
- **Sign-in page**: email and password, Microsoft sign-in when SSO is set up, two-step verification, forgot password, privacy notice link, and the custom sign-in message from Branding.

**Settings** (`#/settings/…`, grouped; on screens under 1024 px a dropdown replaces the side list)

| Group | Section | What's there |
|---|---|---|
| Workspace | Regional | Time zone (default Asia/Manila), date format (applies everywhere), week start, language, currency (₱) |
| | Branding | Colour theme (5 contrast-checked palettes, applied live), logo initials, sign-in message |
| People & access | Security | Two-step verification policy, Microsoft Entra ID SSO, password and session rules, IP allowlist with validation, active sessions with sign-out |
| | Notifications | Organization defaults per event (in iQMS / email), review reminders, email digest |
| Connections | API & Webhooks | Create API keys (shown once), revoke, add HTTPS webhooks per event |
| Trust & compliance | **Data Privacy** | Philippine Data Privacy Act (RA 10173): compliance checklist, controller/processor/DPO, personal data inventory (sensitive data flagged), **data access iQMS performs**, time-limited support access, sub-processors, data subject requests, breach log with the 72-hour clock, retention schedule, DPO details, privacy notice |
| | Audit Log | Sign-ins, setting and access changes, exports and record activity; search, filter, export |
| | Data Export & Backup | Full JSON export (works), backup schedule and history, close workspace (typed confirmation) |
| Account | Billing & Plan | Plan, seats and storage usage, invoices, payment details (sample figures) |
| | **About System** | Version and build, workspace details, what's new, support (copy diagnostic info), legal and licences, sample-data reset |

**My Profile** (`#/profile`): personal details, time zone override, personal notification opt-outs, password change, two-step status, signed-in devices, **Download my data** (JSON) and **Request a correction** (logged as a data subject request).

Mock limits: no real authentication, email, payments or backups; the Data Privacy page organizes compliance but is not legal advice.

## Update 12: the organization chart is a chart

Before this, the organization chart was only a document record (QMS-ORG-001), and opening it showed the generic procedure template.

- **QMS → Organization & Scope** now ends with a live **Organization chart** component (clause 5.3). It is drawn from the people in Settings → Users & Access and who each person reports to:
  - Top management at the top, department heads in a row, their teams stacked underneath (so a wide team doesn't run off the page)
  - Each card: name, job title, department colour, number of people under them, and the codes of the **processes they own**; badges for *Top management* and *QMS representative*
  - **Chart / List** toggle (List is the default on phones), and **highlight a department**
  - **Select a person** to see their email, role, processes and direct reports, and to **change who they report to** (you can't pick yourself or someone under you)
- **Document control stays in charge.** Under the chart it says whether it matches the controlled copy. When a reporting line changes, it warns that QMS-ORG-001 is out of date, with **Create Revision**.
- **Opening QMS-ORG-001** shows the chart in a printable layout (top management, then a block per department) instead of the procedure template.
- **Add User** asks who the new person reports to. Anyone without a manager appears under *Not placed yet*. Deactivated users are left out.
- Structure & responsibilities has a **View Chart** button next to the organization chart document.
- Sample data: reporting lines added for every person; data saved in a browser by an earlier build gets them once on load.
- Mock limit: the document preview shows the current chart. In the real build each published revision would keep a frozen copy of the chart as it was approved.

## Update 13: themes (Classic and Material)

**Settings → Branding → Theme** chooses the overall look, separately from the colour palette:

| Theme | Look |
|---|---|
| **Classic** | The original compact design: flat, collapsible sidebar, bordered panels |
| **Material** (default) | Inspired by Material Dashboard: floating rounded sidebar with a gradient, soft card shadows, rounded controls, filled active menu item, uppercase table headers |

- Picking a theme or colour **applies and saves it straight away** for everyone in the organization, with a confirmation message. Pick another option to switch back. (Before 13.1 it was only a preview until *Save Changes*, and leaving the page undid it.) **Save Logo & Sign-in Message** saves the remaining fields. Switching theme never changes data.
- Existing sample-data sessions move to Material once; a later manual switch back to Classic is preserved.
- The colour palettes (Forest, Ocean, Plum, Slate, Terracotta) work with both themes.
- **Material only, Overview:**
  - Welcome banner: greeting by time of day, what's waiting for you, readiness %, **Open Routing**
  - The six attention numbers become stat cards with a coloured icon tile (red = critical, amber = needs attention, green = all clear)
- All Material styles are scoped to `html[data-ui="material"]` in `app.css`, so Classic can't change by accident.

## Update 14: Audit Management

The sidebar item **Internal Audit** is now **Audits**, covering the complete audit lifecycle without creating a parallel record store. Existing processes, corrective actions, evidence, management-review inputs and ISO readiness all use the same audit and finding records.

- **Overview:** audit and NC counts, upcoming and overdue work, programme progress, trends, findings by area and ISO clause.
- **Programme:** 2026/2027 table and calendar views, area-clause matrix, process coverage, planning, scheduling and auditor assignment.
- **Audit workspace:** plan, team and independence, checklist, evidence snapshots, findings, corrective actions, report and activity history.
- **Nonconformities:** status views, area monitoring, discussion threads and mentions, correction/root cause/action workflow, verification and effectiveness.
- **Reports:** area reports, consolidated editor, review/approval/publishing, frozen revisions and A4 print/PDF layouts based on structured audit results.
- **Lifecycle controls:** an audit cannot close until its report is published and every NC is closed; publishing a report does not close its NCs.
- **Role demonstration:** QMS Manager, Lead Auditor, Auditor, Area Owner, Reviewer, Approver and Viewer can be demonstrated with the module's “Viewing as” control.

## Update 15: customizable Overview and drag-resizable components

- **Overview → Customize page** uses the same saved-layout editor as the QMS pages. Welcome, attention summary, ISO readiness, assigned work, process status, upcoming reviews and management actions are separate pre-made components.
- Every page-layout component has safe width and height minimums. In customize mode, drag the right edge, bottom edge or bottom-right corner to resize; changes persist after **Save layout**.
- Fixed-height content scrolls inside its component. Register and process-status tables therefore scroll vertically and horizontally without making the whole page excessively long.
- At phone widths every component becomes full width, regardless of its saved desktop width.

## Update 15 — Audit Management corrective redesign (one audit = one process)

Update 14 let one audit hold several "areas" (processes) with their own auditors, checklists and area reports, then a consolidated report. That mixed planning with execution and made ownership, scheduling and reporting unclear. Now:

- **One audit = one process.** An **Audit Programme** (Draft → For Approval → Approved → Active → Completed → Archived) only plans: which process, when, why, who and status. It contains many process audits and has a **Programme Summary** (completion, overdue, major/minor/open NCs, repeat findings, overdue corrective actions) for the annual view.
- **Audit trigger** replaces "type": *Planned* (programme + planned period) or *Triggered* (Risk, Nonconformity, Corrective Action Follow-up, Customer Complaint, Incident, Performance/KPI Issue, Previous Audit Finding, Management Request, Other) with the related record and reason. A risk's row menu and details offer **Create Audit**, prefilled as a triggered audit; the risk and the NC link back to audits they triggered.
- **Audit Plan Builder** (`#/audits/new`): a full page with 8 steps — Process, Trigger, Plan, Clauses, Schedule, Auditors, Checklist, Review & Create — with the process context (owner, clauses, documents, evidence, risks, KPIs, previous audits/findings, open NCs/CAs) beside it. **Save Draft** keeps a `DRAFT-nnn` you can resume from the Audit Register.
- **Process ↔ ISO clause matrix** is master data in **Settings → Process ↔ ISO Clauses**. The Clauses step suggests them; changes there apply to that audit only.
- **Sessions and calendar:** an audit has one or more sessions (date, time, location, auditors, notes). **Audits → Calendar** has month, week and agenda views, filters (programme, process, auditor, status, trigger, date range), a details drawer with Open Audit / Open Plan / Reschedule (no drag), planned vs triggered markers and **scheduling-conflict warnings** when an auditor is in two sessions at once (warn, not block).
- **Auditor assignments:** Lead Auditor, Auditor, Technical Expert, Observer, each with assigned clauses (or a technical scope) and an independence status (Independent / Potential Conflict / Needs Confirmation). Questions follow the assigned clauses; only the assigned auditor can answer them.
- **Checklist builder and templates:** sections and questions like a form builder (assessment, yes/no/N/A, text, multiple choice, numeric, date, evidence review, document reference, section heading, instruction), with add/edit/duplicate/delete/reorder, assignee, clause, expected evidence and required flag. Start from the process default, a template, or blank. **Checklist Templates** can be created, edited, duplicated and archived.
- **Execution:** workspace tabs Overview, Plan, Checklist, Findings & NCs, Report, Activity. Each auditor gets **My Checklist** and **Submit Audit Work** (not possible with unanswered required questions; N/A needs a reason). **Complete Fieldwork** is only possible when every required question is answered and every assignment is submitted, and lists the exact blockers otherwise.
- **Process Audit Report:** one controlled report per audit, generated from the records in 19 sections (plus Executive Summary), including each auditor's contribution. Only Executive Summary, Auditor Comments, Lead Auditor Conclusion and Follow-up Requirements are editable. Generate Draft → Edit → Submit → Review → Approve → Publish → PDF. Publishing moves the audit to Follow-up; it closes only when the report is published and every NC is closed after effectiveness verification.
- **Migration (auditModel 1 → 2):** runs once on load. Single-area audits are converted in place; multi-area audits are split into `IA-…A`, `IA-…B`… (one per process), keeping programme, dates (as sessions), team, findings, NCs, evidence, report history and activity. Findings follow their process; a finding whose process was not one of the audit's areas stays on the original audit and is flagged **Migration review required** (resolve it in Findings & NCs). The old multi-area audit remains as a read-only pointer to its split audits, and a previously published consolidated report is kept as the revision history of each split audit.

## Update 16: cleaner dashboard components (ReUI-style UI kit)

Pages felt crowded: two lines of text in every row, a button on every row, dashes in empty cells, coloured status text and explanation sentences everywhere. Update 16 adds a small component kit in the style of ReUI / shadcn dashboard blocks. It is plain CSS and JavaScript, with no framework.

- **UI kit** (`assets/ui-kit.js`, `ui-` classes in `app.css`): stat card, card with a quiet header, one-line list rows, soft badges, issue chips, ⓘ info tips, sparklines and due-date badges. **Settings → Workspace → UI Components** shows each one with live data and the call to use.
- **Overview rebuilt with the kit:**
  - Four stat cards: overdue corrective actions, high risks, overdue documents and KPIs below target.
  - Needs your action, Upcoming reviews and Management actions are one-line rows with a due badge. The whole row opens the item; there are no per-row buttons.
  - The Process status table goes from 9 columns to 4: Process, Status, Open issues and ISO readiness. Open issues shows only non-zero counts as chips, so a healthy process has an empty cell instead of a row of dashes.
  - Help sentences moved behind ⓘ.
  - The ISO readiness gauge is unchanged. Component keys are unchanged, so saved Overview layouts and **Customize page** keep working.
- **Applied to every page:**
  - Status labels and process health render as soft badges.
  - Zero/empty cells are faint.
  - Table headers use sentence case instead of uppercase.
  - List rows are a single line with hover highlight, and their buttons stay quiet until the row is hovered.
  - Card headers are calmer.

## Update 19: Objectives & KPIs — one generic KPI engine

A KPI result no longer has to be typed in as a bare number. The module now follows this chain:

Quality objective → KPI definition → collection method → measurement records (optional) → calculation → **period result** → review → evidence.

**Data** (`assets/kpi.js`, sample configuration in `assets/kpi-data.js`)
- **Objectives:** `objectives` holds the quality objectives.
- **KPI definitions:** the existing `kpis` records are extended with department, data owner, reviewer, frequency, aggregation, collection method, formula, minimum sample, dimensions and consolidation levels.
- **Period results:** `kpiResults` has one record per KPI per period, with value, method, source (type, system, reference, link), records used, calculation, approval status and who recorded/reviewed it. A new approved result for a period keeps the earlier one as *Superseded*.
- **Measurement records:** `kpiRecords` holds optional underlying records with generic dimensions (person, team, department, project, customer, supplier, site …), numerator/denominator or value.
- **Supporting collections:** `kpiCycles` (collection cycles: Draft → Collecting → Ready to Calculate → Calculated → For Review → Approved → Closed), `kpiImports` (import batches with rejected rows), `kpiSurveys` (survey / evaluation sources) and `kpiLog` (definition, target, method, import and approval history).
- **Backward compatible:** on first load every existing KPI's six values become period results ("Existing KPI record"), and `actual`, `period` and `trend` stay as a cache of the approved results. Overview, process workspace, process cards, management review, audits and search keep working unchanged.

**Aggregation:** average, weighted average, percentage (Σ numerator ÷ Σ denominator), ratio, sum, count, min, max, median, latest, pass rate, custom formula, or no calculation (final result provided externally). Percentages are only averaged when the rule says Average. Optional consolidation follows the configured levels, e.g. person → team → department → organization.

**Screens**
- **Register:** gains Department, Source Method and Frequency fields. The KPI name opens the new detail page. *Add KPI* opens a 7-section editor (Basic Information, Scope, Target, Measurement, Collection, Responsibility, Review). *Quality Objectives* lists and edits objectives.
- **KPI detail** (`#/qms/objectives/k/<id>`), with six tabs:
  - **Overview:** current/target/previous/difference/records used, trend chart with target line, definition.
  - **Measurements:** records by period, consolidation, add / import / export.
  - **Collection:** method, formula, owners, dimensions, method history, collection cycles.
  - **Results:** period results; click one for its traceability.
  - **Evidence:** source references, links, imported files, survey batches, iQMS records, cycles.
  - **History.**
- **Record Result** (the fast path): period, result, source, system, reference, link, optional numerator/denominator, notes, live status preview, optional review, Save Draft.
- **Collect Data:**
  - Manual entry: spreadsheet-like grid, add/duplicate/delete rows, paste from Excel.
  - Excel/CSV import: 5 steps (file, map columns, validate, review calculation, import), with downloadable error rows.
  - Survey / evaluation source.
  - Internal QMS data: corrective actions closed on time, from the CAPA register.
  - External integration: configuration and status only; no live connection in this demo.
- **Result traceability:** clicking any result answers "where did this number come from?": the source, the import file, the survey responses, the CAPA records, the calculation and the approval.
- **Collection cycle** (`#/qms/objectives/c/<id>`): expected/received/missing, completion, contributors with Send Reminder, records, Calculate → Submit for Review → Approve → Close.

**Sample data** covers each case:
- Customer satisfaction: Q3 2026 calculated from 42 survey responses.
- Supplier on-time delivery: external results in 2025 → Excel import Jan–Jun 2026 → ERP integration from Jul 2026.
- Training completion: imported from an HRIS file, 48 rows, 2 rejected.
- Corrective actions closed on time: calculated from CAPA.
- Management actions closed: final results only, with SharePoint links.
- New K-16 Installation productivity: 24 installers in 3 teams and 2 departments, with a September collection cycle in progress.

## Update 20: tabbed QMS, process and audit pages

The QMS sub-pages, the process workspace and the audit pages were dashboards with many panels on one screen. Each page now uses **pill tabs** (a rounded segmented group; the active tab is a filled pill) with one topic per tab, and opens on a **Summary** tab built on one fixed board layout:

- **Left column:** up to four stacked stat tiles (coloured icon square, label with a short note, big number) and one breakdown card (a ring chart plus up to five progress bars).
- **Right:** one table card titled *Needs attention*, with search, a type filter, an optional primary button and page numbers (8 rows per page). Columns: Item · Type · Owner (avatar) · Due · Status pill. Clicking a row opens the record.

The app's own colours are kept. The other tabs show the same components as before (tables, editing, export), in rounded cards.

| Page | Tabs |
|---|---|
| QMS → Organization & Scope (`#/qms/scope/<tab>`) | Summary · Scope (statement, sites, exclusions) · Context (issues, register alert) · Interested Parties · Organization (facts, structure documents, full-width org chart) |
| QMS → Policies (`#/qms/policies/<tab>`) | Summary · Quality Policy (policy + acknowledgement) · Other Policies · Objectives |
| Process workspace (`#/process/<id>/<tab>`) | **Summary** (health, documents overdue, high risks, KPIs below target; ISO readiness ring + documents/evidence/KPIs/actions bars; attention table) · **Definition** (purpose, inputs, outputs, roles, elements, subprocesses, clauses) · Documents · Risks · KPIs · Evidence · Audit & Actions · ISO Mapping (readiness lives here only) · **Activity** |
| Audits (`#/audits`) | Summary: audits in progress, open NCs, overdue items, sessions in the next 14 days; programme ring + checklist progress of running audits; table of overdue audits/NCs/actions, NCs to verify and auditor conflicts. Status counts are in *Audits*; the NC trend chart and findings-by-process moved to **Nonconformities → Trends** (`#/audits/nc?view=trends`). |
| Audit workspace (`#/audits/a/<id>`) | **Summary** replaces Overview: stage, findings, next session; checklist ring + progress per auditor; attention table with links. Auditor progress moved into **Plan → Audit team** (Answered column shows answered / total). |

**Board kit:** Settings → Workspace → UI Components has a *Board kit (Update 20)* section. It shows the eight page rules and a live demo of each piece, with its usage line: pill tabs, stat tile, ring chart, breakdown card, attention table, and the full Summary board. The board stacks based on the width of the area it sits in (a container query), so it also fits narrow areas such as the settings column.

Other changes
- **Customize page** is removed from the four QMS pages (kept on Overview). Settings → Page Layouts lists only Overview. Saved layouts already in local storage are kept but no longer used by those pages.
- Settings → Process Workspace has the two new tabs. Saved workspace configurations are migrated once (`workspace.v20`): Definition is added after the first tab, Activity at the end, and an unchanged "Overview" label becomes "Summary"; renamed tabs keep their names.
- Process tabs with a warning show only the warning ("1 overdue") instead of count + warning, so all tabs fit.
- The page subtitle tooltip opens on hover only (it used to open over the tabs after every navigation, because the title gets focus).
- Fixed the NC trend chart bars rendering black (`.mini-chart .hit` had no fill).
- Shared helpers: `Q.ui.tabs`, `Q.ui.summary` (board), `Q.ui.tile`, `Q.ui.donut`, `Q.ui.breakdown`, `Q.ui.btable` (ui-kit.js) and `Q.renderComp` (pages.js — renders a pre-made component inside a tab, keeping its tables, edits and exports).
- Re-applied the Update 19 routing in `qms.js` that the main-branch merge had left out (`#/qms/objectives/k/<id>`, `/goals`, `/c/<cycle>`, KPI register links and actions).

## Files

| File | Change |
|---|---|
| `assets/shell.js` | New sidebar (client menu), QMS parent/children, Documented Information hover list |
| `assets/saved-views.js` | **New.** Field list, filter conditions, view storage, Edit view panel |
| `assets/pages.js` | **New.** Page layouts: component registry, customize mode, component library, general components |
| `assets/documents.js` | Documented Information page: Library (saved views + grouping) and Routing tabs |
| `assets/qms.js` | **New.** QMS pages, risk matrix and assessment tool, Evidence views, Internal Audit, Management Review, Corrective Action |
| `assets/views.js` | Overview links updated; Reassess action on risks; reports moved into Management Review; old cross-process pages removed |
| `assets/core.js` | ISO clause helpers, v2 → v3 route redirects, new storage key |
| `assets/data.js` | Added process categories, organization context & scope, quality policy, management reviews |
| `assets/settings-extra.js` | **New.** Regional, Branding, Security, Notifications, API & Webhooks, Data Privacy, Audit Log, Data Export & Backup, Billing & Plan, About System |
| `assets/orgchart.js` | **New.** Organization chart component, person details and reporting lines, chart in the QMS-ORG-001 preview |
| `assets/audit-data.js` | Audit programmes, one-process audits with sessions and assignments, findings, NCs, discussions, qualified auditors, checklist templates (Update 15) |
| `assets/audits.js` | Audit model v2, v1 → v2 migration, permissions, overview, programme and summary, calendar, register, clause matrix in Settings |
| `assets/audit-builder.js` | **New (Update 15).** Audit Plan Builder, session editor, checklist builder, checklist templates |
| `assets/audit-workspace.js` | **New (Update 15).** Process audit workspace: plan, assignments, My Checklist, submit work, fieldwork, findings |
| `assets/audit-nc.js` | **New.** NC register, monitoring, discussions, corrective action, verification and effectiveness |
| `assets/audit-report.js` | Process Audit Report (19 sections), editor, workflow, revisions and A4 print/PDF layout |
| `assets/ui-kit.js` | **New (Update 16).** Dashboard component kit and the UI Components settings page |
| `assets/theme.js` | **New.** Theme switch and Material welcome banner |
| `assets/account.js` | **New.** Help, notifications and account menus, organization switcher, sign-in, My Profile |
| `assets/app.css` | Styles for the above |
| `screenshots/` | v3 captures at 1440 px |

## Open questions for the client

1. **"Routing"**: we read this as the document approval route (review → approval → publication). If they meant distribution routing (who receives a published document), that's a separate feature.
2. **"Risk and Opportunities – tool"**: built as a matrix plus a scoring/assessment form. Do they want a specific method, such as FMEA or a 3×3 scale?
3. **Overview**: kept as the landing page above item 1. Remove it if they want the menu to start at QMS.
4. **Clause counts overlap** by design, because one document can support several clauses. Confirm that's acceptable in the hover list.
