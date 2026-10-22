import React, { useState } from 'react';
import { Shield, Lock, User, Key, X, Check, AlertCircle } from 'lucide-react';

export default function AdminLoginModal({ isOpen, onClose, onLogin }) {
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = onLogin(adminId.trim(), adminPw.trim());
    if (!res.success) {
      setErrorMsg(res.error || '아이디(test) 또는 비밀번호(test)가 올바르지 않습니다.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-6 text-white space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-black shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 id="admin-login-heading" className="text-xl font-black text-white">
              운영자 로그인
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              불필요한 참가자 정보를 정리·삭제할 수 있습니다.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>운영자 아이디</span>
            </label>
            <input
              type="text"
              autoFocus
              value={adminId}
              onChange={(e) => {
                setAdminId(e.target.value);
                setErrorMsg('');
              }}
              placeholder="운영자 아이디를 입력하세요"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>비밀번호</span>
            </label>
            <input
              type="password"
              value={adminPw}
              onChange={(e) => {
                setAdminPw(e.target.value);
                setErrorMsg('');
              }}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-black flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-400/20"
            >
              <Check className="w-4 h-4" />
              <span>로그인</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
