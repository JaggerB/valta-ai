from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, JSON
from sqlalchemy.sql import func
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)

    # Processing status
    status = Column(String, default="uploaded")  # uploaded, processing, completed, failed
    processing_progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    # Extracted content
    raw_text = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)
    document_metadata = Column(JSON, nullable=True)

    # Financial metrics extracted
    extracted_metrics = Column(JSON, nullable=True)

    # Additional custom data (for startup metrics, commentary, etc.)
    custom_data = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_id = Column(String, nullable=True)  # Pinecone vector ID
    page_number = Column(Integer, nullable=True)
    section_title = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=True)  # None for multi-document queries
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    sources = Column(JSON, nullable=True)  # Source citations
    confidence_score = Column(Float, nullable=True)
    processing_time = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())