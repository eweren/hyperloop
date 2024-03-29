import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { Direction } from "../../engine/geom/Direction";
import { FlashlightNode } from "./player/FlashlightNode";
import { GameScene } from "../scenes/GameScene";
import { MonsterNode } from "./MonsterNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";
import { RatNode } from "./RatNode";
import { SceneNodeArgs, SceneNodeAspect } from "../../engine/scene/SceneNode";
import { ScenePointerMoveEvent } from "../../engine/scene/events/ScenePointerMoveEvent";
import { Sound } from "../../engine/assets/Sound";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { asset } from "../../engine/assets/Assets";
import { AmmoCounterNode } from "./player/AmmoCounterNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { Layer, STANDARD_FONT } from "../constants";
import { now, sleep } from "../../engine/util/time";
import { ParticleNode, valueCurves } from "./ParticleNode";
import { rnd, rndItem, timedRnd } from "../../engine/util/random";
import { Rect } from "../../engine/geom/Rect";
import { MuzzleFlashNode } from "./MuzzleFlashNode";
import { AmbientPlayerNode } from "./player/AmbientPlayerNode";
import { TrainNode } from "./TrainNode";
import { HealthNode } from "./player/HealthNode";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { ScenePointerDownEvent } from "../../engine/scene/events/ScenePointerDownEvent";
import { DeadSpaceSuitNode } from "./DeadSpaceSuiteNode";
import { ControllerEvent } from "../../engine/input/ControllerEvent";
import { ControllerFamily } from "../../engine/input/ControllerFamily";
import { isDev } from "../../engine/util/env";
import { OtherPlayerNode } from "./OtherPlayerNode";
import { GameTimeNode } from "../../engine/scene/GameTimeNode";
import { Hyperloop } from "../Hyperloop";

export const playerSyncKeys = ["username", "aimingAngle", "isReloading", "reloadStart", "lastShotTime", "shotRecoil", "mouseDistanceToPlayer", "isRunning", "ammo", "shootingRange", "speed", "acceleration", "deceleration", "jumpPower", "shotDelay", "magazineSize", "reloadDelay"];

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
    private static readonly sprite: Aseprite;

    @asset("sprites/crosshair.aseprite.json")
    private static readonly crossHairSprite: Aseprite;

    private flashLight: FlashlightNode;

    protected isPlayer = true;
    public get username(): string {
        return this.onlineService.username;
    }
    public set username(username: string) {
        this.onlineService.username = username;
    }

    /** The aimingAngle in radians */
    private aimingAngle = +(Math.PI / 2).toFixed(3);
    private ammoCounter: AmmoCounterNode;
    private isReloading = false;
    private reloadStart: number | null = null;
    private lastShotTime: number = 0;
    private shotRecoil = 0.2;
    private muzzleFlash: MuzzleFlashNode;
    private health: HealthNode;
    private gameTimeNode: GameTimeNode<Hyperloop>;
    private mouseDistanceToPlayer: number = 1000;
    private playerInitDone = false;
    private isRunning = false;
    private get aimingAngleNonNegative(): number {
        return +(-this.aimingAngle + Math.PI / 2).toFixed(3);
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
    private readonly timeoutForRecover = 3000;
    private leftMouseDown = false;
    private rightMouseDown = false;
    private lastHitTimestamp = 0;
    private automaticWeapon = true;

    private dustParticles: ParticleNode;
    private crosshairNode: AsepriteNode;

    public constructor(args?: SceneNodeArgs, protected filter = "hue-rotate(230deg)") {
        super(playerSyncKeys, {
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            sourceBounds: new Rect(6, 6, 8, 26),
            cameraTargetOffset: new Vector2(0, -26),
            filter,
            ...args
        });
        this.removeOnDie = false;
        this.playerArm = new PlayerArmNode(filter);
        this.playerLeg = new PlayerLegsNode(filter);
        this.flashLight = new FlashlightNode();
        this.muzzleFlash = new MuzzleFlashNode(this.shotRecoil, {y: -3});
        this.ammoCounter = new AmmoCounterNode({
            font: PlayerNode.font,
            anchor: Direction.TOP_RIGHT,
            layer: Layer.HUD
        });
        this.gameTimeNode = new GameTimeNode({
            font: PlayerNode.font,
            anchor: Direction.TOP,
            layer: Layer.HUD
        });
        this.health = new HealthNode(this.hitpoints, {
            anchor: Direction.TOP,
            layer: Layer.HUD
        });
        this.appendChild(this.playerLeg);
        this.appendChild(this.playerArm);
        const ambientPlayerLight = new AmbientPlayerNode(filter);
        this.playerLeg?.appendChild(ambientPlayerLight);
        this.playerArm?.appendChild(this.flashLight);
        this.flashLight?.appendChild(this.muzzleFlash);
        if (isDev()) {
            (<any>window)["player"] = this;
        }

        this.dustParticles = new ParticleNode({
            y: this.getHeight() / 2,
            velocity: () => ({ x: rnd(-1, 1) * 26, y: rnd(0.7, 1) * 45 }),
            color: () => rndItem(groundColors),
            size: rnd(1, 2),
            gravity: {x: 0, y: -100},
            lifetime: () => rnd(0.5, 0.8),
            alphaCurve: valueCurves.trapeze(0.05, 0.2)
        }).appendTo(this);

        this.crosshairNode = new AsepriteNode({
            aseprite: PlayerNode.crossHairSprite,
            tag: "idle",
            layer: Layer.HUD
        });
    }

    private initNodes(): void {
        const rootNode = this.getGame().getGameScene().rootNode;
        this.health.setX(rootNode.getX());
        this.health.setY(rootNode.getY());
        rootNode.appendChild(this.health);
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }

    public getSpeed(): number {
        return this.speed * (this.isRunning ? 2.4 : 1.2);
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

    public getIdentifier(): string {
        return this.username;
    }

    public getLastShotTime(): number {
        return this.lastShotTime;
    }

    public getHitpoints(): number {
        return this.hitpoints;
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (this.isInScene() && !this.playerInitDone) {
            this.playerInitDone = true;
            this.initNodes();
            this.getGame().input.onDrag.filter(ev => ev.isRightStick && !!ev.direction && ev.direction.getLength() > 0.3).connect(this.handleControllerInput, this);
            const handleControllerInputChange = (ev: ControllerEvent) => {
                this.isRunning = (this.getGame().input.currentActiveIntents & ControllerIntent.PLAYER_RUN) === ControllerIntent.PLAYER_RUN;
            };
            this.getGame().input.onButtonDown.connect(handleControllerInputChange, this);
            this.getGame().input.onButtonUp.connect(handleControllerInputChange, this);
        }
        if (!this.ammoCounter.isInScene()) {
            const rootNode = this.getGame().getGameScene().rootNode;
            this.ammoCounter.setX(rootNode.getWidth() - 10);
            this.ammoCounter.setY(10);
            rootNode.appendChild(this.ammoCounter);
        }
        if (!this.gameTimeNode.isInScene()) {
            const rootNode = this.getGame().getGameScene().rootNode;
            this.gameTimeNode.setX(rootNode.getWidth() / 2 - this.gameTimeNode.getWidth() / 2);
            this.gameTimeNode.setY(10);
            rootNode.appendChild(this.gameTimeNode);
        }
        if (this.getParent() instanceof TrainNode) {
            this.setOpacity(0);
            const door = this.getGame().getTrainDoorCoordinate();
            const parent = this.getParent()?.getScenePosition();
            this.setX(door.x - (parent?.x ?? 0));
            this.setY(door.y - (parent?.y ?? 0) + 40);
            this.crosshairNode.hide();
            return;
        }
        if (!this.isAlive()) {
            this.setDirection(0);
            this.crosshairNode.hide();
            return;
        }
        if (this.getGame().input.currentControllerFamily === ControllerFamily.GAMEPAD) {
            this.crosshairNode.hide();
        } else {
            this.crosshairNode.show();
        }
        this.setOpacity(1);
        this.updateCrosshair();

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
            PlayerNode.footsteps.play({fadeIn: 0.5});
        } else {
            PlayerNode.footsteps.stop(0.3);
        }
        // Reload
        if (this.canInteract(ControllerIntent.PLAYER_RELOAD) || this.rightMouseDown) {
            this.rightMouseDown = false;
            this.reload();
        }
        this.syncArmAndLeg();
        this.recover();
        // Shoot
        if (this.canInteract(ControllerIntent.PLAYER_ACTION) || this.leftMouseDown) {
            if (!this.automaticWeapon) {
                this.leftMouseDown = false;
            }
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

        // Spawn random dust particles while walking
        if (this.isVisible()) {
            if (this.getTag() === "walk") {
                if (timedRnd(dt, 0.2)) {
                    this.dustParticles.emit(1);
                }
            }
        }
        this.updatePreviouslyPressed();
        this.syncCharacterState();
    }

    public handleControllerInput(event: ControllerEvent) {
        if (event.direction) {
            this.aimingAngle = +event.direction.getAngle(new Vector2(0, 1)).toFixed(3);
            this.invalidate(SceneNodeAspect.SCENE_TRANSFORMATION);
            this.mouseDistanceToPlayer = +(event.direction.getLength() * 200).toFixed(2);
            return;
        }
    }

    public setAmmoToFull() {
        this.ammo = this.magazineSize;
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
            PlayerNode.dryFireSound.setDirection(0);
            PlayerNode.dryFireSound.play();
        } else if (this.ammo > 0 && !this.isReloading) {
            this.lastShotTime = now();
            this.ammo--;
            this.muzzleFlash.fire();
            super.shoot(this.aimingAngleNonNegative, 35, this.muzzleFlash.getScenePosition());
        }
    }

    public async reload(): Promise<void> {
        if (this.isReloading || this.ammo === this.magazineSize) {
            return;
        }
        this.emitEvent("reload");
        this.isReloading = true;
        PlayerNode.reloadSound.setDirection(0);
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
                this.muzzleFlash.y = -5;
                this.muzzleFlash.x = 1;
            } else {
                c.scaleY(1);
                this.muzzleFlash.y = -3;
                this.muzzleFlash.x = -1;
            }
            // look in aiming direction
            this.setMirrorX(this.aimingAngle < 0);
            const backwards = this.direction === 1 && this.aimingAngle < 0 || this.direction === -1 && this.aimingAngle >= 0;
            this.playerLeg?.getAseprite().setDirection(backwards ? "reverse" : "forward");
            // Transform flashlight to match scaling and rotation of the arm.
            this.flashLight.transform(f => {
                this.flashLight.setDistance(this.mouseDistanceToPlayer);
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

    private recover(): void {
        if (this.isAlive() && this.hitpoints < 100 && now() - this.lastHitTimestamp > this.timeoutForRecover) {
            this.hitpoints++;
            this.syncCharacterState();
        }
    }

    public hurt(damage: number, attackerId: string, origin?: ReadonlyVector2): boolean {
        this.lastHitTimestamp = now();
        const { centerX, centerY } = this.getSceneBounds();
        this.emitBlood({x: centerX, y: centerY, angle: Math.random() * Math.PI * 2, count: damage});
        const died = super.hurt(damage, attackerId, origin);
        this.syncCharacterState();
        return died;
    }

    public die(attackerId?: string): void {
        super.die();
        this.playerArm?.hide();
        PlayerNode.dieScream.stop();
        PlayerNode.dieScream.play();
        // Slow fade out, then play as different character
        const camera = this.getGame().scenes.getScene(GameScene)?.camera;
        if (camera) {
            const fader = camera.fadeToBlack;
            fader.fadeOut({ duration: 6 });
            const killer = this.getGame().getPlayers().find(p => p.getIdentifier() === attackerId);
            if (killer) {
                camera.setFollow(killer);
                setTimeout(() => {
                    this.hitpoints = 100;
                    // Reset camera
                    camera.setFollow(this);
                    camera.setZoom(1);
                    camera.setRotation(0);
                    fader.fadeIn({ duration: 3 });
                    new DeadSpaceSuitNode({
                        x: this.getX(),
                        y: this.getY(),
                        layer: this.getLayer(),
                    }, this.filter).insertBefore(this);
                    // TODO Jump to dialog sequence in train
                    this.getGame().startRespawnSequence();
                    this.playerArm?.show();
                }, 6000);
            } else {
                camera.focus(this, {
                    duration: 6,
                    scale: 4,
                    rotation: Math.PI * 2
                }).then(() => {
                    this.hitpoints = 100;
                    // Reset camera
                    camera.setZoom(1);
                    camera.setRotation(0);
                    fader.fadeIn({ duration: 3 });
                    new DeadSpaceSuitNode({
                        x: this.getX(),
                        y: this.getY(),
                        layer: this.getLayer(),
                    }, this.filter).insertBefore(this);
                    // TODO Jump to dialog sequence in train
                    this.getGame().startRespawnSequence();
                    this.playerArm?.show();
                });
            }
        }
    }

    public reset(): void {
        super.reset();
        this.ammo = 12;
    }

    public getPersonalEnemies(): CharacterNode[] {
        const monsters = this.getScene()?.rootNode.getDescendantsByType(MonsterNode) ?? [];
        const players = this.getScene()?.rootNode.getDescendantsByType(OtherPlayerNode) ?? [];
        const rats = this.getScene()?.rootNode.getDescendantsByType(RatNode) ?? [];
        const enemies = [...monsters, ...rats, ...players];
        return enemies.filter(e => e.isAlive());
    }

    public setDebug(debug: boolean): void {
        this.debug = debug;
    }

    public async flickerLight(): Promise<void> {
        this.emitEvent("flickerLight");
        this.flashLight.flicker();
    }

    public async manipulateLight(factor: number): Promise<void> {
        this.emitEvent("manipulateLight", factor);
        this.flashLight.manipulateLight(factor);
    }

    private handlePointerMove(event: ScenePointerMoveEvent): void {
        this.crosshairNode.moveTo(event.getScreenX(), event.getScreenY());
        this.mouseDistanceToPlayer = +(new Vector2(event.getX(), event.getY()).getDistance(this.getScenePosition()).toFixed(2));
        this.aimingAngle = +new Vector2(event.getX(), event.getY())
            .sub(this.playerArm ? this.playerArm.getScenePosition() : this.getScenePosition())
            .getAngle().toFixed(3);
        this.syncCharacterState();
    }

    private handlePointerDown(event: ScenePointerDownEvent): void {
        if (event.getButton() === 0) {
            this.leftMouseDown = true;
            event.onPointerEnd.connect(() => {
                this.leftMouseDown = false;
            });
        } else if (event.getButton() === 2) {
            this.rightMouseDown = true;
            event.onPointerEnd.connect(() => {
                this.rightMouseDown = false;
            });
        }
    }

    protected activate(): void {
        this.crosshairNode.appendTo(this.getScene()!.rootNode);
        this.getScene()?.onPointerMove.connect(this.handlePointerMove, this);
        this.getScene()?.onPointerDown.connect(this.handlePointerDown, this);
        this.getGame().canvas.style.cursor = "none";
    }

    protected deactivate(): void {
        this.getGame().canvas.style.cursor = "";
        this.getScene()?.onPointerMove.disconnect(this.handlePointerMove, this);
        this.getScene()?.onPointerDown.disconnect(this.handlePointerDown, this);
        this.crosshairNode.remove();
    }

    protected updateCrosshair(): void {
        let tag = "idle";
        if (this.isReloading) {
            tag = "reload";
        } else if (this.ammo === 0) {
            tag = "empty";
        } else if (this.battlemode) {
            tag = "battle";
        }
        this.crosshairNode.setTag(tag);
    }
}
