from io import BytesIO

import numpy as np
import requests
from flask import Flask, jsonify, request
from PIL import Image

app = Flask(__name__)


def _load_image_from_url(image_url: str) -> np.ndarray:
    response = requests.get(image_url, timeout=20)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content)).convert("RGB")
    return np.array(image)


def classify_cervical_image(image_url: str) -> dict:
    """
    Classification logic adapted from the existing cervical classification project.
    This uses average red-channel intensity to infer likely stage.
    """
    image = _load_image_from_url(image_url)
    avg_red_intensity = float(np.mean(image[:, :, 0]))

    if avg_red_intensity > 200:
        return {
            "reviewStatus": "Abnormal",
            "aiResult": "Stage 3 Cancer",
            "confidence": 0.78,
            "avgRedIntensity": avg_red_intensity,
        }

    if avg_red_intensity > 170:
        return {
            "reviewStatus": "Abnormal",
            "aiResult": "Stage 2 Cancer",
            "confidence": 0.72,
            "avgRedIntensity": avg_red_intensity,
        }

    if avg_red_intensity < 150:
        return {
            "reviewStatus": "Abnormal",
            "aiResult": "Stage 1 Cancer",
            "confidence": 0.68,
            "avgRedIntensity": avg_red_intensity,
        }

    return {
        "reviewStatus": "Normal",
        "aiResult": "No signs of cancer",
        "confidence": 0.74,
        "avgRedIntensity": avg_red_intensity,
    }


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/predict")
def predict():
    body = request.get_json(silent=True) or {}
    image_url = body.get("imageUrl")
    screening_id = body.get("screeningId")

    if not image_url:
        return jsonify({"error": "imageUrl is required"}), 400

    try:
        result = classify_cervical_image(image_url)
        return jsonify(
            {
                "screeningId": screening_id,
                **result,
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
