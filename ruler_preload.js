const { ipcRenderer } = require('electron');

window.rulerBridge = {
    mouseOver: function () {
        ipcRenderer.sendToHost('ruler-mouse-over');
        window.utools.sendToParent('ruler-mouse-over');
    },
    mouseOut: function () {
        ipcRenderer.sendToHost('ruler-mouse-out');
        window.utools.sendToParent('ruler-mouse-out');
    },
    close: function () {
        ipcRenderer.sendToHost('ruler-close');
        window.utools.sendToParent('ruler-close');
    }
};