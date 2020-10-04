import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { PlayerNode } from "../nodes/PlayerNode";
import { asset } from "../../engine/assets/Assets";
import { TiledMap } from "../../engine/tiled/TiledMap";
import { TiledMapNode } from "../../engine/scene/TiledMapNode";
import { CollisionNode } from "../nodes/CollisionNode";
import { EnemyNode } from "../nodes/EnemyNode";
import { TrainNode } from "../nodes/TrainNode";
import { LightNode } from "../nodes/LightNode";
import { SwitchNode } from "../nodes/SwitchNode";
import { LIGHT_LAYER } from "../constants";
import { CameraLimitNode } from "../nodes/CameraLimitNode";
import { DoorNode } from "../nodes/DoorNode";

export class GameScene extends Scene<Hyperloop> {
    @asset("map/testMap.tiledmap.json")
    private static map: TiledMap;

    private mapNode = new TiledMapNode({ map: GameScene.map, objects: {
        "collision": CollisionNode,
        "player": PlayerNode,
        "enemy": EnemyNode,
        "train": TrainNode,
        "light": LightNode,
        "cameraLimit": CameraLimitNode
    }});

    public setup() {
        this.mapNode.moveTo(0, 0).appendTo(this.rootNode).transform(m => m.scale(1));
        this.camera.setFollow(this.mapNode.getDescendantById("Player"));
        this.setLightLayers([ LIGHT_LAYER ]);

        const door = new DoorNode();
        door.moveTo(1040, 380).setLocked(true).appendTo(this.mapNode);
        new SwitchNode({ onlyOnce: false, onUpdate: (state) => door.setLocked(!state) }).moveTo(1130, 380).appendTo(this.mapNode);
        new SwitchNode({ onlyOnce: true }).moveTo(250, 380).appendTo(this.mapNode);
        const ratEnemy = new EnemyNode({
            id: "15",
            x: 340,
            y: 334.666666666667
        }, "rat");
        ratEnemy.appendTo(this.mapNode);
    }
}
