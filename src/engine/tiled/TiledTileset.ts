import { TiledTilesetJSON } from "*.tiledmap.json";
import { Color } from "../color/Color";
import { RGBAColor } from "../color/RGBAColor";
import { RGBColor } from "../color/RGBColor";
import { cacheResult } from "../util/cache";

export class TiledTileset {
    private constructor(
        private readonly json: TiledTilesetJSON
    ) {}

    public static fromJSON(json: TiledTilesetJSON): TiledTileset {
        return new TiledTileset(json);
    }

    public toJSON(): TiledTilesetJSON {
        return this.json;
    }

    /**
     * Returns the optional background color.
     *
     * @return The optional background color.
     */
    @cacheResult
    public getBackgroundColor(): RGBAColor | null {
        return this.json.backgroundcolor != null ? Color.fromJSON(this.json.backgroundcolor).toRGBA() : null;
    }

    public getColumns(): number {
        return this.json.columns;
    }

    public getFirstGID(): number {
        return this.json.firstgid;
    }

    public getImage(): string {
        return this.json.image;
    }

    public getImageWidth(): number {
        return this.json.imagewidth;
    }

    public getImageHeight(): number {
        return this.json.imageheight;
    }

    public getMargin(): number {
        return this.json.margin;
    }

    public getSource(): string | null {
        return this.json.source ?? null;
    }

    public getSpacing(): number {
        return this.json.spacing;
    }

    public getTileCount(): number {
        return this.json.tilecount;
    }

    public getTiledVersion(): string {
        return this.json.tiledversion;
    }

    public getTileWidth(): number {
        return this.json.tilewidth;
    }

    public getTileHeight(): number {
        return this.json.tileheight;
    }

    /**
     * Returns the optional transparency color.
     *
     * @return The optional transparency color.
     */
    @cacheResult
    public getTransparencyColor(): RGBColor | null {
        return this.json.transparentcolor != null ? RGBColor.fromJSON(this.json.transparentcolor) : null;
    }

    public getVersion(): number {
        return this.json.version;
    }
}
