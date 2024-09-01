import { GameMap, Surface } from "../js/definitions.js";

export default class TestMap extends GameMap {
    spawnX = 40;
    spawnY = 160;
    hasNext = true;
    winSurface = Surface.fromArray([778, 116, 80, Math.PI, false]);
    async next() {
        return await GameMap.dynamic("/levels/test.js");
    }
    async load() {
        this.surfaces = (await (await fetch("/levels/test.json")).json()).map(Surface.fromArray);
    }
}