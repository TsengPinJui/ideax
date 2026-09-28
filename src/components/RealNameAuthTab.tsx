import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ExternalLink,
  Trash2,
  Info,
  Building,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MapPin,
  Save,
  Check,
} from 'lucide-react';
import { User } from '../types';
import { useApp } from '../context/AppContext';

export const RealNameAuthTab: React.FC = () => {
  const { currentUser, setCurrentUser, addNotification, openAboutModal } = useApp();

  const isVerified =
    currentUser.realNameAuthStatus === 'verified' ||
    currentUser.bankAccount?.isVerified === true;
  const isPending = currentUser.realNameAuthStatus === 'pending';

  // Form State
  const initialData = currentUser.realNameAuthData;
  const [legalName, setLegalName] = useState(
    initialData?.legalName || currentUser.bankAccount?.accountHolder || currentUser.name || ''
  );
  const [idNumber, setIdNumber] = useState(
    initialData?.idNumber || 'A123456789'
  );
  const [nationality, setNationality] = useState(
    initialData?.nationality || '中華民國 (台灣)'
  );
  const [birthDate, setBirthDate] = useState(
    initialData?.birthDate || '1990-05-15'
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.phoneNumber || '0912-345-678'
  );
  const [email, setEmail] = useState(
    initialData?.email || currentUser.email || 'user@ideax.tw'
  );

  // Uploaded ID files (Front & Back)
  const [frontFile, setFrontFile] = useState<{ name: string; size?: string } | null>(
    initialData?.idCardFrontFile || { name: '國民身分證_正面彩色掃描.jpg', size: '1.8 MB' }
  );
  const [backFile, setBackFile] = useState<{ name: string; size?: string } | null>(
    initialData?.idCardBackFile || { name: '國民身分證_反面彩色掃描.jpg', size: '1.9 MB' }
  );

  // Optional Fields
  const [address, setAddress] = useState(
    initialData?.address || '台北市大安區敦化南路二段 100 號 12 樓'
  );
  const [idIssueDate, setIdIssueDate] = useState(
    initialData?.idIssueDate || '2020-08-20'
  );
  const [idIssueType, setIdIssueType] = useState(
    initialData?.idIssueType || '換發'
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    initialData?.emergencyContactName || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialData?.emergencyContactPhone || ''
  );

  // Compliance Checkbox
  const [agreedAml, setAgreedAml] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const fileData = { name: file.name, size: `${sizeMb} MB` };

    if (side === 'front') {
      setFrontFile(fileData);
    } else {
      setBackFile(fileData);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!legalName.trim()) {
      alert('請填寫您的身分證真實姓名！');
      return;
    }
    if (!idNumber.trim()) {
      alert('請填寫身分證字號或居留證號！');
      return;
    }
    if (!phoneNumber.trim()) {
      alert('請填寫聯絡手機號碼！');
      return;
    }
    if (!email.trim()) {
      alert('請填寫聯絡電子信箱！');
      return;
    }
    if (!frontFile || !backFile) {
      alert('請務必上傳身分證件正面與反面彩色檔案！');
      return;
    }
    if (!agreedAml) {
      alert('請閱讀並勾選遵守個資法與洗錢防制規範條款！');
      return;
    }

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const payload = {
      legalName: legalName.trim(),
      idNumber: idNumber.trim().toUpperCase(),
      nationality,
      birthDate,
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      idCardFrontFile: frontFile,
      idCardBackFile: backFile,
      address: address.trim(),
      idIssueDate,
      idIssueType,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      agreedAmlPolicy: agreedAml,
      appliedAt: nowIso,
      verifiedAt: nowIso,
    };

    setTimeout(() => {
      setCurrentUser((prev: User) => ({
        ...prev,
        realNameAuthStatus: 'verified',
        realNameAuthData: payload,
      }));

      addNotification({
        title: '實名身分核驗已完成',
        message: '您的實名身分資料已通過核驗並完成加密存檔，已解鎖全站高額懸賞委託與第三方合規撥款權益。',
        type: 'system',
      });

      setIsSubmitting(false);
      setMsg('🎉 實名身分認證已成功審核通過！');
      setTimeout(() => setMsg(null), 4000);
    }, 600);
  };

  // Mask ID for privacy display
  const maskedId =
    idNumber.length >= 7
      ? `${idNumber.slice(0, 3)}****${idNumber.slice(-3)}`
      : idNumber;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center font-black border border-blue-200 shrink-0">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  會員實名認證
                </h3>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 已通過實名認證
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> 實名審核中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    尚未完成實名認證
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                依中華民國《洗錢防制法》及第三方金流監理規範，保障平台交易安全與報酬撥款核驗
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>TLS 256-bit 銀行級加密保護</span>
            </span>
          </div>
        </div>

        {/* Status Notice */}
        {msg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        {isVerified && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-950">
              <strong className="block text-sm font-black">
                您的帳號已完成官方實名認證
              </strong>
              <p className="text-emerald-800">
                實名身分已於 {initialData?.verifiedAt ? new Date(initialData.verifiedAt).toLocaleDateString() : '系統註冊時'} 通過驗證。您可以安心發布各級懸賞痛點、提交專業解決方案，並享有合規之第三方金流銀行帳戶自動撥付保障。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KYC Application Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 必要資料 (Required Identity Information) */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                法定身分基本資料（必要資料）
              </h4>
            </div>
            <span className="text-[10px] text-rose-500 font-bold">* 欄位為必填項目</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* 真實姓名 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                真實姓名（須與身分證一致） <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="例：王小明"
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 身分證字號 / 居留證號 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                身分證字號 / 居留證號 (ARC) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="例：A123456789"
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-mono font-medium uppercase focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 國籍 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                國籍 <span className="text-rose-500">*</span>
              </label>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="中華民國 (台灣)">中華民國 (台灣)</option>
                <option value="香港">香港 (Hong Kong)</option>
                <option value="日本">日本 (Japan)</option>
                <option value="新加坡">新加坡 (Singapore)</option>
                <option value="美國">美國 (United States)</option>
                <option value="馬來西亞">馬來西亞 (Malaysia)</option>
                <option value="其他國家/地區">其他國家 / 地區</option>
              </select>
            </div>

            {/* 出生年月日 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                出生年月日 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 聯絡手機 / 電話 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                聯絡手機號碼 <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912-345-678"
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 聯絡電子信箱 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                聯絡電子信箱 (Email) <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 2. 證件影像上傳 (身分證正反面) */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                身分證明文件影像（必要上傳）
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                （僅供管理員和內部查看）
              </span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">支援 JPG, PNG, PDF (單檔 10MB 內)</span>
          </div>

          {/* 認證照片僅供認證使用，完畢即永久刪除 & 備份提醒宣告條 */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-black text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>【認證照片隱私規則】認證照片僅供認證使用，審核完畢即永久刪除</span>
            </div>
            <p className="text-[11px] text-stone-600 font-normal">
              • <strong>證件安全與即刻銷毀：</strong>您上傳的身分證件正反面彩色影像<strong>僅供管理員和內部身分審查使用</strong>，一旦官方審核完畢（無論通過與否），系統即<strong>永久自雲端資料庫徹底刪除證件影像檔案</strong>，絕不長期留存，全面防護個人隱私。<br />
              • <strong>自行備份與大檔提醒：</strong>平台不對用戶上傳之資料、檔案負保管責任，請用戶務必自行妥善留存原始備份；若有大型輔助佐證或資歷作品，請善用 <strong>Google Drive、Dropbox、Figma</strong> 等外部雲端儲存工具的共享連結。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Front ID */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  身分證正面彩色影本 <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-stone-400">含完整相片與姓名</span>
              </div>

              {frontFile ? (
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-stone-800 truncate">{frontFile.name}</span>
                    {frontFile.size && <span className="text-[10px] text-stone-400">({frontFile.size})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFrontFile(null)}
                    className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-stone-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group">
                  <Upload className="w-5 h-5 text-stone-400 group-hover:text-blue-600" />
                  <span className="text-xs font-bold text-stone-700">點擊上傳身分證正面</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'front')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Back ID */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  身分證反面彩色影本 <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-stone-400">含配偶與戶籍地址</span>
              </div>

              {backFile ? (
                <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-stone-800 truncate">{backFile.name}</span>
                    {backFile.size && <span className="text-[10px] text-stone-400">({backFile.size})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBackFile(null)}
                    className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-stone-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group">
                  <Upload className="w-5 h-5 text-stone-400 group-hover:text-blue-600" />
                  <span className="text-xs font-bold text-stone-700">點擊上傳身分證反面</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'back')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 3. 選填輔助資料 (Optional Information) */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-500 text-white text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                通訊地址與輔助核驗（選填資料）
              </h4>
            </div>
            <span className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded">
              選填
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* 戶籍 / 通訊地址 */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                通訊 / 戶籍地址（選填）
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例：台北市大安區信義路四段..."
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 發證日期與類別 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                身分證發證類別（選填）
              </label>
              <select
                value={idIssueType}
                onChange={(e) => setIdIssueType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="換發">換發</option>
                <option value="初發">初發</option>
                <option value="補發">補發</option>
              </select>
            </div>

            {/* 緊急聯絡人 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                緊急聯絡人姓名（選填）
              </label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="例：陳先生"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* 緊急聯絡人電話 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                緊急聯絡人電話（選填）
              </label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="例：0988-123-456"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 4. 法規遵循與個資宣告 */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
          <div className="flex items-center gap-1.5 text-blue-950 font-black text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>洗錢防制與個人資料保護聲明</span>
          </div>

          <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedAml}
              onChange={(e) => setAgreedAml(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer mt-0.5"
            />
            <span>
              我已詳閱並同意遵守<strong>《個人資料保護法》</strong>、<strong>《洗錢防制法》</strong>與
              <button
                type="button"
                onClick={() => openAboutModal('privacy_policy')}
                className="text-blue-800 underline font-bold inline-flex items-center mx-1"
              >
                隱私權保護政策
              </button>
              ，授權 IdeaX 創點子於平台金流託管、撥款核驗與法令合規必要範圍內進行身分真實性驗證。
            </span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isSubmitting ? '實名核驗加密傳輸中...' : isVerified ? '更新並儲存實名資料' : '提交實名身分認證'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
