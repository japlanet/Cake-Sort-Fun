import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { cellCenter } from "@/components/Board";
import type { Board } from "@/game/types";

const TAP_SLOP = 10;
/** The dragged cake sits this far above the finger (fraction of its size) so it stays visible. */
const GHOST_LIFT = 0.3;

interface Drag {
  trayIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  target: number | null;
}

/** The part of a drag React needs to render; coordinates stay in a ref. */
export interface DragView {
  trayIndex: number;
  moved: boolean;
  target: number | null;
}

interface Options {
  boardRef: RefObject<HTMLDivElement | null>;
  /** The settled board: only its empty plates can take a cake. */
  getBoard: () => Board;
  cellSize: number;
  gap: number;
  ghostSize: number;
  /** A tray cake was picked up (or tapped). */
  onPick: (trayIndex: number) => void;
  /** A tray cake was dropped on a plate. */
  onDrop: (trayIndex: number, plateIndex: number) => void;
  /** The board was tapped; the nearest free plate is given. */
  onTap: (plateIndex: number) => void;
  /** Nothing free nearby: the nearest plate to wiggle. */
  onMiss: (plateIndex: number) => void;
}

/**
 * Dragging cakes from the tray onto plates, plus tap-to-place.
 *
 * Any drop or tap over the cloth snaps to the nearest free plate. The drag is
 * tracked on the window rather than through pointer capture: capture can be
 * lost mid-drag and then the cake freezes with no release ever arriving.
 * Window listeners keep following the pointer, a mouse move with no button
 * held counts as a release, and a fresh press while a drag is somehow still
 * alive finishes that drag first.
 */
export function useCakeDrag({ boardRef, getBoard, cellSize, gap, ghostSize, onPick, onDrop, onTap, onMiss }: Options) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  // ---- aiming --------------------------------------------------------------

  /** Board-local coordinates of a viewport point, and whether it is over the board (with a margin). */
  const toBoard = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; over: boolean } | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const margin = cellSize * 0.6;
      const over =
        clientX >= rect.left - margin &&
        clientX <= rect.right + margin &&
        clientY >= rect.top - margin &&
        clientY <= rect.bottom + margin;
      return { x: clientX - rect.left, y: clientY - rect.top, over };
    },
    [boardRef, cellSize],
  );

  /** Nearest plate to a board-local point; `emptyOnly` skips plates with a cake. */
  const nearestPlate = useCallback(
    (pt: { x: number; y: number }, emptyOnly: boolean): number | null => {
      const board = getBoard();
      let best: number | null = null;
      let bestDist = Infinity;
      board.cells.forEach((cell, i) => {
        if (emptyOnly && cell !== null) return;
        const c = cellCenter(board, i, cellSize, gap);
        const d = Math.hypot(c.x - pt.x, c.y - pt.y);
        if (d < bestDist) {
          best = i;
          bestDist = d;
        }
      });
      return best;
    },
    [getBoard, cellSize, gap],
  );

  /** Where the ghost cake's centre is for a finger at (x, y). */
  const aimPoint = useCallback(
    (clientX: number, clientY: number) => toBoard(clientX, clientY - ghostSize * GHOST_LIFT),
    [toBoard, ghostSize],
  );

  const findDropTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      const pt = aimPoint(clientX, clientY);
      if (!pt || !pt.over) return null;
      return nearestPlate(pt, true);
    },
    [aimPoint, nearestPlate],
  );

  // ---- the drag itself -----------------------------------------------------

  const ghostTransform = useCallback(
    (x: number, y: number) => `translate(${x - ghostSize / 2}px, ${y - ghostSize / 2 - ghostSize * GHOST_LIFT}px)`,
    [ghostSize],
  );

  /** End the drag. With a point, drop there; without one (cancel, blur) just put the cake back. */
  const finishDrag = useCallback(
    (clientX: number | null, clientY: number | null) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDrag(null);
      if (!d.moved || clientX === null || clientY === null) return;
      const target = findDropTarget(clientX, clientY);
      if (target !== null) {
        onDrop(d.trayIndex, target);
        return;
      }
      const pt = aimPoint(clientX, clientY);
      if (pt && pt.over) {
        const any = nearestPlate(pt, false);
        if (any !== null) onMiss(any);
      }
    },
    [findDropTarget, onDrop, aimPoint, nearestPlate, onMiss],
  );

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      d.x = clientX;
      d.y = clientY;
      const moved = d.moved || Math.hypot(clientX - d.startX, clientY - d.startY) > TAP_SLOP;
      const target = moved ? findDropTarget(clientX, clientY) : null;
      const changed = moved !== d.moved || target !== d.target;
      d.moved = moved;
      d.target = target;
      if (ghostRef.current) ghostRef.current.style.transform = ghostTransform(d.x, d.y);
      if (changed) setDrag({ trayIndex: d.trayIndex, moved, target });
    },
    [findDropTarget, ghostTransform],
  );

  // Window listeners call whatever the latest handlers are.
  const latest = useRef({ moveDrag, finishDrag });
  latest.current = { moveDrag, finishDrag };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (e.pointerType === "mouse" && e.buttons === 0) {
        // The button is up but no pointerup reached us: treat this as the release.
        latest.current.finishDrag(e.clientX, e.clientY);
        return;
      }
      latest.current.moveDrag(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      latest.current.finishDrag(e.clientX, e.clientY);
    };
    const onCancel = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      // Touch cancels carry no useful point; drop on the last known one instead.
      latest.current.finishDrag(d.x, d.y);
    };
    const onAway = () => latest.current.finishDrag(null, null);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("blur", onAway);
    document.addEventListener("visibilitychange", onAway);
    return () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("blur", onAway);
      document.removeEventListener("visibilitychange", onAway);
    };
  }, []);

  const onTrayPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLDivElement>) => {
      if (!e.isPrimary) return;
      e.preventDefault();
      if (dragRef.current) latest.current.finishDrag(null, null);
      onPick(index);
      dragRef.current = {
        trayIndex: index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        target: null,
      };
      setDrag({ trayIndex: index, moved: false, target: null });
    },
    [onPick],
  );

  // ---- taps on the board ---------------------------------------------------

  const boardPress = useRef<{ x: number; y: number } | null>(null);

  const onBoardPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      // A drag whose release went missing: this press is where the cake lands.
      latest.current.finishDrag(e.clientX, e.clientY);
      boardPress.current = null;
      return;
    }
    boardPress.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onBoardPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = boardPress.current;
      boardPress.current = null;
      if (dragRef.current || !start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP * 3) return;
      const pt = toBoard(e.clientX, e.clientY);
      if (!pt) return;
      const empty = nearestPlate(pt, true);
      if (empty !== null) {
        onTap(empty);
        return;
      }
      const any = nearestPlate(pt, false);
      if (any !== null) onMiss(any);
    },
    [toBoard, nearestPlate, onTap, onMiss],
  );

  /** Transform for a freshly mounted ghost, from the live drag coordinates. */
  const ghostInitialTransform = () => {
    const d = dragRef.current;
    return d ? ghostTransform(d.x, d.y) : undefined;
  };

  return { drag, ghostRef, ghostInitialTransform, onTrayPointerDown, onBoardPointerDown, onBoardPointerUp };
}
