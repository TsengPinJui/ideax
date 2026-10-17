import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, X, CheckCircle2, Award, ThumbsUp } from 'lucide-react';

export const RatingModal: React.FC = () => {
  const { isRatingModalOpen, ratingTarget, closeRatingModal, rateSolver } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['專業透徹', '溝通即時']);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isRatingModalOpen || !ratingTarget) return null;

  const quickPraiseTags = [
    '專業透徹',
    '線上會談耐心',
    '交付精準',
    '溝通即時',
    '商業落地強',
    '物超所值',
    '解答詳盡',
    '大推超值',
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return '需加強改善';
      case 2:
        return '尚可普通';
      case 3:
        return '符合預期';
      case 4:
        return '專業優質';
      case 5:
        return '超出預期・極力推薦！';
      default:
        return '滿意度評分';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullComment = selectedTags.length > 0
      ? `【${selectedTags.join(' / ')}】${comment.trim() ? ` ${comment.trim()}` : ''}`
      : comment.trim() || '非常感謝專家的專業解答與完整交付！';

    rateSolver(ratingTarget.solverId, rating, fullComment, ratingTarget.transactionId);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      closeRatingModal();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-stone-900">
                交易完成・為解題者評分
              </h3>
              <p className="text-[11px] text-stone-500">公開星級與真實反饋，建立專家信譽生態</p>
            </div>
          </div>
          <button
            onClick={closeRatingModal}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {isSubmitted ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-in zoom-in-75 duration-200" />
              <h4 className="font-black text-base text-stone-900">評分已送出！</h4>
              <p className="text-xs text-stone-500">
                感謝您為 {ratingTarget.solverName} 留下寶貴的評價，將公開呈現於專家檔案。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Solver Info Card */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-3">
                <img
                  src={ratingTarget.solverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={ratingTarget.solverName}
                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-stone-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-stone-900 truncate">
                    {ratingTarget.solverName}
                  </h4>
                  {ratingTarget.solverTitle && (
                    <p className="text-xs text-stone-500 truncate">{ratingTarget.solverTitle}</p>
                  )}
                  {ratingTarget.relatedTitle && (
                    <p className="text-[10px] text-amber-800 truncate mt-0.5">
                      方案：{ratingTarget.relatedTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Star Rating Section */}
              <div className="text-center py-2 space-y-1.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 p-3">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeVal = hoverRating || rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-120 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            star <= activeVal
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-black text-amber-950 font-mono">
                  {rating} 星・{getRatingLabel(hoverRating || rating)}
                </div>
              </div>

              {/* Quick Praise Tags */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5 flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>快捷亮點標籤（可複選）</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPraiseTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 shadow-2xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Review Text */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  詳細評價回饋（選填）
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="請分享專家交付的方案品質、線上會談交流體驗或具體給予的幫助..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 outline-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={closeRatingModal}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  稍後再評
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-xs cursor-pointer transition-all active:scale-98"
                >
                  送出評價
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
