from typing import List
from aioredis import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from fastapi import HTTPException

from backend.db import database
from backend.routes.websocket import ProgressUpdate, send_progress_update

async def process_add_all_companies_to_collection(
    task_id: str,
    source_collection_company_ids: List[int],
    source_collection_name: str,
    target_collection_id: str,
    target_collection_name: str,
    db: AsyncSession,
    redis: Redis
):
    # total_companies = len(source_collection_company_ids)
    total_companies = 850  # for testing
    batch_size = 10
    
    await initialize_progress_tracking(redis, task_id, total_companies)

    for offset in range(0, total_companies, batch_size):
        await process_batch(
            task_id, offset, batch_size, 
            source_collection_company_ids, source_collection_name,
            target_collection_id, target_collection_name,
            total_companies, db, redis
        )

    await finalize_task(task_id, source_collection_name, target_collection_name, redis)

async def initialize_progress_tracking(redis: Redis, task_id: str, total_companies: int):
    await redis.hset(f"task:{task_id}", mapping={"total": str(total_companies), "completed": "0"})

async def process_batch(
    task_id: str, offset: int, batch_size: int,
    source_collection_company_ids: List[int], source_collection_name: str,
    target_collection_id: str, target_collection_name: str,
    total_companies: int, db: AsyncSession, redis: Redis
):
    company_ids = source_collection_company_ids[offset:offset + batch_size]
    if not company_ids:
        return

    await add_companies_to_collection_db(company_ids, target_collection_id, db)
    completed = min(offset + batch_size, total_companies)
    
    await update_progress(task_id, completed, total_companies, source_collection_name, target_collection_name, redis)

async def update_progress(
    task_id: str, completed: int, total_companies: int,
    source_collection_name: str, target_collection_name: str, redis: Redis
):
    progress_update = ProgressUpdate(
        progress=completed / total_companies,
        status="in_progress",
        message=f"Adding {source_collection_name} to {target_collection_name}"
    )
    await send_progress_update(task_id, progress_update)
    await redis.hset(f"task:{task_id}", mapping={"completed": str(completed)})

async def finalize_task(
    task_id: str,
    source_collection_name: str, target_collection_name: str, redis: Redis
):
    await redis.hset(f"task:{task_id}", mapping={"status": "completed"})
    await redis.expire(f"task:{task_id}", 3600)  # Set expiration for 1 hour

    final_update = ProgressUpdate(
        progress=1.0,
        status="completed",
        message=f"Finished adding {source_collection_name} to {target_collection_name}"
    )
    await send_progress_update(task_id, final_update)

async def add_companies_to_collection_db(company_ids: List[int], collection_id: int, db: AsyncSession):
    collection = await get_collection(db, collection_id)
    existing_associations = await get_existing_associations(db, company_ids, collection.id)

    new_associations = create_new_associations(company_ids, collection.id, existing_associations)

    db.add_all(new_associations)
    await db.commit()

    return {"message": f"{len(new_associations)} companies added to '{collection.collection_name}' collection successfully"}

async def get_collection(db: AsyncSession, collection_id: int):
    stmt = select(database.CompanyCollection).where(database.CompanyCollection.id == collection_id)
    result = await db.execute(stmt)
    collection = result.scalars().first()
    if not collection:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_id}' not found")
    return collection

async def get_companies(db: AsyncSession, company_ids: List[int]):
    stmt = select(database.Company).where(database.Company.id.in_(company_ids))
    result = await db.execute(stmt)
    companies = result.scalars().all()
    if len(companies) != len(company_ids):
        raise HTTPException(status_code=404, detail="One or more companies not found!")
    return companies

async def get_existing_associations(db: AsyncSession, company_ids: List[int], collection_id: int):
    stmt = select(database.CompanyCollectionAssociation).where(
        database.CompanyCollectionAssociation.company_id.in_(company_ids),
        database.CompanyCollectionAssociation.collection_id == collection_id
    )
    result = await db.execute(stmt)
    return result.scalars().all()

def create_new_associations(company_ids: List[int], collection_id: int, existing_associations):
    existing_company_ids = {assoc.company_id for assoc in existing_associations}
    return [
        database.CompanyCollectionAssociation(company_id=company_id, collection_id=collection_id)
        for company_id in company_ids if company_id not in existing_company_ids
    ]

