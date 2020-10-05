import { AiState, EnemyNode } from "./EnemyNode";
import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";
import { Rect } from "../../engine/geom/Rect";
import { rnd } from "../../engine/util/random";

export class RatNode extends EnemyNode {
    @asset("sprites/mouse.aseprite.json")
    private static sprite: Aseprite;

    @asset("sounds/fx/ratSqueak.mp3")
    private static readonly ratSoundAttack: Sound;
    private squeakSound = RatNode.ratSoundAttack.shallowClone();

    protected targetPosition: ReadonlyVector2;

    /** minimum distance between enemy and player to stop escaping */
    private squaredSafetyDistance = 100 ** 2;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: RatNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            sourceBounds: new Rect(3, 6, 8, 4),
            ...args
        });
        this.updateMoveAroundAnchor();
        this.setState(AiState.MOVE_AROUND);
        this.targetPosition = this.getPosition();
        this.hitpoints = 1;
    }

    public updateMoveAroundAnchor(position = this.getPosition()): void {
        this.moveAroundAnchor.setVector(position);
    }

    protected updateAi(dt: number, time: number) {
        if (!this.isAlive()) {
            this.setDirection(0);
            this.stopSounds();
            return;
        }
        // AI
        switch (this.state) {
            case AiState.ALERT:
                this.updateAlert(time);
                break;
            case AiState.MOVE_AROUND:
                this.updateMoveAround(time);
                break;
        }
    }

    private moveTimeMin = 0.3;
    private moveTimeMax = 1;
    private waitTimeMin = 2;
    private waitTimeMax = 5;
    private moveDelay = rnd(this.moveTimeMin, this.moveTimeMax);
    private waitTime = rnd(this.waitTimeMin, this.waitTimeMax);

    protected updateMoveAround(time: number): void {
        if (this.stopAndWaitTs === 0) {
            if (this.moveTs + this.moveDelay < time) {
                this.setDirection(0);
                this.stopAndWaitTs = time;
                this.waitTime = rnd(this.waitTimeMin, this.waitTimeMax);
            }
        } else if (this.stopAndWaitTs + this.waitTime < time) {
            this.setDirection(this.getX() >= this.moveAroundAnchor.x ? -1 : 1);
            this.stopAndWaitTs = 0;
            this.moveTs = time;
            this.moveDelay = rnd(this.moveTimeMin, this.moveTimeMax);
        }
        if (this.getDistanceToPlayerSquared() < this.squaredSafetyDistance) {
            this.escapeDistanceSquared = rnd(this.escapeDistanceMin, this.escapeDistanceMax) ** 2;
            this.setState(AiState.ALERT);
            this.squeak();
        }
        if (this.getDistanceToPlayerSquared() < this.squaredSafetyDistance || this.canSeeOrHearPlayer()) {
            this.setState(AiState.ALERT);
            this.squeak();
        }
    }

    private escapeDistanceMin = 150;
    private escapeDistanceMax = 250;
    private escapeDistanceSquared = rnd(this.escapeDistanceMin, this.escapeDistanceMax) ** 2;

    private updateAlert(time: number): void {
        const player = this.getPlayer();
        if (player && this.getDistanceToPlayerSquared() < this.squaredSafetyDistance + this.escapeDistanceSquared) {
            this.setDirection(this.getX() < player.getX() ? -1 : 1);
        } else {
            this.updateMoveAroundAnchor();
            this.setState(AiState.MOVE_AROUND);
        }
    }

    private getDistanceToPlayerSquared(): number {
        const player = this.getPlayer();
        if (!player) {
            return Infinity;
        }
        return player.getPosition().getSquareDistance(this.getPosition());
    }

    private stopSounds(): void {
        this.squeakSound.stop();
    }

    private squeak(): void {
        this.stopSounds();
        this.squeakSound.play();
    }
}
