from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create directories for file uploads
upload_dir = ROOT_DIR / "uploads"
upload_dir.mkdir(exist_ok=True)
(upload_dir / "profiles").mkdir(exist_ok=True)
(upload_dir / "verification").mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = "grove_marketplace_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic Models
class UserRole(str):
    WORKER = "worker"
    REQUESTER = "requester"

class UserBase(BaseModel):
    email: str
    full_name: str
    phone: str
    role: str  # 'worker' or 'requester'
    city: str
    bio: Optional[str] = ""
    profile_picture: Optional[str] = ""

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_verified: bool = False
    rating: float = 0.0
    total_jobs: int = 0

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class WorkerProfile(BaseModel):
    skills: List[str] = []
    availability: str = ""
    location_radius: int = 10  # km
    hourly_rate: Optional[float] = None

class JobBase(BaseModel):
    title: str
    description: str
    category: str
    budget: float
    location: str
    urgency: str = "normal"  # 'urgent', 'normal', 'flexible'
    requirements: Optional[str] = ""

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: str
    requester_id: str
    requester_name: str
    created_at: datetime
    status: str = "open"  # 'open', 'filled', 'closed'
    applications_count: int = 0

class JobApplication(BaseModel):
    job_id: str
    worker_id: str
    message: Optional[str] = ""
    proposed_rate: Optional[float] = None

class JobApplicationResponse(JobApplication):
    id: str
    worker_name: str
    worker_rating: float
    created_at: datetime
    status: str = "pending"  # 'pending', 'accepted', 'rejected'

class Message(BaseModel):
    sender_id: str
    receiver_id: str
    content: str
    job_id: Optional[str] = None

class MessageResponse(Message):
    id: str
    sender_name: str
    created_at: datetime

# Cities list for dropdown
SOUTH_AFRICA_CITIES = [
  "Johannesburg", "Pretoria", "Cape Town", "Durban",
  "Bloemfontein", "Port Elizabeth", "East London",
  "Polokwane", "Mbombela", "Kimberley"
];

JOB_CATEGORIES = [
    "Cleaning", "Yardwork", "Childcare", "House Help", "General Repairs",
    "Admin Help", "Delivery Help", "Elderly Care", "Photography", "Graphic Design",
    "Social Media", "Tutoring", "Pet Care", "Moving Help", "Event Help"
]

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserResponse(**user)

async def get_current_worker(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Access denied: Workers only")
    return current_user

async def get_current_requester(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != UserRole.REQUESTER:
        raise HTTPException(status_code=403, detail="Access denied: Requesters only")
    return current_user

# Routes
@api_router.get("/")
async def root():
    return {"message": "Grove Marketplace API"}

@api_router.get("/config")
async def get_config():
    return {
        "cities": SOUTH_AFRICA_CITIES,
        "job_categories": JOB_CATEGORIES
    }

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user_data.role not in [UserRole.WORKER, UserRole.REQUESTER]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_verified"] = False
    user_dict["rating"] = 0.0
    user_dict["total_jobs"] = 0
    
    await db.users.insert_one(user_dict)
    
    # Create worker profile if worker
    if user_data.role == UserRole.WORKER:
        worker_profile = {
            "user_id": user_dict["id"],
            "skills": [],
            "availability": "",
            "location_radius": 10,
            "hourly_rate": None
        }
        await db.worker_profiles.insert_one(worker_profile)
    
    # Create token
    access_token = create_access_token(data={"sub": user_data.email})
    
    user_response = UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user_data.email})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Job Routes
@api_router.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, current_user: UserResponse = Depends(get_current_requester)):
    job_dict = job_data.dict()
    job_dict["id"] = str(uuid.uuid4())
    job_dict["requester_id"] = current_user.id
    job_dict["requester_name"] = current_user.full_name
    job_dict["created_at"] = datetime.utcnow()
    job_dict["status"] = "open"
    job_dict["applications_count"] = 0
    
    await db.jobs.insert_one(job_dict)
    
    return JobResponse(**job_dict)

@api_router.get("/jobs", response_model=List[JobResponse])
async def get_jobs(category: Optional[str] = None, location: Optional[str] = None, current_user: UserResponse = Depends(get_current_user)):
    query = {"status": "open"}
    
    if category:
        query["category"] = category
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    jobs = await db.jobs.find(query).sort("created_at", -1).to_list(50)
    return [JobResponse(**job) for job in jobs]

@api_router.get("/jobs/my")
async def get_my_jobs(current_user: UserResponse = Depends(get_current_requester)):
    jobs = await db.jobs.find({"requester_id": current_user.id}).sort("created_at", -1).to_list(50)
    return [JobResponse(**job) for job in jobs]

@api_router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: UserResponse = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(**job)

# Job Application Routes
@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, application_data: dict, current_user: UserResponse = Depends(get_current_worker)):
    # Check if job exists
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "open":
        raise HTTPException(status_code=400, detail="Job is no longer available")
    
    # Check if already applied
    existing_application = await db.job_applications.find_one({
        "job_id": job_id,
        "worker_id": current_user.id
    })
    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Create application
    application = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "worker_id": current_user.id,
        "worker_name": current_user.full_name,
        "worker_rating": current_user.rating,
        "message": application_data.get("message", ""),
        "proposed_rate": application_data.get("proposed_rate"),
        "created_at": datetime.utcnow(),
        "status": "pending"
    }
    
    await db.job_applications.insert_one(application)
    
    # Update job applications count
    await db.jobs.update_one(
        {"id": job_id},
        {"$inc": {"applications_count": 1}}
    )
    
    return {"message": "Application submitted successfully"}

@api_router.get("/jobs/{job_id}/applications")
async def get_job_applications(job_id: str, current_user: UserResponse = Depends(get_current_requester)):
    # Verify job belongs to current user
    job = await db.jobs.find_one({"id": job_id, "requester_id": current_user.id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")
    
    applications = await db.job_applications.find({"job_id": job_id}).sort("created_at", -1).to_list(50)
    return [JobApplicationResponse(**app) for app in applications]

@api_router.get("/applications/my")
async def get_my_applications(current_user: UserResponse = Depends(get_current_worker)):
    applications = await db.job_applications.find({"worker_id": current_user.id}).sort("created_at", -1).to_list(50)
    
    # Get job details for each application
    result = []
    for app in applications:
        job = await db.jobs.find_one({"id": app["job_id"]})
        app_with_job = {**app, "job_title": job["title"] if job else "Job Removed"}
        result.append(app_with_job)
    
    return result

@api_router.put("/applications/{application_id}/status")
async def update_application_status(application_id: str, status_data: dict, current_user: UserResponse = Depends(get_current_requester)):
    # Get application
    application = await db.job_applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify job belongs to current user
    job = await db.jobs.find_one({"id": application["job_id"], "requester_id": current_user.id})
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_status = status_data.get("status")
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update application
    await db.job_applications.update_one(
        {"id": application_id},
        {"$set": {"status": new_status}}
    )
    
    # If accepted, mark job as filled
    if new_status == "accepted":
        await db.jobs.update_one(
            {"id": application["job_id"]},
            {"$set": {"status": "filled"}}
        )
    
    return {"message": f"Application {new_status}"}

# Profile Routes
@api_router.put("/profile")
async def update_profile(profile_data: dict, current_user: UserResponse = Depends(get_current_user)):
    # Update user profile
    update_data = {k: v for k, v in profile_data.items() if k in ["full_name", "phone", "city", "bio"]}
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    # Update worker profile if worker
    if current_user.role == UserRole.WORKER and "worker_profile" in profile_data:
        worker_data = profile_data["worker_profile"]
        await db.worker_profiles.update_one(
            {"user_id": current_user.id},
            {"$set": worker_data},
            upsert=True
        )
    
    return {"message": "Profile updated successfully"}

@api_router.get("/profile/worker/{user_id}")
async def get_worker_profile(user_id: str, current_user: UserResponse = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id, "role": UserRole.WORKER})
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    worker_profile = await db.worker_profiles.find_one({"user_id": user_id})
    
    return {
        "user": UserResponse(**{k: v for k, v in user.items() if k != "password"}),
        "profile": worker_profile or {}
    }

# Messaging Routes
@api_router.post("/messages")
async def send_message(message_data: Message, current_user: UserResponse = Depends(get_current_user)):
    # Verify receiver exists
    receiver = await db.users.find_one({"id": message_data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message_dict = message_data.dict()
    message_dict["id"] = str(uuid.uuid4())
    message_dict["sender_id"] = current_user.id
    message_dict["sender_name"] = current_user.full_name
    message_dict["created_at"] = datetime.utcnow()
    
    await db.messages.insert_one(message_dict)
    
    return MessageResponse(**message_dict)

@api_router.get("/messages/{other_user_id}")
async def get_messages(other_user_id: str, current_user: UserResponse = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": current_user.id}
        ]
    }).sort("created_at", 1).to_list(100)
    
    return [MessageResponse(**msg) for msg in messages]

# File Upload Routes
@api_router.post("/upload/verification")
async def upload_verification_doc(file: UploadFile = File(...), current_user: UserResponse = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    filename = f"{current_user.id}_verification.{file_extension}"
    file_path = upload_dir / "verification" / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user verification status to pending
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"verification_status": "pending", "verification_document": filename}}
    )
    
    return {"message": "Verification document uploaded successfully"}

# Include the router in the main app
app.include_router(api_router)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
