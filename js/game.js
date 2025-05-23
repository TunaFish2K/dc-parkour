// @ts-check

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;

const PLAYER_BORDER_WIDTH = 5;

const PLAYER_ASPEED_X = 1;
const PLAYER_STOP_ASPEED_X = 2;
const PLAYER_STOP_ASPEED_Y = 1.3;

const PLAYER_SPEED_CAP_X = 10;

const JUMP_SPEED = 20;

const BOUNCE_YSPEED = 25;
const BOUNCE_XSPEED = 10;
const BOUNCE_CAP = 3;

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
            result.values[result.values.length - 1].name = value;
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
        result.push(GameMap.loadFromJSON(this.values[0]));
        for (let i = 0; i < 5; i++) {
            if (repeatPool.length <= 0) repeatPool = this.values.slice();
            const index = Math.floor(Math.random() * repeatPool.length);
            const obj = repeatPool.splice(index, 1)[0]
            result.push(GameMap.loadFromJSON(obj));
            result[result.length - 1].name = obj.name;
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
     * @type { string }
     */
    name;
    /**
     * @type { Surface[] }
     */
    surfaces;
    /**
     * @type { string[] }
     */
    features;
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
        const result = this.loadFromJSON(obj);
        result.name = url;
        return result;
    }

    /**
     * @param { any } obj 
     * @returns { GameMap }
     */
    static loadFromJSON(obj) {
        const result = new GameMap();
        result.surfaces = obj.surfaces.map(Surface.fromArray);
        result.features = obj.features ?? [];
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
    /**
     * @type { number }
     */
    bounceTime = 0;
    /**
     * @type { number }
     */
    maxExtraJump = 1;
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

    /**
     * if Date.now() is after, you can't wall jump.
     * @type { number }
     */
    wallJumpCountdown = 0;
    /**
     * @type { Surface | undefined }
     */
    surfaceCollided;

    movement() {
        const { floors, ceilings, walls } = this.getRelevantSurfaces();
        let nextX = this.player.x + this.player.speedX;
        let nextY = this.player.y + this.player.speedY;

        if (nextX <= this.map.leftX) nextX = this.map.leftX + 1;

        for (const surface of walls) {
            if (this.player.x > surface.rightX && nextX > surface.rightX) continue;
            if (this.player.x < surface.leftX && nextX < surface.leftX) continue;
            if (this.player.y > surface.topY && nextY + PLAYER_HEIGHT > surface.topY) continue;
            if (this.player.y < surface.bottomY && nextY + PLAYER_HEIGHT < surface.bottomY) continue;

            if (mod(surface.facing, (Math.PI * 2)) === 0 && this.player.x > surface.leftX && nextX <= surface.leftX) { // 不许往左
                nextX = surface.leftX + 1;
                this.wallJumpCountdown = Date.now() + 100;
                this.surfaceCollided = surface;
            }
            if (mod(surface.facing, (Math.PI * 2)) !== 0 && this.player.x < surface.leftX && nextX >= surface.leftX) { // 不许往右
                nextX = surface.leftX - 1;
                this.wallJumpCountdown = Date.now() + 100;
                this.surfaceCollided = surface;
            }
        }
        for (const surface of floors) {
            if (this.player.x > surface.rightX + PLAYER_WIDTH / 2 && nextX > surface.rightX  + PLAYER_WIDTH / 2) continue;
            if (this.player.x < surface.leftX - PLAYER_WIDTH / 2 && nextX < surface.leftX - PLAYER_WIDTH / 2) continue;
            if (this.player.y > surface.topY && nextY > surface.topY) continue;
            if (this.player.y < surface.bottomY && nextY < surface.bottomY) continue;

            const curTop = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (this.player.x - surface.startX)
            const nextTop = surface.startY + Math.tan(surface.facing - Math.PI / 2) * (nextX - surface.startX);

            if (this.player.y > curTop && nextY <= nextTop) {
                nextY = nextTop + 1;
                this.player.onGround = true;
                this.player.extraJump = this.player.maxExtraJump;
                this.player.bounceTime = BOUNCE_CAP;
            }
        }
        for (const surface of ceilings) {
            if (this.player.x > surface.rightX + PLAYER_WIDTH / 2 && nextX > surface.rightX + PLAYER_WIDTH / 2) continue;
            if (this.player.x < surface.leftX - PLAYER_WIDTH / 2 && nextX < surface.leftX - PLAYER_WIDTH / 2) continue;
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

        if (this.currentMapIndex >= this.currentMapSequence.length) {
            alert("恭喜通关!");
            this.active = false;
            return;
        }

        if (this.player.y < this.map.bottomY - 40) this.spawn();
        if (this.player.x > this.map.rightX) {
            this.currentMapIndex++;
            this.next();
            return;
        }
        this.player.onGround = false;
        if (this.keyEvents.walkingLeft && !this.keyEvents.walkingRight) {
            if (this.player.speedX > -PLAYER_SPEED_CAP_X) {
                this.player.speedX = Math.max(-PLAYER_SPEED_CAP_X, this.player.speedX - PLAYER_ASPEED_X);
            }
        }
        else if (this.keyEvents.walkingRight && !this.keyEvents.walkingLeft) {
            if (this.player.speedX < PLAYER_SPEED_CAP_X) {
                this.player.speedX = Math.min(PLAYER_SPEED_CAP_X, this.player.speedX + PLAYER_ASPEED_X);
            }
        }
        else {
            if (this.player.speedX > 0) {
                this.player.speedX = Math.max(0, this.player.speedX - PLAYER_STOP_ASPEED_X);
            } else if (this.player.speedX < 0) {
                this.player.speedX = Math.min(0, this.player.speedX + PLAYER_STOP_ASPEED_X);
            }
        }
        this.movement();
        this.player.speedY = Math.max(-10, this.player.speedY - PLAYER_STOP_ASPEED_Y);
        if (this.keyEvents.jumping) {
            this.keyEvents.jumping = false;
            const canWallJump = this.wallJumpCountdown >= Date.now();
            if (this.player.onGround || this.player.extraJump > 0 || this.player.extraJump === -1 || canWallJump) {
                if (canWallJump && this.player.bounceTime > 0) {
                    this.player.extraJump = this.player.maxExtraJump;
                }


                if (this.surfaceCollided && this.player.bounceTime > 0) {
                    console.log(this.surfaceCollided.facing);
                    const multiplexer = 1 + Math.log(this.player.speedX ** 2 + this.player.speedY ** 2) / Math.log(BOUNCE_YSPEED ** 2 + PLAYER_SPEED_CAP_X ** 2) / 2;

                    this.player.speedX = Math.cos(this.surfaceCollided.facing) * BOUNCE_XSPEED * multiplexer;
                    this.player.speedY = BOUNCE_YSPEED;
                    this.player.bounceTime -= 1;
                }

                else if (this.player.onGround || this.player.extraJump > 0) {
                    this.player.speedY = JUMP_SPEED;
                    if (!this.player.onGround) this.player.extraJump -= 1;
                }

                this.surfaceCollided = undefined;
            }
        }
    }

    render() {
        if (!this.active) return;
        // rerender
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        [this.cameraX, this.cameraY] = [this.player.x, this.player.y];
        if (this.map.features.indexOf("fucking_camera") !== -1) {
            this.cameraY += 180;
        }
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
        if (this.map.features.indexOf("no_y_border_align") === -1) {
            if (this.map.topY - this.map.bottomY > this.canvas.height) {
                if (this.cameraY - this.canvas.height / 2 < this.map.bottomY) {
                    this.cameraY = this.map.bottomY + this.canvas.height / 2;
                }

            } else {
                this.cameraY = this.canvas.height / 2;
            }
        }

        // render surfaces
        this.context.strokeStyle = "black";
        for (const surface of this.map.surfaces) {
            this.context.beginPath();
            this.context.moveTo(surface.startX - this.cameraX + this.canvas.width / 2, this.canvas.height - (surface.startY - this.cameraY) - this.canvas.height / 2);
            this.context.lineTo(surface.endX - this.cameraX + this.canvas.width / 2, this.canvas.height - (surface.endY - this.cameraY) - this.canvas.height / 2);
            this.context.stroke();
        }

                // render player
                const centerX = this.player.x - this.cameraX + this.canvas.width / 2;
                const centerY = (this.canvas.height - this.player.y) + this.cameraY - this.canvas.height / 2;
        
                // border
                this.context.fillStyle = "blue";
                this.context.fillRect(centerX - PLAYER_WIDTH / 2 - PLAYER_BORDER_WIDTH, centerY + PLAYER_BORDER_WIDTH, PLAYER_WIDTH + 2 * PLAYER_BORDER_WIDTH, -PLAYER_HEIGHT - 2 * PLAYER_BORDER_WIDTH)
        
                // base
                this.context.fillStyle = "black";
                this.context.fillRect(centerX - PLAYER_WIDTH / 2, centerY, PLAYER_WIDTH, -PLAYER_HEIGHT);
        
                // can jump
                this.context.fillStyle = this.player.onGround || this.player.extraJump > 0 ? "green" : "red";
                this.context.fillRect(centerX - PLAYER_WIDTH / 2, centerY - PLAYER_HEIGHT, PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2);
        
                // wall tireness
                this.context.fillStyle = this.player.bounceTime > 0 ? "yellow" : "pink";
                this.context.fillRect(centerX, centerY - PLAYER_HEIGHT, PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2);
        
                // render player ends

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
        this.context.fillText(`mouse: ${(this.mouseX + this.cameraX - this.canvas.width / 2).toFixed(1)} ${(this.canvas.height - this.mouseY + this.cameraY - this.canvas.height / 2).toFixed(1)}`, this.canvas.width / 2, 0);
        this.context.fillText(`player: ${this.player.x.toFixed(1)} ${this.player.y.toFixed(1)}`, this.canvas.width / 2, 25);
        this.context.fillText(`camera: ${this.cameraX.toFixed(1)} ${this.cameraY.toFixed(1)}`, this.canvas.width / 2, 50);
        this.context.fillText(`speed: ${this.player.speedX.toFixed(1)} ${this.player.speedY.toFixed(1)}`, this.canvas.width / 2, 75);
        this.context.fillText(`level: ${this.currentMapIndex}`, this.canvas.width / 2, 100);
    }

    next() {
        this.spawn();
    }

    back() {
        this.player.x = this.map.rightX;
    }

    spawn() {
        console.log(this.map.name);
        this.player.x = this.map.leftX + 20;
        if (this.map.features.indexOf("spawn_offset_x+") !== -1) this.player.x += 100;
        this.player.y = 301;
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