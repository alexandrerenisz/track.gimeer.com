import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ver comentário em app/icon.tsx — mesmo monograma, tamanho pro apple-touch-icon.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1712",
          borderRadius: 32,
          color: "#bdf688",
          fontSize: 110,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
