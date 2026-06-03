// ============================================================================
// タスク要素の生成とレンダリング
// ============================================================================

/**
 * 完了ステータスIDを返す（固定）
 */
function getDoneStatusId() {
  return DONE_STATUS_ID;
}

/**
 * 未着手ステータスIDを返す（最小order）
 */
function getTodoStatusId() {
  return KANBAN_STATUSES.reduce((min, s) => s.order < min.order ? s : min, KANBAN_STATUSES[0]).id;
}

/**
 * 担当者データを配列へ正規化（旧データ文字列にも対応）
 * @param {string|string[]|undefined|null} value
 * @returns {string[]}
 */
function normalizeAssigneeListForRender(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(name => String(name).trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes(',')) {
      return [...new Set(trimmed.split(',').map(name => name.trim()).filter(Boolean))];
    }
    return [trimmed];
  }

  return [];
}

/**
 * 締め切りバッジを生成
 * @param {string} deadline
 * @returns {HTMLElement|null}
 */
function createDeadlineBadge(deadline) {
  if (!deadline) return null;

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

  return deadlineElem;
}

/**
 * 詳細モードでのタスク完了判定（taskStatusの最終ステータスかどうか）
 * @param {string} key - タスクキー
 * @returns {boolean}
 */
function isTaskDetailDone(key) {
  const currentStatusId = taskStatus[key] || (KANBAN_STATUSES[0] && KANBAN_STATUSES[0].id);
  return currentStatusId === DONE_STATUS_ID;
}

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
  const isDetail = displayMode === 'detail';
  const checked = checkedState[key] || false;

  const task = document.createElement('div');
  task.className = `task ${checked ? 'done' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  if (isDetail) {
    checkbox.setAttribute('aria-hidden', 'true');
    checkbox.style.display = 'none';
  } else {
    checkbox.id = `task_${key}`;
    checkbox.setAttribute('aria-label', title);
  }

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
  titleDiv.title = title;

  const label = document.createElement('label');
  if (!isDetail) {
    label.htmlFor = checkbox.id;
  }
  label.className = 'task-label';

  task.appendChild(checkbox);
  label.appendChild(srPriority);
  label.appendChild(priorityDiv);
  label.appendChild(titleDiv);
  task.appendChild(label);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'task-edit-btn';
  editBtn.title = 'タスクを編集';
  editBtn.setAttribute('aria-label', `${title}を編集`);
  const taskEditIcon = document.createElement('span');
  taskEditIcon.className = 'edit-icon';
  taskEditIcon.setAttribute('aria-hidden', 'true');
  taskEditIcon.textContent = '✏';
  editBtn.appendChild(taskEditIcon);
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof openTaskEditFromMain === 'function') {
      openTaskEditFromMain(type, category, title, priority);
    }
  });
  task.appendChild(editBtn);

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
      const maxLen = 12;
      projectBadge.textContent = project.name.length > maxLen
        ? project.name.slice(0, maxLen) + '…'
        : project.name;
      projectBadge.title = project.name;
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
      const maxLen = 10;
      tagBadge.textContent = tag.name.length > maxLen
        ? tag.name.slice(0, maxLen) + '…'
        : tag.name;
      tagBadge.title = tag.name;
      tagBadge.style.backgroundColor = tag.color;
      metaContainer.appendChild(tagBadge);
    }
  });

  // 担当者表示（管理者モード時のみ）
  const assigneeNames = normalizeAssigneeListForRender(taskAssignees[key]);
  if (adminMode && assigneeNames.length > 0) {
    const assigneeBadge = document.createElement('span');
    assigneeBadge.className = 'task-badge assignee-badge';
    const fullText = `担当: ${assigneeNames.join(' / ')}`;
    const maxLen = 20;
    assigneeBadge.textContent = fullText.length > maxLen
      ? fullText.slice(0, maxLen) + '…'
      : fullText;
    assigneeBadge.title = fullText;
    metaContainer.appendChild(assigneeBadge);
  }

  // 終了日表示（締め切りとして表示）
  const deadlineBadge = createDeadlineBadge(taskEndDates[key]);
  if (deadlineBadge) {
    metaContainer.appendChild(deadlineBadge);
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

  // カンバンステータスバッジ（詳細モード時のみ表示）
  if (KANBAN_STATUSES.length > 0 && isDetail) {
    const currentStatusId = taskStatus[key] || KANBAN_STATUSES[0].id;
    const currentStatus = KANBAN_STATUSES.find(s => s.id === currentStatusId) || KANBAN_STATUSES[0];
    const statusBadge = document.createElement('button');
    statusBadge.type = 'button';
    statusBadge.className = 'task-status-badge';
    statusBadge.textContent = `状態: ${currentStatus.name}`;
    statusBadge.style.backgroundColor = currentStatus.color;
    statusBadge.title = 'クリックしてステータスを変更';
    statusBadge.setAttribute('aria-label', `状態を${currentStatus.name}に変更`);
    statusBadge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showStatusDropdown(statusBadge, key);
    });
    metaContainer.insertBefore(statusBadge, metaContainer.firstChild);
  }

  task.appendChild(metaContainer);

  // コメント表示（コメントがある場合のみ）
  const comment = taskComments[key];
  if (comment) {
    const commentDisplay = document.createElement('div');
    commentDisplay.className = 'comment-display';
    const MAX_COMMENT_DISPLAY = 100;
    if (comment.length > MAX_COMMENT_DISPLAY) {
      commentDisplay.textContent = comment.slice(0, MAX_COMMENT_DISPLAY) + '…';
    } else {
      commentDisplay.textContent = comment;
    }
    commentDisplay.title = comment;
    if (!isDetail) {
      commentDisplay.style.cursor = 'pointer';
      commentDisplay.addEventListener('click', () => {
        checkbox.click();
      });
    }
    task.appendChild(commentDisplay);
  }

  // チェックボックスのchangeイベント（シンプルモードのみ）
  if (!isDetail) {
    checkbox.addEventListener('change', () => {
      if (checkbox.dataset.locked === 'true') return;
      checkbox.dataset.locked = 'true';
      checkbox.disabled = true;
      setTimeout(() => {
        checkbox.disabled = false;
        checkbox.dataset.locked = 'false';
      }, 260);

      checkedState[key] = checkbox.checked;
      // taskStatusも連動
      if (KANBAN_STATUSES.length > 0) {
        taskStatus[key] = checkbox.checked ? getDoneStatusId() : getTodoStatusId();
      }
      const statusText = checkbox.checked ? '完了' : '未完了';
      announceToScreenReader(`${title}を${statusText}にしました`);
      saveState();
      task.classList.toggle('done', checkbox.checked);
      updateProgressOnly();
    });
  }

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
        
        // プロジェクトフィルターを適用
        if (projectFilter && taskProjects[key] !== projectFilter) {
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

  // 今週表示の場合、長期タスクから期間内のものを追加
  let additionalTasks = [];
  if (type === 'weekly') {
    const seasonCategories = getAllTasks('season');
    if (seasonCategories) {
      seasonCategories.forEach(group => {
        group.tasks.forEach(([title, priority]) => {
          const key = createKey('season', group.category, title);
          if (isTaskVisible(key) && isTaskInActivePeriod(key)) {
            // プロジェクトフィルターを適用
            if (projectFilter && taskProjects[key] !== projectFilter) {
              return;
            }
            additionalTasks.push({
              category: group.category,
              title,
              priority,
              originalType: 'season'
            });
          }
        });
      });
    }
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
      
      // プロジェクトフィルターを適用
      if (projectFilter && taskProjects[key] !== projectFilter) {
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

  // 今週表示の場合、長期タスクから自動追加されたタスクを表示
  if (type === 'weekly' && additionalTasks.length > 0) {
    const autoSection = document.createElement('div');
    autoSection.className = 'category';
    autoSection.setAttribute('role', 'group');
    autoSection.setAttribute('aria-label', '自動追加（長期タスク）');

    const autoHeader = document.createElement('div');
    autoHeader.className = 'category-header';
    autoHeader.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;';
    autoHeader.textContent = '📌 自動追加（長期 ⇒ 今週）';

    autoSection.appendChild(autoHeader);

    let autoVisibleCount = 0;

    additionalTasks.forEach(({ category, title, priority, originalType }) => {
      const key = createKey(originalType, category, title);
      const task = createTaskElement(originalType, category, title, priority);

      if (task.checked) {
        done++;
      }

      total++;
      autoVisibleCount++;
      autoSection.appendChild(task.element);
    });

    if (autoVisibleCount > 0) {
      container.appendChild(autoSection);
    }
  }

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
 * タスクが今週内かどうかを判定（開始日または終了日が今週内）
 * @param {string} key - タスクキー
 * @returns {boolean}
 */
function isTaskInActivePeriod(key) {
  const startDate = taskStartDates[key];
  const endDate = taskEndDates[key];
  
  // 両方とも未設定の場合はfalse
  if (!startDate && !endDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 今週の開始（月曜）と終了（日曜）を計算
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // 開始日が今週内にある
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (start >= weekStart && start <= weekEnd) return true;
  }
  
  // 終了日が今週内にある
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end >= weekStart && end <= weekEnd) return true;
  }
  
  return false;
}

/**
 * 全セクションを再レンダリング
 */
function renderAll() {
  // パフォーマンス最適化: requestAnimationFrame で描画を最適化
  requestAnimationFrame(() => {
    if (kanbanViewMode) {
      renderKanbanView();
    } else {
      renderSection('daily');
      renderSection('weekly');
      renderSection('season');
    }

    if (typeof updateMinimumModeNotice === 'function') {
      updateMinimumModeNotice();
    }
  });
}

/**
 * ステータス変更ドロップダウンを表示
 * @param {HTMLElement} anchor - ドロップダウンを表示する基準要素
 * @param {string} key - タスクキー
 */
function showStatusDropdown(anchor, key) {
  document.querySelectorAll('.status-dropdown').forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'status-dropdown';
  const currentStatusId = taskStatus[key] || (KANBAN_STATUSES[0] && KANBAN_STATUSES[0].id);

  KANBAN_STATUSES.forEach(status => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'status-dropdown-item' + (status.id === currentStatusId ? ' active' : '');

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.style.backgroundColor = status.color;
    item.appendChild(dot);
    item.append(status.name);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      taskStatus[key] = status.id;

      // checkedStateも連動（完了ステータス↔チェック状態の双方向同期）
      const isDone = isTaskDetailDone(key);
      checkedState[key] = isDone;
      const taskEl = anchor.closest('.task');
      if (taskEl) taskEl.classList.toggle('done', isDone);
      announceToScreenReader(`ステータスを${status.name}に変更しました`);
      updateProgressOnly();

      saveState();
      closeDropdown();
      if (kanbanViewMode) {
        renderKanbanView();
      } else {
        anchor.textContent = `状態: ${status.name}`;
        anchor.style.backgroundColor = status.color;
      }
    });
    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);
  const margin = 8;

  const placeDropdown = () => {
    if (!dropdown.isConnected) return;

    const rect = anchor.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // position: absolute なので document 基準で座標を計算する。
    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 4;

    // 右端・左端のはみ出しを防止
    if (left + dropdownRect.width > scrollX + viewportWidth - margin) {
      left = Math.max(scrollX + margin, scrollX + viewportWidth - dropdownRect.width - margin);
    }

    // 下にはみ出す場合は上側に表示
    if (top + dropdownRect.height > scrollY + viewportHeight - margin) {
      top = rect.top + scrollY - dropdownRect.height - 4;
    }

    // それでも上にはみ出す場合は最小マージン位置に固定
    if (top < scrollY + margin) {
      top = scrollY + margin;
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  };

  let rafId = null;
  const schedulePlaceDropdown = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      placeDropdown();
    });
  };

  const handleScrollClose = () => {
    closeDropdown();
  };

  const closeDropdown = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('resize', schedulePlaceDropdown);
    window.removeEventListener('scroll', handleScrollClose, true);
    window.removeEventListener('wheel', handleScrollClose, true);
    window.removeEventListener('touchmove', handleScrollClose, true);
    if (dropdown.isConnected) {
      dropdown.remove();
    }
  };

  placeDropdown();

  window.addEventListener('resize', schedulePlaceDropdown);
  window.addEventListener('scroll', handleScrollClose, true);
  window.addEventListener('wheel', handleScrollClose, true);
  window.addEventListener('touchmove', handleScrollClose, true);

  setTimeout(() => {
    document.addEventListener('click', closeDropdown, { once: true });
  }, 0);
}

/**
 * カンバンボードをレンダリング
 */
function renderKanbanView() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  board.innerHTML = '';

  const allTasks = [];
  ['daily', 'weekly', 'season'].forEach(type => {
    const categories = getAllTasks(type);
    if (!categories) return;
    categories.forEach(group => {
      if (minimumMode && group.category !== REQUIRED_CATEGORY) return;
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        if (!isTaskVisible(key)) return;
        allTasks.push({ type, category: group.category, title, priority, key });
      });
    });
  });

  KANBAN_STATUSES.forEach(status => {
    const column = document.createElement('div');
    column.className = 'kanban-column';

    const header = document.createElement('div');
    header.className = 'kanban-column-header';
    header.style.borderTopColor = status.color;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'kanban-column-title';
    titleSpan.textContent = status.name;

    const countSpan = document.createElement('span');
    countSpan.className = 'kanban-count';

    header.appendChild(titleSpan);
    header.appendChild(countSpan);
    column.appendChild(header);

    const cards = document.createElement('div');
    cards.className = 'kanban-cards';

    const tasksInColumn = allTasks.filter(t => {
      const sid = taskStatus[t.key] || (KANBAN_STATUSES[0] && KANBAN_STATUSES[0].id);
      return sid === status.id;
    });

    countSpan.textContent = tasksInColumn.length;
    tasksInColumn.forEach(({ type, category, title, priority, key }) => {
      cards.appendChild(createKanbanCard(type, category, title, priority, key));
    });

    column.appendChild(cards);
    board.appendChild(column);
  });
}

/**
 * カンバンカードを作成
 * @param {string} type - タスクタイプ
 * @param {string} category - カテゴリー
 * @param {string} title - タイトル
 * @param {string} priority - 優先度
 * @param {string} key - タスクキー
 * @returns {HTMLElement}
 */
function createKanbanCard(type, category, title, priority, key) {
  const card = document.createElement('div');
  card.className = 'kanban-card' + (checkedState[key] ? ' done' : '');

  const topRow = document.createElement('div');
  topRow.className = 'kanban-card-top';

  const typeBadge = document.createElement('span');
  typeBadge.className = `kanban-type-badge type-${type}`;
  typeBadge.textContent = { daily: '今日', weekly: '今週', season: '長期' }[type];

  const priorityDot = document.createElement('div');
  priorityDot.className = `priority ${priority}`;

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'kanban-edit-btn';
  editBtn.title = 'タスクを編集';
  editBtn.setAttribute('aria-label', `${title}を編集`);
  const kanbanEditIcon = document.createElement('span');
  kanbanEditIcon.className = 'edit-icon';
  kanbanEditIcon.setAttribute('aria-hidden', 'true');
  kanbanEditIcon.textContent = '✏';
  editBtn.appendChild(kanbanEditIcon);
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof openTaskEditFromMain === 'function') {
      openTaskEditFromMain(type, category, title, priority);
    }
  });

  topRow.appendChild(typeBadge);
  topRow.appendChild(priorityDot);
  topRow.appendChild(editBtn);
  card.appendChild(topRow);

  const titleDiv = document.createElement('div');
  titleDiv.className = 'kanban-card-title';
  titleDiv.textContent = title;
  card.appendChild(titleDiv);

  const metaRow = document.createElement('div');
  metaRow.className = 'kanban-card-meta';

  const projectId = taskProjects[key];
  if (projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    if (project && project.id !== 'proj-none') {
      const projectBadge = document.createElement('span');
      projectBadge.className = 'task-badge project-badge';
      projectBadge.textContent = project.name;
      projectBadge.style.backgroundColor = project.color;
      metaRow.appendChild(projectBadge);
    }
  }

  const tagIds = taskTags[key] || [];
  tagIds.forEach(tagId => {
    const tag = TAGS.find(t => t.id === tagId);
    if (!tag) return;
    const tagBadge = document.createElement('span');
    tagBadge.className = 'task-badge tag-badge';
    tagBadge.textContent = tag.name;
    tagBadge.style.backgroundColor = tag.color;
    metaRow.appendChild(tagBadge);
  });

  const kanbanDeadlineBadge = createDeadlineBadge(taskEndDates[key]);
  if (kanbanDeadlineBadge) {
    kanbanDeadlineBadge.classList.add('kanban-deadline');
    metaRow.appendChild(kanbanDeadlineBadge);
  }

  if (metaRow.children.length > 0) {
    card.appendChild(metaRow);
  }

  const comment = taskComments[key];
  if (comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'kanban-card-comment';
    commentDiv.textContent = comment;
    card.appendChild(commentDiv);
  }

  const assigneeNames = normalizeAssigneeListForRender(taskAssignees[key]);
  if (adminMode && assigneeNames.length > 0) {
    const assigneeDiv = document.createElement('div');
    assigneeDiv.className = 'kanban-card-assignee';
    assigneeDiv.textContent = `担当: ${assigneeNames.join(' / ')}`;
    card.appendChild(assigneeDiv);
  }

  const footer = document.createElement('div');
  footer.className = 'kanban-card-footer';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'kanban-status-select';
  KANBAN_STATUSES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    opt.selected = (taskStatus[key] || (KANBAN_STATUSES[0] && KANBAN_STATUSES[0].id)) === s.id;
    statusSelect.appendChild(opt);
  });
  statusSelect.addEventListener('change', () => {
    taskStatus[key] = statusSelect.value;
    saveState();
    renderKanbanView();
  });

  footer.appendChild(statusSelect);
  card.appendChild(footer);

  return card;
}
