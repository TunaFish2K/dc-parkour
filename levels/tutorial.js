import { GameMap, Surface } from "../js/definitions.js";

export default class TutorialMap extends GameMap {
    spawnX = 40;
    spawnY = 120;
    hasNext = true;
    winSurface = Surface.fromArray([778, 116, 80, Math.PI, false]);
    async next() {
        return await GameMap.dynamic("/levels/tutorial.js");
    }
    async load() {
        console.log(await (await fetch("/levels/tutorial.json")).text());
        this.surfaces = (await (await fetch("/levels/tutorial.json")).json()).map(Surface.fromArray);
    }
}