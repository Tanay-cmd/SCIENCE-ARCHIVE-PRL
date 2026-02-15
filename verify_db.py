import psycopg2
import os

try:
    # Default credentials from minio_fits_backend.py
    conn = psycopg2.connect(
        host="localhost",
        database="observatory",
        user="observatory_user",
        password="observatory_pass",
        port="5432"
    )
    cur = conn.cursor()
    
    # Query the specific file
    fileid = 1202601200325579460
    print(f"Querying for fileid: {fileid}")
    cur.execute("SELECT fileid, trg_alph, trg_delt, trg_name, obs_airm, obs_mjd, ccd_expt FROM fits_headers WHERE fileid = %s", (fileid,))
    row = cur.fetchone()
    
    if row:
        print(f"Found row: {row}")
        print(f"trg_alph: {row[1]}")
        print(f"trg_delt: {row[2]}")
        print(f"trg_name: {row[3]}")
    else:
        print("Row not found")

except Exception as e:
    print(f"Error: {e}")
