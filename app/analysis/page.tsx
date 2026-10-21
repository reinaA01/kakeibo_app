"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Utensils,
  ShoppingBag,
  Star,
  ChevronDown,
} from "lucide-react";
import BottomNav from "@/src/components/BottomNav";

export default function AnalysisPage() {
  const [toggleMode, setToggleMode] = useState<"expense" | "category">(
    "expense",
  );

  // 表示名
  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (db) {
          const configSnap = await getDoc(doc(db, "settings", "config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.husbandName) setHusbandName(data.husbandName);
            if (data.wifeName) setWifeName(data.wifeName);
          }
        }
      } catch (e) {
        console.warn("設定の取得失敗:", e);
      }
    };
    fetchConfig();
  }, []);

  const totalAmount = 71550;

  const breakdownData = [
    {
      label: "共通",
      amount: 14260,
      percent: 20,
      color: "#C9BFB7",
      bg: "#F5F2EF",
      icon: Users,
    },
    {
      label: husbandName,
      amount: 16430,
      percent: 22,
      color: "#78B4E2",
      bg: "#EAF3FA",
      icon: User,
    },
    {
      label: wifeName,
      amount: 12380,
      percent: 17,
      color: "#F28FA4",
      bg: "#FCE9ED",
      icon: User,
    },
    {
      label: "食費",
      amount: 12860,
      percent: 18,
      color: "#A6CBAA",
      bg: "#EEF5EE",
      icon: Utensils,
    },
    {
      label: "日用品費",
      amount: 10720,
      percent: 15,
      color: "#F5C36B",
      bg: "#FFF5E5",
      icon: ShoppingBag,
    },
    {
      label: "その他",
      amount: 8490,
      percent: 12,
      color: "#B6A4E2",
      bg: "#F3EFFA",
      icon: Star,
    },
  ];

  const monthlyHistory = [
    { month: "10月", isCurrent: true, total: 71550 },
    { month: "9月", isCurrent: false, total: 68320 },
    { month: "8月", isCurrent: false, total: 62780 },
    { month: "7月", isCurrent: false, total: 58460 },
    { month: "6月", isCurrent: false, total: 54230 },
    { month: "5月", isCurrent: false, total: 49820 },
  ];

  let cumulativePercent = 0;
  const pieSlices = breakdownData.map((item) => {
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += item.percent;
    const endAngle = (cumulativePercent / 100) * 360;
    return { ...item, startAngle, endAngle };
  });

  return (
    <div
      className="w-full min-h-screen pb-20 relative font-sans text-xs"
      style={{ backgroundColor: "#FFFCF9", color: "#79665A" }}
    >
      <div className="w-full max-w-lg mx-auto min-h-screen relative flex flex-col justify-between">
        <div>
          <header
            className="flex justify-between items-center px-4 h-14 bg-white/90 backdrop-blur sticky top-0 z-10 w-full"
            style={{ borderBottom: "1px solid #EAE3DD" }}
          >
            <div
              className="flex items-center gap-1.5 text-base font-bold"
              style={{ color: "#79665A" }}
            >
              <HomeIcon className="w-4 h-4" style={{ color: "#F28FA4" }} />
              <span>家計簿</span>
            </div>
            <div
              className="w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md"
              style={{ backgroundColor: "#F28FA4" }}
            >
              ＋
            </div>
          </header>

          <main className="p-3 space-y-3 w-full">
            <div
              className="flex justify-center items-center gap-3 text-sm font-bold"
              style={{ color: "#79665A" }}
            >
              <ChevronLeft
                className="w-4 h-4 cursor-pointer"
                style={{ color: "#A99A8E" }}
              />
              <div
                className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-xs"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <span>2026年 10月</span>
                <ChevronDown
                  className="w-3.5 h-3.5"
                  style={{ color: "#A99A8E" }}
                />
              </div>
              <ChevronRight
                className="w-4 h-4 cursor-pointer"
                style={{ color: "#A99A8E" }}
              />
            </div>

            {/* 今月の支出の内訳 */}
            <div
              className="p-3.5 rounded-2xl bg-white shadow-sm space-y-3 w-full"
              style={{ border: "1px solid #EAE3DD" }}
            >
              <div className="flex justify-between items-center">
                <h2
                  className="font-bold text-xs flex items-center gap-1"
                  style={{ color: "#79665A" }}
                >
                  📊 <span>今月の支出の内訳</span>
                </h2>
                <div className="w-6 h-6 relative flex-shrink-0">
                  <Image
                    src="/flower-2.png"
                    alt="花"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full transform -rotate-90"
                  >
                    {pieSlices.map((slice, idx) => {
                      const x1 =
                        50 + 40 * Math.cos((Math.PI * slice.startAngle) / 180);
                      const y1 =
                        50 + 40 * Math.sin((Math.PI * slice.startAngle) / 180);
                      const x2 =
                        50 + 40 * Math.cos((Math.PI * slice.endAngle) / 180);
                      const y2 =
                        50 + 40 * Math.sin((Math.PI * slice.endAngle) / 180);
                      const largeArcFlag = slice.percent > 50 ? 1 : 0;
                      const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                      return <path key={idx} d={pathData} fill={slice.color} />;
                    })}
                    <circle cx="50" cy="50" r="24" fill="#FFFFFF" />
                  </svg>

                  <div className="absolute text-center">
                    <div className="text-[9px]" style={{ color: "#A99A8E" }}>
                      合計
                    </div>
                    <div
                      className="text-xs font-extrabold"
                      style={{ color: "#79665A" }}
                    >
                      ¥{totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  {breakdownData.map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={idx}
                        className="p-1.5 rounded-xl flex items-center justify-between text-[11px]"
                        style={{
                          backgroundColor: item.bg,
                          border: "1px solid #EAE3DD",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <IconComponent
                            className="w-3.5 h-3.5"
                            style={{ color: item.color }}
                          />
                          <span
                            className="font-semibold"
                            style={{ color: "#79665A" }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-extrabold"
                            style={{ color: "#79665A" }}
                          >
                            ¥ {item.amount.toLocaleString()}
                          </span>
                          <span
                            className="text-[10px] w-6 text-right"
                            style={{ color: "#A99A8E" }}
                          >
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 月ごとの支出の推移 */}
            <div
              className="p-3.5 rounded-2xl bg-white shadow-sm space-y-3 w-full"
              style={{ border: "1px solid #EAE3DD" }}
            >
              <div className="flex justify-between items-center">
                <h2
                  className="font-bold text-xs flex items-center gap-1"
                  style={{ color: "#79665A" }}
                >
                  📅 <span>月ごとの支出の推移</span>
                </h2>

                <div className="bg-gray-100 p-0.5 rounded-full flex text-[10px] font-bold">
                  <button
                    onClick={() => setToggleMode("expense")}
                    className={`px-2.5 py-0.5 rounded-full transition-all ${
                      toggleMode === "expense"
                        ? "text-white shadow-xs"
                        : "text-[#A99A8E]"
                    }`}
                    style={{
                      backgroundColor:
                        toggleMode === "expense" ? "#F28FA4" : "transparent",
                    }}
                  >
                    支出
                  </button>
                  <button
                    onClick={() => setToggleMode("category")}
                    className={`px-2.5 py-0.5 rounded-full transition-all ${
                      toggleMode === "category"
                        ? "text-white shadow-xs"
                        : "text-[#A99A8E]"
                    }`}
                    style={{
                      backgroundColor:
                        toggleMode === "category" ? "#F28FA4" : "transparent",
                    }}
                  >
                    カテゴリ別
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {monthlyHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white flex items-center justify-between"
                    style={{ border: "1px solid #EAE3DD" }}
                  >
                    <div className="w-12 text-[10px]">
                      <span className="font-bold" style={{ color: "#79665A" }}>
                        {item.month}
                      </span>
                      {item.isCurrent && (
                        <span
                          className="block text-[8px]"
                          style={{ color: "#A99A8E" }}
                        >
                          (今月)
                        </span>
                      )}
                    </div>

                    <div className="flex-1 mx-2 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full"
                        style={{ width: "20%", backgroundColor: "#C9BFB7" }}
                      ></div>
                      <div
                        className="h-full"
                        style={{ width: "22%", backgroundColor: "#78B4E2" }}
                      ></div>
                      <div
                        className="h-full"
                        style={{ width: "17%", backgroundColor: "#F28FA4" }}
                      ></div>
                      <div
                        className="h-full"
                        style={{ width: "18%", backgroundColor: "#A6CBAA" }}
                      ></div>
                      <div
                        className="h-full"
                        style={{ width: "15%", backgroundColor: "#F5C36B" }}
                      ></div>
                      <div
                        className="h-full"
                        style={{ width: "12%", backgroundColor: "#B6A4E2" }}
                      ></div>
                    </div>

                    <div
                      className="flex items-center gap-1 font-extrabold text-xs"
                      style={{ color: "#79665A" }}
                    >
                      <span>¥ {item.total.toLocaleString()}</span>
                      <ChevronRight
                        className="w-3.5 h-3.5"
                        style={{ color: "#A99A8E" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
