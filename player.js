// Persistent Stream Player - works across all pages
const PLAYER_PARENT_DOMAINS = ['logan2013-code.github.io', 'localhost', '127.0.0.1'];
const PLAYER_STORAGE = 'neonstream_data';

(function initPersistentPlayer() {
    const data = JSON.parse(localStorage.getItem(PLAYER_STORAGE) || '{}');
    const channel = data.channel || 'tiesgames22222';
    const isMainPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '/stream-platform/' || window.location.pathname === '/stream-platform';

    if (isMainPage) return;

    const playerHTML = `
    <div class="persistent-player" id="persistentPlayer">
        <div class="pp-header">
            <span class="pp-live-dot"></span>
            <span class="pp-channel">${channel}</span>
            <div class="pp-controls">
                <button class="pp-btn" onclick="togglePPSize()" title="Vergroot/Verklein"><i class="fas fa-expand"></i></button>
                <button class="pp-btn" onclick="closePP()" title="Sluiten"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="pp-video" id="ppVideo"></div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', playerHTML);

    setTimeout(() => {
        try {
            new Twitch.Embed("ppVideo", {
                width: "100%", height: "100%", channel: channel,
                layout: "video", autoplay: true, muted: true, parent: PLAYER_PARENT_DOMAINS
            });
        } catch(e) {}
    }, 500);
})();

function togglePPSize() {
    const pp = document.getElementById('persistentPlayer');
    pp.classList.toggle('pp-large');
    const icon = pp.querySelector('.pp-controls button:first-child i');
    icon.className = pp.classList.contains('pp-large') ? 'fas fa-compress' : 'fas fa-expand';
}

function closePP() {
    document.getElementById('persistentPlayer').style.display = 'none';
}
