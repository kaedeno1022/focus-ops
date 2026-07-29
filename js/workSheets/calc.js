// ============================================================
// 勤怠計算（2026年度_個人作業確認表_Ver29.xlsm のVBA「作業票集計」準拠）
//
// Excel側マクロと集計結果を一致させるため、VBAの計算手順をそのまま移植している。
// 元の関数名との対応:
//   calcDaily()            ... Function 作業時間計 + Function 作業時間チェック の控除時間部分
//   calcMonthlySummary()   ... Function summary計算
//   validateDailyEntry()   ... Function 関連チェック のうち1日分で判定できるもの
//
// VBAは「時間計算」ボタンで1か月分をまとめて検証するが、こちらは1日ずつ入力するため、
// 月全体を見ないと判定できないチェック（振替の同週ペア、入退社日）は
// 登録時に弾かず calcMonthlySummary() の警告として返している。
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

// 年休を半日消化する勤務実績。実労働日数の按分に使う
const HALF_LEAVE_STATUSES = ['午前半休', '午前半休（計画）', '午後半休', '午後半休（計画）'];

// 4週4休の休日カウントから除外する勤務実績（VBA summary計算 の【法定休日】チェック）
const NOT_HOLIDAY_STATUSES = [
  '有休', '有休（計画）', '欠勤', '欠勤（生理休暇）', '特別休暇', 'プロジェクト休暇', '休職',
];

const MIN_HOLIDAYS_PER_4WEEKS = 4;  // VBA con4週4休

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
  const weekday = getWeekday(d.日付);

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

function previousDate(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return '';
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

// 勤務実績・時刻・対象日・遅刻早退のいずれかが入力されているか
// VBA 日毎時間計算 の入社日前／退社日後の判定に合わせ、事由（作業内容）は見ない
function hasAttendanceInput(d) {
  return !!(d.勤務実績 || d.作業開始 || d.作業終了 || d.振替代休対象日 || d.遅刻早退);
}

// 1日分の入力チェック。エラーメッセージを返す（問題なければ空文字）
// allData には同月の他の日を含む全データを渡す。自分自身は日付で除外する
function validateDailyEntry(item, allData = []) {
  const status = item.勤務実績 || '';
  const start  = item.作業開始 || '';
  const end    = item.作業終了 || '';
  const target = item.振替代休対象日 || '';
  const others = allData.filter(d => d.日付 !== item.日付);

  // 18:00以降の休憩は、18:00から休憩時間分を取り切れる勤務でなければ選択できない
  const restHours = parseFloat(item['18時以降休憩'] || '0') || 0;
  if (restHours > 0) {
    if (!start || !end) return '作業開始・終了時間が未入力のため、休憩は選択できません。';
    const startMin = timeToMinutes(start);
    const endMin   = timeToMinutes(end) <= startMin
      ? timeToMinutes(end) + MIDNIGHT_MIN
      : timeToMinutes(end);
    if (18 * 60 + restHours * 60 > endMin) return '18:00以降の休憩は取得できません。';
  }

  if ((status === '午前半休' || status === '午前半休（計画）') && start &&
      timeToMinutes(start) < 14 * 60) {
    return '午前半休は、9:00～14:00　です。';
  }
  if ((status === '午後半休' || status === '午後半休（計画）') && end &&
      timeToMinutes(end) > 14 * 60) {
    return '午後半休は、14:00～18:00　です。';
  }

  if (status === '振替出勤日' && start && end &&
      calcDaily(item).作業時間 < HOURS_PER_DAY) {
    return '振替出勤は<休日>と<通常の労働日>の入れ替えなので8時間勤務が必要です。';
  }

  // 前日の作業が0:00を越えている（＝終了時刻が始業時間より前）と有休は取得できない
  if (status === '有休' || status === '有休（計画）') {
    const prev = others.find(d => d.日付 === previousDate(item.日付));
    if (prev && prev.作業終了 && prev.作業終了 < WORK_START_TIME) {
      return '前日作業が0:00を超えると、有休の取得ができません。';
    }
  }

  if (status === '振替休日') {
    if (!target) return '＜振替休日の対象日＞が未入力です。';
    if (target.slice(0, 7) !== item.日付.slice(0, 7)) {
      return '振替出勤日/振替休日は同週内（日曜～土曜）に取得してください。';
    }
    const targetDay = others.find(d => d.日付 === target);
    if (!targetDay || targetDay.勤務実績 !== '振替出勤日') {
      return '振替休日の対象日が<振替出勤日>でありません。';
    }
  }

  if (status === '代休') {
    if (!target) return '＜代休の対象日＞が未入力です。';
    // 対象日が同月内のときだけ内容を検証する（前月の休日出勤に対する代休は検証できない）
    if (target.slice(0, 7) === item.日付.slice(0, 7)) {
      const targetDay = others.find(d => d.日付 === target);
      if (!targetDay || targetDay.勤務実績 !== '休日出勤') {
        return '代休の対象日が<休日出勤日>でありません。';
      }
      if (target < item.日付 && calcDaily(targetDay).作業時間 < HOURS_PER_DAY) {
        return `代休の対象日 ${target} の作業時間が8時間未満です。`;
      }
    }
  }

  if ((status === '振替休日' || status === '代休') && target &&
      others.some(d => d.勤務実績 === status && d.振替代休対象日 === target)) {
    return `${status}の対象日が重複しています。`;
  }

  return '';
}

// 月内の週の区切りを返す。VBA summary計算 の 週開始年月日/週終了年月日
// 最初の週は月初からその週の土曜まで、以降は日曜〜土曜。月をまたがない
function buildWeekRanges(year, month) {
  const lastDay      = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();  // 0=日
  const ranges = [{ start: 1, end: Math.min(1 + (6 - firstWeekday), lastDay) }];
  while (ranges[ranges.length - 1].end < lastDay) {
    const start = ranges[ranges.length - 1].end + 1;
    ranges.push({ start, end: Math.min(start + 6, lastDay) });
  }
  return ranges;
}

// 1か月分を集計する。month は 'YYYY-MM'
function calcMonthlySummary(dataArray, month) {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();

  const byDay = new Map();
  dataArray.forEach(d => {
    if (d.日付 && d.日付.startsWith(month)) byDay.set(Number(d.日付.slice(8, 10)), d);
  });

  const s = {
    実総作業時間: 0, 法定時間外労働時間: 0, 法定休日労働時間: 0, 深夜労働時間: 0,
    不就労控除時間: 0, 所定外労働割増なし: 0, 所定外労働割増あり: 0,
    休業日数: 0, 休業研修日数: 0,
    労働日数: 0, 法定休日出勤日数: 0, 振替休日取得日数: 0, 代休取得日数: 0,
    有休日数: 0, 計画年休日数: 0, 欠勤回数: 0, 生理休暇日数: 0, 休職日数: 0,
    遅刻回数: 0, 早退回数: 0,
    休職期間: [], 入社日: '', 退社日: '', 警告: [],
  };

  const weeks = buildWeekRanges(year, mon)
    .map(r => ({ ...r, 労働時間週計: 0, 日法定外労働時間週計: 0 }));

  let 休職継続中 = false;
  let 休日カウント = 0;
  const 入社日リスト = [];
  const 退社日リスト = [];

  for (let day = 1; day <= lastDay; day++) {
    const weekday = WEEKDAYS[new Date(year, mon - 1, day).getDay()];
    const d       = byDay.get(day);
    const status  = d ? (d.勤務実績 || '') : '';
    const daily   = d ? calcDaily(d) : null;

    // 4週4休の休日カウント。実績が入っていない日も休日として数える
    if ((!daily || daily.作業時間 === 0) && !NOT_HOLIDAY_STATUSES.includes(status)) 休日カウント++;

    // 休職期間は休職以外の平日が現れた時点で途切れる（日曜は勤休区分が休日のため途切れない）
    if (休職継続中 && status !== '休職' && weekday !== '日') 休職継続中 = false;

    if (!daily) continue;

    // 週別の労働時間集計。法定休日労働（日曜の休日出勤）は週40時間の判定に含めない
    if (!(weekday === '日' && status === '休日出勤')) {
      const w = weeks.find(w => day >= w.start && day <= w.end);
      w.労働時間週計         += daily.作業時間 - daily.法定休日労働時間;
      w.日法定外労働時間週計 += daily.日法定外時間;
    }

    s.実総作業時間       += daily.作業時間;
    s.法定休日労働時間   += daily.法定休日労働時間;
    s.深夜労働時間       += daily.深夜労働時間;
    s.不就労控除時間     += daily.日控除時間;
    s.所定外労働割増なし += daily.所定外労働割増なし;
    s.所定外労働割増あり += daily.所定外労働割増あり;

    const 遅刻早退 = d.遅刻早退 || '';
    if (遅刻早退.includes('遅刻')) s.遅刻回数++;
    if (遅刻早退.includes('早退')) s.早退回数++;

    // 実労働日数。半休の日は0.5日として数える
    if (daily.作業時間 !== 0)               s.労働日数 += 1;
    if (HALF_LEAVE_STATUSES.includes(status)) s.労働日数 -= 0.5;

    if (status.includes('入社日')) 入社日リスト.push(day);
    if (status.includes('退社日')) 退社日リスト.push(day);

    switch (status) {
      case '振替休日':
        s.振替休日取得日数++;
        break;
      case '代休':
        s.代休取得日数++;
        break;
      case '休日出勤':
        if (weekday === '日') s.法定休日出勤日数++;
        break;
      case '有休':
        s.有休日数 += 1;
        break;
      case '有休（計画）':
        s.有休日数 += 1;
        s.計画年休日数 += 1;
        break;
      case '午前半休':
      case '午後半休':
        s.有休日数 += 0.5;
        break;
      case '午前半休（計画）':
      case '午後半休（計画）':
        s.有休日数 += 0.5;
        s.計画年休日数 += 0.5;
        break;
      case '欠勤':
        s.欠勤回数++;
        break;
      case '欠勤（生理休暇）':
        s.欠勤回数++;
        s.生理休暇日数++;
        break;
      case '休職':
        s.休職日数++;
        if (休職継続中) {
          s.休職期間[s.休職期間.length - 1] = `${s.休職期間[s.休職期間.length - 1].split('-')[0]}-${day}`;
        } else {
          s.休職期間.push(`${day}-`);
          休職継続中 = true;
        }
        break;
      case '休業':
        s.休業日数 += 1;
        break;
      case '休業半日':
        s.休業日数 += 0.5;
        break;
      case '休業（研修）':
        s.休業研修日数 += 1;
        break;
      case '休業（研修）半日':
        s.休業研修日数 += 0.5;
        break;
      case '休業(研修)/午後半休':
      case '午前半休/休業(研修)':
        s.休業研修日数 += 0.5;
        s.有休日数     += 0.5;
        break;
    }
  }

  // 法定時間外労働時間は、週40時間超と日8時間超の週合計のうち大きい方を週ごとに積む
  s.法定時間外労働時間 = weeks.reduce((sum, w) => sum + Math.max(
    Math.max(w.労働時間週計 - HOURS_PER_WEEK, 0),
    w.日法定外労働時間週計
  ), 0);

  if (休日カウント < MIN_HOLIDAYS_PER_4WEEKS) {
    s.警告.push('4週4日の休日が不足しています。作業確認表取込時、差し戻しとなる可能性があります。');
  }

  // 振替出勤日と振替休日は同じ週（日曜〜土曜）で同数でなければならない
  weeks.forEach(w => {
    let 振替出勤 = 0;
    let 振替休日 = 0;
    for (let day = w.start; day <= w.end; day++) {
      const st = byDay.has(day) ? byDay.get(day).勤務実績 : '';
      if (st === '振替出勤日') 振替出勤++;
      if (st === '振替休日')   振替休日++;
    }
    if (振替出勤 !== 振替休日) {
      s.警告.push(
        `${w.start}日〜${w.end}日の週で振替出勤日と振替休日の数が一致していません。` +
        '同週内（日曜～土曜）に取得してください。月の最終週の場合は、月末までに' +
        '振替休日が取得できなければ振替出勤日を「休日出勤」にしてください。'
      );
    }
  });

  // 入社日・退社日
  s.入社日 = 入社日リスト.length ? String(入社日リスト[0]) : '';
  s.退社日 = 退社日リスト.length ? String(退社日リスト[0]) : '';
  if (入社日リスト.length > 1) s.警告.push('入社日が複数の日に入力されています。');
  if (退社日リスト.length > 1) s.警告.push('退社日が複数の日に入力されています。');
  if (入社日リスト.length && 退社日リスト.length && 入社日リスト[0] >= 退社日リスト[0]) {
    s.警告.push('入社日・退社日が不正です。');
  }
  if (入社日リスト.length &&
      [...byDay].some(([day, d]) => day < 入社日リスト[0] && hasAttendanceInput(d))) {
    s.警告.push('入社日より前の日に勤怠が入力されています。');
  }
  if (退社日リスト.length &&
      [...byDay].some(([day, d]) => day > 退社日リスト[0] && hasAttendanceInput(d))) {
    s.警告.push('退社日より後の日に勤怠が入力されています。');
  }

  return s;
}
