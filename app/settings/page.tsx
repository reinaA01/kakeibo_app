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

type SettingsView =
  | "menu"
  | "basic_menu"
  | "budget"
  | "profile"
  | "payment"
  | "category";

interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  dueDay: number | "end";
  ownership: "common" | "husband" | "wife";
  expenseType: "fixed" | "variable" | "one-time";
  confirmDay?: number | null;
  startYM?: string;
  endYM?: string;
  createdAt?: Date;
}

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

const PRESET_COLORS = [
  "#F2A6B9",
  "#E8C170",
  "#A6CBAA",
  "#78B4E2",
  "#B6A4E2",
  "#F2C299",
  "#93D5E1",
  "#E6A1C4",
  "#D7C49E",
  "#C9BFB7",
];

export default function SettingsPage() {
  const [currentView, setCurrentView] = useState<SettingsView>("menu");

  const [husbandName, setHusbandName] = useState("夫");
  const [wifeName, setWifeName] = useState("妻");
  const [husbandLineId, setHusbandLineId] = useState("");
  const [wifeLineId, setWifeLineId] = useState("");

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

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [filterType, setFilterType] = useState<
    "all" | "fixed" | "variable" | "husband" | "wife" | "common"
  >("all");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDueDay, setExpDueDay] = useState<string>("27");
  const [expOwnership, setExpOwnership] = useState<
    "common" | "husband" | "wife"
  >("common");
  const [expType, setExpType] = useState<"fixed" | "variable">("fixed");
  const [expConfirmDay, setExpConfirmDay] = useState("20");
  const [expStartYM, setExpStartYM] = useState("");
  const [expEndYM, setExpEndYM] = useState("");

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

  useEffect(() => {
    const processConfigData = (parsed: any) => {
      if (parsed.weeklyBudget) setWeeklyBudget(parsed.weeklyBudget);
      if (parsed.categoryBudgets) {
        const validCustomNames = (parsed.categories || [])
          .filter(
            (c: CategoryItem) =>
              !c.isSystem &&
              c.name !== "共通" &&
              c.name !== "夫" &&
              c.name !== "妻",
          )
          .map((c: CategoryItem) => c.name);
        const cleanedBudgets: { [key: string]: number } = {};
        validCustomNames.forEach((name: string) => {
          if (parsed.categoryBudgets[name] !== undefined) {
            cleanedBudgets[name] = parsed.categoryBudgets[name];
          }
        });
        setCategoryBudgets(cleanedBudgets);
      }
      if (parsed.husbandName) setHusbandName(parsed.husbandName);
      if (parsed.wifeName) setWifeName(parsed.wifeName);
      if (parsed.husbandLineId) setHusbandLineId(parsed.husbandLineId);
      if (parsed.wifeLineId) setWifeLineId(parsed.wifeLineId);
      if (parsed.commonColor) setCommonColor(parsed.commonColor);
      if (parsed.husbandColor) setHusbandColor(parsed.husbandColor);
      if (parsed.wifeColor) setWifeColor(parsed.wifeColor);
      if (parsed.categories) {
        setCategories(parsed.categories);
      } else {
        setCategories([
          { id: "1", name: "食費", color: "#A6CBAA" },
          { id: "2", name: "日用品費", color: "#E8C170" },
          { id: "3", name: "その他", color: "#B6A4E2" },
        ]);
      }
    };

    const localConfig = localStorage.getItem("app_config");
    if (localConfig) {
      try {
        processConfigData(JSON.parse(localConfig));
      } catch (e) {}
    } else {
      setCategories([
        { id: "1", name: "食費", color: "#A6CBAA" },
        { id: "2", name: "日用品費", color: "#E8C170" },
        { id: "3", name: "その他", color: "#B6A4E2" },
      ]);
    }

    const localExpenses = localStorage.getItem("app_expenses");
    if (localExpenses) {
      try {
        setFixedExpenses(JSON.parse(localExpenses));
      } catch (e) {}
    }

    const initData = async () => {
      try {
        if (db) {
          const docRef = doc(db, "settings", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            processConfigData(docSnap.data());
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

  const saveConfigToStorageAndDb = (newProps: any = {}) => {
    const configData = {
      weeklyBudget: Number(weeklyBudget),
      categoryBudgets,
      categories,
      husbandName,
      wifeName,
      husbandLineId,
      wifeLineId,
      commonColor,
      husbandColor,
      wifeColor,
      ...newProps,
    };
    localStorage.setItem("app_config", JSON.stringify(configData));
    if (db) {
      setDoc(doc(db, "settings", "config"), configData, { merge: true }).catch(
        () => {},
      );
    }
  };

  const handleSaveBudgetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfigToStorageAndDb();
    setCurrentView("basic_menu");
  };

  const handleSaveProfileConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfigToStorageAndDb();
    setCurrentView("basic_menu");
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newCatName &&
      (!editingCategoryId || !editingCategoryId.startsWith("sys-"))
    )
      return;

    let updatedCategories = [...categories];
    let newCommonColor = commonColor;
    let newHusbandColor = husbandColor;
    let newWifeColor = wifeColor;

    if (editingCategoryId && editingCategoryId.startsWith("sys-")) {
      if (editingCategoryId === "sys-common") newCommonColor = newCatColor;
      if (editingCategoryId === "sys-husband") newHusbandColor = newCatColor;
      if (editingCategoryId === "sys-wife") newWifeColor = newCatColor;

      setCommonColor(newCommonColor);
      setHusbandColor(newHusbandColor);
      setWifeColor(newWifeColor);
    } else {
      if (editingCategoryId) {
        updatedCategories = categories.map((cat) =>
          cat.id === editingCategoryId
            ? { ...cat, name: newCatName, color: newCatColor }
            : cat,
        );
      } else {
        updatedCategories.push({
          id: Date.now().toString(),
          name: newCatName,
          color: newCatColor,
        });
      }
      setCategories(updatedCategories);
    }

    saveConfigToStorageAndDb({
      categories: updatedCategories,
      commonColor: newCommonColor,
      husbandColor: newHusbandColor,
      wifeColor: newWifeColor,
    });

    setNewCatName("");
    setEditingCategoryId(null);
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (!confirm("本当にこのカテゴリを削除しますか？")) return;
    const updatedCategories = categories.filter((cat) => cat.id !== id);
    setCategories(updatedCategories);
    saveConfigToStorageAndDb({ categories: updatedCategories });
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const tempId = editingExpenseId || Date.now().toString();

    const parsedDueDay = expDueDay === "end" ? "end" : Number(expDueDay);

    const expenseData = {
      title: expTitle,
      amount: expType === "variable" ? 0 : Number(expAmount) || 0,
      dueDay: parsedDueDay,
      ownership: expOwnership,
      expenseType: expType,
      confirmDay: expType === "variable" ? Number(expConfirmDay) : null,
      startYM: expStartYM || "",
      endYM: expEndYM || "",
      createdAt: new Date(),
    };

    // ▼ ここに "as FixedExpense" を追加して型を強制一致させます
    const newItem: FixedExpense = {
      id: tempId,
      ...expenseData,
    } as FixedExpense;

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
    setExpStartYM("");
    setExpEndYM("");

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

  const filteredExpenses = fixedExpenses
    .filter((item) => item.expenseType !== "one-time")
    .filter((item) => {
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
                onClick={() => {
                  if (currentView === "budget" || currentView === "profile") {
                    setCurrentView("basic_menu");
                  } else {
                    setCurrentView("menu");
                  }
                }}
                className="p-1 flex items-center gap-1 font-bold cursor-pointer"
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
                  onClick={() => setCurrentView("basic_menu")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
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
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
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
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
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

            {currentView === "basic_menu" && (
              <div className="space-y-2.5">
                <button
                  onClick={() => setCurrentView("profile")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                  style={{ border: "1px solid #EAE3DD" }}
                >
                  <span
                    className="font-bold text-sm"
                    style={{ color: "#79665A" }}
                  >
                    プロフィールの変更
                  </span>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "#A99A8E" }}
                  />
                </button>

                <button
                  onClick={() => setCurrentView("budget")}
                  className="w-full p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                  style={{ border: "1px solid #EAE3DD" }}
                >
                  <span
                    className="font-bold text-sm"
                    style={{ color: "#79665A" }}
                  >
                    予算の目安設定
                  </span>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "#A99A8E" }}
                  />
                </button>
              </div>
            )}

            {currentView === "budget" && (
              <form
                onSubmit={handleSaveBudgetConfig}
                className="p-4 rounded-2xl bg-white shadow-sm space-y-4"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <h3 className="font-bold text-xs" style={{ color: "#79665A" }}>
                  カテゴリ別予算目安の設定
                </h3>

                <div className="space-y-3">
                  {customCategoriesOnly.map((cat) => (
                    <div key={cat.id}>
                      <label
                        className="block text-[11px] font-semibold mb-1 flex items-center gap-1.5"
                        style={{ color: "#79665A" }}
                      >
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}の週目安 (円)</span>
                      </label>
                      <input
                        type="number"
                        value={
                          categoryBudgets[cat.name] !== undefined
                            ? categoryBudgets[cat.name]
                            : 0
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = {
                            ...categoryBudgets,
                            [cat.name]: val,
                          };
                          setCategoryBudgets(updated);
                          const total = Object.values(updated).reduce(
                            (sum, b) => sum + (Number(b) || 0),
                            0,
                          );
                          setWeeklyBudget(total);
                        }}
                        className="w-full rounded-xl p-2.5 text-base outline-none bg-white"
                        style={{
                          border: "1px solid #EAE3DD",
                          color: "#79665A",
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold text-white shadow-md mt-2 transition active:scale-98 cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    保存する
                  </button>
                </div>
              </form>
            )}

            {currentView === "profile" && (
              <form
                onSubmit={handleSaveProfileConfig}
                className="p-4 rounded-2xl bg-white shadow-sm space-y-4"
                style={{ border: "1px solid #EAE3DD" }}
              >
                <h3 className="font-bold text-xs" style={{ color: "#79665A" }}>
                  プロフィールの変更 & LINE通知設定
                </h3>

                <div className="space-y-3">
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
                      className="w-full rounded-xl p-2.5 text-base outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: "#A99A8E" }}
                    >
                      夫のLINE User ID (Uから始まる文字列)
                    </label>
                    <input
                      type="text"
                      value={husbandLineId}
                      onChange={(e) => setHusbandLineId(e.target.value)}
                      className="w-full rounded-xl p-2.5 text-base outline-none bg-white font-mono"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      placeholder="U12345678..."
                    />
                  </div>

                  <div
                    className="pt-2"
                    style={{ borderTop: "1px solid #EAE3DD" }}
                  ></div>

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
                      className="w-full rounded-xl p-2.5 text-base outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1"
                      style={{ color: "#A99A8E" }}
                    >
                      妻のLINE User ID (Uから始まる文字列)
                    </label>
                    <input
                      type="text"
                      value={wifeLineId}
                      onChange={(e) => setWifeLineId(e.target.value)}
                      className="w-full rounded-xl p-2.5 text-base outline-none bg-white font-mono"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      placeholder="U87654321..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold text-white shadow-md mt-2 transition active:scale-98 cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    保存する
                  </button>
                </div>
              </form>
            )}

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
                      setExpDueDay("27");
                      setExpStartYM("");
                      setExpEndYM("");
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
                        <div className="flex-1 pr-2">
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
                            <span>
                              引落日:{" "}
                              {item.dueDay === "end"
                                ? "末日"
                                : `${item.dueDay}日`}
                            </span>
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
                          {(item.startYM || item.endYM) && (
                            <div
                              className="text-[10px] mt-1 font-semibold"
                              style={{ color: "#A99A8E" }}
                            >
                              期間: {item.startYM || "指定なし"} 〜{" "}
                              {item.endYM || "指定なし"}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.expenseType !== "variable" && (
                            <div className="flex items-baseline gap-0.5">
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: "#79665A" }}
                              >
                                ¥
                              </span>
                              <span
                                className="font-extrabold text-sm"
                                style={{ color: "#79665A" }}
                              >
                                {item.amount.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingExpenseId(item.id);
                                setExpTitle(item.title);
                                setExpAmount(String(item.amount));
                                setExpDueDay(String(item.dueDay));
                                setExpOwnership(item.ownership);
                                setExpType(
                                  item.expenseType === "variable"
                                    ? "variable"
                                    : "fixed",
                                );
                                setExpConfirmDay(String(item.confirmDay || 20));
                                setExpStartYM(item.startYM || "");
                                setExpEndYM(item.endYM || "");
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
                    onClick={() => {
                      setEditingCategoryId(null);
                      setNewCatName("");
                      setNewCatColor(PRESET_COLORS[0]);
                      setIsCategoryModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    style={{ backgroundColor: "#F28FA4" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>追加</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {fullCategories.map((cat) => (
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
                          {cat.isSystem && cat.id === "sys-husband"
                            ? husbandName
                            : cat.isSystem && cat.id === "sys-wife"
                              ? wifeName
                              : cat.name}
                        </span>
                        {cat.isSystem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">
                            固定
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setNewCatName(
                              cat.isSystem && cat.id === "sys-husband"
                                ? husbandName
                                : cat.isSystem && cat.id === "sys-wife"
                                  ? wifeName
                                  : cat.name,
                            );
                            setNewCatColor(cat.color);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                          title="カラー変更"
                        >
                          <Edit2
                            className="w-3.5 h-3.5"
                            style={{ color: "#A99A8E" }}
                          />
                        </button>
                        {!cat.isSystem && (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
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

              <div
                className={`grid ${expType === "variable" ? "grid-cols-1" : "grid-cols-2"} gap-2`}
              >
                {expType !== "variable" && (
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
                      className="w-full rounded-xl p-2 text-base outline-none bg-white"
                      style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                      placeholder="10000"
                      required
                    />
                  </div>
                )}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    引き落とし日
                  </label>
                  <select
                    value={expDueDay}
                    onChange={(e) => setExpDueDay(e.target.value)}
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
                    className="w-full rounded-xl p-2 text-base outline-none bg-amber-50"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    required
                  />
                </div>
              )}

              <div
                className="grid grid-cols-2 gap-2 pt-1"
                style={{ borderTop: "1px dashed #EAE3DD" }}
              >
                <div>
                  <label
                    className="block text-[10px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    開始年月 (任意)
                  </label>
                  <input
                    type="month"
                    value={expStartYM}
                    onChange={(e) => setExpStartYM(e.target.value)}
                    className="w-full rounded-xl p-2 text-base outline-none bg-white"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-semibold mb-1"
                    style={{ color: "#A99A8E" }}
                  >
                    終了年月 (任意)
                  </label>
                  <input
                    type="month"
                    value={expEndYM}
                    onChange={(e) => setExpEndYM(e.target.value)}
                    className="w-full rounded-xl p-2 text-base outline-none bg-white"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
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
                  value={expOwnership}
                  onChange={(e) => setExpOwnership(e.target.value as any)}
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
              {editingCategoryId && editingCategoryId.startsWith("sys-")
                ? "カテゴリカラーの変更"
                : editingCategoryId
                  ? "カテゴリの編集"
                  : "カテゴリの追加"}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              {(!editingCategoryId ||
                !editingCategoryId.startsWith("sys-")) && (
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
                    className="w-full rounded-xl p-2 text-base outline-none bg-white"
                    style={{ border: "1px solid #EAE3DD", color: "#79665A" }}
                    placeholder="例: 娯楽費、医療費"
                    required
                  />
                </div>
              )}

              {editingCategoryId && editingCategoryId.startsWith("sys-") && (
                <div
                  className="text-center font-bold text-xs"
                  style={{ color: "#79665A" }}
                >
                  {newCatName} のカラー変更
                </div>
              )}

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
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
