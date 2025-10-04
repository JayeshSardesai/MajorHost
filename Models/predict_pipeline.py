import pickle
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Union

def load_artifacts(categorical_cols_path: str,
                   xtrain_engineered_log_cols_path: str,
                   ensemble_models_path: str):
    with open(categorical_cols_path, "rb") as f:
        categorical_cols = pickle.load(f)
    with open(xtrain_engineered_log_cols_path, "rb") as f:
        xtrain_engineered_log_cols = pickle.load(f)
    with open(ensemble_models_path, "rb") as f:
        ensemble_models = pickle.load(f)

    return categorical_cols, xtrain_engineered_log_cols, ensemble_models


def preprocess_for_log_models(new_data: pd.DataFrame,
                              categorical_cols: List[str],
                              xtrain_engineered_log_cols: List[str]) -> pd.DataFrame:

    # One-hot encode
    new_encoded = pd.get_dummies(new_data.copy(),
                                 columns=categorical_cols,
                                 drop_first=False)

    if 'Area' in new_encoded.columns:
        new_encoded = new_encoded.drop(columns=['Area'])

    # Polynomial features
    area_df = pd.DataFrame({
        'Area': new_data['Area'].astype(float),
        'Area^2': (new_data['Area'].astype(float)) ** 2
    }, index=new_data.index)

    engineered = pd.concat([new_encoded, area_df], axis=1)

    # Add missing columns
    missing_cols = set(xtrain_engineered_log_cols) - set(engineered.columns)
    for c in missing_cols:
        engineered[c] = 0

    # Align order
    engineered_aligned = engineered.reindex(columns=xtrain_engineered_log_cols,
                                            fill_value=0)
    return engineered_aligned


def _collect_models(ensemble_models_obj: Union[Dict, List, Any]):
    if isinstance(ensemble_models_obj, dict):
        return list(ensemble_models_obj.values())
    elif isinstance(ensemble_models_obj, list):
        return ensemble_models_obj
    else:
        return [ensemble_models_obj]


def predict_original_scale(X: pd.DataFrame, ensemble_models_obj):
    models = _collect_models(ensemble_models_obj)
    preds = [m.predict(X).reshape(-1) for m in models]
    preds = np.vstack(preds)
    avg_log = np.mean(preds, axis=0)
    y_pred = np.expm1(avg_log)
    return np.clip(y_pred, 0, None)


class LogEnsemblePredictor:
    def __init__(self, categorical_cols_path, xtrain_engineered_log_cols_path, ensemble_models_path):
        self.categorical_cols, self.xtrain_engineered_log_cols, self.ensemble_models = load_artifacts(
            categorical_cols_path, xtrain_engineered_log_cols_path, ensemble_models_path
        )

    def predict_from_row(self, row: Dict[str, Any]) -> float:
        new_df = pd.DataFrame([row])
        X = preprocess_for_log_models(new_df, self.categorical_cols, self.xtrain_engineered_log_cols)
        y = predict_original_scale(X, self.ensemble_models)
        return float(y[0])
