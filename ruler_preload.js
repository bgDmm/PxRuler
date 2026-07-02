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
    colorPickerShow: function () {
        ipcRenderer.sendToHost('ruler-color-picker-show');
        window.utools.sendToParent('ruler-color-picker-show');
    },
    colorPickerHide: function () {
        ipcRenderer.sendToHost('ruler-color-picker-hide');
        window.utools.sendToParent('ruler-color-picker-hide');
    },
    close: function () {
        ipcRenderer.sendToHost('ruler-close');
        window.utools.sendToParent('ruler-close');
    }
};
