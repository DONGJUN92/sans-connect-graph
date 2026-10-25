import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SANS_CLUBS, SANS_TEAMS } from './data/sansData';
import {
  getCachedMembers,
  saveCachedMembers,
  migrateLegacyLocalEventsOnce,
  fetchMembersFromNeon,
  upsertMemberInNeon,
  deleteMemberInNeon
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
import AdminLoginModal from './components/AdminLoginModal';
import AdminPanel from './components/AdminPanel';
import { useDeviceMode } from './hooks/useDeviceMode';
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
  List,
  Shield,
  LogOut,
  Smartphone
} from 'lucide-react';

export default function App() {
  const { isMobile, isDesktop } = useDeviceMode();
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sans_admin') === 'true' : false
  );
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const [members, setMembers] = useState(() => getCachedMembers());

  // Current user's registered or typed member name
  const [myMemberName, setMyMemberName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sans_my_name') || '';
    }
    return '';
  });

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
  const knownMemberNamesRef = useRef(new Set(members.map((m) => m.name)));
  const initialLoadDoneRef = useRef(false);
  const mutationSeqRef = useRef(0);

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
    if (voiceEnabled) {
      speakKorean(
        `새로운 연결 알림. 방금 ${memberObj.team || ''} ${cleanName}님이 ${(
          memberObj.clubs || []
        )
          .slice(0, 2)
          .join(', ')}으로 함께 연결되었습니다.`
      );
    }

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
          '음성 및 큰버튼 모드가 켜졌습니다. 화면의 버튼과 연결 내용을 음성으로 안내합니다.',
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

  // Real-time sync with Neon PostgreSQL (1.2s polling + instant window focus sync)
  useEffect(() => {
    let active = true;
    let isFetching = false;

    const syncFromNeon = async () => {
      if (isFetching || !active) return;
      isFetching = true;
      const seqBefore = mutationSeqRef.current;

      try {
        await migrateLegacyLocalEventsOnce();
        const remoteMembers = await fetchMembersFromNeon();
        if (!active || !remoteMembers) return;
        // Ignore stale GET responses if an add/delete mutation started while GET was in flight
        if (seqBefore !== mutationSeqRef.current) return;

        const nextKnown = new Set();
        for (const m of remoteMembers) {
          nextKnown.add(m.name);
          if (initialLoadDoneRef.current && !knownMemberNamesRef.current.has(m.name)) {
            registerNewLiveArrival(m);
          }
        }
        knownMemberNamesRef.current = nextKnown;
        initialLoadDoneRef.current = true;

        setMembers(remoteMembers);
      } finally {
        isFetching = false;
      }
    };

    syncFromNeon();
    const interval = setInterval(syncFromNeon, 1200);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncFromNeon();
      }
    };
    window.addEventListener('focus', syncFromNeon);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', syncFromNeon);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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
    const cleanName = memberData.name.trim();
    if (!cleanName) return;

    mutationSeqRef.current += 1;
    setMyMemberName(cleanName);
    try {
      localStorage.setItem('sans_my_name', cleanName);
    } catch {}

    knownMemberNamesRef.current.add(cleanName);

    // 1. Instant 0ms optimistic UI update
    const optimisticMember = {
      id: `member-${cleanName}`,
      name: cleanName,
      team: memberData.team || '5조',
      allTeams: cleanName === '이동훈 대표님',
      isRepresentative: cleanName === '이동훈 대표님',
      isSeed: cleanName === '이동훈 대표님' || cleanName === '신동준',
      isLiveJoined: true,
      clubs: Array.isArray(memberData.clubs) ? memberData.clubs : [],
      keywords: Array.isArray(memberData.keywords) ? memberData.keywords : [],
      updatedAt: Date.now()
    };

    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.name === cleanName);
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...prev[idx], ...optimisticMember };
      } else {
        next = [...prev, optimisticMember];
      }
      saveCachedMembers(next);
      return next;
    });

    handleSelectFocus({ type: 'MEMBER', id: cleanName });
    registerNewLiveArrival(optimisticMember);

    // 2. Persist to Neon PostgreSQL and sync authoritative list
    const remoteMembers = await upsertMemberInNeon({
      ...memberData,
      name: cleanName
    });
    if (remoteMembers) {
      mutationSeqRef.current += 1;
      knownMemberNamesRef.current = new Set(remoteMembers.map((m) => m.name));
      setMembers(remoteMembers);
    }
  };

  const handleCloseJoinModal = (typedName) => {
    if (typedName && typeof typedName === 'string' && typedName.trim()) {
      const clean = typedName.trim();
      // Only persist sans_my_name if the member actually exists in members
      if (members.some((m) => m.name === clean)) {
        setMyMemberName(clean);
        try {
          localStorage.setItem('sans_my_name', clean);
        } catch {}
      }
    }
    setIsJoinOpen(false);
  };

  const handleAdminLogin = (id, pw) => {
    if (id === 'test' && pw === 'test') {
      setIsAdmin(true);
      try { sessionStorage.setItem('sans_admin', 'true'); } catch {}
      setIsAdminLoginOpen(false);
      setIsAdminPanelOpen(true);
      setToast({
        name: '운영자',
        team: '로그인 성공',
        clubs: ['불필요한 참가자 정보를 삭제할 수 있습니다.']
      });
      return { success: true };
    }
    return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try { sessionStorage.removeItem('sans_admin'); } catch {}
    setIsAdminPanelOpen(false);
    setToast({
      name: '운영자',
      team: '로그아웃 완료',
      clubs: ['일반 사용자 모드로 전환되었습니다.']
    });
  };

  const handleDeleteMember = async (memberName) => {
    const cleanName = memberName.trim();
    if (!cleanName) return;
    if (cleanName === '이동훈 대표님') {
      alert('중앙 허브인 이동훈 대표님 정보는 삭제할 수 없습니다.');
      return;
    }

    mutationSeqRef.current += 1;
    knownMemberNamesRef.current.delete(cleanName);

    // Clear myMemberName if the deleted member was the active user name on this browser
    if (myMemberName === cleanName) {
      setMyMemberName('');
    }
    try {
      if (localStorage.getItem('sans_my_name') === cleanName) {
        localStorage.removeItem('sans_my_name');
      }
    } catch {}

    // 1. Instant 0ms optimistic UI removal
    setMembers((prev) => {
      const next = prev.filter((m) => m.name !== cleanName);
      saveCachedMembers(next);
      return next;
    });

    if (focus.type === 'MEMBER' && focus.id === cleanName) {
      handleSelectFocus({ type: 'ALL', id: null });
    }

    setToast({
      name: cleanName,
      team: '삭제 완료',
      clubs: ['운영자에 의해 삭제되었습니다.']
    });

    // 2. Delete from Neon PostgreSQL and sync authoritative list
    const remoteMembers = await deleteMemberInNeon(cleanName);
    if (remoteMembers) {
      mutationSeqRef.current += 1;
      knownMemberNamesRef.current = new Set(remoteMembers.map((m) => m.name));
      setMembers(remoteMembers);
    }
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Admin Operator Button */}
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => setIsAdminLoginOpen(true)}
              aria-label="운영자 로그인"
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">운영자</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                aria-label="운영자 관리 센터 열기"
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 text-xs sm:text-sm font-black flex items-center gap-1.5 transition shadow-sm animate-pulse"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">운영자 관리</span>
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                title="운영자 로그아웃"
                aria-label="운영자 로그아웃"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Big-Text & Audio Reader View Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsReaderView((v) => !v);
              if (!isReaderView && voiceEnabled) {
                speakKorean('큰버튼·음성 화면으로 전환되었습니다.');
              }
            }}
            aria-pressed={isReaderView}
            aria-label={
              isReaderView
                ? '현재 큰버튼·음성 화면. 누르면 시각 그래프 화면으로 전환'
                : '큰버튼·음성 화면 열기'
            }
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
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
                <span className="hidden sm:inline">큰버튼 목록</span>
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
                ? '음성/큰버튼 모드 켜짐. 누르면 끕니다.'
                : '음성/큰버튼 모드 켜기'
            }
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
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
              {voiceEnabled ? '음성 켜짐' : '음성/큰버튼'}
            </span>
          </button>

          {/* Join/Edit Button (Desktop prominence) */}
          <button
            onClick={() => handleOpenEditMember('')}
            aria-label="내 이름 찾기 또는 새로 등록하기"
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/25 items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>내 이름 찾기 · 등록</span>
          </button>

          <button
            onClick={() => setIsQrOpen(true)}
            aria-label="스마트폰 참여용 QR 코드 열기"
            className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
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
              isMobile={isMobile}
              myMemberName={myMemberName}
            />

            <ConnectionInspector
              members={members}
              focus={focus}
              onSelectFocus={handleSelectFocus}
              onOpenEditMember={handleOpenEditMember}
              isOpen={isInspectorOpen}
              onToggleOpen={() => setIsInspectorOpen((v) => !v)}
              isMobile={isMobile}
              isAdmin={isAdmin}
              onDeleteMember={handleDeleteMember}
            />
          </>
        )}
      </main>

      {/* ==================== Mobile Bottom Navigation Dock ==================== */}
      {isMobile && !isJoinOpen && !isAdminPanelOpen && !isAdminLoginOpen && (
        <nav
          aria-label="모바일 빠른 메뉴"
          className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around gap-1 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
        >
          <button
            type="button"
            onClick={() => handleSelectFocus({ type: 'ALL', id: null })}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-extrabold transition ${
              focus.type === 'ALL'
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>전체 연결</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenEditMember('')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>내 정보 등록</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReaderView((v) => !v)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-extrabold transition ${
              isReaderView
                ? 'text-cyan-400 bg-cyan-400/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
            <span>{isReaderView ? '그래프' : '큰버튼 목록'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-extrabold transition ${
              isFilterDrawerOpen
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-5 h-5" />
            <span>클럽·조</span>
          </button>
        </nav>
      )}

      {/* ==================== 3. MODALS ==================== */}
      <JoinModal
        isOpen={isJoinOpen}
        onClose={handleCloseJoinModal}
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
        isMobile={isMobile}
      />

      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        memberCount={members.length}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLogin={handleAdminLogin}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        members={members}
        onDeleteMember={handleDeleteMember}
        onLogout={handleAdminLogout}
      />
    </div>
  );
}
