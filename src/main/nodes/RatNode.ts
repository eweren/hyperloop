import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { AiState, EnemyNode } from "./EnemyNode";

export class RatNode extends EnemyNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;

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
                this.setState(AiState.FOLLOW);
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
}
