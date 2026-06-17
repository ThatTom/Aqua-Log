from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TankPlant
from app.schemas.schemas import TankPlantCreate, TankPlantOut
from app.services.species import species_service

router = APIRouter()

@router.get("/{tank_id}/plants", response_model=list[TankPlantOut])
def list_plants(tank_id: str, db: Session = Depends(get_db)):
    return db.query(TankPlant).filter_by(tank_id=tank_id).all()

@router.post("/{tank_id}/plants", response_model=TankPlantOut, status_code=201)
def add_plant(tank_id: str, body: TankPlantCreate, db: Session = Depends(get_db)):
    if not species_service.validate_slug(body.species_slug):
        raise HTTPException(422, f"Unknown species slug: {body.species_slug}")
    row = TankPlant(tank_id=tank_id, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.delete("/{tank_id}/plants/{plant_id}", status_code=204)
def remove_plant(tank_id: str, plant_id: str, db: Session = Depends(get_db)):
    row = db.query(TankPlant).filter_by(id=plant_id, tank_id=tank_id).first()
    if not row: raise HTTPException(404, "Plant entry not found")
    db.delete(row); db.commit()
