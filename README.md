Below is a comprehensive README you can include in your Milestone 001 commit. It explains what the project is, how to install and run it, and any relevant notes for Windows 11 dual-monitor setups.

stretch_av – Milestone 001

Milestone Goal: Run a simple Electron app that spans a fullscreen window across two 1920×1080 monitors (total 3840×1080) on Windows 11 (or any OS with extended displays) and continuously loop videos from the videos/normal folder.

Features (Milestone 001)
	•	Fullscreen at 3840×1080 if more than one display is detected (i.e., dual-monitor extended desktop).
	•	Borderless window.
	•	Autoplay and loop any video files in the videos/normal folder (supports 2 or more files).
	•	Single-display fallback: If only one monitor is found, scales to that monitor’s work area.

Prerequisites
	1.	Node.js (v14+ recommended)
	2.	npm (comes with Node, used to install Electron and packages)
	3.	Git (if you want to clone/pull from GitHub)
	4.	Two monitors of 1920×1080 each, set to Extended mode in your OS display settings (so the total horizontal resolution is 3840).

Installation & Setup
	1.	Clone or Download this repository:

git clone https://github.com/Petestam/stretch_av.git

Or download the ZIP and extract it locally.

	2.	Install Dependencies:

cd stretch_av
npm install

This fetches Electron and other necessary modules.

	3.	Add Videos:
	•	Place your .mp4 or other supported video formats in the videos/normal folder.
	•	For Milestone 001, at least two video files are recommended (e.g., video1.mp4 and video2.mp4).
	4.	Run the App:

npm start

	•	If you have two monitors extended side by side, the app will open in fullscreen (3840×1080) across both.
	•	If you only have one display, it will fill that display’s resolution as a borderless window.

Usage Notes
	1.	Fullscreen on Windows 11
	•	Make sure your two monitors are arranged side by side in Display Settings → Multiple Displays = “Extend these displays.”
	•	Verify the combined resolution is 3840×1080. The app then automatically uses fullscreen: true at that size.
	2.	Looping Behavior
	•	The app will read all files in videos/normal, load them in a queue, and loop indefinitely.
	•	If you have only 1 or 2 files, it will loop them repeatedly.
	3.	File Extensions
	•	Currently, no file extension filtering is applied. If you put non-video files in videos/normal, it may cause playback errors or be skipped by the <video> element.
	•	You can add filters for .mp4, .mov, etc. in main.js if needed.
	4.	Mute / Audio
	•	By default, the <video> element is muted. If you need audio, remove muted in index.html:

<video id="videoPlayer" autoplay playsinline></video>


	•	Windows and Electron typically allow autoplay if the video is muted. If you enable audio, you may need user interaction or an autoplay policy override.

	5.	Exit
	•	Press Alt+F4 (Windows) or the standard close window gesture on other OSes to quit.
	•	For advanced kiosk-like setups, you might add a keybinding (e.g., “Escape” to exit) in preload.js.

Folder Structure

stretch_av/
├─ main.js           # Electron main process logic
├─ preload.js        # Preload script, interacts with renderer
├─ index.html        # Basic UI; single <video> element
├─ package.json      # Node/Electron project config
└─ videos/
   └─ normal/
      ├─ video1.mp4  # Example video
      └─ video2.mp4

Known Limitations
	•	No Transition: Currently, there’s no fancy fade/crossfade between videos. The screen may flash black if a video has black frames or if buffering is slow.
	•	No Filter: Non-video files in videos/normal might cause errors or no playback.
	•	No Auto-Restart: If the app crashes or a video is corrupted, you might need to restart manually.

Future Enhancements
	•	Crossfade or preload the next video for smooth transitions.
	•	Additional Keybinds for skipping videos or exiting.
	•	Log Handling / error reporting.
	•	Autostart on Windows boot (placing a shortcut in shell:startup or using the Task Scheduler).

Contributing
	1.	Fork the repo or create a new branch.
	2.	Make your changes or additions (e.g., crossfade logic).
	3.	Open a Pull Request describing your changes.

License

This project is provided as is with no specific license declared (feel free to add MIT, Apache 2.0, or another license based on your preference). For questions on usage or distribution, contact the repository owner.

Enjoy Milestone 001!

With this milestone, you can seamlessly stretch two 1920×1080 monitors into one wide 3840×1080 canvas on Windows 11 (or any OS) and continuously loop your videos. This sets the foundation for future enhancements like transitions, skip logic, or advanced kiosk controls.

Below is an updated README describing the new functionality introduced in Milestone 002, including:
	1.	Multi-state playback (dynamic detection of subfolders).
	2.	Two-container (or two-video) crossfade approach to avoid black flashes.
	3.	Support for both images and videos (images display for 30s, videos play until ended).
	4.	Advanced debug overlay (toggle with Left Shift), showing current mode, current/next file, resolution, and time info.
	5.	Keyboard shortcuts for switching modes based on folder name or numeric assignment.

Feel free to adapt the wording to match your project style.

stretch_av – Milestone 002

Milestone Goal: Build on the initial dual-monitor fullscreen setup by adding multi-state (folder-based) playback, crossfade transitions between files, support for images, and a debug overlay that can be toggled on/off, all while seamlessly looping content.

Features (002)
	1.	Multi-State / Dynamic Folders
	•	The app scans the videos/ directory for subfolders. Each subfolder is treated as a “mode” (e.g., normal, women, f1, myNewFolder, etc.).
	•	Each folder can contain both videos and images.
	•	The user can press numeric keys (1, 2, 3…) to switch between these modes at any time.
	2.	Two-Container Crossfade
	•	Replaces the single <video> approach with two “containers” (or “two-video” concept) that allow pre-loading or displaying content behind the scenes.
	•	Crossfade transitions to avoid black flashes.
	•	Prevents a visible gap when switching to the next file.
	3.	Image + Video Support
	•	Images are displayed for 30 seconds, then automatically transition to the next file.
	•	Videos play until they end (ended event).
	•	The app can mix images and videos in the same folder. For example, a folder can have slide1.jpg and clip1.mp4 in the same playlist.
	4.	Advanced Debug Overlay
	•	Press Left Shift to toggle a debug overlay showing:
	•	Current Mode (subfolder name)
	•	Current & Next File name
	•	Resolution (for videos; can also display image dimensions)
	•	Elapsed Time / Duration / Time Remaining for the current file
	•	When debug is off, the UI is clean and presentation-friendly.
	5.	Full Screen Across Two Monitors
	•	Continues to span 3840×1080 if two 1920×1080 displays are detected in “Extend” mode.
	•	Fills a single display if only one is found.
	6.	Keyboard Shortcuts
	•	Left Shift: Toggle debug overlay.
	•	1..9: Switch to folder #1..9 (based on the sorted list of subfolders).
	•	(Optional) You can still map extra keys for specific named folders if you like.

Prerequisites
	1.	Node.js & npm
	2.	Electron (installed via npm install)
	3.	At least one or two monitors:
	•	Single monitor: The app runs borderless at your display’s resolution.
	•	Two monitors: The app spans both (3840×1080 for two 1920×1080 monitors).
	4.	Folder Structure:

stretch_av/
├─ main.js
├─ preload.js
├─ index.html
├─ package.json
└─ videos/
   ├─ normal/
   ├─ women/
   ├─ f1/
   └─ myNewFolder/
      ├─ slide1.jpg
      ├─ clip1.mp4
      └─ ...

Installation & Setup
	1.	Clone or Download this repository:

git clone https://github.com/YourUsername/stretch_av.git

Or extract the .zip into a local folder.

	2.	Install Dependencies:

cd stretch_av
npm install

This installs Electron and other necessary modules.

	3.	Add Media:
	•	Place your images (e.g., .jpg, .png) and videos (e.g., .mp4, .mov) in subfolders under videos/.
	•	Each subfolder becomes a mode. For instance, videos/normal/, videos/women/, videos/f1/, etc.
	4.	Run:

npm start

	•	If you have two monitors extended side by side, the app appears fullscreen across both.
	•	If you only have one, it fills that display.

Usage
	1.	By Default, the app detects all subfolders in videos/ and lists them.
	2.	Press Digit Keys (1..9) to switch to the corresponding folder.
	3.	Crossfade occurs between consecutive files:
	•	Videos: The app waits for the file to end.
	•	Images: The app displays each image for 30 seconds by default.
	4.	Press Left Shift to toggle the debug overlay:
	•	Shows current file, next file, resolution, and time info.
	•	Also toggles the “hint” overlay so you can hide or show instructions.

Known Limitations
	•	No True “Preplay” for Images: We don’t need to buffer images, but for videos, you may want deeper logic if you want them to start partway in, or if you have very large video files.
	•	Single-file Folder: If a folder has only one file, “Next File” in debug is the same file.
	•	Skipping: Currently no built-in key to skip the current file instantly. (You can add one if desired—just dispatch a “end” or “resolve” event in code.)

Future Enhancements
	•	Fade Duration: Let users adjust the crossfade time or use no fade at all.
	•	Per-Folder Timers: If some images need more than 30s, or some less.
	•	Logging / Analytics: Track how many times each file has been displayed.
	•	Networked Content: Possibly load images/videos from a remote server.

License

You can include any open-source license you prefer (MIT, Apache 2.0, etc.). If none is specified, you may keep it unlicensed or “all rights reserved,” but typically an open-source license is recommended if you plan to share it publicly.

Conclusion

Milestone 002 significantly expands functionality:
	•	Dynamic subfolders become “modes.”
	•	Two-container crossfade avoids black flashes.
	•	Image support (30s display).
	•	Debug overlay with real-time info, toggleable by Left Shift.
	•	Keyboard control for quick folder switching.

Your kiosk or extended-display app now seamlessly cycles through videos and images in any subfolder, with minimal black screens and a user-friendly debugging mechanism. Enjoy!