// ============================================================================
// タスク要素の生成とレンダリング
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

  // メタ情報コンテナ
  const metaContainer = document.createElement('div');
  metaContainer.className = 'task-meta';

  // プロジェクト表示
  const projectId = taskProjects[key];
  if (projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    if (project && project.id !== 'proj-none') {
      const projectBadge = document.createElement('span');
      projectBadge.className = 'task-badge project-badge';
      projectBadge.textContent = project.name;
      projectBadge.style.backgroundColor = project.color;
      metaContainer.appendChild(projectBadge);
    }
  }

  // タグ表示
  const tags = taskTags[key] || [];
  tags.forEach(tagId => {
    const tag = TAGS.find(t => t.id === tagId);
    if (tag) {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'task-badge tag-badge';
      tagBadge.textContent = tag.name;
      tagBadge.style.backgroundColor = tag.color;
      metaContainer.appendChild(tagBadge);
    }
  });

  // 締め切り表示
  const deadline = taskDeadlines[key];
  if (deadline) {
    const deadlineElem = document.createElement('span');
    deadlineElem.className = 'task-deadline';
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      deadlineElem.className += ' deadline-overdue';
      deadlineElem.textContent = `⚠ 期限超過 (${Math.abs(diffDays)}日前)`;
    } else if (diffDays === 0) {
      deadlineElem.className += ' deadline-today';
      deadlineElem.textContent = '🔥 今日まで';
    } else if (diffDays <= 3) {
      deadlineElem.className += ' deadline-soon';
      deadlineElem.textContent = `⏰ ${diffDays}日後`;
    } else {
      deadlineElem.textContent = `📅 ${deadlineDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`;
    }
    metaContainer.appendChild(deadlineElem);
  }

  // 予想作業時間表示
  const estimatedTime = taskEstimatedTime[key];
  if (estimatedTime) {
    const timeElem = document.createElement('span');
    timeElem.className = 'task-time';
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    if (hours > 0) {
      timeElem.textContent = `⏱ ${hours}h${minutes > 0 ? minutes + 'm' : ''}`;
    } else {
      timeElem.textContent = `⏱ ${minutes}m`;
    }
    metaContainer.appendChild(timeElem);
  }

  if (metaContainer.children.length > 0) {
    task.appendChild(metaContainer);
  }

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
    
    // システムステータス更新
    updateSystemStatus();
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
      // 最低限モードで優先度：高以外をスキップ
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
    // 最低限モードで優先度：高以外をスキップ
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
