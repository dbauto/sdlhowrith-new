/* iQMS — UI kit: small, consistent dashboard components (stat card, card, list, badge, chips, info tip, sparkline).
 * Plain functions that return HTML strings, styled by the `ui-` classes in app.css. Both themes use the same markup.
 * Rules the kit enforces: one line per row, one status badge, colour only for status, explanations behind ⓘ,
 * whole rows clickable instead of a button on every row. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const UI = Q.ui = {};
  const KINDS = new Set(['success', 'warning', 'danger', 'info', 'neutral', 'orange', 'accent']);
  const kind = k => KINDS.has(k) ? k : 'neutral';

  // Small rounded status label. `dot` adds a leading dot.
  UI.badge = (text, k = 'neutral', { dot = false, title = '' } = {}) =>
    `<span class="ui-badge ${kind(k)}${dot ? ' dot' : ''}"${title ? ` title="${esc(title)}"` : ''}>${esc(text)}</span>`;

  // Explanation behind an ⓘ — shown on hover and keyboard focus instead of a sentence on the page.
  UI.info = text => `<span class="ui-info" tabindex="0" role="note" aria-label="${esc(text)}" data-tip="${esc(text)}">${icon('info')}</span>`;

  // Compact chips, e.g. open issues. Items with a zero count are left out, so an empty row stays empty.
  UI.chips = (items, empty = '') => {
    const xs = items.filter(x => x && x.n);
    return xs.length ? `<span class="ui-chips">${xs.map(x => `<span class="ui-chip ${kind(x.kind)}"${x.title ? ` title="${esc(x.title)}"` : ''}><b class="tnum">${x.n}</b> ${esc(x.label)}</span>`).join('')}</span>` : empty;
  };

  // Tiny trend line for stat cards and tables.
  UI.spark = (vals, k = 'neutral', { w = 72, h = 24 } = {}) => {
    const v = (vals || []).filter(x => x != null && !isNaN(x)); if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
    const pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 2) + 1).toFixed(1)},${(h - 2 - (x - min) / span * (h - 4)).toFixed(1)}`);
    return `<svg class="ui-spark ${kind(k)}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts.join(' ')}"/><circle cx="${pts.at(-1).split(',')[0]}" cy="${pts.at(-1).split(',')[1]}" r="2"/></svg>`;
  };

  // KPI / stat card: label, big value, one short note or a change badge.
  // { label, value, href, icon, tone: 'danger'|'warning'|'success'|null, delta: {text, kind}, note, info, spark: {vals, kind} }
  UI.stat = o => {
    const tag = o.href ? 'a' : 'div';
    return `<${tag} class="ui-stat${o.tone ? ' tone-' + kind(o.tone) : ''}"${o.href ? ` href="${esc(o.href)}"` : ''}>
      <span class="ui-stat-head"><span class="ui-stat-label">${esc(o.label)}</span>${o.info ? UI.info(o.info) : ''}${o.icon ? `<span class="ui-stat-icon">${icon(o.icon)}</span>` : ''}</span>
      <span class="ui-stat-body"><span class="ui-stat-value tnum">${esc(String(o.value))}${o.unit ? `<small>${esc(o.unit)}</small>` : ''}</span>${o.spark ? UI.spark(o.spark.vals, o.spark.kind) : ''}</span>
      <span class="ui-stat-foot">${o.delta ? UI.badge(o.delta.text, o.delta.kind) : ''}${o.note ? `<span class="ui-stat-note">${esc(o.note)}</span>` : ''}</span></${tag}>`;
  };
  UI.stats = list => `<div class="ui-stats" role="list">${list.map(s => `<div role="listitem" class="ui-stats-cell">${UI.stat(s)}</div>`).join('')}</div>`;

  // Card with a quiet header: title, optional count, ⓘ, and one link on the right.
  // { title, count, info, link: {href, text} | action html, body, cls, flush }
  UI.card = o => `<section class="panel ui-card${o.cls ? ' ' + o.cls : ''}">
    <header class="ui-card-head"><h2>${esc(o.title)}</h2>${o.count != null ? `<span class="ui-count tnum">${o.count}</span>` : ''}${o.info ? UI.info(o.info) : ''}
      ${o.link ? `<a class="ui-link" href="${esc(o.link.href)}">${esc(o.link.text)}${icon('chevron-right')}</a>` : o.actions || ''}</header>
    <div class="ui-card-body${o.flush ? ' flush' : ''}">${o.body}</div></section>`;

  // One-line rows. Each item: { href | action+id, icon, title, meta, right (html), tone }.
  // The row is the link; a chevron appears on hover. No buttons inside rows.
  UI.row = r => {
    const attrs = r.href ? `href="${esc(r.href)}"` : `role="button" tabindex="0" data-action="${esc(r.action)}"${Object.entries(r.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}`;
    return `<li><a class="ui-row${r.tone ? ' tone-' + kind(r.tone) : ''}" ${attrs}>
      ${r.icon ? `<span class="ui-row-icon">${icon(r.icon)}</span>` : ''}
      <span class="ui-row-main"><span class="ui-row-title" title="${esc(r.title)}">${esc(r.title)}</span>${r.meta ? `<span class="ui-row-meta">${esc(r.meta)}</span>` : ''}</span>
      ${r.right ? `<span class="ui-row-right">${r.right}</span>` : ''}<span class="ui-row-go" aria-hidden="true">${icon('chevron-right')}</span></a></li>`;
  };
  UI.list = (items, { empty = 'Nothing here.', emptyIcon = 'circle-check' } = {}) => items.length
    ? `<ul class="ui-list">${items.map(UI.row).join('')}</ul>`
    : `<div class="ui-empty">${icon(emptyIcon)}<span>${esc(empty)}</span></div>`;

  // Due date as a badge: overdue = danger, within 7 days = warning, else plain text.
  UI.due = (date, { closed = false } = {}) => {
    if (!date) return '';
    const d = Q.days(Q.today(), date);
    if (!closed && d < 0) return UI.badge(`Overdue ${Q.fmt(date).replace(/ \d{4}$/, '')}`, 'danger');
    if (!closed && d <= 7) return UI.badge(d === 0 ? 'Due today' : `Due ${Q.fmt(date).replace(/ \d{4}$/, '')}`, 'warning');
    return `<span class="ui-date tnum">${Q.fmt(date)}</span>`;
  };

  // Top underline tabs. items: [{ key, label, href, n, tone }] — `n` is a quiet count, tone 'danger' colours it.
  UI.tabs = (items, cur, label) => `<nav class="tabs ui-tabs" role="tablist" aria-label="${esc(label)}">${items.map(t =>
    `<a role="tab" href="${esc(t.href)}" aria-selected="${t.key === cur}"${t.key === cur ? ' aria-current="page"' : ''}>${esc(t.label)}${t.n ? `<span class="tab-n${t.tone ? ' ' + kind(t.tone) : ''}">${t.n}</span>` : ''}</a>`).join('')}</nav>`;

  /* ---------- Update 20b: "board" summary layout ----------
   * Left column: stacked stat tiles + one breakdown card (ring + progress bars).
   * Right: one table card with search, type filter, an optional primary button and pagination. */
  // Stat tile: icon square, two-line label, big number on the right.
  UI.tile = o => {
    const tag = o.href ? 'a' : 'div';
    return `<${tag} class="ui-tile${o.tone ? ' tone-' + kind(o.tone) : ''}"${o.href ? ` href="${esc(o.href)}"` : ''}${o.note ? ` title="${esc(o.note)}"` : ''}>
      <span class="ui-tile-icon">${icon(o.icon || 'circle')}</span><span class="ui-tile-label">${esc(o.label)}${o.note ? `<small>${esc(o.note)}</small>` : ''}</span>
      <span class="ui-tile-value tnum${typeof o.value === 'string' && o.value.length > 5 ? ' text' : ''}">${esc(String(o.value))}${o.unit ? `<small>${esc(o.unit)}</small>` : ''}</span></${tag}>`;
  };
  // Ring chart with the value in the middle.
  UI.donut = (pct, label) => {
    const v = Math.max(0, Math.min(100, Math.round(pct || 0))), r = 52, c = 2 * Math.PI * r;
    return `<div class="ui-donut" role="img" aria-label="${esc(label)} ${v}%"><svg viewBox="0 0 140 140" aria-hidden="true"><circle class="trk" cx="70" cy="70" r="${r}"/>${v ? `<circle class="val" cx="70" cy="70" r="${r}" style="--c:${c.toFixed(1)}" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)"/>` : ''}</svg>
      <span class="ui-donut-c"><small>${esc(label)}</small><b class="tnum">${v}%</b></span></div>`;
  };
  // Two rings: outer = completeness, inner = ISO readiness. Both animate in (ease-out) unless reduced motion is set.
  // { outer: { pct, label }, inner: { pct, label, note } }
  UI.rings = ({ outer, inner }) => {
    const ring = (r, pct, cls) => { const v = Math.max(0, Math.min(100, Math.round(pct ?? 0))), c = 2 * Math.PI * r;
      return `<circle class="trk ${cls}" cx="80" cy="80" r="${r}"/>${v ? `<circle class="val ${cls}" cx="80" cy="80" r="${r}" style="--c:${c.toFixed(1)};--v:${(c * v / 100).toFixed(1)}" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 80 80)"/>` : ''}`; };
    const ov = Math.round(outer.pct ?? 0), iv = inner.pct == null ? null : Math.round(inner.pct);
    return `<div class="ui-rings"><div class="ui-rings-chart" role="img" aria-label="${esc(outer.label)} ${ov}%, ${esc(inner.label)} ${iv == null ? 'not applicable' : iv + '%'}">
        <svg viewBox="0 0 160 160" aria-hidden="true">${ring(66, ov, 'out')}${iv == null ? '' : ring(46, iv, 'in')}</svg>
        <span class="ui-rings-c"><span><b class="tnum">${ov}%</b><small title="${esc(outer.label)}">${esc(String(outer.label).split(' · ')[0])}</small></span></span></div>
      <ul class="ui-rings-key"><li><i class="out"></i><span>${esc(outer.label)}</span><b class="tnum">${ov}%</b></li>
        <li><i class="in"></i><span>${esc(inner.label)}${inner.note ? ` <small>${esc(inner.note)}</small>` : ''}</span><b class="tnum">${iv == null ? '—' : iv + '%'}</b></li></ul></div>`;
  };
  // Breakdown card: { title, link, rings: { outer, inner } | donut: {pct, label}, bars: [{ label, pct, value, note, href, tone }] }
  UI.breakdown = o => `<section class="ui-bd">
    <header><h2>${esc(o.title)}</h2>${o.link ? `<a class="ui-link" href="${esc(o.link.href)}">${esc(o.link.text)}${icon('chevron-right')}</a>` : ''}</header>
    ${o.rings ? UI.rings(o.rings) : o.donut ? UI.donut(o.donut.pct, o.donut.label) : ''}
    ${(o.bars || []).length ? `<ul class="ui-bars">${o.bars.slice(0, 5).map(x => { const v = Math.max(0, Math.min(100, Math.round(x.pct || 0))), inner = `<span class="ui-bar-l"><i class="dot${x.tone ? ' ' + kind(x.tone) : ''}"></i>${esc(x.label)}</span><span class="ui-bar-t"><i class="${x.tone ? kind(x.tone) : ''}" style="width:${v}%"></i></span><span class="ui-bar-f"><span>${esc(x.note || '')}</span><b class="tnum">${esc(x.value != null ? String(x.value) : v + '%')}</b></span>`;
      return `<li>${x.href ? `<a href="${esc(x.href)}">${inner}</a>` : inner}</li>`; }).join('')}</ul>${(() => { const extra = Math.max(0, o.bars.length - 5), txt = `+ ${extra} more`;
        return o.link ? `<a class="ui-bd-more" data-extra="${extra}" href="${esc(o.link.href)}"${extra ? '' : ' hidden'}><span>${txt}</span>${icon('chevron-right')}</a>` : `<span class="ui-bd-more" data-extra="${extra}"${extra ? '' : ' hidden'}><span>${txt}</span></span>`; })()}` : (o.empty ? `<p class="small muted">${esc(o.empty)}</p>` : '')}
  </section>`;

  // Table rows: { icon, title, meta, kind, owner (person id), due (ISO date) | dueText, right (status html), href | action+data, tone }
  const PAGE = 8;
  const pager = (page, pages) => {
    if (pages <= 1) return '';
    const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums.at(-1) !== '…') nums.push('…');
    return `<button type="button" class="ui-pg" data-bt-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page"><span class="flip">${icon('chevron-right')}</span></button>${nums.map(n => n === '…' ? '<span class="ui-pg-gap">…</span>' : `<button type="button" class="ui-pg${n === page ? ' on' : ''}" data-bt-page="${n}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`).join('')}<button type="button" class="ui-pg" data-bt-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">${icon('chevron-right')}</button>`;
  };
  UI.btable = ({ title = 'Needs attention', rows = [], action = '', search = 'Search items', empty = 'Nothing needs attention.' }) => {
    const kinds = [...new Set(rows.map(r => r.kind).filter(Boolean))];
    const hasOwner = rows.some(r => r.owner), hasDue = rows.some(r => r.due || r.dueText), hasKind = kinds.length > 0;
    const tr = (r, i) => {
      const go = r.href ? `<a class="ui-bt-title" href="${esc(r.href)}">${esc(r.title)}</a>` : `<button type="button" class="ui-bt-title" data-action="${esc(r.action)}"${Object.entries(r.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${esc(r.title)}</button>`;
      return `<tr data-bt-row data-kind="${esc(r.kind || '')}" data-text="${esc(`${r.title} ${r.meta || ''} ${r.kind || ''} ${r.owner ? Q.pname(r.owner) : ''}`.toLowerCase())}"${i >= PAGE ? ' hidden' : ''} class="${r.tone ? 'tone-' + kind(r.tone) : ''}">
        <td><span class="ui-bt-item"><span class="ui-bt-icon">${icon(r.icon || 'circle')}</span><span class="ui-bt-main">${go}${r.meta ? `<span class="ui-bt-meta">${esc(r.meta)}</span>` : ''}</span></span></td>
        ${hasKind ? `<td class="ui-bt-kind">${esc(r.kind || '—')}</td>` : ''}
        ${hasOwner ? `<td>${r.owner ? `<span class="user-cell"><span class="avatar sm">${esc(Q.initials(r.owner))}</span><span class="nowrap">${esc(Q.pname(r.owner))}</span></span>` : '<span class="muted">—</span>'}</td>` : ''}
        ${hasDue ? `<td class="nowrap">${r.due ? `<span class="ui-date tnum${Q.days(Q.today(), r.due) < 0 ? ' od' : ''}">${Q.fmt(r.due)}</span>` : r.dueText ? `<span class="ui-date">${esc(r.dueText)}</span>` : '<span class="muted">—</span>'}</td>` : ''}
        <td class="ui-bt-status">${r.right || ''}</td></tr>`;
    };
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    return `<div class="ui-bt" data-bt>
      <div class="ui-bt-bar"><h2>${esc(title)}<span class="ui-count tnum">${rows.length}</span></h2>
        ${rows.length > 3 ? `<label class="ui-bt-search">${icon('search')}<input type="search" data-bt-search placeholder="${esc(search)}" aria-label="${esc(search)}"></label>` : ''}
        ${kinds.length > 1 ? `<label class="ui-bt-filter">${icon('filter')}<select data-bt-filter aria-label="Filter by type"><option value="">All types</option>${kinds.map(k => `<option>${esc(k)}</option>`).join('')}</select>${icon('chevron-down')}</label>` : ''}
        <span class="ui-bt-sp"></span>${action}</div>
      ${rows.length ? `<div class="table-scroll"><table class="dt ui-btable"><caption class="sr-only">${esc(title)}</caption><thead><tr><th>Item</th>${hasKind ? '<th>Type</th>' : ''}${hasOwner ? '<th>Owner</th>' : ''}${hasDue ? '<th>Due</th>' : ''}<th>Status</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div>
        <div class="ui-bt-empty" hidden>${icon('search')}<span>No items match.</span></div>
        <footer class="ui-bt-foot"><span class="small muted" data-bt-info>Showing ${Math.min(PAGE, rows.length)} of ${rows.length}</span><span class="ui-pager" data-bt-pager>${pager(1, pages)}</span></footer>`
        : `<div class="ui-empty">${icon('circle-check')}<span>${esc(empty)}</span></div>`}
    </div>`;
  };
  const btUpdate = (root, page = 1) => {
    const q = (root.querySelector('[data-bt-search]')?.value || '').trim().toLowerCase(), f = root.querySelector('[data-bt-filter]')?.value || '';
    const rows = [...root.querySelectorAll('[data-bt-row]')], match = rows.filter(r => (!q || r.dataset.text.includes(q)) && (!f || r.dataset.kind === f));
    const pages = Math.max(1, Math.ceil(match.length / PAGE)); page = Math.max(1, Math.min(pages, page));
    rows.forEach(r => { r.hidden = true; }); match.slice((page - 1) * PAGE, page * PAGE).forEach(r => { r.hidden = false; });
    root.querySelector('[data-bt-info]').textContent = match.length ? `Showing ${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, match.length)} of ${match.length}` : 'Showing 0';
    root.querySelector('[data-bt-pager]').innerHTML = pager(page, pages); root.querySelector('.ui-bt-empty').hidden = !!match.length; Q.refreshIcons();
  };
  document.addEventListener('input', e => { const s = e.target.closest?.('[data-bt-search]'); if (s) btUpdate(s.closest('[data-bt]')); });
  document.addEventListener('change', e => { const s = e.target.closest?.('[data-bt-filter]'); if (s) btUpdate(s.closest('[data-bt]')); });
  document.addEventListener('click', e => {
    const pg = e.target.closest?.('[data-bt-page]'); if (pg) { btUpdate(pg.closest('[data-bt]'), +pg.dataset.btPage); return; }
    const tr = e.target.closest?.('tr[data-bt-row]'); if (tr && !e.target.closest('a, button, input, select')) tr.querySelector('.ui-bt-title')?.click();
  });

  /* Fit each board to the screen: the board takes the height left below its top edge, the table card fills it
   * (rows scroll inside the card), and the left column hides bars from the bottom ("+ N more") until it fits.
   * Stacked layouts (narrow screens) keep their natural height. */
  let fitBoard = bd => {
    const side = bd.querySelector('.ui-board-side'); if (!side) return;
    side.classList.remove('tight'); side.querySelectorAll('.ui-bars li[hidden]').forEach(li => { li.hidden = false; });
    const more = side.querySelector('.ui-bd-more'), setMore = hiddenN => { if (!more) return; const n = hiddenN + (+more.dataset.extra || 0); more.hidden = !n; more.firstElementChild.textContent = `+ ${n} more`; };
    setMore(0);
    if (getComputedStyle(bd).gridTemplateColumns.trim().split(/\s+/).length < 2) { bd.style.height = ''; bd.classList.remove('fit'); return; }
    const host = bd.closest('#main') || document.body, padB = parseFloat(getComputedStyle(host).paddingBottom) || 0, top = bd.getBoundingClientRect().top + scrollY, h = Math.round(Math.max(380, innerHeight - top - padB - 2));
    bd.style.height = `${h}px`; bd.classList.add('fit');
    const fits = () => side.scrollHeight <= side.clientHeight + 1;
    if (!fits()) side.classList.add('tight');
    const lis = [...side.querySelectorAll('.ui-bars li')]; let hid = 0;
    for (let i = lis.length - 1; i >= 0 && !fits(); i--) { lis[i].hidden = true; hid++; setMore(hid); }
    if (!fits()) side.classList.add('tighter'); // last step: smaller ring, no key notes — the "+ N more" link stays visible
  };
  const fitReset = side => side.classList.remove('tighter');
  const fitBoard0 = fitBoard; fitBoard = bd => { const side = bd.querySelector('.ui-board-side'); if (side) fitReset(side); fitBoard0(bd);
  };
  UI.fitBoards = () => document.querySelectorAll('.ui-board').forEach(bd => { if (!bd.closest('.ui-demo')) fitBoard(bd); });
  let fitT = 0; window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(UI.fitBoards, 80); });
  const render0 = Q.render; Q.render = (o = {}) => { render0(o); UI.fitBoards(); };

  // Summary tab: { stats (max 4), breakdown, attention rows, action, empty, title }
  UI.summary = ({ stats = [], breakdown = null, attention = [], action = '', empty = 'Nothing needs attention.', title = 'Needs attention', search }) =>
    `<div class="ui-board"><aside class="ui-board-side">${stats.slice(0, 4).map(UI.tile).join('')}${breakdown ? UI.breakdown(breakdown) : ''}</aside>
      <section class="ui-board-main">${UI.btable({ title, rows: attention, action, empty, search })}</section></div>`;

  // Keyboard support for role="button" rows.
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('a.ui-row[role="button"]')) { e.preventDefault(); e.target.click(); } });
})();

/* UI Library — Settings → Workspace → UI Components. Shows every kit component with live sample data and the rules. */
(() => {
  'use strict';
  const { esc, icon } = Q, U = Q.ui;
  const code = s => `<code class="ui-code">${esc(s)}</code>`;
  const demo = (title, note, body, usage) => `<section class="ui-demo"><header><h3>${esc(title)}</h3><p>${esc(note)}</p></header><div class="ui-demo-body">${body}</div>${usage ? `<footer>${code(usage)}</footer>` : ''}</section>`;
  Q.settingsViews = Q.settingsViews || {};
  Q.settingsViews['ui-library'] = () => {
    const S = Q.S, kpi = S.kpis.find(k => (k.history || k.trend || []).length > 2) || S.kpis[0];
    const hist = kpi?.history || kpi?.trend || [82, 84, 83, 86, 85, 87];
    const docs = S.documents.filter(d => d.nextReview).slice(0, 3);
    return { html: `<div class="section-head"><h2>UI components</h2><span class="sub">The building blocks every dashboard page uses. One line per row, one badge per status, colour only for status, explanations behind ${'ⓘ'}.</span></div>
      <div class="ui-lib">
      ${demo('Stat card', 'Label, one number, one short note or change badge. Four per row at most.', U.stats([
        { label: 'Open nonconformities', value: 5, icon: 'search-check', tone: 'danger', note: '2 awaiting verification', href: '#/audits/nc' },
        { label: 'ISO readiness', value: Q.isoScore(S.iso).pct ?? 0, unit: '%', icon: 'badge-check', delta: { text: '+4 pts this quarter', kind: 'success' }, info: 'Weighted share of applicable ISO 9001 requirements that are complete.' },
        { label: kpi?.name || 'KPI', value: `${hist.at(-1)}`, icon: 'target', spark: { vals: hist, kind: hist.at(-1) >= hist[0] ? 'success' : 'danger' }, note: 'last 6 periods' },
        { label: 'Documents due', value: 2, icon: 'calendar-clock', tone: 'warning', note: 'next 30 days' }]), "Q.ui.stats([{ label, value, href, icon, tone, note, delta, info, spark }])")}
      ${demo('Badges', 'Soft pills for status. The same component replaces coloured status text in every table.', `<div class="ui-demo-row">${U.badge('Published', 'success')}${U.badge('In review', 'info')}${U.badge('Due 5 Oct', 'warning')}${U.badge('Overdue', 'danger')}${U.badge('Draft')}${U.badge('Live', 'success', { dot: true })}${Q.st('Published')}${Q.health('attn')}</div>`, "Q.ui.badge(text, 'success'|'warning'|'danger'|'info'|'neutral', { dot })")}
      ${demo('Chips', 'Counts inside table cells. Zero counts are left out, so a clean row stays empty.', U.chips([{ n: 2, label: 'high risks', kind: 'danger' }, { n: 1, label: 'overdue doc', kind: 'warning' }, { n: 0, label: 'evidence gaps' }, { n: 3, label: 'open actions' }]), "Q.ui.chips([{ n, label, kind }])")}
      ${demo('Info tip', 'Explanations live behind ⓘ (hover or keyboard focus) instead of sentences on the page.', `<span class="ui-demo-row">Process status ${U.info('Counts include subprocesses. Status reflects open items; ISO readiness is scored separately.')}</span>`, 'Q.ui.info(text)')}
      ${demo('List card', 'One line per row with a due badge on the right. The whole row opens the record; no buttons inside rows.', `<div style="max-width:560px">${U.card({ title: 'Upcoming reviews', count: docs.length, link: { href: '#/documents', text: 'View all' }, flush: true, body: U.list(docs.map(d => ({ icon: 'file-text', title: d.title, meta: `${d.id} · Rev ${d.rev}`, action: 'open-doc', data: { id: d.id }, right: U.due(d.nextReview) }))) })}</div>`, "Q.ui.card({ title, count, info, link, body: Q.ui.list(items), flush: true })")}
      ${demo('Empty state', 'Short, positive, no instructions.', `<div style="max-width:560px" class="panel">${U.list([], { empty: 'Nothing needs your action today.' })}</div>`, "Q.ui.list([], { empty })")}
      </div>
      ${boardKit()}` };
  };

  /* ---------- Update 20 board kit: pill tabs + Summary board, with the rules that go with them ---------- */
  function boardKit() {
    const S = Q.S, cur = Q.route().q.tab || 'summary';
    const docs = S.documents.filter(d => d.nextReview && d.owner).slice(0, 11);
    const rows = docs.map((d, i) => ({ icon: 'file-text', title: d.title, meta: `${d.id} · Rev ${d.rev || '—'}`, kind: i % 3 === 0 ? 'Document' : i % 3 === 1 ? 'Risk' : 'KPI', owner: d.owner, due: d.nextReview,
      action: 'open-doc', data: { id: d.id }, right: Q.docOverdue(d) ? U.badge('Review overdue', 'danger') : U.badge('Current', 'success'), tone: Q.docOverdue(d) ? 'danger' : '' }));
    const tiles = [
      { label: 'Documents overdue', value: 3, icon: 'files', tone: 'danger', note: 'of 42 documents', href: '#/documents' },
      { label: 'Open risks', value: 12, icon: 'shield-alert', note: '2 high' },
      { label: 'Process health', value: 'Needs attention', icon: 'activity', tone: 'warning', note: 'text values shrink to fit' }];
    const bd = { title: 'Process controls', link: { href: '#/settings/ui-library', text: 'Link' }, rings: { outer: { pct: 78, label: 'Completeness' }, inner: { pct: 61, label: 'ISO readiness', note: '12 requirements mapped' } },
      bars: [{ label: 'Documents current', pct: 90, value: '9/10', note: 'not overdue' }, { label: 'Evidence linked', pct: 60, value: '3/5', note: 'no missing links', tone: 'warning' }, { label: 'KPIs on target', pct: 25, value: '1/4', note: 'Sep 2026', tone: 'danger' }] };
    const rule = (t, d) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`;
    const tabsDemo = U.tabs([{ key: 'summary', label: 'Summary' }, { key: 'definition', label: 'Definition' }, { key: 'documents', label: 'Documents', n: 4 }, { key: 'risks', label: 'Risks', n: 2, tone: 'danger' }, { key: 'activity', label: 'Activity' }]
      .map(t => ({ ...t, href: `#/settings/ui-library?tab=${t.key}` })), cur, 'Demo tabs');
    return `<div class="section-head" style="margin-top:32px"><h2>Board kit (Update 20)</h2><span class="sub">Pill tabs and the Summary board used by Organization & Scope, Policies, the process workspace, Audits and the audit workspace.</span></div>
      <div class="ui-lib">
      ${demo('Page rules', 'How a tabbed page is put together. Follow these when adding a new page.', `<ul class="kit-rules">
        ${rule('One topic per tab', 'A page is a pill tab group. Each tab shows one subject: a table, a form or a chart, never a dashboard.')}
        ${rule('Summary first', 'The first tab is always Summary and is the default route (#/page). Other tabs are #/page/<tab>.')}
        ${rule('Left column: numbers', 'At most 4 stat tiles, then one breakdown card (one ring + up to 5 bars). Nothing else on the left.')}
        ${rule('Right: one table', 'One “Needs attention” table: Item · Type · Owner · Due · Status. 8 rows per page, search, type filter.')}
        ${rule('One primary button', 'The table bar carries the one action people take most on this page. Other actions stay in the page header.')}
        ${rule('Colour = status only', 'Red for overdue or failing, amber for pending, green for done. Tile icons follow the same rule.')}
        ${rule('Rows open records', 'The whole row opens the record where the item is fixed. No buttons inside rows.')}
        ${rule('Counts on tabs', 'A tab shows its record count, or its warning (“1 overdue”) instead when there is one. Empty tabs show “—”.')}</ul>`)}
      ${demo('Pill tabs', 'Rounded tab group; the selected tab is a filled pill. Counts are small pills; a danger count turns red. Click to try.', tabsDemo,
        "Q.ui.tabs([{ key, label, href, n, tone }], currentKey, ariaLabel)")}
      ${demo('Stat tile', 'Icon square, label with a short note, big number on the right. Tone colours the icon and number. Max 4, stacked.', `<div class="kit-col">${tiles.map(U.tile).join('')}</div>`,
        "Q.ui.tile({ label, value, unit, icon, tone: 'danger'|'warning'|null, note, href })")}
      ${demo('Two rings', 'Outer ring = completeness of the page’s own checks; inner ring = ISO readiness of the clauses the page covers. Both ease in when the card appears (off with reduced motion and in print).', `<div class="kit-row"><div style="width:260px">${U.rings({ outer: { pct: 80, label: 'Completeness' }, inner: { pct: 50, label: 'ISO readiness', note: 'clauses 4.1–4.4' } })}</div><div style="width:260px">${U.rings({ outer: { pct: 42, label: 'Completeness · 5 of 12 reported' }, inner: { pct: 75, label: 'ISO readiness', note: 'clauses 9.2 and 10.2' } })}</div></div>`,
        "Q.ui.rings({ outer: { pct, label }, inner: { pct, label, note } })")}
      ${demo('Ring chart', 'One percentage with its label inside, for places that need a single number.', `<div class="kit-row">${U.donut(86.8, 'Recovery rate average')}${U.donut(42, '5 of 12 audits reported')}${U.donut(0, 'Checklist not built')}</div>`,
        "Q.ui.donut(pct, label)")}
      ${demo('Breakdown card', 'Ring plus up to five progress bars, each with a note and value. Bars link to the tab with the detail.', `<div class="kit-col">${U.breakdown(bd)}</div>`,
        "Q.ui.breakdown({ title, link: { href, text }, rings: { outer, inner } | donut: { pct, label }, bars: [{ label, pct, value, note, href, tone }], empty })")}
      ${demo('Attention table', 'Search, type filter, primary button, pagination (8 per page). Columns without data are left out. Try search, filter and page 2.',
        `<div class="ui-board-main">${U.btable({ title: 'Needs attention', rows, search: 'Search documents…', action: `<button class="btn primary" type="button" data-action="toast" data-title="Primary action" data-msg="One primary action per table.">${icon('plus')}Primary Action</button>` })}</div>`,
        "Q.ui.btable({ title, rows: [{ icon, title, meta, kind, owner, due | dueText, right, href | action+data, tone }], search, action, empty })")}
      ${demo('Summary board', 'The full Summary tab: tiles and breakdown on the left, attention table on the right. Stacks on tablets and phones.',
        U.summary({ stats: tiles, breakdown: bd, attention: rows.slice(0, 5), search: 'Search…', action: `<button class="btn primary" type="button" data-action="toast" data-title="Primary action" data-msg="One primary action per table.">${icon('plus')}Add</button>` }),
        "Q.ui.summary({ stats, breakdown, attention, action, search, empty, title })")}
      </div>`;
  }
})();
