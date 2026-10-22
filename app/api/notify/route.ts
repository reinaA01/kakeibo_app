import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET(request: Request) {
  try {
    // 1. 本日の「日（1〜31）」を取得
    const today = new Date();
    const currentDay = today.getDate(); // 例: 22日なら 22

    if (!db) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 },
      );
    }

    // 2. Firestoreから支出データを取得
    const querySnapshot = await getDocs(collection(db, "expenses"));
    const notificationsToSend: { title: string }[] = [];

    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      // 変動費かつ、今日がconfirmDay（金額確定日）に一致するものを抽出
      if (
        data.expenseType === "variable" &&
        Number(data.confirmDay) === currentDay
      ) {
        notificationsToSend.push({ title: data.title });
      }
    });

    if (notificationsToSend.length === 0) {
      return NextResponse.json({ message: "本日の通知対象項目はありません。" });
    }

    // 3. LINE Messaging API経由で通知を送信
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.LINE_USER_ID; // 送信先のLINEユーザーID

    if (!channelAccessToken || !userId) {
      return NextResponse.json(
        { error: "LINE環境変数が設定されていません" },
        { status: 500 },
      );
    }

    for (const item of notificationsToSend) {
      const liffUrl = `https://kakeibo-app-two-xi.vercel.app/liff/input?title=${encodeURIComponent(item.title)}`;

      const messagePayload = {
        to: userId,
        messages: [
          {
            type: "text",
            text: `【${item.title}】本日は金額確定日です。以下のリンクから金額を入力してください。\n\n${liffUrl}`,
          },
        ],
      };

      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify(messagePayload),
      });
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
