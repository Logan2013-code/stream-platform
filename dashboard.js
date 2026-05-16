const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let channel = state.channel || 'tiesgames22222';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initDashTwitch();
    startDashUpdates();
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
        document.getElementById('dashViewers').textContent = v;
        document.getElementById('dashFollowers').textContent = Math.floor(Math.random() * 50) + 750;
        document.getElementById('dashSubs').textContent = Math.floor(Math.random() * 5) + 12;
    }, 10000);

    let seconds = 0;
    setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        document.getElementById('dashUptime').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
}

function dashToggleStream() {
    const btn = document.getElementById('dashGoLive');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop Stream';
        btn.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
    } else {
        btn.innerHTML = '<i class="fas fa-broadcast-tower"></i> Go Live';
        btn.style.background = '';
    }
}

function dashToggleRecord() {
    const icon = document.getElementById('dashRecIcon');
    const text = document.getElementById('dashRecText');
    if (text.textContent === 'Opname') {
        icon.style.color = '#ef4444'; text.textContent = 'Stop';
    } else {
        icon.style.color = ''; text.textContent = 'Opname';
    }
}

function dashShareScreen() {
    navigator.mediaDevices.getDisplayMedia({ video: true }).catch(() => {});
}

function updateStreamTitle() {
    const title = document.getElementById('dashStreamTitle').value;
    alert('Titel bijgewerkt: ' + title);
}

function testAlert(type) {
    const messages = {
        follow: '🎉 TestUser is nu een volger!',
        sub: '⭐ TestUser subscribed! (Tier 1)',
        donation: '💰 TestUser doneerde €10.00!',
        raid: '🎊 TestUser raidde met 50 kijkers!',
        bits: '💎 TestUser cheered 500 bits!'
    };

    const list = document.getElementById('activityList');
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    item.innerHTML = `<i class="fas fa-${type === 'follow' ? 'heart' : type === 'sub' ? 'star' : type === 'raid' ? 'users' : 'coins'}"></i><span>${messages[type]}</span><small>nu</small>`;
    list.insertBefore(item, list.firstChild);
}

function modAction(action) {
    alert(`Moderatie: ${action} mode geactiveerd`);
}

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
}
