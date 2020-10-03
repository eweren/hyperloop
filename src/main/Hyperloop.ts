import { Game } from "../engine/Game";
import { LoadingScene } from "./scenes/LoadingScene";

export class Hyperloop extends Game {
    public constructor() {
        super();
    }
}

(async () => {
    const game = new Hyperloop();
    await game.scenes.setScene(LoadingScene);
    (window as any).game = game;
    game.start();
})();

