-- Native script (for the voice only; never shown in the app) and voice
-- overrides for the existing words. Words not listed keep the defaults: the
-- word as written, read by the voice for its language.

update public.words w
set native_spelling = v.native_spelling,
    voice_locale = v.voice_locale
from (values
  -- Greek words said in Greek
  ('agape', 'αγάπη', 'el-GR'),
  ('akrasia', 'ακρασία', 'el-GR'),
  ('eudaimonia', 'ευδαιμονία', 'el-GR'),
  ('meraki', 'μεράκι', 'el-GR'),
  ('metanoia', 'μετάνοια', 'el-GR'),
  ('storge', 'στοργή', 'el-GR'),
  -- Greek- and Latin-rooted words people say in English
  ('acedia', null, 'en-US'),
  ('alexithymia', null, 'en-US'),
  ('anhedonia', null, 'en-US'),
  ('apanthropy', null, 'en-US'),
  ('catharsis', null, 'en-US'),
  ('dysphoria', null, 'en-US'),
  ('dysthymia', null, 'en-US'),
  ('enantiodromia', null, 'en-US'),
  ('nostalgia', null, 'en-US'),
  ('ambivalence', null, 'en-US'),
  ('numinous', null, 'en-US'),
  ('rumination', null, 'en-US'),
  ('vagabond', null, 'en-US'),
  -- Latin words, read with Italian (church Latin) sounds
  ('desiderium', null, 'it-IT'),
  ('tacenda', null, 'it-IT'),
  -- Japanese
  ('amae', '甘え', 'ja-JP'),
  ('ikigai', '生き甲斐', 'ja-JP'),
  ('kintsugi', '金継ぎ', 'ja-JP'),
  ('koi-no-yokan', '恋の予感', 'ja-JP'),
  ('komorebi', '木漏れ日', 'ja-JP'),
  ('mono-no-aware', 'もののあはれ', 'ja-JP'),
  ('natsukashii', '懐かしい', 'ja-JP'),
  ('oubaitori', '桜梅桃李', 'ja-JP'),
  ('wabi-sabi', 'わびさび', 'ja-JP'),
  ('yugen', '幽玄', 'ja-JP'),
  -- Arabic, Urdu, Hebrew
  ('habibi', 'حبيبي', 'ar-XA'),
  ('maktoub', 'مكتوب', 'ar-XA'),
  ('tarab', 'طرب', 'ar-XA'),
  ('ya-aburnee', 'تقبرني', 'ar-XA'),
  ('fanaa', 'فنا', 'ur-IN'),
  ('firgun', 'פירגון', 'he-IL'),
  -- Hindi / Sanskrit (Devanagari)
  ('viraha', 'विरह', 'hi-IN'),
  ('mudita', 'मुदिता', 'hi-IN'),
  ('nirvana', 'निर्वाण', 'hi-IN'),
  ('viveka', 'विवेक', 'hi-IN'),
  ('kama-muta', null, 'en-US'),
  -- Russian
  ('toska', 'тоска', 'ru-RU'),
  -- Yiddish: German sounds suit "mensch"; the others read best in English
  ('mensch', null, 'de-DE'),
  -- Yaghan transliteration reads naturally with Spanish sounds
  ('mamihlapinatapai', null, 'es-US')
) as v(slug, native_spelling, voice_locale)
where w.slug = v.slug;
