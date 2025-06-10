from flask import Flask, request, jsonify
from pymongo import MongoClient
import os

app = Flask(__name__)
client = MongoClient(os.getenv('ATLAS_URI'))
db = client.mydatabase

@app.route('/submit', methods=['POST'])
def submit():
        data = request.get_json()
        if not data.get('name') or not data.get('email'):
            return 'Missing Fields', 400
        result = db.submissions.insert_one(data)
        return jsonify({'id': str(result.inserted_id)})

@app.route('/')
def home():
    return "Flask backend"

if __name__ == '__main__':
    app.run(host= '0.0.0.0', port=5000)

                    
