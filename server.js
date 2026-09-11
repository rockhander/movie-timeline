const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = 3000;

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

        const url =
            `https://www.forum-movie.net/morioka/print/${date}`;

        console.log("URL:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        await page.waitForTimeout(1000);


        const movies = await page.evaluate(() => {

            const results = [];

            const text =
                document.body.innerText;

            const lines =
                text
                    .split("\n")
                    .map(line => line.trim())
                    .filter(line => line);

            let currentMovie = null;

            for (const line of lines) {

                const timeMatches =
                    line.match(
                        /\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/g
                    );

                if (timeMatches && currentMovie) {

                    for (const time of timeMatches) {

                        const parts =
                            time
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


        console.log(
            `${movies.length}件の上映情報を取得しました`
        );


        res.json({
            success: true,
            date: date,
            movies: movies
        });


    } catch (error) {

        console.error(
            "取得エラー:",
            error
        );

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

        const movies = await page.evaluate(() => {

            const lines = document.body.innerText
                .split("\n")
                .map(line => line.trim())
                .filter(line => line);

            const results = [];

            /*
             * 江釣子の上映情報は、
             *
             * 映画タイトル
             * 上映時間：○分
             * 09:15
             * ~10:35
             *
             * のような形で並んでいる。
             */

            for (let i = 0; i < lines.length; i++) {

                /*
                 * 「上映時間：○分」を柔軟に判定
                 *
                 * 全角/半角コロンや、
                 * 「上映時間： 80分」などにも対応
                 */
                if (!/^上映時間\s*[：:]\s*\d+\s*分/.test(lines[i])) {
                    continue;
                }

                /*
                 * 上映時間の直前にある行をタイトルとする
                 */
                let title = lines[i - 1] || "";

                /*
                 * [NEW] を削除
                 */
                title = title
                    .replace(/^\[NEW\]\s*/, "")
                    .trim();

                /*
                 * 明らかなUI文字は除外
                 */
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

                if (!title || invalidTitles.includes(title)) {
                    continue;
                }

                /*
                 * この映画の上映時間を探す
                 */
                let j = i + 1;

                while (j < lines.length) {

                    /*
                     * 次の映画の「上映時間」が来たら終了
                     */
                    if (
                        /^上映時間\s*[：:]\s*\d+\s*分/.test(lines[j])
                    ) {
                        break;
                    }

                    const start = lines[j];
                    const endLine = lines[j + 1] || "";

                    /*
                     * 09:15
                     * ~10:35
                     */
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

                /*
                 * 次の映画へ
                 */
                i = j - 1;
            }

            return results;
        });

        console.log(
            `${movies.length}件の上映情報を取得しました`
        );

        /*
         * 取得結果を少し確認できるようにする
         */
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

app.listen(PORT, () => {

    console.log("");
    console.log("==============================");
    console.log(" Movie Timeline");
    console.log("==============================");
    console.log(`http://localhost:${PORT}`);
    console.log("==============================");
    console.log("");

});