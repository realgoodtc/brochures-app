(function() {
  'use strict';

  // 1. 自動注入 HTML 骨架到掛載點
  var appContainer = document.getElementById('university-brochures-app');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <div class="brochure-container">
      <div class="filter-section">
        <!-- 搜尋列與洽詢導購 -->
        <div class="filter-bar">
          <input type="text" id="searchInput" placeholder="🔍 請輸入校名或系名" autocomplete="off">      
          <button type="button" class="btn-search" onclick="window.ubApp.triggerSearch(this)">🔍 點擊搜尋</button>
          <a href="https://surl.tkb.com.tw/2HRvU2" target="_blank" rel="noopener noreferrer" class="btn-consult">📝 立即洽詢書審口試</a>
        </div>
        
        <!-- 篩選條件組 -->
        <div class="filter-group-container">
          <!-- 1. 學校類型 -->
          <div class="filter-row">
            <span class="filter-label">學校類型：</span>
            <div class="type-filter-group" id="schoolTypeGroup">
              <button type="button" class="type-btn active" data-val="all" onclick="window.ubApp.toggleMultiFilter('schoolType', 'all', this)">全部</button>
              <button type="button" class="type-btn" data-val="國立" onclick="window.ubApp.toggleMultiFilter('schoolType', '國立', this)">國立</button>
              <button type="button" class="type-btn" data-val="私立" onclick="window.ubApp.toggleMultiFilter('schoolType', '私立', this)">私立</button>
              <button type="button" class="type-btn" data-val="大學" onclick="window.ubApp.toggleMultiFilter('schoolType', '大學', this)">大學</button>
              <button type="button" class="type-btn" data-val="科大" onclick="window.ubApp.toggleMultiFilter('schoolType', '科大', this)">科大</button>
            </div>
          </div>

          <!-- 2. 招生管道 -->
          <div class="filter-row">
            <span class="filter-label">招生管道：</span>
            <div class="type-filter-group" id="admissionGroup">
              <button type="button" class="type-btn active" data-val="all" onclick="window.ubApp.toggleMultiFilter('admission', 'all', this)">全部</button>
              <button type="button" class="type-btn" data-val="特殊選才" onclick="window.ubApp.toggleMultiFilter('admission', '特殊選才', this)">特殊選才</button>
              <button type="button" class="type-btn" data-val="研究所" onclick="window.ubApp.toggleMultiFilter('admission', '研究所', this)">研究所</button>
              <button type="button" class="type-btn" data-val="在職專班" onclick="window.ubApp.toggleMultiFilter('admission', '在職專班', this)">在職專班</button>
            </div>
          </div>

          <!-- 3. 身分類別 -->
          <div class="filter-row">
            <span class="filter-label">身分類別：</span>
            <div class="type-filter-group" id="identityGroup">
              <button type="button" class="type-btn active" data-val="all" onclick="window.ubApp.toggleMultiFilter('identity', 'all', this)">全部</button>
              <button type="button" class="type-btn" data-val="一般生" onclick="window.ubApp.toggleMultiFilter('identity', '一般生', this)">🔵 一般生</button>
              <button type="button" class="type-btn" data-val="在職生" onclick="window.ubApp.toggleMultiFilter('identity', '在職生', this)">🟣 在職生</button>
              <button type="button" class="type-btn" data-val="特殊生" onclick="window.ubApp.toggleMultiFilter('identity', '特殊生', this)">🟢 特殊身分/其他</button>
            </div>
          </div>     
        
          <!-- 4. 日期搜尋 -->
          <div class="filter-row">
            <span class="filter-label">日期搜尋：</span>
            <div class="type-filter-group" id="dateGroup">
              <button type="button" class="type-btn active" data-val="all" onclick="window.ubApp.setDateFilter('all', this)">全部</button>
              <button type="button" class="type-btn" data-val="open" onclick="window.ubApp.setDateFilter('open', this)">正在報名</button>
              <button type="button" class="type-btn" data-val="urgent" onclick="window.ubApp.setDateFilter('urgent', this)">3天內截止</button>
              <div class="date-picker-wrap" id="datePickerWrap">
                <input type="date" id="filterDateStart" onchange="window.ubApp.setDateFilter('custom')" title="開始日期">
                <span class="date-sep">至</span>
                <input type="date" id="filterDateEnd" onchange="window.ubApp.setDateFilter('custom')" title="截止日期">
                <button type="button" class="date-clear-btn" onclick="window.ubApp.clearDateCustom()" title="清除自訂日期">✕</button>
              </div>
            </div>
          </div>

          <!-- 5. 收藏篩選 -->
          <div class="filter-row">
            <span class="filter-label">收藏篩選：</span>
            <div class="type-filter-group" id="favGroup">
              <button type="button" class="type-btn active" data-val="all" onclick="window.ubApp.setFavFilter('all', this)">全部</button>
              <button type="button" class="type-btn" data-val="fav" onclick="window.ubApp.setFavFilter('fav', this)">⭐ 我的收藏 (<span id="favCount">0</span>)</button>
              <div class="fav-share-wrap" id="favShareWrap">
                <span class="fav-share-title">分享收藏：</span>
                <button type="button" class="btn-share-social btn-share-line" onclick="window.ubApp.shareLine()" title="LINE 分享" aria-label="LINE 分享">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.448 24 10.304z"/></svg>
                </button>
                <button type="button" class="btn-share-social btn-share-fb" onclick="window.ubApp.shareFB()" title="Facebook 分享" aria-label="Facebook 分享">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                <button type="button" class="btn-share-social btn-share-copy" onclick="window.ubApp.copyShareLink()" title="複製分享連結" aria-label="複製分享連結">🔗</button>
              </div>
            </div>
          </div>

          <!-- 6. 資料排序 -->
          <div class="filter-row">
            <span class="filter-label">資料排序：</span>
            <div class="type-filter-group">
              <select id="sortSelect" class="sort-select" onchange="window.ubApp.applyFilters()">
                <option value="default">預設排序</option>
                <option value="dateAsc">📅 截止日：由近到遠（即將截止優先）</option>
                <option value="dateDesc">📅 截止日：由遠到近</option>
                <option value="quotaDesc">👥 招收名額：由多到少</option>
                <option value="schoolAsc">🏫 學校名稱：依筆畫順序 (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div id="activeFilterTags" class="active-filter-tags" style="display: none;"></div>
      </div>
      
      <div id="contextBanner" class="context-banner" role="status" aria-live="polite">
        <div class="context-banner-text">
          <span>📌</span>
          <span><strong>近期正在報名校系簡章</strong></span>
        </div>
      </div>
      
      <div id="brochureList" class="brochure-grid">
        <div class="skeleton-card">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div class="skeleton-shimmer" style="width: 140px; height: 18px;"></div>
            <div class="skeleton-shimmer" style="width: 280px; height: 22px;"></div>
            <div class="skeleton-shimmer" style="width: 200px; height: 16px;"></div>
          </div>
          <div class="skeleton-shimmer" style="width: 86px; height: 38px; border-radius: 8px;"></div>
        </div>
        <div class="skeleton-card">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div class="skeleton-shimmer" style="width: 160px; height: 18px;"></div>
            <div class="skeleton-shimmer" style="width: 310px; height: 22px;"></div>
            <div class="skeleton-shimmer" style="width: 180px; height: 16px;"></div>
          </div>
          <div class="skeleton-shimmer" style="width: 86px; height: 38px; border-radius: 8px;"></div>
        </div>
      </div>

      <div class="pagination-container" id="paginationBar" style="display: none;">
        <div class="pagination-controls" id="pageButtons"></div>
        <div class="page-info" id="pageInfo"></div>
        <div class="filter-warning-text" style="margin-top: -0.5px;">
          💡 <strong>提醒：</strong>本站簡章資料尚未完整收錄所有學校及系所，實際招生資訊請以各校最新公告之官方簡章為準。如發現資料有誤或遺漏，歡迎與我們聯繫反映。
        </div>
      </div>

      <!-- 行動端懸浮收藏按鈕 -->
      <button type="button" id="ubFloatingFav" class="ub-floating-fav" onclick="window.ubApp.openFavView()" aria-label="查看我的收藏" style="display: none;">
        ⭐ (<span id="fabFavCount">0</span>)
      </button>
    </div>
  `;

  // 2. 商業邏輯運算
  function normalizeText(text) {
    return String(text || '').toLowerCase().replace(/臺/g, '台');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function highlightKeyword(text, keyword) {
    if (!text) return '';
    var escaped = escapeHtml(text);
    if (!keyword) return escaped;
    var terms = keyword.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return escaped;
    var pattern = new RegExp('(' + terms.map(function(t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/台/g, '[台臺]').replace(/臺/g, '[台臺]');
    }).join('|') + ')', 'gi');
    return escaped.replace(pattern, '<mark class="highlight-kw">$1</mark>');
  }

  function parseYMD(dStr) {
    if (!dStr || String(dStr).length !== 8) return null;
    var s = String(dStr);
    var y = parseInt(s.substring(0, 4), 10);
    var m = parseInt(s.substring(4, 6), 10) - 1;
    var d = parseInt(s.substring(6, 8), 10);
    return new Date(y, m, d);
  }

  var apiEndpoint = 'https://brochures-proxy.eolj-lo.workers.dev';
  var CACHE_KEY = 'brochures_cache';
  var CACHE_SHA_KEY = 'brochures_cache_sha';
  var CACHE_TIME_KEY = 'brochures_cache_time';
  var CACHE_DURATION = 30 * 60 * 1000;

  var FAV_KEY = 'brochures_favorites';
  var favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch (e) {
    favorites = [];
  }
  var isFavOnly = false;

  var allBrochures = [];
  var filteredBrochures = [];
  var currentSearchKeyword = '';
  var currentDateFilter = 'all';
  var currentPage = 1;
  var itemsPerPage = 10;

  var filterOptions = {
    schoolType: ['國立', '私立', '大學', '科大'],
    admission: ['特殊選才', '研究所', '在職專班'],
    identity: ['一般生', '在職生', '特殊生']
  };
  var selectedFilters = {
    schoolType: filterOptions.schoolType.slice(),
    admission: filterOptions.admission.slice(),
    identity: filterOptions.identity.slice()
  };
  var isAllState = { schoolType: true, admission: true, identity: true };

  function getBrochureId(item) {
    if (!item) return '';
    if (item.id) return String(item.id);
    var acf = item.acf || {};
    return (acf.school_name || '') + '_' + (acf.department || '') + '_' + (acf.studenttype || '') + '_' + (acf.category || '');
  }

  function updateFavUI() {
    var countEl = document.getElementById('favCount');
    if (countEl) countEl.innerText = favorites.length;
    var fabEl = document.getElementById('ubFloatingFav');
    var fabCountEl = document.getElementById('fabFavCount');
    if (fabCountEl) fabCountEl.innerText = favorites.length;
    if (fabEl) fabEl.style.display = favorites.length > 0 ? 'inline-flex' : 'none';
  }

  function openFavView() {
    var favGroup = document.getElementById('favGroup');
    var favBtn = favGroup ? favGroup.querySelector('[data-val="fav"]') : null;
    setFavFilter('fav', favBtn);
    var container = document.querySelector('.brochure-container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getShortHash(str) {
    var hash = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function getShareData() {
    if (!favorites || favorites.length === 0) {
      alert('目前沒有收藏項目可供分享！');
      return null;
    }
    var isTruncated = favorites.length > 15;
    var list = isTruncated ? favorites.slice(0, 15) : favorites;
    if (isTruncated) {
      alert('為確保分享閱讀品質，已為您自動精選前 15 筆校系產生分享連結！');
    }
    var codes = list.map(function(id) {
      return getShortHash(id);
    });
    var url = new URL(window.location.href);
    url.searchParams.set('fav', codes.join(','));
    return { url: url.toString() };
  }

  function shareLine() {
    var data = getShareData();
    if (!data) return;
    var lineUrl = 'https://line.me/R/msg/text/?' + encodeURIComponent('我的大學簡章目標清單：\n' + data.url);
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  }

  function shareFB() {
    var data = getShareData();
    if (!data) return;
    var fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(data.url);
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  function copyShareLink() {
    var data = getShareData();
    if (!data) return;
    var notify = function() { alert('已複製收藏連結！'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(data.url).then(notify).catch(function() {
        prompt('請複製以下分享網址：', data.url);
      });
    } else {
      var input = document.createElement('textarea');
      input.value = data.url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        notify();
      } catch (e) {
        prompt('請複製以下分享網址：', data.url);
      }
      document.body.removeChild(input);
    }
  }

  function checkUrlFavorites() {
    var params = new URLSearchParams(window.location.search);
    var favParam = params.get('fav');
    if (!favParam || allBrochures.length === 0) return;
    var sharedCodes = favParam.split(',').map(function(s) { return decodeURIComponent(s.trim()); }).filter(Boolean);
    if (sharedCodes.length === 0) return;

    var matchedIds = [];
    allBrochures.forEach(function(item) {
      var id = getBrochureId(item);
      var code = getShortHash(id);
      if (sharedCodes.indexOf(code) !== -1 || sharedCodes.indexOf(id) !== -1) {
        matchedIds.push(id);
      }
    });

    if (matchedIds.length === 0) return;

    var hasNew = matchedIds.some(function(id) { return favorites.indexOf(id) === -1; });
    if (hasNew && confirm('偵測到外部分享的 ' + matchedIds.length + ' 筆收藏簡章，是否同步存入本機收藏？')) {
      matchedIds.forEach(function(id) {
        if (favorites.indexOf(id) === -1) favorites.push(id);
      });
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
      } catch (e) {}
      updateFavUI();
    }
    var favGroup = document.getElementById('favGroup');
    var favBtn = favGroup ? favGroup.querySelector('[data-val="fav"]') : null;
    setFavFilter('fav', favBtn);
  }

  function toggleFavorite(id, btn) {
    if (btn && btn.blur) btn.blur();
    var idx = favorites.indexOf(id);
    if (idx > -1) {
      favorites.splice(idx, 1);
      if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '☆';
        btn.setAttribute('aria-label', '加入收藏');
      }
    } else {
      favorites.push(id);
      if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '★';
        btn.setAttribute('aria-label', '取消收藏');
      }
    }
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch (e) {}
    updateFavUI();
    if (isFavOnly) applyFilters();
  }

  function setFavFilter(mode, btnElement) {
    if (btnElement && btnElement.blur) btnElement.blur();
    var group = document.getElementById('favGroup');
    if (!group) return;
    var btns = group.querySelectorAll('.type-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });

    if (btnElement) {
      btnElement.classList.add('active');
    } else {
      var targetBtn = group.querySelector('[data-val="' + mode + '"]');
      if (targetBtn) targetBtn.classList.add('active');
    }

    isFavOnly = (mode === 'fav');
    applyFilters();
  }

  function setDateFilter(type, btnElement) {
    if (btnElement && btnElement.blur) btnElement.blur();
    var group = document.getElementById('dateGroup');
    if (!group) return;
    var btns = group.querySelectorAll('.type-btn:not(.date-clear-btn)');
    var wrap = document.getElementById('datePickerWrap');

    currentDateFilter = type;

    if (type === 'custom') {
      btns.forEach(function(b) { b.classList.remove('active'); });
      if (wrap) wrap.classList.add('active');
    } else {
      if (wrap) wrap.classList.remove('active');
      var ds = document.getElementById('filterDateStart');
      var de = document.getElementById('filterDateEnd');
      if (ds) ds.value = '';
      if (de) de.value = '';
      btns.forEach(function(b) { b.classList.remove('active'); });

      if (btnElement) {
        btnElement.classList.add('active');
      } else {
        var targetBtn = group.querySelector('[data-val="' + type + '"]');
        if (targetBtn) targetBtn.classList.add('active');
      }
    }
    applyFilters();
  }

  function clearDateCustom() {
    var ds = document.getElementById('filterDateStart');
    var de = document.getElementById('filterDateEnd');
    if (ds) ds.value = '';
    if (de) de.value = '';
    var wrap = document.getElementById('datePickerWrap');
    if (wrap) wrap.classList.remove('active');
    var group = document.getElementById('dateGroup');
    if (group) {
      var allBtn = group.querySelector('[data-val="all"]');
      setDateFilter('all', allBtn);
    }
  }

  function toggleMultiFilter(groupKey, value, btnElement) {
    if (btnElement && btnElement.blur) btnElement.blur();

    var groupIdMap = {
      schoolType: 'schoolTypeGroup',
      admission: 'admissionGroup',
      identity: 'identityGroup'
    };
    
    var group = document.getElementById(groupIdMap[groupKey]);
    if (!group) return;
    var allBtn = group.querySelector('[data-val="all"]');
    var itemBtns = group.querySelectorAll('[data-val]:not([data-val="all"])');
    var fullOptions = filterOptions[groupKey];

    if (value === 'all') {
      selectedFilters[groupKey] = fullOptions.slice();
      isAllState[groupKey] = true;
      allBtn.classList.add('active');
      itemBtns.forEach(function(b) { b.classList.remove('active'); });
    } else {
      if (isAllState[groupKey]) {
        selectedFilters[groupKey] = [value];
        isAllState[groupKey] = false;
        allBtn.classList.remove('active');
        itemBtns.forEach(function(b) { b.classList.remove('active'); });
        btnElement.classList.add('active');
      } else {
        var idx = selectedFilters[groupKey].indexOf(value);
        if (idx !== -1) {
          selectedFilters[groupKey].splice(idx, 1);
          btnElement.classList.remove('active');
        } else {
          selectedFilters[groupKey].push(value);
          btnElement.classList.add('active');
        }
      }

      if (selectedFilters[groupKey].length === fullOptions.length || selectedFilters[groupKey].length === 0) {
        selectedFilters[groupKey] = fullOptions.slice();
        isAllState[groupKey] = true;
        allBtn.classList.add('active');
        itemBtns.forEach(function(b) { b.classList.remove('active'); });
      }
    }
    applyFilters();
  }

  function renderActiveFilterChips() {
    var container = document.getElementById('activeFilterTags');
    if (!container) return;

    var chips = [];
    if (currentSearchKeyword) {
      chips.push({
        label: '關鍵字: ' + currentSearchKeyword,
        onRemove: function() {
          var input = document.getElementById('searchInput');
          if (input) input.value = '';
          currentSearchKeyword = '';
          applyFilters();
        }
      });
    }

    if (!isAllState.schoolType) {
      selectedFilters.schoolType.forEach(function(val) {
        chips.push({
          label: val,
          onRemove: function() {
            var group = document.getElementById('schoolTypeGroup');
            var btn = group ? group.querySelector('[data-val="' + val + '"]') : null;
            toggleMultiFilter('schoolType', val, btn);
          }
        });
      });
    }

    if (!isAllState.admission) {
      selectedFilters.admission.forEach(function(val) {
        chips.push({
          label: val,
          onRemove: function() {
            var group = document.getElementById('admissionGroup');
            var btn = group ? group.querySelector('[data-val="' + val + '"]') : null;
            toggleMultiFilter('admission', val, btn);
          }
        });
      });
    }

    if (!isAllState.identity) {
      selectedFilters.identity.forEach(function(val) {
        chips.push({
          label: val,
          onRemove: function() {
            var group = document.getElementById('identityGroup');
            var btn = group ? group.querySelector('[data-val="' + val + '"]') : null;
            toggleMultiFilter('identity', val, btn);
          }
        });
      });
    }

    if (currentDateFilter !== 'all') {
      var dateLabel = '';
      if (currentDateFilter === 'open') dateLabel = '正在報名';
      else if (currentDateFilter === 'urgent') dateLabel = '3天內截止';
      else if (currentDateFilter === 'custom') {
        var s = document.getElementById('filterDateStart') ? document.getElementById('filterDateStart').value : '';
        var e = document.getElementById('filterDateEnd') ? document.getElementById('filterDateEnd').value : '';
        dateLabel = (s || '不限') + ' ~ ' + (e || '不限');
      }
      chips.push({
        label: '日期: ' + dateLabel,
        onRemove: function() { clearDateCustom(); }
      });
    }

    if (isFavOnly) {
      chips.push({
        label: '僅顯示已收藏',
        onRemove: function() {
          var group = document.getElementById('favGroup');
          var allBtn = group ? group.querySelector('[data-val="all"]') : null;
          setFavFilter('all', allBtn);
        }
      });
    }

    if (chips.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = '<span class="active-tag-label">已套用條件：</span>';

    chips.forEach(function(chip) {
      var span = document.createElement('span');
      span.className = 'active-filter-chip';
      span.innerHTML = escapeHtml(chip.label) + ' <span class="active-chip-remove" title="移除此條件">✕</span>';
      span.querySelector('.active-chip-remove').onclick = chip.onRemove;
      container.appendChild(span);
    });

    var clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'btn-clear-all-chips';
    clearAllBtn.innerText = '全部清除';
    clearAllBtn.onclick = resetAllFilters;
    container.appendChild(clearAllBtn);
  }

  function triggerSearch(btnElement) {
    if (btnElement && btnElement.blur) btnElement.blur();
    var inputEl = document.getElementById('searchInput');
    if (inputEl) {
      currentSearchKeyword = normalizeText(inputEl.value);
      applyFilters();
    }
  }

  function applyFilters() {
    var rawInput = currentSearchKeyword.trim();    
    var pBar = document.getElementById('paginationBar');

    var hasActiveFilter = !isAllState.schoolType || 
                          !isAllState.admission || 
                          !isAllState.identity || 
                          (currentDateFilter !== 'all') ||
                          isFavOnly;

    var nowDate = new Date();
    var today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    var todayNum = nowDate.getFullYear() * 10000 + (nowDate.getMonth() + 1) * 100 + nowDate.getDate();

    var customStart = document.getElementById('filterDateStart') ? document.getElementById('filterDateStart').value : '';
    var customEnd = document.getElementById('filterDateEnd') ? document.getElementById('filterDateEnd').value : '';
    var customStartNum = customStart ? parseInt(customStart.replace(/-/g, ''), 10) : null;
    var customEndNum = customEnd ? parseInt(customEnd.replace(/-/g, ''), 10) : null;

    filteredBrochures = allBrochures.filter(function(item) {
      var acf = item.acf || {};
      var school = normalizeText(acf.school_name);
      var dept = normalizeText(acf.department);
      var category = acf.category || '';
      var studenttype = acf.studenttype || '';
      
      var dbSchoolType = acf.SchoolType || acf.schooltype || acf.school_type || '';
      var schoolTypeTag = dbSchoolType || (school.indexOf('國立') !== -1 ? '國立' : '私立');
      
      var schoolKind = (acf.School_Kind || acf.school_kind || '').toLowerCase();
      var isKeDa = schoolKind.indexOf('科大') !== -1 || schoolKind.indexOf('科技') !== -1 || school.indexOf('科大') !== -1 || school.indexOf('科技大') !== -1;
      var isDaXue = !isKeDa && (schoolKind.indexOf('大學') !== -1 || school.indexOf('大學') !== -1);

      var matchesKeyword = true;
      if (rawInput) {
        var buildRegex = function(str) {
          var safeStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(safeStr.split("").join('.*'), 'i');
        };
        var searchTerms = rawInput.split(/\s+/).filter(Boolean);
        var combinedTarget = school + ' ' + dept;
        matchesKeyword = searchTerms.every(function(term) {
          if (combinedTarget.indexOf(term) !== -1) return true;
          return buildRegex(term).test(combinedTarget);
        });
      }

      var matchesSchoolType = selectedFilters.schoolType.some(function(st) {
        if (st === '國立' || st === '私立') return schoolTypeTag === st;
        if (st === '科大') return isKeDa;
        if (st === '大學') return isDaXue;
        return false;
      });

      var matchesAdmission = selectedFilters.admission.some(function(adm) {
        return category.indexOf(adm) !== -1;
      });

      var isGeneral = studenttype.indexOf('一般生') !== -1;
      var isWorking = studenttype.indexOf('在職') !== -1;
      var isSpecial = !isGeneral && !isWorking;

      var matchesIdentity = selectedFilters.identity.some(function(id) {
        if (id === '一般生') return isGeneral;
        if (id === '在職生') return isWorking;
        if (id === '特殊生') return isSpecial;
        return false;
      });

      var sDateStr = acf.startdate || '';
      var eDateStr = acf.enddate || '';
      var sNum = (sDateStr && sDateStr.length === 8) ? parseInt(sDateStr, 10) : null;
      var eNum = (eDateStr && eDateStr.length === 8) ? parseInt(eDateStr, 10) : null;

      var matchesDate = true;
      if (currentDateFilter === 'open') {
        matchesDate = (sNum && eNum && todayNum >= sNum && todayNum <= eNum);
      } else if (currentDateFilter === 'urgent') {
        var eObj = parseYMD(eDateStr);
        if (eObj) {
          var diffDays = Math.round((eObj - today) / (1000 * 60 * 60 * 24));
          matchesDate = (diffDays >= 0 && diffDays <= 3);
        } else {
          matchesDate = false;
        }
      } else if (currentDateFilter === 'custom') {
        if (customStartNum && customEndNum) {
          matchesDate = (sNum && eNum && sNum <= customEndNum && eNum >= customStartNum);
        } else if (customStartNum) {
          matchesDate = (eNum && eNum >= customStartNum);
        } else if (customEndNum) {
          matchesDate = (sNum && sNum <= customEndNum);
        }
      }
      
      var matchesFav = true;
      if (isFavOnly) {
        matchesFav = favorites.indexOf(getBrochureId(item)) !== -1;
      }

      return matchesKeyword && matchesSchoolType && matchesAdmission && matchesIdentity && matchesDate && matchesFav;
    });

    var sortSelect = document.getElementById('sortSelect');
    var sortMode = sortSelect ? sortSelect.value : 'default';

    if (sortMode === 'dateAsc' || ((currentDateFilter === 'open' || currentDateFilter === 'urgent') && sortMode === 'default')) {
      filteredBrochures.sort(function(a, b) {
        var da = (a.acf && a.acf.enddate) ? parseInt(a.acf.enddate, 10) : 99999999;
        var db = (b.acf && b.acf.enddate) ? parseInt(b.acf.enddate, 10) : 99999999;
        return da - db;
      });
    } else if (sortMode === 'dateDesc') {
      filteredBrochures.sort(function(a, b) {
        var da = (a.acf && a.acf.enddate) ? parseInt(a.acf.enddate, 10) : 0;
        var db = (b.acf && b.acf.enddate) ? parseInt(b.acf.enddate, 10) : 0;
        return db - da;
      });
    } else if (sortMode === 'quotaDesc') {
      filteredBrochures.sort(function(a, b) {
        var qa = (a.acf && a.acf.quota) ? parseInt(a.acf.quota, 10) : 0;
        var qb = (b.acf && b.acf.quota) ? parseInt(b.acf.quota, 10) : 0;
        return qb - qa;
      });
    } else if (sortMode === 'schoolAsc') {
      filteredBrochures.sort(function(a, b) {
        var sa = (a.acf && a.acf.school_name) || '';
        var sb = (b.acf && b.acf.school_name) || '';
        return sa.localeCompare(sb, 'zh-Hant');
      });
    }

    var banner = document.getElementById('contextBanner');
    if (banner) {
      if (!rawInput && !hasActiveFilter) {
        banner.className = 'context-banner';
        banner.innerHTML = '<div class="context-banner-text"><span>📌</span><span><strong>近期開放報名中校系簡章</strong></span></div>';
      } else {
        banner.className = 'context-banner search-mode';
        banner.innerHTML = '<div class="context-banner-text"><span>🔍</span><span>已為您套用篩選條件，共比對出 <strong>' + filteredBrochures.length + '</strong> 筆校系。</span></div>';
      }
    }

    if (pBar) pBar.style.display = filteredBrochures.length > 0 ? 'flex' : 'none';

    currentPage = 1;
    renderActiveFilterChips();
    renderCurrentPage();
  }

  function renderCurrentPage() {
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex = startIndex + itemsPerPage;
    var pageData = filteredBrochures.slice(startIndex, endIndex);

    renderList(pageData);
    updatePaginationUI();
  }

  function renderList(dataArray) {
    var listContainer = document.getElementById('brochureList');
    if (!listContainer) return;
    listContainer.innerHTML = ''; 

    if (dataArray.length === 0) { 
      listContainer.innerHTML = 
        '<div class="empty-state-box">' +
          '<svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line>' +
          '</svg>' +
          '<div class="empty-state-title">找不到符合條件的校系簡章</div>' +
          '<div class="empty-state-desc">建議嘗試精簡關鍵字、切換其他招生管道，或清除部分條件重新檢視。</div>' +
          '<a href="https://surl.tkb.com.tw/2HRvU2" target="_blank" rel="noopener noreferrer" class="btn-consult empty-state-consult">📝 找不到你想報考的校系？點此由顧問專人為您查詢簡章與評估</a>' +
          '<button type="button" class="btn-search" onclick="window.ubApp.resetAllFilters()" style="margin-top: 6px; background: #475569; box-shadow: none;">🔄 重置所有篩選條件</button>' +
        '</div>';
      return;
    }

    dataArray.forEach(function(item, index) {
      var acf = item.acf;
      if (!acf) return; 

      var formatYMD = function(dStr) {
        if (!dStr || dStr.length !== 8) return '未定';
        return dStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3');
      };

      var nowDate = new Date();
      var today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

      var startDateObj = parseYMD(acf.startdate);
      var endDateObj = parseYMD(acf.enddate);

      var startFormatted = formatYMD(acf.startdate);
      var endFormatted = formatYMD(acf.enddate);

      var statusText = '';
      var startClass = '';
      var endClass = '';
      var isUrgent = false;

      if (endDateObj) {
        var diffDays = Math.round((endDateObj - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          startClass = ' expired'; endClass = ' expired'; statusText = ' (已截止)';
        } else if (diffDays <= 3) {
          isUrgent = true; endClass = ' urgent'; statusText = diffDays === 0 ? ' (今天截止)' : ' (剩 ' + diffDays + ' 天)';
        } else if (startDateObj && today >= startDateObj) {
          endClass = ' open'; statusText = ' (報名中)';
        }
      }

      var startHtml = '<span class="date-val' + startClass + '">' + startFormatted + '</span>';
      var endHtml = '<span class="date-val' + endClass + '">' + endFormatted + statusText + '</span>';
      var targetUrl = acf.brochure_url ? String(acf.brochure_url).trim() : '';
      if (targetUrl && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      var rawSchoolName = acf.school_name || '';
      var rawDeptName = acf.department || '';
      var schoolName = escapeHtml(rawSchoolName);
      var deptName = escapeHtml(rawDeptName);
      var dbSchoolType = acf.SchoolType || acf.schooltype || acf.school_type || '';
      var schoolType = dbSchoolType || (schoolName.indexOf('國立') !== -1 ? '國立' : '私立');
      var schoolKindTag = acf.School_Kind || acf.school_kind || (schoolName.indexOf('科大') !== -1 || schoolName.indexOf('科技') !== -1 ? '科大' : '大學');
      
      var schoolTypeClass = (schoolType === '國立') ? 'tag-national' : 'tag-private';
      var schoolKindClass = (schoolKindTag.indexOf('科大') !== -1 || schoolKindTag.indexOf('科技') !== -1) ? 'tag-tech' : 'tag-university';

      var studentTypeStr = escapeHtml(acf.studenttype || '一般生');

      var themeClass = 'theme-general';
      if (studentTypeStr.indexOf('在職') !== -1) {
        themeClass = 'theme-working';
      } else if (studentTypeStr.indexOf('一般生') === -1) {
        themeClass = 'theme-special';
      }

      var card = document.createElement('div');
      card.className = 'brochure-card ' + themeClass;
      card.style.animationDelay = (index * 40) + 'ms';
      var highlightedSchoolTitle = highlightKeyword(rawSchoolName + ' ' + rawDeptName, currentSearchKeyword);

      var itemId = escapeHtml(getBrochureId(item));
      var isFavorited = favorites.indexOf(getBrochureId(item)) !== -1;
      var starBtnClass = isFavorited ? 'btn-star-fav active' : 'btn-star-fav';
      var starBtnText = isFavorited ? '★' : '☆';
      var starHtml = '<button type="button" class="' + starBtnClass + '" onclick="window.ubApp.toggleFavorite(\'' + itemId + '\', this)" aria-label="' + (isFavorited ? '取消收藏' : '加入收藏') + '">' + starBtnText + '</button>';

      card.innerHTML = 
        '<div class="card-main-content">' +
          '<div class="badge-container">' +
            starHtml +
            '<span class="badge-category">' + escapeHtml(acf.category || '一般') + '</span>' +
            '<span class="badge-school-type ' + schoolTypeClass + '">' + escapeHtml(schoolType) + '</span>' +
            '<span class="badge-school-kind ' + schoolKindClass + '">' + escapeHtml(schoolKindTag) + '</span>' +
          '</div>' +
          '<div class="school-info-group"><div class="school-title">' + highlightedSchoolTitle + '</div></div>' +
          '<div class="student-type">身分：' + studentTypeStr + '</div>' +
          '<div class="date-info-grid' + (isUrgent ? ' is-urgent' : '') + '">' +
            '<div class="date-item"><span>報名期間：</span>' + startHtml + '-' + endHtml + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card-right-group">' +
          '<div class="quota-badge">名額 <span class="highlight-num">' + escapeHtml(acf.quota || 0) + '</span></div>' +
          '<div class="card-footer">' +
            '<a href="' + (escapeHtml(targetUrl) || '#') + '" target="_blank" rel="noopener noreferrer" class="btn-download" aria-label="查看 ' + schoolName + ' ' + deptName + ' 簡章（另開新視窗）">查看簡章</a>' +
          '</div>' +
        '</div>';
      
      listContainer.appendChild(card);
    });
  }

  function updatePaginationUI() {
    var totalPages = Math.ceil(filteredBrochures.length / itemsPerPage) || 1;
    var pageButtonsContainer = document.getElementById('pageButtons');
    var pageInfo = document.getElementById('pageInfo');
    if (!pageButtonsContainer) return;

    pageButtonsContainer.innerHTML = '';
    if (filteredBrochures.length === 0) return;

    var prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerText = '上一頁';
    prevBtn.disabled = (currentPage === 1);
    prevBtn.onclick = function() { goToPage(currentPage - 1); };
    pageButtonsContainer.appendChild(prevBtn);

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) endPage = Math.min(5, totalPages);
    if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);
    if (startPage > 1) {
      addPageButton(1, pageButtonsContainer);
      if (startPage > 2) {
        var ellipsis1 = document.createElement('span');
        ellipsis1.className = 'page-ellipsis';
        ellipsis1.innerText = '...';
        pageButtonsContainer.appendChild(ellipsis1);
      }
    }

    for (var i = startPage; i <= endPage; i++) {
      addPageButton(i, pageButtonsContainer);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        var ellipsis2 = document.createElement('span');
        ellipsis2.className = 'page-ellipsis';
        ellipsis2.innerText = '...';
        pageButtonsContainer.appendChild(ellipsis2);
      }
      addPageButton(totalPages, pageButtonsContainer);
    }

    var nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerText = '下一頁';
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.onclick = function() { goToPage(currentPage + 1); };
    pageButtonsContainer.appendChild(nextBtn);

    if (pageInfo) {
      pageInfo.innerText = '第 ' + currentPage + ' 頁 / 共 ' + totalPages + ' 頁 (共 ' + filteredBrochures.length + ' 筆資料)';
    }
  }

  function addPageButton(pageNum, container) {
    var btn = document.createElement('button');
    btn.className = 'page-btn ' + (pageNum === currentPage ? 'active' : '');
    btn.innerText = pageNum;
    btn.onclick = function() { goToPage(pageNum); };
    container.appendChild(btn);
  }

  function goToPage(targetPage) {
    var totalPages = Math.ceil(filteredBrochures.length / itemsPerPage);
    if (targetPage < 1 || targetPage > totalPages) return;
    currentPage = targetPage;
    renderCurrentPage();
    var container = document.querySelector('.brochure-container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetAllFilters() {
    var sInput = document.getElementById('searchInput');
    if (sInput) sInput.value = '';
    currentSearchKeyword = '';
    
    isFavOnly = false;
    var favGroup = document.getElementById('favGroup');
    if (favGroup) {
      var favBtns = favGroup.querySelectorAll('.type-btn');
      favBtns.forEach(function(b) { b.classList.remove('active'); });
      var allFavBtn = favGroup.querySelector('[data-val="all"]');
      if (allFavBtn) allFavBtn.classList.add('active');
    }

    ['schoolType', 'admission', 'identity'].forEach(function(groupKey) {
      var group = document.getElementById(groupKey + 'Group');
      if (group) {
        var allBtn = group.querySelector('[data-val="all"]');
        var itemBtns = group.querySelectorAll('[data-val]:not([data-val="all"])');
        selectedFilters[groupKey] = filterOptions[groupKey].slice();
        isAllState[groupKey] = true;
        if (allBtn) allBtn.classList.add('active');
        itemBtns.forEach(function(b) { b.classList.remove('active'); });
      }
    });

    var ds = document.getElementById('filterDateStart');
    var de = document.getElementById('filterDateEnd');
    if (ds) ds.value = '';
    if (de) de.value = '';
    var wrap = document.getElementById('datePickerWrap');
    if (wrap) wrap.classList.remove('active');
    var dateGroup = document.getElementById('dateGroup');
    if (dateGroup) {
      var dateBtns = dateGroup.querySelectorAll('.type-btn:not(.date-clear-btn)');
      dateBtns.forEach(function(b) { b.classList.remove('active'); });
      var allDateBtn = dateGroup.querySelector('[data-val="all"]');
      if (allDateBtn) allDateBtn.classList.add('active');
    }
    currentDateFilter = 'all';

    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'default';

    applyFilters();
  }

  function fetchAllDataFromGitHub() {
    var currentSha = window.UB_COMMIT_SHA || '';
    var reqUrl = apiEndpoint + (currentSha ? ('?v=' + currentSha) : ('?t=' + Date.now()));

    fetch(reqUrl)
      .then(function(res) {
        if (!res.ok) throw new Error('網路連線異常 (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function(data) {
        if (data && data.length > 0) {
          allBrochures = data;
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(allBrochures));
            sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            if (currentSha) {
              sessionStorage.setItem(CACHE_SHA_KEY, currentSha);
            }
          } catch (e) {
            sessionStorage.removeItem(CACHE_KEY);
            sessionStorage.removeItem(CACHE_SHA_KEY);
            sessionStorage.removeItem(CACHE_TIME_KEY);
          }
          checkUrlFavorites();
          applyFilters();
        }
      })
      .catch(function(error) {
        console.error('抓取簡章資料失敗:', error);
        var listContainer = document.getElementById('brochureList');
        if (listContainer) {
          listContainer.innerHTML = 
            '<div style="text-align: center; padding: 40px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; color: #dc2626; font-weight: 700;">' +
              '⚠ 簡章資料連線逾時或載入失敗，請確認網路連線或重新整理頁面。' +
            '</div>';
        }
      });
  }

  function initApp() {
    updateFavUI();

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerSearch();
        }
      });

      var debounceTimer;
      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          triggerSearch();
        }, 500);
      });
    }

    var currentSha = window.UB_COMMIT_SHA || '';
    var cachedSha = sessionStorage.getItem(CACHE_SHA_KEY);
    var cachedData = sessionStorage.getItem(CACHE_KEY);
    var cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    var now = Date.now();

    var isCacheValid = currentSha
      ? (cachedSha === currentSha && !!cachedData)
      : (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < CACHE_DURATION));

    if (isCacheValid) {
      try {
        allBrochures = JSON.parse(cachedData);
        checkUrlFavorites();
        applyFilters();
        return;
      } catch (e) {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_SHA_KEY);
        sessionStorage.removeItem(CACHE_TIME_KEY);
      }
    }
    fetchAllDataFromGitHub();
  }

  window.ubApp = {
    triggerSearch: triggerSearch,
    toggleMultiFilter: toggleMultiFilter,
    setDateFilter: setDateFilter,
    clearDateCustom: clearDateCustom,
    setFavFilter: setFavFilter,
    toggleFavorite: toggleFavorite,
    applyFilters: applyFilters,
    resetAllFilters: resetAllFilters,
    copyShareLink: copyShareLink,
    shareLine: shareLine,
    shareFB: shareFB,
    openFavView: openFavView
  };

  initApp();
})();