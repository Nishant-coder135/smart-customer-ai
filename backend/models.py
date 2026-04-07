from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String, unique=True, index=True)
    password_hash = Column(String)
    business_type = Column(String) # 'urban' or 'rural'

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    customer_id = Column(String) # Unique per user (composite with user_id)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'customer_id', name='_user_customer_uc'),
    )
    
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Integer, default=1, index=True)
    last_purchase_date = Column(DateTime, nullable=True)
    total_spent = Column(Float, default=0.0)
    visit_frequency = Column(Integer, default=0)
    credit_balance = Column(Float, default=0.0)
    
    # ML Fields
    recency = Column(Float, nullable=True)
    frequency = Column(Float, nullable=True)
    monetary = Column(Float, nullable=True)
    cluster_label = Column(String, nullable=True)
    segment_name = Column(String, index=True, nullable=True)
    churn_probability = Column(Float, nullable=True)
    clv = Column(Float, nullable=True)
    purchase_trend = Column(String, nullable=True)
    explained_why = Column(String, nullable=True)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    customer_id = Column(String, index=True) # foreign relation mapped at logic layer for bulk csv insertions
    amount = Column(Float)
    date = Column(DateTime)
    notes = Column(String, nullable=True)
    
    # Keeping old columns for compatibility with ML ingestion
    invoice_date = Column(DateTime, nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    is_credit = Column(Integer, default=0)
    business_mode = Column(String, index=True, default="urban")

# ML Action System
class Action(Base):
    __tablename__ = "actions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    action_text = Column(String)
    target_segment = Column(String)
    reason = Column(String, nullable=True)
    expected_revenue = Column(Float)
    expected_retention = Column(Float)
    confidence_score = Column(Float)
    pitch = Column(Text, nullable=True) # AI-generated pitch
    template = Column(Text, nullable=True) # AI-generated message template
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActionExecution(Base):
    __tablename__ = "action_executions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    action_id = Column(Integer, ForeignKey("actions.id"), nullable=False)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)
    channel = Column(String) # sms/whatsapp/manual

class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    action_id = Column(Integer, ForeignKey("actions.id"), nullable=False)
    actual_revenue = Column(Float, default=0.0)
    actual_retention = Column(Float, default=0.0)
    response_rate = Column(Float, default=0.0)
    measured_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActionHistory(Base):
    __tablename__ = "action_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    customer_id = Column(String, index=True, nullable=False)
    action_type = Column(String)
    applied_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String)

class Segment(Base):
    __tablename__ = "segments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    segment_name = Column(String, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'segment_name', name='_user_segment_uc'),
    )
    
    total_customers = Column(Integer, default=0)
    avg_recency = Column(Float, default=0.0)
    avg_frequency = Column(Float, default=0.0)
    avg_monetary = Column(Float, default=0.0)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
