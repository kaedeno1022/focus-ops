// ============================================================================
// 定数定義
// ============================================================================

/** LocalStorageのキー */
const STORAGE_KEYS = {
  CHECKED: 'nte_checked',
  MINIMUM: 'nte_minimum',
  VISIBILITY: 'nte_visibility',
  CUSTOM_TASKS: 'nte_custom_tasks',
  COMMENTS: 'nte_comments',
  EDITED_DEFAULT_TASKS: 'nte_edited_default_tasks',
  COOKIE_CONSENT: 'nte_cookie_consent'
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

/** タスク表示設定 */
let taskVisibility = loadFromStorage(STORAGE_KEYS.VISIBILITY) || {};

/** カスタムタスク */
let customTasks = loadFromStorage(STORAGE_KEYS.CUSTOM_TASKS) || {
  daily: [],
  weekly: [],
  season: []
};

/** タスクコメント */
let taskComments = loadFromStorage(STORAGE_KEYS.COMMENTS) || {};

/** 編集されたデフォルトタスク */
let editedDefaultTasks = loadFromStorage(STORAGE_KEYS.EDITED_DEFAULT_TASKS) || {};

/** 現在編集中のタスク情報 */
let editingTask = null;

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
 * 状態をLocalStorageに保存（サイズ制限チェック付き）
 */
function saveState() {
  try {
    const checkedData = JSON.stringify(checkedState);
    const minimumData = JSON.stringify(minimumMode);
    const visibilityData = JSON.stringify(taskVisibility);
    const customData = JSON.stringify(customTasks);
    
    // データサイズチェック
    const totalSize = new Blob([checkedData, minimumData, visibilityData, customData]).size;
    if (totalSize > MAX_STORAGE_SIZE) {
      console.warn('Storage size limit approaching. Consider data cleanup.');
      announceToScreenReader('データ容量が上限に近づいています');
    }
    
    const commentsData = JSON.stringify(taskComments);
    const editedDefaultData = JSON.stringify(editedDefaultTasks);
    
    localStorage.setItem(STORAGE_KEYS.CHECKED, checkedData);
    localStorage.setItem(STORAGE_KEYS.MINIMUM, minimumData);
    localStorage.setItem(STORAGE_KEYS.VISIBILITY, visibilityData);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TASKS, customData);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, commentsData);
    localStorage.setItem(STORAGE_KEYS.EDITED_DEFAULT_TASKS, editedDefaultData);
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
 * タスクが表示されるべきか判定
 * @param {string} key - タスクキー
 * @returns {boolean} 表示するか
 */
function isTaskVisible(key) {
  // デフォルトは表示
  return taskVisibility[key] !== false;
}

/**
 * 優先度からカテゴリ名を取得
 * @param {string} priority - 優先度 (high/mid/low)
 * @returns {string} カテゴリ名
 */
function getCategoryFromPriority(priority) {
  const categoryMap = {
    high: '必須',
    mid: '余裕あれば',
    low: '確認系'
  };
  return categoryMap[priority] || '必須';
}

/**
 * 全タスクデータを取得（デフォルト + カスタム + 編集されたデフォルト）
 * @param {string} type - タスクタイプ
 * @returns {Array} タスクデータ配列
 */
function getAllTasks(type) {
  const defaultTasks = DATA[type] || [];
  const custom = customTasks[type] || [];
  const edited = editedDefaultTasks[type] || {};
  
  // カスタムタスクを優先度に基づいてカテゴリごとにグループ化
  const customGrouped = {};
  custom.forEach(task => {
    const category = getCategoryFromPriority(task.priority);
    if (!customGrouped[category]) {
      customGrouped[category] = [];
    }
    customGrouped[category].push([task.title, task.priority]);
  });
  
  // 編集されたデフォルトタスクで、カテゴリが変更されたものを追跡
  const editedByCategoryChange = {};
  
  // デフォルトタスクをディープコピー（元のDATAを変更しないため）
  // 編集されたデフォルトタスクがある場合は上書き
  const result = defaultTasks.map(group => {
    const tasks = group.tasks.map(([title, priority]) => {
      const key = createKey(type, group.category, title);
      if (edited[key]) {
        const newCategory = getCategoryFromPriority(edited[key].priority);
        // カテゴリが変更された場合
        if (newCategory !== group.category) {
          // 新しいカテゴリ用に保存
          if (!editedByCategoryChange[newCategory]) {
            editedByCategoryChange[newCategory] = [];
          }
          editedByCategoryChange[newCategory].push([edited[key].title, edited[key].priority]);
          // 元のカテゴリからは削除（nullを返す）
          return null;
        }
        // 同じカテゴリ内での編集
        return [edited[key].title, edited[key].priority];
      }
      return [title, priority];
    }).filter(task => task !== null); // nullを除外
    
    return {
      category: group.category,
      tasks: [...tasks]
    };
  });
  
  // カスタムタスクをマージ
  Object.keys(customGrouped).forEach(category => {
    const existingCategory = result.find(g => g.category === category);
    if (existingCategory) {
      existingCategory.tasks.push(...customGrouped[category]);
    } else {
      result.push({
        category: category,
        tasks: customGrouped[category]
      });
    }
  });
  
  // カテゴリ変更された編集済みデフォルトタスクをマージ
  Object.keys(editedByCategoryChange).forEach(category => {
    const existingCategory = result.find(g => g.category === category);
    if (existingCategory) {
      existingCategory.tasks.push(...editedByCategoryChange[category]);
    } else {
      result.push({
        category: category,
        tasks: editedByCategoryChange[category]
      });
    }
  });
  
  return result;
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

  // コメント表示（コメントがある場合のみ）
  const comment = taskComments[key];
  if (comment) {
    const commentDisplay = document.createElement('div');
    commentDisplay.className = 'comment-display';
    commentDisplay.textContent = comment;
    commentDisplay.style.cursor = 'pointer';
    commentDisplay.addEventListener('click', () => {
      checkbox.click();
    });
    task.appendChild(commentDisplay);
  }

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
    
    const categories = getAllTasks(type);
    if (!categories) return;
    
    categories.forEach(group => {
      // 最低限モードで必須以外をスキップ
      if (minimumMode && group.category !== REQUIRED_CATEGORY) {
        return;
      }
      
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        
        // 表示設定をチェック
        if (!isTaskVisible(key)) {
          return;
        }
        
        total++;
        
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

  const categories = getAllTasks(type);
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

    let visibleTasksInCategory = 0;

    group.tasks.forEach(([title, priority]) => {
      const key = createKey(type, group.category, title);
      
      // 表示設定をチェック
      if (!isTaskVisible(key)) {
        return;
      }
      
      visibleTasksInCategory++;
      total++;

      const task = createTaskElement(type, group.category, title, priority);

      if (task.checked) {
        done++;
      }

      section.appendChild(task.element);
    });

    // カテゴリに表示可能なタスクがある場合のみ追加
    if (visibleTasksInCategory > 0) {
      container.appendChild(section);
    }
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

/**
 * 表示設定をリセット（全タスクを表示状態に戻す）
 */
function resetVisibility() {
  if (!confirm('全てのタスクを表示状態に戻しますか？')) {
    return;
  }

  taskVisibility = {};
  
  // スクリーンリーダーへの通知
  announceToScreenReader('表示設定をリセットしました');

  saveState();
  renderAll();
  renderVisibilitySettings();
}

/**
 * カスタムタスクを全削除
 */
function resetCustomTasks() {
  if (!confirm('全てのカスタムタスクを削除しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  // カスタムタスクのチェック状態も削除
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = customTasks[type] || [];
    tasks.forEach(task => {
      const category = getCategoryFromPriority(task.priority);
      const key = createKey(type, category, task.title);
      delete checkedState[key];
      delete taskComments[key];
      delete taskVisibility[key];
    });
  });

  // カスタムタスクをクリア
  customTasks = {
    daily: [],
    weekly: [],
    season: []
  };
  
  // スクリーンリーダーへの通知
  announceToScreenReader('カスタムタスクを全て削除しました');

  saveState();
  renderAll();
  renderCustomTaskList();
}

/**
 * デフォルトタスクの編集をリセット
 */
function resetEditedDefaultTasks() {
  if (!confirm('全てのデフォルトタスクの編集を元に戻しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  // 編集されたデフォルトタスクの古いチェック状態とコメントを削除
  ['daily', 'weekly', 'season'].forEach(type => {
    const edited = editedDefaultTasks[type] || {};
    Object.keys(edited).forEach(key => {
      const editData = edited[key];
      const newCategory = getCategoryFromPriority(editData.priority);
      const newKey = createKey(type, newCategory, editData.title);
      
      // 編集後のキーのデータを削除
      if (newKey !== key) {
        delete checkedState[newKey];
        delete taskComments[newKey];
      }
    });
  });

  // 編集されたデフォルトタスクをクリア
  editedDefaultTasks = {};
  
  // スクリーンリーダーへの通知
  announceToScreenReader('デフォルトタスクの編集を全てリセットしました');

  saveState();
  renderAll();
  renderCustomTaskList();
}

// ============================================================================
// 設定モーダル機能
// ============================================================================

/**
 * 設定モーダルを開く
 */
function openSettingsModal() {
  const modal = getElement('settingsModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  // スクロールバーの幅を計算してレイアウトシフトを防止
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  document.body.classList.add('no-scroll');
  
  // フォーカスをモーダル内に移動
  setTimeout(() => {
    const closeBtn = getElement('closeSettingsBtn');
    if (closeBtn) closeBtn.focus();
  }, 100);
  
  renderVisibilitySettings();
  renderCustomTaskList();
  closeMenu();
}

/**
 * 設定モーダルを閉じる
 */
function closeSettingsModal() {
  const modal = getElement('settingsModal');
  if (!modal) return;
  
  modal.style.display = 'none';
  
  // スクロール防止とパディングを解除
  document.body.classList.remove('no-scroll');
  document.body.style.paddingRight = '';
  
  // 編集モードをキャンセル
  if (editingTask) {
    cancelTaskEdit();
  }
}

/**
 * タブを切り替える
 * @param {string} tabName - タブ名 ('visibility' or 'custom')
 */
function switchTab(tabName) {
  const visibilityTab = getElement('visibilityTab');
  const customTaskTab = getElement('customTaskTab');
  const visibilityPanel = getElement('visibilityPanel');
  const customTaskPanel = getElement('customTaskPanel');
  
  if (tabName === 'visibility') {
    visibilityTab?.classList.add('active');
    customTaskTab?.classList.remove('active');
    visibilityPanel?.classList.add('active');
    customTaskPanel?.classList.remove('active');
  } else {
    visibilityTab?.classList.remove('active');
    customTaskTab?.classList.add('active');
    visibilityPanel?.classList.remove('active');
    customTaskPanel?.classList.add('active');
  }
}

/**
 * 表示設定をレンダリング
 */
function renderVisibilitySettings() {
  ['daily', 'weekly', 'season'].forEach(type => {
    const container = getElement(`${type}VisibilitySettings`);
    if (!container) return;
    
    container.innerHTML = '';
    
    // 重複を防ぐため、既に表示したタスクキーを記録
    const displayedKeys = new Set();
    
    const categories = getAllTasks(type);
    const edited = editedDefaultTasks[type] || {};
    
    // 元のデフォルトタスクも確認するため
    const defaultTasks = DATA[type] || [];
    const originalTasksMap = new Map(); // key -> {originalTitle, originalPriority, originalCategory}
    
    defaultTasks.forEach(group => {
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        originalTasksMap.set(key, {
          originalTitle: title,
          originalPriority: priority,
          originalCategory: group.category
        });
      });
    });
    
    categories.forEach(group => {
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        
        // 既に表示済みの場合はスキップ
        if (displayedKeys.has(key)) {
          return;
        }
        displayedKeys.add(key);
        
        const visible = isTaskVisible(key);
        
        const item = document.createElement('div');
        item.className = 'visibility-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = visible;
        checkbox.id = `vis_${key}`;
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `[${group.category}] ${title}`;
        
        checkbox.addEventListener('change', () => {
          taskVisibility[key] = checkbox.checked;
          saveState();
          renderAll();
        });
        
        // 編集ボタンを追加
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-main btn-small';
        editBtn.textContent = '編集';
        editBtn.type = 'button';
        
        // タスクがカスタムかデフォルトかを判定
        const isCustomTask = customTasks[type]?.some(t => 
          t.title === title && getCategoryFromPriority(t.priority) === group.category
        );
        
        // 元のタスク情報を特定（編集済みの場合を考慮）
        let originalInfo = null;
        if (!isCustomTask) {
          // 編集済みタスクから元の情報を探す
          for (const [origKey, editData] of Object.entries(edited)) {
            if (editData.title === title && getCategoryFromPriority(editData.priority) === group.category) {
              originalInfo = originalTasksMap.get(origKey);
              break;
            }
          }
          // 編集されていない場合は元のまま
          if (!originalInfo && originalTasksMap.has(key)) {
            originalInfo = originalTasksMap.get(key);
          }
        }
        
        editBtn.addEventListener('click', () => {
          if (originalInfo) {
            // デフォルトタスクの場合、元の情報を渡して開く
            openTaskEditForm(type, group.category, title, priority, false, originalInfo);
          } else {
            // カスタムタスクの場合
            openTaskEditForm(type, group.category, title, priority, true);
          }
        });
        
        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(editBtn);
        container.appendChild(item);
      });
    });
  });
}

/**
 * カスタムタスクリストをレンダリング
 */
function renderCustomTaskList() {
  const container = getElement('customTaskList');
  if (!container) return;
  
  container.innerHTML = '';
  
  let hasCustomTasks = false;
  
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = customTasks[type] || [];
    
    tasks.forEach((task, index) => {
      hasCustomTasks = true;
      
      const item = document.createElement('div');
      item.className = 'custom-task-item';
      
      const info = document.createElement('div');
      info.className = 'task-info';
      
      const typeLabel = {
        daily: 'デイリー',
        weekly: 'ウィークリー',
        season: 'シーズン'
      }[type];
      
      const priorityLabel = {
        high: '高',
        mid: '中',
        low: '低'
      }[task.priority];
      
      const category = getCategoryFromPriority(task.priority);
      
      const key = createKey(type, category, task.title);
      const comment = taskComments[key] || '';
      
      info.innerHTML = `
        <strong>${task.title}</strong><br>
        <small>${typeLabel} / ${category} / 優先度: ${priorityLabel}</small>
        ${comment ? `<br><small class="task-comment-small">💬 ${comment}</small>` : ''}
      `;
      
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'button-group';
      
      // 編集ボタン
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-main btn-small';
      editBtn.textContent = '編集';
      editBtn.type = 'button';
      
      editBtn.addEventListener('click', () => {
        openTaskEditForm(type, category, task.title, task.priority, true);
      });
      
      // 削除ボタン
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger btn-small';
      deleteBtn.textContent = '削除';
      deleteBtn.type = 'button';
      
      deleteBtn.addEventListener('click', () => {
        if (confirm(`「${task.title}」を削除しますか？`)) {
          customTasks[type].splice(index, 1);
          
          // コメントも削除
          const category = getCategoryFromPriority(task.priority);
          const key = createKey(type, category, task.title);
          if (taskComments[key]) {
            delete taskComments[key];
          }
          
          saveState();
          renderCustomTaskList();
          renderAll();
          announceToScreenReader(`${task.title}を削除しました`);
        }
      });
      
      buttonGroup.appendChild(editBtn);
      buttonGroup.appendChild(deleteBtn);
      
      item.appendChild(info);
      item.appendChild(buttonGroup);
      container.appendChild(item);
    });
  });
  
  if (!hasCustomTasks) {
    container.innerHTML = '<p class="empty-message">カスタムタスクはまだ追加されていません。</p>';
  }
}

/**
 * カスタムタスクを追加
 * @param {Event} e - フォームイベント
 */
function addCustomTask(e) {
  e.preventDefault();
  
  const form = e.target;
  const type = form.taskType.value;
  const title = form.taskTitle.value.trim();
  const priority = form.taskPriority.value;
  const comment = form.taskComment.value.trim();
  
  if (!title) {
    alert('タスク名を入力してください。');
    return;
  }
  
  // 編集モードの場合
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn.dataset.editMode === 'true') {
    saveTaskEdit(type, title, priority, comment);
    cancelTaskEdit();
    return;
  }
  
  // 優先度に基づいてカテゴリを自動設定
  const category = getCategoryFromPriority(priority);
  
  // 重複チェック
  const key = createKey(type, category, title);
  const allTasks = getAllTasks(type);
  let isDuplicate = false;
  
  allTasks.forEach(group => {
    group.tasks.forEach(([taskTitle]) => {
      const existingKey = createKey(type, group.category, taskTitle);
      if (existingKey === key) {
        isDuplicate = true;
      }
    });
  });
  
  if (isDuplicate) {
    alert('同じ名前のタスクが既に存在します。');
    return;
  }
  
  // カスタムタスクを追加
  if (!customTasks[type]) {
    customTasks[type] = [];
  }
  
  customTasks[type].push({
    title,
    priority
  });
  
  // コメントがある場合は保存
  if (comment) {
    const key = createKey(type, category, title);
    taskComments[key] = comment;
  }
  
  saveState();
  form.reset();
  renderCustomTaskList();
  renderAll();
  
  const categoryLabel = getCategoryFromPriority(priority);
  const commentInfo = comment ? 'とコメント' : '';
  announceToScreenReader(`${title}を${categoryLabel}に追加しました${commentInfo}`);
}

/**
 * タスク編集フォームを開く
 * @param {string} type - タスクタイプ
 * @param {string} category - カテゴリー名
 * @param {string} title - タスクタイトル
 * @param {string} priority - 優先度
 * @param {boolean} isCustomTask - カスタムタスクかどうか
 * @param {Object} [originalInfo] - デフォルトタスクの元の情報（編集済みデフォルトタスクの場合）
 */
function openTaskEditForm(type, category, title, priority, isCustomTask, originalInfo = null) {
  const form = getElement('addTaskForm');
  if (!form) return;

  // 編集中のタスク情報を保存
  // originalInfoがある場合（編集済みデフォルトタスク）は元の情報を使用
  const editCategory = originalInfo ? originalInfo.originalCategory : category;
  const editTitle = originalInfo ? originalInfo.originalTitle : title;
  const editPriority = originalInfo ? originalInfo.originalPriority : priority;
  
  editingTask = {
    type,
    category: editCategory,
    title: editTitle,
    priority: editPriority,
    isCustomTask,
    originalKey: createKey(type, editCategory, editTitle)
  };

  // フォームに現在の値を設定
  form.taskType.value = type;
  form.taskTitle.value = title;
  form.taskPriority.value = priority;
  
  // コメントを取得（現在のキーで）
  const currentCategory = getCategoryFromPriority(priority);
  const currentKey = createKey(type, currentCategory, title);
  form.taskComment.value = taskComments[currentKey] || '';

  // 送信ボタンのテキストを変更
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'タスクを更新';
    submitBtn.dataset.editMode = 'true';
  }

  // フォームの上にメッセージを表示
  let editNotice = form.querySelector('.edit-notice');
  if (!editNotice) {
    editNotice = document.createElement('div');
    editNotice.className = 'edit-notice';
    form.insertBefore(editNotice, form.firstChild);
  }
  editNotice.textContent = `編集モード: ${title}`;
  editNotice.style.display = 'block';

  // キャンセルボタンを追加（まだなければ）
  let cancelBtn = form.querySelector('.cancel-edit-btn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary cancel-edit-btn';
    cancelBtn.textContent = '編集をキャンセル';
    submitBtn.insertAdjacentElement('afterend', cancelBtn);

    cancelBtn.addEventListener('click', cancelTaskEdit);
  }
  cancelBtn.style.display = 'inline-block';

  // 設定モーダルを開いてカスタムタスクタブに切り替え
  openSettingsModal();
  switchTab('custom');

  // タイトル入力欄にフォーカス
  setTimeout(() => form.taskTitle.focus(), 100);
}

/**
 * タスク編集をキャンセル
 */
function cancelTaskEdit() {
  const form = getElement('addTaskForm');
  if (!form) return;

  // フォームをリセット
  form.reset();

  // 送信ボタンのテキストを戻す
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'タスクを追加';
    delete submitBtn.dataset.editMode;
  }

  // 編集通知を非表示
  const editNotice = form.querySelector('.edit-notice');
  if (editNotice) {
    editNotice.style.display = 'none';
  }

  // キャンセルボタンを非表示
  const cancelBtn = form.querySelector('.cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }

  // 編集中のタスク情報をクリア
  editingTask = null;
}

/**
 * タスク編集を保存
 * @param {string} newType - 新しいタスクタイプ
 * @param {string} newTitle - 新しいタスクタイトル
 * @param {string} newPriority - 新しい優先度
 * @param {string} newComment - 新しいコメント
 */
function saveTaskEdit(newType, newTitle, newPriority, newComment) {
  if (!editingTask) return;

  const { type: oldType, category: oldCategory, title: oldTitle, isCustomTask, originalKey } = editingTask;
  const newCategory = getCategoryFromPriority(newPriority);
  const newKey = createKey(newType, newCategory, newTitle);
  
  // 現在のタスクのキーを取得（編集済みの場合は編集後のキー）
  let currentKey = originalKey;
  if (!isCustomTask) {
    const edited = editedDefaultTasks[oldType] || {};
    if (edited[originalKey]) {
      // 既に編集されている場合、現在のキーは編集後のもの
      const currentCategory = getCategoryFromPriority(edited[originalKey].priority);
      currentKey = createKey(oldType, currentCategory, edited[originalKey].title);
    }
  } else {
    currentKey = createKey(oldType, oldCategory, oldTitle);
  }

  if (isCustomTask) {
    // カスタムタスクの編集
    const taskIndex = customTasks[oldType]?.findIndex(t => 
      t.title === oldTitle && getCategoryFromPriority(t.priority) === oldCategory
    );

    if (taskIndex !== -1) {
      // タスクタイプが変更された場合
      if (oldType !== newType) {
        // 古いタイプから削除
        customTasks[oldType].splice(taskIndex, 1);
        // 新しいタイプに追加
        if (!customTasks[newType]) {
          customTasks[newType] = [];
        }
        customTasks[newType].push({
          title: newTitle,
          priority: newPriority
        });
      } else {
        // 同じタイプ内で更新
        customTasks[oldType][taskIndex] = {
          title: newTitle,
          priority: newPriority
        };
      }
    }
  } else {
    // デフォルトタスクの編集
    if (!editedDefaultTasks[oldType]) {
      editedDefaultTasks[oldType] = {};
    }
    
    // タスクタイプが変更された場合は、カスタムタスクとして追加
    if (oldType !== newType) {
      // 元のデフォルトタスクを非表示にする
      taskVisibility[originalKey] = false;
      
      // 編集記録から削除
      if (editedDefaultTasks[oldType] && editedDefaultTasks[oldType][originalKey]) {
        delete editedDefaultTasks[oldType][originalKey];
      }
      
      // 新しいタイプにカスタムタスクとして追加
      if (!customTasks[newType]) {
        customTasks[newType] = [];
      }
      customTasks[newType].push({
        title: newTitle,
        priority: newPriority
      });
    } else {
      // 同じタイプ内で編集情報を保存（originalKeyをキーとして使用）
      editedDefaultTasks[oldType][originalKey] = {
        title: newTitle,
        priority: newPriority,
        originalTitle: oldTitle,
        originalPriority: editingTask.priority
      };
    }
  }

  // チェック状態とコメントを移行（currentKeyから新しいキーへ）
  if (currentKey !== newKey) {
    if (checkedState[currentKey]) {
      checkedState[newKey] = checkedState[currentKey];
      delete checkedState[currentKey];
    }
    
    if (taskComments[currentKey]) {
      // 古いコメントを新しいキーに移動（新しいコメントがない場合）
      if (!newComment) {
        taskComments[newKey] = taskComments[currentKey];
      }
      delete taskComments[currentKey];
    }
  }

  // 新しいコメントを保存
  if (newComment) {
    taskComments[newKey] = newComment;
  } else if (!taskComments[newKey]) {
    // 新しいコメントがなく、移行もされていない場合は削除
    delete taskComments[newKey];
  }

  saveState();
  renderCustomTaskList();
  renderAll();
  renderVisibilitySettings();

  announceToScreenReader(`${newTitle}を更新しました`);
}

// ============================================================================
// 初期化
// ============================================================================

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // 設定ボタン
  const settingsBtn = getElement('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  
  // 設定モーダル閉じるボタン
  const closeSettingsBtn = getElement('closeSettingsBtn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  
  // モーダル外クリックで閉じる
  const settingsModal = getElement('settingsModal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }
  
  // タブ切り替え
  const visibilityTab = getElement('visibilityTab');
  if (visibilityTab) {
    visibilityTab.addEventListener('click', () => switchTab('visibility'));
  }
  
  const customTaskTab = getElement('customTaskTab');
  if (customTaskTab) {
    customTaskTab.addEventListener('click', () => switchTab('custom'));
  }
  
  // カスタムタスク追加フォーム
  const addTaskForm = getElement('addTaskForm');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', addCustomTask);
  }

  // 表示設定リセットボタン
  const resetVisibilityBtn = getElement('resetVisibilityBtn');
  if (resetVisibilityBtn) {
    resetVisibilityBtn.addEventListener('click', resetVisibility);
  }

  // カスタムタスクリセットボタン
  const resetCustomTasksBtn = getElement('resetCustomTasksBtn');
  if (resetCustomTasksBtn) {
    resetCustomTasksBtn.addEventListener('click', resetCustomTasks);
  }

  // デフォルトタスク編集リセットボタン
  const resetEditedDefaultTasksBtn = getElement('resetEditedDefaultTasksBtn');
  if (resetEditedDefaultTasksBtn) {
    resetEditedDefaultTasksBtn.addEventListener('click', resetEditedDefaultTasks);
  }

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
      closeSettingsModal();
      closePrivacyModal();
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

  // Cookie同意バナー
  const acceptCookies = getElement('acceptCookies');
  if (acceptCookies) {
    acceptCookies.addEventListener('click', handleAcceptCookies);
  }

  const declineCookies = getElement('declineCookies');
  if (declineCookies) {
    declineCookies.addEventListener('click', handleDeclineCookies);
  }

  // プライバシーポリシー
  const privacyPolicyBtn = getElement('privacyPolicyBtn');
  if (privacyPolicyBtn) {
    privacyPolicyBtn.addEventListener('click', openPrivacyModal);
  }

  const closePrivacyBtn = getElement('closePrivacyBtn');
  if (closePrivacyBtn) {
    closePrivacyBtn.addEventListener('click', closePrivacyModal);
  }

  const privacyModal = getElement('privacyModal');
  if (privacyModal) {
    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) {
        closePrivacyModal();
      }
    });
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

// ============================================================================
// Cookie同意とプライバシーポリシー
// ============================================================================

/**
 * Cookie同意バナーを表示
 */
function showCookieConsent() {
  const banner = getElement('cookieConsent');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Cookie同意バナーを非表示
 */
function hideCookieConsent() {
  const banner = getElement('cookieConsent');
  if (banner) {
    banner.style.display = 'none';
  }
}

/**
 * Cookie同意を処理
 */
function handleAcceptCookies() {
  try {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
    hideCookieConsent();
    // GA4は既に有効なので、ここでは特に何もしない
  } catch (error) {
    console.error('Cookie同意の保存に失敗:', error);
  }
}

/**
 * Cookie拒否を処理
 */
function handleDeclineCookies() {
  try {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'declined');
    hideCookieConsent();
    // GA4を無効化
    if (typeof window.gtag === 'function') {
      window['ga-disable-G-WPV9BG4YSJ'] = true;
    }
  } catch (error) {
    console.error('Cookie拒否の保存に失敗:', error);
  }
}

/**
 * Cookie同意状態をチェックして初期化
 */
function initCookieConsent() {
  try {
    const consent = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    
    if (!consent) {
      // 同意状態が保存されていない場合、バナーを表示
      showCookieConsent();
    } else if (consent === 'declined') {
      // 拒否されている場合、GA4を無効化
      if (typeof window.gtag === 'function') {
        window['ga-disable-G-WPV9BG4YSJ'] = true;
      }
    }
  } catch (error) {
    console.error('Cookie同意状態の確認に失敗:', error);
    showCookieConsent();
  }
}

/**
 * プライバシーポリシーモーダルを開く
 */
function openPrivacyModal() {
  const modal = getElement('privacyModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    
    // モーダル内の最初のフォーカス可能な要素にフォーカス
    const closeBtn = getElement('closePrivacyBtn');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }
}

/**
 * プライバシーポリシーモーダルを閉じる
 */
function closePrivacyModal() {
  const modal = getElement('privacyModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('no-scroll');
  }
}

/**
 * アプリケーションを初期化
 */
function init() {
  // Cookie同意を初期化
  initCookieConsent();
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
