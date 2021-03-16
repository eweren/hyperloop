import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { PlayerNode } from "../nodes/PlayerNode";
import { asset } from "../../engine/assets/Assets";
import { TiledMap } from "../../engine/tiled/TiledMap";
import { TiledMapNode } from "../../engine/scene/TiledMapNode";
import { CollisionNode } from "../nodes/CollisionNode";
import { TrainNode } from "../nodes/TrainNode";
import { LightNode } from "../nodes/LightNode";
import { SwitchNode } from "../nodes/SwitchNode";
import { Layer, STANDARD_FONT } from "../constants";
import { CameraLimitNode } from "../nodes/CameraLimitNode";
import { DoorNode } from "../nodes/DoorNode";
import { isDebugMap, isDev } from "../../engine/util/env";
import { MonsterNode } from "../nodes/MonsterNode";
import { RatNode } from "../nodes/RatNode";
import { CorpseNode } from "../nodes/CorpseNode";
import { FuseboxNode } from "../nodes/FuseboxNode";
import { TiledSoundNode } from "../nodes/TiledSoundNode";
import { FadeToBlackTransition } from "../../engine/transitions/FadeToBlackTransition";
import { SpawnNode } from "../nodes/SpawnNode";
import { TriggerNode } from "../nodes/TriggerNode";
import { DeadSpaceSuitNode } from "../nodes/DeadSpaceSuiteNode";
import { MusicManager } from "../MusicManager";
import { FxManager } from "../FxManager";
import { clamp } from "../../engine/util/math";
import { GameStatsNode } from "../nodes/GameStatsNode";
import { Direction } from "../../engine/geom/Direction";
import { BitmapFont } from "../../engine/assets/BitmapFont";

export enum TargetMap {
    HYPERLOOP = 0,
    DEBUG = 1
}

export const playerSpawnPoints = [
    { x: 772.666666666667, y: 508.666666666667 },
    { x:864, y:506.666666666667 },
    { x:941.333333333333, y:603.333333333333 },
    { x: 704.666666666667, y: 602 }
];

export class GameScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    @asset([
        "map/hyperloopMap.tiledmap.json",
        "map/debug.tiledmap.json"
    ])
    private static maps: TiledMap[];

    private targetMap = isDebugMap() ? TargetMap.DEBUG : TargetMap.HYPERLOOP;

    private mapNode = new TiledMapNode<Hyperloop>({ map: GameScene.maps[this.targetMap], objects: {
        "collision": CollisionNode,
        "player": PlayerNode,
        "enemy": MonsterNode,
        "rat": RatNode,
        "train": TrainNode,
        "light": LightNode,
        "cameraLimit": CameraLimitNode,
        "door": DoorNode,
        "corpse": CorpseNode,
        "powerswitch": SwitchNode,
        "fusebox": FuseboxNode,
        "sound": TiledSoundNode,
        "enemySpawn": SpawnNode,
        "trigger": TriggerNode,
        "deadspacesuit": DeadSpaceSuitNode
    }});
    private score: GameStatsNode | null = null;

    public setup() {
        this.inTransition = new FadeToBlackTransition({ duration: 2, delay: 1 });
        this.mapNode.moveTo(0, 0).appendTo(this.rootNode).transform(m => m.scale(1));
        const player = this.mapNode.getDescendantById("Player");
        const { x, y } = playerSpawnPoints[clamp(+(Math.random() * playerSpawnPoints.length).toFixed(), 0, playerSpawnPoints.length - 1)];
        player?.moveTo(x, y);
        this.camera.setFollow(player);
        this.setLightLayers([ Layer.LIGHT ]);
        this.setHudLayers([ Layer.HUD ]);

        if (this.targetMap === TargetMap.DEBUG) {
            MusicManager.getInstance().stop();
            FxManager.getInstance().stop();
        }

        setTimeout(() => {
            this.game.setupScene();
        });
    }

    public cleanup() {
        this.rootNode.clear();
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
                this.showScores();
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        if (event.key === "Tab") {
            if (!event.repeat) {
                this.hideScores();
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private showScores(): void {
        if (this.score == null) {
            this.score = new GameStatsNode({
                font: GameScene.font,
                anchor: Direction.CENTER,
                layer: Layer.HUD
            });
        }
        this.score.setX(this.camera.getWidth() / 2);
        this.score.setY(this.camera.getHeight() / 2);
        this.mapNode.appendChild(this.score);

    }
    private hideScores(): void {
        this.score?.remove();
    }

    // private enterDebugMode(): void {
    //     if (!this.debugMode) {
    //         this.debugMode = true;
    //         const bounds = this.mapNode.getSceneBounds();
    //         const scale = Math.min(GAME_WIDTH / bounds.width, GAME_HEIGHT / bounds.height);
    //         this.camera.setFollow(null).setLimits(this.mapNode.getBounds().toRect()).moveTo(bounds.centerX, bounds.centerY).setZoom(scale);
    //         this.onPointerDown.connect(this.handleTeleportClick, this);
    //     }
    // }

    // public leaveDebugMode(): void {
    //     if (this.debugMode) {
    //         const player = this.mapNode.getDescendantById("Player");
    //         if (player != null) {
    //             this.camera.setFollow(player).setZoom(1);
    //         }
    //         this.onPointerDown.disconnect(this.handleTeleportClick, this);
    //         this.debugMode = false;
    //     }
    // }

    // private handleTeleportClick(event: ScenePointerDownEvent): void {
    //     const player = this.mapNode.getDescendantById("Player");
    //     if (player != null) {
    //         player.moveTo(event.getX(), event.getY());
    //     }
    // }
}
