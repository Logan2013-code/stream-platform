const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let channel = state.channel || 'tiesgames22222';
let viewerData = [];
let healthData = [];
let streamSeconds = 0;
let peakViewers = 0;
let totalRevenue = 0;

document.addEventListener('DOMContentLoaded', () => {
    initDashTwitch();
    startDashUpdates();
    initViewerGraph();
    initHealthGraph();
    initTimeline();
    initAutomod();
});

function initDashTwitch() {
    try {
        new Twitch.Embed("dashTwitchEmbed", {
            width: "100%", height: "100%", channel: channel,
            layout: "video", autoplay: true, muted: true, parent: PARENT_DOMAINS
        });
    } catch (e) {}

    document.getElementById('dashChatEmbed').innerHTML = `<iframe src="https://www.twitch.tv/embed/${channel}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout" height="100%" width="100%" style="border:none;border-radius:8px;"></iframe>`;
}

function startDashUpdates() {
    setInterval(() => {
        const v = Math.floor(Math.random() * 20) + 5;
        if (v > peakViewers) peakViewers = v;
        viewerData.push(v);
        if (viewerData.length > 60) viewerData.shift();

        document.getElementById('dashViewers').textContent = v;
        document.getElementById('dashFollowers').textContent = Math.floor(Math.random() * 50) + 750;
        document.getElementById('dashSubs').textContent = Math.floor(Math.random() * 5) + 12;
        document.getElementById('dashPeakViewers').textContent = peakViewers;
        document.getElementById('dashRevenue').textContent = '€' + totalRevenue.toFixed(0);

        const cpu = Math.floor(Math.random() * 30) + 30;
        healthData.push(cpu);
        if (healthData.length > 30) healthData.shift();
        document.getElementById('healthCpu').textContent = cpu + '%';
        document.getElementById('healthRam').textContent = Math.floor(Math.random() * 20) + 55 + '%';

        drawViewerGraph();
        drawHealthGraph();
    }, 5000);

    setInterval(() => {
        streamSeconds++;
        const h = Math.floor(streamSeconds / 3600);
        const m = Math.floor((streamSeconds % 3600) / 60);
        const s = streamSeconds % 60;
        document.getElementById('dashUptime').textContent = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);

    // Random activity
    setInterval(() => {
        const types = ['follow', 'sub', 'donation', 'bits', 'raid'];
        const names = ['xGamer_NL', 'StreamKing', 'PixelPro', 'NeonFan99', 'CoolViewer', 'DutchGamer', 'ProPlayer_X', 'TwitchFan'];
        const type = types[Math.floor(Math.random() * types.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        simulateActivity(type, name);
    }, 15000);
}

function simulateActivity(type, name) {
    const messages = {
        follow: `${name} is nu een volger!`,
        sub: `${name} subscribed! (Tier ${Math.floor(Math.random()*3)+1})`,
        donation: `${name} doneerde €${(Math.random()*20+1).toFixed(2)}!`,
        bits: `${name} cheered ${Math.floor(Math.random()*500+50)} bits!`,
        raid: `${name} raidde met ${Math.floor(Math.random()*50+5)} kijkers!`
    };

    if (type === 'donation') totalRevenue += parseFloat((Math.random()*20+1).toFixed(2));
    if (type === 'bits') totalRevenue += Math.floor(Math.random()*5+0.5);

    const list = document.getElementById('activityList');
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    const icons = { follow: 'fa-heart', sub: 'fa-star', donation: 'fa-coins', bits: 'fa-gem', raid: 'fa-users' };
    item.innerHTML = `<i class="fas ${icons[type]}"></i><span>${messages[type]}</span><small>nu</small>`;
    list.insertBefore(item, list.firstChild);
    if (list.children.length > 20) list.removeChild(list.lastChild);

    addTimelineEvent(type, messages[type]);
}

// Viewer Graph
function initViewerGraph() {
    for (let i = 0; i < 30; i++) viewerData.push(Math.floor(Math.random() * 15) + 5);
    drawViewerGraph();
}

function drawViewerGraph() {
    const canvas = document.getElementById('viewerGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...viewerData, 1);
    const step = w / (viewerData.length - 1);

    // Fill
    ctx.beginPath();
    ctx.moveTo(0, h);
    viewerData.forEach((v, i) => ctx.lineTo(i * step, h - (v / max) * (h - 20)));
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(168,85,247,0.3)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    viewerData.forEach((v, i) => {
        const x = i * step, y = h - (v / max) * (h - 20);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Health Graph
function initHealthGraph() {
    for (let i = 0; i < 20; i++) healthData.push(Math.floor(Math.random() * 20) + 35);
    drawHealthGraph();
}

function drawHealthGraph() {
    const canvas = document.getElementById('healthGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const step = w / (healthData.length - 1);
    ctx.beginPath();
    healthData.forEach((v, i) => {
        const x = i * step, y = h - (v / 100) * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// Timeline
let timelineEvents = [];
function initTimeline() {
    const progress = document.getElementById('timelineProgress');
    if (progress) progress.style.width = '0%';
}

function addTimelineEvent(type, msg) {
    timelineEvents.push({ type, msg, time: streamSeconds });
    const container = document.getElementById('timelineEvents');
    if (!container) return;
    const percent = Math.min((streamSeconds / 3600) * 100, 100);
    const dot = document.createElement('div');
    dot.className = `timeline-dot ${type}`;
    dot.style.left = percent + '%';
    dot.title = msg;
    container.appendChild(dot);
}

// Stream Controls
function dashToggleStream() {
    const btn = document.getElementById('dashGoLive');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop Stream';
        btn.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
        document.querySelector('.status-dot').className = 'status-dot live';
        document.querySelector('.status-dot + span').textContent = 'LIVE';
    } else {
        btn.innerHTML = '<i class="fas fa-broadcast-tower"></i> Go Live';
        btn.style.background = '';
        document.querySelector('.status-dot').className = 'status-dot offline';
        document.querySelector('.status-dot + span').textContent = 'Offline';
    }
}

function dashToggleRecord() {
    const icon = document.getElementById('dashRecIcon');
    const text = document.getElementById('dashRecText');
    if (text.textContent === 'Opname') {
        icon.style.color = '#ef4444'; text.textContent = 'Stop';
        icon.classList.add('recording-pulse');
    } else {
        icon.style.color = ''; text.textContent = 'Opname';
        icon.classList.remove('recording-pulse');
    }
}

function dashShareScreen() {
    navigator.mediaDevices.getDisplayMedia({ video: true }).catch(() => {});
}

function dashClip() {
    const list = document.getElementById('clipList');
    const item = document.createElement('div');
    item.className = 'clip-item new';
    item.innerHTML = `<div class="clip-thumb"><i class="fas fa-play"></i></div><div class="clip-info"><span class="clip-title">Clip ${new Date().toLocaleTimeString()}</span><span class="clip-meta">30s • nu • 0 views</span></div><button class="clip-share"><i class="fas fa-share"></i></button>`;
    list.insertBefore(item, list.firstChild);
    showNotif('Clip aangemaakt! 🎬');
}

function dashMarker() {
    addTimelineEvent('marker', 'Stream marker geplaatst');
    showNotif('Marker geplaatst! 📍');
}

function dashAd() { showNotif('Ad break gestart (90s) 📺'); }

function dashRaid() {
    const target = prompt('Raid naar welk kanaal?');
    if (target) executeRaid(target);
}

function executeRaid(target) {
    if (!target) return;
    showNotif(`Raiding ${target}! 🎊`);
    simulateActivity('raid', target);
}

function updateStreamTitle() {
    const title = document.getElementById('dashStreamTitle').value;
    showNotif('Titel bijgewerkt: ' + title);
}

// Tags
function addTag() {
    const input = document.getElementById('dashTagInput');
    if (!input.value.trim()) return;
    const tagList = document.getElementById('dashTags');
    const tag = document.createElement('span');
    tag.className = 'stream-tag';
    tag.innerHTML = `${input.value.trim()} <i class="fas fa-times" onclick="removeTag(this)"></i>`;
    tagList.appendChild(tag);
    input.value = '';
}

function removeTag(el) { el.parentElement.remove(); }

// Alerts
function testAlert(type) {
    const messages = {
        follow: '🎉 TestUser is nu een volger!',
        sub: '⭐ TestUser subscribed! (Tier 1)',
        donation: '💰 TestUser doneerde €10.00!',
        raid: '🎊 TestUser raidde met 50 kijkers!',
        bits: '💎 TestUser cheered 500 bits!',
        host: '📺 TestUser host met 30 kijkers!'
    };

    const preview = document.getElementById('alertPreview');
    preview.innerHTML = `<div class="alert-demo active ${type}"><i class="fas fa-${type === 'follow' ? 'heart' : type === 'sub' ? 'star' : type === 'raid' ? 'users' : type === 'bits' ? 'gem' : 'coins'}"></i><span>${messages[type]}</span></div>`;
    preview.classList.add('flash');
    setTimeout(() => preview.classList.remove('flash'), 1000);

    simulateActivity(type, messages[type].replace(/[🎉⭐💰🎊💎📺] /, ''));
}

// Moderation
function modAction(action) {
    const btn = document.getElementById('mod' + action.charAt(0).toUpperCase() + action.slice(1));
    if (btn) btn.classList.toggle('mod-active');
    showNotif(`${action} mode ${btn && btn.classList.contains('mod-active') ? 'aan' : 'uit'}!`);
}

function initAutomod() {
    const slider = document.getElementById('automodLevel');
    if (slider) {
        slider.oninput = () => document.getElementById('automodLevelVal').textContent = slider.value;
    }
}

// Chatbot
function addCommand() {
    const name = document.getElementById('cmdName').value;
    const response = document.getElementById('cmdResponse').value;
    if (!name || !response) return;

    const list = document.getElementById('chatbotList');
    const item = document.createElement('div');
    item.className = 'chatbot-item';
    item.innerHTML = `<code>${name}</code><span>${response}</span>`;
    list.appendChild(item);
    document.getElementById('cmdName').value = '';
    document.getElementById('cmdResponse').value = '';
    showNotif(`Command ${name} toegevoegd!`);
}

// Soundboard
function playSound(name) {
    showNotif(`🔊 ${name} afgespeeld!`);
    const btn = event.target.closest('.sound-btn');
    if (btn) { btn.classList.add('sound-playing'); setTimeout(() => btn.classList.remove('sound-playing'), 500); }
}

// Chat Quick Actions
function sendQuickChat(msg) {
    showNotif(`Chat: "${msg}" verzonden!`);
}

// Activity Filter
function filterActivity(type) {
    document.querySelectorAll('.af-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.activity-item').forEach(item => {
        item.style.display = (type === 'all' || item.classList.contains(type)) ? '' : 'none';
    });
}

// Predictions
function startPrediction() {
    const q = document.getElementById('predQuestion').value;
    if (!q) return;
    const yes = document.getElementById('predYes').value || 'Ja!';
    const no = document.getElementById('predNo').value || 'Nee...';
    document.getElementById('predActive').innerHTML = `
        <div class="pred-live"><span class="pred-badge">LIVE</span> ${q}</div>
        <div class="pred-bars">
            <div class="pred-option yes"><span>${yes}</span><div class="pred-bar"><div class="pred-fill" style="width:${Math.random()*60+20}%"></div></div><span>${Math.floor(Math.random()*1000+100)} pts</span></div>
            <div class="pred-option no"><span>${no}</span><div class="pred-bar"><div class="pred-fill" style="width:${Math.random()*60+20}%"></div></div><span>${Math.floor(Math.random()*1000+100)} pts</span></div>
        </div>
        <button class="ctrl-btn btn-full" onclick="endPrediction()"><i class="fas fa-stop"></i> Stop Prediction</button>`;
    showNotif('Prediction gestart! 🔮');
}

function endPrediction() {
    document.getElementById('predActive').innerHTML = '<p class="empty-state">Geen actieve prediction</p>';
    showNotif('Prediction beëindigd!');
}

// Goals
function addGoal() {
    const name = prompt('Doel naam:');
    if (!name) return;
    const target = prompt('Doel waarde:') || '100';
    const goals = document.querySelector('.dash-goals');
    const btn = goals.querySelector('.ctrl-btn');
    const item = document.createElement('div');
    item.className = 'goal-item';
    item.innerHTML = `<div class="goal-info"><span>${name}</span><strong>0 / ${target}</strong></div><div class="goal-bar"><div class="goal-fill" style="width:0%"></div></div>`;
    goals.insertBefore(item, btn);
}

// Schedule
function editSchedule() { showNotif('Schema editor geopend! 📅'); }

// Notifications
function showNotif(msg) {
    let n = document.getElementById('dashNotif');
    if (!n) {
        n = document.createElement('div');
        n.id = 'dashNotif';
        n.className = 'dash-notif';
        document.body.appendChild(n);
    }
    n.textContent = msg;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3000);
}
