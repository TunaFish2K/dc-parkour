import { GameMap, Surface } from "../js/definitions.js";

export default class TutorialMap extends GameMap {
    spawnX = 40;
    spawnY = 120;
    async load() {
        this.surfaces = [
            [0, 120, 100, Math.PI / 2]
        ].map(Surface.fromArray);
    }
}