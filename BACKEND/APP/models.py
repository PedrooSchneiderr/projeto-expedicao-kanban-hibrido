from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from pydantic import BaseModel
from typing import List, Optional

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="operator")
    is_active = Column(Boolean, default=False)
    sent_messages = relationship("ChatMessage", back_populates="user", foreign_keys="ChatMessage.user_id")
    received_messages = relationship("ChatMessage", back_populates="recipient", foreign_keys="ChatMessage.recipient_id")
    audit_logs = relationship("OrderAuditLog", back_populates="user")
    comments = relationship("OrderComment", back_populates="user")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String)
    client_phone = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
    items_list = Column(Text)
    order_value = Column(Float, default=0.0)
    priority = Column(String, default="Normal")
    internal_notes = Column(Text, nullable=True)
    # Valor armazenado como JSON string: [{"id": 1, "value": "...", "attachments": []}, ...]
    custom_field_values = Column(Text, nullable=True, default="[]") 
    status = Column(String, default="Aguardando Separação")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime, nullable=True)
    audit_trail = relationship("OrderAuditLog", back_populates="order", cascade="all, delete-orphan")
    attachments = relationship("OrderAttachment", back_populates="order", cascade="all, delete-orphan")
    comments = relationship("OrderComment", back_populates="order", cascade="all, delete-orphan")

class CustomFieldDefinition(Base):
    __tablename__ = "custom_field_definitions"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    type = Column(String) # numeric, observation, list
    options = Column(Text, nullable=True) # Para tipo 'list', separados por vírgula
    is_mandatory = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False) # Se aparece em todos os novos cards por padrão

class OrderAuditLog(Base):
    __tablename__ = "order_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    order = relationship("Order", back_populates="audit_trail")
    user = relationship("User", back_populates="audit_logs")

class OrderComment(Base):
    __tablename__ = "order_comments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    order = relationship("Order", back_populates="comments")
    user = relationship("User", back_populates="comments")

class OrderAttachment(Base):
    __tablename__ = "order_attachments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    filename = Column(String)
    file_path = Column(String)
    upload_at = Column(DateTime, default=datetime.utcnow)
    order = relationship("Order", back_populates="attachments")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="sent_messages", foreign_keys=[user_id])
    recipient = relationship("User", back_populates="received_messages", foreign_keys=[recipient_id])

class OrderHistoryLog(Base):
    __tablename__ = "order_history_log"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer)
    client_name = Column(String)
    final_status = Column(String)
    created_at = Column(DateTime)
    archived_at = Column(DateTime, default=datetime.utcnow)

# SCHEMAS
class UserOut(BaseModel):
    id: int; username: str; email: str; role: str; is_active: bool
    class Config: from_attributes = True

class UserCreate(BaseModel):
    username: str; email: str; password: str

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None; role: Optional[str] = None

class CustomFieldDefinitionOut(BaseModel):
    id: int; key: str; type: str; options: Optional[str] = None; is_mandatory: bool; is_default: bool
    class Config: from_attributes = True

class CustomFieldDefinitionCreate(BaseModel):
    key: str; type: str; options: Optional[str] = None; is_mandatory: bool = False; is_default: bool = False

class OrderAuditLogOut(BaseModel):
    id: int; action: str; username: str; timestamp: datetime
    class Config: from_attributes = True

class OrderCommentOut(BaseModel):
    id: int; comment: str; username: str; timestamp: datetime
    class Config: from_attributes = True

class OrderCommentCreate(BaseModel):
    comment: str

class OrderAttachmentOut(BaseModel):
    id: int; filename: str; file_path: str; upload_at: datetime
    class Config: from_attributes = True

class OrderCreate(BaseModel):
    client_name: str; client_phone: Optional[str] = None; client_email: Optional[str] = None; items_list: str; order_value: float; priority: str; internal_notes: Optional[str] = None; custom_field_values: Optional[str] = "[]"

class OrderUpdate(BaseModel):
    client_name: Optional[str] = None; client_phone: Optional[str] = None; client_email: Optional[str] = None; items_list: Optional[str] = None; order_value: Optional[float] = None
    priority: Optional[str] = None; internal_notes: Optional[str] = None; custom_field_values: Optional[str] = None; status: Optional[str] = None; is_archived: Optional[bool] = None

class OrderOut(BaseModel):
    id: int; client_name: str; client_phone: Optional[str] = None; client_email: Optional[str] = None; items_list: str; order_value: float; priority: str; custom_field_values: Optional[str] = "[]"; status: str; created_at: datetime; updated_at: datetime; is_archived: bool; archived_at: Optional[datetime] = None
    audit_trail: List[OrderAuditLogOut] = []; attachments: List[OrderAttachmentOut] = []; comments: List[OrderCommentOut] = []
    class Config: from_attributes = True

class ChatMessageOut(BaseModel):
    id: int; user_id: int; username: str; message: str; timestamp: datetime; recipient_id: Optional[int] = None; recipient_username: Optional[str] = None
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str; token_type: str; username: str; user_id: int; role: str
