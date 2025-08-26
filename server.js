// 必要なモジュールをインポート
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors'; // ★★★ CORSパッケージをインポート ★★★

// .envファイルから環境変数を読み込む
dotenv.config();

// Expressアプリを初期化
const app = express();
const port = 3000;

// __dirnameをESモジュールで使えるように設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ★★★ CORSミドルウェアを使用して、外部からのリクエストを許可 ★★★
app.use(cors());

// JSON形式のリクエストボディを解析できるようにする
app.use(express.json());
// 静的ファイル（HTML, CSSなど）を提供するための設定
app.use(express.static(path.join(__dirname, 'public')));

// APIリクエストを処理するエンドポイントを作成
app.post('/get-judgment', async (req, res) => {
    // フロントエンドから送られてきたユーザー入力を取得
    const { userInput } = req.body;

    if (!userInput) {
        return res.status(400).json({ error: '質問内容がありません。' });
    }

    // AIに送るプロンプトを組み立てる
    const prompt = `
あなたは優秀な裁判官です。以下のユーザーからの質問に対して、本格的な裁判シミュレーションを生成してください。

### ルール:
- ユーザーの質問: 「${userInput}」
- **ストーリーが最も面白くなるように、以下のどちらかの形式で判決を生成してください。**形式1を選びましたなどの文章はいりません(必ずこういった趣旨の文章は書かないでください。)。形式に従って、出力してください。
  - **形式1: 第一審で完結するシンプルな裁判**
  - **形式2: 第一審の判決が第二審で覆る、ドラマチックな裁判**
- 形式1は50%、形式2は50%の確率で選んで生成してください(重要！！！！！！)。
- 判決理由には、架空のキャラクター、証言、証拠などを盛り込み、面白いストーリーを作成してください。

### 出力フォーマット

#### 形式1を選ぶ場合:
---
### **第一審判決**

**判決:** 主文、被告人は【有罪 or 無罪】。

**理由:**
（ここに判決理由を記述）

**裁判長の最終弁論:**
（ここに裁判を締めくくる短いコメントを記述）
---

#### 形式2を選ぶ場合:
---
### **第一審判決**

**判決:** 主文、被告人は【有罪 or 無罪】。

**理由:**
（ここに第一審の理由を記述）

---
### **控訴審**

（ここに控訴が受理された旨の短い文章を記述）

---
### **第二審判決**

**判決:** 原判決を破棄する。被告人は【第一審と逆の判決】。

**理由:**
（ここに第一審の判決を覆す理由を記述）
---
`;

    try {
        const apiKey = process.env.API_KEY; // .envファイルからAPIキーを取得

        if (!apiKey) {
            console.error("APIキーが.envファイルに設定されていません。");
            throw new Error("サーバー側でAPIキーが設定されていません。");
        }

        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Google APIからのエラー:', errorBody);
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            res.json({ judgment: text });
        } else {
            throw new Error("APIから有効な応答がありませんでした。");
        }

    } catch (error) {
        console.error("サーバー内部エラー:", error.message);
        res.status(500).json({ error: `サーバーでエラーが発生しました: ${error.message}` });
    }
});

// サーバーを起動
app.listen(port, () => {
    console.log(`サーバーが http://localhost:${port} で起動しました`);
});
