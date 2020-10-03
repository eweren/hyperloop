import type { TiledLayerJSON, TiledObjectGroupLayerJSON, TiledObjectJSON } from "*.tiledmap.json";
import { TiledProperties } from "./TiledProperties";

export function isTiledObjectGroupLayerJSON(json: TiledLayerJSON): json is TiledObjectGroupLayerJSON {
    return json.type === "objectgroup";
}

export class TiledObject extends TiledProperties<TiledObjectJSON> {
    public toJSON(): TiledObjectJSON {
        return this.json;
    }

    public static fromJSON(json: TiledObjectJSON, baseURL: string | URL): TiledObject {
        return new TiledObject(json, baseURL);
    }

    public getId(): number {
        return this.json.id;
    }

    public getName(): string {
        return this.json.name;
    }

    public getType(): string {
        return this.json.type;
    }

    public getHeight(): number {
        return this.json.height;
    }

    public getWidth(): number {
        return this.json.width;
    }

    public isVisible(): boolean {
        return this.json.visible;
    }

    public getX(): number {
        return this.json.x;
    }

    public getY(): number {
        return this.json.y;
    }

    public getRotation(): number {
        return this.json.rotation;
    }
}
