from flask import Flask, render_template, request, redirect, session, url_for

app = Flask(__name__)
app.secret_key = "secret123"

users = {
    "admin": "1234"
}

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            return redirect(url_for("login", error="Please fill all fields"))

        elif username in users and users[username] == password:
            session["user"] = username
            return redirect(url_for("home"))

        else:
            return redirect(url_for("login", error="Invalid username or password"))

    # GET request
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


@app.route("/landing")
def landing():
    return render_template("index.html")


@app.route("/brew")
def brew():
    return render_template("brew.html")

@app.route("/shop/blacklist")
def shop_blacklist():
    return render_template("shop-blacklist.html")

@app.route("/shop/laveen")
def shop_laveen():
    return render_template("shop-laveen.html")

@app.route("/shop/venn")
def shop_venn():
    return render_template("shop-venn.html")

@app.route("/social")
def social():
    return render_template("social.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")


# HOME PAGE (Protected)
@app.route("/home")
def home():
    if "user" in session:
        return render_template("home.html", username=session["user"])
    else:
        return redirect(url_for("login"))


# LOGOUT
@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


# OPTIONAL: redirect root to login (temporary)
@app.route("/")
def index():
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)
