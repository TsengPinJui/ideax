import React from 'react';
import { X, Shield, Users } from 'lucide-react';
import { AdminUserManagementTab } from '../AdminUserManagementTab';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCertifications?: (userId?: string) => void;
  onOpenChat?: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCertifications,
  onOpenChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-6xl w-full max-h-[92vh] flex flex-col bg-stone-50 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative my-6">
        {/* 頂部 Modal 標題列 */}
        <div className="p-4 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-stone-900">
                  帳號身份賦權與角色管理
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                  ADMIN 核心治理
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                指派總管理員角色、審查平台用戶帳號狀態、管理封鎖/註銷與身分賦權。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition-colors"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 內容主體 */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <AdminUserManagementTab
            onNavigateToCertifications={(userId) => {
              if (onNavigateToCertifications) {
                onNavigateToCertifications(userId);
              }
            }}
            onOpenChat={onOpenChat}
            onCloseParentModal={onClose}
          />
        </div>
      </div>
    </div>
  );
};
