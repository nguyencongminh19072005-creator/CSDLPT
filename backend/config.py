import os
from dotenv import load_dotenv
load_dotenv()
class Config:
    DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
    TRUST_CERT = os.getenv("DB_TRUST_CERT", "yes")
    LINKED_SERVER = os.getenv("LINKED_SERVER_NAME", "LINK_TRUNGTAM")
    HD_SERVER = os.getenv("DB_HD_SERVER")
    HD_NAME = os.getenv("DB_HD_NAME")
    HD_USER = os.getenv("DB_HD_USER")
    HD_PASSWORD = os.getenv("DB_HD_PASSWORD")
    CG_SERVER = os.getenv("DB_CG_SERVER")
    CG_NAME = os.getenv("DB_CG_NAME")
    CG_USER = os.getenv("DB_CG_USER")
    CG_PASSWORD = os.getenv("DB_CG_PASSWORD")
    NT_SERVER = os.getenv("DB_NT_SERVER")
    NT_NAME = os.getenv("DB_NT_NAME")
    NT_USER = os.getenv("DB_NT_USER")
    NT_PASSWORD = os.getenv("DB_NT_PASSWORD")
    @staticmethod
    def connection_string(server, database, user, password):
        return (
            f"DRIVER={{{Config.DRIVER}}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={user};"
            f"PWD={password};"
            f"TrustServerCertificate={Config.TRUST_CERT};"
            f"Connection Timeout=30;"
        )
    @property
    def hd_connection_string(self):
        return self.connection_string(self.HD_SERVER, self.HD_NAME, self.HD_USER, self.HD_PASSWORD)
    @property
    def cg_connection_string(self):
        return self.connection_string(self.CG_SERVER, self.CG_NAME, self.CG_USER, self.CG_PASSWORD)
    @property
    def nt_connection_string(self):
        return self.connection_string(self.NT_SERVER, self.NT_NAME, self.NT_USER, self.NT_PASSWORD)
