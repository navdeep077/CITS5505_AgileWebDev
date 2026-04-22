from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'

# ── Main Pages ──────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/brew')
def brew():
    return render_template('brew.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/social')
def social():
    return render_template('social.html')

# ── Shop Pages ───────────────────────────────────────────
@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/shop/blacklist')
def shop_blacklist():
    return render_template('shop-blacklist.html')

@app.route('/shop/laveen')
def shop_laveen():
    return render_template('shop-laveen.html')

@app.route('/shop/venn')
def shop_venn():
    return render_template('shop-venn.html')

# ── Auth Pages ───────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
def login():
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)