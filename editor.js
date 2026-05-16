// Editor State
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let timerCountdown = false;

// Tab Switching
function switchEditorTab(tab) {
    document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.editor-tab').classList.add('active');
    document.querySelectorAll('.editor-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden');
}

// Scenes
function addScene() {
    const name = prompt('Scene naam:');
    if (!name) return;
    const list = document.getElementById('sceneList');
    const item = document.createElement('div');
    item.className = 'scene-item';
    item.innerHTML = `<i class="fas fa-desktop"></i> ${name}`;
    item.onclick = function() {
        document.querySelectorAll('.scene-item').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
    };
    list.appendChild(item);
}

function addSceneElement(type) {
    const canvas = document.getElementById('sceneCanvas');
    const el = document.createElement('div');
    el.className = 'scene-element';
    el.draggable = true;
    el.style.top = Math.random() * 50 + '%';
    el.style.left = Math.random() * 50 + '%';

    const icons = { text: 'fa-font', image: 'fa-image', webcam: 'fa-video', browser: 'fa-globe' };
    el.innerHTML = `<i class="fas ${icons[type]}"></i> ${type}`;
    el.style.background = `rgba(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0},0.3)`;
    canvas.appendChild(el);

    // Dragging
    el.addEventListener('mousedown', startDrag);
}

let dragEl = null, dragOffset = { x: 0, y: 0 };
function startDrag(e) {
    dragEl = e.target.closest('.scene-element');
    const rect = dragEl.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}
function onDrag(e) {
    if (!dragEl) return;
    const parent = dragEl.parentElement.getBoundingClientRect();
    dragEl.style.left = ((e.clientX - parent.left - dragOffset.x) / parent.width * 100) + '%';
    dragEl.style.top = ((e.clientY - parent.top - dragOffset.y) / parent.height * 100) + '%';
}
function stopDrag() { dragEl = null; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); }

// Overlays
function applyOverlay(type) {
    alert(`Overlay "${type}" toegepast! In een echte setup zou dit je OBS/streaming overlay veranderen.`);
}
function createCustomOverlay() {
    alert('Custom overlay editor geopend! Hier kun je je eigen overlay ontwerpen.');
}

// Events
function createEvent() {
    const name = document.getElementById('eventName').value;
    const date = document.getElementById('eventDate').value;
    if (!name || !date) { alert('Vul naam en datum in.'); return; }

    const d = new Date(date);
    const cards = document.getElementById('eventCards');
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `<div class="event-date"><span class="event-day">${d.getDate()}</span><span class="event-month">${d.toLocaleString('nl',{month:'short'}).toUpperCase()}</span></div>
        <div class="event-info"><h4>${name}</h4><p>${document.getElementById('eventStart').value} - ${document.getElementById('eventEnd').value}</p>
        <div class="event-tags"><span>${document.getElementById('eventType').value}</span></div></div>`;
    cards.appendChild(card);

    document.getElementById('eventName').value = '';
    document.getElementById('eventDesc').value = '';
}

// Timer
function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
        if (timerCountdown) {
            timerSeconds--;
            if (timerSeconds <= 0) { timerSeconds = 0; pauseTimer(); alert('Timer klaar!'); }
        } else {
            timerSeconds++;
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 0;
    timerCountdown = false;
    updateTimerDisplay();
}

function setCountdown(seconds) {
    pauseTimer();
    timerSeconds = seconds;
    timerCountdown = true;
    updateTimerDisplay();
    startTimer();
}

function setCustomCountdown() {
    const min = parseInt(document.getElementById('customMinutes').value) || 5;
    setCountdown(min * 60);
}

function updateTimerDisplay() {
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.floor((timerSeconds % 3600) / 60);
    const s = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Polls
function addPollOption() {
    const container = document.getElementById('pollOptions');
    const count = container.children.length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Optie ${count}`;
    container.appendChild(input);
}

function startPoll() {
    const question = document.getElementById('pollQuestion').value;
    if (!question) { alert('Voer een vraag in.'); return; }

    const options = Array.from(document.getElementById('pollOptions').children).map(i => i.value).filter(v => v);
    if (options.length < 2) { alert('Voeg minimaal 2 opties toe.'); return; }

    const duration = parseInt(document.getElementById('pollDuration').value) || 60;
    const active = document.getElementById('pollActive');
    active.innerHTML = `<h3>Actieve Poll</h3>
        <div class="poll-question">${question}</div>
        <div class="poll-results">${options.map((o, i) => `
            <div class="poll-result-item">
                <span>${o}</span>
                <div class="goal-bar"><div class="goal-fill" style="width:${Math.random()*80+10}%"></div></div>
                <span>${Math.floor(Math.random()*50)}%</span>
            </div>`).join('')}
        </div>
        <p style="margin-top:10px;font-size:0.8rem;color:var(--text-secondary);">Loopt nog ${duration} seconden</p>`;
}
