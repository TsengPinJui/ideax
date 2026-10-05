import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Category, ProblemLevel, Question } from '../types';
import { X, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CreateQuestionModalProps {
  onClose: () => void;
}

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({ onClose }) => {
  const { currentUser, setQuestions, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('創新創業');
  const [subcategory, setSubcategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [level, setLevel] = useState<ProblemLevel>('L2');
  const [bounty, setBounty] = useState<number>(30000);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPainPointFree, setIsPainPointFree] = useState(false);

  const handleLevelChange = (newLevel: ProblemLevel) => {
    setLevel(newLevel);
    if (newLevel === 'L0') {
      setBounty(0);
      setIsPainPointFree(false);
    } else if (newLevel === 'L1') {
      setBounty(15000);
    } else if (newLevel === 'L2') {
      setBounty(35000);
    } else if (newLevel === 'L3') {
      setBounty(80000);
    } else if (newLevel === 'L4') {
      setBounty(150000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('請完整填寫問題標題與痛點描述！');
      return;
    }

    const effectiveBounty = isPainPointFree ? 0 : bounty;
    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorTitle: currentUser.title,
      isAnonymous,
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory: subcategory.trim() || undefined,
      tags: tags.length > 0 ? tags : [category],
      level: isPainPointFree ? 'L1' : level,
      bounty: effectiveBounty,
      deadline: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 1,
      answersCount: 0,
    };

    setQuestions((prev) => [newQuestion, ...prev]);
    confetti({ particleCount: 70, spread: 60 });
    showToast(isPainPointFree ? '🎉 痛點已成功免費上架！' : '🎉 付費懸賞已成功發布並進入第三方價金託管！');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white flex items-center">
              💡 發布問題 / 提出痛點
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              由認證專家與社群高手為您量身打造實戰落地方案
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setIsPainPointFree(false);
                if (bounty === 0) setBounty(35000);
              }}
              className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                !isPainPointFree
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💰 懸賞發案 (L1 ~ L4)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPainPointFree(true);
                setBounty(0);
              }}
              className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                isPainPointFree
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🆓 痛點免費提出 (NT$ 0)
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              問題或痛點標題 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：B2B 企業級 AI Agent 自動化流暢落地 SOP 與架構規劃"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium"
              required
            />
          </div>

          {/* Category & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                領域類別 <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="創新創業">創新創業</option>
                <option value="資訊科技">資訊科技</option>
                <option value="產品設計">產品設計</option>
                <option value="行銷成長">行銷成長</option>
                <option value="營運管理">營運管理</option>
                <option value="法規稅務">法規稅務</option>
                <option value="專業問題">專業問題</option>
                <option value="其他領域">其他領域</option>
              </select>
            </div>

            {!isPainPointFree && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  問題難度等級
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['L1', 'L2', 'L3', 'L4'] as ProblemLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleLevelChange(lvl)}
                      className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                        level === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bounty Amount (if not free pain point) */}
          {!isPainPointFree && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                懸賞金額（NTD）- 將由第三方支付價金託管
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">NT$</span>
                <input
                  type="number"
                  value={bounty}
                  onChange={(e) => setBounty(Number(e.target.value))}
                  min={1000}
                  step={1000}
                  className="w-full pl-14 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              詳細痛點描述、背景與期待驗收指標 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="請具體說明：1. 當前遇到的核心瓶頸 2. 過去嘗試過的方法 3. 期望專家提供的具體成果..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              標籤（以逗號或空格分隔）
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="例如：AI Agent, 企業落地, POC驗收"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Anonymous Switch */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">以「匿名提問者」身分發布</div>
              <div className="text-[11px] text-slate-500">
                隱匿您的個人帳號名稱與頭像，保護商業機密與隱私
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-800 text-sm font-bold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-100 transition-all"
            >
              {isPainPointFree ? '確認免費提出痛點' : `確認發布 (NT$ ${bounty.toLocaleString()})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
