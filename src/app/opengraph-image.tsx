import { ImageResponse } from "next/og";

export const alt = "Porchlight — recruitment for the stage nobody sees";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #0e1020 0%, #2b2140 60%, #453258 100%)",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* the porch light */}
        <div
          style={{
            position: "absolute",
            top: 70,
            width: 420,
            height: 420,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(233,162,59,0.30) 0%, rgba(233,162,59,0.06) 55%, rgba(0,0,0,0) 72%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#e9a23b",
              boxShadow: "0 0 40px 12px rgba(233,162,59,0.55)",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>
            Porchlight
          </div>
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: 900,
            letterSpacing: -1.5,
          }}
        >
          Every child&apos;s story starts
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.1,
            color: "#fbe3b4",
            letterSpacing: -1.5,
          }}
        >
          with a light left on.
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 26,
            color: "rgba(255,255,255,0.62)",
            textAlign: "center",
            maxWidth: 760,
          }}
        >
          Foster parent recruitment for the years before the application
        </div>
      </div>
    ),
    size
  );
}
