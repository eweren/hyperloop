import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { asset } from "../../engine/assets/Assets";
import { TiledMap } from "../../engine/tiled/TiledMap";
import { TiledMapNode } from "../../engine/scene/TiledMapNode";
import { CollisionNode } from "../nodes/CollisionNode";

export class GameScene extends Scene<Hyperloop> {
    @asset("map/map.tiledmap.json")
    private static map: TiledMap;

    private mapNode = new TiledMapNode({ map: GameScene.map, objects: {
        "collision": CollisionNode
    }});

    public setup() {
        this.mapNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2).appendTo(this.rootNode).transform(m => m.scale(0.4));
    }
}
