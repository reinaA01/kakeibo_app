"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  PieChart,
  Settings as SettingsIcon,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur flex justify-around pt-3 pb-5 z-10 text-[11px] w-full"
      style={{
        borderTop: "1px solid #EAE3DD",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)", // 下部の余白をしっかり持たせる
      }}
    >
      <Link
        href="/week"
        className="flex flex-col items-center gap-1 font-bold py-1"
        style={{ color: pathname === "/week" ? "#F28FA4" : "#A99A8E" }}
      >
        <CalendarIcon className="w-5 h-5" />
        <span>週</span>
      </Link>

      <Link
        href="/"
        className="flex flex-col items-center gap-1 font-bold py-1"
        style={{ color: pathname === "/" ? "#F28FA4" : "#A99A8E" }}
      >
        <CalendarIcon className="w-5 h-5" />
        <span>月</span>
      </Link>

      <Link
        href="/analysis"
        className="flex flex-col items-center gap-1 font-bold py-1"
        style={{ color: pathname === "/analysis" ? "#F28FA4" : "#A99A8E" }}
      >
        <PieChart className="w-5 h-5" />
        <span>分析</span>
      </Link>

      <Link
        href="/settings"
        className="flex flex-col items-center gap-1 font-bold py-1"
        style={{ color: pathname === "/settings" ? "#F28FA4" : "#A99A8E" }}
      >
        <SettingsIcon className="w-5 h-5" />
        <span>設定</span>
      </Link>
    </nav>
  );
}
