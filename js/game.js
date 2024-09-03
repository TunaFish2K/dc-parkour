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
        const obj = await (await fetch(url)).json();
        const result = new GameMap();
        result.surfaces = obj.surfaces.map(Surface.fromArray);
        [result.spawnX, result.spawnY] = obj.spawn;
        [result.endpointX, result.endpointY] = obj.endpoint;
        return result;
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
     * @type { HTMLCanvasElement }
     */
    canvas;
    /**
     * @type { CanvasRenderingContext2D }
     */
    context;
    /**
     * @type { GameMap }
     */
    map;
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

            const top = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (nextX - surface.startX);

            if (nextY < top) {
                nextY = top;
                this.player.onGround = true;
                this.player.extraJump = 1;
                if (this.DEBUG) {
                    this.context.fillStyle = "#00FFFF77";
                    this.context.fillRect(nextX - 5, 600 - nextY - 5, 10, 10);
                }
            }
        }
        for (const surface of ceilings) {
            if (this.player.x > surface.rightX && nextX > surface.rightX) continue;
            if (this.player.x < surface.leftX && nextX < surface.leftX) continue;
            if (this.player.y > surface.topY && nextY > surface.topY) continue;
            if (this.player.y < surface.bottomY && nextY < surface.bottomY) continue;

            const bottom = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (nextX - surface.startX);
            if (nextY > bottom) {
                nextY = bottom;
                if (this.DEBUG) {
                    this.context.fillStyle = "#FF000077";
                    this.context.fillRect(nextX - 5, 600 - nextY - 5, 10, 10);
                }
            }
        }
        this.player.x = nextX;
        this.player.y = nextY;
    }

    logic() {
        if (this.player.y < -50) this.spawn();
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
        // rerender
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        let [cameraX, cameraY] = [this.player.x, this.player.y];
        // render player
        this.context.fillStyle = "black";
        this.context.fillRect(this.canvas.width / 2 - PLAYER_WIDTH / 2, this.canvas.height / 2 - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT);
        // render surfaces
        this.context.strokeStyle = "black";
        for (const surface of this.map.surfaces) {
            this.context.beginPath();
            this.context.moveTo(surface.startX - cameraX, this.canvas.height - (surface.startY - cameraY));
            this.context.lineTo(surface.endX - cameraX, this.canvas.height - (surface.endY - cameraY));
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
        this.context.fillText(`mouse: ${this.mouseX} ${this.canvas.height - this.mouseY}`, this.canvas.width / 2, 0);
        this.context.fillText(`player: ${this.player.x} ${this.player.y}`, this.canvas.width / 2, 25);
    }

    spawn() {
        this.player.x = this.map.spawnX;
        this.player.y = this.map.spawnY;
        this.player.speedY = 0;
        console.log("spawn");
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