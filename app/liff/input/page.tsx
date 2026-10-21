"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function LiffInputPage() {
  const [title, setTitle] = useState("電気代");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 画面がブラウザに表示されてから安全にLIFFを読み込む
    import("@line/liff")
      .then((liffModule) => {
        const liff = liffModule.default;
        liff.init({ liffId: "あなたのLIFF_ID" }).catch((err) => {
          console.warn("LIFF初期化エラー:", err);
        });
      })
      .catch(() => {
        console.warn("LIFFパッケージが見つかりません");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      setStatus("送信中...");
      // Firestoreへ直接、またはAPI経由で保存
      if (db) {
        await addDoc(collection(db, "expenses"), {
          title,
          amount: Number(amount),
          dueDay: new Date().getDate(),
          ownership: "common",
          expenseType: "variable",
          createdAt: new Date(),
        });
      }

      setStatus("送信完了しました！");

      // 送信完了後にLINE画面を閉じる
      import("@line/liff").then((liffModule) => {
        const liff = liffModule.default;
        if (liff.isInClient()) {
          liff.closeWindow();
        }
      });
    } catch (e) {
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
            className="w-full rounded-xl p-3 text-xs bg-white border border-[#EAE3DD] outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            確定金額 (円)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl p-3 text-xs bg-white border border-[#EAE3DD] outline-none"
            placeholder="例: 8500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl font-bold text-white shadow-md cursor-pointer"
          style={{ backgroundColor: "#F28FA4" }}
        >
          金額を送信する
        </button>

        {status && (
          <p className="text-center text-xs mt-2 font-bold">{status}</p>
        )}
      </form>
    </div>
  );
}
