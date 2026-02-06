"use client";

import { useState } from "react";
import type { PredictedTestCase } from "@/lib/schemas";
import { gameToPrompt } from "@/lib/ui";
import { PropositionRenderer } from "./proposition-renderer";

export function GameDisplay({
  testCase,
  revealed,
}: {
  testCase: PredictedTestCase;
  revealed: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"llm" | "human">("human");
  const [propositionsExpanded, setPropositionsExpanded] = useState(false);

  const { game, predictionData } = testCase;

  return (
    <div className="game-display border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="tabs flex border-b border-zinc-300 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setActiveTab("human")}
          className={`tab px-6 py-3 font-medium transition-colors ${
            activeTab === "human"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-b-2 border-blue-500"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          }`}
        >
          Human View
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("llm")}
          className={`tab px-6 py-3 font-medium transition-colors ${
            activeTab === "llm"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-b-2 border-blue-500"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          }`}
        >
          LLM View
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content p-6">
        {activeTab === "llm" && (
          <div className="llm-view">
            <h3 className="text-lg font-semibold mb-4">
              Exact Prompt Sent to LLM
            </h3>
            <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm">
              {gameToPrompt(game, 0)}
            </pre>
          </div>
        )}

        {activeTab === "human" && (
          <div className="human-view space-y-6">
            {/* Suspects */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Suspects</h3>
              <div className="flex flex-wrap gap-2">
                {game.names.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Available Attributes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Technologies", values: game.technologies },
                  { name: "Places", values: game.places },
                  { name: "Companies", values: game.companies },
                  { name: "Institutions", values: game.institutions },
                  { name: "Foods", values: game.foods },
                  { name: "Materials", values: game.materials },
                ].map((category) => (
                  <div
                    key={category.name}
                    className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-4"
                  >
                    <h4 className="font-semibold mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {category.name}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {category.values.map((value) => (
                        <span
                          key={value}
                          className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900 rounded text-xs"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Propositions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Propositions ({game.propositions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setPropositionsExpanded(!propositionsExpanded)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {propositionsExpanded ? "Collapse All" : "Expand All"}
                </button>
              </div>
              <div className="space-y-1">
                {propositionsExpanded ? (
                  game.propositions.map((prop, index) => (
                    <PropositionRenderer
                      key={`prop-${game.seed}-${index}`}
                      proposition={prop}
                      index={index + 1}
                    />
                  ))
                ) : (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                    Click "Expand All" to see all propositions
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reveal Section */}
      {revealed && (
        <div className="reveal-section border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="result-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Model
              </div>
              <div className="text-lg font-mono">
                {predictionData.metadata.model}
              </div>
            </div>
            <div className="result-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Confidence
              </div>
              <div className="text-lg font-mono">
                {predictionData.confidence !== undefined
                  ? `${(predictionData.confidence * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>
            <div className="result-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Actual Killer
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {game.killer}
              </div>
            </div>
            <div className="result-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Predicted Killer
              </div>
              <div className="text-lg font-bold">
                {predictionData.prediction}
              </div>
            </div>
            <div className="result-card border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 md:col-span-2">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Result
              </div>
              <div className="text-2xl font-bold">
                {predictionData.correctness ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ Correct
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    ❌ Incorrect
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
