/* iQMS — Settings: organization, process structure, users & access, integrations; setup assistant. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  /* Settings are grouped so the list can grow without becoming one long column.
   * Sections defined in settings-extra.js register themselves in Q.settingsViews. */
  const GROUPS = [
    ['Workspace', [['organization', 'Organization', 'building-2'], ['processes', 'Process Structure', 'network'], ['clause-map', 'Process ↔ ISO Clauses', 'list-checks'], ['workspace', 'Process Workspace', 'layout-dashboard'], ['pages', 'Page Layouts', 'layout-template'], ['regional', 'Regional', 'globe'], ['branding', 'Branding', 'sparkles'], ['ui-library', 'UI Components', 'blocks']]],
    ['People & access', [['users', 'Users & Access', 'users'], ['security', 'Security', 'shield-check'], ['notifications', 'Notifications', 'bell']]],
    ['Connections', [['integrations', 'Integrations', 'plug'], ['api', 'API & Webhooks', 'code']]],
    ['Trust & compliance', [['privacy', 'Data Privacy', 'lock-keyhole'], ['audit-log', 'Audit Log', 'scroll-text'], ['data', 'Data Export & Backup', 'hard-drive']]],
    ['Account', [['billing', 'Billing & Plan', 'currency'], ['about', 'About System', 'info']]]
  ];
  const SECTIONS = GROUPS.flatMap(([, list]) => list);
  Q.settingsViews = Q.settingsViews || {};
  Q.settingsLabel = k => (SECTIONS.find(s => s[0] === k) || [])[1];

  Q.views.settings = (parts, q) => {
    const sec = SECTIONS.find(s => s[0] === parts[0]) ? parts[0] : 'organization';
    const label = Q.settingsLabel(sec);
    const nav = `<nav class="settings-nav" aria-label="Settings">${GROUPS.map(([g, list]) => `<div class="sn-group"><h3>${esc(g)}</h3>${list.map(([k, l, i]) => `<a href="#/settings/${k}" ${k === sec ? 'aria-current="page"' : ''}>${icon(i)}${esc(l)}</a>`).join('')}</div>`).join('')}</nav>
      <label class="settings-jump"><span class="sr-only">Settings section</span><select class="select" data-settings-jump>${GROUPS.map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(([k, l]) => `<option value="${k}"${k === sec ? ' selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
    const fn = { organization, processes, workspace, pages, users, integrations }[sec] || Q.settingsViews[sec];
    const view = fn(q);
    return { title: `${label} · Settings`, nav: 'settings',
      html: Q.pageHead({ title: 'Settings', crumbs: [['Settings', '#/settings'], [label]], sub: `Configuration for ${esc(Q.S.organization.name)}. Changes apply to everyone in the organization.` }) + `<div class="settings-layout">${nav}<div class="settings-main">${view.html}</div></div>`,
      after: main => { main.querySelector('[data-settings-jump]')?.addEventListener('change', e => Q.go('#/settings/' + e.target.value)); view.after?.(main); } };
  };

  /* ---------- Organization ---------- */
  function organization() {
    const o = Q.S.organization;
    return { html: `<section class="panel"><div class="panel-head"><h2>Organization</h2></div><form class="panel-pad" id="orgForm"><div class="form-grid">
      <label class="field"><span>Organization name <span class="req">*</span></span><input class="input" name="name" required value="${esc(o.name)}"></label>
      <label class="field"><span>Industry</span><input class="input" name="industry" value="${esc(o.industry)}"></label>
      <label class="field"><span>Management system standard</span><select class="select" name="standard">${['ISO 9001:2026', 'ISO 9001:2015'].map(x => `<option${x === o.standard ? ' selected' : ''}>${x}</option>`).join('')}</select><span class="help">ISO 9001:2026 is the current edition. Choose 2015 only while your certificate is still in its transition period.</span></label>
      <label class="field"><span>Started from template</span><input class="input" value="${esc(o.template)} (customized)" readonly><span class="help">Templates are a starting point only; the structure is fully editable.</span></label>
      <fieldset class="fieldset full" style="margin:8px 0 0"><legend>Process hierarchy labels</legend><p class="help">What your organization calls each level. Codes such as 01 or 07.1 are display order only.</p>
        <div class="form-grid"><label class="field"><span>Level 1</span><select class="select" name="l1">${['Process', 'Process Area', 'Department', 'Business Unit'].map(x => `<option${x === o.hierarchyLabels[0] ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Level 2</span><select class="select" name="l2">${['Subprocess', 'Process', 'Activity'].map(x => `<option${x === o.hierarchyLabels[1] ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div></fieldset>
      </div><div style="display:flex;gap:8px;margin-top:20px"><button class="btn primary" type="submit">Save Changes</button></div></form></section>
`,
      after: main => main.querySelector('#orgForm').addEventListener('submit', e => {
        e.preventDefault(); const f = e.target; if (!Q.validate(f)) return; const v = Q.formValues(f);
        Object.assign(o, { name: v.name, industry: v.industry, standard: v.standard, hierarchyLabels: [v.l1, v.l2] }); Q.save(); Q.audit?.('Settings', 'updated organization details'); Q.renderSidebar(); Q.toast('Organization saved');
      }) };
  }
  Q.actions['reset-data'] = () => Q.confirm({ title: 'Reset sample data?', body: '<p>All changes made in this browser will be discarded.</p>', confirm: 'Reset', danger: true, onConfirm: () => { Q.resetData(); Q.renderSidebar(); Q.go('#/overview'); Q.toast('Sample data reset'); } });

  /* ---------- Process Structure ---------- */
  let selected = null;
  const PROCESS_ICONS = ['landmark', 'workflow', 'package', 'users', 'shield-alert', 'target', 'network', 'handshake', 'cloud', 'files'];
  function processes(q) {
    const S = Q.S, L = S.organization.hierarchyLabels;
    if (q.select && Q.proc(q.select)) selected = q.select;
    if (!selected || !Q.proc(selected)) selected = Q.topProcesses()[0]?.process_id;
    const p = Q.proc(selected);
    const row = x => `<li class="${x.parent_process_id ? 'child' : ''} ${x.status === 'archived' ? 'archived' : ''}"><button class="tree-row" type="button" data-sel="${x.process_id}" aria-selected="${x.process_id === selected}"><span class="code">${esc(x.process_code)}</span><span class="name">${esc(x.name)}</span><span class="owner">${x.status === 'archived' ? 'Archived' : esc(Q.pname(x.owner))}</span></button></li>`;
    const tree = Q.topProcesses(true).map(t => row(t) + Q.children(t.process_id, true).map(row).join('')).join('');
    const tops = Q.topProcesses().filter(t => t.process_id !== selected);
    const html = `<div class="section-head"><h2>Process Structure</h2><span class="sub">${Q.topProcesses().length} ${esc(L[0].toLowerCase())}es · the sidebar, workspaces and reports are generated from this list</span>
      <div class="actions"><a class="btn" href="#/setup">Set Up with Assistant</a><button class="btn" type="button" data-action="add-process">${icon('plus')}Add ${esc(L[0])}</button></div></div>
      <div class="grid-halves proc-config">
        <section class="panel"><div class="panel-head"><h3>Hierarchy</h3><span class="muted small">${esc(L[0])} → ${esc(L[1])}</span></div><ul class="tree" role="listbox" aria-label="Process hierarchy">${tree}</ul></section>
        ${p ? `<section class="panel"><div class="panel-head"><h3>${esc(p.process_code)} ${esc(p.name)}</h3>${Q.catChip(Q.catOf(p))}<div class="actions">
            <button class="btn sm" type="button" data-move="-1" title="Move up" aria-label="Move up">${icon('arrow-up')}</button><button class="btn sm" type="button" data-move="1" title="Move down" aria-label="Move down">${icon('arrow-down')}</button>
            ${!p.parent_process_id ? `<button class="btn sm" type="button" data-action="add-process" data-parent="${p.process_id}">${icon('plus')}Add ${esc(L[1])}</button>` : ''}
            <button class="btn sm ${p.status === 'archived' ? '' : 'danger'}" type="button" data-archive>${p.status === 'archived' ? 'Restore' : 'Archive'}</button></div></div>
          <form class="panel-pad" id="procForm"><div class="form-grid">
            <label class="field"><span>Display code <span class="req">*</span></span><input class="input tnum" name="code" required value="${esc(p.process_code)}"><span class="help">Ordering label only; hierarchy comes from Parent.</span></label>
            <label class="field"><span>Name <span class="req">*</span></span><input class="input" name="name" required value="${esc(p.name)}"></label>
            <label class="field"><span>Parent</span><select class="select" name="parent"><option value="">None — top-level ${esc(L[0].toLowerCase())}</option>${tops.map(t => `<option value="${t.process_id}"${t.process_id === p.parent_process_id ? ' selected' : ''}>${esc(t.process_code + ' ' + t.name)}</option>`).join('')}</select></label>
            <label class="field"><span>Process owner <span class="req">*</span></span><select class="select" name="owner" required>${Q.peopleOptions(p.owner)}</select></label>
            <label class="field"><span>Category${p.parent_process_id ? '' : ' <span class="req">*</span>'}</span>${p.parent_process_id ? `<span class="input" style="display:flex;align-items:center;gap:8px;background:var(--surface-2)">${Q.catChip(Q.catOf(p))}<span class="small muted">inherited from ${esc(Q.proc(p.parent_process_id).process_code)}</span></span>` : `<select class="select" name="category" required>${Q.categories().map(c => `<option value="${c.id}"${c.id === p.category ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`}<span class="help">${p.parent_process_id ? 'Subprocesses use their parent’s category.' : `Groups the process on QMS → Processes. <a href="#/settings/processes?cats=1">Manage categories</a>`}</span></label>
            <label class="field"><span>Department</span><input class="input" name="department" value="${esc(p.department)}"></label>
            <div class="field full"><span>Process icon</span><div class="swatches icons process-icons" role="radiogroup" aria-label="Process icon">${PROCESS_ICONS.map(x => `<label><input type="radio" name="processIcon" value="${x}" ${(p.icon || 'landmark') === x ? 'checked' : ''} aria-label="${x}"><span>${icon(x)}</span></label>`).join('')}</div><span class="help">Choose an icon for the process card.</span></div>
            <div class="field full"><span>Card colour</span><div class="swatches card-colors" role="radiogroup" aria-label="Card colour"><label title="Auto — colours follow process order"><input type="radio" name="cardColor" value="" ${!p.cardColor ? 'checked' : ''} aria-label="Auto"><span class="cc-auto">Auto</span></label>${Q.CARD_COLORS.map(c => `<label title="${c[1]}"><input type="radio" name="cardColor" value="${c[0]}" ${p.cardColor === c[0] ? 'checked' : ''} aria-label="${c[1]}"><span style="background:linear-gradient(140deg, ${c[2]}, ${c[3]})"></span></label>`).join('')}</div><span class="help">Choose a card colour or use Auto.</span></div>
            <label class="field"><span>ISO 9001 clauses</span><input class="input" name="iso" value="${esc(p.iso.join(', '))}"><span class="help">Comma-separated.</span></label>
            <label class="field full"><span>Purpose</span><textarea class="textarea" name="purpose">${esc(p.purpose)}</textarea></label>
            <details class="full explain"><summary>${icon('chevron-right')}Inputs, outputs and roles</summary><div class="form-grid" style="margin-top:12px">
              <label class="field"><span>Inputs</span><textarea class="textarea" name="inputs">${esc(p.inputs.join('\n'))}</textarea><span class="help">One per line.</span></label>
              <label class="field"><span>Outputs</span><textarea class="textarea" name="outputs">${esc(p.outputs.join('\n'))}</textarea></label>
              <label class="field full"><span>Responsible roles</span><textarea class="textarea" name="roles">${esc(p.roles.join('\n'))}</textarea></label></div></details>
          </div><p class="small muted" id="procStatus" role="status" style="margin-top:12px"></p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" type="submit">Save Changes</button><a class="btn" href="#/process/${p.process_id}">Open Workspace</a></div></form></section>` : '<section class="panel"><div class="empty"><h3>No processes yet</h3><p>Add a process or start from a template.</p></div></section>'}
      </div>
      <section class="panel section" id="cats"><div class="panel-head"><h3>Process categories</h3><span class="muted small">How processes are grouped on QMS → Processes — e.g. Management, Core, Support</span><div class="actions"><button class="btn sm" type="button" data-action="edit-category">${icon('plus')}Add Category</button></div></div>
        <ul class="cat-list">${Q.categories().map((c, i, all) => { const n = Q.topProcesses().filter(x => x.category === c.id).length; return `<li><span class="cat-ic" style="background:${c.color}">${icon(c.icon || 'folder')}</span><div class="ci-main"><b>${esc(c.name)}</b><span>${esc(c.description || '—')} · ${n} process${n === 1 ? '' : 'es'}</span></div>
          <button class="btn sm" type="button" data-cmove="${c.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(c.name)} up">${icon('arrow-up')}</button><button class="btn sm" type="button" data-cmove="${c.id}" data-dir="1" ${i === all.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(c.name)} down">${icon('arrow-down')}</button>
          <button class="btn sm" type="button" data-action="edit-category" data-id="${c.id}">${icon('pencil')}Edit</button><button class="btn sm danger" type="button" data-action="delete-category" data-id="${c.id}" aria-label="Delete ${esc(c.name)}" title="${all.length === 1 ? 'Keep at least one category' : `Delete ${esc(c.name)}`}" ${all.length === 1 ? 'disabled' : ''}>${icon('trash-2')}</button></li>`; }).join('')}</ul></section>`;
    const after = main => {
      if (q.cats) setTimeout(() => main.querySelector('#cats')?.scrollIntoView({ block: 'start' }), 0);
      main.querySelectorAll('[data-cmove]').forEach(b => b.addEventListener('click', () => { const list = Q.S.processCategories, i = list.findIndex(c => c.id === b.dataset.cmove), j = i + Number(b.dataset.dir); [list[i], list[j]] = [list[j], list[i]]; Q.save(); Q.render({ noFocus: true }); }));
      main.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.sel; Q.render({ noFocus: true }); main.querySelector(`[data-sel="${selected}"]`)?.focus(); }));
      main.querySelector('.tree')?.addEventListener('keydown', e => {
        if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; e.preventDefault();
        const rows = [...main.querySelectorAll('[data-sel]')]; const i = rows.indexOf(document.activeElement);
        rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
      });
      const form = main.querySelector('#procForm'); if (!form) return;
      form.addEventListener('submit', e => {
        e.preventDefault(); if (!Q.validate(form)) return; const v = Q.formValues(form);
        if (Q.S.processes.some(x => x.process_code === v.code && x.process_id !== p.process_id)) { main.querySelector('#procStatus').textContent = `Code ${v.code} is already used. Choose a unique display code.`; main.querySelector('#procStatus').style.color = 'var(--danger)'; return; }
        if (v.parent && Q.children(p.process_id, true).length) { main.querySelector('#procStatus').textContent = 'A process with subprocesses cannot be moved under another process. Move its subprocesses first.'; main.querySelector('#procStatus').style.color = 'var(--danger)'; return; }
        const lines = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
        if (v.category) p.category = v.category;
        Object.assign(p, { process_code: v.code, name: v.name, parent_process_id: v.parent || null, owner: v.owner, department: v.department, icon: v.processIcon || p.icon || 'landmark', cardColor: v.cardColor || undefined, purpose: v.purpose, iso: v.iso.split(',').map(x => x.trim()).filter(Boolean), inputs: lines(v.inputs), outputs: lines(v.outputs), roles: lines(v.roles) });
        Q.save(); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Process saved', `${v.code} ${v.name}`);
      });
      main.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => {
        const sibs = Q.S.processes.filter(x => x.parent_process_id === p.parent_process_id).sort(Q.byOrder);
        const i = sibs.indexOf(p), j = i + Number(b.dataset.move); if (j < 0 || j >= sibs.length) return;
        [sibs[i].display_order, sibs[j].display_order] = [sibs[j].display_order, sibs[i].display_order];
        if (sibs[i].display_order === sibs[j].display_order) sibs[i].display_order += Number(b.dataset.move);
        Q.save(); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Order changed', 'Display codes are unchanged — renumber them if needed.');
      }));
      main.querySelector('[data-archive]')?.addEventListener('click', () => {
        if (p.status === 'archived') { p.status = 'active'; Q.save(); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Process restored'); return; }
        const docs = Q.S.documents.filter(d => Q.inProc(d.process, p.process_id)).length;
        Q.confirm({ title: `Archive ${p.name}?`, danger: true, confirm: 'Archive',
          body: `<p>The process is hidden from navigation and new records can't be added. Its ${docs} documents and all records are kept and remain searchable. You can restore it later.</p>`,
          onConfirm: () => { p.status = 'archived'; Q.S.processes.filter(c => c.parent_process_id === p.process_id).forEach(c => { c.status = 'archived'; }); Q.save(); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Process archived'); } });
      });
    };
    return { html, after };
  }
  Q.actions['add-process'] = d => {
    const L = Q.S.organization.hierarchyLabels, parent = d.parent ? Q.proc(d.parent) : null;
    const sibs = Q.S.processes.filter(x => x.parent_process_id === (parent?.process_id || null));
    const order = Math.max(0, ...sibs.map(x => x.display_order)) + 1;
    const code = parent ? `${parent.process_code}.${order}` : String(order).padStart(2, '0');
    const m = Q.openModal({ size: 'm', title: parent ? `Add ${L[1]} to ${esc(parent.name)}` : `Add ${L[0]}`,
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field"><span>Display code <span class="req">*</span></span><input class="input tnum" name="code" required value="${esc(code)}"></label>
        <label class="field"><span>Name <span class="req">*</span></span><input class="input" name="name" required autofocus></label>
        <label class="field"><span>Process owner <span class="req">*</span></span><select class="select" name="owner" required>${Q.peopleOptions(parent?.owner || Q.me())}</select></label>
        ${parent ? '' : `<label class="field"><span>Category <span class="req">*</span></span><select class="select" name="category" required>${Q.categories().map(c => `<option value="${c.id}"${c.id === d.category ? ' selected' : ''}>${esc(c.name)} — ${esc(c.description)}</option>`).join('')}</select></label>`}
        <label class="field"><span>Department</span><input class="input" name="department" value="${esc(parent?.department || '')}"></label>
        <div class="field full"><span>Process icon</span><div class="swatches icons process-icons" role="radiogroup" aria-label="Process icon">${PROCESS_ICONS.map((x, i) => `<label><input type="radio" name="processIcon" value="${x}" ${i === 0 ? 'checked' : ''} aria-label="${x}"><span>${icon(x)}</span></label>`).join('')}</div><span class="help">Choose an icon for the process card.</span></div>
        <div class="field full"><span>Card colour</span><div class="swatches card-colors" role="radiogroup" aria-label="Card colour"><label title="Auto — colours follow process order"><input type="radio" name="cardColor" value="" checked aria-label="Auto"><span class="cc-auto">Auto</span></label>${Q.CARD_COLORS.map(c => `<label title="${c[1]}"><input type="radio" name="cardColor" value="${c[0]}" aria-label="${c[1]}"><span style="background:linear-gradient(140deg, ${c[2]}, ${c[3]})"></span></label>`).join('')}</div><span class="help">Choose a card colour or use Auto.</span></div>
        <label class="field full"><span>Purpose</span><textarea class="textarea" name="purpose" placeholder="What this process achieves"></textarea></label></div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      if (Q.S.processes.some(x => x.process_code === v.code)) { Q.toast('Code already used', 'Choose a unique display code.'); return; }
      const id = Q.uid('p');
      Q.S.processes.push({ process_id: id, organization_id: Q.S.organization.organization_id, parent_process_id: parent?.process_id || null, display_order: order, process_code: v.code, name: v.name, owner: v.owner, department: v.department, icon: v.processIcon || 'landmark', ...(v.cardColor ? { cardColor: v.cardColor } : {}), iso: [], purpose: v.purpose || '', inputs: [], outputs: [], roles: [], elements: [], status: 'active', category: parent ? parent.category : v.category });
      selected = id; Q.save(); Q.closeAllModals(); Q.renderSidebar(); Q.go('#/settings/processes'); Q.render({ noFocus: true }); Q.toast(`${L[parent ? 1 : 0]} added`, `${v.code} ${v.name} now appears in navigation.`);
    });
  };

  /* ---------- Process Workspace (tabs every process shows) ---------- */
  /* Page layouts: which pre-made components each QMS page shows, and where. Edited on the page itself. */
  function pages() {
    const rows = Object.values(Q.PAGES).filter(p => !p.fixed).map(p => { const L = Q.pageLayout(p.id), n = Object.values(L.zones).reduce((a, z) => a + z.length, 0), custom = Q.pageCustomized(p.id);
      return `<li><span class="ic">${icon('layout-template')}</span><div class="i-main"><b>${esc(p.title)}</b><span>${n} component${n === 1 ? '' : 's'} · ${{ '2-1': 'wide + side columns', '1-1': 'two equal columns', '1': 'one column' }[L.layout]}</span></div>${Q.st(custom ? 'Customized' : 'Default layout', custom ? 'info' : 'neutral')}
        <button class="btn sm" type="button" data-pl-reset="${p.id}" ${custom ? '' : 'disabled'}>Restore default</button><button class="btn sm primary" type="button" data-pl-edit="${p.id}">${icon('pencil')}Customize</button></li>`; }).join('');
    const html = `<div class="section-head"><h2>Page Layouts</h2><span class="sub">Overview is built from pre-made components. QMS pages use fixed tabs (Update 20). Choose what a page shows, where it appears, and each component's safe width and height; the layout applies to everyone in the organization.</span></div>
      <section class="panel"><ul class="integration-list page-layout-list">${rows}</ul></section>
      <p class="small muted" style="margin-top:12px">${Object.keys(Q.COMPONENTS).length} components are available. You can also start from Overview with <b>Customize page</b>.</p>`;
    const after = main => {
      main.querySelectorAll('[data-pl-edit]').forEach(b => b.addEventListener('click', () => Q.pageCustomize(b.dataset.plEdit)));
      main.querySelectorAll('[data-pl-reset]').forEach(b => b.addEventListener('click', () => Q.actions['pb-reset']({ page: b.dataset.plReset })));
    };
    return { html, after };
  }

  function workspace() {
    const cfg = Q.wsConfig();
    let draft = JSON.parse(JSON.stringify(cfg));
    const row = (t, i) => `<li data-k="${t.key}"><span class="ws-move"><button class="icon-btn" type="button" data-wmove="${i}" data-dir="-1" ${i <= 1 ? 'disabled' : ''} aria-label="Move ${esc(t.label)} up">${icon('arrow-up')}</button><button class="icon-btn" type="button" data-wmove="${i}" data-dir="1" ${i === 0 || i === draft.tabs.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(t.label)} down">${icon('arrow-down')}</button></span>
      <label class="checkbox"><input type="checkbox" data-wvis="${i}" ${t.visible || t.key === 'overview' ? 'checked' : ''} ${t.key === 'overview' ? 'disabled' : ''}><span class="sr-only">Show ${esc(t.label)}</span></label>
      <input class="input" data-wlabel="${i}" value="${esc(t.label)}" maxlength="30" aria-label="Tab name for ${esc(Q.WS_TABS[t.key])}">
      <span class="small muted">${t.key === 'overview' ? 'Always shown first' : `Default: ${esc(Q.WS_TABS[t.key])}`}</span></li>`;
    const html = `<div class="section-head"><h2>Process Workspace</h2><span class="sub">Every process uses the same workspace. Choose which tabs it shows, their names and order.</span></div>
      <section class="panel"><div class="panel-head"><h3>Tabs</h3><span class="muted small">Applies to all ${Q.topProcesses().length} processes and their subprocesses</span><div class="actions"><button class="btn sm ghost" type="button" data-wreset>Restore defaults</button></div></div>
        <div class="panel-pad"><div class="ws-preview" aria-hidden="true"></div><ul class="ws-list"></ul>
        <fieldset class="fieldset" style="margin:20px 0 0"><legend style="font-size:14px">When a process has nothing in a tab</legend>
          <div class="radio-stack" style="margin-top:6px"><label class="radio"><input type="radio" name="emptyTabs" value="mute"><span><b>Show it greyed out with “—”</b><span>Keeps the same tabs on every process; users can still add the first record.</span></span></label>
          <label class="radio"><input type="radio" name="emptyTabs" value="hide"><span><b>Hide it</b><span>Only tabs with records appear. Overview always shows.</span></span></label></div></fieldset>
        <div style="display:flex;gap:8px;margin-top:20px"><button class="btn primary" type="button" data-wsave>Save Changes</button><a class="btn" href="#/process/${Q.topProcesses()[0]?.process_id}">Preview on a process</a></div></div></section>`;
    const after = main => {
      const list = main.querySelector('.ws-list'), prev = main.querySelector('.ws-preview');
      const draw = focusSel => {
        list.innerHTML = draft.tabs.map(row).join('');
        prev.innerHTML = draft.tabs.filter(t => t.visible || t.key === 'overview').map((t, i) => `<span class="${i === 0 ? 'on' : ''}">${esc(t.label || Q.WS_TABS[t.key])}</span>`).join('');
        main.querySelectorAll('[name="emptyTabs"]').forEach(r => { r.checked = r.value === draft.emptyTabs; });
        Q.refreshIcons(); if (focusSel) main.querySelector(focusSel)?.focus();
      };
      list.addEventListener('click', e => { const b = e.target.closest('[data-wmove]'); if (!b) return; const i = +b.dataset.wmove, j = i + Number(b.dataset.dir); [draft.tabs[i], draft.tabs[j]] = [draft.tabs[j], draft.tabs[i]]; draw(`[data-wmove="${j}"][data-dir="${b.dataset.dir}"]:not([disabled])`); });
      list.addEventListener('change', e => { if (e.target.dataset.wvis) { draft.tabs[+e.target.dataset.wvis].visible = e.target.checked; draw(); } });
      list.addEventListener('input', e => { if (e.target.dataset.wlabel) { draft.tabs[+e.target.dataset.wlabel].label = e.target.value; prev.innerHTML = draft.tabs.filter(t => t.visible || t.key === 'overview').map((t, i) => `<span class="${i === 0 ? 'on' : ''}">${esc(t.label || Q.WS_TABS[t.key])}</span>`).join(''); } });
      main.querySelectorAll('[name="emptyTabs"]').forEach(r => r.addEventListener('change', () => { draft.emptyTabs = r.value; }));
      main.querySelector('[data-wreset]').addEventListener('click', () => { draft = JSON.parse(JSON.stringify(window.QMS_DATA.workspace)); draw(); Q.toast('Defaults restored', 'Save to apply.'); });
      main.querySelector('[data-wsave]').addEventListener('click', () => {
        draft.tabs.forEach(t => { t.label = (t.label || '').trim() || Q.WS_TABS[t.key]; if (t.key === 'overview') t.visible = true; });
        Q.S.workspace = JSON.parse(JSON.stringify(draft)); Q.save(); draw(); Q.toast('Process workspace saved', `${draft.tabs.filter(t => t.visible).length} tabs · empty tabs ${draft.emptyTabs === 'hide' ? 'hidden' : 'greyed out'}`);
      });
      draw();
    };
    return { html, after };
  }

  /* ---------- Process categories ---------- */
  Q.actions['edit-category'] = d => {
    const c = d.id ? Q.S.processCategories.find(x => x.id === d.id) : null;
    const color = c?.color || Q.CAT_COLORS.find(x => !Q.S.processCategories.some(y => y.color === x)) || Q.CAT_COLORS[0], ic = c?.icon || 'folder';
    const m = Q.openModal({ size: 'm', title: c ? `Edit category “${esc(c.name)}”` : 'Add category', sub: 'Categories group processes on QMS → Processes and in the process register.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field"><span>Name <span class="req">*</span></span><input class="input" name="name" required maxlength="30" value="${esc(c?.name || '')}" placeholder="e.g. Customer-facing" autofocus></label>
        <label class="field full"><span>Description</span><input class="input" name="description" maxlength="90" value="${esc(c?.description || '')}" placeholder="What processes in this category do"></label>
        <div class="field full"><span>Colour</span><div class="swatches" role="radiogroup" aria-label="Colour">${Q.CAT_COLORS.map(x => `<label><input type="radio" name="color" value="${x}" ${x === color ? 'checked' : ''} aria-label="${x}"><span style="background:${x}"></span></label>`).join('')}</div></div>
        <div class="field full"><span>Icon</span><div class="swatches icons" role="radiogroup" aria-label="Icon">${[...new Set(['folder', ...Q.CAT_ICONS])].map(x => `<label><input type="radio" name="icon" value="${x}" ${x === ic ? 'checked' : ''} aria-label="${x}"><span>${icon(x)}</span></label>`).join('')}</div></div>
      </div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${c ? 'Save Category' : 'Add Category'}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      if (Q.S.processCategories.some(x => x !== c && x.name.toLowerCase() === v.name.trim().toLowerCase())) { Q.toast('Name already used', 'Choose a different category name.'); return; }
      if (c) Object.assign(c, { name: v.name.trim(), description: v.description.trim(), color: v.color, icon: v.icon });
      else Q.S.processCategories.push({ id: 'cat-' + Date.now().toString(36), name: v.name.trim(), description: v.description.trim(), color: v.color, icon: v.icon });
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast(c ? 'Category saved' : 'Category added', v.name.trim());
    });
  };
  Q.actions['delete-category'] = d => {
    const c = Q.S.processCategories.find(x => x.id === d.id), used = Q.S.processes.filter(p => !p.parent_process_id && p.category === c.id), others = Q.S.processCategories.filter(x => x !== c);
    const m = Q.openModal({ size: 's', title: `Delete “${esc(c.name)}”?`,
      body: `<form class="modal-body">${used.length ? `<p>${used.length} process${used.length === 1 ? ' uses' : 'es use'} this category. Move ${used.length === 1 ? 'it' : 'them'} to:</p><label class="field" style="margin-top:10px"><span class="sr-only">Move processes to</span><select class="select" name="to">${others.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>` : '<p>No processes use this category.</p>'}</form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn danger-solid" type="button" data-ok>Delete Category</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const to = m.querySelector('[name="to"]')?.value; used.forEach(p => { p.category = to; });
      Q.S.processCategories.splice(Q.S.processCategories.indexOf(c), 1); Q.save(); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Category deleted', used.length ? `${used.length} moved to ${Q.S.processCategories.find(x => x.id === to).name}` : c.name);
    });
  };

  /* ---------- Users & Access ---------- */
  const LEVELS = [['none', 'No access'], ['view', 'View'], ['contribute', 'Contribute'], ['manage', 'Manage']];
  const PERMS = [['Documents', [['view', 'View'], ['create', 'Create'], ['edit', 'Edit']]], ['Workflow', [['review', 'Review'], ['approve', 'Approve'], ['publish', 'Publish']]], ['Administration', [['manageProcess', 'Manage process'], ['manageUsers', 'Manage users']]]];
  const accessSummary = u => {
    const v = Object.values(u.access); const n = l => v.filter(x => x === l).length;
    const same = LEVELS.find(([k]) => n(k) === v.length);
    if (same) return same[0] === 'none' ? '<span class="muted">No process access</span>' : `All processes · ${same[1]}`;
    const detail = Object.entries(u.access).filter(([, l]) => l !== 'none').map(([p, l]) => `${Q.proc(p)?.name}: ${l}`).join('\n');
    return `<span title="${esc(detail)}">${[['manage', 'Manage'], ['contribute', 'Contribute'], ['view', 'View']].filter(([k]) => n(k)).map(([k, l]) => `${l} ${n(k)}`).join(' · ')}</span>`;
  };
  function users() {
    const rows = () => Q.S.users.map(u => ({ ...u, p: Q.person(u.id) }));
    const html = `<div class="section-head"><h2>Users &amp; Access</h2><span class="sub">Access is granted per process and inherited by that process’s documents.</span><div class="actions"><button class="btn primary" type="button" data-action="add-user">${icon('user-plus')}Add User</button></div></div>` +
      Q.table({ id: 'users', rows, noun: 'users', caption: 'Users', search: u => `${u.p.name} ${u.p.email} ${u.role} ${u.p.dept}`,
        tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search name, email or role" aria-label="Search users"></div>
          <select class="select" data-filter="role" aria-label="Role"><option value="all">All roles</option>${Object.keys(Q.S.roles).map(r => `<option>${r}</option>`).join('')}</select>
          <select class="select" data-filter="status" aria-label="Status"><option value="all">All statuses</option><option>Active</option><option>Invited</option><option>Deactivated</option></select>`,
        filters: { role: (u, v) => u.role === v, status: (u, v) => u.status === v },
        columns: [
          { key: 'name', label: 'Name', sort: u => u.p.name, render: u => `<span class="user-cell"><span class="avatar sm">${esc(Q.initials(u.id))}</span><span><span class="title">${esc(u.p.name)}</span><span class="sub">${esc(u.p.email)}</span></span></span>` },
          { key: 'role', label: 'Role', sort: u => u.role, render: u => `<span class="nowrap">${esc(u.role)}</span><span class="sub">${esc(u.p.dept)}</span>` },
          { key: 'access', label: 'Process access', render: u => `<span class="small nowrap">${accessSummary(u)}</span>` },
          { key: 'status', label: 'Status', sort: u => u.status, render: u => Q.st(u.status, { Active: 'success', Invited: 'info', Deactivated: 'muted' }[u.status]) },
          { key: 'last', label: 'Last active', cls: 'c-date', sort: u => u.lastActive || '', render: u => u.lastActive ? Q.fmt(u.lastActive) : '<span class="muted">Never</span>' },
          { key: 'act', label: 'Actions', cls: 'c-actions', render: u => `<button class="btn sm" type="button" data-action="edit-access" data-id="${u.id}">Edit Access</button>${Q.menu(`More actions for ${u.p.name}`, [
            u.status === 'Deactivated' ? { label: 'Reactivate', icon: 'user-check', data: { action: 'user-status', id: u.id, to: 'Active' } } : { label: 'Deactivate', icon: 'ban', data: { action: 'user-status', id: u.id, to: 'Deactivated' }, disabled: u.id === Q.me(), title: u.id === Q.me() ? 'You cannot deactivate yourself' : '' },
            { label: 'Delete', icon: 'trash-2', cls: 'danger', data: { action: 'delete-user', id: u.id }, disabled: u.id === Q.me() }])}` }
        ] });
    return { html };
  }
  const accessModal = (u, isNew = false) => {
    const p = isNew ? { name: '', email: '', dept: '' } : Q.person(u.id);
    const role = u.role;
    const m = Q.openModal({ size: 'l', title: isNew ? 'Add User' : `Edit Access — ${esc(p.name)}`, sub: isNew ? 'The user receives an invitation email.' : `${esc(p.email)} · ${esc(p.dept)}`,
      body: `<form class="modal-body" id="accForm">
        ${isNew ? `<fieldset class="fieldset"><legend>Person</legend><div class="form-grid"><label class="field"><span>Full name <span class="req">*</span></span><input class="input" name="name" required autofocus></label><label class="field"><span>Work email <span class="req">*</span></span><input class="input" type="email" name="email" required></label><label class="field"><span>Job title</span><input class="input" name="title"></label><label class="field"><span>Department</span><input class="input" name="dept"></label><label class="field"><span>Reports to</span><select class="select" name="reportsTo"><option value="">Choose later</option>${Q.S.users.filter(x => x.status !== 'Deactivated').map(x => `<option value="${x.id}">${esc(Q.pname(x.id))} — ${esc(Q.person(x.id).title)}</option>`).join('')}</select><span class="help">Places them on the organization chart.</span></label></div></fieldset>` : ''}
        <fieldset class="fieldset"><legend>Role</legend><p class="help">Sets default permissions. Adjusting permissions below switches the role to Custom.</p>
          <div class="role-options">${Object.entries(Q.S.roles).map(([r, def]) => `<label class="role-opt"><input type="radio" name="role" value="${esc(r)}" ${r === role ? 'checked' : ''}><span><b>${esc(r)}</b><span>${esc(def.desc)}</span></span></label>`).join('')}</div></fieldset>
        <fieldset class="fieldset"><legend>Process access</legend><p class="help">Documents, risks, KPIs and evidence inherit access from their process. Individual documents can override this later.</p>
          <div class="access-head"><span class="small muted">${Q.topProcesses().length} processes</span><span class="right">Set all to ${LEVELS.map(([k, l]) => `<button class="btn sm ghost" type="button" data-all="${k}">${l}</button>`).join('')}</span></div>
          <div class="access-grid">${Q.topProcesses().map(t => `<div class="access-row"><span><b class="tnum" style="color:var(--text-3);margin-right:8px">${esc(t.process_code)}</b>${esc(t.name)}</span><div class="seg" role="radiogroup" aria-label="Access to ${esc(t.name)}">${LEVELS.map(([k, l]) => `<button type="button" role="radio" data-proc="${t.process_id}" data-level="${k}" aria-pressed="${(u.access[t.process_id] || 'none') === k}" aria-checked="${(u.access[t.process_id] || 'none') === k}">${l}</button>`).join('')}</div></div>`).join('')}</div></fieldset>
        <fieldset class="fieldset" style="margin-bottom:0"><legend>Permissions</legend><p class="help">What the user can do inside processes they can access.</p>
          <div class="perm-groups">${PERMS.map(([g, list]) => `<div class="perm-group"><h4>${g}</h4>${list.map(([k, l]) => `<label><input type="checkbox" class="row-check" name="perm" value="${k}">${l}</label>`).join('')}</div>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">Separation of duties: approving a revision does not grant publishing, and administrators do not approve documents by default.</p></fieldset>
      </form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${isNew ? 'Send Invitation' : 'Save Access'}</button>` });
    const access = { ...u.access };
    const setPerms = r => m.querySelectorAll('[name="perm"]').forEach(c => { c.checked = (Q.S.roles[r]?.perms || []).includes(c.value); });
    setPerms(role);
    m.querySelectorAll('[name="role"]').forEach(r => r.addEventListener('change', () => { if (r.value !== 'Custom') setPerms(r.value); }));
    m.querySelectorAll('[name="perm"]').forEach(c => c.addEventListener('change', () => { m.querySelector('[name="role"][value="Custom"]').checked = true; }));
    const paint = () => m.querySelectorAll('[data-proc]').forEach(b => { const on = access[b.dataset.proc] === b.dataset.level || (!access[b.dataset.proc] && b.dataset.level === 'none'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-checked', String(on)); });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-proc]'); if (b) { access[b.dataset.proc] = b.dataset.level; paint(); }
      const a = e.target.closest('[data-all]'); if (a) { Q.topProcesses().forEach(t => { access[t.process_id] = a.dataset.all; }); paint(); }
    });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      if (isNew) {
        const id = Q.uid('u').toLowerCase();
        Q.S.people[id] = { name: v.name, title: v.title || '—', dept: v.dept || '—', email: v.email, reportsTo: v.reportsTo || null };
        if (v.reportsTo) Q.S.context.orgChartChanged = Q.today();
        Q.S.users.push({ id, role: v.role, status: 'Invited', lastActive: null, access });
        Q.toast('Invitation sent', `${v.name} · ${v.email}`);
      } else { u.role = v.role; u.access = access; Q.toast('Access saved', `${p.name} · ${v.role}`); }
      Q.save(); Q.closeAllModals(); Q.render({ noFocus: true });
    });
  };
  Q.actions['edit-access'] = d => accessModal(Q.S.users.find(u => u.id === d.id));
  Q.actions['add-user'] = () => accessModal({ role: 'Viewer', access: Object.fromEntries(Q.topProcesses().map(p => [p.process_id, 'view'])) }, true);
  Q.actions['user-status'] = d => {
    const u = Q.S.users.find(x => x.id === d.id), name = Q.pname(u.id);
    if (d.to === 'Active') { u.status = 'Active'; Q.save(); Q.render({ noFocus: true }); Q.toast('User reactivated', name); return; }
    Q.confirm({ title: `Deactivate ${esc(name)}?`, confirm: 'Deactivate', danger: true, body: `<p>${esc(name)} can no longer sign in. Their documents, approvals and history are kept. Open workflow steps assigned to them must be reassigned.</p>`,
      onConfirm: () => { u.status = 'Deactivated'; Q.save(); Q.render({ noFocus: true }); Q.toast('User deactivated', name); } });
  };
  Q.actions['delete-user'] = d => {
    const name = Q.pname(d.id);
    Q.confirm({ title: `Delete ${esc(name)}?`, confirm: 'Delete User', danger: true, body: `<p>This removes the user account. Records they authored, reviewed or approved stay in the audit history under their name. Consider <b>Deactivate</b> instead if they may return.</p>`,
      onConfirm: () => { Q.S.users = Q.S.users.filter(u => u.id !== d.id); Q.save(); Q.render({ noFocus: true }); Q.toast('User deleted', name); } });
  };

  /* ---------- Sources & Integrations ---------- */
  function integrations() {
    const list = Q.S.integrations, m = list.find(i => i.id === 'm365');
    const st = s => Q.st(s, { Connected: 'success', Enabled: 'success', Planned: 'neutral', 'Not configured': 'muted', Disconnected: 'warning' }[s]);
    const html = `<div class="section-head"><h2>Sources &amp; Integrations</h2><span class="sub">Where documents and evidence live. Public and Internal documents are uploaded to iQMS; Confidential documents stay in SharePoint and are registered by link and description.</span></div>
      <div class="grid-halves integ-layout">
        <section class="panel"><div class="panel-head"><h3>Sources</h3></div><ul class="integration-list">${list.map(i => `<li><span class="ic">${icon(i.icon)}</span><div class="i-main"><b>${esc(i.name)}</b><span>${esc(i.kind)}</span></div>${st(i.status)}</li>`).join('')}</ul>
          <div class="panel-pad small muted" style="border-top:1px solid var(--border)">CRM, ERP and HRIS can already be referenced manually as evidence sources. Live connections are planned.</div></section>
        <section class="panel"><div class="panel-head"><h3>Microsoft 365</h3><div class="actions">${st(m.status)}</div></div>
          <div class="panel-pad"><dl class="dl-list dl-wide">
            <dt>Connection status</dt><dd>${m.status === 'Connected' ? `<span class="src-ok">${icon('circle-check')}Connected</span>` : 'Not connected'}</dd>
            <dt>Tenant</dt><dd>${esc(m.tenant || '—')}</dd>
            <dt>SharePoint site</dt><dd>${esc(m.site || '—')}</dd>
            <dt>Document library</dt><dd>${esc(m.library || '—')}</dd>
            <dt>Allowed scope</dt><dd>${esc(m.scope || '—')}</dd>
            <dt>Last connection test</dt><dd>${esc(m.lastTest || '—')}</dd>
            <dt>Link-only documents</dt><dd>${m.status === 'Connected' ? Q.S.documents.filter(d => d.source.system === 'SharePoint').length : 0}</dd></dl>
            <div class="callout" style="margin-top:16px">${icon('lock')}<span class="small">Least-privilege access: iQMS only checks that a link points to the selected site and library. It does not open, copy or read Confidential files — those are assessed from the description their owner provides. Your administrator grants and can revoke this in Microsoft 365. Credentials are never shown or stored here.</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
              ${m.status === 'Connected' ? `<button class="btn primary" type="button" data-m365="test">Test Connection</button><button class="btn" type="button" data-m365="location">Change Location</button><button class="btn danger" type="button" data-m365="disconnect">Disconnect</button>` : `<button class="btn primary" type="button" data-m365="connect">Connect</button>`}
            </div></div></section></div>`;
    const after = main => main.querySelectorAll('[data-m365]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.m365;
      if (k === 'test') { m.lastTest = `${Q.today()} ${new Date().toTimeString().slice(0, 5)}`; Q.save(); Q.render({ noFocus: true }); Q.toast('Connection OK', `Helios QMS / Restricted Documents reachable · ${Q.S.documents.filter(d => d.source.state !== 'connected').length} link needs attention.`); }
      if (k === 'location') Q.toast('Change location', 'An administrator would pick another site/library in Microsoft 365 here.');
      if (k === 'connect') { Object.assign(m, { status: 'Connected', tenant: 'heliossolar.onmicrosoft.com', site: 'Helios QMS', library: 'Restricted Documents', scope: 'Selected site only (Helios QMS) — validate links; file content is not read', lastTest: Q.today() }); Q.save(); Q.render({ noFocus: true }); Q.toast('Microsoft 365 connected'); }
      if (k === 'disconnect') Q.confirm({ title: 'Disconnect Microsoft 365?', danger: true, confirm: 'Disconnect', body: '<p>Document metadata, revisions and workflow history stay in iQMS. Link validation stops until you reconnect. Files in SharePoint are not affected.</p>', onConfirm: () => { m.status = 'Disconnected'; Q.save(); Q.render({ noFocus: true }); Q.toast('Microsoft 365 disconnected'); } });
    }));
    return { html, after };
  }

  /* ---------- Process & QMS setup assistant (AI proposes, people confirm) ---------- */
  const STEPS = ['Company information', 'Industry & business model', 'Departments & major activities', 'Existing documentation', 'Systems & evidence sources', 'Proposed process structure', 'Document mapping', 'Potential gaps', 'Review & edit', 'Create workspace'];
  let step = 5;
  Q.views.setup = () => {
    const body = {
      0: `<div class="form-grid"><label class="field"><span>Company name</span><input class="input" value="${esc(Q.S.organization.name)}"></label><label class="field"><span>Employees</span><select class="select"><option>50–250</option></select></label><label class="field full"><span>What does the company do?</span><textarea class="textarea">Designs, supplies and installs residential and commercial solar PV and battery systems, with commissioning, handover and after-sales service.</textarea></label></div>`,
      1: `<div class="form-grid"><label class="field"><span>Industry</span><select class="select"><option>Solar installation</option>${Q.S.templates.slice(1).map(t => `<option>${t}</option>`).join('')}</select></label><label class="field"><span>Business model</span><select class="select"><option>Project-based (design & install)</option><option>Manufacturing</option><option>Services</option></select></label></div>`,
      2: `<p class="muted" style="margin-bottom:12px">List departments and what each one does. The assistant uses this to propose processes.</p><div class="form-grid">${['Sales', 'Engineering', 'Procurement', 'Operations', 'Customer Service', 'People'].map(x => `<label class="field"><span>${x}</span><input class="input" value="${x === 'Operations' ? 'Site surveys, warehouse, installation, commissioning' : ''}"></label>`).join('')}</div>`,
      3: `<p>Connected library: <b>Helios QMS / Controlled Documents</b> — 64 files found.</p>`,
      4: `<ul class="integration-list">${Q.S.integrations.map(i => `<li><span class="ic">${icon(i.icon)}</span><div class="i-main"><b>${esc(i.name)}</b><span>${esc(i.kind)}</span></div><label class="checkbox"><input type="checkbox" ${i.status !== 'Not configured' ? 'checked' : ''}>In use</label></li>`).join('')}</ul>`,
      5: `<p class="muted" style="margin-bottom:12px">Suggested from your answers and the <b>Solar Installation Company</b> template. Rename, remove or add processes — nothing is created until step 10.</p>
        <ul class="proposal panel">${Q.topProcesses().map(p => `<li><input type="checkbox" class="row-check" checked aria-label="Include ${esc(p.name)}"><span class="tnum muted">${esc(p.process_code)}</span><input class="input" value="${esc(p.name)}" aria-label="Process name"><select class="select" aria-label="Owner">${Q.peopleOptions(p.owner)}</select><span class="small muted">${p.elements.length} elements</span></li>`).join('')}</ul>
        <button class="btn" type="button" style="margin-top:12px" data-action="toast" data-title="Add process" data-msg="A blank row would be added.">${icon('plus')}Add Process</button>`,
      6: `<p class="muted" style="margin-bottom:12px">Suggested placement of existing files. Confirm or change each one.</p>` + `<div class="table-wrap"><table class="dt"><thead><tr><th>File</th><th>Suggested process</th><th>Type</th><th>Confidence</th><th></th></tr></thead><tbody>${Q.S.documents.slice(12, 20).map((d, i) => `<tr><td>${esc(d.source.file)}</td><td><select class="select">${Q.processOptions(d.process, { all: '' })}</select></td><td>${esc(d.type)}</td><td>${i % 3 === 2 ? Q.st('Needs review', 'warning') : Q.st('High', 'success')}</td><td class="c-actions"><label class="checkbox"><input type="checkbox" checked>Accept</label></td></tr>`).join('')}</tbody></table></div>`,
      7: `<ul class="worklist panel">${Q.S.iso.filter(r => ['Missing', 'At Risk'].includes(r.status)).map(r => `<li><span class="w-kind">${icon('triangle-alert')}</span><div class="w-main"><div class="w-title">${esc(r.clause)} ${esc(r.title)}</div><div class="w-meta">${esc(r.note)}</div></div>${Q.st(r.status, Q.ISO_KIND[r.status])}</li>`).join('')}</ul>`,
      8: `<p>Review the structure, owners and document placement before creating the workspace. Everything remains editable afterwards in Settings → Process Structure.</p>`,
      9: `<div class="callout">${icon('info')}<span>Creating the workspace replaces the current process structure. In this mock the current structure is kept.</span></div>`
    }[step];
    return { title: 'Setup Assistant', nav: 'settings', html: Q.pageHead({ crumbs: [['Settings', '#/settings'], ['Process Structure', '#/settings/processes'], ['Setup assistant']], title: 'Process & QMS setup assistant', sub: 'The assistant proposes a process structure, document mapping and gaps from your answers. You review and confirm every step.' }) +
      `<div class="settings-layout setup-layout"><ol class="steps panel" aria-label="Setup steps">${STEPS.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'current' : ''}" ${i === step ? 'aria-current="step"' : ''}><span class="n">${i < step ? icon('check') : i + 1}</span>${esc(s)}</li>`).join('')}</ol>
      <section class="panel"><div class="panel-head"><h2>Step ${step + 1} · ${esc(STEPS[step])}</h2>${[5, 6, 7].includes(step) ? '<span class="tag">Suggested — review required</span>' : ''}</div><div class="panel-pad">${body}</div>
      <div class="modal-foot"><button class="btn" type="button" data-step="-1" ${step === 0 ? 'disabled' : ''}>Back</button>${step === 9 ? '<button class="btn primary" type="button" data-action="toast" data-title="Workspace not recreated" data-msg="In this mock the existing structure is kept.">Create Workspace</button>' : '<button class="btn primary" type="button" data-step="1">Continue</button>'}</div></section></div>`,
      after: main => main.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { step = Math.max(0, Math.min(9, step + Number(b.dataset.step))); Q.render({ noFocus: true }); })) };
  };
})();
