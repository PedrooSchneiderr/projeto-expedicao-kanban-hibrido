#!/bin/bash

echo "========================================="
echo "🚀 Iniciando Projeto Expedição Kanban..."
echo "========================================="

# 1. Verifica se a pasta venv existe, se não existir, ele cria.
if [ ! -d "venv" ]; then
    echo "📦 Criando ambiente virtual pela primeira vez..."
    python3 -m venv venv
fi

# 2. Ativa o ambiente virtual
echo "🔄 Ativando ambiente virtual..."
source venv/bin/activate

# 3. Instala as dependências de forma silenciosa (para ser rápido)
echo "📥 Verificando dependências..."
pip install -r BACKEND/requirements.txt -q

# 4. Inicia o servidor Python
echo "🟢 Subindo o servidor!"
python3 run.py
