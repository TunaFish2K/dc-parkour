const FLOOR = 100;
const surfaces = [];

/**
 * 
 * @param { number } startX 
 * @param { number } startY 
 * @param { number } length 
 * @param { number } facing 
 * @param { boolean } virtual
 */
function addSurface(startX, startY, length, facing, virtual) {
    surfaces.push([startX, startY, length, facing, virtual]);
}

addSurface(0, 300, 800, Math.PI / 2, false);
addSurface(798, 300, 16000, Math.PI, false);
addSurface(0, 16300, 800, Math.PI / 2);

let lastCenterX = 400;
let centerX = 400;

for (let floor = 1; floor < 100; floor++) {
    const diffLeftMax = Math.min(60 * (floor ** 0.5), centerX - 100);
    const diffRightMax = Math.min(60 * (floor ** 0.5), 700 - centerX);
    const centerDiff = Math.random() * (diffRightMax + diffLeftMax) - diffLeftMax;
    lastCenterX = centerX;
    centerX += centerDiff;
    if (floor > 30 && Math.random() * (0.7 + floor ** 0.5) > 0.66) {
        const borderX = (lastCenterX + centerX) / 2;
        addSurface(borderX,floor * 160 + 140 + 20, 60, Math.PI, false);
        addSurface(borderX,floor * 160 + 140 + 80, 60, 0, false);
    }
    addSurface(centerX - 30, floor * 160 + 300, 60, Math.PI / 2, false);
    addSurface(centerX + 30, floor * 160 + 300, 60, Math.PI * 3 / 2, false);
}

console.log(JSON.stringify({
    surfaces
}));