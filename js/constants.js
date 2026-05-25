// ============================================================================
// 定数定義
// ============================================================================

/** LocalStorageのキー */
const STORAGE_KEYS = {
  CHECKED: 'nte_checked',
  MINIMUM: 'nte_minimum',
  VISIBILITY: 'nte_visibility',
  CUSTOM_TASKS: 'nte_custom_tasks',
  COMMENTS: 'nte_comments',
  EDITED_DEFAULT_TASKS: 'nte_edited_default_tasks',
  COOKIE_CONSENT: 'nte_cookie_consent'
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
