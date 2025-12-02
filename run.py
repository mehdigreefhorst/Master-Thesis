import os
from datetime import timedelta, datetime

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_pymongo import PyMongo

from app.routes.scraper_routes import scraper_bp
from app.routes.user_routes import user_bp
from app.routes.auth_routes import auth_bp
from app.routes.scraper_cluster_routes import scraper_cluster_bp
from app.routes.clustering_routes import clustering_bp
from app.routes.experiment_routes import experiment_bp
from app.routes.visualization_routes import visualization_bp
from app.routes.models_routes import models_bp
from app.routes.category_info_routes import category_info_bp

from app.utils.configuration import get_env_variable, is_production_environment
from app.utils.extensions import mongo
from app.utils.logging_config import LoggingConfig


class CustomJSONEncoder(DefaultJSONProvider):
    """Custom serialization for the 'jsonify' function."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def start_app():
    app = Flask(__name__)

    # Initialize centralized logging system
    # This MUST be done before any other configuration
    LoggingConfig(app)

    # Configuration can be added here
    mongo_db_url = os.getenv("MONGODB_URL").replace("<db_password>", os.getenv("MONGODB_PASSWORD"))
    app.config["MONGO_URI"] = mongo_db_url
    mongo.init_app(app)  # bind to the real app

    app.config["JWT_SECRET_KEY"] = get_env_variable("JWT_SECRET_KEY", str)
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=60)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(minutes=1200)

    JWTManager(app)

    CORS(
        app,
        origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://www.viberesearch.com"],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"]
    )

    app.url_map.strict_slashes = False

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(scraper_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(scraper_cluster_bp)
    app.register_blueprint(clustering_bp)
    app.register_blueprint(experiment_bp)
    app.register_blueprint(visualization_bp)
    app.register_blueprint(models_bp)
    app.register_blueprint(category_info_bp)

    # Register custom JSON serializer
    app.json = CustomJSONEncoder(app)

    # Get port from environment variable or default to 5000
    port = get_env_variable('PORT', int, 5001)

    # We should only call 'app.run' in a development environment
    if not is_production_environment():
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True,
        )

    return app


# This part will never be executed in a production environment, due to the way we use GUnicorn. It will get executed in a normal environment,
# because then this file is simply executed.
if __name__ == '__main__':
    start_app()
