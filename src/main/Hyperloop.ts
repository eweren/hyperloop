import { Game } from "../engine/Game";
import { Camera } from "../engine/scene/Camera";
import { FadeToBlack } from "../engine/scene/camera/FadeToBlack";
import { SceneNode } from "../engine/scene/SceneNode";
import { rnd } from "../engine/util/random";
import { CollisionNode } from "./nodes/CollisionNode";
import { PlayerNode } from "./nodes/PlayerNode";
import { TrainNode } from "./nodes/TrainNode";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";

export enum GameStage {
    NONE = 0,
    INTRO = 1,
    DRIVE = 2,
    BRAKE = 3,
    DIALOG = 4,
    STUCK = 5
}

export class Hyperloop extends Game {
    private stageStartTime = 0;
    private stageTime = 0;
    private trainSpeed = 800; // px per second
    private trainDriveTime = 2; // drive time in seconds, bevore braking starts
    private totalBrakeTime = 0; // calculated later; seconds train requires to brake down to standstill

    // Game progress
    private charactersAvailable = 4;
    private gameStage = GameStage.NONE;
    public keyTaken = false; // key taken from corpse

    public constructor() {
        super();
        setTimeout(() => {
            this.getFader().fadeOut({ duration: 0.001 });
            this.setStage(GameStage.INTRO);
        }, 2000);
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.stageTime = time - this.stageStartTime;
        switch (this.gameStage) {
            case GameStage.INTRO:
                this.updateIntro();
                break;
            case GameStage.DRIVE:
                this.updateDrive();
                break;
            case GameStage.BRAKE:
                this.updateBrake(dt);
                break;
            case GameStage.DIALOG:
                this.updateDialog();
                break;
            case GameStage.STUCK:
                this.updateStuck();
                break;
        }
    }

    public setStage(stage: GameStage): void {
        if (stage !== this.gameStage) {
            this.gameStage = stage;
            this.stageStartTime = this.getTime();
            switch(this.gameStage) {
                case GameStage.INTRO:
                    this.initIntro();
                    break;
                case GameStage.STUCK:
                    this.initStuck();
                    break;
            }
        }
    }

    private updateIntro(): void {
        // TODO have proper intro with text and/or sound to explain situation to player
        // Proceed to next stage
        if (this.stageTime > 1) {
            // Fade in
            this.getFader().fadeIn({ duration: 1     });
            this.setStage(GameStage.DRIVE);
            return;
        }
    }

    private updateDrive(): void {
        if (this.stageTime > this.trainDriveTime) {
            this.setStage(GameStage.BRAKE);
            // Compute total break time so that train ends up in desired position
            const train = this.getTrain();
            const targetX = 1800;
            const distance = targetX - train.getScenePosition().x;
            this.totalBrakeTime = distance / (this.trainSpeed / 2);
            return;
        }
        // Driving illusion
        const train = this.getTrain();
        const offsetX = this.getTime() * this.trainSpeed;
        train.setX(450 + (offsetX % 324)); // 108px between two tunnel lights
        this.getCamera().update(0);
        this.applyCamShake(1);
    }

    private updateBrake(dt: number): void {
        const progress = this.stageTime / this.totalBrakeTime;
        if (progress >= 1.1) {
            this.setStage(GameStage.DIALOG);
        } else if (progress < 1) {
            const speed = this.trainSpeed * (1 - progress);
            const train = this.getTrain();
            train.setX(train.getX() + speed * dt);
            const shakeIntensity = 1 - progress + Math.sin(Math.PI * progress) * 2;
            this.applyCamShake(shakeIntensity);
        }
    }

    private updateDialog(): void {
        this.setStage(GameStage.STUCK);
        // TODO braking sequence with extreme cam shake
    }

    private updateStuck(): void {
        // This is the main game, with gameplay and stuff; happens automatically in other node update methods
        // nothing to do for us
    }

    public initIntro(): void {
        // Place player into train initially
        const player = this.getPlayer();
        const train = this.getTrain();
        player.moveTo(0, 50).appendTo(train);
        // Make him stuck
        const col = new CollisionNode({ width: 20, height: 20 });
        col.moveTo(-10, 40).appendTo(train);
    }

    public initStuck(): void {
        // Place player into world
        const player = this.getPlayer();
        const train = this.getTrain();
        const pos = player.getScenePosition();
        player.remove().moveTo(pos.x, pos.y).appendTo(train.getParent() as SceneNode<Hyperloop>);
    }

    public spawnNewPlayer(): void {
        if (this.charactersAvailable > 0) {
            this.charactersAvailable--;
            // TODO get proper spawn position
            const oldPlayer = this.getPlayer();
            const spawnPoint = this.getTrain().getScenePosition();
            const pl = new PlayerNode();
            pl.moveTo(spawnPoint.x, spawnPoint.y - 10);
            this.getCamera().setFollow(pl);
            const root = this.getGameScene().rootNode;
            root.appendChild(pl);
            oldPlayer.remove();
            // TODO leave remains of old player
        } else {
            // Game Over or sequence of new train replacing old one
        }
    }

    public getPlayer(): PlayerNode {
        return this.getGameScene().rootNode.getDescendantsByType(PlayerNode)[0];
    }

    public getTrain(): TrainNode {
        return this.getGameScene().rootNode.getDescendantsByType(TrainNode)[0];
    }

    public getGameScene(): GameScene {
        const scene = this.scenes.getScene(GameScene);
        if (!scene) {
            throw new Error("GameScene not available");
        }
        return scene;
    }

    public getFader(): FadeToBlack {
        return this.getCamera().fadeToBlack;
    }

    public getCamera(): Camera {
        return this.getGameScene().camera;
    }

    public applyCamShake(force = 1): void {
        const angle = rnd(Math.PI * 2);
        const distance = rnd(force) ** 3;
        const dx = distance * Math.sin(angle), dy = distance * Math.cos(angle);
        this.getCamera().moveBy(dx, dy);
    }
}

(async () => {
    const game = new Hyperloop();
    await game.scenes.setScene(LoadingScene);
    (window as any).game = game;
    game.start();
})();
