from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
from predict_pipeline import LogEnsemblePredictor

# Initialize the Flask application
app = Flask(__name__)
# Enable CORS to allow requests from your frontend's domain
CORS(app)

# --- SECTION 1: YIELD PREDICTION MODEL ---
# Load all artifacts for the yield prediction model
yield_predictor = LogEnsemblePredictor(
    categorical_cols_path="categorical_cols.pkl",
    xtrain_engineered_log_cols_path="X_train_engineered_log_cols.pkl",
    ensemble_models_path="log_transformed_averaging_ensemble_models.pkl"
)

# API endpoint for predicting crop yield
@app.route("/api/predict-yield", methods=["POST"])
def api_predict_yield():
    """
    Expects a JSON payload with Area, State_Name, District_Name, Season, and Crop.
    Returns the predicted yield as JSON.
    """
    try:
        data = request.get_json(force=True)
        row = {
            "Area": float(data["Area"]),
            "State_Name": data["State_Name"],
            "District_Name": data["District_Name"],
            "Season": data["Season"],
            "Crop": data["Crop"]
        }
        pred = yield_predictor.predict_from_row(row)
        return jsonify({"predicted_yield": pred})
    except Exception as e:
        # Return a clear error message if something goes wrong
        return jsonify({"error": str(e)}), 400


# --- SECTION 2: CROP RECOMMENDATION MODEL ---
# Load all artifacts for the crop recommendation model
with open("new_voting_classifier.pkl", "rb") as f:
    crop_model = pickle.load(f)
with open("X_train_columns.pkl", "rb") as f:
    X_train_columns = pickle.load(f)

# API endpoint for recommending a crop
@app.route("/api/recommend-crop", methods=["POST"])
def api_recommend_crop():
    """
    Expects a JSON payload with soil and weather data.
    Returns the best crop prediction and a dictionary of the top 5 crop probabilities.
    """
    try:
        data = request.get_json(force=True)
        
        # Create a DataFrame from the incoming JSON data
        data_sample = {
            "SOIL_PH": [float(data["SOIL_PH"])],
            "TEMP": [float(data["TEMP"])],
            "RELATIVE_HUMIDITY": [float(data["RELATIVE_HUMIDITY"])],
            "N": [float(data["N"])],
            "P": [float(data["P"])],
            "K": [float(data["K"])],
            "SOIL": [data["SOIL"]],
            "SEASON": [data["SEASON"]]
        }
        sample_df = pd.DataFrame(data_sample)

        # Preprocess the data exactly like the training data
        categorical_cols_sample = sample_df.select_dtypes(include=['object']).columns
        sample_df = pd.get_dummies(sample_df, columns=categorical_cols_sample, drop_first=True)
        # Align columns with the training set, filling missing ones with 0
        sample_df = sample_df.reindex(columns=X_train_columns, fill_value=0)
        
        # Get prediction probabilities for all crops
        probabilities = crop_model.predict_proba(sample_df)[0]
        class_labels = crop_model.classes_
        
        # Create a dictionary of crops and their probabilities
        probability_series = pd.Series(probabilities, index=class_labels)
        top_crops = probability_series.sort_values(ascending=False).head(5).round(3).to_dict()
        
        # The best prediction is the one with the highest probability
        prediction = max(top_crops, key=top_crops.get)
        
        return jsonify({
            "prediction": prediction,
            "top_5_crops": top_crops
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# This block is for local testing and will not be used by the Gunicorn server on Render
if __name__ == "__main__":
    app.run(debug=False, port=5001)
