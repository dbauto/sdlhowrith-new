/* iQMS — Audit Management: area reports, the consolidated audit report, the report editor,
 * review → approval → publish (controlled revisions) and the print / PDF layout.
 *
 * The report is generated from structured audit data. Only narrative sections are editable;
 * everything that is a record (findings, NC numbers, classifications, clauses, owners, statuses,
 * dates, team) is rendered from the records, so the narrative cannot silently contradict them.
 * Publishing freezes the rendered report as a revision; editing afterwards needs a new revision. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM;

  const NARR = [['exec', 'Executive Summary'], ['positive', 'Positive Practices'], ['conclusion', 'Overall Conclusion']];
  const ALLOWED = new Set(['P', 'H2', 'H3', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV', 'SPAN', 'HR']);
  // Keep only basic structure: users never see or edit HTML, and pasted content cannot bring scripts or styles.
  AM.sanitize = html => {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html'), root = doc.body.firstChild;
    const walk = el => [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1 || !ALLOWED.has(n.tagName)) { if (n.nodeType === 1 && !['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(n.tagName)) { walk(n); n.replaceWith(...n.childNodes); } else n.remove(); return; }
      const pb = n.classList?.contains('page-break');
      [...n.attributes].forEach(at => { if (!(at.name === 'colspan' || at.name === 'rowspan')) n.removeAttribute(at.name); });
      if (pb) n.className = 'page-break';
      walk(n);
    });
    walk(root); return root.innerHTML.trim();
  };

  const counts = (a, pid) => { const fs = AM.findingsOf(a.id).filter(f => !pid || f.process === pid); const t = k => fs.filter(f => f.type === k).length; return { fs, major: t('Major nonconformity'), minor: t('Minor nonconformity'), obs: t('Observation'), ofi: t('Opportunity for improvement') }; };
  const items = (a, pid) => AM.items(a, pid);
  const reviewedOf = (a, pid) => { const m = new Map(); items(a, pid).forEach(i => i.reviewed.forEach(s => { const k = s.kind + s.id + s.rev; if (!m.has(k)) m.set(k, s); })); return [...m.values()]; };
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

  /* ---------------- default narrative (generated once, then edited by people) ---------------- */
  AM.defaultNarrative = a => {
    const c = counts(a), names = a.areas.map(ar => Q.proc(ar.process).name), it = items(a), rv = reviewedOf(a);
    const eff = a.areas.filter(ar => /^effective/i.test(ar.conclusion || '')), part = a.areas.filter(ar => !/^effective/i.test(ar.conclusion || ''));
    return {
      exec: `<p>Audit ${esc(a.id)} assessed ${esc(names.join(', '))} against ${esc(a.criteria)}. ${plural(it.filter(i => i.result).length, 'checklist question was', 'checklist questions were')} assessed and ${plural(rv.length, 'document or record', 'documents and records')} already held in iQMS ${rv.length === 1 ? 'was' : 'were'} reviewed.</p>
        <p>The audit raised ${plural(c.major, 'major nonconformity', 'major nonconformities')}, ${plural(c.minor, 'minor nonconformity', 'minor nonconformities')}, ${plural(c.obs, 'observation')} and ${plural(c.ofi, 'opportunity for improvement', 'opportunities for improvement')}. ${eff.length ? `${esc(eff.map(ar => Q.proc(ar.process).name).join(', '))} ${eff.length === 1 ? 'was' : 'were'} found effective.` : ''} ${part.length ? `${esc(part.map(ar => Q.proc(ar.process).name).join(', '))} need${part.length === 1 ? 's' : ''} corrective action.` : ''}</p>`,
      positive: `<ul>${a.areas.filter(ar => /^effective/i.test(ar.conclusion || '')).map(ar => `<li>${esc(Q.proc(ar.process).name)}: ${esc((ar.conclusion || '').replace(/^effective\.?\s*/i, '') || 'requirements met with good records')}</li>`).join('') || '<li>Records were available and well organized in iQMS.</li>'}</ul>`,
      conclusion: `<p>The quality management system ${c.major ? 'is not fully effective in the areas with a major nonconformity' : c.minor ? 'is effective, with the nonconformities listed in section 10 requiring corrective action' : 'is effective and conforms to the audit criteria'}. Nonconformities remain under follow-up until their corrective actions are verified and found effective; publishing this report does not close them.</p>`
    };
  };

  /* ---------------- consistency check between narrative and records ---------------- */
  AM.consistency = a => {
    const txt = Object.values(a.report.sections || {}).join(' ').replace(/<[^>]+>/g, ' ');
    const ncs = AM.findingsOf(a.id).filter(f => f.nc), ids = new Set([...ncs.map(f => f.nc.no), ...AM.findingsOf(a.id).map(f => f.id)]);
    const out = [];
    (txt.match(/\b(?:NC|F)-\d{4}-\d{2,3}\b/g) || []).filter(x => !ids.has(x)).forEach(x => out.push(`${x} is mentioned in the narrative but is not a finding of this audit.`));
    const majors = ncs.filter(f => f.nc.classification === 'Major').length;
    if (/\bno major (?:non-?conformit|NC)/i.test(txt) && majors) out.push(`The narrative says there are no major nonconformities, but the audit has ${majors}.`);
    if (/\bno (?:minor )?non-?conformities\b/i.test(txt) && ncs.length) out.push(`The narrative says there are no nonconformities, but the audit has ${ncs.length}.`);
    return [...new Set(out)];
  };

  /* ---------------- shared report pieces ---------------- */
  const tbl = (head, rows, empty = 'None.') => rows.length ? `<table class="rp-t"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : `<p class="rp-none">${empty}</p>`;
  const linked = (n, title, body) => `<section class="rp-sec linked" data-sec="${n}"><h2><span class="rp-n">${n}</span>${esc(title)}<span class="rp-lock" title="Generated from the audit records. Change the records, not the text.">${icon('link')}Linked to audit records</span></h2>${body}</section>`;
  const narrative = (n, key, title, a, editable) => `<section class="rp-sec narr${editable ? ' editing' : ''}" data-sec="${n}"><h2><span class="rp-n">${n}</span>${esc(title)}${editable ? '<span class="rp-edit">Editable</span>' : ''}</h2><div class="rp-body"${editable ? ` contenteditable="true" data-narr="${key}" role="textbox" aria-multiline="true" aria-label="${esc(title)}"` : ''}>${a.report.sections?.[key] || ''}</div></section>`;
  const findingRows = list => list.map(f => [`<b class="tnum nowrap">${esc(f.nc?.no || f.id)}</b>`, `<span class="tnum">${esc(f.clause)}</span>`, esc(Q.proc(f.process)?.name), esc(f.statement || f.title), esc(AM.short(f.type)), esc(f.nc ? Q.pname(f.nc.owner) : '—'), f.nc ? `<span class="nowrap">${Q.fmt(f.nc.due)}</span>` : '—', esc(f.nc ? f.nc.status : f.status)]);
  const ncHead = ['NC No.', 'ISO Clause', 'Area', 'Nonconformity', 'Classification', 'Responsible Owner', 'Due Date', 'Status'];

  AM.reportBody = (a, { editable = false } = {}) => {
    const c = counts(a), r = a.report, rv = reviewedOf(a);
    const team = tbl(['Name', 'Role', 'Areas', 'Independence'], a.team.map(t => [esc(Q.pname(t.who)), esc(t.role), t.areas.map(p => esc(Q.proc(p).name)).join(', ') || 'Overall audit', t.role === 'Observer' ? 'n/a' : t.independent === true ? 'Confirmed' : 'Not confirmed']));
    const coverage = tbl(['Area', 'Auditor', 'Auditee', 'Clauses', 'Questions assessed', 'Evidence reviewed', 'Status'], a.areas.map(ar => { const it = items(a, ar.process); return [esc(Q.proc(ar.process).name), esc(Q.pname(ar.auditor)), esc(Q.pname(ar.auditee)), `<span class="tnum">${esc(AM.clausesOf(a, ar).join(', '))}</span>`, `${it.filter(i => i.result).length} / ${it.length}`, String(reviewedOf(a, ar.process).length), esc(ar.status)]; }));
    const areaRes = a.areas.map((ar, i) => { const k = counts(a, ar.process), it = items(a, ar.process); return `<div class="rp-area"><h3>8.${i + 1} ${esc(Q.proc(ar.process).name)} results</h3>
      <p class="rp-meta">Auditor ${esc(Q.pname(ar.auditor))} · Auditee ${esc(Q.pname(ar.auditee))} · Clauses ${esc(AM.clausesOf(a, ar).join(', '))} · ${it.filter(x => x.result === 'Conforming').length} conforming of ${it.length} questions · ${k.major + k.minor} NC · ${k.obs} observation${k.obs === 1 ? '' : 's'} · ${k.ofi} OFI</p>
      <p><b>Area conclusion.</b> ${esc(ar.conclusion || (ar.status === 'Submitted' ? '—' : 'Area results not yet submitted.'))}</p>${ar.comments ? `<p><b>Auditor comments.</b> ${esc(ar.comments)}</p>` : ''}</div>`; }).join('');
    const conf = tbl(['Area', 'Conforming', 'Observation', 'OFI', 'Minor NC', 'Major NC', 'N/A'], a.areas.map(ar => { const it = items(a, ar.process), n = v => String(it.filter(x => x.result === v).length); return [esc(Q.proc(ar.process).name), n('Conforming'), n('Observation'), n('Opportunity for improvement'), n('Minor nonconformity'), n('Major nonconformity'), n('N/A')]; }));
    const ncs = c.fs.filter(f => f.nc), obs = c.fs.filter(f => f.type === 'Observation'), ofi = c.fs.filter(f => f.type === 'Opportunity for improvement');
    const follow = tbl(['NC No.', 'Corrective action', 'Owner', 'Due', 'Verification', 'Status'], ncs.map(f => [`<b class="tnum">${esc(f.nc.no)}</b>`, esc(f.nc.ca?.action || 'Awaiting the owner’s response'), esc(Q.pname(f.nc.ca?.owner || f.nc.owner)), Q.fmt(f.nc.ca?.due || f.nc.due), f.nc.verification ? `${esc(f.nc.verification.result)} — ${esc(Q.pname(f.nc.verification.by))}, ${Q.fmt(f.nc.verification.date)}` : '—', esc(f.nc.status)]), 'No corrective actions required.');
    const sign = tbl(['', 'Name', 'Date'], [['Prepared by (Lead Auditor)', esc(Q.pname(a.auditor)), r.compiled ? Q.fmt(r.compiled) : '—'], ['Reviewed by', esc(Q.pname(r.reviewer)), r.reviewed ? Q.fmt(r.reviewed.date) : 'Pending'], ['Approved by', esc(Q.pname(r.approver)), r.approved ? Q.fmt(r.approved.date) : 'Pending'], ['Published', '', r.status === 'Published' ? Q.fmt(r.published) : 'Not published']]);
    return [
      linked(1, 'Audit Information', tbl(['', ''], [['Audit number', esc(a.id)], ['Title', esc(a.title)], ['Type', esc(a.type)], ['Dates', AM.dateRange(a)], ['Location', esc(a.location || '—')], ['Lead Auditor', esc(Q.pname(a.auditor))], ['Report revision', `Rev ${esc(String(r.rev ?? 0))} · ${esc(r.status)}`]]).replace('<thead><tr><th></th><th></th></tr></thead>', '')),
      linked(2, 'Audit Objectives', `<p>${esc(a.objective)}</p>`), linked(3, 'Scope', `<p>${esc(a.scope)}</p>`), linked(4, 'Audit Criteria', `<p>${esc(a.criteria)}</p>`),
      linked(5, 'Audit Team', team), narrative(6, 'exec', 'Executive Summary', a, editable), linked(7, 'Audit Coverage', coverage + `<p class="rp-meta">${plural(rv.length, 'document or record was', 'documents and records were')} reviewed; each is recorded at the revision that was reviewed.</p>`),
      linked(8, 'Area Audit Results', areaRes), linked(9, 'Summary of Conformities', conf), linked(10, 'Summary of Nonconformities', tbl(ncHead, findingRows(ncs), 'No nonconformities were raised.')),
      linked(11, 'Observations', tbl(['No.', 'Clause', 'Area', 'Observation'], obs.map(f => [esc(f.id), esc(f.clause), esc(Q.proc(f.process).name), esc(f.statement)]))),
      linked(12, 'Opportunities for Improvement', tbl(['No.', 'Clause', 'Area', 'Opportunity'], ofi.map(f => [esc(f.id), esc(f.clause), esc(Q.proc(f.process).name), esc(f.statement)]))),
      narrative(13, 'positive', 'Positive Practices', a, editable), linked(14, 'Corrective Actions / Follow-up', follow + '<p class="rp-meta">Open nonconformities stay under follow-up after this report is published.</p>'),
      narrative(15, 'conclusion', 'Overall Conclusion', a, editable), linked(16, 'Sign-off', sign)].join('');
  };

  AM.areaBody = (a, pid) => {
    const ar = AM.area(a, pid), it = items(a, pid), k = counts(a, pid), rv = reviewedOf(a, pid);
    const ncs = k.fs.filter(f => f.nc);
    return [
      linked(1, 'Audit Information', tbl(['', ''], [['Audit', `${esc(a.id)} ${esc(a.title)}`], ['Area / scope', `${esc(Q.proc(pid).name)} — ${esc(a.scope)}`], ['Auditor', esc(Q.pname(ar.auditor))], ['Auditee', esc(Q.pname(ar.auditee))], ['Dates', AM.dateRange(a)], ['Status', ar.status === 'Submitted' ? `Submitted by ${esc(Q.pname(ar.submitted.by))}, ${Q.fmt(ar.submitted.date)}` : esc(ar.status)]]).replace('<thead><tr><th></th><th></th></tr></thead>', '')),
      linked(2, 'Applicable Clauses', `<p class="tnum">${AM.clausesOf(a, ar).map(c => `${esc(c)} ${esc(AM.clTitle(c))}`).join(' · ')}</p>`),
      linked(3, 'Documents / Evidence Reviewed', tbl(['Document / record', 'Revision reviewed', 'Status at review', 'Reviewed by', 'Date'], rv.map(s => [esc(s.title), esc(s.kind === 'doc' ? 'Rev ' + s.rev : s.rev), esc(s.status), esc(Q.pname(s.by)), Q.fmt(s.date)]), 'No evidence recorded.')),
      linked(4, 'Checklist Results', tbl(['Clause', 'Question', 'Result', 'Notes'], it.map(i => [`<span class="tnum">${esc(i.sub)}</span>`, esc(i.question), esc(i.result ? AM.short(i.result) : 'Not assessed'), esc(i.notes || '')]))),
      linked(5, 'Conformities', `<p>${it.filter(i => i.result === 'Conforming').length} of ${it.length} questions conforming.</p>`),
      linked(6, 'Observations', tbl(['No.', 'Clause', 'Observation'], k.fs.filter(f => f.type === 'Observation').map(f => [esc(f.id), esc(f.clause), esc(f.statement)]))),
      linked(7, 'Opportunities for Improvement', tbl(['No.', 'Clause', 'Opportunity'], k.fs.filter(f => f.type === 'Opportunity for improvement').map(f => [esc(f.id), esc(f.clause), esc(f.statement)]))),
      linked(8, 'Nonconformities', tbl(ncHead, findingRows(ncs), 'No nonconformities.')),
      linked(9, 'Corrective Actions', tbl(['NC No.', 'Corrective action', 'Owner', 'Due', 'Status'], ncs.map(f => [esc(f.nc.no), esc(f.nc.ca?.action || 'Awaiting response'), esc(Q.pname(f.nc.ca?.owner || f.nc.owner)), Q.fmt(f.nc.due), esc(f.nc.status)]), 'None.')),
      linked(10, 'Auditor Comments', `<p>${esc(ar.comments || '—')}</p>`), linked(11, 'Area Conclusion', `<p>${esc(ar.conclusion || 'Not yet submitted.')}</p>`)].join('');
  };

  AM.planBody = a => [
    linked(1, 'Audit Information', tbl(['', ''], [['Audit', `${esc(a.id)} ${esc(a.title)}`], ['Type', esc(a.type)], ['Planned period', esc(a.plannedPeriod || '—')], ['Dates', AM.dateRange(a)], ['Time', a.start ? `${esc(a.start)}–${esc(a.end)}` : '—'], ['Location', esc(a.location || '—')], ['Opening / closing meeting', `${esc(a.opening || '—')} / ${esc(a.closing || '—')}`]]).replace('<thead><tr><th></th><th></th></tr></thead>', '')),
    linked(2, 'Objective, Scope and Criteria', `<p><b>Objective.</b> ${esc(a.objective)}</p><p><b>Scope.</b> ${esc(a.scope)}</p><p><b>Criteria.</b> ${esc(a.criteria)}</p>`),
    linked(3, 'Audit Team', tbl(['Name', 'Role', 'Areas', 'Clauses', 'Independence'], a.team.map(t => [esc(Q.pname(t.who)), esc(t.role), t.areas.map(p => esc(Q.proc(p).name)).join(', ') || 'Overall', esc(t.clauses.join(', ') || '—'), t.role === 'Observer' ? 'n/a' : t.independent === true ? 'Confirmed' : 'To confirm']))),
    linked(4, 'Areas and Clauses', tbl(['Area', 'Auditee', 'Auditor', 'Clauses', 'Questions'], a.areas.map(ar => [esc(Q.proc(ar.process).name), esc(Q.pname(ar.auditee)), esc(Q.pname(ar.auditor)), `<span class="tnum">${esc(AM.clausesOf(a, ar).join(', '))}</span>`, a.checklist ? String(items(a, ar.process).length) : '—'])))].join('');

  /* ---------------- report tab (workspace) ---------------- */
  AM.reportTab = a => {
    const r = a.report, sub = a.areas.filter(ar => ar.status === 'Submitted').length, all = sub === a.areas.length, who = AM.actor();
    ensureSnapshot(a);
    const steps = ['Draft', 'For Review', 'Approved', 'Published'], ci = steps.indexOf(r.status);
    const warn = r.sections ? AM.consistency(a) : [];
    let acts = '';
    if (r.status === 'Not started') acts = AM.can('report', a) ? `<button class="btn primary" type="button" data-action="rp-compile" data-id="${a.id}" ${all ? '' : `disabled title="${a.areas.length - sub} area report${a.areas.length - sub === 1 ? '' : 's'} still to submit"`}>${icon('file-plus')}Compile Audit Report</button>` : '';
    else if (r.status === 'Draft') acts = `${AM.can('report', a) ? `<a class="btn" href="#/audits/a/${a.id}/report/edit">${icon('pencil')}Edit Report</a><button class="btn primary" type="button" data-action="rp-submit" data-id="${a.id}">${icon('send')}Submit for Review</button>` : ''}`;
    else if (r.status === 'For Review') acts = !r.reviewed ? (AM.can('review', a) ? `<button class="btn primary" type="button" data-action="rp-review" data-id="${a.id}">${icon('file-search')}Complete Review</button><button class="btn" type="button" data-action="rp-return" data-id="${a.id}">Return to Draft</button>` : `<span class="small muted">Waiting for ${esc(Q.pname(r.reviewer))} to review.</span>`)
      : (AM.can('approve', a) ? `<button class="btn primary" type="button" data-action="rp-approve" data-id="${a.id}">${icon('stamp')}Approve Report</button><button class="btn" type="button" data-action="rp-return" data-id="${a.id}">Return to Draft</button>` : `<span class="small muted">Reviewed by ${esc(Q.pname(r.reviewed.by))}. Waiting for ${esc(Q.pname(r.approver))} to approve.</span>`);
    else if (r.status === 'Approved') acts = AM.can('report', a) ? `<button class="btn primary" type="button" data-action="rp-publish" data-id="${a.id}">${icon('send')}Publish Rev ${esc(String(r.rev))}</button>` : `<span class="small muted">Approved. The Lead Auditor publishes it.</span>`;
    else if (r.status === 'Published') acts = AM.can('report', a) ? `<button class="btn" type="button" data-action="rp-revise" data-id="${a.id}">${icon('git-branch')}Create Revision</button>` : '';
    const view = r.status === 'Not started' ? '' : `<a class="btn" href="#/audits/a/${a.id}/print">${icon('eye')}Preview</a><a class="btn" href="#/audits/a/${a.id}/print?go=print">${icon('download')}Print / PDF</a>`;
    return { html: `<div class="grid-2" style="align-items:start">
      <section class="panel"><div class="panel-head"><h2>Consolidated audit report</h2>${Q.st(r.status, AM.REPORT_KIND[r.status])}${r.rev != null ? `<span class="muted small">Rev ${esc(String(r.rev))}</span>` : ''}</div>
        <div class="panel-pad">${r.status === 'Not started' ? `<p>${all ? 'All area results are submitted. Compile the consolidated report: iQMS combines the structured results of every area into one controlled report, ready to edit.' : `The report can be compiled when every area has submitted its results (${sub} of ${a.areas.length} so far).`}</p>`
          : `<ol class="am-life rp-life">${steps.map((s, i) => `<li class="${i < ci ? 'done' : i === ci ? 'current' : ''}">${s}</li>`).join('')}</ol>
            ${r.status === 'For Review' && r.reviewed ? `<p class="small">${icon('circle-check')} Reviewed by <b>${esc(Q.pname(r.reviewed.by))}</b> · ${Q.fmt(r.reviewed.date)}${r.reviewed.note ? ` — “${esc(r.reviewed.note)}”` : ''}</p>` : ''}
            ${r.returned ? `<div class="callout warning small">${icon('arrow-left')}<span><b>Returned to draft by ${esc(Q.pname(r.returned.by))}</b>${esc(r.returned.note)}</span></div>` : ''}
            ${warn.length ? `<div class="callout danger small">${icon('triangle-alert')}<span><b>Narrative does not match the audit records</b>${warn.map(esc).join(' ')}</span></div>` : ''}
            <dl class="dl-list"><dt>Reviewer</dt><dd>${esc(Q.pname(r.reviewer))}</dd><dt>Approver</dt><dd>${esc(Q.pname(r.approver))}</dd>${r.status === 'Published' ? `<dt>Published</dt><dd>${Q.fmt(r.published)}</dd>` : ''}</dl>`}
          <div class="form-actions">${acts}${view}</div>
          ${r.status === 'Published' && AM.findingsOf(a.id).some(AM.ncOpen) ? `<p class="small muted" style="margin-top:12px">${icon('info')} Publishing did not close the open nonconformities. They stay under follow-up in <a href="#/audits/nc?audit=${a.id}">Nonconformities</a>.</p>` : ''}</div>
        ${r.revisions.length ? `<div class="panel-head" style="border-top:1px solid var(--border)"><h3>Published revisions</h3></div><ul class="worklist">${r.revisions.slice().reverse().map(v => `<li><div class="w-main"><div class="w-title">Rev ${esc(String(v.rev))}</div><div class="w-meta">Published ${Q.fmt(v.published)} by ${esc(Q.pname(v.by))} · approved by ${esc(Q.pname(v.approvedBy))}</div></div><a class="btn sm" href="#/audits/a/${a.id}/print?rev=${v.rev}">View Rev ${esc(String(v.rev))}</a></li>`).join('')}</ul>` : ''}
        ${r.history.length ? `<details class="explain rp-hist"><summary>${icon('chevron-right')}Report history (${r.history.length})</summary><ul class="activity">${r.history.slice().reverse().map(h => `<li><span><b>${esc(Q.pname(h.who))}</b> ${esc(h.text)}</span><span class="when">${AM.at(h.at)}</span></li>`).join('')}</ul></details>` : ''}</section>
      <section class="panel"><div class="panel-head"><h2>Area reports</h2><span class="muted small">${sub} / ${a.areas.length} areas complete</span></div><ul class="ready-list">${a.areas.map(ar => `<li><span><b>${esc(Q.proc(ar.process).name)}</b><span class="sub">${esc(Q.pname(ar.auditor))}</span></span>${Q.st(ar.status === 'Submitted' ? 'Submitted' : ar.status, ar.status === 'Submitted' ? 'success' : 'neutral')}<span class="rl-acts"><a class="btn sm ghost" href="#/audits/a/${a.id}/print?area=${ar.process}">Preview</a>${ar.status === 'Submitted' ? `<a class="btn sm ghost" href="#/audits/a/${a.id}/print?area=${ar.process}&go=print">Print</a>` : ''}</span></li>`).join('')}</ul>
        <p class="panel-pad small muted" style="border-top:1px solid var(--border)">Area results are stored as data. The consolidated report is built from them, not by joining PDF files.</p></section></div>` };
  };
  const rlog = (a, text) => { a.report.history.push({ at: AM.now(), who: AM.actor(), text }); AM.log(a, `report: ${text.charAt(0).toLowerCase() + text.slice(1)}`); };
  const A = d => AM.audit(d.id);
  Q.actions['rp-compile'] = d => {
    const a = A(d), r = a.report; r.rev = r.rev ?? 0; r.status = 'Draft'; r.sections = AM.defaultNarrative(a); r.compiled = Q.today(); r.reviewed = null; r.approved = null; r.returned = null;
    if (a.status === 'In Progress') { a.status = 'Reporting'; AM.log(a, 'audit moved to reporting'); }
    rlog(a, `Compiled draft Rev ${r.rev} from ${a.areas.length} area results`); Q.save(); Q.go(`#/audits/a/${a.id}/report/edit`); Q.toast('Report compiled', 'Edit the executive summary and conclusion. Findings and NCs stay linked to the records.');
  };
  Q.actions['rp-submit'] = d => { const a = A(d), w = AM.consistency(a); const go = () => { a.report.status = 'For Review'; a.report.returned = null; rlog(a, `Submitted for review to ${Q.pname(a.report.reviewer)}`); Q.save(); Q.render({ noFocus: true }); Q.toast('Submitted for review', Q.pname(a.report.reviewer)); };
    w.length ? Q.confirm({ title: 'Narrative does not match the records', confirm: 'Submit Anyway', danger: true, body: `<p>${w.map(esc).join('<br>')}</p>`, onConfirm: go }) : go(); };
  const noteModal = (title, label, ok, fn, required = false) => { const m = Q.openModal({ size: 's', title, body: `<form class="modal-body"><label class="field"><span>${label}${required ? ' <span class="req">*</span>' : ''}</span><textarea class="textarea" name="note" rows="3" ${required ? 'required' : ''}></textarea></label></form>`, foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${ok}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; fn(Q.formValues(f).note.trim()); Q.closeAllModals(); }); };
  Q.actions['rp-review'] = d => noteModal('Complete review', 'Review comments', 'Complete Review', note => { const a = A(d); a.report.reviewed = { by: AM.actor(), date: Q.today(), note }; rlog(a, `Review completed${note ? ` — ${note}` : ''}`); Q.save(); Q.render({ noFocus: true }); Q.toast('Review completed', `Waiting for ${Q.pname(a.report.approver)} to approve.`); });
  Q.actions['rp-approve'] = d => noteModal('Approve report', 'Approval comment', 'Approve', note => { const a = A(d); a.report.status = 'Approved'; a.report.approved = { by: AM.actor(), date: Q.today(), note }; rlog(a, `Approved${note ? ` — ${note}` : ''}`); Q.save(); Q.render({ noFocus: true }); Q.toast('Report approved', 'The Lead Auditor can publish it.'); });
  Q.actions['rp-return'] = d => noteModal('Return to draft', 'What needs to change', 'Return', note => { const a = A(d); Object.assign(a.report, { status: 'Draft', reviewed: null, approved: null, returned: { by: AM.actor(), date: Q.today(), note } }); rlog(a, `Returned to draft — ${note}`); Q.save(); Q.render({ noFocus: true }); Q.toast('Returned to draft'); }, true);
  Q.actions['rp-publish'] = d => {
    const a = A(d), r = a.report, open = AM.findingsOf(a.id).filter(AM.ncOpen);
    Q.confirm({ title: `Publish Rev ${r.rev}?`, confirm: 'Publish', body: `<p>The report becomes a controlled revision and can no longer be edited. ${open.length ? `<b>${open.length} nonconformit${open.length === 1 ? 'y stays' : 'ies stay'} open</b> under follow-up — publishing does not close them.` : 'All nonconformities are closed.'}</p>`,
      onConfirm: () => { r.status = 'Published'; r.published = Q.today(); r.revisions.push({ rev: r.rev, published: r.published, by: AM.actor(), reviewedBy: r.reviewed?.by, approvedBy: r.approved?.by, html: AM.reportBody(a) });
        a.status = open.length ? 'Follow-up' : 'Published'; rlog(a, `Published Rev ${r.rev}`); AM.log(a, open.length ? `audit moved to follow-up (${open.length} open NC)` : 'audit published; ready to close');
        Q.save(); Q.render({ noFocus: true }); Q.toast(`Report Rev ${r.rev} published`, open.length ? `${open.length} NC still open — the audit is in follow-up.` : 'The audit can now be closed.'); } });
  };
  Q.actions['rp-revise'] = d => { const a = A(d), r = a.report; Q.confirm({ title: 'Create a new revision?', confirm: `Create Rev ${r.rev + 1}`, body: `<p>Rev ${r.rev} stays published and unchanged. Rev ${r.rev + 1} starts as a draft and goes through review and approval again.</p>`,
    onConfirm: () => { Object.assign(r, { rev: r.rev + 1, status: 'Draft', reviewed: null, approved: null, returned: null, compiled: Q.today() }); rlog(a, `Started Rev ${r.rev} draft`); Q.save(); Q.go(`#/audits/a/${a.id}/report/edit`); } }); };
  function ensureSnapshot(a) { const r = a.report; if (r.status === 'Published' && !r.revisions.some(v => v.rev === r.rev)) { r.sections = r.sections || AM.defaultNarrative(a); r.compiled = r.compiled || r.published; r.revisions.push({ rev: r.rev, published: r.published, by: a.auditor, reviewedBy: r.reviewed?.by || r.reviewer, approvedBy: r.approved?.by || r.approver, html: AM.reportBody(a) }); Q.save(); } }

  /* ---------------- editor ---------------- */
  AM.reportEditor = (a, q) => {
    const r = a.report;
    if (r.status !== 'Draft' || !AM.can('report', a)) { location.replace(`#/audits/a/${a.id}/report`); return { title: 'Report', nav: 'audits', html: '' }; }
    const tools = [['bold', 'Bold', 'B'], ['italic', 'Italic', 'I'], ['h2', 'Heading', 'H2'], ['h3', 'Subheading', 'H3'], ['p', 'Paragraph', '¶'], ['ul', 'Bulleted list', '•'], ['ol', 'Numbered list', '1.'], ['table', 'Insert table', '▦'], ['pagebreak', 'Page break', '⤓'], ['undo', 'Undo', '↶'], ['redo', 'Redo', '↷']];
    return { title: `Edit report · ${a.id}`, nav: 'audits', html: Q.pageHead({ crumbs: [['Audits', '#/audits'], [a.id, `#/audits/a/${a.id}`], ['Report', `#/audits/a/${a.id}/report`], ['Edit']], title: `Edit report — ${esc(a.id)} Rev ${esc(String(r.rev))}`, sub: 'Edit the narrative sections. Sections marked “Linked to audit records” are generated from the findings, NCs and plan and update automatically.' }) +
      `<div class="rp-toolbar" role="toolbar" aria-label="Formatting">${tools.map(([c, l, g]) => `<button type="button" class="rt-btn" data-cmd="${c}" title="${l}" aria-label="${l}">${esc(g)}</button>`).join('')}<span class="rt-gap"></span><span class="small muted" id="rpState">No unsaved changes</span><a class="btn" href="#/audits/a/${a.id}/report">Close</a><button class="btn primary" type="button" data-rp-save>Save</button></div>
      <div id="rpWarn"></div><article class="paper report-paper editing">${AM.reportHeader(a, {})}${AM.reportBody(a, { editable: true })}</article>`,
      after: main => {
        let dirty = false, last = null;
        const state = main.querySelector('#rpState'), set = v => { dirty = v; state.textContent = v ? 'Unsaved changes' : 'Saved'; state.classList.toggle('unsaved', v); };
        main.querySelectorAll('[data-narr]').forEach(el => { el.addEventListener('input', () => set(true)); el.addEventListener('focus', () => { last = el; }); });
        main.querySelector('.rp-toolbar').addEventListener('mousedown', e => { if (e.target.closest('[data-cmd]')) e.preventDefault(); }); // keep the caret in the text
        main.querySelector('.rp-toolbar').addEventListener('click', e => {
          const b = e.target.closest('[data-cmd]'); if (!b) return; const el = document.activeElement?.closest?.('[data-narr]') || last;
          if (!el) { Q.toast('Click into an editable section first', 'Executive Summary, Positive Practices or Overall Conclusion.'); return; }
          el.focus(); const c = b.dataset.cmd;
          const map = { bold: ['bold'], italic: ['italic'], h2: ['formatBlock', 'h2'], h3: ['formatBlock', 'h3'], p: ['formatBlock', 'p'], ul: ['insertUnorderedList'], ol: ['insertOrderedList'], undo: ['undo'], redo: ['redo'] };
          if (map[c]) document.execCommand(map[c][0], false, map[c][1]);
          else if (c === 'table') document.execCommand('insertHTML', false, '<table><tbody><tr><th>Heading</th><th>Heading</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>');
          else if (c === 'pagebreak') document.execCommand('insertHTML', false, '<div class="page-break">Page break</div><p></p>');
          set(true);
        });
        const save = () => {
          main.querySelectorAll('[data-narr]').forEach(el => { a.report.sections[el.dataset.narr] = AM.sanitize(el.innerHTML); });
          rlog(a, `Edited narrative (Rev ${a.report.rev})`); Q.save(); set(false);
          const w = AM.consistency(a); main.querySelector('#rpWarn').innerHTML = w.length ? `<div class="callout danger small" style="margin-bottom:12px">${icon('triangle-alert')}<span><b>Narrative does not match the audit records</b>${w.map(esc).join(' ')}</span></div>` : ''; Q.refreshIcons();
          Q.toast('Report saved', w.length ? 'Check the warning above.' : 'Linked sections are always generated from the records.');
        };
        main.querySelector('[data-rp-save]').addEventListener('click', save);
        main.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
        // Leaving the editor with unsaved changes keeps them as the draft (the elements are still readable after the page re-renders).
        const els = [...main.querySelectorAll('[data-narr]')];
        addEventListener('hashchange', function leave() { removeEventListener('hashchange', leave); if (!dirty) return; els.forEach(el => { a.report.sections[el.dataset.narr] = AM.sanitize(el.innerHTML); }); rlog(a, `Edited narrative (Rev ${a.report.rev})`); Q.save(); Q.toast('Draft saved', 'Your report edits were saved when you left the editor.'); });
      } };
  };

  /* ---------------- print / PDF ---------------- */
  AM.reportHeader = (a, { kind = 'report', area = null, rev = null } = {}) => {
    const o = Q.S.organization, r = a.report, title = kind === 'plan' ? 'Audit Plan' : area ? `${Q.proc(area).name} — Area Audit Report` : 'Internal Audit Report';
    const revLabel = kind === 'plan' ? '—' : area ? 'Area report' : `Rev ${rev ?? r.rev ?? 0}`;
    const status = kind === 'plan' ? a.status : area ? (AM.area(a, area).status) : rev != null ? 'Published' : r.status;
    const auditors = area ? [AM.area(a, area).auditor] : [...new Set(a.areas.map(x => x.auditor).filter(Boolean))];
    const appr = rev != null ? r.revisions.find(v => v.rev === rev) : null;
    return `<header class="rp-head"><div class="rp-brand"><span class="org-mark">${esc(o.initials)}</span><div><b>${esc(o.name)}</b><span>Quality Management System</span></div></div>
      <table class="rp-ctl"><tr><td>Document</td><td><b>${esc(a.id)}${area ? '-' + esc(Q.proc(area).process_code) : ''}</b></td></tr><tr><td>Revision</td><td><b>${esc(revLabel)}</b></td></tr><tr><td>Status</td><td>${esc(status)}</td></tr><tr><td>Classification</td><td>Internal</td></tr></table></header>
      <h1 class="rp-title">${esc(title)}</h1><p class="rp-subtitle">${esc(a.title)}</p>
      <table class="rp-cover"><tr><th>Audit number</th><td>${esc(a.id)}</td><th>Audit date</th><td>${AM.dateRange(a)}</td></tr>
        <tr><th>Area(s)</th><td>${(area ? [area] : a.areas.map(x => x.process)).map(p => esc(Q.proc(p).name)).join(', ')}</td><th>Lead Auditor</th><td>${esc(Q.pname(a.auditor))}</td></tr>
        <tr><th>Auditor(s)</th><td>${auditors.map(w => esc(Q.pname(w))).join(', ')}</td><th>Approval</th><td>${kind === 'plan' ? '—' : area ? (AM.area(a, area).submitted ? `Submitted ${Q.fmt(AM.area(a, area).submitted.date)}` : 'Not submitted') : appr ? `Approved by ${esc(Q.pname(appr.approvedBy))}, published ${Q.fmt(appr.published)}` : r.approved ? `Approved by ${esc(Q.pname(r.approved.by))}, ${Q.fmt(r.approved.date)}` : 'Not yet approved'}</td></tr>
        <tr><th>Generated</th><td>${Q.fmt(Q.today())} ${new Date().toTimeString().slice(0, 5)}</td><th>Revision</th><td>${esc(revLabel)}</td></tr></table>`;
  };
  AM.printView = (a, q) => {
    const kind = q.kind === 'plan' ? 'plan' : 'report', area = a.areas.some(ar => ar.process === q.area) ? q.area : null, rev = q.rev != null && q.rev !== '' ? +q.rev : null;
    ensureSnapshot(a);
    const frozen = rev != null ? a.report.revisions.find(v => v.rev === rev) : null;
    const body = kind === 'plan' ? AM.planBody(a) : area ? AM.areaBody(a, area) : frozen ? frozen.html : AM.reportBody(a);
    const title = kind === 'plan' ? 'Audit Plan' : area ? `${Q.proc(area).name} Area Audit Report` : 'Internal Audit Report';
    const draft = kind === 'report' && !area && !frozen && a.report.status !== 'Published';
    const foot = `${a.id}${area ? '-' + Q.proc(area).process_code : ''} · ${title} · ${kind === 'plan' ? 'Audit plan' : area ? 'Area report' : `Rev ${frozen ? frozen.rev : a.report.rev ?? 0}`} · Controlled copy only when viewed in iQMS`;
    const cssStr = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    return { title: `${title} · ${a.id}`, nav: 'audits', html: `<style>@page { size: A4; margin: 16mm 14mm 18mm; @bottom-left { content: ${cssStr(foot)}; font: 8pt sans-serif; color: #555; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt sans-serif; color: #555; } @top-right { content: ${cssStr(Q.S.organization.name + (draft ? ' · DRAFT — not a controlled copy' : ''))}; font: 8pt sans-serif; color: #555; } }</style>
      <div class="print-bar"><a class="btn" href="#/audits/a/${a.id}/${kind === 'plan' ? 'plan' : 'report'}">${icon('arrow-left')}Back to audit</a><span class="pb-t"><b>${esc(title)}</b> ${frozen ? `· Rev ${frozen.rev} (published, frozen)` : draft ? '· draft preview' : ''}</span><button class="btn" type="button" data-print>${icon('download')}Download PDF</button><button class="btn primary" type="button" data-print>${icon('file-text')}Print</button></div>
      <p class="print-hint small muted">Download PDF opens the print dialog — choose “Save as PDF”. The layout is A4 with page numbers and the controlled-document footer.</p>
      ${draft ? '<div class="callout warning small no-print-hide" style="max-width:900px;margin:0 auto 12px">' + icon('file-text') + '<span><b>Draft — not a controlled copy</b>The printed draft is watermarked.</span></div>' : ''}
      <article class="paper report-paper${draft ? ' is-draft' : ''}">${AM.reportHeader(a, { kind, area, rev: frozen ? frozen.rev : null })}${body}
        <footer class="rp-foot"><span>${esc(foot)}</span></footer></article>`,
      after: main => { main.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => window.print())); if (q.go === 'print') setTimeout(() => window.print(), 300); } };
  };
  // Printing from a report page hides the application shell.
  const syncPrintMode = () => document.body.classList.toggle('print-report', /^#\/audits\/a\/[^/]+\/print/.test(location.hash));
  addEventListener('hashchange', syncPrintMode); syncPrintMode();

  /* ---------------- reports list ---------------- */
  AM.reportsList = () => {
    const rows = () => Q.S.audits.filter(a => a.report.status !== 'Not started' || a.areas.some(ar => ar.status === 'Submitted'));
    return { title: 'Reports · Audits', nav: 'audits', html: AM.chrome('reports', { title: 'Audit Reports', crumbs: [['Audits', '#/audits'], ['Reports']], sub: 'Consolidated audit reports and area reports. Published reports are controlled revisions.' }) +
      Q.table({ id: 'am-rep', rows, noun: 'audits', caption: 'Audit reports', search: a => `${a.id} ${a.title}`,
        tools: `<div class="search-input">${icon('search')}<input class="input" type="search" data-search placeholder="Search reports" aria-label="Search reports"></div><select class="select" data-filter="st" aria-label="Report status"><option value="all">All report statuses</option>${['Not started', 'Draft', 'For Review', 'Approved', 'Published'].map(s => `<option>${s}</option>`).join('')}</select>`,
        filters: { st: (a, v) => a.report.status === v },
        columns: [
          { key: 'id', label: 'Audit No.', cls: 'c-id', sort: a => a.id, render: a => esc(a.id) },
          { key: 't', label: 'Report', sort: a => a.title, render: a => `<span class="title">${esc(a.title)}</span><span class="sub">${esc(a.type)} · ${AM.dateRange(a)}</span>` },
          { key: 'ar', label: 'Area reports', render: a => `${a.areas.filter(x => x.status === 'Submitted').length} / ${a.areas.length} submitted` },
          { key: 's', label: 'Report status', sort: a => a.report.status, render: a => Q.st(a.report.status, AM.REPORT_KIND[a.report.status]) },
          { key: 'rev', label: 'Revision', render: a => a.report.rev != null && a.report.status !== 'Not started' ? `Rev ${esc(String(a.report.rev))}` : '<span class="muted">—</span>' },
          { key: 'p', label: 'Published', cls: 'c-date', sort: a => a.report.published || '', render: a => a.report.published ? Q.fmt(a.report.published) : '<span class="muted">—</span>' },
          { key: 'ra', label: 'Reviewer / approver', render: a => `<span class="small">${esc(Q.pname(a.report.reviewer))} / ${esc(Q.pname(a.report.approver))}</span>` },
          { key: 'x', label: 'Actions', cls: 'c-actions', render: a => `<a class="btn sm" href="#/audits/a/${a.id}/report">Open Report</a>${a.report.status !== 'Not started' ? `<a class="btn sm ghost" href="#/audits/a/${a.id}/print">Preview</a>` : ''}` }] }) };
  };
})();
