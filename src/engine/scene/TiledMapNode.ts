import { Game } from "../Game";
import { Direction } from "../geom/Direction";
import { TiledMap } from "../tiled/TiledMap";
import { TiledObjectGroupLayer } from "../tiled/TiledObjectGroupLayer";
import { TiledTileLayer } from "../tiled/TiledTileLayer";
import { radians } from "../util/math";
import { SceneNode, SceneNodeArgs } from "./SceneNode";
import { TiledMapLayerNode } from "./TiledMapLayerNode";

/**
 * Constructor arguments for [[TiledMapNode]].
 */
export interface TiledMapNodeArgs extends SceneNodeArgs {
    map: TiledMap,
    objects?: Record<string, new (args: SceneNodeArgs) => SceneNode>;
}

export class TiledMapNode<T extends Game> extends SceneNode<T> {
    /**
     * Creates a new scene node displaying the given Tiled Map.
     */
    public constructor({ map, objects, ...args }: TiledMapNodeArgs) {
        super({
            width: map.getWidth() * map.getTileWidth(),
            height: map.getHeight() * map.getTileHeight(),
            anchor: Direction.TOP_LEFT,
            childAnchor: Direction.TOP_LEFT,
            ...args
        });
        for (const layer of map.getLayers()) {
            if (layer instanceof TiledTileLayer) {
                this.appendChild(new TiledMapLayerNode({ map, name: layer.getName() }));
            } else if (layer instanceof TiledObjectGroupLayer) {
                for (const object of layer.getObjects()) {
                    const constructor = (objects != null ? objects[object.getType()] : null) ?? SceneNode;
                    const node = new constructor({
                        id: object.getName(),
                        x: object.getX(),
                        y: object.getY(),
                        width: object.getWidth() > 0 ? object.getWidth() : undefined,
                        height: object.getHeight() > 0 ? object.getHeight() : undefined,
                        showBounds: object.getOptionalProperty("showBounds", "bool")?.getValue()
                    });
                    node.transform(m => m.rotate(radians(object.getRotation())));
                    this.appendChild(node);
                }
            } else if (layer instanceof Object) {
                console.log("Unknown layer", layer.constructor.name);
            }
        }
    }
}
