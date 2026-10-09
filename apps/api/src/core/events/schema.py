"""Create the core schema when the optional pgvector extension is unavailable."""
import logging

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import SQLModel


def bootstrap_schema(connection, *, create_tables=True):
    vector_available = False
    if connection.dialect.name == 'postgresql':
        try:
            # An optional extension failure must not abort the outer DDL transaction.
            with connection.begin_nested():
                connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
            vector_available = True
        except SQLAlchemyError:
            logging.warning('pgvector is unavailable; course chatbot embeddings are disabled.')
    if create_tables:
        tables = [table for table in SQLModel.metadata.sorted_tables
                  if vector_available or table.name != 'course_embedding']
        SQLModel.metadata.create_all(connection, tables=tables)
