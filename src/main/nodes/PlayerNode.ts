import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { Vector2 } from "../../engine/graphics/Vector2";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { ScenePointerMoveEvent } from "../../engine/scene/events/ScenePointerMoveEvent";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { GameScene } from "../scenes/GameScene";
import { CharacterNode } from "./CharacterNode";
import { EnemyNode } from "./EnemyNode";
import { FlashlightNode } from "./player/FlashlightNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";

export class PlayerNode extends CharacterNode {
    @asset("sprites/spacesuitbody.aseprite.json")
    private static sprite: Aseprite;

    private playerLeg: PlayerLegsNode;
    private playerArm: PlayerArmNode;
    private flashLight: FlashlightNode;

    private aimingAngle = 0;
    private get aimingAngleNonNegative(): number {
        return -this.aimingAngle + Math.PI / 2;
    }
    private nextShot = 0;
    private interactPressed = false;

    // Character settings
    private readonly shootingRange = 250;
    private readonly speed = 60;
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 380;
    private readonly shotDelay = 0.5;
    private leftMouseDown = false;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            ...args
        });
        this.playerArm = new PlayerArmNode();
        this.playerLeg = new PlayerLegsNode();
        this.flashLight = new FlashlightNode();
        this.appendChild(this.playerLeg);
        this.appendChild(this.playerArm);
        this.playerArm.appendChild(this.flashLight);
        this.setupMouseKeyHandlers();
        (<any>window)["player"] = this;
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }
    public getSpeed(): number {
        return this.speed;
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

    public updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 8;
        const boundsHeight = 26;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 6;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight + offsetY));
        bounds.addVertex(new Vector2(offsetX, boundsHeight + offsetY));
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (!this.isAlive()) {
            this.setDirection(0);
            return;
        }
        // Controls
        const input = this.getScene()!.game.input;
        // Run left/right
        const direction = (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT ? 1 : 0)
            - (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT ? 1 : 0);
        this.setDirection(direction);
        // Jump
        if (input.currentActiveIntents & ControllerIntent.PLAYER_JUMP) {
            this.jump();
        }
        // Shoot
        if (input.currentActiveIntents & ControllerIntent.PLAYER_ACTION || this.leftMouseDown) {
            if (time >= this.nextShot) {
                this.shoot();
                this.nextShot = time + this.shotDelay;
            }
        }
        // Interact
        const interactPressed = (input.currentActiveIntents & ControllerIntent.PLAYER_INTERACT) !== 0;
        const prevPressed = this.interactPressed;
        this.interactPressed = interactPressed;
        if (interactPressed && !prevPressed) {
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
    }

    public shoot(): void {
        super.shoot(this.aimingAngleNonNegative, 35, this.flashLight.getScenePosition());
    }

    private syncArmAndLeg(): void {
        this.playerArm.transform(c => {
            const angleInDegrees = this.aimingAngle / Math.PI * 180;
            c.setRotation(this.aimingAngleNonNegative);
            // Mirror arm vertically
            if (angleInDegrees < 0) {
                c.scaleY(-1);
            } else {
                c.scaleY(1);
            }
            // look in aiming direction
            this.setMirrorX(angleInDegrees < 0);
            const backwards = this.direction === 1 && angleInDegrees < 0 || this.direction === -1 && angleInDegrees >= 0;
            this.playerLeg.getAseprite().setDirection(backwards ? "reverse" : "forward");
            // Transform flashlight to match scaling and rotation of the arm.
            this.flashLight.transform(f => {
                if (this.isMirrorX()) {
                    this.playerArm.setChildAnchor(Direction.TOP_RIGHT);
                    this.flashLight.setY(-3);
                    f.setRotation(Math.PI);
                } else {
                    this.playerArm.setChildAnchor(Direction.TOP_RIGHT);
                    this.flashLight.setY(5);
                    f.setRotation(0);
                }
            });
        });
        if (this.isJumping) {
            this.playerLeg.setTag("jump");
        } else if (this.isFalling) {
            this.playerLeg.setTag("fall");
        } else if (this.direction !== 0) {
            this.playerLeg.setTag("walk");
        } else {
            this.playerLeg.setTag("idle");
        }
        this.playerLeg.setMirrorX(this.isMirrorX());
    }


    public die(): void {
        if (this.isAlive()) {
            super.die();
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
                    // TODO spawn new player
                });
            }
        }
    }


    public getPersonalEnemies(): EnemyNode[] {
        const enemies = this.getScene()?.rootNode.getDescendantsByType(EnemyNode) ?? [];
        return enemies;
    }

    public setDebug(debug: boolean): void {
        this.debug = debug;
    }

    private handlePointerMove(event: ScenePointerMoveEvent): void {
        this.aimingAngle = new Vector2(event.getX(), event.getY())
            .sub(this.playerArm.getScenePosition())
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
        this.getScene()!.game.canvas.style.cursor = "crosshair";
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
