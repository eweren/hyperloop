import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { PlayerNode } from "../nodes/PlayerNode";
import { GAME_HEIGHT, GAME_WIDTH, STANDARD_FONT } from "../constants";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";

export class TitleScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    private playerNode = new PlayerNode();

    private titleNode = new TextNode({ font: TitleScene.font, anchor: Direction.TOP });

    public setup() {
        this.titleNode
            .setText("Hyperloop")
            .moveTo(GAME_WIDTH / 2, 10)
            .appendTo(this.rootNode);

        this.playerNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT - 10).appendTo(this.rootNode);
    }
}
