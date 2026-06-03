import uvicorn
import os
import sys

if __name__ == "__main__":
    print("--- Iniciando Sistema de Expedição Kanban (Enterprise) ---")
    print("Acesse o sistema em: http://localhost:8000")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.join(current_dir, "BACKEND"))
    uvicorn.run("APP.main:app", host="0.0.0.0", port=8000, reload=True)
