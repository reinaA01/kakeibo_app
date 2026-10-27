import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

export async function GET(request: Request) {
  try {
    const today = new Date();
    const currentDay = today.getDate(); // 例: 23日
    const todayStr = today.toISOString().split("T")[0];

    if (!db) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 },
      );
    }

    // ★ 設定（config）から夫と妻のLINE IDを取得する
    const configDoc = await getDoc(doc(db, "settings", "config"));
    let husbandLineId = process.env.HUSBAND_LINE_USER_ID || "";
    let wifeLineId = process.env.WIFE_LINE_USER_ID || "";

    if (configDoc.exists()) {
      const configData = configDoc.data();
      if (configData.husbandLineId) husbandLineId = configData.husbandLineId;
      if (configData.wifeLineId) wifeLineId = configData.wifeLineId;
    }

    const querySnapshot = await getDocs(collection(db, "expenses"));
    const notificationsToSend: {
      id: string;
      title: string;
      ownership: string;
    }[] = [];

    querySnapshot.forEach((docItem) => {
      const data = docItem.data();

      // 条件: 変動費、今日が確定日、かつ「今日まだ通知していない」
      if (
        data.expenseType === "variable" &&
        Number(data.confirmDay) === currentDay &&
        data.lastNotifiedDate !== todayStr
      ) {
        notificationsToSend.push({
          id: docItem.id,
          title: data.title,
          ownership: data.ownership || "common", // 負担区分 (husband / wife / common)
        });
      }
    });

    if (notificationsToSend.length === 0) {
      return NextResponse.json({
        message: "本日の新規通知対象項目はありません。",
      });
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
      return NextResponse.json(
        { error: "LINE環境変数が設定されていません" },
        { status: 500 },
      );
    }

    for (const item of notificationsToSend) {
      // ★ 負担区分（ownership）に応じて送信先のLINE IDを動的に切り替える
      let targetUserId = husbandLineId; // デフォルトは夫
      if (item.ownership === "wife") {
        targetUserId = wifeLineId;
      } else if (item.ownership === "common") {
        targetUserId = husbandLineId; // 共通の場合は夫（または必要に応じて調整可能）
      }

      if (!targetUserId) {
        console.warn(`[${item.title}] の通知先LINE IDが設定されていません。`);
        continue;
      }

      const liffUrl = `https://kakeibo-app-two-xi.vercel.app/liff/input?title=${encodeURIComponent(item.title)}`;

      const messagePayload = {
        to: targetUserId, // 切り替えた宛先IDを使用
        messages: [
          {
            type: "text",
            text: `【${item.title}】本日は金額確定日です。以下のリンクから金額を入力してください。\n\n${liffUrl}`,
          },
        ],
      };

      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify(messagePayload),
      });

      if (res.ok) {
        const docRef = doc(db, "expenses", item.id);
        await updateDoc(docRef, {
          lastNotifiedDate: todayStr,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: notificationsToSend.length,
    });
  } catch (error: any) {
    console.error("通知エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
