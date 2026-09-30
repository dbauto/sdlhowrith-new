# iQMS v3: client menu update

This is a copy of `QMS-v2-process-centric`, reworked around the client's feedback on navigation. The v2 source folder was not modified.
Everything shown is fictional **sample data** for "Helios Solar Installations".

## Run it

```powershell
cd QMS-v3-client-menu
node scripts/serve.cjs
```

Open <http://127.0.0.1:4173>. You can also open `index.html` directly. Changes are kept in this browser's `localStorage` under a new key (`iqms.v3.*`), so v2 and v3 don't overwrite each other. To start over, use **Settings → Organization → Reset Sample Data**.

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
| 5 | Internal Audit | `#/audit` | Programme, Findings, **Process coverage** (which processes aren't in the programme, 9.2.2) |
| 6 | Management Review | `#/mgmt-review` | **9.3.2 inputs assembled live** (a–f), decisions and actions (9.3.3), meetings, reports |
| 7 | Corrective Action | `#/capa` | Stage pipeline (root cause → action → effectiveness → closed), corrective actions, improvement opportunities; **Raise Corrective Action** form |
| 8 | Settings | `#/settings` | Unchanged |

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

## Files

| File | Change |
|---|---|
| `assets/shell.js` | New sidebar (client menu), QMS parent/children, Documented Information hover list |
| `assets/saved-views.js` | **New.** Field list, filter conditions, view storage, Edit view panel |
| `assets/documents.js` | Documented Information page: Library (saved views + grouping) and Routing tabs |
| `assets/qms.js` | **New.** QMS pages, risk matrix and assessment tool, Evidence views, Internal Audit, Management Review, Corrective Action |
| `assets/views.js` | Overview links updated; Reassess action on risks; reports moved into Management Review; old cross-process pages removed |
| `assets/core.js` | ISO clause helpers, v2 → v3 route redirects, new storage key |
| `assets/data.js` | Added process categories, organization context & scope, quality policy, management reviews |
| `assets/app.css` | Styles for the above. Still one stylesheet with no `!important` |
| `screenshots/` | v3 captures at 1440 px |

## Open questions for the client

1. **"Routing"**: we read this as the document approval route (review → approval → publication). If they meant distribution routing (who receives a published document), that's a separate feature.
2. **"Risk and Opportunities – tool"**: built as a matrix plus a scoring/assessment form. Do they want a specific method, such as FMEA or a 3×3 scale?
3. **Overview**: kept as the landing page above item 1. Remove it if they want the menu to start at QMS.
4. **Clause counts overlap** by design, because one document can support several clauses. Confirm that's acceptable in the hover list.
