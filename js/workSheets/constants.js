// ============================================================
// 定数定義
// ============================================================
const STATUS = {
  SUBSTITUTE_WORK: '振替出勤日',
  SUBSTITUTE_OFF:  '振替休日',
  FLEX:            '変則勤務',
  COMPENSATORY:    '代休',
};

const SUBSTITUTE_VISIBLE_STATUSES = [
  STATUS.COMPENSATORY,
  STATUS.SUBSTITUTE_OFF,
  STATUS.SUBSTITUTE_WORK
];

const OFF_STATUSES = [
  '有休', '有休（計画）', 'プロジェクト休暇', '特別休暇', '代休',
  '振替休日', '休業', '欠勤', '欠勤（生理休暇）',
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const STORAGE_KEY      = 'workData';
const BP_STORAGE_KEY   = 'workData_bp';
const MODE_KEY         = 'workMode';
const EVENT_STORAGE_KEY = 'eventData';
const CHECKIN_KEY      = 'simpleCheckIn';
const ROUND_DIFFS_KEY  = 'roundDiffs';

