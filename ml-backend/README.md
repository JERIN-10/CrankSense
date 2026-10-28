# CrankSense ML backend

A reproducible **predictive-maintenance ML experiment** and API.

## Domain limitation
The data are the UCI AI4I 2020 dataset: **synthetic industrial-machine records, not motorcycles**. The models predict the dataset's `Machine failure` label only and must not be described as validated motorcycle failure predictors. The motorcycle assessment in the website is a separate rule-based baseline; its inputs are never fed to these models.

## What `train.py` does
1. Downloads/loads the data and checks the columns (identifier and failure-mode columns are **not** used as features).
2. Splits 80% train / 20% test (stratified, random state 42).
3. Compares Logistic Regression, Decision Tree and Random Forest with 5-fold stratified cross-validation on the **train** set.
4. Selects the model with the best mean CV F1-score for the failure class (the test set is not used to choose).
5. Evaluates the selected model once on the test set; saves `artifacts/model.joblib`, `artifacts/metrics.json`, and plots.
6. Also reports an experiment with a tuned decision threshold (chosen on training data only). The API still uses the default 0.5.

Run: `python train.py` (see the main README for the full setup).

## API
- `GET /health`, `GET /model-info`, `GET /metrics`
- `POST /predict/industrial` - body example:
```json
{"type": "M", "air_temperature_k": 300.0, "process_temperature_k": 310.0,
 "rotational_speed_rpm": 1500, "torque_nm": 40.0, "tool_wear_min": 100}
```
Docs: http://127.0.0.1:8000/docs

## Tests
`python -m unittest discover -s tests -v` (uses fake data; no internet needed).

## Next step for motorcycle-specific ML
Collect consented, quality-controlled motorcycle records with a measurement protocol and maintenance/fault outcome labels; split train/test by motorcycle. Do not use rule-based scores as labels and then claim the model independently predicts failure.
