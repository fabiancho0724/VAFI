import os
import shutil
import time
import json
from datetime import datetime

# Source Directory (macOS / OneDrive Windows folder)
MAC_SOURCE_DIR = "/Users/fabiancely/Documents/Documentos UPTC/Bases de Datos VAFI"
WIN_SOURCE_DIR = r"C:\Users\COSTOS\OneDrive - uptc.edu.co\Documentos\VAFI\2026\VAFI Control\Bases de ingresos y gastos"

SOURCE_DIR = MAC_SOURCE_DIR if os.path.exists(MAC_SOURCE_DIR) else WIN_SOURCE_DIR

# R20 Historical Directory
MAC_R20_DIR = "/Users/fabiancely/Documents/R 20"
WIN_R20_DIR = r"C:\Users\COSTOS\OneDrive - uptc.edu.co\Documentos\VAFI\R 20"
R20_DIR = MAC_R20_DIR if os.path.exists(MAC_R20_DIR) else WIN_R20_DIR

# Target Directory inside VAFI Web App
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_DIR = os.path.join(BASE_DIR, "public", "data")

FILES_TO_WATCH = ["Gastos.csv", "Ingresos.csv", "Nomina.csv", "POA.csv"]

def get_file_mtimes(folder):
    mtimes = {}
    for fname in FILES_TO_WATCH:
        fpath = os.path.join(folder, fname)
        if os.path.exists(fpath):
            mtimes[fname] = os.path.getmtime(fpath)
    if os.path.exists(R20_DIR):
        r20_path = os.path.join(R20_DIR, "Historico Ingresos.csv")
        if os.path.exists(r20_path):
            mtimes["Historico_Ingresos_10y.csv"] = os.path.getmtime(r20_path)
    return mtimes

def sync_files():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR, exist_ok=True)

    synced = []
    cutoff_date = "25 de Agosto de 2026"

    for fname in FILES_TO_WATCH:
        src_path = os.path.join(SOURCE_DIR, fname)
        dst_path = os.path.join(TARGET_DIR, fname)
        
        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)
            synced.append(fname)

            # Extract date if possible
            if fname == "Ingresos.csv" or fname == "Gastos.csv":
                try:
                    with open(src_path, 'r', encoding='latin-1') as f:
                        f.readline() # Header
                        l2 = f.readline()
                        if l2:
                            parts = l2.strip().split(';')
                            last_part = parts[-1].strip()
                            if '/' in last_part or '-' in last_part:
                                cutoff_date = last_part
                except Exception as e:
                    pass

    # Sync R20 Historical 10y CSV
    if os.path.exists(R20_DIR):
        r20_src = os.path.join(R20_DIR, "Historico Ingresos.csv")
        r20_dst = os.path.join(TARGET_DIR, "Historico_Ingresos_10y.csv")
        if os.path.exists(r20_src):
            try:
                with open(r20_src, 'rb') as f:
                    raw_b = f.read()
                try:
                    txt = raw_b.decode('mac_roman')
                except Exception:
                    try:
                        txt = raw_b.decode('latin-1')
                    except Exception:
                        txt = raw_b.decode('utf-8', errors='ignore')
                with open(r20_dst, 'w', encoding='utf-8') as f:
                    f.write(txt)
                synced.append("Historico_Ingresos_10y.csv")
            except Exception as e:
                print(f"Error al sincronizar Historico Ingresos.csv: {e}")

    status = {
        "lastSync": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cutoffDate": cutoff_date,
        "filesSynced": synced,
        "status": "active"
    }

    status_path = os.path.join(TARGET_DIR, "sync_status.json")
    with open(status_path, 'w', encoding='utf-8') as f:
        json.dump(status, f, indent=2)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Sincronizados {len(synced)} archivos desde 'Bases de ingresos y gastos' -> public/data/")
    return status

def watch_folder(poll_interval_sec=5):
    print("================================================================")
    print("   MONITOR AUTOMÁTICO DE BASES DE INGRESOS Y GASTOS - VAFI UPTC ")
    print("================================================================")
    print(f"Carpeta Origen: {SOURCE_DIR}")
    print(f"Carpeta Destino: {TARGET_DIR}")
    print(f"Frecuencia de escaneo: cada {poll_interval_sec} segundos.")
    print("Presione Ctrl+C para detener.")
    print("----------------------------------------------------------------")

    # Initial sync
    last_mtimes = get_file_mtimes(SOURCE_DIR)
    sync_files()

    try:
        while True:
            time.sleep(poll_interval_sec)
            current_mtimes = get_file_mtimes(SOURCE_DIR)

            changed = False
            for fname, mtime in current_mtimes.items():
                if fname not in last_mtimes or mtime > last_mtimes[fname]:
                    print(f"🔍 Detectada nueva versión de: {fname}")
                    changed = True

            if changed:
                sync_files()
                last_mtimes = current_mtimes

    except KeyboardInterrupt:
        print("\nMonitor detenido por el usuario.")

if __name__ == "__main__":
    watch_folder()
