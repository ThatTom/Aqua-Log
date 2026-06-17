import urllib.request
import urllib.error
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.services.species import species_service
import yaml

REQUIRED_FIELDS = ("slug", "type", "common_name", "latin_name")
VALID_TYPES = {"fish", "plant", "invertebrate", "amphibian"}

router = APIRouter()


def _parse_and_save(contents: bytes) -> dict:
    try:
        data = yaml.safe_load(contents)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="YAML root must be a mapping")

    missing = [f for f in REQUIRED_FIELDS if not data.get(f)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    species_type = data["type"]
    if species_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of: {', '.join(sorted(VALID_TYPES))}")

    species_service.save_yaml(data["slug"], species_type, contents)
    species_service.load()
    return {"ok": True, "slug": data["slug"], "common_name": data["common_name"], "type": species_type}


@router.get("/")
def list_species(type: str | None = Query(None), search: str | None = Query(None)):
    results = species_service.all()
    if type:
        results = [s for s in results if s.get("type") == type]
    if search:
        q = search.lower()
        results = [s for s in results if q in s.get("common_name", "").lower() or q in s.get("slug", "").lower() or q in s.get("latin_name", "").lower()]
    return results


@router.post("/upload")
async def upload_species(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".yaml", ".yml")):
        raise HTTPException(status_code=400, detail="File must be a .yaml or .yml file")
    contents = await file.read()
    return _parse_and_save(contents)


class UrlImportBody(BaseModel):
    url: str


@router.post("/upload-url")
async def upload_species_from_url(body: UrlImportBody):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    # Convert GitHub blob URLs to raw URLs automatically
    if "github.com" in url and "/blob/" in url:
        url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AquaLog/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            contents = response.read()
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"HTTP {e.code} fetching URL: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    return _parse_and_save(contents)
