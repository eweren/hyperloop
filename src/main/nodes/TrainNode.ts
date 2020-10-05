import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { RGBColor } from "../../engine/color/RGBColor";
import { Direction } from "../../engine/geom/Direction";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { clamp } from "../../engine/util/math";
import { Layer } from "../constants";
import { Hyperloop } from "../Hyperloop";
import { LightNode } from "./LightNode";

export class TrainNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/hyperloopInt.aseprite.json")
    private static sprite: Aseprite;
    @asset("sprites/hyperloopExt.aseprite.json")
    private static foregroundSprite: Aseprite;

    public foreground: AsepriteNode<Hyperloop>;

    private interiorLight: LightNode;
    private opacitySpeed = 1;
    private visibility = 1;
    private targetOpacity = 0;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: TrainNode.sprite,
            anchor: Direction.BOTTOM,
            ...args,
            layer: Layer.BACKGROUND
        });
        this.interiorLight = new LightNode({
            x: -200,
            y: -30,
            width: 390,
            height: 80,
            layer: Layer.LIGHT
        });
        this.interiorLight.setColor(new RGBColor(255, 255,255));
        this.interiorLight.appendTo(this);
        this.foreground = new AsepriteNode({
            aseprite: TrainNode.foregroundSprite,
            anchor: Direction.CENTER,
            layer: Layer.DEFAULT
        });
        this.appendChild(this.foreground);
        this.foreground.setOpacity(Infinity);
        (window as any).train = this;
    }

    public update(dt: number, time: number): void {
        if (this.visibility !== this.targetOpacity) {
            const direction = this.targetOpacity > this.visibility ? 1 : -1;
            this.visibility = clamp(this.visibility + dt * this.opacitySpeed * direction, 0, 1);
            this.foreground.setOpacity(this.visibility);
            this.interiorLight.setOpacity(1 - this.visibility);
        }
    }

    public showInner(): void {
        this.targetOpacity = 0;
    }

    public hideInner(): void {
        this.targetOpacity = 1;
    }
}
