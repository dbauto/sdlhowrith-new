/* iQMS v3 — page layouts: a page is a set of pre-made components placed in areas.
 *
 *   LAYOUT  = { layout: '2-1' | '5-7' | '1-1' | '1', zones: { top: [], main: [], side: [], bottom: [] } }
 *   BLOCK   = { id, type, title?, opts?, size?: { w, h } } — one placed component
 *   COMPONENT (Q.component) = { name, desc, icon, group, pages?, settings?, render(block, ctx), after? }
 *
 * Every page ships with a default layout (Q.page). An organization can change it with
 * "Customize page": add, remove, reorder, move between areas, rename and configure
 * components. The saved layout lives in Q.S.pageLayouts[pageId]; "Restore default layout"
 * removes it. Components are pre-made — users arrange them, they do not build new ones. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const clone = v => JSON.parse(JSON.stringify(v));
  const ZONES = ['top', 'main', 'side', 'bottom'];
  const ZONE_LABEL = { top: 'Full width · top', main: 'Main column', side: 'Side column', bottom: 'Full width · bottom' };
  const LAYOUTS = [['2-1', 'Wide + side'], ['5-7', 'Narrow + wide'], ['1-1', 'Two equal'], ['1', 'One column']];
  const GRIP = '<svg class="pb-grip-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="3.5" r="1.3"/><circle cx="10.5" cy="3.5" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12.5" r="1.3"/><circle cx="10.5" cy="12.5" r="1.3"/></svg>';

  Q.COMPONENTS = {};
  Q.component = (type, def) => { Q.COMPONENTS[type] = { type, group: 'General', ...def }; };
  Q.PAGES = {};
  Q.page = (id, def) => { Q.PAGES[id] = { id, ...def }; };
  const normalize = L => { const out = { layout: L.layout || '2-1', zones: {} }; ZONES.forEach(z => { out.zones[z] = (L.zones?.[z] || []).map(b => ({ ...b })); }); return out; };
  Q.pageLayout = id => normalize(Q.S.pageLayouts?.[id] || Q.PAGES[id].layout);
  Q.pageCustomized = id => !!Q.S.pageLayouts?.[id];

  /* Shared panel shell so every component looks the same. */
  Q.panel = ({ title, tag = '', count = null, actions = '', body = '', pad = false }) =>
    `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2>${tag ? `<span class="clause small muted">${esc(tag)}</span>` : ''}${count != null ? `<span class="muted small">${esc(count)}</span>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}</div>${pad ? `<div class="panel-pad">${body}</div>` : body}</section>`;

  /* ---------------- Edit state (one page at a time, not saved until "Save layout") ---------------- */
  let EDIT = null; // { page, draft, dirty }
  const all = L => ZONES.flatMap(z => L.zones[z]);
  const find = (L, id) => { for (const z of ZONES) { const i = L.zones[z].findIndex(b => b.id === id); if (i >= 0) return { z, i, b: L.zones[z][i] }; } return null; };
  const newId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const titleOf = b => b.title || Q.COMPONENTS[b.type]?.name || 'Component';
  const sizeOf = (b, c = Q.COMPONENTS[b.type]) => {
    const minW = Math.max(3, Math.min(12, Number(c?.minWidth) || 3));
    const w = Math.max(minW, Math.min(12, Number(b.size?.w) || 12));
    const minH = Math.max(180, Number(c?.minHeight) || 220);
    const rawH = Number(b.size?.h) || 0;
    return { w, h: rawH ? Math.max(minH, rawH) : 0, minW, minH };
  };
  const rerender = () => Q.render({ noFocus: true });
  const touch = () => { EDIT.dirty = true; rerender(); };

  /* ---------------- Rendering ---------------- */
  const blockHtml = (b, zone, editing, pageId) => {
    const c = Q.COMPONENTS[b.type];
    const size = sizeOf(b, c), sizeStyle = `--pb-span:${size.w};${size.h ? `--pb-height:${size.h}px;` : ''}`;
    const sizeClass = size.h ? ' pb-fixed' : '';
    const ctx = { page: pageId, zone, editing, title: def => b.title || def, q: Q.route().q };
    const html = c ? c.render(b, ctx) : '';
    if (!editing) return html ? `<div class="pb-block${sizeClass}" style="${sizeStyle}" data-b="${esc(b.id)}">${html}</div>` : '';
    const L = EDIT.draft, at = find(L, b.id), list = L.zones[zone];
    const moveTo = ZONES.filter(z => z !== zone).map(z => ({ label: ZONE_LABEL[z], icon: z === 'side' ? 'panel-right' : z === 'main' ? 'square' : 'maximize-2', data: { action: 'pb-move', b: b.id, zone: z } }));
    return `<div class="pb-block editing${sizeClass}" style="${sizeStyle}" data-b="${esc(b.id)}" draggable="true">
      <div class="pb-frame-head"><span class="pb-grip" title="Drag to move">${GRIP}</span><b>${esc(titleOf(b))}</b>${c && b.title ? `<span class="pb-type">${esc(c.name)}</span>` : ''}<span class="pb-size">${Math.round(size.w / 12 * 100)}% · ${size.h ? `${size.h}px` : 'Auto height'}</span>
        <span class="pb-tools"><button type="button" class="icon-btn" data-action="pb-up" data-b="${esc(b.id)}" ${at.i === 0 ? 'disabled' : ''} aria-label="Move ${esc(titleOf(b))} up">${icon('arrow-up')}</button><button type="button" class="icon-btn" data-action="pb-down" data-b="${esc(b.id)}" ${at.i === list.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(titleOf(b))} down">${icon('arrow-down')}</button>${Q.menu(`Move ${titleOf(b)} to another area`, [{ note: 'Move to' }, ...moveTo], { icon: 'move', cls: 'icon-btn', align: 'min-width:210px;right:0;left:auto' })}<button type="button" class="icon-btn" data-action="pb-settings" data-b="${esc(b.id)}" aria-label="Settings for ${esc(titleOf(b))}">${icon('settings')}</button><button type="button" class="icon-btn danger" data-action="pb-remove" data-b="${esc(b.id)}" aria-label="Remove ${esc(titleOf(b))}">${icon('x')}</button></span></div>
      <div class="pb-content" inert>${html || `<div class="pb-ghost">${icon(c ? 'eye-off' : 'triangle-alert')}<span>${c ? esc(c.hiddenNote || 'Nothing to show right now. This component appears when it has content.') : 'This component is no longer available.'}</span></div>`}</div>
      <button class="pb-resize pb-resize-x" type="button" data-resize="x" draggable="false" aria-label="Resize ${esc(titleOf(b))} width" title="Drag to resize width. Arrow keys also work."></button>
      <button class="pb-resize pb-resize-y" type="button" data-resize="y" draggable="false" aria-label="Resize ${esc(titleOf(b))} height" title="Drag to resize height. Arrow keys also work."></button>
      <button class="pb-resize pb-resize-xy" type="button" data-resize="xy" draggable="false" aria-label="Resize ${esc(titleOf(b))} width and height" title="Drag to resize width and height. Arrow keys also work."></button></div>`;
  };
  Q.pageBody = pageId => {
    const editing = EDIT?.page === pageId, L = editing ? EDIT.draft : Q.pageLayout(pageId);
    const zone = z => {
      const inner = L.zones[z].map(b => blockHtml(b, z, editing, pageId)).join('');
      if (!editing) return inner ? `<div class="pb-zone pb-${z}">${inner}</div>` : '';
      return `<div class="pb-zone pb-${z}${L.zones[z].length ? '' : ' empty'}" data-zone="${z}"><div class="pb-zone-label">${ZONE_LABEL[z]}<button type="button" class="link-btn" data-action="pb-add" data-zone="${z}">${icon('plus')}Add here</button></div>${inner}${L.zones[z].length ? '' : '<div class="pb-drop-hint">Drop a component here</div>'}</div>`;
    };
    return `<div class="pb pb-l-${esc(L.layout)}${editing ? ' pb-editing' : ''}" data-pb-page="${esc(pageId)}">${zone('top')}<div class="pb-cols">${zone('main')}${zone('side')}</div>${zone('bottom')}</div>`;
  };
  const editBar = pageId => {
    const L = EDIT.draft;
    return `<div class="pb-bar" role="region" aria-label="Customize page"><div class="pb-bar-l">${icon('layout-template')}<div><b>Customizing “${esc(Q.PAGES[pageId].title)}”</b><span>Drag components to reorder. Drag an edge or corner handle to resize. Changes apply after Save layout.</span></div></div>
      <div class="pb-bar-r"><div class="pb-bar-field"><span class="small muted">Columns</span>${Q.seg('Columns', LAYOUTS, L.layout).replace(/data-seg=/g, 'data-action="pb-layout" data-layout=')}</div>
        <button class="btn" type="button" data-action="pb-add">${icon('plus')}Add component</button>
        ${Q.menu('More layout options', [{ label: 'Restore default layout', icon: 'history', data: { action: 'pb-reset', page: pageId } }], { icon: 'ellipsis', cls: 'btn', align: 'min-width:220px;right:0;left:auto' })}
        <button class="btn" type="button" data-action="pb-cancel">Cancel</button><button class="btn primary" type="button" data-action="pb-save">${icon('check')}Save layout</button></div></div>`;
  };
  /* A page built from its layout. `actions` are the page's own header buttons. */
  Q.pageView = (pageId, { title, sub = '', crumbs = null, actions = '', nav, intro = '', customize = true }) => {
    if (EDIT && EDIT.page !== pageId) EDIT = null; // leaving a page discards an unsaved draft
    const editing = EDIT?.page === pageId;
    const L = editing ? EDIT.draft : Q.pageLayout(pageId);
    const custom = `<button class="btn" type="button" data-action="pb-customize" data-page="${esc(pageId)}" title="Choose which components this page shows and where">${icon('layout-template')}Customize page</button>`;
    return { title, nav,
      html: Q.pageHead({ crumbs, title, sub, actions: editing ? '' : actions + (customize ? custom : '') }) + (editing ? editBar(pageId) : intro) + Q.pageBody(pageId),
      after: main => {
        all(L).forEach(b => Q.COMPONENTS[b.type]?.after?.(main, b));
        if (editing) { wireDrag(main); wireResize(main); }
        if (EDIT?.flash) { const el = main.querySelector(`[data-b="${EDIT.flash}"]`); EDIT.flash = null; if (el) { el.classList.add('pb-new'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
      } };
  };

  /* One pre-made component outside a layout — used by tabbed pages, which show one topic per tab.
   * Returns { html, after(main) } so the component keeps its tables, edits and exports. */
  Q.renderComp = (type, { page = '', zone = 'main', id = `t-${type}`, opts } = {}) => {
    const c = Q.COMPONENTS[type], b = { id, type, ...(opts ? { opts } : {}) };
    if (!c) return { html: '', after: () => {} };
    return { html: c.render(b, { page, zone, editing: false, title: d => d, q: Q.route().q }) || '', after: main => c.after?.(main, b) };
  };

  /* ---------------- Drag and drop (the arrow and "move to" buttons do the same by keyboard) ---------------- */
  function wireDrag(main) {
    const root = main.querySelector('.pb-editing'); if (!root) return;
    let dragId = null;
    const clear = () => root.querySelectorAll('.drop-before, .drop-after, .drop-into, .dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-into', 'dragging'));
    root.addEventListener('dragstart', e => { if (e.target.closest('.pb-resize')) { e.preventDefault(); return; } const blk = e.target.closest('.pb-block'); if (!blk) return; dragId = blk.dataset.b; blk.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); Q.closeMenus(); });
    root.addEventListener('dragover', e => {
      if (!dragId) return;
      const blk = e.target.closest('.pb-block'), zone = e.target.closest('.pb-zone'); if (!zone) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      root.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
      if (blk && blk.dataset.b !== dragId) { const r = blk.getBoundingClientRect(); blk.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before'); }
      else if (!blk) zone.classList.add('drop-into');
    });
    root.addEventListener('drop', e => {
      if (!dragId) return;
      const blk = e.target.closest('.pb-block'), zone = e.target.closest('.pb-zone'); if (!zone) return;
      e.preventDefault();
      const L = EDIT.draft, from = find(L, dragId); if (!from) return;
      if (blk && blk.dataset.b === dragId) { dragId = null; clear(); return; }
      const after = blk?.classList.contains('drop-after');
      L.zones[from.z].splice(from.i, 1);
      const list = L.zones[zone.dataset.zone];
      const to = blk ? list.findIndex(b => b.id === blk.dataset.b) + (after ? 1 : 0) : list.length;
      list.splice(Math.max(0, to), 0, from.b); dragId = null; EDIT.flash = from.b.id; touch();
    });
    root.addEventListener('dragend', () => { dragId = null; clear(); });
  }

  /* Direct resize handles: preview immediately, save only with the page-level Save layout button. */
  function wireResize(main) {
    const root = main.querySelector('.pb-editing'); if (!root) return;
    const sync = (blk, b, mode, w, h) => {
      const c = Q.COMPONENTS[b.type], safe = sizeOf({ ...b, size: { w, h } }, c);
      b.size = { w: safe.w, h: safe.h };
      blk.style.setProperty('--pb-span', safe.w);
      if (safe.h) { blk.style.setProperty('--pb-height', `${safe.h}px`); blk.classList.add('pb-fixed'); }
      else { blk.style.removeProperty('--pb-height'); blk.classList.remove('pb-fixed'); }
      const label = blk.querySelector('.pb-size'); if (label) label.textContent = `${Math.round(safe.w / 12 * 100)}% · ${safe.h ? `${safe.h}px` : 'Auto height'}`;
      const handle = blk.querySelector(`[data-resize="${mode}"]`); if (handle) handle.setAttribute('aria-valuetext', label?.textContent || '');
      EDIT.dirty = true;
      return safe;
    };
    root.addEventListener('contextmenu', e => { if (e.target.closest('.pb-resize')) e.preventDefault(); });
    root.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.pb-resize'); if (!handle || (e.button !== 0 && e.button !== 2)) return;
      const blk = handle.closest('.pb-block'), at = find(EDIT.draft, blk.dataset.b); if (!at) return;
      e.preventDefault(); e.stopPropagation(); Q.closeMenus();
      const mode = handle.dataset.resize, zone = blk.closest('.pb-zone'), start = sizeOf(at.b), rect = blk.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY, startW = start.w, startH = start.h || Math.round(rect.height);
      const minW = start.minW, minH = start.minH, zoneWidth = zone.getBoundingClientRect().width;
      blk.classList.add('resizing'); blk.draggable = false; handle.setPointerCapture?.(e.pointerId);
      const move = ev => {
        const w = mode.includes('x') ? Math.max(minW, Math.min(12, Math.round(startW + (ev.clientX - startX) / zoneWidth * 12))) : startW;
        const h = mode.includes('y') ? Math.max(minH, Math.min(1200, Math.round((startH + ev.clientY - startY) / 10) * 10)) : start.h;
        sync(blk, at.b, mode, w, h); ev.preventDefault();
      };
      const done = ev => { if (Number.isFinite(ev.clientX) && Number.isFinite(ev.clientY)) move(ev); blk.classList.remove('resizing'); blk.draggable = true; handle.releasePointerCapture?.(e.pointerId); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', done); window.removeEventListener('pointercancel', done); };
      window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', done); window.addEventListener('pointercancel', done);
    });
    root.addEventListener('keydown', e => {
      const handle = e.target.closest('.pb-resize'); if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const blk = handle.closest('.pb-block'), at = find(EDIT.draft, blk.dataset.b); if (!at) return;
      const mode = handle.dataset.resize, cur = sizeOf(at.b), rect = blk.getBoundingClientRect();
      let w = cur.w, h = cur.h || Math.round(rect.height);
      if (mode.includes('x') && e.key === 'ArrowLeft') w--;
      if (mode.includes('x') && e.key === 'ArrowRight') w++;
      if (mode.includes('y') && e.key === 'ArrowUp') h -= 20;
      if (mode.includes('y') && e.key === 'ArrowDown') h += 20;
      sync(blk, at.b, mode, w, mode.includes('y') ? h : cur.h); e.preventDefault();
    });
  }

  /* ---------------- Actions ---------------- */
  const A = Q.actions;
  A['pb-customize'] = d => { EDIT = { page: d.page, draft: Q.pageLayout(d.page), dirty: false }; rerender(); window.scrollTo({ top: 0 }); };
  // From Settings: open a page straight in customize mode.
  Q.pageCustomize = id => { EDIT = { page: id, draft: Q.pageLayout(id), dirty: false }; Q.go(Q.PAGES[id].route); };
  A['pb-cancel'] = () => {
    const done = () => { EDIT = null; rerender(); };
    if (!EDIT?.dirty) return done();
    Q.confirm({ title: 'Discard layout changes?', body: '<p>The page goes back to the layout it had before you started customizing.</p>', confirm: 'Discard Changes', danger: true, onConfirm: done });
  };
  A['pb-save'] = () => {
    const page = EDIT.page, n = all(EDIT.draft).length;
    Q.S.pageLayouts = Q.S.pageLayouts || {}; Q.S.pageLayouts[page] = clone(EDIT.draft); Q.save();
    EDIT = null; rerender(); Q.toast('Layout saved', `${Q.PAGES[page].title} · ${n} component${n === 1 ? '' : 's'}. Everyone in the organization sees this layout.`);
  };
  A['pb-reset'] = d => Q.confirm({ title: 'Restore the default layout?', body: `<p>“${esc(Q.PAGES[d.page].title)}” goes back to the components and arrangement it shipped with. ${EDIT ? 'Nothing is saved until you choose <b>Save layout</b>.' : 'The data shown on the page is not affected.'}</p>`, confirm: 'Restore Default',
    onConfirm: () => {
      if (EDIT?.page === d.page) { EDIT.draft = normalize(Q.PAGES[d.page].layout); touch(); Q.toast('Default layout restored', 'Save layout to apply.'); return; }
      if (Q.S.pageLayouts) { delete Q.S.pageLayouts[d.page]; Q.save(); } rerender(); Q.toast('Default layout restored', Q.PAGES[d.page].title);
    } });
  A['pb-layout'] = d => { EDIT.draft.layout = d.layout; touch(); };
  A['pb-up'] = d => { const at = find(EDIT.draft, d.b), l = EDIT.draft.zones[at.z]; if (at.i === 0) return; [l[at.i - 1], l[at.i]] = [l[at.i], l[at.i - 1]]; touch(); document.querySelector(`[data-b="${d.b}"] [data-action="pb-up"]:not([disabled]), [data-b="${d.b}"] [data-action="pb-down"]`)?.focus(); };
  A['pb-down'] = d => { const at = find(EDIT.draft, d.b), l = EDIT.draft.zones[at.z]; if (at.i === l.length - 1) return; [l[at.i + 1], l[at.i]] = [l[at.i], l[at.i + 1]]; touch(); document.querySelector(`[data-b="${d.b}"] [data-action="pb-down"]:not([disabled]), [data-b="${d.b}"] [data-action="pb-up"]`)?.focus(); };
  A['pb-move'] = d => { const at = find(EDIT.draft, d.b); EDIT.draft.zones[at.z].splice(at.i, 1); EDIT.draft.zones[d.zone].push(at.b); EDIT.flash = d.b; touch(); };
  A['pb-remove'] = d => { const at = find(EDIT.draft, d.b), name = titleOf(at.b); EDIT.draft.zones[at.z].splice(at.i, 1); touch(); Q.toast('Component removed', `${name} — add it back any time from Add component.`); };

  /* Component library: every pre-made component, grouped; shows which are already on the page. */
  A['pb-add'] = d => {
    const page = EDIT.page, used = type => all(EDIT.draft).filter(b => b.type === type).length;
    const avail = Object.values(Q.COMPONENTS).filter(c => !c.pages || c.pages.includes(page));
    const groups = [...new Set(avail.map(c => c.group))];
    let zone = d.zone || 'main';
    const m = Q.openModal({ size: 'drawer', title: 'Add a component', sub: `Pre-made components for “${esc(Q.PAGES[page].title)}”. Pick one, then drag it where you want it.`,
      body: `<div class="modal-body pb-lib"><div class="field"><span>Add to</span>${Q.seg('Area', ZONES.map(z => [z, ZONE_LABEL[z].replace(' · ', ' ')]), zone).replace(/data-seg=/g, 'data-zone-pick=')}</div>
        ${groups.map(g => `<section><h3>${esc(g)}</h3><ul class="pb-lib-list">${avail.filter(c => c.group === g).map(c => { const n = used(c.type), off = n && !c.multiple; return `<li class="${off ? 'used' : ''}"><span class="pb-lib-ic">${icon(c.icon || 'component')}</span><div class="pb-lib-main"><b>${esc(c.name)}</b><span>${esc(c.desc || '')}</span>${n ? `<span class="pb-lib-on">${icon('check')}On this page${n > 1 ? ` × ${n}` : ''}</span>` : ''}</div><button class="btn sm" type="button" data-add="${esc(c.type)}" ${off ? 'disabled title="Already on this page"' : ''}>${icon('plus')}Add</button></li>`; }).join('')}</ul></section>`).join('')}</div>`,
      foot: `<span class="left">${avail.length} components available</span><button class="btn" type="button" data-close>Done</button>` });
    m.addEventListener('click', e => {
      const z = e.target.closest('[data-zone-pick]'); if (z) { zone = z.dataset.zonePick; m.querySelectorAll('[data-zone-pick]').forEach(b => b.setAttribute('aria-pressed', String(b === z))); return; }
      const add = e.target.closest('[data-add]'); if (!add) return;
      const c = Q.COMPONENTS[add.dataset.add], b = { id: newId(), type: c.type, ...(c.defaults ? { opts: clone(c.defaults) } : {}) };
      EDIT.draft.zones[zone].push(b); EDIT.flash = b.id; Q.closeModal(); touch(); Q.toast('Component added', `${c.name} → ${ZONE_LABEL[zone].replace(' · ', ' ')}`);
      if (c.settings?.some(s => s.required)) A['pb-settings']({ b: b.id });
    });
  };

  /* Component settings: naming and component-specific options. Size is adjusted directly on the page. */
  A['pb-settings'] = d => {
    const at = find(EDIT.draft, d.b), b = at.b, c = Q.COMPONENTS[b.type], opts = b.opts || {};
    const field = s => {
      const v = opts[s.key] ?? s.default ?? '';
      if (s.type === 'select') return `<label class="field"><span>${esc(s.label)}</span><select class="select" name="o_${s.key}">${(typeof s.options === 'function' ? s.options(opts) : s.options).map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${s.help ? `<span class="help">${esc(s.help)}</span>` : ''}</label>`;
      if (s.type === 'textarea') return `<label class="field"><span>${esc(s.label)}</span><textarea class="textarea" name="o_${s.key}" rows="5" placeholder="${esc(s.placeholder || '')}">${esc(v)}</textarea>${s.help ? `<span class="help">${esc(s.help)}</span>` : ''}</label>`;
      return `<label class="field"><span>${esc(s.label)}</span><input class="input" name="o_${s.key}" value="${esc(v)}"></label>`;
    };
    const m = Q.openModal({ size: 'm', title: 'Component settings', sub: esc(c.name),
      body: `<form class="modal-body"><div style="display:flex;flex-direction:column;gap:16px">
        <label class="field"><span>Title</span><input class="input" name="title" maxlength="60" value="${esc(b.title || '')}" placeholder="${esc(c.name)}"><span class="help">Leave empty to use the standard title.</span></label>
        ${(c.settings || []).map(field).join('')}
        <div class="callout small">${icon('info')}<span>Resize directly on the page using the right, bottom, or corner handle. ${esc(c.desc || '')}</span></div></div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Apply</button>` });
    const form = m.querySelector('form');
    // Dependent options (e.g. the saved views of the chosen register) refresh when their parent changes.
    form.addEventListener('change', e => {
      const dep = (c.settings || []).filter(s => s.dependsOn && 'o_' + s.dependsOn === e.target.name);
      dep.forEach(s => { const sel = form.querySelector(`[name="o_${s.key}"]`), cur = { ...opts, [s.dependsOn]: e.target.value }; sel.innerHTML = s.options(cur).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join(''); sel._combo?.sync(); });
    });
    const ok = () => {
      const v = Q.formValues(form);
      b.title = v.title.trim() || undefined; if (!b.title) delete b.title;
      (c.settings || []).forEach(s => { b.opts = b.opts || {}; b.opts[s.key] = v['o_' + s.key]; });
      Q.closeModal(); touch();
    };
    m.querySelector('[data-ok]').addEventListener('click', ok); form.addEventListener('submit', e => { e.preventDefault(); ok(); });
  };

  /* ======================= General components (usable on any page) ======================= */
  Q.component('iso-readiness', { name: 'ISO 9001 readiness', icon: 'badge-check', desc: 'Readiness score and requirement status for the whole QMS.',
    render: (b, ctx) => {
      // If a user customized the Overview page before this redesign, their saved layout
      // may still contain the generic iso-readiness component. Render the new Overview
      // card there too so saved layouts receive the same upgraded design.
      if (ctx.page === 'overview' && Q.overviewParts?.readiness) return Q.overviewParts.readiness;
      return Q.panel({ title: ctx.title('ISO 9001 readiness'), count: Q.standard(), actions: '<a class="btn sm" href="#/evidence?view=clause">Open by clause</a>', pad: true, body: Q.readinessBlock(Q.S.iso, { compact: ctx.zone === 'side' }) });
    } });

  Q.component('key-figures', { name: 'Key figures', icon: 'gauge', desc: 'Four numbers that need attention: overdue documents, KPIs below target, high risks and overdue actions.',
    render: (b, ctx) => {
      const S = Q.S, od = S.documents.filter(Q.docOverdue).length, below = S.kpis.filter(k => !Q.kpiOk(k)).length;
      const high = S.risks.filter(r => r.kind === 'Risk' && Q.riskOpen(r) && Q.riskLevel(r) === 'High').length;
      const acts = S.actions.filter(a => a.status !== 'Closed' && a.due && a.due < Q.today()).length;
      const tile = (n, label, href, cls) => `<a class="kf-tile" href="${href}"><span class="kf-n tnum ${n ? cls : 'zero'}">${n}</span><span class="kf-l">${label}</span></a>`;
      return `<section class="panel kf" aria-label="${esc(ctx.title('Key figures'))}">${tile(od, 'Documents overdue for review', '#/documents?status=overdue', 'bad')}${tile(below, 'KPIs below target', '#/qms/objectives?status=below', 'warn')}${tile(high, 'High risks', '#/risks?level=High', 'bad')}${tile(acts, 'Corrective actions overdue', '#/capa', 'bad')}</section>`;
    } });

  Q.component('upcoming-reviews', { name: 'Upcoming document reviews', icon: 'calendar-clock', desc: 'Controlled documents whose periodic review is due in the next 60 days.',
    hiddenNote: 'No reviews are due in the next 60 days.',
    render: (b, ctx) => {
      const t = Q.today(), list = Q.S.documents.filter(d => d.nextReview && d.nextReview >= t && Q.days(t, d.nextReview) <= 60).sort((x, y) => x.nextReview < y.nextReview ? -1 : 1);
      return Q.panel({ title: ctx.title('Upcoming document reviews'), count: 'next 60 days', actions: '<a class="btn sm ghost" href="#/documents?status=overdue">View overdue</a>',
        body: list.length ? `<ul class="worklist">${list.map(d => `<li><div class="w-main"><div class="w-title">${esc(d.title)}</div><div class="w-meta tnum">${esc(d.id)} · Rev ${esc(d.rev)} · ${esc(Q.pname(d.owner))}</div></div><span class="date-soon nowrap">${Q.fmt(d.nextReview)}</span><button class="btn sm" type="button" data-action="open-doc" data-id="${esc(d.id)}">Open</button></li>`).join('')}</ul>` : '<div class="empty">No reviews due in the next 60 days.</div>' });
    } });

  Q.component('mgmt-actions', { name: 'Management actions', icon: 'list-checks', desc: 'Open actions from management review, soonest first.',
    render: (b, ctx) => {
      const list = Q.S.managementActions.filter(a => a.status !== 'Closed').sort((x, y) => x.due < y.due ? -1 : 1);
      return Q.panel({ title: ctx.title('Management actions'), count: `${list.length} open`, actions: '<a class="btn sm ghost" href="#/mgmt-review/actions">Management Review</a>',
        body: list.length ? `<ul class="worklist">${list.map(a => `<li><div class="w-main"><div class="w-title">${esc(a.title)}</div><div class="w-meta">${esc(a.id)} · ${esc(Q.pname(a.owner))} · ${esc(Q.plabel(a.process))}</div></div><span class="nowrap">${Q.dueDate(a.due)}</span></li>`).join('')}</ul>` : '<div class="empty">No open management actions.</div>' });
    } });

  /* A saved view from any register, embedded as a live table. */
  const REG = { documents: ['Documents', '#/documents', () => Q.docTable], kpis: ['Objectives & KPIs', '#/qms/objectives', () => Q.kpiTable], risks: ['Risks & Opportunities', '#/risks', () => Q.riskTable] };
  Q.component('register-view', { name: 'Register view', icon: 'table', multiple: true, defaults: { register: 'documents', view: 'v-overdue', rows: '5' },
    desc: 'A saved view from Documents, KPIs or Risks, shown as a live table. Add it more than once for different views.',
    settings: [
      { key: 'register', label: 'Register', type: 'select', options: Object.entries(REG).map(([k, v]) => [k, v[0]]) },
      { key: 'view', label: 'Saved view', type: 'select', dependsOn: 'register', options: o => Q.viewList(o.register || 'documents').filter(v => v.group === 'none').map(v => [v.id, v.name]), help: 'Filters and columns come from the view. Change them in the register.' },
      { key: 'rows', label: 'Rows per page', type: 'select', options: [['5', '5'], ['10', '10'], ['20', '20']] }
    ],
    render: (b, ctx) => {
      const o = { register: 'documents', rows: '5', ...(b.opts || {}) }, [label, route, fn] = REG[o.register] || REG.documents;
      const list = Q.viewList(o.register).filter(v => v.group === 'none'), v = list.find(x => x.id === o.view) || list[0];
      if (!v) return '';
      const cols = ctx.zone === 'side' ? v.columns.slice(0, 3) : v.columns;
      return Q.panel({ title: ctx.title(`${label} — ${v.name}`), actions: `<a class="btn sm ghost" href="${route}?v=${esc(v.id)}">Open in ${esc(label)}</a>`,
        body: fn()(`pb-${b.id}`, { columns: cols, where: Q.matcher(o.register, v.filters), pageSize: Number(o.rows) || 5, initialSort: v.sort, bare: true }) });
    } });

  Q.component('note', { name: 'Text note', icon: 'text', multiple: true, defaults: { text: '' }, desc: 'Your own heading and text — for guidance, a reminder or a link to explain the page.',
    settings: [{ key: 'text', label: 'Text', type: 'textarea', required: true, placeholder: 'Write the note. Leave an empty line between paragraphs.' }],
    hiddenNote: 'This note is empty. Open its settings to write the text.',
    render: (b, ctx) => { const text = (b.opts?.text || '').trim(); return text ? Q.panel({ title: ctx.title('Note'), pad: true, body: text.split(/\n\s*\n/).map(p => `<p class="note-p">${esc(p).replace(/\n/g, '<br>')}</p>`).join('') }) : ''; } });

  /* Overview components use the same page builder and sizing rules as the QMS pages. */
  const overviewPart = (key, fallback) => ({ pages: ['overview'], group: 'Overview', ...fallback,
    render: () => Q.overviewParts?.[key] || '' });
  Q.component('overview-welcome', overviewPart('welcome', { name: 'Welcome banner', icon: 'sparkles', minWidth: 6, minHeight: 220, desc: 'Greeting, assigned work, readiness and quick actions.' }));
  Q.component('overview-attention', overviewPart('attention', { name: 'Attention summary', icon: 'gauge', minWidth: 8, minHeight: 240, desc: 'Critical and needs-attention totals across the QMS.' }));
  Q.component('overview-readiness', overviewPart('readiness', { name: 'ISO 9001 readiness', icon: 'badge-check', minWidth: 4, minHeight: 300, desc: 'Readiness score, requirement status and largest gaps.' }));
  Q.component('overview-work', overviewPart('work', { name: 'Needs your action', icon: 'inbox', minWidth: 4, minHeight: 280, desc: 'Reviews, approvals, corrective actions and periodic reviews assigned to you.' }));
  Q.component('overview-processes', overviewPart('processes', { name: 'Process status', icon: 'table', minWidth: 6, minHeight: 300, desc: 'Scrollable process-health table with readiness and issue counts.' }));
  Q.component('overview-reviews', overviewPart('reviews', { name: 'Upcoming document reviews', icon: 'calendar-clock', minWidth: 4, minHeight: 240, desc: 'Controlled documents due for periodic review.' }));
  Q.component('overview-actions', overviewPart('actions', { name: 'Management actions', icon: 'list-checks', minWidth: 4, minHeight: 240, desc: 'Open actions from management review.' }));

  const O = (id, type, w = 12, h = 0) => ({ id, type, size: { w, h } });
  // Dashboard arrangement (Update 24): greeting + readiness on top; narrow left column with the summary numbers, health
  // and two short lists; wide right column with the process table, team activity and the personal work list.
  Q.page('overview', { title: 'Overview', route: '#/overview', layout: { layout: '5-7', zones: {
    top: [O('ov-welcome', 'overview-welcome', 8), O('ov-readiness', 'overview-readiness', 4)],
    main: [O('ov-attention', 'overview-attention'), O('ov-health', 'overview-qms-health'), O('ov-reviews', 'overview-reviews'), O('ov-actions', 'overview-actions')],
    side: [O('ov-processes', 'overview-processes', 12, 440), O('ov-team', 'overview-team-activity'), O('ov-work', 'overview-work')],
    bottom: []
  } } });
})();
