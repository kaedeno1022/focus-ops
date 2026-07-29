// ============================================================
// 勤怠計算（2026年度_個人作業確認表_Ver29.xlsm のVBA「作業票集計」準拠）
//
// Excel側マクロと集計結果を一致させるため、VBAの計算手順をそのまま移植している。
// 元の関数名との対応:
//   calcDaily()  ... Function 作業時間計 + Function 作業時間チェック の控除時間部分
// ============================================================

const HOURS_PER_DAY  = 8;   // VBA con日法定労働時間（1日の法定労働時間）
const HOURS_PER_WEEK = 40;  // VBA con週法定労働時間（1週の法定労働時間）

const LUNCH_START_MIN = 12 * 60;  // VBA con昼休憩st
const LUNCH_END_MIN   = 13 * 60;  // VBA con昼休憩end
const NIGHT_START_MIN = 22 * 60;  // VBA con深夜帯st
const NIGHT_END_MIN   =  5 * 60;  // VBA con深夜帯end
const MIDNIGHT_MIN    = 24 * 60;

// 所定労働時間が0時間の勤務実績（VBA 作業時間計 の w所定時間 判定）
const NO_SCHEDULED_WORK_STATUSES = [
  '有休', '有休（計画）', 'プロジェクト休暇', '特別休暇', '休業', '欠勤',
  '欠勤（生理休暇）', '休職', '休業（研修）', '振替休日', '代休', '休日出勤',
];

// 所定労働時間が半日の勤務実績
const HALF_DAY_STATUSES = [
  '午前半休', '午前半休（計画）', '午後半休', '午後半休（計画）',
  '休業半日', '休業（研修）半日', '休業(研修)/午後半休', '午前半休/休業(研修)',
];

// 半日分（4時間）を基準に不就労控除を計算する勤務実績
// VBA 作業時間計 の日控除時間集計。休業（研修）半日だけ対象外なのもVBAどおり
const HALF_DAY_DEDUCTION_STATUSES = [
  '午前半休', '午前半休（計画）', '午後半休', '午後半休（計画）',
  '休業半日', '休業(研修)/午後半休', '午前半休/休業(研修)',
];

// VBA Application.RoundUp(x, 2) 相当。小数第3位で切り上げる。
// 浮動小数の誤差でひと桁余計に切り上がらないよう、比較前に丸めておく
function roundUpHours(hours) {
  const scaled = Number((hours * 100).toFixed(6));
  return (hours < 0 ? -Math.ceil(-scaled) : Math.ceil(scaled)) / 100;
}

// 拘束時間から法定で必要な休憩時間（時間）を求める。VBA 作業時間計 の w法定休憩時間
function requiredBreakHours(totalMinutes) {
  if (totalMinutes > HOURS_PER_DAY * 60) return 1;     // 8時間超 → 60分
  if (totalMinutes > 6 * 60)             return 0.75;  // 6時間超 → 45分
  return 0;
}

// 深夜帯（22:00〜翌5:00）と勤務時間の重なりを時間で返す。VBA 作業時間計 の深夜労働時間集計
// 引数は当日0:00起点の分。作業開始が5:00より前なら前日22:00からの帯とみなす
function calcNightHours(startMin, endMin) {
  const nightStart = startMin < NIGHT_END_MIN ? NIGHT_START_MIN - MIDNIGHT_MIN : NIGHT_START_MIN;
  const nightEnd   = startMin < NIGHT_END_MIN ? NIGHT_END_MIN : NIGHT_END_MIN + MIDNIGHT_MIN;
  if (endMin < nightStart || startMin > nightEnd) return 0;
  return (Math.min(endMin, nightEnd) - Math.max(startMin, nightStart)) / 60;
}

// 1日分の勤怠を集計する。VBAの type勤怠詳細 に対応する値を返す
function calcDaily(d) {
  const result = {
    昼休憩時間:         0,
    定時以降休憩時間:   parseFloat(d['18時以降休憩'] || '0') || 0,
    休憩時間計:         0,
    作業時間:           0,
    法定休日労働時間:   0,
    深夜労働時間:       0,
    日法定外時間:       0,
    所定外労働割増なし: 0,
    所定外労働割増あり: 0,
    日控除時間:         0,
    時刻入力あり:       false,
  };

  const status  = d.勤務実績 || '';
  const weekday = d.日付 ? WEEKDAYS[new Date(d.日付).getDay()] : '';

  if (d.作業開始 && d.作業終了) {
    result.時刻入力あり = true;

    const startMin   = timeToMinutes(d.作業開始);
    // VBAは「開始 >= 終了」を日マタギとみなす
    const isOvernight = timeToMinutes(d.作業終了) <= startMin;
    const endMin     = timeToMinutes(d.作業終了) + (isOvernight ? MIDNIGHT_MIN : 0);
    const totalMin   = endMin - startMin;  // 拘束時間

    // 昼休憩は12:00〜13:00を完全に含む場合のみ1時間
    if (startMin <= LUNCH_START_MIN && endMin >= LUNCH_END_MIN) result.昼休憩時間 = 1;

    // 実際の休憩が法定休憩に満たない場合は法定休憩を採用する
    result.休憩時間計 = Math.max(
      result.定時以降休憩時間 + result.昼休憩時間,
      requiredBreakHours(totalMin)
    );

    result.作業時間     = roundUpHours((totalMin - result.休憩時間計 * 60) / 60);
    result.深夜労働時間 = calcNightHours(startMin, endMin);

    // 法定休日労働時間・日法定外時間
    if (isOvernight && weekday === '土') {
      // 土曜から日曜への日マタギ。0:00を境に土曜分と日曜分へ振り分ける
      const saturdayHours = (MIDNIGHT_MIN - startMin) / 60 - result.休憩時間計;
      if (saturdayHours > HOURS_PER_DAY) result.日法定外時間 = saturdayHours - HOURS_PER_DAY;
      result.法定休日労働時間 = (endMin - MIDNIGHT_MIN) / 60;
    } else if (weekday === '日' && status === '休日出勤') {
      result.法定休日労働時間 = result.作業時間;
    } else if (result.作業時間 > HOURS_PER_DAY) {
      result.日法定外時間 = result.作業時間 - HOURS_PER_DAY;
    }

    // 所定外労働時間
    let scheduledHours = HOURS_PER_DAY;
    if (NO_SCHEDULED_WORK_STATUSES.includes(status))  scheduledHours = 0;
    else if (HALF_DAY_STATUSES.includes(status))      scheduledHours = HOURS_PER_DAY * 0.5;

    if (status === '休日出勤' && weekday !== '日') {
      result.所定外労働割増あり =
        Math.min(result.作業時間 - result.法定休日労働時間, HOURS_PER_DAY) - scheduledHours;
    } else if ((status === '午前半休' || status === '午前半休（計画）') &&
               result.作業時間 > HOURS_PER_DAY * 0.5) {
      result.所定外労働割増なし = Math.min(result.作業時間, HOURS_PER_DAY) - scheduledHours;
    }

    // 不就労控除時間
    if (HALF_DAY_DEDUCTION_STATUSES.includes(status)) {
      if (result.作業時間 < HOURS_PER_DAY * 0.5) {
        result.日控除時間 = HOURS_PER_DAY * 0.5 - result.作業時間;
      }
    } else if (status !== '休日出勤' && result.作業時間 < HOURS_PER_DAY) {
      result.日控除時間 = HOURS_PER_DAY - result.作業時間;
    }
  }

  // 代休・欠勤・生理休暇は時刻入力の有無によらず1日分を控除する
  // VBA 作業時間チェック の【代休】【欠勤】チェック
  if (status === '代休' || status === '欠勤' || status === '欠勤（生理休暇）') {
    result.日控除時間 = HOURS_PER_DAY;
  }

  return result;
}

// 作業時間を分で返す。時刻未入力の日は null
function calcWorkMinutes(d) {
  if (!d.作業開始 || !d.作業終了) return null;
  return calcDaily(d).作業時間 * 60;
}
