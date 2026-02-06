#!/usr/bin/env python3
"""Analyze clue prediction data and generate statistics."""

import json
from pathlib import Path
from typing import Any

import plotly.graph_objects as go
from plotly.subplots import make_subplots


def load_predictions(json_path: Path) -> list[dict[str, Any]]:
    """Load predictions from JSON file."""
    with open(json_path) as f:
        return json.load(f)


def calculate_statistics(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate statistics from prediction data."""
    # Separate accurate and inaccurate predictions
    accurate_preds = []
    inaccurate_preds = []

    # Confidence bins (0-10%, 10-20%, etc.)
    confidence_bins = {i: {"correct": 0, "total": 0} for i in range(10)}

    # Track confidence vs number of propositions
    props_vs_confidence = []

    for entry in predictions:
        pred_data = entry["predictionData"]
        game_data = entry["game"]

        confidence = pred_data["confidence"]
        is_correct = pred_data["correctness"]
        num_propositions = len(game_data["propositions"])

        # Separate by accuracy
        if is_correct:
            accurate_preds.append(confidence)
        else:
            inaccurate_preds.append(confidence)

        # Bin by confidence (0-10%, 10-20%, etc.)
        bin_idx = min(int(confidence * 10), 9)
        confidence_bins[bin_idx]["total"] += 1
        if is_correct:
            confidence_bins[bin_idx]["correct"] += 1

        # Track propositions vs confidence and accuracy
        props_vs_confidence.append(
            {
                "num_props": num_propositions,
                "confidence": confidence,
                "is_correct": is_correct,
            }
        )

    # Calculate average confidence
    avg_confidence_accurate = (
        sum(accurate_preds) / len(accurate_preds) if accurate_preds else 0
    )
    avg_confidence_inaccurate = (
        sum(inaccurate_preds) / len(inaccurate_preds) if inaccurate_preds else 0
    )

    # Calculate accuracy rates by confidence bin
    bin_accuracy = {}
    for bin_idx, data in confidence_bins.items():
        if data["total"] > 0:
            bin_accuracy[bin_idx] = data["correct"] / data["total"]
        else:
            bin_accuracy[bin_idx] = 0

    return {
        "avg_confidence_accurate": avg_confidence_accurate,
        "avg_confidence_inaccurate": avg_confidence_inaccurate,
        "confidence_bins": confidence_bins,
        "bin_accuracy": bin_accuracy,
        "props_vs_confidence": props_vs_confidence,
        "total_predictions": len(predictions),
        "total_accurate": len(accurate_preds),
        "total_inaccurate": len(inaccurate_preds),
    }


def create_visualization(stats: dict[str, Any], output_path: Path) -> None:
    """Create HTML visualization with all statistics."""
    # Create subplots
    fig = make_subplots(
        rows=4,
        cols=2,
        subplot_titles=(
            "Average Confidence: Accurate vs Inaccurate",
            "Calibration Curve: Predicted vs Actual",
            "Accuracy Rate by Confidence Bin",
            "Confidence Distribution by Accuracy",
            "Accuracy by Number of Propositions",
            "Confidence vs Number of Propositions",
            "Confidence vs Propositions (Accurate)",
            "Confidence vs Propositions (Inaccurate)",
        ),
        specs=[
            [{"type": "bar"}, {"type": "scatter"}],
            [{"type": "bar"}, {"type": "box"}],
            [{"type": "bar"}, {"type": "scatter"}],
            [{"type": "scatter"}, {"type": "scatter"}],
        ],
        vertical_spacing=0.1,
        horizontal_spacing=0.15,
    )

    # 1. Average Confidence Bar Chart
    fig.add_trace(
        go.Bar(
            x=["Accurate", "Inaccurate"],
            y=[stats["avg_confidence_accurate"], stats["avg_confidence_inaccurate"]],
            text=[
                f"{stats['avg_confidence_accurate']:.3f}",
                f"{stats['avg_confidence_inaccurate']:.3f}",
            ],
            textposition="auto",
            marker_color=["green", "red"],
            name="Avg Confidence",
        ),
        row=1,
        col=1,
    )

    # 2. Calibration Curve
    bin_labels = [f"{i * 10}-{(i + 1) * 10}%" for i in range(10)]
    bin_accuracies = [stats["bin_accuracy"][i] for i in range(10)]
    bin_totals = [stats["confidence_bins"][i]["total"] for i in range(10)]
    bin_midpoints = [(i * 10 + (i + 1) * 10) / 2 / 100 for i in range(10)]

    # Perfect calibration line
    fig.add_trace(
        go.Scatter(
            x=[0, 1],
            y=[0, 1],
            mode="lines",
            line=dict(color="gray", dash="dash", width=2),
            name="Perfect Calibration",
            showlegend=True,
        ),
        row=1,
        col=2,
    )

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
        ),
        row=1,
        col=2,
    )

    # 3. Accuracy Rate by Confidence Bin
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
        ),
        row=2,
        col=1,
    )

    # 4. Confidence Distribution Box Plot
    accurate_confidences = [
        d["confidence"] for d in stats["props_vs_confidence"] if d["is_correct"]
    ]
    inaccurate_confidences = [
        d["confidence"] for d in stats["props_vs_confidence"] if not d["is_correct"]
    ]

    fig.add_trace(
        go.Box(
            y=accurate_confidences,
            name="Accurate",
            marker_color="green",
        ),
        row=2,
        col=2,
    )

    fig.add_trace(
        go.Box(
            y=inaccurate_confidences,
            name="Inaccurate",
            marker_color="red",
        ),
        row=2,
        col=2,
    )

    # 5. Accuracy by Number of Propositions
    # Bin by tens of propositions
    props_bins = {}
    for d in stats["props_vs_confidence"]:
        n = d["num_props"]
        # Bin into 0-10, 10-20, etc.
        bin_idx = n // 10
        if bin_idx not in props_bins:
            props_bins[bin_idx] = {"correct": 0, "total": 0}
        props_bins[bin_idx]["total"] += 1
        if d["is_correct"]:
            props_bins[bin_idx]["correct"] += 1

    # Sort bins and create labels
    sorted_bin_indices = sorted(props_bins.keys())
    bin_labels = [f"{i * 10}-{(i + 1) * 10}" for i in sorted_bin_indices]
    accuracy_rates = [
        props_bins[i]["correct"] / props_bins[i]["total"] for i in sorted_bin_indices
    ]
    totals = [props_bins[i]["total"] for i in sorted_bin_indices]

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
        ),
        row=3,
        col=1,
    )

    # 6. Confidence vs Number of Propositions (all data)
    all_props = [d["num_props"] for d in stats["props_vs_confidence"]]
    all_confs = [d["confidence"] for d in stats["props_vs_confidence"]]

    fig.add_trace(
        go.Scatter(
            x=all_props,
            y=all_confs,
            mode="markers",
            marker=dict(color="blue", size=4, opacity=0.4),
            name="All Predictions",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        ),
        row=3,
        col=2,
    )

    # 7. Confidence vs Propositions (accurate only)
    accurate_props = [
        d["num_props"] for d in stats["props_vs_confidence"] if d["is_correct"]
    ]
    accurate_confs = [
        d["confidence"] for d in stats["props_vs_confidence"] if d["is_correct"]
    ]

    fig.add_trace(
        go.Scatter(
            x=accurate_props,
            y=accurate_confs,
            mode="markers",
            marker=dict(color="green", size=5, opacity=0.6),
            name="Accurate",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        ),
        row=4,
        col=1,
    )

    # 8. Confidence vs Propositions (inaccurate only)
    inaccurate_props = [
        d["num_props"] for d in stats["props_vs_confidence"] if not d["is_correct"]
    ]
    inaccurate_confs = [
        d["confidence"] for d in stats["props_vs_confidence"] if not d["is_correct"]
    ]

    fig.add_trace(
        go.Scatter(
            x=inaccurate_props,
            y=inaccurate_confs,
            mode="markers",
            marker=dict(color="red", size=5, opacity=0.6),
            name="Inaccurate",
            hovertemplate="Propositions: %{x}<br>Confidence: %{y:.3f}<extra></extra>",
        ),
        row=4,
        col=2,
    )

    # Update layout
    overall_accuracy = stats["total_accurate"] / stats["total_predictions"]
    fig.update_layout(
        height=1800,
        title_text=f"Clue Prediction Analytics<br>"
        f"<sub>Total: {stats['total_predictions']} predictions | "
        f"Accuracy: {overall_accuracy:.1%} ({stats['total_accurate']} correct, {stats['total_inaccurate']} incorrect) | "
        f"Avg Confidence Δ: {stats['avg_confidence_accurate'] - stats['avg_confidence_inaccurate']:+.4f}</sub>",
        showlegend=True,
    )

    # Update axes labels
    fig.update_yaxes(title_text="Confidence", row=1, col=1)
    fig.update_yaxes(title_text="Actual Accuracy", row=1, col=2)
    fig.update_xaxes(title_text="Predicted Confidence", row=1, col=2)

    fig.update_xaxes(title_text="Confidence Bin", row=2, col=1)
    fig.update_yaxes(title_text="Accuracy Rate", row=2, col=1)
    fig.update_yaxes(title_text="Confidence", row=2, col=2)

    fig.update_xaxes(title_text="Number of Propositions", row=3, col=1)
    fig.update_yaxes(title_text="Accuracy Rate", row=3, col=1)
    fig.update_xaxes(title_text="Number of Propositions", row=3, col=2)
    fig.update_yaxes(title_text="Confidence", row=3, col=2)

    fig.update_xaxes(title_text="Number of Propositions", row=4, col=1)
    fig.update_yaxes(title_text="Confidence", row=4, col=1)
    fig.update_xaxes(title_text="Number of Propositions", row=4, col=2)
    fig.update_yaxes(title_text="Confidence", row=4, col=2)

    # Save HTML
    fig.write_html(output_path)
    print(f"Visualization saved to {output_path}")

    # Calculate additional statistics
    accurate_props = [
        d["num_props"] for d in stats["props_vs_confidence"] if d["is_correct"]
    ]
    inaccurate_props = [
        d["num_props"] for d in stats["props_vs_confidence"] if not d["is_correct"]
    ]

    import statistics

    median_conf_accurate = statistics.median(accurate_confidences)
    median_conf_inaccurate = statistics.median(inaccurate_confidences)
    avg_props_accurate = statistics.mean(accurate_props) if accurate_props else 0
    avg_props_inaccurate = statistics.mean(inaccurate_props) if inaccurate_props else 0

    # Print summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)

    print(f"\nTotal predictions: {stats['total_predictions']}")
    print(
        f"Accurate predictions: {stats['total_accurate']} ({stats['total_accurate'] / stats['total_predictions']:.1%})"
    )
    print(
        f"Inaccurate predictions: {stats['total_inaccurate']} ({stats['total_inaccurate'] / stats['total_predictions']:.1%})"
    )

    print("\n" + "-" * 60)
    print("CONFIDENCE ANALYSIS")
    print("-" * 60)
    print(f"Average confidence when accurate:   {stats['avg_confidence_accurate']:.4f}")
    print(
        f"Average confidence when inaccurate: {stats['avg_confidence_inaccurate']:.4f}"
    )
    print(
        f"Difference (accurate - inaccurate): {stats['avg_confidence_accurate'] - stats['avg_confidence_inaccurate']:+.4f}"
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
        if stats["confidence_bins"][i]["total"] > 0:
            midpoint = (i * 10 + (i + 1) * 10) / 2 / 100
            actual = stats["bin_accuracy"][i]
            error = abs(midpoint - actual)
            calibration_errors.append(
                (i, midpoint, actual, error, stats["confidence_bins"][i]["total"])
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
