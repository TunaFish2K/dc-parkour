// @ts-check

const PLAYER_WIDTH = 10;
const PLAYER_HEIGHT = 40;

/**
 * @enum { number }
 * @readonly
 */
export const SurfaceType = {
    Floor: 0,
    Ceiling: 1,
    Wall: 2,
    Win: 3
}



/**
 * 
 * @param { number } a 
 * @param { number } b
 * @returns { number } 
 */
function mod(a, b) {
    return ((a % b) + b) % b;
}

export class Pool {
    /**
     * @type { any[] }
     */
    values = [];
    /**
     * 
     * @param { string } url
     * @returns { Promise<Pool> } 
     */
    static async load(url) {
        const raw = await (await fetch(url, {
            "mode": "no-cors"
        })).json();
        const result = new Pool();
        for (const value of raw.values) {
            result.values.push(await (await fetch(value, {
                "mode": "no-cors"
            })).json());
        }
        return result; 
    }

    /**
     * @returns { GameMap[] }
     */
    create() {
        /**
         * @type { any[] }
         */
        let repeatPool = [];
        /**
         * @type { GameMap[] }
         */
        let result = [];
        for (let i = 0; i < 5; i++) {
            if (repeatPool.length <= 0) repeatPool = this.values.slice();
            const index = Math.floor(Math.random() * repeatPool.length);
            result.push(GameMap.loadFromJSON(repeatPool.splice(index, 1)[0])); 
        }
        // @ts-ignore
        result[0].surfaces.push(Surface.fromArray([result[0].leftX, result[0].bottomY, result[0].topY - result[0].bottomY, 0, false]));
        return result;
    }
}

export class Surface {
    /**
     * @type { number }
     */
    startX;
    /**
     * @type { number }
     */
    startY;
    /**
     * @type { number }
     */
    length;
    /**
     * @type { number } radian.
     */
    facing;
    /**
     * @type { boolean }
     */
    virtual;

    /**
     * recalculate box.
     */
    calculateBox() {
        this.endX = this.startX + Math.cos(this.facing - Math.PI / 2) * this.length;
        this.endY = this.startY + Math.sin(this.facing - Math.PI / 2) * this.length;
        if (this.endX > this.startX) {
            this.leftX = this.startX;
            this.rightX = this.endX;
        } else {
            this.leftX = this.endX;
            this.rightX = this.startX;
        }
        if (this.endY > this.startY) {
            this.bottomY = this.startY;
            this.topY = this.endY;
        } else {
            this.bottomY = this.endY;
            this.topY = this.startY;
        }
    }
    calculateType() {
        const facing = mod(this.facing, (Math.PI * 2));
        if (facing > 0 && facing < Math.PI) return SurfaceType.Floor;
        if (facing > Math.PI && facing < 2 * Math.PI) return SurfaceType.Ceiling;
        console.log(this, facing);
        return SurfaceType.Wall;
    }

    calculate() {
        this.type = this.calculateType();
        this.calculateBox();
    }

    /**
     * @type { SurfaceType }
     */
    type;
    /**
     * @type { number }
     */
    endX;
    /**
     * @type { number }
     */
    endY;
    /**
     * @type { number }
     */
    leftX;
    /**
     * @type { number }
     */
    bottomY;
    /**
     * @type { number }
     */
    rightX;
    /**
     * @type { number }
     */
    topY;

    /**
     * @param { [number, number, number, number, boolean] } array 
     * @returns { Surface }
     */
    static fromArray(array) {
        const [startX, startY, length, facing, virtual] = array;
        const result = new Surface();
        result.startX = startX;
        result.startY = startY;
        result.length = length;
        result.facing = facing;
        result.virtual = virtual;
        result.calculate();
        return result;
    }
}

export class GameObject {
    /**
     * @abstract
     * @type { number }
     */
    width;
    /**
     * @abstract
     * @type { number }
     */
    height;
    /**
     * @type { number }
     */
    x = 0;
    /**
     * @type { number }
     */
    y = 0;
    /**
     * @abstract
     * @param { Game } game 
     */
    tick(game) {

    }

    /**
     * @abstract
     * @param { Game } game 
     */
    collide(game) {

    }

    /**
     * @type { Map<string, typeof GameObject> }
     */
    static objectRegistry = new Map();
    /**
     * @param { string } name
     * @param { typeof GameObject } object 
     */
    static register(name, object) {
        this.objectRegistry.set(name, object);
    }

    /**
     * 
     * @param { string } name
     * @returns { typeof GameObject } 
     */
    static get(name) {
        // @ts-ignore
        return this.objectRegistry.get(name);
    }
}

export class GameMap {
    /**
     * @type { Surface[] }
     */
    surfaces;
    /**
     * @type { number }
     */
    spawnX;
    /**
     * @type { number }
     */
    spawnY;
    /**
     * @type { number }
     */
    endpointX;
    /**
     * @type { number }
     */
    endpointY;
    /**
     * @type { GameObject }
     */
    objects;

    /**
     * @param { string } url 
     * @returns { Promise<GameMap> }
     */
    static async load(url) {
        const obj = await (await fetch(url, {
            "mode": "no-cors"
        })).json();
        return this.loadFromJSON(obj);
    }

    /**
     * @param { any } obj 
     * @returns { GameMap }
     */
    static loadFromJSON(obj) {
        const result = new GameMap();
        result.surfaces = obj.surfaces.map(Surface.fromArray);
        result.calculateBox();
        return result;
    }

    /**
     * @type { number }
     */
    leftX = 0;
    /**
     * @type { number }
     */
    rightX = 0;
    /**
     * @type { number }
     */
    bottomY = 0;
    /**
     * @type { number }
     */
    topY = 0;
    calculateBox() {
        for (const surface of this.surfaces) {
            if (surface.virtual) continue;
            this.leftX = Math.min(this.leftX, surface.leftX);
            this.rightX = Math.max(this.rightX, surface.rightX);
            this.bottomY = Math.min(this.bottomY, surface.bottomY);
            this.topY = Math.max(this.topY, surface.topY);
        }
    }
}

export class Player {
    /**
     * @type { number }
     */
    x = 0;
    /**
     * @type { number }
     */
    y = 0;
    /**
     * @type { number }
     */
    speedX = 0;
    /**
     * @type { number }
     */
    speedY = 0;
    /**
     * @type { boolean }
     */
    onGround = false;
    /**
     * @type { number }
     */
    extraJump = 0;
}

export class Game {
    /**
     * @type { boolean }
     */
    active = true;
    /**
     * @type { HTMLCanvasElement }
     */
    canvas;
    /**
     * @type { CanvasRenderingContext2D }
     */
    context;
    /**
     * @type { number }
     */
    cameraX;
    /**
     * @type { number }
     */
    cameraY;
    /**
     * @type { GameMap[] }
     */
    currentMapSequence;
    /**
     * @type { number }
     */
    currentMapIndex;
    /**
     * @returns { GameMap }
     */
    get map() {
        return this.currentMapSequence[this.currentMapIndex];
    }
    /**
     * @type { boolean }
     */
    running = false;
    /**
     * @type { Player }
     */
    player;
    /**
     * @type { KeyEvents }
     */
    keyEvents;
    /**
     * @type { boolean }
     */
    DEBUG = true;

    /**
     * 
     * @param { HTMLCanvasElement } canvas 
     * @param { Player } player 
     */
    constructor(canvas, player) {
        this.canvas = canvas;
        // @ts-ignore
        this.context = canvas.getContext("2d");
        this.player = player;
        this.keyEvents = listenKeyboard();
    }

    /**
     * @returns { {floors: Surface[]; ceilings: Surface[]; walls: Surface[];} }
     */
    getRelevantSurfaces() {
        /**
         * @type { {floors: Surface[]; ceilings: Surface[]; walls: Surface[];} }
         */
        const result = {
            floors: [],
            ceilings: [],
            walls: []
        };
        for (const surface of this.map.surfaces.filter(surface => !surface.virtual)/*.filter(surface => {
            if (surface.type in [SurfaceType.Ceiling, SurfaceType.Floor]) {
                return surface.leftX < this.player.x && surface.rightX > this.player.x;
            }
            const realY = (this.player.y - this.player.speedY);
            return surface.bottomY < realY && realY < surface.topY;
        })*/) {
            if (surface.type === SurfaceType.Floor) {
                result.floors.push(surface);
            } else if (surface.type === SurfaceType.Ceiling) {
                result.ceilings.push(surface);
            } else {
                result.walls.push(surface);
            }
        }
        return result;
    }

    movement() {
        const { floors, ceilings, walls } = this.getRelevantSurfaces();
        let nextX = this.player.x + this.player.speedX;
        let nextY = this.player.y + this.player.speedY;
        for (const surface of walls) {
            if (this.player.x > surface.rightX && nextX > surface.rightX) continue;
            if (this.player.x < surface.leftX && nextX < surface.leftX) continue;
            if (this.player.y > surface.topY && nextY > surface.topY) continue;
            if (this.player.y < surface.bottomY && nextY < surface.bottomY) continue;

            if (mod(surface.facing, (Math.PI * 2)) === 0 && nextX < surface.leftX) { // 不许往右
                nextX = surface.leftX + 1;
            }
            if (mod(surface.facing, (Math.PI * 2)) !== 0 && nextX > surface.leftX) { // 不许往左
                nextX = surface.leftX - 1;
            }
        }
        for (const surface of floors) {
            if (this.player.x > surface.rightX && nextX > surface.rightX) continue;
            if (this.player.x < surface.leftX && nextX < surface.leftX) continue;
            if (this.player.y > surface.topY && nextY > surface.topY) continue;
            if (this.player.y < surface.bottomY && nextY < surface.bottomY) continue;

            const curTop = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (this.player.x - surface.startX)
            const nextTop = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (nextX - surface.startX);

            if (this.player.y > curTop && nextY <= nextTop) {
                nextY = nextTop + 1;
                this.player.onGround = true;
                this.player.extraJump = 1;
            }
        }
        for (const surface of ceilings) {
            if (this.player.x > surface.rightX && nextX > surface.rightX) continue;
            if (this.player.x < surface.leftX && nextX < surface.leftX) continue;
            if (this.player.y + PLAYER_HEIGHT > surface.topY && nextY + PLAYER_HEIGHT > surface.topY) continue;
            if (this.player.y + PLAYER_HEIGHT < surface.bottomY && nextY + PLAYER_HEIGHT < surface.bottomY) continue;

            const curBottom = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (this.player.x - surface.startX)
            const nextBottom = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (nextX - surface.startX);
            if (this.player.y + PLAYER_HEIGHT < curBottom && nextY + PLAYER_HEIGHT >= nextBottom) {
                nextY = nextBottom - 1 - PLAYER_HEIGHT;
            }
            else if (nextY + PLAYER_HEIGHT > curBottom && nextY <= nextBottom) {
                if (this.player.x >= surface.rightX) {
                    nextX = surface.rightX + 1;
                }
                else {
                    nextX = surface.leftX - 1;
                }
            }
        }
        this.player.x = nextX;
        this.player.y = nextY;
    }

    logic() {
        if (!this.active) return;
        if (this.player.y < -50) this.spawn();
        if (this.player.x < this.map.leftX) {
            if (this.currentMapIndex > 0) {
                this.currentMapIndex--;
                this.back();
                return;
            }
        }
        if (this.player.x > this.map.rightX) {
            if (this.currentMapIndex >= 4) {
                alert("恭喜通关!");
                this.active = false;
            }
            this.currentMapIndex++;
            this.next();
            return;
        }
        this.player.onGround = false;
        if (this.keyEvents.walkingLeft && !this.keyEvents.walkingRight) {
            this.player.speedX = -10;
        }
        else if (this.keyEvents.walkingRight && !this.keyEvents.walkingLeft) {
            this.player.speedX = 10;
        }
        else {
            this.player.speedX = 0;
        }
        this.movement();
        this.player.speedY = Math.max(-10, this.player.speedY - 1.5);
        if (this.keyEvents.jumping) {
            this.keyEvents.jumping = false;
            if (this.player.onGround || this.player.extraJump > 0) {
                if (!this.player.onGround) this.player.extraJump--;
                this.player.speedY = 20;
            }
        }
    }

    render() {
        if (!this.active) return;
        // rerender
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        [this.cameraX, this.cameraY] = [this.player.x, this.player.y];
        if (this.map.rightX - this.map.leftX > this.canvas.width) {
            if (this.cameraX - this.canvas.width / 2 < this.map.leftX) {
                this.cameraX = this.map.leftX + this.canvas.width / 2;
            }

            if (this.cameraX + this.canvas.width / 2 > this.map.rightX) {
                this.cameraX = this.map.rightX - this.canvas.width / 2;
            }
        } else {
            this.cameraX = this.canvas.width / 2;
        }
        if (this.map.topY - this.map.bottomY > this.canvas.height) {
            if (this.cameraY - this.canvas.height / 2 < this.map.bottomY) {
                this.cameraY = this.map.bottomY + this.canvas.height / 2;
            }

            if (this.cameraY + this.canvas.height / 2 > this.map.topY) {
                this.cameraY = this.map.topY - this.canvas.height / 2;
            }
        } else {
            this.cameraY = this.canvas.height / 2;
        }
        // render player
        this.context.fillStyle = "black";
        this.context.fillRect(this.player.x - this.cameraX + this.canvas.width / 2 - PLAYER_WIDTH / 2, (this.canvas.height - this.player.y) + this.cameraY - this.canvas.height / 2, PLAYER_WIDTH, -PLAYER_HEIGHT);
        // render surfaces
        this.context.strokeStyle = "black";
        for (const surface of this.map.surfaces) {
            this.context.beginPath();
            this.context.moveTo(surface.startX - this.cameraX + this.canvas.width / 2, this.canvas.height - (surface.startY - this.cameraY) - this.canvas.height / 2);
            this.context.lineTo(surface.endX - this.cameraX + this.canvas.width / 2, this.canvas.height - (surface.endY - this.cameraY) - this.canvas.height / 2);
            this.context.stroke();
        }
        // debug
        if (this.DEBUG) {
            this.renderDebug();
        }
    }

    /**
     * @type { number }
     */
    mouseX = 0;
    /**
     * @type { number }
     */
    mouseY = 0;
    /**
     * @type { boolean }
     */
    getMousePositionStarted = false;
    renderDebug() {
        if (!this.getMousePositionStarted) {
            document.addEventListener("mousemove", (ev) => {
                const { left, top } = this.canvas.getBoundingClientRect();
                this.mouseX = ev.clientX - left;
                this.mouseY = ev.clientY - top;
            });
            this.getMousePositionStarted = true;
        }

        this.context.fillStyle = "black";
        this.context.font = "20px Arial";
        this.context.textAlign = "center";
        this.context.textBaseline = "top";
        this.context.fillText(`mouse: ${this.mouseX + this.cameraX - this.canvas.width / 2} ${this.canvas.height - this.mouseY + this.cameraY - this.canvas.height / 2}`, this.canvas.width / 2, 0);
        this.context.fillText(`player: ${this.player.x} ${this.player.y}`, this.canvas.width / 2, 25);
        this.context.fillText(`camera: ${this.cameraX} ${this.cameraY}`, this.canvas.width / 2, 50);
        this.context.fillText(`level: ${this.currentMapIndex}`, this.canvas.width / 2, 75);
    }

    next() {
        this.player.x = this.map.leftX;
    }

    back() {
        this.player.x = this.map.rightX;
    }

    spawn() {
        this.player.x = this.map.leftX + 20;
        this.player.y = 300;
    }
}

/**
 * @typedef { { walkingLeft: boolean; walkingRight: boolean; jumping: boolean; } } KeyEvents
 */

/**
 * 
 * @returns { KeyEvents }
 */
function listenKeyboard() {
    /**
     * @type { KeyEvents }
     */
    const keyEvents = {
        walkingLeft: false,
        walkingRight: false,
        jumping: false
    };
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "a") keyEvents.walkingLeft = true;
        if (ev.key === "d") keyEvents.walkingRight = true;
        if (ev.key === "w") keyEvents.jumping = true;
    });
    document.addEventListener("keyup", (ev) => {
        if (ev.key === "a") keyEvents.walkingLeft = false;
        if (ev.key === "d") keyEvents.walkingRight = false;
        if (ev.key === "w") keyEvents.jumping = false;
    });
    return keyEvents;
}