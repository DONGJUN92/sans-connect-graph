import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SANS_CLUBS, SANS_TEAMS, KEYWORD_CATEGORIES } from '../data/sansData';
import ClubIcon from './ClubIcon';
import {
  X,
  Check,
  Sparkles,
  UserCheck,
  Search,
  ArrowRight,
  RotateCcw,
  Network
} from 'lucide-react';

export default function JoinModal({
  isOpen,
  onClose,
  members,
  onSubmitMember,
  onQuickViewMember,
  initialName = ''
}) {
  const [name, setName] = useState(initialName || '');
  const [selectedTeam, setSelectedTeam] = useState('5조');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadedMemberName, setLoadedMemberName] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Sync initialName when modal opens with a specific name
  useEffect(() => {
    if (isOpen && initialName) {
      setName(initialName);
      const found = members.find((m) => m.name === initialName.trim());
      if (found) {
        applyMemberData(found);
      }
    }
  }, [isOpen, initialName]);

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const applyMemberData = (memberObj) => {
    if (!memberObj) return;
    setName(memberObj.name);
    setSelectedTeam(memberObj.team || '5조');
    setSelectedClubs([...(memberObj.clubs || [])]);
    setSelectedKeywords([...(memberObj.keywords || [])]);
    setLoadedMemberName(memberObj.name);
    setErrorMsg('');
    setShowDropdown(false);
  };

  // Also auto-load if user types an exact match of an existing member name
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      if (loadedMemberName) {
        setLoadedMemberName(null);
        setSelectedClubs([]);
        setSelectedKeywords([]);
      }
      return;
    }
    const exactMatch = members.find((m) => m.name === trimmed);
    if (exactMatch && loadedMemberName !== exactMatch.name) {
      setSelectedTeam(exactMatch.team || '5조');
      setSelectedClubs([...(exactMatch.clubs || [])]);
      setSelectedKeywords([...(exactMatch.keywords || [])]);
      setLoadedMemberName(exactMatch.name);
      setErrorMsg('');
    } else if (!exactMatch && loadedMemberName) {
      // User changed the name away from a previously loaded member to a brand-new name
      setLoadedMemberName(null);
    }
  }, [name, members]);

  // Filtered member suggestions as user types in the name field
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
    setSelectedClubs((prev) =>
      prev.includes(clubName)
        ? prev.filter((c) => c !== clubName)
        : [...prev, clubName]
    );
  };

  const toggleKeyword = (kw) => {
    setErrorMsg('');
    setSelectedKeywords((prev) => {
      if (prev.includes(kw)) {
        return prev.filter((k) => k !== kw);
      }
      if (prev.length >= 6) {
        setErrorMsg('키워드는 최대 6개까지 선택할 수 있습니다.');
        return prev;
      }
      return [...prev, kw];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('성함을 입력해 주세요.');
      return;
    }
    if (selectedClubs.length === 0) {
      setErrorMsg('소속 클럽을 최소 1개 이상 선택해 주세요.');
      return;
    }
    if (selectedKeywords.length === 0) {
      setErrorMsg('공감 키워드를 최소 1개 이상 선택해 주세요.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-2.5 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                산스(SANS) 연결의 힘 — 내 연결 시작하기
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-100">
                이름을 입력하거나 선택하면 기존 정보가 자동으로 불러와지며, 나와 연결된 산스 관계도가 펼쳐집니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition"
          >
            <Network className="w-3.5 h-3.5" />
            <span>전체 그래프 둘러보기</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ==================== STEP 1: NAME INPUT & EXISTING MEMBER AUTO-LOAD ==================== */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  1
                </span>
                성함을 입력하거나 목록에서 선택해 주세요
              </span>
              {loadedMemberName && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  기존 정보 불러오기 완료
                </span>
              )}
            </label>

            {/* Searchable Input with Instant Autocomplete Dropdown */}
            <div ref={dropdownRef} className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                    setShowDropdown(true);
                  }}
                  placeholder="성함 입력 (기존 등록 멤버는 선택 시 조·클럽·키워드가 자동 입력됩니다)"
                  className="w-full pl-10 pr-20 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-900 transition"
                />
                {name && (
                  <button
                    type="button"
                    onClick={() => {
                      setName('');
                      setLoadedMemberName(null);
                      setSelectedClubs([]);
                      setSelectedKeywords([]);
                      setShowDropdown(true);
                    }}
                    className="absolute right-3 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition"
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown of Existing Members */}
              {showDropdown && matchingMembers.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-40 divide-y divide-slate-100">
                  <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                    <span>
                      💡 기존에 등록된 산스 구성원 ({matchingMembers.length}명) — 클릭 시 기존 정보 자동 불러오기
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      닫기
                    </button>
                  </div>
                  {matchingMembers.map((m) => {
                    const isCurrent = loadedMemberName === m.name;
                    return (
                      <button
                        type="button"
                        key={m.name}
                        onClick={() => applyMemberData(m)}
                        className={`w-full px-4 py-2.5 text-left hover:bg-indigo-50/80 flex items-center justify-between gap-2 transition ${
                          isCurrent ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                              {m.team}
                            </span>
                            {m.keywords?.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                                키워드 {m.keywords.length}개
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            소속 클럽: {m.clubs.join(', ')}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                          불러오기
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Banner when existing member data is loaded */}
            {loadedMemberName && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="text-xs text-indigo-950">
                  <span className="font-extrabold text-indigo-700">
                    ✨ [{loadedMemberName}]님의 기존 정보를 불러왔습니다!
                  </span>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {selectedTeam} · {selectedClubs.join(', ')} · {selectedKeywords.join(' ')}
                  </div>
                </div>
                {onQuickViewMember && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickViewMember(loadedMemberName);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm transition"
                  >
                    <span>이 정보로 바로 관계도 보기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Quick-pick All Registered Member Chips */}
            <div className="pt-1 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400">
                👥 등록된 구성원 빠른 선택 (클릭 시 기존 정보 자동 입력):
              </div>
              <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto pr-1">
                {members.map((m) => {
                  const active = name.trim() === m.name;
                  return (
                    <button
                      type="button"
                      key={m.name}
                      onClick={() => applyMemberData(m)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm'
                          : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span
                        className={`text-[10px] ${
                          active ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {m.team}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==================== STEP 2: TEAM SELECTION (1조 ~ 20조) ==================== */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  2
                </span>
                소속 조를 선택해 주세요 (1조 ~ 20조)
              </span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                선택됨: {selectedTeam}
              </span>
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {SANS_TEAMS.map((t) => {
                const isSelected = selectedTeam === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setSelectedTeam(t)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==================== STEP 3: 16 SANS CLUBS SELECTION ==================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  3
                </span>
                소속 클럽을 선택해 주세요 (복수 선택 가능)
              </label>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {selectedClubs.length}개 클럽 선택됨
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SANS_CLUBS.map((club) => {
                const isSelected = selectedClubs.includes(club.name);
                return (
                  <button
                    type="button"
                    key={club.id}
                    onClick={() => toggleClub(club.name)}
                    className={`text-left p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: club.bgLight }}
                      >
                        <ClubIcon
                          name={club.icon}
                          className="w-4 h-4"
                          style={{ color: club.color }}
                        />
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-600 text-white">
                          내 클럽
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {club.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">
                        {club.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==================== STEP 4: SELECTABLE KEYWORDS POOL ==================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  4
                </span>
                나를 표현하는 공감 키워드를 골라주세요 (1~6개 선택)
              </label>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {selectedKeywords.length} / 6개 선택됨
              </span>
            </div>

            {/* Currently Selected Keywords Summary Pills */}
            {selectedKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-700 mr-1">
                  선택한 키워드:
                </span>
                {selectedKeywords.map((kw) => (
                  <button
                    type="button"
                    key={kw}
                    onClick={() => toggleKeyword(kw)}
                    className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>{kw}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 키워드 보기 (48)
              </button>
              {KEYWORD_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Keyword Chips by Category */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {visibleCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2"
                >
                  <div className="text-xs font-bold" style={{ color: cat.color }}>
                    {cat.title}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.keywords.map((kw) => {
                      const active = selectedKeywords.includes(kw);
                      return (
                        <button
                          type="button"
                          key={kw}
                          onClick={() => toggleKeyword(kw)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                            active
                              ? 'bg-indigo-600 text-white shadow-sm scale-[1.02]'
                              : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {kw}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-3 flex items-center justify-between gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              전체 그래프 먼저 보기
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting
                ? '연결 그래프 생성 중...'
                : loadedMemberName
                ? `${loadedMemberName}님 연결 그래프 열기 (저장 및 확인)`
                : '내 연결 그래프 확인하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
