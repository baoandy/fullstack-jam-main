import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from aioredis import Redis

from backend.db import database
from backend.helpers.batch_db_actions import process_add_all_companies_to_collection
from backend.helpers.collection_utils import get_collection_by_id, get_companies_by_ids, get_existing_associations
from backend.redis.redis import get_redis

# Pydantic models
class AddCompaniesToCollectionRequest(BaseModel):
    company_ids: List[int]
    collection_id: str

class RemoveCompaniesFromCollectionRequest(BaseModel):
    company_ids: List[int]
    collection_id: str

class AddAllCompaniesToCollectionRequest(BaseModel):
    source_collection_id: str
    target_collection_id: str

class AddAllCompaniesToCollectionResponse(BaseModel):
    message: str
    task_id: str

class TaskInProgressResponse(BaseModel):
    task_id: Optional[str] = None

class LikeCompanyRequest(BaseModel):
    company_id: int

class UnlikeCompanyRequest(BaseModel):
    company_id: int

class LikedCompaniesResponse(BaseModel):
    message: str
    success: bool

class UnlikedCompaniesResponse(BaseModel):
    message: str
    success: bool

# Router setup
router = APIRouter(prefix="/user_actions", tags=["user_actions"])


@router.post("/add-companies-to-collection")
def add_companies_to_collection(
    request: AddCompaniesToCollectionRequest,
    db: Session = Depends(database.get_db)
):
    collection = get_collection_by_id(db, request.collection_id)
    get_companies_by_ids(db, request.company_ids)  
    existing_associations = get_existing_associations(db, request.company_ids, collection.id)

    existing_company_ids = {assoc.company_id for assoc in existing_associations}
    new_associations = [
        database.CompanyCollectionAssociation(company_id=company_id, collection_id=collection.id)
        for company_id in request.company_ids if company_id not in existing_company_ids
    ]

    db.add_all(new_associations)
    db.commit()

    return {"message": f"{len(new_associations)} companies added to '{collection.collection_name}' collection successfully"}

@router.post("/remove-companies-from-collection")
def remove_companies_from_collection(
    request: RemoveCompaniesFromCollectionRequest,
    db: Session = Depends(database.get_db)
):
    collection = get_collection_by_id(db, request.collection_id)
    associations = get_existing_associations(db, request.company_ids, collection.id)
    
    if not associations:
        raise HTTPException(status_code=400, detail="No matching company associations found")
    
    for assoc in associations:
        db.delete(assoc)
    db.commit()
    
    return {"message": f"{len(associations)} companies removed from '{collection.collection_name}' collection successfully"}

@router.post("/like-company")
def like_company(
    request: LikeCompanyRequest,
    db: Session = Depends(database.get_db)
) -> LikedCompaniesResponse:
    # Assuming there is a Liked Companies list
    liked_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies")
        .first()
    )

    # Check if company already in liked collection
    liked_association = db.query(database.CompanyCollectionAssociation).filter(
        database.CompanyCollectionAssociation.collection_id == liked_collection.id,
        database.CompanyCollectionAssociation.company_id == request.company_id
    ).first()
    if liked_association:
        return LikedCompaniesResponse(message="Company already liked", success=False)
    
    # Add company to liked collection
    liked_association = database.CompanyCollectionAssociation(company_id=request.company_id, collection_id=liked_collection.id)
    db.add(liked_association)
    db.commit()
    return LikedCompaniesResponse(message="Company liked successfully", success=True)

@router.post("/unlike-company")
def unlike_company(
    request: UnlikeCompanyRequest,
    db: Session = Depends(database.get_db)
) -> UnlikedCompaniesResponse:
    liked_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies")
        .first()
    )   
    
    # Check if company is in liked collection
    liked_association = db.query(database.CompanyCollectionAssociation).filter(
        database.CompanyCollectionAssociation.collection_id == liked_collection.id,
        database.CompanyCollectionAssociation.company_id == request.company_id
    ).first()
    if not liked_association:
        return UnlikedCompaniesResponse(message="Company not in liked collection", success=False)
    
    db.delete(liked_association)
    db.commit()
    return UnlikedCompaniesResponse(message="Company unliked successfully", success=True)


@router.post("/add-collection-to-collection")
async def add_collection_to_collection(
    request: AddAllCompaniesToCollectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    db_async: AsyncSession = Depends(database.get_async_db),
    redis: Redis = Depends(get_redis)
):
    task_id = str(uuid.uuid4())
    source_collection = get_collection_by_id(db, request.source_collection_id)
    target_collection = get_collection_by_id(db, request.target_collection_id)

    source_collection_associations = db.query(database.CompanyCollectionAssociation).filter(
        database.CompanyCollectionAssociation.collection_id == source_collection.id
    ).all()

    source_collection_company_ids = [assoc.company_id for assoc in source_collection_associations]

    background_tasks.add_task(
        process_add_all_companies_to_collection,
        task_id,
        source_collection_company_ids,
        source_collection.collection_name,
        target_collection.id,
        target_collection.collection_name,
        db_async,
        redis
    )
    return AddAllCompaniesToCollectionResponse(message="Bulk addition started.", task_id=task_id)

@router.get("/task_in_progress")
async def task_in_progress(redis: Redis = Depends(get_redis)) -> TaskInProgressResponse:
    keys = await redis.keys("task:*")
    for key in keys:
        task_data = await redis.hgetall(key)
        if task_data.get('status', 'in_progress') == 'in_progress':
            task_id = key.split(":")[1]
            return TaskInProgressResponse(task_id=task_id)
    return TaskInProgressResponse(task_id=None)

