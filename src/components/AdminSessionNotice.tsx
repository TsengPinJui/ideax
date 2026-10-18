import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { KeyRound } from 'lucide-react';
import { auth } from '../services/firebase';
import { useApp } from '../context/AppContext';

/** 目前的 Firebase 登入帳號（伺服器以此確認管理員身分） */
export function useFirebaseSessionUser(): FirebaseUser | null | undefined {
  const [user, setUser] = useState<FirebaseUser | null | undefined>(auth.currentUser ?? undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  return user;
}

/**
 * 管理員工具需要伺服器確認身分；用「切換帳號」進入管理員時沒有登入憑證，
 * 這裡提示並提供一鍵重新登入。
 */
export const AdminSessionNotice: React.FC = () => {
  const fbUser = useFirebaseSessionUser();
  const { openAuthModal } = useApp();
  if (fbUser === undefined || fbUser) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <span className="leading-relaxed">
        目前沒有管理員登入憑證（通常是用「切換帳號」進入管理員）。伺服器需要確認身分，請用管理員 Email 重新登入一次。
      </span>
      <button
        type="button"
        onClick={() => openAuthModal('login', 'email', '管理員工具需要以管理員 Email 重新登入')}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5" />
        重新登入
      </button>
    </div>
  );
};
