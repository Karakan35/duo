from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
import pytz

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Timezone configuration - Turkey timezone
TURKEY_TZ = pytz.timezone('Europe/Istanbul')

def get_turkey_now():
    """Get current time in Turkey timezone"""
    return datetime.now(TURKEY_TZ)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Enums
class DayOfWeek(str, Enum):
    MONDAY = "Pazartesi"
    TUESDAY = "Salı"
    WEDNESDAY = "Çarşamba"
    THURSDAY = "Perşembe"
    FRIDAY = "Cuma"
    SATURDAY = "Cumartesi"
    SUNDAY = "Pazar"


# Models
class User(BaseModel):
    id: str
    name: str
    health: int
    level: int
    points: int
    strength: int = 10
    agility: int = 10
    charisma: int = 10
    endurance: int = 10
    is_admin: bool = False
    game_over: bool = False
    last_check_date: Optional[str] = None


class Task(BaseModel):
    id: str
    title: str
    points: int
    strength: int = 0
    agility: int = 0
    charisma: int = 0
    endurance: int = 0
    is_weekly: bool = False
    day_of_week: Optional[str] = None
    assigned_to: Optional[str] = None  # user_id or None for both
    week_number: int
    year: int
    is_active: bool = True
    created_at: str


class TaskCreate(BaseModel):
    title: str
    points: int
    strength: int = 0
    agility: int = 0
    charisma: int = 0
    endurance: int = 0
    is_weekly: bool = False
    day_of_week: Optional[str] = None
    assigned_to: Optional[str] = None  # user_id or None for both


class CompletedTask(BaseModel):
    id: str
    user_id: str
    task_id: str
    completed_date: str


class LevelReward(BaseModel):
    level: int
    title: str
    description: str
    is_big: bool


class LoginRequest(BaseModel):
    name: str


class CompleteTaskRequest(BaseModel):
    user_id: str
    task_id: str


# API Routes
@api_router.post("/login")
async def login(request: LoginRequest):
    """User login/selection"""
    user = await db.users.find_one({"name": request.name}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Check if game is over
    if user.get("game_over", False):
        return {"user": user, "game_over": True}
    
    return {"user": user, "game_over": False}


@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user details"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


@api_router.get("/tasks/today")
async def get_today_tasks(user_id: str):
    """Get today's daily tasks for a user"""
    today = get_turkey_now()
    day_name = get_turkish_day_name(today.weekday())
    week_number = today.isocalendar()[1]
    year = today.year
    
    # Get all daily tasks for today (assigned to this user or to all)
    tasks = await db.tasks.find({
        "day_of_week": day_name,
        "week_number": week_number,
        "year": year,
        "is_active": True,
        "is_weekly": False,
        "$or": [
            {"assigned_to": user_id},
            {"assigned_to": None},
            {"assigned_to": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Get completed tasks for this user
    today_str = today.strftime("%Y-%m-%d")
    completed = await db.completed_tasks.find({
        "user_id": user_id,
        "completed_date": today_str
    }, {"_id": 0}).to_list(100)
    
    completed_task_ids = [ct["task_id"] for ct in completed]
    
    # Mark tasks as completed
    for task in tasks:
        task["is_completed"] = task["id"] in completed_task_ids
    
    return {"tasks": tasks, "day": day_name}


@api_router.get("/tasks/weekly")
async def get_weekly_tasks(user_id: str):
    """Get this week's weekly tasks"""
    today = get_turkey_now()
    week_number = today.isocalendar()[1]
    year = today.year
    
    # Get all weekly tasks for this week (assigned to this user or to all)
    tasks = await db.tasks.find({
        "week_number": week_number,
        "year": year,
        "is_active": True,
        "is_weekly": True,
        "$or": [
            {"assigned_to": user_id},
            {"assigned_to": None},
            {"assigned_to": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Check completion status
    completed = await db.completed_tasks.find({
        "user_id": user_id
    }, {"_id": 0}).to_list(1000)
    
    completed_task_ids = [ct["task_id"] for ct in completed]
    
    # Mark tasks as completed
    for task in tasks:
        task["is_completed"] = task["id"] in completed_task_ids
    
    return {"tasks": tasks}


@api_router.post("/tasks/complete")
async def complete_task(request: CompleteTaskRequest):
    """Mark a task as completed and update stats"""
    today = get_turkey_now()
    today_str = today.strftime("%Y-%m-%d")
    
    # Check if already completed (for daily tasks)
    task = await db.tasks.find_one({"id": request.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    # For daily tasks, check if already completed today
    # For weekly tasks, check if ever completed
    if not task.get("is_weekly", False):
        existing = await db.completed_tasks.find_one({
            "user_id": request.user_id,
            "task_id": request.task_id,
            "completed_date": today_str
        })
    else:
        existing = await db.completed_tasks.find_one({
            "user_id": request.user_id,
            "task_id": request.task_id
        })
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu görev zaten tamamlanmış")
    
    # Get user
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Mark as completed
    completed = {
        "id": f"{request.user_id}_{request.task_id}_{today_str}",
        "user_id": request.user_id,
        "task_id": request.task_id,
        "completed_date": today_str
    }
    await db.completed_tasks.insert_one(completed)
    
    # Update user stats and points
    new_points = user["points"] + task["points"]
    new_strength = user.get("strength", 10) + task.get("strength", 0)
    new_agility = user.get("agility", 10) + task.get("agility", 0)
    new_charisma = user.get("charisma", 10) + task.get("charisma", 0)
    new_endurance = user.get("endurance", 10) + task.get("endurance", 0)
    
    update_data = {
        "points": new_points,
        "strength": new_strength,
        "agility": new_agility,
        "charisma": new_charisma,
        "endurance": new_endurance
    }
    
    # Check if it's Sunday - level up
    level_up = False
    new_level = user["level"]
    reward = None
    
    if task.get("day_of_week") == "Pazar" and not task.get("is_weekly", False):
        new_level = user["level"] + 1
        update_data["level"] = new_level
        level_up = True
        
        # Get reward
        reward_doc = await db.level_rewards.find_one({"level": new_level}, {"_id": 0})
        if reward_doc:
            reward = reward_doc
    
    await db.users.update_one(
        {"id": request.user_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "new_points": new_points,
        "stats": {
            "strength": new_strength,
            "agility": new_agility,
            "charisma": new_charisma,
            "endurance": new_endurance
        },
        "level_up": level_up,
        "new_level": new_level,
        "reward": reward
    }


@api_router.get("/tasks/week")
async def get_week_tasks(user_id: str):
    """Get all tasks for current week (admin view)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    today = get_turkey_now()
    week_number = today.isocalendar()[1]
    year = today.year
    
    tasks = await db.tasks.find({
        "week_number": week_number,
        "year": year,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    return {"tasks": tasks}


@api_router.post("/tasks")
async def create_task(task: TaskCreate, user_id: str):
    """Create a new task (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    today = get_turkey_now()
    week_number = today.isocalendar()[1]
    year = today.year
    
    new_task = {
        "id": f"task_{today.timestamp()}",
        "title": task.title,
        "points": task.points,
        "strength": task.strength,
        "agility": task.agility,
        "charisma": task.charisma,
        "endurance": task.endurance,
        "is_weekly": task.is_weekly,
        "day_of_week": task.day_of_week if not task.is_weekly else None,
        "assigned_to": task.assigned_to,
        "week_number": week_number,
        "year": year,
        "is_active": True,
        "created_at": today.isoformat()
    }
    
    # Make a copy before inserting (MongoDB will add _id to the original)
    task_copy = new_task.copy()
    await db.tasks.insert_one(new_task)
    return {"success": True, "task": task_copy}


@api_router.post("/tasks/{task_id}/delete")
async def delete_task(task_id: str, user_id: str):
    """Delete a task (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"is_active": False}}
    )
    
    return {"success": True}


# Reward Management Endpoints
@api_router.get("/rewards")
async def get_rewards(user_id: str):
    """Get all rewards (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    rewards = await db.level_rewards.find({}, {"_id": 0}).sort("level", 1).to_list(100)
    return {"rewards": rewards}


class RewardUpdate(BaseModel):
    level: int
    title: str
    description: str
    is_big: bool


@api_router.post("/rewards")
async def create_or_update_reward(reward: RewardUpdate, user_id: str):
    """Create or update a reward (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    reward_data = {
        "level": reward.level,
        "title": reward.title,
        "description": reward.description,
        "is_big": reward.is_big
    }
    
    # Upsert - update if exists, insert if not
    await db.level_rewards.update_one(
        {"level": reward.level},
        {"$set": reward_data},
        upsert=True
    )
    
    return {"success": True, "reward": reward_data}


@api_router.delete("/rewards/{level}")
async def delete_reward(level: int, user_id: str):
    """Delete a reward (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    await db.level_rewards.delete_one({"level": level})
    return {"success": True}


# Health Management
class HealthUpdate(BaseModel):
    health: int


@api_router.post("/users/{target_user_id}/health")
async def update_user_health(target_user_id: str, health_update: HealthUpdate, user_id: str):
    """Update user health (admin only)"""
    # Check if requester is admin
    admin = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not admin or not admin.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    # Get target user
    target_user = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Update health (clamp between 0 and 15)
    new_health = max(0, min(15, health_update.health))
    
    # If health > 0, reset game_over
    game_over = new_health == 0
    
    await db.users.update_one(
        {"id": target_user_id},
        {"$set": {"health": new_health, "game_over": game_over}}
    )
    
    return {
        "success": True,
        "new_health": new_health,
        "game_over": game_over
    }


@api_router.get("/users/all/list")
async def get_all_users(user_id: str):
    """Get all users (admin only)"""
    # Check if requester is admin
    admin = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not admin or not admin.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    users = await db.users.find({}, {"_id": 0}).to_list(10)
    return {"users": users}


@api_router.post("/daily-check")
async def daily_health_check(user_id: str):
    """Check if user completed tasks yesterday, reduce health if not"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if user.get("game_over", False):
        return {"game_over": True}
    
    today = get_turkey_now()
    today_str = today.strftime("%Y-%m-%d")
    
    # Check if already checked today
    if user.get("last_check_date") == today_str:
        return {"checked": True, "health": user["health"]}
    
    # Check yesterday's tasks
    from datetime import timedelta
    yesterday = today - timedelta(days=1)
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    day_name = get_turkish_day_name(yesterday.weekday())
    week_number = yesterday.isocalendar()[1]
    year = yesterday.year
    
    # Get yesterday's daily tasks
    yesterday_tasks = await db.tasks.find({
        "day_of_week": day_name,
        "week_number": week_number,
        "year": year,
        "is_active": True,
        "is_weekly": False
    }, {"_id": 0}).to_list(100)
    
    # Get completed tasks from yesterday
    completed = await db.completed_tasks.find({
        "user_id": user_id,
        "completed_date": yesterday_str
    }, {"_id": 0}).to_list(100)
    
    # Check weekly tasks if it's Monday (new week)
    weekly_health_loss = 0
    if today.weekday() == 0:  # Monday
        last_week_number = (today - timedelta(days=7)).isocalendar()[1]
        last_week_tasks = await db.tasks.find({
            "week_number": last_week_number,
            "year": year,
            "is_active": True,
            "is_weekly": True
        }, {"_id": 0}).to_list(100)
        
        if last_week_tasks:
            # Check if any weekly task was completed
            weekly_completed = await db.completed_tasks.find({
                "user_id": user_id,
                "task_id": {"$in": [t["id"] for t in last_week_tasks]}
            }, {"_id": 0}).to_list(100)
            
            # Each uncompleted weekly task costs 1 health
            weekly_health_loss = len(last_week_tasks) - len(weekly_completed)
    
    # If there were tasks but none completed, reduce health
    new_health = user["health"]
    health_reduced = False
    
    daily_health_loss = 0
    if len(yesterday_tasks) > 0 and len(completed) == 0:
        daily_health_loss = 1
    
    total_health_loss = daily_health_loss + weekly_health_loss
    
    if total_health_loss > 0:
        new_health = max(0, user["health"] - total_health_loss)
        health_reduced = True
        
        # Check for game over
        game_over = new_health == 0
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "health": new_health,
                "last_check_date": today_str,
                "game_over": game_over
            }}
        )
        
        return {
            "health_reduced": health_reduced,
            "new_health": new_health,
            "game_over": game_over,
            "weekly_loss": weekly_health_loss
        }
    
    # Update last check date
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_check_date": today_str}}
    )
    
    return {
        "health_reduced": False,
        "new_health": new_health,
        "game_over": False,
        "weekly_loss": 0
    }


def get_turkish_day_name(weekday: int) -> str:
    """Convert weekday number to Turkish day name"""
    days = {
        0: "Pazartesi",
        1: "Salı",
        2: "Çarşamba",
        3: "Perşembe",
        4: "Cuma",
        5: "Cumartesi",
        6: "Pazar"
    }
    return days.get(weekday, "Pazartesi")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db():
    """Initialize database with default data"""
    # Check if users exist
    user_count = await db.users.count_documents({})
    
    if user_count == 0:
        # Create initial users with stats
        users = [
            {
                "id": "user_bellatrix",
                "name": "Bellatrix",
                "health": 13,
                "level": 2,
                "points": 0,
                "strength": 10,
                "agility": 10,
                "charisma": 10,
                "endurance": 10,
                "is_admin": False,
                "game_over": False,
                "last_check_date": None
            },
            {
                "id": "user_agamemnon",
                "name": "Agamemnon",
                "health": 14,
                "level": 2,
                "points": 0,
                "strength": 10,
                "agility": 10,
                "charisma": 10,
                "endurance": 10,
                "is_admin": True,
                "game_over": False,
                "last_check_date": None
            }
        ]
        await db.users.insert_many(users)
        logger.info("Initial users created with stats")
        
        # Create level rewards
        rewards = []
        for i in range(1, 51):
            if i % 5 == 0:
                rewards.append({
                    "level": i,
                    "title": "Büyük Ödül",
                    "description": f"Seviye {i} Büyük Başarı! 🏆",
                    "is_big": True
                })
            else:
                rewards.append({
                    "level": i,
                    "title": "Seviye Atlama Ödülü",
                    "description": f"Seviye {i}'e ulaştın! 🎉",
                    "is_big": False
                })
        
        await db.level_rewards.insert_many(rewards)
        logger.info("Level rewards created")
    else:
        # Update existing users with stats if they don't have them
        await db.users.update_many(
            {"strength": {"$exists": False}},
            {"$set": {
                "strength": 10,
                "agility": 10,
                "charisma": 10,
                "endurance": 10
            }}
        )
        logger.info("Updated existing users with stats")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()