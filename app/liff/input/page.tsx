"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

function getNextWithdrawalYearMonth(
  submitDate: Date,
  dueDay: number | "end",
): string {
  const year = submitDate.getFullYear();
  const month = submitDate.getMonth() + 1; // 1-12
  const day = submitDate.getDate();

  const lastDayOfCurrentMonth = new Date(year, month, 0).getDate();
  const targetDayInCurrentMonth =
    dueDay === "end"
      ? lastDayOfCurrentMonth
      : Math.min(Number(dueDay) || day, lastDayOfCurrentMonth);

  // 送信日がその月の引き落とし日より後なら、次の引き落とし日は翌月になる
  if (day > targetDayInCurrentMonth) {
    const nextMonthDate = new Date(year, month, 1); // 翌月1日
    return `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1,
    ).padStart(2, "0")}`;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function LiffInputPage() {
  const [title, setTitle] = useState("電気代");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 1. URLのパラメータから 'title' を取得してセットする
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get("title");
    if (titleParam) {
      setTitle(titleParam);
    }

    // 2. LIFFの初期化
    import("@line/liff")
      .then((liffModule) => {
        const liff = liffModule.default;
        liff.init({ liffId: "あなたのLIFF_ID" }).catch((err) => {
          console.warn("LIFF初期化エラー:", err);
        });
      })
      .catch(() => {});

    // 3. Firestoreの認証ルール（request.auth != null）を通すための匿名サインイン
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.error("匿名ログインエラー:", err);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      setStatus("送信中...");
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      if (db) {
        const now = new Date();
        let targetDocId: string | null = null;
        let configuredDueDay: number | "end" | null = null;

        // 設定画面で登録済みの変動費（expenseType === "variable"）を検索
        const q = query(
          collection(db, "expenses"),
          where("title", "==", title),
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.expenseType === "variable" && !targetDocId) {
            targetDocId = docSnap.id;
            configuredDueDay = data.dueDay ?? null;
          }
        });

        if (!targetDocId || configuredDueDay === null) {
          setStatus("設定画面に該当する変動費が見つかりません");
          return;
        }

        const targetYM = getNextWithdrawalYearMonth(now, configuredDueDay);

        await updateDoc(doc(db, "expenses", targetDocId), {
          amount: Number(amount),
          dueDay: configuredDueDay,
          createdAt: targetYM,
        });
      }

      setStatus("完了！");

      import("@line/liff").then((liffModule) => {
        const liff = liffModule.default;
        if (liff.isInClient()) {
          setTimeout(() => {
            liff.closeWindow();
          }, 1000); // 「完了！」を表示した1秒後に自動でウィンドウを閉じる
        }
      });
    } catch (e) {
      console.error("変動費送信エラー:", e);
      setStatus("エラーが発生しました");
    }
  };

  return (
    <div
      className="p-5 font-sans"
      style={{
        backgroundColor: "#FFFCF9",
        minHeight: "100vh",
        color: "#79665A",
      }}
    >
      <h2 className="font-bold text-base mb-4 text-center">変動費の金額入力</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1">項目名</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl p-3 text-xs bg-white border border-[#EAE3DD] outline-none font-bold"
            required
            readOnly // 項目名を変えられたくない場合はreadOnlyを付与
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">金額 (円)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl p-3 text-xs bg-white border border-[#EAE3DD] outline-none"
            placeholder="例: 8500"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl font-bold text-white shadow-md cursor-pointer"
          style={{ backgroundColor: "#F28FA4" }}
        >
          送信する
        </button>

        {status && (
          <p
            className="text-center text-xs mt-2 font-bold"
            style={{ color: status === "完了！" ? "#6F9569" : "#79665A" }}
          >
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
