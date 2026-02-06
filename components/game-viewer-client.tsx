"use client";

import { useState } from "react";
import { getRandomExample } from "@/actions";
import type { PredictedTestCase } from "@/lib/schemas";
import { GameDisplay } from "./game-display";

export function GameViewerClient({
  initialData,
}: {
  initialData: PredictedTestCase;
}) {
  const [currentData, setCurrentData] = useState(initialData);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadNewGame = async () => {
    setLoading(true);
    try {
      const newData = await getRandomExample();
      setCurrentData(newData);
      setRevealed(false);
    } catch (error) {
      console.error("Failed to load new game:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-viewer space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {revealed ? "Hide Answer" : "Reveal Answer"}
        </button>
        <button
          type="button"
          onClick={handleLoadNewGame}
          disabled={loading}
          className="px-6 py-2 bg-zinc-600 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Load New Game"}
        </button>
      </div>

      {/* Game Display */}
      <GameDisplay testCase={currentData} revealed={revealed} />
    </div>
  );
}
