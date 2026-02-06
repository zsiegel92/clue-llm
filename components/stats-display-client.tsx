"use client";

import type { AggregateStats } from "@/lib/load-stats";

export function StatsDisplayClient({ stats }: { stats: AggregateStats }) {
  return (
    <div className="stats-display border border-zinc-300 dark:border-zinc-700 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Model Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Model
          </div>
          <div className="text-xl font-mono font-semibold">{stats.model}</div>
        </div>

        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Total Predictions
          </div>
          <div className="text-xl font-semibold">
            {stats.totalPredictions.toLocaleString()}
          </div>
        </div>

        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Overall Accuracy
          </div>
          <div className="text-xl font-semibold text-green-600 dark:text-green-400">
            {(stats.overallAccuracy * 100).toFixed(2)}%
          </div>
        </div>

        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Avg Confidence (Correct)
          </div>
          <div className="text-xl font-semibold">
            {(stats.avgConfidenceWhenCorrect * 100).toFixed(2)}%
          </div>
        </div>

        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Avg Confidence (Incorrect)
          </div>
          <div className="text-xl font-semibold">
            {(stats.avgConfidenceWhenIncorrect * 100).toFixed(2)}%
          </div>
        </div>

        <div className="stat-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Confidence Delta
          </div>
          <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
            {(
              (stats.avgConfidenceWhenCorrect -
                stats.avgConfidenceWhenIncorrect) *
              100
            ).toFixed(2)}
            pp
          </div>
        </div>
      </div>
    </div>
  );
}
