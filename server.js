const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));


// ========================================
// フォーラム盛岡の上映時間を取得
// ========================================

app.get("/api/forum", async (req, res) => {
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({
            success: false,
            message: "日付を指定してください"
        });
    }

    let browser;

    try {
        console.log("フォーラム盛岡を取得中...");
        console.log("日付:", date);

        browser = await chromium.launch({
            headless: true
        });

        const page = await browser.newPage();

        const url = `https://www.forum-movie.net/morioka/print/${date}`;

        console.log("URL:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        await page.waitForTimeout(1000);

        const movies = await page.evaluate(() => {
            const results = [];
            const text = document.body.innerText;

            const lines = text
                .split("\n")
                .map(line => line.trim())
                .filter(line => line);

            let currentMovie = null;

            for (const line of lines) {
                const timeMatches = line.match(
                    /\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/g
                );

                if (timeMatches && currentMovie) {
                    for (const time of timeMatches) {
                        const parts = time
                            .split("-")
                            .map(x => x.trim());

                        results.push({
                            name: currentMovie,
                            start: parts[0],
                            end: parts[1]
                        });
                    }

                    continue;
                }

                if (
                    line === "フォーラム盛岡" ||
                    line === "上映スケジュール一覧" ||
                    line.includes("上映スケジュール")
                ) {
                    continue;
                }

                if (
                    !line.match(/\d{1,2}:\d{2}/) &&
                    line.length >= 2
                ) {
                    currentMovie = line;
                }
            }

            return results;
        });

        console.log(`${movies.length}件の上映情報を取得しました`);

        res.json({
            success: true,
            date: date,
            movies: movies
        });

    } catch (error) {
        console.error("取得エラー:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {
        if (browser) {
            await browser.close();
        }
    }
});


// ========================================
// イオンシネマ江釣子
// ========================================

app.get("/api/ezuriko", async (req, res) => {
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({
            success: false,
            message: "日付を指定してください"
        });
    }

    let browser;

    try {
        console.log("イオンシネマ江釣子を取得中...");
        console.log("日付:", date);

        browser = await chromium.launch({
            headless: true
        });

        const page = await browser.newPage();

        const url =
            `https://theater.aeoncinema.com/theaters/ezuriko/?date=${date.replace(/-/g, "")}`;

        console.log("URL:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        await page.waitForTimeout(1500);


        // ========================================
        // 江釣子ページ診断
        // ========================================

        const bodyText = await page.locator("body").innerText();
        const html = await page.content();

        console.log("");
        console.log("========================================");
        console.log(" 江釣子ページ診断");
        console.log("========================================");

        console.log("ページタイトル:", await page.title());

        console.log("本文の文字数:", bodyText.length);

        console.log(
            "HTMLの文字数:",
            html.length
        );

        console.log(
            "本文の「上映時間」件数:",
            (bodyText.match(/上映時間/g) || []).length
        );

        console.log(
            "HTMLの「上映時間」件数:",
            (html.match(/上映時間/g) || []).length
        );

        console.log(
            "本文の時刻件数:",
            (bodyText.match(/\b\d{1,2}:\d{2}\b/g) || []).length
        );

        console.log(
            "HTMLの時刻件数:",
            (html.match(/\b\d{1,2}:\d{2}\b/g) || []).length
        );


        // ----------------------------------------
        // 本文先頭
        // ----------------------------------------

        console.log("");
        console.log("---------- 本文先頭 ----------");
        console.log(bodyText.slice(0, 5000));


        // ----------------------------------------
        // 本文末尾
        // ----------------------------------------

        console.log("");
        console.log("---------- 本文末尾 ----------");
        console.log(bodyText.slice(-5000));


        // ----------------------------------------
        // 「上映時間」の周辺
        // ----------------------------------------

        console.log("");
        console.log("---------- 「上映時間」周辺 ----------");

        const runtimeIndex = bodyText.indexOf("上映時間");

        if (runtimeIndex >= 0) {
            console.log(
                bodyText.slice(
                    Math.max(0, runtimeIndex - 1000),
                    runtimeIndex + 5000
                )
            );
        } else {
            console.log(
                "本文には「上映時間」がありません"
            );
        }


        // ----------------------------------------
        // 最初の時刻の周辺
        // ----------------------------------------

        console.log("");
        console.log("---------- 最初の時刻周辺 ----------");

        const timeMatch = bodyText.match(
            /\b\d{1,2}:\d{2}\b/
        );

        if (timeMatch) {
            const timeIndex = bodyText.indexOf(timeMatch[0]);

            console.log(
                bodyText.slice(
                    Math.max(0, timeIndex - 1000),
                    timeIndex + 5000
                )
            );
        } else {
            console.log(
                "本文には時刻がありません"
            );
        }


        // ----------------------------------------
        // HTML内の「上映時間」の周辺
        // ----------------------------------------

        console.log("");
        console.log("---------- HTML内の「上映時間」周辺 ----------");

        const htmlRuntimeIndex = html.indexOf("上映時間");

        if (htmlRuntimeIndex >= 0) {
            console.log(
                html.slice(
                    Math.max(0, htmlRuntimeIndex - 2000),
                    htmlRuntimeIndex + 10000
                )
            );
        } else {
            console.log(
                "HTMLにも「上映時間」がありません"
            );
        }

        console.log("");
        console.log("========================================");
        console.log(" 江釣子ページ診断終了");
        console.log("========================================");
        console.log("");


        // ========================================
        // 江釣子上映情報解析
        // ========================================

        const movies = await page.evaluate(() => {

            const lines = document.body.innerText
                .split("\n")
                .map(line => line.trim())
                .filter(line => line);

            const results = [];

            for (let i = 0; i < lines.length; i++) {

                // 「上映時間：○分」を探す
                if (
                    !/^上映時間\s*[：:]\s*\d+\s*分/.test(lines[i])
                ) {
                    continue;
                }

                // 上映時間の直前の行をタイトルとする
                let title = lines[i - 1] || "";

                // [NEW] を削除
                title = title
                    .replace(/^\[NEW\]\s*/, "")
                    .trim();

                // 明らかなUI文字を除外
                const invalidTitles = [
                    "全て",
                    "みたい",
                    "上映中",
                    "公開予定",
                    "上映スケジュール",
                    "上映スケジュール一覧",
                    "作品一覧",
                    "PG12",
                    "作品情報を見る",
                    "コピー",
                    "印刷"
                ];

                if (
                    !title ||
                    invalidTitles.includes(title)
                ) {
                    continue;
                }

                // この映画の上映時間を探す
                let j = i + 1;

                while (j < lines.length) {

                    // 次の映画の上映時間が来たら終了
                    if (
                        /^上映時間\s*[：:]\s*\d+\s*分/.test(lines[j])
                    ) {
                        break;
                    }

                    const start = lines[j];
                    const endLine = lines[j + 1] || "";

                    // 例
                    // 09:15
                    // ~10:35
                    if (
                        /^\d{1,2}:\d{2}$/.test(start) &&
                        /^~\s*\d{1,2}:\d{2}$/.test(endLine)
                    ) {
                        const end = endLine
                            .replace(/^~\s*/, "");

                        results.push({
                            name: title,
                            start: start,
                            end: end
                        });

                        j += 2;

                    } else {
                        j++;
                    }
                }

                // 次の映画へ
                i = j - 1;
            }

            return results;
        });


        console.log(
            `${movies.length}件の上映情報を取得しました`
        );

        console.log("取得した上映情報:");

        for (const movie of movies) {
            console.log(
                `${movie.name} ${movie.start}-${movie.end}`
            );
        }


        res.json({
            success: true,
            date: date,
            movies: movies
        });

    } catch (error) {

        console.error("取得エラー:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {

        if (browser) {
            await browser.close();
        }
    }
});


// ========================================
// サーバー起動
// ========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("==============================");
    console.log(" Movie Timeline");
    console.log("==============================");
    console.log(`http://localhost:${PORT}`);
    console.log("==============================");
    console.log("");
});