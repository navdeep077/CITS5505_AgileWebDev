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
    return render_template("login.html", error=error)


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