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
import { GAME_HEIGHT, GAME_WIDTH, LIGHT_LAYER } from "../constants";
import { CameraLimitNode } from "../nodes/CameraLimitNode";
import { DoorNode } from "../nodes/DoorNode";
import { ScenePointerDownEvent } from "../../engine/scene/events/ScenePointerDownEvent";
import { isDev } from "../../engine/util/env";

export class GameScene extends Scene<Hyperloop> {
    @asset("map/hyperloopMap.tiledmap.json")
    private static map: TiledMap;

    private debugMode: boolean = false;

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
    }

    public activate() {
        if (isDev()) {
            this.game.keyboard.onKeyDown.connect(this.handleKeyDown, this);
            this.game.keyboard.onKeyUp.connect(this.handleKeyUp, this);
        }
    }

    public deactivate() {
        if (isDev()) {
            this.game.keyboard.onKeyDown.disconnect(this.handleKeyDown, this);
            this.game.keyboard.onKeyUp.disconnect(this.handleKeyUp, this);
        }
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === "Tab") {
            if (!event.repeat) {
                this.enterDebugMode();
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        if (event.key === "Tab") {
            if (!event.repeat) {
                this.leaveDebugMode();
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private enterDebugMode(): void {
        if (!this.debugMode) {
            this.debugMode = true;
            const bounds = this.mapNode.getSceneBounds();
            const scale = Math.min(GAME_WIDTH / bounds.width, GAME_HEIGHT / bounds.height);
            this.camera.setFollow(null).setLimits(this.mapNode.getBounds().toRect()).moveTo(bounds.centerX, bounds.centerY).setZoom(scale);
            this.onPointerDown.connect(this.handleTeleportClick, this);
        }
    }

    public leaveDebugMode(): void {
        if (this.debugMode) {
            const player = this.mapNode.getDescendantById("Player");
            if (player != null) {
                this.camera.setFollow(player).setZoom(1);
            }
            this.onPointerDown.disconnect(this.handleTeleportClick, this);
            this.debugMode = false;
        }
    }

    private handleTeleportClick(event: ScenePointerDownEvent): void {
        const player = this.mapNode.getDescendantById("Player");
        if (player != null) {
            player.moveTo(event.getX(), event.getY());
        }
    }
}
