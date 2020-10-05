import { EnemyNode } from "./EnemyNode";
import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";
import { rnd } from "../../engine/util/random";

export class MonsterNode extends EnemyNode {
    @asset("sprites/monster.aseprite.json")
    private static sprite: Aseprite;

    @asset("sounds/fx/zombieScream.mp3")
    private static readonly monsterSoundAttack: Sound;

    @asset("sounds/fx/drip.mp3")
    private static readonly monsterSoundDamage: Sound;

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
        this.hitpoints = rnd(65, 120) + rnd(rnd(100));
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

    public hurt(damage: number, origin: ReadonlyVector2): boolean {
        MonsterNode.monsterSoundDamage.play();
        return super.hurt(damage, origin);
    }

    private staySilent() {
        if (this.isScreaming()) {
            MonsterNode.monsterSoundAttack.stop();
        }
    }

    private isScreaming() {
        return MonsterNode.monsterSoundAttack.isPlaying();
    }

    protected scream() {
        if (!this.isScreaming()) {
            this.staySilent();
            MonsterNode.monsterSoundAttack.play();
        }
    }
}
