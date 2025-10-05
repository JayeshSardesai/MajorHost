from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
from predict_pipeline import LogEnsemblePredictor

app = Flask(__name__)
CORS(app)

# --- LAZY LOADING SETUP ---
# We initialize the models as None. They will only be loaded into memory when needed.
_yield_predictor = None
_crop_model = None
_xtrain_columns = None

def get_yield_predictor():
    """Loads the yield prediction model on the first request."""
    global _yield_predictor
    if _yield_predictor is None:
        print("🚀 Loading Yield Prediction model for the first time...")
        _yield_predictor = LogEnsemblePredictor(
            categorical_cols_path="categorical_cols.pkl",
            xtrain_engineered_log_cols_path="X_train_engineered_log_cols.pkl",
            ensemble_models_path="log_transformed_averaging_ensemble_models.pkl"
        )
        print("✅ Yield Prediction model loaded successfully.")
    return _yield_predictor

def get_crop_model():
    """Loads the crop recommendation model on the first request."""
    global _crop_model, _xtrain_columns
    if _crop_model is None:
        print("🚀 Loading Crop Recommendation model for the first time...")
        with open("new_voting_classifier.pkl", "rb") as f:
            _crop_model = pickle.load(f)
        with open("X_train_columns.pkl", "rb") as f:
            _xtrain_columns = pickle.load(f)
        print("✅ Crop Recommendation model loaded successfully.")
    return _crop_model, _xtrain_columns

# --- API ROUTES ---

@app.route("/api/predict-yield", methods=["POST"])
def api_predict_yield():
    try:
        # Load the model (only if it's not already in memory)
        predictor = get_yield_predictor()
        
        data = request.get_json(force=True)
        row = {
            "Area": float(data["Area"]),
            "State_Name": data["State_Name"],
            "District_Name": data["District_Name"],
            "Season": data["Season"],
            "Crop": data["Crop"]
        }
        pred = predictor.predict_from_row(row)
        return jsonify({"predicted_yield": pred})
    except Exception as e:
        print(f"❌ Error in /api/predict-yield: {e}")
        return jsonify({"error": str(e)}), 400

@app.route("/api/recommend-crop", methods=["POST"])
def api_recommend_crop():
    try:
        # Load the model (only if it's not already in memory)
        model, xtrain_columns = get_crop_model()

        data = request.get_json(force=True)
        data_sample = {
            "SOIL_PH": [float(data["SOIL_PH"])], "TEMP": [float(data["TEMP"])],
            "RELATIVE_HUMIDITY": [float(data["RELATIVE_HUMIDITY"])], "N": [float(data["N"])],
            "P": [float(data["P"])], "K": [float(data["K"])], "SOIL": [data["SOIL"]],
            "SEASON": [data["SEASON"]]
        }
        sample_df = pd.DataFrame(data_sample)
        categorical_cols_sample = sample_df.select_dtypes(include=['object']).columns
        sample_df = pd.get_dummies(sample_df, columns=categorical_cols_sample, drop_first=True)
        sample_df = sample_df.reindex(columns=xtrain_columns, fill_value=0)
        
        probabilities = model.predict_proba(sample_df)[0]
        class_labels = model.classes_
        probability_series = pd.Series(probabilities, index=class_labels)
        top_crops = probability_series.sort_values(ascending=False).head(5).round(3).to_dict()
        prediction = max(top_crops, key=top_crops.get)
        
        return jsonify({
            "prediction": prediction,
            "top_5_crops": top_crops
        })
    except Exception as e:
        print(f"❌ Error in /api/recommend-crop: {e}")
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=False)