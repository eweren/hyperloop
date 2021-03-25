import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { rnd } from "../../engine/util/random";
import { now } from "../../engine/util/time";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";


export enum AiState {
    BORED = 0,
    FOLLOW = 1,
    ATTACK = 2,
    ALERT = 3,
    MOVE_AROUND = 4,
}

export abstract class EnemyNode extends CharacterNode {

    // Character settings
    protected shootingRange = 150;
    protected speed = 100;
    protected acceleration = 600;
    protected deceleration = 900;
    protected jumpPower = 380;

    /** How far enemy can see player while idling */
    protected squaredViewDistance = 120 ** 2;

    /** How far enemy can hear player while idling */
    protected squaredHearDistance = 200 ** 2;

    /** If a shot was fired within the hearDuration from now, the enemy shall start chasing */
    protected hearDuration = 500;

    /** How far enemy can see player while chasing him */
    protected squaredAlertViewDistance = 160 ** 2;

    /** Distance to target position where enemy stops moving further */
    protected squaredPositionThreshold = 20 ** 2;

    /** Distance to player required for a successful melee attack */
    protected squaredAttackDistance = 20 ** 2;

    /** ms it takes for enemy to attack player */
    protected attackDelay = 0.3;

    protected alertedBy: "VIEW" | "SOUND" = "VIEW";
    private timeOfAlert = 0;
    private readonly stopFollowBySoundDelay = 2000;

    protected state: AiState = AiState.BORED;

    private lastStateChange = 0;

    // look direction change delays in seconds
    protected LOW_ALERT_CHANGE_DELAY = 3;
    protected HIGH_ALERT_CHANGE_DELAY = 0.5;
    protected lastLookDirectionChange = 0;

    protected minAlertDuration = 10;

    protected squaredMoveAroundDistance = 10 ** 2;

    /**
     * set to false, if after chase an enemy should transfer to ALERT,
     * set to true - for MOVE_AROUND
     */
    protected moveAroundAfterChase = false;

    protected abstract targetPosition: ReadonlyVector2;
    protected moveAroundAnchor: Vector2 = new Vector2(0, 0);

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
        this.updateAi(dt, time);
    }

    // default ai implementation
    protected updateAi(dt: number, time: number) {
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

        // Move to target
        if (this.getPosition().getSquareDistance(this.targetPosition) > this.squaredPositionThreshold) {
            if (this.getX() > this.targetPosition.x) {
                this.setDirection(-1);
            } else {
                this.setDirection(1);
            }
        } else {
            this.setDirection(0);
        }
    }

    protected getPlayer(): PlayerNode | undefined {
        const player = this.getScene()?.rootNode.getDescendantsByType(PlayerNode)[0];
        return player?.isAlive() ? player : undefined;
    }

    protected scream(direction?: number): void {
        // implementation is in the monster nodes
    }

    protected updateSearch(time: number): void {
        // Check distance to player
        const player = this.getPlayer();
        if (player) {
            if (this.canSeeOrHearPlayer(player)) {
                // Player spotted!
                this.setState(AiState.FOLLOW);
                this.targetPosition = player.getPosition();
                const distanceToPlayer = this.getX() - player.getX();
                let screamDirection = distanceToPlayer > 0 ? 1 : -1;
                if (Math.abs(distanceToPlayer) < 200) {
                    screamDirection = screamDirection * (Math.abs(distanceToPlayer)) / 200;
                }
                this.scream(screamDirection);
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
            this.setState(newState);
            this.setDirection(0);
        }
    }

    protected updateFollow(time: number): void {
        this.emitEvent("updateFollow", time);
        const player = this.getPlayer();
        this.autoJump();
        // Update target position if seeing player
        if (player) {
            // Update target if in sight
            const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
            if ((this.alertedBy === "SOUND" && now() - this.timeOfAlert < this.stopFollowBySoundDelay)
                || squaredDistance < this.squaredAlertViewDistance) {
                // Player spotted!
                this.setState(AiState.FOLLOW);
                this.targetPosition = player.getPosition();
                // Hurt player
                if (squaredDistance < this.squaredAttackDistance) {
                    this.tryToAttack();
                }
            } else {
                // Player too far away
                if (this.moveAroundAfterChase) {
                    // move around a bit before transferring to ALERT
                    this.setState(AiState.MOVE_AROUND);
                    //this.setDirection(this.direction * -1);
                    this.moveAroundAnchor.setVector(this.targetPosition);
                } else {
                    // stay ALERT, and look around actively
                    this.setState(AiState.ALERT);
                    this.setDirection(0);
                }
            }
        }
    }

    protected updateAttack(time: number): void {
        this.emitEvent("updateAttack", time);
        this.autoJump();
        if (time > this.lastStateChange + this.attackDelay) {
            // Hurt player
            // const player = this.getPlayer();
            const playerDied = false; //player?.hurt(clamp(Math.floor(Math.random() * 10), 2, 10), this.getScenePosition());
            this.scream();
            if (playerDied) {
                this.setState(AiState.BORED);
                this.setDirection(0);
                return;
            }
            // Return to follow state
            this.setState(AiState.FOLLOW);
        }
    }

    protected autoJump(threshold = 0.7): void {
        if (this.consecutiveXCollisions > threshold) {
            this.jump();
        }
    }

    protected setState(state: AiState, time: number = this.updateTime): void {
        if (this.state !== state) {
            this.state = state;
            this.lastStateChange = time;
        }
        if (this.getTag() === "hurt" || this.getTag() === "die") {
            return;
        }
        switch (state) {
            case AiState.ALERT:
            case AiState.BORED:
                this.setTag("idle");
                break;
            case AiState.ATTACK:
                this.setTag("attack");
                break;
            case AiState.FOLLOW:
            case AiState.MOVE_AROUND:
                this.setTag("walk");
                break;
        }
    }

    protected tryToAttack(): boolean {
        this.emitEvent("tryToAttack");
        this.setState(AiState.ATTACK);
        return true;
    }

    public hurt(damage: number, attackerId: string, origin: ReadonlyVector2): boolean {
        if (!super.hurt(damage, attackerId, origin)) {
            this.setTag("hurt");
            const pl = this.getPlayer();
            if (pl) {
                this.targetPosition = pl.getScenePosition();
                this.setState(AiState.FOLLOW);
            }
            return false;
        }
        this.setTag("die");
        return true;
    }

    protected stopAndWaitTs = 0;
    protected stopAndWaitDelaySec = 2;
    protected moveTs = 0;
    protected moveDelaySec = 0.2;


    protected updateMoveAround(time: number): void {
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

    public getPersonalEnemies(): PlayerNode[] {
        const enemies = this.getScene()?.rootNode.getDescendantsByType(PlayerNode) ?? [];
        return enemies;
    }

    private isLookingInPlayerDirection(player = this.getPlayer()): boolean {
        return player != null && ((this.getX() > player.getPosition().x) === this.isMirrorX());
    }

    public canSeeOrHearPlayer(player = this.getPlayer()): boolean {
        if (!player) {
            return false;
        }
        const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
        const origin = this.getHeadPosition(), target = player.getHeadPosition();
        const couldHearPlayer = (now() - player.getLastShotTime()) < this.hearDuration && squaredDistance < this.squaredHearDistance;
        const couldViewPlayer = this.isLookingInPlayerDirection(player) && squaredDistance < this.squaredViewDistance;
        const isColliding = this.getLineCollision(origin.x, origin.y, target.x - origin.x, target.y - origin.y) === player;
        if (isColliding) {
            this.alertedBy = couldHearPlayer ? "SOUND" : "VIEW";
            this.timeOfAlert = now();
        }
        return (couldHearPlayer || couldViewPlayer) && isColliding;
    }
}
