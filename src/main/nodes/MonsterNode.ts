import { EnemyNode } from "./EnemyNode";
import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2 } from "../../engine/graphics/Vector2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";
import { rnd } from "../../engine/util/random";
import { Rect } from "../../engine/geom/Rect";
import { Layer } from "../constants";

export class MonsterNode extends EnemyNode {
    @asset("sprites/monster.aseprite.json")
    private static sprite: Aseprite;

    @asset("sounds/fx/zombieScream.mp3")
    private static readonly monsterSoundAttack: Sound;
    private attackSound = MonsterNode.monsterSoundAttack.shallowClone();

    @asset("sounds/fx/monsterHit.ogg")
    private static readonly monsterSoundDamage: Sound;
    private damageSound = MonsterNode.monsterSoundDamage.shallowClone();

    protected targetPosition: ReadonlyVector2;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: MonsterNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            sourceBounds: new Rect(8, 6, 16, 34),
            layer: Layer.FOREGROUND,
            ...args
        });
        this.targetPosition = this.getPosition();
        this.moveAroundAfterChase = true;
        this.hitpoints = rnd(65, 120) + rnd(rnd(100));
    }

    public hurt(damage: number, origin: ReadonlyVector2): boolean {
        this.damageSound.stop();
        this.damageSound.play();
        return super.hurt(damage, origin);
    }

    private staySilent() {
        if (this.isScreaming()) {
            this.attackSound.stop();
        }
    }

    private isScreaming() {
        return this.attackSound.isPlaying();
    }

    protected scream(direction?: number) {
        if (!this.isScreaming()) {
            this.staySilent();
            if (direction) {
                this.attackSound.setDirection(direction);
            }
            this.attackSound.play();
        }
    }
}
