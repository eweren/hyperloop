import { Game } from "../engine/Game";
import { PlayerNode } from "./nodes/PlayerNode";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";

export class Hyperloop extends Game {
    private charactersAvailable = 4;

    public constructor() {
        super();
    }

    public spawnNewPlayer(): void {
        if (this.charactersAvailable > 0) {
            this.charactersAvailable--;
            // TODO get proper spawn position
            const oldPlayer = this.getPlayer();
            const spawnPoint = oldPlayer.getScenePosition();
            const pl = new PlayerNode();
            pl.moveTo(spawnPoint.x, spawnPoint.y);
            const root = this.getGameScene().rootNode;
            root.appendChild(pl);
            oldPlayer.remove();
            // TODO leave remains of old player
        } else {
            // Game Over or sequence of new train replacing old one
        }
    }

    public getPlayer(): PlayerNode {
        const scene = this.getGameScene();
        const player = scene.rootNode.getDescendantsByType(PlayerNode)[0];
        return player;
    }

    public getGameScene(): GameScene {
        const scene = this.scenes.getScene(GameScene);
        if (!scene) {
            throw new Error("GameScene not available");
        }
        return scene;
    }
}

(async () => {
    const game = new Hyperloop();
    await game.scenes.setScene(LoadingScene);
    (window as any).game = game;
    game.start();
})();
