import React from 'react';

export interface IdeaXLogoProps {
  variant?: 'horizontal' | 'compact' | 'stacked' | 'mark' | 'dark' | 'card' | 'bulb' | 'chuangdianzi' | 'chuangdianzi-text' | 'horizontal-ideax' | 'footer-combined' | 'ideax-6';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  showSlogan?: boolean;
}

export const IdeaXLogo: React.FC<IdeaXLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const isDark = theme === 'dark';

  // Preset size dimensions for various display archetypes
  const sizeStyles: Record<string, Record<string, string>> = {
    horizontal: {
      xs: 'h-6 sm:h-7 w-auto',
      sm: 'h-7 sm:h-8 w-auto',
      md: 'h-9 sm:h-10 w-auto',
      lg: 'h-11 sm:h-13 w-auto',
      xl: 'h-14 sm:h-16 w-auto',
      '2xl': 'h-16 sm:h-20 w-auto',
      '3xl': 'h-20 sm:h-24 w-auto',
    },
    compact: {
      xs: 'h-6 w-auto',
      sm: 'h-8 w-auto',
      md: 'h-10 w-auto',
      lg: 'h-12 w-auto',
      xl: 'h-16 w-auto',
      '2xl': 'h-20 w-auto',
      '3xl': 'h-24 w-auto',
    },
    stacked: {
      xs: 'w-16 h-auto',
      sm: 'w-24 h-auto',
      md: 'w-32 h-auto',
      lg: 'w-44 h-auto',
      xl: 'w-56 h-auto',
      '2xl': 'w-64 h-auto',
      '3xl': 'w-72 h-auto',
    },
    mark: {
      xs: 'w-5 h-5',
      sm: 'w-7 h-7',
      md: 'w-8 h-8 sm:w-9 sm:h-9',
      lg: 'w-12 h-12 sm:w-14 sm:h-14',
      xl: 'w-16 h-16 sm:w-20 sm:h-20',
      '2xl': 'w-24 h-24 sm:w-28 sm:h-28',
      '3xl': 'w-28 h-28 sm:w-32 sm:h-32',
    },
    bulb: {
      xs: 'w-7 h-7',
      sm: 'w-9 h-9 sm:w-10 sm:h-10',
      md: 'w-11 h-11 sm:w-12 sm:h-12',
      lg: 'w-13 h-13 sm:w-15 sm:h-15',
      xl: 'w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]',
      '2xl': 'w-24 h-24 sm:w-30 sm:h-30',
      '3xl': 'w-28 h-28 sm:w-36 sm:h-36',
    },
    chuangdianzi: {
      xs: 'w-36 h-auto',
      sm: 'w-44 h-auto',
      md: 'w-56 sm:w-64 h-auto',
      lg: 'w-64 sm:w-72 md:w-80 max-w-full h-auto',
      xl: 'w-full max-w-md h-auto',
    },
    'chuangdianzi-text': {
      xs: 'w-28 sm:w-32 h-auto',
      sm: 'w-36 sm:w-44 h-auto',
      md: 'w-48 sm:w-56 md:w-64 h-auto',
      lg: 'w-56 sm:w-64 md:w-72 max-w-full h-auto',
      xl: 'w-full max-w-md h-auto',
    },
    'horizontal-ideax': {
      xs: 'h-7 w-auto',
      sm: 'h-8 w-auto',
      md: 'h-9 sm:h-10 w-auto',
      lg: 'h-11 sm:h-12 w-auto',
      xl: 'h-16 w-auto',
    },
    'ideax-6': {
      xs: 'h-6 sm:h-7 w-auto',
      sm: 'h-7 sm:h-8 w-auto',
      md: 'h-8 sm:h-9 w-auto',
      lg: 'h-10 sm:h-11 w-auto',
      xl: 'h-14 w-auto',
    },
    'footer-combined': {
      xs: 'h-7 w-auto',
      sm: 'h-8 w-auto',
      md: 'h-10 sm:h-11 w-auto',
      lg: 'h-12 sm:h-14 w-auto',
      xl: 'h-16 w-auto',
    },
    dark: {
      xs: 'w-32 h-auto',
      sm: 'w-44 h-auto',
      md: 'w-56 h-auto',
      lg: 'w-64 h-auto',
      xl: 'w-80 h-auto',
    },
    card: {
      xs: 'w-48 h-auto',
      sm: 'w-60 h-auto',
      md: 'w-72 h-auto',
      lg: 'w-84 sm:w-96 h-auto',
      xl: 'w-full max-w-xl h-auto',
    },
  };

  // Fixed embedded official brand image assets (all seamlessly transparent)
  let imageSrc = '/logo-chuangdianzi.png';

  if (variant === 'bulb' || variant === 'mark') {
    imageSrc = '/logo-bulb.png'; // 去背低飽和正向燈泡
  } else if (variant === 'chuangdianzi') {
    imageSrc = '/logo-chuangdianzi.png'; // 創點子 + IdeaX (2.png transparent)
  } else if (variant === 'chuangdianzi-text') {
    imageSrc = '/logo-chuangdianzi-text.png'; // 創點子 + IdeaX 純字體版（無燈泡）
  } else if (variant === 'ideax-6') {
    imageSrc = isDark ? '/logo-6-trans-dark.png' : '/logo-6-trans.png'; // 去背 6.jpg (IdeaX)
  } else if (variant === 'footer-combined' || variant === 'horizontal-ideax') {
    imageSrc = isDark ? '/logo-6-trans-dark.png' : '/logo-6-trans.png'; // 頁尾直接使用去背 6.jpg
  } else if (variant === 'stacked') {
    imageSrc = '/logo-vertical.png';
  } else if (variant === 'dark' || isDark) {
    imageSrc = '/logo-dark.png';
  } else if (variant === 'compact') {
    imageSrc = '/logo-compact.png';
  } else if (variant === 'card') {
    imageSrc = '/logo-card.jpg';
  }

  const currentSizeClass = sizeStyles[variant]?.[size] || sizeStyles.horizontal.md;

  return (
    <div className={`relative inline-flex items-center shrink-0 select-none ${className}`}>
      <img
        src={imageSrc}
        alt="IdeaX"
        className={`object-contain transition-transform duration-150 ${currentSizeClass}`}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          if (variant === 'bulb') {
            e.currentTarget.src = '/logo-bulb.png';
          } else {
            e.currentTarget.src = '/logo-chuangdianzi.png';
          }
        }}
      />
    </div>
  );
};
