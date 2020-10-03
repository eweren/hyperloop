import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { PlayerNode } from "../nodes/PlayerNode";
import { asset } from "../../engine/assets/Assets";
import { TiledMap } from "../../engine/tiled/TiledMap";
import { TiledMapNode } from "../../engine/scene/TiledMapNode";
import { CollisionNode } from "../nodes/CollisionNode";
import { EnemyNode } from "../nodes/EnemyNode";
import { TrainNode } from "../nodes/TrainNode";

export class GameScene extends Scene<Hyperloop> {
    @asset("map/map.tiledmap.json")
    private static map: TiledMap;
    private playerNode = new PlayerNode();
    private enemyNode = new EnemyNode();
    private trainNode = new TrainNode();

    private mapNode = new TiledMapNode({ map: GameScene.map, objects: {
        "collision": CollisionNode
    }});

    public setup() {
        this.mapNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2).appendTo(this.rootNode).transform(m => m.scale(0.4));
        this.playerNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT - 85).appendTo(this.rootNode);
        this.enemyNode.moveTo(GAME_WIDTH * 0.9, GAME_HEIGHT - 85).appendTo(this.rootNode);
        this.trainNode.moveTo(GAME_WIDTH * 0.1, GAME_HEIGHT - 10).appendTo(this.rootNode);
    }
}
