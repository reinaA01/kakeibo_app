import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // LINEから送られてきたイベントの中からユーザーIDを探してログに出力
    if (body.events && body.events.length > 0) {
      const userId = body.events[0].source?.userId;
      console.log("====================================");
      console.log("取得したLINEユーザーID:", userId);
      console.log("====================================");
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
