// State
let isStreaming = false;
let isRecording = false;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let streamStartTime = null;
let durationInterval = null;
let viewerInterval = null;
let likes = 0;
let giftBalance = 5000;
let totalGifts = 0;
let totalMessages = 0;
let recordings = [];
let viewers = [];

const fakeViewers = [
    { name: 'GamerNL', badge: 'sub', color: '#06b6d4' },
    { name: 'StreamFan99', badge: 'vip', color: '#ec4899' },
    { name: 'ProPlayer_X', badge: 'sub', color: '#10b981' },
    { name: 'NachtUil', badge: '', color: '#f97316' },
    { name: 'PixelMaster', badge: 'mod', color: '#a855f7' },
    { name: 'ChillVibes', badge: '', color: '#06b6d4' },
    { name: 'GameKing42', badge: 'sub', color: '#ec4899' },
    { name: 'StreamStar', badge: 'vip', color: '#10b981' },
    { name: 'NeonRider', badge: '', color: '#f97316' },
    { name: 'DutchGamer', badge: 'sub', color: '#a855f7' },
    { name: 'CyberWolf', badge: '', color: '#06b6d4' },
    { name: 'FlameKnight', badge: 'vip', color: '#ec4899' },
];

const fakeChatMessages = [
    'Hey! Welkom bij de stream! 🎮',
    'Goede stream vandaag!',
    'LET\'S GOOO! 🔥',
    'Hoe gaat het?',
    'Dit is echt cool!',
    'Wanneer start het?',
    'Eerste! 🏆',
    'Geweldig spel!',
    'GG! 💯',
    'Mooi gespeeld!',
    'Haha nice 😂',
    'Wanneer volgende stream?',
    'Top content! ⭐',
    'Subscribed! 💜',
];

// Stream Functions
async function toggleStream() {
    if (!isStreaming) {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            startStream();
        } catch (err) {
            showNotification('Kan camera niet starten. Controleer permissies.', 'info');
        }
    } else {
        stopStream();
    }
}

function startStream() {
    const video = document.getElementById('streamVideo');
    video.srcObject = mediaStream;

    isStreaming = true;
    streamStartTime = new Date();

    document.getElementById('videoOverlay').classList.add('hidden');
    document.getElementById('liveBadge').classList.add('active');
    document.getElementById('liveBadge').innerHTML = '<i class="fas fa-circle"></i> LIVE';

    const btn = document.getElementById('goLiveBtn');
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';

    durationInterval = setInterval(updateDuration, 1000);
    viewerInterval = setInterval(simulateViewers, 3000);
    simulateChat();

    showNotification('Je bent nu LIVE! 🎬', 'success');
}

function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    if (isRecording) {
        toggleRecording();
    }

    const video = document.getElementById('streamVideo');
    video.srcObject = null;

    isStreaming = false;

    document.getElementById('videoOverlay').classList.remove('hidden');
    document.getElementById('liveBadge').classList.remove('active');
    document.getElementById('liveBadge').innerHTML = '<i class="fas fa-circle"></i> OFFLINE';

    const btn = document.getElementById('goLiveBtn');
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-broadcast-tower"></i> Go Live';

    clearInterval(durationInterval);
    clearInterval(viewerInterval);

    document.getElementById('viewerCount').textContent = '0';
    showNotification('Stream beëindigd. Goed gedaan! 👏', 'info');
}

async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        const video = document.getElementById('streamVideo');
        video.srcObject = screenStream;
        mediaStream = screenStream;

        isStreaming = true;
        streamStartTime = new Date();

        document.getElementById('videoOverlay').classList.add('hidden');
        document.getElementById('liveBadge').classList.add('active');
        document.getElementById('liveBadge').innerHTML = '<i class="fas fa-circle"></i> LIVE';

        const btn = document.getElementById('goLiveBtn');
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop';

        durationInterval = setInterval(updateDuration, 1000);
        viewerInterval = setInterval(simulateViewers, 3000);
        simulateChat();

        screenStream.getVideoTracks()[0].onended = () => {
            stopStream();
        };

        showNotification('Scherm delen gestart! 🖥️', 'success');
    } catch (err) {
        showNotification('Scherm delen geannuleerd.', 'info');
    }
}

// Recording Functions
function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    if (!mediaStream) {
        showNotification('Start eerst een stream om op te nemen.', 'info');
        return;
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = saveRecording;
    mediaRecorder.start();

    isRecording = true;

    const btn = document.getElementById('recordBtn');
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop Opname';

    document.getElementById('recordingIndicator').classList.add('active');
    showNotification('Opname gestart! 🔴', 'success');
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    isRecording = false;

    const btn = document.getElementById('recordBtn');
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-circle"></i> Opname';

    document.getElementById('recordingIndicator').classList.remove('active');
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
        title: `Opname ${recordings.length + 1}`,
        date: now.toLocaleDateString('nl-NL'),
        time: now.toLocaleTimeString('nl-NL'),
        size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB'
    };

    recordings.push(recording);
    updateRecordingsUI();
    updateStats();
}

function updateRecordingsUI() {
    const grid = document.getElementById('recordingsGrid');

    if (recordings.length === 0) {
        grid.innerHTML = `
            <div class="no-recordings">
                <i class="fas fa-video-slash"></i>
                <p>Nog geen opnames. Start een opname tijdens je stream!</p>
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
                    <button onclick="playRecording('${rec.id}')">
                        <i class="fas fa-play"></i> Afspelen
                    </button>
                    <button onclick="downloadRecording('${rec.id}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button onclick="deleteRecording('${rec.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function playRecording(id) {
    const rec = recordings.find(r => r.id == id);
    if (rec) {
        const video = document.getElementById('streamVideo');
        video.srcObject = null;
        video.src = rec.url;
        video.muted = false;
        video.play();
        document.getElementById('videoOverlay').classList.add('hidden');
        showNotification(`Afspelen: ${rec.title}`, 'info');
    }
}

function downloadRecording(id) {
    const rec = recordings.find(r => r.id == id);
    if (rec) {
        const a = document.createElement('a');
        a.href = rec.url;
        a.download = `${rec.title}.webm`;
        a.click();
        showNotification('Download gestart! 📥', 'success');
    }
}

function deleteRecording(id) {
    recordings = recordings.filter(r => r.id != id);
    updateRecordingsUI();
    updateStats();
    showNotification('Opname verwijderd.', 'info');
}

// Chat Functions
function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    addChatMessage('Jij', text, '#a855f7', true);
    input.value = '';
    totalMessages++;
    updateStats();
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendMessage();
}

function addChatMessage(username, text, color, isOwn = false) {
    const messages = document.getElementById('chatMessages');
    const welcome = messages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const time = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.innerHTML = `
        <div class="msg-avatar" style="background: ${color};">
            ${username.charAt(0).toUpperCase()}
        </div>
        <div class="msg-content">
            <span class="msg-username" style="color: ${color};">${username}</span>
            <span class="msg-time">${time}</span>
            <div class="msg-text">${escapeHtml(text)}</div>
        </div>
    `;

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function addGiftMessage(username, gift, amount, color) {
    const messages = document.getElementById('chatMessages');

    const msg = document.createElement('div');
    msg.className = 'gift-message';
    msg.innerHTML = `
        <span class="gift-emoji">${gift}</span>
        <div><strong style="color: ${color};">${username}</strong> stuurde een gift!</div>
        <small>${amount} coins</small>
    `;

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function simulateChat() {
    if (!isStreaming) return;

    const delay = Math.random() * 5000 + 2000;
    setTimeout(() => {
        if (!isStreaming) return;

        const viewer = fakeViewers[Math.floor(Math.random() * fakeViewers.length)];
        const message = fakeChatMessages[Math.floor(Math.random() * fakeChatMessages.length)];
        addChatMessage(viewer.name, message, viewer.color);
        totalMessages++;
        updateStats();

        simulateChat();
    }, delay);
}

// Viewer Functions
function simulateViewers() {
    if (!isStreaming) return;

    const change = Math.floor(Math.random() * 5) - 1;
    const current = parseInt(document.getElementById('viewerCount').textContent);
    const newCount = Math.max(1, current + change);
    document.getElementById('viewerCount').textContent = newCount;

    if (change > 0 && Math.random() > 0.5) {
        const newViewer = fakeViewers[Math.floor(Math.random() * fakeViewers.length)];
        addViewer(newViewer);
    }

    document.getElementById('totalViewers').textContent = Math.max(
        parseInt(document.getElementById('totalViewers').textContent),
        newCount
    );
}

function addViewer(viewer) {
    const list = document.getElementById('viewersList');
    const existing = list.querySelectorAll('.viewer-item');

    const alreadyExists = Array.from(existing).some(item =>
        item.querySelector('span')?.textContent.includes(viewer.name)
    );

    if (!alreadyExists && existing.length < 15) {
        const item = document.createElement('div');
        item.className = 'viewer-item';
        item.innerHTML = `
            <div class="viewer-avatar" style="background: ${viewer.color};">
                ${viewer.name.charAt(0)}
            </div>
            <span>${viewer.name}</span>
            ${viewer.badge ? `<span class="viewer-badge ${viewer.badge}">${viewer.badge.toUpperCase()}</span>` : ''}
        `;
        list.appendChild(item);
    }
}

// Gift Functions
function sendGift(type, cost) {
    if (giftBalance < cost) {
        showNotification('Niet genoeg coins! 💰', 'info');
        return;
    }

    giftBalance -= cost;
    document.getElementById('giftBalance').textContent = giftBalance;
    totalGifts++;

    const giftEmojis = {
        heart: '❤️',
        star: '⭐',
        diamond: '💎',
        rocket: '🚀',
        crown: '👑',
        fire: '🔥'
    };

    const emoji = giftEmojis[type];
    addGiftMessage('Jij', emoji, cost, '#a855f7');
    animateGift(emoji);
    updateStats();

    showNotification(`Gift verstuurd! ${emoji}`, 'gift');
}

function animateGift(emoji) {
    const container = document.getElementById('giftAnimation');

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'gift-float';
            el.textContent = emoji;
            el.style.left = Math.random() * 80 + 10 + '%';
            el.style.top = '70%';
            container.appendChild(el);

            setTimeout(() => el.remove(), 2000);
        }, i * 200);
    }
}

// Tab Functions
function switchTab(tab) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('chatContent').classList.toggle('hidden', tab !== 'chat');
    document.getElementById('viewersContent').classList.toggle('hidden', tab !== 'viewers');
    document.getElementById('giftsContent').classList.toggle('hidden', tab !== 'gifts');
}

// Action Functions
function likeStream() {
    likes++;
    document.getElementById('likeCount').textContent = likes;
    document.getElementById('totalLikes').textContent = likes;

    const btn = event.target.closest('.action-btn');
    btn.style.color = 'var(--neon-pink)';
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
    }, 200);
}

function shareStream() {
    if (navigator.share) {
        navigator.share({
            title: 'NeonStream - Live',
            text: 'Bekijk mijn livestream!',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link gekopieerd! 📋', 'success');
    }
}

function clipStream() {
    showNotification('Clip gemaakt! ✂️', 'success');
}

// Emoji Functions
function toggleEmoji() {
    document.getElementById('emojiPicker').classList.toggle('hidden');
}

function addEmoji(emoji) {
    const input = document.getElementById('chatInput');
    input.value += emoji;
    input.focus();
}

// Utility Functions
function updateDuration() {
    if (!streamStartTime) return;
    const diff = new Date() - streamStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    document.getElementById('streamDuration').textContent = formatted;
    document.getElementById('totalTime').textContent = `${hours}h ${minutes}m`;
}

function pad(n) {
    return n.toString().padStart(2, '0');
}

function updateStats() {
    document.getElementById('totalGifts').textContent = totalGifts;
    document.getElementById('totalMessages').textContent = totalMessages;
    document.getElementById('totalRecordings').textContent = recordings.length;
    document.getElementById('totalLikes').textContent = likes;
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'gift' ? 'gift' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(50px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close emoji picker when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-btn') && !e.target.closest('.emoji-picker')) {
        document.getElementById('emojiPicker').classList.add('hidden');
    }
});

// Stream title editing
document.getElementById('streamTitle').addEventListener('dblclick', function() {
    const newTitle = prompt('Nieuwe stream titel:', this.textContent);
    if (newTitle) {
        this.textContent = newTitle;
        showNotification('Titel bijgewerkt! ✏️', 'success');
    }
});

// Initialize
showNotification('Welkom bij NeonStream! 🚀', 'info');
