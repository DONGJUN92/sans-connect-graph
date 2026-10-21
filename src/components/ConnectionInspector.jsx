import React from 'react';
import { SANS_CLUBS } from '../data/sansData';
import ClubIcon from './ClubIcon';
import { Edit3, ArrowRight, Network, Volume2 } from 'lucide-react';
import { buildMemberConnectionSummaryText, speakKorean } from '../utils/a11yVoice';

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

    const speechText = buildMemberConnectionSummaryText(person, members);

    return (
      <aside
        aria-label={`${person.name}님의 연결 상세 목록`}
        className="bg-slate-900 border-l border-slate-800 text-white w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto"
      >
        {/* Person Header Card */}
        <div className="p-5 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border-b border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white mb-1.5">
                산스 {person.team}
              </span>
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                <span>✨ {person.name}님의 연결망</span>
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                총 <strong className="text-amber-300 text-sm">{uniqueConnectedNames.size}명</strong>의 산스 구성원과 연결되어 있어요
              </p>
            </div>
            <button
              onClick={() => onOpenEditMember(person.name)}
              aria-label={`${person.name}님의 소속 조, 클럽, 키워드 정보 수정하기`}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold flex items-center gap-1 transition shrink-0 focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              내 정보 수정
            </button>
          </div>

          {/* Voice Readout Button for Visually Impaired Members */}
          <button
            type="button"
            onClick={() => speakKorean(speechText, true)}
            aria-label={`${person.name}님과 연결된 구성원 목록을 음성으로 듣기`}
            className="w-full py-2.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition focus-visible:ring-4 focus-visible:ring-white"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>내 연결 관계 음성으로 듣기</span>
          </button>

          <div className="flex flex-wrap gap-1.5 pt-1" role="list" aria-label="활동 클럽 목록">
            {person.clubs.map((cName) => (
              <button
                key={cName}
                onClick={() => onSelectFocus({ type: 'CLUB', id: cName })}
                aria-label={`${cName} 중심 연결망 보기`}
                className="px-2.5 py-1 rounded-xl bg-white text-slate-950 text-xs font-extrabold shadow-sm hover:bg-blue-50 transition focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                🏛️ {cName}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5" role="list" aria-label="공감 키워드 목록">
            {person.keywords.map((kw) => (
              <button
                key={kw}
                onClick={() => onSelectFocus({ type: 'KEYWORD', id: kw })}
                aria-label={`${kw.replace('#', '')} 키워드 연결망 보기`}
                className="px-2.5 py-1 rounded-full bg-slate-950/60 hover:bg-slate-950 text-cyan-300 border border-cyan-400/30 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown of Connected Colleagues */}
        <div className="p-4 space-y-5 flex-1">
          {/* 1. Same Club Colleagues */}
          <section aria-labelledby="same-club-heading" className="space-y-2.5">
            <h3 id="same-club-heading" className="text-xs font-extrabold text-slate-300">
              🏛️ 같은 클럽으로 연결된 동료 ({clubMates.length}명)
            </h3>
            {clubMates.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">아직 같은 클럽에 등록된 동료가 없습니다.</p>
            ) : (
              <div className="space-y-2" role="list">
                {clubMates.map(({ other, sharedClubs }) => (
                  <button
                    key={other.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                    aria-label={`${other.name}님, ${other.team}, 같은 클럽 ${sharedClubs.join(
                      ', '
                    )}으로 연결됨. 누르면 ${other.name}님의 연결망으로 이동합니다.`}
                    className="w-full text-left p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-blue-500 hover:bg-slate-800 transition flex items-center justify-between gap-2 focus-visible:ring-4 focus-visible:ring-amber-400"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        {other.name}{' '}
                        <span className="text-xs font-semibold text-slate-400">
                          ({other.team})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sharedClubs.map((c) => {
                          const cObj = clubByName.get(c);
                          return (
                            <span
                              key={c}
                              style={{
                                backgroundColor: cObj?.bgLight || '#E0E7FF',
                                color: cObj?.color || '#3730A3'
                              }}
                              className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold"
                            >
                              {c}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 2. Same Team (조) Colleagues */}
          <section aria-labelledby="same-team-heading" className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-300">
              <h3 id="same-team-heading">
                🚩 같은 조({person.team}) 동료 ({teamMates.length}명)
              </h3>
              <button
                onClick={() => onSelectFocus({ type: 'TEAM', id: person.team })}
                className="text-xs text-cyan-400 hover:underline font-bold"
              >
                {person.team} 연결망 보기 →
              </button>
            </div>
            {teamMates.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">
                같은 {person.team}에 등록된 다른 동료가 아직 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" role="list">
                {teamMates.map((tm) => (
                  <button
                    key={tm.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: tm.name })}
                    aria-label={`같은 ${person.team} 동료 ${tm.name}님 연결망 보기`}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-indigo-200 text-xs font-extrabold transition focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    ✨ {tm.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 3. Shared Keyword Colleagues */}
          <section aria-labelledby="same-kw-heading" className="space-y-2">
            <h3 id="same-kw-heading" className="text-xs font-extrabold text-slate-300">
              🤝 같은 키워드로 공감한 동료 ({keywordMates.length}명)
            </h3>
            {keywordMates.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">아직 겹치는 키워드 동료가 없습니다.</p>
            ) : (
              <div className="space-y-2" role="list">
                {keywordMates.map(({ other, sharedKeywords }) => (
                  <button
                    key={other.name}
                    onClick={() => onSelectFocus({ type: 'MEMBER', id: other.name })}
                    aria-label={`${other.name}님, ${other.team}, 공감 키워드 ${sharedKeywords
                      .map((k) => k.replace('#', ''))
                      .join(', ')}으로 연결됨`}
                    className="w-full text-left p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-emerald-500 hover:bg-slate-800 transition flex items-center justify-between gap-2 focus-visible:ring-4 focus-visible:ring-amber-400"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        {other.name}{' '}
                        <span className="text-xs font-semibold text-slate-400">
                          ({other.team})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sharedKeywords.map((k) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
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
        aria-label={`${club.name} 연결 상세 목록`}
        className="bg-slate-900 border-l border-slate-800 text-white w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto"
      >
        <div className="p-5 bg-slate-800/90 border-b border-slate-700 space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl shadow-sm flex items-center justify-center"
              style={{ backgroundColor: club.bgLight }}
              aria-hidden="true"
            >
              <ClubIcon name={club.icon} className="w-6 h-6" style={{ color: club.color }} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{club.name}</h2>
              <p className="text-xs font-bold text-cyan-400">
                활동 구성원 {clubMembers.length}명
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{club.description}</p>
        </div>

        <div className="p-4 space-y-3 flex-1">
          <h3 className="text-xs font-extrabold text-slate-300">
            👥 클럽 소속 구성원 ({clubMembers.length}명) — 누르면 개인 연결망으로 이동
          </h3>
          <div className="space-y-2" role="list">
            {clubMembers.map((m) => (
              <button
                key={m.name}
                onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
                aria-label={`${m.name}님, ${m.team}, 소속 클럽 ${m.clubs.join(', ')}`}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition space-y-2 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">✨ {m.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-extrabold">
                    {m.team}
                  </span>
                </div>
                {m.clubs.length > 1 && (
                  <div className="text-xs text-slate-400">
                    함께하는 클럽: {m.clubs.filter((c) => c !== club.name).join(', ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {m.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 text-[11px] font-semibold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  // 3. Inspector when a specific Team (1조~20조) is selected
  if (focus.type === 'TEAM') {
    const teamMembers = members.filter((m) => m.team === focus.id);
    return (
      <aside
        aria-label={`산스 ${focus.id} 연결 상세 목록`}
        className="bg-slate-900 border-l border-slate-800 text-white w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto"
      >
        <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 border-b border-slate-800 space-y-1.5">
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider">
            SANS TEAM NETWORK
          </span>
          <h2 className="text-xl font-extrabold">산스 {focus.id} 연결망</h2>
          <p className="text-xs text-slate-300">
            소속 멤버 {teamMembers.length}명이 다양한 클럽으로 이어져 있습니다.
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
                className="w-full text-left p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 transition space-y-2 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <div className="text-sm font-extrabold text-white">✨ {m.name}</div>
                <div className="flex flex-wrap gap-1">
                  {m.clubs.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 text-[11px] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    );
  }

  // 4. Default Overview Sidebar when in ALL mode
  return (
    <aside
      aria-label="산스 16개 클럽 연결 탐색"
      className="bg-slate-900 border-l border-slate-800 text-white w-full lg:w-80 xl:w-96 shrink-0 flex flex-col h-full overflow-y-auto"
    >
      <div className="p-4 border-b border-slate-800 space-y-1">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
          <Network className="w-4 h-4 text-amber-400" aria-hidden="true" />
          산스 16개 클럽 연결 탐색
        </h2>
        <p className="text-xs text-slate-400">
          원하는 클럽이나 이름을 누르면 해당 노드를 중심으로 연결망이 재구성됩니다.
        </p>
      </div>

      <div className="p-3.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2" role="list">
          {SANS_CLUBS.map((club) => {
            const cMembers = members.filter((m) => m.clubs.includes(club.name));
            return (
              <button
                key={club.id}
                onClick={() => onSelectFocus({ type: 'CLUB', id: club.name })}
                aria-label={`${club.name}, 활동 구성원 ${cMembers.length}명 (${cMembers
                  .map((m) => m.name)
                  .join(', ')}). 누르면 ${club.name} 중심 연결망을 봅니다.`}
                className="text-left p-3 rounded-2xl bg-slate-800/75 border border-slate-700/80 hover:border-blue-500 hover:bg-slate-800 transition flex flex-col justify-between gap-2 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: club.bgLight }}
                    aria-hidden="true"
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
                    {cMembers.map((m) => m.name).join(', ')}
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
