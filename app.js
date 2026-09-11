let movies = [];
let selectedMovies = [];
let customOrder = [];

const theater = document.getElementById("theater");
const scheduleDate = document.getElementById("scheduleDate");
const fetchScheduleButton =
    document.getElementById("fetchScheduleButton");
const fetchStatus =
    document.getElementById("fetchStatus");

const movieSelectionList =
    document.getElementById("movieSelectionList");

const selectAllButton =
    document.getElementById("selectAllButton");

const deselectAllButton =
    document.getElementById("deselectAllButton");

const sortOrder =
    document.getElementById("sortOrder");

const timeline =
    document.getElementById("timeline");


// ------------------------------------
// 保存
// ------------------------------------

const STORAGE_KEY = "movieTimelineState";

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                theater: theater.value,
                date: scheduleDate.value,
                movies: movies,
                selectedMovies: selectedMovies,
                customOrder: customOrder,
                sortOrder: sortOrder.value
            })
        );
    } catch (error) {
        console.warn("状態の保存に失敗しました:", error);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return false;
        }

        const state = JSON.parse(saved);

        if (state.theater) {
            theater.value = state.theater;
        }

        if (state.date) {
            scheduleDate.value = state.date;
        }

        if (Array.isArray(state.movies)) {
            movies = state.movies;
        }

        if (Array.isArray(state.selectedMovies)) {
            selectedMovies = state.selectedMovies;
        }

        if (Array.isArray(state.customOrder)) {
            customOrder = state.customOrder;
        }

        if (state.sortOrder) {
            sortOrder.value = state.sortOrder;
        }

        if (movies.length > 0) {
            renderMovieSelection();
            renderTimeline();

            const theaterName =
                theater.value === "forum"
                    ? "フォーラム盛岡"
                    : "イオンシネマ江釣子";

            fetchStatus.textContent =
                `${theaterName}：前回取得した${movies.length}作品を表示しています。`;

            return true;
        }
    } catch (error) {
        console.warn("保存データの読み込みに失敗しました:", error);
    }

    return false;
}


// ------------------------------------
// 初期設定
// ------------------------------------

const today = new Date();

scheduleDate.value =
    today.toISOString().split("T")[0];

loadState();

theater.addEventListener("change", saveState);
scheduleDate.addEventListener("change", saveState);


// ------------------------------------
// 上映情報を取得
// ------------------------------------

fetchScheduleButton.addEventListener("click", async () => {

    const selectedTheater =
        theater.value;

    const date =
        scheduleDate.value;


    if (!date) {

        alert("日付を選択してください");

        return;

    }


    fetchStatus.textContent =
        "上映情報を取得しています……";

    fetchScheduleButton.disabled =
        true;


    try {

        let url = "";


        // =================================
        // 映画館によってAPIを切り替える
        // =================================

        if (selectedTheater === "forum") {

            url =
                `/api/forum?date=${encodeURIComponent(date)}`;

        }

        else if (selectedTheater === "ezuriko") {

            url =
                `/api/ezuriko?date=${encodeURIComponent(date)}`;

        }

        else {

            throw new Error(
                "対応していない映画館です"
            );

        }


        console.log(
            "上映情報取得:",
            url
        );


        // =================================
        // APIへアクセス
        // =================================

        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `HTTPエラー: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "上映情報を取得できませんでした"
            );

        }


        // =================================
        // 映画データを保存
        // =================================

        movies =
            data.movies || [];


        // 同じ映画の上映回をまとめる
        movies =
            groupMoviesByName(movies);


        // =================================
        // 最初は全部選択
        // =================================

        selectedMovies =
            movies.map(
                movie => movie.name
            );


        // =================================
        // 初期の並び順
        // =================================

        customOrder =
            movies.map(
                movie => movie.name
            );


        // =================================
        // 画面更新
        // =================================

        renderMovieSelection();

        renderTimeline();


        // =================================
        // ステータス表示
        // =================================

        const theaterName =
            selectedTheater === "forum"
                ? "フォーラム盛岡"
                : "イオンシネマ江釣子";


        fetchStatus.textContent =
            `${theaterName}：${movies.length}作品の上映情報を取得しました。`;

        saveState();


    }

    catch (error) {

        console.error(error);


        fetchStatus.textContent =
            "上映情報の取得に失敗しました。";


        alert(
            "上映情報を取得できませんでした。\n\n" +
            error.message
        );

    }

    finally {

        fetchScheduleButton.disabled =
            false;

    }

});


// ------------------------------------
// 同じ映画の上映回をまとめる
// ------------------------------------

function groupMoviesByName(data) {

    const grouped = {};


    data.forEach(item => {

        if (
            !item.name ||
            !item.start ||
            !item.end
        ) {

            return;

        }


        if (!grouped[item.name]) {

            grouped[item.name] = {

                name:
                    item.name,

                screenings:
                    []

            };

        }


        grouped[item.name].screenings.push({

            start:
                item.start,

            end:
                item.end

        });

    });


    return Object.values(grouped);

}


// ------------------------------------
// 映画選択画面
// ------------------------------------

function renderMovieSelection() {

    movieSelectionList.innerHTML = "";


    if (movies.length === 0) {

        movieSelectionList.innerHTML =
            `
            <p class="empty-message">
                上映情報がありません
            </p>
            `;

        return;

    }


    // --------------------------------
    // 映画は取得した順番で表示
    // --------------------------------

    movies.forEach(movie => {

        const label =
            document.createElement("label");


        label.className =
            "movie-selection-item";


        // --------------------------------
        // チェックボックス
        // --------------------------------

        const checkbox =
            document.createElement("input");


        checkbox.type =
            "checkbox";


        checkbox.checked =
            selectedMovies.includes(
                movie.name
            );


        checkbox.addEventListener(
            "change",
            () => {

                if (checkbox.checked) {

                    if (
                        !selectedMovies.includes(
                            movie.name
                        )
                    ) {

                        selectedMovies.push(
                            movie.name
                        );

                    }

                }

                else {

                    selectedMovies =
                        selectedMovies.filter(
                            name =>
                                name !== movie.name
                        );

                }


                renderTimeline();
                saveState();

            }
        );


        // --------------------------------
        // 映画タイトル
        // --------------------------------

        const title =
            document.createElement("span");


        title.textContent =
            movie.name;


        // --------------------------------
        // 上映回数
        // --------------------------------

        const count =
            document.createElement("span");


        count.className =
            "screening-count";


        count.textContent =
            `${movie.screenings.length}回`;


        label.appendChild(
            checkbox
        );

        label.appendChild(
            title
        );

        label.appendChild(
            count
        );


        movieSelectionList.appendChild(
            label
        );

    });

}


// ------------------------------------
// すべて選択
// ------------------------------------

selectAllButton.addEventListener(
    "click",
    () => {

        selectedMovies =
            movies.map(
                movie => movie.name
            );


        renderMovieSelection();

        renderTimeline();
        saveState();

    }
);


// ------------------------------------
// すべて解除
// ------------------------------------

deselectAllButton.addEventListener(
    "click",
    () => {

        selectedMovies = [];


        renderMovieSelection();

        renderTimeline();
        saveState();

    }
);


// ------------------------------------
// 並び順変更
// ------------------------------------

sortOrder.addEventListener(
    "change",
    () => {

        renderTimeline();

        saveState();

    }
);


// ------------------------------------
// 映画の並び順を取得
// ------------------------------------

function getSortedMovies() {

    const result =
        movies.filter(
            movie =>
                selectedMovies.includes(
                    movie.name
                )
        );


    const order =
        sortOrder.value;


    // --------------------------------
    // 開始時間順
    // --------------------------------

    if (order === "start") {

        result.sort((a, b) => {

            const aStart =
                Math.min(
                    ...a.screenings.map(
                        screening =>
                            timeToMinutes(
                                screening.start
                            )
                    )
                );


            const bStart =
                Math.min(
                    ...b.screenings.map(
                        screening =>
                            timeToMinutes(
                                screening.start
                            )
                    )
                );


            return aStart - bStart;

        });

    }


    // --------------------------------
    // 終了時間順
    // --------------------------------

    else if (order === "end") {

        result.sort((a, b) => {

            const aEnd =
                Math.min(
                    ...a.screenings.map(
                        screening =>
                            timeToMinutes(
                                screening.end
                            )
                    )
                );


            const bEnd =
                Math.min(
                    ...b.screenings.map(
                        screening =>
                            timeToMinutes(
                                screening.end
                            )
                    )
                );


            return aEnd - bEnd;

        });

    }


    // --------------------------------
    // タイトル順
    // --------------------------------

    else if (order === "name") {

        result.sort((a, b) =>
            a.name.localeCompare(
                b.name,
                "ja"
            )
        );

    }


    // --------------------------------
    // 手動並び順
    // --------------------------------

    else if (order === "custom") {

        result.sort((a, b) => {

            const aIndex =
                customOrder.indexOf(
                    a.name
                );


            const bIndex =
                customOrder.indexOf(
                    b.name
                );


            if (aIndex === -1) {
                return 1;
            }


            if (bIndex === -1) {
                return -1;
            }


            return aIndex - bIndex;

        });

    }


    return result;

}


// ------------------------------------
// タイムライン
// ------------------------------------

function renderTimeline() {

    timeline.innerHTML = "";


    const visibleMovies =
        getSortedMovies();


    if (visibleMovies.length === 0) {

        timeline.innerHTML =
            `
            <p class="empty-message">
                表示する映画を選択してください
            </p>
            `;

        return;

    }


    // --------------------------------
    // 一番早い開始時間
    // 一番遅い終了時間を調べる
    // --------------------------------

    let earliest =
        Infinity;

    let latest =
        -Infinity;


    visibleMovies.forEach(movie => {

        movie.screenings.forEach(
            screening => {

                const start =
                    timeToMinutes(
                        screening.start
                    );

                const end =
                    timeToMinutes(
                        screening.end
                    );


                earliest =
                    Math.min(
                        earliest,
                        start
                    );


                latest =
                    Math.max(
                        latest,
                        end
                    );

            }
        );

    });


    // --------------------------------
    // 30分単位に丸める
    // --------------------------------

    earliest =
        Math.floor(
            earliest / 30
        ) * 30 - 30;


    latest =
        Math.ceil(
            latest / 30
        ) * 30 + 30;


    const totalMinutes =
        latest - earliest;


    const pixelsPerMinute =
        2;


    const timelineHeight =
        totalMinutes *
        pixelsPerMinute;


    // =================================
    // ヘッダー
    // =================================

    const header =
        document.createElement("div");


    header.className =
        "timeline-header";


    header.style.setProperty(
        "--movie-count",
        visibleMovies.length
    );


    const headerTime =
        document.createElement("div");


    headerTime.className =
        "timeline-time-label";


    headerTime.textContent =
        "時間";


    header.appendChild(
        headerTime
    );


    visibleMovies.forEach(
        movie => {

            const movieHeader =
                document.createElement("div");


            movieHeader.className =
                "timeline-movie-header";


            movieHeader.textContent =
                movie.name;


            if (
                sortOrder.value ===
                "custom"
            ) {

                movieHeader.draggable =
                    true;

                movieHeader.dataset.movieName =
                    movie.name;

            }


            header.appendChild(
                movieHeader
            );

        }
    );


    timeline.appendChild(
        header
    );


    // =================================
    // タイムライン本体
    // =================================

    const body =
        document.createElement("div");


    body.className =
        "timeline-body";


    body.style.height =
        `${timelineHeight}px`;


    body.style.setProperty(
        "--movie-count",
        visibleMovies.length
    );


    // =================================
    // 時間軸
    // =================================

    const timeAxis =
        document.createElement("div");


    timeAxis.className =
        "timeline-time-axis";


    timeAxis.style.height =
        `${timelineHeight}px`;


    timeAxis.style.gridColumn =
        "1";


    // --------------------------------
    // 時間ラベル
    // --------------------------------

    for (
        let time = earliest;
        time <= latest;
        time += 30
    ) {

        const timeLabel =
            document.createElement("div");


        timeLabel.className =
            "timeline-time";


        timeLabel.style.top =
            `${(time - earliest) * pixelsPerMinute}px`;


        timeLabel.textContent =
            minutesToTime(time);


        timeAxis.appendChild(
            timeLabel
        );

    }


    body.appendChild(
        timeAxis
    );


    // =================================
    // 映画レーン
    // =================================

    visibleMovies.forEach(
        (movie, index) => {

            const lane =
                document.createElement("div");


            lane.className =
                "timeline-lane";


            lane.dataset.movieName =
                movie.name;


            lane.style.height =
                `${timelineHeight}px`;


            // 時間軸の次の列から配置
            lane.style.gridColumn =
                String(index + 2);


            if (
                sortOrder.value ===
                "custom"
            ) {

                lane.draggable =
                    true;

            }


            // --------------------------------
            // 30分ごとの横線
            // --------------------------------

            for (
                let time = earliest;
                time <= latest;
                time += 30
            ) {

                const line =
                    document.createElement("div");


                line.className =
                    "timeline-lane-line";


                line.style.top =
                    `${(time - earliest) * pixelsPerMinute}px`;


                lane.appendChild(
                    line
                );

            }


            // --------------------------------
            // 上映時間バー
            // --------------------------------

            movie.screenings.forEach(
                screening => {

                    const start =
                        timeToMinutes(
                            screening.start
                        );


                    const end =
                        timeToMinutes(
                            screening.end
                        );


                    const bar =
                        document.createElement("div");


                    bar.className =
                        "movie-bar";


                    bar.style.top =
                        `${(start - earliest) * pixelsPerMinute}px`;


                    bar.style.height =
                        `${(end - start) * pixelsPerMinute}px`;


                    bar.textContent =
                        `${screening.start} - ${screening.end}`;


                    lane.appendChild(
                        bar
                    );

                }
            );


            body.appendChild(
                lane
            );

        }
    );


    timeline.appendChild(
        body
    );


    // =================================
    // ドラッグ＆ドロップ
    // =================================

    setupVerticalTimelineDragAndDrop();

}


// ------------------------------------
// 縦型タイムライン
// ドラッグ＆ドロップ
// ------------------------------------

function setupVerticalTimelineDragAndDrop() {

    if (
        sortOrder.value !==
        "custom"
    ) {

        return;

    }


    const headers =
        document.querySelectorAll(
            ".timeline-movie-header[data-movie-name]"
        );


    headers.forEach(
        header => {

            header.addEventListener(
                "dragstart",
                () => {

                    header.classList.add(
                        "timeline-dragging"
                    );

                }
            );


            header.addEventListener(
                "dragend",
                () => {

                    header.classList.remove(
                        "timeline-dragging"
                    );


                    updateTimelineCustomOrder();

                }
            );


            header.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();


                    const dragging =
                        document.querySelector(
                            ".timeline-movie-header.timeline-dragging"
                        );


                    if (
                        !dragging ||
                        dragging === header
                    ) {

                        return;

                    }


                    const rect =
                        header.getBoundingClientRect();


                    const middle =
                        rect.left +
                        rect.width / 2;


                    if (
                        event.clientX <
                        middle
                    ) {

                        header.parentElement.insertBefore(
                            dragging,
                            header
                        );

                    }

                    else {

                        header.parentElement.insertBefore(
                            dragging,
                            header.nextSibling
                        );

                    }

                }
            );

        }
    );

}


// ------------------------------------
// タイムラインの順番を保存
// ------------------------------------

function updateTimelineCustomOrder() {

    const items =
        document.querySelectorAll(
            ".timeline-movie-header[data-movie-name]"
        );


    customOrder =
        Array.from(items).map(
            item =>
                item.dataset.movieName
        );


    saveState();


    renderTimeline();

}


// ------------------------------------
// 時刻 → 分
// ------------------------------------

function timeToMinutes(time) {

    const [hours, minutes] =
        time.split(":").map(Number);


    return (
        hours * 60 +
        minutes
    );

}


// ------------------------------------
// 分 → 時刻
// ------------------------------------

function minutesToTime(minutes) {

    const hours =
        Math.floor(
            minutes / 60
        ) % 24;


    const mins =
        minutes % 60;


    return (
        String(hours).padStart(
            2,
            "0"
        ) +
        ":" +
        String(mins).padStart(
            2,
            "0"
        )
    );

}


// ------------------------------------
// PWA
// ------------------------------------

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("/sw.js")

                .then(
                    () => {

                        console.log(
                            "Service Workerを登録しました"
                        );

                    }
                )

                .catch(
                    error => {

                        console.warn(
                            "Service Workerの登録に失敗しました:",
                            error
                        );

                    }
                );

        }
    );

}