import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // LINEから送られてきたイベントの中身をそのままVercelのログに出力する
    console.log("=== LINE受信データ ===", JSON.stringify(body, null, 2));

    // イベントの中からユーザーID（userId）を抽出してログにわかりやすく表示する
    const events = body.events || [];
    for (const event of events) {
      if (event.source && event.source.userId) {
        console.log("★ 検出された LINE User ID:", event.source.userId);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Webhookエラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
