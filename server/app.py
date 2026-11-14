"""Q-Tunnel Lab — server API Python (Flask).

Jalankan:  python server/app.py   lalu buka http://localhost/labvirtual/
(atau http://localhost:5000/ — server ini juga menyajikan halaman web).
"""
import os
import numpy as np
from flask import Flask, jsonify, request, send_from_directory

import physics as ph

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, static_folder=None)


@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp


def params():
    g = request.args
    return float(g.get("V0", 5)), float(g.get("a", 0.4)), float(g.get("m", 1))


@app.get("/api/health")
def health():
    return jsonify(status="ok", engine=f"NumPy {np.__version__}")


@app.get("/api/transmission")
def api_transmission():
    V0, a, m = params()
    E = float(request.args.get("E", 3))
    T = ph.transmission(E, V0, a, m)
    Tn, Rn = ph.numerical_T(E, V0, a, m)
    return jsonify(E=E, T=T, R=1 - T, T_classical=ph.classical_T(E, V0), T_numerical=Tn, R_numerical=Rn)


@app.get("/api/verify")
def api_verify():
    V0, a, m = params()
    res = ph.verify(V0, a, m)
    for c in res["checks"]:
        c["pass"] = c.pop("pass_")
    try:
        res["plot"] = ph.verification_plot(V0, a, m)
    except Exception as e:  # matplotlib opsional
        res["plot_error"] = str(e)
    res["numpy"] = np.__version__
    res["method"] = "RK4 N=4000 + matriks transfer"
    return jsonify(res)


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:p>")
def static_files(p):
    return send_from_directory(ROOT, p)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
