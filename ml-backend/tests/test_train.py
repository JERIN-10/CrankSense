"""Tests for train.py. They use a SMALL FAKE dataset (random numbers), so they run in seconds,
need no internet, and only check that the code works - they say nothing about real accuracy.

Run from the ml-backend folder:   python -m unittest discover -s tests -v
"""
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import train  # noqa: E402


def fake_dataframe(n: int = 600, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "Type": rng.choice(["L", "M", "H"], n, p=[0.6, 0.3, 0.1]),
        "Air temperature [K]": rng.normal(300, 2, n),
        "Process temperature [K]": rng.normal(310, 1, n),
        "Rotational speed [rpm]": rng.normal(1500, 100, n),
        "Torque [Nm]": rng.normal(40, 10, n),
        "Tool wear [min]": rng.integers(0, 250, n),
    })
    # rare failures that depend (noisily) on torque and tool wear
    score = (df["Torque [Nm]"] - 40) / 10 + (df["Tool wear [min]"] - 100) / 80 + rng.normal(0, 0.7, n)
    df["Machine failure"] = (score > 1.8).astype(int)
    return df


class TrainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = fake_dataframe()
        cls.tmp = tempfile.TemporaryDirectory()
        cls.metrics, cls.bundle = train.run_experiment(
            cls.df, make_plots=False, artifact_dir=Path(cls.tmp.name), n_estimators=30)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_schema_check_rejects_missing_column(self):
        with self.assertRaises(ValueError):
            train.check_dataframe(self.df.drop(columns=["Torque [Nm]"]))

    def test_split_sizes_add_up(self):
        m = self.metrics
        self.assertEqual(m["train_rows"] + m["test_rows"], len(self.df))
        self.assertEqual(m["test_rows"], int(round(len(self.df) * train.TEST_SIZE)))

    def test_all_three_models_compared(self):
        self.assertEqual(set(self.metrics["model_comparison"]),
                         {"Logistic Regression", "Decision Tree", "Random Forest"})

    def test_confusion_matrix_matches_test_size(self):
        for c in self.metrics["model_comparison"].values():
            cm = np.array(c["test_metrics"]["confusion_matrix_labels_0_then_1"])
            self.assertEqual(cm.shape, (2, 2))
            self.assertEqual(int(cm.sum()), self.metrics["test_rows"])

    def test_metrics_are_between_0_and_1(self):
        for c in self.metrics["model_comparison"].values():
            for key in ("accuracy", "precision_failure_class", "recall_failure_class", "f1_failure_class", "roc_auc"):
                self.assertGreaterEqual(c["test_metrics"][key], 0.0)
                self.assertLessEqual(c["test_metrics"][key], 1.0)

    def test_selection_uses_cross_validation_not_test_set(self):
        comp = self.metrics["model_comparison"]
        best = max(comp, key=lambda n: comp[n]["cv_mean"]["f1"])
        self.assertEqual(self.metrics["selected_model"], best)
        self.assertEqual(self.metrics["test_metrics"], comp[best]["test_metrics"])

    def test_bundle_can_predict_one_row(self):
        row = pd.DataFrame([{"Type": "L", "Air temperature [K]": 300.0, "Process temperature [K]": 310.0,
                             "Rotational speed [rpm]": 1500.0, "Torque [Nm]": 50.0, "Tool wear [min]": 150.0}])
        p = self.bundle["model"].predict_proba(row)[0][1]
        self.assertTrue(0.0 <= p <= 1.0)

    def test_threshold_is_in_search_range(self):
        t = self.metrics["threshold_experiment"]["chosen_threshold"]
        self.assertTrue(0.05 <= t <= 0.95)

    def test_failure_columns_are_not_used_as_features(self):
        for bad in ("TWF", "HDF", "PWF", "OSF", "RNF", "UDI", "Product ID"):
            self.assertNotIn(bad, train.FEATURES)


if __name__ == "__main__":
    unittest.main()
