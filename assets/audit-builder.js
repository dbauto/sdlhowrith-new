/* iQMS — Audit Management: the Audit Plan Builder (#/audits/new), the checklist builder used by the
 * builder, the audit workspace and checklist templates (#/audits/templates).
 *
 * The builder is a focused page with a step list, a main canvas and a context panel. One audit is
 * always one process. Work is kept while moving between steps and can be saved as a draft. */
(() => {
  'use strict';
  const { esc, icon } = Q;
  const AM = Q.AM;
  const opts = (list, sel) => list.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
  const rr = () => Q.render({ noFocus: true, keepScroll: true });
  const CRIT = 'ISO 9001:2026; internal QMS procedures; customer requirements; statutory and regulatory requirements where applicable';
  const plus = (t, m) => { const [h, mm] = String(t || '08:00').split(':').map(Number), x = h * 60 + (mm || 0) + m; return `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

  /* ====================================================================== checklist builder (shared)
   * model: { sections: [{id, clause, title}], checklist: [items], clauses: [...] }.
   * mode 'audit' shows the auditor assigned to each question; 'template' does not. */
  AM.builderHtml = (m, { edit = true, mode = 'audit', auditors = [], key = 'cb' } = {}) => {
    const secs = m.sections || [], items = m.checklist || [];
    const n = items.filter(AM.answerable).length, unassigned = mode === 'audit' ? items.filter(i => AM.answerable(i) && !i.assignee).length : 0;
    const who = w => auditors.find(x => x[0] === w)?.[1] || Q.pname(w);
    let no = 0;
    const item = (i, k, list) => {
      const ans = AM.answerable(i); if (ans) no++;
      const cls = i.type === 'heading' ? ' cb-heading' : i.type === 'instruction' ? ' cb-instr' : '';
      return `<li class="cb-item${cls}" data-cb-item="${i.id}"><span class="cb-n tnum">${ans ? no : ''}</span><div class="cb-main"><div class="cb-q">${i.type === 'instruction' ? icon('info') : ''}${esc(i.question)}${ans && i.required ? '<span class="req" title="Required"> *</span>' : ''}</div>
        <div class="cb-meta"><span class="tag">${esc(AM.itemType(i.type))}</span>${i.clause ? `<span class="clause">${esc(i.clause)}</span>` : ''}${ans && !i.required ? '<span class="small muted">Optional</span>' : ''}${i.expected?.length ? `<span class="small muted" title="${esc(i.expected.join(' · '))}">${icon('files')}${i.expected.length} expected evidence</span>` : ''}${i.options?.length ? `<span class="small muted">${i.options.length} options</span>` : ''}${i.result ? `<span class="st ${AM.typeKind(i.result)}">${esc(AM.short(i.result))}</span>` : ''}</div></div>
        ${mode === 'audit' && ans ? `<div class="cb-asg">${edit ? `<label class="sr-only" for="asg-${i.id}">Auditor for this question</label><select class="select" id="asg-${i.id}" data-cb-assign="${i.id}">${!i.assignee ? '<option value="">Unassigned</option>' : ''}${auditors.map(([w, l]) => `<option value="${w}"${w === i.assignee ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : i.assignee ? `<span class="cb-who"><span class="avatar sm">${esc(Q.initials(i.assignee))}</span>${esc(who(i.assignee))}</span>` : '<span class="st warning">Unassigned</span>'}</div>` : ''}
        ${edit ? `<div class="cb-ctl"><button class="icon-btn" type="button" data-cb="up" data-id="${i.id}" aria-label="Move up" ${k === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button><button class="icon-btn" type="button" data-cb="down" data-id="${i.id}" aria-label="Move down" ${k === list.length - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button>${Q.menu('Question actions', [{ label: 'Edit Question', icon: 'pencil', data: { cb: 'edit', id: i.id } }, { label: 'Duplicate', icon: 'copy', data: { cb: 'dup', id: i.id } }, '-', { label: 'Delete', icon: 'trash-2', cls: 'danger', data: { cb: 'del', id: i.id }, disabled: !!(i.result || i.finding || i.answer != null && i.answer !== '') }])}</div>` : ''}</li>`;
    };
    return `<div class="cb" data-cb-root="${key}">${edit ? `<div class="cb-bar"><span class="small muted">${secs.length} section${secs.length === 1 ? '' : 's'} · ${n} question${n === 1 ? '' : 's'}${unassigned ? ` · <b class="warnv">${unassigned} unassigned</b>` : ''}</span><span class="grow"></span><button class="btn sm" type="button" data-cb="add-sec">${icon('plus')}Add Section</button>${secs.length ? `<button class="btn sm primary" type="button" data-cb="add" data-sec="${secs[secs.length - 1].id}">${icon('plus')}Add Question</button>` : ''}</div>` : ''}
      ${secs.map((s, si) => { const list = items.filter(i => i.section === s.id); return `<section class="cb-sec" data-cb-sec="${s.id}"><header>${s.clause ? `<span class="clause">${esc(s.clause)}</span>` : ''}<h3>${esc(s.title)}</h3><span class="small muted">${list.filter(AM.answerable).length} question${list.filter(AM.answerable).length === 1 ? '' : 's'}</span>
        ${edit ? `<span class="grow"></span><button class="btn sm ghost" type="button" data-cb="add" data-sec="${s.id}">${icon('plus')}Add Question</button>${Q.menu('Section actions', [{ label: 'Edit Section', icon: 'pencil', data: { cb: 'edit-sec', sec: s.id } }, { label: 'Move Section Up', icon: 'arrow-up', data: { cb: 'sec-up', sec: s.id }, disabled: si === 0 }, { label: 'Move Section Down', icon: 'arrow-down', data: { cb: 'sec-down', sec: s.id }, disabled: si === secs.length - 1 }, '-', { label: 'Delete Section', icon: 'trash-2', cls: 'danger', data: { cb: 'del-sec', sec: s.id } }])}` : ''}</header>
        ${list.length ? `<ol class="cb-list">${list.map((i, k) => item(i, k, list)).join('')}</ol>` : `<p class="small muted cb-empty">No questions in this section.${edit ? ' Add one.' : ''}</p>`}</section>`; }).join('') || `<div class="empty"><h3>No checklist yet</h3><p>Add a section, or load the process default checklist.</p></div>`}</div>`;
  };
  // Wire the builder: every change goes through `changed()`; `audit` (when given) is used for logging.
  AM.builderWire = (root, m, { mode = 'audit', auditors = [], changed, log = () => {} }) => {
    const box = root.querySelector('.cb'); if (!box) return;
    const itemsOf = sid => m.checklist.filter(i => i.section === sid);
    const clauseOpts = sel => { const all = [...new Set([...(m.clauses || []), ...(m.clauses || []).flatMap(AM.subsOf), ...m.sections.map(s => s.clause).filter(Boolean)])].sort(AM.clSort); return `<option value="">No clause</option>${all.map(c => `<option value="${c}"${c === sel ? ' selected' : ''}>${esc(c)} ${esc(AM.clTitle(c))}</option>`).join('')}`; };
    const qForm = (i, sid) => `<form class="modal-body"><div class="form-grid">
      <label class="field"><span>Question type</span><select class="select" name="type" data-qt>${opts(AM.ITEM_TYPES, i.type || 'assessment')}</select></label>
      <label class="field"><span>Section</span><select class="select" name="section">${opts(m.sections.map(s => [s.id, `${s.clause ? s.clause + ' ' : ''}${s.title}`]), i.section || sid)}</select></label>
      <label class="field full"><span data-ql>Question <span class="req">*</span></span><textarea class="textarea" name="question" rows="2" required>${esc(i.question || '')}</textarea></label>
      <label class="field" data-ans><span>ISO clause</span><select class="select" name="clause">${clauseOpts(i.clause ?? m.sections.find(s => s.id === (i.section || sid))?.clause ?? '')}</select></label>
      ${mode === 'audit' ? `<label class="field" data-ans><span>Assigned auditor</span><select class="select" name="assignee"><option value="">By clause assignment</option>${opts(auditors, i.manual ? i.assignee : '')}</select><span class="help">Leave “By clause assignment” to follow the auditor’s assigned clauses.</span></label>` : ''}
      <label class="field full" data-ans><span>Expected evidence</span><textarea class="textarea" name="expected" rows="3" placeholder="One per line, e.g. Approved Supplier List">${esc((i.expected || []).join('\n'))}</textarea></label>
      <label class="field full" data-opt><span>Options</span><textarea class="textarea" name="options" rows="3" placeholder="One per line">${esc((i.options || []).join('\n'))}</textarea></label>
      <label class="checkbox full" data-ans><input type="checkbox" name="required" ${i.required !== false ? 'checked' : ''}>Required — the auditor cannot submit until this is answered</label></div></form>`;
    const wireQ = md => { const sync = () => { const t = md.querySelector('[data-qt]').value, ans = !['heading', 'instruction'].includes(t); md.querySelectorAll('[data-ans]').forEach(el => { el.hidden = !ans; }); md.querySelector('[data-opt]').hidden = t !== 'choice'; md.querySelector('[data-ql]').firstChild.textContent = t === 'heading' ? 'Heading ' : t === 'instruction' ? 'Instruction text ' : 'Question '; }; md.querySelector('[data-qt]').addEventListener('change', sync); sync(); };
    const readQ = md => { const f = md.querySelector('form'); if (!Q.validate(f)) return null; const v = Q.formValues(f), fd = new FormData(f), lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
      if (v.type === 'choice' && lines(v.options).length < 2) { Q.toast('Add at least two options'); return null; }
      return { type: v.type, section: v.section, question: v.question.trim(), clause: v.clause || '', required: AM.answerable({ type: v.type }) && fd.has('required'), expected: lines(v.expected), options: v.type === 'choice' ? lines(v.options) : [], assignee: v.assignee || null }; };
    const applyAsg = (i, v) => { if (mode !== 'audit') return; if (v.assignee) { i.assignee = v.assignee; i.manual = true; } else { i.manual = false; } };
    const swap = (list, a, b) => { const ia = m.checklist.indexOf(list[a]), ib = m.checklist.indexOf(list[b]); [m.checklist[ia], m.checklist[ib]] = [m.checklist[ib], m.checklist[ia]]; };
    box.addEventListener('change', e => { const s = e.target.closest('[data-cb-assign]'); if (!s) return; const i = m.checklist.find(x => x.id === s.dataset.cbAssign); i.assignee = s.value || null; i.manual = !!s.value; log(`assigned question “${i.question.slice(0, 50)}” to ${Q.pname(s.value)}`); changed(); });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-cb]'); if (!b) return;
      e.preventDefault(); Q.closeMenus();
      const op = b.dataset.cb, id = b.dataset.id, sid = b.dataset.sec, i = id && m.checklist.find(x => x.id === id);
      if (op === 'up' || op === 'down') { const list = itemsOf(i.section), k = list.indexOf(i), j = op === 'up' ? k - 1 : k + 1; if (j < 0 || j >= list.length) return; swap(list, k, j); changed(); requestAnimationFrame(() => document.querySelector(`[data-cb-item="${id}"] [data-cb="${op}"]`)?.focus()); return; }
      if (op === 'add' || op === 'edit') {
        const md = Q.openModal({ size: 'l', title: op === 'add' ? 'Add question' : 'Edit question', body: qForm(op === 'edit' ? i : { section: sid }, sid), foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${op === 'add' ? 'Add Question' : 'Save'}</button>` });
        wireQ(md);
        md.querySelector('[data-ok]').addEventListener('click', () => { const v = readQ(md); if (!v) return;
          if (op === 'add') { const it = AM.newItem({ section: v.section, clause: v.clause, question: v.question, type: v.type, required: v.required, expected: v.expected, options: v.options }); const last = m.checklist.map(x => x.section === v.section).lastIndexOf(true); m.checklist.splice(last + 1, 0, it); applyAsg(it, v); log(`added checklist question “${v.question.slice(0, 60)}”`); }
          else { const moved = i.section !== v.section; Object.assign(i, { type: v.type, question: v.question, clause: v.clause, required: v.required, expected: v.expected, options: v.options }); if (moved) { m.checklist.splice(m.checklist.indexOf(i), 1); i.section = v.section; const last = m.checklist.map(x => x.section === v.section).lastIndexOf(true); m.checklist.splice(last + 1, 0, i); } applyAsg(i, v); log(`edited checklist question “${v.question.slice(0, 60)}”${moved ? ' (moved to another section)' : ''}`); }
          Q.closeAllModals(); changed(); });
        return;
      }
      if (op === 'dup') { const c = { ...JSON.parse(JSON.stringify(i)), id: AM.uid('q'), result: null, answer: null, naReason: '', notes: '', reviewed: [], external: [], finding: null, by: null, date: null }; m.checklist.splice(m.checklist.indexOf(i) + 1, 0, c); log(`duplicated checklist question “${i.question.slice(0, 60)}”`); changed(); return; }
      if (op === 'del') { Q.confirm({ title: 'Delete question?', danger: true, confirm: 'Delete', body: `<p>${esc(i.question)}</p>`, onConfirm: () => { m.checklist.splice(m.checklist.indexOf(i), 1); log(`deleted checklist question “${i.question.slice(0, 60)}”`); changed(); } }); return; }
      const secForm = (s = {}) => `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Clause</span><select class="select" name="clause">${clauseOpts(s.clause || '')}</select></label><label class="field"><span>Section title <span class="req">*</span></span><input class="input" name="title" required value="${esc(s.title || '')}" placeholder="e.g. Supplier evaluation"></label></div></form>`;
      if (op === 'add-sec' || op === 'edit-sec') {
        const s = m.sections.find(x => x.id === sid), md = Q.openModal({ size: 's', title: s ? 'Edit section' : 'Add section', body: secForm(s), foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${s ? 'Save' : 'Add Section'}</button>` });
        md.querySelector('[name=clause]').addEventListener('change', e2 => { const t = md.querySelector('[name=title]'); if (!t.value && e2.target.value) t.value = AM.clTitle(e2.target.value); });
        md.querySelector('[data-ok]').addEventListener('click', () => { const f = md.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); if (s) Object.assign(s, { clause: v.clause, title: v.title.trim() }); else m.sections.push(AM.newSection(v.clause, v.title.trim())); log(`${s ? 'edited' : 'added'} checklist section “${v.title.trim()}”`); Q.closeAllModals(); changed(); });
        return;
      }
      if (op === 'sec-up' || op === 'sec-down') { const k = m.sections.findIndex(x => x.id === sid), j = op === 'sec-up' ? k - 1 : k + 1; if (j < 0 || j >= m.sections.length) return; [m.sections[k], m.sections[j]] = [m.sections[j], m.sections[k]]; changed(); return; }
      if (op === 'del-sec') { const s = m.sections.find(x => x.id === sid), list = itemsOf(sid); if (list.some(x => x.result || x.finding)) { Q.toast('Section has answers', 'Questions that are already answered cannot be deleted.'); return; }
        Q.confirm({ title: `Delete “${esc(s.title)}”?`, danger: true, confirm: 'Delete Section', body: `<p>${list.length ? `Its ${list.length} question${list.length === 1 ? '' : 's'} are deleted too.` : 'The section is empty.'}</p>`, onConfirm: () => { m.sections.splice(m.sections.indexOf(s), 1); m.checklist = m.checklist.filter(x => x.section !== sid); log(`deleted checklist section “${s.title}”`); changed(); } });
      }
    });
  };

  /* ====================================================================== the Audit Plan Builder */
  const STEPS = [['process', 'Process'], ['trigger', 'Trigger'], ['plan', 'Audit Plan'], ['clauses', 'Applicable Clauses'], ['schedule', 'Schedule'], ['auditors', 'Auditors'], ['checklist', 'Checklist Builder'], ['review', 'Review & Create']];
  let W = null;
  const fresh = q => {
    const S = Q.S, yr = Q.today().slice(0, 4), lead = (S.auditors || []).some(x => x.who === AM.actor() && x.level === 'Lead Auditor') ? AM.actor() : 'maria';
    const progDefault = q.programme && AM.prog(q.programme) ? q.programme : q.source ? '' : (S.auditProgrammes.find(p => p.year === +yr && !['Completed', 'Archived'].includes(p.status))?.id || '');
    const w = { draftId: null, step: 0, maxStep: 0, process: null, trigger: { type: q.trigger === 'Triggered' || q.source ? 'Triggered' : 'Planned', source: q.source || '', record: q.record || '', reason: '' }, programme: progDefault, plannedPeriod: '', title: '', objective: '', scope: '', criteria: CRIT, description: '',
      clauses: [], clausesCustom: false, location: '', mode: 'On-site', startDate: '', endDate: '', opening: '08:30', closing: '16:00', sessions: [], auditor: lead, assignments: [], sections: [], checklist: null, source: null };
    if (q.process && Q.proc(q.process)) setProcess(w, q.process);
    if (q.source === 'Risk' && q.record) { const r = S.risks.find(x => x.id === q.record); if (r) { if (!w.process) setProcess(w, Q.rootId(r.process)); w.trigger.reason = `Verify whether the controls for risk ${r.id} (“${r.title}”) are adequate and effective.`; } }
    if (w.process && w.trigger.type === 'Triggered') w.step = 1;
    return w;
  };
  function setProcess(w, pid) {
    const p = Q.proc(pid); w.process = pid; w.clauses = (p.iso || []).slice().sort(AM.clSort); w.clausesCustom = false;
    w.title = `${p.name} Internal Audit`; w.scope = w.scope || `${p.name}: ${p.purpose || ''}`.trim(); w.sections = []; w.checklist = null; w.source = null;
    w.assignments = [{ id: AM.uid('as'), who: w.auditor, role: 'Lead Auditor', clauses: [], scope: '', independent: null, sessions: [], submitted: null, comments: '', conclusion: '' }];
  }
  const fromAudit = a => ({ draftId: a.id, step: a.draft?.step || 0, maxStep: a.draft?.step || 0, process: a.process, trigger: { ...a.trigger }, programme: a.programme || '', plannedPeriod: a.plannedPeriod, title: a.title, objective: a.objective, scope: a.scope, criteria: a.criteria, description: a.description || '',
    clauses: a.clauses.slice(), clausesCustom: !!a.draft?.clausesCustom, location: a.location || '', mode: a.mode || 'On-site', startDate: a.draft?.startDate || AM.startDate(a) || '', endDate: a.draft?.endDate || AM.endDate(a) || '', opening: a.draft?.opening || '08:30', closing: a.draft?.closing || '16:00',
    sessions: JSON.parse(JSON.stringify(a.sessions || [])), auditor: a.auditor, assignments: JSON.parse(JSON.stringify(a.assignments || [])), sections: JSON.parse(JSON.stringify(a.sections || [])), checklist: a.checklist ? JSON.parse(JSON.stringify(a.checklist)) : null, source: a.draft?.source || null });
  // The builder state as an audit-shaped object (for assignment logic, conflicts and creation).
  const asAudit = (w, id = 'NEW') => ({ id, programme: w.trigger.type === 'Planned' ? w.programme || null : w.programme || null, process: w.process, trigger: { ...w.trigger, source: w.trigger.type === 'Triggered' ? w.trigger.source : null, record: w.trigger.type === 'Triggered' ? w.trigger.record || null : null },
    title: w.title.trim(), objective: w.objective.trim(), scope: w.scope.trim(), criteria: w.criteria.trim(), description: w.description.trim(), clauses: w.clauses.slice().sort(AM.clSort), plannedPeriod: w.plannedPeriod || (w.startDate ? `Q${Math.ceil(+w.startDate.slice(5, 7) / 3)} ${w.startDate.slice(0, 4)}` : ''),
    auditor: w.auditor, location: w.location, mode: w.mode, sessions: w.sessions, assignments: w.assignments, sections: w.checklist ? w.sections : null, checklist: w.checklist, status: 'Planned', report: { status: 'Not started', rev: null, reviewer: w.auditor === 'maria' ? 'nina' : 'maria', approver: 'eric', history: [], revisions: [] }, activity: [] });

  AM.route('new', (parts, q) => {
    if (!AM.can('create')) return { title: 'Create Audit', nav: 'audits', html: AM.chrome('list', { title: 'Create Audit', sub: 'Only the QMS Manager can create audits.' }) };
    if (q.draft) { if (!W || W.draftId !== q.draft) { const a = AM.audit(q.draft); if (a) W = fromAudit(a); } }
    else if (!W || W.draftId || q.fresh || W._q !== location.hash) { W = fresh(q); W._q = location.hash; }
    const step = STEPS[W.step][0], ctx = W.process ? AM.processContext(W.process) : null;
    const canvas = { process: stProcess, trigger: stTrigger, plan: stPlan, clauses: stClauses, schedule: stSchedule, auditors: stAuditors, checklist: stChecklist, review: stReview }[step]();
    const nav = `<ol class="apb-steps" aria-label="Audit plan steps">${STEPS.map(([k, l], i) => `<li class="${i < W.step ? 'done' : i === W.step ? 'current' : ''}"><button type="button" data-pb-go="${i}" ${i > W.maxStep ? 'disabled' : ''} ${i === W.step ? 'aria-current="step"' : ''}><span class="n">${i < W.step || (i <= W.maxStep && i !== W.step) ? icon('check') : i + 1}</span>${esc(l)}</button></li>`).join('')}</ol>`;
    const side = ctx ? contextPanel(ctx) : `<div class="apb-ctx-empty small muted">${icon('info')} Choose a process. Its owner, clauses, documents, risks, KPIs, previous audits and open NCs load here.</div>`;
    const last = W.step === STEPS.length - 1;
    const foot = `<div class="apb-foot"><a class="btn" href="#/audits/list">Cancel</a><span class="grow"></span>${W.step ? '<button class="btn" type="button" data-pb="back">Back</button>' : ''}${W.process ? `<button class="btn" type="button" data-pb="draft">${icon('download')}Save Draft</button>` : ''}<button class="btn primary" type="button" data-pb="${last ? 'create' : 'next'}">${last ? 'Create Audit Plan' : 'Continue'}</button></div>`;
    return { title: 'Create Audit · Audits', nav: 'audits', html: Q.pageHead({ crumbs: [['Audits', '#/audits'], ['Audit Register', '#/audits/list'], [W.draftId ? `Draft ${W.draftId}` : 'Create Audit']], title: W.process ? `${esc(Q.proc(W.process).name)} — Audit Plan` : 'Create Audit Plan', sub: 'One audit covers one process. Move between steps freely; nothing is lost until you cancel.' }) +
      `<div class="apb"><nav class="apb-nav">${nav}</nav><div class="apb-main"><div class="apb-canvas" id="pbCanvas"><h2 class="apb-h">${W.step + 1}. ${esc(STEPS[W.step][1])}</h2>${canvas.html}<p class="auth-err" role="alert" id="pbErr"></p></div>${foot}</div><aside class="apb-ctx">${side}</aside></div>`,
      after: main => {
        canvas.after?.(main);
        main.querySelectorAll('[data-pb-go]').forEach(b => b.addEventListener('click', () => { read(main); if (+b.dataset.pbGo > W.step && !validate(main)) return; W.step = +b.dataset.pbGo; Q.render(); }));
        main.querySelectorAll('[data-pb]').forEach(b => b.addEventListener('click', () => {
          read(main); const op = b.dataset.pb;
          if (op === 'back') { W.step--; Q.render(); return; }
          if (op === 'draft') { saveDraft(); return; }
          if (!validate(main)) return;
          if (op === 'next') { W.step++; W.maxStep = Math.max(W.maxStep, W.step); prepareStep(); Q.render(); return; }
          if (op === 'create') create();
        }));
      } };
  });
  const err = (main, t) => { const e = main.querySelector('#pbErr'); if (e) e.textContent = t; if (t) e.scrollIntoView({ block: 'nearest' }); return !t; };
  // Read plain fields of the current step into the state.
  function read(main) {
    main.querySelectorAll('#pbCanvas [data-w]').forEach(el => { const k = el.dataset.w; const v = el.type === 'checkbox' ? el.checked : el.value; if (k.startsWith('trigger.')) W.trigger[k.slice(8)] = v; else W[k] = v; });
  }
  function validate(main) {
    const s = STEPS[W.step][0];
    if (s === 'process' && !W.process) return err(main, 'Choose the one process this audit covers.');
    if (s === 'trigger') { if (W.trigger.type === 'Triggered' && !W.trigger.source) return err(main, 'Choose what triggered the audit.'); if (W.trigger.type === 'Triggered' && !W.trigger.reason.trim()) return err(main, 'Give the reason / context for the triggered audit.'); }
    if (s === 'plan') { if (!W.title.trim()) return err(main, 'Give the audit a title.'); if (!W.objective.trim()) return err(main, 'State the audit objective.'); }
    if (s === 'clauses' && !W.clauses.length) return err(main, 'Keep at least one clause.');
    if (s === 'schedule') { if (W.startDate && W.endDate && W.endDate < W.startDate) return err(main, 'The end date is before the start date.'); if (W.sessions.some(x => x.end <= x.start)) return err(main, 'A session ends before it starts.'); }
    if (s === 'auditors' && !W.assignments.some(x => x.role === 'Lead Auditor')) return err(main, 'The audit needs a Lead Auditor.');
    return err(main, '');
  }
  function prepareStep() {
    const s = STEPS[W.step][0];
    if (s === 'schedule' && !W.sessions.length && W.startDate) genSessions();
    if (s === 'checklist' && W.checklist) { const a = asAudit(W); a.checklist = W.checklist; AM.applyAssignments(a); }
  }
  function genSessions() {
    const all = W.assignments.map(x => x.who), end = W.endDate || W.startDate, loc = W.location;
    W.sessions = [{ id: AM.uid('ss'), title: 'Opening meeting', date: W.startDate, start: W.opening, end: plus(W.opening, 30), location: loc, auditors: all.slice(), notes: '' }];
    for (let d = W.startDate, n = 0; d <= end && n < 7; d = Q.addDays(d, 1), n++) W.sessions.push({ id: AM.uid('ss'), title: n ? `Fieldwork — day ${n + 1}` : 'Fieldwork', date: d, start: n ? W.opening : plus(W.opening, 30), end: d === end ? W.closing : '16:30', location: loc, auditors: all.slice(), notes: '' });
    W.sessions.push({ id: AM.uid('ss'), title: 'Closing meeting', date: end, start: W.closing, end: plus(W.closing, 30), location: loc, auditors: all.slice(), notes: '' });
  }
  const tempAudit = () => ({ ...asAudit(W, W.draftId || 'NEW'), status: 'Scheduled' });
  function saveDraft() {
    const S = Q.S, a = asAudit(W);
    let ex = W.draftId && AM.audit(W.draftId);
    if (!ex) { let n = 1; while (S.audits.some(x => x.id === `DRAFT-${String(n).padStart(3, '0')}`)) n++; ex = { id: `DRAFT-${String(n).padStart(3, '0')}` }; S.audits.push(ex); W.draftId = ex.id; }
    Object.assign(ex, { ...a, id: ex.id, status: 'Draft', draft: { step: W.step, clausesCustom: W.clausesCustom, startDate: W.startDate, endDate: W.endDate, opening: W.opening, closing: W.closing, source: W.source, saved: AM.now(), by: AM.actor() } });
    Q.save(); Q.toast('Draft saved', `${ex.id} · continue it any time from the Audit Register.`);
    history.replaceState(null, '', `#/audits/new?draft=${ex.id}`);
  }
  function create() {
    const S = Q.S, a = asAudit(W);
    if (!a.checklist || !AM.counted(a).length) { Q.toast('Build the checklist first', 'Load the process default, a template, or add questions.'); return; }
    const year = (AM.startDate(a) || (AM.prog(a.programme)?.year ? String(AM.prog(a.programme).year) : '') || a.plannedPeriod.slice(-4) || Q.today()).slice(0, 4);
    const max = Math.max(0, ...S.audits.filter(x => x.id.startsWith(`IA-${year}-`)).map(x => parseInt(x.id.split('-')[2], 10) || 0));
    const id = `IA-${year}-${String(max + 1).padStart(2, '0')}`;
    if (W.draftId) { const i = S.audits.findIndex(x => x.id === W.draftId); if (i >= 0) S.audits.splice(i, 1); }
    a.id = id; a.assignments.forEach(s => { s.sessions = a.sessions.filter(x => x.auditors.includes(s.who)).map(x => x.id); });
    AM.applyAssignments(a); AM.refresh(a);
    AM.log(a, `created the audit plan (${AM.triggerLabel(a)}${a.trigger.record ? ` ${a.trigger.record}` : ''})`);
    AM.log(a, `assigned the audit team: ${a.assignments.map(s => `${Q.pname(s.who)} (${s.role}${s.clauses.length ? ` · ${s.clauses.join(', ')}` : ''})`).join(', ')}`);
    if (a.sessions.length) AM.log(a, `scheduled ${a.sessions.length} session${a.sessions.length === 1 ? '' : 's'} from ${Q.fmt(AM.startDate(a))}`);
    AM.log(a, `built the checklist (${AM.counted(a).length} questions in ${a.sections.length} sections${W.source ? `, from ${W.source}` : ''})`);
    S.audits.push(a); Q.save(); Q.audit?.('Audits', `created audit ${id} ${a.title}`);
    W = null; Q.go(`#/audits/a/${id}`); Q.toast('Audit plan created', `${id} · ${a.status}${a.status === 'Preparation' ? ' — ready for the Lead Auditor to start' : ''}.`);
  }

  /* ---------------- step 1: process ---------------- */
  function stProcess() {
    const procs = Q.topProcesses();
    return { html: `<p class="apb-q">What process do you want to audit?</p><p class="small muted">Only one process per audit. Several processes are several audits — the Audit Programme groups them.</p>
      <div class="apb-procs" role="radiogroup" aria-label="Process">${procs.map(p => { const last = Q.S.audits.filter(a => a.process === p.process_id && ['Follow-up', 'Closed'].includes(a.status)).sort((a, b) => (AM.startDate(b) || '') < (AM.startDate(a) || '') ? -1 : 1)[0]; const open = AM.ncs().filter(f => Q.inProc(f.process, p.process_id) && AM.ncOpen(f)).length;
        return `<label class="apb-proc${W.process === p.process_id ? ' on' : ''}"><input type="radio" name="proc" value="${p.process_id}" ${W.process === p.process_id ? 'checked' : ''}><span class="app-code tnum">${esc(p.process_code)}</span><span class="app-main"><b>${esc(p.name)}</b><span class="small muted">${esc(Q.pname(p.owner))} · ${(p.iso || []).length} clauses${last ? ` · last audited ${Q.fmt(AM.startDate(last))}` : ' · not audited yet'}${open ? ` · <span class="attn">${open} open NC</span>` : ''}</span></span></label>`; }).join('')}</div>`,
      after: main => main.querySelectorAll('[name=proc]').forEach(r => r.addEventListener('change', () => {
        if (W.process && W.process !== r.value && (W.checklist || W.clausesCustom)) { Q.confirm({ title: 'Change the process?', confirm: 'Change Process', body: '<p>The clauses and checklist are rebuilt for the new process.</p>', onConfirm: () => { setProcess(W, r.value); Q.render(); } }); rr(); return; }
        setProcess(W, r.value); Q.render({ keepScroll: true, noFocus: true });
      })) };
  }
  function contextPanel(c) {
    const L = (label, n, list, href) => `<details class="apb-cx${n ? '' : ' empty'}"><summary><span>${esc(label)}</span><b class="tnum${n && /NC|Corrective/.test(label) ? ' attn' : ''}">${n}</b></summary>${list.length ? `<ul>${list.slice(0, 6).map(x => `<li>${x}</li>`).join('')}${list.length > 6 ? `<li class="muted">+${list.length - 6} more${href ? ` · <a href="${href}">all</a>` : ''}</li>` : ''}</ul>` : '<p class="small muted">None.</p>'}</details>`;
    return `<div class="apb-ctx-h"><span class="small muted">Loaded from the QMS</span><b>${esc(c.p.process_code)} ${esc(c.p.name)}</b></div>
      <dl class="apb-kv"><dt>Process owner</dt><dd>${esc(Q.pname(c.owner))}</dd><dt>Department</dt><dd>${esc(c.dept || '—')}</dd><dt>ISO clauses</dt><dd class="tnum small">${esc(c.clauses.join(', ') || '—')}</dd></dl>
      ${L('Controlled documents', c.docs.length, c.docs.map(d => `<button class="link-btn" type="button" data-action="open-doc" data-id="${esc(d.id)}">${esc(d.id)}</button> ${esc(d.title)} <span class="muted">Rev ${esc(d.rev || d.workingRev || '—')}</span>`), `#/process/${c.p.process_id}/documents`)}
      ${L('Existing evidence', c.evidence.length, c.evidence.map(e => `<a href="#/evidence?focus=${esc(e.id)}">${esc(e.name)}</a> <span class="muted">${esc(e.status)}</span>`))}
      ${L('Related risks', c.risks.length, c.risks.map(r => `<a href="#/risks?focus=${esc(r.id)}">${esc(r.id)}</a> ${esc(r.title)} <span class="muted">${esc(Q.riskLevel(r))}</span>`))}
      ${L('Objectives / KPIs', c.kpis.length, c.kpis.map(k => `${esc(k.name)} <span class="${Q.kpiOk(k) ? 'muted' : 'attn'}">${esc(Q.kpiFmt(k.actual, k))}</span>`))}
      ${L('Previous audits', c.audits.length, c.audits.map(a => `<a href="#/audits/a/${a.id}">${esc(a.id)}</a> ${AM.dateText(a)} <span class="muted">${esc(a.status)}</span>`))}
      ${L('Previous findings', c.findings.length, c.findings.map(f => `${esc(f.nc?.no || f.id)} ${esc(AM.short(f.type))} · ${esc(f.clause)} <span class="muted">${esc(f.status)}</span>`))}
      ${L('Open NCs', c.openNcs.length, c.openNcs.map(f => `<a href="#/audits/nc/${f.nc.no}">${esc(f.nc.no)}</a> ${esc(f.title)}`))}
      ${L('Open corrective actions', c.openCas.length, c.openCas.map(x => `<a href="#/capa?focus=${esc(x.id)}">${esc(x.id)}</a> ${esc(x.title)}`))}`;
  }

  /* ---------------- step 2: trigger ---------------- */
  function stTrigger() {
    const t = W.trigger, progs = Q.S.auditProgrammes.filter(p => !['Archived', 'Completed'].includes(p.status) || p.id === W.programme);
    const recs = t.source ? AM.recordOptions(t.source, W.process) : [];
    const yr = +Q.today().slice(0, 4), periods = [yr, yr + 1].flatMap(y => ['Q1', 'Q2', 'Q3', 'Q4'].map(qq => `${qq} ${y}`));
    return { html: `<p class="apb-q">Why is this audit being created?</p>
      <div class="apb-choice" role="radiogroup" aria-label="Audit trigger">
        <label class="apb-opt${t.type === 'Planned' ? ' on' : ''}"><input type="radio" name="ttype" value="Planned" ${t.type === 'Planned' ? 'checked' : ''}><b>Planned audit</b><span class="small muted">Part of the internal audit programme — a routine or periodic audit of this process.</span></label>
        <label class="apb-opt${t.type === 'Triggered' ? ' on' : ''}"><input type="radio" name="ttype" value="Triggered" ${t.type === 'Triggered' ? 'checked' : ''}><b>Triggered audit</b><span class="small muted">Started because of an issue, risk or concern — a risk, NC, complaint, KPI issue or management request.</span></label></div>
      ${t.type === 'Planned' ? `<div class="form-grid" style="margin-top:16px"><label class="field"><span>Programme</span><select class="select" data-w="programme"><option value="">Not in a programme</option>${opts(progs.map(p => [p.id, `${p.name} (${p.status})`]), W.programme)}</select></label>
        <label class="field"><span>Planned period</span><select class="select" data-w="plannedPeriod"><option value="">Choose…</option>${opts(periods, W.plannedPeriod)}</select></label></div>`
        : `<div class="form-grid" style="margin-top:16px"><label class="field"><span>Trigger source <span class="req">*</span></span><select class="select" data-tsrc><option value="">Choose…</option>${opts(AM.TRIGGER_SOURCES, t.source)}</select></label>
        <label class="field"><span>Related record</span>${recs.length ? `<select class="select" data-w="trigger.record"><option value="">Choose…</option>${opts(recs, t.record)}</select>` : `<input class="input" data-w="trigger.record" value="${esc(t.record)}" placeholder="${t.source === 'Customer Complaint' ? 'e.g. CC-2026-022' : t.source === 'Incident' ? 'e.g. incident report number' : 'Reference (optional)'}">`}</label>
        ${t.record ? `<div class="field full"><span>Linked record</span><p class="apb-rec">${AM.recordLink(t.source, t.record)}</p></div>` : ''}
        <label class="field full"><span>Reason / context <span class="req">*</span></span><textarea class="textarea" data-w="trigger.reason" rows="3" placeholder="What the audit must verify about this record">${esc(t.reason)}</textarea></label>
        <label class="field"><span>Programme</span><select class="select" data-w="programme"><option value="">Not in a programme (recommended)</option>${opts(progs.map(p => [p.id, p.name]), W.programme)}</select><span class="help">A triggered audit is monitored and calendared either way; it counts in a programme only if you add it.</span></label></div>`}`,
      after: main => {
        main.querySelectorAll('[name=ttype]').forEach(r => r.addEventListener('change', () => { read(main); W.trigger.type = r.value; rr(); }));
        main.querySelector('[data-tsrc]')?.addEventListener('change', e => { read(main); W.trigger.source = e.target.value; W.trigger.record = ''; rr(); });
        main.querySelector('select[data-w="trigger.record"]')?.addEventListener('change', e => { read(main); const s = W.trigger.source, rec = e.target.value; if (s === 'Risk' && !W.trigger.reason) { const r = Q.S.risks.find(x => x.id === rec); if (r) W.trigger.reason = `Verify whether the controls for risk ${r.id} (“${r.title}”) are adequate and effective.`; } rr(); });
      } };
  }

  /* ---------------- step 3: plan ---------------- */
  function stPlan() {
    return { html: `<div class="form-grid">
      <label class="field full"><span>Audit title <span class="req">*</span></span><input class="input" data-w="title" value="${esc(W.title)}"></label>
      <label class="field full"><span>Audit objective <span class="req">*</span></span><textarea class="textarea" data-w="objective" rows="3" placeholder="What the audit must determine, e.g. verify conformity and effectiveness of supplier qualification, selection, monitoring and purchasing controls.">${esc(W.objective || (W.trigger.type === 'Triggered' ? W.trigger.reason : ''))}</textarea></label>
      <label class="field full"><span>Audit scope</span><textarea class="textarea" data-w="scope" rows="2" placeholder="Activities, locations and period covered">${esc(W.scope)}</textarea></label>
      <label class="field full"><span>Audit criteria</span><textarea class="textarea" data-w="criteria" rows="2">${esc(W.criteria)}</textarea><span class="help">ISO 9001, internal QMS procedures, customer requirements, statutory / regulatory requirements where applicable.</span></label>
      <label class="field full"><span>Description / notes</span><textarea class="textarea" data-w="description" rows="2">${esc(W.description)}</textarea></label></div>` };
  }

  /* ---------------- step 4: clauses ---------------- */
  function stClauses() {
    const p = Q.proc(W.process), def = (p.iso || []).slice().sort(AM.clSort), custom = W.clauses.slice().sort(AM.clSort).join() !== def.join();
    return { html: `<p class="small muted">Loaded from the process configuration (master data in <a href="#/settings/clause-map">Settings → Process ↔ ISO Clauses</a>). Changes here apply to this audit only.</p>
      <div class="apb-cl-head"><span class="tag">${icon(custom ? 'pencil' : 'sparkles')}${custom ? 'Customized for this audit' : 'Suggested from Process Configuration'}</span>${custom ? `<button class="btn sm" type="button" data-cl-restore>Restore Process Defaults</button>` : ''}</div>
      <div class="cl-chips">${W.clauses.slice().sort(AM.clSort).map(c => `<span class="cl-chip" title="${esc(AM.clTitle(c))}"><b class="tnum">${esc(c)}</b> ${esc(AM.clTitle(c))}<button type="button" class="cl-x" data-cl-rm="${c}" aria-label="Remove clause ${esc(c)}">${icon('x')}</button></span>`).join('') || '<span class="muted small">No clauses — add at least one.</span>'}</div>
      ${W.clauses.filter(c => AM.subsOf(c).length).map(c => `<div class="cl-subs"><span class="small muted">Narrow ${esc(c)} to subclauses:</span>${AM.subsOf(c).map(sc => `<label class="checkbox small"><input type="checkbox" data-cl-sub="${c}|${sc}">${esc(sc)} ${esc(AM.CL[sc])}</label>`).join('')}</div>`).join('')}
      ${W.clauses.filter(c => c.split('.').length === 3).map(c => { const parent = c.split('.').slice(0, 2).join('.'); return W.clauses.includes(parent) ? '' : ''; }).join('')}
      <label class="field cl-add"><span>Add clause</span><select class="select" data-cl-add><option value="">+ Add clause…</option>${Object.keys(AM.CL).filter(c => !W.clauses.includes(c)).sort(AM.clSort).map(c => `<option value="${c}">${esc(c + ' ' + AM.CL[c])}</option>`).join('')}</select></label>
      ${W.checklist ? '<p class="small muted">The checklist is already built. Questions for added clauses can be added in the Checklist Builder; questions for removed clauses stay until you delete them.</p>' : ''}`,
      after: main => {
        const touched = () => { W.clausesCustom = true; rr(); };
        main.querySelectorAll('[data-cl-rm]').forEach(b => b.addEventListener('click', () => { W.clauses = W.clauses.filter(x => x !== b.dataset.clRm); touched(); }));
        main.querySelector('[data-cl-add]').addEventListener('change', e => { if (e.target.value) { W.clauses.push(e.target.value); touched(); } });
        main.querySelectorAll('[data-cl-sub]').forEach(cb => cb.addEventListener('change', () => { const [c, sc] = cb.dataset.clSub.split('|'); W.clauses = W.clauses.filter(x => x !== c); if (!W.clauses.includes(sc)) W.clauses.push(sc); touched(); }));
        main.querySelector('[data-cl-restore]')?.addEventListener('click', () => { W.clauses = (Q.proc(W.process).iso || []).slice(); W.clausesCustom = false; rr(); });
      } };
  }

  /* ---------------- step 5: schedule ---------------- */
  function stSchedule() {
    const team = W.assignments.map(s => s.who), tmp = tempAudit();
    const others = AM.allSessions().filter(x => x.a.id !== W.draftId), conf = AM.conflicts([...others, ...W.sessions.map(s => ({ a: tmp, s }))]).filter(c => c.x.a === tmp || c.y.a === tmp);
    return { html: `<div class="form-grid">
      <label class="field"><span>Planned period</span><input class="input" data-w="plannedPeriod" value="${esc(W.plannedPeriod)}" placeholder="e.g. Q1 2027"></label>
      <label class="field"><span>Audit mode</span><select class="select" data-w="mode">${opts(['On-site', 'Remote', 'Hybrid'], W.mode)}</select></label>
      <label class="field"><span>Audit start date</span><input class="input" type="date" data-w="startDate" value="${esc(W.startDate)}"></label>
      <label class="field"><span>Audit end date</span><input class="input" type="date" data-w="endDate" value="${esc(W.endDate)}"></label>
      <label class="field full"><span>Location</span><input class="input" data-w="location" value="${esc(W.location)}" placeholder="e.g. Head office, or Remote (video call)"></label>
      <label class="field"><span>Opening meeting</span><input class="input" type="time" data-w="opening" value="${esc(W.opening)}"></label>
      <label class="field"><span>Closing meeting</span><input class="input" type="time" data-w="closing" value="${esc(W.closing)}"></label></div>
      <div class="apb-sub"><h3>Audit sessions</h3><span class="small muted">One audit can run over several days — add sessions, not audits.</span><span class="grow"></span><button class="btn sm" type="button" data-ss-gen>${icon('refresh-cw')}${W.sessions.length ? 'Regenerate' : 'Generate'} from dates</button><button class="btn sm primary" type="button" data-ss-add>${icon('plus')}Add Session</button></div>
      ${sessionTable(W.sessions, true, conf)}
      ${conf.length ? `<div class="callout warning small">${icon('triangle-alert')}<span><b>Scheduling conflict</b>${conf.map(c => { const o = c.x.a === tmp ? c.y : c.x, m = c.x.a === tmp ? c.x : c.y; return `${esc(Q.pname(c.who))}: “${esc(m.s.title)}” ${Q.fmt(m.s.date)} ${esc(m.s.start)}–${esc(m.s.end)} overlaps ${esc(o.a.id)} “${esc(o.s.title)}” ${esc(o.s.start)}–${esc(o.s.end)}.`; }).join(' ')} You can keep it and resolve it later.</span></div>` : ''}
      ${!W.startDate && !W.sessions.length ? '<p class="small muted">Dates are optional now — the audit stays <b>Planned</b> until sessions are scheduled.</p>' : ''}`,
      after: main => {
        main.querySelector('[data-ss-gen]')?.addEventListener('click', () => { read(main); if (!W.startDate) { err(main, 'Enter the audit start date first.'); return; } const go = () => { genSessions(); rr(); }; W.sessions.length ? Q.confirm({ title: 'Regenerate sessions?', confirm: 'Regenerate', body: '<p>The current sessions are replaced by opening meeting, fieldwork per day and closing meeting.</p>', onConfirm: go }) : go(); });
        main.querySelector('[data-ss-add]').addEventListener('click', () => { read(main); sessionModal(null, { team, list: W.sessions, defDate: W.startDate, loc: W.location, done: rr }); });
        main.querySelectorAll('[data-ss-edit]').forEach(b => b.addEventListener('click', () => { read(main); sessionModal(W.sessions.find(x => x.id === b.dataset.ssEdit), { team, list: W.sessions, done: rr }); }));
        main.querySelectorAll('[data-ss-del]').forEach(b => b.addEventListener('click', () => { read(main); W.sessions = W.sessions.filter(x => x.id !== b.dataset.ssDel); rr(); }));
      } };
  }
  AM.sessionTable = sessionTable;
  function sessionTable(list, edit, conf = [], aid = null) {
    const sorted = list.slice().sort((x, y) => (x.date + x.start) < (y.date + y.start) ? -1 : 1);
    return sorted.length ? `<div class="table-scroll"><table class="dt ss-t"><caption class="sr-only">Audit sessions</caption><thead><tr><th>Session</th><th class="c-date">Date</th><th>Time</th><th>Location</th><th>Auditors</th>${edit ? '<th class="c-actions">Actions</th>' : ''}</tr></thead><tbody>${sorted.map(s => { const c = conf.filter(x => x.x.s === s || x.y.s === s); return `<tr><td><b>${esc(s.title)}</b>${s.notes ? `<span class="sub">${esc(s.notes)}</span>` : ''}${c.length ? '<span class="sub"><span class="ind ind-bad">Scheduling conflict</span></span>' : ''}</td><td class="c-date">${s.date ? Q.fmt(s.date) : '—'}</td><td class="tnum nowrap">${esc(s.start)}–${esc(s.end)}</td><td class="small">${esc(s.location || '—')}</td><td class="small">${s.auditors.map(Q.pname).map(esc).join(', ') || '<span class="muted">—</span>'}</td>
      ${edit ? `<td class="c-actions"><button class="btn sm" type="button" data-ss-edit="${s.id}"${aid ? ` data-action="am-session" data-id="${aid}" data-s="${s.id}"` : ''}>Edit</button><button class="icon-btn" type="button" data-ss-del="${s.id}"${aid ? ` data-action="am-session-del" data-id="${aid}" data-s="${s.id}"` : ''} aria-label="Delete session ${esc(s.title)}">${icon('trash-2')}</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : '<div class="empty small">No sessions yet.</div>';
  }
  // Add / edit a session (shared by the builder and the audit plan tab).
  function sessionModal(s, { team, list, defDate = '', loc = '', done }) {
    const m = Q.openModal({ size: 'm', title: s ? 'Edit session' : 'Add session', body: `<form class="modal-body"><div class="form-grid">
      <label class="field full"><span>Session title <span class="req">*</span></span><input class="input" name="title" required value="${esc(s?.title || '')}" placeholder="e.g. Supplier Evaluation Review"></label>
      <label class="field"><span>Date <span class="req">*</span></span><input class="input" type="date" name="date" required value="${esc(s?.date || defDate)}"></label>
      <label class="field"><span>Location</span><input class="input" name="location" value="${esc(s?.location ?? loc)}"></label>
      <label class="field"><span>Start time <span class="req">*</span></span><input class="input" type="time" name="start" required value="${esc(s?.start || '09:00')}"></label>
      <label class="field"><span>End time <span class="req">*</span></span><input class="input" type="time" name="end" required value="${esc(s?.end || '12:00')}"></label>
      <fieldset class="field full"><legend class="lg">Assigned auditors</legend><div class="apb-checks">${team.map(w => `<label class="checkbox"><input type="checkbox" name="aud" value="${w}" ${!s || s.auditors.includes(w) ? 'checked' : ''}>${esc(Q.pname(w))}</label>`).join('') || '<span class="small muted">Add auditors in the Auditors step.</span>'}</div></fieldset>
      <label class="field full"><span>Notes</span><input class="input" name="notes" value="${esc(s?.notes || '')}"></label></div></form>`, foot: `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>${s ? 'Save Session' : 'Add Session'}</button>` });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), aud = new FormData(f).getAll('aud');
      if (v.end <= v.start) { Q.toast('Check the times', 'The session ends before it starts.'); return; }
      const rec = { title: v.title.trim(), date: v.date, start: v.start, end: v.end, location: v.location, auditors: aud, notes: v.notes };
      let out; if (s) { Object.assign(s, rec); out = s; } else { out = { id: AM.uid('ss'), ...rec }; list.push(out); }
      Q.closeAllModals(); done(out, !s);
    });
  }
  AM.sessionModal = sessionModal;

  /* ---------------- step 6: auditors ---------------- */
  function stAuditors() {
    const S = Q.S, pool = (S.auditors || []).map(x => x.who), clauseChoices = [...new Set([...W.clauses, ...W.clauses.flatMap(AM.subsOf)])].sort(AM.clSort);
    const a = tempAudit(); if (W.checklist) { a.checklist = W.checklist; AM.applyAssignments(a); }
    const row = (s, k) => { const conflict = AM.conflictOf(s.who, W.process), lead = s.role === 'Lead Auditor', n = W.checklist ? AM.itemsOf(a, s.who).length : null;
      return `<li class="apb-member"><div class="apbm-who"><span class="avatar sm">${esc(Q.initials(s.who))}</span><select class="select" data-as-who="${k}" aria-label="Auditor">${opts(pool.filter(w => w === s.who || !W.assignments.some(x => x.who === w)).map(w => [w, `${Q.pname(w)} — ${(S.auditors.find(x => x.who === w) || {}).level || ''}`]), s.who)}</select>
        <select class="select" data-as-role="${k}" aria-label="Role" ${lead ? 'disabled' : ''}>${opts(lead ? ['Lead Auditor'] : AM.ROLES.slice(1), s.role)}</select>${lead ? '' : `<button class="icon-btn" type="button" data-as-rm="${k}" aria-label="Remove ${esc(Q.pname(s.who))}">${icon('x')}</button>`}</div>
        <div class="apbm-body">${s.role === 'Observer' ? '<p class="small muted">Observers attend but are not assigned questions.</p>' : `<div class="apbm-cl"><span class="small muted">Assigned clauses${lead ? ' (questions not assigned to anyone else also go to the Lead Auditor)' : ''}:</span><div class="cl-chips">${(s.clauses || []).map(c => `<span class="cl-chip"><b class="tnum">${esc(c)}</b><button type="button" class="cl-x" data-as-clrm="${k}|${c}" aria-label="Remove clause ${esc(c)}">${icon('x')}</button></span>`).join('')}<select class="select sm" data-as-cladd="${k}" aria-label="Assign a clause"><option value="">+ Clause…</option>${clauseChoices.filter(c => !(s.clauses || []).includes(c)).map(c => `<option value="${c}">${esc(c)} ${esc(AM.clTitle(c))}</option>`).join('')}</select></div></div>
          ${s.role === 'Technical Expert' ? `<label class="field"><span>Technical scope</span><input class="input" data-as-scope="${k}" value="${esc(s.scope || '')}" placeholder="e.g. Technical evidence review"></label>` : ''}
          ${n != null ? `<p class="small muted">${n} checklist question${n === 1 ? '' : 's'} assigned</p>` : ''}`}
          <div class="apbm-ind">${conflict ? `<span class="st danger">${icon('triangle-alert')}Potential conflict — ${esc(conflict)}</span>` : s.role === 'Observer' ? '' : `<span class="st warning">Needs confirmation</span>`}<span class="small muted">Each auditor confirms independence in the audit plan: “I am not auditing work for which I am directly responsible.”</span></div></div></li>`; };
    return { html: `<p class="small muted">Many auditors can work on the same process audit. Assigned clauses decide whose “My Checklist” each question appears in; nobody else can answer it.</p>
      <ul class="apb-team">${W.assignments.map(row).join('')}</ul><button class="btn sm" type="button" data-as-add>${icon('user-plus')}Add Auditor</button>`,
      after: main => {
        const upd = () => { if (W.checklist) { const t = tempAudit(); t.checklist = W.checklist; AM.applyAssignments(t); } rr(); };
        main.querySelectorAll('[data-as-who]').forEach(s => s.addEventListener('change', () => { const x = W.assignments[+s.dataset.asWho], old = x.who; x.who = s.value; if (x.role === 'Lead Auditor') W.auditor = s.value; W.sessions.forEach(ss => { const i = ss.auditors.indexOf(old); if (i >= 0) ss.auditors[i] = s.value; }); (W.checklist || []).forEach(i => { if (i.assignee === old) i.assignee = s.value; }); upd(); }));
        main.querySelectorAll('[data-as-role]').forEach(s => s.addEventListener('change', () => { W.assignments[+s.dataset.asRole].role = s.value; upd(); }));
        main.querySelectorAll('[data-as-rm]').forEach(b => b.addEventListener('click', () => { const x = W.assignments.splice(+b.dataset.asRm, 1)[0]; W.sessions.forEach(ss => { ss.auditors = ss.auditors.filter(w => w !== x.who); }); (W.checklist || []).forEach(i => { if (i.assignee === x.who) { i.assignee = null; i.manual = false; } }); upd(); }));
        main.querySelectorAll('[data-as-clrm]').forEach(b => b.addEventListener('click', () => { const [k, c] = b.dataset.asClrm.split('|'); W.assignments[+k].clauses = W.assignments[+k].clauses.filter(x => x !== c); upd(); }));
        main.querySelectorAll('[data-as-cladd]').forEach(s => s.addEventListener('change', () => { if (!s.value) return; const x = W.assignments[+s.dataset.asCladd]; x.clauses = [...(x.clauses || []), s.value]; upd(); }));
        main.querySelectorAll('[data-as-scope]').forEach(i => i.addEventListener('input', () => { W.assignments[+i.dataset.asScope].scope = i.value; }));
        main.querySelector('[data-as-add]').addEventListener('click', () => { const w = pool.find(x => !W.assignments.some(s => s.who === x)); if (!w) { Q.toast('Everyone qualified is already on the team'); return; } const lvl = (S.auditors.find(x => x.who === w) || {}).level; W.assignments.push({ id: AM.uid('as'), who: w, role: lvl === 'Technical Expert' ? 'Technical Expert' : lvl === 'Observer' ? 'Observer' : 'Auditor', clauses: [], scope: '', independent: null, sessions: [], submitted: null, comments: '', conclusion: '' }); W.sessions.forEach(ss => { if (!ss.auditors.includes(w)) ss.auditors.push(w); }); upd(); });
      } };
  }

  /* ---------------- step 7: checklist builder ---------------- */
  function stChecklist() {
    const tpls = Q.S.auditTemplates.filter(t => t.status === 'Active'), def = tpls.find(t => t.process === W.process);
    if (!W.checklist) return { html: `<p class="apb-q">How do you want to start the checklist?</p><p class="small muted">Questions are generated from the selected process and its applicable clauses. You can then add, edit, reorder and assign them. The checklist belongs to this audit.</p>
      <div class="apb-choice three"><div class="apb-opt"><b>Load process default checklist</b><span class="small muted">${def ? `Template “${esc(def.name)}”, plus questions for any clause it does not cover.` : `${W.clauses.length} clause section${W.clauses.length === 1 ? '' : 's'} with suggested questions and expected evidence.`}</span><button type="button" class="btn sm primary" data-cl-src="default">Load Default</button></div>
        <div class="apb-opt"><b>Use existing template</b><span class="small muted">${tpls.length} active template${tpls.length === 1 ? '' : 's'}.</span><select class="select" data-cl-tpl aria-label="Template">${opts(tpls.map(t => [t.id, `${t.name}${t.process ? ` (${Q.proc(t.process)?.name})` : ''}`]), def?.id || tpls[0]?.id)}</select><button type="button" class="btn sm" data-cl-src="template" ${tpls.length ? '' : 'disabled'}>Use Template</button></div>
        <div class="apb-opt"><b>Start blank</b><span class="small muted">Add sections and questions yourself.</span><button type="button" class="btn sm" data-cl-src="blank">Start Blank</button></div></div>`,
      after: main => main.querySelectorAll('[data-cl-src]').forEach(b => b.addEventListener('click', () => { const src = b.dataset.clSrc, tpl = main.querySelector('[data-cl-tpl]')?.value; const t = tempAudit(); AM.genChecklist(t, { source: src, template: tpl }); W.sections = t.sections; W.checklist = t.checklist; W.source = src === 'default' ? (def ? `template ${def.name}` : 'process default questions') : src === 'template' ? `template ${Q.S.auditTemplates.find(x => x.id === tpl)?.name}` : 'a blank checklist'; if (src === 'blank') W.sections.push(AM.newSection('', 'General')); rr(); })) };
    const t = tempAudit(); t.sections = W.sections; t.checklist = W.checklist; const model = t;
    const auditors = W.assignments.filter(s => s.role !== 'Observer').map(s => [s.who, `${Q.pname(s.who)} (${s.role})`]);
    const ev = (() => { const set = new Set(); W.checklist.forEach(i => AM.systemEvidence(W.process, i.clause).forEach(x => set.add(x.kind + x.id))); return set.size; })();
    return { html: `<div class="apb-cl-info small muted">${icon('files')} ${ev} existing QMS documents and records are matched to these questions — auditors see them in the live checklist. <span class="grow"></span><button class="btn sm ghost" type="button" data-cl-tplsave>${icon('download')}Save as Template</button><button class="btn sm ghost" type="button" data-cl-reset>Start Over</button></div>` + AM.builderHtml(model, { edit: true, mode: 'audit', auditors }),
      after: main => {
        AM.builderWire(main, model, { mode: 'audit', auditors, changed: () => { W.sections = model.sections; W.checklist = model.checklist; const a = tempAudit(); a.checklist = W.checklist; AM.applyAssignments(a); rr(); } });
        main.querySelector('[data-cl-reset]').addEventListener('click', () => Q.confirm({ title: 'Start the checklist over?', danger: true, confirm: 'Start Over', body: '<p>The current sections and questions are discarded.</p>', onConfirm: () => { W.checklist = null; W.sections = []; rr(); } }));
        main.querySelector('[data-cl-tplsave]').addEventListener('click', () => AM.saveAsTemplate(model, W.process));
      } };
  }

  /* ---------------- step 8: review ---------------- */
  function stReview() {
    const a = tempAudit(); if (W.checklist) { a.checklist = W.checklist; a.sections = W.sections; AM.applyAssignments(a); }
    const c = AM.processContext(W.process), ev = (() => { const set = new Set(); (W.checklist || []).forEach(i => AM.systemEvidence(W.process, i.clause).forEach(x => set.add(x.kind + x.id))); return set.size; })();
    const prevNcs = c.findings.filter(f => f.nc).length, unassigned = AM.counted(a).filter(i => !i.assignee).length;
    const row = (k, v, step) => `<div class="apb-rv"><dt>${esc(k)}</dt><dd>${v}</dd>${step != null ? `<button class="link-btn small" type="button" data-pb-go="${step}">Edit</button>` : ''}</div>`;
    return { html: `<div class="apb-review"><h3 class="apb-rv-title">${esc(W.title)}</h3><dl>
      ${row('Process', Q.pcell(W.process), 0)}${row('Trigger', `${AM.triggerChip(a)}${a.trigger.reason ? `<div class="small muted">${esc(a.trigger.reason)}</div>` : ''}`, 1)}${row('Programme', esc(AM.progName(a.programme) || 'Not in a programme'), 1)}
      ${row('Objective', esc(W.objective), 2)}${row('Scope', esc(W.scope || '—'), 2)}${row('Criteria', esc(W.criteria), 2)}
      ${row('Applicable clauses', `<span class="tnum">${esc(a.clauses.join(', '))}</span>`, 3)}
      ${row('Schedule', `${a.sessions.length ? `${AM.dateRange(a)} · ${esc(W.mode)}${W.location ? ` · ${esc(W.location)}` : ''}` : `<span class="muted">Not scheduled — ${esc(a.plannedPeriod || 'no period')}</span>`}`, 4)}${row('Sessions', String(a.sessions.length), 4)}
      ${row('Lead Auditor', esc(Q.pname(W.auditor)), 5)}${row('Audit team', `${W.assignments.length} — ${W.assignments.map(s => `${esc(Q.pname(s.who))} (${esc(s.role)}${s.clauses.length ? ` · ${esc(s.clauses.join(', '))}` : ''}${AM.itemsOf(a, s.who).length ? ` · ${AM.itemsOf(a, s.who).length} questions` : ''})`).join('; ')}`, 5)}
      ${row('Checklist', W.checklist ? `${AM.counted(a).length} questions in ${W.sections.length} sections${unassigned ? ` · <b class="warnv">${unassigned} unassigned</b>` : ''}` : '<b class="warnv">Not built</b>', 6)}
      ${row('Existing QMS evidence', `${ev} records matched to the questions`)}${row('Previous NCs', `${prevNcs} for this process`)}${row('Open corrective actions', String(c.openCas.length))}</dl>
      <p class="small muted">Status after creating: <b>${!a.sessions.length ? 'Planned' : AM.ready(a) ? 'Preparation (ready to start)' : 'Scheduled'}</b>. Auditors confirm independence in the audit plan.</p></div>`,
      after: main => main.querySelectorAll('.apb-review [data-pb-go]').forEach(b => b.addEventListener('click', () => { W.step = +b.dataset.pbGo; Q.render(); })) };
  }

  /* ====================================================================== checklist templates */
  AM.saveAsTemplate = (model, pid) => {
    const m = Q.openModal({ size: 's', title: 'Save checklist as template', body: `<form class="modal-body"><label class="field"><span>Template name <span class="req">*</span></span><input class="input" name="name" required value="${esc(Q.proc(pid)?.name || 'Audit')} Audit Checklist"></label><label class="field"><span>Description</span><input class="input" name="description"></label></form>`, foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save Template</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), S = Q.S, id = `CT-${String(Math.max(0, ...S.auditTemplates.map(t => +t.id.slice(3))) + 1).padStart(3, '0')}`;
      S.auditTemplates.push({ id, name: v.name.trim(), description: v.description, process: pid || null, status: 'Active', updated: Q.today(), by: AM.actor(), sections: model.sections.map(s => ({ key: s.id, clause: s.clause, title: s.title })), items: model.checklist.map(i => ({ sec: i.section, question: i.question, type: i.type, required: i.required, expected: i.expected.slice(), options: (i.options || []).slice() })) });
      Q.save(); Q.closeAllModals(); Q.toast('Template saved', `${id} · ${v.name}`); });
  };
  AM.route('templates', (parts, q) => parts[0] ? templateEditor(parts[0]) : templateList(q));
  function templateList(q) {
    const S = Q.S, can = AM.can('configure');
    return { title: 'Checklist Templates · Audits', nav: 'audits', html: AM.chrome('list', { title: 'Checklist Templates', crumbs: [['Audits', '#/audits'], ['Audit Register', '#/audits/list'], ['Checklist Templates']], sub: 'Reusable checklists. When an audit is built from a template, the audit gets its own copy to customize.', actions: can ? `<button class="btn primary" type="button" data-action="am-tpl-new">${icon('plus')}Create Template</button>` : '' }) +
      Q.table({ id: 'am-tpl', rows: () => S.auditTemplates, noun: 'templates', caption: 'Checklist templates', segs: { Active: t => t.status === 'Active', Archived: t => t.status === 'Archived' }, initialSeg: q.s || 'Active',
        tools: Q.seg('Status', [['Active', 'Active', S.auditTemplates.filter(t => t.status === 'Active').length], ['Archived', 'Archived', S.auditTemplates.filter(t => t.status === 'Archived').length], ['all', 'All']], q.s || 'Active'),
        columns: [
          { key: 'n', label: 'Template', sort: t => t.name, render: t => `<a class="title" href="#/audits/templates/${t.id}">${esc(t.name)}</a><span class="sub tnum">${esc(t.id)}${t.description ? ` · ${esc(t.description)}` : ''}</span>` },
          { key: 'p', label: 'Process default for', render: t => t.process ? Q.pcell(t.process) : '<span class="muted">—</span>' },
          { key: 's', label: 'Sections', cls: 'c-num', render: t => String(t.sections.length) },
          { key: 'q', label: 'Questions', cls: 'c-num', render: t => String(t.items.filter(AM.answerable).length) },
          { key: 'u', label: 'Updated', cls: 'c-date', sort: t => t.updated, render: t => `${Q.fmt(t.updated)}<span class="sub">${esc(Q.pname(t.by))}</span>` },
          { key: 'st', label: 'Status', render: t => Q.st(t.status, t.status === 'Active' ? 'success' : 'muted') },
          { key: 'x', label: 'Actions', cls: 'c-actions', render: t => `<a class="btn sm" href="#/audits/templates/${t.id}">${can && t.status === 'Active' ? 'Edit' : 'Open'}</a>${can ? Q.menu(`More for ${t.name}`, [{ label: 'Duplicate', icon: 'copy', data: { action: 'am-tpl-dup', id: t.id } }, t.status === 'Active' ? { label: 'Archive', icon: 'archive', data: { action: 'am-tpl-status', id: t.id, to: 'Archived' } } : { label: 'Restore', icon: 'refresh-cw', data: { action: 'am-tpl-status', id: t.id, to: 'Active' } }]) : ''}` }],
        empty: '<h3>No templates</h3><p>Create a template, or save an audit checklist as a template.</p>' }) };
  }
  const tplModel = t => { const ids = {}; const sections = t.sections.map(s => { const sec = { id: s.key || AM.uid('sec'), clause: s.clause || '', title: s.title }; ids[s.key] = sec.id; return sec; }); return { sections, checklist: t.items.map(i => AM.newItem({ section: ids[i.sec] || sections[0]?.id, clause: i.clause ?? sections.find(s => s.id === ids[i.sec])?.clause ?? '', question: i.question, type: i.type, required: i.required, expected: (i.expected || []).slice(), options: (i.options || []).slice() })), clauses: t.process ? (Q.proc(t.process)?.iso || []) : Object.keys(AM.CL).filter(c => c.split('.').length === 2) }; };
  function templateEditor(id) {
    const t = Q.S.auditTemplates.find(x => x.id === id);
    if (!t) return { title: 'Template not found', nav: 'audits', html: AM.chrome('list', { title: 'Template not found', sub: `${esc(id)} does not exist.` }) };
    const can = AM.can('configure') && t.status === 'Active', model = tplModel(t);
    const save = () => { t.sections = model.sections.map(s => ({ key: s.id, clause: s.clause, title: s.title })); t.items = model.checklist.map(i => ({ sec: i.section, clause: i.clause, question: i.question, type: i.type, required: i.required, expected: i.expected.slice(), options: (i.options || []).slice() })); t.updated = Q.today(); t.by = AM.actor(); Q.save(); rr(); };
    return { title: `${t.name} · Templates`, nav: 'audits', html: Q.pageHead({ crumbs: [['Audits', '#/audits'], ['Checklist Templates', '#/audits/templates'], [t.id]], title: esc(t.name), sub: `${esc(t.description || '')}${t.process ? ` · Process default for ${esc(Q.proc(t.process)?.name)}` : ''}`, meta: `<div class="meta-line"><span>${Q.st(t.status, t.status === 'Active' ? 'success' : 'muted')}</span><span>Updated ${Q.fmt(t.updated)} by ${esc(Q.pname(t.by))}</span></div>`, actions: can ? `<button class="btn" type="button" data-action="am-tpl-edit" data-id="${t.id}">${icon('pencil')}Details</button>` : '' }) +
      (t.status === 'Archived' ? `<div class="callout small" style="margin-bottom:12px">${icon('archive')}<span><b>Archived</b>Restore it to edit or use it.</span></div>` : '') + AM.builderHtml(model, { edit: can, mode: 'template' }),
      after: main => { if (can) AM.builderWire(main, model, { mode: 'template', changed: save }); } };
  }
  const tplForm = (t = {}) => `<form class="modal-body"><div class="form-grid" style="grid-template-columns:1fr"><label class="field"><span>Template name <span class="req">*</span></span><input class="input" name="name" required value="${esc(t.name || '')}"></label><label class="field"><span>Process default for</span><select class="select" name="process"><option value="">No process</option>${Q.topProcesses().map(p => `<option value="${p.process_id}"${p.process_id === t.process ? ' selected' : ''}>${esc(p.process_code + ' ' + p.name)}</option>`).join('')}</select><span class="help">Loaded by “Load process default checklist” for audits of this process.</span></label><label class="field"><span>Description</span><input class="input" name="description" value="${esc(t.description || '')}"></label></div></form>`;
  Q.actions['am-tpl-new'] = () => {
    const m = Q.openModal({ size: 'm', title: 'Create checklist template', body: tplForm(), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Create Template</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f), S = Q.S, id = `CT-${String(Math.max(0, ...S.auditTemplates.map(t => +t.id.slice(3))) + 1).padStart(3, '0')}`;
      const cl = v.process ? (Q.proc(v.process).iso || []) : []; S.auditTemplates.push({ id, name: v.name.trim(), process: v.process || null, description: v.description, status: 'Active', updated: Q.today(), by: AM.actor(), sections: cl.length ? cl.map((c, i) => ({ key: `s${i}`, clause: c, title: AM.clTitle(c) })) : [{ key: 's0', clause: '', title: 'General' }], items: cl.flatMap((c, i) => AM.questionsFor(c).map(qn => ({ sec: `s${i}`, clause: qn.clause, question: qn.q, type: 'assessment', required: true, expected: qn.ev.slice(), options: [] }))) });
      Q.save(); Q.closeAllModals(); Q.go(`#/audits/templates/${id}`); Q.toast('Template created', v.process ? 'Questions were suggested from the process clauses.' : 'Add sections and questions.'); });
  };
  Q.actions['am-tpl-edit'] = d => { const t = Q.S.auditTemplates.find(x => x.id === d.id), m = Q.openModal({ size: 'm', title: 'Template details', body: tplForm(t), foot: '<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-ok>Save</button>' });
    m.querySelector('[data-ok]').addEventListener('click', () => { const f = m.querySelector('form'); if (!Q.validate(f)) return; const v = Q.formValues(f); Object.assign(t, { name: v.name.trim(), process: v.process || null, description: v.description, updated: Q.today(), by: AM.actor() }); Q.save(); Q.closeAllModals(); rr(); }); };
  Q.actions['am-tpl-dup'] = d => { const S = Q.S, t = S.auditTemplates.find(x => x.id === d.id), id = `CT-${String(Math.max(0, ...S.auditTemplates.map(x => +x.id.slice(3))) + 1).padStart(3, '0')}`; S.auditTemplates.push({ ...JSON.parse(JSON.stringify(t)), id, name: `Copy of ${t.name}`, status: 'Active', process: null, updated: Q.today(), by: AM.actor() }); Q.save(); Q.go(`#/audits/templates/${id}`); Q.toast('Template duplicated', 'The copy is not a process default until you set one.'); };
  Q.actions['am-tpl-status'] = d => { const t = Q.S.auditTemplates.find(x => x.id === d.id); t.status = d.to; t.updated = Q.today(); Q.save(); rr(); Q.toast(d.to === 'Archived' ? 'Template archived' : 'Template restored', t.name); };
})();
