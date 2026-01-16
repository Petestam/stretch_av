const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  // 1) Get all displays
  const displays = screen.getAllDisplays();

  // 2) Find the bounding rectangle for all displays
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  displays.forEach((disp) => {
    const { x, y, width, height } = disp.bounds;

    if (x < minX) minX = x;
    if (y < minY) minY = y;

    const right = x + width;
    const bottom = y + height;

    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // 3) Create a borderless window exactly covering the bounding rectangle
  mainWindow = new BrowserWindow({
    x: minX,
    y: minY,
    width: totalWidth,
    height: totalHeight,
    frame: false,         // no window chrome
    resizable: false,     // prevent resizing
    alwaysOnTop: false,    // optional, keep it above other windows
    fullscreen: false,    // do NOT set fullscreen: true (it locks to one display on Windows)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

// Helper to get the path to videos, handling ASAR unpacking
function getVideosPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'videos');
  }
  return path.join(__dirname, 'videos');
}

// Add this function to handle the 'getModes' IPC call
ipcMain.handle('getModes', async () => {
  try {
    const videoDir = getVideosPath();
    const folders = fs.readdirSync(videoDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    return folders;
  } catch (error) {
    console.error('Error reading video directories:', error);
    return [];
  }
});

// Add this function to handle the 'getVideos' IPC call
ipcMain.handle('getVideos', async (event, folderName) => {
  try {
    const videoDir = getVideosPath();
    const folderPath = path.join(videoDir, folderName);
    const files = fs.readdirSync(folderPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext);
      });
    return files.map(file => path.join(folderPath, file));
  } catch (error) {
    console.error(`Error reading files in folder ${folderName}:`, error);
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit on close (except macOS standard).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});