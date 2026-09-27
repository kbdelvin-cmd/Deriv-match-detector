const connection = document.getElementById("connection");
const bars = document.getElementById("bars");
const history = document.getElementById("history");
const signalCount = document.getElementById("signalCount");

const appIdInput = document.getElementById("appId");
const marketInput = document.getElementById("market");
const windowInput = document.getElementById("window");
const limitInput = document.getElementById("limit");
const scanBtn = document.getElementById("scanBtn");

let ws = null;
let scanning = false;
let signals = 0;
let digits = [];

function setConnection(status, online) {
    if (!connection) return;

    connection.textContent = status;
    connection.className = online ? "pill online" : "pill offline";
}

function updateSignalCount() {
    if (signalCount) {
        signalCount.textContent = `${signals}/${limitInput.value}`;
    }
}

function updateBars() {
    if (!bars) return;

    bars.innerHTML = "";

    const counts = Array(10).fill(0);

    digits.forEach(digit => {
        if (digit >= 0 && digit <= 9) {
            counts[digit]++;
        }
    });

    const max = Math.max(...counts, 1);

    for (let i = 0; i < 10; i++) {
        const bar = document.createElement("div");
        bar.className = "bar";

        bar.style.height =
            `${20 + (counts[i] / max) * 120}px`;

        bar.title = `Digit ${i}: ${counts[i]}`;

        bars.appendChild(bar);
    }
}

function showDigits() {
    const digitBox = document.getElementById("digits");

    if (!digitBox) return;

    digitBox.innerHTML = "";

    [...digits].reverse().forEach(digit => {
        const item = document.createElement("span");
        item.className = "digit";
        item.textContent = digit;
        digitBox.appendChild(item);
    });
}

function addSignal(type, digit) {
    const limit = Number(limitInput.value);

    if (!history || !signalCount) return;

    if (signals >= limit) return;

    signals++;

    signalCount.textContent = `${signals}/${limit}`;

    const item = document.createElement("div");
    item.className = "signal";

    item.innerHTML = `
        <strong>${type}</strong>
        <span>Digit ${digit} detected from live ticks</span>
    `;

    history.prepend(item);
}

function processTick(data) {
    if (!data || !data.tick) return;

    const tick = data.tick;

    const pipSize = Number(tick.pip_size || 2);
    const quote = Number(tick.quote);

    if (!Number.isFinite(quote)) return;

    const formatted = quote.toFixed(pipSize);
    const lastDigit = Number(formatted.slice(-1));

    if (!Number.isInteger(lastDigit)) return;

    digits.push(lastDigit);

    // Keep recent data only
    if (digits.length > 20) {
        digits.shift();
    }

    updateBars();
    showDigits();

    checkMatch();
}

function checkMatch() {
    const windowSize = Number(windowInput.value);

    if (digits.length < windowSize) return;

    const recent = digits.slice(-windowSize);

    /*
      1 tick:
      Displays the latest live digit.

      2–3 ticks:
      Looks for the same digit repeating across
      the selected number of recent ticks.
    */

    if (windowSize === 1) {
        return;
    }

    const first = recent[0];

    const allSame = recent.every(digit => digit === first);

    if (allSame) {
        addSignal("MATCH", first);
    }
}

function stopScanner() {
    scanning = false;

    if (ws) {
        try {
            ws.close();
        } catch (e) {}
    }

    ws = null;

    setConnection("● Scanner stopped", false);

    if (scanBtn) {
        scanBtn.textContent = "🚀 START SCANNER";
    }
}

function startScanner() {
    const appId = appIdInput.value.trim();
    const symbol = marketInput.value;

    if (!appId) {
        setConnection("Enter your Deriv App ID", false);
        return;
    }

    if (!symbol) {
        setConnection("Select a market", false);
        return;
    }

    if (ws) {
        try {
            ws.close();
        } catch (e) {}
    }

    signals = 0;
    digits = [];

    updateSignalCount();
    updateBars();
    showDigits();

    if (history) {
        history.innerHTML = "<p>Waiting for live ticks...</p>";
    }

    setConnection("● Connecting to Deriv...", false);

    const url =
        `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`;

    ws = new WebSocket(url);

    ws.onopen = function () {
        scanning = true;

        setConnection("● SCANNING LIVE TICKS", true);

        if (scanBtn) {
            scanBtn.textContent = "⏹ STOP SCANNER";
        }

        ws.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1
        }));
    };

    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                setConnection(
                    "Error: " + data.error.message,
                    false
                );
                return;
            }

            if (data.tick) {
                processTick(data);
            }

        } catch (error) {
            console.error("Tick processing error:", error);
        }
    };

    ws.onerror = function () {
        setConnection("● Connection error", false);
    };

    ws.onclose = function () {
        if (scanning) {
            setConnection("● Connection closed", false);

            if (scanBtn) {
                scanBtn.textContent = "🚀 START SCANNER";
            }

            scanning = false;
        }
    };
}

document.addEventListener("DOMContentLoaded", function () {

    if (scanBtn) {
        scanBtn.addEventListener("click", function () {

            if (scanning) {
                stopScanner();
            } else {
                startScanner();
            }

        });
    }

    if (limitInput) {
        limitInput.addEventListener("change", updateSignalCount);
    }

    updateSignalCount();
    updateBars();
});
