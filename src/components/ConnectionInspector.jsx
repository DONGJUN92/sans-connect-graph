import React from 'react';
import { SANS_CLUBS } from '../data/sansData';
import ClubIcon from './ClubIcon';
import { Edit3, ArrowRight, Network, Volume2, X, Trash2 } from 'lucide-react';
import { buildMemberConnectionSummaryText, speakKorean } from '../utils/a11yVoice';

export default function ConnectionInspector({
  members,
  focus,
  onSelectFocus,
  onOpenEditMember,
  isOpen,
  onToggleOpen,
  isMobile = false,
  isAdmin = false,
  onDeleteMember = null
}) {
  const clubByName = new Map(SANS_CLUBS.map((c) => [c.name, c]));

  const asideClassName = isMobile
    ? 'fixed inset-x-0 bottom-0 z-40 max-h-[75vh] w-full bg-slate-900/98 backdrop-blur-2xl border-t-2 border-slate-700 rounded-t-3xl text-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300'
    : 'fixed top-16 right-3 bottom-3 z-30 w-[360px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-3xl text-white shadow-2xl flex flex-col overflow-hidden';

  // When collapsed, show a small floating button to re-open the detail card
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label="연결된 사람들 목록 열기"
        className={`fixed z-30 px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-extrabold shadow-xl flex items-center gap-2 transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
          isMobile ? 'bottom-20 right-3' : 'top-16 right-4'
        }`}
      >
        <Network className="w-4 h-4 text-amber-400" />
        <span>연결된 사람들 보기</span>
      </button>
    );
  }

  // 1. Inspector when a specific Member is selected
  if (focus.type === 'MEMBER') {
    const person = members.find((m) => m.name === focus.id);
    if (!person) return null;

    const clubMates = [];
    const teamMates = [];
    const keywordMates = [];
    const uniqueConnectedNames = new Set();

    members.forEach((other) => {
      if (other.name === person.name) return;
      const sharedClubs = other.clubs.filter((c) => person.clubs.includes(c));
      const sameTeam =
        person.allTeams || other.allTeams || (other.team && other.team === person.team);
      const sharedKeywords = other.keywords.filter((k) => person.keywords.includes(k));

      if (sharedClubs.length > 0) {
        clubMates.push({ other, sharedClubs });
        uniqueConnectedNames.add(other.name);
      }
      if (sameTeam) {
        teamMates.push(other);
        uniqueConnectedNames.add(other.name);
      }
      if (sharedKeywords.length > 0) {
        keywordMates.push({ other, sharedKeywords });
        uniqueConnectedNames.add(other.name);
      }
    });

    const speechText = buildMemberConnectionSummaryText(person, members);

    return (
      <aside
        aria-label={`${person.name}님의 연결 상세 정보`}
        className={asideClassName}
      >
        {isMobile && (
          <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto my-2 shrink-0" />
        )}
        {/* Person Header Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white mb-1">
                {person.isRepresentative ? '👑 산스 대표 (전체 조·클럽)' : `산스 ${person.team}`}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                ✨ {person.name}님의 연결
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                총 <strong className="text-amber-300 text-sm">{uniqueConnectedNames.size}명</strong>의 산스 식구와 연결
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenEditMember(person.name)}
                aria-label={`${person.name}님의 정보 수정하기`}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold flex items-center gap-1 transition"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                수정
              </button>
              <button
                onClick={onToggleOpen}
                aria-label="상세 목록 닫기"
                title="닫기"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => speakKorean(speechText, true)}
            aria-label={`${person.name}님의 연결 관계를 음성으로 듣기`}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Volume2 className="w-4 h-4 aria-hidden=true" />
            <span>🔊 음성으로 듣기</span>
          </button>

          {isAdmin && !person.isRepresentative && onDeleteMember && (
            <button
              type="button"
              onClick={() => onDeleteMember(person.name)}
              className="w-full py-2 px-3 rounded-xl bg-rose-600/25 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>운영자: [{person.name}] 님 정보 삭제</span>
            </button>
          )}

          <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-20 overflow-y-auto">
            {person.clubs.map((cName) => (
              <button
                key={cName}
                onClick={() => onSelectFocus({ type: 'CLUB', id: cName })}
                className="px-2.5 py-1 rounded-xl bg-white text-slate-950 text-xs font-extrabold shadow-sm hover:bg-blue-50 transition"
              >
                🏛️ {cName}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Breakdown */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <section className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-300">
              🏛️ 함께하는 클럽 ({clubMates.length}명)
            </h3>
            <div className="space-y-1.5">
              {clubMates.map(({ other, sharedClubs }) => (
                <button
                  key={other.name}
                  onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-blue-500 transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">
                      {other.isRepresentative && '👑 '}
                      {other.name}{' '}
                      <span className="text-xs font-semibold text-slate-400">
                        ({other.team})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sharedClubs.slice(0, 3).map((c) => {
                        const cObj = clubByName.get(c);
                        return (
                          <span
                            key={c}
                            style={{
                              backgroundColor: cObj?.bgLight || '#E0E7FF',
                              color: cObj?.color || '#3730A3'
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10.5px] font-extrabold"
                          >
                            {c}
                          </span>
                        );
                      })}
                      {sharedClubs.length > 3 && (
                        <span className="text-[10.5px] text-slate-400 font-bold">
                          외 {sharedClubs.length - 3}개
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-300">
              <h3>
                🚩 같은 {person.team} 식구 ({teamMates.length}명)
              </h3>
              {!person.allTeams && (
                <button
                  onClick={() => onSelectFocus({ type: 'TEAM', id: person.team })}
                  className="text-xs text-cyan-400 hover:underline font-bold"
                >
                  {person.team} 전체 보기 →
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teamMates.map((tm) => (
                <button
                  key={tm.name}
                  onClick={() => onSelectFocus({ type: 'MEMBER', id: tm.name })}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-indigo-200 text-xs font-extrabold transition"
                >
                  {tm.isRepresentative ? '👑 ' : '✨ '}
                  {tm.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-300">
              🤝 마음이 통한 분들 ({keywordMates.length}명)
            </h3>
            <div className="space-y-1.5">
              {keywordMates.map(({ other, sharedKeywords }) => (
                <button
                  key={other.name}
                  onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500 transition flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      {other.isRepresentative && '👑 '}
                      {other.name}{' '}
                      <span className="text-xs font-semibold text-slate-400">
                        ({other.team})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sharedKeywords.map((k) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10.5px] font-bold"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    );
  }

  // 2. Inspector when a specific Club is selected
  if (focus.type === 'CLUB') {
    const club = SANS_CLUBS.find((c) => c.name === focus.id) || SANS_CLUBS[0];
    const clubMembers = members.filter((m) => m.clubs.includes(club.name));

    return (
      <aside
        aria-label={`${club.name} 함께하는 분들 목록`}
        className={asideClassName}
      >
        {isMobile && (
          <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto my-2 shrink-0" />
        )}
        <div className="p-4 sm:p-5 bg-slate-800/95 border-b border-slate-700 space-y-2 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl shadow-sm flex items-center justify-center shrink-0"
                style={{ backgroundColor: club.bgLight }}
              >
                <ClubIcon name={club.icon} className="w-6 h-6" style={{ color: club.color }} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">{club.name}</h2>
                <p className="text-xs font-bold text-cyan-400">
                  활동 인원 {clubMembers.length}명
                </p>
              </div>
            </div>
            <button
              onClick={onToggleOpen}
              aria-label="목록 닫기"
              className="p-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{club.description}</p>
        </div>

        <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
          <h3 className="text-xs font-extrabold text-slate-300">
            👥 함께하는 분들 ({clubMembers.length}명)
          </h3>
          {clubMembers.map((m) => (
            <button
              key={m.name}
              onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
              className="w-full text-left p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-blue-500 transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white">
                  {m.isRepresentative ? '👑 ' : '✨ '}
                  {m.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-extrabold">
                  {m.team}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.keywords.slice(0, 3).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 text-[10.5px] font-semibold"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  // 3. Inspector when a specific Team (1조~20조) is selected
  if (focus.type === 'TEAM') {
    const teamMembers = members.filter((m) => m.team === focus.id || m.allTeams);
    return (
      <aside
        aria-label={`${focus.id} 함께하는 분들 목록`}
        className={asideClassName}
      >
        {isMobile && (
          <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto my-2 shrink-0" />
        )}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-2 shrink-0">
          <div>
            <span className="text-[11px] font-extrabold text-cyan-400 tracking-wider">
              산스 조별 연결
            </span>
            <h2 className="text-xl font-extrabold">{focus.id} 함께하는 분들</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              총 {teamMembers.length}명 활동 중
            </p>
          </div>
          <button
            onClick={onToggleOpen}
            aria-label="목록 닫기"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
          {teamMembers.map((m) => (
            <button
              key={m.name}
              onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
              className="w-full text-left p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-blue-500 transition space-y-1.5"
            >
              <div className="text-sm font-extrabold text-white">
                {m.isRepresentative ? '👑 ' : '✨ '}
                {m.name}
              </div>
              <div className="flex flex-wrap gap-1">
                {m.clubs.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-[11px] font-bold"
                  >
                    {c}
                  </span>
                ))}
                {m.clubs.length > 4 && (
                  <span className="text-[11px] text-slate-400 font-bold">
                    외 {m.clubs.length - 4}개
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  // 4. Overview Drawer (when manually opened in ALL or KEYWORD mode)
  return (
    <aside
      aria-label={`산스 ${SANS_CLUBS.length}개 클럽 둘러보기`}
      className={asideClassName}
    >
      {isMobile && (
        <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto my-2 shrink-0" />
      )}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Network className="w-4 h-4 text-amber-400" />
            산스 {SANS_CLUBS.length}개 클럽 둘러보기
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            클럽을 누르면 함께하는 분들이 보여요.
          </p>
        </div>
        <button
          onClick={onToggleOpen}
          aria-label="목록 닫기"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-2">
          {SANS_CLUBS.map((club) => {
            const cMembers = members.filter((m) => m.clubs.includes(club.name));
            return (
              <button
                key={club.id}
                onClick={() => onSelectFocus({ type: 'CLUB', id: club.name })}
                className="text-left p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-blue-500 transition flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: club.bgLight }}
                  >
                    <ClubIcon
                      name={club.icon}
                      className="w-4 h-4"
                      style={{ color: club.color }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-cyan-400">
                    {cMembers.length}명
                  </span>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white truncate">
                    {club.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {cMembers
                      .filter((m) => !m.isRepresentative)
                      .map((m) => m.name)
                      .join(', ')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
