# Pronunciation voices

How each word is spoken, and the plan for native-speaker audio. Prepared
2026-11-13 from the 144 published words.

## How the app chooses (from the next build)

1. **Recording first.** If a word has `audio_url` (admin panel → word →
   "Audio URL"), the app plays that file. Adding or fixing a recording needs
   no app update.
2. **Otherwise, the phone's voice for the word's language**, mapped in
   `src/content/voice.ts`, only for languages written in Latin script, and
   only if the phone has that voice (otherwise English).
3. **Otherwise English** (en-US).

Pronunciations play even with the silent switch on, using the media volume.

## Why recordings are the real fix

Words are stored in Latin letters. A Japanese, Greek, Arabic or Persian voice
given "koi no yokan", "meraki" or "tiam" in Latin letters spells it out or
misreads it, so those languages stay on English until they have recordings.
Phone voices also vary by device, and many phones lack Welsh, Irish, Tagalog
or Zulu voices.

Recommended: generate one audio file per word with a neural text-to-speech
service that has native voices per locale (for example Microsoft Azure
Speech, which has voices for nearly every language below), feeding it the
word in its native script and checking each one by ear. At 144 words this is
a one-off cost of cents. Upload to a public Supabase Storage bucket
(`pronunciations/<slug>.mp3`) and set `audio_url`. For the few languages no
service covers, use a human recording (a native speaker, or a licensed
recording; check the license allows use in a paid app).

## Language by language

| Language (as stored) | Words | Phone voice now | Recording source |
| --- | --- | --- | --- |
| English (+ modern coinage, rare, archaic) | 42 | en-US | en-US neural voice |
| Greek | 15 | English (non-Latin script) | el-GR, from Greek spelling (μεράκι) |
| Japanese | 10 | English (non-Latin script) | ja-JP, from kana/kanji (恋の予感) |
| Latin | 6 | English | Mostly English words of Latin origin: en-US. *Desiderium*, *tacenda*: Italian or human |
| German | 6 | de-DE | de-DE |
| Arabic | 4 | English (non-Latin script) | ar (e.g. ar-SA / ar-EG), from Arabic script |
| French | 4 | fr-FR | fr-FR |
| Yiddish | 3 | English | No good TTS; human recording (or keep English, as these are used in English) |
| Persian | 3 | English (non-Latin script) | fa-IR, from Persian script |
| Sanskrit | 3 | English | hi-IN from Devanagari, or human |
| Dutch | 2 | nl-NL | nl-NL |
| Italian | 2 | it-IT | it-IT |
| Spanish | 2 | es-ES | es-ES |
| Tagalog | 2 | fil-PH (if installed) | fil-PH |
| Welsh | 2 | cy-GB (if installed) | cy-GB |
| Iroquoian | 1 | English | Human recording |
| Turkish | 1 | tr-TR | tr-TR (gümüşservi) |
| Brazilian Portuguese | 1 | pt-BR | pt-BR |
| Arabic / Urdu | 1 | English | ur-PK |
| Latin American Spanish | 1 | es-MX | es-MX |
| Lithuanian | 1 | lt-LT (if installed) | lt-LT |
| Norwegian | 1 | nb-NO | nb-NO |
| Old Norse | 1 | Icelandic (is-IS) | Icelandic voice, or human |
| Danish | 1 | da-DK | da-DK |
| Portuguese | 1 | pt-PT | pt-PT |
| Russian | 1 | English (non-Latin script) | ru-RU, from Cyrillic (тоска) |
| Zulu / Nguni | 1 | zu-ZA (if installed) | zu-ZA |
| Sanskrit (modern coinage) | 1 | English | hi-IN or en-US (researchers say it in English) |
| Serbian | 1 | Croatian (hr-HR) | sr-RS |
| Finnish | 1 | fi-FI | fi-FI |
| Swedish | 1 | sv-SE | sv-SE |
| Yaghan | 1 | Chilean Spanish (es-CL) | Human recording; es-CL as fallback |
| Hebrew | 1 | English (non-Latin script) | he-IL, from Hebrew script |
| Hindi / Sanskrit | 1 | English (non-Latin script) | hi-IN, from Devanagari |
| Indonesian | 1 | id-ID | id-ID |
| Inuktitut | 1 | English | Inuktitut neural voice if available, else human |
| Irish | 1 | ga-IE (if installed) | ga-IE |

"If installed" means many phones (especially iPhones) won't have the voice
and will fall back to English, which is another reason for recordings.
