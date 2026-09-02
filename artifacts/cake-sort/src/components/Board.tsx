import type { RefObject } from "react";
import type { Board, Flavor } from "@/game/types";
import { Plate } from "./Plate";
import { FlyingSlices } from "./FlyingSlices";
import { HelperOverlay } from "./HelperOverlay";

export type Anim =
  | { type: "move"; key: number; from: number; to: number; flavor: Flavor; count: number }
  | { type: "serve"; key: number; index: number }
  | { type: "helper"; key: number; index: number; phase: "arrive" | "done" };

export function cellCenter(board: Board, index: number, cell: number, gap: number) {
  const r = Math.floor(index / board.cols);
  const c = index % board.cols;
  return { x: c * (cell + gap) + cell / 2, y: r * (cell + gap) + cell / 2 };
}

interface BoardViewProps {
  board: Board;
  cellSize: number;
  gap: number;
  targetIndex: number | null;
  hintIndex: number | null;
  nopeIndex: number | null;
  poppedIndex: number | null;
  anim: Anim | null;
  onPlateTap: (index: number) => void;
  boardRef: RefObject<HTMLDivElement | null>;
}

export function BoardView({
  board, cellSize, gap, targetIndex, hintIndex, nopeIndex, poppedIndex, anim, onPlateTap, boardRef,
}: BoardViewProps) {
  const width = board.cols * cellSize + (board.cols - 1) * gap;
  const height = board.rows * cellSize + (board.rows - 1) * gap;

  return (
    <div
      ref={boardRef}
      className="relative"
      style={{
        width,
        height,
        display: "grid",
        gridTemplateColumns: `repeat(${board.cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${board.rows}, ${cellSize}px)`,
        gap,
      }}
    >
      {board.cells.map((cell, i) => (
        <Plate
          key={i}
          index={i}
          cake={cell}
          capacity={board.capacity}
          size={cellSize}
          isTarget={targetIndex === i}
          isHint={hintIndex === i}
          isServing={anim?.type === "serve" && anim.index === i}
          isNope={nopeIndex === i}
          isPopped={poppedIndex === i}
          isHelped={anim?.type === "helper" && anim.index === i && anim.phase === "done"}
          onTap={onPlateTap}
        />
      ))}

      {anim?.type === "move" && (
        <FlyingSlices
          key={anim.key}
          from={cellCenter(board, anim.from, cellSize, gap)}
          to={cellCenter(board, anim.to, cellSize, gap)}
          flavor={anim.flavor}
          count={anim.count}
          capacity={board.capacity}
          size={cellSize * 0.8}
        />
      )}

      {anim?.type === "helper" && (
        <HelperOverlay
          key={anim.key}
          x={cellCenter(board, anim.index, cellSize, gap).x}
          y={cellCenter(board, anim.index, cellSize, gap).y}
          size={cellSize}
        />
      )}
    </div>
  );
}
