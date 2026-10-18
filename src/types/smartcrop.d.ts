declare module 'smartcrop' {
  export interface CropOptions {
    width?: number;
    height?: number;
    aspect?: number;
    cropWidth?: number;
    cropHeight?: number;
    detailWeight?: number;
    skinColor?: number[];
    skinBias?: number;
    skinBrightnessMin?: number;
    skinBrightnessMax?: number;
    skinThreshold?: number;
    skinWeight?: number;
    saturationBrightnessMin?: number;
    saturationBrightnessMax?: number;
    saturationThreshold?: number;
    saturationBias?: number;
    saturationWeight?: number;
    scoreDownSample?: number;
    step?: number;
    scaleStep?: number;
    minScale?: number;
    maxScale?: number;
    edgeRadius?: number;
    edgeWeight?: number;
    outsideImportance?: number;
    boostWeight?: number;
    ruleOfThirds?: boolean;
    prescale?: boolean;
    debug?: boolean;
    boost?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      weight: number;
    }>;
  }

  export interface CropResult {
    topCrop: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    crops: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      score: {
        detail: number;
        skin: number;
        saturation: number;
        edge: number;
        ruleOfThirds: number;
        total: number;
      };
    }>;
  }

  export function crop(
    image: HTMLImageElement | HTMLCanvasElement,
    options: CropOptions
  ): Promise<CropResult>;
}
