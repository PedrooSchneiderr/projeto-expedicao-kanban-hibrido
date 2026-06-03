import os
import sys
from datetime import datetime, timedelta
import random

BASE_DIR_PATH = "/mnt/c/Arquivos/ARQUIVOS-FACUL/SOFT/PROJETO-EXPEDICAO-KANBAN"
sys.path.append(os.path.join(BASE_DIR_PATH, "BACKEND"))

from APP.database import SessionLocal, engine, Base
from APP import models, auth

def seed():
    print("--- Iniciando Carga de Dados (Versão Bitrix-Style CRM) ---")
    db = SessionLocal()
    
    # Reset Total
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Usuários
    users_data = [
        {"u": "pedro", "e": "pedro@tspddevs.com.br", "p": "0406", "r": "superadmin"},
        {"u": "SISTEMA_BOT", "e": "bot@tspddevs.com.br", "p": "bot123", "r": "bot"},
        {"u": "marcos", "e": "marcos@tspddevs.com.br", "p": "123", "r": "operator"}
    ]
    
    users = {}
    for u in users_data:
        new_u = models.User(
            username=u["u"],
            email=u["e"],
            password_hash=auth.get_password_hash(u["p"]),
            role=u["r"],
            is_active=True
        )
        db.add(new_u)
        users[u["u"]] = new_u
    db.commit()

    # 2. Definições Globais de Campos (Dictionary)
    field_defs = [
        models.CustomFieldDefinition(key="Nota Fiscal", type="numeric", is_mandatory=True, is_default=True),
        models.CustomFieldDefinition(key="Tipo de Embalagem", type="list", options="Caixa, Envelope, Pallet", is_mandatory=False, is_default=True),
        models.CustomFieldDefinition(key="Instruções de Manuseio", type="observation", is_mandatory=False, is_default=False)
    ]
    for fd in field_defs: db.add(fd)
    db.commit()

    # 3. Pedidos (20 cards)
    status_list = ["Aguardando Separação", "Em Separação", "Conferência", "Pronto para Envio"]
    priorities = ["Baixa", "Normal", "Alta", "Urgente"]
    clients = ["Auto Peças Silva", "Logística Express", "Metalúrgica Norte", "Tech Solutions", "Distribuidora Sul", "Farma Viva", "Mercado Central", "Oficina do João"]
    
    for i in range(1, 21):
        status = random.choice(status_list)
        created_at = datetime.utcnow() - timedelta(hours=random.randint(1, 48))
        
        # Simular valores para campos mandatórios
        cf_values = [{"id": 1, "value": f"{random.randint(1000, 9999)}", "attachments": []}]

        new_order = models.Order(
            client_name=random.choice(clients),
            client_phone=f"(11) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            client_email=f"contato{i}@cliente.com.br",
            items_list=f"Item A x{i}, Item B x{random.randint(1,5)}",
            order_value=round(random.uniform(100.0, 5000.0), 2),
            priority=random.choice(priorities),
            status=status,
            created_at=created_at,
            updated_at=created_at,
            custom_field_values=json.dumps(cf_values)
        )
        db.add(new_order)
    
    db.commit()
    print("--- Carga Concluída! Tickets e Dicionário CRM criados. ---")
    db.close()

if __name__ == "__main__":
    import json
    seed()
