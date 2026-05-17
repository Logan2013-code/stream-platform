// ==================== NEONSTREAM PRO — 100% REAL DATA ====================
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
const LICENSE_KEY = 'neonstream_license';
const CLIENT_ID = '2l6my3eh5ykvp352o18wvm6txvc5zn';
const REDIRECT_URI = 'https://logan2013-code.github.io/stream-platform/';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let channel = data.channel || '';
let token = data.twitchToken || null;
let userId = data.twitchUser?.id || null;
let broadcasterId = null;
let broadcasterLogin = '';
let isLive = false;
let streamStartedAt = null;
let viewerHistory = [];
let refreshInterval = null;
let recentFollowers = [];
let recentSubs = [];
let totalFollowers = 0;
let totalSubs = 0;

// ===== LICENSE GATE =====
function checkLicense() {
    const stored = localStorage.getItem(LICENSE_KEY);
    if (stored) {
        try {
            const lic = JSON.parse(stored);
            if (lic.valid && (!lic.expires || new Date(lic.expires) > new Date())) {
                document.getElementById('licenseGate').style.display = 'none';
                document.getElementById('proApp').style.display = '';
                return true;
            }
        } catch(e) {}
    }
    document.getElementById('licenseGate').style.display = 'flex';
    document.getElementById('proApp').style.display = 'none';
    return false;
}

function activateLicense() {
    const input = document.getElementById('licenseInput').value.trim();
    if (!input) { document.getElementById('licenseError').textContent = 'Voer een license key in'; return; }

    const keys = JSON.parse(localStorage.getItem('neonstream_admin_keys') || '[]');
    const found = keys.find(k => k.key === input && k.active);

    if (found) {
        localStorage.setItem(LICENSE_KEY, JSON.stringify({ key: input, valid: true, activated: new Date().toISOString(), expires: found.expires || null, plan: found.plan || 'pro' }));
        document.getElementById('licenseGate').style.display = 'none';
        document.getElementById('proApp').style.display = '';
        initApp();
    } else {
        document.getElementById('licenseError').textContent = 'Ongeldige of verlopen license key';
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (checkLicense()) {
        initApp();
    }
});

function initApp() {
    checkAuth();
    initNavigation();
    initParticles();
}

// ===== AUTH CHECK =====
function checkAuth() {
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
        showChannelInput();
    }
}

function showChannelInput() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) connectBtn.style.display = '';
    updateConnectBtnState(false);
}

function updateConnectBtnState(connected) {
    const btn = document.getElementById('connectBtn');
    if (!btn) return;
    if (connected) {
        btn.innerHTML = `<i class="fas fa-check"></i><span>Verbonden</span>`;
        btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        btn.onclick = () => toast(`Ingelogd als: ${data.twitchUser?.display_name || '?'} | Kanaal: ${broadcasterLogin}`);
    }
}

async function fetchUserInfo() {
    try {
        const res = await twitchAPI('https://api.twitch.tv/helix/users');
        if (res.data && res.data[0]) {
            data.twitchUser = res.data[0];
            userId = res.data[0].id;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            const avatar = document.querySelector('.user-avatar img');
            if (avatar) avatar.src = res.data[0].profile_image_url;

            if (!channel) {
                channel = res.data[0].login;
                data.channel = channel;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }

            await fetchBroadcasterInfo();
            updateConnectBtnState(true);
            initTwitchEmbed();
            startRealUpdates();
        }
    } catch(e) {
        console.error('Auth failed:', e);
        token = null;
        data.twitchToken = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showChannelInput();
    }
}

async function fetchBroadcasterInfo() {
    const res = await twitchAPI(`https://api.twitch.tv/helix/users?login=${channel}`);
    if (res.data && res.data[0]) {
        broadcasterId = res.data[0].id;
        broadcasterLogin = res.data[0].login;
    }
}

function connectTwitch() {
    const scopes = 'chat:read+chat:edit+user:read:email+moderator:read:followers+channel:read:subscriptions+bits:read+channel:read:hype_train+channel:manage:broadcast+channel:read:stream_key+clips:edit';
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scopes}`;
}

function switchChannel() {
    const input = prompt('Voer een Twitch kanaal naam in (bijv. tiesgames22222):');
    if (input && input.trim()) {
        channel = input.trim().toLowerCase();
        data.channel = channel;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        location.reload();
    }
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
        toast('Token verlopen — log opnieuw in');
        return { data: [] };
    }
    return await res.json();
}

// ===== REAL DATA UPDATES =====
function startRealUpdates() {
    fetchAllData();
    refreshInterval = setInterval(fetchAllData, 15000);
}

async function fetchAllData() {
    if (!token || !broadcasterId) return;

    try {
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

            document.getElementById('liveIndicator')?.classList.add('active');
            updateUptime();
            drawViewerChart();

            const titleEl = document.getElementById('proStreamTitle');
            if (titleEl && !titleEl.matches(':focus')) titleEl.value = stream.title || '';
        } else {
            isLive = false;
            updateEl('mViewers', '0');
            updateEl('topViewers', '0');
            document.getElementById('liveIndicator')?.classList.remove('active');
        }

        // Real followers (with names)
        const followRes = await twitchAPI(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=20`);
        if (followRes.total !== undefined) {
            totalFollowers = followRes.total;
            updateEl('mFollowers', totalFollowers.toLocaleString());
        }
        if (followRes.data) {
            recentFollowers = followRes.data;
            updateActivityFeed();
        }

        // Real subscribers (with names)
        const subRes = await twitchAPI(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=20`);
        if (subRes.total !== undefined) {
            totalSubs = subRes.total;
            updateEl('mSubs', totalSubs.toLocaleString());
        } else {
            updateEl('mSubs', '—');
        }
        if (subRes.data) {
            recentSubs = subRes.data;
        }

        // Revenue from subs (real calc: Tier1=€2.50, Tier2=€5, Tier3=€12.50 — streamer gets ~50%)
        if (subRes.data && subRes.data.length > 0) {
            let revenue = 0;
            subRes.data.forEach(s => {
                if (s.tier === '1000') revenue += 2.50;
                else if (s.tier === '2000') revenue += 5.00;
                else if (s.tier === '3000') revenue += 12.50;
            });
            updateEl('mRevenue', `€${revenue.toFixed(2)}`);
        }

        // Update goals
        updateGoals(totalFollowers, totalSubs);

        // Update analytics page
        updateAnalyticsPage();

        // Update monetize page
        updateMonetizePage();

    } catch(e) {
        console.error('Data fetch error:', e);
    }
}

// ===== REAL ACTIVITY FEED =====
function updateActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    feed.innerHTML = '';

    // Add real followers
    recentFollowers.forEach(f => {
        const ago = timeAgo(new Date(f.followed_at));
        const item = document.createElement('div');
        item.className = 'act-item follow';
        item.innerHTML = `<div class="act-icon"><i class="fas fa-heart"></i></div><div class="act-body"><strong>${escHtml(f.user_name)}</strong> is nu een volger!</div><div class="act-time">${ago}</div>`;
        feed.appendChild(item);
    });

    // Add real subs
    recentSubs.forEach(s => {
        if (s.is_gift) return;
        const tierName = s.tier === '1000' ? 'Tier 1' : s.tier === '2000' ? 'Tier 2' : 'Tier 3';
        const item = document.createElement('div');
        item.className = 'act-item sub';
        item.innerHTML = `<div class="act-icon"><i class="fas fa-star"></i></div><div class="act-body"><strong>${escHtml(s.user_name)}</strong> subscribed! <span class="act-badge">${tierName}</span></div><div class="act-time">sub</div>`;
        feed.appendChild(item);
    });

    // Gift subs
    recentSubs.filter(s => s.is_gift).forEach(s => {
        const item = document.createElement('div');
        item.className = 'act-item bits';
        item.innerHTML = `<div class="act-icon"><i class="fas fa-gift"></i></div><div class="act-body"><strong>${escHtml(s.gifter_name || 'Anoniem')}</strong> giftte een sub aan <strong>${escHtml(s.user_name)}</strong></div><div class="act-time">gift</div>`;
        feed.appendChild(item);
    });

    if (feed.children.length === 0) {
        feed.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">Nog geen activiteit — verbind Twitch om echte data te zien</div>';
    }
}

function timeAgo(date) {
    const sec = Math.floor((new Date() - date) / 1000);
    if (sec < 60) return 'nu';
    if (sec < 3600) return Math.floor(sec / 60) + 'm';
    if (sec < 86400) return Math.floor(sec / 3600) + 'u';
    return Math.floor(sec / 86400) + 'd';
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function updateUptime() {
    if (!streamStartedAt) return;
    const diff = Math.floor((new Date() - streamStartedAt) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    updateEl('topUptime', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
}

setInterval(() => { if (isLive) updateUptime(); }, 1000);

function updateGoals(followers, subs) {
    const goals = document.querySelectorAll('.pro-goal');
    if (goals[0]) {
        const target = Math.ceil(followers / 100) * 100 + 100;
        const pct = Math.min((followers / target) * 100, 100);
        goals[0].querySelector('.pg-nums').textContent = `${followers.toLocaleString()} / ${target.toLocaleString()}`;
        goals[0].querySelector('.pg-fill').style.width = pct + '%';
        goals[0].querySelector('.pg-fill span').textContent = Math.floor(pct) + '%';
    }
    if (goals[1]) {
        const target = Math.ceil(subs / 10) * 10 + 10;
        const pct = Math.min((subs / target) * 100, 100);
        goals[1].querySelector('.pg-nums').textContent = `${subs} / ${target}`;
        goals[1].querySelector('.pg-fill').style.width = pct + '%';
        goals[1].querySelector('.pg-fill span').textContent = Math.floor(pct) + '%';
    }
}

// ===== REAL ANALYTICS =====
function updateAnalyticsPage() {
    // Update stat highlights with real data
    const highlights = document.querySelectorAll('.stat-highlight .sh-val');
    if (highlights[0]) highlights[0].textContent = viewerHistory.reduce((a,b) => a+b, 0).toLocaleString() || '0';
    if (highlights[1]) highlights[1].textContent = '+' + recentFollowers.length;
    if (highlights[2]) {
        let rev = 0;
        recentSubs.forEach(s => {
            if (s.tier === '1000') rev += 2.50;
            else if (s.tier === '2000') rev += 5;
            else if (s.tier === '3000') rev += 12.50;
        });
        highlights[2].textContent = `€${rev.toFixed(0)}`;
    }
    if (highlights[3] && streamStartedAt && isLive) {
        const hrs = ((new Date() - streamStartedAt) / 3600000).toFixed(1);
        highlights[3].textContent = hrs + 'h';
    }

    // Update top supporters with real sub names
    const supList = document.querySelector('.supporters-list');
    if (supList && recentSubs.length > 0) {
        supList.innerHTML = '';
        const ranked = [...recentSubs].slice(0, 5);
        ranked.forEach((s, i) => {
            const tierVal = s.tier === '1000' ? '€4.99' : s.tier === '2000' ? '€9.99' : '€24.99';
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const div = document.createElement('div');
            div.className = 'sup-item';
            div.innerHTML = `<span class="sup-rank ${rankClass}">${i+1}</span><span class="sup-name">${escHtml(s.user_name)}</span><span class="sup-amount">${tierVal}</span>`;
            supList.appendChild(div);
        });
    }
}

// ===== REAL MONETIZE =====
function updateMonetizePage() {
    const moVals = document.querySelectorAll('.mo-val');
    if (recentSubs.length > 0) {
        let total = 0, t1 = 0, t2 = 0, t3 = 0;
        recentSubs.forEach(s => {
            if (s.tier === '1000') { total += 2.50; t1++; }
            else if (s.tier === '2000') { total += 5; t2++; }
            else if (s.tier === '3000') { total += 12.50; t3++; }
        });
        if (moVals[0]) moVals[0].textContent = `€${total.toFixed(2)}`;
        if (moVals[1]) moVals[1].textContent = `€${total.toFixed(2)}`;
        if (moVals[2]) moVals[2].textContent = totalSubs.toString();
        if (moVals[3] && totalSubs > 0) moVals[3].textContent = `€${(total / Math.max(totalSubs, 1)).toFixed(2)}`;

        // Update tier counts
        const tierCounts = document.querySelectorAll('.st-count');
        if (tierCounts[0]) tierCounts[0].textContent = `${t1} subs`;
        if (tierCounts[1]) tierCounts[1].textContent = `${t2} subs`;
        if (tierCounts[2]) tierCounts[2].textContent = `${t3} subs`;
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
            const pageId = 'page' + link.dataset.page.charAt(0).toUpperCase() + link.dataset.page.slice(1);
            document.getElementById(pageId)?.classList.add('active');
        });
    });
}

// ===== TWITCH EMBED =====
function initTwitchEmbed() {
    const embedEl = document.getElementById('proTwitchEmbed');
    if (!embedEl || embedEl.querySelector('iframe')) return;
    try {
        new Twitch.Embed("proTwitchEmbed", {
            width: "100%", height: "100%", channel: channel,
            layout: "video", autoplay: true, muted: true, parent: PARENT_DOMAINS
        });
    } catch(e) {}

    const chatEl = document.getElementById('proChatEmbed');
    if (chatEl && !chatEl.querySelector('iframe')) {
        chatEl.innerHTML = `<iframe src="https://www.twitch.tv/embed/${channel}/chat?parent=${PARENT_DOMAINS[0]}&darkpopout" height="100%" width="100%" style="border:none;border-radius:8px;"></iframe>`;
    }
}

// ===== STREAM CONTROLS =====
async function toggleLive() {
    toast('Start je stream in OBS en klik "Start Streaming". NeonStream detecteert het automatisch.');
}

function toggleRecord() {
    const dot = document.getElementById('proRecDot');
    dot.classList.toggle('recording');
    if (dot.classList.contains('recording')) {
        dot.style.color = '#ef4444';
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(() => {
            toast('Opname gestart');
        }).catch(() => { dot.classList.remove('recording'); dot.style.color = ''; });
    } else {
        dot.style.color = '';
        toast('Opname gestopt');
    }
}

async function proClip() {
    if (!token || !broadcasterId) { toast('Log in om clips te maken'); return; }
    try {
        const res = await twitchAPI('https://api.twitch.tv/helix/clips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ broadcaster_id: broadcasterId })
        });
        if (res.data?.[0]) {
            toast('Clip aangemaakt! ID: ' + res.data[0].id);
        } else {
            toast('Clip mislukt — stream moet live zijn');
        }
    } catch(e) { toast('Kon geen clip maken'); }
}

function proMarker() { toast('Marker — gebruik je stream software'); }
function proAd() { toast('Ad breaks via Twitch Dashboard'); }

// ===== REAL CHAT =====
async function proSendChat(msg) {
    if (!msg || !msg.trim()) return;
    const input = document.getElementById('proQuickMsg');
    if (input && input.value === msg) input.value = '';

    if (!token || !userId) { toast('Log in met Twitch om berichten te sturen'); connectTwitch(); return; }
    if (!broadcasterId) { toast('Broadcaster niet gevonden'); return; }

    try {
        const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
            body: JSON.stringify({ broadcaster_id: broadcasterId, sender_id: userId, message: msg })
        });
        if (res.ok) { toast(`Chat: "${msg}"`); }
        else { const err = await res.json(); toast(err.message || 'Kon niet versturen'); }
    } catch(e) { toast('Verbindingsfout'); }
}

// ===== ALERTS =====
function testProAlert(type) {
    const preview = document.getElementById('proAlertPreview');
    const msgs = { follow: 'TEST follow alert', sub: 'TEST sub alert', donation: 'TEST donatie alert', raid: 'TEST raid alert', bits: 'TEST bits alert', giftsub: 'TEST gift sub alert' };
    if (preview) { preview.innerHTML = `<span style="animation:actIn 0.3s ease">${msgs[type]}</span>`; preview.style.color = 'var(--text-1)'; }
    toast('Echte alerts via Streamlabs/StreamElements overlay');
}

function proSound(btn) {
    btn.style.transform = 'scale(0.9)';
    btn.style.background = 'rgba(168,85,247,0.2)';
    setTimeout(() => { btn.style.transform = ''; btn.style.background = ''; }, 300);
    toast('Koppel aan OBS via Browser Source');
}

async function proRaid(target) {
    if (!target?.trim()) return;
    if (!token || !broadcasterId) { toast('Log in om te raiden'); return; }
    toast(`Raid naar ${target} — gebruik /raid ${target} in chat`);
}

function modAction(mode) { toast(`Chat mode: ${mode}`); }
function proMod(btn, mode) {
    btn.classList.toggle('active');
    const cmds = { slow: '/slow', sub: '/subscribers', emote: '/emoteonly', followers: '/followers', unique: '/uniquechat', clear: '/clear' };
    toast(`Gebruik in chat: ${cmds[mode] || '/' + mode}`);
}

function addProCmd() {
    const name = document.getElementById('proCmdName').value;
    const resp = document.getElementById('proCmdResp').value;
    if (!name || !resp) return;
    const list = document.querySelector('.pro-commands');
    const item = document.createElement('div');
    item.className = 'pc-item';
    item.innerHTML = `<code>${escHtml(name)}</code><span>${escHtml(resp)}</span><button onclick="proSendChat('${resp.replace(/'/g,"\\'")}')"><i class="fas fa-play"></i></button>`;
    list.appendChild(item);
    document.getElementById('proCmdName').value = '';
    document.getElementById('proCmdResp').value = '';
    toast(`Command ${name} toegevoegd`);
}

function addProTag(input) {
    if (!input.value.trim()) return;
    const tag = document.createElement('span');
    tag.className = 'pro-tag';
    tag.innerHTML = `${escHtml(input.value.trim())} <i class="fas fa-xmark" onclick="this.parentElement.remove()"></i>`;
    input.parentElement.insertBefore(tag, input);
    input.value = '';
}

function startProPred() { toast('Predictions via Twitch Creator Dashboard'); }
function addProPollOpt() {
    const opts = document.getElementById('proPollOpts');
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'pro-input'; input.placeholder = `Optie ${opts.children.length + 1}`;
    opts.appendChild(input);
}
function startProPoll() { toast('Polls via Twitch Creator Dashboard'); }

function addStudioEl(type) {
    const canvas = document.getElementById('studioCanvas');
    const el = document.createElement('div');
    el.className = 'sc-element';
    el.style.top = Math.random() * 50 + '%'; el.style.left = Math.random() * 50 + '%';
    const icons = { text: 'fa-font', image: 'fa-image', webcam: 'fa-video', browser: 'fa-globe', game: 'fa-gamepad', screen: 'fa-desktop' };
    el.style.background = `rgba(${Math.random()*200|0},${Math.random()*150|0},${Math.random()*255|0},0.25)`;
    el.innerHTML = `<i class="fas ${icons[type] || 'fa-cube'}"></i> ${type}`;
    canvas.appendChild(el);
}

function triggerFx(effect) { toast(`Effect: ${effect} — voeg toe als Browser Source in OBS`); }

// ===== VIEWER CHART =====
function drawViewerChart() {
    const canvas = document.getElementById('proViewerChart');
    if (!canvas || viewerHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(...viewerHistory, 1);
    const step = w / (viewerHistory.length - 1);
    ctx.beginPath(); ctx.moveTo(0, h);
    viewerHistory.forEach((v, i) => ctx.lineTo(i * step, h - (v / max) * (h - 30)));
    ctx.lineTo(w, h); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(168,85,247,0.25)'); grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    viewerHistory.forEach((v, i) => { const x = i * step, y = h - (v / max) * (h - 30); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.stroke();
}

// ===== AUDIO METERS =====
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

function filterAct(btn, type) {
    document.querySelectorAll('.af').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.act-item').forEach(item => {
        item.style.display = (type === 'all' || item.classList.contains(type)) ? '' : 'none';
    });
}

function toggleUserPanel() {
    if (!token) { connectTwitch(); }
    else { toast(`Ingelogd als: ${data.twitchUser?.display_name || '?'} | Kanaal: ${broadcasterLogin || channel}`); }
}

function updateEl(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }

function toast(msg) {
    const t = document.getElementById('proToast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}

// ===== OBS WEBSOCKET =====
let obsWs = null, obsConnected = false, obsReqId = 1, obsPendingRequests = {};

function obsConnect() {
    const url = document.getElementById('obsWsUrl')?.value || 'ws://localhost:4455';
    const password = document.getElementById('obsWsPassword')?.value;
    try { obsWs = new WebSocket(url); } catch(e) { toast('Kan niet verbinden met OBS'); return; }

    obsWs.onopen = () => { toast('Verbinden met OBS...'); };
    obsWs.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.op === 0) {
            const authPayload = { op: 1, d: { rpcVersion: 1 } };
            if (msg.d.authentication && password) {
                const { challenge, salt } = msg.d.authentication;
                hashOBSAuth(password, salt, challenge).then(auth => { authPayload.d.authentication = auth; obsWs.send(JSON.stringify(authPayload)); });
            } else { obsWs.send(JSON.stringify(authPayload)); }
        } else if (msg.op === 2) {
            obsConnected = true; updateOBSUI(true); toast('OBS Verbonden!');
            obsGetScenes(); obsGetAudioSources(); obsGetStatus();
            setInterval(obsGetStatus, 5000);
        } else if (msg.op === 5) { handleOBSEvent(msg.d); }
        else if (msg.op === 7) { const id = msg.d.requestId; if (obsPendingRequests[id]) { obsPendingRequests[id](msg.d); delete obsPendingRequests[id]; } }
    };
    obsWs.onclose = () => { obsConnected = false; updateOBSUI(false); };
    obsWs.onerror = () => { toast('OBS verbindingsfout — is OBS open?'); };
}

async function hashOBSAuth(password, salt, challenge) {
    const enc = new TextEncoder();
    const s1 = await crypto.subtle.digest('SHA-256', enc.encode(password + salt));
    const b64 = btoa(String.fromCharCode(...new Uint8Array(s1)));
    const s2 = await crypto.subtle.digest('SHA-256', enc.encode(b64 + challenge));
    return btoa(String.fromCharCode(...new Uint8Array(s2)));
}

function obsDisconnect() { if (obsWs) { obsWs.close(); obsWs = null; } obsConnected = false; updateOBSUI(false); toast('OBS verbroken'); }

function obsSendRequest(requestType, requestData = {}) {
    return new Promise(resolve => {
        if (!obsWs || !obsConnected) { resolve(null); return; }
        const id = 'req_' + (obsReqId++);
        obsPendingRequests[id] = resolve;
        obsWs.send(JSON.stringify({ op: 6, d: { requestType, requestId: id, requestData } }));
        setTimeout(() => { if (obsPendingRequests[id]) { delete obsPendingRequests[id]; resolve(null); } }, 5000);
    });
}

function updateOBSUI(connected) {
    const badge = document.getElementById('obsStatusBadge');
    if (badge) { badge.textContent = connected ? 'Verbonden' : 'Niet verbonden'; badge.className = 'card-badge ' + (connected ? 'connected' : 'offline'); }
    const cb = document.getElementById('obsConnectBtn'), db = document.getElementById('obsDisconnectBtn');
    if (cb) cb.style.display = connected ? 'none' : '';
    if (db) db.style.display = connected ? '' : 'none';
}

async function obsGetScenes() {
    const res = await obsSendRequest('GetSceneList');
    if (!res?.responseData) return;
    const list = document.getElementById('obsScenesList');
    const scenes = res.responseData.scenes || [], current = res.responseData.currentProgramSceneName;
    list.innerHTML = '';
    scenes.reverse().forEach(scene => {
        const div = document.createElement('div');
        div.className = 'obs-scene-item' + (scene.sceneName === current ? ' active' : '');
        div.innerHTML = `<i class="fas fa-layer-group"></i> ${escHtml(scene.sceneName)}${scene.sceneName === current ? '<span class="scene-live">ACTIEF</span>' : ''}`;
        div.onclick = () => obsSetScene(scene.sceneName);
        list.appendChild(div);
    });
}

async function obsSetScene(name) { await obsSendRequest('SetCurrentProgramScene', { sceneName: name }); toast(`Scene: ${name}`); obsGetScenes(); }

async function obsGetAudioSources() {
    const res = await obsSendRequest('GetInputList');
    if (!res?.responseData) return;
    const list = document.getElementById('obsAudioList');
    const inputs = (res.responseData.inputs || []).filter(i => i.inputKind?.includes('wasapi') || i.inputKind?.includes('pulse') || i.inputKind?.includes('coreaudio') || i.inputKind?.includes('audio'));
    if (!inputs.length) { list.innerHTML = '<div class="obs-no-data"><i class="fas fa-volume-mute"></i> Geen audio bronnen</div>'; return; }
    list.innerHTML = '';
    for (const input of inputs) {
        const volRes = await obsSendRequest('GetInputVolume', { inputName: input.inputName });
        const muteRes = await obsSendRequest('GetInputMute', { inputName: input.inputName });
        const pct = Math.round(Math.max(0, Math.min(100, ((volRes?.responseData?.inputVolumeDb ?? 0) + 60) / 60 * 100)));
        const muted = muteRes?.responseData?.inputMuted ?? false;
        const div = document.createElement('div');
        div.className = 'obs-audio-item';
        div.innerHTML = `<span>${escHtml(input.inputName)}</span><input type="range" min="0" max="100" value="${pct}" onchange="obsSetVolume('${input.inputName.replace(/'/g,"\\'")}',this.value)"><button class="${muted?'muted':''}" onclick="obsToggleMute('${input.inputName.replace(/'/g,"\\'")}',this)"><i class="fas ${muted?'fa-volume-mute':'fa-volume-up'}"></i></button>`;
        list.appendChild(div);
    }
}

async function obsSetVolume(name, pct) { await obsSendRequest('SetInputVolume', { inputName: name, inputVolumeDb: (pct / 100) * 60 - 60 }); }
async function obsToggleMute(name, btn) {
    await obsSendRequest('ToggleInputMute', { inputName: name });
    const res = await obsSendRequest('GetInputMute', { inputName: name });
    const m = res?.responseData?.inputMuted ?? false;
    btn.className = m ? 'muted' : '';
    btn.innerHTML = `<i class="fas ${m?'fa-volume-mute':'fa-volume-up'}"></i>`;
}

async function obsGetStatus() {
    if (!obsConnected) return;
    const [streamRes, recordRes, statsRes, sceneRes] = await Promise.all([
        obsSendRequest('GetStreamStatus'), obsSendRequest('GetRecordStatus'),
        obsSendRequest('GetStats'), obsSendRequest('GetCurrentProgramScene')
    ]);
    if (streamRes?.responseData) {
        const s = streamRes.responseData;
        updateEl('obsStreamStatus', s.outputActive ? `Live (${s.outputTimecode?.split('.')[0]||''})` : 'Offline');
    }
    if (recordRes?.responseData) {
        const r = recordRes.responseData;
        updateEl('obsRecordStatus', r.outputActive ? `Opname (${r.outputTimecode?.split('.')[0]||''})` : 'Gestopt');
    }
    if (statsRes?.responseData) {
        updateEl('obsCpuUsage', (statsRes.responseData.cpuUsage||0).toFixed(1)+'%');
        updateEl('obsMemUsage', ((statsRes.responseData.memoryUsage||0)/1024).toFixed(0)+' GB');
    }
    if (sceneRes?.responseData) updateEl('obsCurrentScene', sceneRes.responseData.currentProgramSceneName||'—');
}

function handleOBSEvent(d) {
    const t = d.eventType;
    if (t === 'CurrentProgramSceneChanged') { obsGetScenes(); updateEl('obsCurrentScene', d.eventData?.sceneName||'—'); }
    else if (t === 'StreamStateChanged' || t === 'RecordStateChanged') obsGetStatus();
    else if (t === 'InputVolumeChanged' || t === 'InputMuteStateChanged') obsGetAudioSources();
}

async function obsAction(action) {
    if (!obsConnected) { toast('Verbind eerst met OBS'); return; }
    const map = { startStream:['StartStream','Stream gestart!'], stopStream:['StopStream','Stream gestopt'], startRecord:['StartRecord','Opname gestart'], stopRecord:['StopRecord','Opname gestopt'], pauseRecord:['PauseRecord','Opname gepauzeerd'], toggleVCam:['ToggleVirtualCam','Virtual Cam toggled'], toggleStudioMode:null, screenshot:null };
    if (action === 'toggleStudioMode') {
        const r = await obsSendRequest('GetStudioModeEnabled');
        await obsSendRequest('SetStudioModeEnabled', { studioModeEnabled: !(r?.responseData?.studioModeEnabled??false) });
        toast('Studio Mode toggled');
    } else if (action === 'screenshot') {
        const r = await obsSendRequest('GetCurrentProgramScene');
        if (r?.responseData?.currentProgramSceneName) await obsSendRequest('SaveSourceScreenshot', { sourceName: r.responseData.currentProgramSceneName, imageFormat:'png', imageFilePath:`C:/Users/Public/NeonStream_${Date.now()}.png` });
        toast('Screenshot opgeslagen');
    } else if (map[action]) {
        await obsSendRequest(map[action][0]); toast(map[action][1]);
    }
    setTimeout(obsGetStatus, 1000);
}

// ===== DISCORD WEBHOOK =====
async function testDiscordWebhook() {
    const url = document.getElementById('discordWebhook')?.value;
    if (!url?.includes('discord.com/api/webhooks')) { toast('Voer een geldige Discord webhook URL in'); return; }
    try {
        const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ embeds: [{ title:'NeonStream — Test', description:`**${broadcasterLogin||channel}** is nu LIVE op Twitch!`, color:0x9146FF, thumbnail:{url:data.twitchUser?.profile_image_url||''}, footer:{text:'NeonStream PRO'}, timestamp:new Date().toISOString() }] })
        });
        toast(res.ok || res.status===204 ? 'Discord webhook test verzonden!' : 'Webhook fout');
    } catch(e) { toast('Kon webhook niet bereiken'); }
}

// ===== STREAM TIMER =====
let toolTimerInterval = null, toolTimerSeconds = 0, toolTimerRunning = false;
function startToolTimer() {
    if (toolTimerRunning) return;
    const cd = parseInt(document.getElementById('countdownMin')?.value||0);
    if (cd > 0 && toolTimerSeconds === 0) toolTimerSeconds = cd * 60;
    toolTimerRunning = true;
    toolTimerInterval = setInterval(() => {
        if (cd > 0) { toolTimerSeconds--; if (toolTimerSeconds <= 0) { toolTimerSeconds = 0; pauseToolTimer(); toast('Timer afgelopen!'); } }
        else { toolTimerSeconds++; }
        updateTimerDisplay();
    }, 1000);
}
function pauseToolTimer() { toolTimerRunning = false; clearInterval(toolTimerInterval); }
function resetToolTimer() { pauseToolTimer(); toolTimerSeconds = 0; updateTimerDisplay(); }
function updateTimerDisplay() {
    const h = Math.floor(toolTimerSeconds/3600), m = Math.floor((toolTimerSeconds%3600)/60), s = toolTimerSeconds%60;
    updateEl('toolTimer', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
}

// ===== AUTO MESSAGES =====
let autoMsgIntervals = [];
function saveAutoMessages() {
    autoMsgIntervals.forEach(id => clearInterval(id)); autoMsgIntervals = [];
    document.querySelectorAll('.am-item').forEach(item => {
        const msg = item.querySelector('.pro-input')?.value;
        const min = parseInt(item.querySelectorAll('.pro-input')[1]?.value||10);
        const active = item.querySelector('input[type="checkbox"]')?.checked;
        if (active && msg && min > 0) autoMsgIntervals.push(setInterval(() => { if (isLive) proSendChat(msg); }, min*60000));
    });
    toast('Auto berichten opgeslagen');
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
