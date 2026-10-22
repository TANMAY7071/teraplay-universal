import React from 'react';

interface ThemeChangerProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
  variant?: 'icon' | 'switch';
  className?: string;
  size?: number;
}

export const ThemeChanger: React.FC<ThemeChangerProps> = ({
  theme,
  onToggle,
  variant = 'icon',
  className = '',
  size = 32,
}) => {
  const isLight = theme === 'light';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        title={`Current: ${isLight ? 'Light' : 'Dark'} mode (tap to switch)`}
        className={`tp-theme-icon-btn relative inline-flex items-center justify-center shrink-0 rounded-[6px] select-none cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${className}`}
        style={{
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          maxWidth: '32px',
          maxHeight: '32px',
          boxSizing: 'border-box',
          touchAction: 'manipulation',
        }}
      >
        {/* Sun Icon (Vibrant Orange: #ff9323, 8 rounded pill rays + central disc) */}
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: isLight ? 1 : 0,
            transform: 'none',
            transition: 'opacity 0.2s ease',
            color: '#ff9323',
          }}
          aria-hidden={!isLight}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            {/* Central Solid Disc */}
            <circle cx="12" cy="12" r="4.6" fill="currentColor" />
            {/* 8 Rounded Capsule Rays */}
            <path
              d="M12 2v2.8M12 19.2V22M2 12h2.8M19.2 12H22M4.93 4.93l1.98 1.98M17.09 17.09l1.98 1.98M4.93 19.07l1.98-1.98M17.09 6.91l1.98-1.98"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>

        {/* Moon Icon (Clean Matte Silver/Blue: #dbe6ff, Smooth Crescent) */}
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: !isLight ? 1 : 0,
            transform: 'none',
            transition: 'opacity 0.2s ease',
            color: '#dbe6ff',
          }}
          aria-hidden={isLight}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    );
  }

  // Fallback Switch Style
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode (current: ${theme})`}
      onClick={handleClick}
      className={`tp-theme-switch relative inline-flex items-center shrink-0 cursor-pointer select-none transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tp-mid)] ${className}`}
      style={{
        width: '50px',
        height: '26px',
        borderRadius: '999px',
        backgroundColor: isLight ? '#dbe7f9' : '#0a1432',
        border: isLight ? '1px solid rgba(38, 89, 217, 0.25)' : '1px solid rgba(169, 195, 243, 0.22)',
        boxShadow: isLight
          ? 'inset 0 1px 2px rgba(6, 23, 74, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
          : 'inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        touchAction: 'manipulation',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none opacity-60">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: '#ff9323' }}>
          <circle cx="12" cy="12" r="5" fill="currentColor" />
        </svg>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#949494' }}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>

      <span
        className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-200 ease-spring"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#ffffff',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isLight
            ? '0 2px 6px rgba(38, 89, 217, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1)'
            : '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          transform: isLight ? 'translateX(26px)' : 'translateX(3px)',
        }}
      >
        {isLight ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: '#ff9323' }}>
            <circle cx="12" cy="12" r="4.8" fill="currentColor" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ color: '#949494' }}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
          </svg>
        )}
      </span>
    </button>
  );
};

