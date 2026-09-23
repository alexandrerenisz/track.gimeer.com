import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Monograma gerado em runtime (ImageResponse), não um PNG estático: a gimeer.com
 * não expõe um favicon/selo próprio (só o wordmark completo em SVG, largo demais
 * pra caber legível num ícone quadrado), então isso é um "G" no verde da marca
 * (#bdf688) sobre o mesmo fundo escuro usado no chip da Logo — evita depender
 * de uma ferramenta de rasterização (sharp) que não é dependência do projeto.
 */
export default function Icon() {
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
          borderRadius: 6,
          color: "#bdf688",
          fontSize: 20,
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
