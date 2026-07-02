(function () {
    const canvas = document.getElementById('rulerCanvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('tooltip');

    const RULER_THICKNESS = 58;
    const MIN_LENGTH = 100;
    const MAX_LENGTH = 4000;
    const DEFAULT_LENGTH = 600;
    const DRAG_THRESHOLD = 4;
    const START_PAD = 8;

    const COLORS = {
        bgGradientStart: '#2d3748',
        bgGradientEnd: '#4a5568',
        tickMajor: '#ffffff',
        tickMid: '#cbd5e0',
        tickMinor: '#a0aec0',
        tickPixel: '#718096',
        label: '#ffffff',
        hoverLine: '#667eea',
        hoverBg: 'rgba(102, 126, 234, 0.2)',
        resizeHint: '#a0aec0'
    };

    let isHorizontal = true;
    let rulerLength = DEFAULT_LENGTH;
    let rulerX = 0;
    let rulerY = 0;

    function saveState() {
        try {
            if (window.utools && window.utools.dbStorage) {
                window.utools.dbStorage.setItem('rulerState', JSON.stringify({
                    isHorizontal: isHorizontal,
                    rulerLength: rulerLength,
                    bgR: bgR, bgG: bgG, bgB: bgB, bgA: bgA
                }));
            }
        } catch (e) {}
    }

    function loadState() {
        try {
            if (window.utools && window.utools.dbStorage) {
                const saved = window.utools.dbStorage.getItem('rulerState');
                if (saved) {
                    const state = JSON.parse(saved);
                    if (typeof state.isHorizontal === 'boolean') {
                        isHorizontal = state.isHorizontal;
                    }
                    if (typeof state.rulerLength === 'number' && state.rulerLength >= MIN_LENGTH && state.rulerLength <= MAX_LENGTH) {
                        rulerLength = state.rulerLength;
                    }
                    if (typeof state.bgR === 'number' && typeof state.bgG === 'number' && typeof state.bgB === 'number' && typeof state.bgA === 'number') {
                        bgR = state.bgR; bgG = state.bgG; bgB = state.bgB; bgA = state.bgA;
                        COLORS.bgGradientStart = 'rgba(' + bgR + ',' + bgG + ',' + bgB + ',' + bgA + ')';
                        COLORS.bgGradientEnd = 'rgba(' + Math.max(0, bgR - 25) + ',' + Math.max(0, bgG - 20) + ',' + Math.max(0, bgB - 15) + ',' + bgA + ')';
                        pickerHue = 0; pickerSat = 1; pickerVal = 1; pickerAlpha = bgA;
                    }
                }
            }
        } catch (e) {}
    }

    let dragging = false;
    let resizing = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let mouseDownPos = null;
    let hasMoved = false;

    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartLength = 0;
    let resizeDir = '';

    let hoverValue = -1;
    let isOnRuler = false;
    let dpr = window.devicePixelRatio || 1;

    // Background color
    let bgR = 45, bgG = 55, bgB = 72, bgA = 1.0;

    // Context menu
    const contextMenu = document.getElementById('contextMenu');
    const menuChangeBg = document.getElementById('menuChangeBg');
    const menuClose = document.getElementById('menuClose');

    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    const satBrightCanvas = document.getElementById('satBrightCanvas');
    const satBrightCtx = satBrightCanvas.getContext('2d');
    const hueCanvas = document.getElementById('hueCanvas');
    const hueCtx = hueCanvas.getContext('2d');
    const alphaCanvas = document.getElementById('alphaCanvas');
    const alphaCtx = alphaCanvas.getContext('2d');
    const sbCursor = document.getElementById('sbCursor');
    const hueCursor = document.getElementById('hueCursor');
    const alphaCursor = document.getElementById('alphaCursor');
    const rgbaInput = document.getElementById('rgbaInput');
    const btnClear = document.getElementById('btnClear');
    const btnConfirm = document.getElementById('btnConfirm');

    let pickerHue = 0;
    let pickerSat = 1.0;
    let pickerVal = 1.0;
    let pickerAlpha = 1.0;
    let draggingSB = false;
    let draggingHue = false;
    let draggingAlpha = false;
    let colorPickerVisible = false;

    // Double-right-click close
    let rightClickTimer = null;
    let rightClickCount = 0;

    function initCanvas() {
        dpr = window.devicePixelRatio || 1;
        const totalLength = rulerLength + START_PAD * 2;
        if (isHorizontal) {
            canvas.width = totalLength * dpr;
            canvas.height = RULER_THICKNESS * dpr;
            canvas.style.width = totalLength + 'px';
            canvas.style.height = RULER_THICKNESS + 'px';
        } else {
            canvas.width = RULER_THICKNESS * dpr;
            canvas.height = totalLength * dpr;
            canvas.style.width = RULER_THICKNESS + 'px';
            canvas.style.height = totalLength + 'px';
        }
        canvas.style.left = rulerX + 'px';
        canvas.style.top = rulerY + 'px';
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawRulerBackground();
        if (isHorizontal) {
            drawHorizontalTicks();
        } else {
            drawVerticalTicks();
        }
        drawResizeHandles();
    }

    function drawRulerBackground() {
        const totalLen = rulerLength + START_PAD * 2;
        const rectW = isHorizontal ? totalLen : RULER_THICKNESS;
        const rectH = isHorizontal ? RULER_THICKNESS : totalLen;
        const grad = ctx.createLinearGradient(0, 0, rectW, rectH);
        grad.addColorStop(0, COLORS.bgGradientStart);
        grad.addColorStop(1, COLORS.bgGradientEnd);
        ctx.fillStyle = grad;
        roundRect(ctx, 0, 0, rectW, rectH, 4);
        ctx.fill();
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function drawHorizontalTicks() {
        const baseY = RULER_THICKNESS - 6;
        for (let i = 0; i <= rulerLength; i++) {
            let tickH, lineWidth, color;
            const x = i + START_PAD;
            if (i % 100 === 0) { tickH = 22; lineWidth = 1.5; color = COLORS.tickMajor; }
            else if (i % 50 === 0) { tickH = 16; lineWidth = 1.2; color = COLORS.tickMid; }
            else if (i % 10 === 0) { tickH = 12; lineWidth = 1; color = COLORS.tickMid; }
            else if (i % 5 === 0) { tickH = 8; lineWidth = 0.8; color = COLORS.tickMinor; }
            else { tickH = 4; lineWidth = 0.5; color = COLORS.tickPixel; }
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(x + 0.5, baseY);
            ctx.lineTo(x + 0.5, baseY - tickH);
            ctx.stroke();
            if (i % 100 === 0) {
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.fillStyle = COLORS.label;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(i + '', x, baseY - tickH - 3);
            }
        }
        if (hoverValue >= 0 && hoverValue <= rulerLength) {
            const hx = hoverValue + START_PAD;
            ctx.fillStyle = COLORS.hoverBg;
            ctx.fillRect(Math.max(START_PAD, hx - 15), 0, 30, RULER_THICKNESS);
            ctx.strokeStyle = COLORS.hoverLine;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hx + 0.5, 0);
            ctx.lineTo(hx + 0.5, RULER_THICKNESS);
            ctx.stroke();
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle = COLORS.hoverLine;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(hoverValue + '', hx, 4);
        }
    }

    function drawVerticalTicks() {
        const baseX = RULER_THICKNESS - 6;
        for (let i = 0; i <= rulerLength; i++) {
            let tickW, lineWidth, color;
            const y = i + START_PAD;
            if (i % 100 === 0) { tickW = 22; lineWidth = 1.5; color = COLORS.tickMajor; }
            else if (i % 50 === 0) { tickW = 16; lineWidth = 1.2; color = COLORS.tickMid; }
            else if (i % 10 === 0) { tickW = 12; lineWidth = 1; color = COLORS.tickMid; }
            else if (i % 5 === 0) { tickW = 8; lineWidth = 0.8; color = COLORS.tickMinor; }
            else { tickW = 4; lineWidth = 0.5; color = COLORS.tickPixel; }
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(baseX, y + 0.5);
            ctx.lineTo(baseX - tickW, y + 0.5);
            ctx.stroke();
            if (i % 100 === 0) {
                ctx.save();
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.fillStyle = COLORS.label;
                ctx.translate(baseX - tickW - 3, y);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(i + '', 0, 0);
                ctx.restore();
            }
        }
        if (hoverValue >= 0 && hoverValue <= rulerLength) {
            const hy = hoverValue + START_PAD;
            ctx.fillStyle = COLORS.hoverBg;
            ctx.fillRect(0, Math.max(START_PAD, hy - 15), RULER_THICKNESS, 30);
            ctx.strokeStyle = COLORS.hoverLine;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, hy + 0.5);
            ctx.lineTo(RULER_THICKNESS, hy + 0.5);
            ctx.stroke();
            ctx.save();
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle = COLORS.hoverLine;
            ctx.translate(4, hy);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(hoverValue + '', 0, 0);
            ctx.restore();
        }
    }

    function drawResizeHandles() {
        const handleSize = 6;
        ctx.fillStyle = COLORS.resizeHint;
        ctx.globalAlpha = 0.6;
        if (isHorizontal) {
            roundRect(ctx, rulerLength + START_PAD + 2, RULER_THICKNESS / 2 - 10, handleSize, 20, 3);
            ctx.fill();
        } else {
            roundRect(ctx, RULER_THICKNESS / 2 - 10, rulerLength + START_PAD + 2, 20, handleSize, 3);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function getResizeZone(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const handlePos = rulerLength + START_PAD + 2;
        const handleEnd = handlePos + 8;
        if (isHorizontal) {
            if (x >= handlePos && x <= handleEnd) return 'right';
        } else {
            if (y >= handlePos && y <= handleEnd) return 'bottom';
        }
        return null;
    }

    function isInRuler(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (isHorizontal) {
            return x >= START_PAD && x <= rulerLength + START_PAD && y >= 0 && y <= RULER_THICKNESS;
        } else {
            return x >= 0 && x <= RULER_THICKNESS && y >= START_PAD && y <= rulerLength + START_PAD;
        }
    }

    function checkMouseOverRuler(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let over = false;
        const handleEnd = rulerLength + START_PAD + 12;
        if (isHorizontal) {
            over = x >= START_PAD && x <= handleEnd && y >= -30 && y <= RULER_THICKNESS + 30;
        } else {
            over = x >= -30 && x <= RULER_THICKNESS + 30 && y >= START_PAD && y <= handleEnd;
        }
        if (over && !isOnRuler) {
            isOnRuler = true;
            if (window.rulerBridge) window.rulerBridge.mouseOver();
        } else if (!over && isOnRuler) {
            isOnRuler = false;
            if (window.rulerBridge) window.rulerBridge.mouseOut();
        }
        return over;
    }

    canvas.addEventListener('mousedown', function (e) {
        hideContextMenu();
        if (e.button === 2) return;
        if (colorPickerVisible) return;

        mouseDownPos = { x: e.clientX, y: e.clientY };
        hasMoved = false;

        const zone = getResizeZone(e);
        if (zone) {
            resizing = true;
            resizeDir = zone;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartLength = rulerLength;
            e.preventDefault();
            return;
        }

        if (isInRuler(e)) {
            dragging = true;
            const rect = canvas.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', function (e) {
        checkMouseOverRuler(e);

        if (mouseDownPos) {
            const dx = Math.abs(e.clientX - mouseDownPos.x);
            const dy = Math.abs(e.clientY - mouseDownPos.y);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                hasMoved = true;
            }
        }

        if (dragging && hasMoved) {
            rulerX = e.clientX - dragOffsetX;
            rulerY = e.clientY - dragOffsetY;
            canvas.style.left = rulerX + 'px';
            canvas.style.top = rulerY + 'px';
        }

        if (resizing && hasMoved) {
            let diff;
            if (isHorizontal) {
                diff = e.clientX - resizeStartX;
            } else {
                diff = e.clientY - resizeStartY;
            }
            rulerLength = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, resizeStartLength + diff));
            initCanvas();
            draw();
            saveState();
        }

        if (isInRuler(e)) {
            const rect = canvas.getBoundingClientRect();
            let val;
            if (isHorizontal) {
                val = Math.round(e.clientX - rect.left - START_PAD);
            } else {
                val = Math.round(e.clientY - rect.top - START_PAD);
            }
            val = Math.max(0, Math.min(rulerLength, val));
            hoverValue = val;
            draw();
            tooltip.textContent = val + 'px / ' + rulerLength + 'px';
            tooltip.classList.add('visible');
            let tx, ty;
            if (isHorizontal) {
                tx = e.clientX - tooltip.offsetWidth / 2;
                ty = e.clientY - 42;
            } else {
                tx = e.clientX - tooltip.offsetWidth - 14;
                ty = e.clientY - tooltip.offsetHeight / 2;
            }
            tooltip.style.left = tx + 'px';
            tooltip.style.top = ty + 'px';
            const zone = getResizeZone(e);
            if (zone === 'right') canvas.style.cursor = 'e-resize';
            else if (zone === 'bottom') canvas.style.cursor = 's-resize';
            else canvas.style.cursor = 'move';
        } else {
            if (hoverValue !== -1) {
                hoverValue = -1;
                draw();
            }
            tooltip.classList.remove('visible');
            const handleZone = getResizeZone(e);
            if (handleZone) canvas.style.cursor = isHorizontal ? 'e-resize' : 's-resize';
            else canvas.style.cursor = 'default';
        }
    });

    document.addEventListener('mouseup', function (e) {
        if (colorPickerVisible) {
            dragging = false; resizing = false; resizeDir = '';
            mouseDownPos = null; hasMoved = false;
            return;
        }

        if (e.button === 0 && !hasMoved && mouseDownPos && isInRuler(e)) {
            const zone = getResizeZone(e);
            if (!zone) toggleDirection();
        }

        dragging = false;
        resizing = false;
        resizeDir = '';
        mouseDownPos = null;
        hasMoved = false;
    });

    function toggleDirection() {
        const centerX = rulerX + (isHorizontal ? rulerLength / 2 : RULER_THICKNESS / 2);
        const centerY = rulerY + (isHorizontal ? RULER_THICKNESS / 2 : rulerLength / 2);
        isHorizontal = !isHorizontal;
        rulerX = centerX - (isHorizontal ? rulerLength / 2 : RULER_THICKNESS / 2);
        rulerY = centerY - (isHorizontal ? RULER_THICKNESS / 2 : rulerLength / 2);
        initCanvas();
        draw();
        saveState();
    }

    function closeRuler() {
        if (window.rulerBridge) {
            window.rulerBridge.close();
        } else {
            window.close();
        }
    }

    /* ========== Color conversion ========== */
    function hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    /* ========== Context menu ========== */
    function showContextMenu(x, y) {
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('show');
    }
    function hideContextMenu() {
        contextMenu.classList.remove('show');
    }

    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        rightClickCount++;
        if (rightClickCount === 1) {
            rightClickTimer = setTimeout(function () {
                rightClickCount = 0;
                showContextMenu(e.clientX, e.clientY);
            }, 250);
        } else {
            clearTimeout(rightClickTimer);
            rightClickCount = 0;
            closeRuler();
        }
    });

    menuChangeBg.addEventListener('click', function (e) {
        e.stopPropagation();
        hideContextMenu();
        openColorPicker();
    });
    menuClose.addEventListener('click', function (e) {
        e.stopPropagation();
        hideContextMenu();
        closeRuler();
    });

    document.addEventListener('contextmenu', function () {
        hideContextMenu();
    });

    /* ========== Color picker ========== */
    function openColorPicker() {
        drawSatBright();
        drawHueBar();
        drawAlphaBar();
        positionSBCursor();
        positionHueCursor();
        positionAlphaCursor();
        updateRgbaInput();
        colorPicker.style.display = 'block';
        colorPickerVisible = true;
        positionColorPicker();
        if (window.rulerBridge) window.rulerBridge.colorPickerShow();
    }

    function positionColorPicker() {
        const pw = 320, ph = 340;
        let px = (window.innerWidth - pw) / 2;
        let py = (window.innerHeight - ph) / 2;
        px = Math.max(10, Math.min(window.innerWidth - pw - 10, px));
        py = Math.max(10, Math.min(window.innerHeight - ph - 10, py));
        colorPicker.style.left = px + 'px';
        colorPicker.style.top = py + 'px';
    }

    function closeColorPicker() {
        colorPicker.style.display = 'none';
        colorPickerVisible = false;
        if (window.rulerBridge) window.rulerBridge.colorPickerHide();
    }

    function drawSatBright() {
        const w = 256, h = 256;
        const rgb = hsvToRgb(pickerHue, 1, 1);
        const baseColor = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        const gradH = satBrightCtx.createLinearGradient(0, 0, w, 0);
        gradH.addColorStop(0, '#fff');
        gradH.addColorStop(1, baseColor);
        satBrightCtx.fillStyle = gradH;
        satBrightCtx.fillRect(0, 0, w, h);
        const gradV = satBrightCtx.createLinearGradient(0, 0, 0, h);
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, 'rgba(0,0,0,1)');
        satBrightCtx.fillStyle = gradV;
        satBrightCtx.fillRect(0, 0, w, h);
    }

    function drawHueBar() {
        const grad = hueCtx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(1/6, '#ffff00');
        grad.addColorStop(2/6, '#00ff00');
        grad.addColorStop(3/6, '#00ffff');
        grad.addColorStop(4/6, '#0000ff');
        grad.addColorStop(5/6, '#ff00ff');
        grad.addColorStop(1, '#ff0000');
        hueCtx.fillStyle = grad;
        hueCtx.fillRect(0, 0, 20, 256);
    }

    function drawAlphaBar() {
        const rgb = hsvToRgb(pickerHue, pickerSat, pickerVal);
        const grad = alphaCtx.createLinearGradient(0, 0, 276, 0);
        grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
        grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',1)');
        alphaCtx.clearRect(0, 0, 276, 14);
        alphaCtx.fillStyle = grad;
        alphaCtx.fillRect(0, 0, 276, 14);
    }

    function positionSBCursor() {
        sbCursor.style.left = (pickerSat * 256) + 'px';
        sbCursor.style.top = ((1 - pickerVal) * 256) + 'px';
    }
    function positionHueCursor() {
        hueCursor.style.top = (pickerHue * 256) + 'px';
    }
    function positionAlphaCursor() {
        alphaCursor.style.left = (pickerAlpha * 276) + 'px';
    }

    function updateRgbaInput() {
        const rgb = hsvToRgb(pickerHue, pickerSat, pickerVal);
        rgbaInput.value = 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + pickerAlpha.toFixed(1) + ')';
    }

    function applyBgFromPicker() {
        const rgb = hsvToRgb(pickerHue, pickerSat, pickerVal);
        bgR = rgb[0]; bgG = rgb[1]; bgB = rgb[2]; bgA = pickerAlpha;
        COLORS.bgGradientStart = 'rgba(' + bgR + ',' + bgG + ',' + bgB + ',' + bgA + ')';
        COLORS.bgGradientEnd = 'rgba(' + Math.max(0, bgR - 25) + ',' + Math.max(0, bgG - 20) + ',' + Math.max(0, bgB - 15) + ',' + bgA + ')';
        draw();
    }

    /* --- SB area events --- */
    function handleSBMove(e) {
        const rect = satBrightCanvas.getBoundingClientRect();
        let x = Math.max(0, Math.min(255, e.clientX - rect.left));
        let y = Math.max(0, Math.min(255, e.clientY - rect.top));
        pickerSat = x / 255;
        pickerVal = 1 - y / 255;
        positionSBCursor();
        drawAlphaBar();
        updateRgbaInput();
        applyBgFromPicker();
    }
    satBrightCanvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        draggingSB = true;
        handleSBMove(e);
    });

    /* --- Hue events --- */
    function handleHueMove(e) {
        const rect = hueCanvas.getBoundingClientRect();
        let y = Math.max(0, Math.min(255, e.clientY - rect.top));
        pickerHue = y / 255;
        positionHueCursor();
        drawSatBright();
        drawAlphaBar();
        updateRgbaInput();
        applyBgFromPicker();
    }
    hueCanvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        draggingHue = true;
        handleHueMove(e);
    });

    /* --- Alpha events --- */
    function handleAlphaMove(e) {
        const rect = alphaCanvas.getBoundingClientRect();
        let x = Math.max(0, Math.min(275, e.clientX - rect.left));
        pickerAlpha = Math.round((x / 275) * 10) / 10;
        positionAlphaCursor();
        updateRgbaInput();
        applyBgFromPicker();
    }
    alphaCanvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        draggingAlpha = true;
        handleAlphaMove(e);
    });

    /* --- Global mouse for picker drag --- */
    document.addEventListener('mousemove', function (e) {
        if (draggingSB) handleSBMove(e);
        if (draggingHue) handleHueMove(e);
        if (draggingAlpha) handleAlphaMove(e);
    });
    document.addEventListener('mouseup', function () {
        draggingSB = false;
        draggingHue = false;
        draggingAlpha = false;
    });

    /* --- Picker buttons --- */
    btnConfirm.addEventListener('click', function (e) {
        e.stopPropagation();
        saveState();
        closeColorPicker();
    });
    btnClear.addEventListener('click', function (e) {
        e.stopPropagation();
        pickerHue = 0; pickerSat = 1; pickerVal = 1; pickerAlpha = 1;
        bgR = 45; bgG = 55; bgB = 72; bgA = 1.0;
        COLORS.bgGradientStart = '#2d3748';
        COLORS.bgGradientEnd = '#4a5568';
        draw();
        saveState();
        closeColorPicker();
    });

    /* --- Close picker on left click outside --- */
    document.addEventListener('mousedown', function (e) {
        if (!colorPickerVisible) return;
        if (colorPicker.contains(e.target)) return;
        closeColorPicker();
    });

    function centerRuler() {
        const totalLength = rulerLength + START_PAD * 2;
        rulerX = (window.innerWidth - (isHorizontal ? totalLength : RULER_THICKNESS)) / 2;
        rulerY = (window.innerHeight - (isHorizontal ? RULER_THICKNESS : totalLength)) / 2;
    }

    function init() {
        loadState();
        centerRuler();
        initCanvas();
        draw();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
