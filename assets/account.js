/* iQMS — account: top-bar menus (help, notifications, account), organization switcher,
 * sign-in, and My Profile. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const me = () => Q.person(Q.me());
  const myUser = () => Q.S.users.find(u => u.id === Q.me()) || { role: '' };

  /* ---------- Pop-over menus in the top bar ---------- */
  const pops = [['helpBtn', 'helpPop', helpHtml], ['notifBtn', 'notifPop', notifHtml], ['userBtn', 'userPop', userHtml]];
  const closePops = (except = null) => pops.forEach(([b, p]) => { const pop = document.getElementById(p); if (pop && pop !== except && !pop.hidden) { pop.hidden = true; document.getElementById(b).setAttribute('aria-expanded', 'false'); } });
  Q.closePops = closePops;
  pops.forEach(([b, p, render]) => {
    const btn = document.getElementById(b), pop = document.getElementById(p);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!pop.hidden) { closePops(); return; }
      closePops(pop); Q.closeMenus?.();
      pop.innerHTML = render(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); Q.refreshIcons();
      pop.querySelector('a, button, input')?.focus();
    });
    pop.addEventListener('keydown', e => {
      const items = [...pop.querySelectorAll('a[href], button:not([disabled]), input')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closePops(); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0])?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1])?.focus(); }
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.pop')) closePops();
    else if (e.target.closest('.pop a[href], .pop [data-pop-close]')) closePops();
  });
  window.addEventListener('hashchange', () => closePops());

  /* Help */
  function helpHtml() {
    return `<div class="pop-head"><b>Help</b></div>
      <form class="pop-search" data-help-search role="search"><label class="search-input">${icon('search')}<span class="sr-only">Search help articles</span><input class="input" type="search" name="q" placeholder="Search help articles"></label></form>
      <div class="pop-list">
        <button type="button" data-action="toast" data-pop-close data-title="Getting started" data-msg="The getting-started guide would open in the help centre.">${icon('book-open')}<span>Getting started with iQMS</span></button>
        <button type="button" data-action="shortcuts" data-pop-close>${icon('keyboard')}<span>Keyboard shortcuts</span><kbd>?</kbd></button>
        <a href="#/settings/about">${icon('sparkles')}<span>What’s new in ${esc(Q.APP.version)}</span></a>
        <a href="mailto:support@iqms.example">${icon('mail')}<span>Contact support</span></a>
        <a href="#/settings/about">${icon('activity')}<span>System status</span><span class="st success small">Operational</span></a>
      </div>`;
  }
  document.addEventListener('submit', e => { if (!e.target.matches('[data-help-search]')) return; e.preventDefault(); const q = e.target.q.value.trim(); closePops(); Q.toast('Help search', q ? `Articles about “${q}” would open in the help centre.` : 'Type what you need help with.'); });
  Q.actions.shortcuts = () => Q.openModal({ size: 'm', title: 'Keyboard shortcuts', body: `<div class="modal-body"><dl class="kbd-list">${[
    ['Ctrl K', 'Search everything'], ['?', 'Show keyboard shortcuts'], ['→', 'Open the Documented Information list (sidebar item focused)'], ['↑ ↓', 'Move through lists and menus'], ['Esc', 'Close a menu, panel or dialog'], ['Space', 'Select a table row'], ['Ctrl + click', 'Select several table rows']
  ].map(([k, l]) => `<dt>${k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</dt><dd>${esc(l)}</dd>`).join('')}</dl></div>`, foot: '<button class="btn primary" type="button" data-close>Close</button>' });
  document.addEventListener('keydown', e => { if (e.key === '?' && !e.target.closest('input, textarea, select, [contenteditable]') && !Q.modalOpen() && !Q.UI.signedOut) { e.preventDefault(); Q.actions.shortcuts(); } });

  /* Notifications: built from what is actually assigned to or owned by the current user. */
  const notifications = () => {
    const S = Q.S, out = [], my = Q.me(), today = Q.today();
    Q.myWorkflows().forEach(w => { const d = Q.doc(w.doc); out.push({ id: 'wf-' + w.id, ic: 'file-search', t: `${w.stage === 'review' ? 'Review' : w.stage === 'approval' ? 'Approval' : 'Publication'} assigned: ${d.title} Rev ${w.rev}`, m: `Due ${Q.fmt(w.due)}`, href: `#/review/${w.id}`, urgent: w.due < today }); });
    S.documents.filter(d => d.owner === my && Q.docOverdue(d)).forEach(d => out.push({ id: 'od-' + d.id, ic: 'calendar-clock', t: `Review overdue: ${d.title}`, m: `Was due ${Q.fmt(d.nextReview)}`, href: `#/documents?status=overdue`, urgent: true }));
    S.actions.filter(a => a.owner === my && Q.actionOverdue(a)).forEach(a => out.push({ id: 'ca-' + a.id, ic: 'list-checks', t: `Corrective action overdue: ${a.title}`, m: `Was due ${Q.fmt(a.due)}`, href: `#/capa?focus=${a.id}`, urgent: true }));
    // Audit Management: NCs needing my response or verification, and reports waiting for me.
    if (Q.AM) {
      Q.AM.ncs().filter(f => Q.AM.ncOpen(f)).forEach(f => {
        const owner = f.nc.ca?.owner || f.nc.owner;
        if (owner === my && Q.AM.needsResponse(f)) out.push({ id: `nc-r-${f.nc.no}-${f.nc.last}`, ic: 'message-square', t: `${f.nc.no} needs your response: ${f.title}`, m: `Due ${Q.fmt(f.nc.due)} · ${f.audit}`, href: `#/audits/nc/${f.nc.no}/discussion`, urgent: Q.AM.ncOverdue(f) });
        if (f.auditor === my && f.nc.status === 'Verification Required') out.push({ id: `nc-v-${f.nc.no}`, ic: 'search-check', t: `Verify corrective action ${f.nc.no}`, m: `${Q.pname(owner)} submitted it`, href: `#/audits/nc/${f.nc.no}/action` });
        if (f.nc.comments.some(c => c.who !== my && new RegExp(`@(${Q.person(my).name}|${Q.person(my).name.split(' ')[0]})\\b`).test(c.text) && c.at > (f.nc.seen?.[my] || ''))) out.push({ id: `nc-m-${f.nc.no}-${f.nc.last}`, ic: 'message-square', t: `You were mentioned in ${f.nc.no}`, m: f.title, href: `#/audits/nc/${f.nc.no}/discussion` });
      });
      S.audits.forEach(a => {
        if (a.report.status === 'For Review' && !a.report.reviewed && a.report.reviewer === my) out.push({ id: `rp-r-${a.id}-${a.report.rev}`, ic: 'file-search', t: `Review audit report ${a.id}`, m: a.title, href: `#/audits/a/${a.id}/report` });
        if (a.report.status === 'For Review' && a.report.reviewed && a.report.approver === my) out.push({ id: `rp-a-${a.id}-${a.report.rev}`, ic: 'stamp', t: `Approve audit report ${a.id}`, m: a.title, href: `#/audits/a/${a.id}/report` });
      });
    }
    S.risks.filter(r => Q.riskOpen(r) && r.kind === 'Risk' && Q.riskLevel(r) === 'High' && Q.proc(Q.rootId(r.process))?.owner === my).forEach(r => out.push({ id: 'rk-' + r.id, ic: 'shield-alert', t: `High risk in your process: ${r.title}`, m: Q.plabel(r.process), href: `#/risks?focus=${r.id}` }));
    (S.settings?.privacy?.breaches || []).filter(b => b.status === 'Open').forEach(b => out.push({ id: 'pb-' + b.id, ic: 'shield-alert', t: `Personal data breach ${b.id}: ${b.summary}`, m: 'Notify within 72 hours if required', href: '#/settings/privacy', urgent: true }));
    return out;
  };
  const unread = () => { const read = new Set(Q.UI.readNotifs || []); return notifications().filter(n => !read.has(n.id)); };
  Q.syncNotifDot = () => {
    const n = unread().length, dot = document.getElementById('notifDot'), btn = document.getElementById('notifBtn');
    if (!dot) return; dot.hidden = !n; dot.textContent = n > 9 ? '9+' : String(n);
    btn.setAttribute('aria-label', n ? `Notifications, ${n} unread` : 'Notifications');
  };
  function notifHtml() {
    const list = notifications(), read = new Set(Q.UI.readNotifs || []), n = list.filter(x => !read.has(x.id)).length;
    return `<div class="pop-head"><b>Notifications</b>${n ? `<span class="muted small">${n} unread</span><button class="link-btn small" type="button" data-read-all>Mark all as read</button>` : ''}</div>
      ${list.length ? `<div class="pop-list notif-list">${list.map(x => `<a href="${x.href}" data-notif="${x.id}" class="${read.has(x.id) ? '' : 'unread'}">${icon(x.ic)}<span><span class="n-t">${esc(x.t)}</span><span class="n-m${x.urgent ? ' urgent' : ''}">${esc(x.m)}</span></span>${read.has(x.id) ? '' : '<i class="u-dot" aria-label="Unread"></i>'}</a>`).join('')}</div>` : '<div class="empty small">You’re all caught up.</div>'}
      <div class="pop-foot"><a href="#/profile?section=notifications">${icon('settings')}Notification settings</a></div>`;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-notif]');
    if (a) { Q.UI.readNotifs = [...new Set([...(Q.UI.readNotifs || []), a.dataset.notif])]; Q.saveUI(); Q.syncNotifDot(); }
    if (e.target.closest('[data-read-all]')) { e.stopPropagation(); Q.UI.readNotifs = notifications().map(n => n.id); Q.saveUI(); Q.syncNotifDot(); const pop = document.getElementById('notifPop'); pop.innerHTML = notifHtml(); Q.refreshIcons(); pop.querySelector('a')?.focus(); }
  });

  /* Account menu */
  function userHtml() {
    const p = me();
    return `<div class="pop-user"><span class="avatar">${esc(Q.initials(Q.me()))}</span><div><b>${esc(p.name)}</b><span title="${esc(p.email || '')}">${esc(p.email || '')}</span><span>${esc(myUser().role)} · ${esc(Q.S.organization.name)}</span></div></div>
      <div class="pop-list">
        <a href="#/profile">${icon('user-round')}<span>My profile</span></a>
        <a href="#/settings">${icon('settings')}<span>Settings</span></a>
        <button type="button" data-action="switch-org" data-pop-close>${icon('building')}<span>Switch organization</span></button>
        <button type="button" data-action="shortcuts" data-pop-close>${icon('keyboard')}<span>Keyboard shortcuts</span></button>
        <a href="#/settings/about">${icon('info')}<span>About iQMS</span></a>
      </div>
      <div class="pop-foot"><button type="button" class="link-btn danger-link" data-action="sign-out" data-pop-close>${icon('arrow-left')}Sign out</button></div>`;
  }

  /* ---------- Organization switcher ---------- */
  Q.actions['switch-org'] = () => {
    const o = Q.S.organization;
    const orgs = [{ id: o.organization_id, name: o.name, meta: `${myUser().role} · ${Q.S.users.length} users`, initials: o.initials, current: true }, { id: 'org-helios-sandbox', name: `${o.name} — Training sandbox`, meta: 'Viewer · practice copy for new staff', initials: 'TS' }];
    const m = Q.openModal({ size: 'm', title: 'Switch organization', sub: 'You can belong to more than one organization. Each has its own data, users and settings.',
      body: `<div class="modal-body"><ul class="org-list">${orgs.map(x => `<li><button type="button" data-org="${x.id}" ${x.current ? 'aria-current="true"' : ''}><span class="org-mark sm">${esc(x.initials)}</span><span class="i-main"><b>${esc(x.name)}</b><span>${esc(x.meta)}</span></span>${x.current ? Q.st('Current', 'success') : icon('chevron-right')}</button></li>`).join('')}</ul></div>`,
      foot: `<button class="btn" type="button" data-new-org style="margin-right:auto">${icon('plus')}Create Organization</button><button class="btn" type="button" data-close>Close</button>` });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-org]'); if (b && b.dataset.org !== o.organization_id) { Q.closeAllModals(); Q.toast('Switching organization', 'The sandbox would open with its own data. Not part of this mock.'); }
      else if (b) Q.closeAllModals();
      if (e.target.closest('[data-new-org]')) { Q.closeAllModals(); Q.toast('Create organization', 'You would start from a template or the setup assistant.'); }
    });
  };

  /* ---------- Sign-in / sign-out ---------- */
  let step = 'password', pending = null;
  Q.actions['sign-out'] = () => { Q.audit?.('Sign-in', 'signed out'); Q.UI.signedOut = true; Q.saveUI(); step = 'password'; Q.go('#/signin'); };
  Q.views.signin = () => {
    const o = Q.S.organization, b = Q.S.settings?.branding || {}, sec = Q.S.settings?.security || {};
    const body = {
      password: `<h1 tabindex="-1">Sign in to iQMS</h1><p class="muted">${esc(o.name)}</p>
        ${sec.sso?.status === 'Configured' ? `<button class="btn sso-btn" type="button" data-sso-signin>${icon('key-round')}Sign in with Microsoft</button><div class="or"><span>or</span></div>` : ''}
        <form id="signinForm" novalidate>
          <label class="field"><span>Work email</span><input class="input" type="email" name="email" required autocomplete="username" value="${esc(pending?.email || me().email || '')}"></label>
          <label class="field"><span>Password</span><input class="input" type="password" name="password" required autocomplete="current-password"></label>
          <p class="auth-err" id="authErr" role="alert"></p>
          <div class="auth-row"><label class="checkbox"><input type="checkbox" name="remember">Keep me signed in on this device</label><button class="link-btn small" type="button" data-forgot>Forgot password?</button></div>
          <button class="btn primary block" type="submit">Sign In</button></form>`,
      mfa: `<h1 tabindex="-1">Two-step verification</h1><p class="muted">Enter the 6-digit code from your authenticator app.</p>
        <form id="mfaForm" novalidate><label class="field"><span>Verification code</span><input class="input code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required autofocus></label>
          <p class="auth-err" id="authErr" role="alert"></p>
          <button class="btn primary block" type="submit">Verify</button><button class="link-btn small" type="button" data-back style="margin-top:12px">Use a different account</button></form>`,
      forgot: `<h1 tabindex="-1">Reset your password</h1><p class="muted">We’ll email you a link to choose a new password. The link works for 30 minutes.</p>
        <form id="forgotForm" novalidate><label class="field"><span>Work email</span><input class="input" type="email" name="email" required value="${esc(pending?.email || '')}"></label>
          <button class="btn primary block" type="submit">Send Reset Link</button><button class="link-btn small" type="button" data-back style="margin-top:12px">Back to sign in</button></form>`,
      sent: `<h1 tabindex="-1">Check your email</h1><p class="muted">If an account exists for <b>${esc(pending?.email || '')}</b>, a reset link is on its way.</p><button class="btn block" type="button" data-back style="margin-top:20px">Back to sign in</button>`
    }[step];
    return { title: 'Sign in', auth: true, full: true, html: `<div class="auth-page"><div class="auth-card">
        <div class="auth-brand"><span class="org-mark">${esc(o.initials)}</span><span><b>iQMS</b><span>Quality management</span></span></div>
        ${body}
        ${b.loginMessage ? `<p class="auth-note">${esc(b.loginMessage)}</p>` : ''}
        <p class="auth-legal">By signing in you agree to the Terms of Service. <button class="link-btn" type="button" data-notice>How we use your data</button></p>
        <p class="auth-demo">${icon('info')}Demo: any password works; any 6 digits pass two-step verification.</p>
      </div></div>`,
      after: main => {
        (main.querySelector('[autofocus]') || main.querySelector('h1'))?.focus();
        const err = t => { const el = main.querySelector('#authErr'); if (el) el.textContent = t; };
        const done = how => { Q.UI.signedOut = false; Q.saveUI(); step = 'password'; pending = null; Q.audit?.('Sign-in', `signed in with ${how}`); Q.renderSidebar(); Q.go('#/overview'); Q.toast(`Welcome back, ${me().name.split(' ')[0]}`); };
        main.querySelector('[data-notice]')?.addEventListener('click', () => Q.showPrivacyNotice());
        main.querySelector('[data-sso-signin]')?.addEventListener('click', () => done('Microsoft Entra ID'));
        main.querySelector('[data-forgot]')?.addEventListener('click', () => { pending = { email: main.querySelector('[name="email"]').value }; step = 'forgot'; Q.render(); });
        main.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { step = 'password'; Q.render(); }));
        main.querySelector('#signinForm')?.addEventListener('submit', e => {
          e.preventDefault(); const v = Q.formValues(e.target);
          if (!/^\S+@\S+\.\S+$/.test(v.email)) { err('Enter your work email address.'); e.target.email.focus(); return; }
          if (!v.password) { err('Enter your password.'); e.target.password.focus(); return; }
          const user = Q.S.users.find(u => Q.person(u.id).email?.toLowerCase() === v.email.trim().toLowerCase());
          if (!user || user.status === 'Deactivated') { err('That email and password don’t match an active account.'); return; }
          if (user.id !== Q.me()) { err('In this demo, sign in as ' + me().email + '.'); return; }
          pending = { email: v.email };
          const needMfa = sec.mfa === 'all' || (sec.mfa === 'admins' && ['QMS Manager', 'Administrator', 'Approver'].includes(user.role));
          if (needMfa) { step = 'mfa'; Q.render(); } else done('password');
        });
        main.querySelector('#mfaForm')?.addEventListener('submit', e => { e.preventDefault(); const c = e.target.code.value.trim(); if (!/^\d{6}$/.test(c)) { err('Enter the 6 digits from your app.'); return; } done('password and two-step verification'); });
        main.querySelector('#forgotForm')?.addEventListener('submit', e => { e.preventDefault(); const v = Q.formValues(e.target); if (!/^\S+@\S+\.\S+$/.test(v.email)) { e.target.email.focus(); return; } pending = { email: v.email }; step = 'sent'; Q.render(); });
      } };
  };

  /* ---------- My Profile ---------- */
  Q.views.profile = (parts, q) => {
    const p = me(), u = myUser(), st = Q.S.settings, prefs = (Q.UI.prefs = Q.UI.prefs || { tz: '', mute: [] });
    const myAudit = Q.S.auditLog.filter(a => a.who === Q.me()).slice(0, 5);
    const sessions = [['Chrome on Windows', 'Makati City, PH', 'Active now'], ['Safari on iPhone', 'Quezon City, PH', `${Q.fmt(Q.addDays(Q.today(), -1))} 19:42`]];
    const optional = [['dueSoon', 'Documents I own coming due for review'], ['riskHigh', 'Risks in my processes rated High'], ['kpiBelow', 'KPIs in my processes below target'], ['weekly', 'Weekly summary']];
    return { title: 'My Profile', nav: 'settings', html: Q.pageHead({ title: 'My Profile', crumbs: [['My Profile']], sub: 'Your account, preferences and personal data.' }) +
      `<div class="profile-layout">
        <section class="panel"><div class="panel-head"><h2>Personal details</h2></div><form class="panel-pad" id="profForm">
          <div class="prof-id"><span class="avatar lg">${esc(Q.initials(Q.me()))}</span><div><b>${esc(p.name)}</b><span class="muted small">${esc(u.role)} · ${esc(p.dept)}</span></div></div>
          <div class="form-grid">
            <label class="field"><span>Full name <span class="req">*</span></span><input class="input" name="name" required value="${esc(p.name)}"></label>
            <label class="field"><span>Job title</span><input class="input" name="title" value="${esc(p.title)}"></label>
            <label class="field"><span>Work email</span><input class="input" value="${esc(p.email || '')}" readonly><span class="help">Managed by your administrator.</span></label>
            <label class="field"><span>Time zone</span><select class="select" name="tz"><option value="">Organization default (${esc(st.regional.timeZone)})</option>${['Asia/Manila', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/Los_Angeles', 'UTC'].map(z => `<option${z === prefs.tz ? ' selected' : ''}>${z}</option>`).join('')}</select></label>
          </div><div class="form-actions"><button class="btn primary" type="submit">Save Changes</button></div></form></section>

        <section class="panel" id="notifications"><div class="panel-head"><h2>My notifications</h2></div><form class="panel-pad" id="prefForm">
          <p class="small muted" style="margin-bottom:8px">Assignments, overdue items and mentions are always sent. Turn off what you don’t need:</p>
          ${optional.map(([k, l]) => `<label class="switch-row"><span><b>${esc(l)}</b></span><span class="switch"><input type="checkbox" role="switch" name="${k}" ${prefs.mute.includes(k) ? '' : 'checked'}><i aria-hidden="true"></i></span></label>`).join('')}
          <div class="form-actions"><button class="btn primary" type="submit">Save Preferences</button></div></form></section>

        <section class="panel"><div class="panel-head"><h2>Sign-in and security</h2></div><div class="panel-pad">
          <ul class="plain-rows">
            <li><div class="i-main"><b>Password</b><span>Last changed ${Q.fmt(Q.addDays(Q.today(), -73))}</span></div><button class="btn sm" type="button" data-pw>Change Password</button></li>
            <li><div class="i-main"><b>Two-step verification</b><span>${Q.UI.mfaOn === false ? 'Off' : 'On · authenticator app'}${st.security.mfa !== 'off' ? ' · required by your organization' : ''}</span></div>${Q.st(Q.UI.mfaOn === false ? 'Off' : 'On', Q.UI.mfaOn === false ? 'warning' : 'success')}</li>
            <li><div class="i-main"><b>Microsoft sign-in</b><span>${st.security.sso.status === 'Configured' ? `Available for ${esc(st.security.sso.domain)}` : 'Not set up by your organization'}</span></div></li>
          </ul>
          <h3 class="sub-h">Where you’re signed in</h3>
          <ul class="plain-rows">${sessions.map(([d, l, t], i) => `<li><span class="ic">${icon('monitor')}</span><div class="i-main"><b>${esc(d)}</b><span>${esc(l)} · ${esc(t)}</span></div>${i === 0 ? Q.st('This device', 'success') : `<button class="btn sm danger" type="button" data-action="toast" data-title="Signed out" data-msg="${esc(d)} was signed out.">Sign Out</button>`}</li>`).join('')}</ul>
          <div class="form-actions"><button class="btn danger" type="button" data-action="sign-out">${icon('arrow-left')}Sign Out</button></div></div></section>

        <section class="panel"><div class="panel-head"><h2>My data and privacy</h2></div><div class="panel-pad">
          <p class="small">Under the Data Privacy Act of 2012 you can get a copy of your personal data, ask for it to be corrected, or object to how it is used. <button class="link-btn" type="button" data-notice>Read the privacy notice</button></p>
          <div class="form-actions"><button class="btn" type="button" data-mydata>${icon('download')}Download My Data</button><button class="btn" type="button" data-correct>Request a Correction</button></div>
          <h3 class="sub-h">Your recent account activity</h3>
          ${myAudit.length ? `<ul class="activity">${myAudit.map(a => `<li><span>${esc(a.text)}</span><span class="when">${Q.fmt(a.at.split(' ')[0])}</span></li>`).join('')}</ul>` : '<p class="small muted">No account activity yet.</p>'}
          <p class="small" style="margin-top:8px"><a href="#/settings/audit-log">Full audit log</a> · Data Protection Officer: <a href="mailto:${esc(st.privacy.dpo.email)}">${esc(st.privacy.dpo.email)}</a></p></div></section>
      </div>`,
      after: main => {
        main.querySelector('#profForm').addEventListener('submit', e => {
          e.preventDefault(); if (!Q.validate(e.target)) return; const v = Q.formValues(e.target);
          Object.assign(Q.S.people[Q.me()], { name: v.name.trim(), title: v.title.trim() }); prefs.tz = v.tz; Q.saveUI(); Q.save(); Q.audit('Profile', 'updated their profile'); Q.renderSidebar(); Q.render({ noFocus: true }); Q.toast('Profile saved');
        });
        main.querySelector('#prefForm').addEventListener('submit', e => { e.preventDefault(); prefs.mute = optional.map(([k]) => k).filter(k => !e.target[k].checked); Q.saveUI(); Q.toast('Notification preferences saved'); });
        main.querySelector('[data-notice]').addEventListener('click', () => Q.showPrivacyNotice());
        main.querySelector('[data-pw]').addEventListener('click', passwordModal);
        main.querySelector('[data-mydata]').addEventListener('click', () => {
          const id = Q.me(), data = { exported: new Date().toISOString(), profile: Q.S.people[id], account: myUser(),
            activity: Q.S.activity.filter(a => a.who === id), auditLog: Q.S.auditLog.filter(a => a.who === id),
            documentsOwned: Q.S.documents.filter(d => d.owner === id).map(d => ({ id: d.id, title: d.title })), correctiveActions: Q.S.actions.filter(a => a.owner === id).map(a => ({ id: a.id, title: a.title })) };
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `my-iqms-data-${Q.today()}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
          Q.audit('Privacy', 'downloaded a copy of their personal data'); Q.toast('Your data was downloaded');
        });
        main.querySelector('[data-correct]').addEventListener('click', () => {
          const m = Q.openModal({ size: 'm', title: 'Request a correction', sub: 'Sent to the Data Protection Officer.', body: '<form class="modal-body"><label class="field"><span>What should be corrected? <span class="req">*</span></span><textarea class="textarea" name="note" required autofocus></textarea></label></form>', foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Send Request</button>' });
          m.querySelector('[data-ok]').addEventListener('click', () => {
            const f = m.querySelector('form'); if (!Q.validate(f)) return; const list = Q.S.settings.privacy.requests || (Q.S.settings.privacy.requests = []);
            const n = Math.max(0, ...list.map(r => +r.id.split('-').pop())) + 1, rid = `DSR-${Q.today().slice(0, 4)}-${String(n).padStart(3, '0')}`;
            list.unshift({ id: rid, type: 'Correction', who: `${me().name} (user)`, received: Q.today(), due: Q.addDays(Q.today(), 30), status: 'Open', note: Q.formValues(f).note });
            Q.save(); Q.audit('Privacy', `requested a correction (${rid})`); Q.closeAllModals(); Q.toast('Request sent', `${rid} · the DPO will reply within 30 days`);
          });
        });
        if (q.section === 'notifications') setTimeout(() => main.querySelector('#notifications')?.scrollIntoView({ block: 'start' }), 0);
      } };
  };
  function passwordModal() {
    const min = +(Q.S.settings.security.minLength || 12);
    const m = Q.openModal({ size: 's', title: 'Change password', body: `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr">
      <label class="field"><span>Current password <span class="req">*</span></span><input class="input" type="password" name="cur" required autocomplete="current-password" autofocus></label>
      <label class="field"><span>New password <span class="req">*</span></span><input class="input" type="password" name="next" required autocomplete="new-password" minlength="${min}"><span class="help">At least ${min} characters. A passphrase of several words works well.</span></label>
      <label class="field"><span>Confirm new password <span class="req">*</span></span><input class="input" type="password" name="again" required autocomplete="new-password"></label>
      <p class="auth-err" role="alert" id="pwErr"></p></div></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Change Password</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), err = m.querySelector('#pwErr');
      if (v.next.length < min) { err.textContent = `Use at least ${min} characters.`; return; }
      if (v.next !== v.again) { err.textContent = 'The new passwords don’t match.'; return; }
      if (v.next === v.cur) { err.textContent = 'Choose a password you haven’t used here before.'; return; }
      Q.audit('Security', 'changed their password'); Q.closeAllModals(); Q.toast('Password changed', 'Other devices were signed out.');
    });
  }

  /* ---------- Boot hook: branding, notification dot ---------- */
  const boot = Q.boot;
  Q.boot = () => { Q.applyBranding?.(); boot(); Q.syncNotifDot(); };
  window.addEventListener('hashchange', () => Q.syncNotifDot());
})();
