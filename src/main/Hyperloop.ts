import { asset } from "../engine/assets/Assets";
import { Sound } from "../engine/assets/Sound";
import { RGBColor } from "../engine/color/RGBColor";
import { Game, UserEvent } from "../engine/Game";
import { Vector2 } from "../engine/graphics/Vector2";
import { ControllerFamily } from "../engine/input/ControllerFamily";
import { ControllerIntent } from "../engine/input/ControllerIntent";
import { Camera } from "../engine/scene/Camera";
import { FadeToBlack } from "../engine/scene/camera/FadeToBlack";
import { SceneNode } from "../engine/scene/SceneNode";
import { isDebugMap, isDev, skipIntro } from "../engine/util/env";
import { clamp } from "../engine/util/math";
import { rnd } from "../engine/util/random";
import { sleep } from "../engine/util/time";
import { Dialog } from "./Dialog";
import { FxManager } from "./FxManager";
import { CharacterNode } from "./nodes/CharacterNode";
import { CollisionNode } from "./nodes/CollisionNode";
import { LightNode } from "./nodes/LightNode";
import { NpcNode } from "./nodes/NpcNode";
import { OtherPlayerNode } from "./nodes/OtherPlayerNode";
import { PlayerNode } from "./nodes/PlayerNode";
import { SpawnNode } from "./nodes/SpawnNode";
import { SwitchNode } from "./nodes/SwitchNode";
import { TrainNode } from "./nodes/TrainNode";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";

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

    // Game progress
    private charactersAvailable = 5;
    private gameStage = GameStage.NONE;
    public keyTaken = false; // key taken from corpse
    public fuseboxOn = false;
    private trainIsReady = false; // game basically won when this is true

    // Dialog
    private dialogKeyPressed = false;
    private currentDialogLine = 0;
    private currentDialog: Dialog | null = null;

    // Called by GameScene
    public setupScene(): void {
        if (isDebugMap()) {
            return;
        }
        this.spawnNPCs();
        this.setStage(GameStage.INTRO);

        this.input.onDrag.filter(e => e.isRightStick && !!e.direction && e.direction.getLength() > 0.3).connect(this.getPlayer().handleControllerInput, this.getPlayer());
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
        if (pressed && !prevPressed) {
            this.nextDialogLine();
        }
    }

    private nextDialogLine() {
        // Shut up all characters
        this.npcs.forEach(npc => npc.say({}));
        this.currentDialogLine++;
        if (this.currentDialog && this.currentDialogLine >= this.currentDialog.lines.length) {
            this.currentDialog = null;
            this.currentDialogLine = 0;
        } else if (this.currentDialog) {
            // Show line
            const line = this.currentDialog.lines[this.currentDialogLine];
            const char = this.npcs[line.charNum];
            char.say({line: line.line, duration: Infinity});
        }
    }

    private startDialog(num: number) {
        this.currentDialog = this.dialogs[num];
        this.currentDialogLine = -1;
        this.nextDialogLine();
    }

    private updateIntro(): void {
        // Proceed to next stage
        if (this.stageTime > 13) {
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
        if (skipIntro()) {
            this.setStage(GameStage.STUCK);
            return;
        }
        // Play sound
        setTimeout(() => Hyperloop.introSound.play(), 1000);
        // Place player into train initially
        const player = this.getPlayer();
        const train = this.getTrain();
        player.moveTo(25, 50).appendTo(train);
        // Make him stuck
        const col = new CollisionNode({ width: 400, height: 20 });
        col.moveTo(-20, -20).appendTo(train);
        this.getFader().fadeOut({duration: 0});
    }

    public initStuck(): void {
        // Place player into world
        const player = this.getPlayer();
        const train = this.getTrain();
        const pos = player.getScenePosition();
        player.remove().moveTo(pos.x, pos.y).appendTo(train.getParent() as SceneNode<Hyperloop>);
        train.hideInner();
        FxManager.getInstance().playSounds();
        // Power switch behavior
        const powerSwitch = this.getGameScene().getNodeById("PowerSwitch");
        if (powerSwitch && powerSwitch instanceof SwitchNode) {
            powerSwitch.setOnlyOnce(true);
            powerSwitch.setOnUpdate((state: boolean) => {
                player.say({line: "Doesn't appear to do anything... yet", duration: 4, delay: 0.5});
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
            this.getCamera().moveTo(this.getTrain().getX(), 370); // hacky workaround
            // this.handleCamera(0, 0);
        }
    }

    private initPrespawn(): void {
        this.startDialog(6 - this.npcs.length);
        this.getTrain().showInner();
        this.getCamera().moveTo(1740, 370); // hacky workaround
    }

    public startRespawnSequence(): void {
        if (isDebugMap()) {
            const player = this.getPlayer();
            const otherPlayerPositions = this.getPlayers().map(p => p.getPosition());
            const possibleSpawnPoints = this.getGameScene().userSpawnPoints.filter(p => {
                const spawnVector = new Vector2(p.x, p.y);
                return otherPlayerPositions.every(p => p.getDistance(spawnVector) > 150);
            });
            const { x, y } = possibleSpawnPoints[clamp(+(Math.random() * possibleSpawnPoints.length).toFixed(), 0,
                possibleSpawnPoints.length - 1)];
            player.moveTo(x, y);
            player.setHitpoints(100);
            player.setAmmoToFull();
            player.reset();
            this.getCamera().setFollow(player);
            return;
        }
        if (this.charactersAvailable > 1) {
            // Remove NPC from scene
            this.charactersAvailable--;
            const deadNpc = this.npcs.splice(this.currentPlayerNpc, 1)[0];
            if (deadNpc) {
                deadNpc.remove();
                this.currentPlayerNpc = Math.floor(Math.random() * this.npcs.length);
            }
            if (this.trainIsReady) {
                this.spawnNewPlayer();
                return;
            }
            // Show debate sequence
            this.setStage(GameStage.PRESPAWN);
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

    public checkIfPlayersShouldBeRemoved(): string | null {
        if (this.scenes.getScene(GameScene)) {
            const playersToRemove = this.getPlayers().filter(player => !this.onlineService.players.has(player.username));
            if (playersToRemove.length === 1) {
                playersToRemove[0].remove();
                return playersToRemove[0].username;
            }
        }
        return null;
    }

    public async spawnOtherPlayer(event: UserEvent): Promise<void> {
        console.log("Should spawn other player: ", event);
        if (event == null || !event.username || !event.position) {
            return;
        }
        while (this.gameLoopId == null) {
            await sleep(100);
        }
        if (!this.scenes.getScene(GameScene)) {
            this.scenes.setScene(GameScene as any);
        }
        while (!this.scenes.getScene(GameScene)) {
            await sleep(100);
        }
        if (!this.getPlayers().find(p => p.username === event.username)) {
            try {
                this.getGameScene();
            } catch (_) {
                await this.scenes.setScene(GameScene as any);
            }
            const otherPlayer = new OtherPlayerNode(event.username);
            this.getGameScene().rootNode?.appendChild(otherPlayer);
            otherPlayer.moveTo(event.position?.x ?? this.getPlayer().getX(), event.position?.y ?? this.getPlayer().getY());
            otherPlayer.setHitpoints(100);
            otherPlayer.reset();
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
                player.say({line: "Great. Time to go home.", duration: 4, delay: 1});
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
                endSwitch.setCaption(`PRESS ${this.input.currentControllerFamily === ControllerFamily.GAMEPAD ? "Y" : "E"} TO ENTER`);
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
    }

    public getPlayer(): PlayerNode {
        return this.getGameScene().rootNode.getDescendantsByType(PlayerNode)[0];
    }

    public getPlayers(): OtherPlayerNode[] {
        return this.getGameScene().rootNode.getDescendantsByType(OtherPlayerNode);
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
    if (isDev()) {
        (window as any).game = game;
    }
    game.start();
})();
