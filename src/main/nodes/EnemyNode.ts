import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { rnd } from "../../engine/util/random";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

enum AiState {
    BORED = 0,
    FOLLOW = 1,
    ATTACK = 2,
    ALERT = 3
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
    private squaredAlertViewDistance = 120 ** 2;

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

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: EnemyNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            ...args
        });
        this.targetPosition = this.getPosition();
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
        }
    }

    private getPlayer(): PlayerNode | undefined {
        // TODO get player from some global game state variable instead of via id
        return this.getScene()?.rootNode.getDescendantsByType(PlayerNode)[0];
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
            } else {
                // randomly change looking direction
                const lookDirectionChangeDelay = this.state === AiState.ALERT ? this.HIGH_ALERT_CHANGE_DELAY : this.LOW_ALERT_CHANGE_DELAY;
                const chance = this.state === AiState.ALERT ? 20 : 5;
                if (rnd(1, 100) < chance && this.lastLookDirectionChange + lookDirectionChangeDelay < time) {
                    this.setMirrorX(!this.isMirrorX());
                    this.lastLookDirectionChange = time;
                }

                // check if it is time to be bored again
                if (this.state === AiState.ALERT
                    && rnd(1, 100) < 5 && this.lastStateChange + this.minAlertDuration < time) {
                    this.setState(AiState.BORED, time);
                }
            }
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
                // stay ALERT, and look around actively
                this.setState(AiState.ALERT, time);
                this.setDirection(0);
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
            // TODO get player from some global game state variable instead of via id
            const player = this.getScene()?.getNodeById("player") as PlayerNode;
            player?.hurt();
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

}
