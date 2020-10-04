import { AiState, EnemyNode } from "./EnemyNode";
import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";

export class MonsterNode extends EnemyNode {
    @asset("sprites/monster.aseprite.json")
    private static sprite: Aseprite;

    @asset("sounds/fx/zombieScream.mp3")
    private static readonly monsterSoundAttack: Sound;

    protected targetPosition: ReadonlyVector2;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: MonsterNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            ...args
        });
        this.targetPosition = this.getPosition();
        this.moveAroundAfterChase = true;
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
                this.updateAttack(time);
                this.scream();
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

    protected updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 16;
        const boundsHeight = 34;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 6;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight + offsetY));
        bounds.addVertex(new Vector2(offsetX, boundsHeight + offsetY));
    }

private staySilent() {
    if (this.isScreaming()) {
        MonsterNode.monsterSoundAttack.stop();
    }
}

    private isScreaming() {
        return MonsterNode.monsterSoundAttack.isPlaying();
    }

    private scream() {
        switch (this.state) {
            case AiState.ATTACK:
                if (!this.isScreaming()) {
                    this.staySilent();
                    MonsterNode.monsterSoundAttack.play();
                }
                break;
            case AiState.BORED:
            case AiState.FOLLOW:
            case AiState.MOVE_AROUND:
                break;
        }
    }
}
