import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Smartphone, Users, Copy, Check } from 'lucide-react';

export default function QrModal({ isOpen, onClose, memberCount }) {
  const defaultUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?join=1`
      : 'https://sans-connect-graph.vercel.app/?join=1';

  const [customUrl, setCustomUrl] = useState(defaultUrl);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 text-center space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
          <Smartphone className="w-4 h-4" />
          스마트폰 실시간 연동
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900">
            QR로 산스 연결 그래프에 참여하세요
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            카메라로 스캔 후 이름·조·클럽·키워드를 선택하면
            <br />
            스크린과 모든 스마트폰에 실시간으로 연결선이 이어집니다.
          </p>
        </div>

        {/* Crisp Vector QR Code */}
        <div className="mx-auto w-60 h-60 p-4 rounded-3xl bg-white border-2 border-indigo-100 shadow-inner flex items-center justify-center">
          <QRCodeSVG
            value={customUrl}
            size={212}
            bgColor="#FFFFFF"
            fgColor="#1E1B4B"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Live Participation Counter */}
        <div className="py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 text-sm font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <Users className="w-4 h-4 text-indigo-600" />
          현재 연결된 산스 구성원: <span className="text-indigo-600">{memberCount}명</span>
        </div>

        {/* URL Copy & Edit */}
        <div className="space-y-1.5 text-left">
          <label className="text-[11px] font-semibold text-slate-400">
            접속 주소 (클릭하여 복사)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 bg-slate-50 outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
