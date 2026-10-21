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
  X,
  ChevronDown,
  Stars
} from 'lucide-react';

export default function App() {
  const [events, setEvents] = useState(() => getLocalEvents());
  const members = useMemo(() => computeMembersFromEvents(events), [events]);

  // Graph Focus state: { type: 'ALL' | 'MEMBER' | 'CLUB' | 'TEAM' | 'KEYWORD', id: string | null }
  const [focus, setFocus] = useState({ type: 'ALL', id: null });
  const [personSubMode, setPersonSubMode] = useState('HUB');

  // Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Default to true so first landing screen is the Toss-style step-by-step onboarding
  const [isJoinOpen, setIsJoinOpen] = useState(true);
  const [editInitialName, setEditInitialName] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);

  const [toast, setToast] = useState(null);
  const knownEventIdsRef = useRef(new Set(events.map((e) => e.id)));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const syncFromRemote = async () => {
      const merged = await fetchAllRemoteEvents();
      if (!active) return;

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white">
      {/* Live Join Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400/50 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="text-xs sm:text-sm font-extrabold">
            <span className="text-amber-200">
              [{toast.team}] {toast.name}
            </span>
            님의 별자리가{' '}
            <span className="underline">
              {toast.clubs.slice(0, 2).join(' · ')}
            </span>
            으로 연결되었어요!
          </div>
          <button
            onClick={() => {
              setFocus({ type: 'MEMBER', id: toast.name });
              setToast(null);
            }}
            className="px-3 py-1 rounded-xl bg-slate-950/60 hover:bg-slate-950 text-xs font-extrabold shrink-0"
          >
            별자리 보기
          </button>
        </div>
      )}

      {/* ==================== 1. TOP NAVIGATION HEADER ==================== */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            setFocus({ type: 'ALL', id: null });
            setSearchQuery('');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            <Stars className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                SANS Connect
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-500/20 text-cyan-300 border border-cyan-400/30">
                산스 연결의 별자리
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400">
              이름이나 클럽을 누르면 나와 연결된 산스 별자리가 펼쳐집니다
            </p>
          </div>
        </div>

        {/* Center: Name Search Input */}
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
              placeholder="내 이름 검색 (예: 신동준, 노수림, 송현진...)"
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-700 bg-slate-800/90 focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none text-xs sm:text-sm font-bold text-white placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFocus({ type: 'ALL', id: null });
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearchOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-h-72 overflow-y-auto z-50 divide-y divide-slate-800">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center space-y-2.5">
                  <p className="text-xs text-slate-400">
                    ‘{searchQuery}’ 님은 아직 등록되지 않았습니다.
                  </p>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      handleOpenEditMember(searchQuery.trim());
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold"
                  >
                    + ‘{searchQuery.trim()}’ 이름으로 내 별자리 만들기
                  </button>
                </div>
              ) : (
                searchResults.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleSelectMemberFromSearch(m.name)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-800 flex items-center justify-between gap-2 transition"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                        <span>✨ {m.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 text-[10px] font-bold">
                          {m.team}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {m.clubs.join(' · ')}
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-cyan-400 shrink-0">
                      별자리 보기 →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenEditMember('')}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>내 별자리 만들기</span>
          </button>

          <button
            onClick={() => setIsQrOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition"
          >
            <QrCode className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">QR 참여</span>
          </button>
        </div>
      </header>

      {/* ==================== 2. CONSTELLATION FILTER BAR ==================== */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-col gap-1.5 shrink-0 z-20">
        {/* Row 1: All Galaxy + Team 1조~20조 + 16 Clubs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => {
              setFocus({ type: 'ALL', id: null });
              setSearchQuery('');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition flex items-center gap-1.5 ${
              focus.type === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            🌌 산스 전체 은하수 ({members.length}명)
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
              className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-extrabold border outline-none cursor-pointer transition ${
                focus.type === 'TEAM'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
              }`}
            >
              <option value="">🚩 조별 별자리 (1조~20조)</option>
              {SANS_TEAMS.map((t) => {
                const count = members.filter((m) => m.team === t).length;
                return (
                  <option key={t} value={t} className="bg-slate-900 text-white">
                    산스 {t} ({count}명)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-300" />
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 shrink-0" />

          {/* 16 Clubs Pills */}
          {SANS_CLUBS.map((club) => {
            const isSelected = focus.type === 'CLUB' && focus.id === club.name;
            const count = members.filter((m) => m.clubs.includes(club.name)).length;
            return (
              <button
                key={club.id}
                onClick={() => setFocus({ type: 'CLUB', id: club.name })}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <ClubIcon
                  name={club.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: isSelected ? '#FFFFFF' : club.color }}
                />
                <span>{club.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-950 text-cyan-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Quick Member Star Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[11px] font-extrabold text-slate-400 shrink-0 mr-1">
            ⭐ 구성원 별 바로가기:
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
                className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 border transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                    : isPresenter
                    ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border-amber-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isPresenter ? <span>🌟</span> : <span>✦</span>}
                <span>{m.name}</span>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {m.team}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 3. MAIN WORKSPACE: CONSTELLATION GRAPH + INSPECTOR ==================== */}
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
