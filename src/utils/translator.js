// High-Performance Bidirectional Indic AI Translation & Transliteration Engine

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    script: 'Latin',
    font: 'Outfit'
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    flag: '🇮🇳',
    script: 'Odia',
    font: 'Noto Sans Oriya'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    script: 'Devanagari',
    font: 'Noto Sans Devanagari'
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    script: 'Telugu',
    font: 'Noto Sans Telugu'
  }
];

export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  let odiaCount = 0, devanagariCount = 0, teluguCount = 0, latinCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0B00 && code <= 0x0B7F) odiaCount++;
    else if (code >= 0x0900 && code <= 0x097F) devanagariCount++;
    else if (code >= 0x0C00 && code <= 0x0C7F) teluguCount++;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) latinCount++;
  }

  if (odiaCount > devanagariCount && odiaCount > teluguCount && odiaCount > latinCount) return 'or';
  if (devanagariCount > odiaCount && devanagariCount > teluguCount && devanagariCount > latinCount) return 'hi';
  if (teluguCount > odiaCount && teluguCount > devanagariCount && teluguCount > latinCount) return 'te';
  return 'en';
}

function transliterateIndic(text, fromScript, toScript) {
  if (!text || fromScript === toScript) return text;
  
  const baseMap = { hi: 0x0900, or: 0x0B00, te: 0x0C00 };
  if (!baseMap[fromScript] || !baseMap[toScript]) return text;

  const srcBase = baseMap[fromScript];
  const tgtBase = baseMap[toScript];

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const offset = code - srcBase;
    
    if (offset >= 0 && offset <= 0x7F) {
      if (toScript === 'or' && offset === 0x35) {
        result += String.fromCharCode(tgtBase + 0x2C);
      } else {
        result += String.fromCharCode(tgtBase + offset);
      }
    } else {
      result += text[i];
    }
  }
  return result;
}

const DICT_HINDI_TO_ODIA = {
  "नमस्ते": "ନମସ୍କାର",
  "स्वागत": "ସ୍ୱାଗତ",
  "आप": "ଆପଣ",
  "आपका": "ଆପଣଙ୍କର",
  "हमारे": "ଆମର",
  "हम": "ଆମେ",
  "यह": "ଏହା",
  "वह": "ସେହି",
  "आज": "ଆଜି",
  "वीडियो": "ଭିଡିଓ",
  "कैप्शन": "କ୍ୟାପସନ୍",
  "सबटाइटल": "ସବ୍‌ଟାଇଟଲ୍",
  "जनरेटर": "ଜେନେରେଟର",
  "सीखेंगे": "ଶିଖିବା",
  "सीखने": "ଶିଖିବା",
  "सकते": "ପାରିବେ",
  "है": "ଅଟେ",
  "हैं": "ଅଛନ୍ତି",
  "में": "ରେ",
  "के लिए": "ପାଇଁ",
  "धन्यवाद": "ଧନ୍ୟବାଦ",
  "लाइक": "ଲାଇକ୍",
  "सब्सक्राइब": "ସବ୍‌ସ୍କ୍ରାଇବ୍",
  "शेयर": "ଶେୟାର୍",
  "शुरू": "ଆରମ୍ଭ",
  "दोस्तों": "ବନ୍ଧୁଗଣ",
  "सभी": "ସମସ୍ତେ",
  "दुनिया": "ଦୁନିଆ"
};

const DICT_HINDI_TO_TELUGU = {
  "नमस्ते": "నమస్కారం",
  "स्वागत": "స్వాగతం",
  "आप": "మీరు",
  "आपका": "మీ",
  "हमारे": "మా",
  "हम": "మేము",
  "यह": "ఇది",
  "आज": "ఈరోజు",
  "वीडियो": "వీడియో",
  "कैप्शन": "క్యాప్షన్",
  "धन्यवाद": "ధన్యవాదాలు",
  "लाइक": "లైక్",
  "सब्सक्राइब": "సబ్‌స్క్రైబ్",
  "शेयर": "షేర్"
};

const PHRASE_CORPUS = [
  {
    en: "welcome to our video caption generator",
    hi: "हमारे वीडियो कैप्शन जनरेटर में आपका स्वागत है",
    or: "ଆମ ଭିଡିଓ କ୍ୟାପସନ୍ ଜେନେରେଟରକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ",
    te: "మా వీడియో క్యాప్షన్ జనరేటర్‌కు స్వాగతం"
  },
  {
    en: "today we are going to learn something amazing",
    hi: "आज हम कुछ बहुत अद्भुत सीखने जा रहे हैं",
    or: "ଆଜି ଆମେ କିଛି ଚମତ୍କାର ଶିଖିବାକୁ ଯାଉଛେ",
    te: "ఈరోజు మనం ఒక అద్భుతమైన విషయాన్ని నేర్చుకుందాం"
  },
  {
    en: "thank you for watching this demo",
    hi: "यह वीडियो देखने के लिए आप सभी का धन्यवाद",
    or: "ଏହି ଡେମୋ ଦେଖିଥିବାରୁ ଆପଣଙ୍କୁ ଧନ୍ୟବାଦ",
    te: "ఈ డెమో చూసినందుకు అందరికీ ధన్యవాదాలు"
  }
];

async function fetchOnlineApi(text, sourceLang, targetLang) {
  try {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const res = await fetch(gUrl, { signal: controller.signal });
    clearTimeout(timer);
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map(item => item[0]).join('');
        if (translated && translated.trim().length > 0) return translated.trim();
      }
    }
  } catch (e) {}
  return null;
}

function translateWithInternalMatrix(text, sourceLang, targetLang) {
  if (sourceLang === targetLang) return text;

  const clean = text.trim().toLowerCase();
  for (const item of PHRASE_CORPUS) {
    if (item[sourceLang] && item[targetLang]) {
      if (clean === item[sourceLang].toLowerCase() || clean.includes(item[sourceLang].toLowerCase())) {
        return item[targetLang];
      }
    }
  }

  if (sourceLang === 'hi' && targetLang === 'or') {
    const words = text.split(/(\s+|[.,!?;।]+)/);
    const convertedWords = words.map(w => {
      const trimmed = w.trim();
      if (DICT_HINDI_TO_ODIA[trimmed]) {
        return DICT_HINDI_TO_ODIA[trimmed];
      }
      if (/[\u0900-\u097F]/.test(w)) {
        return transliterateIndic(w, 'hi', 'or');
      }
      return w;
    });
    return convertedWords.join('');
  }

  if (sourceLang === 'hi' && targetLang === 'te') {
    const words = text.split(/(\s+|[.,!?;।]+)/);
    const convertedWords = words.map(w => {
      const trimmed = w.trim();
      if (DICT_HINDI_TO_TELUGU[trimmed]) {
        return DICT_HINDI_TO_TELUGU[trimmed];
      }
      if (/[\u0900-\u097F]/.test(w)) {
        return transliterateIndic(w, 'hi', 'te');
      }
      return w;
    });
    return convertedWords.join('');
  }

  if ((sourceLang === 'hi' && targetLang === 'or') || (sourceLang === 'or' && targetLang === 'hi') || (sourceLang === 'hi' && targetLang === 'te') || (sourceLang === 'te' && targetLang === 'hi')) {
    return transliterateIndic(text, sourceLang, targetLang);
  }

  return text;
}

export async function translateText(text, sourceLang = 'auto', targetLang = 'or') {
  if (!text || !text.trim()) return '';

  let actualSource = sourceLang;
  if (sourceLang === 'auto') {
    actualSource = detectLanguage(text);
  }

  if (actualSource === targetLang) return text;

  try {
    const online = await fetchOnlineApi(text, actualSource, targetLang);
    if (online && online.trim().length > 0) return online;
  } catch (err) {}

  return translateWithInternalMatrix(text, actualSource, targetLang);
}

export async function translateSegments(segments, sourceLang = 'auto', targetLang = 'or', onProgress) {
  if (!segments || segments.length === 0) return [];

  const firstSegText = segments[0]?.text || '';
  const detectedSrc = sourceLang === 'auto' ? detectLanguage(firstSegText) : sourceLang;

  const updated = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    try {
      const textToTranslate = seg.originalText || seg.text;
      const translatedText = await translateText(textToTranslate, detectedSrc, targetLang);
      
      updated.push({
        ...seg,
        text: translatedText || seg.text,
        originalText: seg.originalText || seg.text,
        language: targetLang
      });
    } catch (e) {
      const fallback = translateWithInternalMatrix(seg.text, detectedSrc, targetLang);
      updated.push({
        ...seg,
        text: fallback || seg.text,
        originalText: seg.originalText || seg.text,
        language: targetLang
      });
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / segments.length) * 100));
    }
  }

  return updated;
}
