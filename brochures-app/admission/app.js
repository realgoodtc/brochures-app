/*!
 * 升學簡章查詢(新前台)
 * 讀取發布系統產生的 manifest.json 與各管道 JSON(格式見 src/core/publish.js),以「學校」為單位呈現。
 * 掛載點:<div id="admission-brochures-app" data-base="資料夾網址/"></div>
 */
(function () {
  'use strict';

  var root = document.getElementById('admission-brochures-app');
  if (!root || root.getAttribute('data-tb-ready')) return;
  root.setAttribute('data-tb-ready', '1');

  var DATA_BASE = (root.getAttribute('data-base') || '').replace(/\/?$/, '/');
  var CONSULT_URL = root.getAttribute('data-consult') || 'https://surl.tkb.com.tw/2HRvU2';
  var SCHOOLS_PER_PAGE = 10;
  var ROWS_COLLAPSED = 8;
  var FAV_KEY = 'tb_favorites';
  var CACHE_KEY = 'tb_cache_v1';

  var CHANNELS = []; // 由 manifest 決定
  var SCHOOL_TYPES = ['國立', '私立', '大學', '科大'];
  var REGIONS = ['北區', '桃竹苗', '中彰投雲', '嘉南', '高屏', '花東', '外島'];
  var GRADES = ['二年級', '三年級', '四年級'];
  var IDENTITIES = ['一般生', '其他身分'];
  var GROUP_DEFS = {
    channel: { label: '招生管道', options: CHANNELS },
    schoolType: { label: '學校類型', options: SCHOOL_TYPES },
    region: { label: '地區', options: REGIONS },
    grade: { label: '年級', options: GRADES },
    identity: { label: '身分', options: IDENTITIES }
  };

  // ---------- 狀態 ----------
  var state = {
    rows: [], groups: [], manifest: null,
    q: '', date: 'all', dateStart: '', dateEnd: '', favOnly: false, sort: 'default', page: 1,
    sel: {}, expanded: {}, showAll: {}
  };
  Object.keys(GROUP_DEFS).forEach(function (k) { state.sel[k] = []; }); // 空陣列 = 全部
  var favorites = loadFavorites();
  var filtered = [];

  // ---------- 工具 ----------
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/臺/g, '台').replace(/\s+/g, ''); }
  function toDate(s) {
    s = String(s || '');
    if (s.length !== 8) return null;
    return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  }
  function fmt(s) { s = String(s || ''); return s.length === 8 ? s.slice(0, 4) + '/' + s.slice(4, 6) + '/' + s.slice(6) : '未定'; }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function dayDiff(a, b) { return Math.round((a - b) / 86400000); }

  /** 報名狀態:open 報名中、soon 尚未開始、closed 已截止、unknown 未定。 */
  function status(start, end) {
    var s = toDate(start), e = toDate(end), t = today();
    if (!e) return { key: 'unknown', text: '日期未定', left: null };
    var left = dayDiff(e, t);
    if (left < 0) return { key: 'closed', text: '已截止', left: left };
    if (s && t < s) return { key: 'soon', text: dayDiff(s, t) + ' 天後開始', left: left };
    if (left <= 3) return { key: 'urgent', text: left === 0 ? '今天截止' : '剩 ' + left + ' 天', left: left };
    return { key: 'open', text: '報名中', left: left };
  }
  var STATUS_ORDER = { urgent: 0, open: 1, soon: 2, unknown: 3, closed: 4 };

  function isSpecialIdentity(id) { return id !== '一般生'; }

  function loadFavorites() {
    try { var v = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveFavorites() { try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch (e) { /* 無痕模式 */ } }

  // ---------- 資料 ----------
  function expandFile(file) {
    var sf = file.school_fields, rf = file.row_fields;
    var schools = file.schools.map(function (arr) { var s = {}; sf.forEach(function (k, i) { s[k] = arr[i]; }); return s; });
    return file.rows.map(function (arr) {
      var r = {};
      rf.forEach(function (k, i) { r[k] = arr[i]; });
      var s = schools[r.s];
      r.school = s.name; r.type = s.type; r.kind = s.kind; r.region = s.region; r.url = s.url;
      r.start = r.start || s.start; r.end = r.end || s.end;
      r.channel = file.channel; r.year = file.academic_year;
      r.search = norm(r.school + ' ' + r.department);
      return r;
    });
  }

  function buildGroups(rows) {
    var map = {}, list = [];
    rows.forEach(function (r) {
      var k = r.channel + '|' + r.school;
      if (!map[k]) { map[k] = { key: k, channel: r.channel, school: r.school, type: r.type, kind: r.kind, region: r.region, url: r.url, year: r.year, rows: [] }; list.push(map[k]); }
      map[k].rows.push(r);
    });
    list.forEach(function (g) {
      // 學校的報名期間取最多系組使用的那一組
      var cnt = {}, best = null;
      g.rows.forEach(function (r) { var k = r.start + '-' + r.end; cnt[k] = (cnt[k] || 0) + 1; if (!best || cnt[k] > cnt[best]) best = k; });
      g.start = best.split('-')[0]; g.end = best.split('-')[1];
      g.status = status(g.start, g.end);
      g.search = norm(g.school);
    });
    return list;
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
      return res.json();
    });
  }

  function load() {
    fetchJson(DATA_BASE + 'manifest.json?t=' + Date.now()).then(function (manifest) {
      var cached = null;
      try { cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { cached = null; }
      if (cached && cached.version === manifest.data_version) return { manifest: manifest, files: cached.files };
      return Promise.all(manifest.channels.map(function (c) {
        return fetchJson(DATA_BASE + c.file + '?v=' + encodeURIComponent(manifest.data_version));
      })).then(function (files) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ version: manifest.data_version, files: files })); } catch (e) { /* 超過容量就不快取 */ }
        return { manifest: manifest, files: files };
      });
    }).then(function (d) {
      state.manifest = d.manifest;
      state.rows = [];
      d.files.forEach(function (f) { state.rows = state.rows.concat(expandFile(f)); });
      state.groups = buildGroups(state.rows);
      readUrlFavorites();
      updateFavUI();
      renderFilterOptions();
      apply();
    }).catch(function (err) {
      if (window.console) console.error('[升學簡章] 資料載入失敗', err);
      el('tbList').innerHTML = '<div class="tb-error" role="alert">⚠ 簡章資料載入失敗,請確認網路連線後重新整理頁面。</div>';
    });
  }

  // ---------- 骨架 ----------
  function el(id) { return document.getElementById(id); }

  root.innerHTML =
    '<div class="tb">' +
      '<section class="tb-panel" aria-label="搜尋與篩選">' +
        '<div class="tb-searchbar">' +
          '<label class="tb-sr" for="tbSearch">搜尋校名或系名</label>' +
          '<input type="search" id="tbSearch" placeholder="🔍 輸入校名或系名,例如:清大 資工" autocomplete="off">' +
          '<a class="tb-btn-consult" href="' + esc(CONSULT_URL) + '" target="_blank" rel="noopener noreferrer">📝 立即洽詢書審口試</a>' +
        '</div>' +
        '<div class="tb-filters" id="tbFilters"></div>' +
        '<button type="button" class="tb-more" id="tbMore" aria-expanded="false" aria-controls="tbFiltersMore">更多篩選條件 ▾</button>' +
        '<div class="tb-filters tb-filters-more" id="tbFiltersMore"></div>' +
        '<div class="tb-chips" id="tbChips" hidden></div>' +
      '</section>' +
      '<div class="tb-summary" id="tbSummary" role="status" aria-live="polite"></div>' +
      '<div id="tbList" class="tb-list">' +
        '<div class="tb-skeleton"></div><div class="tb-skeleton"></div><div class="tb-skeleton"></div>' +
      '</div>' +
      '<nav class="tb-pager" id="tbPager" aria-label="分頁"></nav>' +
      '<p class="tb-note">💡 <strong>提醒:</strong>本站資料由簡章整理而成,尚未收錄所有學校,實際招生資訊請以各校最新公告之官方簡章為準。如發現資料有誤或遺漏,歡迎與我們聯繫反映。</p>' +
      '<button type="button" class="tb-fab" id="tbFab" hidden aria-label="查看我的收藏">⭐ <span id="tbFabCount">0</span></button>' +
    '</div>';

  function groupButtons(key) {
    var def = GROUP_DEFS[key];
    var sel = state.sel[key];
    var html = '<button type="button" class="tb-opt' + (sel.length ? '' : ' is-on') + '" data-group="' + key + '" data-val="" aria-pressed="' + !sel.length + '">全部</button>';
    def.options.forEach(function (o) {
      var on = sel.indexOf(o) >= 0;
      html += '<button type="button" class="tb-opt" data-group="' + key + '" data-val="' + esc(o) + '" aria-pressed="' + on + '"' + (on ? ' data-on' : '') + '>' + esc(o) + '</button>';
    });
    return '<div class="tb-row"><span class="tb-label">' + def.label + '</span><div class="tb-opts" data-key="' + key + '">' + html + '</div></div>';
  }

  function renderFilterOptions() {
    // 管道按鈕依 manifest 產生:發布系統新增管道時,前台不用改程式
    GROUP_DEFS.channel.options = CHANNELS = state.manifest.channels.map(function (c) { return c.channel; });

    var main = '';
    if (GROUP_DEFS.channel.options.length > 1) main += groupButtons('channel');
    main += groupButtons('schoolType') + groupButtons('grade') +
      '<div class="tb-row"><span class="tb-label">報名日期</span><div class="tb-opts">' +
        dateBtn('all', '全部') + dateBtn('open', '正在報名') + dateBtn('urgent', '3 天內截止') + dateBtn('soon', '尚未開始') +
      '</div></div>';
    var more = groupButtons('region') + groupButtons('identity') +
      '<div class="tb-row"><span class="tb-label">自訂日期</span><div class="tb-opts">' +
        '<span class="tb-daterange' + (state.date === 'custom' ? ' is-on' : '') + '">' +
          '<input type="date" id="tbDateStart" aria-label="報名期間起" value="' + esc(state.dateStart) + '"><span>至</span>' +
          '<input type="date" id="tbDateEnd" aria-label="報名期間迄" value="' + esc(state.dateEnd) + '">' +
        '</span>' +
      '</div></div>' +
      '<div class="tb-row"><span class="tb-label">收藏</span><div class="tb-opts">' +
        '<button type="button" class="tb-opt tb-opt-fav" id="tbFavBtn" aria-pressed="' + state.favOnly + '"' + (state.favOnly ? ' data-on' : '') + '>⭐ 只看我的收藏(<span id="tbFavCount">' + favCount() + '</span>)</button>' +
        '<span class="tb-share"><span class="tb-share-label">分享收藏</span>' +
          '<button type="button" class="tb-icon tb-line" data-share="line" aria-label="用 LINE 分享收藏"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.448 24 10.304z"/></svg></button>' +
          '<button type="button" class="tb-icon tb-fb" data-share="fb" aria-label="用 Facebook 分享收藏"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></button>' +
          '<button type="button" class="tb-icon" data-share="copy" aria-label="複製收藏連結">🔗</button>' +
        '</span>' +
      '</div></div>' +
      '<div class="tb-row"><span class="tb-label">排序</span><div class="tb-opts">' +
        '<select id="tbSort" class="tb-select" aria-label="排序方式">' +
          opt('default', '預設(報名中優先)') + opt('deadline', '📅 截止日由近到遠') + opt('quota', '👥 名額由多到少') + opt('name', '🏫 學校名稱') +
        '</select>' +
      '</div></div>';
    el('tbFilters').innerHTML = main;
    el('tbFiltersMore').innerHTML = more;
    function dateBtn(v, t) { var on = state.date === v; return '<button type="button" class="tb-opt" data-date="' + v + '" aria-pressed="' + on + '"' + (on ? ' data-on' : '') + '>' + t + '</button>'; }
    function opt(v, t) { return '<option value="' + v + '"' + (state.sort === v ? ' selected' : '') + '>' + t + '</option>'; }
  }

  // ---------- 篩選 ----------
  function terms() { return state.q.trim().toLowerCase().replace(/臺/g, '台').split(/\s+/).filter(Boolean); }

  function fuzzy(term) {
    var safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(safe.split('').join('.*'));
  }

  function rowMatches(r, ts, res, dateRange) {
    var s = state.sel;
    if (s.channel.length && s.channel.indexOf(r.channel) < 0) return false;
    if (s.schoolType.length) {
      var okType = s.schoolType.some(function (t) {
        if (t === '國立' || t === '私立') return r.type === t;
        return r.kind === t;
      });
      if (!okType) return false;
    }
    if (s.region.length && s.region.indexOf(r.region) < 0) return false;
    if (s.grade.length && s.grade.indexOf(r.grade) < 0) return false;
    if (s.identity.length) {
      var cat = isSpecialIdentity(r.identity) ? '其他身分' : '一般生';
      if (s.identity.indexOf(cat) < 0) return false;
    }
    if (state.favOnly && favorites.indexOf(r.id) < 0) return false;
    if (state.date !== 'all') {
      var st = status(r.start, r.end);
      if (state.date === 'open' && st.key !== 'open' && st.key !== 'urgent') return false;
      if (state.date === 'urgent' && st.key !== 'urgent') return false;
      if (state.date === 'soon' && st.key !== 'soon') return false;
      if (state.date === 'custom') {
        var a = dateRange[0], b = dateRange[1], rs = +r.start || 0, re = +r.end || 0;
        if (!rs || !re) return false;
        if (a && re < a) return false;
        if (b && rs > b) return false;
      }
    }
    for (var i = 0; i < ts.length; i++) {
      if (r.search.indexOf(ts[i]) < 0 && !res[i].test(r.search)) return false;
    }
    return true;
  }

  function apply(keepPage) {
    var ts = terms();
    var res = ts.map(fuzzy);
    var range = [state.dateStart ? +state.dateStart.replace(/-/g, '') : 0, state.dateEnd ? +state.dateEnd.replace(/-/g, '') : 0];
    filtered = [];
    state.groups.forEach(function (g) {
      var m = g.rows.filter(function (r) { return rowMatches(r, ts, res, range); });
      if (m.length) filtered.push({ g: g, rows: m, quota: m.reduce(function (n, r) { return n + (+r.quota || 0); }, 0) });
    });
    var sorters = {
      'default': function (a, b) { return (STATUS_ORDER[a.g.status.key] - STATUS_ORDER[b.g.status.key]) || ((+a.g.end || 99999999) - (+b.g.end || 99999999)) || a.g.school.localeCompare(b.g.school, 'zh-Hant'); },
      deadline: function (a, b) { return ((a.g.status.key === 'closed') - (b.g.status.key === 'closed')) || ((+a.g.end || 99999999) - (+b.g.end || 99999999)); },
      quota: function (a, b) { return b.quota - a.quota; },
      name: function (a, b) { return a.g.school.localeCompare(b.g.school, 'zh-Hant') || CHANNELS.indexOf(a.g.channel) - CHANNELS.indexOf(b.g.channel); }
    };
    filtered.sort(sorters[state.sort] || sorters['default']);
    if (!keepPage) state.page = 1;
    renderSummary();
    renderChips();
    renderList();
    renderPager();
  }

  function hasFilter() {
    return !!state.q.trim() || state.date !== 'all' || state.favOnly || Object.keys(state.sel).some(function (k) { return state.sel[k].length; });
  }

  // ---------- 畫面 ----------
  function renderSummary() {
    var m = state.manifest;
    var rows = filtered.reduce(function (n, f) { return n + deptGroups(f.rows).length; }, 0);
    var years = {};
    (m ? m.channels : []).forEach(function (c) { years[c.academic_year] = true; });
    var updated = m && m.generated_at ? new Date(m.generated_at) : null;
    var upd = updated && !isNaN(updated) ? updated.getFullYear() + '/' + (updated.getMonth() + 1) + '/' + updated.getDate() : '';
    el('tbSummary').innerHTML =
      '<span class="tb-summary-main">' + (hasFilter() ? '🔍 符合條件:' : '📌 ' + Object.keys(years).join('、') + ' 學年度,收錄 ') +
        '<strong>' + filtered.length + '</strong> 校、<strong>' + rows + '</strong> 個系組</span>' +
      (upd ? '<span class="tb-summary-sub">資料更新 ' + upd + '</span>' : '');
  }

  function renderChips() {
    var box = el('tbChips');
    var chips = [];
    if (state.q.trim()) chips.push({ t: '關鍵字:' + state.q.trim(), k: 'q' });
    Object.keys(state.sel).forEach(function (k) {
      state.sel[k].forEach(function (v) { chips.push({ t: v, k: 'sel', g: k, v: v }); });
    });
    var dateText = { open: '正在報名', urgent: '3 天內截止', soon: '尚未開始', custom: '日期:' + (state.dateStart || '不限') + ' ~ ' + (state.dateEnd || '不限') }[state.date];
    if (dateText) chips.push({ t: dateText, k: 'date' });
    if (state.favOnly) chips.push({ t: '只看收藏', k: 'fav' });
    if (!chips.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<span class="tb-chips-label">已套用:</span>' + chips.map(function (c, i) {
      return '<span class="tb-chip">' + esc(c.t) + '<button type="button" data-chip="' + i + '" aria-label="移除條件 ' + esc(c.t) + '">✕</button></span>';
    }).join('') + '<button type="button" class="tb-clear" data-clear>全部清除</button>';
    box._chips = chips;
  }

  function highlight(text, ts) {
    var s = esc(text);
    if (!ts.length) return s;
    var pat = ts.map(function (t) { return esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/台/g, '[台臺]'); }).join('|');
    return s.replace(new RegExp('(' + pat + ')', 'gi'), '<mark>$1</mark>');
  }

  /** 今年的日期省略年份:10/07;其他年份 2025/12/12。 */
  function fmtShort(s) {
    s = String(s || '');
    if (s.length !== 8) return '未定';
    return (+s.slice(0, 4) === new Date().getFullYear() ? '' : s.slice(0, 4) + '/') + s.slice(4, 6) + '/' + s.slice(6);
  }

  /** 同一學校的列依「系組 + 年級」合併:一般生與外加身分(退伍軍人等)放在同一列。 */
  function deptGroups(rows) {
    var map = {}, list = [];
    rows.forEach(function (r) {
      var k = r.department + '|' + r.grade;
      if (!map[k]) { map[k] = { key: r.id, dept: r.department, grade: r.grade, rows: [] }; list.push(map[k]); }
      map[k].rows.push(r);
    });
    list.forEach(function (d) {
      d.rows.sort(function (a, b) { return (a.identity !== '一般生') - (b.identity !== '一般生'); });
      d.ids = d.rows.map(function (r) { return r.id; });
      d.remarks = [];
      d.rows.forEach(function (r) {
        String(r.remarks || '').split('\n').forEach(function (l) { l = l.trim(); if (l && d.remarks.indexOf(l) < 0) d.remarks.push(l); });
      });
    });
    return list;
  }

  function quotaHtml(d) {
    return d.rows.map(function (r) {
      return r.identity === '一般生'
        ? '<span class="tb-q"><span class="tb-num">' + esc(r.quota) + '</span><span class="tb-unit">名</span></span>'
        : '<span class="tb-q tb-q-extra">' + esc(r.identity) + ' ' + esc(r.quota) + '</span>';
    }).join('');
  }

  /** 考試項目:各身分相同時只列一次,不同時標出身分。 */
  function examHtml(d, field) {
    var vals = d.rows.map(function (r) { return r[field] || ''; });
    var same = vals.every(function (v) { return v === vals[0]; });
    if (same) return esc(vals[0] || '無');
    return d.rows.map(function (r) { return '<span class="tb-id-label">' + esc(r.identity) + '</span>' + esc(r[field] || '無'); }).join('<br>');
  }

  /**
   * 結構化配分(發布檔的 exams 欄:[階段, 名稱, 配分, 單位, 日期, 任選組])→「書審 40%、面試 60%(1/26)」;
   * 兩個階段時加「初試:」「複試:」。舊資料沒有 exams 時回傳空字串,改顯示簡章原文。
   */
  function examsText(exams) {
    if (!exams || !exams.length) return '';
    var w = function (x) { return x[2] === null || x[2] === undefined ? '' : (x[3] === '%' ? ' ' + x[2] + '%' : (x[3] === '倍' ? ' ×' + x[2] : ' ' + x[2])); };
    var dt = function (x) { return x[4] && String(x[4]).length === 8 ? '(' + Number(String(x[4]).slice(4, 6)) + '/' + Number(String(x[4]).slice(6)) + ')' : ''; };
    var stages = [1, 2].map(function (s) { return exams.filter(function (x) { return x[0] === s; }); }).filter(function (a) { return a.length; });
    // x[6]:所屬整組項目(例如國文、英文屬於「筆試 60%」),顯示成「筆試 60%(國文、英文)」
    var partsText = function (list, all) {
      var parts = [], groups = {};
      list.forEach(function (x) {
        if (x[5]) { if (!groups[x[5]]) { groups[x[5]] = []; parts.push(groups[x[5]]); } groups[x[5]].push(x); } else parts.push(x);
      });
      return parts.map(function (p) {
        if (Array.isArray(p[0])) return p.map(function (x) { return x[1]; }).join('或') + '(任選一)' + w(p[0]) + dt(p[0]);
        var kids = all ? all.filter(function (k) { return k[6] && k[6] === p[1]; }) : [];
        return p[1] + w(p) + dt(p) + (kids.length ? '(' + partsText(kids) + ')' : '');
      }).join('、');
    };
    return stages.map(function (list) {
      var text = partsText(list.filter(function (x) { return !x[6]; }), list);
      return stages.length > 1 ? (list[0][0] === 1 ? '初試:' : '複試:') + text : text;
    }).join('|');
  }

  function stageText(r) {
    return [r.stage1, r.stage2 ? (/^複試/.test(r.stage2) ? '' : '複試:') + r.stage2 : ''].filter(Boolean).join(' / ');
  }

  function deptHtml(d, ts, g) {
    var fav = d.ids.some(function (id) { return favorites.indexOf(id) >= 0; });
    var open = !!state.expanded[d.key];
    var r0 = d.rows[0];
    var ownDate = r0.start !== g.start || r0.end !== g.end;
    var detailId = 'tbd-' + d.key;
    var exams = examsText(r0.exams);
    var summary = exams || stageText(r0);
    var keyDates = (r0.dates || []).filter(function (x) { return x[0] && String(x[1]).length === 8; });
    return '<li class="tb-dept' + (open ? ' is-open' : '') + '">' +
      '<div class="tb-dept-main">' +
        '<button type="button" class="tb-star' + (fav ? ' is-on' : '') + '" data-fav="' + esc(d.ids.join(',')) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? '取消收藏 ' : '收藏 ') + esc(g.school + ' ' + d.dept + ' ' + d.grade) + '">' + (fav ? '★' : '☆') + '</button>' +
        '<button type="button" class="tb-dept-btn" data-expand="' + esc(d.key) + '" aria-expanded="' + open + '" aria-controls="' + detailId + '">' +
          '<span class="tb-dept-name">' + highlight(d.dept, ts) +
            (d.remarks.length ? '<span class="tb-remark-flag">備註</span>' : '') +
            (ownDate ? '<span class="tb-dept-date">報名 ' + fmtShort(r0.start) + '–' + fmtShort(r0.end) + '</span>' : '') +
            (summary ? '<span class="tb-dept-exam">' + esc(summary) + '</span>' : '') +
          '</span>' +
          '<span class="tb-dept-grade">' + esc(d.grade) + '</span>' +
          '<span class="tb-dept-quota">' + quotaHtml(d) + '</span>' +
          '<span class="tb-chev" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>' +
      '<div class="tb-dept-detail" id="' + detailId + '"' + (open ? '' : ' hidden') + '>' +
        '<dl>' +
          (d.rows.length > 1 ? '<dt>名額</dt><dd>' + d.rows.map(function (r) { return esc(r.identity) + ' ' + esc(r.quota) + ' 名'; }).join('、') + '</dd>' : '') +
          (exams ? '<dt>配分</dt><dd>' + esc(exams).replace(/\|/g, '<br>') + '</dd>' : '') +
          '<dt>' + (exams ? '初試說明' : '初試') + '</dt><dd>' + examHtml(d, 'stage1') + '</dd>' +
          '<dt>' + (exams ? '複試說明' : '複試') + '</dt><dd>' + examHtml(d, 'stage2') + '</dd>' +
          (keyDates.length ? '<dt>重要日期</dt><dd>' + keyDates.map(function (x) { return esc(x[0]) + ' ' + fmt(String(x[1])); }).join('<br>') + '</dd>' : '') +
          (d.remarks.length ? '<dt>備註</dt><dd class="tb-pre">' + esc(d.remarks.join('\n')) + '</dd>' : '') +
          (ownDate ? '<dt>報名期間</dt><dd>' + fmt(r0.start) + ' – ' + fmt(r0.end) + '</dd>' : '') +
        '</dl>' +
      '</div>' +
    '</li>';
  }

  function cardHtml(f, ts, index) {
    var g = f.g;
    var st = g.status;
    var url = String(g.url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    var groups = deptGroups(f.rows);
    var showAll = !!state.showAll[g.key];
    var shown = showAll ? groups : groups.slice(0, ROWS_COLLAPSED);
    var hiddenInSchool = deptGroups(g.rows).length - groups.length;
    var sub = [g.region, groups.length + ' 個系組', '名額 ' + f.quota].filter(Boolean);
    return '<article class="tb-card tb-st-' + st.key + '" style="animation-delay:' + Math.min(index * 40, 400) + 'ms">' +
      '<header class="tb-card-head">' +
        '<div class="tb-card-title">' +
          '<h3 class="tb-school">' + (CHANNELS.length > 1 ? '<span class="tb-badge tb-b-channel">' + esc(g.channel) + '</span>' : '') + highlight(g.school, ts) + '</h3>' +
          '<div class="tb-card-sub">' + sub.map(esc).join('<span class="tb-dot">·</span>') + '</div>' +
        '</div>' +
        '<div class="tb-card-side">' +
          '<div class="tb-status tb-status-' + st.key + '">' +
            '<span class="tb-status-text">' + esc(st.text) + '</span>' +
            '<span class="tb-status-date">' + fmtShort(g.start) + ' – ' + fmtShort(g.end) + '</span>' +
          '</div>' +
          (url ? '<a class="tb-btn-pdf" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="查看 ' + esc(g.school) + ' 簡章(另開新視窗)">簡章</a>' : '') +
        '</div>' +
      '</header>' +
      '<ul class="tb-depts">' + shown.map(function (d) { return deptHtml(d, ts, g); }).join('') + '</ul>' +
      (groups.length > ROWS_COLLAPSED ? '<button type="button" class="tb-showall" data-showall="' + esc(g.key) + '">' + (showAll ? '收合 ▴' : '展開其餘 ' + (groups.length - ROWS_COLLAPSED) + ' 個系組 ▾') + '</button>' : '') +
      (hiddenInSchool > 0 ? '<p class="tb-hidden-note">此校另有 ' + hiddenInSchool + ' 個系組不符合目前的篩選條件</p>' : '') +
    '</article>';
  }

  function renderList() {
    var list = el('tbList');
    if (!filtered.length) {
      list.innerHTML = '<div class="tb-empty">' +
        '<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>' +
        '<div class="tb-empty-title">找不到符合條件的校系</div>' +
        '<div class="tb-empty-desc">試試精簡關鍵字,或清除部分篩選條件。</div>' +
        '<a class="tb-btn-consult" href="' + esc(CONSULT_URL) + '" target="_blank" rel="noopener noreferrer">📝 找不到想報考的校系?由顧問為您查詢</a>' +
        '<button type="button" class="tb-btn-reset" data-clear>🔄 重設所有條件</button>' +
      '</div>';
      return;
    }
    var ts = terms();
    var from = (state.page - 1) * SCHOOLS_PER_PAGE;
    list.innerHTML = filtered.slice(from, from + SCHOOLS_PER_PAGE).map(function (f, i) { return cardHtml(f, ts, i); }).join('');
  }

  function renderPager() {
    var pager = el('tbPager');
    var total = Math.ceil(filtered.length / SCHOOLS_PER_PAGE);
    if (total <= 1) { pager.innerHTML = ''; return; }
    var p = state.page;
    var start = Math.max(1, Math.min(p - 2, total - 4)), end = Math.min(total, start + 4);
    var html = '<button type="button" class="tb-page" data-page="' + (p - 1) + '"' + (p === 1 ? ' disabled' : '') + '>上一頁</button>';
    if (start > 1) html += pageBtn(1) + (start > 2 ? '<span class="tb-ellipsis">…</span>' : '');
    for (var i = start; i <= end; i++) html += pageBtn(i);
    if (end < total) html += (end < total - 1 ? '<span class="tb-ellipsis">…</span>' : '') + pageBtn(total);
    html += '<button type="button" class="tb-page" data-page="' + (p + 1) + '"' + (p === total ? ' disabled' : '') + '>下一頁</button>';
    pager.innerHTML = '<div class="tb-pages">' + html + '</div><div class="tb-page-info">第 ' + p + ' / ' + total + ' 頁(共 ' + filtered.length + ' 校)</div>';
    function pageBtn(n) { return '<button type="button" class="tb-page' + (n === p ? ' is-on' : '') + '" data-page="' + n + '"' + (n === p ? ' aria-current="page"' : '') + '>' + n + '</button>'; }
  }

  /** 收藏數以「學校 + 系組 + 年級」計算(同一列的一般生與外加身分算一個)。 */
  function favCount() {
    if (!state.rows.length) return favorites.length;
    var keys = {};
    state.rows.forEach(function (r) { if (favorites.indexOf(r.id) >= 0) keys[r.channel + r.school + r.department + r.grade] = true; });
    return Object.keys(keys).length;
  }

  function updateFavUI() {
    var n = favCount();
    var c = el('tbFavCount'); if (c) c.textContent = n;
    el('tbFabCount').textContent = n;
    el('tbFab').hidden = !n;
  }

  // ---------- 收藏分享 ----------
  function shareUrl() {
    if (!favorites.length) { alert('目前沒有收藏的校系可以分享。'); return null; }
    var list = favorites.slice(0, 30);
    if (favorites.length > 30) alert('分享連結最多包含 30 筆,已取前 30 筆。');
    var u = new URL(window.location.href);
    u.searchParams.set('fav', list.join(','));
    u.hash = '';
    return u.toString();
  }

  function share(kind) {
    var url = shareUrl();
    if (!url) return;
    if (kind === 'line') window.open('https://line.me/R/msg/text/?' + encodeURIComponent('我的升學目標清單:\n' + url), '_blank', 'noopener,noreferrer');
    else if (kind === 'fb') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer,width=600,height=500');
    else if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { alert('已複製收藏連結!'); }, function () { prompt('請複製以下網址:', url); });
    else prompt('請複製以下網址:', url);
  }

  function readUrlFavorites() {
    var p;
    try { p = new URLSearchParams(window.location.search).get('fav'); } catch (e) { return; }
    if (!p) return;
    var ids = {};
    state.rows.forEach(function (r) { ids[r.id] = true; });
    var shared = p.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return ids[s]; });
    if (!shared.length) return;
    var fresh = shared.filter(function (id) { return favorites.indexOf(id) < 0; });
    if (fresh.length && confirm('收到別人分享的 ' + shared.length + ' 個校系,要加入你的收藏嗎?')) {
      favorites = favorites.concat(fresh);
      saveFavorites();
    }
    // 分享的校系都已在收藏中,才切到「只看收藏」
    state.favOnly = shared.every(function (id) { return favorites.indexOf(id) >= 0; });
    updateFavUI();
  }

  // ---------- 事件 ----------
  function scrollTop() {
    var t = root.querySelector('.tb-summary');
    if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleGroup(key, val) {
    var sel = state.sel[key];
    if (!val) state.sel[key] = [];
    else {
      var i = sel.indexOf(val);
      if (i >= 0) sel.splice(i, 1); else sel.push(val);
      if (sel.length === GROUP_DEFS[key].options.length) state.sel[key] = [];
    }
    renderFilterOptions();
    apply();
  }

  function resetAll() {
    state.q = ''; el('tbSearch').value = '';
    Object.keys(state.sel).forEach(function (k) { state.sel[k] = []; });
    state.date = 'all'; state.dateStart = ''; state.dateEnd = ''; state.favOnly = false; state.sort = 'default';
    renderFilterOptions();
    apply();
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t || !root.contains(t)) return;
    var d = t.dataset;
    if (d.group !== undefined) return toggleGroup(d.group, d.val);
    if (d.date) {
      state.date = d.date; state.dateStart = ''; state.dateEnd = '';
      renderFilterOptions(); return apply();
    }
    if (t.id === 'tbFavBtn') { state.favOnly = !state.favOnly; renderFilterOptions(); return apply(); }
    if (t.id === 'tbFab') {
      state.favOnly = true; renderFilterOptions(); apply();
      return root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (t.id === 'tbMore') {
      var more = el('tbFiltersMore');
      var open = !more.classList.contains('is-open');
      more.classList.toggle('is-open', open);
      t.setAttribute('aria-expanded', open);
      t.textContent = open ? '收合篩選條件 ▴' : '更多篩選條件 ▾';
      return;
    }
    if (d.share) return share(d.share);
    if (d.fav) {
      // 一列可能包含多個身分(一般生 + 退伍軍人):整列一起收藏或取消
      var ids = d.fav.split(',');
      var on = !ids.some(function (id) { return favorites.indexOf(id) >= 0; });
      ids.forEach(function (id) {
        var i = favorites.indexOf(id);
        if (on && i < 0) favorites.push(id);
        if (!on && i >= 0) favorites.splice(i, 1);
      });
      saveFavorites(); updateFavUI();
      if (state.favOnly) return apply(true);
      t.classList.toggle('is-on', on);
      t.textContent = on ? '★' : '☆';
      t.setAttribute('aria-pressed', on);
      return;
    }
    if (d.expand) {
      state.expanded[d.expand] = !state.expanded[d.expand];
      var li = t.closest('.tb-dept');
      var isOpen = state.expanded[d.expand];
      li.classList.toggle('is-open', isOpen);
      li.querySelector('.tb-dept-detail').hidden = !isOpen;
      t.setAttribute('aria-expanded', isOpen);
      return;
    }
    if (d.showall) { state.showAll[d.showall] = !state.showAll[d.showall]; return renderList(); }
    if (d.page) { state.page = +d.page; renderList(); renderPager(); return scrollTop(); }
    if (d.chip !== undefined) {
      var c = el('tbChips')._chips[+d.chip];
      if (c.k === 'q') { state.q = ''; el('tbSearch').value = ''; }
      if (c.k === 'sel') { var s = state.sel[c.g]; s.splice(s.indexOf(c.v), 1); }
      if (c.k === 'date') { state.date = 'all'; state.dateStart = ''; state.dateEnd = ''; }
      if (c.k === 'fav') state.favOnly = false;
      renderFilterOptions(); return apply();
    }
    if (d.clear !== undefined) return resetAll();
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'tbSort') { state.sort = t.value; return apply(); }
    if (t.id === 'tbDateStart' || t.id === 'tbDateEnd') {
      state.dateStart = el('tbDateStart').value; state.dateEnd = el('tbDateEnd').value;
      state.date = state.dateStart || state.dateEnd ? 'custom' : 'all';
      renderFilterOptions();
      return apply();
    }
  });

  var timer;
  el('tbSearch').addEventListener('input', function (e) {
    clearTimeout(timer);
    var v = e.target.value;
    timer = setTimeout(function () { state.q = v; apply(); }, 300);
  });
  el('tbSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); state.q = e.target.value; apply(); }
  });

  updateFavUI();
  load();
})();
