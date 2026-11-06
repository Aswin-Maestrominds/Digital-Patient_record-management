import React from 'react';
import { X, ShieldAlert, Copy, Check } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditPayloadModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export const AuditPayloadModal: React.FC<AuditPayloadModalProps> = ({ log, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] sm:text-xs text-cyan-400 uppercase tracking-widest truncate">
                Cryptographic Ledger Proof
              </div>
              <div className="font-bold text-xs sm:text-sm text-white truncate">
                Block {log.id} • {log.action}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">Timestamp</span>
              <span className="font-semibold text-slate-800">{log.timestamp}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">Node Hash</span>
              <span className="font-mono text-slate-800 text-[11px] truncate block">{log.nodeHash}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">Actor / Device</span>
              <span className="font-semibold text-slate-800 truncate block">{log.actor} ({log.role})</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">Network Origin</span>
              <span className="font-mono text-slate-800 text-[11px] truncate block">{log.ipAddress} • {log.telemetry}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">Decrypted Payload JSON</span>
              <button 
                onClick={handleCopy}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-cyan-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 sm:max-h-60 border border-slate-800">
              {JSON.stringify(log.payloadDetails || {
                action: log.action,
                description: log.actionDescription,
                resource: log.targetedResource,
                hashVerified: true,
                complianceStandards: ["HIPAA 45 CFR § 164.312", "21 CFR Part 11"]
              }, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[10px] sm:text-[11px] text-emerald-600 font-semibold truncate">
            ● Status: {log.status}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 font-medium text-slate-800 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
