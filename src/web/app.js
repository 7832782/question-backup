/* 题库系统前端逻辑 */
'use strict';

/* ================= API ================= */
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = '请求失败 (' + res.status + ')';
    try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return res;
}

/* ================= 全局状态 ================= */
const state = {
  filter: { subject: '', qtype: '', grade: '', diffMin: '1', diffMax: '5', tag: '', source: '', search: '', unused: false, page: 1, pageSize: 20 },
  total: 0,
  checked: new Set(),
  meta: { subjects: [], tags: [] },
  edit: { id: null, images: [], tables: [], options: [], qtype: 'single', difficulty: 3, answer: '' },
  paper: { id: null, dirty: false, items: [] }, // items: {questionId, question, score}
};

/* ================= 工具 ================= */
const $ = id => document.getElementById(id);

function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 2200);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtScore(v) {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

const QTYPE_NAME = { single: '单选', multi: '多选', fill: '填空', essay: '解答', '单选': '单选', '多选': '多选', '填空': '填空', '解答': '解答' };
const QTYPE_CLS = { single: 'single', multi: 'multi', fill: 'fill', essay: 'essay', '单选': 'single', '多选': 'multi', '填空': 'fill', '解答': 'essay' };

function qtypeBadge(q) {
  const name = QTYPE_NAME[q.qtype] || q.qtype || '';
  return '<span class="badge ' + (QTYPE_CLS[q.qtype] || '') + '">' + escapeHtml(name) + '</span>';
}

function starsHtml(n) {
  n = Math.max(0, Math.min(5, n || 0));
  return '<span class="stars" title="难度 ' + n + '/5">' + '★'.repeat(n) + '<span class="dim">' + '★'.repeat(5 - n) + '</span></span>';
}

/* ================= Markdown 渲染（marked 引擎） ================= */
if (window.marked) {
  marked.setOptions({ gfm: true, breaks: true });
}

function renderTable(md) {
  if (window.marked) return marked.parse(md);
  const lines = md.trim().split('\n').filter(l => l.trim().startsWith('|'));
  if (!lines.length) return '<p class="hint">（空表格）</p>';
  let html = '<table>';
  lines.forEach((line, li) => {
    if (li === 1) return;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    html += '<tr>';
    cells.forEach(c => { html += (li === 0 ? '<th>' : '<td>') + c + (li === 0 ? '</th>' : '</td>'); });
    html += '</tr>';
  });
  return html + '</table>';
}

// 渲染 markdown：附件（图、表）固定追加在末尾，不再需要 {{图N}}/{{表N}} 占位符
// append=false 时只渲染文本不追加附件（选项、答案用）
function renderMD(text, images, tables, append) {
  if (!text) return '';
  if (!window.marked) {
    return '<p>' + escapeHtml(String(text)) + '</p>'; // 库加载失败时的降级
  }
  let t = String(text);
  // 图/表占位符一律静默移除（附件统一追加在末尾）
  t = t.replace(/\{\{图\d+\}\}/g, '');
  t = t.replace(/\{\{表\d+\}\}/g, '');
  // 块级公式 $$...$$ → 哨兵
  const disp = [];
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (m, c) => { disp.push(c); return '\u0001D' + (disp.length - 1) + '\u0001'; });
  // 行内公式 → 哨兵（防止 * _ ` 等被 markdown 语法误伤）
  const math = [];
  t = t.replace(/\$([^$\n]+)\$/g, (m, c) => { math.push(c); return '\u0001M' + (math.length - 1) + '\u0001'; });
  let html = marked.parse(t);
  // 公式还原：KaTeX 真渲染；加载失败时降级为斜体文本
  html = html.replace(/\u0001D(\d+)\u0001/g, (m, n) => renderKatex(disp[+n] || '', true));
  html = html.replace(/\u0001M(\d+)\u0001/g, (m, n) => renderKatex(math[+n] || '', false));
  // 附件统一追加在末尾：先图后表
  if (append !== false) {
    if (images && images.length) {
      html += images.map((im, i) => {
        if (!im.data) return '';
        const w = im.width || 30;
        return '<img src="' + im.data + '" style="width:' + w + '%;max-width:100%" alt="图' + (i + 1) + '">';
      }).join('');
    }
    if (tables && tables.length) {
      html += tables.map(tb => marked.parse(tb.markdown)).join('');
    }
  }
  return html;
}

// KaTeX 渲染公式；失败时显示原文
function renderKatex(latex, displayMode) {
  if (window.katex) {
    try {
      return katex.renderToString(latex, { displayMode, throwOnError: false, strict: false });
    } catch (e) {
      return '<span class="math-err">' + escapeHtml(latex) + '</span>';
    }
  }
  return '<span class="math">' + escapeHtml(latex) + '</span>';
}

// 行内短文本渲染（选项等），剥掉段落包裹，不追加附件
function inline(text) {
  const h = renderMD(text, [], [], false).trim();
  return h.replace(/^<p>(.*)<\/p>$/s, '$1');
}

// 选项文本剥离自带的字母前缀（旧数据存的是 "A. xxx"）
function stripOptPrefix(s) {
  return String(s).replace(/^[A-Za-z][.．、:：]\s*/, '');
}

/* ================= 视图切换 ================= */
function switchToView(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    switchToView(btn.dataset.view);
    if (btn.dataset.view === 'questions') loadQuestions();
    if (btn.dataset.view === 'papers') loadPapers();
    if (btn.dataset.view === 'paper') renderPaper();
  };
});

/* ================= 元数据 ================= */
async function loadMeta() {
  try {
    const m = await api('/meta');
    state.meta = m;
    const subOpts = m.subjects.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join('');
    $('fSubject').innerHTML = '<option value="">科目：全部</option>' + subOpts;
    $('pSubject').innerHTML = '<option value="">全部科目</option>' + subOpts; // 「从题库添加」弹窗的科目筛选
    $('tgSubject').innerHTML = m.subjects.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join('');
    $('tagList').innerHTML = m.tags.map(t => '<option value="' + escapeHtml(t) + '">').join('');
    const st = await api('/stats');
    $('topStat').textContent = '共 ' + st.total + ' 道题';
  } catch (e) { toast('加载元数据失败: ' + e.message, true); }
}

/* ================= 题库列表 ================= */
function filterQuery() {
  const f = state.filter;
  const p = new URLSearchParams();
  if (f.subject) p.set('subject', f.subject);
  if (f.qtype) p.set('qtype', f.qtype);
  if (f.grade) p.set('grade', f.grade);
  if (f.diffMin) p.set('difficultyMin', f.diffMin);
  if (f.diffMax) p.set('difficultyMax', f.diffMax);
  if (f.tag) p.set('tag', f.tag);
  if (f.source) p.set('source', f.source);
  if (f.search) p.set('search', f.search);
  if (f.unused) p.set('unused', '1');
  p.set('page', f.page);
  p.set('pageSize', f.pageSize);
  return '?' + p.toString();
}

async function loadQuestions() {
  try {
    const r = await api('/questions' + filterQuery());
    state.total = r.total;
    renderList(r.questions);
    renderPager();
    $('topStat').textContent = '共 ' + r.total + ' 道题';
  } catch (e) { toast(e.message, true); }
}

function optionsHtml(q) {
  const opts = q.options || [];
  if (!opts.length) return '';
  return '<div class="q-opts">' + opts.map((o, i) =>
    '<div><span class="opt-letter">' + String.fromCharCode(65 + i) + '.</span> ' + inline(stripOptPrefix(o)) + '</div>').join('') + '</div>';
}

/* ================= 统一题目卡片组件 =================
 * 全站所有展示题目的地方共用（题库/组卷/收藏夹/加卷弹窗/相似题），
 * 保证长相与操作位置完全一致。
 * o: {
 *   checkable: 默认 true 显示勾选框；false 关闭
 *   checked / disabledCheck: 勾选状态
 *   grip / num: 拖拽把手与序号（组卷/收藏夹用）
 *   tags / source: 默认 true；false 隐藏标签/来源
 *   actions: 操作按钮，默认 ['fav','edit','del']；传 [] 无按钮；可用 'rm' 移除
 *   metaExtra: 操作区左侧附加（分值输入等）
 *   extra: 操作区右侧附加（移除按钮等）
 *   headExtra: 题头右侧附加（「已在卷中」标记、相似度等）
 *   cardClass: 附加卡片 class（如 'pi-card' 拖拽、'sim-card' 相似题）
 * }
 */
function qCardHtml(q, o) {
  o = o || {};
  const head = [];
  if (o.grip) head.push(o.grip);
  if (o.num !== undefined) head.push('<span class="pi-num">' + o.num + '</span>');
  if (o.checkable !== false) {
    head.push('<label class="q-check-wrap" title="勾选加入卷子"><input type="checkbox" class="q-check" ' +
      (o.checked ? 'checked ' : '') + (o.disabledCheck ? 'disabled ' : '') + 'data-id="' + q.id + '"></label>');
  }
  head.push('<span class="q-code">' + escapeHtml(q.code) + '</span>');
  head.push(qtypeBadge(q));
  if (q.grade) head.push('<span class="badge grade">' + escapeHtml(q.grade) + '</span>');
  head.push(starsHtml(q.difficulty));
  if (o.tags !== false) head.push((q.tags || []).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join(''));
  if (o.source !== false) head.push('<span class="q-source">' + escapeHtml(q.source || '') + '　已用 ' + q.useCount + ' 次</span>');
  if (o.headExtra) head.push(o.headExtra);
  const ans = q.answer ? '<div class="q-answer"><b>答案：</b>' + renderMD(q.answer, [], [], false) + '</div>' : '';
  const actions = o.actions === undefined ? ['fav', 'edit', 'del'] : o.actions;
  const ops = (actions || []).map(a => {
    if (a === 'fav') return '<button class="btn small" data-act="fav" data-id="' + q.id + '" title="收藏">☆</button>';
    if (a === 'edit') return '<button class="btn small" data-act="edit" data-id="' + q.id + '">编辑</button>';
    if (a === 'del') return '<button class="btn small danger" data-act="del" data-id="' + q.id + '">删除</button>';
    if (a === 'rm') return '<button class="btn small danger" data-act="rm" data-id="' + q.id + '">移除</button>';
    return '';
  }).join('');
  return '<div class="q-card' + (o.cardClass ? ' ' + o.cardClass : '') + '" data-id="' + q.id + '"' + (o.dataAttr || '') + '>' +
    '<div class="q-head">' + head.join('') + '</div>' +
    '<div class="q-body md">' + renderMD(q.body, q.images, q.tables) + '</div>' +
    optionsHtml(q) +
    ans +
    '<div class="q-meta">' +
    (o.metaExtra || '') +
    '<div style="flex:1"></div>' +
    ops +
    (o.extra || '') +
    '</div></div>';
}

function renderList(qs) {
  const box = $('qList');
  if (!qs.length) {
    box.innerHTML = '<div class="q-empty"><div class="big">🗂️</div><div>没有符合条件的题目，调整筛选条件或新建题目。</div></div>';
    $('selInfo').textContent = '';
    return;
  }
  box.innerHTML = qs.map(q => qCardHtml(q, { checked: state.checked.has(q.id) })).join('');

  box.querySelectorAll('.q-check').forEach(cb => {
    cb.onchange = () => {
      if (cb.checked) state.checked.add(Number(cb.dataset.id));
      else state.checked.delete(Number(cb.dataset.id));
      updateSelInfo();
      cb.closest('.q-card').classList.toggle('selected', cb.checked);
    };
  });
  box.querySelectorAll('[data-act="edit"]').forEach(b => { b.onclick = () => openEditor(Number(b.dataset.id)); });
  box.querySelectorAll('[data-act="del"]').forEach(b => { b.onclick = () => deleteQuestion(Number(b.dataset.id)); });
  box.querySelectorAll('[data-act="fav"]').forEach(b => {
    b.onclick = ev => {
      ev.stopPropagation();
      favPickQid = Number(b.dataset.id);
      openFavPick();
    };
  });
  // 点击卡片任意处进入详情（按钮、勾选框除外）
  box.querySelectorAll('.q-card').forEach(c => {
    c.onclick = ev => {
      if (ev.target.closest('button') || ev.target.closest('input') || ev.target.closest('label')) return;
      const id = Number(c.dataset.id);
      openDetail(id, [...box.querySelectorAll('.q-card')].map(x => Number(x.dataset.id)), [...box.querySelectorAll('.q-card')].indexOf(c));
    };
  });
  updateSelInfo();
}

function updateSelInfo() {
  $('selInfo').textContent = state.checked.size ? '已选 ' + state.checked.size + ' 题' : '';
}

function renderPager() {
  const f = state.filter;
  const pages = Math.max(1, Math.ceil(state.total / f.pageSize));
  const box = $('pager');
  box.innerHTML = '<button class="btn small" id="pgPrev"' + (f.page <= 1 ? ' disabled' : '') + '>上一页</button>' +
    '<span>' + f.page + ' / ' + pages + '</span>' +
    '<button class="btn small" id="pgNext"' + (f.page >= pages ? ' disabled' : '') + '>下一页</button>';
  $('pgPrev').onclick = () => { f.page--; loadQuestions(); };
  $('pgNext').onclick = () => { f.page++; loadQuestions(); };
}

/* 筛选事件 */
function bindFilter() {
  const f = state.filter;
  const on = (id, key, cb) => {
    $(id).onchange = () => { f[key] = $(id).value; f.page = 1; loadQuestions(); if (cb) cb(); };
  };
  on('fSubject', 'subject');
  on('fQtype', 'qtype');
  on('fGrade', 'grade');
  on('fSource', 'source');
  on('fTag', 'tag');
  // 难度区间：标签在外，两个数字框，默认 1-5（全范围），保证 a ≤ b，非法选项置灰
  let lastDiffChanged = '';
  const syncDiff = () => {
    const min = $('fDiffMin'), max = $('fDiffMax');
    let a = Number(min.value) || 1;
    let b = Number(max.value) || 5;
    if (a > b) {
      if (lastDiffChanged === 'min') { max.value = String(a); b = a; }
      else { min.value = String(b); a = b; }
    }
    f.diffMin = String(a);
    f.diffMax = String(b);
    f.page = 1;
    refreshDiffDisabled();
    loadQuestions();
  };
  const refreshDiffDisabled = () => {
    const min = $('fDiffMin'), max = $('fDiffMax');
    const a = Number(min.value) || 0;
    const b = Number(max.value) || 0;
    [...min.options].forEach(o => { o.disabled = b > 0 && Number(o.value) > b; });
    [...max.options].forEach(o => { o.disabled = a > 0 && Number(o.value) < a; });
  };
  $('fDiffMin').onchange = () => { lastDiffChanged = 'min'; syncDiff(); };
  $('fDiffMax').onchange = () => { lastDiffChanged = 'max'; syncDiff(); };
  let tmr;
  $('fSearch').oninput = () => {
    clearTimeout(tmr);
    tmr = setTimeout(() => { f.search = $('fSearch').value.trim(); f.page = 1; loadQuestions(); }, 350);
  };
  $('fUnused').onchange = () => { f.unused = $('fUnused').checked; f.page = 1; loadQuestions(); };
  $('fClear').onclick = () => {
    Object.assign(f, { subject: '', qtype: '', grade: '', diffMin: '1', diffMax: '5', tag: '', source: '', search: '', unused: false, page: 1 });
    ['fSubject', 'fQtype', 'fGrade', 'fSource', 'fSearch'].forEach(id => $(id).value = '');
    $('fDiffMin').value = '1'; $('fDiffMax').value = '5';
    $('fTag').value = ''; $('fUnused').checked = false;
    refreshDiffDisabled();
    loadQuestions();
  };
  $('checkAll').onchange = () => {
    document.querySelectorAll('#qList .q-check').forEach(cb => {
      cb.checked = $('checkAll').checked;
      const id = Number(cb.dataset.id);
      if (cb.checked) state.checked.add(id); else state.checked.delete(id);
      cb.closest('.q-card').classList.toggle('selected', cb.checked);
    });
    updateSelInfo();
  };
  $('btnNewQ').onclick = () => openEditor(null);
}

/* ================= 删除题目 ================= */
async function deleteQuestion(id) {
  const ok = await modalConfirm('删除这道题？此操作不可恢复。');
  if (!ok) return;
  try {
    const r = await api('/questions/' + id, { method: 'DELETE' });
    if (r.refs > 0) toast('已删除。该题被 ' + r.refs + ' 份卷子引用，卷中显示为「题目已删除」');
    else toast('已删除');
    state.checked.delete(id);
    loadQuestions();
  } catch (e) { toast(e.message, true); }
}

function bindAddToPaper() {
  // 批量收藏：勾选多题 → 选夹子 → 一次收藏
  $('btnBatchFav').onclick = () => {
    const ids = [...state.checked];
    if (!ids.length) { toast('先在题库勾选题目', true); return; }
    favBatchIds = ids;
    openFavPick();
  };
  $('btnAddToPaper').onclick = async () => {
    const ids = [...state.checked];
    if (!ids.length) { toast('先在题库勾选题目', true); return; }
    try {
      const qs = await Promise.all(ids.map(id => api('/questions/' + id)));
      const ps = await api('/papers');
      const choice = await pickTargetDialog(ps);
      if (!choice) return;
      if (choice.mode === 'existing') {
        if (state.paper.dirty && state.paper.items.length) {
          const ok = await modalConfirm('当前卷子有未保存的修改，打开目标卷后将丢失，继续？');
          if (!ok) return;
        }
        const p = await api('/papers/' + choice.paperId);
        state.paper = {
          id: p.id, name: p.name, subject: p.subject, dirty: true,
          items: (p.items || []).map(it => ({ questionId: it.questionId, question: it.question || null, score: it.score || 5, deleted: it.deleted })),
        };
      } else {
        if (!state.paper.dirty || !state.paper.items.length) {
          state.paper = { id: null, name: '', subject: '', dirty: true, items: [] };
        }
      }
      addQuestionsToPaper(qs);
      state.checked.clear();
      updateSelInfo();
      switchToView('paper');
      renderPaper();
      toast('已加入 ' + qs.length + ' 题，记得保存卷子');
    } catch (e) { toast(e.message, true); }
  };
}

function pickTargetDialog(papers) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    const opts = (papers || []).map(p =>
      '<label style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer">' +
      '<input type="radio" name="pt" value="' + p.id + '" style="accent-color:var(--accent)">' +
      '<span>' + escapeHtml(p.name) + '（' + (p.items || []).length + ' 题）</span></label>').join('');
    ov.innerHTML = '<div class="modal sm"><div class="modal-head"><span>加入卷子</span>' +
      '<button class="x" data-c="1">✕</button></div>' +
      '<div class="modal-body">' +
      '<label style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--accent);border-radius:8px;margin-bottom:10px;cursor:pointer;background:var(--accent-weak)">' +
      '<input type="radio" name="pt" value="new" checked style="accent-color:var(--accent)"><b>新建卷子</b></label>' +
      opts +
      '</div>' +
      '<div class="modal-foot"><button class="btn" data-c="1">取消</button>' +
      '<button class="btn primary" data-ok="1">确定</button></div></div>';
    const close = v => { document.body.removeChild(ov); resolve(v); };
    ov.onclick = e => { if (e.target === ov) close(null); };
    ov.querySelectorAll('[data-c="1"]').forEach(b => b.onclick = () => close(null));
    ov.querySelector('[data-ok="1"]').onclick = () => {
      const v = ov.querySelector('input[name="pt"]:checked').value;
      close(v === 'new' ? { mode: 'new' } : { mode: 'existing', paperId: Number(v) });
    };
    document.body.appendChild(ov);
  });
}

/* ================= 通用确认弹窗 ================= */
function modalConfirm(msg) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    ov.innerHTML = '<div class="modal sm"><div class="modal-body" style="font-size:14px">' + escapeHtml(msg) +
      '</div><div class="modal-foot"><button class="btn" data-r="0">取消</button><button class="btn primary" data-r="1">确定</button></div></div>';
    const close = v => { document.body.removeChild(ov); resolve(v); };
    ov.onclick = e => { if (e.target === ov) close(false); };
    ov.querySelector('[data-r="0"]').onclick = () => close(false);
    ov.querySelector('[data-r="1"]').onclick = () => close(true);
    document.body.appendChild(ov);
  });
}

/* ================= 题目编辑器 ================= */
function openEditor(id) {
  state.edit = { id: null, images: [], tables: [], options: [], qtype: 'single', difficulty: 3, answer: '', tags: [], grade: '高中' };
  $('eSubject').value = '';
  $('eQtype').value = 'single';
  $('eGrade').value = '高中';
  $('eSource').value = '';
  $('eBody').value = '';
  $('eAnalysis').value = '';
  $('editorTitle').textContent = '新建题目';
  $('btnSaveQ').textContent = '保存题目';

  if (id) {
    api('/questions/' + id).then(q => {
      state.edit.id = q.id;
      $('eSubject').value = q.subject;
      $('eQtype').value = q.qtype;
      $('eGrade').value = q.grade || '高中';
      $('eSource').value = q.source;
      state.edit.tags = q.tags || [];
      $('eBody').value = q.body;
      $('eAnalysis').value = q.analysis;
      state.edit.images = q.images || [];
      state.edit.tables = q.tables || [];
      state.edit.options = q.options || [];
      state.edit.difficulty = q.difficulty || 3;
      state.edit.answer = q.answer || '';
      $('editorTitle').textContent = '编辑题目 ' + q.code;
      syncEditor();
    }).catch(e => toast(e.message, true));
  } else {
    state.edit.options = ['A. ', 'B. ', 'C. ', 'D. '];
    syncEditor();
  }
  $('ovEditor').classList.add('open');
}

function closeEditor() { $('ovEditor').classList.remove('open'); }

function renderStars() {
  const d = state.edit.difficulty;
  document.querySelectorAll('#eStars .sp-star').forEach(s => {
    s.classList.toggle('on', Number(s.dataset.v) <= d);
  });
}

/* 标签块渲染与输入 */
function renderEditTags() {
  const box = $('eTags');
  const input = box.querySelector('input');
  box.querySelectorAll('.tag-chip').forEach(c => c.remove());
  state.edit.tags.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = escapeHtml(t) + '<button class="x" type="button" title="删除标签">✕</button>';
    chip.querySelector('.x').onclick = () => { state.edit.tags.splice(i, 1); renderEditTags(); };
    box.insertBefore(chip, input);
  });
}

function commitTag() {
  const input = $('eTags').querySelector('input');
  const v = input.value.trim();
  if (v && !state.edit.tags.includes(v)) state.edit.tags.push(v);
  input.value = '';
  renderEditTags();
}

function syncEditor() {
  const e = state.edit;
  $('eQtype').value = e.qtype;
  // 难度
  renderStars();
  // 标签
  renderEditTags();
  // 图片
  $('eImages').innerHTML = e.images.map((im, i) =>
    '<div class="img-item" data-i="' + i + '">' +
    '<div class="im-tag">图 ' + (i + 1) + '</div>' +
    '<img src="' + im.data + '">' +
    '<div class="im-ops">' +
    '<label style="font-size:13px;color:var(--text-2)">宽度 <input type="number" data-i="' + i + '" value="' + (im.width || 30) + '" min="5" max="100" step="5" style="width:64px;border:1px solid var(--border);border-radius:6px;padding:4px 6px">%</label>' +
    '<button class="del" data-i="' + i + '">✕</button>' +
    '</div></div>').join('');
  $('eImages').querySelectorAll('input[type=number]').forEach(inp => {
    inp.onchange = () => {
      const v = Math.min(100, Math.max(5, Number(inp.value) || 30));
      e.images[Number(inp.dataset.i)].width = v;
      inp.value = v;
    };
  });
  $('eImages').querySelectorAll('.del').forEach(b => {
    b.onclick = () => { e.images.splice(Number(b.dataset.i), 1); syncEditor(); };
  });
  // 表格
  $('eTables').innerHTML = e.tables.map((t, i) =>
    '<div class="tbl-item" data-i="' + i + '">' +
    '<div class="tbl-head"><span style="font-weight:600">表 ' + (i + 1) + '</span>' +
    '<button class="btn small" data-t="preview" data-i="' + i + '">预览</button>' +
    '<button class="del" data-t="del" data-i="' + i + '">✕</button></div>' +
    '<textarea data-i="' + i + '" rows="3" spellcheck="false">' + escapeHtml(t.markdown) + '</textarea>' +
    '</div>').join('');
  $('eTables').querySelectorAll('textarea').forEach(ta => {
    ta.oninput = () => { e.tables[Number(ta.dataset.i)].markdown = ta.value; };
  });
  $('eTables').querySelectorAll('[data-t="del"]').forEach(b => {
    b.onclick = () => { e.tables.splice(Number(b.dataset.i), 1); syncEditor(); };
  });
  $('eTables').querySelectorAll('[data-t="preview"]').forEach(b => {
    b.onclick = () => {
      const t = e.tables[Number(b.dataset.i)];
      const old = b.textContent;
      if (old === '预览') {
        const row = b.closest('.tbl-item');
        const oldTA = row.querySelector('textarea');
        const pv = document.createElement('div');
        pv.className = 'tbl-preview md';
        pv.innerHTML = renderTable(t.markdown);
        row.insertBefore(pv, oldTA.nextSibling);
        b.textContent = '收起';
      } else {
        const pv = b.closest('.tbl-item').querySelector('.tbl-preview');
        if (pv) pv.remove();
        b.textContent = '预览';
      }
    };
  });
  // 选项
  const optField = $('optionsField');
  if (e.qtype === 'single' || e.qtype === 'multi') {
    optField.style.display = '';
    $('eOptions').innerHTML = e.options.map((o, i) =>
      '<div class="opt-row" data-i="' + i + '">' +
      '<span class="opt-grip" draggable="true" title="拖拽排序">⠿</span>' +
      '<span class="opt-letter">' + String.fromCharCode(65 + i) + '.</span>' +
      '<input data-i="' + i + '" value="' + escapeHtml(stripOptPrefix(o)) + '" placeholder="选项内容">' +
      (e.options.length > 2 ? '<button class="del" data-i="' + i + '">✕</button>' : '') + '</div>').join('');
    $('eOptions').querySelectorAll('input').forEach(inp => {
      inp.oninput = () => { e.options[Number(inp.dataset.i)] = inp.value; };
    });
    $('eOptions').querySelectorAll('.del').forEach(b => {
      b.onclick = () => { e.options.splice(Number(b.dataset.i), 1); syncEditor(); };
    });
    bindOptDrag();
  } else {
    optField.style.display = 'none';
  }
  // 答案区
  renderAnswerArea();
}

/* 选项拖拽排序（事件委托，避免每次重渲染后重新绑定） */
let optDragFrom = -1;
function bindOptDrag() {
  const box = $('eOptions');
  if (box._dragBound) return;
  box._dragBound = true;
  box.addEventListener('dragstart', ev => {
    const grip = ev.target.closest('.opt-grip');
    if (!grip) { ev.preventDefault(); return; }
    optDragFrom = Number(grip.closest('.opt-row').dataset.i);
    grip.closest('.opt-row').classList.add('dragging');
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', String(optDragFrom));
  });
  box.addEventListener('dragover', ev => {
    const row = ev.target.closest('.opt-row');
    if (!row || optDragFrom < 0) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    box.querySelectorAll('.opt-row').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });
  box.addEventListener('drop', ev => {
    const row = ev.target.closest('.opt-row');
    if (!row || optDragFrom < 0) return;
    ev.preventDefault();
    const to = Number(row.dataset.i);
    if (to !== optDragFrom) {
      const item = state.edit.options.splice(optDragFrom, 1)[0];
      state.edit.options.splice(to, 0, item);
      syncEditor();
    }
  });
  box.addEventListener('dragend', () => {
    optDragFrom = -1;
    box.querySelectorAll('.opt-row').forEach(r => r.classList.remove('dragging', 'drag-over'));
  });
}

function renderAnswerArea() {
  const e = state.edit;
  const box = $('eAnswerArea');
  if (e.qtype === 'single') {
    const letters = e.options.map((o, i) => String.fromCharCode(65 + i));
    box.innerHTML = '<div class="ans-single">' + letters.map(L =>
      '<button data-v="' + L + '"' + (e.answer === L ? ' class="on"' : '') + '>' + L + '</button>').join('') +
      '<button data-v=""' + (!e.answer ? ' class="on"' : '') + '>未答</button></div>';
    box.querySelectorAll('button').forEach(b => {
      b.onclick = () => { e.answer = b.dataset.v; renderAnswerArea(); };
    });
  } else if (e.qtype === 'multi') {
    const letters = e.options.map((o, i) => String.fromCharCode(65 + i));
    const sel = new Set(e.answer.split('').filter(c => c >= 'A' && c <= 'Z'));
    box.innerHTML = '<div class="ans-multi">' + letters.map(L =>
      '<button data-v="' + L + '"' + (sel.has(L) ? ' class="on"' : '') + '>' + L + '</button>').join('') + '</div>';
    box.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        if (sel.has(b.dataset.v)) sel.delete(b.dataset.v); else sel.add(b.dataset.v);
        e.answer = [...sel].sort().join('');
        renderAnswerArea();
      };
    });
  } else {
    box.innerHTML = '<textarea id="eAnswerText" rows="2" placeholder="答案内容…" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;outline:none">' + escapeHtml(e.answer) + '</textarea>';
    $('eAnswerText').oninput = () => { e.answer = $('eAnswerText').value; };
  }
}

/* 图片压缩 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error('无法读取图片')); return; }
        if (w > MAX || h > MAX) {
          const s = MAX / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff'; // 白底，防透明 PNG 变黑
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('图片解码失败'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

function bindEditor() {
  $('eQtype').onchange = () => {
    const nt = $('eQtype').value;
    if (nt !== state.edit.qtype) {
      state.edit.qtype = nt;
      if ((nt === 'single' || nt === 'multi') && !state.edit.options.length) {
        state.edit.options = ['A. ', 'B. ', 'C. ', 'D. '];
      }
      if (nt === 'single') state.edit.answer = '';
      syncEditor();
    }
  };
  document.querySelectorAll('#eStars .sp-star').forEach(s => {
    s.onclick = () => { state.edit.difficulty = Number(s.dataset.v); renderStars(); };
    // hover 预览：悬停到第 N 颗时点亮 1..N，移出恢复实际值
    s.onmouseenter = () => {
      const v = Number(s.dataset.v);
      document.querySelectorAll('#eStars .sp-star').forEach(x => x.classList.toggle('on', Number(x.dataset.v) <= v));
    };
  });
  $('eStars').onmouseleave = renderStars;
  $('btnAddOpt').onclick = () => {
    state.edit.options.push('');
    syncEditor();
  };
  $('btnAddTable').onclick = () => {
    state.edit.tables.push({ markdown: '| 列1 | 列2 |\n| --- | --- |\n|  |  |' });
    syncEditor();
  };
  $('btnInsFig').onclick = () => {
    toast('图片会自动显示在题干下方，无需插入占位符');
  };
  $('btnInsTbl').onclick = () => {
    toast('表格会自动显示在题干下方，无需插入占位符');
  };
  // 上传
  const zone = $('eUploadZone');
  zone.onclick = () => $('eUploadInput').click();
  $('eUploadInput').onchange = async () => {
    const files = [...$('eUploadInput').files];
    $('eUploadInput').value = '';
    if (!files.length) return;
    for (const f of files) {
      try {
        const data = await compressImage(f);
        state.edit.images.push({ data, width: 30 });
      } catch (e) { toast(f.name + ': ' + e.message, true); }
    }
    syncEditor();
  };
  // 拖拽上传
  zone.ondragover = e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; };
  zone.ondragleave = () => { zone.style.borderColor = ''; };
  zone.ondrop = async e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    for (const f of files) {
      try { state.edit.images.push({ data: await compressImage(f), width: 30 }); }
      catch (err) { toast(f.name + ': ' + err.message, true); }
    }
    syncEditor();
  };
  // 标签块输入：回车/逗号/顿号提交，退格删除最后一个，失焦提交
  const tagInput = $('eTags').querySelector('input');
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === '、') {
      e.preventDefault();
      commitTag();
    } else if (e.key === 'Backspace' && !tagInput.value && state.edit.tags.length) {
      state.edit.tags.pop();
      renderEditTags();
    }
  });
  tagInput.addEventListener('blur', commitTag);

  // 保存
  $('btnSaveQ').onclick = async () => {
    const e = state.edit;
    commitTag(); // 兜底：输入了但没按回车的标签也收进
    const body = $('eBody').value.trim();
    if (!body) { toast('题干不能为空', true); return; }
    const q = {
      id: e.id,
      subject: $('eSubject').value.trim(),
      qtype: $('eQtype').value,
      grade: $('eGrade').value,
      difficulty: e.difficulty,
      tags: e.tags,
      source: $('eSource').value.trim(),
      body,
      options: e.qtype === 'single' || e.qtype === 'multi' ? e.options.map(stripOptPrefix).filter(o => o.trim()) : [],
      answer: e.answer.trim(),
      analysis: $('eAnalysis').value,
      images: e.images,
      tables: e.tables,
    };
    try {
      if (e.id) await api('/questions/' + e.id, { method: 'PUT', body: q });
      else await api('/questions', { method: 'POST', body: q });
      toast(e.id ? '已保存' : '已创建');
      closeEditor();
      // 详情页实时刷新：题目 + 相似题 + 收藏状态一次拉新
      if (e.id && detailState.q && detailState.q.id === e.id) {
        await loadDetail();
      }
      loadQuestions();
      loadMeta();
    } catch (err) { toast(err.message, true); }
  };
}

/* ================= 组卷 ================= */
function renderPaper() {
  const box = $('paperItems');
  $('paperEmpty').style.display = state.paper.items.length ? 'none' : '';
  $('paperName').value = state.paper.name || '';
  box.innerHTML = state.paper.items.map((it, i) => {
    const q = it.question;
    if (!q) {
      return '<div class="q-card pi-card" data-i="' + i + '">' +
        '<div class="q-head"><span class="pi-grip" draggable="true" title="拖拽排序">⠿</span><span class="pi-num">' + (i + 1) + '</span></div>' +
        '<div class="q-body md" style="color:var(--text-2)">⚠️ 题目已删除</div>' +
        '<div class="q-meta"><div style="flex:1"></div>' +
        '<button class="btn small danger" data-act="rm" data-i="' + i + '">移除</button></div></div>';
    }
    return qCardHtml(q, {
      checkable: false,
      grip: '<span class="pi-grip" draggable="true" title="拖拽排序">⠿</span>',
      num: i + 1,
      source: false,
      actions: [],
      cardClass: 'pi-card',
      dataAttr: ' data-i="' + i + '"',
      metaExtra: '<div class="pi-score">分值 <input type="number" step="0.5" min="0" value="' + (it.score || 5) + '" data-i="' + i + '"></div>',
      extra: '<button class="btn small danger" data-act="rm" data-i="' + i + '">移除</button>',
    });
  }).join('');

  box.querySelectorAll('input[type=number]').forEach(inp => {
    inp.onchange = () => { state.paper.items[Number(inp.dataset.i)].score = Number(inp.value) || 0; state.paper.dirty = true; };
  });
  box.querySelectorAll('[data-act="rm"]').forEach(b => {
    b.onclick = () => { state.paper.items.splice(Number(b.dataset.i), 1); state.paper.dirty = true; renderPaper(); };
  });
}

/* 组卷列表拖拽排序（事件委托） */
let paperDragFrom = -1;
function bindPaperDrag() {
  const box = $('paperItems');
  if (box._dragBound) return;
  box._dragBound = true;
  box.addEventListener('dragstart', ev => {
    const grip = ev.target.closest('.pi-grip');
    if (!grip) { ev.preventDefault(); return; }
    paperDragFrom = Number(grip.closest('.pi-card').dataset.i);
    grip.closest('.pi-card').classList.add('dragging');
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', String(paperDragFrom));
  });
  box.addEventListener('dragover', ev => {
    const card = ev.target.closest('.pi-card');
    if (!card || paperDragFrom < 0) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    box.querySelectorAll('.pi-card').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });
  box.addEventListener('drop', ev => {
    const card = ev.target.closest('.pi-card');
    if (!card || paperDragFrom < 0) return;
    ev.preventDefault();
    const to = Number(card.dataset.i);
    if (to !== paperDragFrom) {
      const item = state.paper.items.splice(paperDragFrom, 1)[0];
      state.paper.items.splice(to, 0, item);
      state.paper.dirty = true;
      renderPaper();
    }
  });
  box.addEventListener('dragend', () => {
    paperDragFrom = -1;
    box.querySelectorAll('.pi-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
  });
}

/* 按题型批量重排：单选→多选→填空→解答，同题型保持原顺序 */
function sortPaperByType() {
  const order = { single: 0, multi: 1, fill: 2, essay: 3 };
  const idx = state.paper.items.map((it, i) => ({ it, i }));
  idx.sort((a, b) => {
    const qa = a.it.question, qb = b.it.question;
    if (!qa && !qb) return a.i - b.i;
    if (!qa) return 1;      // 已删除的题排最后
    if (!qb) return -1;
    const oa = order[qa.qtype] !== undefined ? order[qa.qtype] : 9;
    const ob = order[qb.qtype] !== undefined ? order[qb.qtype] : 9;
    if (oa !== ob) return oa - ob;
    return a.i - b.i;       // 同题型保持原相对顺序
  });
  state.paper.items = idx.map(x => x.it);
  state.paper.dirty = true;
  renderPaper();
  toast('已按题型排序：单选 → 多选 → 填空 → 解答');
}

function addQuestionsToPaper(questions, score = 5) {
  for (const q of questions) {
    if (state.paper.items.some(it => it.question && it.question.id === q.id)) continue;
    state.paper.items.push({ questionId: q.id, question: q, score });
  }
  state.paper.dirty = true;
}

async function savePaper() {
  const name = $('paperName').value.trim();
  if (!name) { toast('请先填写卷子名称', true); return; }
  // 科目由卷内题目自动推导：取出现最多的科目
  const subs = state.paper.items.map(it => it.question && it.question.subject).filter(Boolean);
  const cnt = {};
  subs.forEach(s => { cnt[s] = (cnt[s] || 0) + 1; });
  const subject = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0] ? Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0] : '';
  const items = state.paper.items.map((it, i) => ({ questionId: it.questionId, score: it.score || 5, position: i }));
  try {
    if (state.paper.id) {
      await api('/papers/' + state.paper.id, { method: 'PUT', body: { name, subject, items } });
      toast('卷子已更新');
    } else {
      const p = await api('/papers', { method: 'POST', body: { name, subject, items } });
      state.paper.id = p.id;
      toast('卷子已保存');
    }
    state.paper.name = name;
    state.paper.subject = subject;
    state.paper.dirty = false;
  } catch (e) { toast(e.message, true); }
}

function bindPaper() {
  $('btnSavePaper').onclick = savePaper;
  $('paperName').oninput = () => { state.paper.name = $('paperName').value; state.paper.dirty = true; };
  $('btnAddFromBank').onclick = openPick;
  $('btnExport').onclick = () => openExport(state.paper.items, $('paperName').value.trim());
  $('btnSortByType').onclick = sortPaperByType;
  bindPaperDrag();
}

/* 从题库添加弹窗 */
let pickChecked = new Set();
function openPick() {
  pickChecked = new Set();
  $('pSearch').value = '';
  $('pQtype').value = '';
  $('pGrade').value = '';
  $('pSubject').value = '';
  loadPickList();
  $('ovPick').classList.add('open');
}
function closePick() { $('ovPick').classList.remove('open'); }

async function loadPickList() {
  const p = new URLSearchParams();
  if ($('pSearch').value.trim()) p.set('search', $('pSearch').value.trim());
  if ($('pQtype').value) p.set('qtype', $('pQtype').value);
  if ($('pGrade').value) p.set('grade', $('pGrade').value);
  if ($('pSubject').value) p.set('subject', $('pSubject').value);
  p.set('pageSize', '100');
  try {
    const r = await api('/questions?' + p.toString());
    const box = $('pickList');
    $('pickInfo').textContent = '找到 ' + r.total + ' 题，已选 ' + pickChecked.size + ' 题';
    box.innerHTML = r.questions.map(q => {
      const inPaper = state.paper.items.some(it => it.question && it.question.id === q.id);
      return qCardHtml(q, {
        checked: pickChecked.has(q.id) || inPaper,
        disabledCheck: inPaper,
        source: false,
        actions: [],
        headExtra: inPaper ? '<span class="tag">已在卷中</span>' : '',
      });
    }).join('');
    box.querySelectorAll('.q-check:not(:disabled)').forEach(cb => {
      cb.onchange = () => {
        const id = Number(cb.dataset.id);
        if (cb.checked) pickChecked.add(id); else pickChecked.delete(id);
        $('pickInfo').textContent = '找到 ' + r.total + ' 题，已选 ' + pickChecked.size + ' 题';
      };
    });
  } catch (e) { toast(e.message, true); }
}

function bindPick() {
  let tmr;
  $('pSearch').oninput = () => { clearTimeout(tmr); tmr = setTimeout(loadPickList, 300); };
  $('pQtype').onchange = loadPickList;
  $('pGrade').onchange = loadPickList;
  $('pSubject').onchange = loadPickList;
  $('btnPickConfirm').onclick = () => {
    const ids = [...pickChecked];
    if (!ids.length) { toast('未选择题目', true); return; }
    // 逐题取完整数据（含图片表格）
    Promise.all(ids.map(id => api('/questions/' + id))).then(qs => {
      addQuestionsToPaper(qs);
      closePick();
      renderPaper();
      toast('已加入 ' + qs.length + ' 题，记得保存卷子');
    }).catch(e => toast(e.message, true));
  };
}

/* ================= 导出 ================= */
let exportMD = '';
let exportName = '';
let exportItems = [];
let exportPaperName = '';

function openExport(items, name) {
  exportItems = items.filter(it => it.question);
  exportPaperName = name;
  if (!exportItems.length) { toast('没有可用题目', true); return; }
  // 默认：只导出题目（学生卷）
  $('xIncludeQ').checked = true;
  $('xIncludeA').checked = false;
  $('xIncludeN').checked = false;
  $('xAnswerPos').value = 'end';
  $('xAnalysisPos').value = 'end';
  syncExportUI();
  $('ovExport').classList.add('open');
  buildExportPreview();
}

function closeExport() { $('ovExport').classList.remove('open'); }

// 导出内容勾选联动：不导出题目时，答案/解析只能卷尾集中（无处可挂「每题后」）
function syncExportUI() {
  const incQ = $('xIncludeQ').checked, incA = $('xIncludeA').checked, incN = $('xIncludeN').checked;
  const ansSel = $('xAnswerPos'), anaSel = $('xAnalysisPos');
  const ansField = $('xAnswerField'), anaField = $('xAnalysisField');
  const ansLocked = !incA || !incQ;
  const anaLocked = !incN || !incQ;
  ansSel.disabled = ansLocked;
  anaSel.disabled = anaLocked;
  ansField.classList.toggle('disabled-field', ansLocked);
  anaField.classList.toggle('disabled-field', anaLocked);
  const hints = [];
  if (!incQ && (incA || incN)) hints.push('不导出题目时，答案和解析集中放在卷尾');
  if (incQ && !incA && !incN) hints.push('只导出题目：学生卷');
  if (!incQ && incA && !incN) hints.push('答案卷（仅答案）');
  if (!incQ && !incA && incN) hints.push('解析卷（仅解析）');
  $('xHint').textContent = hints.join('；') || '勾选要导出的内容';
}

async function buildExportPreview() {
  const items = exportItems;
  const name = exportPaperName || '试卷';
  const incQ = $('xIncludeQ').checked, incA = $('xIncludeA').checked, incN = $('xIncludeN').checked;
  if (!incQ && !incA && !incN) {
    $('exportPreview').value = '（至少勾选一项导出内容）';
    exportMD = '';
    return;
  }
  // 不导出题目时，答案/解析强制卷尾集中
  let answerPos = 'off', analysisPos = 'off';
  if (incA) answerPos = incQ ? $('xAnswerPos').value : 'end';
  if (incN) analysisPos = incQ ? $('xAnalysisPos').value : 'end';
  const body = {
    paperName: name,
    questions: items.map(it => it.question),
    scores: items.map(it => it.score || 5),
    withBody: incQ,
    answerPos,
    analysisPos,
  };
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('导出失败');
    exportMD = await res.text();
    exportName = decodeURIComponent((res.headers.get('Content-Disposition') || '').split("''")[1] || '试卷.md');
    $('exportPreview').value = exportMD;
  } catch (e) { toast(e.message, true); }
}

function bindExport() {
  ['xIncludeQ', 'xIncludeA', 'xIncludeN'].forEach(id => {
    $(id).onchange = () => { syncExportUI(); buildExportPreview(); };
  });
  $('xAnswerPos').onchange = buildExportPreview;
  $('xAnalysisPos').onchange = buildExportPreview;
  $('btnDownload').onclick = () => {
    if (!exportMD) return;
    const blob = new Blob([exportMD], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportName;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已下载 ' + exportName);
  };
}

/* ================= 卷子列表 ================= */
async function loadPapers() {
  try {
    const ps = await api('/papers');
    const box = $('paperList');
    if (!ps.length) {
      box.innerHTML = '<div class="q-empty"><div class="big">📄</div><div>还没有卷子，去题库勾选题目组一套吧。</div></div>';
      return;
    }
    box.innerHTML = ps.map(p => {
      const n = p.itemCount || 0;
      const deleted = p.deletedCount || 0;
      return '<div class="paper-card">' +
        '<div><div class="pc-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="pc-meta">' + escapeHtml(p.subject || '未分科目') + ' · ' + n + ' 题' +
        (deleted ? ' · ' + deleted + ' 题已删除' : '') + ' · ' + escapeHtml(p.createdAt || '') + '</div></div>' +
        '<div class="pc-ops">' +
        '<button class="btn small primary" data-act="open" data-id="' + p.id + '">打开</button>' +
        '<button class="btn small" data-act="rename" data-id="' + p.id + '">重命名</button>' +
        '<button class="btn small danger" data-act="del" data-id="' + p.id + '">删除</button>' +
        '</div></div>';
    }).join('');
    box.querySelectorAll('[data-act="open"]').forEach(b => {
      b.onclick = () => openPaper(Number(b.dataset.id));
    });
    box.querySelectorAll('[data-act="rename"]').forEach(b => {
      b.onclick = async () => {
        const p = ps.find(x => x.id === Number(b.dataset.id));
        const name = await modalPrompt('卷子新名称：', p ? p.name : '');
        if (!name || name === p.name) return;
        try {
          const full = await api('/papers/' + b.dataset.id);
          full.name = name;
          await api('/papers/' + b.dataset.id, { method: 'PUT', body: full });
          toast('卷子已重命名');
          loadPapers();
        } catch (e) { toast(e.message, true); }
      };
    });
    box.querySelectorAll('[data-act="del"]').forEach(b => {
      b.onclick = async () => {
        const ok = await modalConfirm('删除卷子「' + ps.find(p => p.id === Number(b.dataset.id)).name + '」？');
        if (!ok) return;
        try {
          await api('/papers/' + b.dataset.id, { method: 'DELETE' });
          toast('卷子已删除');
          loadPapers();
        } catch (e) { toast(e.message, true); }
      };
    });
  } catch (e) { toast(e.message, true); }
}

async function openPaper(id) {
  if (state.paper.dirty) {
    const ok = await modalConfirm('当前卷子有未保存的修改，放弃并打开其他卷子？');
    if (!ok) return;
  }
  try {
    const p = await api('/papers/' + id);
    state.paper = {
      id: p.id,
      name: p.name,
      subject: p.subject,
      dirty: false,
      items: (p.items || []).map(it => ({
        questionId: it.questionId,
        question: it.question || null,
        score: it.score || 5,
        deleted: it.deleted,
      })),
    };
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-view="paper"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-paper').classList.add('active');
    renderPaper();
  } catch (e) { toast(e.message, true); }
}

/* ================= 导入导出 ================= */
function bindIO() {
  $('btnSnapshotOut').onclick = async () => {
    try {
      const res = await fetch('/api/snapshot');
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '题库快照_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('快照已下载');
    } catch (e) { toast(e.message, true); }
  };
  $('btnPickFile').onclick = () => $('importFile').click();
  $('importFile').onchange = () => {
    const f = $('importFile').files[0];
    $('importFileName').textContent = f ? f.name : '';
  };
  $('btnImport').onclick = async () => {
    const f = $('importFile').files[0];
    if (!f) { toast('先选择 JSON 文件', true); return; }
    const overwrite = $('importOverwrite').checked;
    const ok = await modalConfirm('导入「' + f.name + '」？重复题目将' + (overwrite ? '被覆盖更新' : '跳过') + '。');
    if (!ok) return;
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/api/import?overwrite=' + (overwrite ? 1 : 0), { method: 'POST', body: f });
      if (!res.ok) {
        let msg = '导入失败';
        try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
        throw new Error(msg);
      }
      const r = await res.json();
      toast('导入完成：新增 ' + r.added + ' 题，更新 ' + r.updated + ' 题，跳过 ' + r.skipped + ' 题');
      $('importFile').value = '';
      $('importFileName').textContent = '';
      loadMeta();
      loadQuestions();
    } catch (e) { toast(e.message, true); }
  };
}

/* ================= 题目详情页 ================= */
const detailState = { ids: [], idx: 0, q: null, favIds: [] };

// 打开详情：ids 为可翻题的题目 id 序列（当前列表页顺序），idx 为当前下标
async function openDetail(id, ids, idx) {
  detailState.ids = ids || [id];
  detailState.idx = idx !== undefined ? idx : detailState.ids.indexOf(id);
  if (detailState.idx < 0) detailState.idx = 0;
  switchToView('detail');
  await loadDetail();
}

async function loadDetail() {
  const id = detailState.ids[detailState.idx];
  try {
    const q = await api('/questions/' + id);
    detailState.q = q;
    renderDetail(q);
    // 相似题
    const sim = await api('/questions/' + id + '/similar?limit=8');
    renderSimilar(sim.similar || []);
    // 收藏状态
    const fv = await api('/questions/' + id + '/favs');
    detailState.favIds = fv.favoriteIds || [];
    updateFavBtn();
  } catch (e) { toast(e.message, true); }
}

function renderDetail(q) {
  $('detailTitle').textContent = q.code;
  $('dCode').textContent = q.code;
  const qt = $('dQtype');
  qt.textContent = QTYPE_NAME[q.qtype] || q.qtype;
  qt.className = 'badge ' + (QTYPE_CLS[q.qtype] || '');
  $('dGrade').textContent = q.grade || '';
  $('dStars').innerHTML = starsHtml(q.difficulty);
  $('dTags').innerHTML = (q.tags || []).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('');
  $('dSource').textContent = q.source || '';
  $('dBody').innerHTML = renderMD(q.body, q.images, q.tables);
  $('dOptions').innerHTML = optionsHtml(q);
  $('dAnswer').innerHTML = q.answer ? '<b>答案：</b>' + renderMD(q.answer, [], [], false) : '';
  $('dAnalysis').innerHTML = q.analysis ? '<b>解析：</b>' + renderMD(q.analysis, [], [], false) : '';
  if (!q.answer) $('dAnswer').style.display = 'none'; else $('dAnswer').style.display = '';
  if (!q.analysis) $('dAnalysis').style.display = 'none'; else $('dAnalysis').style.display = '';
  $('dMeta').textContent = '创建 ' + q.createdAt + '　修改 ' + q.updatedAt + '　已使用 ' + q.useCount + ' 次';
  $('btnDetailPrev').disabled = detailState.idx <= 0;
  $('btnDetailNext').disabled = detailState.idx >= detailState.ids.length - 1;
}

function renderSimilar(sims) {
  const box = $('similarList');
  $('simInfo').textContent = sims.length ? '（同科目：知识点 + 题干相似度）' : '（未找到相似题目）';
  box.innerHTML = sims.map(s => {
    const q = s.question;
    return qCardHtml(q, {
      checkable: false,
      tags: false,
      source: false,
      actions: [],
      cardClass: 'sim-card',
      headExtra: '<span class="sim-score">相似度 ' + s.score + '%</span>',
    });
  }).join('');
  box.querySelectorAll('.sim-card').forEach(c => {
    c.onclick = () => {
      const id = Number(c.dataset.id);
      const idx = detailState.ids.indexOf(id);
      if (idx >= 0) { detailState.idx = idx; loadDetail(); }
      else openDetail(id, [id], 0);
    };
  });
}

function updateFavBtn() {
  $('btnDetailFav').textContent = detailState.favIds.length ? '★ 已收藏' : '☆ 收藏';
  $('btnDetailFav').classList.toggle('primary', detailState.favIds.length > 0);
}

function bindDetail() {
  $('btnDetailBack').onclick = () => { switchToView('questions'); loadQuestions(); };
  $('btnDetailPrev').onclick = () => { if (detailState.idx > 0) { detailState.idx--; loadDetail(); } };
  $('btnDetailNext').onclick = () => { if (detailState.idx < detailState.ids.length - 1) { detailState.idx++; loadDetail(); } };
  $('btnDetailEdit').onclick = () => { if (detailState.q) openEditor(detailState.q.id); };
  $('btnDetailDel').onclick = async () => {
    if (!detailState.q) return;
    const ok = await modalConfirm('删除这道题？此操作不可恢复。');
    if (!ok) return;
    try {
      const r = await api('/questions/' + detailState.q.id, { method: 'DELETE' });
      toast(r.refs > 0 ? '已删除，卷中显示为「题目已删除」' : '已删除');
      switchToView('questions');
      loadQuestions();
    } catch (e) { toast(e.message, true); }
  };
  $('btnDetailFav').onclick = openFavPick;
}

/* ================= 收藏夹 ================= */
const favState = { list: [], current: null, items: [], checked: new Set() };

async function loadFavs() {
  try {
    favState.list = await api('/favorites');
    renderFavList();
    if (favState.current) {
      const still = favState.list.find(f => f.id === favState.current);
      if (still) await openFav(favState.current);
      else favState.current = null;
    }
    if (!favState.list.length) {
      favState.current = null;
      favState.items = [];
      $('favContent').style.display = 'none';
      $('favEmpty').style.display = '';
    }
  } catch (e) { toast(e.message, true); }
}

function renderFavList() {
  const box = $('favList');
  box.innerHTML = favState.list.map(f =>
    '<button class="fav-chip' + (f.id === favState.current ? ' active' : '') + '" data-id="' + f.id + '">' +
    escapeHtml(f.name) + ' <span class="cnt">' + (f.itemCount - f.deletedCount) + '</span></button>').join('');
  box.querySelectorAll('.fav-chip').forEach(c => {
    c.onclick = () => openFav(Number(c.dataset.id));
  });
  $('favEmpty').style.display = favState.list.length ? 'none' : '';
}

async function openFav(id) {
  favState.current = id;
  favState.checked = new Set();
  renderFavList();
  try {
    const f = await api('/favorites/' + id);
    favState.items = (f.items || []).map(it => ({
      questionId: it.questionId,
      question: it.question || null,
      deleted: it.deleted,
      createdAt: it.createdAt,
    }));
    favState.name = f.name;
    $('favContent').style.display = '';
    $('favNameInput').value = f.name;
    renderFavItems();
  } catch (e) { toast(e.message, true); }
}

function renderFavItems() {
  const box = $('favItems');
  box.innerHTML = favState.items.map((it, i) => {
    const q = it.question;
    if (!q) {
      return '<div class="q-card pi-card" data-i="' + i + '">' +
        '<div class="q-body md" style="color:var(--text-2)">⚠️ 题目已删除</div>' +
        '<div class="q-meta"><div style="flex:1"></div>' +
        '<button class="btn small danger" data-act="rm" data-id="' + it.questionId + '">移除</button></div></div>';
    }
    return qCardHtml(q, {
      checked: favState.checked.has(q.id),
      grip: '<span class="pi-grip" draggable="true" title="拖拽排序">⠿</span>',
      num: i + 1,
      source: false,
      actions: ['fav', 'rm'],
      cardClass: 'pi-card',
      dataAttr: ' data-i="' + i + '"',
    });
  }).join('');

  box.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.onchange = () => {
      const id = Number(cb.dataset.id);
      if (cb.checked) favState.checked.add(id); else favState.checked.delete(id);
      updateFavSel();
    };
  });
  box.querySelectorAll('[data-act="fav"]').forEach(b => {
    b.onclick = ev => {
      ev.stopPropagation();
      favPickQid = Number(b.dataset.id);
      openFavPick();
    };
  });
  box.querySelectorAll('[data-act="rm"]').forEach(b => {
    b.onclick = () => removeFavItem(Number(b.dataset.id));
  });
  updateFavSel();
}

function updateFavSel() {
  $('favSelInfo').textContent = favState.checked.size ? '已选 ' + favState.checked.size + ' 题' : '';
}

async function removeFavItem(qid) {
  if (!favState.current) return;
  try {
    await api('/favorites/' + favState.current + '/items/' + qid, { method: 'DELETE' });
    favState.checked.delete(qid);
    toast('已移除');
    await openFav(favState.current);
    loadFavs();
  } catch (e) { toast(e.message, true); }
}

// 拖拽排序（收藏夹）
let favDragFrom = -1;
function bindFavDrag() {
  const box = $('favItems');
  if (box._dragBound) return;
  box._dragBound = true;
  box.addEventListener('dragstart', ev => {
    const grip = ev.target.closest('.pi-grip');
    if (!grip) { ev.preventDefault(); return; }
    favDragFrom = Number(grip.closest('.pi-card').dataset.i);
    grip.closest('.pi-card').classList.add('dragging');
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', String(favDragFrom));
  });
  box.addEventListener('dragover', ev => {
    const card = ev.target.closest('.pi-card');
    if (!card || favDragFrom < 0) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    box.querySelectorAll('.pi-card').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });
  box.addEventListener('drop', ev => {
    const card = ev.target.closest('.pi-card');
    if (!card || favDragFrom < 0) return;
    ev.preventDefault();
    const to = Number(card.dataset.i);
    if (to !== favDragFrom) {
      const item = favState.items.splice(favDragFrom, 1)[0];
      favState.items.splice(to, 0, item);
      saveFavOrder();
      renderFavItems();
    }
  });
  box.addEventListener('dragend', () => {
    favDragFrom = -1;
    box.querySelectorAll('.pi-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
  });
}

async function saveFavOrder() {
  if (!favState.current) return;
  try {
    await api('/favorites/' + favState.current, {
      method: 'PUT',
      body: { name: favState.name, items: favState.items.map((it, i) => ({ questionId: it.questionId, position: i })) },
    });
  } catch (e) { toast(e.message, true); }
}

function bindFavs() {
  bindFavDrag();
  $('btnNewFav').onclick = async () => {
    const name = await modalPrompt('新收藏夹名称：');
    if (!name) return;
    try {
      await api('/favorites', { method: 'POST', body: { name } });
      toast('收藏夹已创建');
      await loadFavs();
    } catch (e) { toast(e.message, true); }
  };
  $('btnRenameFav').onclick = async () => {
    const name = $('favNameInput').value.trim();
    if (!name || !favState.current) return;
    try {
      await api('/favorites/' + favState.current, { method: 'PUT', body: { name, items: favState.items.map((it, i) => ({ questionId: it.questionId, position: i })) } });
      favState.name = name;
      toast('名称已保存');
      await loadFavs();
    } catch (e) { toast(e.message, true); }
  };
  // 删除整个收藏夹（连同内部收藏关系）
  $('btnDeleteFav').onclick = async () => {
    if (!favState.current) return;
    const f = favState.list.find(x => x.id === favState.current);
    const ok = await modalConfirm('删除收藏夹「' + (f ? f.name : '') + '」？里面的收藏会一并清除。');
    if (!ok) return;
    try {
      await api('/favorites/' + favState.current, { method: 'DELETE' });
      toast('收藏夹已删除');
      favState.current = null;
      await loadFavs();
    } catch (e) { toast(e.message, true); }
  };
  $('favCheckAll').onchange = () => {
    const on = $('favCheckAll').checked;
    favState.items.forEach(it => { if (it.question) { if (on) favState.checked.add(it.question.id); else favState.checked.delete(it.question.id); } });
    renderFavItems();
  };
  $('btnFavRemove').onclick = async () => {
    const ids = [...favState.checked];
    if (!ids.length) { toast('未选择题目', true); return; }
    for (const qid of ids) await removeFavItem(qid);
  };
  $('btnFavExport').onclick = () => {
    const items = favState.items.map(it => ({ questionId: it.questionId, question: it.question, score: 0 }));
    openExport(items, favState.name || '收藏夹');
  };
  $('btnFavAddToPaper').onclick = async () => {
    const ids = [...favState.checked];
    if (!ids.length) { toast('未选择题目', true); return; }
    try {
      const qs = await Promise.all(ids.map(id => api('/questions/' + id)));
      const ps = await api('/papers');
      const choice = await pickTargetDialog(ps);
      if (!choice) return;
      if (choice.mode === 'existing') {
        const p = await api('/papers/' + choice.paperId);
        state.paper = {
          id: p.id, name: p.name, subject: p.subject, dirty: true,
          items: (p.items || []).map(it => ({ questionId: it.questionId, question: it.question || null, score: it.score || 5, deleted: it.deleted })),
        };
      } else if (!state.paper.dirty || !state.paper.items.length) {
        state.paper = { id: null, name: '', subject: '', dirty: true, items: [] };
      }
      addQuestionsToPaper(qs);
      switchToView('paper');
      renderPaper();
      toast('已加入 ' + qs.length + ' 题，记得保存卷子');
    } catch (e) { toast(e.message, true); }
  };
}

/* ================= 收藏弹窗 ================= */
let favPickQid = 0;
let favBatchIds = null; // 非 null = 批量收藏模式（数组=勾选的题目 id）

// 渲染收藏弹窗的夹子列表：多选 checkbox，已收藏的默认勾选（勾选状态即展示）
async function refreshFavPickList(selectId) {
  const qid = favBatchIds ? 0 : (favPickQid || (detailState.q ? detailState.q.id : 0));
  const [fs, inFavs] = await Promise.all([
    api('/favorites'),
    qid ? api('/questions/' + qid + '/favs') : Promise.resolve({ favoriteIds: [] }),
  ]);
  const inSet = new Set(inFavs.favoriteIds || []);
  $('favPickList').innerHTML = fs.map(f =>
    '<label class="fav-pick-item">' +
    '<input type="checkbox" name="favpick" value="' + f.id + '"' + (inSet.has(f.id) || f.id === selectId ? ' checked' : '') + '>' +
    '<span>' + escapeHtml(f.name) + '</span>' +
    '</label>').join('') || '<div style="color:var(--text-2);font-size:13px">还没有收藏夹，输入名称按回车新建</div>';
}

async function openFavPick() {
  const qid = favBatchIds ? 0 : (favPickQid || (detailState.q ? detailState.q.id : 0));
  if (!qid && !favBatchIds) { toast('没有可收藏的题目', true); return; }
  $('favPickNew').value = '';
  if (favBatchIds) {
    $('favPickTitle').textContent = '批量收藏';
    $('favPickHint').style.display = '';
    $('favPickHint').textContent = '将收藏 ' + favBatchIds.length + ' 道题到所选夹子（只加不减）';
    $('btnFavPickGo').textContent = '收藏';
  } else {
    $('favPickTitle').textContent = '管理收藏';
    $('favPickHint').style.display = 'none';
    $('btnFavPickGo').textContent = '保存';
  }
  await refreshFavPickList(0);
  $('ovFavPick').classList.add('open');
  setTimeout(() => $('favPickNew').focus(), 50);
}

function closeFavPick() {
  $('ovFavPick').classList.remove('open');
  favBatchIds = null; // 关闭即退出批量模式
}

function bindFavPick() {
  // 输入框回车：直接创建新收藏夹并自动选中
  $('favPickNew').addEventListener('keydown', async ev => {
    if (ev.key !== 'Enter') return;
    const name = $('favPickNew').value.trim();
    if (!name) { toast('请输入收藏夹名称', true); return; }
    ev.preventDefault();
    try {
      const f = await api('/favorites', { method: 'POST', body: { name } });
      $('favPickNew').value = '';
      await refreshFavPickList(f.id);
      toast('收藏夹「' + name + '」已创建');
    } catch (e) { toast(e.message, true); }
  });
  // 「保存」按钮：保存当前勾选状态——勾选=收藏，取消勾选=移除；全部取消即从所有夹子移除
  $('btnFavPickGo').onclick = async () => {
    const selected = new Set([...document.querySelectorAll('input[name="favpick"]:checked')].map(c => Number(c.value)));
    const name = $('favPickNew').value.trim();
    if (name) {
      try {
        const f = await api('/favorites', { method: 'POST', body: { name } });
        selected.add(f.id);
      } catch (e) { toast(e.message, true); return; }
    }
    if (!selected.size) { toast('请勾选收藏夹', true); return; }
    // 批量模式：只加不减，逐题加入所选夹子
    if (favBatchIds) {
      try {
        let added = 0, exists = 0;
        for (const fid of selected) {
          for (const qid of favBatchIds) {
            const r = await api('/favorites/' + fid + '/items', { method: 'POST', body: { questionId: qid } });
            if (r.exists) exists++; else added++;
          }
        }
        const ids = favBatchIds;
        favBatchIds = null;
        closeFavPick();
        loadFavs();
        toast(added ? '已收藏 ' + added + ' 条（' + exists + ' 条已在夹中）' : '所选题目均已在收藏夹中');
      } catch (e) { toast(e.message, true); }
      return;
    }
    const qid = favPickQid || (detailState.q ? detailState.q.id : 0);
    if (!qid) { toast('没有可收藏的题目', true); return; }
    try {
      const fv = await api('/questions/' + qid + '/favs');
      const current = new Set(fv.favoriteIds || []);
      let added = 0, removed = 0;
      for (const fid of selected) {
        if (!current.has(fid)) {
          await api('/favorites/' + fid + '/items', { method: 'POST', body: { questionId: qid } });
          added++;
        }
      }
      for (const fid of current) {
        if (!selected.has(fid)) {
          await api('/favorites/' + fid + '/items/' + qid, { method: 'DELETE' });
          removed++;
        }
      }
      closeFavPick();
      loadFavs();
      if (detailState.q) { const f2 = await api('/questions/' + qid + '/favs'); detailState.favIds = f2.favoriteIds || []; updateFavBtn(); }
      const parts = [];
      if (added) parts.push('新增 ' + added + ' 个');
      if (removed) parts.push('移除 ' + removed + ' 个');
      toast(parts.length ? '已保存：' + parts.join('、') : '未变化');
    } catch (e) { toast(e.message, true); }
  };
  // 点击遮罩：只关闭，不再触发收藏
  $('ovFavPick').addEventListener('click', ev => {
    if (ev.target === $('ovFavPick')) closeFavPick();
  });
}

// 通用输入弹窗（prompt 替代）；第二个参数为预填值
function modalPrompt(msg, def) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    ov.innerHTML = '<div class="modal sm"><div class="modal-body" style="font-size:14px">' + escapeHtml(msg) +
      '<input type="text" id="mpInput" value="' + escapeHtml(def || '') + '" style="width:100%;margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;outline:none">' +
      '</div><div class="modal-foot"><button class="btn" data-r="0">取消</button><button class="btn primary" data-r="1">确定</button></div></div>';
    const close = v => { document.body.removeChild(ov); resolve(v); };
    ov.onclick = e => { if (e.target === ov) close(''); };
    ov.querySelector('[data-r="0"]').onclick = () => close('');
    ov.querySelector('[data-r="1"]').onclick = () => close(ov.querySelector('#mpInput').value.trim());
    document.body.appendChild(ov);
    setTimeout(() => ov.querySelector('#mpInput').focus(), 50);
  });
}

/* ================= 标签管理 ================= */
const tagState = { subject: '数学', grade: '初中', tags: [] };

async function loadTags() {
  try {
    const r = await api('/tags/manage?subject=' + encodeURIComponent(tagState.subject) + '&grade=' + encodeURIComponent(tagState.grade));
    tagState.tags = r.tags || [];
    renderTags();
  } catch (e) { toast(e.message, true); }
}

function renderTags() {
  const box = $('tgList');
  $('tgInfo').textContent = '共 ' + tagState.tags.length + ' 个标签，' + tagState.tags.reduce((s, t) => s + t.count, 0) + ' 个标签位';
  box.innerHTML = tagState.tags.map(t =>
    '<div class="tag-card">' +
    '<span class="tag-name">' + escapeHtml(t.name) + '</span>' +
    '<span class="tag-count">' + t.count + ' 道题</span>' +
    '<div style="flex:1"></div>' +
    '<button class="btn small" data-act="rename" data-name="' + escapeHtml(t.name) + '">改名</button>' +
    '<button class="btn small" data-act="merge" data-name="' + escapeHtml(t.name) + '">合并到…</button>' +
    '</div>').join('') || '<div class="q-empty"><div class="big">🏷️</div><div>这个科目+年级下还没有标签</div></div>';
  box.querySelectorAll('[data-act="rename"]').forEach(b => { b.onclick = () => renameTag(b.dataset.name); });
  box.querySelectorAll('[data-act="merge"]').forEach(b => { b.onclick = () => mergeTag(b.dataset.name); });
}

async function renameTag(name) {
  const newName = await modalPrompt('把「' + name + '」改名为：');
  if (!newName || newName === name) return;
  try {
    const r = await api('/tags/replace', { method: 'POST', body: { subject: tagState.subject, grade: tagState.grade, from: name, to: newName } });
    toast('已改名，影响 ' + r.affected + ' 道题');
    loadTags();
    loadMeta();
  } catch (e) { toast(e.message, true); }
}

async function mergeTag(name) {
  const others = tagState.tags.filter(t => t.name !== name);
  const target = await pickTagDialog(name, others);
  if (!target) return;
  try {
    const r = await api('/tags/replace', { method: 'POST', body: { subject: tagState.subject, grade: tagState.grade, from: name, to: target } });
    toast('已合并到「' + target + '」，影响 ' + r.affected + ' 道题');
    loadTags();
    loadMeta();
  } catch (e) { toast(e.message, true); }
}

// 合并目标选择弹窗
function pickTagDialog(from, others) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    const opts = others.map(t =>
      '<label class="fav-pick-item"><input type="radio" name="tgmerge" value="' + escapeHtml(t.name) + '">' +
      '<span>' + escapeHtml(t.name) + '（' + t.count + ' 道题）</span></label>').join('');
    ov.innerHTML = '<div class="modal sm"><div class="modal-head"><span>把「' + escapeHtml(from) + '」合并到</span>' +
      '<button class="x" data-c="1">✕</button></div>' +
      '<div class="modal-body">' + (opts || '<div style="color:var(--text-2);font-size:13px">没有可合并的目标标签</div>') + '</div>' +
      '<div class="modal-foot"><button class="btn" data-c="1">取消</button>' +
      '<button class="btn primary" data-ok="1">合并</button></div></div>';
    const close = v => { document.body.removeChild(ov); resolve(v); };
    ov.onclick = e => { if (e.target === ov) close(''); };
    ov.querySelectorAll('[data-c="1"]').forEach(b => b.onclick = () => close(''));
    ov.querySelector('[data-ok="1"]').onclick = () => {
      const sel = ov.querySelector('input[name="tgmerge"]:checked');
      close(sel ? sel.value : '');
    };
    document.body.appendChild(ov);
  });
}

function bindTags() {
  $('tgSubject').onchange = () => { tagState.subject = $('tgSubject').value; loadTags(); };
  $('tgGrade').onchange = () => { tagState.grade = $('tgGrade').value; loadTags(); };
  $('tgRefresh').onclick = loadTags;
}

/* ================= 启动 ================= */
function init() {
  bindFilter();
  bindEditor();
  bindPaper();
  bindPick();
  bindExport();
  bindIO();
  bindAddToPaper();
  bindDetail();
  bindFavs();
  bindFavPick();
  bindTags();
  loadMeta();
  loadQuestions();
  renderPaper();
  loadFavs();
  loadTags();
}
init();
