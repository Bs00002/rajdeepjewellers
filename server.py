import os
import json
import time
import secrets
import hashlib
import threading
from typing import Optional, List
from fastapi import FastAPI, Request, Response, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Rajdeep Jewellers Backend & CMS", docs_url=None, redoc_url=None)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
READONLY_DATA_FILE = os.path.join(BASE_DIR, "data", "db.json")
VERCEL_TMP_DATA_FILE = "/tmp/db.json"

UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except (OSError, PermissionError):
    UPLOADS_DIR = "/tmp/uploads"
    os.makedirs(UPLOADS_DIR, exist_ok=True)

# Thread lock for atomic JSON database writes
db_lock = threading.Lock()

import hmac
import base64

# Active sessions secret and duration
SESSION_COOKIE_NAME = "rajdeep_admin_session"
SESSION_DURATION = 86400 * 7  # 7 days
SESSION_SECRET_KEY = os.environ.get("SESSION_SECRET", "rajdeep_luxury_auth_key_2026_bhachau").encode("utf-8")

def create_session_token(username: str) -> str:
    ts = str(int(time.time()))
    payload = f"{username}|{ts}"
    sig = hmac.new(SESSION_SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    token_str = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(token_str.encode("utf-8")).decode("utf-8")

def verify_session_token(token: str) -> Optional[str]:
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = raw.split(":")
        if len(parts) != 2:
            return None
        payload, sig = parts[0], parts[1]
        expected_sig = hmac.new(SESSION_SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        username, ts_str = payload.split("|")
        ts = int(ts_str)
        if time.time() - ts > SESSION_DURATION:
            return None
        return username
    except Exception:
        return None

def get_data_file_path():
    is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        if not os.path.exists(VERCEL_TMP_DATA_FILE) and os.path.exists(READONLY_DATA_FILE):
            import shutil
            try:
                shutil.copyfile(READONLY_DATA_FILE, VERCEL_TMP_DATA_FILE)
            except Exception:
                return READONLY_DATA_FILE
        if os.path.exists(VERCEL_TMP_DATA_FILE):
            return VERCEL_TMP_DATA_FILE
    return READONLY_DATA_FILE

def load_db():
    with db_lock:
        data_path = get_data_file_path()
        if not os.path.exists(data_path):
            if os.path.exists(READONLY_DATA_FILE):
                data_path = READONLY_DATA_FILE
            else:
                raise RuntimeError("Database file not found.")
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)

def save_db(data):
    with db_lock:
        data_path = get_data_file_path()
        try:
            temp_file = data_path + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(temp_file, data_path)
        except (OSError, PermissionError):
            temp_file = VERCEL_TMP_DATA_FILE + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(temp_file, VERCEL_TMP_DATA_FILE)

# Auth helper
def get_session_token(request: Request) -> Optional[str]:
    # Check cookie first, then Authorization header
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token

def require_admin(request: Request):
    token = get_session_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    username = verify_session_token(token)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
    return username

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class CollectionModel(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    image: str
    link: Optional[str] = ""
    display_order: Optional[int] = 0
    is_published: Optional[bool] = True

class MediaModel(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    type: str  # Image, Video, Reel, Promotional, Showroom, Customer Moment
    category: Optional[str] = "all"
    media_url: str
    poster_url: Optional[str] = ""
    meta: Optional[str] = ""
    display_order: Optional[int] = 0
    is_published: Optional[bool] = True

# --- API ROUTES ---

@app.post("/api/login")
async def login(req: LoginRequest, response: Response):
    db = load_db()
    admin_cfg = db.get("admin_user", {})
    expected_user = admin_cfg.get("username", "Rajdeep Gold Palace")
    salt = admin_cfg.get("salt", "rajdeep_luxury_salt_2026")
    expected_hash = admin_cfg.get("password_hash")

    # Hash input
    provided_hash = hashlib.sha256((req.password + salt).encode("utf-8")).hexdigest()

    if req.username.strip() != expected_user or provided_hash != expected_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_session_token(expected_user)

    # Set secure cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_DURATION,
        httponly=True,
        samesite="lax",
        path="/"
    )
    return {"status": "success", "username": expected_user, "token": token}

@app.post("/api/logout")
async def logout(request: Request, response: Response):
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}

@app.get("/api/session")
async def check_session(request: Request):
    token = get_session_token(request)
    if token:
        username = verify_session_token(token)
        if username:
            return {"authenticated": True, "username": username}
    return {"authenticated": False}

@app.get("/api/stats")
async def get_stats(user: str = Depends(require_admin)):
    db = load_db()
    cols = db.get("collections", [])
    media = db.get("media_items", [])
    pub_media = sum(1 for m in media if m.get("is_published", True))
    return {
        "total_collections": len(cols),
        "total_media": len(media),
        "published_media": pub_media
    }

# --- COLLECTIONS ENDPOINTS ---

@app.get("/api/collections")
async def get_public_collections():
    db = load_db()
    cols = [c for c in db.get("collections", []) if c.get("is_published", True)]
    cols.sort(key=lambda x: x.get("display_order", 0))
    return cols

@app.get("/api/admin/collections")
async def get_admin_collections(user: str = Depends(require_admin)):
    db = load_db()
    cols = db.get("collections", [])
    cols.sort(key=lambda x: x.get("display_order", 0))
    return cols

@app.post("/api/admin/collections")
async def create_collection(col: CollectionModel, user: str = Depends(require_admin)):
    db = load_db()
    cols = db.get("collections", [])
    new_id = f"col_{int(time.time()*1000)}"
    col_dict = col.dict()
    col_dict["id"] = new_id
    if not col_dict.get("link"):
        slug = col_dict["name"].lower().replace(" ", "-")
        col_dict["link"] = f"collections/{slug}/"
    cols.append(col_dict)
    db["collections"] = cols
    save_db(db)
    return {"status": "success", "collection": col_dict}

@app.put("/api/admin/collections/{col_id}")
async def update_collection(col_id: str, col: CollectionModel, user: str = Depends(require_admin)):
    db = load_db()
    cols = db.get("collections", [])
    found = False
    for i, c in enumerate(cols):
        if c.get("id") == col_id:
            updated = col.dict()
            updated["id"] = col_id
            if not updated.get("link"):
                updated["link"] = c.get("link", f"collections/{col.name.lower().replace(' ', '-')}/")
            cols[i] = updated
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Collection not found")
    db["collections"] = cols
    save_db(db)
    return {"status": "success", "collection": updated}

@app.delete("/api/admin/collections/{col_id}")
async def delete_collection(col_id: str, user: str = Depends(require_admin)):
    db = load_db()
    cols = db.get("collections", [])
    orig_len = len(cols)
    cols = [c for c in cols if c.get("id") != col_id]
    if len(cols) == orig_len:
        raise HTTPException(status_code=404, detail="Collection not found")
    db["collections"] = cols
    save_db(db)
    return {"status": "deleted", "id": col_id}

# --- MEDIA ENDPOINTS ---

@app.get("/api/media")
async def get_public_media():
    db = load_db()
    media = [m for m in db.get("media_items", []) if m.get("is_published", True)]
    media.sort(key=lambda x: x.get("display_order", 0))
    return media

@app.get("/api/admin/media")
async def get_admin_media(user: str = Depends(require_admin)):
    db = load_db()
    media = db.get("media_items", [])
    media.sort(key=lambda x: x.get("display_order", 0))
    return media

@app.post("/api/admin/media")
async def create_media(med: MediaModel, user: str = Depends(require_admin)):
    db = load_db()
    media = db.get("media_items", [])
    new_id = f"med_{int(time.time()*1000)}"
    med_dict = med.dict()
    med_dict["id"] = new_id
    media.append(med_dict)
    db["media_items"] = media
    save_db(db)
    return {"status": "success", "media": med_dict}

@app.put("/api/admin/media/{med_id}")
async def update_media(med_id: str, med: MediaModel, user: str = Depends(require_admin)):
    db = load_db()
    media = db.get("media_items", [])
    found = False
    for i, m in enumerate(media):
        if m.get("id") == med_id:
            updated = med.dict()
            updated["id"] = med_id
            media[i] = updated
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Media item not found")
    db["media_items"] = media
    save_db(db)
    return {"status": "success", "media": updated}

@app.delete("/api/admin/media/{med_id}")
async def delete_media(med_id: str, user: str = Depends(require_admin)):
    db = load_db()
    media = db.get("media_items", [])
    orig_len = len(media)
    media = [m for m in media if m.get("id") != med_id]
    if len(media) == orig_len:
        raise HTTPException(status_code=404, detail="Media item not found")
    db["media_items"] = media
    save_db(db)
    return {"status": "deleted", "id": med_id}

# --- FILE UPLOAD ENDPOINT ---

@app.post("/api/admin/upload")
async def upload_file(file: UploadFile = File(...), user: str = Depends(require_admin)):
    try:
        # Validate file extension
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"]
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload JPG, PNG, WEBP, or MP4.")

        clean_name = f"upload_{int(time.time()*1000)}{ext}"
        target_path = os.path.join(UPLOADS_DIR, clean_name)

        contents = await file.read()
        with open(target_path, "wb") as f:
            f.write(contents)

        rel_path = f"uploads/{clean_name}"
        return {"status": "success", "url": rel_path, "filename": clean_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# --- ADMIN PAGE ROUTE ---

@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/{path:path}", response_class=HTMLResponse)
async def admin_page(request: Request, path: str = ""):
    token = get_session_token(request)
    is_authed = bool(token and verify_session_token(token))
    
    # If unauthenticated and trying to access sub-paths like /admin/collections or /admin/media, redirect to /admin
    if path and not is_authed:
        return RedirectResponse(url="/admin", status_code=302)
        
    admin_file = os.path.join(BASE_DIR, "admin", "index.html")
    if not os.path.exists(admin_file):
        raise HTTPException(status_code=404, detail="Admin panel HTML not found")
    with open(admin_file, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

# --- PUBLIC ROUTE ALIASES ---
@app.get("/collections")
async def collections_redirect():
    return RedirectResponse(url="/collections.html", status_code=301)

@app.get("/media")
async def media_redirect():
    return RedirectResponse(url="/media.html", status_code=301)

# Static files
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
