import { DialogJSON } from "*.dialog.json";
import { asset } from "../engine/assets/Assets";
import { Sound } from "../engine/assets/Sound";
import { RGBColor } from "../engine/color/RGBColor";
import { Game } from "../engine/Game";
import { Vector2 } from "../engine/graphics/Vector2";
import { ControllerIntent } from "../engine/input/ControllerIntent";
import { Camera } from "../engine/scene/Camera";
import { FadeToBlack } from "../engine/scene/camera/FadeToBlack";
import { SceneNode } from "../engine/scene/SceneNode";
import { isDev } from "../engine/util/env";
import { clamp } from "../engine/util/math";
import { rnd } from "../engine/util/random";
import { Dialog } from "./Dialog";
import { FxManager } from "./FxManager";
import { MusicManager } from "./MusicManager";
import { CharacterNode } from "./nodes/CharacterNode";
import { CollisionNode } from "./nodes/CollisionNode";
import { LightNode } from "./nodes/LightNode";
import { NpcNode } from "./nodes/NpcNode";
import { PlayerNode } from "./nodes/PlayerNode";
import { SpawnNode } from "./nodes/SpawnNode";
import { SwitchNode } from "./nodes/SwitchNode";
import { TrainNode } from "./nodes/TrainNode";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";
import { SuccessScene } from "./scenes/SuccessScene";

export enum GameStage {
    NONE = 0,
    INTRO = 1,
    DRIVE = 2,
    BRAKE = 3,
    DIALOG = 4,
    STUCK = 5,
    RETURN = 6, // all done, returned into train,
    PRESPAWN = 7
}

export class Hyperloop extends Game {

    @asset("sounds/fx/hyperloopBrakes.ogg")
    private static brakeSound: Sound;

    @asset("sounds/loops/hyperloopDrone.ogg")
    private static droneSound: Sound;

    @asset("sounds/voice/trainAnnouncement.ogg")
    private static introSound: Sound;

    private stageStartTime = 0;
    private stageTime = 0;
    private trainSpeed = 400; // px per second
    private totalBrakeTime = 0; // calculated later; seconds train requires to brake down to standstill
    private playerTeleportLeft = 1100; // leftest point in tunnel where player is teleported
    private playerTeleportRight = 2970; // rightest point in tunnel where player is teleported
    private teleportStep = 108; // distance between two tunnel lights
    private teleportMyTrainYDistance = 50; // only teleport when player is on roughly same height as train, not in rest of level
    private dialogs: Dialog[] = [];
    private npcs: CharacterNode[] = [];
    private currentPlayerNpc = 2;
    private debug = false;

    // Game progress
    private charactersAvailable = 5;
    private gameStage = GameStage.NONE;
    public keyTaken = false; // key taken from corpse
    public fuseboxOn = false;
    private fadeOutInitiated = false;
    private trainIsReady = false; // game basically won when this is true

    // Dialog
    private dialogKeyPressed = false;
    private currentDialogLine = 0;
    private currentDialog: Dialog | null = null;

    @asset("dialog/train.dialog.json")
    private static readonly trainDialog: DialogJSON;

    @asset("dialog/train2.dialog.json")
    private static readonly train2Dialog: DialogJSON;
    @asset("dialog/train3.dialog.json")
    private static readonly train3Dialog: DialogJSON;
    @asset("dialog/train4.dialog.json")
    private static readonly train4Dialog: DialogJSON;
    @asset("dialog/train5.dialog.json")
    private static readonly train5Dialog: DialogJSON;
    @asset("dialog/train6.dialog.json")
    private static readonly train6Dialog: DialogJSON;

    public constructor() {
        super();
    }

    // Called by GameScene
    public setupScene(): void {
        this.spawnNPCs();
        this.setStage(GameStage.INTRO);
        // Assets cannot be loaded in constructor because the LoadingScene
        // is not initialized at constructor time and Assets are loaded in the LoadingScene
        this.dialogs = [
            new Dialog(Hyperloop.trainDialog),
            new Dialog(Hyperloop.train2Dialog),
            new Dialog(Hyperloop.train3Dialog),
            new Dialog(Hyperloop.train4Dialog),
            new Dialog(Hyperloop.train5Dialog),
            new Dialog(Hyperloop.train6Dialog)
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
            case GameStage.RETURN:
                this.updateReturn(dt);
                break;
            case GameStage.PRESPAWN:
                this.updatePrespawn();
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
            switch (this.gameStage) {
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
                case GameStage.RETURN:
                    break;
                case GameStage.PRESPAWN:
                    this.initPrespawn();
                    break;
            }
        }
    }

    private spawnNPCs(): void {
        const train = this.getTrain();
        const chars = [ new NpcNode(0), new NpcNode(1), new NpcNode(2), new NpcNode(3), new NpcNode(4) ];
        const positions = [ -80, -40, 24, 60, 125 ];
        for (let i = 0; i < chars.length; i++) {
            chars[i].moveTo(positions[i], -20).appendTo(train);
        }
        for (let i = 3; i < chars.length; i++) {
            chars[i].setMirrorX(true);
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

    public turnOnAllLights() {
        const lights = this.getAllLights();
        for (const light of lights) {
            light.setColor(new RGBColor(0.8, 0.8, 1));
        }
        const ambients = this.getAmbientLights();
        for (const ambient of ambients) {
            ambient.setColor(new RGBColor(0.3, 0.3, 0.35));
        }
    }

    private updateDialog(): void {
        // Any key to proceed with next line
        const pressed = this.input.currentActiveIntents ?? 0;
        const moveButtonPressed = (this.input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT) > 0
            || (this.input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT) > 0
            || (this.input.currentActiveIntents & ControllerIntent.PLAYER_JUMP) > 0
            || (this.input.currentActiveIntents & ControllerIntent.PLAYER_DROP) > 0;
        if (moveButtonPressed) {
            return;
        }
        const prevPressed = this.dialogKeyPressed;
        this.dialogKeyPressed = pressed !== 0;
        if (pressed && !prevPressed || isDev() && this.debug) {
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
        // Proceed to next stage
        if (this.stageTime > 2) {
            // Fade in
            this.setStage(GameStage.DRIVE);
            return;
        }
    }

    private updateDrive(): void {
        if (!this.currentDialog) {
            Hyperloop.droneSound.stop();
            Hyperloop.brakeSound.play();
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
        this.handleCamera(1, this.stageTime / 2);
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
            this.handleCamera(shakeIntensity, 1);
        }
    }

    private conversationEndTime = 0;
    private updateConversation(): void {
        if (!this.currentDialog) {
            if (!this.conversationEndTime) {
                this.conversationEndTime = this.getTime();
            } else {
                const p = (this.getTime() - this.conversationEndTime) / 3;
                this.handleCamera(0, 1 - p);
                if (p >= 1.3) {
                    this.setStage(GameStage.STUCK);
                }
            }
        } else {
            this.handleCamera(0, 1);
        }
    }

    private updateStuck(): void {
        let player: PlayerNode;
        try {
            player = this.getPlayer();
        } catch (e) { return; }
        // This is the main game, with gameplay and stuff
        // Ensure player doesn't reach end of tunnel
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

    private updateReturn(dt: number) {
        let train: TrainNode;
        try {
            train = this.getTrain();
        } catch (e) { return; }
        // Drive off
        if (this.stageTime > 5) {
            const progress = clamp((this.stageTime - 5.5) / 10, 0, 1);
            const speed = this.trainSpeed * progress;
            train.setX(train.getX() + speed * dt);
        }
        this.handleCamera(this.stageTime > 5 ? 1 : 0, this.stageTime / 3);
        // Driving illusion
        const pos = train.getScenePosition().x;
        if (pos > 3100) {
            train.setX(pos - this.teleportStep * 2);
        }
        // Fade out
        if (this.stageTime > 12 && !this.fadeOutInitiated) {
            this.fadeOutInitiated = true;
           this.getFader().fadeOut({ duration: 12 }).then(() => this.scenes.setScene(SuccessScene as any));
        }
    }

    private handleCamera(shakeForce = 0, toCenterForce = 1): void {
        const cam = this.getCamera();
        // Force towards center
        toCenterForce = clamp(toCenterForce, 0, 1);
        const p = 0.5 - 0.5 * Math.cos(toCenterForce * Math.PI);
        const trainX = this.getTrain().getScenePosition().x;
        const playerX = this.getPlayer().getScenePosition().x;
        const diff = playerX - trainX;
        // Shake
        const angle = rnd(Math.PI * 2);
        const distance = rnd(shakeForce) ** 3;
        const dx = distance * Math.sin(angle), dy = distance * Math.cos(angle);
        cam.transform(m => m.setTranslation(diff * p + dx, dy));
    }

    public initIntro(): void {
        // Play sound
        setTimeout(() => Hyperloop.introSound.play(), 1000);
        MusicManager.getInstance().setVolume(0.3);
        // Place player into train initially
        const player = this.getPlayer();
        const train = this.getTrain();
        player.moveTo(25, 50).appendTo(train);
        // Make him stuck
        const col = new CollisionNode({ width: 400, height: 20 });
        col.moveTo(-20, -20).appendTo(train);
        this.getFader().fadeOut({duration: 0});
    }

    public initDrive(): void {
        this.getFader().fadeIn({duration: 3});
        MusicManager.getInstance().setVolume(1);
        Hyperloop.droneSound.setVolume(0.5);
        Hyperloop.droneSound.setLoop(true);
        Hyperloop.droneSound.play();
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
        FxManager.getInstance().playSounds();
        // Power switch behavior
        const powerSwitch = this.getGameScene().getNodeById("PowerSwitch");
        if (powerSwitch && powerSwitch instanceof SwitchNode) {
            powerSwitch.setOnlyOnce(true);
            powerSwitch.setOnUpdate((state: boolean) => {
                player.say("Doesn't appear to do anything... yet", 4, 0.5);
                return false;
            });
        } else {
            throw new Error("No PowerSwitch found! Game not beatable that way :(");
        }
        // Spawn enemies at random subset of spawn points behind "first encounter"
        SpawnNode.getForTrigger(player, "after", true).forEach(s => {
            if (rnd() < 0.6) s.spawnEnemy();
        });
    }

    private updatePrespawn(): void {
        if (!this.currentDialog) {
            if (!this.conversationEndTime) {
                this.conversationEndTime = this.getTime();
                this.handleCamera(0, 1);
            } else {
                const p = (this.getTime() - this.conversationEndTime) / 3;
                this.handleCamera(0, 1 - p);
                if (p >= 1.3) {
                    this.spawnNewPlayer();
                    this.setStage(GameStage.STUCK);
                }
            }
        } else {
            this.handleCamera(0, 1);
        }
    }

    private initPrespawn(): void {
        this.startDialog(6 - this.npcs.length);
        this.getTrain().showInner();
    }

    public startRespawnSequence(): void {
        if (this.charactersAvailable > 0) {
            // Remove NPC from scene
            this.charactersAvailable--;
            const deadNpc = this.npcs.splice(this.currentPlayerNpc, 1)[0];
            if (deadNpc) {
                deadNpc.remove();
                this.currentPlayerNpc = Math.floor(Math.random() * this.npcs.length);
            }
            if (this.trainIsReady || Math.random() < 999) {
                this.spawnNewPlayer();
                return;
            }
            // Show debate sequence
            this.setStage(GameStage.PRESPAWN);
        } else {
            // Game Over or sequence of new train replacing old one
            this.scenes.setScene(GameOverScene as any);
        }
    }

    public spawnNewPlayer(): void {
        if (this.charactersAvailable > 0) {
            // If everything has been done, then player died but still won
            const player = this.getPlayer();
            const spawnPoint = this.getTrainDoorCoordinate();
            player.moveTo(spawnPoint.x, spawnPoint.y);
            player.setHitpoints(100);
            player.setAmmoToFull();
            player.reset();
            this.getCamera().setFollow(player);
            if (this.trainIsReady) {
                this.winGame();
            } else {
                // Spawn enemies at random subset of spawn points behind "first encounter"
                SpawnNode.getForTrigger(player, "after", true).forEach(s => {
                    if (rnd() < 0.25) s.spawnEnemy();
                });
                SpawnNode.getForTrigger(player, "before", true).forEach(s => {
                    if (rnd() < 0.25) s.spawnEnemy();
                });
            }
        }
    }

    public getTrainDoorCoordinate(): Vector2 {
        const coord = this.getTrain().getScenePosition();
        return new Vector2(coord.x - 170, coord.y - 2);
    }

    public turnOnFuseBox() {
        this.fuseboxOn = true;
        this.turnAllLightsRed();
        this.getCamera().setZoom(1);
        // Enable power switch
        const powerSwitch = this.getGameScene().getNodeById("PowerSwitch");
        if (powerSwitch && powerSwitch instanceof SwitchNode) {
            powerSwitch.setOnUpdate((state: boolean) => {
                this.turnOnAllLights();
                const player = this.getPlayer();
                player.say("Great. Time to go home.", 4, 1);
                // Activate game end zone
                const doorPos = this.getTrainDoorCoordinate();
                const endSwitch = new SwitchNode({
                    x: doorPos.x,
                    y: doorPos.y,
                    onlyOnce: true,
                    onUpdate: () => {
                        this.winGame();
                        return true;
                    },
                    spriteHidden: true
                });
                endSwitch.setCaption("PRESS E TO ENTER");
                player.getParent()?.appendChild(endSwitch);
                this.trainIsReady = true;
                // Spawn the enemies
                SpawnNode.getForTrigger(player, "afterSwitch", true).forEach(s => s.spawnEnemy());
                return true;
            });
        } else {
            throw new Error("No PowerSwitch found! Game not beatable that way :(");
        }
    }

    public winGame(): void {
        // Kill all enemies
        this.getPlayer().getPersonalEnemies().forEach(e => e.die());
        this.setStage(GameStage.RETURN);
        // Move player into train
        const player = this.getPlayer();
        const train = this.getTrain();
        const pos = player.getScenePosition();
        const trainPos = train.getScenePosition();
        player.moveTo(pos.x - trainPos.x, pos.y - trainPos.y);
        player.remove().appendTo(train);
        train.showInner();
        FxManager.getInstance().stop();
        MusicManager.getInstance().loopTrack(3);
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
