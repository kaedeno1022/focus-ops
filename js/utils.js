// ============================================================================
// ユーティリティ関数
// ============================================================================

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
 * トーストメッセージを表示
 * @param {string} message - 表示するメッセージ
 * @param {string} [type='success'] - トーストタイプ ('success' | 'error' | 'info')
 * @param {number} [duration=3000] - 表示時間（ミリ秒）
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  // トースト要素を作成
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // コンテナに追加
  container.appendChild(toast);
  
  // 指定時間後にフェードアウトして削除
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      toast.remove();
    }, 300); // アニメーション時間
  }, duration);
  
  // スクリーンリーダーにも通知
  announceToScreenReader(message);
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
    high: '優先度：高',
    mid: '優先度：中',
    low: '余裕があれば'
  };
  return categoryMap[priority] || '優先度：高';
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
      // 削除済みのデフォルトタスクはスキップ
      if (deletedDefaultTasks.has(key)) {
        return null;
      }
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
