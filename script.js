// ============================================================================
// 定数定義
// ============================================================================

/** LocalStorageのキー */
const STORAGE_KEYS = {
  CHECKED: 'nte_checked',
  MINIMUM: 'nte_minimum',
  VISIBILITY: 'nte_visibility',
  CUSTOM_TASKS: 'nte_custom_tasks'
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
    
    localStorage.setItem(STORAGE_KEYS.CHECKED, checkedData);
    localStorage.setItem(STORAGE_KEYS.MINIMUM, minimumData);
    localStorage.setItem(STORAGE_KEYS.VISIBILITY, visibilityData);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TASKS, customData);
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
 * 全タスクデータを取得（デフォルト + カスタム）
 * @param {string} type - タスクタイプ
 * @returns {Array} タスクデータ配列
 */
function getAllTasks(type) {
  const defaultTasks = DATA[type] || [];
  const custom = customTasks[type] || [];
  
  // カスタムタスクを優先度に基づいてカテゴリごとにグループ化
  const customGrouped = {};
  custom.forEach(task => {
    const category = getCategoryFromPriority(task.priority);
    if (!customGrouped[category]) {
      customGrouped[category] = [];
    }
    customGrouped[category].push([task.title, task.priority]);
  });
  
  // デフォルトタスクをディープコピー（元のDATAを変更しないため）
  const result = defaultTasks.map(group => ({
    category: group.category,
    tasks: [...group.tasks]
  }));
  
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
  document.body.style.overflow = 'hidden';
  
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
  document.body.style.overflow = '';
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
        
        item.appendChild(checkbox);
        item.appendChild(label);
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
      
      info.innerHTML = `
        <strong>${task.title}</strong><br>
        <small>${typeLabel} / ${category} / 優先度: ${priorityLabel}</small>
      `;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger btn-small';
      deleteBtn.textContent = '削除';
      deleteBtn.type = 'button';
      
      deleteBtn.addEventListener('click', () => {
        if (confirm(`「${task.title}」を削除しますか？`)) {
          customTasks[type].splice(index, 1);
          saveState();
          renderCustomTaskList();
          renderAll();
          announceToScreenReader(`${task.title}を削除しました`);
        }
      });
      
      item.appendChild(info);
      item.appendChild(deleteBtn);
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
  
  if (!title) {
    alert('タスク名を入力してください。');
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
  
  saveState();
  form.reset();
  renderCustomTaskList();
  renderAll();
  
  const categoryLabel = getCategoryFromPriority(priority);
  announceToScreenReader(`${title}を${categoryLabel}に追加しました`);
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
