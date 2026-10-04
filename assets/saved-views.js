/* iQMS v3 — saved views: field registry, filter rules, and the editors.
 *
 * A VIEW = { id, name, scope, filters[], columns[], group, sort }.
 * Filters and columns refer to FIELDS by key, so a view is plain data that can be
 * saved, named, shared and restored. The same engine serves any record type; each
 * type only needs a field list (documents are defined below).
 *
 * Field types → operators:
 *   text     contains · not_contains
 *   enum     in · not_in                 (value: [..])
 *   person   in · not_in                 (value may include "@me")
 *   process  in · not_in                 (includes subprocesses)
 *   clause   in · none                   (8 matches 8.3 and 8.3.4)
 *   date     before · after · next · past · empty · not_empty
 *   bool     is_true · is_false
 *   number   gt · lt · eq                                                        */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const clone = v => JSON.parse(JSON.stringify(v));
  if (!Q.S.savedViews) { Q.S.savedViews = clone(window.QMS_DATA.savedViews); Q.save(); }
  Object.keys(window.QMS_DATA.savedViews).forEach(t => { if (!Q.S.savedViews[t]) { Q.S.savedViews[t] = clone(window.QMS_DATA.savedViews[t]); Q.save(); } });
  // Earlier mock builds described "In workflow" as "Routing stage is not Not in routing"; use the clearer field.
  (Q.S.savedViews.documents || []).forEach(v => { if (v.id === 'v-workflow' && v.seed && JSON.stringify(v.filters) === '[{"field":"routing","op":"not_in","value":["Not in routing"]}]') v.filters = [{ field: 'inRouting', op: 'is_true' }]; });

  // Views saved before classification existed: show the new column in "All documents" and add the Confidential default view.
  Q.S.flags = Q.S.flags || {};
  if (!Q.S.flags.classViews) {
    const list = Q.S.savedViews.documents || [], all = list.find(v => v.id === 'v-all' && v.seed);
    if (all && !all.columns.includes('classification')) all.columns.splice(Math.max(0, all.columns.indexOf('type')) + 1, 0, 'classification');
    if (!list.some(v => v.id === 'v-restricted')) { const seed = window.QMS_DATA.savedViews.documents.find(v => v.id === 'v-restricted'), at = list.findIndex(v => v.group !== 'none'); list.splice(at < 0 ? list.length : at, 0, clone(seed)); }
    Q.S.flags.classViews = true; Q.save();
  }

  const OPS = {
    text: [['contains', 'contains'], ['not_contains', 'does not contain']],
    enum: [['in', 'is'], ['not_in', 'is not']],
    person: [['in', 'is'], ['not_in', 'is not']],
    process: [['in', 'is in'], ['not_in', 'is not in']],
    clause: [['in', 'includes'], ['none', 'is not mapped']],
    date: [['next', 'is within the next'], ['past', 'is in the past'], ['before', 'is before'], ['after', 'is after'], ['empty', 'is empty'], ['not_empty', 'is set']],
    bool: [['is_true', 'is yes'], ['is_false', 'is no']],
    number: [['gt', 'is more than'], ['lt', 'is less than'], ['eq', 'equals']]
  };
  const NO_VALUE = ['past', 'empty', 'not_empty', 'is_true', 'is_false', 'none'];

  /* ---------------- Document fields ---------------- */
  const docRouting = d => { const w = Q.wfForDoc(d.id); return !w ? 'Not in routing' : w.changesRequested ? 'Changes requested' : { review: 'Review', approval: 'Approval', publication: 'Publication' }[w.stage]; };
  const docEvidence = d => new Set([...d.evidence, ...Q.S.evidence.filter(e => e.doc === d.id).map(e => e.id)]).size;
  const uniq = arr => [...new Set(arr)].sort();
  const docSource = d => d.source.state !== 'connected' ? 'Access unavailable' : d.source.mode === 'upload' ? 'Uploaded to iQMS' : `${d.source.system} link`;
  Q.FIELDS = {
    documents: [
      { key: 'id', label: 'Document ID', type: 'text', cls: 'c-id', get: d => d.id, sort: d => d.id, render: d => esc(d.id) },
      { key: 'title', label: 'Document name', type: 'text', locked: true, min: '200px', get: d => d.title, sort: d => d.title,
        render: d => `<button type="button" class="doc-link" data-action="open-doc" data-id="${esc(d.id)}" title="Open ${esc(d.id)}${Q.docRestricted(d) ? ` · ${esc(d.classification)} — iQMS has the description only, not the file` : ''}">${esc(d.title)}${Q.docRestricted(d) ? `<span class="lock-mark">${icon('lock')}</span>` : ''}</button>` },
      { key: 'process', label: 'Process', type: 'process', get: d => d.process, sort: d => Q.proc(d.process)?.process_code, render: d => Q.pcell(d.process) },
      { key: 'type', label: 'Type', type: 'enum', options: () => uniq(Q.S.documents.map(d => d.type)), get: d => d.type, sort: d => d.type, render: d => esc(d.type) },
      { key: 'rev', label: 'Rev', type: 'text', cls: 'c-rev', get: d => d.rev || '', sort: d => d.rev || '',
        render: d => `${d.rev ? esc(d.rev) : '<span class="muted" title="Not yet published">—</span>'}${d.workingRev && d.status !== 'Published' ? ` <span class="rev-next" title="Rev ${esc(d.workingRev)} in progress">→ ${esc(d.workingRev)}</span>` : ''}` },
      { key: 'status', label: 'Status', type: 'enum', options: () => ['Draft', 'In Review', 'Changes Requested', 'Approval in Progress', 'Approved', 'Published', 'Superseded', 'Obsolete'], get: d => d.status, sort: d => d.status, render: d => Q.docStatus(d) },
      { key: 'owner', label: 'Owner', type: 'person', get: d => d.owner, sort: d => Q.pname(d.owner), render: d => `<span class="nowrap">${esc(Q.pname(d.owner))}</span>` },
      { key: 'department', label: 'Department', type: 'enum', options: () => Q.departments(), get: d => Q.docDept(d), sort: d => Q.docDept(d), render: d => esc(Q.docDept(d)) },
      { key: 'classification', label: 'Classification', type: 'enum', options: () => Q.CLASSES.map(c => c.key), get: d => Q.docClass(d).key, sort: d => Q.CLASSES.indexOf(Q.docClass(d)), render: d => Q.classChip(d) },
      { key: 'updated', label: 'Last updated', type: 'date', cls: 'c-date', get: d => d.updated, sort: d => d.updated, render: d => Q.fmt(d.updated) },
      { key: 'effective', label: 'Effective', type: 'date', cls: 'c-date', get: d => d.effective, sort: d => d.effective || '', render: d => Q.fmt(d.effective) },
      { key: 'nextReview', label: 'Next review', type: 'date', cls: 'c-date', get: d => d.nextReview, sort: d => d.nextReview || '9999', render: d => Q.reviewDate(d.nextReview, Q.docOverdue(d), Q.docDueSoon(d)) },
      { key: 'overdue', label: 'Review overdue', type: 'bool', yes: 'Review is overdue', no: 'Review is not overdue', get: d => Q.docOverdue(d), sort: d => Q.docOverdue(d) ? 0 : 1, render: d => Q.docOverdue(d) ? '<span class="date-overdue">Yes</span>' : '<span class="muted">No</span>' },
      { key: 'inRouting', label: 'In routing', type: 'bool', yes: 'In routing', no: 'Not in routing', get: d => !!Q.wfForDoc(d.id), sort: d => Q.wfForDoc(d.id) ? 0 : 1, render: d => Q.wfForDoc(d.id) ? 'Yes' : '<span class="muted">No</span>' },
      { key: 'routing', label: 'Routing stage', type: 'enum', options: () => ['Not in routing', 'Review', 'Changes requested', 'Approval', 'Publication'], get: docRouting, sort: docRouting,
        render: d => { const r = docRouting(d); return r === 'Not in routing' ? '<span class="muted">—</span>' : esc(r); } },
      { key: 'waiting', label: 'Waiting on', type: 'person', get: d => Q.wfAssignees(Q.wfForDoc(d.id)), sort: d => Q.wfAssignees(Q.wfForDoc(d.id)).map(Q.pname).join(), render: d => { const a = Q.wfAssignees(Q.wfForDoc(d.id)); return a.length ? `<span class="nowrap">${a.map(x => Q.who(x)).join(', ')}</span>` : '<span class="muted">—</span>'; } },
      { key: 'iso', label: 'ISO 9001 clauses', type: 'clause', get: d => Q.docIso(d), sort: d => Q.docIso(d).map(Q.clauseSort).sort()[0] || '99', render: d => { const c = Q.docIso(d); return c.length ? `<span class="clause small">${c.map(esc).join(', ')}</span>` : '<span class="muted">—</span>'; } },
      { key: 'evidence', label: 'Evidence records', type: 'number', cls: 'c-num', get: docEvidence, sort: docEvidence, render: d => docEvidence(d) || '<span class="zero">—</span>' },
      { key: 'source', label: 'File', type: 'enum', options: () => ['Uploaded to iQMS', 'SharePoint link', 'Access unavailable'], get: docSource, sort: docSource,
        render: d => d.source.state !== 'connected' ? '<span class="src-bad small">Link unavailable</span>' : `<span class="small">${esc(docSource(d))}</span>` },
      { key: 'readable', label: 'Read by iQMS', type: 'bool', yes: 'Content read by iQMS', no: 'Description only', get: d => !Q.docRestricted(d), sort: d => Q.docRestricted(d) ? 1 : 0,
        render: d => Q.docRestricted(d) ? '<span class="small">Description only</span>' : '<span class="small muted">Yes</span>' }
    ]
  };
  Q.RECORDS = { documents: () => Q.S.documents };

  /* ---------------- Options for pickers ---------------- */
  const optionsFor = f => {
    if (f.type === 'enum') return f.options().map(v => [v, v]);
    if (f.type === 'person') return [['@me', `Me (${Q.pname(Q.me())})`], ...Object.entries(Q.S.people).map(([id, p]) => [id, p.name])];
    if (f.type === 'process') return Q.topProcesses().flatMap(p => [[p.process_id, `${p.process_code} ${p.name}`], ...Q.children(p.process_id).map(c => [c.process_id, ` ${c.process_code} ${c.name}`])]);
    if (f.type === 'clause') return Q.CLAUSES.flatMap(([c, t]) => [[c, `${c} ${t}`], ...Q.reqsIn(c).map(r => [r.clause, ` ${r.clause} ${r.title}`])]);
    return [];
  };

  /* ---------------- Evaluation ---------------- */
  const today = () => Q.today();
  const test = (f, rule, rec) => {
    const v = f.get(rec), val = rule.value, arr = Array.isArray(v) ? v : [v];
    const list = Array.isArray(val) ? val.map(x => x === '@me' ? Q.me() : x) : [];
    switch (rule.op) {
      case 'contains': return String(v || '').toLowerCase().includes(String(val || '').toLowerCase());
      case 'not_contains': return !String(v || '').toLowerCase().includes(String(val || '').toLowerCase());
      case 'in':
        if (f.type === 'process') return list.some(p => Q.inProc(v, p));
        if (f.type === 'clause') return arr.some(c => list.some(t => Q.clauseIn(c, t) || Q.clauseIn(t, c)));
        return arr.some(x => list.includes(x));
      case 'not_in':
        if (f.type === 'process') return !list.some(p => Q.inProc(v, p));
        return !arr.some(x => list.includes(x));
      case 'none': return !arr.length;
      case 'before': return !!v && v < val;
      case 'after': return !!v && v > val;
      case 'next': return !!v && v >= today() && Q.days(today(), v) <= Number(val || 0);
      case 'past': return !!v && v < today();
      case 'empty': return !v;
      case 'not_empty': return !!v;
      case 'is_true': return !!v;
      case 'is_false': return !v;
      case 'gt': return Number(v) > Number(val);
      case 'lt': return Number(v) < Number(val);
      case 'eq': return Number(v) === Number(val);
      default: return true;
    }
  };
  Q.field = (type, key) => Q.FIELDS[type].find(f => f.key === key);
  Q.ruleOk = (type, r) => { const f = Q.field(type, r.field); if (!f) return false; if (NO_VALUE.includes(r.op)) return true; return Array.isArray(r.value) ? r.value.length > 0 : r.value !== '' && r.value != null; };
  Q.matcher = (type, filters) => { const rules = (filters || []).filter(r => Q.ruleOk(type, r)); return rec => rules.every(r => test(Q.field(type, r.field), r, rec)); };
  Q.describeRule = (type, r) => {
    const f = Q.field(type, r.field); if (!f) return '';
    const op = (OPS[f.type].find(o => o[0] === r.op) || [])[1] || r.op;
    if (f.type === 'bool') return r.op === 'is_true' ? (f.yes || `${f.label} is yes`) : (f.no || `${f.label} is no`);
    if (NO_VALUE.includes(r.op)) return `${f.label} ${op}`;
    if (Array.isArray(r.value)) {
      const names = r.value.map(v => (optionsFor(f).find(o => o[0] === v)?.[1] || v).trim().replace(/^Me \(.*\)$/, 'me'));
      return `${f.label} ${op} ${names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(f.type === 'process' || f.type === 'clause' ? ', ' : ' or ')}`;
    }
    if (r.op === 'next') return `${f.label} ${op} ${r.value} days`;
    if (f.type === 'date') return `${f.label} ${op} ${Q.fmt(r.value)}`;
    return `${f.label} ${op} “${r.value}”`;
  };

  /* ---------------- Views ---------------- */
  Q.viewList = type => Q.S.savedViews[type] || (Q.S.savedViews[type] = []);
  Q.viewGet = (type, id) => Q.viewList(type).find(v => v.id === id);
  Q.viewCreate = (type, def) => {
    const v = { id: 'v-' + Date.now().toString(36), seed: false, owner: Q.me(), ...clone(def) };
    Q.viewList(type).push(v); Q.save(); return v;
  };
  Q.viewRestoreDefaults = type => {
    const seed = clone(window.QMS_DATA.savedViews[type] || []);
    Q.S.savedViews[type] = [...seed, ...Q.viewList(type).filter(v => !v.seed)];
    Q.save();
  };

  /* ---------------- Edit view panel ----------------
   * One place to change everything a view saves: name, who can see it,
   * filters, columns (and their order), grouping and default sort.          */
  Q.openViewEditor = (type, { view = null, base = null, onSave, onDelete, noun = 'records', groups = [['none', 'None'], ['process', 'Process'], ['clause', 'ISO 9001 clause'], ['owner', 'Owner'], ['department', 'Department']] }) => {
    const fields = Q.FIELDS[type];
    const st = clone(view ? { name: view.name, scope: view.scope, filters: view.filters, columns: view.columns, group: view.group, sort: view.sort }
      : { name: '', scope: 'personal', filters: [], columns: fields.slice(0, 7).map(f => f.key), group: 'none', sort: null, ...(base || {}) });
    let order = [...st.columns, ...fields.map(f => f.key).filter(k => !st.columns.includes(k))];
    const on = new Set(st.columns);
    const defOp = f => OPS[f.type][0][0];
    const defVal = (f, op) => NO_VALUE.includes(op) ? undefined : ['enum', 'person', 'process', 'clause'].includes(f.type) ? [] : op === 'next' ? 30 : f.type === 'date' ? Q.today() : '';

    const valueEditor = (f, r, i) => {
      if (NO_VALUE.includes(r.op)) return '';
      if (['enum', 'person', 'process', 'clause'].includes(f.type)) {
        const val = Array.isArray(r.value) ? r.value : [];
        return `<div class="pick-list" role="group" aria-label="${esc(f.label)} values">${optionsFor(f).map(([v, l]) => `<label class="checkbox"><input type="checkbox" data-rv="${i}" value="${esc(v)}" ${val.includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
      }
      if (f.type === 'date') return r.op === 'next' ? `<label class="inline-num"><input class="input" type="number" min="1" data-rv="${i}" value="${esc(r.value ?? 30)}" aria-label="Number of days"> days</label>` : `<input class="input" type="date" data-rv="${i}" value="${esc(r.value || Q.today())}" aria-label="Date">`;
      if (f.type === 'number') return `<input class="input" type="number" data-rv="${i}" value="${esc(r.value ?? '')}" aria-label="Value">`;
      return `<input class="input" type="text" data-rv="${i}" value="${esc(r.value || '')}" placeholder="Text" aria-label="Value">`;
    };
    const ruleRow = (r, i) => { const f = Q.field(type, r.field), ve = valueEditor(f, r, i);
      return `<div class="rule"><span class="rule-join">${i ? 'and' : 'Where'}</span>
        <select class="select" data-rf="${i}" aria-label="Field">${fields.map(x => `<option value="${x.key}" ${x.key === r.field ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
        <select class="select" data-ro="${i}" aria-label="Condition">${f.type === 'bool' ? `<option value="is_true" ${r.op === 'is_true' ? 'selected' : ''}>${esc(f.yes ? 'yes — ' + f.yes.toLowerCase() : 'is yes')}</option><option value="is_false" ${r.op === 'is_false' ? 'selected' : ''}>${esc(f.no ? 'no — ' + f.no.toLowerCase() : 'is no')}</option>` : OPS[f.type].map(([k, l]) => `<option value="${k}" ${k === r.op ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <button class="icon-btn" type="button" data-rx="${i}" aria-label="Remove condition">${icon('trash-2')}</button>
        ${ve ? `<div class="rule-value">${ve}</div>` : ''}</div>`; };

    const sec = (id, title, sub, body) => `<section class="ve-sec" aria-labelledby="ve-${id}"><header><h3 id="ve-${id}">${title}</h3>${sub ? `<span>${sub}</span>` : ''}</header>${body}</section>`;
    const count = () => Q.RECORDS[type]().filter(Q.matcher(type, st.filters)).length;
    const sortable = fields.filter(f => f.sort);

    const m = Q.openModal({ size: 'drawer', title: view ? 'Edit view' : 'New view', sub: view ? esc(view.name) + (view.seed ? ' · default view' : '') : 'Choose what this view shows. You can change it any time.',
      body: '<form class="modal-body ve" novalidate></form>',
      foot: `${view && onDelete ? `<button class="btn danger" type="button" data-del style="margin-right:auto">${icon('trash-2')}Delete view</button>` : '<span style="margin-right:auto"></span>'}<button class="btn" type="button" data-close>Cancel</button>${view ? '<button class="btn" type="button" data-saveas>Save as new view</button>' : ''}<button class="btn primary" type="button" data-ok>${view ? 'Save view' : 'Create view'}</button>` });
    const form = m.querySelector('form');
    const draw = (focusSel) => {
      form.innerHTML =
        sec('name', 'Name', '', `<label class="field"><span class="sr-only">View name</span><input class="input" name="vname" required maxlength="40" value="${esc(st.name)}" placeholder="e.g. My documents due this quarter"></label>
          <div class="radio-stack" role="radiogroup" aria-label="Who can see it"><span class="small muted">Who can see it</span>
            <label class="radio"><input type="radio" name="scope" value="personal" ${st.scope === 'personal' ? 'checked' : ''}><span><b>Only me</b><span>A personal view in your tabs.</span></span></label>
            <label class="radio"><input type="radio" name="scope" value="shared" ${st.scope === 'shared' ? 'checked' : ''}><span><b>Everyone in the organization</b><span>Shows as a tab for all users.</span></span></label></div>`) +
        sec('filters', 'Filters', `<b class="tnum" data-count>${count()}</b> ${esc(noun)} match`, `<div class="rules">${st.filters.length ? st.filters.map(ruleRow).join('') : `<p class="muted small">No conditions — all ${esc(noun)} are shown.</p>`}</div>
          <button class="btn sm" type="button" data-add-rule>${icon('plus')}Add condition</button>`) +
        sec('cols', 'Columns', 'Tick to show · arrows to reorder', `<ul class="col-list">${order.map((k, i) => { const f = Q.field(type, k); return `<li class="${on.has(k) || f.locked ? '' : 'off'}"><label class="checkbox"><input type="checkbox" data-ck="${k}" ${on.has(k) || f.locked ? 'checked' : ''} ${f.locked ? 'disabled' : ''}>${esc(f.label)}${f.locked ? ' <span class="small muted">always shown</span>' : ''}</label>
          <span class="mv"><button class="icon-btn" type="button" data-mv="${k}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(f.label)} up">${icon('chevron-down', 'flip-y')}</button><button class="icon-btn" type="button" data-mv="${k}" data-dir="1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(f.label)} down">${icon('chevron-down')}</button></span></li>`; }).join('')}</ul>`) +
        sec('layout', 'Layout', '', `<div class="ve-grid"><div class="field"><span>Group by</span>${Q.seg('Group by', groups, st.group).replace(/data-seg=/g, 'data-grp=')}</div>
          <div class="field"><span>Default sort</span><div class="sort-pick"><select class="select" name="sortKey" aria-label="Sort by"><option value="">No default sort</option>${sortable.map(f => `<option value="${f.key}" ${st.sort?.key === f.key ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
          <select class="select" name="sortDir" aria-label="Direction" ${st.sort ? '' : 'disabled'}><option value="1" ${st.sort?.dir !== -1 ? 'selected' : ''}>Ascending</option><option value="-1" ${st.sort?.dir === -1 ? 'selected' : ''}>Descending</option></select></div></div></div>`);
      Q.refreshIcons(); Q.enhanceSelects(form);
      if (focusSel) { const el = form.querySelector(focusSel); (el?._combo?.btn || el)?.focus(); }
    };
    const updCount = () => { const c = form.querySelector('[data-count]'); if (c) c.textContent = count(); };
    form.addEventListener('input', e => { if (e.target.name === 'vname') st.name = e.target.value; });
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'scope') st.scope = t.value;
      else if (t.name === 'sortKey') { st.sort = t.value ? { key: t.value, dir: st.sort?.dir || 1 } : null; draw('[name="sortKey"]'); }
      else if (t.name === 'sortDir') { if (st.sort) st.sort.dir = Number(t.value); }
      else if (t.dataset.rf) { const i = +t.dataset.rf, f = Q.field(type, t.value), op = defOp(f); st.filters[i] = { field: f.key, op, value: defVal(f, op) }; draw(`[data-rf="${i}"]`); updCount(); }
      else if (t.dataset.ro) { const i = +t.dataset.ro, f = Q.field(type, st.filters[i].field), was = st.filters[i].op; st.filters[i].op = t.value; if (NO_VALUE.includes(t.value) || NO_VALUE.includes(was) || (was === 'next') !== (t.value === 'next')) st.filters[i].value = defVal(f, t.value); draw(`[data-ro="${i}"]`); updCount(); }
      else if (t.dataset.rv) { const i = +t.dataset.rv; if (t.type === 'checkbox') { const v = st.filters[i].value = Array.isArray(st.filters[i].value) ? st.filters[i].value : []; t.checked ? v.push(t.value) : v.splice(v.indexOf(t.value), 1); } else st.filters[i].value = t.type === 'number' ? Number(t.value) : t.value; updCount(); }
      else if (t.dataset.ck) { t.checked ? on.add(t.dataset.ck) : on.delete(t.dataset.ck); t.closest('li').classList.toggle('off', !t.checked); }
    });
    form.addEventListener('click', e => {
      const x = e.target.closest('[data-rx]'); if (x) { st.filters.splice(+x.dataset.rx, 1); draw('[data-add-rule]'); updCount(); return; }
      if (e.target.closest('[data-add-rule]')) { const f = Q.field(type, 'status') || fields[0]; st.filters.push({ field: f.key, op: defOp(f), value: defVal(f, defOp(f)) }); draw(`[data-rf="${st.filters.length - 1}"]`); return; }
      const g = e.target.closest('[data-grp]'); if (g) { st.group = g.dataset.grp; form.querySelectorAll('[data-grp]').forEach(b => b.setAttribute('aria-pressed', String(b === g))); return; }
      const mv = e.target.closest('[data-mv]'); if (mv) { const k = mv.dataset.mv, i = order.indexOf(k), j = i + Number(mv.dataset.dir); [order[i], order[j]] = [order[j], order[i]]; draw(`[data-mv="${k}"][data-dir="${mv.dataset.dir}"]:not([disabled])`); if (!form.contains(document.activeElement)) form.querySelector(`[data-mv="${k}"]:not([disabled])`)?.focus(); }
    });
    const result = () => {
      const nameEl = form.querySelector('[name="vname"]');
      if (!st.name.trim()) { nameEl.setAttribute('aria-invalid', 'true'); nameEl.style.borderColor = 'var(--danger)'; nameEl.focus(); return null; }
      return { name: st.name.trim(), scope: st.scope, filters: st.filters.filter(r => Q.ruleOk(type, r)), columns: order.filter(k => on.has(k) || Q.field(type, k).locked), group: st.group, sort: st.sort };
    };
    m.querySelector('[data-ok]').addEventListener('click', () => { const r = result(); if (!r) return; Q.closeModal(); onSave(r, false); });
    m.querySelector('[data-saveas]')?.addEventListener('click', () => { const r = result(); if (!r) return; if (view && r.name === view.name) r.name = `${r.name} (copy)`; Q.closeModal(); onSave(r, true); });
    m.querySelector('[data-del]')?.addEventListener('click', () => { Q.closeModal(); onDelete(); });
    draw(view ? null : '[name="vname"]');
    return m;
  };

  /* ---------------- Saved-views page kit ----------------
   * Any register page gets: view tabs in one card, a ⋯ menu per tab, drag to
   * reorder, a summary line that opens Edit view, and the create/duplicate/
   * delete/restore actions. A page registers once:
   *   Q.viewPage(type, { route, noun, groups, legacy(q) → viewId|null })       */
  const PAGES = {};
  Q.viewPage = (type, cfg) => { PAGES[type] = { groups: [['none', 'None'], ['process', 'Process'], ['owner', 'Owner'], ['department', 'Department']], ...cfg }; };
  const pg = type => PAGES[type];
  // Context: the same views can be shown inside a process workspace, filtered to it.
  //   ctx = { route: '#/process/p04/documents', base: rec => bool, hide: ['process'] }
  const CTX = {};
  const ctxOf = type => CTX[type] || null;
  const visible = type => Q.viewList(type).filter(v => !(ctxOf(type)?.hide || []).includes(v.group));
  Q.vwHash = (type, v, extra = {}) => `${ctxOf(type)?.route || pg(type).route}?v=${v.id}${Object.entries(extra).filter(([, x]) => x).map(([k, x]) => `&${k}=${encodeURIComponent(x)}`).join('')}`;
  const uiKey = type => 'view:' + type + (ctxOf(type) ? ':in-process' : '');
  // Returns { v } for a canonical URL, or { v, redirect: hash } for old/partial links.
  Q.vwResolve = (type, q, ctx = null) => {
    CTX[type] = ctx;
    if (!Q.viewList(type).length) Q.viewRestoreDefaults(type);
    const list = visible(type), byId = id => list.find(v => v.id === id);
    if (q.v && byId(q.v)) return { v: byId(q.v) };
    const legacy = pg(type).legacy?.(q) || {};
    const remembered = (/[?&]v=([^&]+)/.exec(Q.UI[uiKey(type)] || '') || [])[1];
    const v = (legacy.id && byId(legacy.id)) || (legacy.group && list.find(x => x.group === legacy.group)) || (legacy.fallback && byId(legacy.fallback)) || byId(remembered) || list[0];
    const keep = { ...(legacy.extra || {}) }; ['p', 'c', 'o', 'd', 'focus'].forEach(k => { if (q[k] && !keep[k]) keep[k] = q[k]; });
    return { v, redirect: Q.vwHash(type, v, keep) };
  };
  Q.vwRemember = type => { Q.UI[uiKey(type)] = location.hash; Q.saveUI(); };
  Q.vwLast = type => Q.UI[uiKey(type)] && Q.UI[uiKey(type)].startsWith(pg(type).route) ? Q.UI[uiKey(type)] : pg(type).route;
  const countOf = (type, v) => { const base = ctxOf(type)?.base; return Q.RECORDS[type]().filter(r => (!base || base(r)) && Q.matcher(type, v.filters)(r)).length; };
  Q.vwWhere = (type, v) => { const base = ctxOf(type)?.base, m = Q.matcher(type, v.filters); return r => (!base || base(r)) && m(r); };
  const groupIcon = { process: 'workflow', clause: 'badge-check', owner: 'user', department: 'building-2' };
  const groupLabel = { process: 'process', clause: 'ISO clause', owner: 'owner', department: 'department' };

  /* Group by a person or a department — works for any register whose records have an owner.
   * Left: the groups that have records in this view. Right: the same table, for the chosen group. */
  const ownerOf = (type, r) => Q.field(type, 'owner').get(r);
  const FIELD_GROUPS = {
    owner: { param: 'o', heading: 'Owners', key: ownerOf, name: k => Q.pname(k), code: k => Q.initials(k),
      sub: k => [Q.person(k).title, Q.person(k).dept].filter(Boolean).join(' · ') },
    department: { param: 'd', heading: 'Departments', key: (type, r) => Q.field(type, 'department')?.get(r) || Q.person(ownerOf(type, r)).dept || 'No department', name: k => k, code: null,
      sub: (k, type, recs) => { const o = [...new Set(recs.map(r => ownerOf(type, r)))]; return `${o.length} owner${o.length === 1 ? '' : 's'}: ${o.map(Q.pname).join(', ')}`; } }
  };
  Q.vwFieldGroup = g => FIELD_GROUPS[g] || null;
  // → { leaf, html }.  flag = { test: rec => bool, title: 'overdue for review' } marks groups that need attention.
  Q.vwGrouped = (type, v, where, q, tableFn, { process = null, flag = null, actions = '' } = {}) => {
    const g = FIELD_GROUPS[v.group], noun = pg(type).noun, count = n => `${n} ${n === 1 ? ({ documents: 'document', KPIs: 'KPI' }[noun] || noun) : noun}`;
    const recs = Q.RECORDS[type]().filter(r => (!process || Q.inProc(r.process, process)) && where(r));
    const keys = [...new Set(recs.map(r => g.key(type, r)))].sort((a, b) => g.name(a).localeCompare(g.name(b)));
    const sel = keys.includes(q[g.param]) ? q[g.param] : keys[0];
    const of = k => recs.filter(r => g.key(type, r) === k), bad = k => flag ? of(k).filter(flag.test).length : 0;
    const summary = `<div class="vc-summary">${Q.vwSummary(type, v)}</div>`; // used by the empty state
    if (!keys.length) return { leaf: null, html: `<div class="vc-body">${summary}<div class="empty panel"><h3>No ${esc(noun)} match this view</h3><p>Change the filters to see ${esc(noun)} grouped by ${groupLabel[v.group]}.</p></div></div>` };
    const side = Q.gSide(g.heading, keys.map(k => ({ href: Q.vwHash(type, v, { [g.param]: k }), on: k === sel, label: g.name(k), n: of(k).length, bad: bad(k) })));
    return { leaf: g.name(sel), side, html: tableFn(Q.vwTableId(type, v, `${v.group}-${String(sel).replace(/[^a-z0-9]+/gi, '_')}${process ? '-in-' + process : ''}`),
      { process, columns: v.columns, where: r => where(r) && g.key(type, r) === sel, initialSort: v.sort, bare: true, title: false, extraTools: Q.vwSummary(type, v) }) };
  };


  /* ---------- Update 25 · grouped tables ----------
   * A grouped view shows its groups as a plain menu beside the view card (Reports style); the card itself looks like
   * an ungrouped view: view tabs, then search + view summary + Edit view + Export, then the table.
   *   Q.gSide(heading, [{ href, on, label, n, bad, child }])   the group menu
   *   Q.vwCard(type, v, body, side)                             the card, with the menu beside it when side is given */
  Q.gSide = (heading, items) => `<nav class="settings-nav kg-side" aria-label="${esc(heading)}">${items.map(i => `<a href="${i.href}"${i.on ? ' aria-current="page"' : ''}${i.child ? ' class="kg-child"' : ''}><span class="nm">${esc(i.label)}</span>${i.bad ? '<i class="kg-dot" title="Needs attention"></i>' : ''}<span class="n">${i.n ?? ''}</span></a>`).join('')}</nav>`;

  Q.vwTabs = (type, active) => {
    const list = visible(type), n = list.length;
    const menu = (v, i) => Q.menu(`Options for view ${v.name}`, [
      { label: 'Edit view…', icon: 'sliders-horizontal', data: { action: 'vw-edit', type, id: v.id } },
      { label: 'Duplicate', icon: 'copy', data: { action: 'vw-dup', type, id: v.id } },
      { label: 'Move left', icon: 'arrow-left', data: { action: 'vw-move', type, id: v.id, dir: '-1' }, disabled: i === 0 },
      { label: 'Move right', icon: 'arrow-right', data: { action: 'vw-move', type, id: v.id, dir: '1' }, disabled: i === n - 1 },
      '-',
      { label: 'Delete view', icon: 'trash-2', cls: 'danger', data: { action: 'vw-delete', type, id: v.id }, disabled: Q.viewList(type).length === 1, title: Q.viewList(type).length === 1 ? 'Keep at least one view' : '' },
      '-',
      { label: 'Restore default views', icon: 'history', data: { action: 'vw-restore', type } }
    ], { icon: 'ellipsis', cls: 'vtab-more', align: 'min-width:220px' });
    return `<div class="vtabs" role="tablist" aria-label="Saved views" data-type="${type}">${list.map((v, i) =>
      `<div class="vtab${v.id === active.id ? ' on' : ''}" draggable="true" data-vid="${v.id}" title="Drag to reorder"><a role="tab" draggable="false" href="${Q.vwHash(type, v)}" aria-selected="${v.id === active.id}" title="${esc(v.name)}${v.scope === 'personal' ? ' (only you)' : ''}">${groupIcon[v.group] ? icon(groupIcon[v.group]) : ''}<span class="vt-name">${esc(v.name)}</span>${v.group === 'none' ? `<span class="n">${countOf(type, v)}</span>` : ''}${v.scope === 'personal' ? icon('lock', 'vt-lock') : ''}</a>${menu(v, i)}</div>`).join('')}
      <button type="button" class="vt-new" data-action="vw-new" data-type="${type}">${icon('plus')}New view</button>${ctxOf(type) ? `<span class="vt-ctx" title="Views are shared with the ${esc(pg(type).noun)} page; here they only show this process">${icon('workflow')}This process only</span>` : ''}</div>`;
  };
  Q.vwSummary = (type, v) => `<button type="button" class="view-summary" data-action="vw-edit" data-type="${type}" data-id="${v.id}" title="Edit view">${v.filters.length ? v.filters.map(r => `<span class="fchip">${esc(Q.describeRule(type, r))}</span>`).join('') : `<span class="muted">All ${esc(pg(type).noun)}</span>`}${v.group !== 'none' ? `<span class="fchip neutral">Grouped by ${groupLabel[v.group] || v.group}</span>` : ''}<span class="vs-edit">${icon('sliders-horizontal')}Edit view</span></button>`;
  Q.vwCard = (type, v, body, side = '') => { const card = `<section class="view-card" aria-label="${esc(pg(type).noun)} — ${esc(v.name)}">${Q.vwTabs(type, v)}${body}</section>`;
    return side ? `<div class="kg-page">${side}<div class="kg-pmain">${card}</div></div>` : card; };
  const dropTables = (type, id) => Object.keys(Q.tables).filter(k => k.startsWith(`${type}-${id}`)).forEach(k => delete Q.tables[k]);
  Q.vwTableId = (type, v, suffix = '') => `${type}-${v.id}${suffix ? '-' + suffix : ''}`;

  // After render: keep the active tab visible, enable drag-to-reorder.
  Q.vwAfter = (type, main) => {
    const bar = main.querySelector('.vtabs'), tab = main.querySelector('.vtab.on');
    if (!bar) return;
    if (tab) bar.scrollLeft = Math.max(0, tab.offsetLeft - bar.clientWidth + tab.offsetWidth + 140);
    let scrollTimer;
    bar.addEventListener('scroll', () => {
      bar.classList.add('is-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => bar.classList.remove('is-scrolling'), 1000);
    }, { passive: true });
    let dragId = null;
    const clear = () => bar.querySelectorAll('.drop-before, .drop-after, .dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'dragging'));
    bar.addEventListener('dragstart', e => { const t = e.target.closest('.vtab'); if (!t) return; dragId = t.dataset.vid; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); Q.closeMenus(); });
    bar.addEventListener('dragover', e => {
      const t = e.target.closest('.vtab'); if (!dragId || !t) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      const r = t.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
      bar.querySelectorAll('.drop-before, .drop-after').forEach(x => x !== t && x.classList.remove('drop-before', 'drop-after'));
      t.classList.toggle('drop-after', after); t.classList.toggle('drop-before', !after);
    });
    bar.addEventListener('dragleave', e => { if (!bar.contains(e.relatedTarget)) bar.querySelectorAll('.drop-before, .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after')); });
    bar.addEventListener('drop', e => {
      const t = e.target.closest('.vtab'); if (!dragId || !t) return; e.preventDefault();
      const list = Q.viewList(type), from = list.findIndex(v => v.id === dragId), moved = list.splice(from, 1)[0]; // full list: hidden views keep their place
      let to = list.findIndex(v => v.id === t.dataset.vid); if (t.classList.contains('drop-after')) to += 1;
      list.splice(Math.max(0, to), 0, moved); dragId = null; clear();
      if (list.indexOf(moved) !== from) { Q.save(); Q.render({ noFocus: true }); }
    });
    bar.addEventListener('dragend', () => { dragId = null; clear(); });
  };

  /* ---------- Actions (data-type says which register) ---------- */
  const A = Q.actions, rerender = () => Q.render({ noFocus: true });
  const curId = type => (/[?&]v=([^&]+)/.exec(location.hash) || [])[1];
  const editor = (type, v, base = null) => Q.openViewEditor(type, { view: v, base, noun: pg(type).noun, groups: pg(type).groups,
    onSave: (def, asNew) => {
      if (!v || asNew) { const nv = Q.viewCreate(type, def); Q.go(Q.vwHash(type, nv)); Q.toast(v ? 'Saved as new view' : 'View created', nv.name); return; }
      Object.assign(v, def); Q.save(); dropTables(type, v.id); rerender(); Q.toast('View saved', v.name);
    },
    onDelete: v ? () => A['vw-delete']({ type, id: v.id }) : null });
  A['vw-edit'] = d => editor(d.type, Q.viewGet(d.type, d.id));
  A['vw-new'] = d => { const first = Q.viewList(d.type)[0]; editor(d.type, null, { columns: [...(first?.columns || [])] }); };
  A['vw-dup'] = d => { const s = Q.viewGet(d.type, d.id); const v = Q.viewCreate(d.type, { name: `${s.name} (copy)`, scope: 'personal', filters: s.filters, columns: s.columns, group: s.group, sort: s.sort }); Q.go(Q.vwHash(d.type, v)); Q.toast('View duplicated', `${v.name} — only you can see it.`); };
  A['vw-move'] = d => { const list = Q.viewList(d.type), vis = visible(d.type), v = Q.viewGet(d.type, d.id), k = vis.indexOf(v), w = vis[k + Number(d.dir)]; if (!w) return; const i = list.indexOf(v), j = list.indexOf(w); [list[i], list[j]] = [list[j], list[i]]; Q.save(); rerender(); document.querySelector(`.vtab[data-vid="${v.id}"] a`)?.focus(); };
  A['vw-delete'] = d => { const type = d.type, v = Q.viewGet(type, d.id); if (!v) return; Q.confirm({ title: `Delete “${v.name}”?`, body: `<p>${v.seed ? 'This is a default view. You can bring it back later with <b>Restore default views</b>.' : v.scope === 'shared' ? 'This view will be removed for everyone in the organization.' : 'This personal view will be removed.'} The ${esc(pg(type).noun)} themselves are not affected.</p>`, confirm: 'Delete View', danger: true, onConfirm: () => {
    const vis = visible(type), k = vis.indexOf(v), list = Q.viewList(type); list.splice(list.indexOf(v), 1); dropTables(type, v.id); Q.save();
    const next = vis.filter(x => x !== v)[Math.max(0, k - 1)] || Q.viewList(type)[0];
    if (curId(type) === v.id) { Q.UI[uiKey(type)] = ''; Q.go(Q.vwHash(type, next)); } else rerender();
    Q.toast('View deleted', v.name); } }); };
  A['vw-restore'] = d => { const type = d.type, names = (window.QMS_DATA.savedViews[type] || []).map(v => v.name).join(', '); Q.confirm({ title: 'Restore default views?', body: `<p>The default views (${esc(names)}) are put back with their original settings. Views you created are kept.</p>`, confirm: 'Restore', onConfirm: () => {
    Q.viewList(type).filter(x => x.seed).forEach(x => dropTables(type, x.id)); Q.viewRestoreDefaults(type);
    const keep = Q.viewGet(type, curId(type)) || visible(type)[0]; Q.go(Q.vwHash(type, keep)); rerender(); Q.toast('Default views restored'); } }); };
})();
