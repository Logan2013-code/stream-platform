// ==================== NEONSTREAM PRO ====================
const PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const STORAGE_KEY = 'neonstream_data';
const CLIENT_ID = '2l6my3eh5ykvp352o18wvm6txvc5zn';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let channel = data.channel || 'tiesgames22222';
let isLive = false;
let streamSeconds = 0;
let peakViewers = 0;
let totalRevenue = 0;
let viewerHistory = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTwitchEmbed();
    startLiveUpdates();
    initParticles();
    animateMeters();
});

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

// ===== LIVE UPDATES =====
function startLiveUpdates() {
    // Viewer + stats updates
    setInterval(() => {
        const v = Math.floor(Math.random() * 25) + 5;
        if (v > peakViewers) peakViewers = v;
        viewerHistory.push(v);
        if (viewerHistory.length > 60) viewerHistory.shift();

        updateEl('mViewers', v);
        updateEl('topViewers', v);
        updateEl('mPeak', peakViewers);
        updateEl('mFollowers', 754 + Math.floor(Math.random() * 5));
        updateEl('mChatRate', Math.floor(Math.random() * 15 + 3) + '/m');
        updateEl('mRevenue', '€' + totalRevenue.toFixed(0));

        // Health
        const cpu = Math.floor(Math.random() * 25 + 35);
        const hbCpu = document.getElementById('hbCpu');
        const hbCpuVal = document.getElementById('hbCpuVal');
        if (hbCpu) { hbCpu.style.width = cpu + '%'; hbCpu.className = 'hb-fill ' + (cpu > 70 ? 'bad' : cpu > 50 ? 'warn' : 'good'); }
        if (hbCpuVal) hbCpuVal.textContent = cpu + '%';

        drawViewerChart();
    }, 5000);

    // Uptime
    setInterval(() => {
        if (!isLive) return;
        streamSeconds++;
        const h = Math.floor(streamSeconds / 3600);
        const m = Math.floor((streamSeconds % 3600) / 60);
        const s = streamSeconds % 60;
        updateEl('topUptime', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);

        // Timeline progress
        const progress = document.getElementById('ptProgress');
        if (progress) progress.style.width = Math.min((streamSeconds / 3600) * 100, 100) + '%';
    }, 1000);

    // Random activity
    setInterval(() => {
        const types = ['follow', 'sub', 'donation', 'bits', 'raid'];
        const names = ['xGamer_NL', 'StreamKing', 'PixelPro', 'NeonFan99', 'CoolViewer', 'DutchGamer', 'ProPlayer_X', 'TwitchFan', 'GameMaster'];
        const type = types[Math.floor(Math.random() * types.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        addActivity(type, name);
    }, 12000);
}

function addActivity(type, name) {
    const messages = {
        follow: `is nu een volger!`,
        sub: `subscribed! <span class="act-badge">Tier ${Math.floor(Math.random()*3)+1}</span>`,
        donation: `doneerde <span class="act-amount">€${(Math.random()*20+1).toFixed(2)}</span>`,
        bits: `cheered <span class="act-amount">${Math.floor(Math.random()*500+50)} bits</span>`,
        raid: `raidde met <span class="act-amount">${Math.floor(Math.random()*50+5)} kijkers</span>`
    };

    if (type === 'donation') totalRevenue += parseFloat((Math.random()*20+1).toFixed(2));
    if (type === 'bits') totalRevenue += Math.floor(Math.random()*5+1);

    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    const icons = { follow: 'fa-heart', sub: 'fa-star', donation: 'fa-coins', bits: 'fa-gem', raid: 'fa-users' };
    const item = document.createElement('div');
    item.className = `act-item ${type}`;
    item.innerHTML = `<div class="act-icon"><i class="fas ${icons[type]}"></i></div><div class="act-body"><strong>${name}</strong> ${messages[type]}</div><div class="act-time">nu</div>`;
    feed.insertBefore(item, feed.firstChild);
    if (feed.children.length > 20) feed.removeChild(feed.lastChild);
}

// ===== STREAM CONTROLS =====
function toggleLive() {
    isLive = !isLive;
    const btn = document.getElementById('goLiveBtn');
    const indicator = document.getElementById('liveIndicator');
    if (isLive) {
        btn.innerHTML = '<i class="fas fa-stop"></i><span>End Stream</span>';
        btn.classList.add('live');
        indicator.classList.add('active');
        toast('Stream gestart! Je bent nu LIVE 🔴');
    } else {
        btn.innerHTML = '<i class="fas fa-broadcast-tower"></i><span>Go Live</span>';
        btn.classList.remove('live');
        indicator.classList.remove('active');
        streamSeconds = 0;
        toast('Stream gestopt');
    }
}

function toggleRecord() {
    const dot = document.getElementById('proRecDot');
    dot.classList.toggle('recording');
    if (dot.classList.contains('recording')) {
        dot.style.color = '#ef4444';
        toast('Opname gestart 🔴');
    } else {
        dot.style.color = '';
        toast('Opname gestopt en opgeslagen');
    }
}

function proClip() { toast('Clip aangemaakt! ✂️'); }
function proMarker() { toast('Stream marker geplaatst 📍'); }
function proAd() { toast('Ad break gestart (90s) 📺'); }

// ===== CHAT - REAL TWITCH INTEGRATION =====
async function proSendChat(msg) {
    if (!msg || !msg.trim()) return;
    const input = document.getElementById('proQuickMsg');
    if (input) input.value = '';

    if (!data.twitchToken || !data.twitchUser) {
        toast('⚠ Verbind Twitch op de Monitor pagina om berichten te sturen');
        return;
    }

    try {
        const bRes = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
            headers: { 'Authorization': `Bearer ${data.twitchToken}`, 'Client-Id': CLIENT_ID }
        });
        const bData = await bRes.json();
        const bId = bData.data?.[0]?.id;
        if (!bId) { toast('⚠ Kanaal niet gevonden'); return; }

        const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${data.twitchToken}`, 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
            body: JSON.stringify({ broadcaster_id: bId, sender_id: data.twitchUser.id, message: msg })
        });

        if (res.ok) {
            toast(`✓ "${msg}" verstuurd naar chat`);
        } else {
            toast('⚠ Kon bericht niet versturen');
        }
    } catch(e) {
        toast('⚠ Verbindingsfout');
    }
}

// ===== ALERTS =====
function testProAlert(type) {
    const msgs = {
        follow: '🎉 TestUser is nu een volger!',
        sub: '⭐ TestUser subscribed! (Tier 1)',
        donation: '💰 TestUser doneerde €10.00!',
        raid: '🎊 TestUser raidde met 50 kijkers!',
        bits: '💎 TestUser cheered 500 bits!',
        giftsub: '🎁 TestUser gifted 5 subs!'
    };
    const preview = document.getElementById('proAlertPreview');
    if (preview) {
        preview.innerHTML = `<span style="animation:actIn 0.3s ease">${msgs[type]}</span>`;
        preview.style.color = 'var(--text-1)';
    }
    addActivity(type === 'giftsub' ? 'sub' : type, 'TestUser');
}

// ===== SOUNDBOARD =====
function proSound(btn) {
    btn.style.transform = 'scale(0.9)';
    btn.style.background = 'rgba(168,85,247,0.2)';
    setTimeout(() => { btn.style.transform = ''; btn.style.background = ''; }, 300);
    toast('🔊 ' + btn.querySelector('span').textContent);
}

// ===== RAID =====
function proRaid(target) {
    if (!target) return;
    toast(`🎊 Raiding ${target}!`);
    addActivity('raid', target);
}

// ===== MODERATION =====
function modAction(mode) {
    toast(`Chat mode: ${mode}`);
}
function proMod(btn, mode) {
    btn.classList.toggle('active');
    toast(`${mode} mode ${btn.classList.contains('active') ? 'aan' : 'uit'}`);
}

// ===== CHATBOT =====
function addProCmd() {
    const name = document.getElementById('proCmdName').value;
    const resp = document.getElementById('proCmdResp').value;
    if (!name || !resp) return;
    const list = document.querySelector('.pro-commands');
    const item = document.createElement('div');
    item.className = 'pc-item';
    item.innerHTML = `<code>${name}</code><span>${resp}</span><button><i class="fas fa-play"></i></button>`;
    list.appendChild(item);
    document.getElementById('proCmdName').value = '';
    document.getElementById('proCmdResp').value = '';
    toast(`Command ${name} toegevoegd!`);
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
    const q = document.getElementById('proPredQ').value;
    if (!q) return;
    toast('Prediction gestart! 🔮 ' + q);
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
    const q = document.getElementById('proPollQ').value;
    if (!q) return;
    toast('Poll gestart! 📊 ' + q);
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
    toast(`${type} toegevoegd aan scene`);
}

function triggerFx(effect) {
    toast(`✨ Effect: ${effect}`);
    const canvas = document.getElementById('studioCanvas');
    canvas.style.animation = 'none';
    canvas.offsetHeight;
    canvas.style.animation = 'effectFlash 0.5s ease';
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

    // Gradient fill
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

    // Line
    ctx.beginPath();
    viewerHistory.forEach((v, i) => {
        const x = i * step, y = h - (v / max) * (h - 30);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
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

// ===== ACTIVITY FILTER =====
function filterAct(btn, type) {
    document.querySelectorAll('.af').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.act-item').forEach(item => {
        item.style.display = (type === 'all' || item.classList.contains(type)) ? '' : 'none';
    });
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
    setTimeout(() => t.classList.remove('show'), 3500);
}

// CSS animation for effects
const style = document.createElement('style');
style.textContent = `
@keyframes particleFloat { 0% { transform: translateY(0) translateX(0); } 100% { transform: translateY(-30px) translateX(15px); } }
@keyframes effectFlash { 0% { box-shadow: inset 0 0 30px rgba(168,85,247,0.5); } 100% { box-shadow: none; } }
.recording { animation: recPulse 1s infinite; }
@keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;
document.head.appendChild(style);
