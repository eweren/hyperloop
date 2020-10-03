import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { rnd } from "../../engine/util/random";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

enum AiState {
    BORED = 0,
    FOLLOW = 1,
    ATTACK = 2,
    ALERT = 3,
    MOVE_AROUND = 4,
}

export class EnemyNode extends CharacterNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    // Character settings
    private readonly shootingRange = 150;
    private readonly speed = 100;
    private readonly acceleration = 600;
    private readonly deceleration = 900;
    private readonly jumpPower = 380;

    /** How far enemy can see player while idling */
    private squaredViewDistance = 120 ** 2;

    /** How far enemy can see player while chasing him */
    private squaredAlertViewDistance = 160 ** 2;

    /** Distance to target position where enemy stops moving further */
    private squaredPositionThreshold = 20 ** 2;

    /** Distance to player required for a successful melee attack */
    private squaredAttackDistance = 20 ** 2;

    /** ms it takes for enemy to attack player */
    private attackDelay = 0.3;

    private targetPosition: ReadonlyVector2;

    private state: AiState = AiState.BORED;

    private lastStateChange = 0;

    // look direction change delays in seconds
    private LOW_ALERT_CHANGE_DELAY = 3;
    private HIGH_ALERT_CHANGE_DELAY = 0.5;
    private lastLookDirectionChange = 0;

    private minAlertDuration = 10;

    private moveAroundAnchor: Vector2 = new Vector2(0, 0);
    private squaredMoveAroundDistance = 10 ** 2;

    /**
     * set to false, if after chase an enemy should transfer to ALERT,
     * set to true - for MOVE_AROUND
     */
    private moveAroundArterChase = false;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: EnemyNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            ...args
        });
        this.targetPosition = this.getPosition();
        this.moveAroundArterChase = true;
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

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (!this.isAlive()) {
            this.setDirection(0);
            return;
        }
        // AI
        switch (this.state) {
            case AiState.BORED:
            case AiState.ALERT:
                this.updateSearch(time);
                break;
            case AiState.FOLLOW:
                this.updateFollow(time);
                break;
            case AiState.ATTACK:
                this.updateAttack(time);
                break;
            case AiState.MOVE_AROUND:
                this.updateMoveAround(time);
                break;
        }
    }

    private getPlayer(): PlayerNode | undefined {
        const player = this.getScene()?.rootNode.getDescendantsByType(PlayerNode)[0];
        return player?.isAlive() ? player : undefined;
    }

    private updateSearch(time: number): void {
        // Check distance to player
        const player = this.getPlayer();
        if (player) {
            const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
            if (this.isLookingInPlayerDirection() && squaredDistance < this.squaredViewDistance) {
                // Player spotted!
                this.setState(AiState.FOLLOW, time);
                this.targetPosition = player.getPosition();
                return;
            }
        }
        if (this.state === AiState.ALERT || this.state === AiState.BORED) {
            // randomly change looking direction
            const lookDirectionChangeDelay = this.state === AiState.ALERT ? this.HIGH_ALERT_CHANGE_DELAY : this.LOW_ALERT_CHANGE_DELAY;
            const chance = this.state === AiState.ALERT ? 20 : 5;
            if (rnd(1, 100) < chance && this.lastLookDirectionChange + lookDirectionChangeDelay < time) {
                this.setMirrorX(!this.isMirrorX());
                this.lastLookDirectionChange = time;
            }
        }

        // check if it is time to be bored or alerted
        if (this.state !== AiState.BORED
            && rnd(1, 100) < 5 && this.lastStateChange + this.minAlertDuration < time) {
            // first transfer to alert and from alert to bored state
            const newState = this.state === AiState.ALERT ? AiState.BORED : AiState.ALERT;
            this.setState(newState, time);
            this.setDirection(0);
        }
    }

    private isLookingInPlayerDirection(): boolean {
        const player = this.getPlayer();
        return (player != null && (
            (this.getX() > player.getPosition().x && this.isMirrorX())
            || (this.getX() < player.getPosition().x && !this.isMirrorX())));
    }

    private updateFollow(time: number): void {
        const player = this.getPlayer();
        // Update target position if seeing player
        if (player) {
            // Update target if in sight
            const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
            if (squaredDistance < this.squaredAlertViewDistance) {
                // Player spotted!
                this.setState(AiState.FOLLOW, time);
                this.targetPosition = player.getPosition();
            } else {
                // Player too far away
                if (this.moveAroundArterChase) {
                    // move around a bit before transfering to ALERT
                    this.setState(AiState.MOVE_AROUND, time);
                    //this.setDirection(this.direction * -1);
                    this.moveAroundAnchor.setVector(this.getPosition());
                } else {
                    // stay ALERT, and look around actively
                    this.setState(AiState.ALERT, time);
                    this.setDirection(0);
                }
            }
            // Hurt player
            if (squaredDistance < this.squaredAttackDistance) {
                this.tryToAttack(time);
            }
        }

        if (this.state === AiState.FOLLOW) {
            // Move to target
            if (this.getPosition().getSquareDistance(this.targetPosition) > this.squaredPositionThreshold) {
                if (this.getX() > this.targetPosition.x) {
                    this.setDirection(-1);
                } else {
                    this.setDirection(1);
                }
            }
        }
    }

    private updateAttack(time: number): void {
        if (time > this.lastStateChange + this.attackDelay) {
            // Hurt player
            const player = this.getPlayer();
            const playerDied = player?.hurt(35);
            if (playerDied) {
                this.setState(AiState.BORED, time);
                this.setDirection(0);
                return;
            }
            // Return to follow state
            this.setState(AiState.FOLLOW, time);
        }
    }

    private setState(state: AiState, time: number): void {
        if (this.state !== state) {
            this.state = state;
            this.lastStateChange = time;
        }
    }

    private tryToAttack(time: number): boolean {
        this.setState(AiState.ATTACK, time);
        return true;
    }

    private stopAndWaitTs = 0;
    private stopAndWaitDelaySec = 2;
    private moveTs = 0;
    private moveDelaySec = 0.2;


    private updateMoveAround(time: number): void {
        if (this.getPosition().getSquareDistance(this.moveAroundAnchor) > this.squaredMoveAroundDistance) {
            if (this.stopAndWaitTs === 0) {
                if (this.moveTs + this.moveDelaySec < time) {
                    this.setDirection(0);
                    this.stopAndWaitTs = time;
                }
            } else if (this.stopAndWaitTs + this.stopAndWaitDelaySec < time) {
                if (this.getX() > this.moveAroundAnchor.x) {
                    this.setDirection(-1);
                } else {
                    this.setDirection(1);
                }
                this.stopAndWaitTs = 0;
                this.moveTs = time;
            }
        }
        this.updateSearch(time);
    }
}
