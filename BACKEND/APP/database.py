from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# VERSÃO EXCLUSIVA PARA POSTGRESQL (OPÇÃO 1)
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("AVISO: DATABASE_URL não definida. Usando banco SQLite efêmero em /tmp para rodar no Vercel.")
    db_url = "sqlite:////tmp/database.db"

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

SQLALCHEMY_DATABASE_URL = db_url
if db_url.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models, auth
    import random
    from datetime import datetime, timedelta
    import json
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create Superuser Pedro
        pedro = db.query(models.User).filter(models.User.email == "pedro@tspdevs.com").first()
        if not pedro:
            new_pedro = models.User(
                username="pedro",
                email="pedro@tspdevs.com",
                password_hash=auth.get_password_hash("1111"),
                role="superadmin",
                is_active=True
            )
            db.add(new_pedro)
        elif pedro.role != "superadmin":
            pedro.role = "superadmin"
            
        # Create SISTEMA_BOT
        bot = db.query(models.User).filter(models.User.username == "SISTEMA_BOT").first()
        if not bot:
            new_bot = models.User(
                username="SISTEMA_BOT",
                email="bot@tspddevs.com.br",
                password_hash=auth.get_password_hash("bot_secret_123"),
                role="bot",
                is_active=True
            )
            db.add(new_bot)
            
        db.commit()

        # Seed Custom Fields
        if db.query(models.CustomFieldDefinition).count() == 0:
            field_defs = [
                models.CustomFieldDefinition(key="Nota Fiscal", type="numeric", is_mandatory=True, is_default=True),
                models.CustomFieldDefinition(key="Tipo de Embalagem", type="list", options="Caixa, Envelope, Pallet", is_mandatory=False, is_default=True),
                models.CustomFieldDefinition(key="Instruções de Manuseio", type="observation", is_mandatory=False, is_default=False)
            ]
            for fd in field_defs: db.add(fd)
            db.commit()

        # Seed 50 Orders
        if db.query(models.Order).count() == 0:
            status_list = ["Aguardando Separação", "Em Separação", "Conferência", "Pronto para Envio"]
            priorities = ["Baixa", "Normal", "Alta", "Urgente"]
            clients = ["Auto Peças Silva", "Logística Express", "Metalúrgica Norte", "Tech Solutions", "Distribuidora Sul", "Farma Viva", "Mercado Central", "Oficina do João", "Importados BR", "Loja do Pedro"]
            
            for i in range(1, 51):
                status = random.choice(status_list)
                created_at = datetime.utcnow() - timedelta(hours=random.randint(1, 120))
                
                cf_values = [{"id": 1, "value": f"{random.randint(1000, 99999)}", "attachments": []}]

                new_order = models.Order(
                    client_name=random.choice(clients),
                    client_phone=f"(11) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
                    client_email=f"contato{i}@cliente.com.br",
                    items_list=f"Item A x{random.randint(1,5)}, Item B x{random.randint(1,10)}, Item C x{random.randint(1,3)}",
                    order_value=round(random.uniform(50.0, 15000.0), 2),
                    priority=random.choice(priorities),
                    status=status,
                    created_at=created_at,
                    updated_at=created_at,
                    custom_field_values=json.dumps(cf_values)
                )
                db.add(new_order)
            db.commit()

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()
