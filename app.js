const connection = document.getElementById("connection");
const bars = document.getElementById("bars");
const history = document.getElementById("history");
const signalCount = document.getElementById("signalCount");

let signals = 0;

function setConnection(status, online) {
    if (!connection) return;

    connection.textContent = status;
    connection.className = online ? "pill on" : "pill off";
}

function updateBars() {
    if (!bars) return;

    bars.innerHTML = "";

    for (let i = 0; i < 10; i++) {
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = `${20 + Math.floor(Math.random() * 70)}px`;
        bars.appendChild(bar);
    }
}

function addSignal(type) {
    if (!history || !signalCount) return;

    signals++;

    if (signals > 3) {
        signals = 3;
    }

    signalCount.textContent = `${signals}/3`;

    const item = document.createElement("div");
    item.className = "signal";

    item.innerHTML = `
        <strong>${type}</strong>
        <span>Match detected</span>
    `;

    history.prepend(item);
}

function startScanner() {
    setConnection("● Scanner ready", true);
    updateBars();

    setInterval(() => {
        updateBars();
    }, 3000);
}

document.addEventListener("DOMContentLoaded", startScanner);
