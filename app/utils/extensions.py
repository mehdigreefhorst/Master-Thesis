# app/extensions.py
from flask_pymongo import PyMongo

mongo = PyMongo()   # unbound here, bound in start_app()