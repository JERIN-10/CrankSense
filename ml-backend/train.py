"""Download, train, compare and evaluate industrial predictive-maintenance models.

This is NOT a motorcycle-engine model. It uses the UCI AI4I 2020 synthetic
industrial dataset to demonstrate a proper machine-learning workflow:

1. load and check the data
2. split it into train (80%) and test (20%) - the test set is never used to choose anything
3. compare three models with 5-fold stratified cross-validation on the TRAIN set only
4. pick the best model by its mean cross-validated F1-score on the failure class
5. evaluate the chosen model once on the untouched test set
6. save the model, the metrics (JSON) and a few plots

Run it from the ml-backend folder:   python train.py
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path
from urllib.request import urlopen

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ARTIFACT_DIR = BASE_DIR / "artifacts"
DATASET_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"
ZIP_PATH = DATA_DIR / "ai4i_2020.zip"
CSV_PATH = DATA_DIR / "ai4i2020.csv"

RANDOM_STATE = 42
TEST_SIZE = 0.20
CV_FOLDS = 5

TARGET = "Machine failure"
NUMERIC = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]
CATEGORICAL = ["Type"]
FEATURES = CATEGORICAL + NUMERIC


# --------------------------------------------------------------------------- data
def obtain_dataset() -> pd.DataFrame:
    """Return the AI4I 2020 data. Downloads it once and keeps a local copy in data/."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CSV_PATH.exists():
        print(f"Downloading public UCI dataset: {DATASET_URL}")
        try:
            with urlopen(DATASET_URL, timeout=60) as response:
                ZIP_PATH.write_bytes(response.read())
        except Exception as exc:  # no internet, firewall, site down ...
            raise SystemExit(
                f"Could not download the dataset ({exc}).\n"
                f"Download it manually from the UCI page, unzip it, and save the CSV as:\n  {CSV_PATH}"
            )
        with zipfile.ZipFile(ZIP_PATH) as archive:
            candidates = [n for n in archive.namelist() if n.lower().endswith(".csv")]
            if not candidates:
                raise RuntimeError("No CSV file found in the downloaded UCI archive.")
            csv_name = next((n for n in candidates if "ai4i" in n.lower()), candidates[0])
            CSV_PATH.write_bytes(archive.read(csv_name))
    return check_dataframe(pd.read_csv(CSV_PATH))


def check_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Keep only the columns we need and stop early if the schema is not what we expect."""
    missing = set(FEATURES + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset schema changed; missing columns: {sorted(missing)}")
    # Identifier columns and the five failure-mode columns (TWF, HDF, ...) are NOT used as
    # features: they would leak the answer.
    return df[FEATURES + [TARGET]].dropna()


# -------------------------------------------------------------------------- models
def _tree_preprocess() -> ColumnTransformer:
    """Trees do not need scaling, so numeric columns pass through unchanged."""
    return ColumnTransformer(
        [("category", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL), ("numeric", "passthrough", NUMERIC)]
    )


def _linear_preprocess() -> ColumnTransformer:
    """Logistic regression is sensitive to scale, so numeric columns are standardised."""
    return ColumnTransformer(
        [("category", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL), ("numeric", StandardScaler(), NUMERIC)]
    )


def build_models(n_estimators: int = 300) -> dict[str, Pipeline]:
    """The three candidate models. All use class_weight='balanced' because failures are rare."""
    return {
        "Logistic Regression": Pipeline([
            ("preprocess", _linear_preprocess()),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)),
        ]),
        "Decision Tree": Pipeline([
            ("preprocess", _tree_preprocess()),
            # max_depth / min_samples_leaf are simple, untuned limits that stop the tree memorising the data
            ("classifier", DecisionTreeClassifier(
                max_depth=8, min_samples_leaf=5, class_weight="balanced", random_state=RANDOM_STATE)),
        ]),
        "Random Forest": Pipeline([
            ("preprocess", _tree_preprocess()),
            ("classifier", RandomForestClassifier(
                n_estimators=n_estimators, class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1)),
        ]),
    }


# ------------------------------------------------------------------------- metrics
def failure_metrics(y_true, proba, threshold: float = 0.5) -> dict:
    """Metrics for the failure class (label 1). A record is called 'failure' if proba > threshold."""
    pred = (np.asarray(proba) > threshold).astype(int)
    cm = confusion_matrix(y_true, pred, labels=[0, 1])
    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy_score(y_true, pred)),
        "precision_failure_class": float(precision_score(y_true, pred, zero_division=0)),
        "recall_failure_class": float(recall_score(y_true, pred, zero_division=0)),
        "f1_failure_class": float(f1_score(y_true, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc_average_precision": float(average_precision_score(y_true, proba)),
        "confusion_matrix_labels_0_then_1": cm.tolist(),
        "classification_report": classification_report(
            y_true, pred, labels=[0, 1], target_names=["no_failure", "failure"], output_dict=True, zero_division=0
        ),
    }


def choose_threshold(y_true, oof_proba) -> float:
    """Pick the probability threshold that maximises F1 on out-of-fold TRAIN predictions.

    This is an experiment: the default threshold used everywhere else is 0.5."""
    best_t, best_f1 = 0.5, -1.0
    for t in np.arange(0.05, 0.96, 0.01):
        f1 = f1_score(y_true, (oof_proba > t).astype(int), zero_division=0)
        if f1 > best_f1:
            best_t, best_f1 = float(t), float(f1)
    return round(best_t, 2)


# ------------------------------------------------------------------------ experiment
def run_experiment(df: pd.DataFrame, make_plots: bool = True, artifact_dir: Path = ARTIFACT_DIR, n_estimators: int = 300):
    """Run the whole comparison. Returns (metrics_dict, model_bundle_dict)."""
    artifact_dir.mkdir(parents=True, exist_ok=True)
    X, y = df[FEATURES], df[TARGET].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    scoring = {"precision": "precision", "recall": "recall", "f1": "f1", "roc_auc": "roc_auc", "pr_auc": "average_precision"}

    comparison, fitted = {}, {}
    for name, model in build_models(n_estimators).items():
        print(f"Cross-validating {name} ({CV_FOLDS}-fold) ...")
        cv = cross_validate(clone(model), X_train, y_train, cv=skf, scoring=scoring, n_jobs=1)
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]
        fitted[name] = model
        comparison[name] = {
            "cv_mean": {k: float(np.mean(cv[f"test_{k}"])) for k in scoring},
            "cv_std": {k: float(np.std(cv[f"test_{k}"])) for k in scoring},
            "test_metrics": failure_metrics(y_test, proba),
        }

    # The model is chosen using CROSS-VALIDATION on the training data only - never the test set.
    selected = max(comparison, key=lambda n: comparison[n]["cv_mean"]["f1"])
    model = fitted[selected]
    proba_test = model.predict_proba(X_test)[:, 1]

    oof = cross_val_predict(clone(build_models(n_estimators)[selected]), X_train, y_train, cv=skf, method="predict_proba")[:, 1]
    tuned_t = choose_threshold(y_train, oof)

    n_fail_test = int(y_test.sum())
    metrics = {
        "dataset": "UCI AI4I 2020 Predictive Maintenance",
        "dataset_domain": "synthetic industrial machinery; not motorcycles",
        "dataset_url": "https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset",
        "license": "CC BY 4.0 (verify current dataset page before redistribution)",
        "rows_used": int(len(df)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "test_failures": n_fail_test,
        "target": TARGET,
        "features": FEATURES,
        "random_state": RANDOM_STATE,
        "cv_folds": CV_FOLDS,
        "selected_model": selected,
        "selection_rule": f"highest mean {CV_FOLDS}-fold cross-validated F1-score (failure class) on the training set",
        "majority_baseline_accuracy": float(1 - n_fail_test / len(y_test)),
        # kept under the original key so the web app keeps working
        "test_metrics": comparison[selected]["test_metrics"],
        "model_comparison": comparison,
        "threshold_experiment": {
            "note": "Threshold chosen on out-of-fold TRAIN predictions to maximise F1, then applied once to the test set. The deployed API still uses 0.5.",
            "chosen_threshold": tuned_t,
            "test_metrics": failure_metrics(y_test, proba_test, tuned_t),
        },
        "caveats": [
            "Dataset records are synthetic and industrial, not motorcycle observations.",
            "Metrics evaluate only this held-out random split and dataset; they do not establish real-world or motorcycle performance.",
            "The failure class is rare; inspect precision and recall, not accuracy alone.",
            "Hyper-parameters are mostly library defaults and were not tuned.",
        ],
    }
    bundle = {
        "model": model, "features": FEATURES, "categorical": CATEGORICAL,
        "dataset": metrics["dataset"], "domain_warning": metrics["dataset_domain"], "model_name": selected,
    }
    if make_plots:
        save_plots(model, X_test, y_test, proba_test, selected, artifact_dir)
    return metrics, bundle


def save_plots(model, X_test, y_test, proba, name, out_dir: Path) -> None:
    """Save confusion-matrix, ROC and precision-recall plots (skipped if matplotlib is missing)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from sklearn.metrics import ConfusionMatrixDisplay, PrecisionRecallDisplay, RocCurveDisplay
    except ImportError:
        print("matplotlib not installed - skipping plots (pip install matplotlib)")
        return
    pred = (proba > 0.5).astype(int)
    fig, ax = plt.subplots(figsize=(4.5, 4))
    ConfusionMatrixDisplay.from_predictions(y_test, pred, display_labels=["No failure", "Failure"], ax=ax, colorbar=False)
    ax.set_title(f"{name}: confusion matrix (test set)")
    fig.tight_layout(); fig.savefig(out_dir / "confusion_matrix.png", dpi=150); plt.close(fig)
    fig, ax = plt.subplots(figsize=(4.5, 4))
    RocCurveDisplay.from_predictions(y_test, proba, ax=ax); ax.set_title(f"{name}: ROC curve")
    fig.tight_layout(); fig.savefig(out_dir / "roc_curve.png", dpi=150); plt.close(fig)
    fig, ax = plt.subplots(figsize=(4.5, 4))
    PrecisionRecallDisplay.from_predictions(y_test, proba, ax=ax); ax.set_title(f"{name}: precision-recall curve")
    fig.tight_layout(); fig.savefig(out_dir / "pr_curve.png", dpi=150); plt.close(fig)


def main() -> None:
    df = obtain_dataset()
    metrics, bundle = run_experiment(df)
    joblib.dump(bundle, ARTIFACT_DIR / "model.joblib")
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("\n=== Model comparison (5-fold CV on train, then test set) ===")
    print(f"{'Model':<22}{'CV F1':>8}{'Test P':>9}{'Test R':>9}{'Test F1':>9}{'ROC AUC':>9}")
    for n, c in metrics["model_comparison"].items():
        t = c["test_metrics"]
        print(f"{n:<22}{c['cv_mean']['f1']:>8.3f}{t['precision_failure_class']:>9.3f}{t['recall_failure_class']:>9.3f}"
              f"{t['f1_failure_class']:>9.3f}{t['roc_auc']:>9.3f}")
    print(f"\nSelected model: {metrics['selected_model']}  (rule: {metrics['selection_rule']})")
    print(f"Saved model   -> {ARTIFACT_DIR / 'model.joblib'}")
    print(f"Saved metrics -> {ARTIFACT_DIR / 'metrics.json'}")


if __name__ == "__main__":
    main()
