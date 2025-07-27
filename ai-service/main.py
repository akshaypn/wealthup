from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import openai
import os
from dotenv import load_dotenv
import json
import asyncio
from openai import OpenAI

load_dotenv()

app = FastAPI(title="Wealthup AI Service", version="1.0.0")

# Configure OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Transaction(BaseModel):
    description: str
    amount: float
    type: str  # credit or debit

class CategorizationRequest(BaseModel):
    description: str
    amount: float
    type: str

class BatchCategorizationRequest(BaseModel):
    transactions: List[Transaction]

class CategorizationResponse(BaseModel):
    category: str
    confidence: float

class BatchCategorizationResponse(BaseModel):
    categorized_transactions: List[dict]

# Smart categories that the model can understand and map to
CATEGORIES = [
    "Food & Dining",
    "Transportation", 
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Utilities",
    "Insurance",
    "Investment",
    "Salary/Income",
    "Transfer",
    "ATM Withdrawal",
    "Online Services",
    "Education",
    "Travel",
    "Gifts",
    "Other"
]

@app.get("/")
async def root():
    return {"message": "Wealthup AI Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-categorization"}

@app.post("/categorise")
async def categorize_single_transaction(request: CategorizationRequest):
    """Categorize a single transaction using OpenAI"""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        # Create a smart prompt that helps the model understand common patterns
        prompt = f"""
        Categorize this financial transaction into one of these categories: {', '.join(CATEGORIES)}

        Transaction Description: {request.description}
        Amount: {request.amount}
        Type: {request.type}

        Common patterns to help you:
        - Zomato, Swiggy, restaurants, food delivery → Food & Dining
        - Uber, Ola, fuel, parking, metro → Transportation  
        - Amazon, Flipkart, shopping malls, clothing → Shopping
        - Movies, games, streaming, entertainment → Entertainment
        - Hospitals, medicines, medical → Healthcare
        - Electricity, water, internet, phone bills → Utilities
        - Insurance companies → Insurance
        - Stock market, mutual funds, investments → Investment
        - Salary, income, payments received → Salary/Income
        - Bank transfers, NEFT, IMPS → Transfer
        - ATM withdrawals → ATM Withdrawal
        - Software, subscriptions, online services → Online Services
        - Schools, colleges, courses → Education
        - Hotels, flights, travel → Travel
        - Gifts, donations → Gifts

        Return only the category name, nothing else.
        """
        
        response = client.completions.create(
            model="gpt-3.5-turbo-instruct",  # More cost-effective model
            prompt=prompt,
            max_tokens=10,
            temperature=0.1
        )
        
        category = response.choices[0].text.strip()
        
        # Validate and clean the category
        if category not in CATEGORIES:
            # Try to find a close match
            category_lower = category.lower()
            for valid_category in CATEGORIES:
                if valid_category.lower() in category_lower or category_lower in valid_category.lower():
                    category = valid_category
                    break
            else:
                category = "Other"
        
        return CategorizationResponse(
            category=category,
            confidence=0.85  # High confidence for single transactions
        )
    
    except Exception as e:
        print(f"Error categorizing transaction: {str(e)}")
        return CategorizationResponse(
            category="Other",
            confidence=0.0
        )

@app.post("/categorise-batch")
async def categorize_batch_transactions(request: BatchCategorizationRequest):
    """Categorize multiple transactions in batches of 50"""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        categorized_transactions = []
        batch_size = 50
        
        # Process transactions in batches
        for i in range(0, len(request.transactions), batch_size):
            batch = request.transactions[i:i + batch_size]
            
            # Create batch prompt
            batch_prompt = f"""
            Categorize these {len(batch)} financial transactions into one of these categories: {', '.join(CATEGORIES)}

            Common patterns to help you:
            - Zomato, Swiggy, restaurants, food delivery → Food & Dining
            - Uber, Ola, fuel, parking, metro → Transportation  
            - Amazon, Flipkart, shopping malls, clothing → Shopping
            - Movies, games, streaming, entertainment → Entertainment
            - Hospitals, medicines, medical → Healthcare
            - Electricity, water, internet, phone bills → Utilities
            - Insurance companies → Insurance
            - Stock market, mutual funds, investments → Investment
            - Salary, income, payments received → Salary/Income
            - Bank transfers, NEFT, IMPS → Transfer
            - ATM withdrawals → ATM Withdrawal
            - Software, subscriptions, online services → Online Services
            - Schools, colleges, courses → Education
            - Hotels, flights, travel → Travel
            - Gifts, donations → Gifts

            Transactions:
            """
            
            for idx, transaction in enumerate(batch):
                batch_prompt += f"\n{idx + 1}. {transaction.description} (Amount: {transaction.amount}, Type: {transaction.type})"
            
            batch_prompt += "\n\nReturn a JSON array with category names in the same order as the transactions."
            
            response = client.completions.create(
                model="gpt-3.5-turbo-instruct",
                prompt=batch_prompt,
                max_tokens=500,
                temperature=0.1
            )
            
            try:
                # Parse the response
                response_text = response.choices[0].text.strip()
                # Try to extract JSON array
                if response_text.startswith('[') and response_text.endswith(']'):
                    categories = json.loads(response_text)
                else:
                    # Fallback: split by newlines and clean
                    categories = [cat.strip().strip('"').strip("'") for cat in response_text.split('\n') if cat.strip()]
                
                # Process each category in the batch
                for idx, (transaction, category) in enumerate(zip(batch, categories)):
                    # Validate category
                    if category not in CATEGORIES:
                        # Try to find a close match
                        category_lower = category.lower()
                        for valid_category in CATEGORIES:
                            if valid_category.lower() in category_lower or category_lower in valid_category.lower():
                                category = valid_category
                                break
                        else:
                            category = "Other"
                    
                    categorized_transactions.append({
                        "description": transaction.description,
                        "amount": transaction.amount,
                        "type": transaction.type,
                        "category": category,
                        "confidence": 0.8  # Slightly lower confidence for batch processing
                    })
                    
            except (json.JSONDecodeError, IndexError) as e:
                # Fallback: categorize individually
                print(f"Batch processing failed, falling back to individual categorization: {e}")
                for transaction in batch:
                    single_result = await categorize_single_transaction(
                        CategorizationRequest(
                            description=transaction.description,
                            amount=transaction.amount,
                            type=transaction.type
                        )
                    )
                    categorized_transactions.append({
                        "description": transaction.description,
                        "amount": transaction.amount,
                        "type": transaction.type,
                        "category": single_result.category,
                        "confidence": single_result.confidence
                    })
        
        return BatchCategorizationResponse(categorized_transactions=categorized_transactions)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error categorizing transactions: {str(e)}")

@app.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 