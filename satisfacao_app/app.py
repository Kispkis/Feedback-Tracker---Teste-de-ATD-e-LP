from flask import Flask, render_template, request, redirect, session, send_file
import sqlite3
import psycopg2
from psycopg2.extras import DictCursor
from datetime import datetime, date
import csv
import io
import os
import math
import logging

# Configuração de registos (logging) para monitorizar o comportamento da aplicação
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicialização da aplicação Flask, definindo as pastas de modelos e ficheiros estáticos
app = Flask(__name__, template_folder='src/templates', static_folder='src/static')
# Chave secreta necessária para a gestão de sessões (cookies) do administrador
app.secret_key = "secret_key_2026"

# Definição dos caminhos para as bases de dados e ficheiros de backup
DB_SQLITE = "database.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
CSV_FILE = "data/feedback.csv"
TXT_FILE = "data/feedback.txt"
PER_PAGE = 20 # Número de registos por página no dashboard

# ---------- UTILITÁRIOS ----------

def get_db():
    """Estabelece ligação à base de dados PostgreSQL (se disponível) ou SQLite."""
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return sqlite3.connect(DB_SQLITE)

def init_storage():
    """Inicializa as tabelas da base de dados e os ficheiros de armazenamento se não existirem."""
    conn = get_db()
    c = conn.cursor()
    # Criação da tabela de feedback conforme o tipo de base de dados
    if DATABASE_URL:
        c.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                satisfacao TEXT,
                data TEXT,
                hora TEXT,
                dia_semana INTEGER
            )
        """)
    else:
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

    # Garante a existência da pasta de dados
    os.makedirs("data", exist_ok=True)

    # Criação do cabeçalho do ficheiro CSV se for a primeira vez
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=";")
            writer.writerow(["ID","Satisfacao","Data","Hora","DiaSemana"])
    # Criação do ficheiro TXT se não existir
    if not os.path.exists(TXT_FILE):
        with open(TXT_FILE,"w",encoding="utf-8") as f:
            f.write("")

# Executa a inicialização no arranque do servidor
init_storage()

def append_to_files(id_, satisfacao, data_, hora, dia_semana):
    """Guarda uma cópia de segurança do feedback nos ficheiros CSV e TXT."""
    # Adiciona linha ao CSV
    with open(CSV_FILE,"a",newline="",encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow([id_,satisfacao,data_,hora,dia_semana])
    # Adiciona linha ao ficheiro de texto legível
    with open(TXT_FILE,"a",encoding="utf-8") as f:
        f.write(f"ID:{id_} | {satisfacao} | {data_} {hora} | Dia:{dia_semana}\n")

# ---------- ROTAS PÚBLICAS ----------

@app.route("/")
def public():
    """Apresenta a interface principal do quiosque para os clientes."""
    return render_template("public.html")

@app.route("/submit", methods=["POST"])
def submit():
    """Processa o envio de feedback e guarda em todos os formatos de armazenamento."""
    satisfacao = request.form["satisfacao"]
    now = datetime.now()
    data_ = now.strftime("%Y-%m-%d")
    hora = now.strftime("%H:%M:%S")
    dia_semana = now.weekday()

    conn = get_db()
    c = conn.cursor()
    # Inserção na base de dados ativa
    if DATABASE_URL:
        c.execute("INSERT INTO feedback (satisfacao,data,hora,dia_semana) VALUES (%s,%s,%s,%s) RETURNING id",
                  (satisfacao,data_,hora,dia_semana))
        id_ = c.fetchone()[0]
    else:
        c.execute("INSERT INTO feedback (satisfacao,data,hora,dia_semana) VALUES (?,?,?,?)",
                  (satisfacao,data_,hora,dia_semana))
        id_ = c.lastrowid
    conn.commit()
    conn.close()

    # Atualiza as cópias de segurança em ficheiro
    append_to_files(id_,satisfacao,data_,hora,dia_semana)

    return "OK"

# ---------- ROTAS ADMINISTRATIVAS ----------

@app.route("/admin_2026", methods=["GET","POST"])
def admin_login():
    """Gere o acesso autenticado à área administrativa."""
    if request.method=="POST" and request.form.get("password")=="1234":
        session["admin"]=True
        return redirect("/admin_2026/dashboard")
    return render_template("admin_login.html")

@app.route("/admin_2026/dashboard")
def dashboard():
    """Exibe o painel de controlo com estatísticas, gráficos e histórico."""
    if not session.get("admin"):
        return redirect("/admin_2026")

    # Parâmetros de página e filtros de data
    page = int(request.args.get("page",1))
    date1 = request.args.get("date1")
    date2 = request.args.get("date2")
    today = date.today().isoformat()

    conn = get_db()
    c = conn.cursor()

    def get_stats(filter_date=None):
        """Calcula a contagem de cada nível de satisfação para uma data específica ou total."""
        if DATABASE_URL:
            if filter_date:
                c.execute("SELECT satisfacao, COUNT(*) FROM feedback WHERE data=%s GROUP BY satisfacao",(filter_date,))
            else:
                c.execute("SELECT satisfacao, COUNT(*) FROM feedback GROUP BY satisfacao")
        else:
            if filter_date:
                c.execute("SELECT satisfacao, COUNT(*) FROM feedback WHERE data=? GROUP BY satisfacao",(filter_date,))
            else:
                c.execute("SELECT satisfacao, COUNT(*) FROM feedback GROUP BY satisfacao")
        return dict(c.fetchall())

    # Obtenção de dados para os gráficos e cartões
    stats_today = get_stats(today)
    stats_1 = get_stats(date1) if date1 else None
    stats_2 = get_stats(date2) if date2 else None

    # Lógica de paginação para o histórico
    offset = (page-1)*PER_PAGE
    c.execute("SELECT COUNT(*) FROM feedback")
    total_rows = c.fetchone()[0]
    total_pages = math.ceil(total_rows/PER_PAGE)

    # Consulta dos registos paginados
    if DATABASE_URL:
        c.execute("SELECT * FROM feedback ORDER BY data DESC,hora DESC LIMIT %s OFFSET %s",(PER_PAGE,offset))
    else:
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

# ---------- EXPORTAÇÃO E LOGOUT ----------

@app.route("/export/csv")
def export_csv():
    """Permite o descarregamento dos dados em formato CSV."""
    return send_file(CSV_FILE,mimetype="text/csv",download_name="feedback.csv",as_attachment=True)

@app.route("/export/txt")
def export_txt():
    """Permite o descarregamento dos registos em formato de texto simples."""
    return send_file(TXT_FILE,mimetype="text/plain",download_name="feedback.txt",as_attachment=True)

@app.route("/logout")
def logout():
    """Encerra a sessão administrativa atual."""
    session.clear()
    return redirect("/")

@app.after_request
def add_header(response):
    """Força o navegador a não guardar em cache para garantir dados sempre atualizados."""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Arranque do servidor local se o ficheiro for executado diretamente
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
