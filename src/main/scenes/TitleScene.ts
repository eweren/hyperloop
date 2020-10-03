import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { PlayerNode } from "../nodes/PlayerNode";
import { GAME_HEIGHT, GAME_WIDTH, STANDARD_FONT } from "../constants";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { EnemyNode } from "../nodes/EnemyNode";
import { TrainNode } from "../nodes/TrainNode";

export class TitleScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    private playerNode = new PlayerNode();
    private enemyNode = new EnemyNode();
    private trainNode = new TrainNode();

    private titleNode = new TextNode({ font: TitleScene.font, anchor: Direction.TOP });

    public setup() {
        this.titleNode
            .setText("Hyperloop")
            .moveTo(GAME_WIDTH / 2, 10)
            .appendTo(this.rootNode);

        this.playerNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT - 10).appendTo(this.rootNode);
        this.enemyNode.moveTo(GAME_WIDTH * 0.9, GAME_HEIGHT - 10).appendTo(this.rootNode);
        this.trainNode.moveTo(GAME_WIDTH * 0.1, GAME_HEIGHT - 10).appendTo(this.rootNode);
    }
}
