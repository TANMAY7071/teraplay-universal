/**
 * React 18 type augmentation.
 *
 * `@types/react@18` declares only the camelCase `fetchPriority` prop, but
 * React 18.3's renderer does not recognize it and warns:
 * "React does not recognize the `fetchPriority` prop on a DOM element."
 *
 * The lowercase `fetchpriority` attribute is the HTML spec form. React 16+
 * passes unknown lowercase attributes straight through to the DOM, so it
 * renders correctly under React 18 and React 19. Only the type was missing.
 */
import "react";

declare module "react" {
  interface ImgHTMLAttributes<T> {
    fetchpriority?: "high" | "low" | "auto";
  }
}
