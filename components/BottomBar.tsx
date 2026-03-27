"use client";

interface BottomBarProps {
  activeTab: "home" | "search" | "list";
  watchlistCount: number;
  onHome: () => void;
  onSearch: () => void;
  onList: () => void;
}

export default function BottomBar({ activeTab, watchlistCount, onHome, onSearch, onList }: BottomBarProps) {
  const items = [
    {
      key: "home" as const,
      label: "Inicio",
      onClick: onHome,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: "search" as const,
      label: "Buscar",
      onClick: onSearch,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      key: "list" as const,
      label: "Mi lista",
      onClick: onList,
      badge: watchlistCount,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v17l-7-3.5L5 21V4a1 1 0 011-1z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="flex-shrink-0 flex items-center justify-around px-2 border-t border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: "60px" }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={item.onClick}
            className={`
              relative flex flex-col items-center justify-center gap-1 px-6 py-2 min-h-[52px] transition-colors rounded-xl
              ${isActive ? "text-white" : "text-[#525252] hover:text-[#A3A3A3]"}
            `}
          >
            {/* Badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-1 right-3 min-w-[18px] h-[18px] rounded-full bg-[#E50914] text-white text-[10px] font-bold flex items-center justify-center px-1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
            {item.icon(isActive)}
            <span className={`text-[10px] font-medium leading-none ${isActive ? "text-white" : "text-[#525252]"}`}>
              {item.label}
            </span>
            {/* Active dot */}
            {isActive && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E50914]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
