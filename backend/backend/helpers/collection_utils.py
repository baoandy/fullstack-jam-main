from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.db import database

def get_collection_by_id(db: Session, collection_id: str):
    collection_uuid = convert_to_uuid(collection_id)
    collection = db.query(database.CompanyCollection).filter(database.CompanyCollection.id == collection_uuid).first()
    if not collection:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_id}' not found")
    return collection

def get_companies_by_ids(db: Session, company_ids: List[int]):
    companies = db.query(database.Company).filter(database.Company.id.in_(company_ids)).all()
    if len(companies) != len(company_ids):
        raise HTTPException(status_code=400, detail="One or more companies not found")
    return companies

def get_existing_associations(db: Session, company_ids: List[int], collection_id: str) -> List[database.CompanyCollectionAssociation]:
    return db.query(database.CompanyCollectionAssociation).filter(
        database.CompanyCollectionAssociation.company_id.in_(company_ids),
        database.CompanyCollectionAssociation.collection_id == collection_id
    ).all()

def convert_to_uuid(collection_id: str):
    try:
        return UUID(collection_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid collection ID format")