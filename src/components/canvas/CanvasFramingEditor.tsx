import { Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Moveable, { type OnDrag, type OnDragStart, type OnResize, type OnResizeStart } from "react-moveable";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  type BoxLike,
  clampEditorScale,
  getEditorMaxScale,
  getEditorMinScale,
  resolveDefaultViewport,
  resolveImageBoxOnCanvas,
  resolveOutputAreaBox,
  resolveViewportFromImageBox,
} from "@/services/canvas/framing";
import type { CanvasViewport, LoadedImage } from "@/types/domain";

interface CanvasFramingEditorProps {
  sourceImage: LoadedImage;
  ratio: { width: number; height: number };
  viewport?: CanvasViewport;
  onViewportChange: (viewport: CanvasViewport) => void;
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
  onRequestUpload: () => void;
}

const moveableHandleDirections = ["nw", "n", "ne", "w", "e", "sw", "s", "se"] as const;

export const CanvasFramingEditor = ({
  sourceImage,
  ratio,
  viewport,
  onViewportChange,
  onCanvasSizeChange,
  onRequestUpload,
}: CanvasFramingEditorProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const viewportHostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageTargetRef = useRef<HTMLDivElement | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const dragStartBoxRef = useRef<BoxLike | null>(null);
  const resizeStartBoxRef = useRef<BoxLike | null>(null);
  const liveBoxRef = useRef<BoxLike | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null);

  const minScale = getEditorMinScale();
  const maxScale = getEditorMaxScale();
  const canvasReady = canvasSize.width > 1 && canvasSize.height > 1;

  const sourceSize = useMemo(
    () => ({ width: sourceImage.width, height: sourceImage.height }),
    [sourceImage.width, sourceImage.height],
  );

  const outputAreaBox = useMemo(
    () => resolveOutputAreaBox({ canvas: canvasSize, ratio }),
    [canvasSize, ratio],
  );

  const imageBox = useMemo(
    () => resolveImageBoxOnCanvas({ canvas: canvasSize, source: sourceSize, viewport }),
    [canvasSize, sourceSize, viewport],
  );

  const baseImageSize = useMemo(() => {
    if (!canvasReady) return { width: 1, height: 1 };
    const baseScale = Math.min(
      canvasSize.width / sourceSize.width,
      canvasSize.height / sourceSize.height,
    );
    return {
      width: Math.max(1, sourceSize.width * baseScale),
      height: Math.max(1, sourceSize.height * baseScale),
    };
  }, [canvasReady, canvasSize.height, canvasSize.width, sourceSize.height, sourceSize.width]);

  useEffect(() => {
    const node = viewportHostRef.current;
    if (!node) return;

    const syncSize = () => {
      const next = { width: node.clientWidth, height: node.clientHeight };
      setCanvasSize(next);
      onCanvasSizeChange(next);
    };

    syncSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => syncSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [onCanvasSizeChange]);

  // 首次有 canvas + source 但 viewport 未初始化时，写入默认 viewport（居中、contain 亮色框）
  useEffect(() => {
    if (!canvasReady) return;
    if (viewport) return;
    onViewportChange(resolveDefaultViewport({ canvas: canvasSize, source: sourceSize, ratio }));
  }, [canvasReady, canvasSize, onViewportChange, ratio, sourceSize, viewport]);

  // 校正越界 scale（例如旧数据或外部干预）
  useEffect(() => {
    if (!viewport) return;
    const clamped = clampEditorScale(viewport.scale);
    if (clamped !== viewport.scale) {
      onViewportChange({ ...viewport, scale: clamped });
    }
  }, [onViewportChange, viewport]);

  // 为 Moveable 手柄添加 aria-label
  useEffect(() => {
    if (!canvasReady || !viewport) return;
    const handleLabels: Record<string, string> = {
      nw: "左上角缩放",
      n: "上边缩放",
      ne: "右上角缩放",
      w: "左边缩放",
      e: "右边缩放",
      sw: "左下角缩放",
      s: "下边缩放",
      se: "右下角缩放",
    };
    const timer = window.setTimeout(() => {
      moveableHandleDirections.forEach((dir) => {
        const handle = document.querySelector(`.moveable-control.moveable-${dir}`);
        if (handle) {
          handle.setAttribute("aria-label", handleLabels[dir] ?? `${dir} resize handle`);
          handle.setAttribute("role", "slider");
        }
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [canvasReady, viewport]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [canvasSize.height, canvasSize.width, imageBox.height, imageBox.width, imageBox.x, imageBox.y]);

  const commitViewportFromBox = useCallback(
    (nextBox: BoxLike) => {
      if (!canvasReady) return;
      onViewportChange(
        resolveViewportFromImageBox({ canvas: canvasSize, source: sourceSize, imageBox: nextBox }),
      );
    },
    [canvasReady, canvasSize, onViewportChange, sourceSize],
  );

  // 用 ref 持有最新 commit，避免拖拽回调闭包过期
  const commitViewportFromBoxRef = useRef(commitViewportFromBox);
  useEffect(() => {
    commitViewportFromBoxRef.current = commitViewportFromBox;
  });

  const applyBoxToTarget = (box: BoxLike) => {
    const el = imageTargetRef.current;
    if (!el) return;
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
  };

  const handleCanvasRef = useCallback((node: HTMLDivElement | null) => {
    canvasRef.current = node;
    setCanvasElement(node);
  }, []);

  const handleDragStart = useCallback(
    (event: OnDragStart) => {
      const startBox = { ...imageBox };
      dragStartBoxRef.current = startBox;
      liveBoxRef.current = startBox;
      event.set([0, 0]);
    },
    [imageBox],
  );

  const handleDrag = useCallback((event: OnDrag) => {
    const startBox = dragStartBoxRef.current;
    if (!startBox) return;
    const newBox: BoxLike = {
      ...startBox,
      x: startBox.x + event.beforeTranslate[0],
      y: startBox.y + event.beforeTranslate[1],
    };
    liveBoxRef.current = newBox;
    applyBoxToTarget(newBox);
  }, []);

  const handleResizeStart = useCallback(
    (event: OnResizeStart) => {
      const startBox = { ...imageBox };
      resizeStartBoxRef.current = startBox;
      liveBoxRef.current = startBox;
      event.set([imageBox.width, imageBox.height]);
      event.setRatio(sourceSize.width / sourceSize.height);
      event.setMin([baseImageSize.width * minScale, baseImageSize.height * minScale]);
      event.setMax([baseImageSize.width * maxScale, baseImageSize.height * maxScale]);
      if (event.dragStart) {
        event.dragStart.set([0, 0]);
      }
    },
    [baseImageSize, imageBox, maxScale, minScale, sourceSize.height, sourceSize.width],
  );

  const handleResize = useCallback((event: OnResize) => {
    const startBox = resizeStartBoxRef.current;
    if (!startBox) return;
    const newBox: BoxLike = {
      x: startBox.x + event.drag.beforeTranslate[0],
      y: startBox.y + event.drag.beforeTranslate[1],
      width: event.boundingWidth,
      height: event.boundingHeight,
    };
    liveBoxRef.current = newBox;
    applyBoxToTarget(newBox);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    const finalBox = liveBoxRef.current;
    dragStartBoxRef.current = null;
    resizeStartBoxRef.current = null;
    liveBoxRef.current = null;

    if (finalBox) {
      commitViewportFromBoxRef.current(finalBox);
      // 下一帧 Moveable 重读目标位置，此时 React 已更新 left/top
      requestAnimationFrame(() => {
        moveableRef.current?.updateTarget();
      });
    }
  }, []);

  return (
    <div
      ref={viewportHostRef}
      className="relative h-full w-full self-stretch overflow-hidden bg-background/50"
    >
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRequestUpload}
          className="pointer-events-auto h-9 rounded-md bg-background/80 backdrop-blur"
        >
          <Upload className="h-4 w-4" />
          {t("common.upload")}
        </Button>
        <span className="rounded-md border border-border/70 bg-background/72 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
          {ratio.width}:{ratio.height}
        </span>
      </div>

      {/* 画布 —— 始终占满左侧，作为图片可放置的整个区域 */}
      <div
        ref={handleCanvasRef}
        className="absolute inset-0"
      >
        {/* 图片层 —— 等默认 viewport 写入后再渲染，避免初始一帧占满画布的闪烁 */}
        {canvasReady && viewport ? (
          <div
            ref={imageTargetRef}
            className="absolute touch-none select-none cursor-move"
            style={{
              left: imageBox.x,
              top: imageBox.y,
              width: imageBox.width,
              height: imageBox.height,
            }}
            aria-label={t("workspace.framingTitle")}
          >
            <img
              src={sourceImage.objectUrl}
              alt={sourceImage.name}
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-fill drop-shadow-[0_12px_36px_rgba(15,23,42,0.45)]"
            />
          </div>
        ) : null}

        {/* 亮色取景框 —— 按 ratio 居中，比例切换时仅它会变 */}
        {canvasReady ? (
          <div
            className="pointer-events-none absolute border-2 border-white/90 shadow-[0_0_80px_rgba(255,255,255,0.05)] transition-[left,top,width,height] duration-200 ease-out"
            style={{
              left: outputAreaBox.x,
              top: outputAreaBox.y,
              width: outputAreaBox.width,
              height: outputAreaBox.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.32)",
            }}
          />
        ) : null}

        {canvasReady && viewport ? (
          <Moveable
            ref={moveableRef}
            target={imageTargetRef}
            container={canvasElement}
            rootContainer={canvasElement}
            viewContainer={canvasElement}
            draggable
            resizable
            keepRatio
            origin={false}
            edge={false}
            linePadding={10}
            controlPadding={18}
            renderDirections={moveableHandleDirections as unknown as string[]}
            useResizeObserver
            useMutationObserver
            className="framing-moveable"
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleInteractionEnd}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleInteractionEnd}
          />
        ) : null}
      </div>

      <span className="sr-only">
        {isZh
          ? "拖动图片调整位置，拖拽四角或四边手柄缩放。缩放范围 0.35 到 4 倍。"
          : "Drag to reposition the image. Drag corner or edge handles to resize. Scale range 0.35x to 4x."}
      </span>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border/70 bg-background/76 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {t("workspace.framingHint")}
      </div>

      <div className="pointer-events-none absolute bottom-11 right-4 z-20 rounded-md border border-border/70 bg-background/76 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
        {isZh
          ? `缩放范围 ${minScale.toFixed(2)}x - ${maxScale.toFixed(0)}x`
          : `Scale ${minScale.toFixed(2)}x - ${maxScale.toFixed(0)}x`}
      </div>
    </div>
  );
};
