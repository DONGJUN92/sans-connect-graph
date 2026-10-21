import React, { useState, useEffect } from 'react';
import { SANS_CLUBS, SANS_TEAMS, KEYWORD_CATEGORIES } from '../data/sansData';
import ClubIcon from './ClubIcon';
import { X, Check, Sparkles, UserCheck, Users, Hash } from 'lucide-react';

export default function JoinModal({ isOpen, onClose, members, onSubmitMember, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [selectedTeam, setSelectedTeam] = useState('5조');
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-populate if user types/picks an existing member's name
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = members.find((m) => m.name === trimmed);
    if (existing) {
      setSelectedTeam(existing.team || '5조');
      setSelectedClubs(existing.clubs || []);
      setSelectedKeywords(existing.keywords || []);
    }
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
      setErrorMsg('이름을 입력해 주세요.');
      return;
    }
    if (selectedClubs.length === 0) {
      setErrorMsg('활동 중이거나 관심 있는 클럽을 최소 1개 이상 선택해 주세요.');
      return;
    }
    if (selectedKeywords.length === 0) {
      setErrorMsg('나를 표현하는 공감 키워드를 최소 1개 이상 선택해 주세요.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                산스(SANS) 연결 그래프 참여하기
              </h2>
              <p className="text-xs text-indigo-100">
                이름과 소속 조·클럽·키워드를 선택하면 나와 연결된 산스 구성원들이 지식그래프로 펼쳐집니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 text-white/90 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Step 1: Name Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                1
              </span>
              성함을 입력해 주세요
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="예: 신동준"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold text-slate-900"
              />
            </div>
            {/* Quick-pick existing members */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-medium text-slate-400 mr-1">
                등록된 멤버 빠른 선택:
              </span>
              {members.slice(0, 10).map((m) => (
                <button
                  type="button"
                  key={m.name}
                  onClick={() => setName(m.name)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    name.trim() === m.name
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Team Selection (1조 ~ 20조) */}
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

          {/* Step 3: 16 SANS Clubs Selection (Multi-select) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  3
                </span>
                소속 클럽을 선택해 주세요 (복수 선택 가능)
              </label>
              <span className="text-xs font-semibold text-slate-500">
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
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-sm'
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

          {/* Step 4: Selectable Keywords Pool (Zero Typing) */}
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
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? '연결 반영 중...' : '내 연결 그래프 확인하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
