import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Headphones,
  X,
  Mail,
  Clock,
  Shield,
  Send,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

type ServiceCategory =
  | 'delivery_dispute'
  | 'payment'
  | 'payout'
  | 'account'
  | 'feature'
  | 'bug'
  | 'suggestion'
  | 'other';

export const CustomerServiceModal: React.FC = () => {
  const {
    isCustomerServiceOpen,
    customerServiceContext,
    closeCustomerService,
    currentUser,
  } = useApp();

  const [category, setCategory] = useState<ServiceCategory>('delivery_dispute');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isCustomerServiceOpen) {
      setSubmitted(false);
      setName(currentUser?.name || '');
      setEmail(currentUser?.email || '');
      if (customerServiceContext?.category) {
        setCategory(customerServiceContext.category as ServiceCategory);
      } else {
        setCategory('delivery_dispute');
      }
      if (customerServiceContext?.message) {
        setMessage(customerServiceContext.message);
      } else if (customerServiceContext?.subject) {
        setMessage(`【${customerServiceContext.subject}】\n`);
      } else {
        setMessage('');
      }
    }
  }, [isCustomerServiceOpen, customerServiceContext, currentUser]);

  if (!isCustomerServiceOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      // Auto-close after 3 seconds if user doesn't dismiss
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 text-stone-800">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">IdeaX 官方客服與爭議仲裁中心</h3>
              <p className="text-[11px] text-stone-500">交易安全保障・交付驗收諮詢・疑義申訴調查</p>
            </div>
          </div>
          <button
            onClick={closeCustomerService}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto animate-in zoom-in-75 duration-200" />
              <h4 className="font-black text-lg text-stone-900">客服案件已成功受理！</h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                我們已收到您的申訴與諮詢案件，IdeaX 客服審查專員將儘速與您聯繫並協助調查處理。款項爭議期間平台將啟動安全防護。
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeCustomerService}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs cursor-pointer"
                >
                  確認並關閉
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Context Notice if invoked from chat or specific object */}
              {customerServiceContext?.relatedUser && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center gap-2 text-amber-950">
                  <MessageSquare className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold">關聯對象：</span>
                    <span className="font-semibold">{customerServiceContext.relatedUser}</span>
                    {customerServiceContext.subject && (
                      <span className="text-amber-800 ml-1.5 font-normal">（{customerServiceContext.subject}）</span>
                    )}
                  </div>
                </div>
              )}

              {/* Service Info Cards */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block font-bold">官方客服信箱</span>
                    <span className="font-bold text-stone-800 text-[11px]">support@ideax.tw</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block font-bold">服務與爭議受理</span>
                    <span className="font-bold text-stone-800 text-[11px]">專人爭議受理保護</span>
                  </div>
                </div>
              </div>

              {/* Guarantee Note */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-700 space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>交易爭議與撥款保障提醒</span>
                </div>
                <p className="leading-relaxed text-stone-500">
                  若對方案交付內容、線上會談約定有異議，請留存截圖或通話紀錄，並在此提交申訴，平台將迅速啟動第三方爭議審查機制。
                </p>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  諮詢或申訴類別 *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'delivery_dispute', label: '交付內容異議' },
                    { id: 'payment', label: '支付款項' },
                    { id: 'payout', label: '撥款款項' },
                    { id: 'account', label: '帳號與認證' },
                    { id: 'feature', label: '平台功能諮詢' },
                    { id: 'bug', label: 'APP或網站技術問題(bug)' },
                    { id: 'suggestion', label: '對我們的建議' },
                    { id: 'other', label: '其他問題' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id as ServiceCategory)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        category === item.id
                          ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                          : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    您的姓名 / 稱呼 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如：王小明"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    聯絡 Email / 電話 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Message Details */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  問題描述與佐證說明 *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    category === 'bug'
                      ? '請詳細說明您遇到的系統 Bug 或技術異常、發生頁面、使用的裝置（手機/平板/電腦型號）與瀏覽器，以利工程技術團隊迅速排查修正...'
                      : category === 'suggestion'
                      ? '歡迎留下您對 IdeaX 平台功能、操作體驗、服務規則或改進方向的寶貴建議與想法，營運與產品團隊都會認真研讀並持續優化...'
                      : '請詳細敘述您遇到的問題、相關問題標題、解答者名稱或交易爭議點...'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={closeCustomerService}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold cursor-pointer transition-colors"
                >
                  取消返回
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>送出客服諮詢</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
