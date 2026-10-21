import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SANS_CLUBS, SANS_TEAMS, INITIAL_MEMBERS } from './data/sansData';
import {
  getLocalEvents,
  saveLocalEvents,
  mergeEventLists,
  computeMembersFromEvents,
  fetchAllRemoteEvents,
  publishSyncEvent,
  subscribeToLiveEvents
} from './utils/syncEngine';
import KnowledgeGraph from './components/KnowledgeGraph';
import JoinModal from './components/JoinModal';
import QrModal from './components/QrModal';
import ConnectionInspector from './components/ConnectionInspector';
import ClubIcon from './components/ClubIcon';
import {
  Search,
  UserPlus,
  QrCode,
  Sparkles,
  Users,
  X,
  RotateCcw,
  ChevronDown,
  Network
} from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState(() => getLocalEvents());
  const members = useMemo(() => computeMembersFromEvents(events), [events]);

  // Graph Focus state: { type: 'ALL' | 'MEMBER' | 'CLUB' | 'TEAM' | 'KEYWORD', id: string | null }
  const [focus, setFocus] = useState({ type: 'ALL', id: null });
  const [personSubMode, setPersonSubMode] = useState('HUB'); // 'HUB' | 'DIRECT'

  // Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Modals state (Default to true so the very first landing screen is the Name/Team/Club/Keyword selection screen!)
  const [isJoinOpen, setIsJoinOpen] = useState(true);
  const [editInitialName, setEditInitialName] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Live toast notification
  const [toast, setToast] = useState(null);
  const knownEventIdsRef = useRef(new Set(events.map((e) => e.id)));

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial sync + periodic polling + real-time SSE subscription
  useEffect(() => {
    let active = true;

    const syncFromRemote = async () => {
      const merged = await fetchAllRemoteEvents();
      if (!active) return;

      // Check if any new UPSERT_MEMBER event arrived
      for (const ev of merged) {
        if (!knownEventIdsRef.current.has(ev.id)) {
          knownEventIdsRef.current.add(ev.id);
          if (ev.type === 'UPSERT_MEMBER' && ev.member?.name) {
            setToast({
              name: ev.member.name,
              team: ev.member.team,
              clubs: ev.member.clubs || []
            });
          }
        }
      }

      saveLocalEvents(merged);
      setEvents(merged);
    };

    syncFromRemote();
    const interval = setInterval(syncFromRemote, 4000);

    const unsubscribeSSE = subscribeToLiveEvents((newEvent) => {
      if (!active) return;
      if (!knownEventIdsRef.current.has(newEvent.id)) {
        knownEventIdsRef.current.add(newEvent.id);
        if (newEvent.type === 'UPSERT_MEMBER' && newEvent.member?.name) {
          setToast({
            name: newEvent.member.name,
            team: newEvent.member.team,
            clubs: newEvent.member.clubs || []
          });
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

  // Auto-hide toast after 4.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Search filtered results
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
    setFocus({ type: 'MEMBER', id: memberName });
    setSearchQuery(memberName);
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
    // Immediately focus the graph on the submitted member's name!
    setFocus({ type: 'MEMBER', id: memberData.name });
    setSearchQuery(memberData.name);
    setToast({
      name: memberData.name,
      team: memberData.team,
      clubs: memberData.clubs
    });
  };

  const handleOpenEditMember = (memberName = '') => {
    setEditInitialName(memberName);
    setIsJoinOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Live Join Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-indigo-500/40 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs sm:text-sm font-semibold">
            <span className="text-amber-300 font-bold">
              [{toast.team}] {toast.name}
            </span>
            님이{' '}
            <span className="text-indigo-300 font-bold">
              {toast.clubs.slice(0, 2).join(' · ')}
            </span>
            으로 연결되었습니다!
          </div>
          <button
            onClick={() => {
              setFocus({ type: 'MEMBER', id: toast.name });
              setToast(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold shrink-0"
          >
            보기
          </button>
        </div>
      )}

      {/* ==================== 1. TOP NAVIGATION HEADER ==================== */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            setFocus({ type: 'ALL', id: null });
            setSearchQuery('');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                SANS Connect
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                산스 연결의 힘
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-500">
              이름·클럽·조를 선택하면 나와 연결된 산스 구성원 관계도가 펼쳐집니다
            </p>
          </div>
        </div>

        {/* Center: Name Search Input with Live Autocomplete */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
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
              placeholder="이름 검색 (예: 신동준, 노수림, 송현진...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-xs sm:text-sm font-medium text-slate-900 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFocus({ type: 'ALL', id: null });
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    ‘{searchQuery}’ 님은 아직 등록되지 않았습니다.
                  </p>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      handleOpenEditMember(searchQuery.trim());
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    + ‘{searchQuery.trim()}’ 이름으로 바로 등록하기
                  </button>
                </div>
              ) : (
                searchResults.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleSelectMemberFromSearch(m.name)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/60 flex items-center justify-between gap-2 transition"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {m.name}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          {m.team}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {m.clubs.join(' · ')}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 shrink-0">
                      관계도 보기 →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Action Buttons (Join & QR Modal) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenEditMember('')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>내 연결 등록</span>
          </button>

          <button
            onClick={() => setIsQrOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
          >
            <QrCode className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">QR 참여</span>
          </button>
        </div>
      </header>

      {/* ==================== 2. FILTER BAR (16 CLUBS + 1~20 TEAMS + QUICK MEMBERS) ==================== */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-col gap-1.5 shrink-0 z-20">
        {/* Row 1: All SANS + 16 Clubs Filter Chips + Team Dropdown */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => {
              setFocus({ type: 'ALL', id: null });
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
              focus.type === 'ALL'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            🌟 산스 전체 ({members.length}명)
          </button>

          {/* Team 1조~20조 Selector */}
          <div className="relative shrink-0">
            <select
              value={focus.type === 'TEAM' ? focus.id : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setFocus({ type: 'TEAM', id: val });
                } else {
                  setFocus({ type: 'ALL', id: null });
                }
              }}
              className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition ${
                focus.type === 'TEAM'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
              }`}
            >
              <option value="">🚩 조별 보기 (1조~20조)</option>
              {SANS_TEAMS.map((t) => {
                const count = members.filter((m) => m.team === t).length;
                return (
                  <option key={t} value={t} className="bg-white text-slate-900">
                    산스 {t} ({count}명)
                  </option>
                );
              })}
            </select>
            <ChevronDown
              className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                focus.type === 'TEAM' ? 'text-white' : 'text-indigo-700'
              }`}
            />
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 shrink-0" />

          {/* 16 Clubs Horizontal Pills */}
          {SANS_CLUBS.map((club) => {
            const isSelected = focus.type === 'CLUB' && focus.id === club.name;
            const count = members.filter((m) => m.clubs.includes(club.name)).length;
            return (
              <button
                key={club.id}
                onClick={() => setFocus({ type: 'CLUB', id: club.name })}
                style={
                  isSelected
                    ? { backgroundColor: club.color, color: '#FFFFFF', borderColor: club.color }
                    : { backgroundColor: club.bgLight, color: club.color, borderColor: club.borderLight }
                }
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition flex items-center gap-1.5 hover:opacity-90"
              >
                <ClubIcon
                  name={club.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: isSelected ? '#FFFFFF' : club.color }}
                />
                <span>{club.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-white/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Quick Member Pills (Highlighting 신동준 & all members) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">
            👤 구성원 바로가기:
          </span>
          {members.map((m) => {
            const isSelected = focus.type === 'MEMBER' && focus.id === m.name;
            const isPresenter = m.name === '신동준';
            return (
              <button
                key={m.name}
                onClick={() => {
                  setFocus({ type: 'MEMBER', id: m.name });
                  setSearchQuery(m.name);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 border transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : isPresenter
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isPresenter && <span>⭐</span>}
                <span>{m.name}</span>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-indigo-100' : 'text-slate-400'
                  }`}
                >
                  {m.team}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 3. MAIN WORKSPACE: GRAPH + INSPECTOR ==================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 h-full relative">
          <KnowledgeGraph
            members={members}
            focus={focus}
            onSelectFocus={(nextFocus) => {
              setFocus(nextFocus);
              if (nextFocus.type === 'MEMBER') {
                setSearchQuery(nextFocus.id);
              } else if (nextFocus.type === 'ALL') {
                setSearchQuery('');
              }
            }}
            personSubMode={personSubMode}
            onChangePersonSubMode={setPersonSubMode}
          />
        </div>

        {/* Right Side / Bottom Connection Summary Drawer */}
        <div className="h-64 lg:h-full shrink-0 overflow-hidden">
          <ConnectionInspector
            members={members}
            focus={focus}
            onSelectFocus={(nextFocus) => {
              setFocus(nextFocus);
              if (nextFocus.type === 'MEMBER') {
                setSearchQuery(nextFocus.id);
              }
            }}
            onOpenEditMember={handleOpenEditMember}
          />
        </div>
      </div>

      {/* ==================== 4. MODALS ==================== */}
      <JoinModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        members={members}
        onSubmitMember={handleSubmitMember}
        onQuickViewMember={(memberName) => {
          setFocus({ type: 'MEMBER', id: memberName });
          setSearchQuery(memberName);
        }}
        initialName={editInitialName}
      />

      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        memberCount={members.length}
      />
    </div>
  );
}
