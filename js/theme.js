// ============================================================================
// テーマ管理（ダークモード）
// ============================================================================

const THEME_STORAGE_KEY = 'focus_ops_theme';

/**
 * 保存済みテーマを取得
 * @returns {'light'|'dark'|null}
 */
function getStoredTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY);
}

/**
 * 現在の実効テーマを取得（OSのデフォルト含む）
 * @returns {'light'|'dark'}
 */
function getEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * テーマを適用
 * @param {'light'|'dark'|null} theme - null でOS設定に追従
 */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
  updateThemeToggleBtns();
}

/**
 * テーマトグルボタンのUIを更新
 */
function updateThemeToggleBtns() {
  const isDark = getEffectiveTheme() === 'dark';
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.textContent = isDark ? '☀' : '🌙';
    btn.setAttribute('aria-label', isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    btn.setAttribute('aria-pressed', isDark.toString());
  });
}

/**
 * テーマをトグル（light ⇔ dark）
 */
function toggleTheme() {
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
}

/**
 * ページ読み込み時にテーマを初期化
 * flashを避けるため<head>のインラインスクリプトで呼ぶこと
 */
function initTheme() {
  applyTheme(getStoredTheme());

  // OSのダークモード変更を検知して追従（ユーザー設定がない場合のみ）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!getStoredTheme()) {
      updateThemeToggleBtns();
    }
  });
}
