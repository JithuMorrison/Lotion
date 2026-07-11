"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Pencil, Eraser, Trash2, Maximize2, Minimize2, Download,
} from "lucide-react";

type Tool = "pencil" | "eraser";

const COLORS = ["#000000", "#e03e3e", "#d9730d", "#dfab01", "#4d6461", "#0b6e99", "#6940a5", "#ad1a72"];
const SIZES = [2, 4, 6, 10];

function CanvasDrawing({ dataUrl, onChange }: { dataUrl: string; onChange: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [fullscreen, setFullscreen] = useState(false);

  const setupCanvas = useCallback((w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    if (dataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = dataUrl;
    }
  }, [dataUrl]);

  useEffect(() => {
    setupCanvas(fullscreen ? window.innerWidth - 40 : 800, fullscreen ? window.innerHeight - 80 : 360);
  }, [fullscreen, setupCanvas]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !ctxRef.current || !lastPoint.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 3 : size;
    ctx.stroke();
    lastPoint.current = pos;
  };

  const end = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL("image/png"));
  };

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = "canvas.png";
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap p-2 border-b border-border bg-muted/50 rounded-t-lg">
      <button onClick={() => setTool("pencil")} className={`p-1.5 rounded ${tool === "pencil" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title="Pencil"><Pencil className="size-4" /></button>
      <button onClick={() => setTool("eraser")} className={`p-1.5 rounded ${tool === "eraser" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title="Eraser"><Eraser className="size-4" /></button>
      <div className="w-px h-5 bg-border" />
      {COLORS.map((c) => (
        <button key={c} onClick={() => { setColor(c); setTool("pencil"); }} className={`w-5 h-5 rounded-full border-2 ${color === c && tool === "pencil" ? "border-foreground" : "border-border"}`} style={{ background: c }} title={c} />
      ))}
      <div className="w-px h-5 bg-border" />
      {SIZES.map((s) => (
        <button key={s} onClick={() => setSize(s)} className={`w-6 h-6 rounded flex items-center justify-center ${size === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title={`Size ${s}`}>
          <span className="rounded-full bg-current" style={{ width: s, height: s }} />
        </button>
      ))}
      <div className="w-px h-5 bg-border" />
      <button onClick={clear} className="p-1.5 rounded hover:bg-muted" title="Clear"><Trash2 className="size-4" /></button>
      <button onClick={download} className="p-1.5 rounded hover:bg-muted" title="Download"><Download className="size-4" /></button>
      <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 rounded hover:bg-muted ml-auto" title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col p-5">
        {toolbar}
        <div className="flex-1 mt-2 rounded-lg overflow-hidden border border-border bg-white">
          <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair"
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden">
      {toolbar}
      <div className="bg-white">
        <canvas ref={canvasRef} className="w-full touch-none cursor-crosshair block"
          style={{ height: 360 }}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      </div>
    </div>
  );
}

export const canvasBlockSpec = createReactBlockSpec(
  {
    type: "canvas",
    propSchema: {
      dataUrl: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <div contentEditable={false} onMouseDown={(e) => e.stopPropagation()}>
        <CanvasDrawing
          dataUrl={props.block.props.dataUrl}
          onChange={(url) => (props as any).editor.updateBlock(props.block, { type: "canvas", props: { dataUrl: url } })}
        />
      </div>
    ),
  }
)();
