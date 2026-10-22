import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SANS_CLUBS, SANS_TEAMS } from './data/sansData';
import {
  getLocalEvents,
  saveLocalEvents,
  mergeEventLists,
  computeMembersFromEvents,
  fetchAllRemoteEvents,
  publishSyncEvent,
  subscribeToLiveEvents
} from './utils/syncEngine';
import {
  setVoiceGuideEnabled,
  speakKorean,
  playConnectionChime,
  buildMemberConnectionSummaryText
} from './utils/a11yVoice';
import KnowledgeGraph from './components/KnowledgeGraph';
import JoinModal from './components/JoinModal';
import QrModal from './components/QrModal';
import ConnectionInspector from './components/ConnectionInspector';
import AccessibleReaderPanel from './components/AccessibleReaderPanel';
import ClubIcon from './components/ClubIcon';
import {
  Search,
  UserPlus,
  QrCode,
  Sparkles,
  X,
  ChevronDown,
  Network,
  Volume2,
  VolumeX,
  Compass,
  Eye,
  List
} from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState(() => getLocalEvents());
  const members = useMemo(() => computeMembersFromEvents(events), [events]);

  // Graph Focus state: { type: 'ALL' | 'MEMBER' | 'CLUB' | 'TEAM' | 'KEYWORD', id: string | null }
  const [focus, setFocus] = useState({ type: 'ALL', id: null });
  const [personSubMode, setPersonSubMode] = useState('HUB');

  // Floating Inspector open state (Closed by default in ALL mode so graph is 100% unobstructed!)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Compact Popover Menu state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const filterDrawerRef = useRef(null);

  // Accessibility Voice Guide & Dedicated Screen-Reader Reader Mode
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isReaderView, setIsReaderView] = useState(false);

  // Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Default to true so first landing screen is the friendly step-by-step onboarding
  const [isJoinOpen, setIsJoinOpen] = useState(true);
  const [editInitialName, setEditInitialName] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Real-time newly joined member tracking
  const [toast, setToast] = useState(null);
  const [newlyJoinedNames, setNewlyJoinedNames] = useState(() => new Set());
  const knownEventIdsRef = useRef(new Set(events.map((e) => e.id)));
  const initialLoadDoneRef = useRef(false);

  const handleSelectFocus = (nextFocus) => {
    setFocus(nextFocus);
    setIsFilterDrawerOpen(false);
    if (nextFocus.type === 'ALL') {
      setSearchQuery('');
      setIsInspectorOpen(false);
    } else {
      if (nextFocus.type === 'MEMBER') {
        setSearchQuery(nextFocus.id);
      }
      setIsInspectorOpen(true);
    }
  };

  const registerNewLiveArrival = (memberObj) => {
    if (!memberObj || !memberObj.name) return;
    const cleanName = memberObj.name.trim();

    setToast({
      name: cleanName,
      team: memberObj.team || '5조',
      clubs: memberObj.clubs || []
    });

    setNewlyJoinedNames((prev) => {
      const next = new Set(prev);
      next.add(cleanName);
      return next;
    });

    playConnectionChime();
    speakKorean(
      `새로운 연결 알림. 방금 ${memberObj.team || ''} ${cleanName}님이 ${(
        memberObj.clubs || []
      )
        .slice(0, 2)
        .join(', ')}으로 함께 연결되었습니다.`
    );

    setTimeout(() => {
      setNewlyJoinedNames((prev) => {
        const next = new Set(prev);
        next.delete(cleanName);
        return next;
      });
    }, 12000);
  };

  const handleToggleVoice = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      setVoiceGuideEnabled(next);
      if (next) {
        setIsReaderView(true);
        speakKorean(
          '시각장애인을 위한 음성 및 큰글씨 모드가 켜졌습니다. 화면의 버튼과 연결 내용을 음성으로 안내합니다.',
          true
        );
      } else {
        setIsReaderView(false);
      }
      return next;
    });
  };

  const handleEnableVoiceExplicit = () => {
    setVoiceEnabled(true);
    setVoiceGuideEnabled(true);
  };

  const currentSummaryText = useMemo(() => {
    if (focus.type === 'MEMBER') {
      const person = members.find((m) => m.name === focus.id);
      return buildMemberConnectionSummaryText(person, members);
    }
    if (focus.type === 'CLUB') {
      const clubMembers = members.filter((m) => m.clubs.includes(focus.id));
      return `${focus.id}에는 총 ${clubMembers.length}명(${clubMembers
        .map((m) => m.name)
        .join(', ')})이 함께하고 있습니다.`;
    }
    if (focus.type === 'TEAM') {
      const teamMembers = members.filter((m) => m.team === focus.id || m.allTeams);
      return `${focus.id}에는 총 ${teamMembers.length}명(${teamMembers
        .map((m) => m.name)
        .join(', ')})이 함께하고 있습니다.`;
    }
    if (focus.type === 'KEYWORD') {
      const kwMembers = members.filter((m) => m.keywords.includes(focus.id));
      return `${focus.id} 키워드를 함께 선택한 분은 총 ${kwMembers.length}명(${kwMembers
        .map((m) => m.name)
        .join(', ')})입니다.`;
    }
    return `산스 전체 연결 화면입니다. 중심에 이동훈 대표님이 계시며, ${SANS_CLUBS.length}개 클럽과 총 ${members.length}명의 산스 식구들이 하나로 연결되어 있습니다.`;
  }, [focus, members]);

  // Voice announcement on focus change
  useEffect(() => {
    if (!voiceEnabled || isJoinOpen) return;
    speakKorean(currentSummaryText);
  }, [focus.type, focus.id, voiceEnabled, isJoinOpen, currentSummaryText]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (filterDrawerRef.current && !filterDrawerRef.current.contains(e.target)) {
        setIsFilterDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Alt+V to toggle accessible voice mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handleToggleVoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time sync (SSE + 2.5s polling)
  useEffect(() => {
    let active = true;

    const syncFromRemote = async () => {
      const merged = await fetchAllRemoteEvents();
      if (!active) return;

      for (const ev of merged) {
        if (!knownEventIdsRef.current.has(ev.id)) {
          knownEventIdsRef.current.add(ev.id);
          if (initialLoadDoneRef.current && ev.type === 'UPSERT_MEMBER' && ev.member?.name) {
            registerNewLiveArrival(ev.member);
          }
        }
      }

      initialLoadDoneRef.current = true;
      saveLocalEvents(merged);
      setEvents(merged);
    };

    syncFromRemote();
    const interval = setInterval(syncFromRemote, 2500);

    const unsubscribeSSE = subscribeToLiveEvents((newEvent) => {
      if (!active) return;
      if (!knownEventIdsRef.current.has(newEvent.id)) {
        knownEventIdsRef.current.add(newEvent.id);
        if (newEvent.type === 'UPSERT_MEMBER' && newEvent.member?.name) {
          registerNewLiveArrival(newEvent.member);
        }
      }
      setEvents((prev) => {
        const next = mergeEventLists(prev, [newEvent]);
        saveLocalEvents(next);
        return next;
      });
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeSSE();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.team && m.team.toLowerCase().includes(q)) ||
        m.clubs.some((c) => c.toLowerCase().includes(q)) ||
        m.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  const handleSelectMemberFromSearch = (memberName) => {
    handleSelectFocus({ type: 'MEMBER', id: memberName });
    setIsSearchOpen(false);
  };

  const handleSubmitMember = async (memberData) => {
    const ev = await publishSyncEvent({
      type: 'UPSERT_MEMBER',
      member: memberData
    });
    knownEventIdsRef.current.add(ev.id);
    setEvents((prev) => {
      const next = mergeEventLists(prev, [ev]);
      saveLocalEvents(next);
      return next;
    });
    handleSelectFocus({ type: 'MEMBER', id: memberData.name });
    registerNewLiveArrival(memberData);
  };

  const handleOpenEditMember = (memberName = '') => {
    setEditInitialName(memberName);
    setIsJoinOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white">
      {/* Live Incoming Connection Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-3 animate-bounce"
        >
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
          <div className="text-xs sm:text-sm font-extrabold">
            <span className="text-amber-200">
              ✨ 방금 [{toast.team}] {toast.name}님이
            </span>{' '}
            <span className="underline">{toast.clubs.slice(0, 2).join(' · ')}</span>으로 함께 연결되었어요!
          </div>
          <button
            onClick={() => {
              handleSelectFocus({ type: 'MEMBER', id: toast.name });
              setToast(null);
            }}
            className="px-3 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-amber-300 text-xs font-black shrink-0"
          >
            연결 보기
          </button>
        </div>
      )}

      {/* ==================== 1. SLIM CLEAN HEADER BAR ==================== */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between gap-2.5 shrink-0 z-40">
        {/* Left: Brand Logo + Quick Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectFocus({ type: 'ALL', id: null })}
            aria-label="산스 홈, 전체 연결 보기"
            className="flex items-center gap-2 cursor-pointer group focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl pr-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition">
              <Network className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-black text-white leading-tight">
                SANS Connect
              </div>
              <div className="text-[10.5px] font-bold text-amber-300">
                산스 연결 지도 ({members.length}명)
              </div>
            </div>
          </button>

          {/* Popover Menu for Clubs, Teams & Members */}
          <div ref={filterDrawerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen((v) => !v)}
              aria-expanded={isFilterDrawerOpen}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold border flex items-center gap-1.5 transition ${
                isFilterDrawerOpen
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>모임 · 조 · 사람 찾기</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isFilterDrawerOpen && (
              <div className="absolute left-0 mt-2 w-[340px] sm:w-[540px] max-h-[80vh] overflow-y-auto bg-slate-900/98 backdrop-blur-2xl border border-slate-700 rounded-3xl shadow-2xl p-4 sm:p-5 z-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-sm font-extrabold text-white">
                    🧭 어떤 연결을 먼저 둘러볼까요?
                  </span>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Core Representative Quick Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSelectFocus({ type: 'ALL', id: null })}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black"
                  >
                    👑 이동훈 대표님과 산스 전체 연결
                  </button>
                  <button
                    onClick={() => handleSelectFocus({ type: 'MEMBER', id: '신동준' })}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black"
                  >
                    ⭐ 신동준 (5조) 연결 보기
                  </button>
                </div>

                {/* All Clubs Grid */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-400">
                    🏛️ {SANS_CLUBS.length}개 클럽 둘러보기
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {SANS_CLUBS.map((club) => {
                      const count = members.filter((m) => m.clubs.includes(club.name)).length;
                      return (
                        <button
                          key={club.id}
                          onClick={() => handleSelectFocus({ type: 'CLUB', id: club.name })}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left flex items-center gap-2 transition"
                        >
                          <ClubIcon
                            name={club.icon}
                            className="w-4 h-4 shrink-0"
                            style={{ color: club.color }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {club.shortName}
                            </div>
                            <div className="text-[10px] text-cyan-400 font-bold">
                              {count}명
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Teams 1조 ~ 20조 */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-400">
                    🚩 1조부터 20조까지 조별 보기
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {SANS_TEAMS.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleSelectFocus({ type: 'TEAM', id: t })}
                        className="py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All Members */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-400">
                    👤 산스 식구들 개인 연결 바로가기 ({members.length}명)
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {members.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => handleSelectFocus({ type: 'MEMBER', id: m.name })}
                        className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-blue-600 text-xs font-bold text-white border border-slate-700 transition"
                      >
                        {m.isRepresentative ? '👑 ' : ''}
                        {m.name}{' '}
                        <span className="text-[10px] text-slate-400">{m.team}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Input */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="header-member-search" className="sr-only">
              이름 또는 클럽, 조 검색
            </label>
            <input
              id="header-member-search"
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  handleSelectMemberFromSearch(searchResults[0].name);
                }
              }}
              placeholder="이름이나 클럽, 조 검색 (예: 이동훈 대표님, 신동준...)"
              className="w-full pl-10 pr-8 py-2 rounded-2xl border border-slate-700 bg-slate-800/90 focus:bg-slate-800 focus:border-blue-500 outline-none text-xs sm:text-sm font-bold text-white placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSelectFocus({ type: 'ALL', id: null })}
                aria-label="검색어 지우기"
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearchOpen && (
            <div
              role="listbox"
              aria-label="검색 결과"
              className="absolute left-0 right-0 mt-1.5 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-h-72 overflow-y-auto z-50 divide-y divide-slate-800"
            >
              {searchResults.length === 0 ? (
                <div className="p-4 text-center space-y-2.5">
                  <p className="text-xs text-slate-400">
                    ‘{searchQuery}’ 님은 아직 등록되지 않았어요.
                  </p>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      handleOpenEditMember(searchQuery.trim());
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black"
                  >
                    + ‘{searchQuery.trim()}’ 이름으로 바로 등록하기
                  </button>
                </div>
              ) : (
                searchResults.map((m) => (
                  <button
                    key={m.name}
                    role="option"
                    onClick={() => handleSelectMemberFromSearch(m.name)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-800 flex items-center justify-between gap-2 transition"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                        <span>
                          {m.isRepresentative ? '👑' : '✨'} {m.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 text-[10px] font-bold">
                          {m.team}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xs">
                        {m.isRepresentative ? `전체 ${SANS_CLUBS.length}개 클럽 · 전체 조 연결` : m.clubs.join(' · ')}
                      </div>
                    </div>
                    <span className="text-xs font-black text-cyan-400 shrink-0">
                      연결 보기 →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: View Switcher, Voice Guide, Register & QR */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Big-Text & Audio Reader View Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsReaderView((v) => !v);
              if (!isReaderView) {
                speakKorean('시각장애인 전용 큰글씨·음성 목록 화면으로 전환되었습니다.', true);
              }
            }}
            aria-pressed={isReaderView}
            aria-label={
              isReaderView
                ? '현재 큰글씨·음성 화면. 누르면 시각 그래프 화면으로 전환'
                : '시각장애인용 큰글씨·음성 화면 열기'
            }
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
              isReaderView
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            }`}
          >
            {isReaderView ? (
              <>
                <Eye className="w-4 h-4 text-slate-950" aria-hidden="true" />
                <span className="hidden sm:inline">그래프 보기</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span className="hidden sm:inline">큰글씨·음성 목록</span>
              </>
            )}
          </button>

          {/* Voice Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleVoice}
            aria-pressed={voiceEnabled}
            aria-label={
              voiceEnabled
                ? '음성 안내 켜짐. 누르면 끕니다.'
                : '음성 안내 켜기'
            }
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
              voiceEnabled
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4 animate-pulse" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="hidden md:inline">
              {voiceEnabled ? '음성 켜짐' : '음성 안내'}
            </span>
          </button>

          <button
            onClick={() => handleOpenEditMember('')}
            aria-label="내 이름 찾기 또는 새로 등록하기"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>내 이름 찾기 · 등록</span>
          </button>

          <button
            onClick={() => setIsQrOpen(true)}
            aria-label="스마트폰 참여용 QR 코드 열기"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <QrCode className="w-4 h-4 text-amber-300" aria-hidden="true" />
            <span className="hidden md:inline">QR</span>
          </button>
        </div>
      </header>

      {/* ==================== 2. MAIN VIEW AREA ==================== */}
      <main className="flex-1 w-full h-full overflow-hidden relative">
        {isReaderView ? (
          <AccessibleReaderPanel
            members={members}
            focus={focus}
            onSelectFocus={handleSelectFocus}
            onOpenJoinModal={handleOpenEditMember}
            summaryText={currentSummaryText}
            onSwitchToVisualGraph={() => setIsReaderView(false)}
          />
        ) : (
          <>
            <KnowledgeGraph
              members={members}
              focus={focus}
              onSelectFocus={handleSelectFocus}
              personSubMode={personSubMode}
              onChangePersonSubMode={setPersonSubMode}
              newlyJoinedNames={newlyJoinedNames}
            />

            <ConnectionInspector
              members={members}
              focus={focus}
              onSelectFocus={handleSelectFocus}
              onOpenEditMember={handleOpenEditMember}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen((v) => !v)}
            />
          </>
        )}
      </main>

      {/* ==================== 3. MODALS ==================== */}
      <JoinModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        members={members}
        onSubmitMember={handleSubmitMember}
        onQuickViewMember={(memberName) => {
          handleSelectFocus({ type: 'MEMBER', id: memberName });
        }}
        initialName={editInitialName}
        voiceEnabled={voiceEnabled}
        onToggleVoice={handleToggleVoice}
        onEnableVoice={handleEnableVoiceExplicit}
        latestLiveJoin={toast}
      />

      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        memberCount={members.length}
      />
    </div>
  );
}
