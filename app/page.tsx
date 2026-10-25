"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { getActualWithdrawalDate, formatDateToString } from "@/lib/dateUtils";
import {
  Calendar as CalendarIcon,
  Plus,
  Home as HomeIcon,
  Coins,
  User,
  X,
  Trash2,
} from "lucide-react";
import BottomNav from "@/src/components/BottomNav";

interface ExpenseItem {
  id: string;
  title: string;
  expenseType?: "fixed" | "variable";
  amount: number;
  dueDay: number;
  ownership: "common" | "husband" | "wife";
}

interface IncomeEntry {
  id: string;
  category: "給与" | "副業" | "給付金・手当" | "臨時収入" | "その他";
  amount: number;
  day: number; // 日付（1〜31）
  ownership: "husband" | "wife";
}

const INCOME_CATEGORIES: IncomeEntry["category"][] = [
  "給与",
  "副業",
  "給付金・手当",
  "臨時収入",
  "その他",
];

export default function Home() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expenseType, setExpenseType] = useState<"fixed" | "variable">("fixed");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("27");
  const [ownership, setOwnership] = useState<"common" | "husband" | "wife">(
    "common",
  );

  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");

  // 収入データ（統合管理）
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);

  const [incomeModalTarget, setIncomeModalTarget] = useState<
    "husband" | "wife" | null
  >(null);
  const [tempIncomes, setTempIncomes] = useState<IncomeEntry[]>([]);

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<ExpenseItem[]>(
    [],
  );
  const [selectedDayIncomes, setSelectedDayIncomes] = useState<IncomeEntry[]>(
    [],
  );

  const husbandIncomes = incomes.filter((i) => i.ownership === "husband");
  const wifeIncomes = incomes.filter((i) => i.ownership === "wife");

  const husbandIncomeTotal = husbandIncomes.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const wifeIncomeTotal = wifeIncomes.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalIncome = husbandIncomeTotal + wifeIncomeTotal;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (db) {
          const configSnap = await getDoc(doc(db, "settings", "config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            if (data.husbandName) setHusbandName(data.husbandName);
            if (data.wifeName) setWifeName(data.wifeName);
          }

          // 支出取得
          const expQuery = query(
            collection(db, "expenses"),
            orderBy("dueDay", "asc"),
          );
          const expSnapshot = await getDocs(expQuery);
          const expItems: ExpenseItem[] = [];
          expSnapshot.forEach((docItem) => {
            expItems.push({ id: docItem.id, ...docItem.data() } as ExpenseItem);
          });
          setExpenses(expItems);

          // 収入取得
          const incSnapshot = await getDocs(collection(db, "incomes"));
          const incItems: IncomeEntry[] = [];
          incSnapshot.forEach((docItem) => {
            incItems.push({ id: docItem.id, ...docItem.data() } as IncomeEntry);
          });
          setIncomes(incItems);
        }
      } catch (e) {
        console.warn("データ取得エラー:", e);
      }
    };

    fetchData();
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const newItem = {
      title,
      expenseType,
      amount: Number(amount) || 0,
      dueDay: Number(dueDay),
      ownership,
    };

    try {
      if (db) {
        const docRef = await addDoc(collection(db, "expenses"), newItem);
        setExpenses([...expenses, { id: docRef.id, ...newItem }]);
      }
    } catch (e) {
      console.error(e);
    }

    setTitle("");
    setAmount("");
    setIsModalOpen(false);
  };

  const husbandTotal = expenses
    .filter((e) => e.ownership === "husband")
    .reduce((sum, item) => sum + item.amount, 0);

  const wifeTotal = expenses
    .filter((e) => e.ownership === "wife")
    .reduce((sum, item) => sum + item.amount, 0);

  const handleOpenIncomeModal = (target: "husband" | "wife") => {
    setIncomeModalTarget(target);
    const initialList = incomes.filter((i) => i.ownership === target);
    if (initialList.length === 0) {
      setTempIncomes([
        {
          id: Date.now().toString(),
          category: "給与",
          amount: 0,
          day: 25,
          ownership: target,
        },
      ]);
    } else {
      setTempIncomes(JSON.parse(JSON.stringify(initialList)));
    }
  };

  const handleAddIncomeRow = () => {
    if (!incomeModalTarget) return;
    setTempIncomes([
      ...tempIncomes,
      {
        id: Date.now().toString(),
        category: "給与",
        amount: 0,
        day: 25,
        ownership: incomeModalTarget,
      },
    ]);
  };

  const handleRemoveIncomeRow = (id: string) => {
    setTempIncomes(tempIncomes.filter((item) => item.id !== id));
  };

  const handleIncomeChange = (id: string, field: string, value: any) => {
    setTempIncomes(
      tempIncomes.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]:
              field === "amount" || field === "day"
                ? Number(value) || 0
                : value,
          };
        }
        return item;
      }),
    );
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeModalTarget) return;

    try {
      if (db) {
        for (const item of tempIncomes) {
          if (!item.id.length || item.id.length > 15) {
            const docRef = await addDoc(collection(db, "incomes"), {
              category: item.category,
              amount: item.amount,
              day: item.day,
              ownership: incomeModalTarget,
            });
            item.id = docRef.id;
          }
        }
        const otherIncomes = incomes.filter(
          (i) => i.ownership !== incomeModalTarget,
        );
        setIncomes([...otherIncomes, ...tempIncomes]);
      }
    } catch (e) {
      console.error(e);
    }

    setIncomeModalTarget(null);
  };

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month - 1, 1).getDay();

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // 日付ごとの支出マップ
  const expensesByDate: { [key: string]: ExpenseItem[] } = {};
  expenses.forEach((item) => {
    if (item.expenseType === "variable" && (!item.amount || item.amount <= 0)) {
      return;
    }
    let dateStr = "";
    if (item.expenseType === "variable") {
      const formattedDay = String(item.dueDay).padStart(2, "0");
      const formattedMonth = String(currentMonth).padStart(2, "0");
      dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    } else {
      const actualDate = getActualWithdrawalDate(
        currentYear,
        currentMonth,
        item.dueDay,
      );
      dateStr = formatDateToString(actualDate);
    }

    if (!expensesByDate[dateStr]) {
      expensesByDate[dateStr] = [];
    }
    expensesByDate[dateStr].push(item);
  });

  // 日付ごとの収入マップ
  const incomesByDate: { [key: string]: IncomeEntry[] } = {};
  incomes.forEach((item) => {
    const formattedDay = String(item.day || 1).padStart(2, "0");
    const formattedMonth = String(currentMonth).padStart(2, "0");
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    if (!incomesByDate[dateStr]) {
      incomesByDate[dateStr] = [];
    }
    incomesByDate[dateStr].push(item);
  });

  const handleOpenDayDetail = (dateKey: string) => {
    setSelectedDateStr(dateKey);
    setSelectedDayExpenses(expensesByDate[dateKey] || []);
    setSelectedDayIncomes(incomesByDate[dateKey] || []);
  };

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
              className="w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
              style={{ backgroundColor: "#F28FA4" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </header>

          <main className="p-3 space-y-3 w-full">
            <div
              className="flex justify-center items-center gap-4 text-sm font-bold"
              style={{ color: "#79665A" }}
            >
              <button
                onClick={handlePrevMonth}
                className="p-1 cursor-pointer"
                style={{ color: "#A99A8E" }}
              >
                &lt;
              </button>
              <span>
                {currentYear}年 {currentMonth}月
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 cursor-pointer"
                style={{ color: "#A99A8E" }}
              >
                &gt;
              </button>
            </div>

            {/* カレンダー */}
            <div
              className="p-3 rounded-2xl shadow-sm bg-white w-full"
              style={{ border: "1px solid #EAE3DD" }}
            >
              <div className="flex items-center justify-between mb-2 px-0.5">
                <h2
                  className="font-bold text-xs flex items-center gap-1"
                  style={{ color: "#79665A" }}
                >
                  <CalendarIcon
                    className="w-3.5 h-3.5"
                    style={{ color: "#F28FA4" }}
                  />
                  カレンダー
                </h2>
              </div>

              <div
                className="grid grid-cols-7 text-center text-[11px] mb-1 font-semibold w-full"
                style={{ color: "#A99A8E" }}
              >
                <span style={{ color: "#F28FA4" }}>日</span>
                <span>月</span>
                <span>火</span>
                <span>水</span>
                <span>木</span>
                <span>金</span>
                <span style={{ color: "#78B4E2" }}>土</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 w-full">
                {Array.from({ length: firstDay }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="h-[72px] p-1 rounded-lg bg-gray-50/20 border border-gray-100"
                  ></div>
                ))}

                {Array.from({ length: totalDays }).map((_, index) => {
                  const day = index + 1;
                  const formattedDay = String(day).padStart(2, "0");
                  const formattedMonth = String(currentMonth).padStart(2, "0");
                  const dateKey = `${currentYear}-${formattedMonth}-${formattedDay}`;

                  const dayExpenses = expensesByDate[dateKey] || [];
                  const dayIncomes = incomesByDate[dateKey] || [];
                  const dayOfWeek = (firstDay + index) % 7;

                  return (
                    <div
                      key={day}
                      onClick={() => handleOpenDayDetail(dateKey)}
                      className="h-[72px] p-1 rounded-xl flex flex-col justify-between bg-white w-full transition shadow-2xs cursor-pointer hover:bg-gray-50 overflow-hidden"
                      style={{ border: "1px solid #EAE3DD" }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color:
                              dayOfWeek === 0
                                ? "#F28FA4"
                                : dayOfWeek === 6
                                  ? "#78B4E2"
                                  : "#79665A",
                          }}
                        >
                          {day}
                        </span>
                      </div>

                      <div className="space-y-0.5 overflow-hidden w-full my-auto">
                        {/* 収入表示（緑系） */}
                        {dayIncomes.map((inc) => (
                          <div
                            key={inc.id}
                            className="text-[9px] px-0.5 py-0.5 rounded-md leading-none text-center font-extrabold w-full truncate"
                            style={{
                              backgroundColor: "#EEF5EE",
                              color: "#6F9569",
                            }}
                          >
                            +¥{inc.amount.toLocaleString()}
                          </div>
                        ))}
                        {/* 支出表示 */}
                        {dayExpenses.map((item) => (
                          <div
                            key={item.id}
                            className="text-[9px] px-0.5 py-0.5 rounded-md leading-none text-center font-extrabold w-full truncate"
                            style={{
                              backgroundColor:
                                item.ownership === "husband"
                                  ? "#EAF3FA"
                                  : item.ownership === "wife"
                                    ? "#FCE9ED"
                                    : "#F5F2EF",
                              color:
                                item.ownership === "husband"
                                  ? "#78B4E2"
                                  : item.ownership === "wife"
                                    ? "#F28FA4"
                                    : "#79665A",
                            }}
                          >
                            -¥{item.amount.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 収入エリア */}
            <div
              className="p-3.5 rounded-2xl shadow-sm bg-white space-y-2.5 w-full"
              style={{ border: "1px solid #EAE3DD" }}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs" style={{ color: "#79665A" }}>
                  今月の収入
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => handleOpenIncomeModal("husband")}
                  className="p-2.5 rounded-xl text-center w-full cursor-pointer hover:opacity-90 transition"
                  style={{
                    backgroundColor: "#EAF3FA",
                    border: "1px solid #EAE3DD",
                  }}
                >
                  <div
                    className="flex items-center justify-center gap-1 font-bold text-[11px]"
                    style={{ color: "#78B4E2" }}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{husbandName}</span>
                  </div>
                  <div
                    className="text-sm font-extrabold mt-0.5"
                    style={{ color: "#79665A" }}
                  >
                    ¥ {husbandIncomeTotal.toLocaleString()}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenIncomeModal("wife")}
                  className="p-2.5 rounded-xl text-center w-full cursor-pointer hover:opacity-90 transition"
                  style={{
                    backgroundColor: "#FCE9ED",
                    border: "1px solid #EAE3DD",
                  }}
                >
                  <div
                    className="flex items-center justify-center gap-1 font-bold text-[11px]"
                    style={{ color: "#F28FA4" }}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{wifeName}</span>
                  </div>
                  <div
                    className="text-sm font-extrabold mt-0.5"
                    style={{ color: "#79665A" }}
                  >
                    ¥ {wifeIncomeTotal.toLocaleString()}
                  </div>
                </button>
              </div>
            </div>
          </main>
        </div>
        <BottomNav />
      </div>

      {/* 収入入力モーダル（日付プルダウン付き） */}
      {incomeModalTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 relative"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <button
              onClick={() => setIncomeModalTarget(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              {incomeModalTarget === "husband" ? husbandName : wifeName}{" "}
              の収入設定
            </h3>

            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tempIncomes.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl border border-[#EAE3DD] space-y-2"
                  >
                    <div className="flex gap-2">
                      {/* 日付プルダウン */}
                      <select
                        value={item.day || 1}
                        onChange={(e) =>
                          handleIncomeChange(item.id, "day", e.target.value)
                        }
                        className="w-1/3 rounded-lg p-1.5 text-xs outline-none bg-white border border-[#EAE3DD]"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}日
                            </option>
                          ),
                        )}
                      </select>

                      {/* カテゴリ */}
                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleIncomeChange(
                            item.id,
                            "category",
                            e.target.value,
                          )
                        }
                        className="w-2/3 rounded-lg p-1.5 text-xs outline-none bg-white border border-[#EAE3DD]"
                      >
                        {INCOME_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.amount || ""}
                        onChange={(e) =>
                          handleIncomeChange(item.id, "amount", e.target.value)
                        }
                        className="w-full rounded-lg p-1.5 text-xs outline-none bg-white border border-[#EAE3DD]"
                        placeholder="金額 (円)"
                      />
                      {tempIncomes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIncomeRow(item.id)}
                          className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddIncomeRow}
                className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center border border-dashed transition cursor-pointer"
                style={{
                  borderColor: "#F28FA4",
                  color: "#F28FA4",
                  backgroundColor: "#FFF5F7",
                }}
              >
                <Plus className="w-4 h-4" /> 行を追加
              </button>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIncomeModalTarget(null)}
                  className="flex-1 p-2 rounded-xl font-semibold text-xs cursor-pointer"
                  style={{ backgroundColor: "#EAE3DD", color: "#79665A" }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white p-2 rounded-xl font-semibold text-xs shadow-md cursor-pointer"
                  style={{ backgroundColor: "#F28FA4" }}
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 日付詳細ポップアップモーダル */}
      {selectedDateStr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-3 relative"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <button
              onClick={() => setSelectedDateStr(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              {selectedDateStr} の内訳
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDayIncomes.length === 0 &&
              selectedDayExpenses.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-xs">
                  この日の予定はありません。
                </p>
              ) : (
                <>
                  {selectedDayIncomes.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl flex items-center justify-between bg-[#EEF5EE]"
                      style={{ border: "1px solid #EAE3DD" }}
                    >
                      <div>
                        <div
                          className="font-bold text-xs"
                          style={{ color: "#6F9569" }}
                        >
                          [収入] {item.category}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "#A99A8E" }}
                        >
                          {item.ownership === "husband"
                            ? husbandName
                            : wifeName}
                        </div>
                      </div>
                      <div
                        className="font-extrabold text-sm"
                        style={{ color: "#6F9569" }}
                      >
                        +¥ {item.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {selectedDayExpenses.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl flex items-center justify-between bg-white"
                      style={{ border: "1px solid #EAE3DD" }}
                    >
                      <div>
                        <div
                          className="font-bold text-xs"
                          style={{ color: "#79665A" }}
                        >
                          [支出] {item.title}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "#A99A8E" }}
                        >
                          {item.ownership === "husband"
                            ? husbandName
                            : item.ownership === "wife"
                              ? wifeName
                              : "共通"}
                        </div>
                      </div>
                      <div
                        className="font-extrabold text-sm"
                        style={{ color: "#79665A" }}
                      >
                        -¥ {item.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedDateStr(null)}
              className="w-full py-2 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer"
              style={{ backgroundColor: "#F28FA4" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 支出登録用モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-3"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              引き落とし・支出の追加
            </h3>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  項目名
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl p-2 text-xs outline-none bg-white border border-[#EAE3DD]"
                  placeholder="例: 電気代, 食費"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  種別
                </label>
                <div className="flex gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseType"
                      checked={expenseType === "fixed"}
                      onChange={() => setExpenseType("fixed")}
                      className="accent-[#F28FA4]"
                    />
                    <span>固定費</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseType"
                      checked={expenseType === "variable"}
                      onChange={() => setExpenseType("variable")}
                      className="accent-[#F28FA4]"
                    />
                    <span>変動費</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    金額 (円)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl p-2 text-xs outline-none bg-white border border-[#EAE3DD]"
                    placeholder="12000"
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    引き落とし日 (日)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full rounded-xl p-2 text-xs outline-none bg-white border border-[#EAE3DD]"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  負担区分
                </label>
                <select
                  value={ownership}
                  onChange={(e) =>
                    setOwnership(
                      e.target.value as "common" | "husband" | "wife",
                    )
                  }
                  className="w-full rounded-xl p-2 text-xs outline-none bg-white border border-[#EAE3DD]"
                >
                  <option value="common">夫婦共通</option>
                  <option value="husband">{husbandName}・個人</option>
                  <option value="wife">{wifeName}・個人</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 p-2 rounded-xl font-semibold text-xs cursor-pointer bg-[#EAE3DD] text-[#79665A]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white p-2 rounded-xl font-semibold text-xs shadow-md cursor-pointer bg-[#F28FA4]"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
