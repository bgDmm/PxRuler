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
                    rulerLength: rulerLength
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

            if (i % 100 === 0) {
                tickH = 22;
                lineWidth = 1.5;
                color = COLORS.tickMajor;
            } else if (i % 50 === 0) {
                tickH = 16;
                lineWidth = 1.2;
                color = COLORS.tickMid;
            } else if (i % 10 === 0) {
                tickH = 12;
                lineWidth = 1;
                color = COLORS.tickMid;
            } else if (i % 5 === 0) {
                tickH = 8;
                lineWidth = 0.8;
                color = COLORS.tickMinor;
            } else {
                tickH = 4;
                lineWidth = 0.5;
                color = COLORS.tickPixel;
            }

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

            if (i % 100 === 0) {
                tickW = 22;
                lineWidth = 1.5;
                color = COLORS.tickMajor;
            } else if (i % 50 === 0) {
                tickW = 16;
                lineWidth = 1.2;
                color = COLORS.tickMid;
            } else if (i % 10 === 0) {
                tickW = 12;
                lineWidth = 1;
                color = COLORS.tickMid;
            } else if (i % 5 === 0) {
                tickW = 8;
                lineWidth = 0.8;
                color = COLORS.tickMinor;
            } else {
                tickW = 4;
                lineWidth = 0.5;
                color = COLORS.tickPixel;
            }

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
        if (e.button === 2) return;

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
            const x = e.clientX - dragOffsetX;
            const y = e.clientY - dragOffsetY;
            rulerX = x;
            rulerY = y;
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
            if (zone === 'right') {
                canvas.style.cursor = 'e-resize';
            } else if (zone === 'bottom') {
                canvas.style.cursor = 's-resize';
            } else {
                canvas.style.cursor = 'move';
            }
        } else {
            if (hoverValue !== -1) {
                hoverValue = -1;
                draw();
            }
            tooltip.classList.remove('visible');

            const handleZone = getResizeZone(e);
            if (handleZone) {
                canvas.style.cursor = isHorizontal ? 'e-resize' : 's-resize';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    document.addEventListener('mouseup', function (e) {
        if (e.button === 0 && !hasMoved && isInRuler(e)) {
            const zone = getResizeZone(e);
            if (!zone) {
                toggleDirection();
            }
        }

        dragging = false;
        resizing = false;
        resizeDir = '';
        mouseDownPos = null;
        hasMoved = false;
    });

    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        closeRuler();
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