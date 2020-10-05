import { TextNode } from "../../../engine/scene/TextNode";
import { Hyperloop } from "../../Hyperloop";

export class AmmoCounterNode extends TextNode<Hyperloop> {

    public update(dt: number, time: number) {
        super.update(dt, time);
        this.setText(`${this.getGame().getPlayer().getAmmo()} | ${this.getGame().getPlayer().getMagazineSize()}`);
    }
}
