# What changed in this version

**Fixed misleading content**
- `src/routes/models.tsx`: removed hard-coded accuracy numbers and a made-up 3-class confusion matrix. The page now reads real results from the API (`/metrics`).
- `src/routes/about.tsx`, `src/routes/index.tsx`: removed the "94.2% accuracy", "Production model" and "model trained on ..." claims; text now says the motorcycle verdict is rule-based and the ML demo uses industrial data.
- `src/lib/diagnose.ts`: removed the "outside the sub-100cc training range" wording (the rules have no training data).

**Improved the machine learning**
- `ml-backend/train.py`: compares Logistic Regression, Decision Tree and Random Forest with 5-fold stratified cross-validation; selects by CV F1 (not by test score); also saves PR-AUC, a majority-class baseline, a threshold experiment and plots.
- `ml-backend/api.py`: `/model-info` reports the selected model's name.
- `ml-backend/tests/test_train.py`: 9 unit tests (fake data). `tests/rules.test.ts`: 11 tests for the rule-based scoring (`npm run test:rules`). `.github/workflows/tests.yml` runs both on GitHub.

**Easier to run**
- `scripts/run-backend.mjs` + `package.json`: backend start-up now works on Windows, Mac and Linux.
- `ml-backend/requirements.txt`: removed unused `requests`, added `matplotlib` (for plots).
- Rewritten `README.md` with step-by-step beginner instructions.

**Not changed:** `artifacts/model.joblib` and `metrics.json` are the OLD saved files, so the app works immediately. Run `python train.py` to replace them with results from the new comparison.
