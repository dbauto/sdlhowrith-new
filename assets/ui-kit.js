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

  // Keyboard support for role="button" rows.
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('a.ui-row[role="button"]')) { e.preventDefault(); e.target.click(); } });
})();

/* UI Library — Settings → Workspace → UI Components. Shows every kit component with live sample data and the rules. */
(() => {
  'use strict';
  const { esc } = Q, U = Q.ui;
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
      </div>` };
  };
})();
