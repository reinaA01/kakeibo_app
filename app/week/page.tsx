"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Calendar as CalendarIcon,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  Utensils,
  ShoppingBag,
  BarChart2,
  Plus,
} from "lucide-react";
import BottomNav from "@/src/components/BottomNav";

export default function WeekPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 設定データ（Firestoreより取得）
  const [weeklyBudget, setWeeklyBudget] = useState(30000);
  const [foodTarget, setFoodTarget] = useState(20000);
  const [dailyTarget, setDailyTarget] = useState(10000);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (db) {
          const docRef = doc(db, "settings", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.weeklyBudget) setWeeklyBudget(data.weeklyBudget);
            if (data.foodTarget) setFoodTarget(data.foodTarget);
            if (data.dailyTarget) setDailyTarget(data.dailyTarget);
          }
        }
      } catch (e) {
        console.warn("設定の取得失敗:", e);
      }
    };
    fetchConfig();
  }, []);

  const sampleWeeklyData = [
    { date: "10/20", day: "月", dayColor: "#79665A", amount: 4320 },
    { date: "10/21", day: "火", dayColor: "#78B4E2", amount: 2180 },
    { date: "10/22", day: "水", dayColor: "#79665A", amount: 3960 },
    { date: "10/23", day: "木", dayColor: "#78B4E2", amount: 1780 },
    { date: "10/24", day: "金", dayColor: "#79665A", amount: 2640 },
    { date: "10/25", day: "土", dayColor: "#78B4E2", amount: 1980 },
    { date: "10/26", day: "日", dayColor: "#F28FA4", amount: 3120 },
  ];

  const totalWeeklySpent = sampleWeeklyData.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const remainingBudget = weeklyBudget - totalWeeklySpent;

  const foodTotal = 14060;
  const dailyTotal = 6940;

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
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md transition"
              style={{ backgroundColor: "#F28FA4" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </header>

          <main className="p-3 space-y-3 w-full">
            {/* 今週の残り カード（設定データと連動） */}
            <div
              className="p-4 rounded-2xl shadow-sm text-center relative w-full"
              style={{
                backgroundColor: "#FDF4F4",
                border: "1px solid #EAE3DD",
              }}
            >
              <div className="flex justify-between items-center px-2">
                <div className="w-12 h-12 relative flex-shrink-0">
                  <Image
                    src="/piggy-bank.png"
                    alt="貯金箱"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>

                <div className="flex-1">
                  <div
                    className="text-[11px] font-medium"
                    style={{ color: "#79665A" }}
                  >
                    今週の残り
                  </div>
                  <div className="flex justify-center items-center gap-2 my-0.5">
                    <ChevronLeft
                      className="w-4 h-4 cursor-pointer"
                      style={{ color: "#A99A8E" }}
                    />
                    <span
                      className="text-2xl font-extrabold tracking-tight"
                      style={{ color: "#79665A" }}
                    >
                      ¥ {remainingBudget.toLocaleString()}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 cursor-pointer"
                      style={{ color: "#A99A8E" }}
                    />
                  </div>
                  <div className="text-[10px]" style={{ color: "#A99A8E" }}>
                    10月20日（月）〜10月26日（日）
                  </div>
                </div>

                <div className="w-6 h-6 relative flex-shrink-0">
                  <Image
                    src="/flower-1.png"
                    alt="花"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="w-full h-2 rounded-full mt-3 overflow-hidden bg-white/80">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (totalWeeklySpent / weeklyBudget) * 100))}%`,
                    backgroundColor: "#F28FA4",
                  }}
                ></div>
              </div>

              <div
                className="text-[10px] mt-2 font-medium"
                style={{ color: "#79665A" }}
              >
                今週の生活費の合計：
                <span className="font-bold">
                  ¥ {totalWeeklySpent.toLocaleString()}
                </span>{" "}
                / 予算 ¥{weeklyBudget.toLocaleString()}
              </div>
            </div>

            {/* 今週の生活費 */}
            <div className="space-y-2 w-full">
              <div
                className="flex items-center gap-1 font-bold text-xs px-1"
                style={{ color: "#79665A" }}
              >
                <CalendarIcon
                  className="w-3.5 h-3.5"
                  style={{ color: "#F28FA4" }}
                />
                <span>今週の生活費</span>
              </div>

              <div className="space-y-1.5 w-full">
                {sampleWeeklyData.map((item, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-xl bg-white shadow-xs flex items-center justify-between w-full"
                    style={{ border: "1px solid #EAE3DD" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="text-center w-12 pr-2"
                        style={{ borderRight: "1px solid #EAE3DD" }}
                      >
                        <div
                          className="text-[11px] font-bold"
                          style={{ color: "#79665A" }}
                        >
                          {item.date}
                        </div>
                        <div
                          className="text-[10px] font-bold"
                          style={{ color: item.dayColor }}
                        >
                          （{item.day}）
                        </div>
                      </div>
                      <div
                        className="font-extrabold text-xs"
                        style={{ color: "#79665A" }}
                      >
                        ¥ {item.amount.toLocaleString()}
                      </div>
                    </div>
                    <ChevronRight
                      className="w-3.5 h-3.5 ml-1"
                      style={{ color: "#A99A8E" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* カテゴリ合計（目標額を連動） */}
            <div
              className="p-3.5 rounded-2xl bg-white shadow-sm space-y-2.5 w-full"
              style={{ border: "1px solid #EAE3DD" }}
            >
              <div className="flex justify-between items-center">
                <div
                  className="flex items-center gap-1 font-bold text-xs"
                  style={{ color: "#79665A" }}
                >
                  <BarChart2
                    className="w-3.5 h-3.5"
                    style={{ color: "#79665A" }}
                  />
                  <span>今週のカテゴリ合計</span>
                </div>
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

              <div className="grid grid-cols-2 gap-2.5 w-full">
                {/* 食費 */}
                <div
                  className="p-2.5 rounded-xl space-y-1.5"
                  style={{
                    backgroundColor: "#EEF5EE",
                    border: "1px solid #EAE3DD",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#FFFFFF", color: "#A6CBAA" }}
                    >
                      <Utensils className="w-3 h-3" />
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: "#79665A" }}
                      >
                        食費
                      </div>
                      <div
                        className="text-xs font-extrabold"
                        style={{ color: "#79665A" }}
                      >
                        ¥ {foodTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#F0ECEA" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (foodTotal / foodTarget) * 100)}%`,
                        backgroundColor: "#A6CBAA",
                      }}
                    ></div>
                  </div>
                  <div
                    className="flex justify-between text-[9px]"
                    style={{ color: "#A99A8E" }}
                  >
                    <span>目安 ¥{foodTarget.toLocaleString()}</span>
                    <span>
                      残り ¥
                      {Math.max(0, foodTarget - foodTotal).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 日用品費 */}
                <div
                  className="p-2.5 rounded-xl space-y-1.5"
                  style={{
                    backgroundColor: "#FFF5E5",
                    border: "1px solid #EAE3DD",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#FFFFFF", color: "#F5C36B" }}
                    >
                      <ShoppingBag className="w-3 h-3" />
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: "#79665A" }}
                      >
                        日用品費
                      </div>
                      <div
                        className="text-xs font-extrabold"
                        style={{ color: "#79665A" }}
                      >
                        ¥ {dailyTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#F0ECEA" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dailyTotal / dailyTarget) * 100)}%`,
                        backgroundColor: "#F5C36B",
                      }}
                    ></div>
                  </div>
                  <div
                    className="flex justify-between text-[9px]"
                    style={{ color: "#A99A8E" }}
                  >
                    <span>目安 ¥{dailyTarget.toLocaleString()}</span>
                    <span>
                      残り ¥
                      {Math.max(0, dailyTarget - dailyTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
