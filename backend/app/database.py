import enum

from sqlalchemy import Enum, create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def pg_enum(enum_class: type[enum.Enum], name: str, **kwargs):
    return Enum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
        **kwargs,
    )


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
