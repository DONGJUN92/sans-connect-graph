// Accessibility (VoiceOver / TalkBack / Korean TTS Voice Guide & Audio Feedback)

let voiceGuideEnabled = false;

export function isVoiceGuideEnabled() {
  return voiceGuideEnabled;
}

export function setVoiceGuideEnabled(enabled) {
  voiceGuideEnabled = Boolean(enabled);
  if (!voiceGuideEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakKorean(text, force = false) {
  if (!text) return;
  if (!force && !voiceGuideEnabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

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
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore TTS errors on unsupported browsers
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// Pleasant, gentle Web Audio harmonic chime when a new member connects in real time
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

    // Warm C5 -> E5 -> G5 ascending connection chime
    playTone(523.25, now, 0.35, 0.08);
    playTone(659.25, now + 0.11, 0.4, 0.08);
    playTone(783.99, now + 0.22, 0.55, 0.1);
  } catch {
    // ignore if audio context is blocked before user gesture
  }
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
    const sameTeam = other.team && other.team === person.team;
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
    `${person.name}님의 산스 연결망 안내입니다. 소속은 ${person.team}이며, 활동 클럽은 ${person.clubs.join(', ')}입니다.`
  );
  parts.push(
    `선택한 공감 키워드는 ${person.keywords.map((k) => k.replace('#', '')).join(', ')}입니다.`
  );
  parts.push(
    `현재 총 ${uniqueNames.size}명의 산스 구성원과 연결되어 있습니다.`
  );

  if (clubMates.length > 0) {
    const names = clubMates.map((c) => c.name).join(', ');
    parts.push(`같은 클럽으로 연결된 동료는 총 ${clubMates.length}명으로, ${names}님이 있습니다.`);
  }
  if (teamMates.length > 0) {
    parts.push(`같은 ${person.team} 동료로 ${teamMates.join(', ')}님과 연결되어 있습니다.`);
  }
  if (keywordMates.length > 0) {
    const names = keywordMates.map((k) => k.name).join(', ');
    parts.push(`공감 키워드로 연결된 동료는 ${names}님입니다.`);
  }

  return parts.join(' ');
}
