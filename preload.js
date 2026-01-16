const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('videoApp', {
  init: async function () {
    // Two container divs
    const containerA = document.getElementById('containerA');
    const containerB = document.getElementById('containerB');

    const hintOverlay = document.getElementById('hint');
    const debugOverlay = document.getElementById('debugOverlay');
    const toast = document.getElementById('toast');

    if (!containerA || !containerB) {
      console.error('Missing containerA or containerB');
      return;
    }

    // We'll treat containerA as current, containerB as next.
    let currentContainer = containerA;
    let nextContainer = containerB;

    // Global state
    let debugVisible = false;
    let hintVisible = false;
    let isMuted = false;
    let alwaysOnTopEnabled = false;
    let modes = [];  // e.g. ["normal", "women", "f1", "pictures", ...]
    let currentModeIndex = 0;
    let files = [];
    let currentIndex = 0;
    let nextFileIndex = 0;
    let nextPreloaded = false;
    let preloadedFilePath = '';

    // Debug info
    let currentFolder = '';
    let currentFileName = '';
    let nextFileName = '';
    let mediaType = '';          // "video" or "image"
    let resolution = 'N/A';      // for videos
    let currentTimeStr = '0:00';
    let durationStr = '0:00';
    let timeRemainingStr = '0:00';

    const IMAGE_DISPLAY_TIME = 30; // seconds to hold an image
    const CROSSFADE_TIME = 3;      // seconds before end of video to preload next

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 1) Fetch subfolders (modes) dynamically
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    try {
      modes = await ipcRenderer.invoke('getModes'); 
      if (!modes || modes.length === 0) {
        hintOverlay.innerText = 'No folders in /videos/.';
      } else {
        let hintText = 'Press [Shift] = toggle debug\n\n';
        modes.forEach((folder, idx) => {
          const keyNum = idx + 1;
          hintText += `Press [${keyNum}] = ${folder}\n`;
        });
        hintOverlay.innerText = hintText;
      }
    } catch (err) {
      console.error('Error loading modes:', err);
      hintOverlay.innerText = 'Error: could not load folder list!';
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 2) Helpers
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    function isVideoFile(filePath) {
      // Basic extension check:
      const ext = filePath.split('.').pop().toLowerCase();
      return ['mp4','mov','webm','m4v','avi','mkv'].includes(ext);
    }
    function isImageFile(filePath) {
      const ext = filePath.split('.').pop().toLowerCase();
      return ['jpg','jpeg','png','gif','bmp'].includes(ext);
    }
    function getFileName(fullPath) {
      const parts = fullPath.split(/[/\\]+/);
      return parts[parts.length - 1];
    }
    function formatTime(sec) {
      if (isNaN(sec) || sec < 0) return '0:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      return `${m}:${s.toString().padStart(2,'0')}`;
    }
    function toMediaUrl(filePath) {
      try {
        return pathToFileURL(filePath).toString();
      } catch (error) {
        console.warn('Failed to convert file path to URL:', error);
        return filePath;
      }
    }

    function waitForVideoEnd(container) {
      const videoEl = container.querySelector('video');
      if (!videoEl) return Promise.resolve(false);
      if (videoEl.ended) return Promise.resolve(true);
      return new Promise((resolve, reject) => {
        const onEnded = () => {
          cleanup();
          resolve(true);
        };
        const onError = (err) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          videoEl.removeEventListener('ended', onEnded);
          videoEl.removeEventListener('error', onError);
        };
        videoEl.addEventListener('ended', onEnded);
        videoEl.addEventListener('error', onError);
      });
    }

    function setMutedForAllVideos(muted) {
      [containerA, containerB].forEach((div) => {
        const videoEl = div.querySelector('video');
        if (videoEl) {
          videoEl.muted = muted;
        }
      });
    }

    let toastTimer = null;
    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('visible');
      if (toastTimer) {
        clearTimeout(toastTimer);
      }
      toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 1500);
    }

    // **Update debugOverlay text**
    function updateDebug() {
      if (!debugOverlay) return;
      debugOverlay.innerText = `
Mode: ${currentFolder}
Current File: ${currentFileName || 'N/A'} [${mediaType || ''}]
Next File: ${nextFileName || 'N/A'}
Resolution: ${resolution}
Time: ${currentTimeStr}/${durationStr} (remaining: ${timeRemainingStr})
`.trim();
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 3) Core: Play Media (Video or Image) in a Container
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    /**
     * Returns a Promise that resolves when the media is done:
     * - For images, after IMAGE_DISPLAY_TIME seconds
     * - For videos, when "ended"
     */
    function playMediaInContainer(container, filePath) {
      return new Promise((resolve, reject) => {
        container.innerHTML = ''; // clear old content
        resolution = 'N/A';
        currentTimeStr = '0:00';
        durationStr = '0:00';
        timeRemainingStr = '0:00';

        if (isVideoFile(filePath)) {
          mediaType = 'video';
          const videoEl = document.createElement('video');
          videoEl.src = toMediaUrl(filePath);
          videoEl.autoplay = true;
          videoEl.muted = isMuted;
          videoEl.playsInline = true;
          videoEl.style.display = 'block';
          videoEl.addEventListener('loadedmetadata', () => {
            resolution = `${videoEl.videoWidth}x${videoEl.videoHeight}`;
            durationStr = formatTime(videoEl.duration);
            updateDebug();
          });
          videoEl.addEventListener('timeupdate', () => {
            const ct = videoEl.currentTime || 0;
            const d = videoEl.duration || 0;
            currentTimeStr = formatTime(ct);
            durationStr = formatTime(d);
            const remaining = d - ct;
            timeRemainingStr = formatTime(remaining);
            // Preload next if near the end
            if (!nextPreloaded && files.length > 1 && remaining <= CROSSFADE_TIME) {
              // Trigger a manual preload for the next media
              nextPreloaded = true;
              preloadedFilePath = files[nextFileIndex % files.length];
              playMediaInContainer(nextContainer, preloadedFilePath);
            }
            updateDebug();
          });
          videoEl.addEventListener('ended', () => {
            resolve(); // done playing
          });
          videoEl.addEventListener('error', (err) => {
            console.error('Video error:', err);
            reject(err);
          });
          container.appendChild(videoEl);

        } else if (isImageFile(filePath)) {
          mediaType = 'image';
          const imgEl = document.createElement('img');
          imgEl.src = toMediaUrl(filePath);
          imgEl.style.display = 'block';
          // Wait for image to load, then set a 30s timer
          imgEl.addEventListener('load', () => {
            // We show images for 30 seconds
            // Could set resolution = `${imgEl.naturalWidth}x${imgEl.naturalHeight}` if you like
            resolution = `${imgEl.naturalWidth}x${imgEl.naturalHeight}`;
            durationStr = '30s (image)';
            updateDebug();
            setTimeout(() => {
              resolve();
            }, IMAGE_DISPLAY_TIME * 1000);
          });
          imgEl.addEventListener('error', (err) => {
            console.error('Image load error:', err);
            reject(err);
          });
          container.appendChild(imgEl);

        } else {
          // Unknown file type? Just skip after a short time or reject
          mediaType = 'unknown';
          console.warn('Unknown file type:', filePath);
          setTimeout(() => resolve(), 3000); 
        }
        updateDebug();
      });
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 4) Crossfade Logic
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    async function playNextMedia() {
      // 1) Check if any files exist
      if (!files || files.length === 0) return;
    
      // 2) Wrap currentIndex
      if (currentIndex >= files.length) {
        currentIndex = 0;
      }
    
      // 3) Current file
      const filePath = files[currentIndex];
      currentFileName = getFileName(filePath);
    
      // 4) Next file index & name
      let nextIdx = currentIndex + 1;
      if (nextIdx >= files.length) {
        nextIdx = 0;
      }
      nextFileIndex = nextIdx;
      nextFileName = getFileName(files[nextIdx]);
    
      // 5) Update debug so it shows the next file
      updateDebug();
    
      // 6) Advance currentIndex for the next iteration
      currentIndex++;
      nextPreloaded = false;
    
      // 7) Show current container, hide next
      currentContainer.classList.remove('hidden');
      currentContainer.classList.add('visible');
      nextContainer.classList.remove('visible');
      nextContainer.classList.add('hidden');
    
      // 8) Play media (image or video) and wait until done
      const canReusePreloaded = nextPreloaded &&
        preloadedFilePath === filePath &&
        currentContainer.querySelector('video') &&
        currentContainer.querySelector('video').src === toMediaUrl(filePath);
      if (canReusePreloaded) {
        await waitForVideoEnd(currentContainer);
      } else {
        await playMediaInContainer(currentContainer, filePath);
      }
    
      // 9) Crossfade
      doCrossfade();
    
      // 10) Recursively continue
      await playNextMedia();
    }

    function doCrossfade() {
      // Hide current, show next
      currentContainer.classList.remove('visible');
      currentContainer.classList.add('hidden');

      nextContainer.classList.remove('hidden');
      nextContainer.classList.add('visible');

      // Swap references
      const temp = currentContainer;
      currentContainer = nextContainer;
      nextContainer = temp;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 5) Loading an Entire Folder
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    async function loadFolderByIndex(idx) {
      if (idx < 0 || idx >= modes.length) return;
      // Clear both containers
      resetMediaContainers();

      currentModeIndex = idx;
      currentFolder = modes[idx];
      currentIndex = 0;
      nextPreloaded = false;
      preloadedFilePath = '';

      // Grab the files in this folder
      files = await ipcRenderer.invoke('getVideos', currentFolder);
      if (!files || files.length === 0) {
        console.warn(`No files in folder: ${currentFolder}`);
        resetDebug();
        return;
      }

      // Start the cycle
      playNextMedia();
    }

    function resetMediaContainers() {
      // Pause any existing media by clearing innerHTML
      [containerA, containerB].forEach(div => {
        div.innerHTML = '';
        div.classList.remove('visible');
        div.classList.add('hidden');
      });
      // Reset references
      currentContainer = containerA;
      nextContainer = containerB;
      // Clear debug
      currentFileName = '';
      nextFileName = '';
      resolution = 'N/A';
      mediaType = '';
      currentTimeStr = '0:00';
      durationStr = '0:00';
      timeRemainingStr = '0:00';
      nextPreloaded = false;
      preloadedFilePath = '';
      updateDebug();
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 6) Keyboard Handling
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    function toggleDebug() {
      debugVisible = !debugVisible;
      if (debugOverlay) {
        debugOverlay.style.display = debugVisible ? 'block' : 'none';
      }
    }

    function toggleHint() {
      hintVisible = !hintVisible;
      if (hintOverlay) {
        hintOverlay.style.display = hintVisible ? 'block' : 'none';
      }
    }

    function toggleMute() {
      isMuted = !isMuted;
      setMutedForAllVideos(isMuted);
      showToast(isMuted ? 'Muted' : 'Unmuted');
    }

    async function toggleAlwaysOnTop() {
      alwaysOnTopEnabled = !alwaysOnTopEnabled;
      try {
        await ipcRenderer.invoke('setAlwaysOnTop', alwaysOnTopEnabled);
      } catch (err) {
        console.error('Failed to set always on top:', err);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'ShiftLeft') {
        toggleDebug();
        return;
      }
      if (e.code === 'KeyH') {
        toggleHint();
        return;
      }
      if (e.code === 'KeyM') {
        toggleMute();
        return;
      }
      if (e.code === 'KeyT') {
        toggleAlwaysOnTop();
        return;
      }
      // If user pressed 1..9, load that folder
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= modes.length) {
        loadFolderByIndex(digit - 1);
      }
    });

    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    // 7) Auto-load the first folder (optional)
    // ~~~~~~~~~~~~~~~~~~~~~~~~~
    if (modes && modes.length > 0) {
      loadFolderByIndex(0);
    }
  },
});