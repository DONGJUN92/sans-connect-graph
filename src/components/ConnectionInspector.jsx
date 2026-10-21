import React from 'react';
import { SANS_CLUBS } from '../data/sansData';
import ClubIcon from './ClubIcon';
import { Users, Hash, Flag, Sparkles, Edit3, ArrowRight } from 'lucide-react';

export default function ConnectionInspector({
  members,
  focus,
  onSelectFocus,
  onOpenEditMember
}) {
  const clubByName = new Map(SANS_CLUBS.map((c) => [c.name, c]));

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
      const sameTeam = other.team && other.team === person.team;
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

    return (
      <div className="bg-white border-l border-slate-200 w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto">
        {/* Person Header Card */}
        <div className="p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white mb-1.5">
                산스 {person.team}
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">{person.name}님</h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                총 <strong className="text-amber-300">{uniqueConnectedNames.size}명</strong>의 산스 구성원과 연결되어 있습니다
              </p>
            </div>
            <button
              onClick={() => onOpenEditMember(person.name)}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              프로필 수정
            </button>
          </div>

          {/* Clubs & Keywords Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {person.clubs.map((cName) => (
              <button
                key={cName}
                onClick={() => onSelectFocus({ type: 'CLUB', id: cName })}
                className="px-2.5 py-1 rounded-lg bg-white text-indigo-950 text-xs font-bold shadow-sm hover:bg-indigo-50 transition"
              >
                🏛️ {cName}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {person.keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => onSelectFocus({ type: 'KEYWORD', id: kw })}
                className="px-2 py-0.5 rounded-full bg-indigo-900/50 hover:bg-indigo-900/80 text-indigo-100 text-[11px] font-medium transition"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown of Connections */}
        <div className="p-4 space-y-5 flex-1">
          {/* 1. Same Club Colleagues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
              <span>🏛️ 같은 클럽으로 연결된 동료 ({clubMates.length}명)</span>
            </div>
            {clubMates.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">아직 같은 클럽에 등록된 동료가 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {clubMates.map(({ other, sharedClubs }) => (
                  <button
                    key={other.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {other.name}{' '}
                        <span className="text-[11px] font-medium text-slate-500">
                          ({other.team})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sharedClubs.map((c) => {
                          const cObj = clubByName.get(c);
                          return (
                            <span
                              key={c}
                              style={{
                                backgroundColor: cObj?.bgLight || '#EEF2FF',
                                color: cObj?.color || '#4F46E5'
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              {c}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Same Team (조) Colleagues */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
              <span>
                🚩 같은 조({person.team}) 동료 ({teamMates.length}명)
              </span>
              <button
                onClick={() => onSelectFocus({ type: 'TEAM', id: person.team })}
                className="text-[11px] text-indigo-600 hover:underline font-semibold"
              >
                {person.team} 전체 보기
              </button>
            </div>
            {teamMates.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">
                같은 {person.team}에 등록된 다른 동료가 아직 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teamMates.map((tm) => (
                  <button
                    key={tm.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: tm.name })}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition"
                  >
                    {tm.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Shared Keyword Colleagues */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-800">
              🤝 같은 키워드로 공감한 동료 ({keywordMates.length}명)
            </div>
            {keywordMates.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">아직 겹치는 키워드 동료가 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {keywordMates.map(({ other, sharedKeywords }) => (
                  <button
                    key={other.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 hover:border-emerald-400 hover:bg-emerald-50/30 transition flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {other.name}{' '}
                        <span className="text-[11px] font-medium text-slate-500">
                          ({other.team})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sharedKeywords.map((k) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Inspector when a specific Club is selected
  if (focus.type === 'CLUB') {
    const club = SANS_CLUBS.find((c) => c.name === focus.id) || SANS_CLUBS[0];
    const clubMembers = members.filter((m) => m.clubs.includes(club.name));

    return (
      <div className="bg-white border-l border-slate-200 w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto">
        <div
          className="p-5 border-b border-slate-200 space-y-2.5"
          style={{ backgroundColor: club.bgLight }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <ClubIcon name={club.icon} className="w-6 h-6" style={{ color: club.color }} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{club.name}</h3>
              <p className="text-xs font-semibold" style={{ color: club.color }}>
                활동 구성원 {clubMembers.length}명
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{club.description}</p>
        </div>

        <div className="p-4 space-y-4 flex-1">
          <div className="text-xs font-extrabold text-slate-800">
            👥 클럽 소속 구성원 ({clubMembers.length}명) — 클릭 시 개인 관계도
          </div>
          <div className="space-y-2">
            {clubMembers.map((m) => (
              <button
                key={m.name}
                onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{m.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                    {m.team}
                  </span>
                </div>
                {m.clubs.length > 1 && (
                  <div className="text-[11px] text-slate-500">
                    함께하는 클럽: {m.clubs.filter((c) => c !== club.name).join(', ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {m.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. Inspector when a specific Team (1조~20조) is selected
  if (focus.type === 'TEAM') {
    const teamMembers = members.filter((m) => m.team === focus.id);
    return (
      <div className="bg-white border-l border-slate-200 w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto">
        <div className="p-5 bg-indigo-900 text-white space-y-1.5">
          <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
            SANS TEAM NETWORK
          </span>
          <h3 className="text-xl font-extrabold">산스 {focus.id}</h3>
          <p className="text-xs text-indigo-200">
            소속 멤버 {teamMembers.length}명이 다양한 클럽으로 뻗어 나가고 있습니다.
          </p>
        </div>

        <div className="p-4 space-y-2.5 flex-1">
          {teamMembers.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              아직 {focus.id}에 등록된 구성원이 없습니다. 상단 [내 연결 등록]에서 참여해 보세요!
            </p>
          ) : (
            teamMembers.map((m) => (
              <button
                key={m.name}
                onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition space-y-1.5"
              >
                <div className="text-sm font-bold text-slate-900">{m.name}</div>
                <div className="flex flex-wrap gap-1">
                  {m.clubs.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10.5px] font-bold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // 4. Default Overview Sidebar when in ALL mode (or Keyword mode)
  return (
    <div className="bg-white border-l border-slate-200 w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-200 space-y-1">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          산스 16개 클럽 & 구성원 탐색
        </h3>
        <p className="text-xs text-slate-500">
          클럽이나 이름을 클릭하면 해당 노드를 중심으로 지식그래프가 재구성됩니다.
        </p>
      </div>

      {/* 16 Clubs Quick Grid matching user screenshot */}
      <div className="p-3.5 space-y-2.5">
        <div className="text-xs font-bold text-slate-700 px-1">
          🏛️ 산스 16개 클럽 (클릭 시 클럽 지식그래프)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SANS_CLUBS.map((club) => {
            const cMembers = members.filter((m) => m.clubs.includes(club.name));
            return (
              <button
                key={club.id}
                onClick={() => onSelectFocus({ type: 'CLUB', id: club.name })}
                className="text-left p-2.5 rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-sm transition bg-white flex flex-col justify-between gap-1.5"
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
                  <span className="text-[11px] font-bold text-slate-500">
                    {cMembers.length}명
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {club.name}
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                    {cMembers.map((m) => m.name).join(', ')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
