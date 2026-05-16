// ==================== NEONSTREAM PRO — REAL DATA ONLY ====================
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
const CLIENT_ID = '2l6my3eh5ykvp352o18wvm6txvc5zn';
const REDIRECT_URI = 'https://logan2013-code.github.io/stream-platform/';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let channel = data.channel || 'tiesgames22222';
let token = data.twitchToken || null;
let userId = data.twitchUser?.id || null;
let broadcasterId = null;
let isLive = false;
let streamStartedAt = null;
let viewerHistory = [];
let refreshInterval = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    initTwitchEmbed();
    initParticles();
    animateMeters();
});

// ===== AUTH CHECK =====
function checkAuth() {
    // Check for token in URL hash (OAuth redirect)
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        token = params.get('access_token');
        data.twitchToken = token;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.history.replaceState(null, '', window.location.pathname);
        fetchUserInfo();
    } else if (token) {
        fetchUserInfo();
    } else {
        showConnectPrompt();
    }
}

async function fetchUserInfo() {
    try {
        const res = await twitchAPI('https://api.twitch.tv/helix/users');
        if (res.data && res.data[0]) {
            data.twitchUser = res.data[0];
            userId = res.data[0].id;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            // Update avatar
            const avatar = document.querySelector('.user-avatar img');
            if (avatar) avatar.src = res.data[0].profile_image_url;

            await fetchBroadcasterInfo();
            startRealUpdates();
        }
    } catch(e) {
        console.error('Auth failed:', e);
        showConnectPrompt();
    }
}

async function fetchBroadcasterInfo() {
    const res = await twitchAPI(`https://api.twitch.tv/helix/users?login=${channel}`);
    if (res.data && res.data[0]) {
        broadcasterId = res.data[0].id;
    }
}

function showConnectPrompt() {
    toast('⚠ Log in met Twitch voor echte data → Ga naar Monitor pagina of klik je avatar');
}

function connectTwitch() {
    const scopes = 'chat:read+chat:edit+user:read:email+moderator:read:followers+channel:read:subscriptions+bits:read+channel:read:hype_train+channel:manage:broadcast+clips:edit';
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scopes}`;
}

// ===== TWITCH API HELPER =====
async function twitchAPI(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-Id': CLIENT_ID,
            ...(options.headers || {})
        }
    });
    if (res.status === 401) {
        token = null;
        data.twitchToken = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        toast('⚠ Token verlopen — log opnieuw in');
        return { data: [] };
    }
    return await res.json();
}

// ===== REAL DATA UPDATES =====
function startRealUpdates() {
    fetchAllData();
    refreshInterval = setInterval(fetchAllData, 15000); // Every 15 sec
}

async function fetchAllData() {
    if (!token || !broadcasterId) return;

    try {
        // Fetch stream info (is live? viewers?)
        const streamRes = await twitchAPI(`https://api.twitch.tv/helix/streams?user_login=${channel}`);
        const stream = streamRes.data?.[0];

        if (stream) {
            isLive = true;
            streamStartedAt = new Date(stream.started_at);
            const viewers = stream.viewer_count;
            viewerHistory.push(viewers);
            if (viewerHistory.length > 60) viewerHistory.shift();

            updateEl('mViewers', viewers.toLocaleString());
            updateEl('topViewers', viewers.toLocaleString());
            updateEl('mPeak', Math.max(...viewerHistory).toLocaleString());
            updateEl('mChatRate', '—');

            // Show live indicator
            document.getElementById('liveIndicator').classList.add('active');
            updateUptime();
            drawViewerChart();

            // Update title/category display
            const titleEl = document.getElementById('proStreamTitle');
            if (titleEl && !titleEl.matches(':focus')) titleEl.value = stream.title || '';
        } else {
            isLive = false;
            updateEl('mViewers', '0');
            updateEl('topViewers', '0');
            document.getElementById('liveIndicator').classList.remove('active');
        }

        // Fetch follower count
        const followRes = await twitchAPI(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`);
        if (followRes.total !== undefined) {
            updateEl('mFollowers', followRes.total.toLocaleString());
        }

        // Fetch subscriber count
        const subRes = await twitchAPI(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=1`);
        if (subRes.total !== undefined) {
            updateEl('mSubs', subRes.total.toLocaleString());
        } else {
            updateEl('mSubs', '—');
        }

        // Update goals with real data
        updateGoals(followRes.total || 0, subRes.total || 0);

    } catch(e) {
        console.error('Data fetch error:', e);
    }
}

function updateUptime() {
    if (!streamStartedAt) return;
    const now = new Date();
    const diff = Math.floor((now - streamStartedAt) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    updateEl('topUptime', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
}

// Update uptime every second when live
setInterval(() => { if (isLive) updateUptime(); }, 1000);

function updateGoals(followers, subs) {
    // Update goal bars with real data
    const goals = document.querySelectorAll('.pro-goal');
    if (goals[0]) {
        const target = 1000;
        const pct = Math.min((followers / target) * 100, 100);
        goals[0].querySelector('.pg-nums').textContent = `${followers} / ${target}`;
        goals[0].querySelector('.pg-fill').style.width = pct + '%';
        goals[0].querySelector('.pg-fill span').textContent = Math.floor(pct) + '%';
    }
    if (goals[1]) {
        const target = 25;
        const pct = Math.min((subs / target) * 100, 100);
        goals[1].querySelector('.pg-nums').textContent = `${subs} / ${target}`;
        goals[1].querySelector('.pg-fill').style.width = pct + '%';
        goals[1].querySelector('.pg-fill span').textContent = Math.floor(pct) + '%';
    }
}

// ===== NAVIGATION =====
function initNavigation() {
    document.querySelectorAll('.tn-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.tn-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.pro-page').forEach(p => p.classList.remove('active'));
            document.getElementById('page' + link.dataset.page.charAt(0).toUpperCase() + link.dataset.page.slice(1)).classList.add('active');
        });
    });
}

// ===== TWITCH EMBED =====
function initTwitchEmbed() {
    try {
        new Twitch.Embed("proTwitchEmbed", {
            width: "100%", height: "100%", channel: channel,
            layout: "video", autoplay: true, muted: true, parent: PARENT_DOMAINS
        });
    } catch(e) {}

    const chatEl = document.getElementById('proChatEmbed');
    if (chatEl) {
        chatEl.innerHTML = `<iframe src="https://www.twitch.tv/embed/${channel}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout" height="100%" width="100%" style="border:none;border-radius:8px;"></iframe>`;
    }
}

// ===== STREAM CONTROLS (REAL) =====
async function toggleLive() {
    toast('💡 Om live te gaan: Start je stream in OBS/Streamlabs en klik "Start Streaming". Deze pagina detecteert het automatisch.');
}

function toggleRecord() {
    const dot = document.getElementById('proRecDot');
    dot.classList.toggle('recording');
    if (dot.classList.contains('recording')) {
        dot.style.color = '#ef4444';
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(stream => {
            toast('Opname gestart 🔴');
        }).catch(() => {
            dot.classList.remove('recording');
            dot.style.color = '';
        });
    } else {
        dot.style.color = '';
        toast('Opname gestopt');
    }
}

async function proClip() {
    if (!token || !broadcasterId) { toast('⚠ Log in om clips te maken'); return; }
    try {
        const res = await twitchAPI('https://api.twitch.tv/helix/clips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ broadcaster_id: broadcasterId })
        });
        if (res.data && res.data[0]) {
            toast('✂️ Clip aangemaakt! ID: ' + res.data[0].id);
        } else {
            toast('⚠ Clip maken mislukt — stream moet live zijn');
        }
    } catch(e) {
        toast('⚠ Kon geen clip maken');
    }
}

function proMarker() { toast('📍 Marker — gebruik je stream software voor markers'); }
function proAd() { toast('📺 Ad breaks worden beheerd via Twitch Dashboard'); }

// ===== CHAT — REAL TWITCH =====
async function proSendChat(msg) {
    if (!msg || !msg.trim()) return;
    const input = document.getElementById('proQuickMsg');
    if (input && input.value === msg) input.value = '';

    if (!token || !userId) {
        toast('⚠ Log in met Twitch om berichten te sturen');
        connectTwitch();
        return;
    }

    if (!broadcasterId) {
        toast('⚠ Broadcaster niet gevonden');
        return;
    }

    try {
        const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: broadcasterId,
                sender_id: userId,
                message: msg
            })
        });

        if (res.ok) {
            toast(`✓ Chat: "${msg}"`);
        } else {
            const err = await res.json();
            toast('⚠ ' + (err.message || 'Kon niet versturen'));
        }
    } catch(e) {
        toast('⚠ Verbindingsfout');
    }
}

// ===== ALERTS (Shows in activity feed) =====
function testProAlert(type) {
    const preview = document.getElementById('proAlertPreview');
    const msgs = {
        follow: '🎉 Dit is een TEST — Echte alerts komen automatisch',
        sub: '⭐ TEST — Sub alerts verschijnen automatisch',
        donation: '💰 TEST — Donatie alerts via Streamlabs/SE',
        raid: '🎊 TEST — Raid alerts komen automatisch',
        bits: '💎 TEST — Bits alerts komen automatisch',
        giftsub: '🎁 TEST — Gift sub alerts automatisch'
    };
    if (preview) {
        preview.innerHTML = `<span style="animation:actIn 0.3s ease">${msgs[type]}</span>`;
        preview.style.color = 'var(--text-1)';
    }
    toast('ℹ️ Echte alerts worden afgehandeld door je alert overlay (Streamlabs/StreamElements)');
}

// ===== SOUNDBOARD =====
function proSound(btn) {
    btn.style.transform = 'scale(0.9)';
    btn.style.background = 'rgba(168,85,247,0.2)';
    setTimeout(() => { btn.style.transform = ''; btn.style.background = ''; }, 300);
    const name = btn.querySelector('span').textContent;
    toast('🔊 ' + name + ' — Koppel aan OBS via Browser Source voor stream geluid');
}

// ===== RAID (REAL) =====
async function proRaid(target) {
    if (!target || !target.trim()) return;
    if (!token || !broadcasterId) { toast('⚠ Log in om te raiden'); return; }
    toast(`🎊 Raid naar ${target} — Gebruik /raid ${target} in je Twitch chat`);
}

// ===== MODERATION =====
function modAction(mode) { toast(`Chat mode: ${mode} — Gebruik Twitch chat commands (/slow, /subscribers, etc)`); }
function proMod(btn, mode) {
    btn.classList.toggle('active');
    const cmds = { slow: '/slow', sub: '/subscribers', emote: '/emoteonly', followers: '/followers', unique: '/uniquechat', clear: '/clear' };
    toast(`Gebruik in chat: ${cmds[mode] || '/' + mode}`);
}

// ===== CHATBOT =====
function addProCmd() {
    const name = document.getElementById('proCmdName').value;
    const resp = document.getElementById('proCmdResp').value;
    if (!name || !resp) return;
    const list = document.querySelector('.pro-commands');
    const item = document.createElement('div');
    item.className = 'pc-item';
    item.innerHTML = `<code>${name}</code><span>${resp}</span><button onclick="proSendChat('${resp.replace(/'/g, "\\'")}')"><i class="fas fa-play"></i></button>`;
    list.appendChild(item);
    document.getElementById('proCmdName').value = '';
    document.getElementById('proCmdResp').value = '';
    toast(`Command ${name} toegevoegd — klik ▶ om te sturen in chat`);
}

// ===== TAGS =====
function addProTag(input) {
    if (!input.value.trim()) return;
    const tag = document.createElement('span');
    tag.className = 'pro-tag';
    tag.innerHTML = `${input.value.trim()} <i class="fas fa-xmark" onclick="this.parentElement.remove()"></i>`;
    input.parentElement.insertBefore(tag, input);
    input.value = '';
}

// ===== PREDICTIONS + POLLS =====
function startProPred() {
    toast('🔮 Predictions → Gebruik het Twitch Creator Dashboard voor echte predictions');
}

function addProPollOpt() {
    const opts = document.getElementById('proPollOpts');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pro-input';
    input.placeholder = `Optie ${opts.children.length + 1}`;
    opts.appendChild(input);
}

function startProPoll() {
    toast('📊 Polls → Gebruik het Twitch Creator Dashboard voor echte polls');
}

// ===== STUDIO =====
function addStudioEl(type) {
    const canvas = document.getElementById('studioCanvas');
    const el = document.createElement('div');
    el.className = 'sc-element';
    el.style.top = Math.random() * 50 + '%';
    el.style.left = Math.random() * 50 + '%';
    const icons = { text: 'fa-font', image: 'fa-image', webcam: 'fa-video', browser: 'fa-globe', game: 'fa-gamepad', screen: 'fa-desktop' };
    el.style.background = `rgba(${Math.random()*200|0},${Math.random()*150|0},${Math.random()*255|0},0.25)`;
    el.innerHTML = `<i class="fas ${icons[type] || 'fa-cube'}"></i> ${type}`;
    canvas.appendChild(el);
}

function triggerFx(effect) {
    toast(`✨ Effect: ${effect} — Voeg toe als Browser Source in OBS`);
}

// ===== VIEWER CHART =====
function drawViewerChart() {
    const canvas = document.getElementById('proViewerChart');
    if (!canvas || viewerHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...viewerHistory, 1);
    const step = w / (viewerHistory.length - 1);

    ctx.beginPath();
    ctx.moveTo(0, h);
    viewerHistory.forEach((v, i) => ctx.lineTo(i * step, h - (v / max) * (h - 30)));
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(168,85,247,0.25)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    viewerHistory.forEach((v, i) => {
        const x = i * step, y = h - (v / max) * (h - 30);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ===== AUDIO METERS (visual only) =====
function animateMeters() {
    setInterval(() => {
        document.querySelectorAll('.pm-fill').forEach(fill => {
            const base = parseInt(fill.style.width) || 50;
            fill.style.width = Math.max(5, Math.min(90, base + (Math.random() * 20 - 10))) + '%';
        });
    }, 150);
}

// ===== PARTICLES =====
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.style.cssText = `position:absolute;width:2px;height:2px;background:rgba(168,85,247,${Math.random()*0.3+0.1});border-radius:50%;top:${Math.random()*100}%;left:${Math.random()*100}%;animation:particleFloat ${Math.random()*20+10}s infinite alternate;`;
        container.appendChild(p);
    }
}

// ===== ACTIVITY FILTER =====
function filterAct(btn, type) {
    document.querySelectorAll('.af').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.act-item').forEach(item => {
        item.style.display = (type === 'all' || item.classList.contains(type)) ? '' : 'none';
    });
}

// ===== USER PANEL =====
function toggleUserPanel() {
    if (!token) {
        connectTwitch();
    } else {
        toast(`Ingelogd als: ${data.twitchUser?.display_name || 'Unknown'}`);
    }
}

// ===== UTILITIES =====
function updateEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function toast(msg) {
    const t = document.getElementById('proToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
@keyframes particleFloat { 0% { transform: translateY(0) translateX(0); } 100% { transform: translateY(-30px) translateX(15px); } }
@keyframes actIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
.recording { animation: recPulse 1s infinite; }
@keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;
document.head.appendChild(style);
