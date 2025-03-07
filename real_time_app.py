from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import joblib
import numpy as np
import pandas as pd
from feature_extractor import FeatureExtractor
from threading import Thread
from scapy.all import sniff

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the model and scaler
model = joblib.load('output/random_forest_model.pkl')
scaler = joblib.load('output/scaler.pkl')

# Initialize feature extractor
extractor = FeatureExtractor()

def capture_packets():
    sniff(iface="en0", prn=extractor.extract_features, store=False)  # Adjust iface as needed

@app.route('/predict', methods=['POST'])
def predict():
    # Get features from the extractor
    features = extractor.get_features()
    
    if features.size == 0:
        print('No features extracted yet')
        return jsonify({'error': 'No features extracted yet'}), 400
    
    print('Extracted features before preprocessing:', features)
    
    # Convert to DataFrame and drop non-numeric columns
    features_df = pd.DataFrame(features)
    features_df = features_df.apply(pd.to_numeric, errors='coerce')
    features_df = features_df.dropna(axis=1)  # Remove columns that could not be converted
    
    print('Processed features (Before Fixing Shape):', features_df.shape)
    
    # Ensure the number of features matches the trained model (80 features)
    expected_feature_count = scaler.n_features_in_
    
    if features_df.shape[1] > expected_feature_count:
        features_df = features_df.iloc[:, :expected_feature_count]  # Trim extra columns
    elif features_df.shape[1] < expected_feature_count:
        missing_cols = expected_feature_count - features_df.shape[1]
        for i in range(missing_cols):
            features_df[f'fake_col_{i}'] = 0  # Add missing columns with zeros
    
    print('Processed features (After Fixing Shape):', features_df.shape)
    
    # Ensure features are in the correct format
    features_scaled = scaler.transform(features_df)
    
    # Make predictions
    predictions = model.predict(features_scaled)
    print('Predictions:', predictions)
    
    # Return predictions as JSON
    return jsonify({'predictions': predictions.tolist()})

if __name__ == '__main__':
    # Start packet capture in a separate thread
    Thread(target=capture_packets).start()
    
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
