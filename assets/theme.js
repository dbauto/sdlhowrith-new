/* iQMS — UI themes. "Classic" is the original look and stays the default.
 * "Material" (inspired by Material Dashboard) adds a floating sidebar, soft card shadows,
 * icon stat cards, a welcome banner and chart cards. The colour palette (Settings → Branding)
 * applies to both. Theme CSS is scoped under html[data-ui="material"], so Classic is untouched. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  Q.THEMES = {
    classic: { name: 'Classic', desc: 'Compact and flat. Collapsible sidebar, bordered panels. The current look.' },
    material: { name: 'Material', desc: 'Floating sidebar, soft shadows, icon stat cards, a welcome banner and chart cards on Overview and Objectives & KPIs.' }
  };
  Q.theme = () => (Q.S.settings?.branding?.theme in Q.THEMES ? Q.S.settings.branding.theme : 'classic');
  Q.isMaterial = () => Q.theme() === 'material';
  const apply = Q.applyBranding;
  Q.applyBranding = () => { apply?.(); document.documentElement.dataset.ui = Q.theme(); };

  /* ---------- Chart card: one series on a coloured block, with a hover tooltip ----------
   * values: numbers (oldest first) · labels: x labels · target: optional reference line
   * fmt: value → text · kind: 'bar' | 'line' · tone: 'accent' | 'dark' | 'ink'          */
  const W = 300, H = 140, PAD = { l: 38, r: 10, t: 14, b: 22 };
  Q.chartSvg = ({ values, labels, target = null, fmt = v => String(v), kind = 'line', min = null, max = null, title = '' }) => {
    const lo = min ?? Math.min(...values, target ?? Infinity), hi = max ?? Math.max(...values, target ?? -Infinity);
    const span = hi - lo || 1, x0 = PAD.l, x1 = W - PAD.r, y0 = H - PAD.b, y1 = PAD.t;
    const y = v => y0 - (v - lo) / span * (y0 - y1);
    const n = values.length, step = (x1 - x0) / n, cx = i => x0 + step * (i + 0.5);
    const ticks = [lo, lo + span / 2, hi].map(v => Math.round(v));
    const grid = ticks.map(t => `<line class="cg" x1="${x0}" x2="${x1}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="cl" x="${x0 - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    const xl = labels.map((l, i) => `<text class="cl" x="${cx(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`).join('');
    const tgt = target != null ? `<line class="ct" x1="${x0}" x2="${x1}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>` : '';
    let marks = '';
    if (kind === 'bar') {
      const bw = Math.min(14, step * 0.42);
      marks = values.map((v, i) => { const top = y(v), h = Math.max(2, y0 - top); return `<path class="cm" d="M${(cx(i) - bw / 2).toFixed(1)} ${y0}V${(top + 3).toFixed(1)}q0 -3 3 -3h${(bw - 6).toFixed(1)}q3 0 3 3V${y0}Z"/>`
        + `<rect class="hit" x="${(cx(i) - step / 2).toFixed(1)}" y="${y1}" width="${step.toFixed(1)}" height="${y0 - y1}" data-tip="${esc(`${labels[i]}: ${fmt(v)}`)}"/>`; }).join('');
    } else {
      const pts = values.map((v, i) => `${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      marks = `<polyline class="cline" points="${pts}"/>` + values.map((v, i) => `<circle class="cdot${i === n - 1 ? ' last' : ''}" cx="${cx(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === n - 1 ? 4.5 : 3.5}"/>`
        + `<rect class="hit" x="${(cx(i) - step / 2).toFixed(1)}" y="${y1}" width="${step.toFixed(1)}" height="${y0 - y1}" data-tip="${esc(`${labels[i]}: ${fmt(v)}`)}"/>`).join('');
    }
    const summary = `${title}. ${labels.map((l, i) => `${l} ${fmt(values[i])}`).join(', ')}${target != null ? `. Target ${fmt(target)}` : ''}.`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">${grid}${tgt}${marks}${xl}</svg>`;
  };
  Q.chartCard = ({ tone = 'accent', title, caption = '', foot = '', href = '', ...chart }) => `<article class="chart-card">
      <div class="cc-plot tone-${tone}">${Q.chartSvg({ title, ...chart })}</div>
      <div class="cc-body"><h3>${href ? `<a href="${href}">${esc(title)}</a>` : esc(title)}</h3>${caption ? `<p>${caption}</p>` : ''}${chart.target != null ? `<p class="cc-key"><i aria-hidden="true"></i>Target ${esc((chart.fmt || String)(chart.target))}</p>` : ''}</div>
      ${foot ? `<div class="cc-foot">${icon('clock-3')}<span>${foot}</span></div>` : ''}</article>`;
  // One tooltip for every chart: follows the hovered mark, plain text in text colours.
  const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true; tip.setAttribute('role', 'presentation'); document.body.append(tip);
  document.addEventListener('mouseover', e => {
    const h = e.target.closest?.('.chart [data-tip]');
    if (!h) { tip.hidden = true; return; }
    tip.textContent = h.dataset.tip; tip.hidden = false;
    const r = h.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${Math.max(8, r.top - tip.offsetHeight - 6)}px`;
  });
  window.addEventListener('scroll', () => { tip.hidden = true; }, true);

  /* ---------- Month labels for the last n months, ending with the current month ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = n => { const mm = Number(Q.today().slice(5, 7)); return Array.from({ length: n }, (_, i) => MON[((mm - 1 - (n - 1 - i)) % 12 + 12) % 12]); };
  const trends = () => Q.S.trends || window.QMS_DATA.trends;

  /* ---------- Overview: welcome banner + chart cards (Material only) ---------- */
  Q.themeOverview = () => {
    if (!Q.isMaterial()) return '';
    const me = Q.person(Q.me()), first = me.name.split(' ')[0];
    const hr = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: Q.S.settings?.regional?.timeZone || 'Asia/Manila' }).format(new Date()));
    const hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const mine = Q.myWorkflows().length, od = Q.S.documents.filter(d => d.owner === Q.me() && Q.docOverdue(d)).length, pct = Q.isoScore(Q.S.iso).pct;
    return `<section class="hero">
        <div class="hero-text"><h2>${hello}, ${esc(first)}</h2>
          <p>${mine ? `<b>${mine} review${mine === 1 ? '' : 's'} and approval${mine === 1 ? '' : 's'}</b> ${mine === 1 ? 'is' : 'are'} waiting for you` : 'Nothing is waiting for your approval'}${od ? `, and <b>${od} of your documents</b> ${od === 1 ? 'is' : 'are'} overdue for review` : ''}. ISO 9001 readiness is <b>${pct}%</b>.</p>
          <div class="hero-actions"><a class="btn hero-btn" href="#/review">${icon('route')}Open Routing</a><a class="btn hero-ghost" href="#/evidence?view=clause">See readiness gaps</a></div></div>
        <div class="hero-art" aria-hidden="true">${heroArt()}</div></section>`;
  };
  Q.themeOverviewCharts = () => {
    if (!Q.isMaterial()) return '';
    const t = trends(), labels = months(6), pct = Q.isoScore(Q.S.iso).pct;
    const readiness = [...t.readiness.slice(0, -1), pct ?? t.readiness[t.readiness.length - 1]];
    const closed = t.actionsClosed.map(([a, ok]) => Math.round(ok / a * 100));
    return `<div class="chart-row">
        ${Q.chartCard({ tone: 'accent', kind: 'line', title: 'ISO 9001 readiness', caption: `<b>${readiness[5] - readiness[0] >= 0 ? '+' : ''}${readiness[5] - readiness[0]} points</b> in 6 months`, foot: 'Live score this month; earlier months from monthly snapshots', href: '#/evidence?view=clause', values: readiness, labels, min: 0, max: 100, fmt: v => `${v}%` })}
        ${Q.chartCard({ tone: 'dark', kind: 'bar', title: 'Document reviews on time', caption: 'Periodic reviews completed by their due date', foot: `${Q.S.documents.filter(Q.docOverdue).length} documents overdue now`, href: '#/documents?status=overdue', values: t.reviewsOnTime, labels, min: 0, max: 100, target: 90, fmt: v => `${v}%` })}
        ${Q.chartCard({ tone: 'ink', kind: 'bar', title: 'Corrective actions closed on time', caption: `${t.actionsClosed.reduce((a, x) => a + x[0], 0)} closed in 6 months`, foot: `${Q.S.actions.filter(Q.actionOverdue).length} open actions overdue now`, href: '#/capa', values: closed, labels, min: 0, max: 100, target: 85, fmt: v => `${v}%` })}
      </div>`;
  };
  // Decorative: process nodes linked in a flow, drawn in the theme colours.
  const heroArt = () => `<svg viewBox="0 0 320 180" width="320" height="180">${[[40, 50], [120, 30], [200, 60], [280, 40], [80, 130], [170, 140], [250, 120]].map(([x, yy], i, a) => (i ? `<line x1="${a[i - 1][0]}" y1="${a[i - 1][1]}" x2="${x}" y2="${yy}"/>` : '')).join('')}
      ${[[40, 50], [120, 30], [200, 60], [280, 40], [80, 130], [170, 140], [250, 120]].map(([x, yy], i) => `<rect x="${x - 22}" y="${yy - 14}" width="44" height="28" rx="8" class="n${i % 3}"/>`).join('')}</svg>`;

  /* ---------- Objectives & KPIs: trend cards for the KPIs furthest from target (Material only) ---------- */
  Q.themeObjectives = () => {
    if (!Q.isMaterial()) return '';
    const gap = k => Math.abs(k.actual - k.target) / (Math.abs(k.target) || 1);
    const below = Q.S.kpis.filter(k => !Q.kpiOk(k)).sort((a, b) => gap(b) - gap(a)).slice(0, 3);
    if (!below.length) return '';
    const tones = ['accent', 'dark', 'ink'];
    return `<div class="section-head"><h2>Furthest from target</h2><span class="sub">The ${below.length} KPIs with the largest gap this period. Select a title to open it in the register.</span></div>
      <div class="chart-row">${below.map((k, i) => Q.chartCard({ tone: tones[i], kind: 'line', title: k.name, href: `#/qms/objectives?focus=${encodeURIComponent(k.id)}`,
        caption: `${esc(Q.plabel(k.process))} · actual <b>${esc(Q.kpiFmt(k.actual, k))}</b>, target ${esc(k.dir)} ${esc(Q.kpiFmt(k.target, k))}`,
        foot: `${esc(Q.pname(k.owner))} · ${esc(k.period)}`, values: k.trend, labels: months(k.trend.length), target: k.target, fmt: v => Q.kpiFmt(v, k) })).join('')}</div>`;
  };

  /* ---------- Theme picker (Settings → Branding) ---------- */
  Q.themePicker = sel => `<fieldset class="fieldset"><legend>Theme</legend><p class="help">The overall look of iQMS. Applies straight away for everyone in the organization; switch back at any time. No data changes.</p>
    <div class="theme-grid" role="radiogroup" aria-label="Theme">${Object.entries(Q.THEMES).map(([k, t]) => `<label class="theme-opt"><input type="radio" name="theme" value="${k}" ${k === sel ? 'checked' : ''}>
      <span class="theme-prev tp-${k}" aria-hidden="true"><i class="tp-sb"></i><span class="tp-main"><i class="tp-top"></i><span class="tp-cards"><i></i><i></i><i></i></span><i class="tp-panel"></i></span></span>
      <b>${esc(t.name)}${k === 'classic' ? ' <span class="muted small">(default)</span>' : ''}</b><span>${esc(t.desc)}</span></label>`).join('')}</div></fieldset>`;
})();
