/**
 * Cinematic narrator preview scripts per story language (~20–40s spoken).
 * Shared by backend TTS and renderer display / browser fallback.
 */

import { basePreviewLang } from './previewLanguage.js'

/** @typedef {Record<string, string>} NarratorScripts */

/** @type {Record<string, NarratorScripts>} */
export const CINEMATIC_PREVIEW_BY_LANG = {
  ne: {
    tryst_bj:
      'नमस्ते, म तपाईँको कथाको साथी हुँ। आजको साँझ, हामी नेपाली माटो, पहाडका काखा, शान्त वन र आकाशका ताराहरूलाई सम्झ्दै एउटा रोमाञ्चक यात्रामा जाँदै छौँ। सुरुवातमा हावा शान्त छ — जस्तै कथा सुन्न पर्खिरहेको हो। अचानक टाढाबाट कुनै आवाज आयो। मैले भनेँ, "के हो त्यो?" — र पहाडको काखामा उज्यालो बिस्तारै फैलियो। त्यो क्षणमा मुटु छुप छ — अनि आशा फेरि उम्रन्छ। शब्दहरू स्पष्ट र मीठा लागून्: तपाईँ, छौँ, ज्ञान, श्रद्धा, त्रिशूल — जस्तै म तपाईँसँग अगाडिको चौतारीमा बसी कुरा गर्दैछु।',
    penguin:
      'नमस्कार, प्रिय सुन्दर्शक। म तपाईँको लागि मनमोहक कथा लिएर आएकी छु। आजको रात, चन्द्रमाको उज्यालो अनुहारमा, हावा पनि कथा सुन्न पर्खिरहेको जस्तो लाग्छ। मैले बिस्तारै भनेँ, "यो रात हाम्रो मात्र हो" — र ताराहरूले मुस्कान दिएजस्तो लाग्यो। एकछिन शान्ति — अनि रहस्यले हल्का फुसफुसायो जस्तो भयो। मेरो स्वर सधैँ कोमल र मिठो रहन्छ — छौँ, मिठास, शान्ति, सुन्दर — सुन्दा मुटु न्यानो हुन्छ, मुस्कान आफैँ उम्रन्छ।'
  },
  en: {
    tryst_bj:
      'Hello — I am your storyteller for Katha Ekadeshko. Tonight we walk through mist, memory, and a sky full of quiet stars. At first the air is still, as if the world is listening. Then a distant sound — and I whisper, "What was that?" — while light slowly opens across the hills. For a heartbeat everything holds its breath, and hope returns, soft but certain. This is how I will voice your story: warm, cinematic, and close.',
    penguin:
      'Hello, dear listener — I have brought you a story woven with care. Under moonlight the night feels gentle, as if the wind itself waits to hear. I say softly, "This moment belongs to us," and the stars seem to smile back. A pause — a thread of mystery — then warmth blooms again in every word. My voice stays sweet and light, never heavy — cozy, immersive, and alive.'
  },
  hi: {
    tryst_bj:
      'नमस्ते, मैं आपकी कहानी का साथी हूँ। आज की रात, पहाड़ों और तारों के बीच, हम एक रोमांचक सफ़र पर निकलेंगे। पहले सब शांत है — जैसे कहानी सुनने को तैयार हो। अचानक दूर से कोई आवाज़ — मैंने धीरे कहा, "यह क्या है?" — और पहाड़ी ढलान पर रोशनी फैल गई। एक पल के लिए दिल रुकता है, फिर उम्मीद धीरे-धीरे लौट आती है।',
    penguin:
      'नमस्ते, प्रिय श्रोता — मैं आपके लिए एक प्यारी कहानी लेकर आई हूँ। चाँदनी रात में हवा भी कहानी सुनने को इंतज़ार कर रही लगती है। मैंने कोमल स्वर में कहा, "यह पल हमारा है," और तारे मुस्कुरा उठे। एक शांत विराम — फिर रहस्य की हल्की सी फुसफुसाहट — और फिर गर्माहट लौट आती है।'
  },
  ja: {
    _default:
      'こんにちは。私はあなたの物語の語り手です。今夜、静かな星とやわらかな風の下で、新しい世界へ歩き出します。最初は空気が止まっているようです。遠くで何かが響き、私はそっと言います。「あれは何だろう？」光がゆっくり丘に広がります。一瞬、心臓が止まり、それから希望が静かに戻ってきます。これが、あなたの物語を読み上げる声です。'
  },
  ko: {
    _default:
      '안녕하세요. 저는 당신의 이야기를 들려줄 내레이터입니다. 오늘 밤, 고요한 별빛 아래 새로운 세계로 걸어갑니다. 처음에는 바람이 멈춘 듯합니다. 멀리서 소리가 들리고, 저는 속삭입니다. "저건 무엇일까?" 언덕 위로 빛이 천천히 퍼집니다. 잠시 숨이 멎었다가, 희망이 다시 조용히 돌아옵니다. 이것이 당신의 이야기를 읽어 줄 목소리입니다.'
  },
  zh: {
    _default:
      '你好，我是你的故事讲述者。今夜，在安静的星光下，我们走向一个新的世界。起初，空气仿佛静止了。远处传来声响，我轻声问：“那是什么？”光缓缓铺过山丘。一瞬间，心跳停顿，然后希望又温柔地回来。这就是我将为你朗读故事的声音。'
  },
  es: {
    _default:
      'Hola, soy tu narrador. Esta noche caminamos bajo estrellas tranquilas hacia un mundo nuevo. Al principio el aire está inmóvil, como si escuchara. Un sonido lejano — y susurro: "¿Qué fue eso?" La luz se abre lentamente sobre las colinas. Por un instante todo contiene la respiración; luego la esperanza regresa, suave y segura. Así sonará tu historia.'
  },
  fr: {
    _default:
      'Bonjour, je suis votre conteur. Ce soir, sous des étoiles calmes, nous marchons vers un monde nouveau. D\'abord l\'air est immobile, comme à l\'écoute. Un son lointain — et je murmure : « Qu\'est-ce que c\'était ? » La lumière s\'ouvre lentement sur les collines. Un instant, tout retient son souffle, puis l\'espoir revient, doux et sûr. Voici comment je raconterai votre histoire.'
  },
  de: {
    _default:
      'Hallo, ich bin euer Erzähler. Heute Nacht gehen wir unter ruhigen Sternen in eine neue Welt. Zuerst steht die Luft still, als würde sie zuhören. Ein ferner Laut — und ich flüstere: „Was war das?“ Licht breitet sich langsam über die Hügel aus. Einen Herzschlang lang hält alles den Atem an, dann kehrt die Hoffnung zurück. So werde ich eure Geschichte erzählen.'
  },
  ar: {
    _default:
      'مرحبًا، أنا راوي قصتك. الليلة نمشي تحت نجوم هادئة نحو عالم جديد. في البداية يسكن الهواء، كأن العالم يصغي. يأتي صوت بعيد — وأهمس: «ما ذاك؟» ينتشر الضوء ببطء على التلال. لحظة يتوقف القلب، ثم تعود الأمل برفق. هكذا سأحكي قصتك.'
  },
  ru: {
    _default:
      'Здравствуйте, я ваш рассказчик. Сегодня ночью мы идём под тихими звёздами в новый мир. Сначала воздух неподвижен, будто мир слушает. Далёкий звук — и я шепчу: «Что это?» Свет медленно раскрывается на холмах. На миг замирает сердце, затем тихо возвращается надежда. Так я буду озвучивать вашу историю.'
  },
  th: {
    _default:
      'สวัสดี ฉันคือผู้เล่าเรื่องของคุณ คืนนี้เราเดินใต้ดวงดาวอันเงียบสู่โลกใหม่ ตอนแรกลมนิ่งราวกับฟังอยู่ เสียงไกลๆ มา — ฉันกระซิบว่า "นั่นคืออะไร" แสงค่อยๆ แผ่บนภูเขา หนึ่งจังหวะหัวใจหยุด แล้วความหวังกลับมาอย่างอ่อนโยน นี่คือเสียงที่จะเล่าเรื่องของคุณ'
  },
  bn: {
    _default:
      'নমস্কার, আমি আপনার গল্পের বর্ণনাকার। আজ রাত শান্ত তারার নিচে আমরা নতুন একটি জগতে যাচ্ছি। প্রথমে বাতাস থমকে আছে, যেন শোনার অপেক্ষায়। দূর থেকে একটি শব্দ — আমি ফিসফিস করি, "ওটা কী?" পাহাড়ে ধীরে আলো ছড়ায়। এক মুহূর্ত হৃদয় থেমে যায়, তারপর আশা ফিরে আসে। এভাবেই আমি আপনার গল্প বলব।'
  },
  nl: {
    _default:
      'Hallo, ik ben je verteller. Vanavond lopen we onder stille sterren naar een nieuwe wereld. Eerst staat de lucht stil, alsof ze luistert. Een ver geluid — en ik fluister: "Wat was dat?" Licht golft langzaam over de heuvels. Even houdt alles de adem in, dan keert hoop zacht terug. Zo zal ik je verhaal vertellen.'
  },
  ms: {
    _default:
      'Helo, saya pencerita anda. Malam ini kita berjalan di bawah bintang yang tenang ke dunia baru. Pada mulanya angin sunyi, seolah mendengar. Satu bunyi jauh — dan saya berbisik: "Apakah itu?" Cahaya merebak perlahan di bukit. Sejenak jantung berhenti, lalu harapan kembali dengan lembut. Beginilah suara cerita anda.'
  },
  pt: {
    _default:
      'Olá, sou o narrador da sua história. Esta noite caminhamos sob estrelas quietas rumo a um mundo novo. No início o ar está imóvel, como se ouvisse. Um som distante — e eu sussurro: "O que foi isso?" A luz se abre devagar sobre as colinas. Por um instante tudo prende a respiração; depois a esperança volta, suave. Assim vou narrar a sua história.'
  },
  cs: {
    _default:
      'Dobrý den, jsem váš vypravěč. Dnes v noci kráčíme pod tichými hvězdami do nového světa. Nejprve je vzduch nehybný, jako by naslouchal. Vzdálený zvuk — a šeptám: „Co to bylo?“ Světlo se pomalu rozlévá po kopcích. Na okamžik se zastaví dech, pak se tiše vrátí naděje. Tak budu vyprávět váš příběh.'
  },
  el: {
    _default:
      'Γεια σας, είμαι ο αφηγητής σας. Απόψε περπατάμε κάτω από ήσυχα αστέρια σε έναν καινούργιο κόσμο. Στην αρχή ο αέρας είναι ακίνητος, σαν να ακούει. Ένας μακρινός ήχος — και ψιθυρίζω: «Τι ήταν αυτό;» Το φως απλώνεται αργά στους λόφους. Για μια στιγμή σταματά η καρδιά, μετά επιστρέφει η ελπίδα. Έτσι θα αφηγηθώ την ιστορία σας.'
  },
  id: {
    _default:
      'Halo, saya narator cerita Anda. Malam ini kita berjalan di bawah bintang yang tenang menuju dunia baru. Awalnya angin diam, seolah mendengarkan. Suara jauh — dan saya berbisik: "Apa itu?" Cahaya menyebar perlahan di perbukitan. Sejenak jantung berhenti, lalu harapan kembali dengan lembut. Beginilah suara cerita Anda.'
  },
  fa: {
    _default:
      'سلام، من راوی داستان شما هستم. امشب زیر ستارگان آرام به دنیایی تازه می‌رویم. نخست باد همچون شنونده ایستاده است. صدایی دور — و زمزمه می‌کنم: «آن چه بود؟» نور آهسته بر تپه‌ها می‌گسترد. یک لحظه دل می‌ایستد، سپس امید آرام بازمی‌گردد. این‌گونه داستان شما را روایت می‌کنم.'
  },
  he: {
    _default:
      'שלום, אני המספר שלכם. הלילה הולכים תחת כוכבים שקטים אל עולם חדש. בהתחלה האוויר דומם, כאילו מאזין. קול רחוק — ואני לוחש: "מה זה היה?" האור נפתח לאט על הגבעות. לרגע הלב עוצר, ואז התקווה חוזרת בעדינות. כך אספר את סיפורכם.'
  },
  it: {
    _default:
      'Ciao, sono il narratore della tua storia. Stanotte camminiamo sotto stelle quiete verso un mondo nuovo. All\'inizio l\'aria è ferma, come in ascolto. Un suono lontano — e sussurro: "Cos\'era?" La luce si apre lentamente sulle colline. Per un attimo tutto trattiene il fiato, poi la speranza torna. Così racconterò la tua storia.'
  },
  pl: {
    _default:
      'Dzień dobry, jestem waszym narratorem. Dziś w nocy idziemy pod cichymi gwiazdami w nowy świat. Najpierw powietrze stoi nieruchomo, jakby słuchało. Odległy dźwięk — i szepczę: „Co to było?” Światło powoli rozlewa się po wzgórzach. Na chwilę serce się zatrzymuje, potem wraca nadzieja. Tak opowiem waszą historię.'
  },
  sv: {
    _default:
      'Hej, jag är er berättare. I kväll går vi under tysta stjärnor mot en ny värld. Först står luften stilla, som om den lyssnar. Ett avlägset ljud — och jag viskar: "Vad var det?" Ljuset breder ut sig långsamt över kullarna. Ett ögonblick stannar hjärtat, sedan återvänder hoppet. Så ska jag berätta er historia.'
  },
  tr: {
    _default:
      'Merhaba, ben hikâyenizin anlatıcısıyım. Bu gece sessiz yıldızların altında yeni bir dünyaya yürüyoruz. Önce hava dinler gibi durur. Uzak bir ses — ve fısıldarım: "O da neydi?" Işık yavaşça tepelere yayılır. Bir an kalp durur, sonra umut usulca döner. Hikâyenizi böyle seslendireceğim.'
  },
  uk: {
    _default:
      'Вітаю, я ваш оповідач. Сьогодні вночі ми йдемо під тихими зорями в новий світ. Спочатку повітря нерухоме, ніби слухає. Далекий звук — і я шепочу: «Що це було?» Світло повільно розливається на пагорбах. На мить зупиняється серце, потім тихо повертається надія. Так я озвучуватиму вашу історію.'
  },
  ur: {
    _default:
      'سلام، میں آپ کی کہانی کا راوی ہوں۔ آج رات پرسکون ستاروں تلے ہم ایک نئی دنیا کی طرف چلتے ہیں۔ پہلے ہوا ساکت ہے، گویا سن رہی ہو۔ دور سے آواز — اور میں سرگوشی میں کہتا ہوں، "وہ کیا تھا؟" روشنی آہستہ پہاڑوں پر پھیلتی ہے۔ ایک لمحے دل رکتا ہے، پھر امید واپس آتی ہے۔ یوں میں آپ کی کہانی سناؤں گا۔'
  },
  vi: {
    _default:
      'Xin chào, tôi là người kể chuyện của bạn. Đêm nay chúng ta bước dưới những vì sao lặng đến một thế giới mới. Lúc đầu gió im lặng như đang lắng nghe. Một tiếng động xa — tôi thì thầm: "Đó là gì?" Ánh sáng dần lan trên đồi. Một nhịp tim dừng lại, rồi hy vọng trở về nhẹ nhàng. Đây là giọng tôi sẽ kể câu chuyện của bạn.'
  }
}

/** First N sentence-like clauses — faster API TTS (Vercel 10s hobby limit). */
function clipForApiPreview(fullText, maxClauses = 3) {
  const t = String(fullText || '').trim()
  if (!t) return t
  const parts = t.split(/(?<=[।.!?])\s+/).filter(Boolean)
  if (parts.length <= maxClauses) return t
  return parts.slice(0, maxClauses).join(' ')
}

/**
 * @param {string} narratorId
 * @param {string} [languageCode]
 * @param {{ forApi?: boolean }} [opts]
 * @returns {string}
 */
export function getCinematicPreviewScript(narratorId, languageCode, opts = {}) {
  const id = String(narratorId || 'tryst_bj').trim()
  const lang = basePreviewLang(languageCode)
  const bucket = CINEMATIC_PREVIEW_BY_LANG[lang] || CINEMATIC_PREVIEW_BY_LANG.en || CINEMATIC_PREVIEW_BY_LANG.ne
  const full = bucket[id] || bucket._default || bucket.tryst_bj || CINEMATIC_PREVIEW_BY_LANG.ne.tryst_bj
  return opts.forApi ? clipForApiPreview(full, 3) : full
}

export function getCinematicPreviewDisplayText(narratorId, languageCode) {
  return getCinematicPreviewScript(narratorId, languageCode)
}
