import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { Direction } from "../../engine/geom/Direction";
import { FlashlightNode } from "./player/FlashlightNode";
import { MonsterNode } from "./MonsterNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";
import { RatNode } from "./RatNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { asset } from "../../engine/assets/Assets";
import { Layer, STANDARD_FONT } from "../constants";
import { now, sleep } from "../../engine/util/time";
import { ParticleNode, valueCurves } from "./ParticleNode";
import { rnd, rndItem, timedRnd } from "../../engine/util/random";
import { Rect } from "../../engine/geom/Rect";
import { MuzzleFlashNode } from "./MuzzleFlashNode";
import { AmbientPlayerNode } from "./player/AmbientPlayerNode";
import { TrainNode } from "./TrainNode";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { PlayerNode, playerSyncKeys } from "./PlayerNode";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { DeadSpaceSuitNode } from "./DeadSpaceSuiteNode";

const groundColors = [
    "#806057",
    "#504336",
    "#3C8376",
    "#908784"
];

export class OtherPlayerNode extends CharacterNode {
    @asset(STANDARD_FONT)
    private static readonly font: BitmapFont;

    @asset("sounds/fx/wilhelmScream.mp3")
    private static readonly dieScream: Sound;
    private dieScream = OtherPlayerNode.dieScream.shallowClone();

    @asset("sounds/fx/dryfire.ogg")
    private static readonly dryFireSound: Sound;
    private dryFireSound = OtherPlayerNode.dryFireSound.shallowClone();

    @asset("sounds/fx/reload.ogg")
    private static readonly reloadSound: Sound;
    private reloadSound = OtherPlayerNode.reloadSound.shallowClone();

    @asset("sprites/spacesuitbody.aseprite.json")
    private static readonly sprite: Aseprite;

    @asset("sprites/crosshair.aseprite.json")
    private static readonly crossHairSprite: Aseprite;

    private flashLight: FlashlightNode;

    /** The aimingAngle in radians */
    private aimingAngle = Math.PI / 2;
    private isReloading = false;
    private reloadStart: number | null = null;
    private lastShotTime: number = 0;
    private shotRecoil = 0.2;
    private muzzleFlash: MuzzleFlashNode;
    private mouseDistanceToPlayer: number = 1000;
    private isRunning = false;
    private get aimingAngleNonNegative(): number {
        return -this.aimingAngle + Math.PI / 2;
    }
    private ammo = 12;

    // Character settings
    private readonly shootingRange = 250;
    private readonly speed = 60;
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 295;
    private readonly shotDelay = 0.2;
    private readonly magazineSize = 12;
    private readonly reloadDelay = 2200;

    private dustParticles: ParticleNode;
    private crosshairNode: AsepriteNode;

    public constructor(public username: string, protected filter = "hue-rotate(5deg)",  args?: SceneNodeArgs) {
        super(playerSyncKeys, {
            aseprite: OtherPlayerNode.sprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            layer: Layer.FOREGROUND,
            sourceBounds: new Rect(6, 6, 8, 26),
            cameraTargetOffset: new Vector2(0, -26),
            filter,
            ...args
        });

        this.removeOnDie = false;
        this.playerName = new TextNode({font: OtherPlayerNode.font, text: this.username, anchor: Direction.BOTTOM, y: -(this.getHeight() / 2)});
        this.playerArm = new PlayerArmNode(this.filter);
        this.playerLeg = new PlayerLegsNode(this.filter);
        this.flashLight = new FlashlightNode();
        this.muzzleFlash = new MuzzleFlashNode(this.shotRecoil, { y: -3 });
        this.appendChild(this.playerName);
        this.appendChild(this.playerLeg);
        this.appendChild(this.playerArm);
        const ambientPlayerLight = new AmbientPlayerNode(this.filter);
        this.playerLeg?.appendChild(ambientPlayerLight);
        this.playerArm?.appendChild(this.flashLight);
        this.flashLight?.appendChild(this.muzzleFlash);

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
            aseprite: OtherPlayerNode.crossHairSprite,
            tag: "idle",
            layer: Layer.HUD
        });
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }

    public getSpeed(): number {
        // TODO remove before publishing
        return this.speed * (this.isRunning ? 2.4 : 1.2);
    }

    public getAcceleration(): number {
        return this.acceleration;
    }

    public getIdentifier(): string {
        return this.username;
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

    public getHitpoints(): number {
        return this.hitpoints;
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (this.playerName?.getText() !== this.username) {
            this.playerName?.setText(this.username);
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
        this.setOpacity(1);
        this.syncArmAndLeg();

        // Spawn random dust particles while walking
        if (this.isVisible()) {
            if (this.getTag() === "walk") {
                if (timedRnd(dt, 0.2)) {
                    this.dustParticles.emit(1);
                }
            }
        }
    }

    public setAmmoToFull() {
        this.ammo = this.magazineSize;
    }

    /** Since we do not want this character to send updates, we just leave it blank here to not trigger super method. */
    public syncCharacterState(): void {}

    public getPersonalEnemies(): CharacterNode[] {
        const monsters = this.getScene()?.rootNode.getDescendantsByType(MonsterNode) ?? [];
        const rats = this.getScene()?.rootNode.getDescendantsByType(RatNode) ?? [];
        const players = this.getScene()?.rootNode.getDescendantsByType(OtherPlayerNode) ?? [];
        const player = this.getScene()?.rootNode.getDescendantsByType(PlayerNode) ?? [];
        const enemies = [...monsters, ...rats, ...players, ...player];
        return enemies.filter(e => e.isAlive());
    }

    public shoot(): void {
        if (this.ammo === 0) {
            this.dryFireSound.stop();
            this.dryFireSound.setVolume(this.soundVolume, this.directionToPlayer);
            this.dryFireSound.play();
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
        this.isReloading = true;
        this.reloadSound.setVolume(this.soundVolume, this.directionToPlayer);
        this.reloadSound.play();
        await sleep(this.reloadDelay);
        this.ammo = this.magazineSize;
        this.reloadSound.stop();
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
                this.flashLight.setY(5);
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


    public hurt(damage: number, attackerId: string, origin: ReadonlyVector2): boolean {
        return false;
    }

    public die(): void {
        super.die();
        this.playerArm?.hide();
        this.dieScream.stop();
        this.dieScream.setVolume(this.soundVolume, this.directionToPlayer);
        this.dieScream.play();
        const diePosition = { x: this.getX(), y: this.getY() };
        setTimeout(() => {
            new DeadSpaceSuitNode({
                ...diePosition,
                layer: this.getLayer()},
                this.filter
            ).insertBefore(this);
            this.playerArm?.show();
        }, 6000);
    }

    public reset(): void {
        super.reset();
        this.ammo = 12;
    }

    public setDebug(debug: boolean): void {
        this.debug = debug;
    }

    public async flickerLight(): Promise<void> {
        this.flashLight.flicker();
    }

    public async manipulateLight(factor: number): Promise<void> {
        this.flashLight.manipulateLight(factor);
    }

}
