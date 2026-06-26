from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# VERSÃO EXCLUSIVA PARA POSTGRESQL (OPÇÃO 1)
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("ERRO: DATABASE_URL não foi definida. Para a versão Postgres, é obrigatório configurar no painel da Vercel!")

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

SQLALCHEMY_DATABASE_URL = db_url
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
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create Superuser Pedro
        pedro = db.query(models.User).filter(models.User.email == "pedro@tspddevs.com.br").first()
        if not pedro:
            new_pedro = models.User(
                username="pedro",
                email="pedro@tspddevs.com.br",
                password_hash=auth.get_password_hash("0406"),
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
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()
