import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { Direction } from "../../engine/geom/Direction";
import { EnemyNode } from "./EnemyNode";
import { FlashlightNode } from "./player/FlashlightNode";
import { GameScene } from "../scenes/GameScene";
import { MonsterNode } from "./MonsterNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";
import { RatNode } from "./RatNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { ScenePointerMoveEvent } from "../../engine/scene/events/ScenePointerMoveEvent";
import { Sound } from "../../engine/assets/Sound";
import { Vector2 } from "../../engine/graphics/Vector2";
import { asset } from "../../engine/assets/Assets";
import { AmmoCounterNode } from "./player/AmmoCounterNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { STANDARD_FONT, HUD_LAYER } from "../constants";
import { isDev } from "../../engine/util/env";
import { now, sleep } from "../../engine/util/time";
import { ParticleNode, valueCurves } from "./ParticleNode";
import { rnd, rndItem, timedRnd } from "../../engine/util/random";
import { Rect } from "../../engine/geom/Rect";
import { MuzzleFlashNode } from "./MuzzleFlashNode";

const groundColors = [
    "#806057",
    "#504336",
    "#3C8376",
    "#908784"
];

export class PlayerNode extends CharacterNode {

    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    @asset("sounds/fx/wilhelmScream.mp3")
    private static readonly dieScream: Sound;

    @asset("sounds/fx/footsteps.ogg")
    private static readonly footsteps: Sound;

    @asset("sounds/fx/dryfire.ogg")
    private static readonly dryFireSound: Sound;

    @asset("sounds/fx/reload.ogg")
    private static readonly reloadSound: Sound;

    @asset("sprites/spacesuitbody.aseprite.json")
    private static sprite: Aseprite;

    private flashLight: FlashlightNode;

    /** The aimingAngle in radians */
    private aimingAngle = Math.PI / 2;
    private ammoCounter: AmmoCounterNode;
    private isReloading = false;
    private reloadStart: number | null = null;
    private lastShotTime: number = 0;
    private shotRecoil = 0.2;
    private muzzleFlash: MuzzleFlashNode;
    private get aimingAngleNonNegative(): number {
        return -this.aimingAngle + Math.PI / 2;
    }
    private ammo = 12;
    private nextShot = 0;
    private previouslyPressed = 0;

    // Character settings
    private readonly shootingRange = 250;
    private readonly speed = 60;
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 295;
    private readonly shotDelay = 0.2;
    private readonly magazineSize = 12;
    private readonly reloadDelay = 2200;
    private leftMouseDown = false;

    private dustParticles: ParticleNode;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            sourceBounds: new Rect(6, 6, 8, 26),
            ...args
        });
        this.removeOnDie = false;
        this.playerArm = new PlayerArmNode();
        this.playerLeg = new PlayerLegsNode();
        this.flashLight = new FlashlightNode();
        this.muzzleFlash = new MuzzleFlashNode(this.shotRecoil, {y: -3});
        this.ammoCounter = new AmmoCounterNode({
            font: PlayerNode.font,
            anchor: Direction.TOP_RIGHT,
            layer: HUD_LAYER
        });
        this.appendChild(this.playerLeg);
        this.appendChild(this.playerArm);
        this.playerArm?.appendChild(this.flashLight);
        this.flashLight?.appendChild(this.muzzleFlash);
        this.setupMouseKeyHandlers();
        (<any>window)["player"] = this;

        this.dustParticles = new ParticleNode({
            y: this.getHeight() / 2,
            velocity: () => ({ x: rnd(-1, 1) * 26, y: rnd(0.7, 1) * 45 }),
            color: () => rndItem(groundColors),
            size: rnd(1, 2),
            gravity: {x: 0, y: -100},
            lifetime: () => rnd(0.5, 0.8),
            alphaCurve: valueCurves.trapeze(0.05, 0.2)
        }).appendTo(this);
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }
    public getSpeed(): number {
        // TODO remove before publishing
        return this.speed * (this.getScene()?.keyboard.isPressed("Shift") ? 4 : 1);
    }
    public getAcceleration(): number {
        return this.acceleration;
    }
    public getDeceleration(): number {
        return this.deceleration;
    }
    public getJumpPower(): number {
        return this.jumpPower;
    }
    public getAmmo(): number {
        return this.ammo;
    }
    public getMagazineSize(): number {
        return this.magazineSize;
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (!this.ammoCounter.isInScene() && isDev()) {
            const rootNode = this.getGame().getGameScene().rootNode;
            this.ammoCounter.setX(rootNode.getWidth() - 10);
            this.ammoCounter.setY(10);
            rootNode.appendChild(this.ammoCounter);
        }
        if (!this.isAlive()) {
            this.setDirection(0);
            return;
        }

        // Controls
        const input = this.getScene()!.game.input;

        // Move left/right
        const direction = (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT ? 1 : 0)
            - (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT ? 1 : 0);
        this.setDirection(direction);
        // Jump
        if (this.isOnGround && this.canInteract(ControllerIntent.PLAYER_JUMP)) {
            this.jump();
        }
        if (this.getTag() === "walk") {
            PlayerNode.footsteps.setLoop(true);
            PlayerNode.footsteps.play(0.5);
        } else {
            PlayerNode.footsteps.stop(0.3);
        }
        // Reload
        if (this.canInteract(ControllerIntent.PLAYER_RELOAD)) {
            this.reload();
        }
        // Shoot
        if (this.canInteract(ControllerIntent.PLAYER_ACTION) || this.leftMouseDown) {
            this.leftMouseDown = false;
            if (time >= this.nextShot && !this.isReloading) {
                this.shoot();
                this.nextShot = time + this.shotDelay;
            }
        }
        // Interact
        if (this.canInteract(ControllerIntent.PLAYER_INTERACT)) {
            const node = this.getNodeToInteractWith();
            if (node) {
                node.interact();
            }
        }
        // Battlemode
        if (this.battlemode) {
            this.getScene()!.game.canvas.style.cursor = "none";
        }

        this.syncArmAndLeg();

        // Spawn random dust particles while walking
        if (this.isVisible()) {
            if (this.getTag() === "walk") {
                if (timedRnd(dt, 0.2)) {
                    this.dustParticles.emit(1);
                }
            }
        }
        this.updatePreviouslyPressed();
    }

    private updatePreviouslyPressed(): void {
        const input = this.getGame().input;
        this.previouslyPressed = input.currentActiveIntents;
    }

    /**
     * Checks if the given intent is the same as the last intent to prevent auto-key-handling on button being hold.
     */
    private canInteract(intent: ControllerIntent): boolean {
        const input = this.getGame().input;
        return (this.previouslyPressed & intent) === 0 && (input.currentActiveIntents & intent) !== 0;
    }

    public shoot(): void {
        if (this.ammo === 0) {
            PlayerNode.dryFireSound.stop();
            PlayerNode.dryFireSound.play();
        } else if (this.ammo > 0 && !this.isReloading) {
            this.lastShotTime = now();
            this.ammo--;
            this.muzzleFlash.fire();
            super.shoot(this.aimingAngleNonNegative, 35, this.flashLight.getScenePosition());
        }
    }

    public async reload(): Promise<void> {
        if (this.isReloading || this.ammo === this.magazineSize) {
            return;
        }
        this.isReloading = true;
        PlayerNode.reloadSound.setLoop(true);
        PlayerNode.reloadSound.play();
        await sleep(this.reloadDelay);
        this.ammo = this.magazineSize;
        PlayerNode.reloadSound.stop();
        this.isReloading = false;
    }

    private syncArmAndLeg(): void {
        this.playerArm?.transform(c => {
            if (this.isReloading) {
                const angleAimRight = 0.15 + Math.PI / 2;
                const angleAimLeft = -0.15 + Math.PI / 2;
                if (!this.reloadStart) {
                    this.reloadStart = now();
                }
                const reloadProgress = (now() - this.reloadStart) / this.reloadDelay;
                let factor = Math.sin(Math.PI * reloadProgress) ** 0.4;
                factor = 0.5 - 0.5 * Math.cos(Math.PI * factor);
                if (this.aimingAngle < 0) {
                    const aimingDiff = this.aimingAngleNonNegative - angleAimRight;
                    c.setRotation(this.aimingAngleNonNegative - aimingDiff * factor);
                } else {
                    const aimingDiff = this.aimingAngleNonNegative - angleAimLeft;
                    c.setRotation(this.aimingAngleNonNegative - aimingDiff * factor);
                }
            } else if (now() - this.lastShotTime < this.shotDelay * 1000) {
                const shotProgress = (now() - this.lastShotTime) / (this.shotDelay * 1000);
                if (this.aimingAngle < 0) {
                    c.setRotation(this.aimingAngleNonNegative + this.shotRecoil * Math.sin(Math.PI * shotProgress));
                } else {
                    c.setRotation(this.aimingAngleNonNegative - this.shotRecoil * Math.sin(Math.PI * shotProgress));
                }
            } else {
                this.reloadStart = null;
                c.setRotation(this.aimingAngleNonNegative);
            }
            // Mirror arm vertically
            if (this.aimingAngle < 0) {
                c.scaleY(-1);
            } else {
                c.scaleY(1);
            }
            // look in aiming direction
            this.setMirrorX(this.aimingAngle < 0);
            const backwards = this.direction === 1 && this.aimingAngle < 0 || this.direction === -1 && this.aimingAngle >= 0;
            this.playerLeg?.getAseprite().setDirection(backwards ? "reverse" : "forward");
            // Transform flashlight to match scaling and rotation of the arm.
            this.flashLight.transform(f => {
                if (this.isMirrorX()) {
                    this.flashLight.setY(-3);
                    f.setRotation(Math.PI);
                } else {
                    this.flashLight.setY(5);
                    f.setRotation(0);
                }
            });
        });
        if (this.isJumping) {
            this.setTag("jump");
        } else if (this.isFalling) {
            this.setTag("fall");
        } else if (this.direction !== 0) {
            this.setTag("walk");
        } else {
            this.setTag("idle");
        }
        this.playerLeg?.setMirrorX(this.direction === 0 ? this.isMirrorX() : (this.direction === -1));
    }


    public die(): void {
        super.die();
        PlayerNode.dieScream.stop();
        PlayerNode.dieScream.play();
        // Slow fade out, then play as different character
        const camera = this.getGame().scenes.getScene(GameScene)?.camera;
        if (camera) {
            const fader = camera.fadeToBlack;
            fader.fadeOut({ duration: 6 });
            camera.focus(this, {
                duration: 6,
                scale: 4,
                rotation: Math.PI * 2
            }).then(() => {
                // Reset camera
                camera.setZoom(1);
                camera.setRotation(0);
                fader.fadeIn({ duration: 3 });
                // TODO Leave corpse in place
                // TODO Jump to dialog sequence in train
                this.getGame().spawnNewPlayer();
            });
        }
    }


    public getPersonalEnemies(): EnemyNode[] {
        const monsters = this.getScene()?.rootNode.getDescendantsByType(MonsterNode) ?? [];
        const rats = this.getScene()?.rootNode.getDescendantsByType(RatNode) ?? [];
        const enemies = [...monsters, ...rats];
        return enemies.filter(e => e.isAlive());
    }

    public setDebug(debug: boolean): void {
        this.debug = debug;
    }

    private handlePointerMove(event: ScenePointerMoveEvent): void {
        this.aimingAngle = new Vector2(event.getX(), event.getY())
            .sub(this.playerArm ? this.playerArm.getScenePosition() : this.getScenePosition())
            .getAngle();
    }

    protected activate(): void {
        this.getScene()?.onPointerMove.connect(this.handlePointerMove, this);
    }

    protected deactivate(): void {
        this.getScene()?.onPointerMove.disconnect(this.handlePointerMove, this);
    }

    protected endBattlemode(): void {
        super.endBattlemode();
        this.getGame().canvas.style.cursor = "crosshair";
    }

    private setupMouseKeyHandlers(): void {
        window.addEventListener("mousedown", event => {
            if (event.button === 0) {
                this.leftMouseDown = true;
            }
        });
        window.addEventListener("mouseup", event => {
            if (event.button === 0) {
                this.leftMouseDown = false;
            }
        });
    }
}
