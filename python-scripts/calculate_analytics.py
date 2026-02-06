#!/usr/bin/env python3
"""Analyze clue prediction data and generate statistics."""

import json
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


class ConfidenceBin(BaseModel):
    """Confidence bin statistics."""

    correct: int = 0
    total: int = 0


class PropsVsConfidence(BaseModel):
    """Data point for propositions vs confidence analysis."""

    num_props: int
    confidence: float
    is_correct: bool

    model_config = {"frozen": True}


class Statistics(BaseModel):
    """Calculated statistics from predictions."""

    avg_confidence_accurate: float
    avg_confidence_inaccurate: float
    confidence_bins: dict[int, ConfidenceBin]
    bin_accuracy: dict[int, float]
    props_vs_confidence: list[PropsVsConfidence]
    total_predictions: int
    total_accurate: int
    total_inaccurate: int

    model_config = {"arbitrary_types_allowed": True}


def load_predictions(json_path: Path) -> list[PredictionEntry]:
    """Load and validate predictions from JSON file."""
    with open(json_path) as f:
        raw_data = json.load(f)

    # Validate data with Pydantic
    adapter = TypeAdapter(list[PredictionEntry])
    return adapter.validate_python(raw_data)


def calculate_statistics(predictions: list[PredictionEntry]) -> Statistics:
    """Calculate statistics from prediction data."""
    # Separate accurate and inaccurate predictions
    accurate_preds: list[float] = []
    inaccurate_preds: list[float] = []

    # Confidence bins (0-10%, 10-20%, etc.)
    confidence_bins: dict[int, ConfidenceBin] = {
        i: ConfidenceBin(correct=0, total=0) for i in range(10)
    }

    # Track confidence vs number of propositions
    props_vs_confidence: list[PropsVsConfidence] = []

    for entry in predictions:
        pred_data = entry.predictionData
        game_data = entry.game

        confidence = pred_data.confidence
        is_correct = pred_data.correctness
        num_propositions = len(game_data.propositions)

        # Separate by accuracy
        if is_correct:
            accurate_preds.append(confidence)
        else:
            inaccurate_preds.append(confidence)

        # Bin by confidence (0-10%, 10-20%, etc.)
        bin_idx = min(int(confidence * 10), 9)
        confidence_bins[bin_idx].total += 1
        if is_correct:
            confidence_bins[bin_idx].correct += 1

        # Track propositions vs confidence and accuracy
        props_vs_confidence.append(
            PropsVsConfidence(
                num_props=num_propositions,
                confidence=confidence,
                is_correct=is_correct,
            )
        )

    # Calculate average confidence
    avg_confidence_accurate = (
        sum(accurate_preds) / len(accurate_preds) if accurate_preds else 0
    )
    avg_confidence_inaccurate = (
        sum(inaccurate_preds) / len(inaccurate_preds) if inaccurate_preds else 0
    )

    # Calculate accuracy rates by confidence bin
    bin_accuracy: dict[int, float] = {}
    for bin_idx, data in confidence_bins.items():
        if data.total > 0:
            bin_accuracy[bin_idx] = data.correct / data.total
        else:
            bin_accuracy[bin_idx] = 0

    return Statistics(
        avg_confidence_accurate=avg_confidence_accurate,
        avg_confidence_inaccurate=avg_confidence_inaccurate,
        confidence_bins=confidence_bins,
        bin_accuracy=bin_accuracy,
        props_vs_confidence=props_vs_confidence,
        total_predictions=len(predictions),
        total_accurate=len(accurate_preds),
        total_inaccurate=len(inaccurate_preds),
    )


def create_avg_confidence_chart(stats: Statistics, output_dir: Path) -> str:
    """Create average confidence bar chart."""
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=["Accurate", "Inaccurate"],
            y=[stats.avg_confidence_accurate, stats.avg_confidence_inaccurate],
            text=[
                f"{stats.avg_confidence_accurate:.3f}",
                f"{stats.avg_confidence_inaccurate:.3f}",
            ],
            textposition="auto",
            marker_color=["green", "red"],
            name="Avg Confidence",
        )
    )
    fig.update_layout(
        title="Average Confidence: Accurate vs Inaccurate",
        yaxis_title="Confidence",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "avg_confidence.html")
    fig.write_image(output_dir / "avg_confidence.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_calibration_curve(stats: Statistics, output_dir: Path) -> str:
    """Create calibration curve showing predicted vs actual accuracy."""
    bin_accuracies = [stats.bin_accuracy[i] for i in range(10)]
    bin_totals = [stats.confidence_bins[i].total for i in range(10)]
    bin_midpoints = [(i * 10 + (i + 1) * 10) / 2 / 100 for i in range(10)]

    fig = go.Figure()

    # Actual calibration
    fig.add_trace(
        go.Scatter(
            x=bin_midpoints,
            y=bin_accuracies,
            mode="lines+markers",
            marker=dict(size=10, color="blue"),
            line=dict(color="blue", width=2),
            name="Actual",
            text=[f"n={total}" for total in bin_totals],
            hovertemplate="Confidence: %{x:.1%}<br>Accuracy: %{y:.1%}<br>%{text}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Calibration Curve: Predicted vs Actual",
        xaxis_title="Predicted Confidence",
        yaxis_title="Actual Accuracy",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "calibration_curve.html")
    fig.write_image(output_dir / "calibration_curve.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_accuracy_by_confidence_bin(stats: Statistics, output_dir: Path) -> str:
    """Create bar chart of accuracy rate by confidence bin."""
    bin_labels = [f"{i * 10}-{(i + 1) * 10}%" for i in range(10)]
    bin_accuracies = [stats.bin_accuracy[i] for i in range(10)]
    bin_totals = [stats.confidence_bins[i].total for i in range(10)]

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=bin_labels,
            y=bin_accuracies,
            text=[
                f"{acc:.2%}<br>n={total}"
                for acc, total in zip(bin_accuracies, bin_totals)
            ],
            textposition="auto",
            marker_color="blue",
            name="Accuracy Rate",
        )
    )

    fig.update_layout(
        title="Accuracy Rate by Confidence Bin",
        xaxis_title="Confidence Bin",
        yaxis_title="Accuracy Rate",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "accuracy_by_confidence_bin.html")
    fig.write_image(output_dir / "accuracy_by_confidence_bin.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_confidence_distribution(stats: Statistics, output_dir: Path) -> str:
    """Create box plot showing confidence distribution by accuracy."""
    accurate_confidences = [
        d.confidence for d in stats.props_vs_confidence if d.is_correct
    ]
    inaccurate_confidences = [
        d.confidence for d in stats.props_vs_confidence if not d.is_correct
    ]

    fig = go.Figure()
    fig.add_trace(
        go.Box(
            y=accurate_confidences,
            name="Accurate",
            marker_color="green",
        )
    )

    fig.add_trace(
        go.Box(
            y=inaccurate_confidences,
            name="Inaccurate",
            marker_color="red",
        )
    )

    fig.update_layout(
        title="Confidence Distribution by Accuracy",
        yaxis_title="Confidence",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "confidence_distribution.html")
    fig.write_image(output_dir / "confidence_distribution.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_accuracy_by_propositions(stats: Statistics, output_dir: Path) -> str:
    """Create bar chart of accuracy rate by number of propositions."""
    # Bin by tens of propositions
    props_bins: dict[int, dict[str, int]] = {}
    for d in stats.props_vs_confidence:
        n = d.num_props
        # Bin into 0-10, 10-20, etc.
        bin_idx = n // 10
        if bin_idx not in props_bins:
            props_bins[bin_idx] = {"correct": 0, "total": 0}
        props_bins[bin_idx]["total"] += 1
        if d.is_correct:
            props_bins[bin_idx]["correct"] += 1

    # Sort bins and create labels
    sorted_bin_indices = sorted(props_bins.keys())
    bin_labels = [f"{i * 10}-{(i + 1) * 10}" for i in sorted_bin_indices]
    accuracy_rates = [
        props_bins[i]["correct"] / props_bins[i]["total"] for i in sorted_bin_indices
    ]
    totals = [props_bins[i]["total"] for i in sorted_bin_indices]

    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=bin_labels,
            y=accuracy_rates,
            text=[
                f"{acc:.2%}<br>n={total}" for acc, total in zip(accuracy_rates, totals)
            ],
            textposition="auto",
            marker_color="purple",
            name="Accuracy Rate",
        )
    )

    fig.update_layout(
        title="Accuracy by Number of Propositions",
        xaxis_title="Number of Propositions",
        yaxis_title="Accuracy Rate",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "accuracy_by_propositions.html")
    fig.write_image(output_dir / "accuracy_by_propositions.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_confidence_vs_propositions_all(stats: Statistics, output_dir: Path) -> str:
    """Create scatter plot of confidence vs propositions for all predictions."""
    all_props = [d.num_props for d in stats.props_vs_confidence]
    all_confs = [d.confidence for d in stats.props_vs_confidence]

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=all_props,
            y=all_confs,
            mode="markers",
            marker=dict(color="blue", size=4, opacity=0.4),
            name="All Predictions",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Confidence vs Number of Propositions",
        xaxis_title="Number of Propositions",
        yaxis_title="Confidence",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "confidence_vs_propositions_all.html")
    fig.write_image(output_dir / "confidence_vs_propositions_all.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_confidence_vs_propositions_accurate(
    stats: Statistics, output_dir: Path
) -> str:
    """Create scatter plot of confidence vs propositions for accurate predictions."""
    accurate_props = [d.num_props for d in stats.props_vs_confidence if d.is_correct]
    accurate_confs = [d.confidence for d in stats.props_vs_confidence if d.is_correct]

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=accurate_props,
            y=accurate_confs,
            mode="markers",
            marker=dict(color="green", size=5, opacity=0.6),
            name="Accurate",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Confidence vs Propositions (Accurate)",
        xaxis_title="Number of Propositions",
        yaxis_title="Confidence",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "confidence_vs_propositions_accurate.html")
    fig.write_image(output_dir / "confidence_vs_propositions_accurate.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_confidence_vs_propositions_inaccurate(
    stats: Statistics, output_dir: Path
) -> str:
    """Create scatter plot of confidence vs propositions for inaccurate predictions."""
    inaccurate_props = [
        d.num_props for d in stats.props_vs_confidence if not d.is_correct
    ]
    inaccurate_confs = [
        d.confidence for d in stats.props_vs_confidence if not d.is_correct
    ]

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=inaccurate_props,
            y=inaccurate_confs,
            mode="markers",
            marker=dict(color="red", size=5, opacity=0.6),
            name="Inaccurate",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Confidence vs Propositions (Inaccurate)",
        xaxis_title="Number of Propositions",
        yaxis_title="Confidence",
        height=400,
        showlegend=True,
    )

    # Save individual files
    fig.write_html(output_dir / "confidence_vs_propositions_inaccurate.html")
    fig.write_image(output_dir / "confidence_vs_propositions_inaccurate.png")

    return fig.to_html(full_html=False, include_plotlyjs=False)


def create_visualization(stats: Statistics, output_path: Path) -> None:
    """Create HTML visualization with all statistics."""
    # Get output directory for individual chart files
    output_dir = output_path.parent

    # Generate all chart HTML (also saves individual files)
    chart1 = create_avg_confidence_chart(stats, output_dir)
    chart2 = create_calibration_curve(stats, output_dir)
    chart3 = create_accuracy_by_confidence_bin(stats, output_dir)
    chart4 = create_confidence_distribution(stats, output_dir)
    chart5 = create_accuracy_by_propositions(stats, output_dir)
    chart6 = create_confidence_vs_propositions_all(stats, output_dir)
    chart7 = create_confidence_vs_propositions_accurate(stats, output_dir)
    chart8 = create_confidence_vs_propositions_inaccurate(stats, output_dir)

    # Calculate summary statistics
    overall_accuracy = stats.total_accurate / stats.total_predictions

    # Create complete HTML page
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Clue Prediction Analytics</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        h1 {{
            text-align: center;
            color: #333;
        }}
        .subtitle {{
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }}
        .chart-container {{
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }}
        @media (max-width: 1200px) {{
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <h1>Clue Prediction Analytics</h1>
    <div class="subtitle">
        <strong>Total:</strong> {stats.total_predictions} predictions |
        <strong>Accuracy:</strong> {overall_accuracy:.1%} ({stats.total_accurate} correct, {stats.total_inaccurate} incorrect) |
        <strong>Avg Confidence Δ:</strong> {stats.avg_confidence_accurate - stats.avg_confidence_inaccurate:+.4f}
    </div>

    <div class="charts-grid">
        <div class="chart-container">{chart1}</div>
        <div class="chart-container">{chart2}</div>
        <div class="chart-container">{chart3}</div>
        <div class="chart-container">{chart4}</div>
        <div class="chart-container">{chart5}</div>
        <div class="chart-container">{chart6}</div>
        <div class="chart-container">{chart7}</div>
        <div class="chart-container">{chart8}</div>
    </div>
</body>
</html>
"""

    # Write HTML file
    with open(output_path, "w") as f:
        f.write(html_content)

    print(f"Visualization saved to {output_path}")

    # Calculate additional statistics
    import statistics

    accurate_confidences = [
        d.confidence for d in stats.props_vs_confidence if d.is_correct
    ]
    inaccurate_confidences = [
        d.confidence for d in stats.props_vs_confidence if not d.is_correct
    ]
    accurate_props = [d.num_props for d in stats.props_vs_confidence if d.is_correct]
    inaccurate_props = [
        d.num_props for d in stats.props_vs_confidence if not d.is_correct
    ]

    median_conf_accurate = statistics.median(accurate_confidences)
    median_conf_inaccurate = statistics.median(inaccurate_confidences)
    avg_props_accurate = statistics.mean(accurate_props) if accurate_props else 0
    avg_props_inaccurate = statistics.mean(inaccurate_props) if inaccurate_props else 0

    # Print summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)

    print(f"\nTotal predictions: {stats.total_predictions}")
    print(
        f"Accurate predictions: {stats.total_accurate} ({stats.total_accurate / stats.total_predictions:.1%})"
    )
    print(
        f"Inaccurate predictions: {stats.total_inaccurate} ({stats.total_inaccurate / stats.total_predictions:.1%})"
    )

    print("\n" + "-" * 60)
    print("CONFIDENCE ANALYSIS")
    print("-" * 60)
    print(f"Average confidence when accurate:   {stats.avg_confidence_accurate:.4f}")
    print(f"Average confidence when inaccurate: {stats.avg_confidence_inaccurate:.4f}")
    print(
        f"Difference (accurate - inaccurate): {stats.avg_confidence_accurate - stats.avg_confidence_inaccurate:+.4f}"
    )
    print(f"\nMedian confidence when accurate:    {median_conf_accurate:.4f}")
    print(f"Median confidence when inaccurate:  {median_conf_inaccurate:.4f}")
    print(
        f"Difference (accurate - inaccurate): {median_conf_accurate - median_conf_inaccurate:+.4f}"
    )

    print("\n" + "-" * 60)
    print("PROPOSITIONS ANALYSIS")
    print("-" * 60)
    print(f"Average propositions when accurate:   {avg_props_accurate:.2f}")
    print(f"Average propositions when inaccurate: {avg_props_inaccurate:.2f}")
    print(
        f"Difference (accurate - inaccurate):   {avg_props_accurate - avg_props_inaccurate:+.2f}"
    )

    print("\n" + "-" * 60)
    print("CALIBRATION ANALYSIS")
    print("-" * 60)
    # Find bins with worst calibration
    calibration_errors = []
    for i in range(10):
        if stats.confidence_bins[i].total > 0:
            midpoint = (i * 10 + (i + 1) * 10) / 2 / 100
            actual = stats.bin_accuracy[i]
            error = abs(midpoint - actual)
            calibration_errors.append(
                (i, midpoint, actual, error, stats.confidence_bins[i].total)
            )

    calibration_errors.sort(key=lambda x: x[3], reverse=True)
    print("Top 3 worst-calibrated bins:")
    for i, (bin_idx, predicted, actual, error, count) in enumerate(
        calibration_errors[:3], 1
    ):
        print(
            f"  {i}. Bin {bin_idx * 10}-{(bin_idx + 1) * 10}%: predicted {predicted:.1%}, actual {actual:.1%}, "
            f"error {error:.1%} (n={count})"
        )

    print("\n" + "=" * 60)


def main() -> None:
    """Main entry point."""
    # Paths
    project_root = Path(__file__).parent.parent
    predictions_path = project_root / "lib" / "clue-predictions.json"
    output_dir = project_root / "analysis" / "output"
    output_path = output_dir / "analytics.html"

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load and analyze data
    print("Loading predictions...")
    predictions = load_predictions(predictions_path)

    print("Calculating statistics...")
    stats = calculate_statistics(predictions)

    print("Creating visualization...")
    create_visualization(stats, output_path)


if __name__ == "__main__":
    main()
