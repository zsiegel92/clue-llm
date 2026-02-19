#!/usr/bin/env python3
"""Analyze model comparison data and generate comparison charts."""

import json
import statistics
from pathlib import Path

import plotly.graph_objects as go
from pydantic import BaseModel, TypeAdapter

from generate_serialized_game import SerializedGame


class PredictionMetadata(BaseModel):
    """Metadata for a prediction."""

    model: str

    model_config = {"frozen": True}


class PredictionData(BaseModel):
    """Prediction result data."""

    prediction: str
    correctness: bool
    confidence: float
    metadata: PredictionMetadata

    model_config = {"frozen": True}


class PredictionEntry(BaseModel):
    """Complete prediction entry with game and prediction data."""

    game: SerializedGame
    predictionData: PredictionData

    model_config = {"frozen": True}


# Human-readable labels for model names
MODEL_LABELS: dict[str, str] = {
    "gpt-4.1": "gpt-4.1",
    "gpt-4.1-mini": "gpt-4.1-mini",
    "gpt-4.1-nano": "gpt-4.1-nano",
    "ft:gpt-4.1-nano-2025-04-14:personal:most-conf-wrong-2:DAnlh3at": "nano fine-tuned\n(most confident wrong)",
    "ft:gpt-4.1-nano-2025-04-14:personal:least-conf-wrong-2:DAnptsX0": "nano fine-tuned\n(least confident wrong)",
    "ft:gpt-4.1-nano-2025-04-14:personal:correct-2:DAnlniaW": "nano fine-tuned\n(correct cases)",
    "ft:gpt-4.1-nano-2025-04-14:personal:all-cases-2:DAo5YWOA": "nano fine-tuned\n(all cases)",
}

# Colors for each model
MODEL_COLORS: dict[str, str] = {
    "gpt-4.1": "#2563eb",
    "gpt-4.1-mini": "#3b82f6",
    "gpt-4.1-nano": "#93c5fd",
    "ft:gpt-4.1-nano-2025-04-14:personal:most-conf-wrong-2:DAnlh3at": "#dc2626",
    "ft:gpt-4.1-nano-2025-04-14:personal:least-conf-wrong-2:DAnptsX0": "#f97316",
    "ft:gpt-4.1-nano-2025-04-14:personal:correct-2:DAnlniaW": "#eab308",
    "ft:gpt-4.1-nano-2025-04-14:personal:all-cases-2:DAo5YWOA": "#16a34a",
}


class ModelStats(BaseModel):
    """Aggregated statistics for a single model."""

    model: str
    label: str
    total: int
    correct: int
    accuracy: float
    avg_confidence: float
    avg_confidence_correct: float
    avg_confidence_incorrect: float
    median_confidence_correct: float
    median_confidence_incorrect: float
    random_chance: float


def get_label(model: str) -> str:
    return MODEL_LABELS.get(model, model)


def get_color(model: str) -> str:
    return MODEL_COLORS.get(model, "#888888")


def load_model_comparison(json_path: Path) -> dict[str, list[PredictionEntry]]:
    """Load and validate model comparison predictions from JSON."""
    with open(json_path) as f:
        raw_data = json.load(f)

    adapter = TypeAdapter(dict[str, list[PredictionEntry]])
    return adapter.validate_python(raw_data)


def compute_model_stats(model: str, predictions: list[PredictionEntry]) -> ModelStats:
    """Compute statistics for a single model."""
    correct_confs = [
        p.predictionData.confidence for p in predictions if p.predictionData.correctness
    ]
    incorrect_confs = [
        p.predictionData.confidence
        for p in predictions
        if not p.predictionData.correctness
    ]
    all_confs = [p.predictionData.confidence for p in predictions]
    avg_suspects = statistics.mean(len(p.game.names) for p in predictions)

    return ModelStats(
        model=model,
        label=get_label(model),
        total=len(predictions),
        correct=len(correct_confs),
        accuracy=len(correct_confs) / len(predictions),
        avg_confidence=statistics.mean(all_confs),
        avg_confidence_correct=statistics.mean(correct_confs) if correct_confs else 0.0,
        avg_confidence_incorrect=statistics.mean(incorrect_confs)
        if incorrect_confs
        else 0.0,
        median_confidence_correct=statistics.median(correct_confs)
        if correct_confs
        else 0.0,
        median_confidence_incorrect=statistics.median(incorrect_confs)
        if incorrect_confs
        else 0.0,
        random_chance=1.0 / avg_suspects if avg_suspects > 0 else 0.0,
    )


def create_accuracy_comparison_chart(
    all_stats: list[ModelStats], output_dir: Path
) -> None:
    """Create bar chart comparing accuracy across models with random chance baseline."""
    random_chance = all_stats[0].random_chance

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=[s.label for s in all_stats],
            y=[s.accuracy * 100 for s in all_stats],
            text=[f"{s.accuracy:.1%}" for s in all_stats],
            textposition="outside",
            textfont=dict(size=13, color="#222"),
            marker_color=[get_color(s.model) for s in all_stats],
            name="Accuracy",
        )
    )

    # Random chance baseline
    fig.add_hline(
        y=random_chance * 100,
        line_dash="dot",
        line_color="#888",
        line_width=2,
        annotation_text=f"Random chance ({random_chance:.1%})",
        annotation_position="top left",
        annotation_font_size=12,
        annotation_font_color="#888",
    )

    fig.update_layout(
        title=dict(
            text="Model Accuracy Comparison",
            font=dict(size=20),
        ),
        yaxis_title="Accuracy (%)",
        yaxis=dict(range=[0, 108], ticksuffix="%"),
        height=500,
        width=900,
        showlegend=False,
        margin=dict(b=120),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis=dict(tickangle=-30),
    )

    fig.write_image(output_dir / "model_accuracy_comparison.png", scale=2)
    fig.write_html(output_dir / "model_accuracy_comparison.html")
    print("  Saved accuracy comparison chart")


def create_confidence_comparison_chart(
    all_stats: list[ModelStats], output_dir: Path
) -> None:
    """Create grouped bar chart comparing avg confidence when correct vs incorrect."""
    labels = [s.label for s in all_stats]

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=labels,
            y=[s.avg_confidence_correct for s in all_stats],
            name="Avg confidence (correct)",
            marker_color="#16a34a",
            text=[f"{s.avg_confidence_correct:.3f}" for s in all_stats],
            textposition="outside",
            textfont=dict(size=10),
        )
    )

    fig.add_trace(
        go.Bar(
            x=labels,
            y=[s.avg_confidence_incorrect for s in all_stats],
            name="Avg confidence (incorrect)",
            marker_color="#dc2626",
            text=[
                f"{s.avg_confidence_incorrect:.3f}"
                if s.total - s.correct > 0
                else "N/A"
                for s in all_stats
            ],
            textposition="outside",
            textfont=dict(size=10),
        )
    )

    fig.update_layout(
        title=dict(
            text="Confidence When Correct vs. Incorrect",
            font=dict(size=20),
        ),
        yaxis_title="Average Confidence",
        yaxis=dict(range=[0, 1.12]),
        barmode="group",
        height=500,
        width=900,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="center",
            x=0.5,
        ),
        margin=dict(b=120),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis=dict(tickangle=-30),
    )

    fig.write_image(output_dir / "model_confidence_comparison.png", scale=2)
    fig.write_html(output_dir / "model_confidence_comparison.html")
    print("  Saved confidence comparison chart")


def create_fine_tuning_strategy_chart(
    all_stats: list[ModelStats], output_dir: Path
) -> None:
    """Create a focused chart comparing nano baseline vs fine-tuning strategies."""
    # Filter to just nano-based models
    nano_models = [s for s in all_stats if "nano" in s.model]

    if not nano_models:
        return

    random_chance = nano_models[0].random_chance

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=[s.label for s in nano_models],
            y=[s.accuracy * 100 for s in nano_models],
            text=[f"{s.accuracy:.1%}<br>({s.correct}/{s.total})" for s in nano_models],
            textposition="outside",
            textfont=dict(size=12),
            marker_color=[get_color(s.model) for s in nano_models],
            name="Accuracy",
        )
    )

    # Random chance baseline
    fig.add_hline(
        y=random_chance * 100,
        line_dash="dot",
        line_color="#888",
        line_width=2,
        annotation_text=f"Random chance ({random_chance:.1%})",
        annotation_position="top left",
        annotation_font_size=12,
        annotation_font_color="#888",
    )

    fig.update_layout(
        title=dict(
            text="Fine-Tuning Strategy Comparison (gpt-4.1-nano base)",
            font=dict(size=18),
        ),
        yaxis_title="Accuracy (%)",
        yaxis=dict(range=[0, 115], ticksuffix="%"),
        height=500,
        width=800,
        showlegend=False,
        margin=dict(b=120),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis=dict(tickangle=-30),
    )

    fig.write_image(output_dir / "fine_tuning_strategy_comparison.png", scale=2)
    fig.write_html(output_dir / "fine_tuning_strategy_comparison.html")
    print("  Saved fine-tuning strategy chart")


def print_summary(all_stats: list[ModelStats]) -> None:
    """Print summary table to stdout."""
    print("\n" + "=" * 80)
    print("MODEL COMPARISON SUMMARY")
    print("=" * 80)
    print(
        f"{'Model':<45} {'Accuracy':>10} {'Correct':>10} "
        f"{'Conf(C)':>10} {'Conf(W)':>10}"
    )
    print("-" * 80)
    for s in all_stats:
        wrong_conf = (
            f"{s.avg_confidence_incorrect:.3f}" if s.total - s.correct > 0 else "N/A"
        )
        print(
            f"{s.label.replace(chr(10), ' '):<45} {s.accuracy:>9.1%} "
            f"{s.correct:>4}/{s.total:<5} "
            f"{s.avg_confidence_correct:>10.3f} {wrong_conf:>10}"
        )

    print("-" * 80)
    print(f"Random chance: {all_stats[0].random_chance:.1%}")
    print(f"Avg suspects per game: {1.0 / all_stats[0].random_chance:.1f}")

    print("\n" + "=" * 80)
    print("HYPOTHESIS RESULTS")
    print("=" * 80)

    # Get specific stats for hypothesis testing
    stats_by_model: dict[str, ModelStats] = {s.model: s for s in all_stats}

    base_41 = stats_by_model.get("gpt-4.1")
    base_mini = stats_by_model.get("gpt-4.1-mini")
    base_nano = stats_by_model.get("gpt-4.1-nano")

    ft_most_conf_wrong = next(
        (s for s in all_stats if "most-conf-wrong" in s.model), None
    )
    ft_least_conf_wrong = next(
        (s for s in all_stats if "least-conf-wrong" in s.model), None
    )
    ft_correct = next((s for s in all_stats if "correct-2" in s.model), None)
    ft_all = next((s for s in all_stats if "all-cases" in s.model), None)

    if base_41 and base_mini and base_nano:
        result = base_41.accuracy > base_mini.accuracy > base_nano.accuracy
        print(
            f"\n1. Larger models outperform smaller ones: {'TRUE' if result else 'FALSE'}"
        )
        print(
            f"   gpt-4.1 ({base_41.accuracy:.1%}) > mini ({base_mini.accuracy:.1%}) > nano ({base_nano.accuracy:.1%})"
        )

    if base_nano:
        all_ft_better = all(
            s.accuracy > base_nano.accuracy for s in all_stats if "ft:" in s.model
        )
        print(
            f"\n2. Fine-tuning always beats baseline: {'TRUE' if all_ft_better else 'FALSE'}"
        )
        for s in all_stats:
            if "ft:" in s.model:
                delta = s.accuracy - base_nano.accuracy
                print(
                    f"   {s.label.replace(chr(10), ' ')}: {s.accuracy:.1%} (+{delta:.1%} over nano baseline)"
                )

    if ft_most_conf_wrong and ft_least_conf_wrong and ft_correct:
        wrong_better = (
            ft_most_conf_wrong.accuracy > ft_correct.accuracy
            and ft_least_conf_wrong.accuracy > ft_correct.accuracy
        )
        print(
            f"\n3. Training on wrong cases > training on correct cases: {'TRUE' if wrong_better else 'FALSE'}"
        )
        print(
            f"   Most-conf-wrong ({ft_most_conf_wrong.accuracy:.1%}) vs "
            f"Least-conf-wrong ({ft_least_conf_wrong.accuracy:.1%}) vs "
            f"Correct ({ft_correct.accuracy:.1%})"
        )

    if ft_most_conf_wrong and ft_least_conf_wrong:
        conf_better = ft_most_conf_wrong.accuracy > ft_least_conf_wrong.accuracy
        delta = abs(ft_most_conf_wrong.accuracy - ft_least_conf_wrong.accuracy)
        tiny = delta < 0.02
        print(
            f"\n4. Confidently-wrong > unconfidently-wrong: {'TRUE' if conf_better else 'FALSE'}"
            f" ({'negligible difference' if tiny else ''})"
        )
        print(
            f"   Most-conf-wrong ({ft_most_conf_wrong.accuracy:.1%}) vs "
            f"Least-conf-wrong ({ft_least_conf_wrong.accuracy:.1%}), "
            f"delta = {delta:.1%}"
        )

    if ft_all and ft_most_conf_wrong:
        all_better = ft_all.accuracy > ft_most_conf_wrong.accuracy
        print(
            f"\n5. All cases > carefully chosen subset: {'TRUE' if all_better else 'FALSE'}"
        )
        print(
            f"   All cases ({ft_all.accuracy:.1%}) vs "
            f"Best subset ({ft_most_conf_wrong.accuracy:.1%})"
        )

    print("\n" + "=" * 80)


def main() -> None:
    """Main entry point."""
    project_root = Path(__file__).parent.parent
    json_path = project_root / "lib" / "clue-predictions-model-comparison.json"
    output_dir = project_root / "public"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Loading model comparison predictions...")
    data = load_model_comparison(json_path)

    print(f"Loaded {len(data)} models")

    # Compute stats for each model
    all_stats: list[ModelStats] = []
    for model, predictions in data.items():
        stats = compute_model_stats(model, predictions)
        all_stats.append(stats)

    # Sort: base models by size (large to small), then fine-tuned
    base_order = ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"]
    ft_order = [
        "ft:gpt-4.1-nano-2025-04-14:personal:correct-2:DAnlniaW",
        "ft:gpt-4.1-nano-2025-04-14:personal:least-conf-wrong-2:DAnptsX0",
        "ft:gpt-4.1-nano-2025-04-14:personal:most-conf-wrong-2:DAnlh3at",
        "ft:gpt-4.1-nano-2025-04-14:personal:all-cases-2:DAo5YWOA",
    ]
    desired_order = base_order + ft_order
    all_stats.sort(
        key=lambda s: desired_order.index(s.model)
        if s.model in desired_order
        else len(desired_order)
    )

    print("\nGenerating charts...")
    create_accuracy_comparison_chart(all_stats, output_dir)
    create_confidence_comparison_chart(all_stats, output_dir)
    create_fine_tuning_strategy_chart(all_stats, output_dir)

    print_summary(all_stats)


if __name__ == "__main__":
    main()
