import { TiledLayerJSON, TiledLayerType } from "*.tiledmap.json";

import { AbstractTiledLayer } from "./AbstractTiledLayer";
import { isTiledGroupLayerJSON, TiledGroupLayer } from "./TiledGroupLayer";
import { isTiledImageLayerJSON, TiledImageLayer } from "./TiledImageLayer";
import { isTiledObjectGroupLayerJSON } from "./TiledObject";
import { TiledObjectGroupLayer } from "./TiledObjectGroupLayer";
import { isTiledTileLayerJSON, TiledTileLayer } from "./TiledTileLayer";

export interface TiledLayer<T extends TiledLayerJSON = TiledLayerJSON> {
    getType(): TiledLayerType;
    getId(): number;
    getName(): string;
    getOffsetX(): number;
    getOffsetY(): number;
    getOpacity(): number;
    isVisible(): boolean;
    getX(): number;
    getY(): number;
    getWidth(): number;
    getHeight(): number;
}

export namespace TiledLayer {
    export function fromJSON(json: TiledLayerJSON, baseURL: string | URL): AbstractTiledLayer {
        if (isTiledImageLayerJSON(json)) {
            return TiledImageLayer.fromJSON(json, baseURL);
        } else if (isTiledTileLayerJSON(json)) {
            return TiledTileLayer.fromJSON(json, baseURL);
        } else if (isTiledObjectGroupLayerJSON(json)) {
            return TiledObjectGroupLayer.fromJSON(json, baseURL);
        } else if (isTiledGroupLayerJSON(json)) {
            return TiledGroupLayer.fromJSON(json, baseURL);
        } else {
            throw new Error("Unknown tiled layer type: " + json.type);
        }
    }
}
