'use client'
import { useState } from "react";

const sizes = {
  sm: 20, md: 28, lg: 36, xl: 48, xll: 89
};

const LogoSymbol = ({ size = 89, color = "#6366f1", secondaryColor = "#a5b4fc" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24Z"
      fill={color}
      opacity="0.15"
    />
    <path
      d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="22" cy="16" r="2.5" fill={secondaryColor} />
    <circle cx="34" cy="16" r="2.5" fill={secondaryColor} />
    <circle cx="28" cy="24" r="3" fill={color} />
    <circle cx="22" cy="32" r="2.5" fill={secondaryColor} />
    <circle cx="34" cy="32" r="2.5" fill={secondaryColor} />
  </svg>
);

export default function LogoExporter() {
  const [exportSize, setExportSize] = useState(256);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#a5b4fc");
  const [bgTransparent, setBgTransparent] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [status, setStatus] = useState("");

  const exportPNG = () => {
    const svgString = `
      <svg width="${exportSize}" height="${exportSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${!bgTransparent ? `<rect width="48" height="48" fill="${bgColor}"/>` : ""}
        <path d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24Z" fill="${primaryColor}" opacity="0.15"/>
        <path d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="22" cy="16" r="2.5" fill="${secondaryColor}"/>
        <circle cx="34" cy="16" r="2.5" fill="${secondaryColor}"/>
        <circle cx="28" cy="24" r="3" fill="${primaryColor}"/>
        <circle cx="22" cy="32" r="2.5" fill="${secondaryColor}"/>
        <circle cx="34" cy="32" r="2.5" fill="${secondaryColor}"/>
      </svg>`;

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = exportSize;
      canvas.height = exportSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (!bgTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, exportSize, exportSize);
      }
      ctx.drawImage(img, 0, 0, exportSize, exportSize);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `recollect-logo-${exportSize}px.png`;
        a.click();
        setStatus(`✓ Exported ${exportSize}×${exportSize}px PNG`);
        setTimeout(() => setStatus(""), 3000);
      });
    };
    img.src = url;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a1a24", borderRadius: 20, padding: 40, width: 380, border: "1px solid #2a2a38", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>ReCollect Logo Exporter</h2>
        <p style={{ color: "#666", margin: "0 0 32px", fontSize: 13 }}>Export the symbol as PNG</p>

        {/* Preview */}
        <div style={{ background: bgTransparent ? "repeating-conic-gradient(#2a2a38 0% 25%, #222230 0% 50%) 0 0 / 16px 16px" : bgColor, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", height: 140, marginBottom: 28, border: "1px solid #2a2a38" }}>
          <LogoSymbol size={89} color={primaryColor} secondaryColor={secondaryColor} />
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Export Size
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[64, 128, 256, 512, 1024].map(s => (
                <button key={s} onClick={() => setExportSize(s)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid", borderColor: exportSize === s ? primaryColor : "#333", background: exportSize === s ? primaryColor + "22" : "transparent", color: exportSize === s ? primaryColor : "#666", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  {s}
                </button>
              ))}
            </div>
          </label>

          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}>
              Primary
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
                <span style={{ color: "#555", fontSize: 12 }}>{primaryColor}</span>
              </div>
            </label>
            <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}>
              Secondary
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
                <span style={{ color: "#555", fontSize: 12 }}>{secondaryColor}</span>
              </div>
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={bgTransparent} onChange={e => setBgTransparent(e.target.checked)} style={{ width: 16, height: 16, accentColor: primaryColor }} />
            <span style={{ color: "#aaa", fontSize: 13 }}>Transparent background</span>
            {!bgTransparent && <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} />}
          </label>

          <button onClick={exportPNG} style={{ background: primaryColor, color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, marginTop: 4 }}>
            ↓ Export PNG ({exportSize}×{exportSize})
          </button>

          {status && <p style={{ color: "#4ade80", fontSize: 13, textAlign: "center", margin: 0 }}>{status}</p>}
        </div>
      </div>
    </div>
  );
}