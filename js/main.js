import { Game, GameMap, Player } from "./game.js";

function getMapURL() {
    const url = new URL(document.URL);
    if (!url.searchParams.has("level")) return "/levels/tutorial.json";
    return `/levels/${url.searchParams.get("level")}.json`;
}

async function main() {
    const game = new Game(document.getElementById("game"), new Player());
    game.map = await GameMap.load(getMapURL());
    game.spawn();
    setInterval(game.render.bind(game), 20);
    setInterval(game.logic.bind(game), 20);
}

window.addEventListener("load", main);