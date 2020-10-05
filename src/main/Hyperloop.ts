import { DialogJSON } from "*.dialog.json";
import { asset } from "../engine/assets/Assets";
import { RGBColor } from "../engine/color/RGBColor";
import { Game } from "../engine/Game";
import { Camera } from "../engine/scene/Camera";
import { FadeToBlack } from "../engine/scene/camera/FadeToBlack";
import { SceneNode } from "../engine/scene/SceneNode";
import { rnd } from "../engine/util/random";
import { Dialog } from "./Dialog";
import { MusicManager } from "./MusicManager";
import { CharacterNode } from "./nodes/CharacterNode";
import { CollisionNode } from "./nodes/CollisionNode";
import { LightNode } from "./nodes/LightNode";
import { NpcNode } from "./nodes/NpcNode";
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
    private trainSpeed = 1000; // px per second
    private totalBrakeTime = 0; // calculated later; seconds train requires to brake down to standstill
    private playerTeleportLeft = 1100; // leftest point in tunnel where player is teleported
    private playerTeleportRight = 2970; // rightest point in tunnel where player is teleported
    private teleportStep = 108; // distance between two tunnel lights
    private teleportMyTrainYDistance = 50; // only teleport when player is on roughly same height as train, not in rest of level
    private dialogs: Dialog[] = [];
    private npcs: CharacterNode[] = [];

    // Game progress
    private charactersAvailable = 4;
    private gameStage = GameStage.NONE;
    public keyTaken = false; // key taken from corpse
    public fuseboxOn = false;

    // Dialog
    private dialogKeyPressed = false;
    private currentDialogLine = 0;
    private currentDialog: Dialog | null = null;

    @asset("dialog/train.dialog.json")
    private static readonly trainDialog: DialogJSON;

    @asset("dialog/train2.dialog.json")
    private static readonly train2Dialog: DialogJSON;

    public constructor() {
        super();
    }

    // Called by GameScene
    public setupScene(): void {
        this.spawnNPCs();
        this.setStage(GameStage.INTRO);
        // Assets cannot be loaded in constructor because the LoadingScene 
        // is not inistalized at constructor time and Assets are loaded in the LoadingScene
        this.dialogs = [
            new Dialog(Hyperloop.trainDialog),
            new Dialog(Hyperloop.train2Dialog)
        ];
    }

    public update(dt: number, time: number): void {
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
                this.updateConversation();
                break;
            case GameStage.STUCK:
                this.updateStuck();
                break;
        }
        if (this.currentDialog) {
            this.updateDialog();
        }
        super.update(dt, time);
    }

    public setStage(stage: GameStage): void {
        if (stage !== this.gameStage) {
            this.gameStage = stage;
            this.stageStartTime = this.getTime();
            switch(this.gameStage) {
                case GameStage.INTRO:
                    this.initIntro();
                    break;
                case GameStage.DRIVE:
                    this.initDrive();
                    break;
                case GameStage.BRAKE:
                    break;
                case GameStage.DIALOG:
                    this.initConversation();
                    break;
                case GameStage.STUCK:
                    this.initStuck();
                    break;
            }
        }
    }

    private spawnNPCs(): void {
        const train = this.getTrain();
        const chars = [ new NpcNode(false), new NpcNode(true), new NpcNode(true), new NpcNode(true), new NpcNode(false) ];
        const positions = [ -80, -40, 24, 60, 132 ];
        for (let i = 0; i < chars.length; i++) {
            chars[i].moveTo(positions[i], -20).appendTo(train);
        }
        this.npcs = chars;
    }

    public turnOffAllLights() {
        const lights = this.getAllLights();
        for (const light of lights) {
            light.setColor(new RGBColor(0, 0, 0));
        }
        const ambients = this.getAmbientLights();
        for (const ambient of ambients) {
            ambient.setColor(new RGBColor(0.01, 0.01, 0.01));
        }
    }

    public turnAllLightsRed() {
        const lights = this.getAllLights();
        for (const light of lights) {
            light.setColor(new RGBColor(1, 0.1, 0.08));
        }
        const ambients = this.getAmbientLights();
        for (const ambient of ambients) {
            ambient.setColor(new RGBColor(0.05, 0.03, 0.03));
        }
    }

    private updateDialog(): void {
        // Any key to proceed with next line
        const pressed = this.input.currentActiveIntents ?? 0;
        const prevPressed = this.dialogKeyPressed;
        this.dialogKeyPressed = pressed !== 0;
        if (pressed && !prevPressed) {
            this.nextDialogLine();
        }
    }

    private nextDialogLine() {
        // Shut up all characters
        this.npcs.forEach(npc => npc.say());
        this.currentDialogLine++;
        if (this.currentDialog && this.currentDialogLine >= this.currentDialog.lines.length) {
            this.currentDialog = null;
            this.currentDialogLine = 0;
        } else if (this.currentDialog) {
            // Show line
            const line = this.currentDialog.lines[this.currentDialogLine];
            const char = this.npcs[line.charNum];
            char.say(line.line, Infinity);
        }
    }

    private startDialog(num: number) {
        this.currentDialog = this.dialogs[num];
        this.currentDialogLine = -1;
        this.nextDialogLine();
    }

    private updateIntro(): void {
        // TODO have proper intro with text and/or sound to explain situation to player
        // Proceed to next stage
        if (this.stageTime > 1) {
            // Fade in
            this.setStage(GameStage.DRIVE);
            return;
        }
    }

    private updateDrive(): void {
        if (!this.currentDialog) {
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

    private updateConversation(): void {
        if (!this.currentDialog) {
            this.setStage(GameStage.STUCK);
        }
        // TODO braking sequence with extreme cam shake
    }

    private updateStuck(): void {
        // This is the main game, with gameplay and stuff
        // Ensure player doesn't reach end of tunnel
        const player = this.getPlayer();
        const pos = player.getScenePosition();
        if (Math.abs(pos.y - this.getTrain().getScenePosition().y) < this.teleportMyTrainYDistance) {
            let move = 0;
            if (pos.x < this.playerTeleportLeft) {
                move = this.teleportStep;
            } else if (pos.x > this.playerTeleportRight) {
                move = -this.teleportStep;
            }
            if (move !== 0) {
                player.setX(player.getX() + move);
            }
        }
    }

    public initIntro(): void {
        // Place player into train initially
        const player = this.getPlayer();
        const train = this.getTrain();
        player.moveTo(25, 50).appendTo(train);
        // Make him stuck
        const col = new CollisionNode({ width: 400, height: 20 });
        col.moveTo(-20, -20).appendTo(train);
    }

    public initDrive(): void {
        this.startDialog(0);
    }

    public initConversation(): void {
        this.startDialog(1);
    }

    public initStuck(): void {
        // Place player into world
        const player = this.getPlayer();
        const train = this.getTrain();
        const pos = player.getScenePosition();
        player.remove().moveTo(pos.x, pos.y).appendTo(train.getParent() as SceneNode<Hyperloop>);
        train.hideInner();
        MusicManager.getInstance().loopTrack(1);
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
        this.getCamera().transform(m => m.setTranslation(dx, dy));
    }

    public getAmbientLights(lights = this.getAllLights()): LightNode[] {
        return lights.filter(light => light.getId()?.includes("ambient"));
    }

    public getAllLights(): LightNode[] {
        return this.getGameScene().rootNode.getDescendantsByType(LightNode);
    }
}

(async () => {
    const game = new Hyperloop();
    await game.scenes.setScene(LoadingScene);
    (window as any).game = game;
    game.start();
})();
