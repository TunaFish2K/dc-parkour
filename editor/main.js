/**
 * @typedef { [number, number, number, number, boolean] } Surface
 * @property { number } 0 - 起始位置的 X 坐标
 * @property { number } 1 - 起始位置的 Y 坐标
 * @property { number } 2 - 边的长度
 * @property { number } 3 - 边的面向方向（弧度）
 * @property { boolean } 4 - 边是否虚化
 */

const HEIGHT = 600;

let canvas, ctx, surfaces, selectedSurfaceIndex, keysPressed, history;

const PRESET_DIRECTIONS = [
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
    Math.PI,
    (5 * Math.PI) / 4,
    (3 * Math.PI) / 2,
    (7 * Math.PI) / 4
];

/**
 * 初始化画布和编辑器功能。
 */
function initializeEditor() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    selectedSurfaceIndex = -1;
    keysPressed = {};
    history = [];

    canvas.style.display = 'block'; // 显示画布

    // 键盘事件处理
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 每秒刷新 50 次
    setInterval(update, 1000 / 50);
    draw();
}

/**
 * 在画布上绘制指定的边。
 * @param {Surface} surface - 需要绘制的边
 */
function drawSurface(surface) {
    const [startX, startY, length, facing] = surface;
    const endX = startX + Math.cos(facing - Math.PI / 2) * length;
    const endY = startY + Math.sin(facing - Math.PI / 2) * length;

    ctx.beginPath();
    ctx.moveTo(startX, HEIGHT - startY);
    ctx.lineTo(endX, HEIGHT - endY);
    ctx.stroke();

    if (facing > 0 && facing < Math.PI) ctx.fillStyle = "#0000FF";
    else if (facing > Math.PI && facing < Math.PI * 2) ctx.fillStyle = "#FF0000";
    else ctx.fillStyle = "#00FF00";

    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, HEIGHT - centerY);
    ctx.lineTo(centerX + Math.cos(facing) * 50, HEIGHT - (centerY + Math.sin(facing) * 50));
    ctx.stroke();
}

/**
 * 在画布上绘制所有边并显示选中的边的信息。
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    surfaces.forEach((surface, index) => {
        ctx.strokeStyle = index === selectedSurfaceIndex ? (surface[4] ? 'pink' : 'red') : (surface[4]? 'gray' : 'black');
        drawSurface(surface);
    });

    if (selectedSurfaceIndex !== -1) {
        const surface = surfaces[selectedSurfaceIndex];
        const [startX, startY, length, facing] = surface;
        ctx.fillStyle = 'black';
        ctx.fillText(
            `Selected Surface: Start (${startX.toFixed(2)}, ${startY.toFixed(2)}), Length: ${length.toFixed(2)}, Facing: ${facing.toFixed(2)} rad`,
            10, 20
        );
    }
}

/**
 * 更新当前选中边的位置、长度和方向。
 */
function update() {
    if (selectedSurfaceIndex === -1) return;

    const surface = surfaces[selectedSurfaceIndex];

    if (keysPressed['a']) surface[0] -= 2; // 向左移动
    if (keysPressed['d']) surface[0] += 2; // 向右移动
    if (keysPressed['w']) surface[1] += 2; // 向上移动
    if (keysPressed['s']) surface[1] -= 2; // 向下移动

    if (keysPressed['ArrowDown']) surface[2] = Math.max(0, surface[2] - 2); // 减小长度
    if (keysPressed['ArrowUp']) surface[2] += 2; // 增加长度

    if (keysPressed['ArrowRight']) surface[3] += Math.PI / 90; // 顺时针旋转
    if (keysPressed['ArrowLeft']) surface[3] -= Math.PI / 90; // 逆时针旋转

    draw();
}

/**
 * 切换当前选中边的方向到最近的预设方向。
 */
function switchToNextPresetDirection() {
    if (selectedSurfaceIndex === -1) return;

    const surface = surfaces[selectedSurfaceIndex];
    const currentFacing = surface[3];

    for (let i = PRESET_DIRECTIONS.length - 1; i >= 0; i--) {
        if (currentFacing === PRESET_DIRECTIONS[i]) {
            surface[3] = PRESET_DIRECTIONS[(i + 1) % 8];
            break;
        }
        if (currentFacing > PRESET_DIRECTIONS[i]) {
            surface[3] = PRESET_DIRECTIONS[i];
            break;
        }
    }

    draw();
}

/**
 * 添加一条新边到画布上。
 */
function addSurface() {
    const newSurface = [400, 300, 100, 0, false];
    surfaces.push(newSurface);
    selectedSurfaceIndex = surfaces.length - 1;
    addToHistory({ action: 'add', surface: newSurface });
    draw();
}

/**
 * 复制一个相同的平台。
 */
function copySurface() {
    if (selectedSurfaceIndex === -1) return;

    const currentSurface = surfaces[selectedSurfaceIndex];
    surfaces.push(currentSurface.slice());
    selectedSurfaceIndex = surfaces.length - 1;
    addToHistory({ action: 'add', surface: surfaces[selectedSurfaceIndex] });
    draw();
}

/**
 * 创建一个与当前选中的平台重叠但面向相反的平台。
 */
function createOppositeSurface() {
    if (selectedSurfaceIndex === -1) return;

    const currentSurface = surfaces[selectedSurfaceIndex];
    const [startX, startY, length, facing] = currentSurface;
    const oppositeFacing = facing + Math.PI; // 计算相反的面向方向

    const newSurface = [startX + Math.cos(facing - Math.PI / 2) * length, startY + Math.sin(facing - Math.PI / 2) * length, length, oppositeFacing];
    surfaces.push(newSurface);
    selectedSurfaceIndex = surfaces.length - 1;
    addToHistory({ action: 'add', surface: newSurface });
    draw();
}

/**
 * 删除当前选中的平台。
 */
function deleteSurface() {
    if (selectedSurfaceIndex === -1) return;

    const deletedSurface = surfaces[selectedSurfaceIndex];
    surfaces.splice(selectedSurfaceIndex, 1);
    selectedSurfaceIndex = -1;
    addToHistory({ action: 'delete', surface: deletedSurface });
    draw();
}

/**
 * 切换当前边的虚化状态。
 */
function switchVirtualSurface() {
    if (selectedSurfaceIndex === -1) return;

    const currentSurface = surfaces[selectedSurfaceIndex];
    currentSurface[4] = !currentSurface[4];
    draw();
}

/**
 * 将所有边的数据以 JSON 格式复制到剪贴板。
 */
function copyToClipboard() {
    const jsonString = JSON.stringify(surfaces);
    navigator.clipboard.writeText(jsonString).then(() => {
        alert('地图数据已经拷贝到剪贴板！');
    });
}

/**
 * 将所有边的数据以 JSON 格式输出到控制台。
 */
function outputSurfaces() {
    console.log(JSON.stringify(surfaces));
}

/**
 * 添加操作到历史记录。
 * @param {Object} action - 操作描述对象
 */
function addToHistory(action) {
    history.push(action);
}

/**
 * 撤销上一步操作。
 */
function undo() {
    if (history.length === 0) return;

    const lastAction = history.pop();

    if (lastAction.action === 'add') {
        const index = surfaces.indexOf(lastAction.surface);
        if (index !== -1) {
            surfaces.splice(index, 1);
            selectedSurfaceIndex = -1;
            draw();
        }
    } else if (lastAction.action === 'delete') {
        surfaces.push(lastAction.surface);
        selectedSurfaceIndex = surfaces.length - 1;
        draw();
    }
}

/**
 * 处理键盘按下事件。
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyDown(e) {
    e.preventDefault();
    keysPressed[e.key] = true;

    if (e.key === ' ') {
        selectedSurfaceIndex = (selectedSurfaceIndex + 1) % surfaces.length;
    } else if (e.key === 'e') {
        selectedSurfaceIndex = (selectedSurfaceIndex - 1) % surfaces.length;
    }
    else if (e.key === 'Tab') {
        e.preventDefault();
        switchToNextPresetDirection();
    } else if (e.key === 'c') {
        copyToClipboard();
    } else if (e.key === 'p') {
        outputSurfaces();
    } else if (e.key === 'Enter') {
        addSurface();
    } else if (e.key === 'r') {
        deleteSurface();
    } else if (e.key === 'z' && e.ctrlKey) {
        undo();
    } else if (e.key === 'f') {
        createOppositeSurface();
    }
    else if (e.key === 'v') {
        copySurface();
    } else if (e.key === 'q') {
        switchVirtualSurface();
    }
}

/**
 * 处理键盘释放事件。
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyUp(e) {
    e.preventDefault();
    delete keysPressed[e.key];
}

/**
 * 开始编辑器功能，初始化地图编辑器。
 */
function startEditor() {
    const mapDataInput = document.getElementById('mapDataInput');
    try {
        surfaces = JSON.parse((() => {
            if (mapDataInput.value === "") return "[]";
            return mapDataInput.value;
        })());
        for (let index = 0; index < surfaces.length; index++) {
            const surface = surfaces[index];
            if (surface.length === 4) surface.push(false); 
        }
    } catch (error) {
        alert('地图语法错误！');
        return;
    }

    initializeEditor();
    document.getElementById('startEditor').style.display = 'none'; // 隐藏输入框和按钮
}
