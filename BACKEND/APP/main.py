from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional, Union
import asyncio
from datetime import datetime
import json
import os
import shutil
import uuid

from . import database, models, auth, websocket, tasks
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Kanban Dispatch System")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
try:
    if not os.path.exists(UPLOAD_DIR): os.makedirs(UPLOAD_DIR)
except OSError:
    UPLOAD_DIR = "/tmp/uploads"
    if not os.path.exists(UPLOAD_DIR): os.makedirs(UPLOAD_DIR)

@app.on_event("startup")
async def startup_event():
    database.init_db()
    asyncio.create_task(tasks.cleanup_old_archived_orders())

@app.post("/signup", response_model=models.UserOut)
def signup(user: models.UserCreate, db: Session = Depends(database.get_db)):
    if not user.email.endswith("@tspddevs.com.br"): raise HTTPException(status_code=400, detail="Operação não permitida.")
    db_user = db.query(models.User).filter(or_(models.User.username == user.username, models.User.email == user.email)).first()
    if db_user: raise HTTPException(status_code=400, detail="Erro ao processar solicitação.")
    new_user = models.User(username=user.username, email=user.email, password_hash=auth.get_password_hash(user.password), is_active=False)
    db.add(new_user); db.commit(); db.refresh(new_user); return new_user

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash): raise HTTPException(status_code=401, detail="Falha na autenticação.")
    if not user.is_active: raise HTTPException(status_code=403, detail="Acesso não autorizado.")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username, "user_id": user.id, "role": user.role}

# --- FILE UPLOAD ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user)):
    try:
        # Extrair e validar extensão
        allowed_extensions = [".jpg", ".jpeg", ".png", ".pdf"]
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Formato de arquivo não permitido.")

        # Gerar nome único e seguro para evitar Path Traversal e sobrescrita
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"filename": file.filename, "url": f"/uploads/{safe_filename}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")

# --- CUSTOM FIELD DEFINITIONS ---
@app.get("/admin/fields", response_model=List[models.CustomFieldDefinitionOut])
def get_field_definitions(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.CustomFieldDefinition).all()

@app.post("/admin/fields", response_model=models.CustomFieldDefinitionOut)
def create_field_definition(field: models.CustomFieldDefinitionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "superadmin"]: raise HTTPException(status_code=403)
    existing = db.query(models.CustomFieldDefinition).filter(models.CustomFieldDefinition.key == field.key).first()
    if existing: raise HTTPException(status_code=400, detail="Campo já existe no dicionário global.")
    new_field = models.CustomFieldDefinition(**field.dict())
    db.add(new_field); db.commit(); db.refresh(new_field); return new_field

@app.patch("/admin/fields/{field_id}", response_model=models.CustomFieldDefinitionOut)
def update_field_definition(field_id: int, field_update: models.CustomFieldDefinitionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "superadmin"]: raise HTTPException(status_code=403)
    db_field = db.query(models.CustomFieldDefinition).filter(models.CustomFieldDefinition.id == field_id).first()
    if not db_field: raise HTTPException(status_code=404)
    for key, value in field_update.dict(exclude_unset=True).items(): setattr(db_field, key, value)
    db.commit(); db.refresh(db_field); return db_field

# --- ANALYTICS ---
@app.get("/admin/analytics")
def get_analytics(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "superadmin"]: raise HTTPException(status_code=403)
    stats = db.query(models.Order.status, func.count(models.Order.id), func.sum(models.Order.order_value)).filter(models.Order.is_archived == False).group_by(models.Order.status).all()
    bottleneck_query = db.query(models.Order.status, func.avg(func.julianday('now') - func.julianday(models.Order.updated_at))).filter(models.Order.is_archived == False).group_by(models.Order.status).all()
    bottleneck_data = {s[0]: (s[1] or 0) * 1440 for s in bottleneck_query}
    bottleneck_status = max(bottleneck_data, key=bottleneck_data.get) if bottleneck_data else None
    aging_data = {}
    for island in ["Aguardando Separação", "Em Separação", "Conferência", "Pronto para Envio"]:
        oldest = db.query(models.Order.id, models.Order.client_name, models.Order.updated_at).filter(models.Order.status == island, models.Order.is_archived == False).order_by(models.Order.updated_at.asc()).limit(5).all()
        aging_data[island] = [{"id": o[0], "client": o[1], "since": str(o[2])} for o in oldest]
    data = [{"status": s[0], "count": s[1], "value": s[2] or 0.0, "avg_time_min": bottleneck_data.get(s[0], 0)} for s in stats]
    return {"islands": data, "total_active_value": sum(item['value'] for item in data), "total_orders": sum(item['count'] for item in data), "bottleneck": bottleneck_status, "aging": aging_data}

# --- ORDERS ---
@app.get("/orders", response_model=List[models.OrderOut])
def get_orders(include_archived: bool = False, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Order)
    if not include_archived: query = query.filter(models.Order.is_archived == False)
    orders = query.all()
    for o in orders:
        for log in o.audit_trail: log.username = log.user.username if log.user else "SISTEMA"
        for comm in o.comments: comm.username = comm.user.username if comm.user else "Desconhecido"
    return orders

@app.post("/orders", response_model=models.OrderOut)
async def create_order(order: models.OrderCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        new_order = models.Order(**order.dict())
        db.add(new_order); db.commit(); db.refresh(new_order)
        db.add(models.OrderAuditLog(order_id=new_order.id, user_id=current_user.id, action="Pedido Criado")); db.commit(); db.refresh(new_order)
        await websocket.manager.broadcast({"type": "order_update", "action": "created"})
        for log in new_order.audit_trail: log.username = current_user.username
        return new_order
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=str(e))

@app.patch("/orders/{order_id}", response_model=models.OrderOut)
async def update_order(order_id: int, order_update: models.OrderUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order: raise HTTPException(status_code=404)
    
    update_data = order_update.dict(exclude_unset=True)
    
    # Validação de campos obrigatórios (Dictionary Global)
    if "custom_field_values" in update_data:
        current_values = json.loads(update_data["custom_field_values"])
        mandatory_fields = db.query(models.CustomFieldDefinition).filter(models.CustomFieldDefinition.is_mandatory == True).all()
        for mf in mandatory_fields:
            val_obj = next((v for v in current_values if v.get("id") == mf.id), None)
            if not val_obj or not str(val_obj.get("value", "")).strip():
                raise HTTPException(status_code=400, detail=f"O campo '{mf.key}' é obrigatório.")

    field_names = {"client_name": "Cliente", "client_phone": "Telefone", "client_email": "Email", "items_list": "Itens", "order_value": "Valor", "priority": "Prioridade", "internal_notes": "Notas", "status": "Status", "custom_field_values": "Campos CRM"}
    for key, value in update_data.items():
        old_val = getattr(db_order, key)
        if old_val != value:
            if key in field_names:
                db.add(models.OrderAuditLog(order_id=db_order.id, user_id=current_user.id, action=f"Alterou {field_names[key]}"))
                if key == "status":
                    bot = db.query(models.User).filter(models.User.username == "SISTEMA_BOT").first()
                    if bot:
                        bot_msg = f"📦 Pedido #{db_order.id} movido para {value} por {current_user.username}."
                        db.add(models.ChatMessage(user_id=bot.id, message=bot_msg)); db.commit()
                        await websocket.manager.broadcast({"type": "chat", "user_id": bot.id, "username": bot.username, "message": bot_msg, "timestamp": str(datetime.utcnow()), "recipient_id": None})

    if "is_archived" in update_data and update_data["is_archived"] and not db_order.is_archived:
        db_order.archived_at = datetime.utcnow()
        db.add(models.OrderHistoryLog(order_id=db_order.id, client_name=db_order.client_name, final_status=db_order.status, created_at=db_order.created_at))
        db.add(models.OrderAuditLog(order_id=db_order.id, user_id=current_user.id, action="Pedido Arquivado"))

    for key, value in update_data.items(): setattr(db_order, key, value)
    db_order.updated_at = datetime.utcnow(); db.commit(); db.refresh(db_order)
    await websocket.manager.broadcast({"type": "order_update", "action": "updated"})
    return db_order

@app.post("/orders/{order_id}/comments", response_model=models.OrderCommentOut)
def add_comment(order_id: int, comm: models.OrderCommentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_comm = models.OrderComment(order_id=order_id, user_id=current_user.id, comment=comm.comment)
    db.add(new_comm); db.commit(); db.refresh(new_comm); new_comm.username = current_user.username; return new_comm

@app.get("/admin/users", response_model=List[models.UserOut])
def get_pending_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "superadmin"]: raise HTTPException(status_code=403)
    return db.query(models.User).all()

@app.patch("/admin/users/{user_id}", response_model=models.UserOut)
def update_user_status(user_id: int, update: models.UserUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "superadmin"]: raise HTTPException(status_code=403)
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user: raise HTTPException(status_code=404)
    if update.is_active is not None: target_user.is_active = update.is_active
    if update.role is not None: 
        if current_user.role != "superadmin": raise HTTPException(status_code=403, detail="Apenas superadmin pode alterar permissões.")
        target_user.role = update.role
    db.commit(); db.refresh(target_user); return target_user

@app.get("/users", response_model=List[models.UserOut])
def list_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.User).filter(models.User.is_active == True).all()

@app.get("/chat", response_model=List[models.ChatMessageOut])
def get_chat_history(recipient_id: Optional[int] = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if recipient_id:
        messages = db.query(models.ChatMessage).filter(or_((models.ChatMessage.user_id == current_user.id) & (models.ChatMessage.recipient_id == recipient_id), (models.ChatMessage.user_id == recipient_id) & (models.ChatMessage.recipient_id == current_user.id))).order_by(models.ChatMessage.timestamp.asc()).all()
    else:
        messages = db.query(models.ChatMessage).filter(models.ChatMessage.recipient_id == None).order_by(models.ChatMessage.timestamp.asc()).all()
    return [{"id": m.id, "user_id": m.user_id, "username": m.user.username, "message": m.message, "timestamp": m.timestamp, "recipient_id": m.recipient_id, "recipient_username": m.recipient.username if m.recipient else None} for m in messages]

@app.websocket("/ws")
async def websocket_endpoint(websocket_obj: WebSocket):
    await websocket.manager.connect(websocket_obj)
    try:
        while True:
            data = await websocket_obj.receive_text(); msg_data = json.loads(data)
            if msg_data.get("type") == "chat":
                db = next(database.get_db())
                try:
                    user = db.query(models.User).filter(models.User.username == msg_data.get("username")).first()
                    if user and user.is_active:
                        rec_raw = msg_data.get("recipient_id")
                        rec_id = int(rec_raw) if rec_raw else None
                        new_msg = models.ChatMessage(user_id=user.id, message=msg_data.get("message"), recipient_id=rec_id)
                        db.add(new_msg); db.commit(); db.refresh(new_msg)
                        await websocket.manager.broadcast({"type": "chat", "user_id": user.id, "username": user.username, "message": new_msg.message, "timestamp": str(new_msg.timestamp), "recipient_id": rec_id})
                finally: db.close()
    except Exception: websocket.manager.disconnect(websocket_obj)

@app.get("/webhook/gptmaker/tickets/{token}")
def webhook_get_tickets(token: str, db: Session = Depends(database.get_db)):
    if token != "gptmaker_secret_123":
        raise HTTPException(status_code=403, detail="Acesso Negado: Token de webhook inválido.")
    
    orders = db.query(models.Order).filter(models.Order.is_archived == False).all()
    simplified = []
    for o in orders:
        simplified.append({
            "id": o.id,
            "cliente": o.client_name,
            "status": o.status,
            "prioridade": o.priority,
            "valor": o.order_value,
            "itens": o.items_list
        })
    return {
        "status": "success",
        "total_ativos": len(simplified),
        "tickets": simplified
    }

frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "FRONTEND")
@app.get("/")
async def read_index():
    from fastapi.responses import FileResponse
    return FileResponse(os.path.join(frontend_path, "index.html"))
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
