import { Game } from "./scene/Game";
import { LoadingScene } from "./scenes/LoadingScene";

export class MyGame extends Game {
    public constructor() {
        super();
    }
}

const game = new MyGame();
game.scenes.setScene(LoadingScene);
(window as any).game = game;
game.start();
