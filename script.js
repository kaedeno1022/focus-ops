// ============================================================================
// 定数定義
// ============================================================================

/** LocalStorageのキー */
const STORAGE_KEYS = {
  CHECKED: 'nte_checked',
  MINIMUM: 'nte_minimum'
};

/** LocalStorageの最大サイズ（5MB程度を目安） */
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

/** フォーカス可能な要素のセレクタ */
const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** カテゴリーラベル */
const CATEGORY_LABELS = {
  daily: 'デイリー',
  weekly: 'ウィークリー',
  season: 'シーズン'
};

/** 必須カテゴリー名 */
const REQUIRED_CATEGORY = '必須';

/** タスクデータ構造 */
const DATA = {
  daily: [
    {
      category: '必須',
      tasks: [
        ['本性ピクセル消費', 'high'],
        ['デイリークエスト', 'high'],
        ['ハンター褒章', 'high'],
        ['ナクペイダの泉', 'high'],
        ['魔女の家（占い）', 'high'],
        ['カフェ収益回収', 'high'],
        ['キャラプレゼント', 'high'],
        ['キャラデート', 'high'],
        ['ハムスターブロック', 'high'],
        ['もふもふコットン', 'high']
      ]
    },
    {
      category: '余裕あれば',
      tasks: [
        ['祈願', 'mid'],
        ['異象家具回収', 'mid'],
        ['NPCから強盗', 'mid'],
        ['ちぃちゃんファンス', 'mid'],
        ['特別配達', 'mid'],
        ['刑務所', 'mid'],
        ['エイボンの小屋', 'mid']
      ]
    },
    {
      category: '確認系',
      tasks: [
        ['イベント確認', 'low'],
        ['バトルパス確認', 'low']
      ]
    }
  ],

  weekly: [
    {
      category: '必須',
      tasks: [
        ['異象巡礼（週ボス）', 'high'],
        ['オークション', 'high'],
        ['貪欲の領域（マモン）', 'high'],
        ['シティスタミナ消費', 'high'],
        ['金庫回収', 'high']
      ]
    },
    {
      category: '余裕あれば',
      tasks: [
        ['DSD堂などで万引き', 'mid']
      ]
    }
  ],

  season: [
    {
      category: '必須',
      tasks: [
        ['にくきゅう大強盗', 'high'],
        ['シーズンバトルパス', 'high'],
        ['ショップ交換', 'high']
      ]
    },
    {
      category: '余裕あれば',
      tasks: [
        ['軌道外領域', 'mid'],
        ['シーズンイベントのチェック', 'mid']
      ]
    }
  ]
};

// ============================================================================
// 状態管理
// ============================================================================

/** チェック状態 */
let checkedState = loadFromStorage(STORAGE_KEYS.CHECKED) || {};

/** 最低限モード */
let minimumMode = loadFromStorage(STORAGE_KEYS.MINIMUM) || false;

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * LocalStorageからデータを読み込む
 * @param {string} key - ストレージキー
 * @returns {any} パース済みのデータ
 */
function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * LocalStorageからデータを読み込む
 * @param {string} key - ストレージキー
 * @returns {any} パース済みのデータ
 */
function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * 状態をLocalStorageに保存（サイズ制限チェック付き）
 */
function saveState() {
  try {
    const checkedData = JSON.stringify(checkedState);
    const minimumData = JSON.stringify(minimumMode);
    
    // データサイズチェック
    const totalSize = new Blob([checkedData, minimumData]).size;
    if (totalSize > MAX_STORAGE_SIZE) {
      console.warn('Storage size limit approaching. Consider data cleanup.');
      announceToScreenReader('データ容量が上限に近づいています');
    }
    
    localStorage.setItem(STORAGE_KEYS.CHECKED, checkedData);
    localStorage.setItem(STORAGE_KEYS.MINIMUM, minimumData);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    
    if (error.name === 'QuotaExceededError') {
      announceToScreenReader('保存容量が不足しています。一部のデータをリセットしてください。');
      alert('保存容量が不足しています。「全リセット」を実行してデータをクリアしてください。');
    }
  }
}

/**
 * スクリーンリーダーにメッセージを通知
 * @param {string} message - 通知するメッセージ
 */
function announceToScreenReader(message) {
  const announcer = document.getElementById('sr-announcer');
  if (!announcer) return;
  
  // 一度クリアしてから設定（確実に読み上げさせるため）
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * フォーカストラップの実装
 * @param {HTMLElement} container - フォーカスを閉じ込める要素
 */
function trapFocus(container) {
  const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleKeydown = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeydown);
  
  // クリーンアップ関数を返す
  return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * タスクキーを生成
 * @param {string} type - タスクタイプ (daily/weekly/season)
 * @param {string} category - カテゴリー名
 * @param {string} title - タスクタイトル
 * @returns {string} 一意のタスクキー
 */
function createKey(type, category, title) {
  return `${type}_${category}_${title}`;
}

/**
 * 要素を取得（エラーハンドリング付き）
 * @param {string} id - 要素ID
 * @returns {HTMLElement|null} 取得した要素
 */
function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with id "${id}" not found`);
  }
  return element;
}

// ============================================================================
// タスク要素の生成
// ============================================================================

/**
 * タスク要素を作成
 * @param {string} type - タスクタイプ
 * @param {string} category - カテゴリー名
 * @param {string} title - タスクタイトル
 * @param {string} priority - 優先度 (high/mid/low)
 * @returns {Object} タスク要素とチェック状態
 */
function createTaskElement(type, category, title, priority) {
  const key = createKey(type, category, title);
  const checked = checkedState[key] || false;

  const task = document.createElement('div');
  task.className = `task ${checked ? 'done' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.id = `task_${key}`;
  checkbox.setAttribute('aria-label', title);

  const priorityDiv = document.createElement('div');
  priorityDiv.className = `priority ${priority}`;
  
  // 優先度ラベルをアクセシブルに
  const priorityLabel = {
    high: '高',
    mid: '中',
    low: '低'
  }[priority];
  priorityDiv.setAttribute('aria-label', `優先度: ${priorityLabel}`);
  
  // スクリーンリーダー用の優先度テキスト
  const srPriority = document.createElement('span');
  srPriority.className = 'sr-only';
  srPriority.textContent = `優先度${priorityLabel}`;

  const titleDiv = document.createElement('div');
  titleDiv.className = 'task-title';
  titleDiv.textContent = title;

  const label = document.createElement('label');
  label.htmlFor = checkbox.id;
  label.className = 'task-label';

  task.appendChild(checkbox);
  label.appendChild(srPriority);
  label.appendChild(priorityDiv);
  label.appendChild(titleDiv);
  task.appendChild(label);

  checkbox.addEventListener('change', () => {
    checkedState[key] = checkbox.checked;
    
    // スクリーンリーダーへの通知
    const statusText = checkbox.checked ? '完了' : '未完了';
    announceToScreenReader(`${title}を${statusText}にしました`);
    
    saveState();
    
    // パフォーマンス最適化: 個別の状態更新のみ行う
    task.classList.toggle('done', checkbox.checked);
    
    // 進捗バーのみ更新（全体の再レンダリングを避ける）
    updateProgressOnly();
  });

  return {
    element: task,
    checked
  };
}

/**
 * 進捗バーのみを更新（軽量版）
 */
function updateProgressOnly() {
  ['daily', 'weekly', 'season'].forEach(type => {
    let total = 0;
    let done = 0;
    
    const categories = DATA[type];
    if (!categories) return;
    
    categories.forEach(group => {
      // 最低限モードで必須以外をスキップ
      if (minimumMode && group.category !== REQUIRED_CATEGORY) {
        return;
      }
      
      group.tasks.forEach(([title, priority]) => {
        total++;
        
        const key = createKey(type, group.category, title);
        if (checkedState[key]) {
          done++;
        }
      });
    });
    
    updateProgress(type, total, done);
  });
}

// ============================================================================
// レンダリング機能
// ============================================================================

/**
 * セクションをレンダリング
 * @param {string} type - タスクタイプ (daily/weekly/season)
 */
function renderSection(type) {
  const container = getElement(`${type}Container`);
  if (!container) return;

  container.innerHTML = '';

  let total = 0;
  let done = 0;

  const categories = DATA[type];
  if (!categories) {
    console.error(`No data found for type: ${type}`);
    return;
  }

  categories.forEach(group => {
    // 最低限モードで必須以外をスキップ
    if (minimumMode && group.category !== REQUIRED_CATEGORY) {
      return;
    }

    const section = document.createElement('div');
    section.className = 'category';
    section.setAttribute('role', 'group');
    section.setAttribute('aria-label', group.category);

    const header = document.createElement('div');
    header.className = 'category-header';
    header.textContent = group.category;

    section.appendChild(header);

    group.tasks.forEach(([title, priority]) => {
      total++;

      const task = createTaskElement(type, group.category, title, priority);

      if (task.checked) {
        done++;
      }

      section.appendChild(task.element);
    });

    container.appendChild(section);
  });

  updateProgress(type, total, done);
}

/**
 * 進捗バーを更新
 * @param {string} type - タスクタイプ
 * @param {number} total - 総タスク数
 * @param {number} done - 完了タスク数
 */
function updateProgress(type, total, done) {
  const remain = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const remainElement = getElement(`${type}Remain`);
  const progressElement = getElement(`${type}Progress`);
  const barElement = getElement(`${type}Bar`);

  if (remainElement) {
    remainElement.textContent = `残り ${remain}`;
  }

  if (progressElement) {
    progressElement.textContent = `${done}/${total} (${percent}%)`;
  }

  if (barElement) {
    barElement.style.width = `${percent}%`;
    barElement.setAttribute('aria-valuenow', percent);
    barElement.setAttribute('aria-valuemin', '0');
    barElement.setAttribute('aria-valuemax', '100');
    barElement.setAttribute('aria-valuetext', `${done}個中${total}個完了、${percent}パーセント`);
  }
}

/**
 * 全セクションを再レンダリング
 */
function renderAll() {
  // パフォーマンス最適化: requestAnimationFrame で描画を最適化
  requestAnimationFrame(() => {
    renderSection('daily');
    renderSection('weekly');
    renderSection('season');
  });
}

// ============================================================================
// イベントハンドラー
// ============================================================================

/** フォーカストラップのクリーンアップ関数 */
let cleanupFocusTrap = null;

/**
 * メニューを開閉する
 */
function toggleMenu() {
  const menuToggle = getElement('menuToggleBtn');
  const topbar = getElement('topbar');
  const overlay = getElement('menuOverlay');

  if (!menuToggle || !topbar || !overlay) return;

  const isActive = topbar.classList.toggle('active');
  menuToggle.classList.toggle('active', isActive);
  overlay.classList.toggle('active', isActive);
  menuToggle.setAttribute('aria-expanded', isActive.toString());
  menuToggle.setAttribute('aria-label', isActive ? 'メニューを閉じる' : 'メニューを開く');

  // メニューが開いている時は背景のスクロールを防ぐ
  document.body.style.overflow = isActive ? 'hidden' : '';
  
  if (isActive) {
    // メニューを開いた時
    announceToScreenReader('メニューを開きました');
    
    // 最初のフォーカス可能要素にフォーカス
    setTimeout(() => {
      const firstButton = topbar.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);
    
    // フォーカストラップを設定
    cleanupFocusTrap = trapFocus(topbar);
  } else {
    // メニューを閉じた時
    announceToScreenReader('メニューを閉じました');
    
    // フォーカストラップをクリーンアップ
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
    
    // メニューボタンにフォーカスを戻す
    menuToggle.focus();
  }
}

/**
 * メニューを閉じる
 */
function closeMenu() {
  const menuToggle = getElement('menuToggleBtn');
  const topbar = getElement('topbar');
  const overlay = getElement('menuOverlay');

  if (!menuToggle || !topbar || !overlay) return;

  topbar.classList.remove('active');
  menuToggle.classList.remove('active');
  overlay.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'メニューを開く');
  document.body.style.overflow = '';
  
  // フォーカストラップをクリーンアップ
  if (cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }
}

/**
 * 最低限モードをトグル
 */
function toggleMinimumMode() {
  minimumMode = !minimumMode;

  const btn = getElement('minimumBtn');
  if (btn) {
    btn.textContent = minimumMode ? '最低限モード ON' : '最低限モード OFF';
    btn.classList.toggle('active', minimumMode);
    btn.setAttribute('aria-pressed', minimumMode.toString());
  }
  
  // スクリーンリーダーへの通知
  announceToScreenReader(
    minimumMode ? '最低限モードをオンにしました。必須タスクのみ表示されます。' : '最低限モードをオフにしました。全てのタスクが表示されます。'
  );

  saveState();
  renderAll();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * カテゴリーをリセット
 * @param {string} type - タスクタイプ (daily/weekly/season)
 */
function resetCategory(type) {
  const label = CATEGORY_LABELS[type];
  if (!label) {
    console.error(`Invalid category type: ${type}`);
    return;
  }

  if (!confirm(`${label}をリセットしますか？`)) {
    return;
  }

  Object.keys(checkedState).forEach(key => {
    if (key.startsWith(`${type}_`)) {
      checkedState[key] = false;
    }
  });
  
  // スクリーンリーダーへの通知
  announceToScreenReader(`${label}タスクをリセットしました`);

  saveState();
  renderAll();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * 全タスクをリセット
 */
function resetAll() {
  if (!confirm('全チェックをリセットしますか？')) {
    return;
  }

  checkedState = {};
  
  // スクリーンリーダーへの通知
  announceToScreenReader('全てのタスクをリセットしました');

  saveState();
  renderAll();
  closeMenu(); // モバイルでメニューを閉じる
}

// ============================================================================
// 初期化
// ============================================================================

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // ハンバーガーメニュー
  const menuToggleBtn = getElement('menuToggleBtn');
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', toggleMenu);
  }

  // オーバーレイクリックでメニューを閉じる
  const menuOverlay = getElement('menuOverlay');
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }

  // ESCキーでメニューを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  // 最低限モードボタン
  const minimumBtn = getElement('minimumBtn');
  if (minimumBtn) {
    minimumBtn.addEventListener('click', toggleMinimumMode);
  }

  // リセットボタン
  const dailyResetBtn = getElement('dailyResetBtn');
  if (dailyResetBtn) {
    dailyResetBtn.addEventListener('click', () => resetCategory('daily'));
  }

  // モバイル専用デイリーリセットボタン
  const dailyResetBtnMobile = getElement('dailyResetBtnMobile');
  if (dailyResetBtnMobile) {
    dailyResetBtnMobile.addEventListener('click', () => resetCategory('daily'));
  }

  const weeklyResetBtn = getElement('weeklyResetBtn');
  if (weeklyResetBtn) {
    weeklyResetBtn.addEventListener('click', () => resetCategory('weekly'));
  }

  const seasonResetBtn = getElement('seasonResetBtn');
  if (seasonResetBtn) {
    seasonResetBtn.addEventListener('click', () => resetCategory('season'));
  }

  const resetAllBtn = getElement('resetAllBtn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', resetAll);
  }

  // ウィンドウリサイズ時にメニューを閉じる（PC表示に戻った時）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 700) {
        closeMenu();
      }
    }, 250);
  });
}

/**
 * アプリケーションを初期化
 */
function init() {
  // 最低限モードが有効な場合、UIを更新
  if (minimumMode) {
    const btn = getElement('minimumBtn');
    if (btn) {
      btn.textContent = '最低限モード ON';
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
  }

  setupEventListeners();
  renderAll();
}

// DOMの準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
