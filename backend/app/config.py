from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev-secret-key-change-in-production"
    database_url: str = "postgresql://cro:cro_secret_2024@localhost:5434/stock_cro"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Conseil Regional Ouest <noreply@cro.cm>"
    email_dev_mode: bool = True
    frontend_url: str = "http://localhost:5181"

    verification_code_expire_minutes: int = 15
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 5

    class Config:
        env_file = ".env"


settings = Settings()
