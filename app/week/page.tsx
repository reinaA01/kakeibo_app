"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  Calendar as CalendarIcon,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Plus,
  X,
  Trash2,
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

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

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

  return false;
}

export default function WeekPage() {
  const [weeklyBudget, setWeeklyBudget] = useState(30000);
  const [categoryBudgets, setCategoryBudgets] = useState<{
    [key: string]: number;
  }>({
    食費: 20000,
    日用品費: 10000,
  });

  const [commonColor, setCommonColor] = useState("#C9BFB7");
  const [husbandColor, setHusbandColor] = useState("#78B4E2");
  const [wifeColor, setWifeColor] = useState("#F28FA4");
  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");

  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: "1", name: "食費", color: "#A6CBAA" },
    { id: "2", name: "日用品費", color: "#E8C170" },
    { id: "3", name: "その他", color: "#B6A4E2" },
  ]);

  const getFullCategories = (customCats: CategoryItem[]) => {
    const systemCats: CategoryItem[] = [
      { id: "sys-common", name: "共通", color: commonColor, isSystem: true },
      {
        id: "sys-husband",
        name: husbandName,
        color: husbandColor,
        isSystem: true,
      },
      { id: "sys-wife", name: wifeName, color: wifeColor, isSystem: true },
    ];
    const filteredCustom = customCats.filter(
      (c) =>
        !c.isSystem &&
        c.name !== "共通" &&
        c.name !== "夫" &&
        c.name !== "妻" &&
        c.name !== husbandName &&
        c.name !== wifeName,
    );
    return [...systemCats, ...filteredCustom];
  };

  const fullCategories = getFullCategories(categories);

  const customCategoriesOnly = categories.filter(
    (c) =>
      !c.isSystem &&
      c.name !== "共通" &&
      c.name !== "夫" &&
      c.name !== "妻" &&
      c.name !== husbandName &&
      c.name !== wifeName,
  );

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalCategory, setModalCategory] = useState("食費");
  const [modalAmount, setModalAmount] = useState("");
  const [modalMemo, setModalMemo] = useState("");

  const [selectedDateForList, setSelectedDateForList] = useState<string | null>(
    null,
  );
  const [selectedCategoryForList, setSelectedCategoryForList] = useState<
    string | null
  >(null);

  const [records, setRecords] = useState<DailyRecord[]>([]);

  useEffect(() => {
    setCurrentDate(new Date());

    const processConfigData = (parsed: any) => {
      if (parsed.weeklyBudget) setWeeklyBudget(parsed.weeklyBudget);
      if (parsed.categories) {
        setCategories(parsed.categories);
        const validCustomNames = parsed.categories
          .filter(
            (c: CategoryItem) =>
              !c.isSystem &&
              c.name !== "共通" &&
              c.name !== "夫" &&
              c.name !== "妻" &&
              c.name !== parsed.husbandName &&
              c.name !== parsed.wifeName,
          )
          .map((c: CategoryItem) => c.name);

        if (parsed.categoryBudgets) {
          const cleanedBudgets: { [key: string]: number } = {};
          validCustomNames.forEach((name: string) => {
            if (parsed.categoryBudgets[name] !== undefined) {
              cleanedBudgets[name] = parsed.categoryBudgets[name];
            }
          });
          setCategoryBudgets(cleanedBudgets);
        }
      }
      if (parsed.commonColor) setCommonColor(parsed.commonColor);
      if (parsed.husbandColor) setHusbandColor(parsed.husbandColor);
      if (parsed.wifeColor) setWifeColor(parsed.wifeColor);
      if (parsed.husbandName) setHusbandName(parsed.husbandName);
      if (parsed.wifeName) setWifeName(parsed.wifeName);
    };

    const localConfig = localStorage.getItem("app_config");
    if (localConfig) {
      try {
        processConfigData(JSON.parse(localConfig));
      } catch (e) {}
    }

    const fetchData = async () => {
      try {
        if (db) {
          const docRef = doc(db, "settings", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            processConfigData(docSnap.data());
          }

          const q = collection(db, "weekly_records");
          const querySnapshot = await getDocs(q);
          const loaded: DailyRecord[] = [];
          querySnapshot.forEach((docItem) => {
            loaded.push({ id: docItem.id, ...docItem.data() } as DailyRecord);
          });
          setRecords(loaded);
        }
      } catch (e) {
        console.warn("データ取得失敗:", e);
      }
    };
    fetchData();
  }, []);

  if (!currentDate) {
    return null;
  }

  const getMondayOfCurrentWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const currentMonday = getMondayOfCurrentWeek(currentDate);

  const weekDaysConfig = ["月", "火", "水", "木", "金", "土", "日"];
  const sampleWeeklyData = weekDaysConfig.map((dayName, index) => {
    const targetDate = new Date(currentMonday);
    targetDate.setDate(currentMonday.getDate() + index);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const dayNum = targetDate.getDate();
    const dateStr = `${month}/${String(dayNum).padStart(2, "0")}`;
    const fullDateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

    const isSunday = dayName === "日";
    const isSaturday = dayName === "土";
    const isHoliday = isJapaneseHoliday(targetDate);

    let dayColor = "#79665A";
    if (isSaturday) dayColor = "#78B4E2";
    if (isSunday || isHoliday) dayColor = "#F28FA4";

    const dayRecords = records.filter((r) => r.dateStr === fullDateStr);
    const dayTotalAmount = dayRecords.reduce((sum, r) => sum + r.amount, 0);

    return {
      date: dateStr,
      fullDateStr,
      day: dayName,
      dayColor,
      amount: dayTotalAmount,
    };
  });

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleOpenAddModal = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setModalDate(`${y}-${m}-${d}`);
    setModalCategory(
      fullCategories.length > 0 ? fullCategories[0].name : "食費",
    );
    setModalAmount("");
    setModalMemo("");
    setIsAddModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAmount || !modalDate) return;

    const newRecord: DailyRecord = {
      dateStr: modalDate,
      category: modalCategory,
      amount: Number(modalAmount),
      memo: modalMemo,
    };

    try {
      if (db) {
        const docRef = await addDoc(
          collection(db, "weekly_records"),
          newRecord,
        );
        setRecords([...records, { id: docRef.id, ...newRecord }]);
      }
    } catch (e) {
      console.error("保存エラー:", e);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteRecord = async (id?: string) => {
    if (!id) return;
    try {
      if (db) {
        await deleteDoc(doc(db, "weekly_records", id));
        setRecords(records.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error("削除エラー:", e);
    }
  };

  const sunday = new Date(currentMonday);
  sunday.setDate(currentMonday.getDate() + 6);
  const weekRangeStr = `${currentMonday.getMonth() + 1}月${currentMonday.getDate()}日（月）〜 ${sunday.getMonth() + 1}月${sunday.getDate()}日（日）`;

  const totalWeeklySpent = sampleWeeklyData.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const remainingBudget = weeklyBudget - totalWeeklySpent;

  const selectedDayRecords = selectedDateForList
    ? records.filter((r) => r.dateStr === selectedDateForList)
    : [];

  const selectedCategoryRecords = selectedCategoryForList
    ? records.filter((r) => r.category === selectedCategoryForList)
    : [];

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
              onClick={handleOpenAddModal}
              className="w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
              style={{ backgroundColor: "#F28FA4" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </header>

          <main className="p-3 space-y-3 w-full">
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
                      onClick={handlePrevWeek}
                      className="w-4 h-4 cursor-pointer hover:opacity-70 transition"
                      style={{ color: "#A99A8E" }}
                    />
                    <span
                      className="text-2xl font-extrabold tracking-tight"
                      style={{ color: "#79665A" }}
                    >
                      ¥ {remainingBudget.toLocaleString()}
                    </span>
                    <ChevronRight
                      onClick={handleNextWeek}
                      className="w-4 h-4 cursor-pointer hover:opacity-70 transition"
                      style={{ color: "#A99A8E" }}
                    />
                  </div>
                  <div className="text-[10px]" style={{ color: "#A99A8E" }}>
                    {weekRangeStr}
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
                    onClick={() => setSelectedDateForList(item.fullDateStr)}
                    className="p-2.5 rounded-xl bg-white shadow-xs flex items-center justify-between w-full cursor-pointer hover:bg-gray-50 transition"
                    style={{ border: "1px solid #EAE3DD" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="text-center w-12 pr-2"
                        style={{ borderRight: "1px solid #EAE3DD" }}
                      >
                        <div
                          className="text-[11px] font-bold"
                          style={{ color: item.dayColor }}
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
                  <span>今週のカテゴリ合計（クリックで一覧表示）</span>
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
                {customCategoriesOnly.map((cat) => {
                  const catTotal = records
                    .filter((r) => r.category === cat.name)
                    .reduce((sum, r) => sum + r.amount, 0);
                  const target =
                    categoryBudgets[cat.name] !== undefined
                      ? categoryBudgets[cat.name]
                      : 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryForList(cat.name)}
                      className="p-2.5 rounded-xl space-y-1.5 cursor-pointer hover:bg-gray-50 transition"
                      style={{
                        backgroundColor: "#FFFCF9",
                        border: "1px solid #EAE3DD",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shadow-2xs"
                          style={{
                            backgroundColor: cat.color,
                            color: "#FFFFFF",
                          }}
                        >
                          <Tag className="w-3 h-3" />
                        </div>
                        <div>
                          <div
                            className="text-[10px] font-bold"
                            style={{ color: "#79665A" }}
                          >
                            {cat.name}
                          </div>
                          <div
                            className="text-xs font-extrabold"
                            style={{ color: "#79665A" }}
                          >
                            ¥ {catTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#F0ECEA" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${target > 0 ? Math.min(100, (catTotal / target) * 100) : 0}%`,
                            backgroundColor: cat.color,
                          }}
                        ></div>
                      </div>
                      <div
                        className="flex justify-between text-[9px]"
                        style={{ color: "#A99A8E" }}
                      >
                        <span>目安 ¥{target.toLocaleString()}</span>
                        <span>
                          残り ¥
                          {Math.max(0, target - catTotal).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>

        <BottomNav />
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 relative"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              支出の追加
            </h3>

            <form onSubmit={handleSaveRecord} className="space-y-3">
              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  日付
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-base outline-none bg-white border border-[#EAE3DD]"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  カテゴリ
                </label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-base outline-none bg-white border border-[#EAE3DD]"
                >
                  {fullCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  金額 (円)
                </label>
                <input
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-base outline-none bg-white border border-[#EAE3DD]"
                  placeholder="例: 1500"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  メモ
                </label>
                <input
                  type="text"
                  value={modalMemo}
                  onChange={(e) => setModalMemo(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-base outline-none bg-white border border-[#EAE3DD]"
                  placeholder="例: スーパーでの買い物"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 p-2.5 rounded-xl font-semibold text-xs cursor-pointer bg-[#EAE3DD] text-[#79665A]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white p-2.5 rounded-xl font-semibold text-xs shadow-md cursor-pointer bg-[#F28FA4]"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDateForList !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 relative"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <button
              onClick={() => setSelectedDateForList(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              {selectedDateForList} の支出一覧
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDayRecords.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-xs">
                  この日の記録はありません。
                </p>
              ) : (
                selectedDayRecords.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl flex items-center justify-between bg-[#FFFCF9]"
                    style={{ border: "1px solid #EAE3DD" }}
                  >
                    <div>
                      <div
                        className="font-bold text-xs"
                        style={{ color: "#79665A" }}
                      >
                        [{item.category}] ¥ {item.amount.toLocaleString()}
                      </div>
                      {item.memo && (
                        <div
                          className="text-[10px]"
                          style={{ color: "#A99A8E" }}
                        >
                          {item.memo}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDateForList(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer"
              style={{ backgroundColor: "#F28FA4" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {selectedCategoryForList !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 relative"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <button
              onClick={() => setSelectedCategoryForList(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              「{selectedCategoryForList}」の支出一覧
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedCategoryRecords.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-xs">
                  このカテゴリの記録はありません。
                </p>
              ) : (
                selectedCategoryRecords.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl flex items-center justify-between bg-[#FFFCF9]"
                    style={{ border: "1px solid #EAE3DD" }}
                  >
                    <div>
                      <div className="text-[10px]" style={{ color: "#A99A8E" }}>
                        {item.dateStr}
                      </div>
                      <div
                        className="font-bold text-xs"
                        style={{ color: "#79665A" }}
                      >
                        ¥ {item.amount.toLocaleString()}
                        {item.memo && (
                          <span className="font-normal ml-1">
                            ({item.memo})
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategoryForList(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer"
              style={{ backgroundColor: "#F28FA4" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
