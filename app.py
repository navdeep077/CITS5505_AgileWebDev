from flask import Flask, render_template, request, redirect, session, url_for

app = Flask(__name__)
app.secret_key = "secret123"

# Temporary users dictionary until database is set up
users = {
    "admin": "1234"
}

# ── Auth Routes ──────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            return redirect(url_for("login", error="Please fill all fields"))
        elif username in users and users[username] == password:
            session["user"] = username
            return redirect(url_for("landing"))
        else:
            return redirect(url_for("login", error="Invalid username or password"))

    error = request.args.get("error")
    message = request.args.get("message")
    return render_template("login.html", error=error, message=message)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        if not username or not password or not confirm_password:
            return redirect(url_for("signup", error="Please fill all fields"))
        if password != confirm_password:
            return redirect(url_for("signup", error="Passwords do not match"))
        if username in users:
            return redirect(url_for("signup", error="Username already exists"))

        users[username] = password
        return redirect(url_for("login", message="Account created. Please log in."))

    error = request.args.get("error")
    return render_template("signup.html", error=error)


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


# ── Main Routes ──────────────────────────────────────────
@app.route("/landing")
def landing():
    return render_template("index.html")

@app.route("/brew")
def brew():
    return render_template("brew.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/social")
def social():
    return render_template("social.html")


# ── Shop Routes ──────────────────────────────────────────
@app.route("/shop/blacklist")
def shop_blacklist():
    return render_template("shop-blacklist.html")

@app.route("/shop/laveen")
def shop_laveen():
    return render_template("shop-laveen.html")

@app.route("/shop/venn")
def shop_venn():
    return render_template("shop-venn.html")


if __name__ == "__main__":
    app.run(debug=True)
