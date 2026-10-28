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
  deleteDoc,
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
  expenseType?: "fixed" | "variable" | "one-time";
  amount: number;
  dueDay: number | "end";
  ownership: "common" | "husband" | "wife";
  confirmDay?: number | null;
  startYM?: string;
  endYM?: string;
  createdAt?: string;
}

interface IncomeEntry {
  id: string;
  category: "給与" | "副業" | "給付金・手当" | "臨時収入" | "その他";
  amount: number;
  day: number;
  ownership: "husband" | "wife";
  createdAt?: string; // 登録された年月 ("YYYY-MM")
}

const INCOME_CATEGORIES: IncomeEntry["category"][] = [
  "給与",
  "副業",
  "給付金・手当",
  "臨時収入",
  "その他",
];

// 日本の祝日判定
function isJapaneseHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const fixedHolidays: { [key: string]: boolean } = {
    "1-1": true,
    "2-11": true,
    "2-23": true,
    "4-29": true,
    "5-3": true,
    "5-4": true,
    "5-5": true,
    "8-11": true,
    "9-23": true,
    "11-3": true,
    "11-23": true,
  };

  if (fixedHolidays[`${month}-${day}`]) {
    return true;
  }

  if (year === 2026) {
    if (month === 1 && day === 12) return true;
    if (month === 3 && day === 20) return true;
    if (month === 7 && day === 20) return true;
    if (month === 9 && day === 21) return true;
    if (month === 10 && day === 12) return true;
  }

  if (year === 2027) {
    if (month === 1 && day === 11) return true;
    if (month === 3 && day === 21) return true;
    if (month === 3 && day === 22) return true;
    if (month === 5 && day === 3) return true;
    if (month === 5 && day === 4) return true;
    if (month === 5 && day === 5) return true;
    if (month === 7 && day === 19) return true;
    if (month === 9 && day === 20) return true;
    if (month === 11 && day === 3) return true;
    if (month === 11 && day === 23) return true;
  }

  return false;
}

// 平日の末日を計算
function getBusinessEndOfMonth(year: number, month: number): number {
  let date = new Date(year, month, 0);
  while (
    date.getDay() === 0 ||
    date.getDay() === 6 ||
    isJapaneseHoliday(date)
  ) {
    date.setDate(date.getDate() - 1);
  }
  return date.getDate();
}

export default function Home() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expenseType, setExpenseType] = useState<
    "fixed" | "variable" | "one-time"
  >("fixed");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState<string>("27");
  const [ownership, setOwnership] = useState<"common" | "husband" | "wife">(
    "common",
  );
  const [confirmDay, setConfirmDay] = useState("20");

  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");

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

  const activeSelectedYM = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // 選択中の月に一致する収入、または日付未設定の既存データを今月分として救済して抽出
  const currentMonthIncomes = incomes.filter((item) => {
    if (!item.createdAt) {
      // 過去の古いデータで createdAt が無いものは2026年10月分として扱う
      return activeSelectedYM === "2026-10";
    }
    return item.createdAt === activeSelectedYM;
  });

  const husbandIncomes = currentMonthIncomes.filter(
    (i) => i.ownership === "husband",
  );
  const wifeIncomes = currentMonthIncomes.filter((i) => i.ownership === "wife");

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
    const localConfig = localStorage.getItem("app_config");
    if (localConfig) {
      try {
        const parsed = JSON.parse(localConfig);
        if (parsed.husbandName) setHusbandName(parsed.husbandName);
        if (parsed.wifeName) setWifeName(parsed.wifeName);
      } catch (e) {}
    }

    const localExpenses = localStorage.getItem("app_expenses");
    if (localExpenses) {
      try {
        setExpenses(JSON.parse(localExpenses));
      } catch (e) {}
    }

    const localIncomes = localStorage.getItem("app_incomes");
    if (localIncomes) {
      try {
        setIncomes(JSON.parse(localIncomes));
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
          }

          const q = query(collection(db, "expenses"), orderBy("dueDay", "asc"));
          const querySnapshot = await getDocs(q);
          const items: ExpenseItem[] = [];
          querySnapshot.forEach((docItem) => {
            items.push({ id: docItem.id, ...docItem.data() } as ExpenseItem);
          });
          if (items.length > 0) {
            setExpenses(items);
            localStorage.setItem("app_expenses", JSON.stringify(items));
          }

          const incSnapshot = await getDocs(collection(db, "incomes"));
          const incItems: IncomeEntry[] = [];
          incSnapshot.forEach((docItem) => {
            incItems.push({ id: docItem.id, ...docItem.data() } as IncomeEntry);
          });
          if (incItems.length > 0) {
            setIncomes(incItems);
            localStorage.setItem("app_incomes", JSON.stringify(incItems));
          }
        }
      } catch (e) {
        console.warn("オフラインモードで動作中:", e);
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

    const parsedDueDay = dueDay === "end" ? "end" : Number(dueDay);

    const newItem: ExpenseItem = {
      id: "",
      title,
      expenseType,
      amount: Number(amount) || 0,
      dueDay: parsedDueDay,
      ownership,
      confirmDay: expenseType === "variable" ? Number(confirmDay) : null,
      createdAt: activeSelectedYM,
    };

    try {
      if (db) {
        const docRef = await addDoc(collection(db, "expenses"), newItem);
        const savedItem = { ...newItem, id: docRef.id };
        const updated = [...expenses, savedItem];
        setExpenses(updated);
        localStorage.setItem("app_expenses", JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    setTitle("");
    setAmount("");
    setIsModalOpen(false);
  };

  const handleDeleteExpenseItem = async (id: string) => {
    if (!confirm("本当にこの支払いを削除しますか？")) return;
    try {
      if (db) {
        await deleteDoc(doc(db, "expenses", id));
      }
      const updated = expenses.filter((item) => item.id !== id);
      setExpenses(updated);
      localStorage.setItem("app_expenses", JSON.stringify(updated));
      setSelectedDayExpenses(
        selectedDayExpenses.filter((item) => item.id !== id),
      );
    } catch (e) {
      console.error("削除エラー:", e);
    }
  };

  const currentMonthFilteredExpenses = expenses.filter((item) => {
    if (item.expenseType === "one-time") {
      return item.createdAt === activeSelectedYM && item.amount > 0;
    }

    if (item.expenseType === "variable" && (!item.amount || item.amount <= 0)) {
      return false;
    }

    if (item.startYM && activeSelectedYM < item.startYM) {
      return false;
    }
    if (item.endYM && activeSelectedYM > item.endYM) {
      return false;
    }

    return true;
  });

  const husbandTotal = currentMonthFilteredExpenses
    .filter((e) => e.ownership === "husband")
    .reduce((sum, item) => sum + item.amount, 0);

  const wifeTotal = currentMonthFilteredExpenses
    .filter((e) => e.ownership === "wife")
    .reduce((sum, item) => sum + item.amount, 0);

  const handleOpenIncomeModal = (target: "husband" | "wife") => {
    setIncomeModalTarget(target);
    const initialList = currentMonthIncomes.filter(
      (i) => i.ownership === target,
    );
    if (initialList.length === 0) {
      setTempIncomes([
        {
          id: Date.now().toString(),
          category: "給与",
          amount: 0,
          day: 25,
          ownership: target,
          createdAt: activeSelectedYM,
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
        createdAt: activeSelectedYM,
      },
    ]);
  };

  const handleRemoveIncomeRow = async (id: string) => {
    try {
      if (db && !id.startsWith("17") && id.length > 15) {
        await deleteDoc(doc(db, "incomes", id));
      }
    } catch (e) {
      console.error(e);
    }
    const updatedTemp = tempIncomes.filter((item) => item.id !== id);
    setTempIncomes(updatedTemp);
  };

  const handleIncomeChange = (
    id: string,
    field: "category" | "amount" | "day",
    value: any,
  ) => {
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
        const otherIncomes = incomes.filter((i) => {
          const iYM = i.createdAt || "2026-10";
          return !(
            i.ownership === incomeModalTarget && iYM === activeSelectedYM
          );
        });

        const oldTargetDbItems = incomes.filter((i) => {
          const iYM = i.createdAt || "2026-10";
          return i.ownership === incomeModalTarget && iYM === activeSelectedYM;
        });
        for (const dbItem of oldTargetDbItems) {
          if (dbItem.id.length > 15 && !dbItem.id.includes("-")) {
            await deleteDoc(doc(db, "incomes", dbItem.id));
          }
        }

        const savedIncomesList = [...otherIncomes];

        for (const item of tempIncomes) {
          if (item.amount > 0) {
            const incomeData = {
              category: item.category,
              amount: item.amount,
              day: item.day || 1,
              ownership: incomeModalTarget,
              createdAt: activeSelectedYM,
            };

            const docRef = await addDoc(collection(db, "incomes"), incomeData);
            savedIncomesList.push({ id: docRef.id, ...incomeData });
          }
        }

        setIncomes(savedIncomesList);
        localStorage.setItem("app_incomes", JSON.stringify(savedIncomesList));
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

  const expensesByDate: { [key: string]: ExpenseItem[] } = {};
  currentMonthFilteredExpenses.forEach((item) => {
    let dateStr = "";
    if (item.expenseType === "variable" || item.expenseType === "one-time") {
      const dayNum =
        item.dueDay === "end"
          ? getBusinessEndOfMonth(currentYear, currentMonth)
          : Number(item.dueDay);
      const formattedDay = String(dayNum).padStart(2, "0");
      const formattedMonth = String(currentMonth).padStart(2, "0");
      dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    } else {
      const targetDay =
        item.dueDay === "end"
          ? getBusinessEndOfMonth(currentYear, currentMonth)
          : Number(item.dueDay);
      const actualDate = getActualWithdrawalDate(
        currentYear,
        currentMonth,
        targetDay,
      );
      dateStr = formatDateToString(actualDate);
    }

    if (!expensesByDate[dateStr]) {
      expensesByDate[dateStr] = [];
    }
    expensesByDate[dateStr].push(item);
  });

  const incomesByDate: { [key: string]: IncomeEntry[] } = {};
  currentMonthIncomes.forEach((item) => {
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

            <div className="grid grid-cols-2 gap-2.5 w-full">
              <div
                className="p-3 rounded-xl shadow-sm text-center w-full"
                style={{
                  backgroundColor: "#EAF3FA",
                  border: "1px solid #EAE3DD",
                }}
              >
                <div
                  className="flex items-center justify-center gap-1 font-bold mb-0.5 text-xs"
                  style={{ color: "#78B4E2" }}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{husbandName}</span>
                </div>
                <div
                  className="text-base font-extrabold"
                  style={{ color: "#79665A" }}
                >
                  ¥ {husbandTotal.toLocaleString()}
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: "#A99A8E" }}
                >
                  今月の引き落とし額
                </div>
              </div>

              <div
                className="p-3 rounded-xl shadow-sm text-center w-full"
                style={{
                  backgroundColor: "#FCE9ED",
                  border: "1px solid #EAE3DD",
                }}
              >
                <div
                  className="flex items-center justify-center gap-1 font-bold mb-0.5 text-xs"
                  style={{ color: "#F28FA4" }}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{wifeName}</span>
                </div>
                <div
                  className="text-base font-extrabold"
                  style={{ color: "#79665A" }}
                >
                  ¥ {wifeTotal.toLocaleString()}
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: "#A99A8E" }}
                >
                  今月の引き落とし額
                </div>
              </div>
            </div>

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
                  今月の支出
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
                  const targetDate = new Date(
                    currentYear,
                    currentMonth - 1,
                    day,
                  );
                  const isHoliday = isJapaneseHoliday(targetDate);

                  const formattedDay = String(day).padStart(2, "0");
                  const formattedMonth = String(currentMonth).padStart(2, "0");
                  const dateKey = `${currentYear}-${formattedMonth}-${formattedDay}`;

                  const dayExpenses = expensesByDate[dateKey] || [];
                  const dayIncomes = incomesByDate[dateKey] || [];
                  const dayOfWeek = (firstDay + index) % 7;

                  let dateColor = "#79665A";
                  if (dayOfWeek === 0 || isHoliday) {
                    dateColor = "#F28FA4";
                  } else if (dayOfWeek === 6) {
                    dateColor = "#78B4E2";
                  }

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
                          style={{ color: dateColor }}
                        >
                          {day}
                        </span>
                      </div>

                      <div className="space-y-0.5 overflow-hidden w-full my-auto">
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
                        {dayExpenses.map((item) => {
                          let bgColor = "#F5F2EF";
                          let textColor = "#79665A";
                          if (item.ownership === "husband") {
                            bgColor = "#EAF3FA";
                            textColor = "#78B4E2";
                          } else if (item.ownership === "wife") {
                            bgColor = "#FCE9ED";
                            textColor = "#F28FA4";
                          }

                          return (
                            <div
                              key={item.id}
                              className="text-[9px] px-0.5 py-0.5 rounded-md leading-none text-center font-extrabold w-full truncate"
                              style={{
                                backgroundColor: bgColor,
                                color: textColor,
                              }}
                              title={`${item.title} ¥${item.amount}`}
                            >
                              -¥{item.amount.toLocaleString()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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

              <div
                className="p-2.5 rounded-xl text-center w-full flex flex-col items-center justify-center"
                style={{
                  backgroundColor: "#EEF5EE",
                  border: "1px solid #EAE3DD",
                }}
              >
                <div
                  className="flex items-center justify-center gap-1 font-bold text-[11px]"
                  style={{ color: "#A6CBAA" }}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>夫婦の収入合計</span>
                </div>
                <div
                  className="text-sm font-extrabold mt-0.5"
                  style={{ color: "#79665A" }}
                >
                  ¥ {totalIncome.toLocaleString()}
                </div>
              </div>
            </div>
          </main>
        </div>

        <BottomNav />
      </div>

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
              {currentYear}年{currentMonth}月 -{" "}
              {incomeModalTarget === "husband" ? husbandName : wifeName}{" "}
              の収入設定
            </h3>

            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tempIncomes.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl border border-[#EAE3DD] space-y-2 relative"
                  >
                    <div className="flex gap-2">
                      <select
                        value={item.day || 1}
                        onChange={(e) =>
                          handleIncomeChange(item.id, "day", e.target.value)
                        }
                        className="w-1/3 rounded-lg p-1.5 text-base outline-none bg-white border border-[#EAE3DD]"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}日
                            </option>
                          ),
                        )}
                      </select>

                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleIncomeChange(
                            item.id,
                            "category",
                            e.target.value,
                          )
                        }
                        className="w-2/3 rounded-lg p-1.5 text-base outline-none bg-white border border-[#EAE3DD]"
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
                        className="w-full rounded-lg p-1.5 text-base outline-none bg-white border border-[#EAE3DD]"
                        placeholder="金額 (円)"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIncomeRow(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                          {item.expenseType === "one-time" && (
                            <span
                              className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold"
                              style={{
                                backgroundColor: "#FCE9ED",
                                color: "#D47A90",
                              }}
                            >
                              単発
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "#A99A8E" }}
                        >
                          区分:{" "}
                          {item.ownership === "husband"
                            ? husbandName
                            : item.ownership === "wife"
                              ? wifeName
                              : "共通"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="font-extrabold text-sm"
                          style={{ color: "#79665A" }}
                        >
                          -¥ {item.amount.toLocaleString()}
                        </div>
                        {item.expenseType === "one-time" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpenseItem(item.id)}
                            className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
                  className="w-full rounded-xl p-2 text-base outline-none bg-white"
                  style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                  placeholder="例: 水道光熱費, クレカ"
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
                <div className="flex gap-3 text-xs font-semibold flex-wrap">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseType"
                      checked={expenseType === "fixed"}
                      onChange={() => setExpenseType("fixed")}
                      className="accent-[#F28FA4]"
                    />
                    <span>固定費</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseType"
                      checked={expenseType === "variable"}
                      onChange={() => setExpenseType("variable")}
                      className="accent-[#F28FA4]"
                    />
                    <span>変動費 (LINE通知)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseType"
                      checked={expenseType === "one-time"}
                      onChange={() => setExpenseType("one-time")}
                      className="accent-[#F28FA4]"
                    />
                    <span>単発</span>
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
                    className="w-full rounded-xl p-2 text-base outline-none bg-white"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    placeholder="10000"
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    {expenseType === "one-time" ? "支払日" : "引き落とし日"}
                  </label>
                  {expenseType === "one-time" ? (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full rounded-xl p-2 text-base outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      required
                    />
                  ) : (
                    <select
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full rounded-xl p-2 text-base outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>
                          {d}日
                        </option>
                      ))}
                      <option value="end">末日</option>
                    </select>
                  )}
                </div>
              </div>

              {expenseType === "variable" && (
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    金額確定日 (LINE通知日: 日)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={confirmDay}
                    onChange={(e) => setConfirmDay(e.target.value)}
                    className="w-full rounded-xl p-2 text-base outline-none bg-amber-50"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    required
                  />
                </div>
              )}

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
                  className="w-full rounded-xl p-2 text-base outline-none bg-white"
                  style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                >
                  <option value="common">共通</option>
                  <option value="husband">{husbandName}</option>
                  <option value="wife">{wifeName}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
