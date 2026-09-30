# 📖 WeBook

A 3D flip-page book you can write in. WeBook runs as a desktop app on **Windows** and **Ubuntu/Linux** (via Electron) and in any modern browser.

![WeBook icon](build/icon.png)

## Features

**Book model**
- A hardcover book with a front cover, a contents page, your pages, and a back cover
- Page edges that grow thicker on the side where more pages are stacked
- The book slides to the centre when it is closed and opens out when you turn the cover

**Create pages**
- **＋ New Page** (or the <kbd>N</kbd> key) opens an editor with a live preview
- 7 paper styles: classic, parchment, lined notebook, grid, rose, mint and midnight
- 4 text styles: book serif, clean sans, handwritten and typewriter; three alignments
- Add a picture, shown as a taped-in photo (it is resized automatically)
- Insert the new page after the page you are reading, at the start, or at the end
- Hover over a page and use ✎ to edit it or ✕ to delete it
- Book settings: title, subtitle, author and cover colour
- Saves automatically; export and import the book as a `.webook.json` file

**Page flipping**
- Click a page, drag it by its corner (it follows your pointer and you can fling it), or use the keyboard
- Pages are turned in 3D with lighting and shadow that change as the page turns, a small lift and bend, and a tilt that follows your pointer
- Jumping from the contents riffles through the pages in between

**Extra animations**
- Book entrance animation, a light that sweeps across the cover, and a bookmark ribbon that sways
- The page corner lifts when your mouse gets near it
- Sparkles along the spine when a page lands
- Confetti, a chime and a glow when you create a page; a puff of dust when you delete one
- Dust drifting in the air (bluish in night mode)
- Page-turn sound made in the browser with Web Audio, so no audio files are needed
- Night reading mode, a contents drawer whose items slide in one by one, and animated dialogs and notifications
- Respects the "reduce motion" accessibility setting

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>→</kbd> / <kbd>Space</kbd> / <kbd>PgDn</kbd> | Next page |
| <kbd>←</kbd> / <kbd>PgUp</kbd> | Previous page |
| <kbd>Home</kbd> / <kbd>End</kbd> | Front / back cover |
| <kbd>N</kbd> | New page |
| <kbd>T</kbd> | Contents |
| <kbd>D</kbd> | Night mode |
| <kbd>M</kbd> | Sound on/off |
| <kbd>F</kbd> | Fullscreen |
| <kbd>Esc</kbd> | Close dialogs |

The desktop app also has **File / Go / View** menus. For example, <kbd>Ctrl</kbd>+<kbd>N</kbd> creates a new page, <kbd>Ctrl</kbd>+<kbd>S</kbd> exports and <kbd>Ctrl</kbd>+<kbd>O</kbd> imports.

## Running it

**Quickest way: no download, starts instantly.** Open `src/index.html` in Chrome, Edge or Firefox, or run:
```bash
npm run web        # serves the book and opens it in your browser
```
The browser version has every feature of the desktop app.

### Windows
Double-click **`start-windows.bat`**. It opens the desktop app if it's ready and otherwise opens the browser version straight away.
Run `start-windows.bat desktop` to get the desktop app, which downloads the Electron runtime once.

### Ubuntu / Linux
```bash
./start-ubuntu.sh            # desktop app if ready, otherwise browser version (instant)
./start-ubuntu.sh desktop    # desktop app (one-time ~100 MB Electron download)
./start-ubuntu.sh web        # browser version at http://localhost:8080
```
If Node.js is missing, install it with `sudo apt install nodejs npm`.

### Desktop app with npm
```bash
npm install
npm start
```
The first `npm start` downloads the Electron runtime (~100 MB) from GitHub. This happens only once.

### Slow "Downloading Electron binary…"?
Press <kbd>Ctrl</kbd>+<kbd>C</kbd> and use a download mirror instead. The file is still checked against Electron's official checksums.
```bash
# Ubuntu / Linux
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm start

# Windows (Command Prompt)
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm start
```
You can also download a ready-made installer (`.deb`, `.AppImage` or `.exe`) from the GitHub Actions build artifacts instead.

## Building installers

```bash
npm run dist:win     # Windows: NSIS installer + portable .exe  (run on Windows)
npm run dist:linux   # Ubuntu:  .AppImage + .deb               (run on Linux)
```

Output goes to `dist/`. Install the Ubuntu package with `sudo apt install ./dist/own-webook_1.0.0_amd64.deb`, or run `chmod +x WeBook-*.AppImage` and then start the AppImage.

The GitHub Actions workflow (`.github/workflows/build.yml`) builds both on real Windows and Ubuntu runners. Download the installers from the run's **Artifacts** section.

> On some Linux VMs, 3D page transforms render badly with GPU compositing. If that happens, start the app with `WEBOOK_DISABLE_GPU=1`.

## Project layout

```
electron/main.js      desktop window, native menus, safe external links
electron/preload.js   minimal bridge from the menus to the page
src/index.html        app shell
src/css/style.css     book, paper themes, animations
src/js/flipbook.js    3D page-flip engine (click, drag, riffle, corner peek)
src/js/render.js      turns the book model into page faces
src/js/effects.js     particles, confetti, synthesised sounds
src/js/storage.js     book model, autosave, import/export, image resizing
src/js/app.js         toolbar, editor, settings, contents, keyboard
scripts/serve.js      zero-dependency web server
scripts/render-icon.js  regenerates build/icon.png from src/assets/icon.svg
```
