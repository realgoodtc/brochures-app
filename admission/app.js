/*!
 * 升學簡章查詢(正式前台,J 版)— 由 tools/build_site_app.js 從 web/preview/compare/ 的 engine.js、j/j.js 產生,請勿直接修改。
 * 掛載點:<div id="admission-brochures-app" data-base="資料網址/" [data-consult="洽詢連結"]></div>
 * 產生時間:2026-11-21T07:31:51.325Z
 */
(function () {
  'use strict';
  var root = document.getElementById('admission-brochures-app');
  if (!root || root.getAttribute('data-tb-ready')) return;
  root.setAttribute('data-tb-ready', '1');
  root.innerHTML = '';
  window.TB_SITE_ROOT = root;
  window.TB_SITE_BASE = (root.getAttribute('data-base') || '').replace(/\/?$/, '/');

/*!
 * 前台比較頁共用引擎:讀資料、規則比對、計數、收藏、網址狀態。A、B 兩版只差畫面,篩選結果由這裡決定,才比較得起來。
 * 資料格式見 src/core/publish.js;學年度補舊年度、報名狀態、配分文字沿用 web/admission-brochures/app.js。
 */
window.TBEngine = (function () {
  'use strict';

  var FAV_KEY = 'tb_favorites';
  var SAVED_KEY = 'tb_cmp_saved';
  var FIELDS_KEY = 'tb_cmp_fields';
  var CONSULT_URL = 'https://surl.tkb.com.tw/2HRvU2';
  var NOTE = '本站資料由簡章整理而成,尚未收錄所有學校,實際招生資訊請以各校最新公告之官方簡章為準。如發現資料有誤或遺漏,歡迎與我們聯繫反映。';

  var CHANNEL_DEFS = {
    '暑轉': { slug: 'transfer', hint: '大學暑假轉學考' },
    '寒轉': { slug: 'winter', hint: '大學寒假轉學考' },
    '特殊選才': { slug: 'special', hint: '大學、科大特殊選才' },
    '研究所甄試': { slug: 'grad-review', hint: '碩士班推甄' },
    '研究所一般生': { slug: 'grad-exam', hint: '碩士班考試入學' },
    '在職專班': { slug: 'in-service', hint: '碩士在職專班', mainIdentity: '在職生' }
  };
  function channelDef(ch) { return CHANNEL_DEFS[ch] || { slug: ch, hint: '' }; }

  var REGIONS = ['北區', '桃竹苗', '中彰投雲', '嘉南', '高屏', '花東', '外島'];
  var REMARK_TAGS = [
    { re: /全英授課|全英語授課/, not: /部分課程英語授課|部分[^,,。]*英語授課/, t: '全英授課' },
    { re: /部分課程英語授課|部分[^,,。]*英語授課/, t: '部分英語授課' },
    { re: /不得轉系|不可轉系|不得申請轉系/, t: '不得轉系' },
    { re: /不得(申請)?(輔系|雙主修)|不可(輔系|雙主修)/, t: '不可雙主修/輔系' },
    { re: /相關(科系|學系|系組|系所|領域)/, t: '限相關科系' }
  ];
  // 比較資料沒有經過 Exam_Item_Map,考試項目是簡章原名,所以用關鍵字分類;正式版可改用對照後的名稱
  var ORAL = /面試|口試|口頭/;
  var PRACTICAL = /術科|演出|演奏|演唱|主修|展演|實作|刀工|繪畫|素描|創意設計|音樂性|技巧性/;
  var SUBJECT = /資料結構|資料庫|資料科學|機器學習|深度學習/;
  // 2026-11-17:拿掉「選項、選考」——「選項1」是任選組別的標題(底下才是科目),「筆試選考科目(二科選考一科)」是筆試,都不是書審
  var DOCS = /審|書面|資料|成績|自傳|讀書計畫|履歷|簡歷|作品|動機|表現|證明|證照|研究計畫|推薦|報告|學習|修業|其他|經歷|經驗|成就|資歷|年資|潛力|能力|知能|規劃|展望|特質|儀態|理由|表達|自我介紹|理解|複試|初試|初審|滿分/;
  // 名稱寫明「筆試」的一律算筆試(「筆試選考科目…」「筆試成績」)
  var WRITTEN = /筆試/;
  // 只是組別標題、本身不是考試項目的名稱(「選項1」「選考」「選項二」)
  var GROUP_LABEL = /^(選項|選考|組合|方案)\s*[\d一二三四五六七八九十]*$/;
  var CAT_ORDER = ['筆試', '書審', '面試', '術科'];
  // 舊資料(沒有類別欄)依名稱判斷:一個名稱可以同時屬於兩類;都不像就是筆試科目
  function guessCats(n) {
    var c = [];
    if (ORAL.test(n)) c.push('面試');
    if (PRACTICAL.test(n)) c.push('術科');
    if (WRITTEN.test(n)) { c.push('筆試'); if (/審/.test(n)) c.push('書審'); }
    if (!ORAL.test(n) && !PRACTICAL.test(n) && !WRITTEN.test(n) && !SUBJECT.test(n) && DOCS.test(n)) c.push('書審');
    return c.length ? c : ['筆試'];
  }

  // type:multi 複選、num 數字、text 文字、date 日期區間
  // ops 第一個是預設;multiValued = 一列可能有多個值,才有「同時符合」
  var MULTI_OPS = [['any', '是其中之一'], ['not', '不是']];
  var MULTI_ALL_OPS = [['any', '符合其中之一'], ['all', '同時符合'], ['not', '排除']];
  var FIELDS = {
    status: { label: '報名狀態', ask: '現在就要能報名嗎?', type: 'multi', ops: MULTI_OPS, group: '時間', options: ['報名中', '3 天內截止', '尚未開始', '已截止', '日期未定'], get: function (r) { return r.x.status; } },
    period: { label: '報名期間', type: 'date', ops: [['overlap', '與此期間重疊'], ['endBy', '截止日不晚於'], ['startFrom', '開始日不早於']], group: '時間' },
    ownership: { label: '公私立', type: 'multi', ops: MULTI_OPS, group: '學校', options: ['國立', '私立'], get: function (r) { return r.type ? [r.type] : []; } },
    kind: { label: '學校體系', type: 'multi', ops: MULTI_OPS, group: '學校', options: ['大學', '科大'], get: function (r) { return r.kind ? [r.kind] : []; } },
    region: { label: '地區', type: 'multi', ops: MULTI_OPS, group: '學校', options: REGIONS, get: function (r) { return r.region ? [r.region] : []; } },
    joint: { label: '聯招', type: 'multi', ops: MULTI_OPS, group: '學校', get: function (r) { return r.joint ? [r.joint] : []; } },
    grade: { label: '年級', type: 'multi', ops: MULTI_OPS, group: '系所', options: ['二年級', '三年級', '四年級'], get: function (r) { return r.grade ? [r.grade] : []; } },
    identity: { label: '身分', type: 'multi', ops: MULTI_OPS, group: '系所', get: function (r) { return r.x.identity ? [r.x.identity] : []; } },
    quota: { label: '名額', type: 'num', unit: '名', ops: [['gte', '至少'], ['lte', '不超過'], ['between', '介於']], group: '系所', presets: [5, 10, 20, 50], get: function (r) { return +r.quota; } },
    // D167:組別寫在系名括號裡的(「資訊工程學系(資安組)」)不另記組別,篩選也看系名括號
    group: { label: '招生組別', type: 'text', ops: [['has', '包含'], ['hasNot', '不包含']], group: '系所', placeholder: '例如:資安、英語', get: function (r) { return (r.group || '') + ' ' + (String(r.department || '').match(/[((][^()()]*[))]/g) || []).join(' '); } },
    tags: { label: '備註特性', type: 'multi', ops: MULTI_ALL_OPS, multiValued: true, group: '系所', options: REMARK_TAGS.map(function (t) { return t.t; }), get: function (r) { return r.x.tags; } },
    isNew: { label: '今年新增系所', type: 'multi', ops: MULTI_OPS, group: '系所', options: ['新增'], get: function (r) { return r.isNew === 1 ? ['新增'] : []; } },
    // 考試方式(使用者 2026-11-09):勾選的是「可以接受的項目」,只列出考試項目都在勾選範圍內的系組;只勾書審 = 只看書審的系組
    examMode: { label: '考試方式', type: 'multi', ops: [['only', '只考勾選的項目']], onlyIn: true, group: '考試', options: ['筆試', '書審', '面試', '術科'], get: function (r) { return r.x.modes; } },
    examItem: { label: '考試科目', type: 'text', ops: [['has', '包含'], ['hasNot', '不包含']], group: '考試', placeholder: '例如:微積分、英文', get: function (r) { return r.x.items; } },
    bookShare: { label: '書審占比', type: 'num', unit: '%', ops: [['gte', '至少'], ['lte', '不超過'], ['between', '介於']], group: '考試', presets: [50, 70, 100], get: function (r) { return r.x.book; } },
    oralShare: { label: '面試占比', type: 'num', unit: '%', ops: [['gte', '至少'], ['lte', '不超過'], ['between', '介於']], group: '考試', presets: [30, 50], get: function (r) { return r.x.oral; } },
    years: { label: '我的工作年資', type: 'num', unit: '年', ops: [['mine', '年資要求不超過']], group: '在職', presets: [1, 2, 3], nullPass: true, get: function (r) { return r.years === undefined ? null : r.years; } },
    time: { label: '上課時段', type: 'multi', ops: MULTI_ALL_OPS, multiValued: true, group: '在職', options: ['平日夜間', '週末假日', '平日白天'], get: function (r) { return r.x.time; } }
  };
  // 各管道預設顯示的條件,其餘放在「更多」(沿用 TAB_DEFS 的 main / more)
  var DEFAULT_FIELDS = {
    '暑轉': ['status', 'ownership', 'kind', 'grade', 'region', 'identity', 'examMode'],
    '寒轉': ['status', 'ownership', 'kind', 'grade', 'region', 'identity', 'examMode'],
    '特殊選才': ['status', 'ownership', 'kind', 'region', 'joint', 'examMode'],
    '研究所甄試': ['status', 'ownership', 'kind', 'region', 'examMode'],
    '研究所一般生': ['status', 'ownership', 'kind', 'region', 'examMode', 'identity'],
    '在職專班': ['status', 'ownership', 'kind', 'region', 'years', 'time']
  };
  var NO_WRITTEN = ['書審', '面試', '術科'];
  // 舊版考試方式選項(收藏的條件、分享連結)換成新選項
  var OLD_MODES = { '只審查': ['書審'], '無筆試': NO_WRITTEN };
  var PRESETS = {
    all: [
      { t: '正在報名', r: [['status', 'any', ['報名中']]] },
      { t: '3 天內截止', r: [['status', 'any', ['3 天內截止']]] },
      { t: '只審查不考試', r: [['examMode', 'only', ['書審']]] },
      { t: '國立大學', r: [['ownership', 'any', ['國立']], ['kind', 'any', ['大學']]] },
      { t: '名額 10 名以上', r: [['quota', 'gte', { a: 10 }]] }
    ],
    '暑轉': [{ t: '三年級免筆試', r: [['grade', 'any', ['三年級']], ['examMode', 'only', NO_WRITTEN]] }],
    '寒轉': [{ t: '二年級免筆試', r: [['grade', 'any', ['二年級']], ['examMode', 'only', NO_WRITTEN]] }],
    '研究所一般生': [{ t: '免筆試', r: [['examMode', 'only', NO_WRITTEN]] }],
    '在職專班': [{ t: '週末上課', r: [['time', 'any', ['週末假日']]] }, { t: '年資 1 年可報', r: [['years', 'mine', { a: 1 }]] }]
  };

  // C 版的問句
  var ASK = {
    period: '報名期間要落在哪段時間?', ownership: '想讀國立還是私立?', kind: '大學還是科大?', region: '想在哪個地區?', joint: '要看哪個聯招?',
    grade: '要轉入幾年級?', identity: '用什麼身分報考?', quota: '名額至少要幾名?', group: '招生組別要有哪些字?', tags: '有沒有特別在意的規定?',
    isNew: '只看今年新增的系所嗎?', examMode: '偏好哪種考試方式?', examItem: '想考(或不想考)哪些科目?', bookShare: '書審要占多少?',
    oralShare: '面試要占多少?', years: '你有幾年工作年資?', time: '哪個時段方便上課?'
  };
  Object.keys(ASK).forEach(function (k) { FIELDS[k].ask = ASK[k]; });
  var OP_NAMES = { any: '包含', not: '排除', all: '同時符合', has: '包含', hasNot: '不包含', gte: '至少', lte: '不超過', between: '介於', overlap: '重疊', endBy: '截止前', startFrom: '開始後', mine: '年資' };

  var SORTS = [['default', '報名中優先'], ['deadline', '截止日由近到遠'], ['quota', '名額由多到少'], ['name', '學校名稱']];
  var STATUS_ORDER = { urgent: 0, open: 1, soon: 2, unknown: 3, closed: 4, old: 5 };

  var st = {
    channel: '', year: 'auto', q: '', fuzzy: true, logic: 'all', rules: [], sort: 'default', view: 'school', hideClosed: false, favOnly: false
  };
  var manifest = null, files = {}, rows = [], groups = [], latestYear = null, nextRule = 1, channels = [];
  var favorites = loadJson(FAV_KEY, []);
  var saved = loadJson(SAVED_KEY, []);
  var customFields = loadJson(FIELDS_KEY, {});

  // ---------- 工具 ----------
  function loadJson(key, dflt) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? dflt : v; } catch (e) { return dflt; }
  }
  function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/臺/g, '台').replace(/\s+/g, ''); }
  function toDate(s) {
    s = String(s || '');
    return s.length === 8 ? new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)) : null;
  }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function dayDiff(a, b) { return Math.round((a - b) / 86400000); }
  function fmt(s) { s = String(s || ''); return s.length === 8 ? s.slice(0, 4) + '/' + s.slice(4, 6) + '/' + s.slice(6) : '未定'; }
  function fmtShort(s) {
    s = String(s || '');
    if (s.length !== 8) return '未定';
    return (+s.slice(0, 4) === new Date().getFullYear() ? '' : s.slice(0, 4) + '/') + s.slice(4, 6) + '/' + s.slice(6);
  }

  /** 報名狀態:open 報名中、urgent 3 天內截止、soon 尚未開始、closed 已截止、unknown 未定。 */
  function status(start, end) {
    var s = toDate(start), e = toDate(end), t = today();
    if (!e) return { key: 'unknown', text: '日期未定', left: null };
    var left = dayDiff(e, t);
    if (left < 0) return { key: 'closed', text: '已截止', left: left };
    if (s && t < s) return { key: 'soon', text: dayDiff(s, t) + ' 天後開始', left: left };
    if (left <= 3) return { key: 'urgent', text: left === 0 ? '今天截止' : '剩 ' + left + ' 天', left: left };
    return { key: 'open', text: '報名中', left: left };
  }

  function isMainIdentity(r) { return r.identity === (channelDef(r.channel).mainIdentity || '一般生'); }

  // ---------- 資料 ----------
  function derive(r) {
    var top = (r.exams || []).filter(function (x) { return !x[6]; });
    var all = r.exams || [];
    var sum = function (re) {
      var hit = top.filter(function (x) { return x[3] === '%' && x[2] !== null && re(x[1]); });
      return hit.length ? hit.reduce(function (a, x) { return a + Number(x[2]); }, 0) : null;
    };
    var isOral = function (n) { return ORAL.test(n); };
    var isPractical = function (n) { return PRACTICAL.test(n); };
    var isDocs = function (n) { return !isOral(n) && !isPractical(n) && !WRITTEN.test(n) && !SUBJECT.test(n) && DOCS.test(n); };
    // 這個系組的考試由哪幾類組成:筆試、書審、面試、術科。
    // 子項目跟著上層歸類(「面試」底下的「表達內容、儀態」算面試);上層只是組別標題(「選項1」底下是有機化學…)時看子項目本身,標題不算
    var parents = {};
    all.forEach(function (x) { if (x[6]) parents[x[6]] = 1; });
    var isLabel = function (n) { return GROUP_LABEL.test(String(n || '').trim()); };
    // D195:有類別欄(第 8 欄)就照類別;舊資料依名稱判斷(guessCats)
    var modes = [];
    all.forEach(function (x) {
      if (!String(x[1] || '').trim() || (parents[x[1]] && isLabel(x[1]))) return;
      var cats = x[7] ? String(x[7]).split('+') : (x[6] && !isLabel(x[6]) ? guessCats(x[6]) : guessCats(x[1]));
      cats.forEach(function (m) { if (modes.indexOf(m) < 0) modes.push(m); });
    });
    modes = ['筆試', '書審', '面試', '術科'].filter(function (m) { return modes.indexOf(m) >= 0; });
    var st0 = status(r.start, r.end);
    var stat = st0.key === 'open' ? ['報名中'] : st0.key === 'urgent' ? ['報名中', '3 天內截止'] : st0.key === 'soon' ? ['尚未開始'] : st0.key === 'closed' ? ['已截止'] : ['日期未定'];
    // 搜尋考科用:考試項目是簡章原名,加上統稱,「書審」才找得到「書面資料」「歷年成績單」
    var aliases = [];
    if (modes.indexOf('書審') >= 0) aliases.push('書審');
    if (modes.indexOf('面試') >= 0) aliases.push('面試', '口試');
    if (modes.indexOf('筆試') >= 0) aliases.push('筆試');
    if (modes.indexOf('術科') >= 0) aliases.push('術科');
    var names = all.length ? all.map(function (x) { return x[1]; }).join(' ') : (r.stage1 || '') + ' ' + (r.stage2 || '');
    var rm = String(r.remarks || '');
    var time = [];
    if (/夜|晚/.test(r.time)) time.push('平日夜間');
    if (/週六|週日|週末|假日|星期六|星期日/.test(r.time)) time.push('週末假日');
    if (/白天|日間/.test(r.time)) time.push('平日白天');
    r.x = {
      modes: modes, status: stat, statusKey: st0.key,
      identity: r.channel === '特殊選才' ? (r.identity === '一般生' ? '一般生' : '其他身分') : r.identity,
      tags: REMARK_TAGS.filter(function (t) { return t.re.test(rm) && !(t.not && t.not.test(rm)); }).map(function (t) { return t.t; }),
      items: all.map(function (x) { return x[1]; }).join(' ') + ' ' + (r.stage1 || '') + ' ' + (r.stage2 || ''),
      book: sum(isDocs), oral: sum(isOral), time: time, examSearch: norm(names + ' ' + aliases.join(' '))
    };
    r.search = norm(r.school + ' ' + r.department + ' ' + r.joint + ' ' + r.jointName);
  }

  function expandFile(file) {
    var sf = file.school_fields, rf = file.row_fields;
    var schools = file.schools.map(function (arr) { var s = {}; sf.forEach(function (k, i) { s[k] = arr[i]; }); return s; });
    return file.rows.map(function (arr) {
      var r = {};
      rf.forEach(function (k, i) { r[k] = arr[i]; });
      var s = schools[r.s];
      r.school = s.name; r.type = s.type; r.kind = s.kind; r.region = s.region; r.url = s.url;
      r.joint = s.joint || ''; r.jointName = s.jointName || '';
      r.start = r.start || s.start; r.end = r.end || s.end;
      r.channel = file.channel; r.year = file.academic_year;
      derive(r);
      return r;
    });
  }

  function buildGroups(list) {
    var map = {}, out = [];
    // D189:同校的聯招列(台聯大)和學校自己招生的列放在同一張卡;聯招標籤改標在系名後面(使用者 2026-11-18)
    list.forEach(function (r) {
      var k = r.channel + '|' + r.school;
      if (!map[k]) { map[k] = { key: k, channel: r.channel, school: r.school, joint: '', jointName: '', type: r.type, kind: r.kind, region: r.region, url: r.url, year: r.year, rows: [] }; out.push(map[k]); }
      map[k].rows.push(r);
      r.g = map[k];
    });
    out.forEach(function (g) {
      // 卡片的報名日期與簡章:以學校自己招生的列為準,全部都是聯招列時才用聯招的
      var own = g.rows.filter(function (r) { return !r.joint; });
      var basis = own.length ? own : g.rows;
      var cnt = {}, best = null;
      basis.forEach(function (r) { var k = r.start + '-' + r.end; cnt[k] = (cnt[k] || 0) + 1; if (!best || cnt[k] > cnt[best]) best = k; });
      g.url = basis[0].url;
      g.start = best.split('-')[0]; g.end = best.split('-')[1];
      g.fallback = st.year === 'auto' && latestYear && g.year < latestYear;
      g.status = g.fallback ? { key: 'old', text: g.year + ' 學年度資料', left: null } : status(g.start, g.end);
    });
    return out;
  }

  function channelYears(ch) {
    var c = (manifest.channels || []).filter(function (x) { return x.channel === ch; })[0];
    return c ? c.years : [];
  }

  function fetchJson(url) {
    // 單檔版(tools/build_compare_html.js)資料已內嵌,不必連線
    if (window.TB_DATA) return Promise.resolve(window.TB_DATA[url]);
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
      return res.json();
    });
  }
  function getFile(base, file) {
    if (files[file]) return Promise.resolve(files[file]);
    return fetchJson(base + file).then(function (f) { files[file] = f; return f; });
  }

  /** 最新年度 + 前一年度中最新年度沒有的學校(D31②);指定年度時只看該年度。 */
  function loadChannel() {
    var years = channelYears(st.channel);
    latestYear = years.length ? years[0].academic_year : null;
    var picked = st.year === 'auto' ? years.slice(0, 2) : years.filter(function (y) { return String(y.academic_year) === String(st.year); });
    return Promise.all(picked.map(function (y) { return getFile(api.base, y.file); })).then(function (list) {
      var out = [], done = {};
      list.forEach(function (f, i) {
        var part = expandFile(f);
        if (st.year === 'auto' && i > 0) part = part.filter(function (r) { return !done[r.school + '|' + r.joint]; });
        part.forEach(function (r) { done[r.school + '|' + r.joint] = true; });
        out = out.concat(part);
      });
      rows = out;
      groups = buildGroups(out);
      memo = null;
    });
  }

  // ---------- 規則 ----------
  function hasValue(rule) {
    var f = FIELDS[rule.field], v = rule.v;
    if (!f) return false;
    if (f.type === 'multi') return !!(v && v.length);
    if (f.type === 'text') return !!String(v || '').trim();
    if (f.type === 'num') return rule.op === 'between' ? !!v && (v.a !== '' && v.a !== undefined || v.b !== '' && v.b !== undefined) : !!v && v.a !== '' && v.a !== undefined;
    return !!v && !!(v.a || v.b);
  }
  function emptyValue(field) { var t = FIELDS[field].type; return t === 'multi' ? [] : t === 'text' ? '' : {}; }

  function ruleMatches(rule, r) {
    var f = FIELDS[rule.field], v = rule.v;
    if (f.type === 'multi') {
      var has = f.get(r);
      if (rule.op === 'only') return has.length > 0 && has.every(function (x) { return v.indexOf(x) >= 0; });
      if (rule.op === 'all') return v.every(function (x) { return has.indexOf(x) >= 0; });
      var hit = v.some(function (x) { return has.indexOf(x) >= 0; });
      return rule.op === 'not' ? !hit : hit;
    }
    if (f.type === 'text') {
      var hay = norm(f.get(r));
      var found = String(v).trim().split(/[\s,,、]+/).filter(Boolean).every(function (t) { return hay.indexOf(norm(t)) >= 0; });
      return rule.op === 'hasNot' ? !found : found;
    }
    if (f.type === 'num') {
      var n = f.get(r);
      if (n === null || n === undefined) return !!f.nullPass;
      if (rule.op === 'between') return !(v.a !== '' && v.a !== undefined && n < +v.a) && !(v.b !== '' && v.b !== undefined && n > +v.b);
      return rule.op === 'gte' ? n >= +v.a : n <= +v.a;
    }
    var rs = +r.start || 0, re = +r.end || 0, a = v.a ? +String(v.a).replace(/-/g, '') : 0, b = v.b ? +String(v.b).replace(/-/g, '') : 0;
    if (!rs || !re) return false;
    if (rule.op === 'endBy') return !b || re <= b;
    if (rule.op === 'startFrom') return !a || rs >= a;
    return !(a && re < a) && !(b && rs > b);
  }

  function terms() { return st.q.trim().toLowerCase().replace(/臺/g, '台').split(/\s+/).filter(Boolean); }
  function fuzzyRe(term) { return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('').join('.*')); }

  function baseFilter() {
    var ts = terms(), res = st.fuzzy ? ts.map(fuzzyRe) : [];
    return function (r) {
      if (st.favOnly && favorites.indexOf(r.id) < 0) return false;
      if (st.hideClosed && r.x.statusKey === 'closed') return false;
      // 模糊比對只用在校名系名;考科文字長,跳字比對會誤中
      for (var i = 0; i < ts.length; i++) {
        if (r.search.indexOf(ts[i]) < 0 && r.x.examSearch.indexOf(ts[i]) < 0 && !(st.fuzzy && res[i].test(r.search))) return false;
      }
      return true;
    };
  }
  function activeRules(exceptField) {
    return st.rules.filter(function (x) { return x.field !== exceptField && hasValue(x); });
  }
  function rulesPass(list, r, emptyResult) {
    if (!list.length) return emptyResult;
    return st.logic === 'any' ? list.some(function (x) { return ruleMatches(x, r); }) : list.every(function (x) { return ruleMatches(x, r); });
  }

  /** 同一學校的列依「系組 + 年級 + 組別」合併,一般生與外加身分放同一列。 */
  function deptGroups(list) {
    var map = {}, out = [];
    list.forEach(function (r) {
      var k = r.department + '|' + r.grade + '|' + (r.group || '') + '|' + r.joint;
      if (!map[k]) { map[k] = { key: r.id, dept: r.department, grade: r.grade, group: r.group || '', joint: r.joint, jointName: r.jointName, start: r.start, end: r.end, url: r.url, rows: [], g: r.g }; out.push(map[k]); }
      map[k].rows.push(r);
    });
    // 同一學校的系組依年級排(二年級全部在前、再三年級……,使用者 2026-11-17:不要二三年級交叉);同年級維持簡章順序
    var GRADE_ORDER = { '': 0, '二年級': 2, '三年級': 3, '四年級': 4 };
    var gradeRank = function (g) { return GRADE_ORDER[g || ''] !== undefined ? GRADE_ORDER[g || ''] : 9; };
    out = out.map(function (d, i) { return { d: d, i: i }; })
      .sort(function (a, b) { return (gradeRank(a.d.grade) - gradeRank(b.d.grade)) || (a.i - b.i); })
      .map(function (x) { return x.d; });
    out.forEach(function (d) {
      d.rows.sort(function (a, b) { return (isMainIdentity(a) ? 0 : 1) - (isMainIdentity(b) ? 0 : 1); });
      d.ids = d.rows.map(function (r) { return r.id; });
      d.mainQuota = d.rows.filter(isMainIdentity).reduce(function (n, r) { return n + (+r.quota || 0); }, 0);
      d.quota = d.rows.reduce(function (n, r) { return n + (+r.quota || 0); }, 0);
      d.remarks = [];
      d.rows.forEach(function (r) {
        String(r.remarks || '').split('\n').forEach(function (l) { l = l.trim(); if (l && d.remarks.indexOf(l) < 0) d.remarks.push(l); });
      });
    });
    return out;
  }

  var memo = null;
  function compute() {
    if (memo) return memo;
    var base = baseFilter(), list = activeRules();
    var hit = groups.map(function (g) {
      var m = g.rows.filter(function (r) { return base(r) && rulesPass(list, r, true); });
      return m.length ? { g: g, rows: m, depts: deptGroups(m), quota: m.reduce(function (n, r) { return n + (+r.quota || 0); }, 0) } : null;
    }).filter(Boolean);
    var name = function (a, b) { return a.g.school.localeCompare(b.g.school, 'zh-Hant'); };
    var sorters = {
      'default': function (a, b) { return ((a.g.fallback ? 1 : 0) - (b.g.fallback ? 1 : 0)) || (STATUS_ORDER[a.g.status.key] - STATUS_ORDER[b.g.status.key]) || ((+a.g.end || 99999999) - (+b.g.end || 99999999)) || name(a, b); },
      deadline: function (a, b) { return ((a.g.status.key === 'closed') - (b.g.status.key === 'closed')) || ((+a.g.end || 99999999) - (+b.g.end || 99999999)) || name(a, b); },
      quota: function (a, b) { return b.quota - a.quota; },
      name: name
    };
    hit.sort(sorters[st.sort] || sorters['default']);
    var depts = [];
    hit.forEach(function (f) { depts = depts.concat(f.depts); });
    if (st.sort === 'quota') depts.sort(function (a, b) { return b.quota - a.quota; });
    memo = { groups: hit, depts: depts, oldCount: hit.filter(function (f) { return f.g.fallback; }).length };
    return memo;
  }

  /** 這一條規則單獨使用時有幾個系組(其他規則不算),看得出是哪一條把結果篩光。 */
  function ruleHits(rule) {
    if (!hasValue(rule)) return null;
    var base = baseFilter(), seen = {}, n = 0;
    rows.forEach(function (r) {
      if (!base(r) || !ruleMatches(rule, r)) return;
      var k = r.g.key + '|' + r.department + '|' + r.grade + '|' + (r.group || '') + '|' + r.joint;
      if (!seen[k]) { seen[k] = 1; n++; }
    });
    return n;
  }

  /** 分面計數:每個選項加進去會有幾個系組;算的時候不含同一欄位自己的條件。 */
  function facet(field) {
    var f = FIELDS[field], base = baseFilter(), others = activeRules(field), seen = {}, out = {};
    optionsFor(field).forEach(function (o) { out[o] = 0; });
    rows.forEach(function (r) {
      if (!base(r)) return;
      var vals = f.get(r);
      // 「符合任一」時選項本身就能讓這列出現,不必再過其他條件
      if (st.logic !== 'any' && !rulesPass(others, r, true)) return;
      var k = r.g.key + '|' + r.department + '|' + r.grade + '|' + (r.group || '') + '|' + r.joint;
      // 「只考勾選的項目」:每個選項的數字 = 加上這一項後會列出、而且有考這一項的系組
      if (f.onlyIn) {
        var cur = (fieldRule(field) || {}).v || [];
        vals = vals.filter(function (v) { return vals.every(function (x) { return x === v || cur.indexOf(x) >= 0; }); });
      }
      vals.forEach(function (v) {
        var kk = v + '|' + k;
        if (out[v] === undefined || seen[kk]) return;
        seen[kk] = 1; out[v]++;
      });
    });
    return out;
  }

  /** 目前管道實際有的選項:固定清單依原順序過濾,沒有固定清單的看資料。 */
  function optionsFor(field) {
    var f = FIELDS[field], have = {};
    rows.forEach(function (r) { f.get(r).forEach(function (v) { have[v] = (have[v] || 0) + 1; }); });
    if (f.options) return f.options.filter(function (o) { return have[o]; });
    return Object.keys(have).sort(function (a, b) { return have[b] - have[a]; });
  }

  /** 目前管道用得到的條件:資料裡沒有這項資訊的不列出。 */
  function availableFields() {
    return Object.keys(FIELDS).filter(function (k) {
      var f = FIELDS[k];
      if (f.type === 'date') return true;
      if (f.type === 'multi') return optionsFor(k).length >= (k === 'isNew' ? 1 : 2);
      return rows.some(function (r) { var v = f.get(r); return v !== null && v !== undefined && v !== '' && String(v).trim() !== ''; });
    });
  }

  function addRule(field, op, v) {
    var f = FIELDS[field];
    var rule = { id: nextRule++, field: field, op: op || f.ops[0][0], v: v === undefined ? emptyValue(field) : v };
    st.rules.push(rule);
    touch();
    return rule;
  }
  function removeRule(id) { st.rules = st.rules.filter(function (x) { return x.id !== id; }); touch(); }
  function ruleOf(id) { return st.rules.filter(function (x) { return x.id === +id; })[0]; }
  function fieldRule(field) { return st.rules.filter(function (x) { return x.field === field; })[0]; }
  function applyPreset(p) { p.r.forEach(function (x) { var e = fieldRule(x[0]); if (e) { e.op = x[1]; e.v = x[2]; } else addRule(x[0], x[1], x[2]); }); touch(); }
  function presets() { return PRESETS.all.concat(PRESETS[st.channel] || []); }
  function clearAll() { st.rules = []; st.q = ''; st.favOnly = false; st.hideClosed = false; touch(); }

  /** 分面用:切換某欄位的一個值,空了就移除規則。 */
  function toggleValue(field, value) {
    var rule = fieldRule(field);
    if (!rule) { addRule(field, null, [value]); return; }
    var i = rule.v.indexOf(value);
    if (i >= 0) rule.v.splice(i, 1); else rule.v.push(value);
    if (!rule.v.length) removeRule(rule.id); else touch();
  }

  /** 一條規則的文字說明(已套用條件、儲存名稱用)。 */
  function ruleText(rule) {
    var f = FIELDS[rule.field], v = rule.v, op = f.ops.filter(function (o) { return o[0] === rule.op; })[0];
    var opText = op ? op[1] : '';
    if (f.type === 'multi') return f.label + (rule.op === 'not' ? '排除 ' : rule.op === 'all' ? '同時 ' : ':') + v.join('、');
    if (f.type === 'text') return f.label + opText + '「' + v + '」';
    if (f.type === 'num') {
      if (rule.op === 'between') return f.label + ' ' + (v.a === undefined || v.a === '' ? '不限' : v.a) + '–' + (v.b === undefined || v.b === '' ? '不限' : v.b) + f.unit;
      return f.label + ' ' + (rule.op === 'mine' ? v.a + f.unit : opText + ' ' + v.a + f.unit);
    }
    return f.label + ' ' + (v.a || '不限') + ' 至 ' + (v.b || '不限');
  }

  function touch() { memo = null; }

  // ---------- 顯示文字 ----------
  // 筆試科目:不是面試、術科、書審類的名稱(「國文」「微積分」);「筆試」本身是整組名稱
  function isWrittenSubject(n) {
    return !ORAL.test(n) && !PRACTICAL.test(n) && (SUBJECT.test(n) || !DOCS.test(n)) && !/^筆試/.test(n);
  }

  /**
   * [階段, 名稱, 配分, 單位, 日期, 任選組, 所屬整組項目] → 摘要文字(使用者 2026-11-13:「階段 考法(配分):科目」):
   *   「第一階段 書審 40%(成績單 30%、書審資料 70%)/第二階段 面試 60%(7/15)」;
   *   沒有整組名稱的筆試科目收成「筆試:國文、英文、微積分」(有配分時「筆試 100%:國文 50%、英文 50%」)。
   *   只有一個階段時不寫階段。
   */
  // topOnly:只列第一層(列表摘要用,子項配分放到「考試說明」,使用者 2026-11-17)
  function examsText(exams, topOnly) {
    if (!exams || !exams.length) return '';
    var w = function (x) { return x[2] === null || x[2] === undefined ? '' : (x[3] === '%' ? ' ' + x[2] + '%' : (x[3] === '倍' ? ' ×' + x[2] : ' ' + x[2])); };
    var dt = function (x) { return x[4] && String(x[4]).length === 8 ? '(' + Number(String(x[4]).slice(4, 6)) + '/' + Number(String(x[4]).slice(6)) + ')' : ''; };
    var stages = [1, 2].map(function (s) { return exams.filter(function (x) { return x[0] === s; }); }).filter(function (a) { return a.length; });
    var partsText = function (list, all) {
      var parts = [], g = {}, written = null;
      var kidsOf = function (x) { return all && !topOnly ? all.filter(function (k) { return k[6] && k[6] === x[1]; }) : []; };
      // 這個階段第一層全部都是筆試科目(沒有書審、面試混在一起)才收成「筆試：…」,混在一起時分不清哪些是筆試
      var plain = list.filter(function (x) { return !x[5]; });
      var allWritten = !!all && plain.length > 0 && plain.every(function (x) { return isWrittenSubject(x[1]) && !kidsOf(x).length; });
      list.forEach(function (x) {
        if (x[5]) { if (!g[x[5]]) { g[x[5]] = []; parts.push(g[x[5]]); } g[x[5]].push(x); return; }
        if (allWritten) {
          if (!written) { written = { written: [] }; parts.push(written); }
          written.written.push(x);
          return;
        }
        parts.push(x);
      });
      var kidsText = function (x) {
        var kids = kidsOf(x);
        return kids.length ? '(' + partsText(kids) + ')' : '';
      };
      return parts.map(function (p) {
        if (p.written) {
          var subs = p.written;
          var allPct = subs.every(function (x) { return x[3] === '%' && x[2] !== null && x[2] !== undefined; });
          var total = allPct ? subs.reduce(function (a, x) { return a + Number(x[2]); }, 0) : null;
          // 各科各 100 分(中原心理「心理學方法 100%、普通心理學 100%…」)不是比例,不加總
          if (total !== null && total > 100.01) total = null;
          var ds = subs.map(dt).filter(Boolean);
          var oneDate = ds.length === subs.length && ds.every(function (d) { return d === ds[0]; }) ? ds[0] : '';
          return '筆試' + (total !== null ? ' ' + Math.round(total * 100) / 100 + '%' : '') + oneDate + '：' +
            subs.map(function (x) { return x[1] + w(x) + (oneDate ? '' : dt(x)); }).join('、');
        }
        // 整組任選(台聯大「選項1:有機化學、無機化學… 選項2:…」):每個選項後面列出組內科目,和 Exams.format 一致(D116)
        // D190:選項名稱只是「選項1」這類標籤時,列表摘要也直接列組內科目與倍數(「有機化學 ×1、無機化學 ×0.1 或 物理化學 ×0.1…(任選一)」),
        // 不再只顯示「選項1或選項2」(使用者 2026-11-18)
        if (Array.isArray(p[0])) {
          var labelKids = function (x) { return all && GROUP_LABEL.test(String(x[1] || '').trim()) ? all.filter(function (k) { return k[6] && k[6] === x[1] && k[0] === x[0]; }) : []; };
          // 只有一個選項、組內多科:「(電子學 ×1、訊號與系統 ×1、控制系統 ×1 任選一)」,和前面的必考科目分得開
          if (p.length === 1 && labelKids(p[0]).length > 1) return '(' + partsText(labelKids(p[0])).replace(/^筆試[^：]*：/, '') + ' 任選一)' + w(p[0]) + dt(p[0]);
          if (p.every(function (x) { return labelKids(x).length; })) {
            // 有兩個以上選項時,含多科的選項加括號,看得出哪幾科是同一組:「(有機化學 ×1、無機化學 ×0.1)或 生物化學 ×1.1(任選一組)」
            return p.map(function (x) {
              var t = partsText(labelKids(x)).replace(/^筆試[^：]*：/, '');
              return p.length > 1 && labelKids(x).length > 1 ? '(' + t + ')' : t;
            }).join('或') + (p.length > 1 ? '(任選一組)' : '(任選一)') + w(p[0]) + dt(p[0]);
          }
          // D219:不同類別的考法擇一(彰師「筆試或資料審查二擇一,各 100%」)
          if (mixedChoice(p)) return p.map(function (x) { return x[1] + kidsText(x); }).join('或') + choiceWord(p.length) + (w(p[0]) ? '，各' + w(p[0]) : '') + dt(p[0]);
          return p.map(function (x) { return x[1] + kidsText(x); }).join('或') + '(任選一)' + w(p[0]) + dt(p[0]);
        }
        return p[1] + w(p) + dt(p) + kidsText(p);
      }).join('、');
    };
    return stages.map(function (list) {
      var text = partsText(list.filter(function (x) { return !x[6]; }), list);
      return stages.length > 1 ? (list[0][0] === 1 ? '第一階段 ' : '第二階段 ') + text : text;
    }).join('／');
  }
  function stageText(r) {
    return [r.stage1, r.stage2 ? (/^複試/.test(r.stage2) ? '' : '複試:') + r.stage2 : ''].filter(Boolean).join(' / ');
  }
  /**
   * D195:列表摘要只顯示考試類別(筆試、書審、面試、術科)與各類合計配分(「書審 40%、面試 60%」);
   * 兩個階段時分開寫。類別取資料的第 8 欄,舊資料沒有時依名稱關鍵字判斷。原本的項目、子項與各自配分放在展開的「考試說明」。
   */
  function catsOf(x) { return x[7] ? String(x[7]).split('+') : guessCats(x[1]); }
  function categorySummary(exams) {
    if (!exams || !exams.length) return '';
    var stages = [1, 2].map(function (s) { return exams.filter(function (x) { return x[0] === s && !x[6]; }); })
      .filter(function (a) { return a.length; });
    var parts = stages.map(function (list) {
      // 任選組算一次:類別取組內的聯集、配分取第一個
      var entries = [], seen = {};
      list.forEach(function (x) {
        if (x[5]) {
          if (seen[x[5]]) { seen[x[5]].cats = seen[x[5]].cats.concat(kidCats(x, exams)); seen[x[5]].members.push(catKey(kidCats(x, exams))); return; }
          seen[x[5]] = { cats: kidCats(x, exams), w: x[2], u: x[3], members: [catKey(kidCats(x, exams))] };
          entries.push(seen[x[5]]);
          return;
        }
        entries.push({ cats: kidCats(x, exams), w: x[2], u: x[3] });
      });
      var order = [], sums = {};
      // 類別固定照「筆試、書審、面試、術科」排,各系看起來一致
      entries.sort(function (a, b) { return catRank(a.cats) - catRank(b.cats); });
      entries.forEach(function (e) {
        var distinct = e.members ? e.members.filter(function (m, i) { return e.members.indexOf(m) === i; }) : [];
        var k = distinct.length > 1 ? distinct.join('或') + choiceWord(distinct.length) : catKey(e.cats);
        if (!sums[k]) { sums[k] = { w: 0, ok: true }; order.push(k); }
        if (e.u === '%' && typeof e.w === 'number') sums[k].w += e.w; else sums[k].ok = false;
      });
      return order.map(function (k) { return k + (sums[k].ok && sums[k].w ? (/擇一$/.test(k) ? '，各 ' : ' ') + Math.round(sums[k].w * 100) / 100 + '%' : ''); }).join('、');
    });
    return parts.length > 1 ? '第一階段 ' + parts[0] + '／第二階段 ' + parts[1] : parts[0];
  }
  function catKey(cats) { return CAT_ORDER.filter(function (c) { return cats.indexOf(c) >= 0; }).join('+') || '筆試'; }
  // D219:任選組的選項類別不同(筆試、書審)時是「考法擇一」,寫成「N擇一,各」
  function mixedChoice(p) {
    var keys = p.map(function (x) { return catKey(catsOf(x)); });
    return keys.some(function (k) { return k !== keys[0]; });
  }
  function choiceWord(n) { return ('一二三四五六七八九'.charAt(n - 1) || n) + '擇一'; }
  function catRank(cats) { var i = CAT_ORDER.map(function (c) { return cats.indexOf(c) >= 0; }).indexOf(true); return i < 0 ? 0 : i; }
  // 任選組的選項是「選項1」這類標籤時,類別看組內科目
  function kidCats(x, exams) {
    if (!GROUP_LABEL.test(String(x[1] || '').trim())) return catsOf(x);
    var kids = exams.filter(function (k) { return k[6] === x[1] && k[0] === x[0]; });
    return kids.length ? [].concat.apply([], kids.map(catsOf)) : catsOf(x);
  }
  function summary(d) { var r = d.rows[0]; return categorySummary(r.exams) || stageText(r); }

  /** 系組的主要名額與外加身分。 */
  function quotaParts(d) {
    return d.rows.map(function (r) { return { main: isMainIdentity(r), identity: r.identity, quota: r.quota }; });
  }

  /** 列上顯示的考試摘要(換行改空白、太長截斷);full = 沒有被截斷。 */
  function summaryLine(d, max) {
    var s = (summary(d) || '').replace(/\n/g, ' ');
    return { text: s.length > max ? s.slice(0, max) + '…' : s, full: s.length <= max };
  }

  /**
   * 展開後的詳細資料:[[標題, 內容]]。shown:列上已經顯示的內容不再重複(使用者 2026-11-03)。
   *   shown.quota:各身分名額已顯示;shown.summaryMax:考試摘要顯示的長度,完整顯示時不再列配分或考試原文。
   */
  function detail(d, shown) {
    shown = shown || {};
    // D195:列表只顯示類別合計;考試說明列出原本的項目、子項與各自配分(和類別摘要一樣時不重複)
    var r = d.rows[0], exams = categorySummary(r.exams), full = examsText(r.exams), out = [];
    var kidsLine = full && full !== exams ? full.replace(/／/g, '\n') : '';
    var sumFull = !!shown.summaryMax && summaryLine(d, shown.summaryMax).full;
    var dates = (r.dates || []).filter(function (x) { return x[0] && String(x[1]).length === 8; });
    if (r.years !== null && r.years !== undefined) out.push(['工作年資', r.years + ' 年以上']);
    if (r.time) out.push(['上課時段', r.time]);
    if (r.elig) out.push(['報考資格', r.elig]);
    if (d.rows.length > 1 && !shown.quota) out.push(['名額', d.rows.map(function (x) { return x.identity + ' ' + x.quota + ' 名'; }).join('、')]);
    if (exams && !sumFull) out.push(['考試方式', exams.replace(/／/g, '\n')]);
    // 沒有結構化配分時,列上摘要就是考試原文
    var stage1 = r.stage1 && !(sumFull && !exams) ? r.stage1 : '';
    if (kidsLine || stage1) out.push([exams ? '考試說明' : '初試', [kidsLine, stage1].filter(Boolean).join('\n')]);
    if (r.stage2 && !(sumFull && !exams)) out.push(['複試', r.stage2]);
    if (dates.length) out.push(['重要日期', dates.map(function (x) { return x[0] + ' ' + fmt(String(x[1])); }).join('\n')]);
    var rm = d.remarks.filter(function (s) { return !EXAM_QUOTA.test(String(s).trim()); });
    if (rm.length) out.push(['備註', rm.join('\n')]);
    if (r.start !== d.g.start || r.end !== d.g.end) out.push(['報名期間', fmt(r.start) + ' – ' + fmt(r.end)]);
    return out;
  }

  // D192:自動備註「名額含甄試名額 N 名」→ 名額旁顯示「含甄試 N」,備註不再重複
  var EXAM_QUOTA = /^名額含甄試名額 (\d+) 名$/;
  function examQuota(d) {
    var hit = (d.remarks || []).map(function (s) { return String(s).trim().match(EXAM_QUOTA); }).filter(Boolean)[0];
    return hit ? Number(hit[1]) : 0;
  }

  function highlight(text, q) {
    var s = esc(text), ts = q === undefined ? terms() : q;
    if (!ts.length) return s;
    var pat = ts.map(function (t) { return esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/台/g, '[台臺]'); }).join('|');
    return s.replace(new RegExp('(' + pat + ')', 'gi'), '<mark>$1</mark>');
  }
  function brochureUrl(g) {
    var u = String(g.url || '').trim();
    return u && !/^https?:\/\//i.test(u) ? 'https://' + u : u;
  }

  // ---------- 收藏與儲存 ----------
  function isFav(d) { return d.ids.some(function (id) { return favorites.indexOf(id) >= 0; }); }
  function toggleFav(ids) {
    var on = !ids.some(function (id) { return favorites.indexOf(id) >= 0; });
    ids.forEach(function (id) {
      var i = favorites.indexOf(id);
      if (on && i < 0) favorites.push(id);
      if (!on && i >= 0) favorites.splice(i, 1);
    });
    saveJson(FAV_KEY, favorites);
    touch();
    return on;
  }
  function favCount() { return favorites.length; }
  function shareFav(kind) {
    if (!favorites.length) return false;
    var u = new URL(window.location.href);
    u.searchParams.set('fav', favorites.slice(0, 30).join(','));
    u.hash = '';
    var url = u.toString();
    if (kind === 'line') window.open('https://line.me/R/msg/text/?' + encodeURIComponent('我的升學目標清單:\n' + url), '_blank', 'noopener,noreferrer');
    else if (kind === 'fb') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer,width=600,height=500');
    else return copy(url);
    return Promise.resolve(true);
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return Promise.resolve(false);
  }

  function snapshot() {
    return { c: st.channel, y: st.year, q: st.q, fz: st.fuzzy, l: st.logic, s: st.sort, v: st.view, hc: st.hideClosed, f: st.favOnly,
      r: activeRules().map(function (x) { return [x.field, x.op, x.v]; }) };
  }
  function restore(o) {
    st.q = o.q || ''; st.fuzzy = o.fz !== false; st.logic = o.l === 'any' ? 'any' : 'all'; st.sort = o.s || 'default';
    st.view = o.v === 'dept' ? 'dept' : 'school'; st.hideClosed = !!o.hc; st.favOnly = !!o.f; st.year = o.y || 'auto';
    st.rules = (o.r || []).filter(function (x) { return FIELDS[x[0]]; }).map(function (x) {
      if (x[0] === 'examMode' && x[1] !== 'only') {
        var nv = [];
        (x[2] || []).forEach(function (v) { (OLD_MODES[v] || (FIELDS.examMode.options.indexOf(v) >= 0 ? [v] : [])).forEach(function (y) { if (nv.indexOf(y) < 0) nv.push(y); }); });
        x = ['examMode', 'only', nv];
      }
      return { id: nextRule++, field: x[0], op: x[1], v: x[2] };
    });
    touch();
  }
  function saveSet(name) { saved.push({ name: name, state: snapshot() }); saveJson(SAVED_KEY, saved); }
  function removeSaved(i) { saved.splice(i, 1); saveJson(SAVED_KEY, saved); }
  function savedSets() { return saved.filter(function (x) { return x.state.c === st.channel; }); }

  function hash() { return '#s=' + encodeURIComponent(JSON.stringify(snapshot())); }
  function syncHash() { try { window.history.replaceState(null, '', hash()); } catch (e) { /* 舊瀏覽器 */ } }
  function readHash() {
    var m = /[#&]s=([^&]+)/.exec(window.location.hash);
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  }

  function shownFields() {
    var have = availableFields();
    var mine = customFields[st.channel] || DEFAULT_FIELDS[st.channel] || [];
    return mine.filter(function (k) { return have.indexOf(k) >= 0; });
  }
  /** 各管道預設的條件(不看使用者自訂;H 版沒有「自訂項目」,用這個,免得舊的自訂設定把條件藏起來)。 */
  function defaultShownFields() {
    var have = availableFields();
    return (DEFAULT_FIELDS[st.channel] || []).filter(function (k) { return have.indexOf(k) >= 0; });
  }
  function setShownFields(list) { customFields[st.channel] = list; saveJson(FIELDS_KEY, customFields); }

  // ---------- 條件編輯元件(C、D、E 版共用) ----------
  /** 比對方式切換鈕;只有一種方式時不顯示。 */
  function opButtons(rule) {
    var f = FIELDS[rule.field];
    if (f.ops.length < 2) return '';
    return '<div class="ed-ops" role="group" aria-label="比對方式">' + f.ops.map(function (o) {
      return '<button type="button" data-setop="' + o[0] + '" aria-pressed="' + (rule.op === o[0]) + '">' + OP_NAMES[o[0]] + '</button>';
    }).join('') + '</div>';
  }
  /** 值的輸入:複選有各選項的系組數,數字有常用值。data-rule 由外層提供。 */
  function valueEditor(rule, withCounts) {
    var f = FIELDS[rule.field], v = rule.v;
    if (f.type === 'multi') {
      var counts = withCounts ? facet(rule.field) : {};
      return '<div class="ed-pills">' + optionsFor(rule.field).map(function (o) {
        return '<button type="button" class="ed-pill" data-pill="' + esc(o) + '" aria-pressed="' + (v.indexOf(o) >= 0) + '">' + esc(o) +
          (withCounts ? '<small>' + Number(counts[o] || 0).toLocaleString('en-US') + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    }
    if (f.type === 'text') return '<input type="text" class="ed-input" data-text aria-label="' + esc(f.label) + '" placeholder="' + esc(f.placeholder || '') + '" value="' + esc(v) + '">';
    if (f.type === 'num') {
      var a = v.a === undefined ? '' : v.a, b = v.b === undefined ? '' : v.b;
      var pre = (f.presets || []).map(function (p) {
        return '<button type="button" class="ed-pill" data-numpreset="' + p + '" aria-pressed="' + (String(a) === String(p) && rule.op !== 'between') + '">' + (rule.field === 'years' ? '滿 ' + p + ' 年' : p + f.unit) + '</button>';
      }).join('');
      return '<div class="ed-pills">' + pre + '<span class="ed-num"><input type="number" min="0" data-num="a" aria-label="' + esc(f.label) + '" value="' + esc(a) + '">' +
        (rule.op === 'between' ? '<span>到</span><input type="number" min="0" data-num="b" aria-label="' + esc(f.label) + '上限" value="' + esc(b) + '">' : '') + '<span>' + f.unit + '</span></span></div>';
    }
    var d = function (k, label) { return '<input type="date" class="ed-input" data-date="' + k + '" aria-label="' + label + '" value="' + esc(v[k] || '') + '">'; };
    if (rule.op === 'endBy') return d('b', '截止日');
    if (rule.op === 'startFrom') return d('a', '開始日');
    return '<span class="ed-num">' + d('a', '起') + '<span>至</span>' + d('b', '迄') + '</span>';
  }
  /** 處理編輯元件的點擊;回傳 'render'(結構變了要重畫)、'refresh'(只要更新結果)或 null。 */
  function editorClick(rule, t) {
    var d = t.dataset;
    if (d.setop) { var was = rule.op; rule.op = d.setop; touch(); return (was === 'between') !== (d.setop === 'between') || /endBy|startFrom|overlap/.test(d.setop) ? 'render' : 'refresh'; }
    if (d.pill !== undefined) { var i = rule.v.indexOf(d.pill); if (i >= 0) rule.v.splice(i, 1); else rule.v.push(d.pill); touch(); return 'refresh'; }
    if (d.numpreset) {
      if (String(rule.v.a) === d.numpreset && rule.op !== 'between') rule.v = {};
      else { rule.v = { a: Number(d.numpreset) }; if (rule.op === 'between') rule.op = FIELDS[rule.field].ops[0][0]; }
      touch(); return 'render';
    }
    return null;
  }
  /** 處理編輯元件的輸入(文字、數字、日期)。 */
  function editorInput(rule, t) {
    var d = t.dataset;
    if (d.text !== undefined) rule.v = t.value;
    else if (d.num) rule.v[d.num] = t.value;
    else if (d.date) rule.v[d.date] = t.value;
    else return false;
    touch();
    return true;
  }
  /** 沒有值的規則移除(C、D、E 版編輯完自動清掉空條件)。 */
  function pruneEmpty() { st.rules = st.rules.filter(hasValue); touch(); }

  // ---------- 切換 ----------
  function setChannel(ch, keep) {
    st.channel = ch;
    if (!keep) { st.year = 'auto'; st.rules = st.rules.filter(function (x) { return ['status', 'period', 'ownership', 'kind', 'region', 'quota'].indexOf(x.field) >= 0; }); }
    return loadChannel();
  }
  function setYear(y) { st.year = y; return loadChannel(); }
  function channelStats() {
    return manifest.channels.map(function (c) {
      // 預設會補前一年度的學校,只看最新年度的校數會失真(在職專班 116 只有 1 校),所以列年度不列校數
      return { channel: c.channel, years: c.years.slice(0, 2).map(function (y) { return y.academic_year; }).join('、') + ' 學年度', hint: channelDef(c.channel).hint };
    });
  }
  function init(base) {
    api.base = base;
    // 單檔版切換 A、B 時不重新載入頁面,再次 init 就沿用目前條件
    var current = manifest ? snapshot() : null;
    return fetchJson(base + 'manifest.json').then(function (m) {
      manifest = m;
      channels = m.channels.map(function (c) { return c.channel; });
      var saved0 = current || readHash();
      if (saved0) restore(saved0);
      // 收到分享的收藏連結(?fav=,shareFav 產生):加入自己的收藏並只看收藏(沿用舊版前台的行為)
      var shared = '';
      try { shared = new URLSearchParams(window.location.search).get('fav') || ''; } catch (e) { shared = ''; }
      if (shared && !current) {
        shared.split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (id) { if (favorites.indexOf(id) < 0) favorites.push(id); });
        saveJson(FAV_KEY, favorites);
        st.favOnly = true;
      }
      var want = saved0 && saved0.c;
      if (!want) { try { want = new URLSearchParams(window.location.search).get('tab') || ''; } catch (e) { want = ''; } }
      st.channel = channels.filter(function (ch) { return ch === want || channelDef(ch).slug === want; })[0] || channels[0];
      return loadChannel();
    });
  }

  var api = {
    base: '', st: st, FIELDS: FIELDS, SORTS: SORTS, CONSULT_URL: CONSULT_URL, NOTE: NOTE, esc: esc, fmt: fmt, fmtShort: fmtShort,
    init: init, setChannel: setChannel, setYear: setYear, touch: touch, compute: compute, facet: facet, ruleHits: ruleHits,
    optionsFor: optionsFor, availableFields: availableFields, addRule: addRule, removeRule: removeRule, ruleOf: ruleOf, fieldRule: fieldRule,
    applyPreset: applyPreset, presets: presets, clearAll: clearAll, toggleValue: toggleValue, ruleText: ruleText, hasValue: hasValue, emptyValue: emptyValue,
    summary: summary, summaryLine: summaryLine, quotaParts: quotaParts, detail: detail, OP_NAMES: OP_NAMES,
    opButtons: opButtons, valueEditor: valueEditor, editorClick: editorClick, editorInput: editorInput, pruneEmpty: pruneEmpty, highlight: highlight, brochureUrl: brochureUrl, examQuota: examQuota,
    isFav: isFav, toggleFav: toggleFav, favCount: favCount, shareFav: shareFav, copy: copy,
    saveSet: saveSet, removeSaved: removeSaved, savedSets: savedSets, syncHash: syncHash, hash: hash, shownFields: shownFields, defaultShownFields: defaultShownFields, setShownFields: setShownFields,
    channelStats: channelStats, channelYears: function () { return channelYears(st.channel); },
    latestYear: function () { return latestYear; }, generatedAt: function () { return manifest.generated_at; }, activeRules: activeRules, statusOf: status,
    savedAll: function () { return saved; }, restore: restore
  };
  return api;
})();

  if (root.getAttribute('data-consult')) window.TBEngine.CONSULT_URL = root.getAttribute('data-consult');

/* J 版(2026-11-17,使用者:以「電腦手機版面3」的樣式為基底,加上其他版面的功能優點)
   外觀與架構取自版面 3:上方控制卡(管道膠囊、搜尋、報名狀態、排序、立即洽詢)、白底圓角比較表格、青綠主色、黑體。
   功能取自其他版:篩選條件與選項筆數(B/F,改成下拉式)、考試方式只考勾選項目與同時符合/符合任一(H)、報名狀態筆數(G)、
   依學校分組與學校標題(H)、依學校/依校系、收藏與分享收藏(H)、並排比較表(D/F)、原地展開(版面 3)、
   手機底部滑出詳情與底部操作列(版面 2)。程式由 I 版複製,改了版面骨架、管道、篩選下拉。 */
(function () {
  'use strict';
  var E = window.TBEngine, st = E.st, esc = E.esc;
  var app = window.TB_SITE_ROOT;
  var ui = { page: 1, open: {}, showAll: {}, fold: {}, picker: false, timer: null, pick: {}, pickOrder: [], cmpOpen: false, more: false, oldMany: false, openFacet: null };
  var MAX_CMP = 4;
  var ROWS_COLLAPSED = 6, DEPTS_PER_PAGE = 30, SCHOOLS_PER_PAGE = 10;
  var RIBBON = ['報名中', '3 天內截止', '尚未開始', '已截止'];

  function el(id) { return document.getElementById(id); }
  function num(n) { return Number(n).toLocaleString('en-US'); }
  function toast(t) {
    var d = document.createElement('div'); d.className = 'b-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    app.appendChild(d); setTimeout(function () { d.remove(); }, 2200);
  }
  function opt(v, t, cur) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>'; }

  app.innerHTML =
    '<div class="j">' +
      // 上方控制卡(版面 3):管道膠囊 → 搜尋、報名狀態(含筆數)、排序、收藏、立即洽詢 → 篩選條件(下拉式,含選項筆數)
      '<header class="j-control">' +
        '<nav class="j-channels" id="tb-channels" role="tablist" aria-label="招生管道"></nav>' +
        '<div class="j-toolbar"><div class="b-search"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.5" y2="16.5"></line></svg>' +
          '<label class="sr" for="tb-q">搜尋校名、系名或考科</label><input type="search" id="tb-q" placeholder="搜尋校名、系名或考科(例如:清大、資工、書審)" autocomplete="off"></div>' +
          '<div class="j-status" id="tb-ribbon" role="group" aria-label="依報名狀態篩選"></div>' +
          '<button type="button" class="f-favlink" id="tb-favOnly" aria-pressed="false">★ 收藏 <span id="tb-favN">0</span></button>' +
          '<a class="b-consult" href="' + esc(E.CONSULT_URL) + '" target="_blank" rel="noopener noreferrer">立即洽詢書審口試</a></div>' +
        '<div class="j-filters" id="tb-side" aria-label="篩選條件"><div class="j-filters-head"><b>篩選</b><div class="b-logic" role="group" aria-label="條件之間的關係" id="tb-logic"></div></div>' +
          '<div id="tb-picker"></div><div class="j-facets" id="tb-facets"></div>' +
          '<div class="b-side-foot"><button type="button" id="tb-closeSide"></button></div></div>' +
      '</header>' +
      // 依學校 / 依校系、已套用的條件、分享收藏、排序(使用者 2026-11-17:排序從控制卡移到這一行右邊)
      '<div class="j-subbar"><div class="h-seg" id="tb-viewSeg" role="group" aria-label="顯示方式"></div><div class="b-applied" id="tb-applied" hidden></div><div class="h-favshare" id="tb-favShare"></div><div class="j-sort" id="tb-bar"></div></div>' +
      '<main class="j-matrix" aria-label="招生系組"><div id="tb-list"></div></main>' +
      '<nav class="b-pager" id="tb-pager" aria-label="分頁"></nav>' +
      '<p class="b-note">提醒:' + esc(E.NOTE) + '</p>' +
      '<div id="tb-mobileCh" hidden></div><button type="button" id="tb-openSide" hidden></button>' +
    '</div><div id="tb-tray"></div><div id="tb-cmp"></div><div id="tb-sheet"></div>' +
    // 手機底部固定操作列(取自版面 2)
    '<div class="i-bottombar"><button type="button" id="tb-openSide2">篩選條件</button><a href="' + esc(E.CONSULT_URL) + '" target="_blank" rel="noopener noreferrer">立即洽詢書審口試</a></div>';

  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }

  // ---------- 側欄 ----------
  // 管道只留名稱(使用者 2026-11-09 拿掉年度):暑轉、寒轉寫全名,其他沿用管道名稱
  var CH_LABEL = { '暑轉': '大學暑假轉學考', '寒轉': '大學寒假轉學考' };
  function renderChannels() {
    var stats = E.channelStats();
    el('tb-channels').innerHTML = stats.map(function (c) {
      // J 版:版面 3 的管道膠囊(全名,不顯示年度)
      return '<button type="button" class="j-ch" role="tab" aria-selected="' + (c.channel === st.channel) + '" data-ch="' + esc(c.channel) + '" title="' + esc(c.hint) + '">' + esc(CH_LABEL[c.channel] || c.channel) + '</button>';
    }).join('');
    el('tb-mobileCh').innerHTML = stats.map(function (c) {
      return '<button type="button" role="tab" aria-selected="' + (c.channel === st.channel) + '" data-ch="' + esc(c.channel) + '">' + esc(c.channel) + '</button>';
    }).join('');
  }

  // 報名狀態在主區的計數磚,不重複放側欄
  // H 版沒有「自訂項目」:一律用各管道預設條件,不讀以前存的自訂設定
  function facetKeys() { return E.defaultShownFields().filter(function (k) { return k !== 'status'; }); }

  // J 版沒有「自訂項目」:篩選條件一律用各管道預設
  function renderPicker() { el('tb-picker').innerHTML = ''; }

  function modeHtml(key, rule) {
    // 不提供「排除 / 不包含」(使用者 2026-11-18:沒勾就代表不要,排除多此一舉)
    var ops = E.FIELDS[key].ops.filter(function (o) { return o[0] !== 'not' && o[0] !== 'hasNot'; });
    if (ops.length < 2) return '';
    var names = { any: '包含', all: '同時符合', has: '包含', gte: '至少', lte: '不超過', between: '介於', overlap: '重疊', endBy: '截止前', startFrom: '開始後' };
    return '<div class="b-mode" data-mode="' + key + '"' + (rule ? '' : ' hidden') + '>' + ops.map(function (o) {
      return '<button type="button" data-setop="' + o[0] + '" aria-pressed="' + (!!rule && rule.op === o[0]) + '">' + names[o[0]] + '</button>';
    }).join('') + '</div>';
  }

  function facetBody(key) {
    var f = E.FIELDS[key], rule = E.fieldRule(key), v = rule ? rule.v : E.emptyValue(key);
    if (f.type === 'multi') {
      // 選項 5 個以內(地區除外)做成膠囊按鈕,數字滑鼠移上才看得到;選項多的維持勾選清單
      var opts = E.optionsFor(key), chips = opts.length <= 5 && key !== 'region';
      return '<div class="h-opts' + (chips ? ' is-chips' : '') + '">' + opts.map(function (o) {
        return '<label class="b-check" data-opt="' + esc(o) + '"><input type="checkbox" data-val="' + esc(o) + '"' + (v.indexOf(o) >= 0 ? ' checked' : '') + '><span>' + esc(o) + '</span><em data-count></em></label>';
      }).join('') + '</div>' + modeHtml(key, rule);
    }
    if (f.type === 'text') return '<div class="b-input"><input type="text" data-text="' + key + '" aria-label="' + esc(f.label) + '" placeholder="' + esc(f.placeholder || '') + '" value="' + esc(v) + '"></div>' + modeHtml(key, rule);
    if (f.type === 'num') {
      var a = v.a === undefined ? '' : v.a, b = v.b === undefined ? '' : v.b;
      return '<div class="b-chips">' + (f.presets || []).map(function (p) {
        return '<button type="button" class="b-chip-opt" data-preset="' + p + '" aria-pressed="' + (String(a) === String(p) && (!rule || rule.op !== 'between')) + '">' + (key === 'years' ? '滿 ' + p + ' 年' : p + (f.unit === '%' ? '%' : ' 名')) + '</button>';
      }).join('') + '</div><div class="b-input"><input type="number" min="0" data-num="a" data-key="' + key + '" aria-label="' + esc(f.label) + '" value="' + esc(a) + '">' +
        (rule && rule.op === 'between' ? '<span>到</span><input type="number" min="0" data-num="b" data-key="' + key + '" aria-label="' + esc(f.label) + '上限" value="' + esc(b) + '">' : '') + '<span>' + f.unit + '</span></div>' + modeHtml(key, rule);
    }
    return '<div class="b-input"><input type="date" data-date="a" data-key="' + key + '" aria-label="起" value="' + esc(v.a || '') + '"><span>至</span><input type="date" data-date="b" data-key="' + key + '" aria-label="迄" value="' + esc(v.b || '') + '"></div>' + modeHtml(key, rule);
  }

  function renderFacets() {
    el('tb-logic').innerHTML = '<button type="button" data-logic="all" aria-pressed="' + (st.logic === 'all') + '">同時符合全部</button><button type="button" data-logic="any" aria-pressed="' + (st.logic === 'any') + '">符合任一</button>';
    // 有條件但欄位沒顯示(A 版帶過來、或自訂時關掉)也要列出,才改得到
    var keys = facetKeys();
    st.rules.forEach(function (r) { if (r.field !== 'status' && keys.indexOf(r.field) < 0) keys.push(r.field); });
    el('tb-facets').innerHTML = keys.map(function (k, i) {
      // J 版:篩選條件是下拉選單,一次只開一個(手機的篩選面板由 CSS 全部展開)
      var open = ui.openFacet === k;
      return '<section class="b-facet" data-facet="' + k + '"><button type="button" class="b-facet-head" data-fold="' + k + '" aria-expanded="' + open + '"><span>' + esc(E.FIELDS[k].label) + '<span class="b-facet-badge" data-badge hidden></span></span><i aria-hidden="true">›</i></button>' +
        '<div class="b-facet-body"' + (open ? '' : ' hidden') + '>' + facetBody(k) + '</div></section>';
    }).join('');
    syncFacets();
  }

  /** 計數與勾選狀態就地更新,不重畫,鍵盤焦點才不會跑掉。 */
  function syncFacets() {
    app.querySelectorAll('[data-facet]').forEach(function (box) {
      var key = box.dataset.facet, f = E.FIELDS[key], rule = E.fieldRule(key);
      var badge = box.querySelector('[data-badge]');
      var n = rule && E.hasValue(rule) ? (f.type === 'multi' ? rule.v.length : 1) : 0;
      badge.hidden = !n; badge.textContent = n;
      box.classList.toggle('is-not', !!rule && rule.op === 'not');
      var mode = box.querySelector('[data-mode]');
      if (mode) {
        mode.hidden = !rule;
        mode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', !!rule && rule.op === b.dataset.setop); });
      }
      if (f.type !== 'multi') return;
      var counts = E.facet(key);
      box.querySelectorAll('[data-opt]').forEach(function (l) {
        var c = counts[l.dataset.opt] || 0;
        l.querySelector('[data-count]').textContent = num(c);
        l.title = num(c) + ' 個系組';
        l.classList.toggle('is-empty', !c);
      });
    });
  }

  // ---------- 主區 ----------
  function renderRibbon() {
    var counts = E.facet('status'), res = E.compute(), rule = E.fieldRule('status');
    var total = 0, seen = {};
    // 「全部」= 不看狀態條件時的系組數
    var saved = st.rules; st.rules = st.rules.filter(function (r) { return r.field !== 'status'; }); E.touch();
    total = E.compute().depts.length;
    st.rules = saved; E.touch(); res = E.compute();
    var tile = function (k, label, n, on) { return '<button type="button" class="b-tile g-tab' + (n ? '' : ' is-zero') + '" data-status="' + esc(k) + '" data-k="' + esc(label) + '" aria-pressed="' + on + '"><span>' + esc(label) + '</span> <b>' + num(n) + '</b></button>'; };
    el('tb-ribbon').innerHTML = tile('', '全部', total, !rule || !rule.v.length) + RIBBON.map(function (k) {
      return tile(k, k, counts[k] || 0, !!rule && rule.op === 'any' && rule.v.indexOf(k) >= 0);
    }).join('');
    return res;
  }

  function renderApplied() {
    var box = el('tb-applied'), list = E.activeRules();
    var chips = [];
    if (st.q.trim()) chips.push({ t: '關鍵字:' + st.q.trim(), k: 'q' });
    list.forEach(function (r) { chips.push({ t: E.ruleText(r), k: 'rule', id: r.id, not: r.op === 'not' || r.op === 'hasNot' }); });
    if (st.favOnly) chips.push({ t: '只看收藏', k: 'fav' });
    box.hidden = !chips.length;
    box.innerHTML = chips.map(function (c, i) {
      return (i && st.logic === 'any' && c.k === 'rule' && chips[i - 1].k === 'rule' ? '<span class="b-join">或</span>' : '') +
        '<span class="b-tag' + (c.not ? ' is-not' : '') + '">' + esc(c.t) + '<button type="button" data-rm="' + i + '" aria-label="移除條件 ' + esc(c.t) + '">×</button></span>';
    }).join('') + '<button type="button" class="b-ghost" id="tb-clear">全部清除</button>';
    box._chips = chips;
  }

  function renderBar(res) {
    var isDept = st.view === 'dept';
    // 系組數已在狀態分頁,校數也不顯示;狀態列右邊只留排序
    el('tb-bar').innerHTML = '<div class="b-bar-right"><label class="g-sort">排序 <select id="tb-sort">' + E.SORTS.map(function (s) { return opt(s[0], s[1], st.sort); }).join('') + '</select></label></div>';
    el('tb-viewSeg').innerHTML = '<button type="button" data-view="school" aria-pressed="' + !isDept + '">依學校</button><button type="button" data-view="dept" aria-pressed="' + isDept + '">依校系</button>';
    el('tb-favOnly').setAttribute('aria-pressed', st.favOnly);
    el('tb-favN').textContent = E.favCount();
    el('tb-openSide').textContent = el('tb-openSide2').textContent = '篩選條件' + (E.activeRules().length ? '(' + E.activeRules().length + ')' : '');
    el('tb-closeSide').textContent = '查看 ' + num(res.depts.length) + ' 個系組';
  }

  // 收藏分享:一直顯示(使用者 2026-11-09,取代「更多選項」);還沒收藏時按下去提示先收藏
  function renderSaves() {
    if (el('tb-favShare').innerHTML) return;
    el('tb-favShare').innerHTML = '<span>分享收藏</span><button type="button" class="b-link" data-share="copy">複製連結</button><button type="button" class="b-link" data-share="line">LINE</button><button type="button" class="b-link" data-share="fb">Facebook</button>';
  }

  function track(g) {
    var a = E.statusOf(g.start, g.end), s = String(g.start), e = String(g.end);
    if (s.length !== 8 || e.length !== 8) return '';
    var d = function (x) { return new Date(+x.slice(0, 4), +x.slice(4, 6) - 1, +x.slice(6, 8)); };
    var now = new Date(), span = Math.max(1, d(e) - d(s));
    var pct = a.key === 'closed' ? 100 : a.key === 'soon' ? 0 : Math.min(100, Math.max(3, (now - d(s)) / span * 100));
    return '<div class="b-track f-line ' + (a.key === 'urgent' ? 'is-urgent' : a.key === 'closed' ? 'is-closed' : '') + '" role="img" aria-label="報名期間已過 ' + Math.round(pct) + '%"><span style="width:' + pct + '%"></span></div>';
  }

  // ---------- 比較表格的一列(版面 3) ----------
  function quotaHtml(d) {
    var parts = E.quotaParts(d), main = parts.filter(function (p) { return p.main; }), extra = parts.filter(function (p) { return !p.main; });
    return (main.length ? '<b>' + esc(main.map(function (p) { return p.quota; }).join('+')) + '</b><small> 名</small>' : '<small>–</small>') +
      extra.map(function (p) { return '<em>' + esc(p.identity + ' ' + p.quota) + '</em>'; }).join('') +
      // D192:研究所一般生名額含甄試名額(成大),名額照簡章、旁邊註明
      (E.examQuota(d) ? '<em title="名額含研究所甄試名額 ' + E.examQuota(d) + ' 名;甄試缺額會流用回一般生">含甄試 ' + E.examQuota(d) + '</em>' : '');
  }
  function cmpBtn(d, cls) {
    var on = !!ui.pick[d.key], full = !on && ui.pickOrder.length >= MAX_CMP;
    return '<button type="button" class="i-cmp ' + (cls || '') + '" data-cmpbtn="' + esc(d.key) + '" aria-pressed="' + on + '"' + (full ? ' title="最多比較 ' + MAX_CMP + ' 個系組"' : '') +
      ' aria-label="' + (on ? '取消比較 ' : '加入比較 ') + esc(d.g.school + ' ' + d.dept) + '">' + (on ? '✓ 比較中' : '+ 比較') + '</button>';
  }
  function favBtn(d, withText) {
    var fav = E.isFav(d);
    return '<button type="button" class="b-star i-fav" data-fav="' + esc(d.ids.join(',')) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? '取消收藏 ' : '收藏 ') + esc(d.g.school + ' ' + d.dept) + '">' +
      (fav ? '★' : '☆') + (withText ? (fav ? ' 已收藏' : ' 收藏') : '') + '</button>';
  }
  function detailDl(info) { return '<dl>' + info.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>'; }

  function deptHtml(d, showSchool) {
    var g = d.g;
    var info = E.detail(d, { quota: true, summaryMax: 70 }), open = !!ui.open[d.key] && info.length > 0;
    var exam = E.summaryLine(d, 80).text;
    // D189:聯招(台聯大)標在系名後面;報名日期和學校卡片不同時,列在年級後面
    var jointWhen = d.joint && !g.fallback && (d.start !== g.start || d.end !== g.end) ? '聯招報名 ' + E.fmtShort(d.start) + ' – ' + E.fmtShort(d.end) : '';
    var sub = [d.grade, jointWhen].filter(Boolean).map(esc).join(' · ') + (!g.fallback && d.rows.some(function (r) { return r.isNew === 1; }) ? '<span class="f-new">新增</span>' : '');
    // 整列可點:電腦原地展開資格與備註,手機從底部滑出詳情;比較、收藏按鈕在最右欄
    return '<li class="b-dept i-row' + (ui.pick[d.key] ? ' is-picked' : '') + (open ? ' is-open' : '') + '">' +
      '<div class="i-grid"' + (info.length ? ' data-open="' + esc(d.key) + '" role="button" tabindex="0" aria-expanded="' + open + '"' : '') + '>' +
        '<div class="i-c-dept">' +
          (showSchool ? '<span class="b-dept-school">' + E.highlight(g.school) + (g.joint ? ' · ' + esc(g.joint) : '') + ' · ' + esc(g.status.text) + '</span>' : '') +
          '<span class="b-dept-name">' + E.highlight(d.dept) + (d.group ? ' <span class="g-group">' + E.highlight(d.group) + '</span>' : '') +
            (d.joint ? '<span class="b-joint" title="' + esc(d.jointName || d.joint) + '">' + esc(d.joint) + '</span>' : '') + '</span>' +
          (sub ? '<span class="i-sub">' + sub + '</span>' : '') + '</div>' +
        // 不放「筆試/書審」等考試方式標籤(使用者 2026-11-17:多餘,且關鍵字判斷會誤標,例如「選項1…」被標成書審);配分摘要已寫明
        '<div class="i-c-exam">' +
          (exam ? '<span class="i-exam">' + E.highlight(exam) + '</span>' : '') + '</div>' +
        '<div class="i-c-quota b-q">' + quotaHtml(d) + '</div>' +
        '<div class="i-c-act">' + cmpBtn(d) + favBtn(d) + '</div>' +
      '</div>' +
      (open ? '<div class="b-detail i-detail">' + detailDl(info) + '</div>' : '') + '</li>';
  }

  // ---------- 手機:底部滑出詳情(取自版面 2) ----------
  function renderSheet() {
    var box = el('tb-sheet');
    var d = ui.sheet && E.compute().depts.filter(function (x) { return x.key === ui.sheet; })[0];
    if (!d) { ui.sheet = null; box.innerHTML = ''; document.documentElement.classList.remove('i-noscroll'); return; }
    // 名額已在上方大字顯示,詳情不再重複
    var g = d.g, url = E.brochureUrl(g), info = E.detail(d, { quota: true }).filter(function (p) { return p[0] !== '名額'; });
    document.documentElement.classList.add('i-noscroll');
    box.innerHTML = '<div class="i-sheet" role="dialog" aria-modal="true" aria-labelledby="tb-sheetTitle"><div class="i-sheet-box">' +
      '<div class="i-sheet-head"><div><div class="i-sheet-school">' + esc([g.school, g.type, g.region].filter(Boolean).join(' · ')) + '</div>' +
        '<h2 id="tb-sheetTitle">' + esc(d.dept) + (d.group ? ' <span class="g-group">' + esc(d.group) + '</span>' : '') + '</h2>' +
        '<div class="i-sheet-when"><span class="b-badge t-' + g.status.key + '">' + esc(g.status.text) + '</span>' + (g.fallback ? '' : '<span class="b-when-date">' + E.fmtShort(g.start) + ' – ' + E.fmtShort(g.end) + '</span>') + '</div></div>' +
        '<button type="button" class="i-sheet-close" id="tb-sheetClose">關閉</button></div>' +
      '<div class="i-sheet-quota"><span>' + esc(d.grade || '') + '</span><span class="b-q">' + quotaHtml(d) + '</span></div>' +
      '<div class="i-sheet-body">' + detailDl(info) + '</div>' +
      '<div class="i-sheet-act">' + favBtn(d, true) + cmpBtn(d) + (url ? '<a class="g-dl" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">簡章下載</a>' : '') + '</div>' +
      '</div></div>';
  }
  function closeSheet() { ui.sheet = null; renderSheet(); }

  // ---------- 並排比較(取自 D 版) ----------
  function pickHtml(d) {
    var on = !!ui.pick[d.key], full = !on && ui.pickOrder.length >= MAX_CMP;
    return '<label class="f-pick" title="' + (full ? '最多比較 ' + MAX_CMP + ' 個系組' : '勾選後並排比較') + '"><input type="checkbox" data-cmp="' + esc(d.key) + '"' + (on ? ' checked' : '') + (full ? ' disabled' : '') +
      '><span class="sr">加入比較 ' + esc(d.g.school + ' ' + d.dept) + '</span></label>';
  }

  function cmpRows(ds) {
    var labels = [];
    ds.forEach(function (d) { E.detail(d).forEach(function (p) { if (labels.indexOf(p[0]) < 0) labels.push(p[0]); }); });
    var rows = [
      ['報名期間', function (d) { return d.g.fallback ? '前一年資料(' + d.g.year + ' 學年度)' : E.fmt(d.g.start) + ' – ' + E.fmt(d.g.end) + '\n' + d.g.status.text; }],
      ['年級', function (d) { return d.grade || '–'; }],
      ['名額', function (d) { return E.quotaParts(d).map(function (p) { return p.identity + ' ' + p.quota + ' 名'; }).join('\n') || '–'; }]
    ].concat(labels.map(function (l) {
      return [l, function (d) { var p = E.detail(d).filter(function (x) { return x[0] === l; })[0]; return p ? p[1] : '–'; }];
    }));
    return rows.map(function (r) {
      var vals = ds.map(r[1]);
      var diff = ds.length > 1 && vals.some(function (v) { return v !== vals[0]; });
      return '<tr' + (diff ? ' class="is-diff"' : '') + '><th scope="row">' + esc(r[0]) + '</th>' + vals.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
    }).join('');
  }

  function renderTray() {
    var ds = ui.pickOrder.map(function (k) { return ui.pick[k]; }), n = ds.length;
    el('tb-tray').innerHTML = n ? '<div class="f-tray" role="region" aria-label="比較清單"><span>已選 <b>' + n + '</b> / ' + MAX_CMP + '</span><span class="f-tray-names">' +
      esc(ds.map(function (d) { return d.g.school + ' ' + d.dept; }).join('、')) + '</span>' +
      '<button type="button" id="tb-cmpOpen"' + (n < 2 ? ' disabled title="至少選 2 個系組"' : '') + '>並排比較</button><button type="button" id="tb-cmpClear">清空</button></div>' : '';
    if (!ui.cmpOpen || n < 2) { el('tb-cmp').innerHTML = ''; ui.cmpOpen = ui.cmpOpen && n >= 2; return; }
    el('tb-cmp').innerHTML = '<div class="f-cmp" role="dialog" aria-modal="true" aria-labelledby="tb-cmpTitle"><div class="f-cmp-box">' +
      '<div class="f-cmp-head"><div><h2 id="tb-cmpTitle">並排比較</h2><p>不同的地方以底色標出。</p></div><button type="button" class="f-cmp-close" id="tb-cmpClose">關閉</button></div>' +
      '<div class="f-cmp-scroll"><table><thead><tr><th></th>' + ds.map(function (d) {
        return '<th scope="col">' + esc(d.dept) + '<small>' + esc(d.g.school + (d.g.joint ? ' · ' + d.g.joint : '')) + '</small><button type="button" class="f-cmp-rm" data-uncmp="' + esc(d.key) + '">移除</button></th>';
      }).join('') + '</tr></thead><tbody>' + cmpRows(ds) + '</tbody></table></div>' +
      '<p class="f-cmp-legend"><span></span>各系組不同的項目</p></div></div>';
  }

  function setPick(key, on) {
    if (on) {
      if (ui.pick[key] || ui.pickOrder.length >= MAX_CMP) return;
      var d = E.compute().depts.filter(function (x) { return x.key === key; })[0];
      if (!d) return;
      ui.pick[key] = d; ui.pickOrder.push(key);
    } else {
      delete ui.pick[key];
      ui.pickOrder = ui.pickOrder.filter(function (k) { return k !== key; });
    }
  }

  // 系組依年級分段(引擎已依年級排好):同校有兩個以上年級時,每個年級加小標題,
  // 收合時每個年級各露出 ROWS_PER_GRADE 個,各自有置中的「展開」按鈕(使用者 2026-11-17);只有一個年級時露出 ROWS_COLLAPSED 個
  var ROWS_PER_GRADE = 3;
  function moreBtn(key, open, left, what) {
    return '<li class="j-more-li"><button type="button" class="b-more j-more" data-all="' + esc(key) + '" aria-expanded="' + open + '">' +
      (open ? '收合' + what : '展開其餘 ' + left + ' 個' + what + '系組') + ' <i aria-hidden="true">' + (open ? '▴' : '▾') + '</i></button></li>';
  }
  function gradeRows(f) {
    var order = [], by = {};
    f.depts.forEach(function (d) { var k = d.grade || ''; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(d); });
    if (order.length < 2) {
      var all = !!ui.showAll[f.g.key], ds = f.depts;
      return (all ? ds : ds.slice(0, ROWS_COLLAPSED)).map(function (d) { return deptHtml(d, false); }).join('') +
        (ds.length > ROWS_COLLAPSED ? moreBtn(f.g.key, all, ds.length - ROWS_COLLAPSED, '') : '');
    }
    return order.map(function (k) {
      var key = f.g.key + '|' + k, open = !!ui.showAll[key], ds = by[k], name = k || '不分年級';
      return '<li class="j-grade" aria-hidden="true">' + esc(name) + '<small>' + ds.length + ' 個系組</small></li>' +
        (open ? ds : ds.slice(0, ROWS_PER_GRADE)).map(function (d) { return deptHtml(d, false); }).join('') +
        (ds.length > ROWS_PER_GRADE ? moreBtn(key, open, ds.length - ROWS_PER_GRADE, name) : '');
    }).join('');
  }

  function cardHtml(f) {
    var g = f.g, url = E.brochureUrl(g);
    var hidden = g.rows.length - f.rows.length;
    var live = g.status.key === 'open' || g.status.key === 'urgent';
    // 校名前面直疊「公私立 / 地區」兩行小字,高度等於校名;簡章下載放在報名日期後面(使用者 2026-11-09)
    // 前一年資料的學校,報名狀態欄本身就寫「114 學年度資料」,不再另標
    var tr = [g.type, g.region].filter(Boolean);
    return '<article class="b-card"><header class="b-card-head"><div class="g-school">' +
      (tr.length ? '<span class="g-tr">' + tr.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</span>' : '') +
      '<h3>' + E.highlight(g.school) + (g.joint ? '<span class="b-joint" title="' + esc(g.jointName || g.joint) + '">' + esc(g.joint) + '</span>' : '') + '</h3></div>' +
      '<div class="f-when"><span class="b-badge t-' + g.status.key + '">' + esc(g.status.text) + '</span>' + (g.fallback ? '' : '<span class="b-when-date">' + E.fmtShort(g.start) + ' – ' + E.fmtShort(g.end) + '</span>') +
      (url ? '<a class="g-dl" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="下載 ' + esc(g.school) + ' 簡章(另開新視窗)">簡章下載</a>' : '') + (live && !g.fallback ? track(g) : '') + '</div>' +
      '</header>' +
      '<ul class="b-depts">' + gradeRows(f) + '</ul>' +
      (hidden > 0 ? '<p class="b-hidden">此校另有不符合條件的資料 ' + hidden + ' 筆</p>' : '') + '</article>';
  }

  function renderList(res) {
    var list = el('tb-list'), isDept = st.view === 'dept';
    var total = isDept ? res.depts.length : res.groups.length, size = isDept ? DEPTS_PER_PAGE : SCHOOLS_PER_PAGE;
    var pages = Math.max(1, Math.ceil(total / size));
    if (ui.page > pages) ui.page = pages;
    if (!res.depts.length) {
      list.innerHTML = '<div class="b-empty"><h3>沒有符合的系組</h3><p>左邊數字是 0 的選項不會有結果。試著取消一個條件,或改成「符合任一」。</p><a href="' + esc(E.CONSULT_URL) + '" target="_blank" rel="noopener noreferrer">找不到想報考的校系?由顧問為您查詢</a></div>';
      el('tb-pager').innerHTML = '';
      return;
    }
    var from = (ui.page - 1) * size;
    // 表頭只放一次(版面 3 的欄位名稱);手機版隱藏
    var thead = '<div class="i-thead" aria-hidden="true"><span>系組 / 年級</span><span>考試方式與配分</span><span class="i-th-q">名額</span><span></span></div>';
    list.innerHTML = thead + (isDept
      ? '<article class="b-card"><ul class="b-depts" style="border-top:0">' + res.depts.slice(from, from + size).map(function (d) { return deptHtml(d, true); }).join('') + '</ul></article>'
      : res.groups.slice(from, from + size).map(cardHtml).join(''));
    var p = ui.page, start = Math.max(1, Math.min(p - 2, pages - 4)), end = Math.min(pages, start + 4), html = '';
    if (pages > 1) {
      var btn = function (n) { return '<button type="button" data-page="' + n + '"' + (n === p ? ' aria-current="page"' : '') + '>' + n + '</button>'; };
      html += '<button type="button" data-page="' + (p - 1) + '"' + (p === 1 ? ' disabled' : '') + '>上一頁</button>';
      if (start > 1) html += btn(1) + (start > 2 ? '…' : '');
      for (var i = start; i <= end; i++) html += btn(i);
      if (end < pages) html += (end < pages - 1 ? '…' : '') + btn(pages);
      html += '<button type="button" data-page="' + (p + 1) + '"' + (p === pages ? ' disabled' : '') + '>下一頁</button>';
    }
    el('tb-pager').innerHTML = html;
  }

  function refresh(keepPage) {
    E.touch();
    if (!keepPage) ui.page = 1;
    var res = renderRibbon();
    renderApplied();
    renderBar(res);
    renderSaves();
    renderList(res);
    renderTray();
    if (ui.sheet) renderSheet();
    syncFacets();
    E.syncHash();
  }
  function full() { renderChannels(); renderPicker(); renderFacets(); refresh(); }
  function later() { clearTimeout(ui.timer); ui.timer = setTimeout(refresh, 220); }

  function numRule(key) { return E.fieldRule(key) || E.addRule(key); }

  // ---------- 事件 ----------
  app.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('i-sheet')) return closeSheet();
    var t = e.target.closest('button, [data-open]');
    if (!t) return;
    var d = t.dataset, facet = t.closest('[data-facet]'), key = facet ? facet.dataset.facet : '';
    if (d.ch) { if (d.ch !== st.channel) { ui.open = {}; ui.showAll = {}; ui.fold = {}; ui.openFacet = null; E.setChannel(d.ch).then(full); } return; }
    if (d.fold) { ui.openFacet = ui.openFacet === d.fold ? null : d.fold; return syncDropdowns(); }
    if (d.setop) {
      var rule0 = E.fieldRule(key);
      rule0.op = d.setop;
      if (d.setop === 'between') renderFacets();
      return refresh();
    }
    if (d.preset) {
      var r = numRule(key);
      if (r.v.a !== undefined && String(r.v.a) === d.preset && r.op !== 'between') E.removeRule(r.id);
      else { r.v = { a: Number(d.preset) }; if (r.op === 'between') r.op = E.FIELDS[key].ops[0][0]; }
      renderFacets();
      return refresh();
    }
    if (d.logic) { st.logic = d.logic; renderFacets(); return refresh(); }
    if (d.status !== undefined) {
      var sr = E.fieldRule('status');
      if (!d.status) { if (sr) E.removeRule(sr.id); }
      else if (sr && sr.op === 'any' && sr.v.length === 1 && sr.v[0] === d.status) E.removeRule(sr.id);
      else if (sr) { sr.op = 'any'; sr.v = [d.status]; }
      else E.addRule('status', 'any', [d.status]);
      return refresh();
    }
    if (d.rm !== undefined) {
      var c = el('tb-applied')._chips[+d.rm];
      if (c.k === 'q') { st.q = ''; el('tb-q').value = ''; }
      if (c.k === 'rule') E.removeRule(c.id);
      if (c.k === 'fav') st.favOnly = false;
      renderFacets();
      return refresh();
    }
    if (d.view) { st.view = d.view; return refresh(); }
    if (d.page) { ui.page = +d.page; refresh(true); return el('tb-bar').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (d.open) {
      if (isMobile()) { ui.sheet = d.open; renderSheet(); var c1 = el('tb-sheetClose'); if (c1) c1.focus(); return; }
      ui.open[d.open] = !ui.open[d.open]; return refresh(true);
    }
    if (d.cmpbtn) {
      if (!ui.pick[d.cmpbtn] && ui.pickOrder.length >= MAX_CMP) return toast('最多比較 ' + MAX_CMP + ' 個系組');
      setPick(d.cmpbtn, !ui.pick[d.cmpbtn]);
      return refresh(true);
    }
    if (t.id === 'tb-sheetClose') return closeSheet();
    if (t.id === 'tb-openSide2') { el('tb-side').classList.add('is-open'); return; }
    if (d.all) { ui.showAll[d.all] = !ui.showAll[d.all]; return refresh(true); }
    if (d.fav) { E.toggleFav(d.fav.split(',')); return refresh(true); }
    if (d.share) {
      if (!E.favCount()) return toast('先按系組旁的 ☆ 收藏,再分享');
      var done = E.shareFav(d.share);
      if (done && done.then && d.share === 'copy') done.then(function (ok) { toast(ok ? '已複製收藏連結' : '瀏覽器不允許複製'); });
      return;
    }
    if (t.id === 'tb-cmpOpen') { ui.cmpOpen = true; renderTray(); var c0 = el('tb-cmpClose'); if (c0) c0.focus(); return; }
    if (t.id === 'tb-cmpClose') { ui.cmpOpen = false; return renderTray(); }
    if (t.id === 'tb-cmpClear') { ui.pick = {}; ui.pickOrder = []; ui.cmpOpen = false; return refresh(true); }
    if (d.uncmp) { setPick(d.uncmp, false); return refresh(true); }
    if (t.id === 'tb-openSide') { el('tb-side').classList.add('is-open'); return; }
    if (t.id === 'tb-closeSide') { el('tb-side').classList.remove('is-open'); return; }
    if (t.id === 'tb-favOnly') { st.favOnly = !st.favOnly; return refresh(); }
    if (t.id === 'tb-clear') { E.clearAll(); el('tb-q').value = ''; renderFacets(); return refresh(); }
  });

  app.addEventListener('change', function (e) {
    var t = e.target, facet = t.closest('[data-facet]');
    if (t.dataset.val !== undefined) {
      E.toggleValue(facet.dataset.facet, t.dataset.val);
      return refresh();
    }
    if (t.id === 'tb-sort') { st.sort = t.value; return refresh(); }
  });

  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'tb-q') { st.q = t.value; return later(); }
    if (t.dataset.text) {
      var tr = t.value.trim() ? E.fieldRule(t.dataset.text) || E.addRule(t.dataset.text) : E.fieldRule(t.dataset.text);
      if (tr) { tr.v = t.value; if (!t.value.trim()) E.removeRule(tr.id); }
      return later();
    }
    if (t.dataset.num) {
      var nr = numRule(t.dataset.key);
      nr.v[t.dataset.num] = t.value;
      if (!E.hasValue(nr)) E.removeRule(nr.id);
      return later();
    }
    if (t.dataset.date) {
      var dr = E.fieldRule(t.dataset.key) || E.addRule(t.dataset.key);
      dr.v[t.dataset.date] = t.value;
      if (!E.hasValue(dr)) E.removeRule(dr.id);
      return later();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet) return closeSheet();
    if (e.key === 'Escape' && ui.cmpOpen) { ui.cmpOpen = false; renderTray(); }
  });
  // 篩選下拉:一次只開一個;點外面或按 Esc 收起
  function syncDropdowns() {
    app.querySelectorAll('[data-fold]').forEach(function (b) {
      var on = b.dataset.fold === ui.openFacet;
      b.setAttribute('aria-expanded', on);
      b.nextElementSibling.hidden = !on;
    });
  }
  document.addEventListener('click', function (e) {
    if (ui.openFacet && !(e.target.closest && e.target.closest('.b-facet'))) { ui.openFacet = null; syncDropdowns(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.openFacet) { var k = ui.openFacet; ui.openFacet = null; syncDropdowns(); var h = app.querySelector('[data-fold="' + k + '"]'); if (h) h.focus(); }
  });
  // 整列可點的系組:鍵盤 Enter / 空白鍵也能展開
  app.addEventListener('keydown', function (e) {
    var row = e.target.closest && e.target.closest('[data-open]');
    if (row && row === e.target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); }
  });
  app.addEventListener('click', function (e) { if (ui.cmpOpen && e.target.classList && e.target.classList.contains('f-cmp')) { ui.cmpOpen = false; renderTray(); } });

  E.init(window.TB_SITE_BASE).then(function () {
    el('tb-q').value = st.q;
    full();
  }).catch(function (err) {
    console.error(err);
    el('tb-list').innerHTML = '<div class="b-empty"><h3>資料載入失敗</h3><p>請確認本機伺服器有開,再重新整理。</p></div>';
  });
})();

})();
