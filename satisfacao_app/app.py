from flask import Flask, render_template, request, redirect, session, send_file
import sqlite3
from datetime import datetime, date
import csv
import io
import os
import math

app = Flask(__name__)
app.secret_key = "secret_key_2026"

DB = "database.db"
CSV_FILE = "data/feedback.csv"
TXT_FILE = "data/feedback.txt"
PER_PAGE = 20

# ---------- UTILITÁRIOS ----------
def get_db():
    return sqlite3.connect(DB)

def init_storage():
    # SQLite
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            satisfacao TEXT,
            data TEXT,
            hora TEXT,
            dia_semana INTEGER
        )
    """)
    conn.commit()
    conn.close()

    # Pasta data
    os.makedirs("data", exist_ok=True)

    # CSV
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=";")
            writer.writerow(["ID","Satisfacao","Data","Hora","DiaSemana"])
    # TXT
    if not os.path.exists(TXT_FILE):
        with open(TXT_FILE,"w",encoding="utf-8") as f:
            f.write("")

init_storage()

def append_to_files(id_, satisfacao, data_, hora, dia_semana):
    # CSV
    with open(CSV_FILE,"a",newline="",encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow([id_,satisfacao,data_,hora,dia_semana])
    # TXT
    with open(TXT_FILE,"a",encoding="utf-8") as f:
        f.write(f"ID:{id_} | {satisfacao} | {data_} {hora} | Dia:{dia_semana}\n")

# ---------- PUBLIC ----------
@app.route("/")
def public():
    return render_template("public.html")

@app.route("/submit", methods=["POST"])
def submit():
    satisfacao = request.form["satisfacao"]
    now = datetime.now()
    data_ = now.strftime("%Y-%m-%d")
    hora = now.strftime("%H:%M:%S")
    dia_semana = now.weekday()

    # SQLite
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO feedback (satisfacao,data,hora,dia_semana) VALUES (?,?,?,?)",
              (satisfacao,data_,hora,dia_semana))
    conn.commit()
    id_ = c.lastrowid
    conn.close()

    # CSV + TXT
    append_to_files(id_,satisfacao,data_,hora,dia_semana)

    return "OK"

# ---------- ADMIN ----------
@app.route("/admin_2026", methods=["GET","POST"])
def admin_login():
    if request.method=="POST" and request.form.get("password")=="1234":
        session["admin"]=True
        return redirect("/admin_2026/dashboard")
    return render_template("admin_login.html")

@app.route("/admin_2026/dashboard")
def dashboard():
    if not session.get("admin"):
        return redirect("/admin_2026")

    page = int(request.args.get("page",1))
    date1 = request.args.get("date1")
    date2 = request.args.get("date2")
    today = date.today().isoformat()

    conn = get_db()
    c = conn.cursor()

    # Estatísticas por data
    def get_stats(filter_date=None):
        if filter_date:
            c.execute("SELECT satisfacao, COUNT(*) FROM feedback WHERE data=? GROUP BY satisfacao",(filter_date,))
        else:
            c.execute("SELECT satisfacao, COUNT(*) FROM feedback GROUP BY satisfacao")
        return dict(c.fetchall())

    stats_today = get_stats(today)
    stats_1 = get_stats(date1) if date1 else None
    stats_2 = get_stats(date2) if date2 else None

    # Histórico com paginação
    offset = (page-1)*PER_PAGE
    c.execute("SELECT COUNT(*) FROM feedback")
    total_rows = c.fetchone()[0]
    total_pages = math.ceil(total_rows/PER_PAGE)

    c.execute("SELECT * FROM feedback ORDER BY data DESC,hora DESC LIMIT ? OFFSET ?",(PER_PAGE,offset))
    rows = c.fetchall()
    conn.close()

    return render_template("admin_dashboard.html",
                           stats_today=stats_today,
                           stats_1=stats_1,
                           stats_2=stats_2,
                           rows=rows,
                           page=page,
                           total_pages=total_pages,
                           today=today,
                           date1=date1,
                           date2=date2)

# ---------- EXPORT ----------
@app.route("/export/csv")
def export_csv():
    return send_file(CSV_FILE,mimetype="text/csv",download_name="feedback.csv",as_attachment=True)

@app.route("/export/txt")
def export_txt():
    return send_file(TXT_FILE,mimetype="text/plain",download_name="feedback.txt",as_attachment=True)

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

if __name__=="__main__":
    app.run(debug=True)
