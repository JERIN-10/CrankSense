"""FastAPI serving layer for the industrial-dataset experiment."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal
import json

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("CRANKSENSE_MODEL_PATH", BASE_DIR / "artifacts" / "model.joblib"))
MODEL_BUNDLE = None
try:
    if MODEL_PATH.exists():
        MODEL_BUNDLE = joblib.load(MODEL_PATH)
except Exception as exc:  # keep health endpoint available for diagnostics
    print(f"Model could not be loaded: {exc}")

app = FastAPI(
    title="CrankSense ML API",
    version="1.0.0",
    description=(
        "Experimental predictive-maintenance API trained on synthetic industrial data. "
        "Not validated for motorcycle engine diagnosis."
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class IndustrialReading(BaseModel):
    type: Literal["L", "M", "H"] = Field(description="Machine quality/type category in AI4I dataset")
    air_temperature_k: float = Field(ge=250, le=400)
    process_temperature_k: float = Field(ge=250, le=450)
    rotational_speed_rpm: float = Field(gt=0, le=10000)
    torque_nm: float = Field(ge=0, le=1000)
    tool_wear_min: float = Field(ge=0, le=1000)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_ready": MODEL_BUNDLE is not None,
        "model_domain": "synthetic industrial machinery",
        "motorcycle_validated": False,
        "message": (
            "Model loaded. Industrial predictions only; not a motorcycle failure predictor."
            if MODEL_BUNDLE is not None
            else "Model not trained yet. Run `python train.py` from ml-backend."
        ),
    }


@app.get("/model-info")
def model_info():
    return {
        "model_ready": MODEL_BUNDLE is not None,
        "model": f"scikit-learn {MODEL_BUNDLE.get('model_name', 'RandomForest')} pipeline" if MODEL_BUNDLE is not None else "not loaded",
        "dataset": "UCI AI4I 2020 Predictive Maintenance",
        "dataset_domain": "synthetic industrial machinery",
        "motorcycle_validated": False,
        "features": [
            {"name": "type", "unit": "L/M/H category"},
            {"name": "air_temperature_k", "unit": "K"},
            {"name": "process_temperature_k", "unit": "K"},
            {"name": "rotational_speed_rpm", "unit": "rpm"},
            {"name": "torque_nm", "unit": "N·m"},
            {"name": "tool_wear_min", "unit": "min"},
        ],
    }


@app.get("/metrics")
def evaluation_metrics():
    """Return measured held-out test metrics written by train.py."""
    metrics_path = BASE_DIR / "artifacts" / "metrics.json"
    if not metrics_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Evaluation metrics not found. Run `python train.py` in the ml-backend directory first.",
        )
    try:
        return json.loads(metrics_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Could not read saved evaluation metrics.") from exc


@app.post("/predict/industrial")
def predict_industrial(reading: IndustrialReading):
    if MODEL_BUNDLE is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not available. Run `python train.py` in the ml-backend directory first.",
        )
    import pandas as pd

    row = pd.DataFrame([{
        "Type": reading.type,
        "Air temperature [K]": reading.air_temperature_k,
        "Process temperature [K]": reading.process_temperature_k,
        "Rotational speed [rpm]": reading.rotational_speed_rpm,
        "Torque [Nm]": reading.torque_nm,
        "Tool wear [min]": reading.tool_wear_min,
    }])
    model = MODEL_BUNDLE["model"]
    probability = float(model.predict_proba(row)[0][1])
    predicted = int(model.predict(row)[0])
    return {
        "predicted_failure": bool(predicted),
        "failure_probability": round(probability, 6),
        "interpretation": "Dataset-model output; not a probability calibrated for motorcycle use.",
        "dataset_domain": MODEL_BUNDLE.get("domain_warning", "industrial machinery"),
        "motorcycle_validated": False,
    }
