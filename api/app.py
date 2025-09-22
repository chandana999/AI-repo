# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import tempfile
import asyncio
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Import aimakerspace utilities
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.openai_utils.chatmodel import ChatOpenAI

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="ClearVitals API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for document storage
document_chunks = []
vector_db = None
current_document = None

class ChatRequest(BaseModel):
    message: str
    api_key: str
    model: str = "gpt-4o-mini"

class PDFUploadRequest(BaseModel):
    api_key: str

class PDFStatus(BaseModel):
    pdf_loaded: bool
    pdf_name: Optional[str] = None
    chunks_count: int = 0
    embeddings_available: bool = False

@app.get("/")
async def root():
    return {"message": "ClearVitals API is running!", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "ClearVitals API is running!"}

@app.get("/api/pdf-status")
async def get_pdf_status():
    return PDFStatus(
        pdf_loaded=current_document is not None,
        pdf_name=current_document,
        chunks_count=len(document_chunks),
        embeddings_available=vector_db is not None
    )

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), api_key: str = Form(...)):
    global document_chunks, vector_db, current_document
    
    tmp_file_path = None
    try:
        # Set environment variable for OpenAI API key
        os.environ["OPENAI_API_KEY"] = api_key
        
        # Read file content first
        content = await file.read()
        
        # Create temporary file with proper Windows handling
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', mode='wb') as tmp_file:
            tmp_file.write(content)
            tmp_file.flush()
            tmp_file_path = tmp_file.name
        
        # Close the file handle before processing
        del tmp_file
        
        # Load PDF using aimakerspace PDFLoader
        pdf_loader = PDFLoader(tmp_file_path)
        documents = pdf_loader.load_documents()
        
        if not documents or not documents[0].strip():
            raise HTTPException(status_code=400, detail="No text extracted from PDF")
        
        pdf_text = documents[0]
        
        # Split text into chunks
        text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        document_chunks = text_splitter.split(pdf_text)
        
        # Create vector database
        embedding_model = EmbeddingModel()
        vector_db = VectorDatabase(embedding_model)
        
        # Process chunks in batches
        batch_size = 3
        for i in range(0, len(document_chunks), batch_size):
            batch = document_chunks[i:i + batch_size]
            try:
                batch_embeddings = embedding_model.get_embeddings(batch)
                for chunk, embedding in zip(batch, batch_embeddings):
                    vector_db.insert(chunk, embedding)
            except Exception as e:
                print(f"Embedding generation failed: {e}")
                vector_db = None
                break
        
        current_document = file.filename
        
        return {
            "message": f"PDF processed successfully. Created {len(document_chunks)} chunks.",
            "chunks_count": len(document_chunks),
            "embeddings_available": vector_db is not None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
    finally:
        # Clean up temp file with proper error handling
        if tmp_file_path and os.path.exists(tmp_file_path):
            try:
                os.unlink(tmp_file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {tmp_file_path}: {e}")

@app.post("/api/clear-pdf")
async def clear_pdf():
    global document_chunks, vector_db, current_document
    
    document_chunks = []
    vector_db = None
    current_document = None
    
    return {"message": "PDF cleared successfully"}

@app.post("/api/rag-chat")
async def rag_chat(request: ChatRequest):
    try:
        # Set environment variable for OpenAI API key
        os.environ["OPENAI_API_KEY"] = request.api_key
        
        if not document_chunks:
            return {"error": "No document loaded. Please upload a PDF first."}
        
        # Search for relevant chunks
        if vector_db is not None:
            relevant_chunks = vector_db.search_by_text(request.message, k=3, return_as_text=True)
        else:
            # Fallback to simple text search
            query_words = request.message.lower().split()
            relevant_chunks = []
            for chunk in document_chunks:
                chunk_lower = chunk.lower()
                if any(word in chunk_lower for word in query_words):
                    relevant_chunks.append(chunk)
            relevant_chunks = relevant_chunks[:3]
        
        if not relevant_chunks:
            return {"error": "No relevant information found in the document."}
        
        # Create context
        context = "\n\n".join(relevant_chunks)
        
        # Create system message
        system_message = f"""You are a medical AI assistant specialized in analyzing medical reports and lab results. 

CRITICAL MEDICAL SAFETY RULES:
1. ONLY use information from the provided medical document context
2. If the answer is not in the context, say "I cannot find that information in the provided medical report"
3. Be specific and cite relevant parts of the document when possible
4. NEVER make up or hallucinate medical information
5. ALWAYS recommend consulting with a healthcare provider for medical decisions
6. Provide clear, easy-to-understand explanations of medical terms
7. Focus on factual information from the document
8. If discussing abnormal values, explain their significance clearly
9. When formatting lists or emphasis, use proper markdown formatting instead of asterisks

Medical Document Context:
{context}

User Question: {request.message}"""
        
        # Get AI response
        chat_model = ChatOpenAI(model_name=request.model)
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": request.message}
        ]
        
        ai_response = chat_model.run(messages, text_only=True)
        
        # Clean up asterisks from the response
        ai_response = ai_response.replace('**', '').replace('*', '')
        
        return StreamingResponse(
            iter([ai_response]),
            media_type="text/plain"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.post("/api/chat")
async def regular_chat(request: ChatRequest):
    try:
        # Set environment variable for OpenAI API key
        os.environ["OPENAI_API_KEY"] = request.api_key
        
        # Get AI response
        chat_model = ChatOpenAI(model_name=request.model)
        messages = [
            {"role": "system", "content": "You are a helpful medical AI assistant. Provide accurate, helpful medical information and always recommend consulting with healthcare providers for medical decisions. When formatting lists or emphasis, use proper markdown formatting instead of asterisks."},
            {"role": "user", "content": request.message}
        ]
        
        ai_response = chat_model.run(messages, text_only=True)
        
        # Clean up asterisks from the response
        ai_response = ai_response.replace('**', '').replace('*', '')
        
        return StreamingResponse(
            iter([ai_response]),
            media_type="text/plain"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)