import { Game, GameMap, Player, Pool } from "./game.js";

function getPoolURL() {
    const url = new URL(document.URL);
    if (!url.searchParams.has("pool")) return "/pools/demo0.json";
    return url.searchParams.get("pool");
}

async function main() {
    const game = new Game(document.getElementById("game"), new Player());
    game.currentMapSequence = (await Pool.load(getPoolURL())).create();
    game.currentMapIndex = 0;
    game.spawn();
    setInterval(game.render.bind(game), 20);
    setInterval(game.logic.bind(game), 20);
}

window.addEventListener("load", main);