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
  Camera,
  Image as ImageIcon,
  ZoomIn,
  X,
  Bot,
  Sparkles,
  Loader2,
  Zap,
} from 'lucide-react';
import { User } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';
import {
  processIdCardImage,
  processAndUploadIdCardImage,
  inspectIdCardImageWithAI,
  IdCardAiInspectionResult,
} from '../utils/idCardImageHelper';

export const RealNameAuthTab: React.FC = () => {
  const { currentUser, setCurrentUser, addNotification, openAboutModal } = useApp();

  const isVerified = currentUser.realNameAuthStatus === 'verified';
  const isPending = currentUser.realNameAuthStatus === 'pending';

  // Form State
  const initialData = currentUser.realNameAuthData;
  const [legalName, setLegalName] = useState(
    initialData?.legalName || currentUser.bankAccount?.accountHolder || currentUser.name || ''
  );
  const [idNumber, setIdNumber] = useState(
    initialData?.idNumber || ''
  );
  const [nationality, setNationality] = useState(
    initialData?.nationality || '中華民國 (台灣)'
  );
  const [birthDate, setBirthDate] = useState(
    initialData?.birthDate || ''
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.phoneNumber || currentUser.phone || ''
  );
  const [email, setEmail] = useState(
    initialData?.email || currentUser.email || ''
  );

  // Uploaded ID files (Front & Back) with photo URL
  const [frontFile, setFrontFile] = useState<{
    name: string;
    size?: string;
    url?: string;
    storagePath?: string;
    isStorage?: boolean;
    uploadedAt?: string;
  } | null>(
    initialData?.idCardFrontFile || null
  );
  const [backFile, setBackFile] = useState<{
    name: string;
    size?: string;
    url?: string;
    storagePath?: string;
    isStorage?: boolean;
    uploadedAt?: string;
  } | null>(
    initialData?.idCardBackFile || null
  );

  // AI Copilot Real-time Inspection States
  const [frontInspection, setFrontInspection] = useState<IdCardAiInspectionResult | null>(
    initialData?.idCardFrontFile
      ? {
          passed: true,
          score: 98,
          status: 'passed',
          title: '🟢 AI 身分證正面已驗證',
          summary: '身分證正面防偽特徵清晰、文字辨識完整。',
          extractedFields: {},
          checks: {
            resolution: true,
            aspectRatio: true,
            clarityAndNoGlare: true,
            idFormatMatched: true,
            faceOrChipDetected: true,
          },
          reasons: [],
        }
      : null
  );
  const [backInspection, setBackInspection] = useState<IdCardAiInspectionResult | null>(
    initialData?.idCardBackFile
      ? {
          passed: true,
          score: 98,
          status: 'passed',
          title: '🟢 AI 身分證反面已驗證',
          summary: '身分證反面防偽晶片與戶籍地址特徵清晰。',
          extractedFields: {},
          checks: {
            resolution: true,
            aspectRatio: true,
            clarityAndNoGlare: true,
            idFormatMatched: true,
            faceOrChipDetected: true,
          },
          reasons: [],
        }
      : null
  );
  const [isScanningFront, setIsScanningFront] = useState(false);
  const [isScanningBack, setIsScanningBack] = useState(false);

  const [previewModalImg, setPreviewModalImg] = useState<{ title: string; url: string } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<'front' | 'back' | null>(null);

  // Optional & Registered Address Fields
  const [idAddress, setIdAddress] = useState(
    initialData?.idAddress || initialData?.address || ''
  );
  const [address, setAddress] = useState(
    initialData?.address || ''
  );
  const [idIssueDate, setIdIssueDate] = useState(
    initialData?.idIssueDate || ''
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
  const [agreedAml, setAgreedAml] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsProcessingPhoto(side);
    if (side === 'front') setIsScanningFront(true);
    else setIsScanningBack(true);

    try {
      // 1. 先讀取圖片並由 AI Copilot 進行即時防偽、清晰度與 OCR 格式快篩
      const processed = await processAndUploadIdCardImage(file, side, currentUser.id);
      const inspection = await inspectIdCardImageWithAI(
        processed.url,
        side,
        file.name,
        legalName,
        idNumber
      );

      if (side === 'front') {
        setFrontInspection(inspection);
        if (inspection.passed) {
          setFrontFile({
            name: processed.name,
            size: processed.size,
            url: processed.url,
            storagePath: processed.storagePath,
            isStorage: processed.isStorage,
            uploadedAt: processed.uploadedAt,
          });

          // 若表單欄位尚未填寫，自動為用戶帶入 AI 辨識之資訊
          if (inspection.extractedFields.legalName && !legalName) {
            setLegalName(inspection.extractedFields.legalName);
          }
          if (inspection.extractedFields.idNumber && !idNumber) {
            setIdNumber(inspection.extractedFields.idNumber);
          }
          if (inspection.extractedFields.birthDate && !birthDate) {
            setBirthDate(inspection.extractedFields.birthDate);
          }
          if (inspection.extractedFields.issueDate && !idIssueDate) {
            setIdIssueDate(inspection.extractedFields.issueDate);
          }
          setMsg('✨ AI Copilot 證件辨識通過！已為您核對身分證正面防偽特徵。');
        } else {
          setFrontFile(null);
          setMsg(`⚠️ 正面辨識未通過：${inspection.reasons[0] || '請上傳清晰之身分證彩色圖檔'}`);
        }
      } else {
        setBackInspection(inspection);
        if (inspection.passed) {
          setBackFile({
            name: processed.name,
            size: processed.size,
            url: processed.url,
            storagePath: processed.storagePath,
            isStorage: processed.isStorage,
            uploadedAt: processed.uploadedAt,
          });

          if (inspection.extractedFields.address && !idAddress) {
            setIdAddress(inspection.extractedFields.address);
          }
          if (inspection.extractedFields.issueDate && !idIssueDate) {
            setIdIssueDate(inspection.extractedFields.issueDate);
          }
          setMsg('✨ AI Copilot 證件辨識通過！已為您核對身分證反面防偽晶片與戶籍地址。');
        } else {
          setBackFile(null);
          setMsg(`⚠️ 反面辨識未通過：${inspection.reasons[0] || '請上傳清晰之身分證反面圖檔'}`);
        }
      }
    } catch (err: any) {
      alert(err.message || '相片處理失敗，請重新拍攝或選擇相片');
    } finally {
      setIsProcessingPhoto(null);
      setIsScanningFront(false);
      setIsScanningBack(false);
      setTimeout(() => setMsg(null), 4000);
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
    if (!idAddress.trim()) {
      alert('請填寫身分證住址！');
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
    if (frontInspection && !frontInspection.passed) {
      alert(`⚠️ 正面身分證未通過 AI Copilot 防偽辨識：${frontInspection.summary}，請重新上傳清晰證件方可送出！`);
      return;
    }
    if (backInspection && !backInspection.passed) {
      alert(`⚠️ 反面身分證未通過 AI Copilot 防偽辨識：${backInspection.summary}，請重新上傳清晰證件方可送出！`);
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
      idAddress: idAddress.trim(),
      address: address.trim(),
      idIssueDate,
      idIssueType,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      agreedAmlPolicy: agreedAml,
      appliedAt: nowIso,
    };

    setTimeout(() => {
      setCurrentUser((prev: User) => ({
        ...prev,
        realNameAuthStatus: 'pending',
        realNameAuthData: payload,
      }));

      addNotification({
        title: '實名身分核驗申請已送出',
        message: '您的實名身分資料與證件已加密送出！官方審查人員與 AI 智能預審系統將於 1~2 個工作天內核對資料真實性。',
        type: 'system',
      });

      setIsSubmitting(false);
      setMsg('🎉 實名身分認證表單已成功送出！官方人員審核中。');
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
                法定身分基本資料
              </h4>
              {isVerified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-700" /> 已過審封存（僅供檢視）
                </span>
              )}
            </div>
            {!isVerified && <span className="text-[10px] text-rose-500 font-bold">* 欄位為必填項目</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* 真實姓名 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                真實姓名（須與身分證一致） {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="例：王小明"
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 身分證字號 / 居留證號 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                身分證字號 / 居留證號 {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={isVerified ? maskedId : idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="例：A123456789"
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-mono font-medium uppercase focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 身分證發證類別 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                身分證發證類別 {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <select
                value={idIssueType}
                onChange={(e) => setIdIssueType(e.target.value)}
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              >
                <option value="換發">換發</option>
                <option value="初發">初發</option>
                <option value="補發">補發</option>
              </select>
            </div>

            {/* 出生年月日 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                出生年月日 {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 國籍 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                國籍 {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
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

            {/* 聯絡手機 / 電話 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                聯絡手機號碼 {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912-345-678"
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 聯絡電子信箱 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                聯絡電子信箱 (Email) {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 身分證住址 */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                身分證住址（戶籍住址） {!isVerified && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={idAddress}
                onChange={(e) => setIdAddress(e.target.value)}
                placeholder="例：台北市大安區敦化南路二段 100 號 12 樓"
                disabled={isVerified}
                required
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
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
                身分證明文件影像
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                （僅供實名認證與建檔備查）
              </span>
              <HelpTooltip
                title="【實名認證個資保護規範】用戶個資絕不外洩"
                content={
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p>
                      • <strong>個資安全與建檔備查：</strong>為保平台用戶權益，解答者須提供個人資訊與國民身分證彩色影像。以下內容<strong>絕不外洩，僅供實名認證與建檔備查</strong>，全程由系統進行安全加密保護。
                    </p>
                    <p>
                      • <strong>自行備份提醒：</strong>平台對貼文與通訊中上傳之外部專案檔案不負長期保管責任，請用戶自行妥善留存原始備份。
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-[10px] text-stone-400 font-mono">支援 JPG, PNG, PDF (單檔 10MB 內)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Front ID */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  身分證正面彩色影本 {!isVerified && <span className="text-rose-500">*</span>}
                </span>
                <span className="text-[10px] text-stone-400">含完整相片與姓名</span>
              </div>

              {isScanningFront && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>🤖 AI Copilot 正在即時辨識正面（人像、姓名、號碼與防偽底紋）...</span>
                </div>
              )}

              {frontFile ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs">
                    <div
                      onClick={() => frontFile.url && setPreviewModalImg({ title: '身分證正面彩色影本', url: frontFile.url })}
                      className={`flex items-center gap-2 min-w-0 ${frontFile.url ? 'cursor-pointer hover:opacity-80' : ''}`}
                      title={frontFile.url ? '點擊放大檢視' : ''}
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-stone-800 truncate">{frontFile.name}</span>
                      {frontFile.size && <span className="text-[10px] text-stone-400">({frontFile.size})</span>}
                      {frontFile.url && <ZoomIn className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                    </div>
                    {!isVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          setFrontFile(null);
                          setFrontInspection(null);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* AI Inspection Passed Badge */}
                  {frontInspection && frontInspection.passed && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>AI 即時防偽辨識通過 ({frontInspection.score}分)</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">清晰無眩光</span>
                      </div>
                      <p className="text-[10px] text-emerald-800 leading-tight">{frontInspection.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-stone-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group">
                    <Upload className="w-5 h-5 text-stone-400 group-hover:text-blue-600" />
                    <span className="text-xs font-bold text-stone-700">點擊上傳身分證正面（AI 即時辨識）</span>
                    <span className="text-[10px] text-stone-400">上傳後將立即辨識證件是否合規</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileUpload(e, 'front')}
                      className="hidden"
                    />
                  </label>

                  {/* Failed Inspection Warning */}
                  {frontInspection && !frontInspection.passed && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{frontInspection.title}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">{frontInspection.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back ID */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  身分證反面彩色影本 {!isVerified && <span className="text-rose-500">*</span>}
                </span>
                <span className="text-[10px] text-stone-400">含配偶與戶籍地址</span>
              </div>

              {isScanningBack && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>🤖 AI Copilot 正在即時辨識反面（晶片底紋、地址與條碼特徵）...</span>
                </div>
              )}

              {backFile ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs">
                    <div
                      onClick={() => backFile.url && setPreviewModalImg({ title: '身分證反面彩色影本', url: backFile.url })}
                      className={`flex items-center gap-2 min-w-0 ${backFile.url ? 'cursor-pointer hover:opacity-80' : ''}`}
                      title={backFile.url ? '點擊放大檢視' : ''}
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-stone-800 truncate">{backFile.name}</span>
                      {backFile.size && <span className="text-[10px] text-stone-400">({backFile.size})</span>}
                      {backFile.url && <ZoomIn className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                    </div>
                    {!isVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          setBackFile(null);
                          setBackInspection(null);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* AI Inspection Passed Badge */}
                  {backInspection && backInspection.passed && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>AI 即時防偽辨識通過 ({backInspection.score}分)</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">晶片特徵吻合</span>
                      </div>
                      <p className="text-[10px] text-emerald-800 leading-tight">{backInspection.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-stone-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group">
                    <Upload className="w-5 h-5 text-stone-400 group-hover:text-blue-600" />
                    <span className="text-xs font-bold text-stone-700">點擊上傳身分證反面（AI 即時辨識）</span>
                    <span className="text-[10px] text-stone-400">上傳後將立即辨識證件是否合規</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileUpload(e, 'back')}
                      className="hidden"
                    />
                  </label>

                  {/* Failed Inspection Warning */}
                  {backInspection && !backInspection.passed && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{backInspection.title}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">{backInspection.summary}</p>
                    </div>
                  )}
                </div>
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
            {/* 通訊地址 */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                通訊地址（選填，如與身分證住址不同可填寫）
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例：台北市信義區忠孝東路五段..."
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>

            {/* 發證日期 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                發證日期（選填）
              </label>
              <input
                type="date"
                value={idIssueDate}
                onChange={(e) => setIdIssueDate(e.target.value)}
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
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
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
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
                disabled={isVerified}
                className={`w-full px-3 py-2 rounded-xl border text-stone-900 font-medium focus:outline-none ${
                  isVerified
                    ? 'bg-stone-100/80 border-stone-200 text-stone-700 cursor-not-allowed'
                    : 'bg-stone-50 border-stone-300 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 4. 法規遵循與個資宣告 */}
        {!isVerified && (
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
        )}

        {/* Submit Actions / Locked Status */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {isVerified ? (
            <div className="w-full p-4 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-700">
              <div className="flex items-center gap-2.5 text-xs font-bold text-stone-800">
                <Lock className="w-4 h-4 text-stone-500 shrink-0" />
                <span>實名認證已審核通過並鎖定封存（僅供檢視）。如需申請資料變更，請洽詢官方客服。</span>
              </div>
              <span className="px-4 py-2 rounded-xl bg-stone-200 text-stone-600 font-black text-xs shrink-0 self-end sm:self-auto">
                🔒 唯讀模式
              </span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? '實名核驗加密傳輸中...' : '提交實名身分認證'}</span>
            </button>
          )}
        </div>
      </form>

      {/* 證件影像放大檢視彈窗 */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm text-stone-900 truncate">
                  {previewModalImg.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 flex items-center justify-center max-h-[60vh]">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.title}
                className="max-h-[60vh] w-auto object-contain select-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>加密安全存檔（僅供本人與管理員核對）</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer shadow-2xs"
              >
                關閉檢視
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
