// ============================================================
// 定数定義
// ============================================================

// 振替代休対象日の入力欄を表示する勤務実績
// 勤務実績の比較は calc.js も含めて文字列リテラルで統一している
// （Excelマクロの仕様と対照して読めるようにするため）
const SUBSTITUTE_VISIBLE_STATUSES = ['代休', '振替休日', '振替出勤日'];

// 時刻入力不可の勤務実績
// VBA「関連チェック」で時刻・遅刻早退・対象日の入力があればエラーとなる状態に対応
const OFF_STATUSES = [
  '有休', '有休（計画）', 'プロジェクト休暇', '特別休暇', '代休',
  '振替休日', '休業', '欠勤', '欠勤（生理休暇）', '休職',
];

// 時刻入力が任意の勤務実績
// VBA「関連チェック」が時刻の有無を一切検査していない（休業対応で追加された）状態
const OPTIONAL_TIME_STATUSES = [
  '休業半日', '休業（研修）', '休業（研修）半日',
  '休業(研修)/午後半休', '午前半休/休業(研修)',
];

// 始業時間。日マタギ勤務の終了時刻の上限判定に使う（VBA con始業時間）
const WORK_START_TIME = '09:00';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 作業内容の最大文字数（Excel作業確認表の記入欄に合わせた制限）
const CONTENT_MAX_LENGTH = 27;

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const STORAGE_KEY        = 'workData';
const BP_STORAGE_KEY     = 'workData_bp';
const MODE_KEY           = 'workMode';
const EVENT_STORAGE_KEY  = 'eventData';
const CHECKIN_KEY        = 'simpleCheckIn';
const ROUND_DIFFS_KEY    = 'roundDiffs';
const BP_ROUND_DIFFS_KEY = 'roundDiffs_bp';
const LAST_EXPORT_KEY    = 'lastExportAt';
const BACKUP_SNOOZE_KEY  = 'backupSnoozeUntil';

// 最終エクスポートからこの日数が経つとバックアップを促す
const BACKUP_REMIND_DAYS = 7;
