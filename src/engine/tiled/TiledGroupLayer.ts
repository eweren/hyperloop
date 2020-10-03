import type { TiledGroupLayerJSON, TiledLayerJSON } from "*.tiledmap.json";

import { AbstractTiledLayer } from "./AbstractTiledLayer";

export function isTiledGroupLayerJSON(json: TiledLayerJSON): json is TiledGroupLayerJSON {
    return json.type === "group";
}

export class TiledGroupLayer extends AbstractTiledLayer<TiledGroupLayerJSON> {
    public static fromJSON(json: TiledGroupLayerJSON): TiledGroupLayer {
        return new TiledGroupLayer(json);
    }
}
