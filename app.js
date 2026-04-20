// App Configuration
const config = {
    // YOU WILL REPLACE THESE VALUES LATER
    GOOGLE_DRIVE_API_KEY: 'AIzaSyCoPAqt5WjQP6HXENjLNoa9Za82PeRzn78',
    GOOGLE_DRIVE_FOLDER_ID: '1r5g69bpASQ3A7YaAddK65k0QLryF7_Y5' // Paste the folder ID here!
};

// DOM Elements
const grid = document.getElementById('episode-grid');
const searchInput = document.getElementById('search-input');
const playerModal = document.getElementById('player-modal');
const playerClose = document.getElementById('player-close');
const videoElement = document.getElementById('custom-video');
const playingTitle = document.getElementById('playing-title');
const playRandomBtn = document.getElementById('play-random-btn');
const navbar = document.querySelector('.navbar');

// State
let episodes = [];

// Navigation Scroll Effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Load the catalog
async function loadCatalog() {
    try {
        if(config.GOOGLE_DRIVE_FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
            throw new Error('Configure API Key and Folder ID first.');
        }

        // 1. Check for Cached Data (Save API Quota)
        const CACHE_KEY = 'pokestream_catalog_cache';
        const CACHE_TIME_KEY = 'pokestream_catalog_timestamp';
        const ONE_HOUR = 60 * 60 * 1000;

        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        if (cachedData && cachedTime && (now - cachedTime < ONE_HOUR)) {
            console.log("Loading episodes from local cache...");
            episodes = JSON.parse(cachedData);
            renderGrid(episodes);
            return;
        }

        // 2. Fetch from Google Drive API if no cache or expired
        console.log("Fetching fresh catalog from Google Drive...");
        const url = `https://www.googleapis.com/drive/v3/files?q='${config.GOOGLE_DRIVE_FOLDER_ID}'+in+parents&fields=files(id,name,thumbnailLink)&orderBy=name&pageSize=100&key=${config.GOOGLE_DRIVE_API_KEY}`;
        const res = await fetch(url);
        
        if (!res.ok) {
            const errorData = await res.json();
            if (res.status === 403 || res.status === 429) {
                throw new Error('API Quota Exceeded. Google is limiting requests right now. Try again in a few minutes.');
            }
            throw new Error(errorData.error ? errorData.error.message : 'Failed to load from Google Drive API');
        }
        
        const data = await res.json();
        
        if(!data.files || data.files.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No videos found in this Google Drive folder. Check your folder ID and API rules.</p>`;
            return;
        }

        // Map live Google Drive data to our UI
        episodes = data.files.map((file, index) => {
            let cleanTitle = file.name.replace('.mp4', '').replace(/\[.*?\]\s*/g, '').replace('Pokémon - ', '').trim();
            const numMatch = cleanTitle.match(/^(\d+)\s*-?\s*(.*)$/);
            const epNum = numMatch ? parseInt(numMatch[1], 10) : (index + 1);
            if (numMatch) cleanTitle = numMatch[2].trim() || cleanTitle;

            return {
                id: file.id,
                title: cleanTitle,
                episode: epNum,
                thumbnail: file.thumbnailLink
            };
        });

        episodes.sort((a,b) => a.episode - b.episode);

        // 3. Save to Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify(episodes));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());

        renderGrid(episodes);
    } catch (err) {
        console.error("Error loading automatically from Drive:", err);
        
        // Show the error on screen to the user
        const warning = document.createElement('div');
        warning.className = 'api-warning';
        warning.style = "background: rgba(233, 53, 13, 0.2); padding: 20px; margin-bottom: 30px; border-radius: 12px; border: 1px solid var(--primary); text-align: center;";
        warning.innerHTML = `
            <h3 style="color: var(--primary); margin-bottom: 10px;">Connection Error</h3>
            <p>${err.message}</p>
            <button onclick="localStorage.clear(); location.reload();" style="margin-top: 15px; padding: 8px 16px; cursor: pointer; background: var(--primary); color: white; border: none; border-radius: 4px;">Retry Connection</button>
        `;
        document.querySelector('.content-section').prepend(warning);

        // Show sample data if fetch failed
        if (episodes.length === 0) {
           episodes = [
                { id: "mock1", title: "Connection Failed - Showing Example", episode: 1 },
                { id: "mock2", title: "Check your API Console quotas", episode: 2 }
            ];
            renderGrid(episodes);
        }
    }
}

// Render the Episode Grid
function renderGrid(data) {
    grid.innerHTML = '';
    
    data.forEach(ep => {
        const card = document.createElement('div');
        card.className = 'episode-card';
        
        // Use a generic placeholder image if none present, or fetch from internet
        const thumbnailSrc = ep.thumbnail || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${(ep.episode % 151) + 1}.png`;

        card.innerHTML = `
            <div class="thumbnail">
                <img src="${thumbnailSrc}" alt="${ep.title}" loading="lazy" style="${ep.thumbnail ? '' : 'object-fit: contain; padding: 20px;'}">
                <div class="play-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>
            <div class="episode-info">
                <div class="ep-number">EPISODE ${ep.episode}</div>
                <div class="ep-title" title="${ep.title}">${ep.title}</div>
            </div>
        `;
        
        card.addEventListener('click', () => openPlayer(ep));
        grid.appendChild(card);
    });
}

// Search Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = episodes.filter(ep => 
        ep.title.toLowerCase().includes(term) || 
        ep.episode.toString().includes(term)
    );
    renderGrid(filtered);
});

// Play Random wrapper
playRandomBtn.addEventListener('click', () => {
    if(episodes.length > 0) {
        const rand = episodes[Math.floor(Math.random() * episodes.length)];
        openPlayer(rand);
    }
});

// Open Custom Video Player
function openPlayer(episode) {
    if(episode.id.startsWith("mock")) {
        alert("This is a mock episode! Generate the real catalog to stream your drive videos.");
        return;
    }

    // Build the magical Google Drive API Stream URL
    const streamUrl = `https://www.googleapis.com/drive/v3/files/${episode.id}?alt=media&key=${config.GOOGLE_DRIVE_API_KEY}`;
    
    playingTitle.innerText = `Episode ${episode.episode} - ${episode.title}`;
    videoElement.src = streamUrl;
    
    playerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Stop background scrolling
    
    // Auto-play the video
    videoElement.play().catch(e => {
        console.log("Autoplay prevented:", e.message);
    });
}

// Close Video Player
playerClose.addEventListener('click', () => {
    closePlayer();
});

// Close player when clicking outside the video container
playerModal.addEventListener('click', (e) => {
    if (e.target === playerModal) {
        closePlayer();
    }
});

function closePlayer() {
    playerModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
    videoElement.pause();
    videoElement.currentTime = 0;
    videoElement.src = ""; // Stop buffering
}

// Initialize App
loadCatalog();
