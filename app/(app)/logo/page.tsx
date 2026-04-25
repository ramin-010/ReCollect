'use client'
import { useState } from "react";

const LogoSymbol = ({ 
  size = 89, 
  color = "#3b83f6", 
  secondaryColor = "#b3b3b3"
}) => (
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
  const [primaryColor, setPrimaryColor] = useState("#3b83f6");
  const [secondaryColor, setSecondaryColor] = useState("#b3b3b3");
  const [bgTransparent, setBgTransparent] = useState(true);
  const [bgColor, setBgColor] = useState("#0f0f0f");
  const [status, setStatus] = useState("");
  const [padding, setPadding] = useState(15);

  const exportPNG = () => {
    // The pure logo contents fit exactly within these bounds:
    // We add 1 unit to the Y-axis and Height so the top doesn't clip
    const baseX = 14.5;
    const baseY = 13.5;
    const baseW = 27;
    const baseH = 21;

    // Center of the logo content
    const centerX = baseX + baseW / 2;  // 28
    const centerY = baseY + baseH / 2;  // 24

    // Use the larger dimension so the square fits the full logo
    const maxDim = Math.max(baseW, baseH);

    // Add padding on each side
    const padFraction = padding / 100;
    const squareSize = maxDim + maxDim * padFraction * 2;

    // Position the square viewBox centered on the logo
    const viewBoxX = centerX - squareSize / 2;
    const viewBoxY = centerY - squareSize / 2;

    // Export as a square canvas
    const canvasSize = exportSize;
    
    const svgString = `<svg width="${canvasSize}" height="${canvasSize}" viewBox="${viewBoxX} ${viewBoxY} ${squareSize} ${squareSize}" fill="none" xmlns="http://www.w3.org/2000/svg">${!bgTransparent ? `<rect x="${viewBoxX}" y="${viewBoxY}" width="${squareSize}" height="${squareSize}" fill="${bgColor}"/>` : ""}<path d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24Z" fill="${primaryColor}" opacity="0.15"/><path d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="16" r="2.5" fill="${secondaryColor}"/><circle cx="34" cy="16" r="2.5" fill="${secondaryColor}"/><circle cx="28" cy="24" r="3" fill="${primaryColor}"/><circle cx="22" cy="32" r="2.5" fill="${secondaryColor}"/><circle cx="34" cy="32" r="2.5" fill="${secondaryColor}"/></svg>`;

    // Use base64 data URI instead of Blob URL — browsers reliably
    // rasterize SVGs at the correct dimensions with data URIs
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    const img = new Image();
    img.width = canvasSize;
    img.height = canvasSize;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      if (!bgTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
      }
      
      ctx.drawImage(img, 0, 0, canvasSize, canvasSize);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `recollect-logo-${canvasSize}px.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        setStatus(`✓ Exported ${canvasSize}×${canvasSize}px PNG`);
        setTimeout(() => setStatus(""), 3000);
      });
    };
    img.src = dataUrl;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a1a24", borderRadius: 20, padding: 40, width: 440, border: "1px solid #2a2a38", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>ReCollect Logo Exporter</h2>
        <p style={{ color: "#666", margin: "0 0 32px", fontSize: 13 }}>Export the official brand logo</p>

        {/* Preview */}
        <div style={{ background: bgTransparent ? "repeating-conic-gradient(#2a2a38 0% 25%, #222230 0% 50%) 0 0 / 16px 16px" : bgColor, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", height: 160, marginBottom: 28, border: "1px solid #2a2a38", overflow: 'hidden' }}>
          <LogoSymbol size={64} color={primaryColor} secondaryColor={secondaryColor} />
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          <div style={{ display: "flex", gap: 16, alignItems: 'center' }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={bgTransparent} onChange={e => setBgTransparent(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ color: "#eee", fontSize: 13, fontWeight: 600 }}>Transparent bg</span>
            </label>
          </div>

          <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Padding: {padding}%
            <input type="range" min={0} max={40} value={padding} onChange={e => setPadding(Number(e.target.value))} style={{ width: '100%', marginTop: 6, accentColor: '#6366f1' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', textTransform: 'none', marginTop: 2 }}>
              <span>0% (edge-to-edge)</span>
              <span>40% (lots of space)</span>
            </div>
          </label>

          <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Theme Presets (from globals.css)
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <button onClick={() => { setPrimaryColor('#3b83f6'); setSecondaryColor('#b3b3b3'); setBgColor('#0f0f0f'); }} style={{ padding: "8px 0", background: "#222230", color: "#60a5fa", border: '1px solid #333', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Brand (Dark Theme)</button>
              <button onClick={() => { setPrimaryColor('#0b63f3'); setSecondaryColor('#af21f7'); setBgColor('#ffffff'); }} style={{ padding: "8px 0", background: "#ffffff", color: "#3b82f6", border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Brand (Light Theme)</button>
              <button onClick={() => { setPrimaryColor('#000000'); setSecondaryColor('#444444'); setBgColor('#ffffff'); }} style={{ padding: "8px 0", background: "#f3f4f6", color: "#000000", border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>B&W (Light Bg)</button>
              <button onClick={() => { setPrimaryColor('#ffffff'); setSecondaryColor('#cccccc'); setBgColor('#000000'); }} style={{ padding: "8px 0", background: "#000000", color: "#ffffff", border: '1px solid #333', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>B&W (Dark Bg)</button>
            </div>
          </label>

          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <label style={{ color: "#aaa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}>
              Pri/Sec override
              <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: 11, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff' }} />
                <div style={{ width: 4 }} />
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: 11, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff' }} />
              </div>
            </label>
            <label style={{ color: "#aaa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}>
              BG override
              <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} disabled={bgTransparent} style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer', opacity: !bgTransparent ? 1 : 0.4 }} />
                <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} disabled={bgTransparent} style={{ width: '100%', padding: '4px', fontSize: 11, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff', opacity: !bgTransparent ? 1 : 0.4 }} />
              </div>
            </label>
          </div>

          <label style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>
            Export Size (px)
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[64, 128, 256, 512, 1024].map(s => (
                <button key={s} onClick={() => setExportSize(s)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid", borderColor: exportSize === s ? '#6366f1' : "#333", background: exportSize === s ? '#6366f1' + "22" : "transparent", color: exportSize === s ? '#6366f1' : "#666", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#666', textTransform: 'none' }}>Custom:</span>
              <input type="number" value={exportSize} onChange={e => setExportSize(Number(e.target.value))} min={16} max={4000} style={{ width: 80, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff' }} />
            </div>
          </label>

          <button onClick={exportPNG} style={{ background: '#6366f1', color: "#fff", border: "none", borderRadius: 12, padding: "16px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, marginTop: 12, transition: 'background 0.2s', ...({ ':hover': { background: '#4f46e5' }} as any) }}>
            ↓ Export PNG
          </button>

          {status && <p style={{ color: "#4ade80", fontSize: 13, textAlign: "center", margin: 0, fontWeight: 600 }}>{status}</p>}
        </div>
      </div>
    </div>
  );
}