from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path
from json import dumps, loads
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet
import sqlite3

app = Flask(__name__)
CORS(app)

@app.route('/messages', methods = ['POST'])

def add_message():
    password = request.headers.get('X-Encryption-Key')
    if not password:
        return "No password found", 400
    message = dumps(request.json)
    key = get_key(password)

    encrypted_message = encrypt_string(message, key)

    with sqlite3.connect("log.db") as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL
            )
        """)
        cursor.execute(
            "INSERT INTO messages (message) VALUES (?)",
            (encrypted_message,)
        )
        conn.commit()
    return "", 201
    

@app.route('/messages', methods = ['GET'])

def return_messages():
    password = request.headers.get('X-Encryption-Key')
    if not password:
        return "No password found", 400
    key = get_key(password)
    

    with sqlite3.connect("log.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT message FROM messages")
        rows = cursor.fetchall()
    messages = []
    for row in rows:
        try:
            encrypted_msg_b64 = row[0]
            encrypted_msg_bytes = base64.urlsafe_b64decode(encrypted_msg_b64.encode())
            decrypted = Fernet(key).decrypt(encrypted_msg_bytes)
            messages.append(decrypted.decode())
        except:
            pass
    return jsonify(messages), 200

@app.route('/messages', methods=["DELETE"])

def delete_messages():
    password = request.headers.get('X-Encryption-Key')
    if not password:
        return "No password found", 400
    key = get_key(password)

    with sqlite3.connect("log.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, message FROM messages")
        rows = cursor.fetchall()
        ids_to_delete = []

    for row_id, encrypted_msg_b64 in rows:
        try:
            encrypted_msg_bytes = base64.urlsafe_b64decode(encrypted_msg_b64.encode())
            decrypted = Fernet(key).decrypt(encrypted_msg_bytes)
            ids_to_delete.append(row_id)
        except:
            pass

    num_deleted_rows = len(ids_to_delete)
    for id_to_delete in ids_to_delete:
        cursor.execute("DELETE FROM messages WHERE id = ?", (id_to_delete,))
    
    conn.commit()

    return jsonify({"deleted": num_deleted_rows}), 200



def get_key(password: str):
    password_bytes = password.encode()

    salt = b'whydoidothistomyself'

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000
    )
    derived_raw_key = kdf.derive(password_bytes)
    fernet_key = base64.urlsafe_b64encode(derived_raw_key)
    return fernet_key

def encrypt_string(message:str, key:bytes):
    cypher = Fernet(key)
    encoded_text = message.encode('utf-8')
    encrypted_bytes = cypher.encrypt(encoded_text)
    return base64.urlsafe_b64encode(encrypted_bytes).decode()

def decrypt_string(encrypted_bytes:bytes, key:bytes):
    cypher = Fernet(key)
    decrypted_bytes = cypher.decrypt(encrypted_bytes)
    return decrypted_bytes.decode('utf-8')


if __name__ == '__main__':
    app.run()
