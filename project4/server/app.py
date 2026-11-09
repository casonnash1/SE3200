from flask import Flask, jsonify, request, url_for
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from database import BodyDB

app = Flask(__name__)
CORS(app)
db = BodyDB()


@app.route('/bodies', methods=['GET'])
def get_all_bodies():
    err_code, data = db.list()
    if err_code:
        return jsonify(data), err_code
    return jsonify(data), 200


# <path:name> so names containing "/" (e.g. "1P/Halley") still match.
@app.route('/bodies/<path:name>', methods=['GET'])
def get_body(name):
    err_code, data = db.get(name)
    if err_code:
        return jsonify(data), err_code
    return jsonify(data), 200


@app.route('/bodies', methods=['POST'])
def add_to_list():
    err_code, data = db.create(request.get_json(silent=True))
    if err_code:
        return jsonify(data), err_code

    response = jsonify(data)
    response.status_code = 201
    response.headers["Location"] = url_for('get_body', name=data['name'])
    return response


@app.route('/bodies/<path:name>', methods=['PUT'])
def replace_in_list(name):
    err_code, data = db.replace(name, request.get_json(silent=True))
    if err_code:
        return jsonify(data), err_code
    return jsonify(data), 200


@app.route('/bodies/<path:name>', methods=['DELETE'])
def delete_from_list(name):
    err_code, data = db.delete(name)
    if err_code:
        return jsonify(data), err_code
    return "", 204


@app.errorhandler(HTTPException)
def http_error(e):
    if e.code == 404:
        message = f"No route matches {request.method} {request.path}"
    elif e.code == 405:
        message = f"{request.method} is not supported on {request.path}"
    else:
        message = e.description
    response = jsonify({"error": e.name, "message": message})
    response.status_code = e.code
    if e.code == 405 and getattr(e, "valid_methods", None):
        response.headers["Allow"] = ", ".join(e.valid_methods)
    return response


@app.errorhandler(Exception)
def server_error(e):
    return jsonify({"error": "Internal Server Error",
                    "message": "Something went wrong on the server"}), 500


if __name__ == '__main__':
    app.run()
