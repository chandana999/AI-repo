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
sys.path.append('..')
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.openai_utils.chatmodel import ChatOpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI application with a title
app = FastAPI(title="AI Engineer Challenge - PDF RAG API")

# Global variables for storing PDF data and vector database
pdf_vector_db: Optional[VectorDatabase] = None
pdf_text_chunks: List[str] = []
current_pdf_name: Optional[str] = None

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4o-mini"  # Optional model selection with default
    api_key: Optional[str] = None
    use_rag: Optional[bool] = False  # Whether to use RAG with PDF context

class PDFUploadResponse(BaseModel):
    success: bool
    message: str
    pdf_name: Optional[str] = None
    chunks_count: Optional[int] = None

class RAGChatRequest(BaseModel):
    user_message: str
    api_key: Optional[str] = None
    model: Optional[str] = "gpt-4o-mini"
    k: Optional[int] = 3  # Number of relevant chunks to retrieve
    

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        
        # Fallback: use env key if not provided in request
        api_key = request.api_key or os.getenv("OPENAI_API_KEY")
        # Basic validation and safe logging (mask API key)
        if not api_key or not api_key.strip():
            raise HTTPException(status_code=400, detail="Missing API key")

        masked_key = api_key[:6] + "..." if len(api_key) >= 6 else "(short)"
        print(
            f"[chat] model={request.model} key_len={len(request.api_key)} key_mask={masked_key}"
        )

        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=api_key)
        #client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "developer", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")

    except HTTPException as e:
        # Re-raise known HTTP errors (e.g., missing API key)
        raise e
    except Exception as e:
        # Handle any other unexpected errors
        raise HTTPException(status_code=500, detail=str(e))

# PDF Upload endpoint
@app.post("/api/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    """Upload and process a PDF file for RAG system."""
    global pdf_vector_db, pdf_text_chunks, current_pdf_name
    
    try:
        # Validate API key
        if not api_key or not api_key.strip():
            raise HTTPException(status_code=400, detail="Missing API key")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Extract text from PDF
            print(f"Processing PDF: {file.filename}")
            pdf_loader = PDFLoader(tmp_file_path)
            pdf_text = pdf_loader.load_documents()[0]  # Get first document
            
            if not pdf_text.strip():
                raise HTTPException(status_code=400, detail="PDF appears to be empty or unreadable")
            
            print(f"Extracted text length: {len(pdf_text)} characters")
            
            # Split text into chunks
            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            pdf_text_chunks = text_splitter.split(pdf_text)
            print(f"Created {len(pdf_text_chunks)} text chunks")
            
            # Create vector database with embeddings
            print("Creating embedding model...")
            embedding_model = EmbeddingModel()
            pdf_vector_db = VectorDatabase(embedding_model)
            
            # Build vector database asynchronously
            print("Generating embeddings...")
            try:
                # Process in smaller batches to avoid API limits
                batch_size = 5  # Reduced batch size
                for i in range(0, len(pdf_text_chunks), batch_size):
                    batch = pdf_text_chunks[i:i + batch_size]
                    print(f"Processing batch {i//batch_size + 1}/{(len(pdf_text_chunks) + batch_size - 1)//batch_size}")
                    # Generate embeddings for this batch
                    batch_embeddings = await embedding_model.async_get_embeddings(batch)
                    # Insert each chunk with its embedding
                    for chunk, embedding in zip(batch, batch_embeddings):
                        pdf_vector_db.insert(chunk, embedding)
                print("Embeddings generated successfully")
            except Exception as embedding_error:
                print(f"Embedding generation failed: {embedding_error}")
                print("Falling back to simple text search without embeddings...")
                # Fallback: create a simple text-based search without embeddings
                pdf_vector_db = None  # We'll use simple text search instead
            
            current_pdf_name = file.filename
            
            return PDFUploadResponse(
                success=True,
                message=f"PDF '{file.filename}' processed successfully",
                pdf_name=file.filename,
                chunks_count=len(pdf_text_chunks)
            )
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"PDF processing error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

# RAG Chat endpoint
@app.post("/api/rag-chat")
async def rag_chat(request: RAGChatRequest):
    """Chat with the uploaded PDF using RAG system."""
    global pdf_vector_db, pdf_text_chunks, current_pdf_name
    
    try:
        # Validate API key
        api_key = request.api_key or os.getenv("OPENAI_API_KEY")
        if not api_key or not api_key.strip():
            raise HTTPException(status_code=400, detail="Missing API key")
        
        # Check if PDF is loaded
        if not pdf_text_chunks:
            raise HTTPException(status_code=400, detail="No PDF loaded. Please upload a PDF first.")
        
        # Retrieve relevant chunks
        if pdf_vector_db is not None:
            # Use vector search if embeddings are available
            relevant_chunks = pdf_vector_db.search_by_text(
                request.user_message, 
                k=request.k, 
                return_as_text=True
            )
        else:
            # Fallback to simple text search if embeddings failed
            print("Using simple text search fallback...")
            query_words = request.user_message.lower().split()
            chunk_scores = []
            
            for chunk in pdf_text_chunks:
                chunk_lower = chunk.lower()
                score = sum(1 for word in query_words if word in chunk_lower)
                if score > 0:
                    chunk_scores.append((chunk, score))
            
            # Sort by score and take top k
            chunk_scores.sort(key=lambda x: x[1], reverse=True)
            relevant_chunks = [chunk for chunk, score in chunk_scores[:request.k]]
        
        # Create context from relevant chunks
        context = "\n\n".join(relevant_chunks)
        
        # Create system message for RAG
        system_message = f"""You are a helpful AI assistant that answers questions based ONLY on the provided context from a PDF document.

IMPORTANT RULES:
1. ONLY use information from the provided context below
2. If the answer is not in the context, say "I cannot find that information in the provided document"
3. Be specific and cite relevant parts of the document when possible
4. Do not make up or hallucinate information

Context from PDF "{current_pdf_name}":
{context}

User Question: {request.user_message}"""
        
        # Initialize chat model
        chat_model = ChatOpenAI(model_name=request.model)
        
        # Create async generator for streaming response
        async def generate():
            async for chunk in chat_model.astream([
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.user_message}
            ]):
                yield chunk
        
        return StreamingResponse(generate(), media_type="text/plain")
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in RAG chat: {str(e)}")

# Get PDF status endpoint
@app.get("/api/pdf-status")
async def get_pdf_status():
    """Get the current PDF status."""
    global pdf_vector_db, current_pdf_name, pdf_text_chunks
    
    return {
        "pdf_loaded": len(pdf_text_chunks) > 0,
        "pdf_name": current_pdf_name,
        "chunks_count": len(pdf_text_chunks) if pdf_text_chunks else 0,
        "embeddings_available": pdf_vector_db is not None
    }

# Test PDF processing without embeddings
@app.post("/api/test-pdf")
async def test_pdf_processing(file: UploadFile = File(...)):
    """Test PDF text extraction without embeddings."""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Extract text from PDF
            print(f"Testing PDF: {file.filename}")
            pdf_loader = PDFLoader(tmp_file_path)
            pdf_text = pdf_loader.load_documents()[0]
            
            if not pdf_text.strip():
                raise HTTPException(status_code=400, detail="PDF appears to be empty or unreadable")
            
            # Split text into chunks
            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            pdf_text_chunks = text_splitter.split(pdf_text)
            
            return {
                "success": True,
                "filename": file.filename,
                "text_length": len(pdf_text),
                "chunks_count": len(pdf_text_chunks),
                "first_chunk_preview": pdf_text_chunks[0][:200] + "..." if pdf_text_chunks else ""
            }
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Test PDF processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error testing PDF: {str(e)}")

# Clear PDF endpoint
@app.post("/api/clear-pdf")
async def clear_pdf():
    """Clear the current PDF from memory."""
    global pdf_vector_db, pdf_text_chunks, current_pdf_name
    
    pdf_vector_db = None
    pdf_text_chunks = []
    current_pdf_name = None
    
    return {"success": True, "message": "PDF cleared successfully"}

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
