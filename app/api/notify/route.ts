import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET(request: Request) {
  try {
    const today = new Date();
    const currentDay = today.getDate();

    if (!db) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 },
      );
    }

    // Firestoreからすべてのデータを取得してそのまま返す
    const querySnapshot = await getDocs(collection(db, "expenses"));
    const allDocs: any[] = [];

    querySnapshot.forEach((docItem) => {
      allDocs.push({
        id: docItem.id,
        ...docItem.data(),
      });
    });

    return NextResponse.json({
      currentDay, // 本日の日付
      totalDocsCount: allDocs.length, // 取得できたデータの総数
      allDocs, // 取得できたデータの中身一覧
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
