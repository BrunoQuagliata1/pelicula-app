"use client";

import { House, MagnifyingGlass, BookmarkSimple, Bookmark } from "@phosphor-icons/react";

interface BottomBarProps {
  activeTab: "home" | "search" | "list";
  watchlistCount: number;
  onHome: () => void;
  onSearch: () => void;
  onList: () => void;
}

export default function BottomBar({ activeTab, watchlistCount, onHome, onSearch, onList }: BottomBarProps) {
  const items = [
    { key: "home" as const, label: "Inicio", onClick: onHome,
      Icon: House },
    { key: "search" as const, label: "Buscar", onClick: onSearch,
      Icon: MagnifyingGlass },
    { key: "list" as const, label: "Mi lista", onClick: onList,
      badge: watchlistCount, Icon: BookmarkSimple },
  ];

  return (
    <nav
      className="flex-shrink-0 flex items-center justify-around border-t bg-[#080808]"
      style={{
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        paddingTop: "8px",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {items.map(({ key, label, onClick, badge, Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={onClick}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full"
            style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}
          >
            {badge !== undefined && badge > 0 && (
              <span
                className="absolute top-0 right-6 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            <Icon size={22} weight={isActive ? "fill" : "regular"} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
