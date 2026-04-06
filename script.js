let scheduleData = {};
let currentGroup = null;
let settings = {
    lecture: "#00ff00",
    practice: "#ffff00",
    lab: "#ff0000",
    showSubgroup: true,
    subgroupNumber: ""
};
let currentWeekStart = getMonday(new Date());
let selectedDayIndex = 0; // 0 = Пн, 6 = Вс
let settingsReturnScreen = "group-selection";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const groupSelectionScreen = document.getElementById("group-selection");
const mainScreen = document.getElementById("main-screen");
const settingsScreen = document.getElementById("settings-screen");
const groupsContainer = document.getElementById("groups");
const weekDaysContainer = document.getElementById("week-days");
const scheduleContainer = document.getElementById("schedule-container");
const currentDayLabel = document.getElementById("current-day");
const calendarInput = document.getElementById("calendar-input");
const settingsButton = document.getElementById("settings-btn");
const exitButton = document.getElementById("exit");

// Загрузка настроек из localStorage
const storedSettings = localStorage.getItem("settings");
if (storedSettings) {
    settings = { ...settings, ...JSON.parse(storedSettings) };
}

fetch("schedule.json")
    .then((res) => res.json())
    .then((data) => {
        scheduleData = data;
        initGroups();
        const savedGroup = localStorage.getItem("group");
        if (savedGroup && scheduleData[savedGroup]) {
            currentGroup = savedGroup;
            showMainScreen();
        }
    });

function initGroups() {
    groupsContainer.innerHTML = "";
    const facultyNames = ["Факультет 1", "Факультет 2", "Факультет 3"];
    const groups = Object.keys(scheduleData);
    const facultyGroups = [[], [], []];

    groups.forEach((groupName, index) => {
        facultyGroups[index % 3].push(groupName);
    });

    facultyNames.forEach((facultyName, facultyIndex) => {
        const section = document.createElement("section");
        section.classList.add("faculty-section");

        const title = document.createElement("div");
        title.classList.add("faculty-title");
        title.innerText = facultyName;

        const list = document.createElement("div");
        list.classList.add("faculty-groups");

        facultyGroups[facultyIndex].forEach((groupName) => {
            const btn = document.createElement("button");
            btn.classList.add("group-btn");
            btn.innerText = groupName;
            btn.onclick = () => {
                currentGroup = groupName;
                localStorage.setItem("group", groupName);
                showMainScreen();
            };
            list.appendChild(btn);
        });

        if (!facultyGroups[facultyIndex].length) {
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
    groupSelectionScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
    renderSchedule();
}

function showGroupSelectionScreen() {
    currentGroup = null;
    localStorage.removeItem("group");
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
        scheduleContainer.innerHTML = "";
        return;
    }

    renderWeekDays();

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + selectedDayIndex);
    const dayStr = formatDate(date);

    currentDayLabel.innerText = getWeekRange();
    scheduleContainer.innerHTML = "";
    applyScheduleTransition(transition);

    const lessons = scheduleData[currentGroup][dayStr] || [];
    if (!lessons.length) {
        scheduleContainer.innerHTML = "<div class=\"lesson\">Нет занятий</div>";
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
        timeDiv.innerText = lesson.time || "";

        const colorDiv = document.createElement("div");
        colorDiv.classList.add("color-bar");
        colorDiv.style.backgroundColor = getLessonTypeColor(lesson.type);

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("details");
        const titleRow = document.createElement("div");
        titleRow.classList.add("lesson-title-row");

        const subjectDiv = document.createElement("div");
        subjectDiv.classList.add("lesson-subject");
        subjectDiv.innerText = lesson.subject || "";
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
        detailsDiv.appendChild(roomDiv);

        row.appendChild(timeDiv);
        row.appendChild(colorDiv);
        row.appendChild(detailsDiv);
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

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekRange() {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${formatDate(start)} - ${formatDate(end)}`;
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
        лабораторная: "lab"
    };
    return map[normalized] || "lecture";
}

function getLessonTypeColor(type) {
    const normalized = normalizeLessonType(type);
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

setupSwipeNavigation();
setupWeekDaysSwipeNavigation();