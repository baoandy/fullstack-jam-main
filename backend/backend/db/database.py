# app/database.py
import os
import uuid
from datetime import datetime
from typing import Union

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

DATABASE_URL = os.getenv('DATABASE_URL')  # Ensure this uses the async dialect

engine = create_engine(
    DATABASE_URL,
    echo=False,
)

async_engine = create_async_engine(
    DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


# SQLAlchemy models
Base = declarative_base()

class Settings(Base):
    __tablename__ = "harmonic_settings"

    setting_name = Column(String, primary_key=True)

class Company(Base):
    __tablename__ = "companies"

    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)

class CompanyCollection(Base):
    __tablename__ = "company_collections"

    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id: Column[uuid.UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_name = Column(String, index=True)

class CompanyCollectionAssociation(Base):
    __tablename__ = "company_collection_associations"

    __table_args__ = (
        UniqueConstraint('company_id', 'collection_id', name='uq_company_collection'),
    )
    
    created_at: Union[datetime, Column[datetime]] = Column(
        DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False
    )
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    collection_id = Column(UUID(as_uuid=True), ForeignKey("company_collections.id"))

