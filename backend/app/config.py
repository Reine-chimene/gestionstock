from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev-secret-key-change-in-production"
    database_url: str = "postgresql://cro:cro_secret_2024@localhost:5434/stock_cro"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    smtp_host: str = "smtp.hostinger.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Conseil Regional Ouest <noreply@cro.cm>"
    smtp_use_ssl: bool = False
    email_dev_mode: bool = True
    require_email_verification: bool = False
    frontend_url: str = "http://localhost:5181"

    verification_code_expire_minutes: int = 15
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 4

    # Alertes automatiques
    alert_email_recipients: str = ""  # emails separes par virgule, vide = admins/gestionnaires
    alert_sms_recipients: str = ""  # numeros +237..., separes par virgule
    alert_check_interval_hours: int = 6

    # Twilio SMS (optionnel)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Chemin logo pour PDF (optionnel)
    logo_path: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
