let bands = [];
let currentPlaylist = [];
let currentIndex = 0;

let currentPage = 1;
const bandsPerPage = 20;

let sidebarCollapsed = true;
let currentBandIndex = 0;
let currentBand = null;
let currentAlbum = null;

// "tracks" | "related"
let currentPlaylistSource = "tracks";
let savedRelatedList = null;

let shuffleEnabled = false;
let originalPlaylistOrder = [];

let currentVideoSrc = null;
let trackVideo = null; 

/* ---------------------------------------------------------
   UTILITY
--------------------------------------------------------- */
async function fetchLines(url) {
  const res = await fetch(url);
  const text = await res.text();
  return text.split("\n").map(x => x.trim()).filter(x => x.length > 0);
}

function setSidebarWidth(px) {
  document.documentElement.style.setProperty("--sidebar-width", px + "px");
}

function resetVideo() {
  const mediaVideo = document.getElementById("album-video");
  mediaVideo.pause();
  mediaVideo.removeAttribute("src");
  mediaVideo.load();
  mediaVideo.classList.add("hidden");
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function isMobile() {
  return window.innerWidth <= 768;
}

/* ---------------------------------------------------------
   TABS
--------------------------------------------------------- */
function showTab(id) {
  const map = {
    "tracks": "tab-albums",
    "lyrics-sidebar": "tab-lyrics",
    "related": "tab-related"
  };

  // Reset tab button states
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  const btnId = map[id];
  if (btnId) document.getElementById(btnId)?.classList.add("active");

  // Reset tab content visibility
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");

  const t = currentPlaylist[currentIndex];
  const isVideo = t && t.file.toLowerCase().endsWith(".mp4");

  /* ---------------------------------------------------------
     LYRICS TAB
  --------------------------------------------------------- */
  if (id === "lyrics-sidebar" && isVideo) {
    loadLyricsForCurrentTrack();
    document.getElementById("lyrics-sidebar").classList.remove("hidden");

    if (isMobile()) {
      trackVideo.classList.add("hidden");
      trackVideo.style.display = "none";
      document.getElementById("album-cover-img").classList.remove("hidden");
    } else {
      albumVideo.classList.add("hidden");
      albumVideo.style.display = "none";
      document.getElementById("album-cover-img").classList.remove("hidden");
    }

    document.getElementById("lyrics-sidebar").scrollTop = 0;
    return;
  }

  /* ---------------------------------------------------------
     RELATED TAB — FIXED
     (mirror Tracks behavior)
  --------------------------------------------------------- */
  if (id === "related") {
    if (isVideo && currentPlaylistSource === "related") {
      // PLAYBACK MODE → show video
      if (isMobile()) {
        trackVideo.classList.remove("hidden");
        trackVideo.style.display = "block";
        trackVideo.style.visibility = "visible";
        document.getElementById("album-cover-img").classList.add("hidden");
      } else {
        albumVideo.classList.remove("hidden");
        albumVideo.style.display = "block";
        albumVideo.style.visibility = "visible";
        document.getElementById("album-cover-img").classList.add("hidden");
      }

      document.getElementById("related").scrollTop = 0;
      scrollVideoIntoView("related");
    } else {
      // BROWSING MODE → hide video
      if (isMobile()) {
        trackVideo.classList.add("hidden");
        trackVideo.style.display = "none";
        document.getElementById("album-cover-img").classList.remove("hidden");
      } else {
        albumVideo.classList.add("hidden");
        albumVideo.style.display = "none";
        document.getElementById("album-cover-img").classList.remove("hidden");
      }

      document.getElementById("related").scrollTop = 0;
    }

    return;
  }

  /* ---------------------------------------------------------
     TRACKS TAB (already working)
  --------------------------------------------------------- */
  if (id === "tracks" && isVideo) {
    if (!currentAlbum) {
      // browsing mode → hide video
      if (isMobile()) {
        trackVideo.classList.add("hidden");
        trackVideo.style.display = "none";
        document.getElementById("album-cover-img").classList.remove("hidden");
      } else {
        albumVideo.classList.add("hidden");
        albumVideo.style.display = "none";
        document.getElementById("album-cover-img").classList.remove("hidden");
      }
    } else {
      // playback mode → show video
      if (isMobile()) {
        trackVideo.classList.remove("hidden");
        trackVideo.style.display = "block";
        trackVideo.style.opacity = "1";
        trackVideo.style.pointerEvents = "auto";
        document.getElementById("album-cover-img").classList.add("hidden");
      } else {
        albumVideo.classList.remove("hidden");
        albumVideo.style.display = "block";
        albumVideo.style.opacity = "1";
        albumVideo.style.pointerEvents = "auto";
        document.getElementById("album-cover-img").classList.add("hidden");
      }

      document.getElementById("tracks").scrollTop = 0;
      document.getElementById("related").scrollTop = 0;
      scrollVideoIntoView();
    }
  }
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      if (!targetId) return;

      if (targetId === "related") {
        if (currentPlaylistSource === "related" && savedRelatedList) {
          renderRelatedList(savedRelatedList);
        } else {
          loadRelated();
        }
      }

      showTab(targetId);
    });
  });
}

/* ---------------------------------------------------------
   LOAD BANDS
--------------------------------------------------------- */
async function loadBands() {
  const res = await fetch("Setlist/Setlist.json");
  const data = await res.json();
  bands = data.bands;

  document.body.classList.add("home");
  renderHomeCarousel();
  renderMainPagination();
  initSidebar();
  setSidebarWidth(0);
}

/* ---------------------------------------------------------
   MAIN PAGE CAROUSEL + PAGINATION
--------------------------------------------------------- */
function renderHomeCarousel() {
  const home = document.getElementById("home-carousel");
  home.innerHTML = "";

  const { pageBands } = getPageSlice(currentPage);

  pageBands.forEach((band, index) => {
    const div = document.createElement("div");
    div.className = "carousel-item";
    div.innerHTML = `<img src="${band.cover}" class="carousel-cover">`;
    div.addEventListener("click", () => enterAlbumMode((currentPage - 1) * bandsPerPage + index));
    home.appendChild(div);
  });

  document.getElementById("virtual-page").classList.add("hidden");
  document.getElementById("player-footer").classList.add("hidden");
}

function renderMainPagination() {
  const totalPages = Math.ceil(bands.length / bandsPerPage);
  const pag = document.getElementById("main-pagination") || createMainPagination();

  pag.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");

    btn.addEventListener("click", () => {
      currentPage = i;
      renderHomeCarousel();
      renderMainPagination();
    });

    pag.appendChild(btn);
  }
}

function createMainPagination() {
  const pag = document.createElement("div");
  pag.id = "main-pagination";
  document.getElementById("main-area").appendChild(pag);
  return pag;
}

/* ---------------------------------------------------------
   ENTER ALBUM MODE
--------------------------------------------------------- */
function enterAlbumMode(bandIndex) {
  currentBandIndex = bandIndex;
  currentBand = bands[bandIndex];

  document.body.classList.remove("home");
  document.getElementById("home-carousel").classList.add("hidden");
  document.getElementById("main-pagination").classList.add("hidden");
  document.getElementById("virtual-page").classList.remove("hidden");

  sidebarCollapsed = true;
  setSidebarWidth(70);
  renderSidebarCollapsed();
  openBand(currentBand);
}

/* ---------------------------------------------------------
   SIDEBAR INIT + CLICK BEHAVIOR
--------------------------------------------------------- */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.add("collapsed");

  sidebar.addEventListener("click", (e) => {
    const item = e.target.closest(".sidebar-item");
    const pageBtn = e.target.closest(".sidebar-pagination button");
    const pagination = e.target.closest(".sidebar-pagination");

    if (item && item.dataset.index) {
      onBandClick(parseInt(item.dataset.index, 10));
      return;
    }

    if (pageBtn && pageBtn.dataset.page) {
      onSidebarPageClick(parseInt(pageBtn.dataset.page, 10));
      e.stopPropagation();
      return;
    }

    if (pagination) return;

    toggleSidebar();
  });
}

function toggleSidebar() {
  if (!currentBand) return;

  sidebarCollapsed = !sidebarCollapsed;

  if (sidebarCollapsed) {
    setSidebarWidth(70);
    renderSidebarCollapsed();
  } else {
    setSidebarWidth(320);
    renderSidebarExpanded();
  }
}

/* ---------------------------------------------------------
   SIDEBAR RENDERING
--------------------------------------------------------- */
function getPageSlice(page) {
  const start = (page - 1) * bandsPerPage;
  const end = start + bandsPerPage;
  return { start, end, pageBands: bands.slice(start, end) };
}

function getCurrentPageFromBandIndex() {
  return Math.floor(currentBandIndex / bandsPerPage) + 1;
}

function renderSidebarCollapsed() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("expanded");
  sidebar.classList.add("collapsed");
  sidebar.innerHTML = "";

  currentPage = getCurrentPageFromBandIndex();
  const { start, pageBands } = getPageSlice(currentPage);

  pageBands.forEach((band, i) => {
    const div = document.createElement("div");
    div.className = "sidebar-item";
    div.dataset.index = start + i;
    div.innerHTML = `<img src="${band.cover}" class="sidebar-thumb">`;
    sidebar.appendChild(div);
  });
}

function renderSidebarExpanded() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("collapsed");
  sidebar.classList.add("expanded");
  sidebar.innerHTML = "";

  const { start, pageBands } = getPageSlice(currentPage);

  pageBands.forEach((band, i) => {
    const div = document.createElement("div");
    div.className = "sidebar-item";
    div.dataset.index = start + i;
    div.innerHTML = `<img src="${band.cover}" class="sidebar-cover">`;
    sidebar.appendChild(div);
  });

  renderSidebarPagination(sidebar);
}

function renderSidebarPagination(sidebar) {
  const totalPages = Math.ceil(bands.length / bandsPerPage);
  if (totalPages <= 1) return;

  const pag = document.createElement("div");
  pag.className = "sidebar-pagination";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.dataset.page = i;
    if (i === currentPage) btn.classList.add("active");
    pag.appendChild(btn);
  }

  sidebar.appendChild(pag);
}

function onSidebarPageClick(page) {
  currentPage = page;
  renderSidebarExpanded();

  const firstIndex = (page - 1) * bandsPerPage;
  currentBandIndex = firstIndex;
  currentBand = bands[firstIndex];
  openBand(currentBand);
}

/* ---------------------------------------------------------
   BAND / ALBUM VIEW
--------------------------------------------------------- */
function onBandClick(globalIndex) {
  currentBandIndex = globalIndex;
  currentBand = bands[globalIndex];

  sidebarCollapsed = true;
  setSidebarWidth(70);
  renderSidebarCollapsed();
  openBand(currentBand);
}
function openBand(band) {
  const vp = document.getElementById("virtual-page");
  vp.classList.remove("hidden");

  const mediaImg = document.getElementById("album-cover-img");
  const mediaVideo = document.getElementById("album-video");

  // ✅ Reset album state so showTab knows we’re browsing albums
  currentAlbum = null;

  if (isMobile() && currentPlaylist.length && currentPlaylist[currentIndex].file.toLowerCase().endsWith(".mp4")) {
    trackVideo.classList.add("hidden");
  } else {
    mediaVideo.classList.add("hidden");
    mediaImg.classList.remove("hidden");
    mediaImg.src = band.cover;
  }

  const tracksDiv = document.getElementById("tracks");
  tracksDiv.innerHTML = "";

  band.albums.forEach(album => {
    const div = document.createElement("div");
    div.className = "album-item";
    div.innerHTML = `
      <img src="${album.cover}">
      <span>${album.title}</span>
    `;
    div.addEventListener("click", () => openAlbum(band.name, album));
    tracksDiv.appendChild(div);
  });

  document.getElementById("lyrics-sidebar").innerHTML = "";
  document.getElementById("related").innerHTML = "";

  const tabAlbums = document.getElementById("tab-albums");
  if (tabAlbums) tabAlbums.textContent = "Albums";

  showTab("tracks");
}

// options: { preserveMedia?: boolean, preserveVideo?: boolean }
async function openAlbum(bandName, album, options = {}) {
  const preserveMedia = options.preserveMedia === true;

  const bandObj = bands.find(b => b.name === bandName) || null;
  if (bandObj) {
    currentBand = bandObj;
    currentBandIndex = bands.indexOf(bandObj);
  }

  currentAlbum = album;

  const vp = document.getElementById("virtual-page");
  vp.classList.remove("hidden");

  const mediaImg = document.getElementById("album-cover-img");
  const mediaVideo = document.getElementById("album-video");

  if (!preserveMedia) {
    resetVideo();
    mediaImg.classList.remove("hidden");
    mediaImg.src = album.cover;
  } else {
    if (options.preserveVideo) {
      mediaImg.classList.add("hidden");
      mediaVideo.classList.remove("hidden");
    } else {
      mediaVideo.classList.add("hidden");
      mediaImg.classList.remove("hidden");
      mediaImg.src = album.cover;
    }
  }

  const albumPath = album.path;
  const albumCover = album.cover;

  let tracks = [];
  try {
    tracks = await fetchLines(albumPath + "setlist.txt");
  } catch (e1) {
    tracks = [];
  }

  const tracksDiv = document.getElementById("tracks");
  tracksDiv.innerHTML = "";

  tracks.forEach(file => {
    const base = file.replace(/\.(mp3|mp4|flac)$/i, "");
    const isVideoTrack = file.toLowerCase().endsWith(".mp4");
    const videoSrc = albumPath + file;
    const trackThumb = `${albumPath}${base}.jpg`;
    const thumb = isVideoTrack ? trackThumb : albumCover;

    const div = document.createElement("div");
    div.className = "track-item";
    div.dataset.file = file;
    div.dataset.path = albumPath;
    div.innerHTML = `
      <img src="${thumb}">
      <span>${base}</span>
    `;

    div.addEventListener("click", () => {
      const clickedIndex = tracks.indexOf(file);
      const isSameTrack = (currentPlaylistSource === "tracks" && currentIndex === clickedIndex);

      currentPlaylist = tracks.map(f => ({
        band: bandName,
        album: album.title,
        path: albumPath,
        file: f,
        albumCover: albumCover
      }));

      currentIndex = clickedIndex;
      currentPlaylistSource = "tracks";

      /* ============================================================
         MOBILE LOGIC
         ============================================================ */
      if (isMobile()) {
        const footerVideo = document.getElementById("album-video");
        const footerAudio = document.getElementById("audio-player");

        // 1. STOP EVERYTHING
        footerVideo.pause();
        footerVideo.removeAttribute("src");
        footerVideo.classList.add("hidden");

        footerAudio.pause();
        footerAudio.removeAttribute("src");
        footerAudio.classList.add("hidden");

        trackVideo.pause();
        trackVideo.src = "";

        // 2. FOOTER ALWAYS VISIBLE + UPDATED
        updateFooterUI(albumPath, file, albumCover, bandName);
        document.getElementById("player-footer").classList.remove("hidden");

        // Ensure highlight persists on mobile
        highlightCurrentTrackGlobal();

        // 3. VIDEO TRACK
        if (isVideoTrack) {
          if (isSameTrack && currentVideoSrc === videoSrc) {
            showTrackVideo(videoSrc);
            showTab("tracks");
            scrollVideoIntoView();
            // Also scroll the virtual page to top
            vp.scrollTop = 0;
            vp.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }

          currentVideoSrc = videoSrc;
          showTrackVideo(videoSrc);
          showTab("tracks");
          scrollVideoIntoView();
          // Also scroll the virtual page to top
          vp.scrollTop = 0;
          vp.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        // 4. AUDIO TRACK
        hideTrackVideo();
        playTrack(albumPath, file, albumCover, bandName);
        showTab("tracks");
        return;
      }

      /* ============================================================
         DESKTOP LOGIC
         ============================================================ */
      if (isVideoTrack) {
        hideTrackVideo();
      }

      playTrack(albumPath, file, albumCover, bandName);
      highlightCurrentTrackGlobal();
      showTab("tracks");

      // For desktop video, also scroll both video and virtual page
      if (isVideoTrack) {
        scrollVideoIntoView();
        vp.scrollTop = 0;
        vp.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    tracksDiv.appendChild(div);
  });

  sidebarCollapsed = true;
  setSidebarWidth(70);
  renderSidebarCollapsed();

  const tabAlbums = document.getElementById("tab-albums");
  if (tabAlbums) tabAlbums.textContent = "Tracks";

  showTab("tracks");
}



/* ---------------------------------------------------------
   HIGHLIGHT CURRENT TRACK
--------------------------------------------------------- */
function highlightCurrentTrackGlobal() {
  document.querySelectorAll(".track-item.playing, .related-item.playing")
    .forEach(el => el.classList.remove("playing"));

  if (!currentPlaylist.length) return;

  const t = currentPlaylist[currentIndex];
  const selector = `[data-file="${CSS.escape(t.file)}"][data-path="${CSS.escape(t.path)}"]`;

  if (currentPlaylistSource === "tracks") {
    document.querySelectorAll(".track-item" + selector).forEach(el => {
      el.classList.add("playing");
    });
  }

  if (currentPlaylistSource === "related") {
    document.querySelectorAll(".related-item" + selector).forEach(el => {
      el.classList.add("playing");
    });
  }
}

function loadLyricsForCurrentTrack() {
  if (!currentPlaylist.length) return;

  const t = currentPlaylist[currentIndex];
  const base = t.file.replace(/\.(mp3|mp4|flac)$/i, "");
  const lyricsPath = `${t.path}${base}.txt`;

  fetch(lyricsPath)
    .then(r => r.text())
    .then(text => {
      document.getElementById("lyrics-sidebar").textContent = text;
    })
    .catch(() => {
      document.getElementById("lyrics-sidebar").textContent = "No lyrics available.";
    });
}

/* ---------------------------------------------------------
   PLAYBACK
--------------------------------------------------------- */
function stopAllPlayers() {
  const audio = document.getElementById("audio-player");
  const video = document.getElementById("album-video");

  audio.pause();
  audio.removeAttribute("src");
  audio.classList.add("hidden");

  video.pause();
  video.removeAttribute("src");
  video.classList.add("hidden");

  trackVideo.pause();
  trackVideo.removeAttribute("src");
}

function getActivePlayer() {
  if (!currentPlaylist.length) return null;
  const t = currentPlaylist[currentIndex];
  const isVideo = t.file.toLowerCase().endsWith(".mp4");

  if (isMobile() && isVideo) {
    return trackVideo; // ✅ injected mobile video
  }
  if (isVideo) {
    return document.getElementById("album-video");
  }
  return document.getElementById("audio-player");
}

function resetDesktopVideos() {
  const albumVideo = document.getElementById("album-video");
  const relatedVideoWrapper = document.getElementById("related-video");

  if (albumVideo) {
    albumVideo.pause();
    albumVideo.removeAttribute("src");
    albumVideo.load(); // ✅ force unload
    albumVideo.classList.add("hidden");
    albumVideo.style.display = "none";
    albumVideo.style.visibility = "hidden";
    // restore cover
    const mediaImg = document.getElementById("album-cover-img");
    if (mediaImg) mediaImg.classList.remove("hidden");
  }

  if (relatedVideoWrapper) {
    const rv = relatedVideoWrapper.querySelector("video");
    if (rv) {
      rv.pause();
      rv.removeAttribute("src");
      rv.load(); // ✅ force unload
      rv.classList.add("hidden");
      rv.style.display = "none";
      rv.style.visibility = "hidden";
    }
  }
}

function playTrack(albumPath, file, albumCover, bandName) {
  const audio = document.getElementById("audio-player");
  const video = document.getElementById("album-video");
  const footer = document.getElementById("player-footer");
  const playPauseBtn = document.getElementById("play-pause");
  const mediaImg = document.getElementById("album-cover-img");

  const isVideo = file.toLowerCase().endsWith(".mp4");

  // Footer always visible + updated
  footer.classList.remove("hidden");
  updateFooterUI(albumPath, file, albumCover, bandName);

  // Always unmute both players
  audio.muted = false;
  video.muted = false;
  trackVideo.muted = false;

  // Always load lyrics for the current track
  loadLyricsForCurrentTrack();
  document.getElementById("lyrics-sidebar").scrollTop = 0;

  /* ============================================================
     MOBILE VIDEO → injected player only
     ============================================================ */
  if (isMobile() && isVideo) {
    audio.pause();
    audio.classList.add("hidden");
    audio.removeAttribute("src");

    video.pause();
    video.classList.add("hidden");
    video.removeAttribute("src");

    // show mobile video
    trackVideo.classList.remove("hidden");
    trackVideo.style.display = "block";
    trackVideo.style.visibility = "visible";

    trackVideo.src = albumPath + file;
    trackVideo.muted = false;
    trackVideo.play()
      .then(() => playPauseBtn.classList.add("playing"))
      .catch(() => {});

    mediaImg.classList.add("hidden");
    scrollVideoIntoView();

    playPauseBtn.onclick = () => {
      if (trackVideo.paused) {
        trackVideo.play();
        playPauseBtn.classList.add("playing");
      } else {
        trackVideo.pause();
        playPauseBtn.classList.remove("playing");
      }
    };

    trackVideo.addEventListener("play", () => playPauseBtn.classList.add("playing"));
    trackVideo.addEventListener("pause", () => playPauseBtn.classList.remove("playing"));
    trackVideo.addEventListener("ended", () => {
      trackVideo.style.display = "none";
      trackVideo.style.visibility = "hidden";
      mediaImg.classList.remove("hidden");
      playPauseBtn.classList.remove("playing");
    });

    highlightCurrentTrackGlobal();
    return;
  }

  /* ============================================================
     MOBILE AUDIO MODE
     ============================================================ */
  if (isMobile() && !isVideo) {
    mediaImg.classList.remove("hidden");
    mediaImg.src = albumCover;

    audio.classList.remove("hidden");
    audio.src = albumPath + file;
    audio.muted = false;

    audio.play()
      .then(() => playPauseBtn.classList.add("playing"))
      .catch(() => {});

    video.style.display = "none";
    video.style.visibility = "hidden";

    highlightCurrentTrackGlobal();
    return;
  }

  /* ============================================================
     DESKTOP VIDEO OR AUDIO
     ============================================================ */

  // ALWAYS STOP AUDIO FIRST (fixes your bug)
  audio.pause();
  audio.removeAttribute("src");
  audio.classList.add("hidden");

  // ALWAYS STOP VIDEO FIRST
  video.pause();
  video.removeAttribute("src");
  video.classList.add("hidden");

  // Reset desktop video contexts
  resetDesktopVideos();

  /* -------------------------
     DESKTOP VIDEO MODE
     ------------------------- */
  if (isVideo) {
    mediaImg.classList.add("hidden");

    video.classList.remove("hidden");
    video.style.display = "block";
    video.style.visibility = "visible";

    video.src = albumPath + file;
    video.muted = false;

    video.play()
      .then(() => playPauseBtn.classList.add("playing"))
      .catch(() => {});

    video.addEventListener("ended", () => {
      video.style.display = "none";
      video.style.visibility = "hidden";
      mediaImg.classList.remove("hidden");
      playPauseBtn.classList.remove("playing");
    });

    highlightCurrentTrackGlobal();
    return;
  }

  /* -------------------------
     DESKTOP AUDIO MODE
     ------------------------- */
  mediaImg.classList.remove("hidden");
  mediaImg.src = albumCover;

  audio.classList.remove("hidden");
  audio.src = albumPath + file;
  audio.muted = false;

  audio.play()
    .then(() => playPauseBtn.classList.add("playing"))
    .catch(() => {});

  document.getElementById("lyrics-sidebar").classList.remove("hidden");
  document.getElementById("lyrics-sidebar").scrollTop = 0;

  video.style.display = "none";
  video.style.visibility = "hidden";

  highlightCurrentTrackGlobal();
}

/* ---------------------------------------------------------
   FOOTER UI UPDATE
--------------------------------------------------------- */
function updateFooterUI(path, file, albumCover, bandName) {
  const base = file.replace(/\.(mp3|mp4|flac)$/i, "");
  const isVideo = file.toLowerCase().endsWith(".mp4");
  const trackThumb = `${path}${base}.jpg`;
  const thumb = isVideo ? trackThumb : albumCover;

  document.getElementById("footer-thumb").src = thumb;
  document.getElementById("footer-title").textContent = base;
  document.getElementById("footer-artist").textContent = bandName;

  const timeDisplay = document.getElementById("time-display");
  if (timeDisplay) timeDisplay.textContent = "0:00 / 0:00";

  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = "0%";
}

/* ---------------------------------------------------------
   FOOTER TITLE / ARTIST CLICK
--------------------------------------------------------- */
function handleFooterJump() {
  if (!currentPlaylist.length) return;

  const t = currentPlaylist[currentIndex];
  const band = bands.find(b => b.name === t.band);
  if (!band) return;

  const album = band.albums.find(a => a.title === t.album);
  if (!album) return;

  const isVideo = t.file.toLowerCase().endsWith(".mp4");

  // Always reopen album with media preserved
  openAlbum(t.band, album, { preserveMedia: true, preserveVideo: isVideo });

  setTimeout(() => {
    highlightCurrentTrackGlobal();

    if (currentPlaylistSource === "tracks") {
      showTab("tracks");
    } else {
      if (savedRelatedList) renderRelatedList(savedRelatedList);
      showTab("related");
    }

    // ✅ Restore video and scroll when coming back from footer
    if (isVideo) {
      if (isMobile()) {
        trackVideo.classList.remove("hidden");
        trackVideo.style.opacity = "1";
        trackVideo.style.pointerEvents = "auto";
        document.getElementById("album-cover-img").classList.add("hidden");
      } else {
        albumVideo.classList.remove("hidden");
        albumVideo.style.opacity = "1";
        albumVideo.style.pointerEvents = "auto";
        document.getElementById("album-cover-img").classList.add("hidden");
      }

      // Scroll the virtual page back to top
      const vp = document.getElementById("virtual-page");
      vp.scrollTop = 0;
      vp.scrollIntoView({ behavior: "smooth", block: "start" });

      // Reset scroll positions of tab containers
      const scrollArea1 = document.getElementById("tracks");
      const scrollArea2 = document.getElementById("related");
      if (scrollArea1) scrollArea1.scrollTop = 0;
      if (scrollArea2) scrollArea2.scrollTop = 0;

      // Ensure video itself is scrolled into view
      scrollVideoIntoView();
    }
  }, 50);
}

document.getElementById("footer-artist").addEventListener("click", handleFooterJump);

/* ---------------------------------------------------------
   RELATED TAB
--------------------------------------------------------- */
async function loadRelated() {
  try {
    const relatedDiv = document.getElementById("related");
    relatedDiv.innerHTML = "";

    let genreSourceBand = null;

    if (currentPlaylist.length > 0) {
      const t = currentPlaylist[currentIndex];
      genreSourceBand = bands.find(b => b.name === t.band) || null;
    }

    if (!genreSourceBand && currentBand) {
      genreSourceBand = currentBand;
    }

    if (!genreSourceBand) return;

    const targetGenre = genreSourceBand.genre || null;
    let allTracks = [];

    const genreBands = targetGenre
      ? bands.filter(b => b.genre === targetGenre)
      : bands.slice();

    for (const band of genreBands) {
      for (const album of band.albums) {
        let files = [];
        try {
          files = await fetchLines(album.path + "setlist.txt");
        } catch (e1) {
          files = [];
        }

        files.forEach(f => {
          allTracks.push({
            band: band.name,
            album: album.title,
            path: album.path,
            file: f,
            albumCover: album.cover
          });
        });
      }
    }

    if (!allTracks.length) return;

    savedRelatedList = allTracks.sort(() => Math.random() - 0.5).slice(0, 20);

    renderRelatedList(savedRelatedList);

    highlightCurrentTrackGlobal();

  } catch (err) {
    console.error("loadRelated failed:", err);
  }
}
function renderRelatedList(list) {
  const relatedDiv = document.getElementById("related");
  relatedDiv.innerHTML = "";

  list.forEach((track, index) => {
    const base = track.file.replace(/\.(mp3|mp4|flac)$/i, "");
    const isVideo = track.file.toLowerCase().endsWith(".mp4");
    const trackThumb = `${track.path}${base}.jpg`;
    const thumb = isVideo ? trackThumb : track.albumCover;

    const div = document.createElement("div");
    div.className = "related-item";
    div.dataset.file = track.file;
    div.dataset.path = track.path;
    div.innerHTML = `
      <img src="${thumb}">
      <span>${base}</span>
    `;

    div.addEventListener("click", () => {
      currentPlaylist = list;
      currentIndex = index;
      currentPlaylistSource = "related";

      const isVideoTrack = track.file.toLowerCase().endsWith(".mp4");
      const videoSrc = track.path + track.file;

      if (isMobile()) {
        // stop footer players
        const footerVideo = document.getElementById("album-video");
        const footerAudio = document.getElementById("audio-player");

        footerVideo.pause();
        footerVideo.removeAttribute("src");
        footerVideo.classList.add("hidden");

        footerAudio.pause();
        footerAudio.removeAttribute("src");
        footerAudio.classList.add("hidden");

        trackVideo.pause();
        trackVideo.src = "";

        updateFooterUI(track.path, track.file, track.albumCover, track.band);
        document.getElementById("player-footer").classList.remove("hidden");

        if (isVideoTrack) {
          currentVideoSrc = videoSrc;
          showTrackVideo(videoSrc);
          showTab("related");
          scrollVideoIntoView();
        } else {
          hideTrackVideo();
          playTrack(track.path, track.file, track.albumCover, track.band);
          showTab("related");
        }
      } else {
        if (isVideoTrack) {
          hideTrackVideo();
        }
        playTrack(track.path, track.file, track.albumCover, track.band);
        showTab("related");
      }

      highlightCurrentTrackGlobal();
    });

    relatedDiv.appendChild(div);
  });

  highlightCurrentTrackGlobal();
}

/* ---------------------------------------------------------


/* ---------------------------------------------------------
   AUTO-NEXT
--------------------------------------------------------- */
function setupAutoNext() {
  const audio = document.getElementById("audio-player");
  const video = document.getElementById("album-video");

  audio.addEventListener("ended", nextTrack);
  video.addEventListener("ended", nextTrack);
  trackVideo.addEventListener("ended", nextTrack);
}

function nextTrack() {
  if (currentPlaylist.length === 0) return;

  stopAllPlayers();

  if (shuffleEnabled) {
    let newIndex = currentIndex;
    while (newIndex === currentIndex && currentPlaylist.length > 1) {
      newIndex = Math.floor(Math.random() * currentPlaylist.length);
    }
    currentIndex = newIndex;
  } else {
    currentIndex++;
    if (currentIndex >= currentPlaylist.length) currentIndex = 0;
  }

  const t = currentPlaylist[currentIndex];
  const isVideo = t.file.toLowerCase().endsWith(".mp4");
  const videoSrc = t.path + t.file;

  if (isMobile()) {
    updateFooterUI(t.path, t.file, t.albumCover, t.band);
    document.getElementById("player-footer").classList.remove("hidden");

    if (isVideo) {
      hideTrackVideo();
      trackVideo.pause();
      trackVideo.src = "";

      currentVideoSrc = videoSrc;
      showTrackVideo(videoSrc);
      scrollVideoIntoView();
    } else {
      hideTrackVideo();
      trackVideo.pause();
      trackVideo.src = "";

      playTrack(t.path, t.file, t.albumCover, t.band);
    }
  } else {
    playTrack(t.path, t.file, t.albumCover, t.band);
  }

  highlightCurrentTrackGlobal();
}

/* ---------------------------------------------------------
   FOOTER CONTROLS
--------------------------------------------------------- */
function setupControls() {
  const audio = document.getElementById("audio-player");
  const video = document.getElementById("album-video");
  const playPauseBtn = document.getElementById("play-pause");
  const timeDisplay = document.getElementById("time-display");
  const bar = document.getElementById("progress-bar");
  const container = document.getElementById("progress-container");
  const volBtn = document.getElementById("volume-btn");
  const volSlider = document.getElementById("volume-slider");


playPauseBtn.addEventListener("click", () => {
  const player = getActivePlayer();
  if (!player) return;

  if (player.paused) {
    player.play().then(() => playPauseBtn.classList.add("playing"));
  } else {
    player.pause();
    playPauseBtn.classList.remove("playing");
  }
});


  function updateUI(player) {
    if (player.duration > 0) {
      bar.style.width = (player.currentTime / player.duration) * 100 + "%";
      timeDisplay.textContent =
        `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
    }
  }

  audio.addEventListener("timeupdate", () => updateUI(audio));
  video.addEventListener("timeupdate", () => updateUI(video));
  trackVideo.addEventListener("timeupdate", () => updateUI(trackVideo));

  container.addEventListener("click", (e) => {
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    const player = getActivePlayer();
    if (player.duration > 0) {
      player.currentTime = percent * player.duration;
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    nextTrack();
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentPlaylist.length === 0) return;

    stopAllPlayers();

    currentIndex--;
    if (currentIndex < 0) currentIndex = currentPlaylist.length - 1;

    const t = currentPlaylist[currentIndex];
    const isVideo = t.file.toLowerCase().endsWith(".mp4");
    const videoSrc = t.path + t.file;

    if (isMobile()) {
      updateFooterUI(t.path, t.file, t.albumCover, t.band);
      document.getElementById("player-footer").classList.remove("hidden");

      if (isVideo) {
        hideTrackVideo();
        trackVideo.pause();
        trackVideo.src = "";

        currentVideoSrc = videoSrc;
        showTrackVideo(videoSrc);
        scrollVideoIntoView();
      } else {
        hideTrackVideo();
        trackVideo.pause();
        trackVideo.src = "";

        playTrack(t.path, t.file, t.albumCover, t.band);
      }
    } else {
      playTrack(t.path, t.file, t.albumCover, t.band);
    }

    highlightCurrentTrackGlobal();
  });

  volBtn.addEventListener("click", () => {
    volSlider.classList.toggle("hidden");
  });

  volSlider.addEventListener("input", () => {
    const v = volSlider.value;

    audio.volume = v;
    video.volume = v;
    trackVideo.volume = v;

    volSlider.style.setProperty("--vol-fill", (v * 100) + "%");
  });

  document.getElementById("repeat-btn").addEventListener("click", () => {
    const repeatBtn = document.getElementById("repeat-btn");
    const shuffleBtn = document.getElementById("shuffle-btn");

    const repeatActive = audio.loop || video.loop || trackVideo.loop;

    if (!repeatActive) {
      audio.loop = true;
      video.loop = true;
      trackVideo.loop = true;

      repeatBtn.classList.add("active");

      shuffleEnabled = false;
      shuffleBtn.classList.remove("active");

    } else {
      audio.loop = false;
      video.loop = false;
      trackVideo.loop = false;

      repeatBtn.classList.remove("active");
    }
  });

  document.getElementById("shuffle-btn").addEventListener("click", () => {
    const shuffleBtn = document.getElementById("shuffle-btn");
    const repeatBtn = document.getElementById("repeat-btn");

    if (!shuffleEnabled) {
      shuffleEnabled = true;
      shuffleBtn.classList.add("active");

      audio.loop = false;
      video.loop = false;
      trackVideo.loop = false;
      repeatBtn.classList.remove("active");

      originalPlaylistOrder = [...currentPlaylist];

      const currentTrack = currentPlaylist[currentIndex];
      const remaining = currentPlaylist.filter((_, i) => i !== currentIndex);

      const shuffled = remaining.sort(() => Math.random() - 0.5);

      currentPlaylist = [currentTrack, ...shuffled];
      currentIndex = 0;

      highlightCurrentTrackGlobal();

    } else {
      shuffleEnabled = false;
      shuffleBtn.classList.remove("active");

      if (originalPlaylistOrder.length > 0) {
        const currentFile = currentPlaylist[currentIndex]?.file;

        currentPlaylist = [...originalPlaylistOrder];

        if (currentFile) {
          currentIndex = currentPlaylist.findIndex(t => t.file === currentFile);
          if (currentIndex < 0) currentIndex = 0;
        } else {
          currentIndex = 0;
        }

        highlightCurrentTrackGlobal();
      }
    }
  });

  trackVideo.addEventListener("play", () => {
    playPauseBtn.classList.add("playing");
  });

  trackVideo.addEventListener("pause", () => {
    playPauseBtn.classList.remove("playing");
  });
}

/* =========================================================
   VIDEO PLAYER INJECTION + LOGIC (MOBILE)
========================================================= */

const tabContainer = document.querySelector(".tab-container");

const videoWrapper = document.createElement("div");
videoWrapper.id = "track-video-wrapper";
videoWrapper.style.display = "none";
videoWrapper.style.position = "relative";
videoWrapper.style.width = "100%";
videoWrapper.style.borderRadius = "12px";
videoWrapper.style.overflow = "hidden";
videoWrapper.style.background = "#000";
videoWrapper.style.marginBottom = "8px";

trackVideo = document.createElement("video");
trackVideo.id = "track-video";
trackVideo.controls = false;
trackVideo.style.width = "100%";
trackVideo.style.height = "auto";
trackVideo.style.display = "block";
trackVideo.playsInline = true;
trackVideo.setAttribute("controlsList", "nodownload");

const closeBtn = document.createElement("button");
closeBtn.innerText = "✕";
closeBtn.style.position = "absolute";
closeBtn.style.top = "10px";
closeBtn.style.right = "10px";
closeBtn.style.zIndex = "20";
closeBtn.style.background = "rgba(0,0,0,0.6)";
closeBtn.style.color = "#fff";
closeBtn.style.border = "none";
closeBtn.style.padding = "6px 10px";
closeBtn.style.borderRadius = "6px";
closeBtn.style.fontSize = "16px";
closeBtn.style.cursor = "pointer";

const fullscreenBtn = document.createElement("button");
fullscreenBtn.innerText = "⛶";
fullscreenBtn.style.position = "absolute";
fullscreenBtn.style.bottom = "10px";
fullscreenBtn.style.right = "10px";
fullscreenBtn.style.zIndex = "20";
fullscreenBtn.style.background = "rgba(0,0,0,0.6)";
fullscreenBtn.style.color = "#fff";
fullscreenBtn.style.border = "none";
fullscreenBtn.style.padding = "6px 10px";
fullscreenBtn.style.borderRadius = "6px";
fullscreenBtn.style.fontSize = "16px";
fullscreenBtn.style.cursor = "pointer";

videoWrapper.appendChild(trackVideo);
videoWrapper.appendChild(closeBtn);
videoWrapper.appendChild(fullscreenBtn);

if (tabContainer) {
  tabContainer.prepend(videoWrapper);
}

videoWrapper.style.pointerEvents = "none";
trackVideo.style.pointerEvents = "auto";
closeBtn.style.pointerEvents = "auto";
fullscreenBtn.style.pointerEvents = "auto";
function showTrackVideo(src) {
  if (!src) return;

  currentVideoSrc = src;

  videoWrapper.style.display = "block";
  videoWrapper.classList.remove("hidden");

  trackVideo.src = src;
  trackVideo.style.display = "block";
  trackVideo.classList.remove("hidden");

  trackVideo.controls = true;
  trackVideo.muted = false;

  trackVideo.play().catch(err => console.warn("Video play failed:", err));
}

function hideTrackVideo() {
  videoWrapper.style.display = "none";
  trackVideo.pause();
  trackVideo.src = "";
}
function scrollVideoIntoView(targetTabId = "tracks") {
  const vp = document.getElementById("virtual-page");
  if (vp) vp.scrollTop = 0;

  const targetTab = document.getElementById(targetTabId);
  if (targetTab) {
    targetTab.scrollTop = 0;
  }

  // Always scroll the wrapper itself into view
  if (videoWrapper) {
    videoWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

closeBtn.addEventListener("click", () => {
  hideTrackVideo();
});

fullscreenBtn.addEventListener("click", () => {
  trackVideo.controls = true;

  if (trackVideo.requestFullscreen) {
    trackVideo.requestFullscreen();
  } else if (trackVideo.webkitRequestFullscreen) {
    trackVideo.webkitRequestFullscreen();
  }
});

function isFullscreen() {
  return (
    document.fullscreenElement === trackVideo ||
    document.webkitFullscreenElement === trackVideo
  );
}

trackVideo.addEventListener("fullscreenchange", () => {
  if (isFullscreen()) {
    trackVideo.controls = true;
    trackVideo.setAttribute("controlsList", "nodownload");
  } else {
    trackVideo.controls = false;
    scrollVideoIntoView();
  }
});

trackVideo.addEventListener("webkitfullscreenchange", () => {
  if (isFullscreen()) {
    trackVideo.controls = true;
    trackVideo.setAttribute("controlsList", "nodownload");
  } else {
    trackVideo.controls = false;
    scrollVideoIntoView();
  }
});

trackVideo.addEventListener("ended", nextTrack);

trackVideo.addEventListener("timeupdate", () => {
  const bar = document.getElementById("progress-bar");
  const timeDisplay = document.getElementById("time-display");

  if (trackVideo.duration > 0) {
    bar.style.width = (trackVideo.currentTime / trackVideo.duration) * 100 + "%";
    timeDisplay.textContent =
      `${formatTime(trackVideo.currentTime)} / ${formatTime(trackVideo.duration)}`;
  }
});


document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.tab;

    if (targetId === "lyrics") {
      // Hide video visually but keep playback running
      videoWrapper.style.display = "none";
      showLyrics(currentPlaylist[currentIndex].lyrics || "No lyrics available");
    } else if (["albums", "bands"].includes(targetId)) {
      // Full stop + clear when leaving player context
      hideTrackVideo();
    } else if (["tracks", "related"].includes(targetId)) {
      // Show video again when returning to player context
      videoWrapper.style.display = "block";
    }
  });
});

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadBands();
  setupTabs();
  setupControls();
  setupAutoNext();
});
