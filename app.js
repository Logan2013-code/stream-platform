// ==================== CONFIG ====================
const TWITCH_CLIENT_ID = '2l6my3eh5ykvp352o18wvm6txvc5zn';
const REDIRECT_URI = 'https://logan2013-code.github.io/stream-platform/';
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
const ACCOUNTS_KEY = 'neonstream_accounts';

// ==================== STATE ====================
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
let miniPlayerActive = false;
let streamObserver = null;

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
        miniPlayerEnabled: true,
        theme: 'purple',
        recordings: [],
        messageLog: [],
        totalMessages: 0,
        totalSessions: 0,
        isLive: false,
        // Auth
        loggedIn: false,
        user: null,
        twitchToken: null,
        twitchUser: null
    };
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...defaultState(), ...JSON.parse(saved) };
    } catch (e) {}
    return defaultState();
}

function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ==================== AUTH ====================
function checkAuth() {
    // Check for Twitch OAuth callback
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
            state.twitchToken = token;
            state.loggedIn = true;
            fetchTwitchUser(token);
            window.history.replaceState(null, '', window.location.pathname);
            saveState();
        }
    }

    if (state.loggedIn && state.user) {
        showApp();
    } else {
        showLogin();
    }
}

function loginWithTwitch() {
    const scopes = 'chat:read+chat:edit+user:read:email';
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scopes}`;
    window.location.href = authUrl;
}

async function fetchTwitchUser(token) {
    try {
        const res = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': TWITCH_CLIENT_ID
            }
        });
        const data = await res.json();
        if (data.data && data.data[0]) {
            state.twitchUser = data.data[0];
            state.user = {
                username: data.data[0].display_name,
                avatar: data.data[0].profile_image_url,
                type: 'twitch',
                email: data.data[0].email || ''
            };
            state.loggedIn = true;
            saveState();
            showApp();
        }
    } catch (e) {
        console.error('Twitch user fetch error:', e);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Vul gebruikersnaam en wachtwoord in.');
        return;
    }

    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');

    if (!accounts[username]) {
        alert('Account niet gevonden. Registreer eerst.');
        return;
    }

    if (accounts[username].password !== btoa(password)) {
        alert('Onjuist wachtwoord.');
        return;
    }

    state.user = { username: username, type: 'local', avatar: '', email: accounts[username].email };
    state.loggedIn = true;
    saveState();
    showApp();
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;

    if (!username || !email || !password) {
        alert('Vul alle velden in.');
        return;
    }

    if (password !== confirm) {
        alert('Wachtwoorden komen niet overeen.');
        return;
    }

    if (password.length < 6) {
        alert('Wachtwoord moet minimaal 6 tekens zijn.');
        return;
    }

    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');

    if (accounts[username]) {
        alert('Gebruikersnaam al bezet. Kies een andere.');
        return;
    }

    accounts[username] = { password: btoa(password), email: email, created: Date.now() };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

    state.user = { username: username, type: 'local', avatar: '', email: email };
    state.loggedIn = true;
    saveState();
    showApp();
}

function logout() {
    state.loggedIn = false;
    state.user = null;
    state.twitchToken = null;
    state.twitchUser = null;
    saveState();
    showLogin();
    document.getElementById('userDropdown').classList.add('hidden');
}

function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

// Skip login entirely for quick access
function skipLogin() {
    state.user = { username: 'Gast', type: 'local', avatar: '', email: '' };
    state.loggedIn = true;
    saveState();
    showApp();
}

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appWrapper').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appWrapper').classList.remove('hidden');
    initApp();
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

// ==================== APP INIT ====================
function initApp() {
    state.totalSessions++;
    saveState();

    // Set user info in UI
    if (state.user) {
        document.getElementById('dropdownUsername').textContent = state.user.username;
        document.getElementById('dropdownType').textContent = state.user.type === 'twitch' ? 'Twitch Account' : 'Lokaal Account';

        if (state.user.avatar) {
            document.getElementById('userAvatarImg').src = state.user.avatar;
            document.getElementById('userAvatarImg').style.display = 'block';
            document.getElementById('userAvatarIcon').style.display = 'none';
        }
    }

    // Twitch connection status
    updateTwitchConnectionUI();

    applySettings();
    renderFavorites();
    renderAutoMessages();
    renderQuickMessages();
    renderQuickSendPanel();
    renderMessageLog();
    renderRecordingsUI();
    initTwitch();
    initMiniPlayer();
    startMonitoring();

    document.getElementById('statSessions').textContent = state.totalSessions;
    document.getElementById('statMessages').textContent = state.totalMessages;
    document.getElementById('statRecordings').textContent = state.recordings.length;

    if (window.innerWidth <= 1000) {
        document.getElementById('sidebarLeft').classList.add('collapsed');
    }

    showNotification(`Welkom ${state.user?.username || ''}! Monitoring ${state.channel}`, 'success');
}

function updateTwitchConnectionUI() {
    const connected = !!state.twitchToken;
    const textEl = document.getElementById('twitchConnText');
    const btnEl = document.getElementById('connectTwitchBtn');

    if (connected) {
        textEl.textContent = `Verbonden als ${state.twitchUser?.display_name || state.user?.username}`;
        textEl.style.color = 'var(--neon-green)';
        btnEl.textContent = '✓ Verbonden';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.6';
    } else {
        textEl.textContent = 'Niet verbonden - berichten worden niet verstuurd';
        textEl.style.color = 'var(--neon-orange)';
    }
}

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
            muted: true,
            parent: PARENT_DOMAINS
        });

        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            checkLiveStatus();
            const player = twitchEmbed.getPlayer();
            player.play();
            setTimeout(() => player.setMuted(false), 1500);
        });
        twitchEmbed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => setTimeout(checkLiveStatus, 2000));
    } catch (e) {
        embedEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#a0a0b0;padding:20px;text-align:center;">
            <i class="fab fa-twitch" style="font-size:3rem;margin-bottom:15px;color:#9146ff;"></i>
            <p>Stream wordt geladen...</p></div>`;
    }

    // Chat embed
    const chatEl = document.getElementById('twitch-chat');
    chatEl.innerHTML = `<iframe id="twitchChatIframe" src="https://www.twitch.tv/embed/${state.channel}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout" height="100%" width="100%" style="border:none;"></iframe>`;

    document.getElementById('twitchLink').href = `https://twitch.tv/${state.channel}`;
    document.getElementById('channelInput').value = state.channel;
}

// ==================== MINI PLAYER (Picture-in-Picture style) ====================
function initMiniPlayer() {
    const streamSection = document.getElementById('streamContainer');
    if (!streamSection) return;

    streamObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!state.miniPlayerEnabled) return;
            if (!entry.isIntersecting && state.isLive) {
                showMiniPlayer();
            } else {
                hideMiniPlayer();
            }
        });
    }, { threshold: 0.3 });

    streamObserver.observe(streamSection);
}

function showMiniPlayer() {
    if (miniPlayerActive) return;
    miniPlayerActive = true;

    const mini = document.getElementById('miniPlayer');
    mini.classList.remove('hidden');
    document.getElementById('miniChannel').textContent = state.channel;
    document.getElementById('miniStatus').textContent = state.isLive ? 'LIVE' : 'OFFLINE';

    // Clone stream into mini player
    const miniVideo = document.getElementById('miniPlayerVideo');
    miniVideo.innerHTML = `<iframe src="https://player.twitch.tv/?channel=${state.channel}&parent=${PARENT_DOMAINS[0]}&muted=true" width="100%" height="100%" style="border:none;" allowfullscreen></iframe>`;
}

function hideMiniPlayer() {
    if (!miniPlayerActive) return;
    miniPlayerActive = false;
    const mini = document.getElementById('miniPlayer');
    mini.classList.add('hidden');
    document.getElementById('miniPlayerVideo').innerHTML = '';
}

function closeMiniPlayer() {
    hideMiniPlayer();
    state.miniPlayerEnabled = false;
    document.getElementById('miniPlayerEnabled').checked = false;
    saveState();
}

function scrollToStream() {
    hideMiniPlayer();
    document.getElementById('streamContainer').scrollIntoView({ behavior: 'smooth' });
}

// ==================== LIVE STATUS ====================
function checkLiveStatus() {
    let isLive = false;
    try {
        const player = twitchEmbed?.getPlayer?.();
        if (player) {
            const qualities = player.getQualities?.();
            isLive = qualities && qualities.length > 1;
        }
    } catch (e) {}
    updateLiveStatus(isLive);
}

function updateLiveStatus(isLive) {
    const wasOffline = !state.isLive;
    state.isLive = isLive;

    const banner = document.getElementById('liveBanner');
    const statusEl = document.getElementById('streamStatus');

    if (isLive) {
        banner.classList.add('is-live');
        document.getElementById('liveBannerText').textContent = `${state.channel} is LIVE!`;
        statusEl.innerHTML = '<span class="status-dot live"></span><span>LIVE</span>';
        statusEl.classList.add('live');

        if (wasOffline && state.notifyLive) {
            if (Notification.permission === 'granted') {
                new Notification(`${state.channel} is nu LIVE! 🔴`, { body: 'Klik om te kijken' });
            }
        }
    } else {
        banner.classList.remove('is-live');
        document.getElementById('liveBannerText').textContent = `${state.channel} is offline`;
        statusEl.innerHTML = '<span class="status-dot offline"></span><span>Offline</span>';
        statusEl.classList.remove('live');
    }
}

// ==================== SEND TO TWITCH CHAT ====================
async function sendToTwitchChat(message) {
    if (!state.twitchToken || !state.twitchUser) {
        showNotification('Verbind je Twitch account om berichten te sturen.', 'info');
        return false;
    }

    try {
        // Get broadcaster ID
        const broadcasterRes = await fetch(`https://api.twitch.tv/helix/users?login=${state.channel}`, {
            headers: { 'Authorization': `Bearer ${state.twitchToken}`, 'Client-Id': TWITCH_CLIENT_ID }
        });
        const broadcasterData = await broadcasterRes.json();
        const broadcasterId = broadcasterData.data?.[0]?.id;

        if (!broadcasterId) return false;

        // Send chat message via Helix API
        const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.twitchToken}`,
                'Client-Id': TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: broadcasterId,
                sender_id: state.twitchUser.id,
                message: message
            })
        });

        if (res.ok) return true;

        const err = await res.json();
        console.error('Chat send error:', err);
        return false;
    } catch (e) {
        console.error('Chat send error:', e);
        return false;
    }
}

// ==================== MONITORING ====================
function startMonitoring() {
    setInterval(updateUptime, 1000);
    setInterval(() => { checkLiveStatus(); updateViewers(); }, 15000);
    setTimeout(updateViewers, 3000);
    if (Notification.permission === 'default') Notification.requestPermission();
}

function updateUptime() {
    const diff = new Date() - monitorStart;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
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

    if (viewers > peakViewers) { peakViewers = viewers; document.getElementById('statPeakViewers').textContent = peakViewers; }

    viewerHistory.push({ time: new Date(), count: viewers });
    if (viewerHistory.length > 60) viewerHistory.shift();
    updateGraph();
    updateViewersList(viewers);
}

function updateViewersList(count) {
    const names = ['StreamFan99','GamerNL','ProPlayer_X','NachtUil','PixelMaster','ChillVibes','GameKing42','NeonRider','DutchGamer','CyberWolf','FlameKnight','xStarDust','ByteRunner','GlowFish','HyperBeam'];
    const types = ['','','','sub','mod','vip','','sub','','','','','sub','',''];
    const list = document.getElementById('viewersList');

    if (count === 0) { list.innerHTML = '<div class="viewers-loading"><i class="fas fa-moon"></i> Geen kijkers (stream is offline)</div>'; return; }

    const shown = Math.min(count, 15);
    let html = '';
    for (let i = 0; i < shown; i++) {
        html += `<div class="viewer-item"><span class="viewer-dot"></span><span class="viewer-name">${names[i % names.length]}</span>${types[i % types.length] ? `<span class="viewer-type ${types[i % types.length]}">${types[i % types.length].toUpperCase()}</span>` : ''}</div>`;
    }
    if (count > 15) html += `<div class="viewer-item" style="justify-content:center;color:var(--text-secondary);font-size:0.8rem;">+ ${count - 15} meer</div>`;
    list.innerHTML = html;
}

// ==================== GRAPH ====================
function updateGraph() {
    const canvas = document.getElementById('viewerChart');
    if (!canvas || viewerHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    const w = rect.width, h = rect.height, p = 35;
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(...viewerHistory.map(v => v.count), 1);
    const gw = w - p * 2, gh = h - p * 2;

    ctx.strokeStyle = 'rgba(168,85,247,0.1)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { const y = p + (gh/4)*i; ctx.beginPath(); ctx.moveTo(p,y); ctx.lineTo(w-p,y); ctx.stroke(); }

    ctx.beginPath(); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a855f7'; ctx.lineWidth = 2;
    viewerHistory.forEach((pt, i) => { const x = p + (i/(viewerHistory.length-1))*gw; const y = p + gh - (pt.count/max)*gh; i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0,p,0,h-p); grad.addColorStop(0,'rgba(168,85,247,0.3)'); grad.addColorStop(1,'rgba(168,85,247,0)');
    ctx.lineTo(p+gw,p+gh); ctx.lineTo(p,p+gh); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    ctx.fillStyle = '#a0a0b0'; ctx.font = '10px Rajdhani'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) ctx.fillText(Math.round((max/4)*(4-i)), p-5, p+(gh/4)*i+4);
}

// ==================== CHANNEL SWITCHING ====================
function switchChannel() {
    const input = document.getElementById('channelInput').value.trim().toLowerCase();
    if (!input || input === state.channel) return;
    switchToChannel(input);
}

function switchToChannel(channel) {
    state.channel = channel;
    peakViewers = 0; viewerHistory = []; monitorStart = new Date();
    document.getElementById('statPeakViewers').textContent = '0';
    document.getElementById('statViewers').textContent = '0';
    document.getElementById('channelInput').value = channel;
    saveState(); renderFavorites(); initTwitch();
    showNotification(`Geswitcht naar: ${channel}`, 'success');
}

// ==================== FAVORITES ====================
function addFavorite() {
    const ch = document.getElementById('channelInput').value.trim().toLowerCase();
    if (!ch || state.favorites.includes(ch)) return;
    state.favorites.push(ch); saveState(); renderFavorites();
    showNotification(`${ch} toegevoegd!`, 'success');
}

function removeFavorite(ch, e) {
    e.stopPropagation();
    state.favorites = state.favorites.filter(f => f !== ch); saveState(); renderFavorites();
}

function renderFavorites() {
    document.getElementById('favoritesList').innerHTML = state.favorites.map(f => `
        <button class="fav-chip ${f === state.channel ? 'active' : ''}" onclick="switchToChannel('${f}')">
            ${f}<span class="fav-remove" onclick="removeFavorite('${f}', event)">&times;</span>
        </button>`).join('');
}

// ==================== AUTO MESSAGES ====================
function toggleAutoMessages() {
    state.autoMsgEnabled = document.getElementById('autoMsgToggle').checked;
    saveState();
    if (state.autoMsgEnabled) { startAutoMessages(); showNotification('Auto berichten aan!', 'success'); }
    else { stopAutoMessages(); showNotification('Auto berichten uit', 'info'); }
}

function startAutoMessages() {
    stopAutoMessages();
    const interval = (parseInt(document.getElementById('autoMsgInterval').value) || 60) * 1000;
    state.autoMsgInterval = interval / 1000; saveState();
    autoMsgTimer = setInterval(() => {
        if (state.autoMessages.length === 0) return;
        const msg = state.autoMessages[autoMsgIndex % state.autoMessages.length];
        sendChatMessage(msg, 'auto');
        autoMsgIndex++;
    }, interval);
}

function stopAutoMessages() { if (autoMsgTimer) { clearInterval(autoMsgTimer); autoMsgTimer = null; } }

function addAutoMessage() {
    const input = document.getElementById('newAutoMsg');
    const msg = input.value.trim(); if (!msg) return;
    state.autoMessages.push(msg); input.value = ''; saveState(); renderAutoMessages();
}

function removeAutoMessage(i) { state.autoMessages.splice(i, 1); saveState(); renderAutoMessages(); }

function renderAutoMessages() {
    document.getElementById('autoMsgList').innerHTML = state.autoMessages.map((msg, i) => `
        <div class="auto-msg-item"><i class="fas fa-comment" style="color:var(--neon-blue);font-size:0.7rem;"></i>
        <span>${escapeHtml(msg)}</span><button class="msg-delete" onclick="removeAutoMessage(${i})"><i class="fas fa-times"></i></button></div>`).join('');
    document.getElementById('autoMsgToggle').checked = state.autoMsgEnabled;
    document.getElementById('autoMsgInterval').value = state.autoMsgInterval;
    if (state.autoMsgEnabled) startAutoMessages();
}

// ==================== QUICK MESSAGES ====================
function addQuickMessage() {
    const input = document.getElementById('newQuickMsg');
    const msg = input.value.trim(); if (!msg) return;
    state.quickMessages.push(msg); input.value = ''; saveState(); renderQuickMessages(); renderQuickSendPanel();
}

function removeQuickMessage(i) { state.quickMessages.splice(i, 1); saveState(); renderQuickMessages(); renderQuickSendPanel(); }

function renderQuickMessages() {
    document.getElementById('quickMsgList').innerHTML = state.quickMessages.map((msg, i) => `
        <div class="quick-msg-item"><i class="fas fa-bolt" style="color:var(--accent);font-size:0.7rem;"></i>
        <span>${escapeHtml(msg)}</span><button class="msg-delete" onclick="removeQuickMessage(${i})"><i class="fas fa-times"></i></button></div>`).join('');
}

function renderQuickSendPanel() {
    const el = document.getElementById('quickSendList');
    if (state.quickMessages.length === 0) { el.innerHTML = '<p class="empty-state">Voeg berichten toe in Instellingen.</p>'; return; }
    el.innerHTML = state.quickMessages.map((msg, i) => `
        <button class="quick-send-btn" onclick="sendQuickMessage(${i})"><i class="fas fa-paper-plane"></i>${escapeHtml(msg)}</button>`).join('');
}

function sendQuickMessage(i) { const msg = state.quickMessages[i]; if (msg) sendChatMessage(msg, 'quick'); }
function sendQuickCustom() { const input = document.getElementById('quickCustomMsg'); const msg = input.value.trim(); if (!msg) return; sendChatMessage(msg, 'custom'); input.value = ''; }

// ==================== CHAT SENDING ====================
async function sendChatMessage(message, type) {
    // Send to Twitch chat
    const sent = await sendToTwitchChat(message);

    // Log
    state.messageLog.unshift({ text: message, type, time: new Date().toLocaleTimeString('nl-NL', {hour:'2-digit',minute:'2-digit',second:'2-digit'}), timestamp: Date.now(), sent });
    if (state.messageLog.length > 100) state.messageLog.pop();
    state.totalMessages++; saveState();
    document.getElementById('statMessages').textContent = state.totalMessages;
    renderMessageLog();

    const status = sent ? '✓ Verstuurd' : '⚠ Alleen gelogd (verbind Twitch)';
    showNotification(`${status}: "${message.substring(0, 25)}${message.length > 25 ? '...' : ''}"`, sent ? 'success' : 'info');
}

function renderMessageLog() {
    const el = document.getElementById('messageLog');
    if (state.messageLog.length === 0) { el.innerHTML = '<p class="empty-state">Verstuurde berichten verschijnen hier.</p>'; return; }
    el.innerHTML = state.messageLog.slice(0, 50).map(entry => `
        <div class="msg-log-item">
            <span class="msg-log-text">${entry.sent ? '✓' : '⚠'} ${escapeHtml(entry.text)}</span>
            <span class="msg-log-type ${entry.type}">${entry.type}</span>
            <span class="msg-log-time">${entry.time}</span>
        </div>`).join('');
}

// ==================== RECORDING ====================
async function toggleRecording() {
    if (!isRecording) {
        try { const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); startRecording(stream); }
        catch (e) { showNotification('Opname geannuleerd.', 'info'); }
    } else { stopRecording(); }
}

function startRecording(stream) {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = saveRecording;
    stream.getVideoTracks()[0].onended = () => { if (isRecording) stopRecording(); };
    mediaRecorder.start(); isRecording = true;
    document.getElementById('recIcon').style.color = '#ef4444';
    document.getElementById('recText').textContent = 'Stop';
    document.getElementById('recordingIndicator').classList.add('active');
    showNotification('Opname gestart! 🔴', 'success');
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
    isRecording = false;
    document.getElementById('recIcon').style.color = '';
    document.getElementById('recText').textContent = 'Opname';
    document.getElementById('recordingIndicator').classList.remove('active');
    showNotification('Opname opgeslagen!', 'success');
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob); const now = new Date();
    state.recordings.push({ id: Date.now(), url, title: `${state.channel} - ${now.toLocaleDateString('nl-NL')}`, date: now.toLocaleDateString('nl-NL'), time: now.toLocaleTimeString('nl-NL'), size: (blob.size/(1024*1024)).toFixed(1)+' MB' });
    saveState(); document.getElementById('statRecordings').textContent = state.recordings.length; renderRecordingsUI();
}

function renderRecordingsUI() {
    const grid = document.getElementById('recordingsGrid');
    if (state.recordings.length === 0) { grid.innerHTML = '<div class="no-recordings"><i class="fas fa-video-slash"></i><p>Nog geen opnames.</p></div>'; return; }
    grid.innerHTML = state.recordings.map(r => `
        <div class="recording-card"><div class="recording-thumbnail"><i class="fas fa-play-circle"></i></div>
        <div class="recording-info"><h4>${r.title}</h4><p>${r.date} ${r.time} • ${r.size}</p>
        <div class="recording-actions"><button onclick="downloadRecording(${r.id})"><i class="fas fa-download"></i> Download</button><button onclick="deleteRecording(${r.id})"><i class="fas fa-trash"></i></button></div></div></div>`).join('');
}

function downloadRecording(id) { const r = state.recordings.find(x => x.id === id); if (r?.url) { const a = document.createElement('a'); a.href = r.url; a.download = `${r.title}.webm`; a.click(); } }
function deleteRecording(id) { state.recordings = state.recordings.filter(r => r.id !== id); saveState(); document.getElementById('statRecordings').textContent = state.recordings.length; renderRecordingsUI(); }

// ==================== SETTINGS ====================
function applySettings() {
    setTheme(state.theme);
    document.getElementById('autoMsgToggle').checked = state.autoMsgEnabled;
    document.getElementById('autoMsgInterval').value = state.autoMsgInterval;
    document.getElementById('notifyLive').checked = state.notifyLive;
    document.getElementById('notifySound').checked = state.notifySound;
    document.getElementById('miniPlayerEnabled').checked = state.miniPlayerEnabled;
}

function saveSettings() {
    state.notifyLive = document.getElementById('notifyLive').checked;
    state.notifySound = document.getElementById('notifySound').checked;
    state.miniPlayerEnabled = document.getElementById('miniPlayerEnabled').checked;
    saveState();
}

function setTheme(color) {
    const colors = { purple:'#a855f7', blue:'#06b6d4', pink:'#ec4899', green:'#10b981', orange:'#f97316' };
    document.documentElement.style.setProperty('--accent', colors[color] || colors.purple);
    state.theme = color; saveState();
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === color));
}

function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `neonstream-${new Date().toISOString().split('T')[0]}.json`; a.click();
    showNotification('Data geëxporteerd!', 'success');
}

function clearAllData() {
    if (confirm('Weet je zeker dat je ALLE data wilt wissen?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); }
}

// ==================== UI HELPERS ====================
function toggleSidebar() { const s = document.getElementById('sidebarLeft'); s.classList.toggle('collapsed'); s.classList.toggle('open'); }

function switchPanel(panel, btn) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panelChat').classList.toggle('hidden', panel !== 'chat');
    document.getElementById('panelViewers').classList.toggle('hidden', panel !== 'viewers');
    document.getElementById('panelQuick').classList.toggle('hidden', panel !== 'quick');
}

function toggleFullscreen() { const el = document.getElementById('twitch-embed'); if (!document.fullscreenElement) el.requestFullscreen(); else document.exitFullscreen(); }

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div'); notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transform = 'translateX(50px)'; setTimeout(() => notif.remove(), 300); }, 3500);
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function pad(n) { return n.toString().padStart(2, '0'); }

window.addEventListener('resize', () => { if (viewerHistory.length > 1) updateGraph(); });
document.addEventListener('change', (e) => { if (e.target.id === 'autoMsgInterval') { state.autoMsgInterval = parseInt(e.target.value) || 60; saveState(); if (state.autoMsgEnabled) startAutoMessages(); } });

// Close dropdown on click outside
document.addEventListener('click', (e) => { if (!e.target.closest('.user-menu')) document.getElementById('userDropdown')?.classList.add('hidden'); });

// ==================== START ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
