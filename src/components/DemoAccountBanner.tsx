import React from 'react';
import { Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFirebaseSessionUser } from './AdminSessionNotice';
import { ADMIN_RETURN_KEY, isDemoAccountId, isVerifiedAdminFirebaseUser } from '../services/accountGuard';

/**
 * 管理員切到示範帳號時，畫面底部顯示一條提示，可以一鍵回到管理員。
 * 只有真的用白名單管理員登入的人看得到（一般使用者不會出現）。
 */
export const DemoAccountBanner: React.FC = () => {
  const { currentUser, switchAccount, availableUsers } = useApp();
  const fbUser = useFirebaseSessionUser();
  if (!currentUser || !isDemoAccountId(currentUser.id) || !isVerifiedAdminFirebaseUser(fbUser)) return null;

  let returnId = '';
  try {
    returnId = localStorage.getItem(ADMIN_RETURN_KEY) || '';
  } catch {}
  if (!returnId) {
    // 沒記到原本的管理員帳號：找和目前登入信箱相符的管理員帳號
    const email = String(fbUser?.email || '').toLowerCase();
    returnId =
      availableUsers.find((u) => u.role === 'admin' && (u.authUid === fbUser?.uid || String(u.email || '').toLowerCase() === email))?.id ||
      availableUsers.find((u) => u.role === 'admin')?.id ||
      '';
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-24px)] max-w-md">
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-900 text-white pl-3.5 pr-1.5 py-1.5 shadow-lg">
        <Eye className="w-4 h-4 text-amber-300 shrink-0" />
        <p className="flex-1 min-w-0 text-[13px] leading-snug truncate">
          管理員正在使用示範帳號「{currentUser.name}」
        </p>
        {returnId && (
          <button
            type="button"
            onClick={() => {
              if (switchAccount(returnId) && typeof window !== 'undefined') window.scrollTo({ top: 0 });
            }}
            className="shrink-0 h-8 px-3 rounded-lg bg-white text-stone-900 text-[13px] font-medium hover:bg-stone-100 cursor-pointer"
          >
            回到管理員
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoAccountBanner;
