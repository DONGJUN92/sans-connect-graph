import React, { useState, useEffect, useMemo } from 'react';
import { SANS_CLUBS, SANS_TEAMS, KEYWORD_CATEGORIES, ALL_KEYWORDS } from '../data/sansData';
import ClubIcon from './ClubIcon';
import {
  X,
  Check,
  Sparkles,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Compass,
  Edit3,
  Network,
  Volume2,
  VolumeX,
  Mic,
  Zap
} from 'lucide-react';
import {
  speakKorean,
  startVoiceRecognition,
  stopVoiceRecognition,
  parseSpokenMember,
  parseSpokenTeam,
  parseSpokenClubs
} from '../utils/a11yVoice';

export default function JoinModal({
  isOpen,
  onClose,
  members,
  onSubmitMember,
  onQuickViewMember,
  initialName = '',
  voiceEnabled,
  onToggleVoice,
  onEnableVoice,
  latestLiveJoin
}) {
  // Progressive steps: 1 (이름) -> 2 (조) -> 3 (클럽) -> 4 (마음 키워드)
  const [step, setStep] = useState(1);

  const [name, setName] = useState(initialName || '');
  const [selectedTeam, setSelectedTeam] = useState('5조');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadedMember, setLoadedMember] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg('');
      setVoiceStatusText('');
      if (initialName) {
        setName(initialName);
        const found = members.find((m) => m.name === initialName.trim());
        if (found) {
          applyMemberData(found, false);
        }
      }
    } else {
      stopVoiceRecognition();
      setIsListening(false);
    }
  }, [isOpen, initialName]);

  // Speak step guidance when step changes and voice mode is active
  useEffect(() => {
    if (!isOpen || !voiceEnabled) return;
    if (step === 1) {
      speakKorean(
        '이름 입력 화면입니다. 화면 위쪽의 말로 이름 찾기 큰 버튼을 누르고 이름을 말씀하시거나, 아래 명단에서 이름을 눌러주세요.'
      );
    } else if (step === 2) {
      speakKorean(
        `2단계, 몇 조인지 고르는 화면입니다. 말로 조 선택하기 버튼을 누르고 5조처럼 말씀하시거나, 아래 목록에서 골라주세요. 현재 ${selectedTeam}가 선택되어 있습니다.`
      );
    } else if (step === 3) {
      speakKorean(
        '3단계, 클럽 선택 화면입니다. 말로 클럽 고르기 버튼을 누르고 멘토링, 스피치처럼 말씀하시거나, 아래 목록에서 활동 클럽을 골라주세요.'
      );
    } else if (step === 4) {
      speakKorean(
        '마지막 4단계, 마음 키워드 선택 화면입니다. 위쪽의 추천 키워드 자동 선택 버튼을 누르시면 바로 완료됩니다.'
      );
    }
  }, [step, isOpen, voiceEnabled]);

  const applyMemberData = (memberObj, shouldSpeak = true) => {
    if (!memberObj) return;
    setName(memberObj.name);
    setSelectedTeam(memberObj.team || '5조');
    setSelectedClubs([...(memberObj.clubs || [])]);
    setSelectedKeywords([...(memberObj.keywords || [])]);
    setLoadedMember(memberObj);
    setErrorMsg('');

    if (shouldSpeak) {
      speakKorean(
        `${memberObj.name}님 반갑습니다. ${memberObj.team}, ${memberObj.clubs.join(
          ', '
        )} 정보를 불러왔습니다. 바로 내 연결 보기 큰 버튼을 누르시면 연결된 분들을 음성으로 안내해 드립니다.`,
        true
      );
    }
  };

  // Automatically check if typed name matches an existing member
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setLoadedMember(null);
      return;
    }
    const exact = members.find((m) => m.name === trimmed);
    if (exact) {
      setSelectedTeam(exact.team || '5조');
      setSelectedClubs([...(exact.clubs || [])]);
      setSelectedKeywords([...(exact.keywords || [])]);
      if (!loadedMember || loadedMember.name !== exact.name) {
        setLoadedMember(exact);
        speakKorean(
          `${exact.name}님의 정보를 찾았습니다. ${exact.team}, ${exact.clubs.join(', ')} 소속입니다.`
        );
      }
      setErrorMsg('');
    } else if (loadedMember && loadedMember.name !== trimmed) {
      setLoadedMember(null);
      setSelectedClubs([]);
      setSelectedKeywords([]);
    }
  }, [name, members]);

  const matchingMembers = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.team && m.team.toLowerCase().includes(q)) ||
        m.clubs.some((c) => c.toLowerCase().includes(q))
    );
  }, [name, members]);

  if (!isOpen) return null;

  // Voice Input Handler for Step 1 (Name)
  const handleVoiceNameInput = () => {
    if (onEnableVoice) onEnableVoice();
    setVoiceStatusText('이름을 말씀해 주세요 (예: 신동준, 노수림)');
    startVoiceRecognition({
      promptText: '삐 소리 후 이름을 말씀해 주세요.',
      onStateChange: setIsListening,
      onResult: (spoken) => {
        const { existing, cleanedName } = parseSpokenMember(spoken, members);
        if (existing) {
          setVoiceStatusText(`"${existing.name}"님을 찾았습니다!`);
          applyMemberData(existing, true);
        } else if (cleanedName) {
          setName(cleanedName);
          setVoiceStatusText(`"${cleanedName}"님으로 입력되었습니다.`);
          speakKorean(
            `${cleanedName}님으로 입력되었습니다. 다음은 몇 조인지 고르는 화면으로 이동합니다.`,
            true
          );
          setStep(2);
        }
      },
      onError: (msg) => setVoiceStatusText(msg)
    });
  };

  // Voice Input Handler for Step 2 (Team)
  const handleVoiceTeamInput = () => {
    if (onEnableVoice) onEnableVoice();
    setVoiceStatusText('몇 조인지 말씀해 주세요 (예: 5조)');
    startVoiceRecognition({
      promptText: '삐 소리 후 몇 조인지 말씀해 주세요. 예: 5조',
      onStateChange: setIsListening,
      onResult: (spoken) => {
        const parsedTeam = parseSpokenTeam(spoken);
        if (parsedTeam) {
          setSelectedTeam(parsedTeam);
          setVoiceStatusText(`${parsedTeam} 선택 완료!`);
          speakKorean(`${parsedTeam}가 선택되었습니다. 다음 클럽 선택 화면으로 이동합니다.`, true);
          setStep(3);
        } else {
          const msg = `"${spoken}"에서 조 번호를 찾지 못했습니다. 1조부터 20조 사이로 다시 말씀해 주세요.`;
          setVoiceStatusText(msg);
          speakKorean(msg, true);
        }
      },
      onError: (msg) => setVoiceStatusText(msg)
    });
  };

  // Voice Input Handler for Step 3 (Clubs)
  const handleVoiceClubInput = () => {
    if (onEnableVoice) onEnableVoice();
    setVoiceStatusText('활동 중인 클럽 이름을 말씀해 주세요 (예: 멘토링, 스피치)');
    startVoiceRecognition({
      promptText: '삐 소리 후 활동하시는 클럽 이름을 말씀해 주세요. 예: 멘토링, 스피치',
      onStateChange: setIsListening,
      onResult: (spoken) => {
        const matchedClubs = parseSpokenClubs(spoken, SANS_CLUBS);
        if (matchedClubs.length > 0) {
          setSelectedClubs((prev) => Array.from(new Set([...prev, ...matchedClubs])));
          const joined = matchedClubs.join(', ');
          setVoiceStatusText(`${joined} 선택 완료!`);
          speakKorean(
            `${joined}이 선택되었습니다. 더 고르시거나 화면 아래 다음 버튼을 눌러주세요.`,
            true
          );
        } else {
          const msg = `"${spoken}"에서 클럽 이름을 찾지 못했습니다. 멘토링, 스피치, AI처럼 말씀해 주세요.`;
          setVoiceStatusText(msg);
          speakKorean(msg, true);
        }
      },
      onError: (msg) => setVoiceStatusText(msg)
    });
  };

  // Voice Input Handler for Step 4 (Keywords)
  const handleVoiceKeywordInput = () => {
    if (onEnableVoice) onEnableVoice();
    setVoiceStatusText('마음에 드는 단어를 말씀해 주세요 (예: 동료, 성장, 배려)');
    startVoiceRecognition({
      promptText: '삐 소리 후 동료, 성장, 배려처럼 마음에 드는 단어를 말씀해 주세요.',
      onStateChange: setIsListening,
      onResult: (spoken) => {
        const cleanSpoken = spoken.replace(/\s+/g, '');
        const matched = ALL_KEYWORDS.filter((kw) =>
          cleanSpoken.includes(kw.replace('#', '').slice(0, 2))
        ).slice(0, 3);
        const picks =
          matched.length > 0 ? matched : ['#함께걷는동료', '#따뜻한시선', '#오래함께해요'];
        setSelectedKeywords((prev) => Array.from(new Set([...prev, ...picks])).slice(0, 6));
        setVoiceStatusText(`${picks.join(' ')} 선택 완료!`);
        speakKorean(
          `${picks.map((k) => k.replace('#', '')).join(', ')} 키워드가 선택되었습니다. 아래 완료 버튼을 누르시면 연결 화면으로 이동합니다.`,
          true
        );
      },
      onError: (msg) => setVoiceStatusText(msg)
    });
  };

  // Fast 1-Tap Auto-Complete for Visually Impaired Users in Step 4
  const handleQuickCompleteWithRecommendedKeywords = async () => {
    const picks =
      selectedKeywords.length > 0
        ? selectedKeywords
        : ['#함께걷는동료', '#따뜻한시선', '#오래함께해요'];
    setSelectedKeywords(picks);
    setIsSubmitting(true);
    try {
      await onSubmitMember({
        name: name.trim(),
        team: selectedTeam,
        clubs: selectedClubs,
        keywords: picks
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClub = (clubName) => {
    setErrorMsg('');
    setSelectedClubs((prev) => {
      const exists = prev.includes(clubName);
      const next = exists ? prev.filter((c) => c !== clubName) : [...prev, clubName];
      speakKorean(
        exists
          ? `${clubName} 취소됨. 현재 ${next.length}개 선택.`
          : `${clubName} 선택됨. 현재 ${next.length}개 선택.`
      );
      return next;
    });
  };

  const toggleKeyword = (kw) => {
    setErrorMsg('');
    const cleanKw = kw.replace('#', '');
    setSelectedKeywords((prev) => {
      if (prev.includes(kw)) {
        const next = prev.filter((k) => k !== kw);
        speakKorean(`${cleanKw} 취소됨.`);
        return next;
      }
      if (prev.length >= 6) {
        const msg = '키워드는 6개까지 고를 수 있어요.';
        setErrorMsg(msg);
        speakKorean(msg);
        return prev;
      }
      const next = [...prev, kw];
      speakKorean(`${cleanKw} 선택됨. 현재 ${next.length}개.`);
      return next;
    });
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!name.trim()) {
        const msg = '이름을 입력하거나 아래 명단에서 선택해 주세요.';
        setErrorMsg(msg);
        speakKorean(msg, true);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedTeam) {
        const msg = '몇 조인지 골라주세요.';
        setErrorMsg(msg);
        speakKorean(msg, true);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedClubs.length === 0) {
        const msg = '클럽을 1개 이상 골라주세요.';
        setErrorMsg(msg);
        speakKorean(msg, true);
        return;
      }
      setStep(4);
    }
  };

  const handleFinalSubmit = async () => {
    setErrorMsg('');
    const cleanName = name.trim();
    if (!cleanName) {
      setStep(1);
      setErrorMsg('이름을 알려주세요.');
      return;
    }
    if (selectedClubs.length === 0) {
      setStep(3);
      setErrorMsg('클럽을 1개 이상 골라주세요.');
      return;
    }
    if (selectedKeywords.length === 0) {
      const msg = '마음에 와닿는 말을 1개 이상 골라주세요.';
      setErrorMsg(msg);
      speakKorean(msg, true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitMember({
        name: cleanName,
        team: selectedTeam,
        clubs: selectedClubs,
        keywords: selectedKeywords
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleCategories =
    activeCategory === 'all'
      ? KEYWORD_CATEGORIES
      : KEYWORD_CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[32px] shadow-2xl flex flex-col sm:max-h-[94vh] overflow-hidden">
        {/* Live Incoming Connection Notification Bar */}
        {latestLiveJoin && (
          <div
            role="status"
            aria-live="polite"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-900 text-white text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shrink-0"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate">
                방금{' '}
                <strong className="text-amber-300">
                  [{latestLiveJoin.team}] {latestLiveJoin.name}
                </strong>
                님이 함께 연결되었어요!
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* DEDICATED TOP ACCESSIBILITY BAR (First Focus Element for Blind Users) */}
        {/* =================================================================== */}
        <div className="px-4 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleVoice}
              aria-pressed={voiceEnabled}
              aria-label={
                voiceEnabled
                  ? '시각장애인 음성 및 큰버튼 모드가 켜져 있습니다. 누르면 끕니다.'
                  : '시각장애인 음성 및 큰버튼 모드 켜기. 화면을 보기 어려운 분은 이 버튼을 가장 먼저 눌러주세요.'
              }
              className={`flex-1 py-3 px-4 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 border-2 transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                voiceEnabled
                  ? 'bg-amber-400 border-white text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 border-amber-400/80 text-amber-300'
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5 text-slate-950 animate-pulse shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-amber-300 shrink-0" />
              )}
              <span>
                {voiceEnabled
                  ? '🔊 시각장애인 음성·큰버튼 모드 켜짐'
                  : '🔊 시각장애인 음성·큰버튼 모드 켜기'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="입력 창을 닫고 산스 전체 연결 화면 바로 보기"
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>전체 연결 먼저 보기</span>
            </button>
          </div>
        </div>

        {/* Step Navigation & Progress Bar */}
        <div className="px-5 pt-3.5 pb-2.5 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep((s) => s - 1);
                }}
                aria-label="이전 단계로 돌아가기"
                className="flex items-center gap-1.5 px-3 py-1.5 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-blue-500 text-sm font-extrabold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전 단계</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-sm">
                <Network className="w-4 h-4" />
                <span>산스(SANS) 우리의 연결</span>
              </div>
            )}

            <span className="text-xs font-extrabold text-slate-500">
              {step === 1 && '1단계 · 이름 찾기'}
              {step === 2 && '2단계 · 조 선택'}
              {step === 3 && '3단계 · 클럽 선택'}
              {step === 4 && '4단계 · 마음 키워드'} ({step}/4)
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`총 4단계 중 ${step}단계`}
            className="flex items-center gap-2"
          >
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  num <= step ? 'bg-blue-600' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Step Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-sm sm:text-base font-extrabold flex items-center gap-2"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==================== STEP 1: 이름 입력 및 말로 찾기 ==================== */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  반가워요! 👋 <span className="text-blue-600">이름</span>을 알려주세요
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  말로 이름을 부르거나 아래 명단에서 내 이름을 누르면 정보가 바로 채워져요.
                </p>
              </div>

              {/* GIANT VOICE INPUT BUTTON FOR STEP 1 (Essential for Visually Impaired Users) */}
              <button
                type="button"
                onClick={handleVoiceNameInput}
                aria-label="말로 내 이름 찾기 또는 입력하기. 누른 뒤 삐 소리가 나면 이름을 말씀해 주세요."
                className={`w-full py-4 px-5 rounded-2xl border-2 text-base sm:text-lg font-black flex items-center justify-center gap-3 shadow-md transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  isListening
                    ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                    : 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950'
                }`}
              >
                <Mic className="w-6 h-6 shrink-0" />
                <span>
                  {isListening
                    ? '🎙️ 듣고 있어요... 지금 이름을 말씀해 주세요!'
                    : '🎙️ 눌러서 말로 내 이름 찾기 (음성 입력)'}
                </span>
              </button>

              {voiceStatusText && (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-sm font-extrabold text-center"
                >
                  {voiceStatusText}
                </div>
              )}

              {/* Big Input Box */}
              <div className="relative">
                <label htmlFor="member-name-input" className="sr-only">
                  이름 직접 입력
                </label>
                <input
                  id="member-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (loadedMember && onQuickViewMember) {
                        onQuickViewMember(loadedMember.name);
                        onClose();
                      } else {
                        handleNextStep();
                      }
                    }
                  }}
                  placeholder="또는 여기에 이름을 적어주세요 (예: 신동준)"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-lg sm:text-xl font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold transition"
                />
                {name && (
                  <button
                    type="button"
                    onClick={() => {
                      setName('');
                      setLoadedMember(null);
                      speakKorean('입력한 이름을 지웠습니다.');
                    }}
                    aria-label="입력한 이름 지우기"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition focus-visible:ring-4 focus-visible:ring-blue-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instant Existing Member Recognition Card */}
              {loadedMember && (
                <div
                  role="region"
                  aria-live="polite"
                  aria-label={`${loadedMember.name}님의 등록 정보`}
                  className="p-5 rounded-3xl bg-blue-50 border-2 border-blue-300 space-y-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold">
                      <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      등록된 정보를 찾았어요!
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 pt-1">
                      {loadedMember.name}님 ({selectedTeam} · 클럽 {selectedClubs.length}개)
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      소속 클럽: {selectedClubs.join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onQuickViewMember) {
                          onQuickViewMember(loadedMember.name);
                        }
                        onClose();
                      }}
                      aria-label={`${loadedMember.name}님의 연결 바로 보기 및 음성으로 듣기`}
                      className="flex-1 py-4 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-black shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition focus-visible:ring-4 focus-visible:ring-amber-400"
                    >
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                      <span>바로 내 연결 보기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      aria-label={`${loadedMember.name}님의 조, 클럽, 키워드 정보 수정하기`}
                      className="py-4 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 text-sm sm:text-base font-extrabold flex items-center justify-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-blue-500"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                      <span>내 정보 수정하기</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Member List: Automatically switches to 1-Column Giant Buttons when Voice Mode is ON */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700">
                    👇 명단에서 내 이름 바로 누르기 ({matchingMembers.length}명)
                  </span>
                </div>
                <div
                  role="list"
                  aria-label="등록된 산스 구성원 명단"
                  className={`grid gap-2.5 max-h-60 overflow-y-auto pr-1 ${
                    voiceEnabled ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
                  }`}
                >
                  {matchingMembers.map((m) => {
                    const isSelected = loadedMember?.name === m.name;
                    return (
                      <button
                        type="button"
                        key={m.name}
                        aria-pressed={isSelected}
                        aria-label={`${m.name}, ${m.team}, ${m.clubs.join(', ')}. 누르면 정보를 불러옵니다.`}
                        onClick={() => applyMemberData(m, true)}
                        className={`rounded-2xl border-2 text-left transition flex items-center justify-between focus-visible:ring-4 focus-visible:ring-amber-400 ${
                          voiceEnabled ? 'p-4 min-h-[64px]' : 'p-3'
                        } ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="min-w-0">
                          <div
                            className={`font-extrabold truncate ${
                              voiceEnabled ? 'text-lg' : 'text-sm sm:text-base'
                            }`}
                          >
                            {m.name}
                          </div>
                          <div
                            className={`font-semibold truncate ${
                              voiceEnabled ? 'text-sm' : 'text-xs'
                            } ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}
                          >
                            {m.team} · {m.clubs[0] || '클럽'}
                            {m.clubs.length > 1 ? ` 외 ${m.clubs.length - 1}` : ''}
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg shrink-0">
                            선택
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: 소속 조 선택 (1조 ~ 20조) ==================== */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  <span className="text-blue-600">{name.trim()}</span>님은 몇 조이신가요?
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  말로 조 번호를 부르거나 아래에서 골라주세요. 같은 조 식구들과 바로 연결돼요.
                </p>
              </div>

              {/* Giant Voice Input Button for Step 2 */}
              <button
                type="button"
                onClick={handleVoiceTeamInput}
                aria-label="말로 몇 조인지 선택하기. 누른 뒤 5조처럼 말씀해 주세요."
                className={`w-full py-4 px-5 rounded-2xl border-2 text-base sm:text-lg font-black flex items-center justify-center gap-3 shadow-md transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  isListening
                    ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                    : 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950'
                }`}
              >
                <Mic className="w-6 h-6 shrink-0" />
                <span>
                  {isListening
                    ? '🎙️ 듣고 있어요... 몇 조인지 말씀해 주세요 (예: 5조)'
                    : '🎙️ 눌러서 말로 조 선택하기 (예: "5조")'}
                </span>
              </button>

              {voiceStatusText && (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-sm font-extrabold text-center"
                >
                  {voiceStatusText}
                </div>
              )}

              <div
                role="radiogroup"
                aria-label="1조부터 20조까지 소속 조 선택"
                className={`grid gap-2.5 ${
                  voiceEnabled ? 'grid-cols-2' : 'grid-cols-4 sm:grid-cols-5'
                }`}
              >
                {SANS_TEAMS.map((t) => {
                  const isSelected = selectedTeam === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${t} ${isSelected ? '선택됨' : ''}`}
                      onClick={() => {
                        setSelectedTeam(t);
                        setErrorMsg('');
                        speakKorean(`${t} 선택됨`, true);
                      }}
                      className={`py-4 rounded-2xl text-base sm:text-lg font-extrabold border-2 transition flex items-center justify-center focus-visible:ring-4 focus-visible:ring-amber-400 ${
                        voiceEnabled ? 'min-h-[64px] text-xl' : ''
                      } ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25'
                          : 'bg-slate-50 hover:bg-blue-50/50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== STEP 3: 활동 클럽 선택 (16개 클럽) ==================== */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  어떤 <span className="text-blue-600">클럽</span>에서 활동하시나요?
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  말로 클럽 이름을 부르거나 아래에서 모두 골라주세요. (현재{' '}
                  <strong className="text-blue-600">{selectedClubs.length}개</strong> 선택)
                </p>
              </div>

              {/* Giant Voice Input Button for Step 3 */}
              <button
                type="button"
                onClick={handleVoiceClubInput}
                aria-label="말로 활동 클럽 선택하기. 누른 뒤 멘토링, 스피치처럼 클럽 이름을 말씀해 주세요."
                className={`w-full py-4 px-5 rounded-2xl border-2 text-base sm:text-lg font-black flex items-center justify-center gap-3 shadow-md transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  isListening
                    ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                    : 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950'
                }`}
              >
                <Mic className="w-6 h-6 shrink-0" />
                <span>
                  {isListening
                    ? '🎙️ 듣고 있어요... 클럽 이름을 말씀해 주세요!'
                    : '🎙️ 눌러서 말로 클럽 고르기 (예: "멘토링, 스피치")'}
                </span>
              </button>

              {voiceStatusText && (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-sm font-extrabold text-center"
                >
                  {voiceStatusText}
                </div>
              )}

              <div
                role="group"
                aria-label="산스 16개 클럽 선택"
                className={`grid gap-2.5 max-h-[46vh] overflow-y-auto pr-1 ${
                  voiceEnabled ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {SANS_CLUBS.map((club) => {
                  const isSelected = selectedClubs.includes(club.name);
                  return (
                    <button
                      type="button"
                      key={club.id}
                      aria-pressed={isSelected}
                      aria-label={`${club.name}, ${
                        isSelected ? '선택됨. 다시 누르면 해제됩니다.' : '선택 안 됨. 누르면 선택됩니다.'
                      }`}
                      onClick={() => toggleClub(club.name)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                        voiceEnabled ? 'min-h-[68px]' : ''
                      } ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: club.bgLight }}
                          aria-hidden="true"
                        >
                          <ClubIcon
                            name={club.icon}
                            className="w-5 h-5"
                            style={{ color: club.color }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`font-extrabold text-slate-900 truncate ${
                              voiceEnabled ? 'text-lg' : 'text-sm sm:text-base'
                            }`}
                          >
                            {club.name}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {club.description}
                          </div>
                        </div>
                      </div>
                      <div
                        aria-hidden="true"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== STEP 4: 마음 키워드 선택 ==================== */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  마음에 와닿는 <span className="text-blue-600">키워드</span>를 골라주세요
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  비슷한 마음을 가진 분들과 연결돼요. (현재{' '}
                  <strong className="text-blue-600">{selectedKeywords.length}개</strong> 선택)
                </p>
              </div>

              {/* ONE-TAP FAST AUTO-COMPLETE & VOICE INPUT FOR STEP 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleQuickCompleteWithRecommendedKeywords}
                  aria-label="추천 키워드 3개를 자동으로 선택하고 바로 내 연결 결과 화면으로 이동하기"
                  className="py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-md transition focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <Zap className="w-5 h-5 shrink-0" />
                  <span>⚡ 추천 키워드로 바로 시작하기</span>
                </button>

                <button
                  type="button"
                  onClick={handleVoiceKeywordInput}
                  aria-label="말로 키워드 고르기. 누른 뒤 동료, 성장, 배려처럼 말씀해 주세요."
                  className={`py-4 px-4 rounded-2xl border-2 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-md transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                    isListening
                      ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                      : 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950'
                  }`}
                >
                  <Mic className="w-5 h-5 shrink-0" />
                  <span>
                    {isListening ? '🎙️ 듣고 있어요...' : '🎙️ 눌러서 말로 키워드 고르기'}
                  </span>
                </button>
              </div>

              {selectedKeywords.length > 0 && (
                <div
                  role="region"
                  aria-label="내가 고른 키워드"
                  className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xs font-extrabold text-blue-700">선택됨:</span>
                  {selectedKeywords.map((kw) => (
                    <button
                      type="button"
                      key={kw}
                      aria-label={`${kw.replace('#', '')} 선택 취소`}
                      onClick={() => toggleKeyword(kw)}
                      className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1"
                    >
                      <span>{kw}</span>
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  aria-pressed={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold shrink-0 transition ${
                    activeCategory === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  전체 보기
                </button>
                {KEYWORD_CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    aria-pressed={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold shrink-0 transition ${
                      activeCategory === cat.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>

              {/* Keyword Chips */}
              <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-1">
                {visibleCategories.map((cat) => (
                  <div
                    key={cat.id}
                    role="group"
                    aria-label={cat.title}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                  >
                    <div className="text-sm font-extrabold" style={{ color: cat.color }}>
                      {cat.title}
                    </div>
                    <div className={`grid gap-2 ${voiceEnabled ? 'grid-cols-1' : 'flex flex-wrap'}`}>
                      {cat.keywords.map((kw) => {
                        const active = selectedKeywords.includes(kw);
                        return (
                          <button
                            type="button"
                            key={kw}
                            aria-pressed={active}
                            aria-label={`${kw.replace('#', '')}, ${active ? '선택됨' : '선택 안 됨'}`}
                            onClick={() => toggleKeyword(kw)}
                            className={`px-4 py-2.5 rounded-xl font-extrabold transition flex items-center justify-between gap-1.5 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                              voiceEnabled ? 'w-full text-base min-h-[54px]' : 'text-sm'
                            } ${
                              active
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <span>{kw}</span>
                            {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom CTA Button */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 shrink-0">
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={step === 1 && !name.trim()}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base sm:text-lg font-extrabold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <span>
                {step === 1 && '다음: 몇 조인지 고르기'}
                {step === 2 && `${selectedTeam} 선택 완료 · 다음으로`}
                {step === 3 &&
                  (selectedClubs.length > 0
                    ? `클럽 ${selectedClubs.length}개 선택 완료 · 다음으로`
                    : '활동 클럽을 1개 이상 골라주세요')}
              </span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || selectedKeywords.length === 0}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base sm:text-lg font-extrabold shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>
                {isSubmitting ? '연결하는 중...' : '완료하고 내 연결 보기'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
