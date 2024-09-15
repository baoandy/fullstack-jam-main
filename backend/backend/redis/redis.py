import aioredis


async def get_redis():
    redis = aioredis.from_url("redis://redis:6379", decode_responses=True)
    yield redis