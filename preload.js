const { ipcRenderer } = require('electron');

let rulerWindow = null;
let colorPickerActive = false;
let pointerOnRuler = false;

function createRulerWindow() {
    if (rulerWindow && !rulerWindow.isDestroyed()) {
        rulerWindow.show();
        rulerWindow.focus();
        return;
    }

    colorPickerActive = false;
    pointerOnRuler = false;

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
        pointerOnRuler = true;
        if (rulerWindow && !rulerWindow.isDestroyed()) {
            rulerWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcRenderer.on('ruler-mouse-out', () => {
        pointerOnRuler = false;
        if (rulerWindow && !rulerWindow.isDestroyed() && !colorPickerActive) {
            rulerWindow.setIgnoreMouseEvents(true, { forward: true });
        }
    });

    ipcRenderer.on('ruler-color-picker-show', () => {
        colorPickerActive = true;
        if (rulerWindow && !rulerWindow.isDestroyed()) {
            rulerWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcRenderer.on('ruler-color-picker-hide', () => {
        colorPickerActive = false;
        // 关闭取色器后不要立刻恢复鼠标穿透，延后一拍再决定：
        // 1) Electron 在 setIgnoreMouseEvents 切换的瞬间会吞掉紧随其后的鼠标移动。
        //    用户点完「确定」正要把指针移向标尺时，这次移动就会被丢掉，
        //    renderer 补发不出 mouse-over，窗口于是卡在穿透态——光标变回箭头、
        //    右键失效，必须手动移出再移入一次才恢复。推迟到指针静止后再切换，
        //    之后的移动就能正常转发。
        // 2) 这段时间里 renderer 会主动同步一次指针位置：若指针确实停在标尺上，
        //    pointerOnRuler 为 true，就保持非穿透，光标和右键当场可用。
        setTimeout(() => {
            if (colorPickerActive) return;
            if (pointerOnRuler) return;
            if (rulerWindow && !rulerWindow.isDestroyed()) {
                rulerWindow.setIgnoreMouseEvents(true, { forward: true });
            }
        }, 300);
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