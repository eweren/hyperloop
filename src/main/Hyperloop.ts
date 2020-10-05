import { Game } from "../engine/Game";
import { Camera } from "../engine/scene/Camera";
import { FadeToBlack } from "../engine/scene/camera/FadeToBlack";
import { SceneNode } from "../engine/scene/SceneNode";
import { rnd } from "../engine/util/random";
import { Dialog } from "./Dialog";
import { CharacterNode } from "./nodes/CharacterNode";
import { CollisionNode } from "./nodes/CollisionNode";
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
    private trainSpeed = 400; // px per second
    private totalBrakeTime = 0; // calculated later; seconds train requires to brake down to standstill
    private playerTeleportLeft = 1100; // leftest point in tunnel where player is teleported
    private playerTeleportRight = 2970; // rightest point in tunnel where player is teleported
    private teleportStep = 108; // distance between two tunnel lights
    private teleportMyTrainYDistance = 50; // only teleport when player is on roughly same height as train, not in rest of level
    private dialogs: Dialog[];
    private npcs: CharacterNode[] = [];

    // Game progress
    private charactersAvailable = 4;
    private gameStage = GameStage.NONE;
    public keyTaken = false; // key taken from corpse
    public fuseboxOn = false;

    // Dialog
    private dialogKeyPressed = true;
    private currentDialogLine = 0;
    private currentDialog: Dialog | null = null;

    public constructor() {
        super();
        setTimeout(() => {
            this.getFader().fadeOut({ duration: 0.001 });
            this.spawnNPCs();
            this.setStage(GameStage.INTRO);
        }, 2000);

        // TODO get from JSON instead
        this.dialogs = [
            new Dialog(["3 What a nice day!",
            "1 Oh is it?",
            "3 You have no idea how excited I am!",
            "3 This is the first time I'm riding the hyperloop",
            "1 Oh...",
            "2 Well good luck with that",
            "4 Right? Always technical issues...",
            "3 Like what?",
            "4 Yeah I don't know. Let's just hope today is better.",
            "1 Everything's going to be fine. I can feel it.",
            "3 It's so fast!",
            "1 And so shaky",
            "3 Yeah but look at how fast it is though",
            "1 I'm sure we'll arrive in no time.",
            "5 Sure",
            "4 What could possibly go wrong",
            "2 Right?",
            "5 Is it just me or is the ride a little more rough than usual?"
            ]),
            new Dialog([
                "1 What was that?",
                "2 Was that a power failure?",
                "3 Well it surely doesn't look like a station...",
                "1 Maybe it was just a fuse?",
                "3 What about the pilot? Isn't there a pilot on board?",
                "5 No. Everything is automated, so nothing can go wrong.",
                "2 That's right. Humans make mistakes - machines don't!",
                "4 Should we go outside and look?",
                "5 I'm sure it will be fine. Let's just wait.",
                "1 No no. We need to fix this!",
                "1 If we wait too long another pod will crash right into us!",
                "5 You convinced me! You go outside",
                "1 But there's a vacuum!",
                "2 Look, we got these fancy suits. It will be fine!",
                "4 I'm afraid of spiders! I can't go out there!",
                "2 There are no spiders in a vacuum",
                "2 What about you, firstie",
                "3 Me?",
                "2 Yes yes. Go fix it!",
                "3 Of course!"
            ])
        ];
        this.currentDialog = this.dialogs[0];
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

    private updateDialog(): void {
        // Any key to proceed with next line
        const pressed = this.input.currentActiveIntents;
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
            this.getFader().fadeIn({ duration: 1     });
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
        this.setStage(GameStage.STUCK);
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
}

(async () => {
    const game = new Hyperloop();
    await game.scenes.setScene(LoadingScene);
    (window as any).game = game;
    game.start();
})();
