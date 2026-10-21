import React, { useState, useEffect, useMemo } from 'react';
import { SANS_CLUBS, SANS_TEAMS, KEYWORD_CATEGORIES } from '../data/sansData';
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
  VolumeX
} from 'lucide-react';
import { speakKorean } from '../utils/a11yVoice';

export default function JoinModal({
  isOpen,
  onClose,
  members,
  onSubmitMember,
  onQuickViewMember,
  initialName = '',
  voiceEnabled,
  onToggleVoice,
  latestLiveJoin
}) {
  // Toss-style progressive steps: 1 (이름) -> 2 (소속 조) -> 3 (소속 클럽) -> 4 (공감 키워드)
  const [step, setStep] = useState(1);

  const [name, setName] = useState(initialName || '');
  const [selectedTeam, setSelectedTeam] = useState('5조');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadedMember, setLoadedMember] = useState(null);

  // Reset to Step 1 when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg('');
      if (initialName) {
        setName(initialName);
        const found = members.find((m) => m.name === initialName.trim());
        if (found) {
          applyMemberData(found, false);
        }
      }
    }
  }, [isOpen, initialName]);

  // Speak step guidance when step changes and voice mode is active
  useEffect(() => {
    if (!isOpen || !voiceEnabled) return;
    if (step === 1) {
      speakKorean(
        '1단계 성함 입력 화면입니다. 성함을 입력하거나 아래 등록된 구성원 목록에서 본인의 이름을 선택해 주세요.'
      );
    } else if (step === 2) {
      speakKorean(
        `2단계 소속 조 선택 화면입니다. 1조부터 20조 중에서 ${name.trim()}님의 소속 조를 선택해 주세요. 현재 ${selectedTeam}가 선택되어 있습니다.`
      );
    } else if (step === 3) {
      speakKorean(
        '3단계 소속 클럽 선택 화면입니다. 16개 산스 클럽 중 활동하시는 클럽을 한 개 이상 선택해 주세요.'
      );
    } else if (step === 4) {
      speakKorean(
        '마지막 4단계 공감 키워드 선택 화면입니다. 나를 표현하는 키워드를 한 개에서 여섯 개까지 선택한 뒤 하단의 내 연결 완성하기 버튼을 눌러주세요.'
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
        `${memberObj.name}님의 기존 정보를 불러왔습니다. 소속은 ${memberObj.team}, 클럽은 ${memberObj.clubs.join(
          ', '
        )}입니다. 이 정보로 내 연결 바로 보기 버튼을 누르시면 바로 연결 화면으로 이동합니다.`
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
          `${exact.name}님의 기존 정보를 자동으로 불러왔습니다. ${exact.team}, ${exact.clubs.join(', ')} 소속입니다.`
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

  const toggleClub = (clubName) => {
    setErrorMsg('');
    setSelectedClubs((prev) => {
      const exists = prev.includes(clubName);
      const next = exists ? prev.filter((c) => c !== clubName) : [...prev, clubName];
      speakKorean(
        exists
          ? `${clubName} 선택 해제됨. 현재 ${next.length}개 클럽 선택됨.`
          : `${clubName} 선택됨. 현재 ${next.length}개 클럽 선택됨.`
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
        speakKorean(`${cleanKw} 키워드 선택 해제됨.`);
        return next;
      }
      if (prev.length >= 6) {
        const msg = '키워드는 최대 6개까지 선택할 수 있어요.';
        setErrorMsg(msg);
        speakKorean(msg);
        return prev;
      }
      const next = [...prev, kw];
      speakKorean(`${cleanKw} 키워드 선택됨. 현재 ${next.length}개 선택됨.`);
      return next;
    });
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!name.trim()) {
        const msg = '성함을 먼저 입력하거나 아래 목록에서 눌러주세요.';
        setErrorMsg(msg);
        speakKorean(msg);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedTeam) {
        const msg = '소속 조를 선택해 주세요.';
        setErrorMsg(msg);
        speakKorean(msg);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedClubs.length === 0) {
        const msg = '활동하시는 클럽을 최소 1개 이상 눌러주세요.';
        setErrorMsg(msg);
        speakKorean(msg);
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
      setErrorMsg('성함을 입력해 주세요.');
      return;
    }
    if (selectedClubs.length === 0) {
      setStep(3);
      setErrorMsg('클럽을 최소 1개 이상 선택해 주세요.');
      return;
    }
    if (selectedKeywords.length === 0) {
      const msg = '나를 표현하는 키워드를 최소 1개 이상 눌러주세요.';
      setErrorMsg(msg);
      speakKorean(msg);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[32px] shadow-2xl flex flex-col sm:max-h-[93vh] overflow-hidden">
        {/* Live Incoming Connection Notification Bar while user is inputting */}
        {latestLiveJoin && (
          <div
            role="status"
            aria-live="polite"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-900 text-white text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shrink-0"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate">
                실시간 연결 알림: 방금{' '}
                <strong className="text-amber-300">
                  [{latestLiveJoin.team}] {latestLiveJoin.name}
                </strong>
                님이 {latestLiveJoin.clubs.slice(0, 2).join(' · ')}으로 연결되었습니다!
              </span>
            </div>
          </div>
        )}

        {/* Top Toss-style Navigation, Voice Accessibility Toggle & Progress Bar */}
        <div className="px-5 pt-5 pb-3 bg-white shrink-0">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep((s) => s - 1);
                }}
                aria-label="이전 단계로 돌아가기"
                className="flex items-center gap-1.5 px-3 py-2 -ml-2 rounded-2xl text-slate-700 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-blue-500 text-sm font-bold transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>이전으로</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm">
                <Network className="w-5 h-5" />
                <span>SANS Connect · 산스 연결망</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Dedicated Voice Guide Toggle for Visually Impaired Members */}
              <button
                type="button"
                onClick={onToggleVoice}
                aria-pressed={voiceEnabled}
                aria-label={
                  voiceEnabled
                    ? '시각장애인 음성 안내 켜짐. 누르면 음성 안내를 끕니다.'
                    : '시각장애인 음성 안내 끄기 상태. 누르면 화면을 음성으로 읽어주는 접근성 모드를 켭니다.'
                }
                className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 border-2 transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  voiceEnabled
                    ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-sm'
                    : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                }`}
              >
                {voiceEnabled ? (
                  <Volume2 className="w-4 h-4 text-slate-950 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-blue-600" />
                )}
                <span>{voiceEnabled ? '음성 안내 켜짐' : '음성 안내 켜기'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="입력 창을 닫고 전체 산스 연결망 화면 바로 보기"
                className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-blue-500"
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>전체 연결망 바로 보기</span>
              </button>
            </div>
          </div>

          {/* 4-Step Smooth Progress Bar */}
          <div
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`총 4단계 중 ${step}단계 진행 중`}
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
          <div className="flex items-center justify-between mt-2 text-xs font-bold text-slate-500">
            <span>
              {step === 1 && '1단계 · 성함 입력 및 기존 정보 불러오기'}
              {step === 2 && '2단계 · 소속 조 선택 (1조~20조)'}
              {step === 3 && '3단계 · 소속 클럽 선택 (16개 클럽)'}
              {step === 4 && '4단계 · 공감 키워드 선택'}
            </span>
            <span>{step} / 4 단계</span>
          </div>
        </div>

        {/* Main Step Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==================== STEP 1: 이름 입력 ==================== */}
          {step === 1 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  반가워요! 👋
                  <br />
                  먼저 <span className="text-blue-600">성함</span>을 알려주세요
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  이미 등록된 분이라면 이름을 입력하거나 아래 버튼을 누르는 즉시 기존 정보가 자동으로 불러와져요.
                </p>
              </div>

              {/* Big Toss-style Input Box */}
              <div className="relative">
                <label htmlFor="member-name-input" className="sr-only">
                  성함 입력
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
                  placeholder="이름을 입력해 주세요 (예: 신동준)"
                  aria-describedby="name-input-help"
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-lg sm:text-xl font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold transition"
                />
                <span id="name-input-help" className="sr-only">
                  이름을 입력하면 기존에 등록된 소속 조, 클럽, 키워드 정보가 자동으로 불러와집니다.
                </span>
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

              {/* Instant Existing Member Recognition Card (Toss Style!) */}
              {loadedMember && (
                <div
                  role="region"
                  aria-live="polite"
                  aria-label={`${loadedMember.name}님의 기존 등록 정보`}
                  className="p-5 rounded-3xl bg-blue-50/90 border-2 border-blue-200 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold">
                        <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        기존 정보 자동 불러오기 완료!
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 pt-1">
                        {loadedMember.name}님의 연결 정보가 준비되어 있어요
                      </h3>
                    </div>
                  </div>

                  {/* Summary of loaded profile */}
                  <div className="bg-white rounded-2xl p-4 space-y-2.5 border border-blue-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 font-bold w-16 shrink-0">소속 조</span>
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                        {selectedTeam}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-slate-500 font-bold w-16 shrink-0">소속 클럽</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedClubs.map((c) => (
                          <span
                            key={c}
                            className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-slate-500 font-bold w-16 shrink-0">키워드</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedKeywords.map((k) => (
                          <span
                            key={k}
                            className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-xs"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Two Big Clear Action Buttons for Existing Member */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onQuickViewMember) {
                          onQuickViewMember(loadedMember.name);
                        }
                        onClose();
                      }}
                      aria-label={`${loadedMember.name}님의 기존 정보로 내 연결 관계도 바로 보기`}
                      className="flex-1 py-4 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition focus-visible:ring-4 focus-visible:ring-amber-400"
                    >
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                      <span>이 정보로 내 연결 바로 보기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      aria-label={`${loadedMember.name}님의 소속 조, 클럽, 키워드 정보 수정하기`}
                      className="py-4 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-200 text-sm font-extrabold flex items-center justify-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-blue-500"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                      <span>조·클럽·키워드 수정하기</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Easy Tap List of Existing Members */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700">
                    👇 명단에 내 이름이 있다면 바로 눌러보세요 ({matchingMembers.length}명)
                  </span>
                </div>
                <div
                  role="list"
                  aria-label="등록된 산스 구성원 목록"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1"
                >
                  {matchingMembers.map((m) => {
                    const isSelected = loadedMember?.name === m.name;
                    return (
                      <button
                        type="button"
                        key={m.name}
                        aria-pressed={isSelected}
                        aria-label={`${m.name}, ${m.team}, 소속 클럽 ${m.clubs.join(', ')}. 누르면 기존 정보를 불러옵니다.`}
                        onClick={() => applyMemberData(m, true)}
                        className={`p-3 rounded-2xl border-2 text-left transition flex items-center justify-between focus-visible:ring-4 focus-visible:ring-amber-400 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50/80 hover:bg-blue-50/50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-extrabold truncate">
                            {m.name}
                          </div>
                          <div
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {m.team} · {m.clubs[0] || '클럽'}
                            {m.clubs.length > 1 ? ` 외 ${m.clubs.length - 1}` : ''}
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
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
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  <span className="text-blue-600">{name.trim()}</span>님은
                  <br />몇 조에 속해 계신가요?
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  1조부터 20조 중에서 본인의 조 번호를 가볍게 눌러주세요.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="소속 조 선택 (1조부터 20조)"
                className="grid grid-cols-4 sm:grid-cols-5 gap-2.5"
              >
                {SANS_TEAMS.map((t) => {
                  const isSelected = selectedTeam === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`산스 ${t}`}
                      onClick={() => {
                        setSelectedTeam(t);
                        setErrorMsg('');
                        speakKorean(`${t} 선택됨`);
                      }}
                      className={`py-4 rounded-2xl text-base sm:text-lg font-extrabold border-2 transition flex flex-col items-center justify-center gap-0.5 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-[1.03]'
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

          {/* ==================== STEP 3: 소속 클럽 선택 (16개 클럽) ==================== */}
          {step === 3 && (
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  활동 중이거나 관심 있는
                  <br />
                  <span className="text-blue-600">산스 클럽</span>을 모두 골라주세요
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  여러 개를 동시에 선택할 수 있어요. (현재{' '}
                  <strong className="text-blue-600">{selectedClubs.length}개</strong> 선택됨)
                </p>
              </div>

              <div
                role="group"
                aria-label="산스 16개 클럽 복수 선택"
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1"
              >
                {SANS_CLUBS.map((club) => {
                  const isSelected = selectedClubs.includes(club.name);
                  return (
                    <button
                      type="button"
                      key={club.id}
                      aria-pressed={isSelected}
                      aria-label={`${club.name}, ${club.description}. ${
                        isSelected ? '현재 선택됨' : '선택 안 됨'
                      }`}
                      onClick={() => toggleClub(club.name)}
                      className={`text-left p-4 rounded-3xl border-2 transition-all flex flex-col justify-between gap-2 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-md scale-[1.01]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: club.bgLight }}
                          aria-hidden="true"
                        >
                          <ClubIcon
                            name={club.icon}
                            className="w-5 h-5"
                            style={{ color: club.color }}
                          />
                        </div>
                        <div
                          aria-hidden="true"
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {club.name}
                        </div>
                        <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                          {club.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== STEP 4: 공감 키워드 선택 ==================== */}
          {step === 4 && (
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <h2
                  id="onboarding-step-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  마지막이에요! ✨
                  <br />
                  나를 표현하는 <span className="text-blue-600">공감 키워드</span>를 눌러주세요
                </h2>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  같은 키워드를 고른 동료들과 연결선으로 이어져요. (1~6개 선택, 현재{' '}
                  <strong className="text-blue-600">{selectedKeywords.length}개</strong>)
                </p>
              </div>

              {/* Selected Keywords Bar */}
              {selectedKeywords.length > 0 && (
                <div
                  role="region"
                  aria-label="현재 선택한 키워드 목록"
                  className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xs font-extrabold text-blue-700">내가 고른 키워드:</span>
                  {selectedKeywords.map((kw) => (
                    <button
                      type="button"
                      key={kw}
                      aria-label={`${kw} 선택 해제하기`}
                      onClick={() => toggleKeyword(kw)}
                      className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1 shadow-sm"
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
                  className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold shrink-0 transition ${
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
                    className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold shrink-0 transition ${
                      activeCategory === cat.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>

              {/* Big Easy-to-Tap Keyword Chips */}
              <div className="space-y-4 max-h-[42vh] overflow-y-auto pr-1">
                {visibleCategories.map((cat) => (
                  <div
                    key={cat.id}
                    role="group"
                    aria-label={cat.title}
                    className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="text-sm font-extrabold" style={{ color: cat.color }}>
                      {cat.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.keywords.map((kw) => {
                        const active = selectedKeywords.includes(kw);
                        return (
                          <button
                            type="button"
                            key={kw}
                            aria-pressed={active}
                            aria-label={`${kw.replace('#', '')} 키워드, ${
                              active ? '선택됨' : '선택 안 됨'
                            }`}
                            onClick={() => toggleKeyword(kw)}
                            className={`px-4 py-2.5 rounded-2xl text-sm font-extrabold transition flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                              active
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                                : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {active && <Check className="w-4 h-4" aria-hidden="true" />}
                            <span>{kw}</span>
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

        {/* Bottom Big Toss-Style CTA Bar */}
        <div className="p-5 bg-white border-t border-slate-100 shrink-0">
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={step === 1 && !name.trim()}
              className={`w-full py-4 rounded-2xl text-base sm:text-lg font-extrabold flex items-center justify-center gap-2 transition shadow-lg focus-visible:ring-4 focus-visible:ring-amber-400 ${
                step === 1 && !name.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
              }`}
            >
              <span>
                {step === 1 &&
                  (loadedMember
                    ? `${loadedMember.name}님 정보 확인 · 다음으로`
                    : '다음: 소속 조 선택하기')}
                {step === 2 && `${selectedTeam} 선택 완료 · 다음으로`}
                {step === 3 &&
                  (selectedClubs.length > 0
                    ? `${selectedClubs.length}개 클럽 선택 완료 · 다음으로`
                    : '클럽을 1개 이상 선택해 주세요')}
              </span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || selectedKeywords.length === 0}
              className={`w-full py-4 rounded-2xl text-base sm:text-lg font-extrabold flex items-center justify-center gap-2 transition shadow-lg focus-visible:ring-4 focus-visible:ring-amber-400 ${
                selectedKeywords.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
              }`}
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? '연결망을 생성하고 있어요...'
                  : `${name.trim()}님의 산스 연결망 완성하기`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
