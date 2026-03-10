import sqlite3
import os
from flask import Flask, render_template, request, jsonify, g, send_from_directory

app = Flask(__name__)
app.config['DATABASE'] = os.path.join(app.root_path, 'database.db')

# ---------- Serve assets from /asset folder ----------
@app.route('/asset/<path:filename>')
def serve_asset(filename):
    # 'asset' folder should exist at the same level as app.py
    return send_from_directory(os.path.join(app.root_path, 'asset'), filename)

# ---------- Database helpers ----------
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

def init_db():
    """Create tables if they don't exist."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS finished_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL,
            customer_name TEXT,
            address TEXT,
            total INTEGER,
            payment_type TEXT,
            plain_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    db.commit()

@app.teardown_appcontext
def close_db(error):
    db = g.pop('_database', None)
    if db is not None:
        db.close()

# Initialize database at startup
with app.app_context():
    init_db()

# ---------- Routes ----------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stock')
def stock():
    return render_template('stock.html')

# ---------- API endpoints ----------
@app.route('/api/finished_orders', methods=['GET'])
def get_finished_orders():
    db = get_db()
    cursor = db.execute('SELECT * FROM finished_orders ORDER BY created_at DESC')
    orders = [dict(row) for row in cursor.fetchall()]
    return jsonify(orders)

@app.route('/api/finished_orders', methods=['POST'])
def add_finished_order():
    data = request.get_json()
    required = ['order_no', 'customer_name', 'address', 'total', 'payment_type', 'plain_text']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400

    db = get_db()
    db.execute('''
        INSERT INTO finished_orders (order_no, customer_name, address, total, payment_type, plain_text)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['order_no'], data['customer_name'], data['address'],
          data['total'], data['payment_type'], data['plain_text']))
    db.commit()
    return jsonify({'status': 'ok'})

@app.route('/api/settings/<key>', methods=['GET'])
def get_setting(key):
    db = get_db()
    cursor = db.execute('SELECT value FROM settings WHERE key = ?', (key,))
    row = cursor.fetchone()
    if row:
        return jsonify({key: row['value']})
    return jsonify({key: None})

@app.route('/api/settings/<key>', methods=['POST'])
def set_setting(key):
    data = request.get_json()
    value = data.get('value')
    db = get_db()
    db.execute('REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
    db.commit()
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True)
