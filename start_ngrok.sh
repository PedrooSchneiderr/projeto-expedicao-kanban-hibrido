#!/bin/bash

echo "========================================="
echo "🌐 Iniciando o Túnel Ngrok (Porta 8000)"
echo "========================================="
echo ""
echo "Aviso: Lembre-se de deixar o sistema rodando (start.sh) em OUTRA aba do terminal!"
echo ""

# Comando para subir o ngrok apontando para o FastAPI
ngrok http 8000
