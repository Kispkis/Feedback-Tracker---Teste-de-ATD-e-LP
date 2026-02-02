import sqlite3

conn = sqlite3.connect("database.db")
c = conn.cursor()

# Ver todas as linhas
c.execute("SELECT * FROM feedback")
rows = c.fetchall()
for r in rows:
    print(r)

conn.close()
