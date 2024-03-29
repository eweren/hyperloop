import { FontJSON } from "*.font.json";
import { loadImage } from "../util/graphics.js";

const CHAR_SPACING = 1;

export class BitmapFont {
    private sourceImage: HTMLImageElement;
    private canvas: HTMLCanvasElement;
    private colorMap: Record<string, number>;
    private charMap: string;
    private charWidths: number[];
    private compactablePrecursors: string[][];
    private charStartPoints: number[];
    private charCount: number;
    private charReverseMap: Record<string, number>;
    public charHeight!: number;
    private currentLineWidth = 0;

    private constructor(
        sourceImage: HTMLImageElement, colors: Record<string, string>, charMap: string,
        charHeight: number, charWidths: number[], compactablePrecursors: string[][], charMargin = 1
    ) {
        this.sourceImage = sourceImage;
        this.canvas = document.createElement("canvas");
        this.charMap = charMap;
        this.charHeight = charHeight;
        this.colorMap = this.prepareColors(colors);
        this.charWidths = charWidths;
        this.compactablePrecursors = compactablePrecursors;
        this.charStartPoints = [];
        this.charCount = charMap.length;
        this.charReverseMap = {};

        for (let i = 0; i < this.charCount; i++) {
            this.charStartPoints[i] = (i === 0) ? 0 : this.charStartPoints[i - 1] + this.charWidths[i - 1] + charMargin;
            const char = this.charMap[i];
            this.charReverseMap[char] = i;
        }
    }

    /**
     * Loads the sprite from the given source.
     *
     * @param source - The URL pointing to the JSON file of the sprite.
     * @return The loaded sprite.
     */
    public static async load(source: string): Promise<BitmapFont> {
        const json = await (await fetch(source)).json() as FontJSON;
        const baseURL = new URL(source, location.href);
        const image = await loadImage(new URL(json.image, baseURL));
        const characters = json.characterMapping.map(charDef => charDef.char).join("");
        const widths = json.characterMapping.map(charDef => charDef.width);
        const compactablePrecursors = json.characterMapping.map(charDef => charDef.compactablePrecursors || []);

        return new BitmapFont(image, json.colors, characters, json.characterHeight, widths, compactablePrecursors, json.margin);
    }

    private prepareColors(colorMap: { [x: string]: string; }): { [x: string]: number } {
        const result: { [x: string]: number} = {};
        const colors = Object.keys(colorMap);
        const count = colors.length;
        const w = this.canvas.width = this.sourceImage.width;
        const h = this.charHeight;
        this.canvas.height = h * count;
        const ctx = this.canvas.getContext("2d")!;

        // Fill with font
        for (let i = 0; i < count; i++) {
            result[colors[i]] = i;
            ctx.drawImage(this.sourceImage, 0, h * i);
        }

        // Colorize
        ctx.globalCompositeOperation = "source-in";

        for (let i = 0; i < count; i++) {
            ctx.fillStyle = colorMap[colors[i]];
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, h * i, w, h);
            ctx.clip();
            ctx.fillRect(0, 0, w, h * count);
            ctx.restore();
        }

        ctx.globalCompositeOperation = "source-over";

        return result;
    }

    private getCharIndex(char: string): number {
        let charIndex = this.charReverseMap[char];

        if (charIndex == null) {
            // To signalize missing char, use last char, which is a not-def glyph
            charIndex = this.charCount - 1;
        }

        return charIndex;
    }

    private drawCharacter(ctx: CanvasRenderingContext2D, char: number, color: string): void {
        const colorIndex = this.colorMap[color];
        const charIndex = (typeof char === "number") ? char : this.getCharIndex(char);
        const charX = this.charStartPoints[charIndex], charY = colorIndex * this.charHeight;

        ctx.drawImage(
            this.canvas, charX, charY, this.charWidths[charIndex], this.charHeight,
            0, 0, this.charWidths[charIndex], this.charHeight
        );
    }

    public drawText(
        ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align = 0,
        alpha = 1,
        equalCharWidth = false
    ): void {
        // Do nothing when no text or alpha is 0
        if (text === "" || alpha === 0) {
            return;
        }

        ctx.save();
        ctx.translate(x, y);

        // Ugly hack to correct text position to exact pixel boundary because Chrome renders broken character images
        // when exactly between two pixels (Firefox doesn't have this problem).
        if (ctx.getTransform) {
            const transform = ctx.getTransform();
            ctx.translate(
                Math.round(transform.e) - transform.e,
                Math.round(transform.f) - transform.f
            );
        }

        ctx.globalAlpha *= alpha;

        const { width } = this.measureText(text);
        ctx.translate(-align * width, 0);

        let precursorChar = null;

        const widthOfBiggestChar = this.charWidths.slice().sort((a, b) => b - a)[0];
        const lineLength = text.split("\n").sort((a, b) => b.length - a.length)[0].length;
        text = text.split("\n").map(s => s.padEnd(lineLength, " ")).join("\n");

        for (const currentChar of text) {
            const index = this.getCharIndex(currentChar);
            const spaceReduction = precursorChar && this.compactablePrecursors[index].includes(precursorChar) ? 1 : 0;
            ctx.translate(-spaceReduction, 0);
            if (currentChar === "\n") {
                if (equalCharWidth) {
                    ctx.translate(-lineLength * widthOfBiggestChar, this.charHeight + CHAR_SPACING);
                } else {
                    ctx.translate(-this.currentLineWidth * widthOfBiggestChar, this.charHeight + CHAR_SPACING);
                    this.currentLineWidth = 0;
                }
                precursorChar = currentChar;
            } else {
                if (equalCharWidth) {
                    const differenceInWidth = widthOfBiggestChar - this.charWidths[index];
                    ctx.translate(differenceInWidth / 2, 0);
                    this.drawCharacter(ctx, index, color);
                    precursorChar = currentChar;
                    ctx.translate(widthOfBiggestChar - differenceInWidth / 2, 0);
                } else {
                    this.drawCharacter(ctx, index, color);
                    ctx.translate(this.charWidths[index] + CHAR_SPACING, 0);
                    this.currentLineWidth += this.charWidths[index] + CHAR_SPACING;
                    precursorChar = currentChar;
                }
            }
        }

        ctx.restore();
    }

    public measureText(text: string, equalCharWidth?: boolean): { width: number, height: number } {
        let width = 0;
        let maxWidth = 0;
        let precursorChar = null;
        let height = this.charHeight;
        const widestWidth = this.charWidths.slice().sort((a, b) => b - a)[0];
        for (const currentChar of text) {
            const index = this.getCharIndex(currentChar);
            const spaceReduction = precursorChar && this.compactablePrecursors[index].includes(precursorChar) ? 1 : 0;
            if (currentChar === "\n") {
                height += this.charHeight;
                width = 0;
            } else {
                if (equalCharWidth) {
                    width += widestWidth;
                } else {
                    width += this.charWidths[index] - spaceReduction + CHAR_SPACING;
                }
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
            precursorChar = currentChar;
        }

        if (text.length > 0) {
            maxWidth -= CHAR_SPACING;
        }

        return { width: maxWidth, height };
    }

    public drawTextWithOutline(
        ctx: CanvasRenderingContext2D, text: string, xPos: number, yPos: number, textColor: string,
        outlineColor: string, align = 0
    ): void {
        for (let yOffset = yPos - 1; yOffset <= yPos + 1; yOffset++) {
            for (let xOffset = xPos - 1; xOffset <= xPos + 1; xOffset++) {
                if (xOffset !== xPos || yOffset !== yPos) {
                    this.drawText(ctx, text, xOffset, yOffset, outlineColor, align);
                }
            }
        }

        this.drawText(ctx, text, xPos, yPos, textColor, align);
    }
}
