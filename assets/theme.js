/* iQMS — UI themes. "Material" is the default; Classic remains available.
 * "Material" (inspired by Material Dashboard) adds a floating sidebar, soft card shadows,
 * icon stat cards and a welcome banner. The colour palette (Settings → Branding)
 * applies to both. Theme CSS is scoped under html[data-ui="material"], so Classic is untouched. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  Q.THEMES = {
    classic: { name: 'Classic', desc: 'Compact and flat. Collapsible sidebar, bordered panels. The current look.' },
    material: { name: 'Material', desc: 'Floating sidebar, soft shadows, icon stat cards and a welcome banner on Overview.' }
  };
  Q.theme = () => (Q.S.settings?.branding?.theme in Q.THEMES ? Q.S.settings.branding.theme : 'material');
  Q.isMaterial = () => Q.theme() === 'material';
  const apply = Q.applyBranding;
  Q.applyBranding = () => { apply?.(); document.documentElement.dataset.ui = Q.theme(); };

  /* ---------- Overview welcome banner (Material only) ---------- */
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
  Q.themeOverviewCharts = () => '';
  // Decorative: process nodes linked in a flow, drawn in the theme colours.
  const heroArt = () => `<svg viewBox="0 0 320 180" width="320" height="180">${[[40, 50], [120, 30], [200, 60], [280, 40], [80, 130], [170, 140], [250, 120]].map(([x, yy], i, a) => (i ? `<line x1="${a[i - 1][0]}" y1="${a[i - 1][1]}" x2="${x}" y2="${yy}"/>` : '')).join('')}
      ${[[40, 50], [120, 30], [200, 60], [280, 40], [80, 130], [170, 140], [250, 120]].map(([x, yy], i) => `<rect x="${x - 22}" y="${yy - 14}" width="44" height="28" rx="8" class="n${i % 3}"/>`).join('')}</svg>`;

  Q.themeObjectives = () => '';

  /* ---------- Theme picker (Settings → Branding) ---------- */
  Q.themePicker = sel => `<fieldset class="fieldset"><legend>Theme</legend><p class="help">The overall look of iQMS. Applies straight away for everyone in the organization; switch back at any time. No data changes.</p>
    <div class="theme-grid" role="radiogroup" aria-label="Theme">${Object.entries(Q.THEMES).map(([k, t]) => `<label class="theme-opt"><input type="radio" name="theme" value="${k}" ${k === sel ? 'checked' : ''}>
      <span class="theme-prev tp-${k}" aria-hidden="true"><i class="tp-sb"></i><span class="tp-main"><i class="tp-top"></i><span class="tp-cards"><i></i><i></i><i></i></span><i class="tp-panel"></i></span></span>
      <b>${esc(t.name)}${k === 'material' ? ' <span class="muted small">(default)</span>' : ''}</b><span>${esc(t.desc)}</span></label>`).join('')}</div></fieldset>`;
})();
