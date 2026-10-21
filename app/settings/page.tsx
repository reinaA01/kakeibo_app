"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Settings as SettingsIcon,
  User,
  Landmark,
  Tag,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import BottomNav from "@/src/components/BottomNav";

type SettingsView = "menu" | "basic" | "payment" | "category";

interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  ownership: "common" | "husband" | "wife";
  expenseType: "fixed" | "variable";
  confirmDay?: number | null;
  createdAt?: Date;
}

interface CategoryItem {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#F28FA4",
  "#78B4E2",
  "#A6CBAA",
  "#F5C36B",
  "#B6A4E2",
  "#C9BFB7",
  "#F6C878",
  "#E6A1C4",
  "#93D5E1",
  "#D7C49E",
];

export default function SettingsPage() {
  const [currentView, setCurrentView] = useState<SettingsView>("menu");

  // --- 基本設定 ---
  const [weeklyBudget, setWeeklyBudget] = useState(30000);
  const [foodTarget, setFoodTarget] = useState(20000);
  const [dailyTarget, setDailyTarget] = useState(10000);
  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");

  const handleFoodTargetChange = (val: number) => {
    setFoodTarget(val);
    setWeeklyBudget(val + dailyTarget);
  };

  const handleDailyTargetChange = (val: number) => {
    setDailyTarget(val);
    setWeeklyBudget(foodTarget + val);
  };

  // --- 引き落とし項目 & 絞り込みフィルター ---
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [filterType, setFilterType] = useState<
    "all" | "fixed" | "variable" | "husband" | "wife" | "common"
  >("all");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDueDay, setExpDueDay] = useState("27");
  const [expOwnership, setExpOwnership] = useState<
    "common" | "husband" | "wife"
  >("common");
  const [expType, setExpType] = useState<"fixed" | "variable">("fixed");
  const [expConfirmDay, setExpConfirmDay] = useState("20");

  // --- カテゴリ ---
  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: "1", name: "食費", color: "#A6CBAA" },
    { id: "2", name: "日用品費", color: "#F5C36B" },
    { id: "3", name: "その他", color: "#B6A4E2" },
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    // 1. ローカルから即時復元
    const localConfig = localStorage.getItem("app_config");
    if (localConfig) {
      try {
        const parsed = JSON.parse(localConfig);
        if (parsed.foodTarget) setFoodTarget(parsed.foodTarget);
        if (parsed.dailyTarget) setDailyTarget(parsed.dailyTarget);
        if (parsed.weeklyBudget) setWeeklyBudget(parsed.weeklyBudget);
        if (parsed.husbandName) setHusbandName(parsed.husbandName);
        if (parsed.wifeName) setWifeName(parsed.wifeName);
      } catch (e) {}
    }

    const localExpenses = localStorage.getItem("app_expenses");
    if (localExpenses) {
      try {
        setFixedExpenses(JSON.parse(localExpenses));
      } catch (e) {}
    }

    // 2. バックグラウンド読み込み
    const initData = async () => {
      try {
        if (db) {
          const docRef = doc(db, "settings", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.foodTarget) setFoodTarget(data.foodTarget);
            if (data.dailyTarget) setDailyTarget(data.dailyTarget);
            if (data.weeklyBudget) setWeeklyBudget(data.weeklyBudget);
            if (data.husbandName) setHusbandName(data.husbandName);
            if (data.wifeName) setWifeName(data.wifeName);
          }

          const querySnapshot = await getDocs(collection(db, "expenses"));
          const items: FixedExpense[] = [];
          querySnapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as FixedExpense);
          });
          if (items.length > 0) {
            setFixedExpenses(items);
            localStorage.setItem("app_expenses", JSON.stringify(items));
          }
        }
      } catch (e) {
        console.warn("オフライン動作中:", e);
      }
    };

    initData();
  }, []);

  const handleSaveBasicConfig = (e: React.FormEvent) => {
    e.preventDefault();

    const configData = {
      weeklyBudget: Number(weeklyBudget),
      foodTarget: Number(foodTarget),
      dailyTarget: Number(dailyTarget),
      husbandName,
      wifeName,
    };

    localStorage.setItem("app_config", JSON.stringify(configData));
    setCurrentView("menu");

    if (db) {
      setDoc(doc(db, "settings", "config"), configData, { merge: true }).catch(
        () => {},
      );
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();

    const tempId = editingExpenseId || Date.now().toString();
    const expenseData = {
      title: expTitle,
      amount: Number(expAmount),
      dueDay: Number(expDueDay),
      ownership: expOwnership,
      expenseType: expType,
      confirmDay: expType === "variable" ? Number(expConfirmDay) : null,
      createdAt: new Date(),
    };

    const newItem: FixedExpense = { id: tempId, ...expenseData };

    let updatedList: FixedExpense[] = [];
    if (editingExpenseId) {
      updatedList = fixedExpenses.map((item) =>
        item.id === editingExpenseId ? newItem : item,
      );
    } else {
      updatedList = [...fixedExpenses, newItem];
    }

    setFixedExpenses(updatedList);
    localStorage.setItem("app_expenses", JSON.stringify(updatedList));

    setIsExpenseModalOpen(false);
    setEditingExpenseId(null);
    setExpTitle("");
    setExpAmount("");

    if (db) {
      if (editingExpenseId) {
        updateDoc(doc(db, "expenses", editingExpenseId), expenseData).catch(
          () => {},
        );
      } else {
        addDoc(collection(db, "expenses"), expenseData)
          .then((res) => {
            const finalUpdated = updatedList.map((item) =>
              item.id === tempId ? { ...item, id: res.id } : item,
            );
            setFixedExpenses(finalUpdated);
            localStorage.setItem("app_expenses", JSON.stringify(finalUpdated));
          })
          .catch(() => {});
      }
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    const updated = fixedExpenses.filter((item) => item.id !== id);
    setFixedExpenses(updated);
    localStorage.setItem("app_expenses", JSON.stringify(updated));

    if (db) {
      deleteDoc(doc(db, "expenses", id)).catch(() => {});
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    setCategories([
      ...categories,
      { id: Date.now().toString(), name: newCatName, color: newCatColor },
    ]);
    setNewCatName("");
    setIsCategoryModalOpen(false);
  };

  const filteredExpenses = fixedExpenses.filter((item) => {
    if (filterType === "fixed") return item.expenseType === "fixed";
    if (filterType === "variable") return item.expenseType === "variable";
    if (filterType === "husband") return item.ownership === "husband";
    if (filterType === "wife") return item.ownership === "wife";
    if (filterType === "common") return item.ownership === "common";
    return true;
  });

  return (
    <div
      className="w-full min-h-screen pb-20 relative font-sans text-xs"
      style={{ backgroundColor: "#FFFCF9", color: "#79665A" }}
    >
      <div className="w-full max-w-lg mx-auto min-h-screen relative flex flex-col justify-between">
        <div>
          <header
            className="flex items-center gap-2 px-4 h-14 bg-white/90 backdrop-blur sticky top-0 z-10 w-full"
            style={{ borderBottom: "1px solid #EAE3DD" }}
          >
            {currentView !== "menu" ? (
              <button
                onClick={() => setCurrentView("menu")}
                className="p-1 flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-4 h-4" style={{ color: "#79665A" }} />
                <span>戻る</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-base font-bold">
                <SettingsIcon
                  className="w-4 h-4"
                  style={{ color: "#79665A" }}
                />
                <span>設定</span>
              </div>
            )}
          </header>

          <main className="p-3 space-y-2.5 w-full">
            {currentView === "menu" && (
              <>
                <button
                  onClick={() => setCurrentView("basic")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition"
                  style={{ border: "1px solid #EAE3DD" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#FCE9ED", color: "#F28FA4" }}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <span
                      className="font-bold text-sm"
                      style={{ color: "#79665A" }}
                    >
                      基本設定
                    </span>
                  </div>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "#A99A8E" }}
                  />
                </button>

                <button
                  onClick={() => setCurrentView("payment")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition"
                  style={{ border: "1px solid #EAE3DD" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#EAF3FA", color: "#78B4E2" }}
                    >
                      <Landmark className="w-4 h-4" />
                    </div>
                    <span
                      className="font-bold text-sm"
                      style={{ color: "#79665A" }}
                    >
                      引き落とし
                    </span>
                  </div>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "#A99A8E" }}
                  />
                </button>

                <button
                  onClick={() => setCurrentView("category")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition"
                  style={{ border: "1px solid #EAE3DD" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#EEF5EE", color: "#6F9569" }}
                    >
                      <Tag className="w-4 h-4" />
                    </div>
                    <span
                      className="font-bold text-sm"
                      style={{ color: "#79665A" }}
                    >
                      カテゴリ
                    </span>
                  </div>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "#A99A8E" }}
                  />
                </button>
              </>
            )}

            {/* 基本設定フォーム */}
            {currentView === "basic" && (
              <form
                onSubmit={handleSaveBasicConfig}
                className="p-4 rounded-2xl bg-white shadow-sm space-y-4"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <h3 className="font-bold text-xs" style={{ color: "#79665A" }}>
                  予算目安の設定
                </h3>

                <div className="space-y-3">
                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: "#A99A8E" }}
                    >
                      食費の週目安 (円)
                    </label>
                    <input
                      type="number"
                      value={foodTarget}
                      onChange={(e) =>
                        handleFoodTargetChange(Number(e.target.value))
                      }
                      className="w-full rounded-xl p-2.5 text-xs outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: "#A99A8E" }}
                    >
                      日用品費の週目安 (円)
                    </label>
                    <input
                      type="number"
                      value={dailyTarget}
                      onChange={(e) =>
                        handleDailyTargetChange(Number(e.target.value))
                      }
                      className="w-full rounded-xl p-2.5 text-xs outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: "#A99A8E" }}
                    >
                      週予算 (自動合算)
                    </label>
                    <input
                      type="number"
                      value={weeklyBudget}
                      readOnly
                      className="w-full rounded-xl p-2.5 text-xs outline-none bg-gray-100 font-bold"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    />
                  </div>

                  <hr style={{ borderColor: "#EAE3DD" }} />

                  <h3
                    className="font-bold text-xs pt-1"
                    style={{ color: "#79665A" }}
                  >
                    プロフィールの変更
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: "#A99A8E" }}
                      >
                        夫の表示名
                      </label>
                      <input
                        type="text"
                        value={husbandName}
                        onChange={(e) => setHusbandName(e.target.value)}
                        className="w-full rounded-xl p-2 text-xs outline-none bg-white"
                        style={{
                          border: "1px solid #EAE3DD",
                          color: "#79665A",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[11px] font-semibold mb-1"
                        style={{ color: "#A99A8E" }}
                      >
                        妻の表示名
                      </label>
                      <input
                        type="text"
                        value={wifeName}
                        onChange={(e) => setWifeName(e.target.value)}
                        className="w-full rounded-xl p-2 text-xs outline-none bg-white"
                        style={{
                          border: "1px solid #EAE3DD",
                          color: "#79665A",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold text-white shadow-md mt-2 transition active:scale-98 cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    設定を保存する
                  </button>
                </div>
              </form>
            )}

            {/* 引き落とし設定 */}
            {currentView === "payment" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span
                    className="font-bold text-xs"
                    style={{ color: "#79665A" }}
                  >
                    登録済みの固定費・引き落とし
                  </span>
                  <button
                    onClick={() => {
                      setEditingExpenseId(null);
                      setExpTitle("");
                      setExpAmount("");
                      setExpType("fixed");
                      setIsExpenseModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>追加</span>
                  </button>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] scrollbar-none">
                  {[
                    { id: "all", label: "すべて" },
                    { id: "fixed", label: "固定費" },
                    { id: "variable", label: "変動費" },
                    { id: "husband", label: husbandName },
                    { id: "wife", label: wifeName },
                    { id: "common", label: "共通" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterType(tab.id as any)}
                      className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
                        filterType === tab.id
                          ? "text-white shadow-xs"
                          : "bg-white text-[#A99A8E]"
                      }`}
                      style={{
                        backgroundColor:
                          filterType === tab.id ? "#79665A" : "#FFFFFF",
                        border: "1px solid #EAE3DD",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredExpenses.length === 0 ? (
                    <div
                      className="p-4 rounded-2xl bg-white text-center text-gray-400"
                      style={{ border: "1px solid #EAE3DD" }}
                    >
                      該当する引き落とし項目がありません。
                    </div>
                  ) : (
                    filteredExpenses.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-white shadow-sm flex items-center justify-between"
                        style={{ border: "1px solid #EAE3DD" }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-bold text-xs"
                              style={{ color: "#79665A" }}
                            >
                              {item.title}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${item.expenseType === "variable" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {item.expenseType === "variable"
                                ? "変動"
                                : "固定"}
                            </span>
                          </div>
                          <div
                            className="text-[10px] space-x-2 mt-0.5"
                            style={{ color: "#A99A8E" }}
                          >
                            <span>引落日: {item.dueDay}日</span>
                            {item.expenseType === "variable" &&
                              item.confirmDay && (
                                <span>(確定日: {item.confirmDay}日)</span>
                              )}
                            <span>
                              (
                              {item.ownership === "husband"
                                ? husbandName
                                : item.ownership === "wife"
                                  ? wifeName
                                  : "共通"}
                              )
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className="font-extrabold text-sm"
                            style={{ color: "#79665A" }}
                          >
                            ¥ {item.amount.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingExpenseId(item.id);
                                setExpTitle(item.title);
                                setExpAmount(String(item.amount));
                                setExpDueDay(String(item.dueDay));
                                setExpOwnership(item.ownership);
                                setExpType(item.expenseType || "fixed");
                                setExpConfirmDay(String(item.confirmDay || 20));
                                setIsExpenseModalOpen(true);
                              }}
                              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                              <Edit2
                                className="w-3.5 h-3.5"
                                style={{ color: "#A99A8E" }}
                              />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* カテゴリ設定 */}
            {currentView === "category" && (
              <div
                className="p-4 rounded-2xl bg-white shadow-sm space-y-3"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <div className="flex justify-between items-center">
                  <h3
                    className="font-bold text-xs"
                    style={{ color: "#79665A" }}
                  >
                    カテゴリ一覧とカラー
                  </h3>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="flex items-center gap-1 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>追加</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-xl flex items-center justify-between"
                      style={{
                        backgroundColor: "#FFFCF9",
                        border: "1px solid #EAE3DD",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-5 h-5 rounded-full shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        ></span>
                        <span
                          className="font-bold text-xs"
                          style={{ color: "#79665A" }}
                        >
                          {cat.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>

        <BottomNav />
      </div>

      {/* モーダル類 */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-3"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              {editingExpenseId
                ? "引き落とし項目の編集"
                : "引き落とし項目の追加"}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-2.5">
              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  項目名
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full rounded-xl p-2 text-xs outline-none bg-white"
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
                <div className="flex gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="expType"
                      checked={expType === "fixed"}
                      onChange={() => setExpType("fixed")}
                      className="accent-[#F28FA4]"
                    />
                    <span>固定費</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="expType"
                      checked={expType === "variable"}
                      onChange={() => setExpType("variable")}
                      className="accent-[#F28FA4]"
                    />
                    <span>変動費 (LINE通知対象)</span>
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
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full rounded-xl p-2 text-xs outline-none bg-white"
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
                    引き落とし日 (日)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={expDueDay}
                    onChange={(e) => setExpDueDay(e.target.value)}
                    className="w-full rounded-xl p-2 text-xs outline-none bg-white"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    required
                  />
                </div>
              </div>

              {expType === "variable" && (
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
                    value={expConfirmDay}
                    onChange={(e) => setExpConfirmDay(e.target.value)}
                    className="w-full rounded-xl p-2 text-xs outline-none bg-amber-50"
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
                  value={expOwnership}
                  onChange={(e) =>
                    setExpOwnership(
                      e.target.value as "common" | "husband" | "wife",
                    )
                  }
                  className="w-full rounded-xl p-2 text-xs outline-none bg-white"
                  style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                >
                  <option value="common">夫婦共通</option>
                  <option value="husband">{husbandName}・個人</option>
                  <option value="wife">{wifeName}・個人</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
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

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-3"
            style={{ border: "1px solid #EAE3DD" }}
          >
            <h3
              className="font-bold text-sm text-center"
              style={{ color: "#79665A" }}
            >
              カテゴリの追加
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  カテゴリ名
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-xl p-2 text-xs outline-none bg-white"
                  style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                  placeholder="例: 娯楽費、医療費"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-[11px] font-semibold mb-1"
                  style={{ color: "#A99A8E" }}
                >
                  カラーを選択
                </label>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform cursor-pointer ${newCatColor === color ? "ring-2 ring-offset-2 ring-[#79665A] scale-105" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
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
