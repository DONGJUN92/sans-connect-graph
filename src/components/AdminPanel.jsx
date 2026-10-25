import React, { useState, useMemo } from 'react';
import { Shield, Trash2, Search, X, LogOut, AlertTriangle, RefreshCw, CheckCircle2, User } from 'lucide-react';

export default function AdminPanel({
  isOpen,
  onClose,
  members,
  onDeleteMember,
  onLogout
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.team && m.team.toLowerCase().includes(q)) ||
        m.clubs.some((c) => c.toLowerCase().includes(q)) ||
        m.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [members, searchTerm]);

  if (!isOpen) return null;

  const handleDeleteClick = (member) => {
    if (member.name === '이동훈 대표님') {
      alert('중앙 허브인 이동훈 대표님 정보는 삭제할 수 없습니다.');
      return;
    }
    setConfirmDeleteTarget(member);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    const targetName = confirmDeleteTarget.name;
    setConfirmDeleteTarget(null);
    await onDeleteMember(targetName);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="admin-panel-heading" className="text-base sm:text-lg font-black text-white">
                  운영자 관리 센터
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/40">
                  {members.length}명 등록됨
                </span>
              </div>
              <p className="text-xs text-slate-400">
                불필요한 참가자 또는 테스트 입력 데이터를 삭제할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition"
              title="운영자 로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="관리 창 닫기"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="참가자 이름, 조(예: 5조), 클럽으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Member List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              검색 조건과 일치하는 참가자가 없습니다.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const isProtected = m.name === '이동훈 대표님';
              return (
                <div
                  key={m.name}
                  className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base text-white">{m.name}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                        {m.team || '5조'}
                      </span>
                      {isProtected && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/40">
                          👑 대표님 (삭제 불가)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 text-xs text-slate-400">
                      <span>클럽:</span>
                      {m.clubs.length > 0 ? (
                        <span className="text-slate-300 font-medium">
                          {m.clubs.slice(0, 3).join(', ')}
                          {m.clubs.length > 3 ? ` 외 ${m.clubs.length - 3}개` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500">소속 클럽 없음</span>
                      )}
                    </div>

                    {m.keywords && m.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {m.keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[11px] font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isProtected && (
                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(m)}
                        className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-black flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            총 <strong className="text-white">{members.length}명</strong>의 참가자가 등록되어 있습니다.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Delete Confirmation Alert Modal */}
      {confirmDeleteTarget && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 p-4"
        >
          <div className="bg-slate-900 border-2 border-rose-500/60 w-full max-w-sm rounded-3xl p-5 text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">참가자 삭제 확인</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-rose-300 font-extrabold">[{confirmDeleteTarget.team}] {confirmDeleteTarget.name}</strong>님의 연결 정보를 삭제하시겠습니까?
              <br />
              <span className="text-xs text-slate-400">삭제 즉시 지식그래프와 모든 연결 목록에서 제거됩니다.</span>
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-1.5 transition shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>삭제 확인</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
