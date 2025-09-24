import React from "react";

type ShimImageSrc = string | { src?: string } | undefined;

type ShimImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: ShimImageSrc;
};

function resolveSrc(value: ShimImageSrc): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.src === "string") {
    return value.src;
  }
  if (value != null) {
    console.warn("next/image shim received unsupported src", value);
  }
  return "";
}

const Image = React.forwardRef<HTMLImageElement, ShimImageProps>(
  ({ src, alt, loading = "lazy", ...rest }, ref) => (
    <img ref={ref} src={resolveSrc(src)} alt={alt ?? ""} loading={loading} {...rest} />
  )
);

Image.displayName = "NextImageShim";

export default Image;

export type StaticImageData = { src: string };
