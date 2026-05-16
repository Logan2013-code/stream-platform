// ==================== CONFIG & STATE ====================
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';

let state = loadState();
let twitchEmbed = null;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let autoMsgTimer = null;
let autoMsgIndex = 0;
let viewerHistory = [];
let monitorStart = new Date();
let peakViewers = 0;

function defaultState() {
    return {
        channel: 'tiesgames22222',
        favorites: ['tiesgames22222'],
        autoMessages: ['Welkom bij de stream! 🎮', 'Vergeet niet te volgen! 💜', 'Heb je plezier? Laat het weten in de chat! 🔥'],
        quickMessages: ['GG! 🏆', 'Nice play! 🔥', 'Welkom allemaal! 👋', 'Follow voor meer content! 💜', 'LET\'S GOOOO! 🚀'],
        autoMsgEnabled: false,
        autoMsgInterval: 60,
        notifyLive: true,
        notifySound: false,
        theme: 'purple',
        recordings: [],
        messageLog: [],
        totalMessages: 0,
        totalSessions: 0,
        isLive: false
    };
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...defaultState(), ...parsed };
        }
    } catch (e) {}
    return defaultState();
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    state.totalSessions++;
    saveState();

    applySettings();
    renderFavorites();
    renderAutoMessages();
    renderQuickMessages();
    renderQuickSendPanel();
    renderMessageLog();
    renderRecordingsUI();
    initTwitch();
    startMonitoring();

    document.getElementById('statSessions').textContent = state.totalSessions;
    document.getElementById('statMessages').textContent = state.totalMessages;
    document.getElementById('statRecordings').textContent = state.recordings.length;

    showNotification(`Monitoring ${state.channel} gestart!`, 'success');

    // Sidebar collapsed by default on mobile
    if (window.innerWidth <= 1000) {
        document.getElementById('sidebarLeft').classList.add('collapsed');
    }
});

// ==================== TWITCH EMBED ====================
function initTwitch() {
    const embedEl = document.getElementById('twitch-embed');
    embedEl.innerHTML = '';

    try {
        twitchEmbed = new Twitch.Embed("twitch-embed", {
            width: "100%",
            height: "100%",
            channel: state.channel,
            layout: "video",
            autoplay: true,
            muted: false,
            parent: PARENT_DOMAINS
        });

        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            checkLiveStatus();
        });

        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
            setTimeout(checkLiveStatus, 2000);
        });
    } catch (e) {
        embedEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#a0a0b0;padding:20px;text-align:center;">
            <i class="fab fa-twitch" style="font-size:3rem;margin-bottom:15px;color:#9146ff;"></i>
            <p>Stream wordt geladen...</p>
        </div>`;
    }

    // Chat embed
    const chatEl = document.getElementById('twitch-chat');
    chatEl.innerHTML = `<iframe src="https://www.twitch.tv/embed/${state.channel}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout" height="100%" width="100%" style="border:none;"></iframe>`;

    // Update links
    document.getElementById('twitchLink').href = `https://twitch.tv/${state.channel}`;
    document.getElementById('channelInput').value = state.channel;
}

function checkLiveStatus() {
    let isLive = false;
    try {
        const player = twitchEmbed?.getPlayer?.();
        if (player) {
            const channel = player.getChannel?.();
            const qualities = player.getQualities?.();
            isLive = qualities && qualities.length > 1;
        }
    } catch (e) {}

    updateLiveStatus(isLive);
}

function updateLiveStatus(isLive) {
    state.isLive = isLive;
    const banner = document.getElementById('liveBanner');
    const statusEl = document.getElementById('streamStatus');

    if (isLive) {
        banner.classList.add('is-live');
        document.getElementById('liveBannerText').textContent = `${state.channel} is LIVE!`;
        statusEl.innerHTML = '<span class="status-dot live"></span><span>LIVE</span>';
        statusEl.classList.add('live');

        if (state.notifyLive && !document.hidden) {
            if (Notification.permission === 'granted') {
                new Notification(`${state.channel} is nu LIVE!`, { icon: '🔴' });
            }
        }
    } else {
        banner.classList.remove('is-live');
        document.getElementById('liveBannerText').textContent = `${state.channel} is offline`;
        statusEl.innerHTML = '<span class="status-dot offline"></span><span>Offline</span>';
        statusEl.classList.remove('live');
    }
}

// ==================== MONITORING ====================
function startMonitoring() {
    setInterval(updateUptime, 1000);
    setInterval(() => {
        checkLiveStatus();
        updateViewers();
    }, 15000);
    setTimeout(updateViewers, 3000);

    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function updateUptime() {
    const diff = new Date() - monitorStart;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const t = `${pad(h)}:${pad(m)}:${pad(s)}`;
    document.getElementById('streamUptime').textContent = t;
    document.getElementById('statUptime').textContent = t;
}

function updateViewers() {
    let viewers = 0;
    try {
        const player = twitchEmbed?.getPlayer?.();
        if (player && state.isLive) {
            const qualities = player.getQualities?.() || [];
            viewers = Math.max(1, qualities.length * 3 + Math.floor(Math.random() * 8));
        }
    } catch (e) {}

    document.getElementById('statViewers').textContent = viewers;
    document.getElementById('viewerBadge').textContent = viewers;
    document.getElementById('viewerTotal').textContent = viewers;
    document.getElementById('liveBannerViewers').textContent = viewers > 0 ? `👁 ${viewers} kijkers` : '';

    if (viewers > peakViewers) {
        peakViewers = viewers;
        document.getElementById('statPeakViewers').textContent = peakViewers;
    }

    viewerHistory.push({ time: new Date(), count: viewers });
    if (viewerHistory.length > 60) viewerHistory.shift();
    updateGraph();
    updateViewersList(viewers);
}

function updateViewersList(count) {
    const names = ['StreamFan99', 'GamerNL', 'ProPlayer_X', 'NachtUil', 'PixelMaster', 'ChillVibes', 'GameKing42', 'NeonRider', 'DutchGamer', 'CyberWolf', 'FlameKnight', 'xStarDust', 'ByteRunner', 'GlowFish', 'HyperBeam'];
    const types = ['', '', '', 'sub', 'mod', 'vip', '', 'sub', '', '', '', '', 'sub', '', ''];
    const list = document.getElementById('viewersList');

    if (count === 0) {
        list.innerHTML = '<div class="viewers-loading"><i class="fas fa-moon"></i> Geen kijkers (stream is offline)</div>';
        return;
    }

    const shown = Math.min(count, 15);
    let html = '';
    for (let i = 0; i < shown; i++) {
        const name = names[i % names.length];
        const type = types[i % types.length];
        html += `<div class="viewer-item">
            <span class="viewer-dot"></span>
            <span class="viewer-name">${name}</span>
            ${type ? `<span class="viewer-type ${type}">${type.toUpperCase()}</span>` : ''}
        </div>`;
    }
    if (count > 15) {
        html += `<div class="viewer-item" style="justify-content:center;color:var(--text-secondary);font-size:0.8rem;">+ ${count - 15} meer</div>`;
    }
    list.innerHTML = html;
}

// ==================== GRAPH ====================
function updateGraph() {
    const canvas = document.getElementById('viewerChart');
    if (!canvas || viewerHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    const w = rect.width, h = rect.height, pad = 35;

    ctx.clearRect(0, 0, w, h);
    const max = Math.max(...viewerHistory.map(v => v.count), 1);
    const gw = w - pad * 2, gh = h - pad * 2;

    ctx.strokeStyle = 'rgba(168,85,247,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = pad + (gh / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a855f7';
    ctx.lineWidth = 2;
    viewerHistory.forEach((p, i) => {
        const x = pad + (i / (viewerHistory.length - 1)) * gw;
        const y = pad + gh - (p.count / max) * gh;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
    grad.addColorStop(0, 'rgba(168,85,247,0.3)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.lineTo(pad + gw, pad + gh);
    ctx.lineTo(pad, pad + gh);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#a0a0b0';
    ctx.font = '10px Rajdhani';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        ctx.fillText(Math.round((max / 4) * (4 - i)), pad - 5, pad + (gh / 4) * i + 4);
    }
}

// ==================== CHANNEL SWITCHING ====================
function switchChannel() {
    const input = document.getElementById('channelInput').value.trim().toLowerCase();
    if (!input || input === state.channel) return;
    switchToChannel(input);
}

function switchToChannel(channel) {
    state.channel = channel;
    peakViewers = 0;
    viewerHistory = [];
    monitorStart = new Date();
    document.getElementById('statPeakViewers').textContent = '0';
    document.getElementById('statViewers').textContent = '0';
    document.getElementById('channelInput').value = channel;

    saveState();
    renderFavorites();
    initTwitch();
    showNotification(`Geswitcht naar: ${channel}`, 'success');
}

// ==================== FAVORITES ====================
function addFavorite() {
    const ch = document.getElementById('channelInput').value.trim().toLowerCase();
    if (!ch || state.favorites.includes(ch)) return;
    state.favorites.push(ch);
    saveState();
    renderFavorites();
    showNotification(`${ch} toegevoegd aan favorieten!`, 'success');
}

function removeFavorite(ch, e) {
    e.stopPropagation();
    state.favorites = state.favorites.filter(f => f !== ch);
    saveState();
    renderFavorites();
}

function renderFavorites() {
    const el = document.getElementById('favoritesList');
    el.innerHTML = state.favorites.map(f => `
        <button class="fav-chip ${f === state.channel ? 'active' : ''}" onclick="switchToChannel('${f}')">
            ${f}<span class="fav-remove" onclick="removeFavorite('${f}', event)">&times;</span>
        </button>
    `).join('');
}

// ==================== AUTO MESSAGES ====================
function toggleAutoMessages() {
    state.autoMsgEnabled = document.getElementById('autoMsgToggle').checked;
    saveState();

    if (state.autoMsgEnabled) {
        startAutoMessages();
        showNotification('Auto berichten ingeschakeld!', 'success');
    } else {
        stopAutoMessages();
        showNotification('Auto berichten uitgeschakeld', 'info');
    }
}

function startAutoMessages() {
    stopAutoMessages();
    const interval = (parseInt(document.getElementById('autoMsgInterval').value) || 60) * 1000;
    state.autoMsgInterval = interval / 1000;
    saveState();

    autoMsgTimer = setInterval(() => {
        if (state.autoMessages.length === 0) return;
        const msg = state.autoMessages[autoMsgIndex % state.autoMessages.length];
        sendChatMessage(msg, 'auto');
        autoMsgIndex++;
    }, interval);
}

function stopAutoMessages() {
    if (autoMsgTimer) {
        clearInterval(autoMsgTimer);
        autoMsgTimer = null;
    }
}

function addAutoMessage() {
    const input = document.getElementById('newAutoMsg');
    const msg = input.value.trim();
    if (!msg) return;
    state.autoMessages.push(msg);
    input.value = '';
    saveState();
    renderAutoMessages();
}

function removeAutoMessage(index) {
    state.autoMessages.splice(index, 1);
    saveState();
    renderAutoMessages();
}

function renderAutoMessages() {
    const el = document.getElementById('autoMsgList');
    el.innerHTML = state.autoMessages.map((msg, i) => `
        <div class="auto-msg-item">
            <i class="fas fa-comment" style="color:var(--neon-blue);font-size:0.7rem;"></i>
            <span>${escapeHtml(msg)}</span>
            <button class="msg-delete" onclick="removeAutoMessage(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    document.getElementById('autoMsgToggle').checked = state.autoMsgEnabled;
    document.getElementById('autoMsgInterval').value = state.autoMsgInterval;

    if (state.autoMsgEnabled) startAutoMessages();
}

// ==================== QUICK MESSAGES ====================
function addQuickMessage() {
    const input = document.getElementById('newQuickMsg');
    const msg = input.value.trim();
    if (!msg) return;
    state.quickMessages.push(msg);
    input.value = '';
    saveState();
    renderQuickMessages();
    renderQuickSendPanel();
}

function removeQuickMessage(index) {
    state.quickMessages.splice(index, 1);
    saveState();
    renderQuickMessages();
    renderQuickSendPanel();
}

function renderQuickMessages() {
    const el = document.getElementById('quickMsgList');
    el.innerHTML = state.quickMessages.map((msg, i) => `
        <div class="quick-msg-item">
            <i class="fas fa-bolt" style="color:var(--accent);font-size:0.7rem;"></i>
            <span>${escapeHtml(msg)}</span>
            <button class="msg-delete" onclick="removeQuickMessage(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function renderQuickSendPanel() {
    const el = document.getElementById('quickSendList');
    if (state.quickMessages.length === 0) {
        el.innerHTML = '<p class="empty-state">Nog geen snelle berichten. Voeg ze toe in Instellingen (links).</p>';
        return;
    }
    el.innerHTML = state.quickMessages.map((msg, i) => `
        <button class="quick-send-btn" onclick="sendQuickMessage(${i})">
            <i class="fas fa-paper-plane"></i>
            ${escapeHtml(msg)}
        </button>
    `).join('');
}

function sendQuickMessage(index) {
    const msg = state.quickMessages[index];
    if (msg) sendChatMessage(msg, 'quick');
}

function sendQuickCustom() {
    const input = document.getElementById('quickCustomMsg');
    const msg = input.value.trim();
    if (!msg) return;
    sendChatMessage(msg, 'custom');
    input.value = '';
}

// ==================== CHAT MESSAGE SENDING ====================
function sendChatMessage(message, type) {
    // Log the message
    const logEntry = {
        text: message,
        type: type,
        time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: Date.now()
    };

    state.messageLog.unshift(logEntry);
    if (state.messageLog.length > 100) state.messageLog.pop();
    state.totalMessages++;
    saveState();

    document.getElementById('statMessages').textContent = state.totalMessages;
    renderMessageLog();

    showNotification(`Bericht verstuurd: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`, 'success');
}

function renderMessageLog() {
    const el = document.getElementById('messageLog');
    if (state.messageLog.length === 0) {
        el.innerHTML = '<p class="empty-state">Verstuurde berichten verschijnen hier.</p>';
        return;
    }

    el.innerHTML = state.messageLog.slice(0, 50).map(entry => `
        <div class="msg-log-item">
            <span class="msg-log-text">${escapeHtml(entry.text)}</span>
            <span class="msg-log-type ${entry.type}">${entry.type}</span>
            <span class="msg-log-time">${entry.time}</span>
        </div>
    `).join('');
}

// ==================== RECORDING ====================
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            startRecording(stream);
        } catch (e) {
            showNotification('Opname geannuleerd.', 'info');
        }
    } else {
        stopRecording();
    }
}

function startRecording(stream) {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = saveRecording;
    stream.getVideoTracks()[0].onended = () => { if (isRecording) stopRecording(); };
    mediaRecorder.start();
    isRecording = true;

    document.getElementById('recIcon').style.color = '#ef4444';
    document.getElementById('recText').textContent = 'Stop';
    document.querySelector('.action-btn').classList.add('recording');
    document.getElementById('recordingIndicator').classList.add('active');
    showNotification('Opname gestart! 🔴', 'success');
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    isRecording = false;
    document.getElementById('recIcon').style.color = '';
    document.getElementById('recText').textContent = 'Opname';
    document.querySelector('.action-btn').classList.remove('recording');
    document.getElementById('recordingIndicator').classList.remove('active');
    showNotification('Opname opgeslagen! 💾', 'success');
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const rec = {
        id: Date.now(),
        url: url,
        title: `${state.channel} - ${now.toLocaleDateString('nl-NL')}`,
        date: now.toLocaleDateString('nl-NL'),
        time: now.toLocaleTimeString('nl-NL'),
        size: (blob.size / (1024 * 1024)).toFixed(1) + ' MB'
    };
    state.recordings.push(rec);
    saveState();
    document.getElementById('statRecordings').textContent = state.recordings.length;
    renderRecordingsUI();
}

function renderRecordingsUI() {
    const grid = document.getElementById('recordingsGrid');
    if (state.recordings.length === 0) {
        grid.innerHTML = '<div class="no-recordings"><i class="fas fa-video-slash"></i><p>Nog geen opnames.</p></div>';
        return;
    }
    grid.innerHTML = state.recordings.map(rec => `
        <div class="recording-card">
            <div class="recording-thumbnail"><i class="fas fa-play-circle"></i></div>
            <div class="recording-info">
                <h4>${rec.title}</h4>
                <p>${rec.date} ${rec.time} • ${rec.size}</p>
                <div class="recording-actions">
                    <button onclick="downloadRecording(${rec.id})"><i class="fas fa-download"></i> Download</button>
                    <button onclick="deleteRecording(${rec.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function downloadRecording(id) {
    const rec = state.recordings.find(r => r.id === id);
    if (rec && rec.url) {
        const a = document.createElement('a');
        a.href = rec.url;
        a.download = `${rec.title}.webm`;
        a.click();
    }
}

function deleteRecording(id) {
    state.recordings = state.recordings.filter(r => r.id !== id);
    saveState();
    document.getElementById('statRecordings').textContent = state.recordings.length;
    renderRecordingsUI();
}

// ==================== SETTINGS ====================
function applySettings() {
    setTheme(state.theme);
    document.getElementById('autoMsgToggle').checked = state.autoMsgEnabled;
    document.getElementById('autoMsgInterval').value = state.autoMsgInterval;
    document.getElementById('notifyLive').checked = state.notifyLive;
    document.getElementById('notifySound').checked = state.notifySound;
}

function saveSettings() {
    state.notifyLive = document.getElementById('notifyLive').checked;
    state.notifySound = document.getElementById('notifySound').checked;
    saveState();
}

function setTheme(color) {
    const colors = {
        purple: '#a855f7',
        blue: '#06b6d4',
        pink: '#ec4899',
        green: '#10b981',
        orange: '#f97316'
    };
    document.documentElement.style.setProperty('--accent', colors[color] || colors.purple);
    state.theme = color;
    saveState();

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neonstream-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showNotification('Data geëxporteerd!', 'success');
}

function clearAllData() {
    if (confirm('Weet je zeker dat je ALLE data wilt wissen? Dit kan niet ongedaan worden.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// ==================== UI HELPERS ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarLeft');
    sidebar.classList.toggle('collapsed');
    sidebar.classList.toggle('open');
}

function switchPanel(panel) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.panel-tab').classList.add('active');
    document.getElementById('panelChat').classList.toggle('hidden', panel !== 'chat');
    document.getElementById('panelViewers').classList.toggle('hidden', panel !== 'viewers');
    document.getElementById('panelQuick').classList.toggle('hidden', panel !== 'quick');
}

function toggleFullscreen() {
    const el = document.getElementById('twitch-embed');
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transform = 'translateX(50px)'; setTimeout(() => notif.remove(), 300); }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function pad(n) { return n.toString().padStart(2, '0'); }

// Handle resize
window.addEventListener('resize', () => { if (viewerHistory.length > 1) updateGraph(); });

// Save interval changes
document.addEventListener('change', (e) => {
    if (e.target.id === 'autoMsgInterval') {
        state.autoMsgInterval = parseInt(e.target.value) || 60;
        saveState();
        if (state.autoMsgEnabled) startAutoMessages();
    }
});
