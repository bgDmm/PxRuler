const { ipcRenderer } = require('electron');

let rulerWindow = null;

function createRulerWindow() {
    if (rulerWindow && !rulerWindow.isDestroyed()) {
        rulerWindow.show();
        rulerWindow.focus();
        return;
    }

    const cursorPoint = window.utools.getCursorScreenPoint();
    const currentDisplay = window.utools.getDisplayNearestPoint(cursorPoint);
    const displayBounds = currentDisplay.bounds;
    const fullscreenable = window.utools.isWindows();

    rulerWindow = window.utools.createBrowserWindow('ruler.html', {
        show: false,
        x: displayBounds.x,
        y: displayBounds.y,
        width: displayBounds.width,
        height: displayBounds.height,
        backgroundColor: 'rgba(255,255,255,0.01)',
        thickFrame: false,
        resizable: false,
        fullscreenable: fullscreenable,
        fullscreen: fullscreenable,
        minimizable: false,
        maximizable: false,
        movable: false,
        autoHideMenuBar: true,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        enableLargerThanScreen: true,
        alwaysOnTop: true,
        roundedCorners: false,
        hasShadow: false,
        closable: true,
        focusable: false,
        webPreferences: {
            preload: 'ruler_preload.js'
        }
    }, () => {
        rulerWindow.show();
        window.utools.hideMainWindow();
        try {
            rulerWindow.setAlwaysOnTop(true, 'screen-saver');
        } catch (e) {}
        rulerWindow.setIgnoreMouseEvents(true, { forward: true });
    });

    ipcRenderer.on('ruler-mouse-over', () => {
        if (rulerWindow && !rulerWindow.isDestroyed()) {
            rulerWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcRenderer.on('ruler-mouse-out', () => {
        if (rulerWindow && !rulerWindow.isDestroyed()) {
            rulerWindow.setIgnoreMouseEvents(true, { forward: true });
        }
    });

    ipcRenderer.on('ruler-close', () => {
        if (rulerWindow && !rulerWindow.isDestroyed()) {
            rulerWindow.close();
            rulerWindow = null;
        }
        window.utools.outPlugin(true);
    });
}

window.exports = {
    "pixel-ruler": {
        mode: "none",
        args: {
            enter: () => {
                createRulerWindow();
            }
        }
    }
};