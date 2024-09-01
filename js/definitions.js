// @ts-check
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
        console.log(this.startX, this.startY, this.endX, this.endY);
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
        const facing = this.facing % (Math.PI * 2);
        if (facing > 0 && facing < Math.PI) return SurfaceType.Floor;
        if (facing > Math.PI && facing < 2 * Math.PI) return SurfaceType.Ceiling;
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

export class GameMap {
    /**
     * @abstract
     * @type { number }
     */
    spawnX;
    /**
     * @abstract
     * @type { number }
     */
    spawnY;
    /**
     * @type { Surface }
     */
    winSurface;
    /**
     * @abstract
     * @type { Surface[] }
     */
    surfaces;
    /**
     * @abstract
     * @return { Promise<void> | void }
     */
    load() {
        throw new Error("not implemented!");
    }
    /**
     * @abstract
     * @type { boolean }
     */
    hasNext;
    /**
     * @abstract
     * @return { Promise<GameMap?> | GameMap? }
     */
    next() {
        return null;
    }

    /**
     * @param { string } name
     * @returns { Promise<GameMap> } 
     */
    static async dynamic(name) {
        const result = new (await import(name)).default();
        await result.load();
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
     * @returns { Surface[] }
     */
    getRelevantSurfaces() {
        return this.map.surfaces.filter(surface => {
            if (surface.virtual) return false;
            if (surface.type in [SurfaceType.Ceiling, SurfaceType.Floor]) {
                return surface.leftX <= this.player.x && surface.rightX >= this.player.x;
            }
            const realY = (this.player.y - this.player.speedY);
            return surface.bottomY < realY && realY < surface.topY;
        });
    }

    /**
     * @returns { boolean }
     */
    surfaceInteractions() {
        const surfaces = this.getRelevantSurfaces();
        /**
         * @type { Surface[] }
         */
        const walls = [];
        /**
         * @type { Surface[] }
         */
        const ceilings = [];
        /**
         * @type { Surface[] }
         */
        const floors = [];
        while (true) {
            const current = surfaces.pop();
            if (!current) break;
            switch (current.type) {
                case SurfaceType.Ceiling:
                    ceilings.push(current);
                    break;
                case SurfaceType.Floor:
                    floors.push(current);
                    break;
                default:
                    walls.push(current);
            }
        }
        if (this.map.winSurface.bottomY - 10 <= this.player.y && this.map.winSurface.topY + 10 >= this.player.y && this.player.x >= this.map.winSurface.leftX - 15 && this.player.x <= this.map.winSurface.rightX + 15 && this.map.hasNext) {
            return true;
        }

        for (const floor of floors) {
            const top = floor.startY + Math.tan(floor.facing - Math.PI / 2) * this.player.x;
            if (this.player.y < top && this.player.y > top - 50) {
                this.player.y = top;
                this.player.onGround = true;
                this.player.extraJump = 1;
            }
        }

        for (const ceiling of ceilings) {
            const bottom = ceiling.startY + Math.tan(ceiling.facing - Math.PI / 2) * this.player.x;
            if (this.player.y > bottom && this.player.y < bottom + 50) {
                this.player.y = bottom;
            }
        }

        for (const wall of walls) {
            if ((wall.facing === 0 && this.player.x > wall.startX - 25 && this.player.x < wall.startX) || (wall.facing !== 0 && this.player.x < wall.startX + 25 && this.player.x > wall.startX)) {
                this.player.x = wall.startX;
            }
        }
        return false;
    }

    async logic() {
        // revive
        if (this.player.y < -100) this.spawn();

        // player horizontal movement
        if (this.keyEvents.walkingLeft) {
            this.player.x -= 10;
        }
        if (this.keyEvents.walkingRight) {
            this.player.x += 10;
        }
        // player gravity
        if (this.player.speedY > -10) this.player.speedY = Math.max(-10, this.player.speedY - 2);
        this.player.y += this.player.speedY;
        // reset onGround
        this.player.onGround = false;
        // interact with surfaces
        const won = this.surfaceInteractions();
        // player jump
        if ((this.keyEvents.jumping && (this.player.onGround || this.player.extraJump > 0))) {
            this.player.speedY = 20;
            this.keyEvents.jumping = false;
            if (!this.player.onGround) this.player.extraJump -= 1;
        }
        if (won) {
            const next = await this.map.next();
            if (!next) throw new Error("no next level!");
            this.map = next;
            this.spawn();
        }
    }

    render() {
        // rerender
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // render player
        this.context.fillStyle = "black";
        this.context.fillRect(this.player.x - 5, this.canvas.height - this.player.y, 10, -40);
        // render surfaces
        this.context.strokeStyle = "red";
        this.context.beginPath();
        this.context.moveTo(this.map.winSurface.startX, this.canvas.height - this.map.winSurface.startY);
        this.context.lineTo(this.map.winSurface.endX, this.canvas.height - this.map.winSurface.endY);
        this.context.stroke();

        this.context.strokeStyle = "black";
        for (const surface of this.map.surfaces) {
            this.context.beginPath();
            this.context.moveTo(surface.startX, this.canvas.height - surface.startY);
            this.context.lineTo(surface.endX, this.canvas.height - surface.endY);
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