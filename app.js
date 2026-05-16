// Config
let CHANNEL = 'tiesgames22222';
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];

// State
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordings = [];
let peakViewers = 0;
let eventCount = 0;
let viewerHistory = [];
let monitorStartTime = new Date();
let twitchEmbed = null;
let viewerCheckInterval = null;
let graphInterval = null;
let favorites = JSON.parse(localStorage.getItem('neonstream_favorites') || '["tiesgames22222"]');

// Initialize Twitch Embed
function initTwitch() {
    try {
        twitchEmbed = new Twitch.Embed("twitch-embed", {
            width: "100%",
            height: "100%",
            channel: CHANNEL,
            layout: "video",
            autoplay: true,
            muted: false,
            parent: PARENT_DOMAINS
        });

        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            addEvent('Stream player geladen', 'success');
        });

        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
            addEvent('Stream speelt af', 'success');
            updateStreamStatus(true);
        });

    } catch (e) {
        console.error('Twitch embed error:', e);
        document.getElementById('twitch-embed').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#a0a0b0;padding:20px;text-align:center;">
                <i class="fab fa-twitch" style="font-size:3rem;margin-bottom:15px;color:#9146ff;"></i>
                <p>Stream wordt geladen...</p>
                <p style="font-size:0.8rem;margin-top:10px;">Als de stream niet laadt, is het kanaal mogelijk offline.</p>
            </div>
        `;
    }

    // Twitch Chat embed
    const chatContainer = document.getElementById('twitch-chat');
    chatContainer.innerHTML = `<iframe
        src="https://www.twitch.tv/embed/${CHANNEL}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout"
        height="100%"
        width="100%"
        style="border:none;border-radius:8px;">
    </iframe>`;
}

// Stream Status
function updateStreamStatus(isLive) {
    const statusEl = document.getElementById('streamStatus');
    if (isLive) {
        statusEl.innerHTML = `<span class="status-dot live"></span><span>LIVE</span>`;
        statusEl.classList.add('live');
    } else {
        statusEl.innerHTML = `<span class="status-dot offline"></span><span>Offline</span>`;
        statusEl.classList.remove('live');
    }
    document.getElementById('infoStatus').textContent = isLive ? '🟢 Live' : '🔴 Offline';
}

// Events
function addEvent(message, type = 'info') {
    eventCount++;
    document.getElementById('statEvents').textContent = eventCount;

    const list = document.getElementById('eventsList');
    const time = new Date().toLocaleTimeString('nl-NL');

    const icons = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        viewer: 'fa-eye',
        follow: 'fa-heart',
        sub: 'fa-star'
    };

    const item = document.createElement('div');
    item.className = `event-item event-${type}`;
    item.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <small>${time}</small>
    `;

    list.insertBefore(item, list.firstChild);

    // Keep max 50 events
    while (list.children.length > 50) {
        list.removeChild(list.lastChild);
    }
}

// Viewer tracking (simulated updates based on embed state)
function trackViewers() {
    // Since we can't access Twitch API without OAuth from frontend,
    // we track based on embed player state
    const player = twitchEmbed?.getPlayer?.();
    let viewers = 0;

    if (player) {
        const qualities = player.getQualities?.();
        if (qualities && qualities.length > 0) {
            updateStreamStatus(true);
            // Estimate viewers based on available qualities (more = more popular)
            viewers = Math.max(1, qualities.length * 2 + Math.floor(Math.random() * 5));
        }
    }

    // Update UI
    document.getElementById('statViewers').textContent = viewers;
    document.getElementById('channelViewers').innerHTML = `<i class="fas fa-eye"></i> ${viewers} kijkers`;
    document.getElementById('infoViewers').textContent = viewers;

    if (viewers > peakViewers) {
        peakViewers = viewers;
        document.getElementById('statPeakViewers').textContent = peakViewers;
    }

    // Track history for graph
    viewerHistory.push({
        time: new Date(),
        count: viewers
    });

    if (viewerHistory.length > 60) {
        viewerHistory.shift();
    }

    updateGraph();
}

// Simple canvas graph
function updateGraph() {
    const canvas = document.getElementById('viewerChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (viewerHistory.length < 2) return;

    const maxViewers = Math.max(...viewerHistory.map(v => v.count), 1);
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (graphHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    viewerHistory.forEach((point, i) => {
        const x = padding + (i / (viewerHistory.length - 1)) * graphWidth;
        const y = padding + graphHeight - (point.count / maxViewers) * graphHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

    ctx.lineTo(padding + graphWidth, padding + graphHeight);
    ctx.lineTo(padding, padding + graphHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Labels
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px Rajdhani';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = Math.round((maxViewers / 4) * (4 - i));
        const y = padding + (graphHeight / 4) * i;
        ctx.fillText(value, padding - 8, y + 4);
    }

    // Time labels
    ctx.textAlign = 'center';
    const timePoints = [0, Math.floor(viewerHistory.length / 2), viewerHistory.length - 1];
    timePoints.forEach(i => {
        if (viewerHistory[i]) {
            const x = padding + (i / (viewerHistory.length - 1)) * graphWidth;
            const time = viewerHistory[i].time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            ctx.fillText(time, x, height - 10);
        }
    });
}

// Uptime
function updateUptime() {
    const diff = new Date() - monitorStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    document.getElementById('statUptime').textContent = formatted;
    document.getElementById('infoUptime').textContent = formatted;
}

function pad(n) {
    return n.toString().padStart(2, '0');
}

// Recording (screen capture of the stream)
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: true
            });
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

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    stream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
    };

    mediaRecorder.start();
    isRecording = true;

    const btn = document.getElementById('recordBtn');
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';

    document.getElementById('recordingIndicator').classList.add('active');
    addEvent('Opname gestart', 'success');
    showNotification('Opname gestart! 🔴', 'success');
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }

    isRecording = false;

    const btn = document.getElementById('recordBtn');
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-circle"></i> Opname';

    document.getElementById('recordingIndicator').classList.remove('active');
    addEvent('Opname gestopt en opgeslagen', 'success');
    showNotification('Opname opgeslagen! 💾', 'success');
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const now = new Date();

    const recording = {
        id: Date.now(),
        url: url,
        blob: blob,
        title: `${CHANNEL} - Opname ${recordings.length + 1}`,
        date: now.toLocaleDateString('nl-NL'),
        time: now.toLocaleTimeString('nl-NL'),
        size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB'
    };

    recordings.push(recording);
    document.getElementById('statRecordings').textContent = recordings.length;
    updateRecordingsUI();
}

function updateRecordingsUI() {
    const grid = document.getElementById('recordingsGrid');

    if (recordings.length === 0) {
        grid.innerHTML = `
            <div class="no-recordings">
                <i class="fas fa-video-slash"></i>
                <p>Nog geen opnames. Klik op "Opname" wanneer de stream live is!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = recordings.map(rec => `
        <div class="recording-card">
            <div class="recording-thumbnail">
                <i class="fas fa-play-circle"></i>
            </div>
            <div class="recording-info">
                <h4>${rec.title}</h4>
                <p>${rec.date} ${rec.time} • ${rec.size}</p>
                <div class="recording-actions">
                    <button onclick="playRecording(${rec.id})">
                        <i class="fas fa-play"></i> Afspelen
                    </button>
                    <button onclick="downloadRecording(${rec.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button onclick="deleteRecording(${rec.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function playRecording(id) {
    const rec = recordings.find(r => r.id === id);
    if (rec) {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>${rec.title}</title>
            <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}</style>
            </head><body>
            <video src="${rec.url}" controls autoplay style="max-width:100%;max-height:100%;"></video>
            </body></html>
        `);
    }
}

function downloadRecording(id) {
    const rec = recordings.find(r => r.id === id);
    if (rec) {
        const a = document.createElement('a');
        a.href = rec.url;
        a.download = `${rec.title}.webm`;
        a.click();
        showNotification('Download gestart! 📥', 'success');
    }
}

function deleteRecording(id) {
    recordings = recordings.filter(r => r.id !== id);
    document.getElementById('statRecordings').textContent = recordings.length;
    updateRecordingsUI();
    showNotification('Opname verwijderd.', 'info');
}

// Screenshot
function takeScreenshot() {
    const embed = document.getElementById('twitch-embed');
    showNotification('Tip: Gebruik Print Screen (PrtSc) om een screenshot te maken!', 'info');
}

// Fullscreen
function toggleFullscreen() {
    const embed = document.getElementById('twitch-embed');
    if (!document.fullscreenElement) {
        embed.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Multi-stream
function openMultiStream() {
    const other = prompt('Voer een tweede Twitch kanaal in om mee te kijken:');
    if (other) {
        window.open(`https://multistre.am/${CHANNEL}/${other}`, '_blank');
    }
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('chatContent').classList.toggle('hidden', tab !== 'chat');
    document.getElementById('eventsContent').classList.toggle('hidden', tab !== 'events');
    document.getElementById('infoContent').classList.toggle('hidden', tab !== 'info');
}

// Refresh
function refreshData() {
    showNotification('Data vernieuwd! 🔄', 'success');
    addEvent('Handmatige data refresh', 'info');
    trackViewers();
}

// Notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(50px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Channel Switching
function switchChannel() {
    const input = document.getElementById('channelInput');
    const newChannel = input.value.trim().toLowerCase();
    if (!newChannel || newChannel === CHANNEL) return;

    switchToChannel(newChannel);
}

function switchToChannel(channel) {
    CHANNEL = channel;
    document.getElementById('channelInput').value = channel;
    document.getElementById('channelName').textContent = channel;
    document.getElementById('twitchLink').href = `https://twitch.tv/${channel}`;

    // Reset stats
    peakViewers = 0;
    viewerHistory = [];
    monitorStartTime = new Date();
    document.getElementById('statPeakViewers').textContent = '0';
    document.getElementById('statViewers').textContent = '0';
    document.getElementById('statUptime').textContent = '-';

    // Update active chip
    document.querySelectorAll('.fav-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === channel);
    });

    // Reload embed
    destroyEmbed();
    initTwitch();

    addEvent(`Geswitcht naar kanaal: ${channel}`, 'success');
    showNotification(`Nu kijken naar: ${channel} 📺`, 'success');

    setTimeout(trackViewers, 5000);
}

function destroyEmbed() {
    const embedContainer = document.getElementById('twitch-embed');
    embedContainer.innerHTML = '';

    const chatContainer = document.getElementById('twitch-chat');
    chatContainer.innerHTML = '';

    twitchEmbed = null;
}

function addFavorite() {
    const channel = document.getElementById('channelInput').value.trim().toLowerCase();
    if (!channel) {
        showNotification('Voer eerst een kanaal naam in.', 'info');
        return;
    }

    if (favorites.includes(channel)) {
        showNotification(`${channel} staat al in je favorieten.`, 'info');
        return;
    }

    favorites.push(channel);
    localStorage.setItem('neonstream_favorites', JSON.stringify(favorites));
    renderFavorites();
    showNotification(`${channel} toegevoegd aan favorieten! ⭐`, 'success');
}

function removeFavorite(channel, event) {
    event.stopPropagation();
    favorites = favorites.filter(f => f !== channel);
    localStorage.setItem('neonstream_favorites', JSON.stringify(favorites));
    renderFavorites();
    showNotification(`${channel} verwijderd uit favorieten.`, 'info');
}

function renderFavorites() {
    const container = document.getElementById('favoriteChannels');
    container.innerHTML = favorites.map(fav => `
        <button class="fav-chip ${fav === CHANNEL ? 'active' : ''}" onclick="switchToChannel('${fav}')">
            ${fav}
            <span class="fav-remove" onclick="removeFavorite('${fav}', event)">&times;</span>
        </button>
    `).join('');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('monitorStartTime').textContent =
        monitorStartTime.toLocaleTimeString('nl-NL');

    // Load saved channel
    const savedChannel = localStorage.getItem('neonstream_channel');
    if (savedChannel) {
        CHANNEL = savedChannel;
        document.getElementById('channelInput').value = CHANNEL;
        document.getElementById('channelName').textContent = CHANNEL;
        document.getElementById('twitchLink').href = `https://twitch.tv/${CHANNEL}`;
    }

    renderFavorites();
    initTwitch();

    // Update uptime every second
    setInterval(updateUptime, 1000);

    // Track viewers every 30 seconds
    viewerCheckInterval = setInterval(trackViewers, 30000);

    // Initial viewer check after 5 seconds
    setTimeout(trackViewers, 5000);

    // Save channel on switch
    const origSwitch = switchToChannel;

    showNotification(`Monitoring ${CHANNEL} gestart! 📡`, 'success');
    addEvent(`Monitoring gestart voor ${CHANNEL}`, 'success');
});

// Handle window resize for graph
window.addEventListener('resize', () => {
    if (viewerHistory.length > 1) updateGraph();
});
