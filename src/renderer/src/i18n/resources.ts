/** UI strings — 25+ locales; incomplete locales fall back to English via i18n. */

const en = {
  appTitle: 'कथा एकादेशको',
  appSubtitle: 'AI Story Studio',
  newProject: 'New Project',
  continueProject: 'Continue Project',
  style: 'Style',
  language: 'Language',
  aspectRatio: 'Aspect ratio',
  vertical: 'Vertical 9:16',
  horizontal: 'Horizontal 16:9',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  settings: 'Settings',
  storyMonitor: 'Story monitor',
  episodes: 'Episodes',
  characters: 'Characters',
  continuity: 'Continuity',
  scriptPreview: 'Script preview',
  ideaPlaceholder: 'One-line story seed (any language)…',
  generateBible: 'Generate',
  generateEpisode1: 'Generate Episode 1',
  continueNext: 'Continue next episode',
  continueFinal: 'Continue final episode',
  storyFinished: 'Story finished',
  saveProject: 'Save project',
  apiKeys: 'API keys',
  openaiKey: 'OpenAI',
  geminiKey: 'Gemini',
  deepseekKey: 'DeepSeek',
  leonardoKey: 'Leonardo',
  qualityMerge: 'Quality merge (2 AI passes)',
  fontClean: 'Clean',
  fontStory: 'Story',
  fontComic: 'Comic',
  recommendStyle: 'Recommend style from idea',
  statusNew: 'New',
  statusProgress: 'In progress',
  statusDone: 'Completed',
  noProject: 'No project loaded',
  loading: 'Working…',
  error: 'Error',
  regenerateScene: 'Regenerate scene',
  edit: 'Edit',
  done: 'Done',
  footer: '© 2026 Tryst BJ',
  styleSoftAnimeFantasy: 'Soft Anime Fantasy',
  styleCinematicAnime: 'Cinematic Anime',
  styleComicPanel: 'Comic Panel',
  styleDarkAnime: 'Dark Anime',
  styleRomanticGlow: 'Romantic Glow',
  providerUsed: 'Model',
  detectLanguage: 'Auto-detect',
  projects: 'Projects',
  storyHistory: 'Story history',
  storyHistoryHint:
    'Each generated story is saved on this device. Open one to continue or edit; delete removes it from this list only.',
  storyHistoryEmpty: 'No entries yet. Generate a story to create your first one.',
  storyHistoryOpen: 'Open',
  storyHistoryDelete: 'Remove',
  close: 'Close',
  deleteProject: 'Delete',
  openDocs: 'API docs'
}

const ne: typeof en = {
  ...en,
  appSubtitle: 'एआई कथा स्टुडियो',
  newProject: 'नयाँ परियोजना',
  continueProject: 'परियोजना जारी',
  style: 'शैली',
  language: 'भाषा',
  aspectRatio: 'आकार अनुपात',
  vertical: 'ठाडो ९:१६',
  horizontal: 'तेर्हो १६:९',
  settings: 'सेटिङ',
  storyMonitor: 'कथा मनिटर',
  episodes: 'भागहरू',
  characters: 'पात्रहरू',
  continuity: 'निरन्तरता',
  scriptPreview: 'पटकथा पूर्वावलोकन',
  ideaPlaceholder: 'एक लाइनको कथा (जुनसुकै भाषामा)…',
  generateBible: 'कथा बाइबल बनाउनुहोस्',
  generateEpisode1: 'भाग १ बनाउनुहोस्',
  continueNext: 'अर्को भाग जारी',
  continueFinal: 'अन्तिम भाग जारी',
  storyFinished: 'कथा समाप्त',
  saveProject: 'बचत गर्नुहोस्',
  footer: '© २०२६ ट्रिस्ट बीजे'
}

const hi: typeof en = {
  ...en,
  appSubtitle: 'एआई कहानी स्टूडियो',
  newProject: 'नया प्रोजेक्ट',
  continueProject: 'प्रोजेक्ट जारी रखें',
  style: 'शैली',
  language: 'भाषा',
  aspectRatio: 'अनुपात',
  vertical: 'वर्टिकल 9:16',
  horizontal: 'हॉरिज़ॉन्टल 16:9',
  settings: 'सेटिंग्स',
  storyMonitor: 'कहानी मॉनिटर',
  episodes: 'एपिसोड',
  characters: 'पात्र',
  continuity: 'निरंतरता',
  ideaPlaceholder: 'एक लाइन की कहानी…',
  generateBible: 'स्टोरी बाइबल बनाएं',
  generateEpisode1: 'एपिसोड 1 बनाएं',
  continueNext: 'अगला एपिसोड',
  continueFinal: 'अंतिम एपिसोड',
  storyFinished: 'कहानी पूर्ण',
  saveProject: 'सहेजें'
}

const ko: Partial<typeof en> = {
  appSubtitle: 'AI 스토리 스튜디오',
  newProject: '새 프로젝트',
  continueProject: '이어하기',
  settings: '설정',
  storyMonitor: '스토리 모니터',
  episodes: '에피소드',
  characters: '캐릭터',
  saveProject: '저장'
}

const ja: Partial<typeof en> = {
  appSubtitle: 'AIストーリースタジオ',
  newProject: '新規プロジェクト',
  continueProject: '続ける',
  settings: '設定',
  storyMonitor: 'ストーリーモニター',
  episodes: 'エピソード',
  characters: 'キャラクター',
  saveProject: '保存'
}

const zh: Partial<typeof en> = {
  appSubtitle: 'AI 故事工作室',
  newProject: '新建项目',
  continueProject: '继续项目',
  settings: '设置',
  storyMonitor: '故事监视器',
  episodes: '分集',
  characters: '角色',
  saveProject: '保存'
}

const ar: Partial<typeof en> = {
  appSubtitle: 'استوديو قصص بالذكاء الاصطناعي',
  newProject: 'مشروع جديد',
  continueProject: 'متابعة',
  settings: 'الإعدادات',
  storyMonitor: 'مراقب القصة',
  episodes: 'الحلقات',
  characters: 'الشخصيات',
  saveProject: 'حفظ'
}

const es: Partial<typeof en> = {
  appSubtitle: 'Estudio de historias con IA',
  newProject: 'Nuevo proyecto',
  continueProject: 'Continuar',
  settings: 'Ajustes',
  storyMonitor: 'Monitor de historia',
  episodes: 'Episodios',
  characters: 'Personajes',
  saveProject: 'Guardar'
}

const fr: Partial<typeof en> = {
  appSubtitle: 'Studio d’histoires IA',
  newProject: 'Nouveau projet',
  continueProject: 'Continuer',
  settings: 'Réglages',
  storyMonitor: 'Panneau histoire',
  episodes: 'Épisodes',
  characters: 'Personnages',
  saveProject: 'Enregistrer'
}

const de: Partial<typeof en> = {
  appSubtitle: 'KI‑Geschichtenstudio',
  newProject: 'Neues Projekt',
  continueProject: 'Fortsetzen',
  settings: 'Einstellungen',
  storyMonitor: 'Story‑Monitor',
  episodes: 'Episoden',
  characters: 'Charaktere',
  saveProject: 'Speichern'
}

const pt: Partial<typeof en> = {
  appSubtitle: 'Estúdio de histórias com IA',
  newProject: 'Novo projeto',
  continueProject: 'Continuar',
  settings: 'Configurações',
  storyMonitor: 'Monitor da história',
  episodes: 'Episódios',
  characters: 'Personagens',
  saveProject: 'Salvar'
}

const ru: Partial<typeof en> = {
  appSubtitle: 'ИИ‑студия историй',
  newProject: 'Новый проект',
  continueProject: 'Продолжить',
  settings: 'Настройки',
  storyMonitor: 'Монитор сюжета',
  episodes: 'Эпизоды',
  characters: 'Персонажи',
  saveProject: 'Сохранить'
}

const it: Partial<typeof en> = {
  appSubtitle: 'Studio storie IA',
  newProject: 'Nuovo progetto',
  continueProject: 'Continua',
  settings: 'Impostazioni',
  storyMonitor: 'Pannello storia',
  episodes: 'Episodi',
  characters: 'Personaggi',
  saveProject: 'Salva'
}

const tr: Partial<typeof en> = {
  appSubtitle: 'Yapay zekâ hikâye stüdyosu',
  newProject: 'Yeni proje',
  continueProject: 'Devam',
  settings: 'Ayarlar',
  storyMonitor: 'Hikâye paneli',
  episodes: 'Bölümler',
  characters: 'Karakterler',
  saveProject: 'Kaydet'
}

const th: Partial<typeof en> = {
  appSubtitle: 'สตูดิโอเล่าเรื่องด้วย AI',
  newProject: 'โปรเจกต์ใหม่',
  continueProject: 'ทำต่อ',
  settings: 'ตั้งค่า',
  storyMonitor: 'มอนิเตอร์เรื่อง',
  episodes: 'ตอน',
  characters: 'ตัวละคร',
  saveProject: 'บันทึก'
}

const vi: Partial<typeof en> = {
  appSubtitle: 'Studio truyện AI',
  newProject: 'Dự án mới',
  continueProject: 'Tiếp tục',
  settings: 'Cài đặt',
  storyMonitor: 'Theo dõi câu chuyện',
  episodes: 'Tập',
  characters: 'Nhân vật',
  saveProject: 'Lưu'
}

const id: Partial<typeof en> = {
  appSubtitle: 'Studio cerita AI',
  newProject: 'Proyek baru',
  continueProject: 'Lanjutkan',
  settings: 'Pengaturan',
  storyMonitor: 'Monitor cerita',
  episodes: 'Episode',
  characters: 'Karakter',
  saveProject: 'Simpan'
}

const pl: Partial<typeof en> = {
  appSubtitle: 'Studio historii AI',
  newProject: 'Nowy projekt',
  continueProject: 'Kontynuuj',
  settings: 'Ustawienia',
  storyMonitor: 'Monitor fabuły',
  episodes: 'Odcinki',
  characters: 'Postacie',
  saveProject: 'Zapisz'
}

const nl: Partial<typeof en> = {
  appSubtitle: 'AI‑verhalenstudio',
  newProject: 'Nieuw project',
  continueProject: 'Doorgaan',
  settings: 'Instellingen',
  storyMonitor: 'Verhaalmonitor',
  episodes: 'Afleveringen',
  characters: 'Personages',
  saveProject: 'Opslaan'
}

const uk: Partial<typeof en> = {
  appSubtitle: 'ІІ‑студія історій',
  newProject: 'Новий проєкт',
  continueProject: 'Продовжити',
  settings: 'Налаштування',
  storyMonitor: 'Монітор сюжету',
  episodes: 'Епізоди',
  characters: 'Персонажі',
  saveProject: 'Зберегти'
}

const fa: Partial<typeof en> = {
  appSubtitle: 'استودیو داستان هوش مصنوعی',
  newProject: 'پروژه جدید',
  continueProject: 'ادامه',
  settings: 'تنظیمات',
  storyMonitor: 'نمایشگر داستان',
  episodes: 'قسمت‌ها',
  characters: 'شخصیت‌ها',
  saveProject: 'ذخیره'
}

const he: Partial<typeof en> = {
  appSubtitle: 'סטודיו לסיפורים עם בינה מלאכותית',
  newProject: 'פרויקט חדש',
  continueProject: 'המשך',
  settings: 'הגדרות',
  storyMonitor: 'מעקב עלילה',
  episodes: 'פרקים',
  characters: 'דמויות',
  saveProject: 'שמור'
}

const bn: Partial<typeof en> = {
  appSubtitle: 'এআই গল্পের স্টুডিও',
  newProject: 'নতুন প্রকল্প',
  continueProject: 'চালিয়ে যান',
  settings: 'সেটিংস',
  storyMonitor: 'গল্প পর্যবেক্ষণ',
  episodes: 'পর্ব',
  characters: 'চরিত্র',
  saveProject: 'সংরক্ষণ'
}

const ta: Partial<typeof en> = {
  appSubtitle: 'AI கதை ஸ்டுடியோ',
  newProject: 'புதிய திட்டம்',
  continueProject: 'தொடரவும்',
  settings: 'அமைப்புகள்',
  storyMonitor: 'கதை கண்காணிப்பு',
  episodes: 'அத்தியாயங்கள்',
  characters: 'பாத்திரங்கள்',
  saveProject: 'சேமி'
}

const ur: Partial<typeof en> = {
  appSubtitle: 'AI کہانی اسٹوڈیو',
  newProject: 'نیا منصوبہ',
  continueProject: 'جاری رکھیں',
  settings: 'ترتیبات',
  storyMonitor: 'کہانی مانیٹر',
  episodes: 'اقساط',
  characters: 'کردار',
  saveProject: 'محفوظ'
}

const ms: Partial<typeof en> = {
  appSubtitle: 'Studio cerita AI',
  newProject: 'Projek baharu',
  continueProject: 'Teruskan',
  settings: 'Tetapan',
  storyMonitor: 'Monitor cerita',
  episodes: 'Episod',
  characters: 'Watak',
  saveProject: 'Simpan'
}

const el: Partial<typeof en> = {
  appSubtitle: 'Στούντιο ιστοριών AI',
  newProject: 'Νέο έργο',
  continueProject: 'Συνέχεια',
  settings: 'Ρυθμίσεις',
  storyMonitor: 'Παρακολούθηση',
  episodes: 'Επεισόδια',
  characters: 'Χαρακτήρες',
  saveProject: 'Αποθήκευση'
}

const cs: Partial<typeof en> = {
  appSubtitle: 'AI studio příběhů',
  newProject: 'Nový projekt',
  continueProject: 'Pokračovat',
  settings: 'Nastavení',
  storyMonitor: 'Monitor příběhu',
  episodes: 'Epizody',
  characters: 'Postavy',
  saveProject: 'Uložit'
}

const sv: Partial<typeof en> = {
  appSubtitle: 'AI‑berättelsestudio',
  newProject: 'Nytt projekt',
  continueProject: 'Fortsätt',
  settings: 'Inställningar',
  storyMonitor: 'Berättelsepanel',
  episodes: 'Avsnitt',
  characters: 'Karaktärer',
  saveProject: 'Spara'
}

function merge(base: typeof en, patch: Partial<typeof en>): typeof en {
  return { ...base, ...patch }
}

export const resources = {
  en: { translation: en },
  ne: { translation: merge(en, ne) },
  hi: { translation: merge(en, hi) },
  ko: { translation: merge(en, ko) },
  ja: { translation: merge(en, ja) },
  'zh-CN': { translation: merge(en, zh) },
  ar: { translation: merge(en, ar) },
  es: { translation: merge(en, es) },
  fr: { translation: merge(en, fr) },
  de: { translation: merge(en, de) },
  pt: { translation: merge(en, pt) },
  ru: { translation: merge(en, ru) },
  it: { translation: merge(en, it) },
  tr: { translation: merge(en, tr) },
  th: { translation: merge(en, th) },
  vi: { translation: merge(en, vi) },
  id: { translation: merge(en, id) },
  pl: { translation: merge(en, pl) },
  nl: { translation: merge(en, nl) },
  uk: { translation: merge(en, uk) },
  fa: { translation: merge(en, fa) },
  he: { translation: merge(en, he) },
  bn: { translation: merge(en, bn) },
  ta: { translation: merge(en, ta) },
  ur: { translation: merge(en, ur) },
  ms: { translation: merge(en, ms) },
  el: { translation: merge(en, el) },
  cs: { translation: merge(en, cs) },
  sv: { translation: merge(en, sv) }
} as const

export const LANGUAGE_OPTIONS: { code: keyof typeof resources; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ne', label: 'नेपाली', flag: '🇳🇵' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' }
]
