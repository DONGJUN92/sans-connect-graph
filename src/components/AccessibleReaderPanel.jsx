import React, { useState } from 'react';
import { SANS_CLUBS, SANS_TEAMS } from '../data/sansData';
import {
  Volume2,
  VolumeX,
  Mic,
  UserPlus,
  Users,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Eye
} from 'lucide-react';
import {
  speakKorean,
  stopSpeaking,
  startVoiceRecognition,
  parseSpokenMember,
  parseSpokenTeam,
  parseSpokenClubs
} from '../utils/a11yVoice';

export default function AccessibleReaderPanel({
  members,
  focus,
  onSelectFocus,
  onOpenJoinModal,
  summaryText,
  onSwitchToVisualGraph
}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('connections'); // 'connections' | 'members' | 'clubs' | 'teams'

  const handleVoiceSearchCommand = () => {
    setVoiceFeedback('찾으실 분의 이름이나 클럽, 조를 말씀해 주세요 (예: 신동준, 멘토링 클럽, 5조)');
    startVoiceRecognition({
      promptText: '삐 소리 후 찾으실 이름이나 클럽, 조를 말씀해 주세요.',
      onStateChange: setIsListening,
      onResult: (spoken) => {
        // 1. Check member match
        const { existing } = parseSpokenMember(spoken, members);
        if (existing) {
          setVoiceFeedback(`"${existing.name}"님의 연결로 이동합니다.`);
          onSelectFocus({ type: 'MEMBER', id: existing.name });
          return;
        }
        // 2. Check club match
        const clubs = parseSpokenClubs(spoken, SANS_CLUBS);
        if (clubs.length > 0) {
          setVoiceFeedback(`"${clubs[0]}" 연결로 이동합니다.`);
          onSelectFocus({ type: 'CLUB', id: clubs[0] });
          return;
        }
        // 3. Check team match
        const team = parseSpokenTeam(spoken);
        if (team) {
          setVoiceFeedback(`"${team}" 연결로 이동합니다.`);
          onSelectFocus({ type: 'TEAM', id: team });
          return;
        }

        const msg = `"${spoken}"을 찾지 못했습니다. 다시 말씀해 주시거나 아래 큰 버튼 목록에서 골라주세요.`;
        setVoiceFeedback(msg);
        speakKorean(msg, true);
      },
      onError: (msg) => setVoiceFeedback(msg)
    });
  };

  // Compute connected people when a specific member is selected
  const currentMember =
    focus.type === 'MEMBER' ? members.find((m) => m.name === focus.id) : null;

  const connectedPeople = [];
  if (currentMember) {
    members.forEach((other) => {
      if (other.name === currentMember.name) return;
      const sharedClubs = other.clubs.filter((c) => currentMember.clubs.includes(c));
      const sameTeam =
        currentMember.allTeams ||
        other.allTeams ||
        (other.team && other.team === currentMember.team);
      const sharedKeywords = other.keywords.filter((k) =>
        currentMember.keywords.includes(k)
      );

      if (sharedClubs.length > 0 || sameTeam || sharedKeywords.length > 0) {
        const reasons = [];
        if (sharedClubs.length > 0) reasons.push(`같은 클럽(${sharedClubs.join(', ')})`);
        if (sameTeam && !currentMember.allTeams && !other.allTeams)
          reasons.push(`같은 ${currentMember.team}`);
        if (other.isRepresentative) reasons.push('산스 대표님 (전체 조·클럽)');
        if (sharedKeywords.length > 0)
          reasons.push(`공통 키워드(${sharedKeywords.map((k) => k.replace('#', '')).join(', ')})`);

        connectedPeople.push({
          member: other,
          reasonText: reasons.join(' · ')
        });
      }
    });
  } else if (focus.type === 'CLUB') {
    members
      .filter((m) => m.clubs.includes(focus.id))
      .forEach((m) => {
        connectedPeople.push({
          member: m,
          reasonText: `${m.team} · ${m.clubs.join(', ')}`
        });
      });
  } else if (focus.type === 'TEAM') {
    members
      .filter((m) => m.team === focus.id || m.allTeams)
      .forEach((m) => {
        connectedPeople.push({
          member: m,
          reasonText: `${m.team} · ${m.clubs.slice(0, 3).join(', ')}`
        });
      });
  } else if (focus.type === 'KEYWORD') {
    members
      .filter((m) => m.keywords.includes(focus.id))
      .forEach((m) => {
        connectedPeople.push({
          member: m,
          reasonText: `${m.team} · ${m.clubs.slice(0, 2).join(', ')}`
        });
      });
  }

  return (
    <div
      role="region"
      aria-label="시각장애인 전용 음성 및 큰버튼 연결 화면"
      className="fixed inset-x-0 top-14 bottom-0 z-30 bg-slate-950 text-white overflow-y-auto px-4 py-5 sm:px-8"
    >
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Top Banner & Visual Graph Switch */}
        <div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-400 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-7 h-7 text-amber-400 shrink-0" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-black text-amber-300">
                시각장애인 전용 큰버튼 · 음성 화면
              </h1>
            </div>

            <button
              type="button"
              onClick={onSwitchToVisualGraph}
              aria-label="시각 그래프 화면으로 전환하기"
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-extrabold flex items-center gap-2 focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <Eye className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span>그래프 화면으로 보기</span>
            </button>
          </div>

          {/* Primary Giant Action Buttons (Speak / Voice Search / My Info) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleVoiceSearchCommand}
              aria-label="말로 사람이나 클럽, 조 찾기. 누른 뒤 삐 소리가 나면 이름을 말씀해 주세요."
              className={`min-h-[72px] p-4 rounded-2xl border-2 text-lg font-black flex items-center justify-center gap-3 transition focus-visible:ring-4 focus-visible:ring-white ${
                isListening
                  ? 'bg-rose-600 border-white text-white animate-pulse'
                  : 'bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950'
              }`}
            >
              <Mic className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>
                {isListening
                  ? '🎙️ 듣고 있어요... 말씀해 주세요!'
                  : '🎙️ 말로 사람 · 클럽 · 조 찾기'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenJoinModal(currentMember?.name || '')}
              aria-label="내 이름 찾기 또는 내 연결 정보 새로 입력하기"
              className="min-h-[72px] p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white text-lg font-black flex items-center justify-center gap-3 transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <UserPlus className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>내 이름 찾기 · 정보 입력</span>
            </button>
          </div>

          {voiceFeedback && (
            <div
              role="status"
              aria-live="assertive"
              className="p-3.5 rounded-2xl bg-slate-950 border border-amber-400/60 text-amber-300 text-base font-extrabold text-center"
            >
              {voiceFeedback}
            </div>
          )}
        </div>

        {/* Current Connection Summary Box with Giant Read-Aloud & Stop Buttons */}
        <div
          role="region"
          aria-label="현재 선택된 연결 요약"
          className="p-5 rounded-3xl bg-slate-900 border-2 border-slate-700 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {focus.type === 'ALL' && '👑 산스 전체 연결 요약 (총 ' + members.length + '명)'}
              {focus.type === 'MEMBER' && `✨ ${focus.id}님과 연결된 분들 (${connectedPeople.length}명)`}
              {focus.type === 'CLUB' && `🏛️ ${focus.id} 함께하는 분들 (${connectedPeople.length}명)`}
              {focus.type === 'TEAM' && `🚩 ${focus.id} 함께하는 분들 (${connectedPeople.length}명)`}
              {focus.type === 'KEYWORD' && `🏷️ ${focus.id} 마음이 통하는 분들 (${connectedPeople.length}명)`}
            </h2>

            {focus.type !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectFocus({ type: 'ALL', id: null })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-sm font-extrabold flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>전체 보기로 돌아가기</span>
              </button>
            )}
          </div>

          <p className="text-base sm:text-lg text-slate-100 font-bold leading-relaxed bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
            {summaryText}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => speakKorean(summaryText, true)}
              className="min-h-[64px] py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-lg font-black flex items-center justify-center gap-2.5 focus-visible:ring-4 focus-visible:ring-white"
            >
              <Volume2 className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>🔊 현재 연결 설명 다시 듣기</span>
            </button>

            <button
              type="button"
              onClick={() => stopSpeaking()}
              className="min-h-[64px] py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white text-lg font-black flex items-center justify-center gap-2.5 focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              <VolumeX className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>⏹️ 음성 멈추기</span>
            </button>
          </div>
        </div>

        {/* Category Switcher Tabs (Big High-Contrast Buttons) */}
        <div
          role="tablist"
          aria-label="연결 목록 분류 선택"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          {[
            {
              id: 'connections',
              label:
                focus.type === 'ALL'
                  ? `전체 구성원 (${members.length}명)`
                  : `연결된 분들 (${connectedPeople.length}명)`
            },
            { id: 'members', label: `전체 명단 (${members.length}명)` },
            { id: 'clubs', label: '16개 클럽 보기' },
            { id: 'teams', label: '1조~20조 보기' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                speakKorean(`${tab.label} 목록을 표시합니다.`, true);
              }}
              className={`min-h-[58px] px-4 py-3 rounded-2xl text-base font-black border-2 transition focus-visible:ring-4 focus-visible:ring-amber-400 ${
                activeTab === tab.id
                  ? 'bg-amber-400 border-white text-slate-950'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1-Column Giant Button List for Easy Screen-Reader Swiping */}
        {activeTab === 'connections' && (
          <div className="space-y-3" role="list" aria-label="연결된 산스 구성원 목록">
            {(focus.type === 'ALL'
              ? members.map((m) => ({
                  member: m,
                  reasonText: `${m.team} · ${m.clubs.slice(0, 3).join(', ')}${
                    m.clubs.length > 3 ? ` 외 ${m.clubs.length - 3}개` : ''
                  }`
                }))
              : connectedPeople
            ).map(({ member: m, reasonText }, idx) => (
              <button
                key={m.name}
                type="button"
                onClick={() => onSelectFocus({ type: 'MEMBER', id: m.name })}
                aria-label={`${idx + 1}번, ${m.name}, ${reasonText}. 누르면 ${m.name}님의 연결을 음성으로 안내합니다.`}
                className="w-full min-h-[76px] p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-left flex items-center justify-between gap-4 transition focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <div className="space-y-1">
                  <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">{idx + 1}.</span>
                    <span>{m.name}</span>
                    <span className="text-sm font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-800 text-cyan-300">
                      {m.team}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-300">
                    {reasonText}
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 text-sm font-black shrink-0 flex items-center gap-1">
                  <span>연결 듣기</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3" role="list" aria-label="전체 산스 구성원 목록">
            {members.map((m, idx) => (
              <button
                key={m.name}
                type="button"
                onClick={() => {
                  onSelectFocus({ type: 'MEMBER', id: m.name });
                  setActiveTab('connections');
                }}
                aria-label={`${idx + 1}번 ${m.name}, ${m.team}, 소속 클럽 ${m.clubs.join(', ')}. 누르면 연결을 듣습니다.`}
                className="w-full min-h-[72px] p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-left flex items-center justify-between gap-4 transition focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                <div>
                  <div className="text-lg sm:text-xl font-black text-white">
                    {m.name} <span className="text-cyan-300 text-base">({m.team})</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-300 mt-0.5">
                    클럽: {m.clubs.slice(0, 4).join(', ')}
                    {m.clubs.length > 4 ? ` 외 ${m.clubs.length - 4}개` : ''}
                  </div>
                </div>
                <span className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-black shrink-0">
                  선택
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'clubs' && (
          <div className="space-y-3" role="list" aria-label="산스 16개 클럽 목록">
            {SANS_CLUBS.map((club) => {
              const count = members.filter((m) => m.clubs.includes(club.name)).length;
              return (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => {
                    onSelectFocus({ type: 'CLUB', id: club.name });
                    setActiveTab('connections');
                  }}
                  aria-label={`${club.name}, 현재 ${count}명 활동 중. ${club.description}. 누르면 클럽 구성원을 듣습니다.`}
                  className="w-full min-h-[72px] p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-left flex items-center justify-between gap-4 transition focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="text-lg sm:text-xl font-black text-white">
                      {club.name}{' '}
                      <span className="text-amber-300 text-base">({count}명)</span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-slate-300 mt-0.5">
                      {club.description}
                    </div>
                  </div>
                  <span className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-sm font-black shrink-0">
                    클럽 듣기
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list" aria-label="산스 1조부터 20조 목록">
            {SANS_TEAMS.map((t) => {
              const count = members.filter((m) => m.team === t || m.allTeams).length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onSelectFocus({ type: 'TEAM', id: t });
                    setActiveTab('connections');
                  }}
                  aria-label={`산스 ${t}, ${count}명 소속. 누르면 ${t} 구성원을 듣습니다.`}
                  className="min-h-[68px] p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-center flex flex-col items-center justify-center gap-1 transition focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <span className="text-xl font-black text-white">{t}</span>
                  <span className="text-xs font-extrabold text-cyan-300">{count}명</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
