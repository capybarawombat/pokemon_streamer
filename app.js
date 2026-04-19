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

        const url = `https://www.googleapis.com/drive/v3/files?q='${config.GOOGLE_DRIVE_FOLDER_ID}'+in+parents&fields=files(id,name,thumbnailLink)&orderBy=name&pageSize=100&key=${config.GOOGLE_DRIVE_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load catalog from Google Drive API');
        
        const data = await res.json();
        
        if(!data.files || data.files.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No videos found in this Google Drive folder. Check your folder ID and API rules.</p>`;
            return;
        }

        // Map live Google Drive data to our UI
        episodes = data.files.map((file, index) => {
            // Clean up the filename for a clean title!
            let cleanTitle = file.name.replace('.mp4', '').replace(/\[.*?\]\s*/g, '').replace('Pokémon - ', '').trim();
            
            // Try to extract episode number, otherwise fallback to list position
            const numMatch = cleanTitle.match(/^(\d+)\s*-?\s*(.*)$/);
            const epNum = numMatch ? parseInt(numMatch[1], 10) : (index + 1);
            if (numMatch) cleanTitle = numMatch[2].trim() || cleanTitle; // strip the number out

            return {
                id: file.id,
                title: cleanTitle,
                episode: epNum,
                thumbnail: file.thumbnailLink // Magical free Google Drive thumbnails!
            };
        });

        // Ensure sorted by episode number
        episodes.sort((a,b) => a.episode - b.episode);
        renderGrid(episodes);
    } catch (err) {
        console.error("Error loading automatically from Drive:", err);
        // Provide mock data if not configured yet
        episodes = [
            { id: "mock1", title: "Pokémon - I Choose You!", episode: 1 },
            { id: "mock2", title: "Pokémon Emergency!", episode: 2 },
            { id: "mock3", title: "Ash Catches a Pokémon", episode: 3 }
        ];
        renderGrid(episodes);
        
        // Show warning
        const warning = document.createElement('div');
        warning.style = "background: rgba(255,0,0,0.2); padding: 10px; margin-bottom: 20px; border-radius: 8px; border: 1px solid red;";
        warning.innerHTML = "<strong>Notice:</strong> Automatic Fetch failed. Did you paste your Folder ID and API Key into <code>app.js</code>? Showing UI examples only.";
        document.querySelector('.content-section').prepend(warning);
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
