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

    const icons = { text: 'fa-font', image: 'fa-image', webcam: 'fa-video', browser: 'fa-globe', game: 'fa-gamepad', screen: 'fa-desktop' };
    const labels = { text: 'Tekst', image: 'Afbeelding', webcam: 'Webcam', browser: 'Browser', game: 'Game', screen: 'Scherm' };
    el.innerHTML = `<i class="fas ${icons[type]}"></i> ${labels[type] || type}`;
    el.style.background = `rgba(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0},0.3)`;
    canvas.appendChild(el);
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('click', () => selectElement(el));
}

function selectElement(el) {
    document.querySelectorAll('.scene-element').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    const props = document.getElementById('sourceProps');
    if (props) props.classList.add('visible');
}

// Dragging
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

// Transitions
function previewTransition() {
    const canvas = document.getElementById('sceneCanvas');
    const type = document.getElementById('transitionType').value.toLowerCase();
    canvas.style.animation = 'none';
    canvas.offsetHeight;
    canvas.style.animation = `trans-${type.split(' ')[0]} 0.5s ease`;
    setTimeout(() => canvas.style.animation = '', 600);
    showEditorNotif('Transitie preview: ' + document.getElementById('transitionType').value);
}

// Studio Mode
function toggleStudioMode() {
    const enabled = document.getElementById('studioMode').checked;
    const preview = document.querySelector('.scene-preview-area');
    if (enabled) {
        preview.classList.add('studio-mode');
        showEditorNotif('Studio Mode ingeschakeld');
    } else {
        preview.classList.remove('studio-mode');
        showEditorNotif('Studio Mode uitgeschakeld');
    }
}

// Overlays
function applyOverlay(type) {
    showEditorNotif(`Overlay "${type}" toegepast! ✨`);
}
function createCustomOverlay() {
    showEditorNotif('Custom overlay editor geopend! 🎨');
}

// Audio Mixer
function updateMeter(channel, value) {
    const meter = document.getElementById('meter' + channel.charAt(0).toUpperCase() + channel.slice(1));
    if (meter) meter.style.width = value + '%';
}

function toggleMute(channel) {
    const btn = event.target.closest('.ch-btn');
    btn.classList.toggle('muted');
    const icon = btn.querySelector('i');
    if (btn.classList.contains('muted')) {
        icon.className = 'fas fa-volume-mute';
        showEditorNotif(`${channel} gedempt`);
    } else {
        icon.className = channel === 'mic' ? 'fas fa-microphone' : 'fas fa-volume-up';
        showEditorNotif(`${channel} unmuted`);
    }
}

// Simulate audio meters
setInterval(() => {
    document.querySelectorAll('.meter-fill').forEach(meter => {
        const base = parseInt(meter.style.width) || 50;
        const variation = Math.random() * 20 - 10;
        meter.style.width = Math.max(5, Math.min(95, base + variation)) + '%';
    });
}, 200);

// Alerts Editor
function selectAlertType(type) {
    document.querySelectorAll('.alert-type-card').forEach(c => c.classList.remove('active'));
    event.target.closest('.alert-type-card').classList.add('active');

    const icons = { follow: 'fa-heart', sub: 'fa-star', donation: 'fa-coins', raid: 'fa-users', bits: 'fa-gem', host: 'fa-tv' };
    const colors = { follow: '#ec4899', sub: '#a855f7', donation: '#f97316', raid: '#06b6d4', bits: '#8b5cf6', host: '#10b981' };
    const msgs = { follow: '{username} volgt nu!', sub: '{username} subscribed!', donation: '{username} doneerde {amount}!', raid: '{username} raidde met {viewers} kijkers!', bits: '{username} cheered {amount} bits!', host: '{username} host met {viewers} kijkers!' };

    const preview = document.getElementById('alertEditorPreview');
    preview.innerHTML = `<div class="alert-preview-demo"><i class="fas ${icons[type]} fa-3x" style="color:${colors[type]};"></i><h3>${type.charAt(0).toUpperCase() + type.slice(1)} Alert</h3><p>${msgs[type]}</p></div>`;
    document.getElementById('alertTemplate').value = msgs[type];
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
        <div class="event-tags"><span>${document.getElementById('eventType').value}</span></div></div>
        <button class="event-edit"><i class="fas fa-edit"></i></button>`;
    cards.appendChild(card);
    document.getElementById('eventName').value = '';
    document.getElementById('eventDesc').value = '';
    showEditorNotif('Event aangemaakt! 📅');
}

// Timer
function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
        if (timerCountdown) {
            timerSeconds--;
            if (timerSeconds <= 0) { timerSeconds = 0; pauseTimer(); showEditorNotif('Timer klaar! ⏰'); }
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
        <p style="margin-top:10px;font-size:0.8rem;color:var(--text-secondary);">Loopt nog ${duration} seconden</p>
        <button class="ctrl-btn btn-full" onclick="endPoll()" style="margin-top:10px;"><i class="fas fa-stop"></i> Stop Poll</button>`;
    showEditorNotif('Poll gestart! 📊');
}

function endPoll() {
    document.getElementById('pollActive').innerHTML = '<h3>Actieve Poll</h3><p class="empty-state">Geen actieve poll. Maak er een hierboven.</p>';
    showEditorNotif('Poll beëindigd!');
}

// Effects
function triggerEffect(effect) {
    const canvas = document.getElementById('sceneCanvas');
    const overlay = document.createElement('div');
    overlay.className = `effect-overlay effect-${effect}`;
    canvas.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3000);
    showEditorNotif(`Effect "${effect}" getriggerd! ✨`);
}

// Widgets
function addWidget(type) {
    showEditorNotif(`Widget "${type}" toegevoegd aan scene! 🧩`);
    addSceneElement(type);
}

// Branding
function applyBrandPreset(preset) {
    const presets = {
        neon: { primary: '#a855f7', secondary: '#06b6d4', accent: '#ec4899' },
        fire: { primary: '#ef4444', secondary: '#f97316', accent: '#eab308' },
        ocean: { primary: '#10b981', secondary: '#06b6d4', accent: '#22d3ee' },
        pink: { primary: '#ec4899', secondary: '#a855f7', accent: '#f472b6' },
        gold: { primary: '#eab308', secondary: '#f97316', accent: '#f59e0b' }
    };
    const p = presets[preset];
    if (!p) return;
    document.getElementById('brandPrimary').value = p.primary;
    document.getElementById('brandSecondary').value = p.secondary;
    document.getElementById('brandAccent').value = p.accent;
    showEditorNotif(`Brand preset "${preset}" toegepast! 🎨`);
}

// Notifications
function showEditorNotif(msg) {
    let n = document.getElementById('editorNotif');
    if (!n) {
        n = document.createElement('div');
        n.id = 'editorNotif';
        n.className = 'dash-notif';
        document.body.appendChild(n);
    }
    n.textContent = msg;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3000);
}
