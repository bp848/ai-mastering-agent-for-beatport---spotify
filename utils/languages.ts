/**
 * ISO 639-1 準拠 全世界184言語サポート
 * ネイティブ名（Endonym）で表示
 */
export const LANGUAGES = [
  ['aa', 'Qafar af'],      ['ab', 'Аҧсуа'],       ['ae', 'Avestan'],      ['af', 'Afrikaans'],
  ['ak', 'Ákán'],          ['am', 'አማርኛ'],        ['an', 'Aragonés'],     ['ar', 'العربية'],
  ['as', 'অসমীয়া'],       ['av', 'Авар мацӏ'],   ['ay', 'Aymara'],       ['az', 'Azərbaycan'],
  ['ba', 'Башҡорт'],       ['be', 'Беларуская'],   ['bg', 'Български'],    ['bh', 'भोजपुरी'],
  ['bi', 'Bislama'],       ['bm', 'Bamanankan'],   ['bn', 'বাংলা'],        ['bo', 'བོད་ཡིག'],
  ['br', 'Brezhoneg'],      ['bs', 'Bosanski'],     ['ca', 'Català'],       ['ce', 'Нохчийн'],
  ['ch', 'Chamoru'],        ['co', 'Corsu'],       ['cr', 'ᓀᐦᐃᔭᐁᐧᐃᐧᐣ'],    ['cs', 'Čeština'],
  ['cu', 'Славе́нскїй'],    ['cv', 'Чӑвашла'],     ['cy', 'Cymraeg'],      ['da', 'Dansk'],
  ['de', 'Deutsch'],        ['dv', 'ދިވެހި'],       ['dz', 'རྫོང་ཁ'],        ['ee', 'Èʋegbe'],
  ['el', 'Ελληνικά'],       ['en', 'English'],     ['eo', 'Esperanto'],    ['es', 'Español'],
  ['et', 'Eesti'],          ['eu', 'Euskara'],      ['fa', 'فارسی'],       ['ff', 'Fulfulde'],
  ['fi', 'Suomi'],          ['fj', 'Vosa Vakaviti'],['fo', 'Føroyskt'],   ['fr', 'Français'],
  ['fy', 'Frysk'],          ['ga', 'Gaeilge'],     ['gd', 'Gàidhlig'],    ['gl', 'Galego'],
  ['gn', 'Avañe\'ẽ'],       ['gu', 'ગુજરાતી'],     ['gv', 'Gaelg'],       ['ha', 'Hausa'],
  ['he', 'עברית'],          ['hi', 'हिन्दी'],       ['ho', 'Hiri Motu'],   ['hr', 'Hrvatski'],
  ['ht', 'Kreyòl'],         ['hu', 'Magyar'],      ['hy', 'Հայերեն'],     ['hz', 'Otjiherero'],
  ['ia', 'Interlingua'],    ['id', 'Indonesia'],   ['ie', 'Interlingue'],  ['ig', 'Igbo'],
  ['ii', 'ꆈꌠꉙ'],          ['ik', 'Iñupiaq'],     ['io', 'Ido'],          ['is', 'Íslenska'],
  ['it', 'Italiano'],       ['iu', 'ᐃᓄᒃᑎᑐᑦ'],     ['ja', '日本語'],       ['jv', 'Basa Jawa'],
  ['ka', 'ქართული'],       ['kg', 'Kikongo'],     ['ki', 'Gĩgĩkũyũ'],    ['kj', 'Oshikwanyama'],
  ['kk', 'Қазақша'],        ['kl', 'Kalaallisut'], ['km', 'ខេមរភាសា'],   ['kn', 'ಕನ್ನಡ'],
  ['ko', '한국어'],         ['kr', 'Kanuri'],      ['ks', 'कॉशुर'],       ['ku', 'Kurdî'],
  ['kv', 'Коми'],           ['kw', 'Kernowek'],    ['ky', 'Кыргызча'],    ['la', 'Latina'],
  ['lb', 'Lëtzebuergesch'], ['lg', 'Luganda'],     ['li', 'Limburgs'],     ['ln', 'Lingála'],
  ['lo', 'ພາສາລາວ'],       ['lt', 'Lietuvių'],    ['lu', 'Kiluba'],       ['lv', 'Latviešu'],
  ['mg', 'Malagasy'],       ['mh', 'Kajin M̧ajeļ'],['mi', 'Māori'],      ['mk', 'Македонски'],
  ['ml', 'മലയാളം'],        ['mn', 'Монгол'],      ['mr', 'मराठी'],       ['ms', 'Bahasa Melayu'],
  ['mt', 'Malti'],          ['my', 'မြန်မာစာ'],   ['na', 'Dorerin Naoero'],['nb', 'Norsk bokmål'],
  ['nd', 'isiNdebele'],     ['ne', 'नेपाली'],      ['ng', 'Owambo'],      ['nl', 'Nederlands'],
  ['nn', 'Norsk nynorsk'],   ['no', 'Norsk'],      ['nr', 'isiNdebele'],   ['nv', 'Diné bizaad'],
  ['ny', 'Chichewa'],       ['oc', 'Occitan'],     ['oj', 'ᐊᐌᐧᐃᐧᐣ'],       ['om', 'Afaan Oromoo'],
  ['or', 'ଓଡ଼ିଆ'],          ['os', 'Ирон'],       ['pa', 'ਪੰਜਾਬੀ'],      ['pi', 'पाऴि'],
  ['pl', 'Polski'],         ['ps', 'پښتو'],       ['pt', 'Português'],    ['qu', 'Runa Simi'],
  ['rm', 'Rumantsch'],      ['rn', 'Ikirundi'],    ['ro', 'Română'],      ['ru', 'Русский'],
  ['rw', 'Ikinyarwanda'],   ['sa', 'संस्कृतम्'],   ['sc', 'Sardu'],       ['sd', 'سنڌي'],
  ['se', 'Davvisámegiella'], ['sg', 'Sängö'],     ['si', 'සිංහල'],       ['sk', 'Slovenčina'],
  ['sl', 'Slovenščina'],    ['sm', 'Gagana Samoa'], ['sn', 'chiShona'],    ['so', 'Soomaali'],
  ['sq', 'Shqip'],          ['sr', 'Српски'],      ['ss', 'SiSwati'],     ['st', 'Sesotho'],
  ['su', 'Basa Sunda'],     ['sv', 'Svenska'],     ['sw', 'Kiswahili'],   ['ta', 'தமிழ்'],
  ['te', 'తెలుగు'],        ['tg', 'Тоҷикӣ'],     ['th', 'ไทย'],         ['ti', 'ትግርኛ'],
  ['tk', 'Türkmençe'],      ['tl', 'Tagalog'],     ['tn', 'Setswana'],    ['to', 'Lea faka-Tonga'],
  ['tr', 'Türkçe'],         ['ts', 'Xitsonga'],   ['tt', 'Татарча'],     ['tw', 'Twi'],
  ['ty', 'Reo Tahiti'],     ['ug', 'ئۇيغۇرچە'],   ['uk', 'Українська'],  ['ur', 'اردو'],
  ['uz', 'Oʻzbekcha'],      ['ve', 'Tshivenḓa'],   ['vi', 'Tiếng Việt'],  ['vo', 'Volapük'],
  ['wa', 'Walon'],          ['wo', 'Wolof'],      ['xh', 'isiXhosa'],    ['yi', 'ייִדיש'],
  ['yo', 'Yorùbá'],         ['za', 'Vahcuengh'],   ['zh', '中文'],        ['zu', 'isiZulu'],
  ['haw', 'ʻŌlelo Hawaiʻi'], // ISO 639-2/3, commonly used
] as const;

export type LanguageCode = typeof LANGUAGES[number][0];

export const LANG_NAMES: Record<LanguageCode, string> = Object.fromEntries(
  LANGUAGES.map(([code, name]) => [code, name])
) as Record<LanguageCode, string>;

export const SUPPORTED_LANGUAGES: LanguageCode[] = [...new Set(LANGUAGES.map(([code]) => code))];

export function isSupportedLanguage(code: string): code is LanguageCode {
  return LANGUAGES.some(([c]) => c === code);
}
