/* iQMS — Settings sections for running iQMS as a SaaS: regional, branding, security, notifications,
 * API & webhooks, data privacy (Philippine Data Privacy Act), audit log, data export, billing, about.
 * Each section registers itself in Q.settingsViews; admin.js owns the Settings page and its navigation. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const V = Q.settingsViews = Q.settingsViews || {};
  const APP = { name: 'iQMS', version: '3.11.1', build: '2026.10.02-2', channel: 'Stable', released: '2026-10-02' };
  Q.APP = APP;

  /* ---------- Settings state (stored with the organization; defaults merged in once) ---------- */
  const DEFAULTS = () => ({
    regional: { timeZone: 'Asia/Manila', dateFormat: 'd MMM yyyy', weekStart: 'Monday', language: 'English', currency: 'PHP' },
    branding: { theme: 'material', palette: 'forest', initials: Q.S.organization.initials, loginMessage: '' },
    security: { mfa: 'admins', sso: { status: 'Not configured', domain: '', enforce: false }, minLength: '12', complexity: true, expiry: 'Never', lockout: '5', idle: '30', maxSession: '12 hours', ipEnabled: false, ipList: '' },
    notifications: {
      events: { assigned: ['app', 'email'], dueSoon: ['app', 'email'], overdue: ['app', 'email'], caAssigned: ['app', 'email'], caOverdue: ['app', 'email'], riskHigh: ['app'], kpiBelow: ['app'], mention: ['app', 'email'], weekly: ['email'] },
      leadDays: ['30', '7'], digest: 'Daily at 8:00 AM'
    },
    privacy: {
      dpo: { name: 'Maria Santos', email: 'dpo@heliossolar.example', phone: '+63 2 8000 0000' },
      checks: { dpo: 'Done', notice: 'Done', agreement: 'Done', pia: 'In progress', register: 'To confirm', breachPlan: 'Done', retention: 'Done', training: 'In progress' },
      retention: { accounts: '1 year after deactivation', audit: '5 years', records: 'Per document control (7.5)', incidents: '5 years', customers: '3 years after last transaction', dsr: '3 years' },
      supportAccess: false, supportUntil: null,
      requests: null, breaches: []
    },
    api: { keys: null, webhooks: null },
    billing: { plan: 'Professional', seats: 25 }
  });
  const merge = (base, over) => { Object.entries(over || {}).forEach(([k, v]) => { base[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], v) : v; }); return base; };
  const ensure = () => { Q.S.settings = merge(DEFAULTS(), Q.S.settings); return Q.S.settings; };
  ensure();
  if (!Q.S.organization.materialDefaultApplied) {
    Q.S.settings.branding.theme = 'material';
    Q.S.organization.materialDefaultApplied = true;
    Q.save();
  }
  const S = () => Q.S.settings || ensure();
  const today = () => Q.today();
  const daysAgo = n => Q.addDays(today(), -n);

  /* ---------- Audit log: who changed what, when (append-only) ---------- */
  if (!Q.S.auditLog) {
    Q.S.auditLog = [
      [0, '08:12', 'maria', 'Sign-in', 'signed in with password and two-step verification', '203.177.12.40'],
      [1, '17:40', 'aaron', 'Users & access', 'changed Kim Dela Cruz’s access to 04 Engineering & Design: View → Contribute', '203.177.12.18'],
      [1, '09:03', 'aaron', 'Sign-in', 'signed in with password and two-step verification', '203.177.12.18'],
      [2, '14:22', 'maria', 'Settings', 'updated the retention schedule for audit logs to 5 years', '203.177.12.40'],
      [3, '10:15', 'nina', 'Export', 'exported the Documents register (63 rows, CSV)', '112.198.40.7'],
      [4, '16:50', 'aaron', 'Integrations', 'ran a Microsoft 365 connection test (OK)', '203.177.12.18'],
      [5, '11:31', 'unknown', 'Sign-in', 'failed sign-in for jun.bautista@heliossolar.example (wrong password, 2nd attempt)', '49.145.88.201'],
      [6, '08:47', 'aaron', 'Users & access', 'deactivated Rick Soriano', '203.177.12.18'],
      [9, '15:05', 'maria', 'Privacy', 'closed data subject request DSR-2026-002 (access)', '203.177.12.40']
    ].map(([d, t, who, cat, text, ip], i) => ({ id: 'AL-' + (900 - i), at: `${daysAgo(d)} ${t}`, who, cat, text, ip }));
    Q.save();
  }
  Q.audit = (cat, text) => { Q.S.auditLog.unshift({ id: Q.uid('AL'), at: `${today()} ${new Date().toTimeString().slice(0, 5)}`, who: Q.me(), cat, text, ip: '203.177.12.40' }); Q.save(); };

  /* ---------- Shared bits ---------- */
  const section = (title, sub, actions = '') => `<div class="section-head"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
  const panel = (title, body, { sub = '', actions = '', pad = true, id = '', inGrid = false } = {}) => `<section class="panel${inGrid ? '' : ' section'}"${id ? ` id="${id}"` : ''}><div class="panel-head"><h3>${title}</h3>${sub ? `<span class="muted small">${sub}</span>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}</div>${pad ? `<div class="panel-pad">${body}</div>` : body}</section>`;
  const options = (list, sel) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
  const saveBar = (label = 'Save Changes') => `<div class="form-actions"><button class="btn primary" type="submit">${esc(label)}</button></div>`;
  const onSubmit = (main, sel, fn) => main.querySelector(sel)?.addEventListener('submit', e => { e.preventDefault(); if (!Q.validate(e.target)) return; fn(Q.formValues(e.target), e.target); });
  const download = (name, text, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0); };
  const toggle = (name, on, label, hint = '') => `<label class="switch-row"><span><b>${label}</b>${hint ? `<span>${hint}</span>` : ''}</span><span class="switch"><input type="checkbox" role="switch" name="${name}" ${on ? 'checked' : ''}><i aria-hidden="true"></i></span></label>`;
  const meter = (used, total, unit = '') => { const pct = Math.min(100, Math.round(used / total * 100)); return `<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${used}" aria-label="${used}${unit} of ${total}${unit}"><span style="width:${pct}%" class="${pct >= 90 ? 'hi' : ''}"></span></div><div class="small muted">${used}${unit} of ${total}${unit} · ${pct}%</div>`; };

  /* =================== Regional =================== */
  const ZONES = [['Asia/Manila', 'Philippines — Manila (UTC+8)'], ['Asia/Singapore', 'Singapore (UTC+8)'], ['Asia/Hong_Kong', 'Hong Kong (UTC+8)'], ['Asia/Tokyo', 'Japan — Tokyo (UTC+9)'], ['Australia/Sydney', 'Australia — Sydney'], ['Europe/London', 'United Kingdom — London'], ['America/Los_Angeles', 'United States — Pacific'], ['UTC', 'UTC']];
  V.regional = () => {
    const r = S().regional;
    const sample = f => { const keep = r.dateFormat; r.dateFormat = f; const out = Q.fmt(today()); r.dateFormat = keep; return out; };
    return { html: section('Regional', 'Time zone, date format and language for everyone in the organization. People can override the time zone in My Profile.') +
      `<section class="panel"><form class="panel-pad" id="regForm"><div class="form-grid">
        <label class="field"><span>Time zone</span><select class="select" name="timeZone">${options(ZONES, r.timeZone)}</select><span class="help">Used for due dates, “today”, reminders and the audit log.</span></label>
        <label class="field"><span>Date format</span><select class="select" name="dateFormat">${options(Object.keys(Q.DATE_FORMATS).map(f => [f, `${sample(f)}  (${f})`]), r.dateFormat)}</select><span class="help">Applies to every table, export and notification.</span></label>
        <label class="field"><span>Week starts on</span><select class="select" name="weekStart">${options(['Monday', 'Sunday'], r.weekStart)}</select></label>
        <label class="field"><span>Language</span><select class="select" name="language">${options(['English'], r.language)}</select><span class="help">Filipino is planned. Document content stays in the language it was written in.</span></label>
        <label class="field"><span>Currency</span><select class="select" name="currency">${options([['PHP', 'Philippine peso (₱)'], ['USD', 'US dollar ($)']], r.currency)}</select><span class="help">For billing and cost fields on corrective actions.</span></label>
      </div>${saveBar()}</form></section>`,
      after: main => onSubmit(main, '#regForm', v => {
        Object.assign(S().regional, v); Q.save(); Q.audit('Settings', `changed regional settings (time zone ${v.timeZone}, dates ${v.dateFormat})`);
        Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Regional settings saved', `Dates now show as ${Q.fmt(today())}.`);
      }) };
  };

  /* =================== Branding =================== */
  Q.PALETTES = {
    forest: { name: 'Forest (default)', accent: '#1F6F4A', hover: '#185C3D', soft: '#E8F2EC', sb: '#0E3B2C', sb2: '#0A2E22', mark: '#1C6A4A' },
    ocean: { name: 'Ocean', accent: '#1F5FAD', hover: '#184C8C', soft: '#EAF1FB', sb: '#0F2D52', sb2: '#0B2240', mark: '#1F5FAD' },
    plum: { name: 'Plum', accent: '#6E3FA3', hover: '#5A3386', soft: '#F2ECF9', sb: '#2E1A47', sb2: '#241438', mark: '#6E3FA3' },
    slate: { name: 'Slate', accent: '#3A5068', hover: '#2E4053', soft: '#ECF0F4', sb: '#1E2A36', sb2: '#17212B', mark: '#3A5068' },
    terracotta: { name: 'Terracotta', accent: '#A2452A', hover: '#843822', soft: '#F9EDE8', sb: '#3B1D14', sb2: '#2E160F', mark: '#A2452A' }
  };
  Q.applyBranding = () => {
    const p = Q.PALETTES[S().branding.palette] || Q.PALETTES.forest, st = document.documentElement.style;
    st.setProperty('--accent', p.accent); st.setProperty('--accent-hover', p.hover); st.setProperty('--accent-soft', p.soft);
    st.setProperty('--sb-bg', p.sb); st.setProperty('--sb-bg-2', p.sb2); st.setProperty('--org-mark', p.mark);
  };
  V.branding = () => {
    const b = S().branding;
    return { html: section('Branding', 'How iQMS looks for your organization: the theme, the colours and the logo. Colours are pre-checked for readable contrast.') +
      `<section class="panel"><form class="panel-pad" id="brandForm">${Q.themePicker ? Q.themePicker(Q.theme()) : ''}
        <fieldset class="fieldset"><legend>Colour theme</legend><p class="help">Changes the sidebar, buttons and links for everyone. Applies straight away.</p>
          <div class="palette-grid" role="radiogroup" aria-label="Colour theme">${Object.entries(Q.PALETTES).map(([k, p]) => `<label class="palette-opt"><input type="radio" name="palette" value="${k}" ${k === b.palette ? 'checked' : ''}><span class="pal-prev" aria-hidden="true"><i style="background:${p.sb}"></i><i style="background:${p.accent}"></i><i style="background:${p.soft}"></i></span><b>${esc(p.name)}</b></label>`).join('')}</div></fieldset>
        <div class="form-grid">
          <label class="field"><span>Logo initials <span class="req">*</span></span><input class="input" name="initials" maxlength="3" required value="${esc(b.initials)}"><span class="help">Shown in the sidebar when no logo is uploaded. Up to 3 letters.</span></label>
          <div class="field"><span>Logo</span><button class="btn" type="button" data-action="toast" data-title="Upload logo" data-msg="PNG or SVG, at least 128 × 128 px. Not stored in this mock.">${icon('upload')}Upload Logo</button><span class="help">Square PNG or SVG, at least 128 × 128 px.</span></div>
          <label class="field full"><span>Sign-in page message</span><input class="input" name="loginMessage" maxlength="140" value="${esc(b.loginMessage)}" placeholder="e.g. Authorized Helios Solar personnel only."><span class="help">Shown under the sign-in form. Up to 140 characters.</span></label>
        </div>${saveBar('Save Logo & Sign-in Message')}</form></section>`,
      after: main => {
        // Theme and colour apply and save as soon as they're picked: no hidden preview that reverts when you leave.
        main.querySelectorAll('[name="palette"], [name="theme"]').forEach(r => r.addEventListener('change', () => {
          b[r.name] = r.value; Q.save(); Q.applyBranding();
          const label = r.name === 'theme' ? `${Q.THEMES?.[r.value]?.name || r.value} theme` : `${Q.PALETTES[r.value].name} colours`;
          Q.audit('Settings', `changed branding to the ${label}`); Q.toast(`${label} applied`, 'Saved for everyone in the organization. Pick another option to switch back.');
        }));
        onSubmit(main, '#brandForm', v => {
          Object.assign(b, { theme: v.theme || b.theme, palette: v.palette, initials: v.initials.trim().toUpperCase(), loginMessage: v.loginMessage.trim() });
          Q.S.organization.initials = b.initials; Q.save(); Q.applyBranding(); Q.renderSidebar(); Q.audit('Settings', `changed branding (${Q.THEMES?.[b.theme]?.name || 'Classic'} theme, ${Q.PALETTES[v.palette].name})`); Q.toast('Branding saved', `${Q.THEMES?.[b.theme]?.name || 'Classic'} theme · ${Q.PALETTES[v.palette].name}`);
        });
      } };
  };

  /* =================== Security =================== */
  const SESSIONS = () => [
    ['maria', 'Chrome on Windows', 'Makati City, PH', '203.177.12.40', 'Active now', true],
    ['maria', 'Safari on iPhone', 'Quezon City, PH', '112.198.40.21', `${Q.fmt(daysAgo(1))} 19:42`, false],
    ['aaron', 'Edge on Windows', 'Makati City, PH', '203.177.12.18', `${Q.fmt(daysAgo(1))} 17:40`, false],
    ['nina', 'Chrome on macOS', 'Pasig City, PH', '112.198.40.7', `${Q.fmt(daysAgo(3))} 10:15`, false]
  ].filter(x => !(Q.UI.revoked || []).includes(x[3])).map(([who, dev, loc, ip, last, cur]) => ({ id: ip, who, dev, loc, ip, last, cur }));
  V.security = () => {
    const s = S().security;
    const sessions = Q.table({ id: 'sessions', rows: SESSIONS, noun: 'sessions', caption: 'Active sessions', foot: false, columns: [
      { key: 'who', label: 'User', render: r => `<span class="title">${Q.who(r.who)}</span><span class="sub">${esc(r.dev)}</span>` },
      { key: 'loc', label: 'Location', render: r => `${esc(r.loc)}<span class="sub tnum">${esc(r.ip)}</span>` },
      { key: 'last', label: 'Last active', render: r => r.cur ? Q.st('This session', 'success') : esc(r.last) },
      { key: 'act', label: 'Actions', cls: 'c-actions', render: r => r.cur ? '<span class="muted small">Current</span>' : `<button class="btn sm danger" type="button" data-revoke="${esc(r.ip)}">Sign Out</button>` }] });
    return { html: section('Security', 'Sign-in rules for everyone in the organization.') +
      `<form id="secForm">
      ${panel('Two-step verification', `<div class="radio-stack" style="margin-top:0">${[['off', 'Optional', 'People can turn it on for themselves in My Profile.'], ['admins', 'Required for administrators and approvers', 'Recommended minimum. Covers everyone who can change access or approve documents.'], ['all', 'Required for everyone', 'Strongest protection. People set it up the next time they sign in.']].map(([v, t, h]) => `<label class="radio"><input type="radio" name="mfa" value="${v}" ${s.mfa === v ? 'checked' : ''}><span><b>${t}</b><span>${h}</span></span></label>`).join('')}</div>`)}
      ${panel('Single sign-on', `<div class="sso-row"><span class="ic">${icon('key-round')}</span><div class="i-main"><b>Microsoft Entra ID</b><span>${s.sso.status === 'Configured' ? `Configured for <b>${esc(s.sso.domain)}</b>${s.sso.enforce ? ' · password sign-in turned off' : ' · password sign-in still allowed'}` : 'Let people sign in with their Microsoft 365 work account.'}</span></div>${Q.st(s.sso.status, s.sso.status === 'Configured' ? 'success' : 'neutral')}<button class="btn sm" type="button" data-sso>${s.sso.status === 'Configured' ? 'Edit' : 'Set Up'}</button></div>`)}
      ${panel('Passwords and sessions', `<div class="form-grid">
        <label class="field"><span>Minimum password length</span><select class="select" name="minLength">${options(['8', '10', '12', '14', '16'].map(n => [n, `${n} characters`]), s.minLength)}</select></label>
        <label class="field"><span>Password expiry</span><select class="select" name="expiry">${options(['Never', '90 days', '180 days', '1 year'], s.expiry)}</select><span class="help">“Never” with two-step verification follows current guidance.</span></label>
        <label class="field"><span>Lock account after</span><select class="select" name="lockout">${options(['3', '5', '10'].map(n => [n, `${n} failed attempts`]), s.lockout)}</select><span class="help">Locked for 15 minutes; an administrator can unlock sooner.</span></label>
        <label class="field"><span>Sign out after inactivity</span><select class="select" name="idle">${options([['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour'], ['240', '4 hours']], s.idle)}</select></label>
        <label class="field"><span>Maximum session length</span><select class="select" name="maxSession">${options(['8 hours', '12 hours', '24 hours', '7 days'], s.maxSession)}</select></label>
        <div class="field full">${toggle('complexity', s.complexity, 'Block common and breached passwords', 'Checks new passwords against a list of known leaked passwords.')}</div></div>`)}
      ${panel('IP allowlist', `${toggle('ipEnabled', s.ipEnabled, 'Only allow sign-in from these networks', 'Administrators can always sign in, so nobody is locked out by mistake.')}
        <label class="field" style="margin-top:12px"><span>Allowed addresses</span><textarea class="textarea tnum" name="ipList" placeholder="203.177.12.0/24&#10;112.198.40.7">${esc(s.ipList)}</textarea><span class="help">One IPv4 address or CIDR range per line.</span></label><p class="small" id="ipErr" role="alert" style="color:var(--danger)"></p>`)}
      <div class="form-actions sticky"><button class="btn primary" type="submit">Save Security Settings</button></div></form>
      ${panel('Active sessions', sessions, { sub: 'People signed in right now and on recent devices', pad: false })}`,
      after: main => {
        main.querySelector('[data-sso]').addEventListener('click', ssoModal);
        main.addEventListener('click', e => { const b = e.target.closest('[data-revoke]'); if (!b) return; Q.UI.revoked = [...(Q.UI.revoked || []), b.dataset.revoke]; Q.saveUI(); Q.audit('Security', `signed out a session from ${b.dataset.revoke}`); Q.render({ noFocus: true }); Q.toast('Session signed out'); });
        onSubmit(main, '#secForm', (v, f) => {
          const bad = (v.ipList || '').split('\n').map(x => x.trim()).filter(Boolean).filter(x => !/^(\d{1,3}\.){3}\d{1,3}(\/(\d|[12]\d|3[0-2]))?$/.test(x) || x.split('/')[0].split('.').some(n => +n > 255));
          const err = f.querySelector('#ipErr'); err.textContent = bad.length ? `Not a valid IPv4 address or range: ${bad.join(', ')}` : '';
          if (bad.length) return;
          if (v.ipEnabled && !v.ipList.trim()) { err.textContent = 'Add at least one address, or turn the allowlist off.'; return; }
          Object.assign(s, { mfa: v.mfa, minLength: v.minLength, expiry: v.expiry, lockout: v.lockout, idle: v.idle, maxSession: v.maxSession, complexity: !!v.complexity, ipEnabled: !!v.ipEnabled, ipList: v.ipList.trim() });
          Q.save(); Q.audit('Security', `updated security settings (two-step: ${v.mfa}, idle sign-out ${v.idle} min)`); Q.toast('Security settings saved');
        });
      } };
  };
  function ssoModal() {
    const s = S().security.sso;
    const m = Q.openModal({ size: 'm', title: 'Microsoft Entra ID single sign-on', sub: 'An administrator of your Microsoft 365 tenant approves iQMS once. iQMS receives the person’s name and work email only.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field full"><span>Email domain <span class="req">*</span></span><input class="input" name="domain" required placeholder="heliossolar.example" value="${esc(s.domain || 'heliossolar.example')}"><span class="help">People with this email domain are sent to Microsoft to sign in.</span></label>
        <div class="field full">${toggle('enforce', s.enforce, 'Turn off password sign-in for this domain', 'Keep at least one administrator with a password as a break-glass account.')}</div></div></form>`,
      foot: `${s.status === 'Configured' ? '<button class="btn danger" type="button" data-off style="margin-right:auto">Remove SSO</button>' : ''}<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>` });
    m.querySelector('[data-off]')?.addEventListener('click', () => { Object.assign(s, { status: 'Not configured', domain: '', enforce: false }); Q.save(); Q.audit('Security', 'removed Microsoft Entra ID single sign-on'); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Single sign-on removed'); });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
      Object.assign(s, { status: 'Configured', domain: v.domain.trim(), enforce: !!v.enforce }); Q.save(); Q.audit('Security', `configured Microsoft Entra ID single sign-on for ${v.domain.trim()}`);
      Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Single sign-on configured', v.domain.trim());
    });
  }

  /* =================== Notifications =================== */
  const EVENTS = [['assigned', 'A review, approval or publication is assigned to me'], ['dueSoon', 'A document I own is coming due for review'], ['overdue', 'A document I own is overdue for review'], ['caAssigned', 'A corrective action is assigned to me'], ['caOverdue', 'A corrective action I own is overdue'], ['riskHigh', 'A risk in my process is rated High'], ['kpiBelow', 'A KPI in my process falls below target'], ['mention', 'Someone mentions me in a comment'], ['weekly', 'Weekly summary of my processes']];
  V.notifications = () => {
    const n = S().notifications;
    return { html: section('Notifications', 'Organization defaults. Each person can turn off what they don’t need in My Profile, except assignments.') +
      `<form id="notForm"><section class="panel"><div class="table-scroll"><table class="dt notif-matrix"><caption class="sr-only">Notification defaults</caption><thead><tr><th scope="col">When</th><th scope="col" class="c-ch">In iQMS</th><th scope="col" class="c-ch">Email</th></tr></thead><tbody>
        ${EVENTS.map(([k, l]) => `<tr><th scope="row">${esc(l)}</th>${['app', 'email'].map(ch => `<td class="c-ch"><input type="checkbox" class="row-check" name="${k}.${ch}" aria-label="${esc(l)}: ${ch === 'app' ? 'in iQMS' : 'email'}" ${n.events[k]?.includes(ch) ? 'checked' : ''} ${k === 'assigned' && ch === 'app' ? 'disabled' : ''}></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
        ${panel('Reminders', `<div class="form-grid"><fieldset class="field"><legend class="lg">Remind owners before a review is due</legend><div class="chk-row">${['60', '30', '14', '7', '1'].map(d => `<label class="checkbox"><input type="checkbox" name="lead.${d}" ${n.leadDays.includes(d) ? 'checked' : ''}>${d} day${d === '1' ? '' : 's'}</label>`).join('')}</div></fieldset>
          <label class="field"><span>Email digest</span><select class="select" name="digest">${options(['Off — send each email separately', 'Daily at 8:00 AM', 'Weekdays at 8:00 AM'], n.digest)}</select><span class="help">Groups non-urgent emails. Assignments are always sent at once.</span></label></div>`)}
        <div class="form-actions"><button class="btn primary" type="submit">Save Changes</button></div></form>`,
      after: main => main.querySelector('#notForm').addEventListener('submit', e => {
        e.preventDefault(); const f = e.target;
        EVENTS.forEach(([k]) => { n.events[k] = ['app', 'email'].filter(ch => f.querySelector(`[name="${k}.${ch}"]`).checked || (k === 'assigned' && ch === 'app')); });
        n.leadDays = ['60', '30', '14', '7', '1'].filter(d => f.querySelector(`[name="lead.${d}"]`).checked); n.digest = f.querySelector('[name="digest"]').value;
        Q.save(); Q.audit('Settings', 'changed notification defaults'); Q.toast('Notification defaults saved');
      }) };
  };

  /* =================== API & Webhooks =================== */
  const apiState = () => {
    const a = S().api;
    if (!a.keys) a.keys = [{ id: 'k1', name: 'Power BI reporting', prefix: 'iqms_live_7Hq2', scopes: 'Read only', created: daysAgo(64), last: daysAgo(0), by: 'aaron' }];
    if (!a.webhooks) a.webhooks = [{ id: 'w1', url: 'https://hooks.heliossolar.example/iqms', events: 'Document published, Corrective action overdue', status: 'Active', last: `${daysAgo(1)} 16:02 · 200 OK` }];
    return a;
  };
  V.api = () => {
    const a = apiState();
    const keys = Q.table({ id: 'apikeys', rows: () => a.keys, noun: 'keys', caption: 'API keys', foot: false, empty: '<h3>No API keys</h3><p>Create a key to connect reporting tools or scripts.</p>', columns: [
      { key: 'name', label: 'Name', render: k => `<span class="title">${esc(k.name)}</span><span class="sub tnum">${esc(k.prefix)}••••••••</span>` },
      { key: 'scopes', label: 'Access', render: k => esc(k.scopes) },
      { key: 'created', label: 'Created', cls: 'c-date', render: k => `${Q.fmt(k.created)}<span class="sub">${esc(Q.pname(k.by))}</span>` },
      { key: 'last', label: 'Last used', cls: 'c-date', render: k => k.last ? Q.fmt(k.last) : '<span class="muted">Never</span>' },
      { key: 'act', label: 'Actions', cls: 'c-actions', render: k => `<button class="btn sm danger" type="button" data-revoke-key="${k.id}">Revoke</button>` }] });
    const hooks = Q.table({ id: 'webhooks', rows: () => a.webhooks, noun: 'webhooks', caption: 'Webhooks', foot: false, empty: '<h3>No webhooks</h3><p>Send events to another system when something changes in iQMS.</p>', columns: [
      { key: 'url', label: 'Endpoint', render: w => `<span class="title tnum" style="overflow-wrap:anywhere">${esc(w.url)}</span><span class="sub">${esc(w.events)}</span>` },
      { key: 'status', label: 'Status', render: w => Q.st(w.status, w.status === 'Active' ? 'success' : 'muted') },
      { key: 'last', label: 'Last delivery', render: w => `<span class="small">${esc(w.last || '—')}</span>` },
      { key: 'act', label: 'Actions', cls: 'c-actions', render: w => `<button class="btn sm danger" type="button" data-del-hook="${w.id}">Delete</button>` }] });
    return { html: section('API & Webhooks', 'Connect reporting tools and other systems. Keys act with the access of the person who created them.') +
      panel('API keys', keys, { pad: false, actions: `<button class="btn sm primary" type="button" data-new-key>${icon('plus')}Create API Key</button>` }) +
      panel('Webhooks', hooks, { pad: false, actions: `<button class="btn sm" type="button" data-new-hook>${icon('plus')}Add Webhook</button>` }) +
      `<p class="small muted section">API documentation and rate limits are listed in the developer guide. Keys are shown once when created; iQMS stores only a hash.</p>`,
      after: main => {
        main.querySelector('[data-new-key]').addEventListener('click', () => {
          const m = Q.openModal({ size: 'm', title: 'Create API key', body: `<form class="modal-body"><div class="form-grid">
            <label class="field full"><span>Name <span class="req">*</span></span><input class="input" name="name" required autofocus placeholder="e.g. Power BI reporting"></label>
            <label class="field full"><span>Access</span><select class="select" name="scopes">${options(['Read only', 'Read and write'], 'Read only')}</select><span class="help">Never more than your own access.</span></label></div></form>`,
            foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Create Key</button>` });
          m.querySelector('[data-ok]').addEventListener('click', () => {
            const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
            const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 57]).join('');
            const key = `iqms_live_${rnd(4)}${rnd(28)}`;
            a.keys.push({ id: Q.uid('k'), name: v.name.trim(), prefix: key.slice(0, 14), scopes: v.scopes, created: today(), last: null, by: Q.me() }); Q.save(); Q.audit('API', `created API key “${v.name.trim()}” (${v.scopes})`);
            Q.closeAllModals(); Q.render({ noFocus: true });
            const r = Q.openModal({ size: 'm', title: 'Copy your API key', body: `<div class="modal-body"><div class="callout warning">${icon('triangle-alert')}<span>This is the only time the full key is shown. Store it in a password manager or your tool’s secret store.</span></div><div class="key-box"><code id="newKey">${esc(key)}</code><button class="btn sm" type="button" data-copy>${icon('copy')}Copy</button></div></div>`, foot: '<button class="btn primary" type="button" data-close>Done</button>' });
            r.querySelector('[data-copy]').addEventListener('click', () => { navigator.clipboard?.writeText(key).then(() => Q.toast('Copied'), () => Q.toast('Copy failed', 'Select the key and copy it manually.')); });
          });
        });
        main.querySelector('[data-new-hook]').addEventListener('click', () => {
          const ev = ['Document published', 'Review assigned', 'Corrective action created', 'Corrective action overdue', 'Risk rated High', 'Audit finding raised'];
          const m = Q.openModal({ size: 'm', title: 'Add webhook', body: `<form class="modal-body"><div class="form-grid">
            <label class="field full"><span>Endpoint URL <span class="req">*</span></span><input class="input" name="url" type="url" required autofocus placeholder="https://"><span class="help">HTTPS only. Each delivery is signed so you can verify it came from iQMS.</span></label>
            <fieldset class="field full"><legend class="lg">Events</legend><div class="chk-row">${ev.map((x, i) => `<label class="checkbox"><input type="checkbox" name="ev${i}" value="${esc(x)}" ${i === 0 ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div></fieldset></div></form>`,
            foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Add Webhook</button>` });
          m.querySelector('[data-ok]').addEventListener('click', () => {
            const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f);
            if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(v.url.trim())) { Q.toast('Use an HTTPS address', 'For example https://hooks.example.com/iqms'); return; }
            const events = Object.entries(v).filter(([k]) => k.startsWith('ev')).map(([, x]) => x); if (!events.length) { Q.toast('Choose at least one event'); return; }
            a.webhooks.push({ id: Q.uid('w'), url: v.url.trim(), events: events.join(', '), status: 'Active', last: null }); Q.save(); Q.audit('API', `added webhook ${v.url.trim()}`);
            Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Webhook added');
          });
        });
        main.addEventListener('click', e => {
          const k = e.target.closest('[data-revoke-key]'), w = e.target.closest('[data-del-hook]');
          if (k) { const key = a.keys.find(x => x.id === k.dataset.revokeKey); Q.confirm({ title: `Revoke “${esc(key.name)}”?`, danger: true, confirm: 'Revoke Key', body: '<p>Anything using this key stops working immediately. This cannot be undone.</p>', onConfirm: () => { a.keys = a.keys.filter(x => x !== key); Q.save(); Q.audit('API', `revoked API key “${key.name}”`); Q.render({ noFocus: true }); Q.toast('Key revoked'); } }); }
          if (w) { const h = a.webhooks.find(x => x.id === w.dataset.delHook); Q.confirm({ title: 'Delete webhook?', danger: true, confirm: 'Delete', body: `<p>${esc(h.url)} will stop receiving events.</p>`, onConfirm: () => { a.webhooks = a.webhooks.filter(x => x !== h); Q.save(); Q.audit('API', `deleted webhook ${h.url}`); Q.render({ noFocus: true }); Q.toast('Webhook deleted'); } }); }
        });
      } };
  };

  /* =================== Data Privacy (Republic Act 10173 — Data Privacy Act of 2012) =================== */
  const CHECKS = [
    ['dpo', 'Data Protection Officer designated', 'The organization names a DPO who is accountable for compliance and is the contact for the NPC and data subjects.'],
    ['notice', 'Privacy notice published to users', 'People are told what is collected, why, how long it is kept and how to exercise their rights before or when it is collected.'],
    ['agreement', 'Data processing agreement with the iQMS provider', 'iQMS processes personal data on your instructions (you are the personal information controller, the provider is a personal information processor). The agreement sets the security measures and sub-processors.'],
    ['pia', 'Privacy impact assessment for the QMS', 'Assesses the risks of the processing described on this page and the controls in place.'],
    ['register', 'Registration with the National Privacy Commission', 'Required when the organization meets the NPC’s registration thresholds. Confirm with your DPO whether it applies.'],
    ['breachPlan', 'Personal data breach response plan', 'Who assesses a breach, and how the NPC and affected people are notified within 72 hours when notification is required.'],
    ['retention', 'Retention schedule set', 'Personal data is kept only as long as needed for its purpose, then deleted or anonymized (below).'],
    ['training', 'Privacy awareness for staff who use iQMS', 'People who handle incident, competence or customer records know what personal data they may record.']
  ];
  const CHECK_KIND = { Done: 'success', 'In progress': 'info', 'To confirm': 'warning', 'Not started': 'neutral', 'Not applicable': 'muted' };
  const INVENTORY = [
    ['User accounts', 'Name, work email, job title, department, role, profile initials', 'Employees and contractors who use iQMS', 'Sign-in, assigning reviews and actions, showing who did what', 'Contract / legitimate interest', 'iQMS database', 'Administrators; names are visible to all users', 'accounts', false],
    ['Sign-in and audit log', 'Sign-in times, IP address, device and browser, actions taken', 'Users', 'Security, accountability and document-control traceability (ISO 9001 7.5)', 'Legitimate interest / legal obligation', 'iQMS database', 'Administrators, QMS Manager', 'audit', false],
    ['Document and workflow records', 'Names of owners, reviewers and approvers, comments, dates', 'Users', 'Controlled documents and approval history', 'Legitimate interest', 'iQMS database and uploaded files', 'Anyone with access to the process', 'records', false],
    ['Competence and training evidence', 'Training attendance, licences, competence assessments', 'Employees', 'Evidence of competence (ISO 9001 7.2)', 'Legitimate interest / legal obligation', 'Link to HRIS or uploaded file', '10 People & Competence process; auditors', 'records', false],
    ['Incident and nonconformity records', 'Description of events; may include injury or health details', 'Employees, customers, contractors', 'Corrective action and safety follow-up (ISO 9001 10.2)', 'Legal obligation (occupational safety)', 'iQMS database', 'Process owner, QMS Manager', 'incidents', true],
    ['Customer feedback and complaints', 'Customer name, contact details, site address, complaint text', 'Customers', 'Complaint handling and satisfaction monitoring (ISO 9001 9.1.2)', 'Contract / legitimate interest', 'Link to CRM; summary in iQMS', '02 Sales & Customer, 09 Handover & After-Sales', 'customers', false],
    ['Data subject requests', 'Requester name and contact, request details, response', 'Anyone who makes a request', 'Responding to privacy rights requests', 'Legal obligation', 'iQMS database', 'Data Protection Officer', 'dsr', false]
  ];
  const RETENTION = [['accounts', 'User accounts'], ['audit', 'Sign-in and audit log'], ['records', 'Document and workflow records'], ['incidents', 'Incident and nonconformity records'], ['customers', 'Customer feedback and complaints'], ['dsr', 'Data subject requests']];
  const RET_OPTS = ['6 months after deactivation', '1 year after deactivation', '1 year', '3 years', '5 years', '7 years', '10 years', '3 years after last transaction', 'Per document control (7.5)'];
  const ACCESS = () => {
    const m = Q.S.integrations.find(i => i.id === 'm365');
    return [
      ['cloud', 'Microsoft 365 (SharePoint)', m?.status === 'Connected' ? 'Connected' : 'Not connected', 'Checks that Confidential document links point to the approved site and library. Does not open, copy or read those files. Reads no mailboxes, calendars or Teams chats.', 'Selected site only'],
      ['upload', 'Uploaded files (Public and Internal documents)', 'Active', 'Stored in iQMS, shown in the document viewer and read for the ISO 9001 readiness assessment.', 'Your organization only'],
      ['handshake', 'CRM, ERP and HRIS', 'Manual references', 'No live connection. People record a reference (record ID or link) as evidence; iQMS does not fetch the record.', 'None'],
      ['users', 'iQMS support staff', S().privacy.supportAccess ? 'Allowed' : 'Off', S().privacy.supportAccess ? `Support can view this workspace read-only until ${Q.fmt(S().privacy.supportUntil)}. Every view is in the audit log.` : 'Support cannot see your data unless an administrator allows it, for a limited time.', 'Only when you allow it']
    ];
  };
  const SUBPROCESSORS = [['Cloud hosting and database', 'Hosting, storage and encrypted backups', 'Singapore'], ['Transactional email', 'Sends notification and sign-in emails', 'Singapore'], ['Payment processing', 'Charges subscription fees; card details never reach iQMS', 'Philippines'], ['Error monitoring', 'Technical error reports with personal data removed', 'Singapore']];
  const privacyReqs = () => {
    const p = S().privacy;
    if (!p.requests) p.requests = [
      { id: 'DSR-2026-003', type: 'Correction', who: 'Jun Bautista (employee)', received: daysAgo(4), due: Q.addDays(daysAgo(4), 30), status: 'Open', note: 'Wrong job title on training records.' },
      { id: 'DSR-2026-002', type: 'Access', who: 'Customer — L. Reyes', received: daysAgo(38), due: Q.addDays(daysAgo(38), 30), status: 'Closed', note: 'Complaint record and call notes provided.' }
    ];
    return p.requests;
  };
  V.privacy = () => {
    const p = S().privacy, reqs = privacyReqs();
    const done = CHECKS.filter(([k]) => p.checks[k] === 'Done').length;
    const checks = `<ul class="check-list">${CHECKS.map(([k, t, h]) => `<li><span class="ci">${icon(p.checks[k] === 'Done' ? 'circle-check' : p.checks[k] === 'To confirm' ? 'circle-help' : 'circle-dot-dashed')}</span><div class="i-main"><b>${esc(t)}</b><span>${esc(h)}</span></div><label><span class="sr-only">Status of ${esc(t)}</span><select class="select" data-check="${k}">${options(Object.keys(CHECK_KIND), p.checks[k])}</select></label></li>`).join('')}</ul>`;
    const inv = `<div class="table-scroll"><table class="dt inv-table"><caption class="sr-only">Personal data processed in iQMS</caption><thead><tr><th scope="col">Data</th><th scope="col">Whose</th><th scope="col">Why</th><th scope="col">Basis</th><th scope="col">Where</th><th scope="col">Who can see it</th><th scope="col">Kept for</th></tr></thead><tbody>
      ${INVENTORY.map(([cat, ex, whose, why, basis, where, who, ret, sensitive]) => `<tr><td><span class="title">${esc(cat)}</span>${sensitive ? ` <span class="tag warn-tag" title="May contain sensitive personal information">${icon('triangle-alert')}Sensitive</span>` : ''}<span class="sub">${esc(ex)}</span></td><td>${esc(whose)}</td><td>${esc(why)}</td><td>${esc(basis)}</td><td>${esc(where)}</td><td>${esc(who)}</td><td class="nowrap">${esc(p.retention[ret])}</td></tr>`).join('')}</tbody></table></div>
      <div class="panel-pad small muted inv-foot"><b>Not collected:</b> government ID numbers (TIN, SSS, PhilHealth, passport), payment card details, or the contents of Confidential and Highly Confidential documents.</div>`;
    const access = `<ul class="integration-list">${ACCESS().map(([ic, name, st, what, scope]) => `<li><span class="ic">${icon(ic)}</span><div class="i-main"><b>${esc(name)}</b><span>${esc(what)}</span><span>Scope: ${esc(scope)}</span></div>${Q.st(st, { Connected: 'success', Active: 'success', Allowed: 'warning', Off: 'neutral', 'Manual references': 'neutral', 'Not connected': 'muted' }[st])}</li>`).join('')}</ul>
      <div class="panel-pad support-row">${icon('users')}<div class="i-main"><b>Allow iQMS support to view this workspace</b><span>Read-only, for 7 days, for troubleshooting. Turn it off at any time.</span></div><button class="btn sm${p.supportAccess ? ' danger' : ''}" type="button" data-support>${p.supportAccess ? 'Turn Off' : 'Allow for 7 Days'}</button></div>`;
    const sub = `<div class="table-scroll"><table class="dt"><caption class="sr-only">Sub-processors</caption><thead><tr><th scope="col">Service</th><th scope="col">Purpose</th><th scope="col">Data location</th></tr></thead><tbody>${SUBPROCESSORS.map(([a, b, c]) => `<tr><td class="title">${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div><div class="panel-pad small muted">Names of the providers are listed in the data processing agreement. You are told 30 days before a sub-processor is added.</div>`;
    const dsr = Q.table({ id: 'dsr', rows: privacyReqs, noun: 'requests', caption: 'Data subject requests', foot: false, empty: '<h3>No requests yet</h3><p>Log a request when someone asks to see, correct, delete or take a copy of their data.</p>', columns: [
      { key: 'id', label: 'ID', cls: 'c-id', sort: r => r.id, render: r => esc(r.id) },
      { key: 'type', label: 'Request', sort: r => r.type, render: r => `<span class="title">${esc(r.type)}</span><span class="sub">${esc(r.who)}</span>` },
      { key: 'received', label: 'Received', cls: 'c-date', sort: r => r.received, render: r => Q.fmt(r.received) },
      { key: 'due', label: 'Respond by', cls: 'c-date', sort: r => r.due, render: r => Q.dueDate(r.due, r.status === 'Closed') },
      { key: 'status', label: 'Status', sort: r => r.status, render: r => Q.st(r.status, r.status === 'Closed' ? 'success' : 'info') },
      { key: 'act', label: 'Actions', cls: 'c-actions', render: r => r.status === 'Closed' ? '<span class="muted small">Closed</span>' : `<button class="btn sm" type="button" data-close-dsr="${r.id}">Mark Closed</button>` }] });
    const breaches = p.breaches.length ? `<ul class="worklist">${p.breaches.map(b => { const left = Math.round((new Date(b.deadline) - Date.now()) / 36e5); return `<li><span class="w-kind">${icon('shield-alert')}</span><div class="w-main"><div class="w-title">${esc(b.id)} · ${esc(b.summary)}</div><div class="w-meta">Discovered ${esc(b.found.replace('T', ' '))} · about ${esc(b.count)} people · ${esc(b.data)}</div></div>${b.status === 'Closed' ? Q.st('Closed', 'success') : `<span class="${left < 24 ? 'date-overdue' : 'date-soon'} nowrap">${left > 0 ? `${left} h left to notify` : 'Notification deadline passed'}</span>`}</li>`; }).join('')}</ul>` : '<div class="empty small">No personal data breaches recorded.</div>';
    const ret = `<div class="form-grid">${RETENTION.map(([k, l]) => `<label class="field"><span>${esc(l)}</span><select class="select" data-ret="${k}">${options([...new Set([p.retention[k], ...RET_OPTS])], p.retention[k])}</select></label>`).join('')}</div>
      <p class="small muted" style="margin-top:12px">At the end of the period records are anonymized (names replaced with “Former user” or “Customer”), so audit history and statistics stay intact. Controlled documents follow their own retention under document control.</p>`;
    return { html: section('Data Privacy', 'How iQMS handles personal data, and how your organization complies with the Philippine Data Privacy Act of 2012 (Republic Act 10173).',
        `<button class="btn" type="button" data-notice>${icon('file-text')}Privacy Notice</button><button class="btn danger" type="button" data-breach>${icon('shield-alert')}Report a Breach</button>`) +
      `<div class="privacy-summary panel"><div><div class="ps-n">${done}<small>/${CHECKS.length}</small></div><div class="small muted">compliance steps done</div></div>
        <div class="ps-roles"><div><span class="muted small">Personal information controller</span><b>${esc(Q.S.organization.name)}</b></div><div><span class="muted small">Personal information processor</span><b>iQMS (service provider)</b></div><div><span class="muted small">Data Protection Officer</span><b>${esc(p.dpo.name)}</b><a href="mailto:${esc(p.dpo.email)}" class="small">${esc(p.dpo.email)}</a></div></div></div>` +
      panel('Compliance checklist', checks, { pad: false, sub: 'Set the status of each step. Your DPO owns this list.' }) +
      panel('Personal data in iQMS', inv, { pad: false, sub: 'What is collected, why, and how long it is kept' }) +
      panel('Data access iQMS performs', access, { pad: false, sub: 'Every system iQMS reads from, and what it reads' }) +
      panel('Sub-processors', sub, { pad: false, sub: 'Services the iQMS provider uses to run the platform' }) +
      panel('Data subject requests', dsr, { pad: false, sub: 'Right to be informed, to access, to object, to correct, to erase or block, and to data portability', actions: `<button class="btn sm primary" type="button" data-new-dsr>${icon('plus')}Log Request</button>` }) +
      panel('Personal data breaches', `${breaches}<div class="panel-pad small muted" style="border-top:1px solid var(--border)">When a breach involves sensitive personal information or information that could enable identity fraud, and is likely to cause real risk of serious harm, the NPC and the affected people must be notified within 72 hours of knowing about it.</div>`, { pad: false }) +
      panel('Retention schedule', ret, { actions: '<button class="btn sm primary" type="button" data-save-ret>Save Schedule</button>' }) +
      panel('Data Protection Officer', `<form id="dpoForm"><div class="form-grid">
        <label class="field"><span>Name <span class="req">*</span></span><input class="input" name="name" required value="${esc(p.dpo.name)}"></label>
        <label class="field"><span>Email <span class="req">*</span></span><input class="input" type="email" name="email" required value="${esc(p.dpo.email)}"><span class="help">Shown in the privacy notice. Use a role address that outlives one person.</span></label>
        <label class="field"><span>Phone</span><input class="input" name="phone" value="${esc(p.dpo.phone)}"></label></div>${saveBar('Save DPO Details')}</form>`) +
      `<div class="callout section">${icon('info')}<span class="small">This page helps you organize compliance; it is not legal advice. Have your Data Protection Officer or counsel confirm what applies to your organization, including NPC registration and the content of your privacy notice.</span></div>`,
      after: main => {
        main.querySelectorAll('[data-check]').forEach(sel => sel.addEventListener('change', () => { p.checks[sel.dataset.check] = sel.value; Q.save(); Q.audit('Privacy', `set “${CHECKS.find(c => c[0] === sel.dataset.check)[1]}” to ${sel.value}`); Q.render({ noFocus: true }); }));
        main.querySelector('[data-save-ret]').addEventListener('click', () => { main.querySelectorAll('[data-ret]').forEach(s => { p.retention[s.dataset.ret] = s.value; }); Q.save(); Q.audit('Privacy', 'updated the retention schedule'); Q.render({ noFocus: true }); Q.toast('Retention schedule saved'); });
        main.querySelector('[data-support]').addEventListener('click', () => {
          if (p.supportAccess) { p.supportAccess = false; p.supportUntil = null; Q.save(); Q.audit('Privacy', 'turned off iQMS support access'); Q.render({ noFocus: true }); Q.toast('Support access turned off'); return; }
          Q.confirm({ title: 'Allow support access for 7 days?', confirm: 'Allow Access', body: '<p>iQMS support staff can view this workspace read-only, including personal data, until access ends or you turn it off. Each view is recorded in the audit log.</p>',
            onConfirm: () => { p.supportAccess = true; p.supportUntil = Q.addDays(today(), 7); Q.save(); Q.audit('Privacy', `allowed iQMS support access until ${p.supportUntil}`); Q.render({ noFocus: true }); Q.toast('Support access allowed', `Ends ${Q.fmt(p.supportUntil)}`); } });
        });
        onSubmit(main, '#dpoForm', v => { Object.assign(p.dpo, { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() }); Q.save(); Q.audit('Privacy', 'updated Data Protection Officer details'); Q.render({ noFocus: true }); Q.toast('DPO details saved'); });
        main.querySelector('[data-notice]').addEventListener('click', Q.showPrivacyNotice);
        main.querySelector('[data-breach]').addEventListener('click', breachModal);
        main.querySelector('[data-new-dsr]').addEventListener('click', dsrModal);
        main.addEventListener('click', e => { const b = e.target.closest('[data-close-dsr]'); if (!b) return; const r = privacyReqs().find(x => x.id === b.dataset.closeDsr); r.status = 'Closed'; Q.save(); Q.audit('Privacy', `closed data subject request ${r.id} (${r.type.toLowerCase()})`); Q.render({ noFocus: true }); Q.toast('Request closed', r.id); });
      } };
  };
  function dsrModal() {
    const types = ['Access — a copy of their data', 'Correction', 'Erasure or blocking', 'Objection to processing', 'Data portability', 'Information about processing'];
    const m = Q.openModal({ size: 'm', title: 'Log data subject request', sub: 'Verify the person’s identity before you release or change any data.',
      body: `<form class="modal-body"><div class="form-grid">
        <label class="field"><span>Request type <span class="req">*</span></span><select class="select" name="type" required>${options(types, types[0])}</select></label>
        <label class="field"><span>Received <span class="req">*</span></span><input class="input" type="date" name="received" required value="${today()}"></label>
        <label class="field full"><span>Who made the request <span class="req">*</span></span><input class="input" name="who" required placeholder="Name and relationship, e.g. Ana Cruz (employee)"></label>
        <label class="field"><span>Respond within</span><select class="select" name="days">${options([['15', '15 days'], ['30', '30 days']], '30')}</select><span class="help">Your internal target. Respond without undue delay.</span></label>
        <label class="field full"><span>Details</span><textarea class="textarea" name="note" placeholder="What they asked for"></textarea></label></div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Log Request</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), list = privacyReqs();
      const n = Math.max(0, ...list.map(r => +r.id.split('-').pop())) + 1, id = `DSR-${today().slice(0, 4)}-${String(n).padStart(3, '0')}`;
      list.unshift({ id, type: v.type.split(' — ')[0], who: v.who.trim(), received: v.received, due: Q.addDays(v.received, +v.days), status: 'Open', note: v.note });
      Q.save(); Q.audit('Privacy', `logged data subject request ${id}`); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Request logged', `${id} · respond by ${Q.fmt(Q.addDays(v.received, +v.days))}`);
    });
  }
  function breachModal() {
    const now = `${today()}T${new Date().toTimeString().slice(0, 5)}`;
    const m = Q.openModal({ size: 'l', title: 'Report a personal data breach', sub: 'Record what you know now. You can add details later. The DPO is notified at once.',
      body: `<form class="modal-body"><div class="callout danger">${icon('timer')}<span><b>72-hour window</b>If notification is required, the National Privacy Commission and the affected people must be told within 72 hours of the organization knowing about the breach.</span></div>
        <div class="form-grid" style="margin-top:16px">
        <label class="field"><span>When was it discovered? <span class="req">*</span></span><input class="input" type="datetime-local" name="found" required value="${now}"></label>
        <label class="field"><span>About how many people are affected? <span class="req">*</span></span><input class="input" type="number" min="1" name="count" required></label>
        <label class="field full"><span>What happened? <span class="req">*</span></span><input class="input" name="summary" required placeholder="e.g. Training records emailed to the wrong recipient"></label>
        <fieldset class="field full"><legend class="lg">What data is involved?</legend><div class="chk-row">${['Names and contact details', 'Health or injury details', 'Government ID numbers', 'Financial information', 'Login credentials', 'Other'].map((x, i) => `<label class="checkbox"><input type="checkbox" name="d${i}" value="${x}">${x}</label>`).join('')}</div></fieldset>
        <label class="field full"><span>What has been done to contain it?</span><textarea class="textarea" name="containment"></textarea></label></div></form>`,
      foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn danger-solid" type="button" data-ok>Record Breach</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), p = S().privacy;
      const data = Object.entries(v).filter(([k]) => /^d\d$/.test(k)).map(([, x]) => x);
      const id = `PDB-${today().slice(0, 4)}-${String(p.breaches.length + 1).padStart(3, '0')}`;
      p.breaches.unshift({ id, found: v.found, deadline: new Date(new Date(v.found).getTime() + 72 * 36e5).toISOString(), count: v.count, summary: v.summary.trim(), data: data.join(', ') || 'Not yet known', containment: v.containment, status: 'Open' });
      Q.save(); Q.audit('Privacy', `recorded personal data breach ${id}`); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Breach recorded', `${id} · the DPO has been notified`);
    });
  }
  Q.showPrivacyNotice = () => {
    const p = S().privacy, o = Q.S.organization;
    Q.openModal({ size: 'l', title: 'Privacy notice for iQMS users', sub: `Version 1.2 · ${esc(o.name)}`,
      body: `<div class="modal-body prose">
        <p><b>Who we are.</b> ${esc(o.name)} uses iQMS to run its quality management system. ${esc(o.name)} decides how your personal data is used (it is the personal information controller). The iQMS service provider processes it on our instructions.</p>
        <p><b>What we collect.</b> Your name, work email, job title, department and role; what you do in iQMS (for example reviews, approvals and comments) with dates; and sign-in details such as IP address and device. Records you add may contain other people’s data, such as customer complaints or incident reports.</p>
        <p><b>Why.</b> To give you access, assign and track work, keep controlled documents traceable as ISO 9001 requires, and keep iQMS secure.</p>
        <p><b>How long.</b> See the retention schedule: for example, user accounts for ${esc(p.retention.accounts)} and the audit log for ${esc(p.retention.audit)}.</p>
        <p><b>Who sees it.</b> Colleagues with access to the same processes, administrators, and our auditors. The iQMS provider’s staff only when we allow support access.</p>
        <p><b>Your rights.</b> Under the Data Privacy Act of 2012 you may be informed, access your data, object, have it corrected, have it erased or blocked, get a copy in a portable format, claim damages, and file a complaint with the National Privacy Commission.</p>
        <p><b>Contact.</b> Data Protection Officer: ${esc(p.dpo.name)}, <a href="mailto:${esc(p.dpo.email)}">${esc(p.dpo.email)}</a>${p.dpo.phone ? `, ${esc(p.dpo.phone)}` : ''}.</p></div>`,
      foot: '<button class="btn primary" type="button" data-close>Close</button>' });
  };

  /* =================== Audit log =================== */
  V['audit-log'] = () => {
    const rows = () => [
      ...Q.S.auditLog.map(a => ({ ...a, key: a.id })),
      ...Q.S.activity.map((a, i) => ({ key: 'act' + i, at: `${a.date} —`, who: a.who, cat: 'Records', text: `${a.text}${a.ref ? ` (${a.ref})` : ''}`, ip: '' }))
    ].sort((a, b) => a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
    const cats = [...new Set(rows().map(r => r.cat))].sort();
    const table = Q.table({ id: 'auditlog', rows, key: r => r.key, noun: 'events', caption: 'Audit log', pageSize: 15, search: r => `${Q.pname(r.who)} ${r.cat} ${r.text} ${r.ip}`,
      tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search events" aria-label="Search events"></div>
        <select class="select" data-filter="cat" aria-label="Category"><option value="all">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
        <select class="select" data-filter="who" aria-label="User"><option value="all">All users</option>${Object.entries(Q.S.people).map(([id, p]) => `<option value="${id}">${esc(p.name)}</option>`).join('')}</select>`,
      filters: { cat: (r, v) => r.cat === v, who: (r, v) => r.who === v },
      columns: [
        { key: 'at', label: 'When', cls: 'c-date', sort: r => r.at, render: r => { const [d, t] = r.at.split(' '); return `${Q.fmt(d)}${t && t !== '—' ? `<span class="sub tnum">${esc(t)}</span>` : ''}`; } },
        { key: 'who', label: 'User', sort: r => Q.pname(r.who), render: r => r.who === 'unknown' ? '<span class="muted">Unknown</span>' : `<span class="nowrap">${esc(Q.pname(r.who))}</span>` },
        { key: 'cat', label: 'Category', sort: r => r.cat, render: r => `<span class="tag">${esc(r.cat)}</span>` },
        { key: 'text', label: 'Event', render: r => esc(r.text) },
        { key: 'ip', label: 'IP address', render: r => r.ip ? `<span class="tnum small">${esc(r.ip)}</span>` : '<span class="muted">—</span>' }] });
    return { html: section('Audit Log', `Every sign-in, setting change, access change and record change. Kept for ${esc(S().privacy.retention.audit)}; nobody can edit or delete entries.`) + table };
  };

  /* =================== Data export & backup =================== */
  V.data = () => {
    const o = Q.S.organization;
    const counts = [['Documents', Q.S.documents.length, '#/documents'], ['Risks & opportunities', Q.S.risks.length, '#/risks'], ['KPIs', Q.S.kpis.length, '#/qms/objectives'], ['Evidence records', Q.S.evidence.length, '#/evidence'], ['Audit findings', Q.S.findings.length, '#/audit/findings'], ['Corrective actions', Q.S.actions.length, '#/capa'], ['Users', Q.S.users.length, '#/settings/users']];
    const backups = [0, 1, 2, 3, 4].map(n => [daysAgo(n), n === 0 ? '02:00' : '02:00', `${(412 - n * 3).toFixed(0)} MB`]);
    return { html: section('Data Export & Backup', 'Your data belongs to your organization. Take a full copy at any time.') +
      panel('Export everything', `<p>One JSON file with every record, the process structure, settings and the audit log. Uploaded files are listed by name; download them separately from the document library.</p>
        <ul class="count-list">${counts.map(([l, n, h]) => `<li><a href="${h}">${esc(l)}</a><span class="tnum">${n}</span></li>`).join('')}</ul>
        <div class="form-actions"><button class="btn primary" type="button" data-export-all>${icon('download')}Download Full Export</button></div>
        <p class="small muted" style="margin-top:8px">For one register as a spreadsheet, use <b>Export</b> on that register’s table.</p>`) +
      panel('Backups', `<dl class="dl-list dl-wide"><dt>Schedule</dt><dd>Every day at 02:00 (${esc(S().regional.timeZone)}), encrypted</dd><dt>Kept for</dt><dd>35 days, plus one monthly copy for 12 months</dd><dt>Location</dt><dd>Singapore, separate from the live database</dd><dt>Restore</dt><dd>Ask support to restore the whole workspace to a point in time. Single records can be restored from their revision history.</dd></dl>
        <div class="table-scroll" style="margin-top:16px"><table class="dt"><caption class="sr-only">Recent backups</caption><thead><tr><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Size</th><th scope="col">Status</th></tr></thead><tbody>${backups.map(([d, t, sz]) => `<tr><td>${Q.fmt(d)}</td><td class="tnum">${t}</td><td class="tnum">${sz}</td><td>${Q.st('Completed', 'success')}</td></tr>`).join('')}</tbody></table></div>`) +
      `<section class="panel section danger-zone"><div class="panel-head"><h3>Close this workspace</h3></div><div class="panel-pad"><p>Closing cancels the subscription and deletes all data 30 days later. Download a full export first. During the 30 days an administrator can reopen the workspace.</p>
        <label class="field" style="margin-top:12px;max-width:420px"><span>Type <b>${esc(o.name)}</b> to confirm</span><input class="input" data-close-confirm autocomplete="off"></label>
        <div class="form-actions"><button class="btn danger-solid" type="button" data-close-ws disabled>Close Workspace</button></div></div></section>`,
      after: main => {
        main.querySelector('[data-export-all]').addEventListener('click', () => {
          download(`iqms-export-${o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${today()}.json`, JSON.stringify({ exported: new Date().toISOString(), app: APP, data: Q.S }, null, 2));
          Q.audit('Export', 'downloaded a full data export (JSON)'); Q.toast('Export downloaded');
        });
        const inp = main.querySelector('[data-close-confirm]'), btn = main.querySelector('[data-close-ws]');
        inp.addEventListener('input', () => { btn.disabled = inp.value.trim() !== o.name; });
        btn.addEventListener('click', () => { Q.audit('Account', 'requested workspace closure (mock: nothing deleted)'); inp.value = ''; btn.disabled = true; Q.toast('Closure requested', 'In this mock nothing is deleted.'); });
      } };
  };

  /* =================== Billing & plan =================== */
  V.billing = () => {
    const b = S().billing, peso = n => `₱${n.toLocaleString('en-PH')}`;
    const active = Q.S.users.filter(u => u.status !== 'Deactivated').length;
    const invoices = [0, 1, 2, 3].map(n => { const d = Q.addDays(today().slice(0, 8) + '01', -30 * n); return { id: `INV-${d.slice(0, 7).replace('-', '')}`, date: d.slice(0, 8) + '01', amount: b.seats * 950, status: n === 0 ? 'Due' : 'Paid' }; });
    return { html: section('Billing & Plan', 'Subscription, seats and invoices. Prices shown are sample figures.') +
      `<div class="grid-halves">
        <section class="panel"><div class="panel-head"><h3>${esc(b.plan)} plan</h3>${Q.st('Active', 'success')}</div><div class="panel-pad">
          <div class="plan-price">${peso(950)}<span> per user / month, billed monthly</span></div>
          <ul class="plain-list"><li>${icon('check')}Unlimited processes and documents</li><li>${icon('check')}Microsoft 365 integration and single sign-on</li><li>${icon('check')}Audit log kept 5 years</li><li>${icon('check')}Email support, next business day</li></ul>
          <div class="form-actions"><button class="btn" type="button" data-action="toast" data-title="Compare plans" data-msg="Plan comparison is not part of this mock.">Compare Plans</button></div></div></section>
        <section class="panel"><div class="panel-head"><h3>Usage</h3></div><div class="panel-pad usage">
          <div><b>Seats</b>${meter(active, b.seats)}<span class="small muted">Deactivated users don’t use a seat.</span></div>
          <div><b>File storage</b>${meter(3.2, 50, ' GB')}</div>
          <div class="form-actions"><button class="btn" type="button" data-seats>${icon('plus')}Change Seats</button></div></div></section></div>` +
      panel('Invoices', `<div class="table-scroll"><table class="dt"><caption class="sr-only">Invoices</caption><thead><tr><th scope="col">Invoice</th><th scope="col">Date</th><th scope="col" class="c-num">Amount</th><th scope="col">Status</th><th scope="col" class="c-actions">Actions</th></tr></thead><tbody>${invoices.map(i => `<tr><td class="tnum">${i.id}</td><td>${Q.fmt(i.date)}</td><td class="c-num">${peso(i.amount)}</td><td>${Q.st(i.status, i.status === 'Paid' ? 'success' : 'warning')}</td><td class="c-actions"><button class="btn sm" type="button" data-action="toast" data-title="Download invoice" data-msg="${i.id} would download as PDF.">${icon('download')}PDF</button></td></tr>`).join('')}</tbody></table></div>`, { pad: false }) +
      panel('Payment and billing details', `<dl class="dl-list dl-wide"><dt>Payment method</dt><dd>Card ending 4242 · expires 08/2028 <span class="muted">(held by the payment processor, not by iQMS)</span></dd><dt>Billing contact</dt><dd>${esc(Q.person('eric').email)}</dd><dt>Billed to</dt><dd>${esc(Q.S.organization.name)}, Makati City, Philippines</dd><dt>TIN</dt><dd>On file for official receipts</dd></dl>
        <div class="form-actions"><button class="btn" type="button" data-action="toast" data-title="Update payment method" data-msg="You would be sent to the payment processor's secure page.">Update Payment Method</button><button class="btn" type="button" data-action="toast" data-title="Edit billing details" data-msg="Not part of this mock.">Edit Billing Details</button></div>`),
      after: main => main.querySelector('[data-seats]').addEventListener('click', () => {
        const m = Q.openModal({ size: 's', title: 'Change seats', body: `<form class="modal-body"><label class="field"><span>Seats <span class="req">*</span></span><input class="input" type="number" name="seats" min="${active}" required value="${b.seats}"><span class="help">At least ${active}, the number of active and invited users.</span></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' });
        m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const n = +Q.formValues(f).seats; if (n < active) { Q.toast('Too few seats', `You have ${active} active users.`); return; } b.seats = n; Q.save(); Q.audit('Account', `changed seats to ${n}`); Q.closeAllModals(); Q.render({ noFocus: true }); Q.toast('Seats updated', `${n} seats from the next invoice`); });
      }) };
  };

  /* =================== About System =================== */
  const RELEASES = [
    ['3.11', 'Settings grouped; About System, Data Privacy, Security, Audit Log, Billing and Regional settings; account menu, notifications and sign-in.'],
    ['3.10', 'QMS pages built from pre-made components; Customize page.'],
    ['3.9', 'Document classification decides how a document is registered; group by owner or department.'],
    ['3.8', 'ISO 9001:2026 clause structure.'],
    ['3.7', 'Configurable process workspace tabs; Risks on saved views.']
  ];
  V.about = () => {
    const o = Q.S.organization, r = S().regional;
    const ua = navigator.userAgent, browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
    const info = [['Version', `${APP.version} (${APP.channel})`], ['Build', APP.build], ['Released', Q.fmt(APP.released)], ['Management system standard', Q.standard()]];
    const ws = [['Organization', o.name], ['Organization ID', o.organization_id], ['Workspace address', `${o.organization_id.replace('org-', '')}.iqms.example`], ['Plan', `${S().billing.plan} · ${S().billing.seats} seats`], ['Data location', 'Singapore'], ['Time zone', r.timeZone], ['Users', `${Q.S.users.filter(u => u.status === 'Active').length} active, ${Q.S.users.filter(u => u.status === 'Invited').length} invited`], ['Processes', `${Q.topProcesses().length} top-level`], ['Documents', Q.S.documents.length]];
    const dl = rows => `<dl class="dl-list dl-wide">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    return { html: section('About System', 'Version, workspace details, support and legal information.') +
      `<div class="about-hero panel"><div class="about-mark">${icon('badge-check')}</div><div><h3>iQMS</h3><p class="muted">Process-centred quality management for ISO 9001</p></div><div class="about-status">${Q.st('All systems operational', 'success')}<button class="btn sm ghost" type="button" data-action="toast" data-title="System status" data-msg="status.iqms.example would open in a new tab.">Status Page</button></div></div>
      <div class="grid-halves section">${panel('Version', dl(info), { inGrid: true })}${panel('Your workspace', dl(ws), { inGrid: true })}</div>` +
      panel('What’s new', `<ul class="release-list">${RELEASES.map(([v, t], i) => `<li><span class="tag${i === 0 ? ' new-tag' : ''}">${esc(v)}${i === 0 ? ' · current' : ''}</span><span>${esc(t)}</span></li>`).join('')}</ul>`, { pad: false }) +
      `<div class="grid-halves section">` +
      panel('Support', `<dl class="dl-list dl-wide"><dt>Email</dt><dd><a href="mailto:support@iqms.example">support@iqms.example</a></dd><dt>Hours</dt><dd>Monday to Friday, 8:00 AM to 6:00 PM (Philippine time)</dd><dt>Response</dt><dd>Next business day on your plan</dd><dt>Your browser</dt><dd>${esc(browser)} · ${screen.width} × ${screen.height}</dd></dl>
        <div class="form-actions"><button class="btn" type="button" data-copy-diag>${icon('copy')}Copy Diagnostic Info</button></div>`, { inGrid: true }) +
      panel('Legal', `<ul class="plain-list links"><li><a href="#/settings/privacy">${icon('lock-keyhole')}Data privacy and privacy notice</a></li><li><button class="link-btn" type="button" data-action="toast" data-title="Terms of Service" data-msg="Not part of this mock.">${icon('file-text')}Terms of Service</button></li><li><button class="link-btn" type="button" data-action="toast" data-title="Data processing agreement" data-msg="Signed copy would open as PDF.">${icon('file-check')}Data processing agreement</button></li><li><button class="link-btn" type="button" data-licences>${icon('scale')}Open-source licences</button></li></ul>
        <p class="small muted" style="margin-top:12px">© ${today().slice(0, 4)} iQMS. Icons by Lucide (ISC licence).</p>`, { inGrid: true }) + `</div>` +
      panel('Sample data', `<div class="sample-row"><p>All records in this demo are fictional. Reset to discard every change made in this browser.</p><button class="btn danger" type="button" data-action="reset-data">Reset Sample Data</button></div>`, { sub: 'Demo only — removed in the production build' }),
      after: main => {
        main.querySelector('[data-copy-diag]').addEventListener('click', () => {
          const t = `iQMS ${APP.version} build ${APP.build}\nOrganization ${o.organization_id}\nTime zone ${r.timeZone}\n${ua}\nScreen ${screen.width}x${screen.height}`;
          navigator.clipboard?.writeText(t).then(() => Q.toast('Diagnostic info copied', 'Paste it into your support email.'), () => Q.toast('Copy failed'));
        });
        main.querySelector('[data-licences]').addEventListener('click', () => Q.openModal({ size: 'm', title: 'Open-source licences', body: '<div class="modal-body prose"><p><b>Lucide icons</b> — ISC License. Copyright (c) Lucide Icons and Contributors.</p><p class="small muted">Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.</p></div>', foot: '<button class="btn primary" type="button" data-close>Close</button>' }));
      } };
  };
})();
