const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const today = days[new Date().getDay()];

document.getElementById("day").innerText = today.toUpperCase();

fetch("schedule.json")
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("schedule");
        const lessons = data[today] || [];

        if (lessons.length === 0) {
            container.innerHTML = "No classes";
        } else {
            lessons.forEach(l => {
                const div = document.createElement("div");
                div.innerText = `${l.time} — ${l.subject} (${l.room})`;
                container.appendChild(div);
            });
        }
    });