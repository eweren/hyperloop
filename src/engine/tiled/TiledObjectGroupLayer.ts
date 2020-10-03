import type { TiledDrawOrder, TiledLayerJSON, TiledObjectGroupLayerJSON } from "*.tiledmap.json";

import { AbstractTiledLayer } from "./AbstractTiledLayer";

export function isTiledObjectGroupLayerJSON(json: TiledLayerJSON): json is TiledObjectGroupLayerJSON {
    return json.type === "objectgroup";
}

export class TiledObjectGroupLayer extends AbstractTiledLayer<TiledObjectGroupLayerJSON> {
    public static fromJSON(json: TiledObjectGroupLayerJSON): TiledObjectGroupLayer {
        return new TiledObjectGroupLayer(json);
    }

    public getDrawOrder(): TiledDrawOrder {
        return this.json.draworder;
    }

    /*
    @cacheResult
    public getObjects(): readonly TiledObject[] {
        return this.json.objects.map(json => TiledObject.fromJSON(json));
    }
    */
}
