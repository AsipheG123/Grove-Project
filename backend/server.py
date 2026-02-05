from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# CORS Middleware - IMPORTANT: Add here, before any routes are included
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers
)

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
    address: Optional[str] = ""
    bio: Optional[str] = ""
    profile_picture: Optional[str] = ""
    card_number: Optional[str] = Field(None)
    card_expiry: Optional[str] = Field(None)
    card_cvc: Optional[str] = Field(None)

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_verified: bool = False
    rating: float = 0.0
    total_jobs: int = 0
    # Worker profile fields
    skills: Optional[List[str]] = []
    bank_name: Optional[str] = ""
    account_number: Optional[str] = ""
    account_holder: Optional[str] = ""
    availability: Optional[str] = ""
    location_radius: Optional[int] = 10
    hourly_rate: Optional[float] = None
    # Requester profile fields
    job_categories: Optional[List[str]] = []
    # Additional user fields
    gender: Optional[str] = ""
    birthday: Optional[str] = ""
    id_number: Optional[str] = ""
    id_document: Optional[str] = ""
    address: Optional[str] = ""

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

# All Routes directly on the main app instance
@app.get("/api")
async def root():
    return {"message": "Grove Marketplace API"}

@app.get("/api/config")
async def get_config():
    return {
        "cities": SOUTH_AFRICA_CITIES,
        "job_categories": JOB_CATEGORIES
    }

# Authentication Routes
@app.post("/api/auth/register", response_model=Token)
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
    
    # Create requester profile if requester
    if user_data.role == UserRole.REQUESTER:
        requester_profile = {
            "user_id": user_dict["id"],
            "job_categories": []
        }
        await db.requester_profiles.insert_one(requester_profile)
    
    # Create token
    access_token = create_access_token(data={"sub": user_data.email})
    
    user_response = UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user_data.email})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    try:
        user_doc = await db.users.find_one({"id": current_user.id})
        worker_profile = await db.worker_profiles.find_one({"user_id": current_user.id})
        requester_profile = await db.requester_profiles.find_one({"user_id": current_user.id})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Merge user and profile data
        user_response_data = {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
        if worker_profile:
            clean_worker_profile = {k: v for k, v in worker_profile.items() if k != "_id"}
            user_response_data.update(clean_worker_profile)
        if requester_profile:
            clean_requester_profile = {k: v for k, v in requester_profile.items() if k != "_id"}
            user_response_data.update(clean_requester_profile)
        
        logger.info(f"[GET_ME] User ID: {current_user.id}")
        logger.info(f"[GET_ME] User document fields: {list(user_doc.keys())}")
        logger.info(f"[GET_ME] Worker profile fields: {list(worker_profile.keys()) if worker_profile else 'None'}")
        logger.info(f"[GET_ME] Merged response fields: {list(user_response_data.keys())}")
        logger.info(f"[GET_ME] Key fields check:")
        logger.info(f"  - full_name: {user_response_data.get('full_name')}")
        logger.info(f"  - gender: {user_response_data.get('gender')}")
        logger.info(f"  - birthday: {user_response_data.get('birthday')}")
        logger.info(f"  - id_number: {user_response_data.get('id_number')}")
        logger.info(f"  - address: {user_response_data.get('address')}")
        logger.info(f"  - skills: {user_response_data.get('skills')}")
        logger.info(f"  - bank_name: {user_response_data.get('bank_name')}")
        logger.info(f"  - account_number: {user_response_data.get('account_number')}")
        logger.info(f"  - account_holder: {user_response_data.get('account_holder')}")
        
        return user_response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET_ME] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Job Routes
@app.post("/api/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, current_user: UserResponse = Depends(get_current_requester)):
    logger.info(f"create_job endpoint hit! Data: {job_data.dict()}")
    logging.info(f"Attempting to create job by requester ID: {current_user.id}")
    job_dict = job_data.dict()
    job_dict["id"] = str(uuid.uuid4())
    job_dict["requester_id"] = current_user.id
    job_dict["requester_name"] = current_user.full_name
    job_dict["created_at"] = datetime.utcnow()
    job_dict["status"] = "open"
    job_dict["applications_count"] = 0
    
    await db.jobs.insert_one(job_dict)
    
    return JobResponse(**job_dict)

@app.get("/api/jobs/my", response_model=List[JobResponse])
async def get_my_jobs(current_user: UserResponse = Depends(get_current_requester)):
    logging.info(f"Attempting to fetch jobs posted by current requester ID: {current_user.id}")
    # Return jobs posted by the current user
    my_jobs_cursor = db.jobs.find({"requester_id": current_user.id}).sort("created_at", -1)
    my_jobs = await my_jobs_cursor.to_list(length=100)
    return [JobResponse(**job) for job in my_jobs]

@app.get("/api/jobs", response_model=List[JobResponse])
async def get_jobs(category: Optional[str] = None, location: Optional[str] = None, categories: Optional[str] = None, current_user: UserResponse = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    if categories:
        # Accept comma-separated list of categories
        category_list = [c.strip() for c in categories.split(",") if c.strip()]
        if category_list:
            # Use skill-to-category mapping for better recommendations
            mapped_categories = map_skills_to_categories(category_list)
            if mapped_categories:
                query["category"] = {"$in": mapped_categories}
            else:
                # Fallback to direct category matching
                query["category"] = {"$in": category_list}
    if location:
        query["location"] = location
    
    logging.info(f"Jobs query: {query}")
    jobs = await db.jobs.find(query).to_list(100)
    logging.info(f"Found {len(jobs)} jobs matching query")
    
    # If this is a recommendation request (categories provided), apply smart sorting
    if categories and current_user:
        jobs = await smart_sort_jobs(jobs, current_user)
    
    return [JobResponse(**job) for job in jobs]

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: UserResponse = Depends(get_current_user)):
    logging.info(f"Attempting to fetch job with ID: {job_id} for user ID: {current_user.id}")
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**job)

# Job Application Routes
@app.post("/api/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, application_data: dict, current_user: UserResponse = Depends(get_current_worker)):
    logging.info(f"Attempting to apply to job {job_id} by worker ID: {current_user.id}")
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

@app.get("/api/jobs/{job_id}/applications")
async def get_job_applications(job_id: str, current_user: UserResponse = Depends(get_current_requester)):
    # Verify job belongs to current user
    job = await db.jobs.find_one({"id": job_id, "requester_id": current_user.id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")
    
    applications = await db.job_applications.find({"job_id": job_id}).sort("created_at", -1).to_list(50)
    return [JobApplicationResponse(**app) for app in applications]

@app.get("/api/applications/my")
async def get_my_applications(current_user: UserResponse = Depends(get_current_worker)):
    applications = await db.job_applications.find({"worker_id": current_user.id}).sort("created_at", -1).to_list(50)
    
    # Get job details for each application
    result = []
    for app_item in applications:
        # Clean application data - remove MongoDB-specific fields
        clean_app = {k: v for k, v in app_item.items() if k != "_id"}
        
        job = await db.jobs.find_one({"id": app_item["job_id"]})
        if job:
            # Clean job data - remove MongoDB-specific fields
            clean_job = {k: v for k, v in job.items() if k != "_id"}
            
            # Include all relevant job fields
            app_with_job = {
                **clean_app,
                "job_title": clean_job["title"],
                "location": clean_job.get("location", ""),
                "budget": clean_job.get("budget", 0),
                "category": clean_job.get("category", ""),
                "description": clean_job.get("description", ""),
                "urgency": clean_job.get("urgency", "normal"),
                "status": clean_job.get("status", "open")
            }
        else:
            # Job was removed
            app_with_job = {
                **clean_app,
                "job_title": "Job Removed",
                "location": "",
                "budget": 0,
                "category": "",
                "description": "",
                "urgency": "normal",
                "status": "closed"
            }
        result.append(app_with_job)
    
    return result

@app.put("/api/applications/{application_id}/status")
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

# File Upload Routes
@app.post("/api/upload/verification")
async def upload_verification_doc(file: UploadFile = File(...), current_user: UserResponse = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    filename = f"{current_user.id}_verification.{file_extension}"
    file_path = upload_dir / "verification" / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Update user verification status to pending
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"verification_status": "pending", "verification_document": filename}}
    )
    
    return {"message": "Verification document uploaded successfully"}

@app.post("/api/upload/profile")
async def upload_profile_picture(file: UploadFile = File(...), current_user: UserResponse = Depends(get_current_user)):
    logger.info(f"upload_profile_picture endpoint hit! File: {file.filename}")
    logging.info(f"Attempting to upload profile picture for user ID: {current_user.id}")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    file_extension = file.filename.split(".")[-1]
    filename = f"{current_user.id}_profile.{file_extension}"
    file_path = upload_dir / "profiles" / filename
    
    logging.info(f"Attempting to save profile picture to: {file_path}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logging.info(f"Successfully saved profile picture to: {file_path}")
    except Exception as e:
        logging.error(f"Failed to save file {file_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    return {"filename": filename}

# Profile Routes
@app.put("/api/profile")
async def update_profile(profile_data: dict, current_user: UserResponse = Depends(get_current_user)):
    logger.info(f"update_profile endpoint hit! Data: {profile_data}")
    logging.info(f"Attempting to update profile for user ID: {current_user.id}")
    
    try:
        # User fields (expanded)
        user_fields = [
            "full_name", "phone", "address", "gender", "birthday", "id_number", "bio", "profile_picture",
            "email", "city", "card_number", "card_expiry", "card_cvc"
        ]
        user_update = {k: v for k, v in profile_data.items() if k in user_fields and v is not None and v != ""}
        
        logger.info(f"User update data: {user_update}")
        
        # Validate email if present
        if "email" in user_update and user_update["email"]:
            import re
            email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
            if not re.match(email_regex, user_update["email"]):
                raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Validate card fields if present
        if "card_number" in user_update and user_update["card_number"]:
            if not str(user_update["card_number"]).isdigit():
                raise HTTPException(status_code=400, detail="Card number must be numeric")
        if "card_expiry" in user_update and user_update["card_expiry"]:
            import re
            expiry_regex = r"^(0[1-9]|1[0-2])\/\d{2}$"
            if not re.match(expiry_regex, user_update["card_expiry"]):
                raise HTTPException(status_code=400, detail="Card expiry must be in MM/YY format")
        
        # Only update if there are fields
        if user_update:
            result = await db.users.update_one({"id": current_user.id}, {"$set": user_update})
            logger.info(f"Updated user fields: {user_update}")
            logger.info(f"User update result: {result.modified_count} documents modified")
        else:
            logger.info("No user fields to update")
        
        # Worker profile fields (expanded)
        worker_fields = [
            "skills", "bank_name", "account_number", "account_holder", "availability", "location_radius", "hourly_rate"
        ]
        worker_update = {k: v for k, v in profile_data.items() if k in worker_fields and v is not None and v != ""}
        
        # Requester profile fields
        requester_fields = [
            "job_categories"
        ]
        requester_update = {k: v for k, v in profile_data.items() if k in requester_fields and v is not None and v != ""}
        
        # Convert skills to list if it's a string
        if "skills" in worker_update:
            if isinstance(worker_update["skills"], str):
                worker_update["skills"] = [s.strip() for s in worker_update["skills"].split(",") if s.strip()]
            elif not isinstance(worker_update["skills"], list):
                worker_update["skills"] = []
        
        # Validate location_radius and hourly_rate
        if "location_radius" in worker_update and worker_update["location_radius"]:
            try:
                worker_update["location_radius"] = int(worker_update["location_radius"])
            except Exception:
                raise HTTPException(status_code=400, detail="location_radius must be an integer")
        if "hourly_rate" in worker_update and worker_update["hourly_rate"]:
            try:
                worker_update["hourly_rate"] = float(worker_update["hourly_rate"])
            except Exception:
                raise HTTPException(status_code=400, detail="hourly_rate must be a number")
        
        logger.info(f"Worker update data: {worker_update}")
        
        if worker_update:
            result = await db.worker_profiles.update_one({"user_id": current_user.id}, {"$set": worker_update}, upsert=True)
            logger.info(f"Updated worker fields: {worker_update}")
            logger.info(f"Worker update result: {result.modified_count} documents modified, upserted: {result.upserted_id}")
        else:
            logger.info("No worker fields to update")
        
        # Convert job_categories to list if it's a string
        if "job_categories" in requester_update:
            if isinstance(requester_update["job_categories"], str):
                requester_update["job_categories"] = [c.strip() for c in requester_update["job_categories"].split(",") if c.strip()]
            elif not isinstance(requester_update["job_categories"], list):
                requester_update["job_categories"] = []
        
        logger.info(f"Requester update data: {requester_update}")
        
        if requester_update:
            result = await db.requester_profiles.update_one({"user_id": current_user.id}, {"$set": requester_update}, upsert=True)
            logger.info(f"Updated requester fields: {requester_update}")
            logger.info(f"Requester update result: {result.modified_count} documents modified, upserted: {result.upserted_id}")
        else:
            logger.info("No requester fields to update")
        
        # Return merged user+profile data
        user_doc = await db.users.find_one({"id": current_user.id})
        worker_profile = await db.worker_profiles.find_one({"user_id": current_user.id})
        requester_profile = await db.requester_profiles.find_one({"user_id": current_user.id})
        
        # Clean user document - remove MongoDB-specific fields and password
        user_response_data = {k: v for k, v in user_doc.items() if k not in ["password", "_id"]}
        
        # Clean worker profile - remove MongoDB-specific fields
        if worker_profile:
            clean_worker_profile = {k: v for k, v in worker_profile.items() if k != "_id"}
            user_response_data.update(clean_worker_profile)
        
        # Clean requester profile - remove MongoDB-specific fields
        if requester_profile:
            clean_requester_profile = {k: v for k, v in requester_profile.items() if k != "_id"}
            user_response_data.update(clean_requester_profile)
        
        logger.info(f"Returning updated profile: {user_response_data}")
        return user_response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/profile/onboarding")
async def onboarding(
    full_name: str = Form(""),
    phone: str = Form(""),
    address: str = Form(""),
    gender: str = Form(""),
    birthday: str = Form(""),
    id_number: str = Form(""),
    skills: str = Form(""),  # comma-separated, optional
    bank_name: str = Form(""),
    account_number: str = Form(""),
    account_holder: str = Form(""),
    bio: str = Form(""),
    profile_picture: UploadFile = File(None),
    id_document: UploadFile = File(None),
    current_user: UserResponse = Depends(get_current_user)
):
    logger.info(f"[ONBOARDING] Received data for user {current_user.id}:")
    logger.info(f"  full_name: {full_name}")
    logger.info(f"  phone: {phone}")
    logger.info(f"  address: {address}")
    logger.info(f"  gender: {gender}")
    logger.info(f"  birthday: {birthday}")
    logger.info(f"  id_number: {id_number}")
    logger.info(f"  skills: {skills}")
    logger.info(f"  bank_name: {bank_name}")
    logger.info(f"  account_number: {account_number}")
    logger.info(f"  account_holder: {account_holder}")
    logger.info(f"  bio: {bio}")
    logger.info(f"  profile_picture: {profile_picture.filename if profile_picture else None}")
    logger.info(f"  id_document: {id_document.filename if id_document else None}")
    
    try:
        # Save profile picture
        profile_pic_filename = current_user.profile_picture
        if profile_picture:
            ext = profile_picture.filename.split('.')[-1]
            profile_pic_filename = f"{current_user.id}_profile.{ext}"
            file_path = upload_dir / "profiles" / profile_pic_filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(profile_picture.file, buffer)
            logger.info(f"[ONBOARDING] Saved profile picture: {profile_pic_filename}")
        
        # Save ID document
        id_doc_filename = None
        if id_document:
            ext = id_document.filename.split('.')[-1]
            id_doc_filename = f"{current_user.id}_id.{ext}"
            file_path = upload_dir / "profiles" / id_doc_filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(id_document.file, buffer)
            logger.info(f"[ONBOARDING] Saved ID document: {id_doc_filename}")
        
        # Update user document
        user_update = {
            "full_name": full_name,
            "phone": phone,
            "address": address,
            "gender": gender,
            "birthday": birthday,
            "id_number": id_number,
            "bio": bio,
        }
        
        # Only add profile picture if we have one
        if profile_pic_filename and profile_pic_filename != current_user.profile_picture:
            user_update["profile_picture"] = profile_pic_filename
        
        # Only add ID document if we have one
        if id_doc_filename:
            user_update["id_document"] = id_doc_filename
        
        # Remove empty fields but keep non-empty strings
        user_update = {k: v for k, v in user_update.items() if v is not None and v != ""}
        
        logger.info(f"[ONBOARDING] About to update user document with: {user_update}")
        if user_update:
            result = await db.users.update_one({"id": current_user.id}, {"$set": user_update})
            logger.info(f"[ONBOARDING] Updated user document: {user_update}")
            logger.info(f"[ONBOARDING] User update result: {result.modified_count} documents modified")
        else:
            logger.info(f"[ONBOARDING] No user fields to update")
        
        # Update worker profile
        skills_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []
        worker_update = {
            "skills": skills_list,
            "bank_name": bank_name,
            "account_number": account_number,
            "account_holder": account_holder,
        }
        
        # Remove empty fields but keep non-empty strings and non-empty lists
        worker_update = {k: v for k, v in worker_update.items() if v is not None and v != "" and v != []}
        
        logger.info(f"[ONBOARDING] About to update worker profile with: {worker_update}")
        if worker_update:
            result = await db.worker_profiles.update_one(
                {"user_id": current_user.id},
                {"$set": worker_update},
                upsert=True
            )
            logger.info(f"[ONBOARDING] Updated worker profile: {worker_update}")
            logger.info(f"[ONBOARDING] Worker update result: {result.modified_count} documents modified, upserted: {result.upserted_id}")
        else:
            logger.info(f"[ONBOARDING] No worker fields to update")
        
        # Verify the data was saved by fetching it back
        user_doc = await db.users.find_one({"id": current_user.id})
        worker_profile = await db.worker_profiles.find_one({"user_id": current_user.id})
        
        # Clean documents for logging (remove MongoDB-specific fields)
        clean_user_doc = {k: v for k, v in user_doc.items() if k != "_id"}
        clean_worker_profile = {k: v for k, v in worker_profile.items() if k != "_id"} if worker_profile else None
        
        logger.info(f"[ONBOARDING] Verification - User document: {clean_user_doc}")
        logger.info(f"[ONBOARDING] Verification - Worker profile: {clean_worker_profile}")
        
        return {"message": "Onboarding complete"}
        
    except Exception as e:
        logger.error(f"[ONBOARDING] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save onboarding data: {str(e)}")

@app.post("/api/profile/requester-onboarding")
async def requester_onboarding(
    full_name: str = Form(""),
    phone: str = Form(""),
    address: str = Form(""),
    gender: str = Form(""),
    birthday: str = Form(""),
    id_number: str = Form(""),
    job_categories: str = Form(""),  # comma-separated, optional
    bio: str = Form(""),
    bank_name: str = Form(""),
    account_number: str = Form(""),
    account_holder: str = Form(""),
    profile_picture: UploadFile = File(None),
    id_document: UploadFile = File(None),
    current_user: UserResponse = Depends(get_current_user)
):
    logger.info(f"[REQUESTER_ONBOARDING] Received data for user {current_user.id}:")
    logger.info(f"  full_name: {full_name}")
    logger.info(f"  phone: {phone}")
    logger.info(f"  address: {address}")
    logger.info(f"  gender: {gender}")
    logger.info(f"  birthday: {birthday}")
    logger.info(f"  id_number: {id_number}")
    logger.info(f"  job_categories: {job_categories}")
    logger.info(f"  bio: {bio}")
    logger.info(f"  bank_name: {bank_name}")
    logger.info(f"  account_number: {account_number}")
    logger.info(f"  account_holder: {account_holder}")
    logger.info(f"  profile_picture: {profile_picture.filename if profile_picture else None}")
    logger.info(f"  id_document: {id_document.filename if id_document else None}")
    
    try:
        # Save profile picture
        profile_pic_filename = current_user.profile_picture
        if profile_picture:
            ext = profile_picture.filename.split('.')[-1]
            profile_pic_filename = f"{current_user.id}_profile.{ext}"
            file_path = upload_dir / "profiles" / profile_pic_filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(profile_picture.file, buffer)
            logger.info(f"[REQUESTER_ONBOARDING] Saved profile picture: {profile_pic_filename}")
        
        # Save ID document
        id_doc_filename = None
        if id_document:
            ext = id_document.filename.split('.')[-1]
            id_doc_filename = f"{current_user.id}_id.{ext}"
            file_path = upload_dir / "profiles" / id_doc_filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(id_document.file, buffer)
            logger.info(f"[REQUESTER_ONBOARDING] Saved ID document: {id_doc_filename}")
        
        # Update user document
        user_update = {
            "full_name": full_name,
            "phone": phone,
            "address": address,
            "gender": gender,
            "birthday": birthday,
            "id_number": id_number,
            "bio": bio,
            "bank_name": bank_name,
            "account_number": account_number,
            "account_holder": account_holder,
        }
        
        # Only add profile picture if we have one
        if profile_pic_filename and profile_pic_filename != current_user.profile_picture:
            user_update["profile_picture"] = profile_pic_filename
        
        # Only add ID document if we have one
        if id_doc_filename:
            user_update["id_document"] = id_doc_filename
        
        # Remove empty fields but keep non-empty strings
        user_update = {k: v for k, v in user_update.items() if v is not None and v != ""}
        
        logger.info(f"[REQUESTER_ONBOARDING] About to update user document with: {user_update}")
        if user_update:
            result = await db.users.update_one({"id": current_user.id}, {"$set": user_update})
            logger.info(f"[REQUESTER_ONBOARDING] Updated user document: {user_update}")
            logger.info(f"[REQUESTER_ONBOARDING] User update result: {result.modified_count} documents modified")
        else:
            logger.info(f"[REQUESTER_ONBOARDING] No user fields to update")
        
        # Update requester profile (job categories)
        job_categories_list = [c.strip() for c in job_categories.split(",") if c.strip()] if job_categories else []
        requester_update = {
            "job_categories": job_categories_list,
        }
        
        # Remove empty fields but keep non-empty strings and non-empty lists
        requester_update = {k: v for k, v in requester_update.items() if v is not None and v != "" and v != []}
        
        logger.info(f"[REQUESTER_ONBOARDING] About to update requester profile with: {requester_update}")
        if requester_update:
            result = await db.requester_profiles.update_one(
                {"user_id": current_user.id},
                {"$set": requester_update},
                upsert=True
            )
            logger.info(f"[REQUESTER_ONBOARDING] Updated requester profile: {requester_update}")
            logger.info(f"[REQUESTER_ONBOARDING] Requester update result: {result.modified_count} documents modified, upserted: {result.upserted_id}")
        else:
            logger.info(f"[REQUESTER_ONBOARDING] No requester fields to update")
        
        # Verify the data was saved by fetching it back
        user_doc = await db.users.find_one({"id": current_user.id})
        requester_profile = await db.requester_profiles.find_one({"user_id": current_user.id})
        
        # Clean documents for logging (remove MongoDB-specific fields)
        clean_user_doc = {k: v for k, v in user_doc.items() if k != "_id"}
        clean_requester_profile = {k: v for k, v in requester_profile.items() if k != "_id"} if requester_profile else None
        
        logger.info(f"[REQUESTER_ONBOARDING] Verification - User document: {clean_user_doc}")
        logger.info(f"[REQUESTER_ONBOARDING] Verification - Requester profile: {clean_requester_profile}")
        
        return {"message": "Requester onboarding complete"}
        
    except Exception as e:
        logger.error(f"[REQUESTER_ONBOARDING] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save requester onboarding data: {str(e)}")

@app.get("/api/profile/worker/{user_id}")
async def get_worker_profile(user_id: str, current_user: UserResponse = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id, "role": UserRole.WORKER})
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker_profile = await db.worker_profiles.find_one({"user_id": user_id})
    # Merge user and worker profile fields
    user_response_data = {k: v for k, v in user.items() if k != "password"}
    if worker_profile:
        user_response_data.update(worker_profile)
    return user_response_data

# Messaging Routes
@app.post("/api/messages")
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

@app.get("/api/messages/{other_user_id}")
async def get_messages(other_user_id: str, current_user: UserResponse = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": current_user.id}
        ]
    }).sort("created_at", 1).to_list(100)
    
    return [MessageResponse(**msg) for msg in messages]

# Test endpoint to create sample jobs
@app.post("/api/test/create-jobs")
async def create_test_jobs():
    """Create comprehensive test jobs covering various skill categories"""
    test_jobs = [
        # Tutoring & Education
        {
            "id": str(uuid.uuid4()),
            "title": "Math Tutoring for Grade 10 Student",
            "description": "Need a tutor to help with mathematics, specifically algebra and geometry",
            "category": "Tutoring",
            "budget": 250.0,
            "location": "Sandhurst, Sandton",
            "urgency": "normal",
            "requirements": "Experience teaching high school math",
            "requester_id": "test-requester-1",
            "requester_name": "John Smith",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "English Language Lessons",
            "description": "Need help improving English speaking and writing skills",
            "category": "Tutoring",
            "budget": 200.0,
            "location": "Melrose, Sandton",
            "urgency": "normal",
            "requirements": "Native English speaker or certified ESL teacher",
            "requester_id": "test-requester-2",
            "requester_name": "Sarah Johnson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Photography & Media
        {
            "id": str(uuid.uuid4()),
            "title": "Corporate Event Photography",
            "description": "Need professional photos for company annual meeting",
            "category": "Photography",
            "budget": 800.0,
            "location": "Bryanston, Sandton",
            "urgency": "urgent",
            "requirements": "Professional camera equipment and portfolio",
            "requester_id": "test-requester-3",
            "requester_name": "Mike Wilson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Wedding Photography Package",
            "description": "Need photographer for wedding ceremony and reception",
            "category": "Photography",
            "budget": 1500.0,
            "location": "Rosebank, Sandton",
            "urgency": "normal",
            "requirements": "Wedding photography experience and portfolio",
            "requester_id": "test-requester-4",
            "requester_name": "Lisa Brown",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Coaching & Personal Development
        {
            "id": str(uuid.uuid4()),
            "title": "Life Coaching Sessions",
            "description": "Looking for a life coach to help with career transition",
            "category": "Coaching",
            "budget": 400.0,
            "location": "Fourways, Sandton",
            "urgency": "flexible",
            "requirements": "Certified life coach with references",
            "requester_id": "test-requester-5",
            "requester_name": "David Lee",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Freelancing & Digital Services
        {
            "id": str(uuid.uuid4()),
            "title": "Website Design for Small Business",
            "description": "Need a modern, responsive website for my restaurant",
            "category": "Freelancing",
            "budget": 1200.0,
            "location": "Sandton Central",
            "urgency": "normal",
            "requirements": "Portfolio of restaurant websites, responsive design skills",
            "requester_id": "test-requester-6",
            "requester_name": "Maria Garcia",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Social Media Management",
            "description": "Need help managing Instagram and Facebook for my boutique",
            "category": "Freelancing",
            "budget": 600.0,
            "location": "Melrose Arch",
            "urgency": "flexible",
            "requirements": "Experience with fashion brands, content creation skills",
            "requester_id": "test-requester-7",
            "requester_name": "Emma Thompson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Physical Services
        {
            "id": str(uuid.uuid4()),
            "title": "House Cleaning Service",
            "description": "Need weekly cleaning for 3-bedroom house",
            "category": "House Cleaning",
            "budget": 300.0,
            "location": "Lonehill, Sandton",
            "urgency": "normal",
            "requirements": "Reliable, references, own cleaning supplies",
            "requester_id": "test-requester-8",
            "requester_name": "Robert Chen",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Office Cleaning Service",
            "description": "Need daily cleaning for small office space",
            "category": "Cleaning",
            "budget": 250.0,
            "location": "Sandton Central",
            "urgency": "normal",
            "requirements": "Professional cleaning experience, references",
            "requester_id": "test-requester-12",
            "requester_name": "Peter Wilson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Childcare for Weekday Evenings",
            "description": "Need reliable babysitter for 2 children (ages 3 and 6)",
            "category": "Childcare",
            "budget": 180.0,
            "location": "Fourways, Sandton",
            "urgency": "flexible",
            "requirements": "Experience with young children, first aid certified preferred",
            "requester_id": "test-requester-13",
            "requester_name": "Anna Davis",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Weekend Childcare",
            "description": "Need babysitter for Saturday afternoon",
            "category": "Childcare",
            "budget": 150.0,
            "location": "Melrose, Sandton",
            "urgency": "normal",
            "requirements": "Reliable, patient with children",
            "requester_id": "test-requester-14",
            "requester_name": "Michael Brown",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Interior House Painting",
            "description": "Need to paint living room and kitchen",
            "category": "Painting",
            "budget": 800.0,
            "location": "Dainfern, Sandton",
            "urgency": "flexible",
            "requirements": "Professional painter, own equipment",
            "requester_id": "test-requester-9",
            "requester_name": "Jennifer White",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Moving & Manual Labor
        {
            "id": str(uuid.uuid4()),
            "title": "Furniture Moving Assistance",
            "description": "Need help moving heavy furniture to new apartment",
            "category": "Moving Assistance",
            "budget": 400.0,
            "location": "Morningside, Sandton",
            "urgency": "urgent",
            "requirements": "Strong and reliable, own transport",
            "requester_id": "test-requester-10",
            "requester_name": "Thomas Anderson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Garden Maintenance & Landscaping",
            "description": "Need help with garden maintenance and lawn care",
            "category": "Yard Work",
            "budget": 350.0,
            "location": "Bryanston, Sandton",
            "urgency": "flexible",
            "requirements": "Basic gardening knowledge, own tools",
            "requester_id": "test-requester-11",
            "requester_name": "Amanda Davis",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Added new test jobs for Cleaning and Childcare
        {
            "id": str(uuid.uuid4()),
            "title": "Office Cleaning Service",
            "description": "Need daily cleaning for small office space",
            "category": "Cleaning",
            "budget": 250.0,
            "location": "Sandton Central",
            "urgency": "normal",
            "requirements": "Professional cleaning experience, references",
            "requester_id": "test-requester-12",
            "requester_name": "Peter Wilson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Childcare for Weekday Evenings",
            "description": "Need reliable babysitter for 2 children (ages 3 and 6)",
            "category": "Childcare",
            "budget": 180.0,
            "location": "Fourways, Sandton",
            "urgency": "flexible",
            "requirements": "Experience with young children, first aid certified preferred",
            "requester_id": "test-requester-13",
            "requester_name": "Anna Davis",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Weekend Childcare",
            "description": "Need babysitter for Saturday afternoon",
            "category": "Childcare",
            "budget": 150.0,
            "location": "Melrose, Sandton",
            "urgency": "normal",
            "requirements": "Reliable, patient with children",
            "requester_id": "test-requester-14",
            "requester_name": "Michael Brown",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        # Additional location-diverse jobs for testing smart filtering
        {
            "id": str(uuid.uuid4()),
            "title": "Garden Maintenance - Rosebank",
            "description": "Weekly garden maintenance and lawn care",
            "category": "Yard Work",
            "budget": 300.0,
            "location": "Rosebank, Johannesburg",
            "urgency": "normal",
            "requirements": "Garden maintenance experience, own tools",
            "requester_id": "test-requester-15",
            "requester_name": "Sarah Johnson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "House Painting - Bryanston",
            "description": "Paint interior walls and ceilings",
            "category": "Painting",
            "budget": 800.0,
            "location": "Bryanston, Sandton",
            "urgency": "urgent",
            "requirements": "Professional painter, references required",
            "requester_id": "test-requester-16",
            "requester_name": "David Thompson",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Moving Assistance - Midrand",
            "description": "Help move furniture from 2-bedroom apartment",
            "category": "Moving Assistance",
            "budget": 400.0,
            "location": "Midrand, Johannesburg",
            "urgency": "normal",
            "requirements": "Strong, careful with furniture",
            "requester_id": "test-requester-17",
            "requester_name": "Lisa Chen",
            "created_at": datetime.utcnow(),
            "status": "open",
            "applications_count": 0
        }
    ]
    
    for job in test_jobs:
        await db.jobs.insert_one(job)
    
    return {"message": f"Created {len(test_jobs)} test jobs"}

# Skill to Category Mapping for better job recommendations
SKILL_CATEGORY_MAPPING = {
    # Tutoring & Education
    "tutoring": ["Tutoring"],
    "teaching": ["Tutoring"],
    "education": ["Tutoring"],
    "math": ["Tutoring"],
    "english": ["Tutoring"],
    "science": ["Tutoring"],
    "languages": ["Tutoring"],
    
    # Photography & Media
    "photography": ["Photography"],
    "photo": ["Photography"],
    "camera": ["Photography"],
    "videography": ["Photography"],
    "video": ["Photography"],
    "media": ["Photography", "Freelancing"],
    
    # Coaching & Personal Development
    "coaching": ["Coaching"],
    "mentoring": ["Coaching"],
    "life coach": ["Coaching"],
    "career coach": ["Coaching"],
    "personal development": ["Coaching"],
    
    # Freelancing & Digital Services
    "freelancing": ["Freelancing"],
    "website design": ["Freelancing"],
    "web design": ["Freelancing"],
    "graphic design": ["Freelancing"],
    "social media": ["Freelancing"],
    "digital marketing": ["Freelancing"],
    "content creation": ["Freelancing"],
    "seo": ["Freelancing"],
    "programming": ["Freelancing"],
    "coding": ["Freelancing"],
    "app development": ["Freelancing"],
    "software": ["Freelancing"],
    
    # Physical Services
    "house cleaning": ["House Cleaning"],
    "cleaning": ["Cleaning", "House Cleaning"],
    "domestic": ["House Cleaning"],
    "childcare": ["Childcare"],
    "babysitting": ["Childcare"],
    "child care": ["Childcare"],
    "painting": ["Painting"],
    "decorating": ["Painting"],
    "moving": ["Moving Assistance"],
    "furniture": ["Moving Assistance"],
    "yard work": ["Yard Work"],
    "gardening": ["Yard Work"],
    "landscaping": ["Yard Work"],
    "maintenance": ["House Cleaning", "Yard Work", "Painting"]
}

def map_skills_to_categories(skills):
    """Map user skills to job categories for better recommendations"""
    if not skills:
        return []
    
    mapped_categories = set()
    for skill in skills:
        skill_lower = skill.lower()
        for skill_key, categories in SKILL_CATEGORY_MAPPING.items():
            if skill_key in skill_lower or skill_lower in skill_key:
                mapped_categories.update(categories)
    
    return list(mapped_categories)

async def smart_sort_jobs(jobs, user):
    """Smart sorting of jobs based on user preferences and location"""
    if not jobs:
        return jobs
    
    # Get user's preferred work areas and location preferences
    user_location = user.city or ""
    user_address = user.address or ""
    
    # Create a scoring system for each job
    scored_jobs = []
    for job in jobs:
        score = 0
        
        # Location relevance (highest priority)
        if user_location and user_location.lower() in job.get("location", "").lower():
            score += 100  # Same city
        elif user_address and any(area.lower() in job.get("location", "").lower() for area in user_address.split()):
            score += 80   # Same area/suburb
        
        # Skill match relevance
        if user.skills:
            user_skills_lower = [s.lower() for s in user.skills]
            job_category_lower = job.get("category", "").lower()
            if any(skill in job_category_lower for skill in user_skills_lower):
                score += 50
        
        # Job urgency (urgent jobs get priority)
        if job.get("urgency") == "urgent":
            score += 30
        
        # Recent jobs get slight priority
        if job.get("created_at"):
            days_old = (datetime.utcnow() - job["created_at"]).days
            if days_old <= 1:
                score += 20
            elif days_old <= 3:
                score += 10
        
        # Budget relevance (jobs within user's typical range)
        if hasattr(user, 'hourly_rate') and user.hourly_rate:
            job_budget = job.get("budget", 0)
            if job_budget >= user.hourly_rate * 0.8 and job_budget <= user.hourly_rate * 1.5:
                score += 15
        
        scored_jobs.append((job, score))
    
    # Sort by score (highest first) and return only the job objects
    scored_jobs.sort(key=lambda x: x[1], reverse=True)
    return [job for job, score in scored_jobs]

@app.get("/api/test/debug-user/{user_id}")
async def debug_user_data(user_id: str):
    """Debug endpoint to check user and worker profile data"""
    try:
        user_doc = await db.users.find_one({"id": user_id})
        worker_profile = await db.worker_profiles.find_one({"user_id": user_id})
        
        return {
            "user_document": user_doc,
            "worker_profile": worker_profile,
            "user_id": user_id
        }
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/test/clear-applications")
async def clear_test_applications():
    """Clear all test applications from the database"""
    try:
        # Delete all applications
        result = await db.job_applications.delete_many({})
        logger.info(f"Cleared {result.deleted_count} applications from database")
        
        # Reset application counts on jobs
        await db.jobs.update_many({}, {"$set": {"applications_count": 0}})
        logger.info("Reset application counts on all jobs")
        
        return {"message": f"Cleared {result.deleted_count} applications and reset job application counts"}
    except Exception as e:
        logger.error(f"Error clearing applications: {e}")
        return {"error": str(e)}

@app.get("/api/test/applications-count")
async def get_applications_count():
    """Get count of applications in database"""
    try:
        count = await db.job_applications.count_documents({})
        return {"applications_count": count}
    except Exception as e:
        return {"error": str(e)}

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
