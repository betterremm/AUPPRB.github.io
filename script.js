const tg = window.Telegram.WebApp;
let scheduleData = {};
let currentGroup = null;
let settings = {
    lecture: "#00ff00",
    practice: "#ffff00",
    lab: "#ff0000",
    credit: "#8b5cf6",
    showSubgroup: true,
    subgroupNumber: ""
};
let currentWeekStart = getMonday(new Date());
let selectedDayIndex = 0; // 0 = Пн, 6 = Вс
let settingsReturnScreen = "group-selection";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EARLY_TESTERS_NOTICE = `Любые недочеты и проблемы - пишите tg: @mishas23`;

const groupSelectionScreen = document.getElementById("group-selection");
const mainScreen = document.getElementById("main-screen");
const settingsScreen = document.getElementById("settings-screen");
const groupsContainer = document.getElementById("groups");
const weekDaysContainer = document.getElementById("week-days");
const scheduleContainer = document.getElementById("schedule-container");
const currentDayLabel = document.getElementById("current-day");
const weekMonthCaption = document.getElementById("week-month-caption");
const lessonModal = document.getElementById("lesson-modal");
const lessonModalTitle = document.getElementById("lesson-modal-title");
const lessonModalBody = document.getElementById("lesson-modal-body");
const calendarInput = document.getElementById("calendar-input");
const settingsButton = document.getElementById("settings-btn");
const exitButton = document.getElementById("exit");

const MONTH_NAMES_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

// Загрузка настроек из localStorage
const storedSettings = localStorage.getItem("settings");
if (storedSettings) {
    settings = { ...settings, ...JSON.parse(storedSettings) };
}
if (!settings.credit) {
    settings.credit = "#8b5cf6";
}

function applyEarlyTestersNotice() {
    const el = document.getElementById("early-testers-panel");
    if (!el) {
        return;
    }
    const text = EARLY_TESTERS_NOTICE.trim();
    if (!text) {
        el.classList.add("hidden");
        el.textContent = "";
        return;
    }
    el.classList.remove("hidden");
    el.textContent = text;
}

applyEarlyTestersNotice();

const SCHEDULE_SELECTION_KEY = "scheduleSelection";

function findGroupInScheduleData(rootData, groupName) {
    const keys = Object.keys(rootData || {});
    for (let i = 0; i < keys.length; i += 1) {
        const facultyName = keys[i];
        const facultyData = rootData[facultyName];
        if (!facultyData || typeof facultyData !== "object" || Array.isArray(facultyData)) {
            continue;
        }
        const block = facultyData[groupName];
        if (
            block
            && typeof block === "object"
            && !Array.isArray(block)
            && Array.isArray(block.subjects)
        ) {
            return { facultyName, facultyData };
        }
    }
    return null;
}

function saveScheduleSelection(facultyName, groupName) {
    localStorage.setItem(
        SCHEDULE_SELECTION_KEY,
        JSON.stringify({ faculty: facultyName, group: groupName })
    );
}

function tryRestoreSavedSchedule(rootData) {
    const raw = localStorage.getItem(SCHEDULE_SELECTION_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const faculty = parsed && parsed.faculty;
            const group = parsed && parsed.group;
            if (
                faculty
                && group
                && rootData[faculty]
                && rootData[faculty][group]
                && Array.isArray(rootData[faculty][group].subjects)
            ) {
                currentGroup = group;
                scheduleData = rootData[faculty];
                showMainScreen();
                return;
            }
        } catch (e) {
            /* ignore */
        }
    }
    const legacyGroup = localStorage.getItem("group");
    if (legacyGroup) {
        const found = findGroupInScheduleData(rootData, legacyGroup);
        if (found) {
            currentGroup = legacyGroup;
            scheduleData = found.facultyData;
            saveScheduleSelection(found.facultyName, legacyGroup);
            localStorage.removeItem("group");
            showMainScreen();
        }
    }
}

fetch("schedule.json")
    .then((res) => res.json())
    .then((data) => {
        scheduleData = data;
        initGroups();
        tryRestoreSavedSchedule(data);
    });

function initGroups() {
    groupsContainer.innerHTML = "";

    Object.keys(scheduleData).forEach((facultyName) => {
        const facultyData = scheduleData[facultyName];

        const section = document.createElement("section");
        section.classList.add("faculty-section");

        const title = document.createElement("div");
        title.classList.add("faculty-title");
        title.innerText = facultyName;

        const list = document.createElement("div");
        list.classList.add("faculty-groups");

        // Берём только группы (игнорируем lecture_room, lab_subjects и т.п.)
        const groups = Object.keys(facultyData).filter((key) => {
            const value = facultyData[key];
            return typeof value === "object" && value !== null && !Array.isArray(value) && key.match(/^\d/);
        });

        groups.forEach((groupName) => {
            const btn = document.createElement("button");
            btn.classList.add("group-btn");
            btn.innerText = groupName;

            btn.onclick = () => {
                currentGroup = groupName;
                saveScheduleSelection(facultyName, groupName);

                // ВАЖНО: теперь scheduleData должен указывать на группу
                scheduleData = facultyData;

                showMainScreen();
            };

            list.appendChild(btn);
        });

        if (!groups.length) {
            const empty = document.createElement("div");
            empty.style.opacity = "0.65";
            empty.style.fontSize = "0.9rem";
            empty.innerText = "Группы отсутствуют";
            list.appendChild(empty);
        }

        section.appendChild(title);
        section.appendChild(list);
        groupsContainer.appendChild(section);
    });
}

function showMainScreen() {
    focusTodayInScheduleView();
    groupSelectionScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
    renderSchedule();
}

function showGroupSelectionScreen() {
    currentGroup = null;
    mainScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
    groupSelectionScreen.classList.remove("hidden");
}

function showSettingsScreen(fromScreenId) {
    settingsReturnScreen = fromScreenId || "group-selection";
    mainScreen.classList.add("hidden");
    groupSelectionScreen.classList.add("hidden");
    settingsScreen.classList.remove("hidden");

    document.getElementById("color-lecture").value = settings.lecture;
    document.getElementById("color-practice").value = settings.practice;
    document.getElementById("color-lab").value = settings.lab;
    document.getElementById("color-credit").value = settings.credit || "#8b5cf6";
    document.getElementById("show-subgroup").checked = settings.showSubgroup;
    document.getElementById("subgroup-number").value = settings.subgroupNumber || "";
}

function returnFromSettings() {
    settingsScreen.classList.add("hidden");
    if (settingsReturnScreen === "main-screen" && currentGroup) {
        mainScreen.classList.remove("hidden");
        renderSchedule();
    } else {
        groupSelectionScreen.classList.remove("hidden");
    }
}

function applyScheduleTransition(transition) {
    scheduleContainer.classList.remove("slide-in-left", "slide-in-right");
    // Принудительный reflow, чтобы анимация стабильно перезапускалась.
    // eslint-disable-next-line no-unused-expressions
    scheduleContainer.offsetWidth;
    if (transition === "left") {
        scheduleContainer.classList.add("slide-in-left");
    } else if (transition === "right") {
        scheduleContainer.classList.add("slide-in-right");
    }
}

function renderSchedule(transition = "") {
    if (!currentGroup || !scheduleData[currentGroup]) {
        if (weekMonthCaption) {
            weekMonthCaption.textContent = "";
        }
        if (currentDayLabel) {
            currentDayLabel.textContent = "";
        }
        scheduleContainer.innerHTML = "";
        return;
    }

    renderWeekDays();
    if (weekMonthCaption) {
        weekMonthCaption.textContent = getWeekMonthCaption();
    }

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + selectedDayIndex);
    const dayStr = formatDate(date);

    if (currentDayLabel) {
        currentDayLabel.textContent = getWeekYearCaption();
    }
    scheduleContainer.innerHTML = "";
    applyScheduleTransition(transition);

    const lessons = scheduleData[currentGroup][dayStr] || [];
    if (!lessons.length) {
        scheduleContainer.innerHTML = "<div class=\"lesson lesson--empty\">Нет занятий</div>";
        return;
    }

    lessons.forEach((lesson) => {
        const row = document.createElement("div");
        row.classList.add("lesson");
        const fadedBySubgroup = shouldFadeLessonBySubgroup(lesson);
        if (fadedBySubgroup) {
            row.classList.add("lesson-faded");
        }

        const timeDiv = document.createElement("div");
        timeDiv.classList.add("time");
        const clockStr = extractLessonClock(lesson.time);
        const creditLike = isCreditLikeLesson(lesson);
        const timeStart = document.createElement("span");
        timeStart.classList.add("time-start");
        timeStart.textContent = clockStr || "—";
        timeDiv.appendChild(timeStart);
        if (!creditLike) {
            const endStr = getPairedLessonEndTime(lesson.time);
            if (endStr) {
                const timeEnd = document.createElement("span");
                timeEnd.classList.add("time-end");
                timeEnd.textContent = endStr;
                timeDiv.appendChild(timeEnd);
            }
        }

        const colorDiv = document.createElement("div");
        colorDiv.classList.add("color-bar");
        colorDiv.style.backgroundColor = getLessonTypeColor(lesson.type);

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("details");
        const titleRow = document.createElement("div");
        titleRow.classList.add("lesson-title-row");

        const meta = findSubjectMeta(lesson);
        const { tail } = parseLessonTimeField(lesson.time);
        const listAbbrev = getLessonListAbbrev(lesson, meta);

        const subjectDiv = document.createElement("div");
        subjectDiv.classList.add("lesson-subject");
        subjectDiv.innerText = listAbbrev;
        titleRow.appendChild(subjectDiv);

        if (settings.showSubgroup && lesson.subgroup) {
            const subDiv = document.createElement("span");
            subDiv.classList.add("subgroup");
            subDiv.innerText = `👤 ${lesson.subgroup}`;
            titleRow.appendChild(subDiv);
        }

        const roomDiv = document.createElement("div");
        roomDiv.classList.add("lesson-room");
        roomDiv.innerText = lesson.room ? `Кабинет: ${lesson.room}` : "";

        detailsDiv.appendChild(titleRow);
        if (creditLike) {
            let examRaw = lesson.exam_type != null && String(lesson.exam_type).trim()
                ? String(lesson.exam_type).trim()
                : inferExamTypeRawFromTail(tail);
            let examLabel = formatExamTypeDisplay(examRaw);
            if (!examLabel) {
                examLabel = "Зачёт";
            }
            const examDiv = document.createElement("div");
            examDiv.classList.add("lesson-exam-kind");
            examDiv.textContent = examLabel;
            detailsDiv.appendChild(examDiv);
        }
        detailsDiv.appendChild(roomDiv);

        row.appendChild(timeDiv);
        row.appendChild(colorDiv);
        row.appendChild(detailsDiv);
        row.addEventListener("click", () => openLessonModal(lesson));
        scheduleContainer.appendChild(row);
    });
}

function changeDay(delta, transition = "") {
    const nextIndex = selectedDayIndex + delta;
    if (nextIndex < 0) {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        selectedDayIndex = 6;
    } else if (nextIndex > 6) {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        selectedDayIndex = 0;
    } else {
        selectedDayIndex = nextIndex;
    }
    renderSchedule(transition);
}

function renderWeekDays() {
    weekDaysContainer.innerHTML = "";

    for (let i = 0; i < 7; i += 1) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);

        const day = document.createElement("div");
        day.classList.add("day");
        if (i === selectedDayIndex) {
            day.classList.add("active");
        }
        day.innerText = `${dayLabels[i]}\n${date.getDate()}`;
        day.onclick = () => {
            const previousIndex = selectedDayIndex;
            selectedDayIndex = i;
            renderSchedule(i > previousIndex ? "left" : "right");
        };
        weekDaysContainer.appendChild(day);
    }
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function focusTodayInScheduleView() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentWeekStart = getMonday(today);
    const dow = today.getDay();
    selectedDayIndex = dow === 0 ? 6 : dow - 1;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekYearCaption() {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const y0 = start.getFullYear();
    const y1 = end.getFullYear();
    if (y0 === y1) {
        return String(y0);
    }
    return `${y0} - ${y1}`;
}

function getWeekMonthCaption() {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const m0 = start.getMonth();
    const m1 = end.getMonth();
    const y0 = start.getFullYear();
    const y1 = end.getFullYear();
    if (m0 === m1 && y0 === y1) {
        return MONTH_NAMES_RU[m0];
    }
    if (y0 !== y1) {
        return `${MONTH_NAMES_RU[m0]} ${y0} - ${MONTH_NAMES_RU[m1]} ${y1}`;
    }
    return `${MONTH_NAMES_RU[m0]} - ${MONTH_NAMES_RU[m1]}`;
}

function extractLessonClock(timeStr) {
    const m = String(timeStr || "").trim().match(/^(\d{1,2}:\d{2})\b/);
    if (!m) {
        return "";
    }
    const parts = m[1].split(":");
    const h = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(min)) {
        return "";
    }
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseLessonTimeField(timeStr) {
    const full = String(timeStr || "").trim();
    const clock = extractLessonClock(full);
    const tail = clock ? full.slice(full.indexOf(clock) + clock.length).trim() : "";
    return { clock, tail };
}

const EXAM_TAIL_STOPWORDS = new Set(["зачет", "зачёт", "экзамен", "диф"]);

function extractAbbrevFromExamTail(tail) {
    const tokens = String(tail || "").split(/\s+/).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
        const raw = tokens[i].replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "");
        if (!raw) {
            continue;
        }
        const low = raw.toLowerCase();
        if (EXAM_TAIL_STOPWORDS.has(low)) {
            continue;
        }
        return raw;
    }
    return "";
}

function inferExamTypeRawFromTail(tail) {
    const low = String(tail || "").toLowerCase();
    if (low.includes("экзамен")) {
        return "экзамен";
    }
    if (/диф/.test(low)) {
        return "диф зачет";
    }
    if (low.includes("зачет") || low.includes("зачёт")) {
        return "зачет";
    }
    return "";
}

function isCreditLikeLesson(lesson) {
    return normalizeLessonType(lesson.type) === "credit";
}

function findSubjectMeta(lesson) {
    const block = scheduleData[currentGroup];
    const list = block && Array.isArray(block.subjects) ? block.subjects : [];
    let key = (lesson.subject || "").trim();
    if (!key || /^unknown$/i.test(key)) {
        const { tail } = parseLessonTimeField(lesson.time);
        key = extractAbbrevFromExamTail(tail);
    }
    if (!key) {
        return null;
    }
    const keyLow = key.toLowerCase();
    return list.find((s) => (s.abbreviation || "").trim().toLowerCase() === keyLow) || null;
}

function getLessonListAbbrev(lesson, meta) {
    if (meta && meta.abbreviation && String(meta.abbreviation).trim()) {
        return String(meta.abbreviation).trim();
    }
    const raw = String(lesson.subject || "").trim();
    if (raw && !/^unknown$/i.test(raw)) {
        return raw;
    }
    const { tail } = parseLessonTimeField(lesson.time);
    return extractAbbrevFromExamTail(tail) || "—";
}

function getLessonModalFullTitle(lesson, meta) {
    if (meta && meta.subject && String(meta.subject).trim()) {
        return String(meta.subject).trim();
    }
    const raw = String(lesson.subject || "").trim();
    if (raw && !/^unknown$/i.test(raw)) {
        const block = scheduleData[currentGroup];
        const list = block && Array.isArray(block.subjects) ? block.subjects : [];
        const found = list.find(
            (s) => (s.abbreviation || "").trim().toLowerCase() === raw.toLowerCase()
        );
        if (found && found.subject) {
            return String(found.subject).trim();
        }
        return raw;
    }
    const { tail } = parseLessonTimeField(lesson.time);
    const ab = extractAbbrevFromExamTail(tail);
    if (ab) {
        const block = scheduleData[currentGroup];
        const list = block && Array.isArray(block.subjects) ? block.subjects : [];
        const found = list.find(
            (s) => (s.abbreviation || "").trim().toLowerCase() === ab.toLowerCase()
        );
        if (found && found.subject) {
            return String(found.subject).trim();
        }
        return ab;
    }
    return "Занятие";
}

function getTeacherForLessonType(lesson, meta) {
    if (lesson.teacher && String(lesson.teacher).trim()) {
        return String(lesson.teacher).trim();
    }
    if (!meta) {
        return "";
    }
    const t = normalizeLessonType(lesson.type);
    const map = {
        lecture: meta.lecture_teacher,
        practice: meta.practice_teacher,
        lab: meta.lab_teacher,
        credit: meta.credit_teacher
    };
    const raw = map[t];
    return raw && String(raw).trim() ? String(raw).trim() : "";
}

function formatExamTypeDisplay(examType) {
    if (examType === null || examType === undefined) {
        return "";
    }
    const s = String(examType).trim();
    if (!s) {
        return "";
    }
    const low = s.toLowerCase();
    if (low === "экзамен") {
        return "Экзамен";
    }
    if (low === "зачет" || low === "зачёт") {
        return "Зачёт";
    }
    if (low.includes("диф")) {
        return "Диф. зачёт";
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getLessonTypeLabelRu(type) {
    const n = normalizeLessonType(type);
    const labels = {
        lecture: "Лекция",
        practice: "Практика",
        lab: "Лабораторная работа",
        credit: "Зачётная работа"
    };
    return labels[n] || (type ? String(type) : "Занятие");
}

const LESSON_SLOT_MINUTES = 40;
const LESSON_BREAK_MINUTES = 5;

function parseTimeToMinutes(timeStr) {
    const clock = extractLessonClock(timeStr);
    if (!clock) {
        return null;
    }
    const parts = clock.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) {
        return null;
    }
    return h * 60 + m;
}

function minutesToHHmm(totalMinutes) {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getPairedLessonEndTime(startTimeStr) {
    const start = parseTimeToMinutes(startTimeStr);
    if (start === null) {
        return "";
    }
    const span = LESSON_SLOT_MINUTES + LESSON_BREAK_MINUTES + LESSON_SLOT_MINUTES;
    return minutesToHHmm(start + span);
}

function formatPairedLessonTime(startTimeStr) {
    const start = parseTimeToMinutes(startTimeStr);
    if (start === null) {
        return String(startTimeStr || "").trim();
    }
    const firstEnd = start + LESSON_SLOT_MINUTES;
    const secondStart = firstEnd + LESSON_BREAK_MINUTES;
    const secondEnd = secondStart + LESSON_SLOT_MINUTES;
    const line1 = `${minutesToHHmm(start)}-${minutesToHHmm(firstEnd)}`;
    const line2 = `${minutesToHHmm(secondStart)}-${minutesToHHmm(secondEnd)}`;
    return `${line1}\n${line2}`;
}

function appendModalRow(container, label, value, options = {}) {
    const rowEl = document.createElement("div");
    rowEl.className = "lesson-modal-row";
    const labelEl = document.createElement("div");
    labelEl.className = "lesson-modal-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    valueEl.className = "lesson-modal-value";
    if (options.multiline) {
        valueEl.classList.add("lesson-modal-value--multiline");
    }
    valueEl.textContent = value;
    rowEl.appendChild(labelEl);
    rowEl.appendChild(valueEl);
    container.appendChild(rowEl);
}

function openLessonModal(lesson) {
    const meta = findSubjectMeta(lesson);
    const { tail } = parseLessonTimeField(lesson.time);
    lessonModalTitle.textContent = getLessonModalFullTitle(lesson, meta);
    lessonModalBody.innerHTML = "";

    const accentEl = document.getElementById("lesson-modal-accent");
    if (accentEl) {
        accentEl.style.backgroundColor = getLessonTypeColor(lesson.type);
    }

    appendModalRow(lessonModalBody, "Форма занятия", getLessonTypeLabelRu(lesson.type));
    const teacher = getTeacherForLessonType(lesson, meta);
    if (teacher) {
        appendModalRow(lessonModalBody, "Преподаватель", teacher);
    }
    if (lesson.room && String(lesson.room).trim()) {
        appendModalRow(lessonModalBody, "Аудитория", String(lesson.room).trim());
    }
    const rawTime = String(lesson.time || "").trim();
    const clock = extractLessonClock(rawTime);
    const creditLike = isCreditLikeLesson(lesson);
    if (clock) {
        const timeParsed = parseTimeToMinutes(rawTime) !== null;
        if (creditLike) {
            appendModalRow(lessonModalBody, "Время", clock);
        } else {
            appendModalRow(
                lessonModalBody,
                "Время",
                formatPairedLessonTime(rawTime),
                { multiline: timeParsed }
            );
        }
    }
    let examRaw = lesson.exam_type != null && String(lesson.exam_type).trim()
        ? String(lesson.exam_type).trim()
        : inferExamTypeRawFromTail(tail);
    if (!examRaw && meta && meta.exam_type != null && String(meta.exam_type).trim()) {
        examRaw = String(meta.exam_type).trim();
    }
    let examText = formatExamTypeDisplay(examRaw);
    if (creditLike && !examText) {
        examText = "Зачёт";
    }
    if (examText) {
        appendModalRow(lessonModalBody, "Итоговый контроль", examText);
    }

    lessonModal.classList.remove("hidden");
    const modalCard = lessonModal.querySelector(".lesson-modal-card");
    if (modalCard) {
        modalCard.classList.remove("slide-in-left", "slide-in-right");
        // eslint-disable-next-line no-unused-expressions
        modalCard.offsetWidth;
        modalCard.classList.add("slide-in-left");
    }
}

function closeLessonModal() {
    const modalCard = lessonModal.querySelector(".lesson-modal-card");
    if (modalCard) {
        modalCard.classList.remove("slide-in-left", "slide-in-right");
    }
    lessonModal.classList.add("hidden");
}

function normalizeLessonType(type) {
    const normalized = String(type || "")
        .trim()
        .toLowerCase();
    const map = {
        lecture: "lecture",
        лекция: "lecture",
        practice: "practice",
        practical: "practice",
        практика: "practice",
        lab: "lab",
        laboratory: "lab",
        лабораторная: "lab",
        credit: "credit",
        зачет: "credit",
        зачёт: "credit",
        assessment: "credit",
        exam: "credit"
    };
    return map[normalized] || "lecture";
}

function getLessonTypeColor(type) {
    const normalized = normalizeLessonType(type);
    if (normalized === "credit") {
        return settings.credit || "#8b5cf6";
    }
    return settings[normalized] || "#888";
}

function shouldFadeLessonBySubgroup(lesson) {
    if (!settings.subgroupNumber) {
        return false;
    }
    if (lesson.subgroup === null || lesson.subgroup === undefined || lesson.subgroup === "") {
        return false;
    }
    return String(lesson.subgroup) !== String(settings.subgroupNumber);
}

settingsButton.onclick = () => showSettingsScreen("group-selection");
exitButton.onclick = () => showGroupSelectionScreen();

document.getElementById("save-settings").onclick = () => {
    settings.lecture = document.getElementById("color-lecture").value;
    settings.practice = document.getElementById("color-practice").value;
    settings.lab = document.getElementById("color-lab").value;
    settings.credit = document.getElementById("color-credit").value;
    settings.showSubgroup = document.getElementById("show-subgroup").checked;
    settings.subgroupNumber = document.getElementById("subgroup-number").value;
    localStorage.setItem("settings", JSON.stringify(settings));
    returnFromSettings();
};

document.getElementById("close-settings").onclick = () => {
    returnFromSettings();
};

calendarInput.addEventListener("pointerdown", () => {
    const selectedDate = new Date(currentWeekStart);
    selectedDate.setDate(currentWeekStart.getDate() + selectedDayIndex);
    calendarInput.value = formatDate(selectedDate);
});

calendarInput.onchange = (event) => {
    const value = event.target.value;
    if (!value) {
        return;
    }
    const selectedDate = new Date(`${value}T00:00:00`);
    currentWeekStart = getMonday(selectedDate);
    let day = selectedDate.getDay();
    day = day === 0 ? 6 : day - 1;
    selectedDayIndex = day;
    renderSchedule("left");
};

function setupSwipeNavigation() {
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let swiping = false;
    let activeTouchId = null;
    const threshold = 50;
    const verticalThreshold = 60;
    const swipeTarget = mainScreen;

    function onSwipeEnd() {
        if (!swiping) {
            return;
        }
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        swiping = false;
        activeTouchId = null;

        if (Math.abs(deltaX) < threshold || Math.abs(deltaY) > verticalThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
            return;
        }

        if (deltaX < 0) {
            changeDay(1, "left");
        } else {
            changeDay(-1, "right");
        }
    }

    swipeTarget.addEventListener("touchstart", (event) => {
        if (
            settingsScreen.classList.contains("hidden") === false
            || mainScreen.classList.contains("hidden")
            || event.target.closest("#week-days")
            || event.target.closest(".calendar-picker")
        ) {
            return;
        }
        const touch = event.changedTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        endX = startX;
        endY = startY;
        activeTouchId = touch.identifier;
        swiping = true;
    }, { passive: true });

    swipeTarget.addEventListener("touchmove", (event) => {
        if (!swiping) {
            return;
        }
        const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
        if (!touch) {
            return;
        }
        endX = touch.clientX;
        endY = touch.clientY;
    }, { passive: true });

    swipeTarget.addEventListener("touchend", (event) => {
        if (!swiping) {
            return;
        }
        const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
        if (touch) {
            endX = touch.clientX;
            endY = touch.clientY;
        }
        onSwipeEnd();
    }, { passive: true });

    swipeTarget.addEventListener("touchcancel", () => {
        swiping = false;
        activeTouchId = null;
    }, { passive: true });
}

function setupWeekDaysSwipeNavigation() {
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let swiping = false;
    let activeTouchId = null;
    const threshold = 50;
    const verticalThreshold = 60;

    weekDaysContainer.addEventListener("touchstart", (event) => {
        if (mainScreen.classList.contains("hidden")) {
            return;
        }
        const touch = event.changedTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        endX = startX;
        endY = startY;
        activeTouchId = touch.identifier;
        swiping = true;
    }, { passive: true });

    weekDaysContainer.addEventListener("touchmove", (event) => {
        if (!swiping) {
            return;
        }
        const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
        if (!touch) {
            return;
        }
        endX = touch.clientX;
        endY = touch.clientY;
    }, { passive: true });

    weekDaysContainer.addEventListener("touchend", (event) => {
        if (!swiping) {
            return;
        }
        const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
        if (touch) {
            endX = touch.clientX;
            endY = touch.clientY;
        }
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        swiping = false;
        activeTouchId = null;

        if (Math.abs(deltaX) < threshold || Math.abs(deltaY) > verticalThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
            return;
        }

        if (deltaX < 0) {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            renderSchedule("left");
        } else {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            renderSchedule("right");
        }
    }, { passive: true });

    weekDaysContainer.addEventListener("touchcancel", () => {
        swiping = false;
        activeTouchId = null;
    }, { passive: true });
}

if (lessonModal) {
    lessonModal.querySelectorAll("[data-lesson-modal-close]").forEach((el) => {
        el.addEventListener("click", closeLessonModal);
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lessonModal && !lessonModal.classList.contains("hidden")) {
        closeLessonModal();
    }
});


tg.expand();
tg.ready();

setupSwipeNavigation();
setupWeekDaysSwipeNavigation();