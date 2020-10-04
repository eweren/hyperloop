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
            this.staySilent();
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
                this.sqeak();
                break;
            case AiState.ATTACK:
                this.setState(AiState.FOLLOW);
                this.sqeak();
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
        }
    }

    private staySilent() {
        if (this.isSqeaking()) {
            RatNode.ratSoundAttack.stop();
            RatNode.ratSoundFollow.stop();
        }
    }

    private isSqeaking() {
        return RatNode.ratSoundAttack.isPlaying() || RatNode.ratSoundFollow.isPlaying();
    }

    private sqeak() {
        switch (this.state) {
            case AiState.ATTACK:
                if (!this.isSqeaking()) {
                    this.staySilent();
                    RatNode.ratSoundAttack.play();
                }
                break;
            case AiState.BORED:
            case AiState.FOLLOW:
            case AiState.MOVE_AROUND:
                if (!this.isSqeaking()) {
                    this.staySilent();
                    RatNode.ratSoundFollow.play();
                }
                break;
        }
    }
}
