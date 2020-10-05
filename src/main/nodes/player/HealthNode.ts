import { TextNode } from "../../../engine/scene/TextNode";
import { Hyperloop } from "../../Hyperloop";

export class HealthNode extends TextNode<Hyperloop> {

    public update(dt: number, time: number) {
        super.update(dt, time);
        this.setText(`${this.getGame().getPlayer().getHitpoints()} / 100`);
    }
}
