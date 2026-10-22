import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET(request: Request) {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    console.log("本日の日付 (currentDay):", currentDay);

    if (!db) {
      console.error("Database is null or undefined");
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 },
      );
    }

    const querySnapshot = await getDocs(collection(db, "expenses"));
    console.log("取得したドキュメント数:", querySnapshot.size);

    const notificationsToSend: { title: string }[] = [];

    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      console.log("ドキュメントデータ:", data);

      if (
        data.expenseType === "variable" &&
        Number(data.dueDay) === currentDay
      ) {
        notificationsToSend.push({ title: data.title });
      }
    });

    console.log("条件に一致した通知対象:", notificationsToSend);

    if (notificationsToSend.length === 0) {
      return NextResponse.json({ message: "本日の通知対象項目はありません。" });
    }

    // 以降のLINE送信処理...
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.LINE_USER_ID;

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
    console.error("通知エラー詳細:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
