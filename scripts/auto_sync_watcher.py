import os
import shutil
import time
import json
from datetime import datetime

# Source Directory (OneDrive folder)
SOURCE_DIR = r"C:\Users\COSTOS\OneDrive - uptc.edu.co\Documentos\VAFI\2026\VAFI Control\Bases de ingresos y gastos"

# Target Directory inside VAFI Web App
TARGET_DIR = r"c:\Users\COSTOS\OneDrive - uptc.edu.co\Documentos\VAFI\2026\VAFI Control\VAFI\public\data"

FILES_TO_WATCH = ["Gastos.csv", "Ingresos.csv", "Nomina.csv"]

def get_file_mtimes(folder):
    mtimes = {}
    for fname in FILES_TO_WATCH:
        fpath = os.path.join(folder, fname)
        if os.path.exists(fpath):
            mtimes[fname] = os.path.getmtime(fpath)
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
