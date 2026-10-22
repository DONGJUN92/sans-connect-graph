// Accessibility Engine:
// 1. Korean TTS Voice Guide (Web Speech Synthesis API)
// 2. Korean Voice Input / Speech-to-Text (Web Speech Recognition API)
// 3. Tactile Audio Cues (Start/End Listening Beeps & Real-Time Arrival Chime)

let voiceGuideEnabled = false;
let activeRecognition = null;

export function isVoiceGuideEnabled() {
  return voiceGuideEnabled;
}

export function setVoiceGuideEnabled(enabled) {
  voiceGuideEnabled = Boolean(enabled);
  if (!voiceGuideEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function speakKorean(text, force = false, onEnd = null) {
  if (!text) {
    if (onEnd) onEnd();
    return;
  }
  if (!force && !voiceGuideEnabled) {
    if (onEnd) onEnd();
    return;
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = 1.02;
    utter.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('ko'));
    if (koVoice) {
      utter.voice = koVoice;
    }
    if (onEnd) {
      utter.onend = () => onEnd();
      utter.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(utter);
  } catch {
    if (onEnd) onEnd();
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// Short audio cue for blind users when microphone opens or closes
export function playMicCue(isStart = true) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isStart ? 660 : 880, now);
    if (isStart) {
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    } else {
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  } catch {}
}

// Pleasant harmonic chime when a new member connects in real time
export function playConnectionChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq, startTime, duration, gainVal) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(523.25, now, 0.35, 0.08);
    playTone(659.25, now + 0.11, 0.4, 0.08);
    playTone(783.99, now + 0.22, 0.55, 0.1);
  } catch {}
}

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function stopVoiceRecognition() {
  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {}
    activeRecognition = null;
  }
}

export function startVoiceRecognition({ promptText, onResult, onError, onStateChange }) {
  if (typeof window === 'undefined') return;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    const msg = '이 브라우저에서는 음성 인식을 지원하지 않습니다. 화면의 버튼을 눌러 선택해 주세요.';
    if (voiceGuideEnabled) speakKorean(msg);
    if (onError) onError(msg);
    return;
  }

  stopVoiceRecognition();
  stopSpeaking();

  const launchMic = () => {
    try {
      const recognition = new SpeechRec();
      activeRecognition = recognition;
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        playMicCue(true);
        if (onStateChange) onStateChange(true);
      };

      recognition.onresult = (event) => {
        playMicCue(false);
        const candidates = [];
        for (let i = 0; i < event.results[0].length; i++) {
          candidates.push(event.results[0][i].transcript.trim());
        }
        const primary = candidates[0] || '';
        if (onStateChange) onStateChange(false);
        if (onResult) onResult(primary, candidates);
      };

      recognition.onerror = () => {
        playMicCue(false);
        if (onStateChange) onStateChange(false);
        const errMsg = '음성을 잘 듣지 못했습니다. 다시 말씀해 주시거나 목록에서 골라주세요.';
        if (voiceGuideEnabled) speakKorean(errMsg);
        if (onError) onError(errMsg);
      };

      recognition.onend = () => {
        if (onStateChange) onStateChange(false);
        activeRecognition = null;
      };

      recognition.start();
    } catch {
      if (onStateChange) onStateChange(false);
    }
  };

  if (promptText && voiceGuideEnabled) {
    speakKorean(promptText, false, () => {
      setTimeout(launchMic, 150);
    });
  } else {
    launchMic();
  }
}

// Smart Korean Spoken Team Parser (handles "5조", "오조", "십이조", "12", etc.)
const KOREAN_NUM_MAP = {
  이십: 20,
  십구: 19,
  십팔: 18,
  십칠: 17,
  십육: 16,
  십륙: 16,
  십오: 15,
  십사: 14,
  십삼: 13,
  십이: 12,
  십일: 11,
  십: 10,
  구: 9,
  팔: 8,
  칠: 7,
  육: 6,
  오: 5,
  사: 4,
  삼: 3,
  이: 2,
  일: 1,
  스무: 20,
  열아홉: 19,
  열여덟: 18,
  열일곱: 17,
  열여섯: 16,
  열다섯: 15,
  열네: 14,
  열세: 13,
  열두: 12,
  열한: 11,
  열: 10,
  아홉: 9,
  여덟: 8,
  일곱: 7,
  여섯: 6,
  다섯: 5,
  네: 4,
  세: 3,
  두: 2,
  한: 1
};

export function parseSpokenTeam(text) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, '');
  const digitMatch = cleaned.match(/(\d{1,2})/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= 20) return `${n}조`;
  }
  const keys = Object.keys(KOREAN_NUM_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (cleaned.includes(k)) {
      return `${KOREAN_NUM_MAP[k]}조`;
    }
  }
  return null;
}

// Smart Spoken Club Matcher
const CLUB_SPOKEN_ALIASES = {
  '멘토링 클럽': ['멘토링', '멘토'],
  '스피치 클럽': ['스피치', '발표'],
  'AI 클럽': ['ai', '에이아이', '인공지능'],
  '골프 클럽': ['골프'],
  '논어 클럽': ['논어', '고전'],
  '댄스 클럽': ['댄스', '춤'],
  '러닝 클럽': ['러닝', '달리기', '런닝'],
  '바이오 클럽': ['바이오', '건강'],
  '부동산 클럽': ['부동산'],
  '연극 클럽': ['연극'],
  '영화 클럽': ['영화'],
  '중급 영어 북클럽': ['중급영어', '중급북', '중급'],
  '초급 영어 북클럽': ['초급영어', '초급북', '초급'],
  '태극권 클럽': ['태극권', '태극'],
  'English Speech 클럽': ['영어스피치', '잉글리시', 'english'],
  'Sans 레가타 (SANS REGATTA)': ['레가타', '요트', '보트', 'regatta'],
  '인생책편데': ['인생책편데', '인생책', '책편데'],
  '기산편데': ['기산편데', '기산'],
  '아트편데': ['아트편데', '아트', '미술'],
  '투자북클럽': ['투자북클럽', '투자북', '투자', '투자클럽']
};

export function parseSpokenClubs(text, allClubs) {
  if (!text) return [];
  const norm = text.toLowerCase().replace(/\s+/g, '');
  const matched = [];
  for (const club of allClubs) {
    const aliases = CLUB_SPOKEN_ALIASES[club.name] || [club.shortName.toLowerCase()];
    if (
      norm.includes(club.name.toLowerCase().replace(/\s+/g, '')) ||
      norm.includes(club.shortName.toLowerCase().replace(/\s+/g, '')) ||
      aliases.some((a) => norm.includes(a))
    ) {
      matched.push(club.name);
    }
  }
  return matched;
}

// Smart Spoken Member Matcher
export function parseSpokenMember(text, members) {
  if (!text) return { existing: null, cleanedName: '' };
  const cleaned = text
    .replace(/(저는|제이름은|이름은|산스|님|입니다|이에요|예요|검색|찾아줘|연결)/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleaned.includes('이동훈') || cleaned.includes('대표')) {
    const rep = members.find((m) => m.isRepresentative || m.name.includes('이동훈'));
    if (rep) return { existing: rep, cleanedName: rep.name };
  }

  const exact = members.find(
    (m) => m.name.replace(/\s+/g, '') === cleaned || cleaned.includes(m.name.replace(/\s+/g, ''))
  );
  if (exact) {
    return { existing: exact, cleanedName: exact.name };
  }

  return { existing: null, cleanedName: cleaned || text.trim() };
}

export function buildMemberConnectionSummaryText(person, members) {
  if (!person) return '';

  const clubMates = [];
  const teamMates = [];
  const keywordMates = [];
  const uniqueNames = new Set();

  members.forEach((other) => {
    if (other.name === person.name) return;
    const sharedClubs = other.clubs.filter((c) => person.clubs.includes(c));
    const sameTeam =
      person.allTeams || other.allTeams || (other.team && other.team === person.team);
    const sharedKeywords = other.keywords.filter((k) => person.keywords.includes(k));

    if (sharedClubs.length > 0) {
      clubMates.push({ name: other.name, sharedClubs });
      uniqueNames.add(other.name);
    }
    if (sameTeam) {
      teamMates.push(other.name);
      uniqueNames.add(other.name);
    }
    if (sharedKeywords.length > 0) {
      keywordMates.push({ name: other.name, sharedKeywords });
      uniqueNames.add(other.name);
    }
  });

  const parts = [];
  parts.push(
    `${person.name}님의 연결 안내입니다. 소속은 ${person.team}, 활동 클럽은 ${person.clubs.join(', ')}입니다.`
  );
  parts.push(`현재 총 ${uniqueNames.size}명의 산스분들과 연결되어 있습니다.`);

  if (clubMates.length > 0) {
    const names = clubMates
      .slice(0, 8)
      .map((c) => c.name)
      .join(', ');
    parts.push(
      `같은 클럽 분들은 총 ${clubMates.length}명으로, ${names}님${
        clubMates.length > 8 ? ` 외 ${clubMates.length - 8}분` : ''
      }이 계십니다.`
    );
  }
  if (teamMates.length > 0 && !person.allTeams) {
    parts.push(`같은 ${person.team} 식구로 ${teamMates.join(', ')}님과 함께하고 있습니다.`);
  }
  if (keywordMates.length > 0) {
    const names = keywordMates.map((k) => k.name).join(', ');
    parts.push(`비슷한 마음 키워드를 고른 분은 ${names}님입니다.`);
  }

  return parts.join(' ');
}
