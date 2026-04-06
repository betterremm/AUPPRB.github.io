let scheduleData;
let currentGroup;
let currentDate = new Date();
let settings = {
    lecture: "#00ff00",
    practice: "#ffff00",
    lab: "#ff0000",
    showSubgroup: true
};

// Загрузка настроек
if(localStorage.getItem("settings")){
    settings = JSON.parse(localStorage.getItem("settings"));
}

// Fetch JSON
fetch("schedule.json")
    .then(res => res.json())
    .then(data => {
        scheduleData = data;
        initGroups();
    });

// Инициализация выбора группы
function initGroups(){
    const groupDiv = document.getElementById("groups");
    Object.keys(scheduleData).forEach(g => {
        const btn = document.createElement("button");
        btn.innerText = g;
        btn.onclick = () => {
            currentGroup = g;
            localStorage.setItem("group", g);
            showMainScreen();
        }
        groupDiv.appendChild(btn);
    });
}

// Показ главного экрана
function showMainScreen(){
    document.getElementById("group-selection").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
    renderSchedule();
}

// Выход к выбору группы
document.getElementById("exit").onclick = () => {
    currentGroup = null;
    localStorage.removeItem("group");
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("group-selection").classList.remove("hidden");
}

// Стрелки смены недели
document.getElementById("prev-week").onclick = () => {
    currentDate.setDate(currentDate.getDate() - 7);
    renderSchedule();
}
document.getElementById("next-week").onclick = () => {
    currentDate.setDate(currentDate.getDate() + 7);
    renderSchedule();
}

// Настройки
document.getElementById("settings-btn").onclick = () => {
    document.getElementById("settings-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");

    document.getElementById("color-lecture").value = settings.lecture;
    document.getElementById("color-practice").value = settings.practice;
    document.getElementById("color-lab").value = settings.lab;
    document.getElementById("show-subgroup").checked = settings.showSubgroup;
}

document.getElementById("save-settings").onclick = () => {
    settings.lecture = document.getElementById("color-lecture").value;
    settings.practice = document.getElementById("color-practice").value;
    settings.lab = document.getElementById("color-lab").value;
    settings.showSubgroup = document.getElementById("show-subgroup").checked;
    localStorage.setItem("settings", JSON.stringify(settings));
    document.getElementById("settings-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
    renderSchedule();
}

document.getElementById("close-settings").onclick = () => {
    document.getElementById("settings-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
}

// Render Schedule
function renderSchedule(){
    const dayStr = currentDate.toISOString().split("T")[0];
    document.getElementById("current-day").innerText = dayStr;

    const container = document.getElementById("schedule-container");
    container.innerHTML = "";

    const lessons = scheduleData[currentGroup][dayStr] || [];
    lessons.forEach(l => {
        const div = document.createElement("div");
        div.classList.add("lesson");

        const timeDiv = document.createElement("div");
        timeDiv.classList.add("time");
        timeDiv.innerText = l.time;

        const colorDiv = document.createElement("div");
        colorDiv.classList.add("color-bar");
        colorDiv.style.backgroundColor = settings[l.type] || "#888";

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("details");
        detailsDiv.innerText = `${l.subject} (${l.room})`;
        if(settings.showSubgroup && l.subgroup) {
            const subDiv = document.createElement("span");
            subDiv.classList.add("subgroup");
            subDiv.innerText = `Subgroup ${l.subgroup}`;
            detailsDiv.appendChild(subDiv);
        }

        div.appendChild(timeDiv);
        div.appendChild(colorDiv);
        div.appendChild(detailsDiv);

        container.appendChild(div);
    });
}