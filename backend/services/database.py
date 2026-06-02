import os
import socket
import pyodbc
from config import Config

cfg = Config()
env_site = os.getenv("SITE_CODE", "").strip().upper()
hostname = socket.gethostname().upper()

if env_site in ["HD", "CG", "NT"]:
    SITE_CODE = env_site                                                             
elif "0G48U7E" in hostname:         
    SITE_CODE = "CG"                                       
elif "ADMIN-PC" in hostname:        
    SITE_CODE = "NT"
else:
    SITE_CODE = "HD"

def get_connection():
    if SITE_CODE == "CG":
        conn_str = cfg.cg_connection_string
    elif SITE_CODE == "NT":
        conn_str = cfg.nt_connection_string
    else:
        conn_str = cfg.hd_connection_string
    
    return pyodbc.connect(conn_str, charset="utf8", autocommit=False)

def execute_query(query, params=None, fetch=True):
    conn = get_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        if fetch:
            rows = cursor.fetchall()
            cols = [c[0] for c in cursor.description] if cursor.description else []
            return [dict(zip(cols, r)) for r in rows]
        else:
            conn.commit()
            return cursor.rowcount
    except pyodbc.Error as ex:
        conn.rollback()
        raise ex
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def execute_procedure(proc_name, params=None):
    conn = get_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        placeholders = ",".join(["?" for _ in (params or [])])
        sql = f"EXEC {proc_name} {placeholders}" if params else f"EXEC {proc_name}"
        cursor.execute(sql, params or ())
        conn.commit()
        return {"success": True, "message": "Thành công"}
    except pyodbc.Error as ex:
        conn.rollback()
        msg = str(ex.args[1]) if len(ex.args) > 1 else str(ex)
        return {"success": False, "message": msg}
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

get_hd_connection = get_connection
