import { Game, GameMap, Player, Pool } from "./game.js";

function getPoolURL() {
    const url = new URL(document.URL);
    if (!url.searchParams.has("pool")) return "/pools/demo0.json";
    return url.searchParams.get("pool");
}

async function getMapSequence() {
    const url = new URL(document.URL);
    if (url.searchParams.has("map")) {
        document.getElementById("open_editor").hidden = true;
        return [GameMap.loadFromJSON(JSON.parse(window.atob(url.searchParams.get("map"))))];
    }
    return (await Pool.load(getPoolURL())).create();
}

async function main() {
    const game = window.game =new Game(document.getElementById("game"), new Player());
    game.currentMapSequence = await getMapSequence();
    game.currentMapIndex = 0;
    game.spawn();
    setInterval(game.render.bind(game), 20);
    setInterval(game.logic.bind(game), 20);
}

window.cheat = () => {
    window.game.player.maxExtraJump = -1;
};

window.addEventListener("load", main);