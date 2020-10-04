import { AiState, EnemyNode } from "./EnemyNode";
import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";

export class RatNode extends EnemyNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;

    @asset("sounds/fx/ratSqueak.mp3")
    private static readonly ratSoundAttack: Sound;

    @asset("sounds/fx/ratSqueak2.mp3")
    private static readonly ratSoundFollow: Sound;

    protected targetPosition: ReadonlyVector2;

    /** minimum distance between enemy and player to stop escaping */
    private squaredSafetyDistance = 50 ** 2;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: RatNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            ...args
        });
        this.targetPosition = this.getPosition();
        this.moveAroundAfterChase = true;
    }

    protected updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 20;
        const boundsHeight = 18;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 0;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight + offsetY));
        bounds.addVertex(new Vector2(offsetX, boundsHeight + offsetY));
    }

    protected updateAi(dt: number, time: number) {
        if (!this.isAlive()) {
            this.setDirection(0);
            this.stopSounds();
            return;
        }
        // AI
        switch (this.state) {
            case AiState.BORED:
            case AiState.ALERT:
                this.updateAlert(time);
                break;
            case AiState.MOVE_AROUND:
                this.updateMoveAround(time);
                break;
        }
    }

    protected updateMoveAround(time: number): void {
        if (this.getPosition().getSquareDistance(this.moveAroundAnchor) > this.squaredMoveAroundDistance) {
            if (this.stopAndWaitTs === 0) {
                if (this.moveTs + this.moveDelaySec < time) {
                    this.setTag("idle");
                    this.setDirection(0);
                    this.stopAndWaitTs = time;
                }
            } else if (this.stopAndWaitTs + this.stopAndWaitDelaySec < time) {
                this.setTag("walk");
                if (this.getX() > this.moveAroundAnchor.x) {
                    this.setDirection(-1);
                } else {
                    this.setDirection(1);
                }
                this.stopAndWaitTs = 0;
                this.moveTs = time;
            }
        }
        if (this.getDistanceToPlayerSquared() < this.squaredSafetyDistance) {
            this.setState(AiState.ALERT);
            this.stopSounds();
            RatNode.ratSoundAttack.play();
        }
    }

    private updateAlert(time: number): void {
        const player = this.getPlayer();
        if (player && this.getDistanceToPlayerSquared() < this.squaredSafetyDistance) {
            this.setTag("walk");
            this.setDirection(this.getX() < player.getX() ? -1 : 1);
        } else {
            this.targetPosition = this.getPosition();
            this.moveAroundAnchor.setVector(this.targetPosition);
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

    private stopSounds() {
        if (this.isSoundPlaying()) {
            RatNode.ratSoundAttack.stop();
            RatNode.ratSoundFollow.stop();
        }
    }

    private isSoundPlaying() {
        return RatNode.ratSoundAttack.isPlaying() || RatNode.ratSoundFollow.isPlaying();
    }

}
