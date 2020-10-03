import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { PlayerNode } from "../nodes/PlayerNode";
import { asset } from "../../engine/assets/Assets";
import { TiledMap } from "../../engine/tiled/TiledMap";
import { TiledMapNode } from "../../engine/scene/TiledMapNode";
import { CollisionNode } from "../nodes/CollisionNode";
import { EnemyNode } from "../nodes/EnemyNode";
import { TrainNode } from "../nodes/TrainNode";
import { Rect } from "../../engine/geom/Rect";
import { LightNode } from "../nodes/LightNode";

export class GameScene extends Scene<Hyperloop> {
    @asset("map/map.tiledmap.json")
    private static map: TiledMap;

    private mapNode = new TiledMapNode({ map: GameScene.map, objects: {
        "collision": CollisionNode,
        "player": PlayerNode,
        "enemy": EnemyNode,
        "train": TrainNode,
        "light": LightNode
    }});

    public setup() {
        const map = GameScene.map;
        this.mapNode.moveTo(0, 0).appendTo(this.rootNode).transform(m => m.scale(1));
        this.camera.setFollow(this.mapNode.getDescendantById("Player"));
        this.camera.setLimits(new Rect(0, 0, map.getWidth() * map.getTileWidth(),
            map.getHeight() * map.getTileHeight()));
        this.setLightLayers([ 1 ]);
    }
}
