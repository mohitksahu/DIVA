from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
from dotenv import load_dotenv
import os
# Load environment variables from .env file
load_dotenv(dotenv_path="F:/DIVA/DIVA/.git/.env")

# Retrieve the URL from the environment variables
YOUR_URL = os.getenv("OLLAMA_API")

if not YOUR_URL:
    raise ValueError("❌ ERROR: 'YOUR_URL' not found in environment variables")

app = Flask(__name__)
CORS(app)


@app.route("/chat/", methods=["POST"])
def chat_with_ollama():
    try:
        # 🔍 Log raw request body
        raw_data = request.data.decode("utf-8").strip()
        print(f"📩 Received raw request: {raw_data}")

        # ✅ Ensure JSON format is correct
        try:
            data = json.loads(raw_data)
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parsing Error: {e}")
            return jsonify({"error": "Invalid JSON format"}), 400

        # ✅ Ensure 'prompt' exists
        if "prompt" not in data:
            print("❌ ERROR: Missing 'prompt' field in request")
            return jsonify({"error": "Missing 'prompt' field"}), 400

        prompt = data["prompt"]
        print(f"💬 User Prompt: {prompt}")

        # ✅ Send request to Ollama API (Stream response)
        response = requests.post(YOUR_URL, json={"model": "llama2:latest", "prompt": prompt}, stream=True)

        # ✅ Handle non-200 responses
        if response.status_code != 200:
            print(f"❌ ERROR: Ollama API Error {response.status_code}: {response.text}")
            return jsonify({"error": f"Ollama API Error {response.status_code}: {response.text}"}), response.status_code

        # ✅ Read Ollama's response correctly
        ollama_reply = ""
        for line in response.iter_lines():
            if line:
                try:
                    decoded_line = json.loads(line.decode("utf-8"))  # Convert each line to JSON
                    ollama_reply += decoded_line.get("response", "") + " "  # Append response content
                except json.JSONDecodeError:
                    print(f"⚠️ Warning: Ignored invalid JSON line: {line}")

        ollama_reply = ollama_reply.strip()  # Clean up extra spaces
        print(f"✅ Ollama Response: {ollama_reply}")

        return jsonify({"response": ollama_reply})

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to Ollama backend")
        return jsonify({"error": "Failed to connect to Ollama backend. Make sure it's running!"}), 500

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Flask server running at http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
