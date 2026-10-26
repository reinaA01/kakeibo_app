"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
} from "lucide-react";
import BottomNav from "@/src/components/BottomNav";

interface DailyRecord {
  id?: string;
  dateStr: string;
  category: string;
  amount: number;
  memo: string;
}

interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  ownership: "common" | "husband" | "wife";
  expenseType: "fixed" | "variable";
  createdAt?: string; // "YYYY-MM"
}

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

export default function AnalysisPage() {
  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");
  const [commonColor, setCommonColor] = useState("#C9BFB7");
  const [husbandColor, setHusbandColor] = useState("#78B4E2");
  const [wifeColor, setWifeColor] = useState("#F28FA4");

  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: "1", name: "食費", color: "#A6CBAA" },
    { id: "2", name: "日用品費", color: "#E8C170" },
    { id: "3", name: "その他", color: "#B6A4E2" },
  ]);

  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);

  const [selectedYearMonth, setSelectedYearMonth] = useState("2026-10");

  useEffect(() => {
    const localConfig = localStorage.getItem("app_config");
    if (localConfig) {
      try {
        const parsed = JSON.parse(localConfig);
        if (parsed.husbandName) setHusbandName(parsed.husbandName);
        if (parsed.wifeName) setWifeName(parsed.wifeName);
        if (parsed.commonColor) setCommonColor(parsed.commonColor);
        if (parsed.husbandColor) setHusbandColor(parsed.husbandColor);
        if (parsed.wifeColor) setWifeColor(parsed.wifeColor);
        if (parsed.categories) setCategories(parsed.categories);
      } catch (e) {}
    }

    const localExpenses = localStorage.getItem("app_expenses");
    if (localExpenses) {
      try {
        setExpenses(JSON.parse(localExpenses));
      } catch (e) {}
    }

    const fetchData = async () => {
      try {
        if (db) {
          const configSnap = await getDoc(doc(db, "settings", "config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.husbandName) setHusbandName(data.husbandName);
            if (data.wifeName) setWifeName(data.wifeName);
            if (data.commonColor) setCommonColor(data.commonColor);
            if (data.husbandColor) setHusbandColor(data.husbandColor);
            if (data.wifeColor) setWifeColor(data.wifeColor);
            if (data.categories) setCategories(data.categories);
          }

          const recordSnap = await getDocs(collection(db, "weekly_records"));
          const loadedRecords: DailyRecord[] = [];
          recordSnap.forEach((docItem) => {
            loadedRecords.push({
              id: docItem.id,
              ...docItem.data(),
            } as DailyRecord);
          });
          setRecords(loadedRecords);

          const expenseSnap = await getDocs(collection(db, "expenses"));
          const loadedExpenses: FixedExpense[] = [];
          expenseSnap.forEach((docItem) => {
            loadedExpenses.push({
              id: docItem.id,
              ...docItem.data(),
            } as FixedExpense);
          });
          if (loadedExpenses.length > 0) {
            setExpenses(loadedExpenses);
            localStorage.setItem(
              "app_expenses",
              JSON.stringify(loadedExpenses),
            );
          }
        }
      } catch (e) {
        console.warn("データ取得失敗:", e);
      }
    };
    fetchData();
  }, []);

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date(2026, 9, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      options.push({ value: `${y}-${m}`, label: `${y}年 ${Number(m)}月` });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();

  const handlePrevMonth = () => {
    const [y, m] = selectedYearMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedYearMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedYearMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedYearMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const [displayYear, displayMonth] = selectedYearMonth.split("-");

  const getBreakdownForMonth = (ym: string) => {
    const monthRecords = records.filter(
      (r) => r.dateStr && r.dateStr.startsWith(ym),
    );

    // 変動費は登録された月 (createdAt) が一致する場合のみ集計対象にする
    const monthExpenses = expenses.filter((ex) => {
      if (ex.expenseType === "variable") {
        return ex.createdAt === ym && ex.amount > 0;
      }
      return true; // 固定費は常時対象
    });

    let commonExpenseTotal = 0;
    let husbandExpenseTotal = 0;
    let wifeExpenseTotal = 0;

    monthExpenses.forEach((ex) => {
      if (ex.ownership === "common")
        commonExpenseTotal += Number(ex.amount) || 0;
      if (ex.ownership === "husband")
        husbandExpenseTotal += Number(ex.amount) || 0;
      if (ex.ownership === "wife") wifeExpenseTotal += Number(ex.amount) || 0;
    });

    const categoryTotals: { [key: string]: number } = {};
    categories.forEach((cat) => {
      categoryTotals[cat.name] = 0;
    });

    monthRecords.forEach((r) => {
      if (categoryTotals[r.category] !== undefined) {
        categoryTotals[r.category] += Number(r.amount) || 0;
      } else {
        categoryTotals[r.category] = Number(r.amount) || 0;
      }
    });

    const items = [
      {
        label: "共通",
        amount: commonExpenseTotal,
        color: commonColor,
        icon: Tag,
      },
      {
        label: husbandName,
        amount: husbandExpenseTotal,
        color: husbandColor,
        icon: Tag,
      },
      {
        label: wifeName,
        amount: wifeExpenseTotal,
        color: wifeColor,
        icon: Tag,
      },
    ];

    categories.forEach((cat) => {
      items.push({
        label: cat.name,
        amount: categoryTotals[cat.name] || 0,
        color: cat.color,
        icon: Tag,
      });
    });

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const withPercent = items.map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.amount / total) * 100) : 0,
    }));

    return { items: withPercent, total };
  };

  const currentMonthData = getBreakdownForMonth(selectedYearMonth);
  const totalAmount = currentMonthData.total;
  const breakdownData = currentMonthData.items;

  let cumulativePercent = 0;
  const pieSlices = breakdownData.map((item) => {
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += item.percent;
    const endAngle = (cumulativePercent / 100) * 360;
    return { ...item, startAngle, endAngle };
  });

  const getMonthlyHistory = () => {
    const history = [];
    const [y, m] = selectedYearMonth.split("-").map(Number);
    for (let i = 0; i < 6; i++) {
      const d = new Date(y, m - 1 - i, 1);
      const targetYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = `${d.getMonth() + 1}月`;

      const monthData = getBreakdownForMonth(targetYM);

      history.push({
        month: monthLabel,
        isCurrent: targetYM === selectedYearMonth,
        total: monthData.total,
        items: monthData.items,
      });
    }
    return history;
  };

  const monthlyHistory = getMonthlyHistory();

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
            <div className="w-8 h-8" />
          </header>

          <main className="p-3 space-y-3 w-full">
            <div
              className="flex justify-center items-center gap-3 text-sm font-bold"
              style={{ color: "#79665A" }}
            >
              <ChevronLeft
                onClick={handlePrevMonth}
                className="w-4 h-4 cursor-pointer hover:opacity-70 transition"
                style={{ color: "#A99A8E" }}
              />
              <div
                className="relative flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-xs cursor-pointer"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <span>
                  {displayYear}年 {Number(displayMonth)}月
                </span>
                <ChevronDown
                  className="w-3.5 h-3.5"
                  style={{ color: "#A99A8E" }}
                />
                <select
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <ChevronRight
                onClick={handleNextMonth}
                className="w-4 h-4 cursor-pointer hover:opacity-70 transition"
                style={{ color: "#A99A8E" }}
              />
            </div>

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
                      if (slice.percent === 0) return null;
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

                <div className="flex-1 space-y-1.5 max-h-40 overflow-y-auto">
                  {breakdownData.map((item, idx) => {
                    return (
                      <div
                        key={idx}
                        className="p-1.5 rounded-xl flex items-center justify-between text-[11px]"
                        style={{
                          backgroundColor: "#FFFCF9",
                          border: "1px solid #EAE3DD",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: item.color }}
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
                          (選択中)
                        </span>
                      )}
                    </div>

                    <div className="flex-1 mx-2 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                      {item.items.map((sub, sIdx) => {
                        if (sub.amount <= 0 || item.total === 0) return null;
                        const widthRatio = (sub.amount / item.total) * 100;
                        return (
                          <div
                            key={sIdx}
                            className="h-full"
                            style={{
                              width: `${widthRatio}%`,
                              backgroundColor: sub.color,
                            }}
                          />
                        );
                      })}
                    </div>

                    <div
                      className="flex items-center gap-1 font-extrabold text-xs"
                      style={{ color: "#79665A" }}
                    >
                      <span>¥ {item.total.toLocaleString()}</span>
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
