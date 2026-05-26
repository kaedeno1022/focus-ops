// ============================================================
// 定数定義
// ============================================================
export const STATUS = {
  SUBSTITUTE_WORK: '振替出勤日',
  SUBSTITUTE_OFF:  '振替休日',
  FLEX:            '変則勤務',
  COMPENSATORY:    '代休',
};

export const SUBSTITUTE_VISIBLE_STATUSES = [
  STATUS.COMPENSATORY,
  STATUS.SUBSTITUTE_OFF,
  STATUS.SUBSTITUTE_WORK
];

export const OFF_STATUSES = [
  '有休', '有休（計画）', 'プロジェクト休暇', '特別休暇', '代休',
  '振替休日', '休業', '欠勤', '欠勤（生理休暇）',
];

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

export const STORAGE_KEY     = 'workData';
export const BP_STORAGE_KEY  = 'workData_bp';
export const MODE_KEY        = 'workMode';
export const EVENT_STORAGE_KEY = 'eventData';
export const CHECKIN_KEY     = 'simpleCheckIn';
export const ROUND_DIFFS_KEY = 'roundDiffs';
