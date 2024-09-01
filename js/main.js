import { Game, GameMap, Player } from "./definitions.js";

async function main() {
    const game = new Game(document.getElementById("game"), new Player());
    game.map = await GameMap.dynamic("/levels/tutorial.js");
    game.spawn();
    setInterval(game.render.bind(game), 20);
    setInterval(game.logic.bind(game), 20);
}

window.addEventListener("load", main);