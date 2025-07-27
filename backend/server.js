const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// In-memory storage for transactions (in production, use a database)
let transactions = [];

// Load processed transactions if available
try {
    const processedData = fs.readFileSync('../data/processed-transactions.json', 'utf8');
    transactions = JSON.parse(processedData);
    console.log(`Loaded ${transactions.length} transactions from processed data`);
} catch (error) {
    console.log('No processed transactions found, starting with empty data');
}

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Wealthup Backend API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'backend-api' });
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    res.json({ transactions });
});

// Get transaction statistics
app.get('/api/statistics', (req, res) => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Category breakdown
    const categoryBreakdown = {};
    transactions.forEach(t => {
        const category = t.category || 'Uncategorized';
        if (!categoryBreakdown[category]) {
            categoryBreakdown[category] = { count: 0, total: 0 };
        }
        categoryBreakdown[category].count++;
        categoryBreakdown[category].total += Math.abs(t.amount);
    });
    
    res.json({
        totalTransactions,
        totalAmount,
        categoryBreakdown
    });
});

// Upload CSV file
app.post('/api/upload/csv', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
        const results = [];
        
        // Parse CSV
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                // Handle Canara Bank CSV format
                const transaction = {
                    date: data['Transaction Date'] || data['Date'],
                    description: data['Transaction Remarks'] || data['Description'] || data['Narration'],
                    amount: parseFloat(data['Withdrawal Amt'] || data['Deposit Amt'] || data['Amount'] || 0),
                    type: data['Withdrawal Amt'] ? 'debit' : 'credit',
                    bank: 'Canara Bank'
                };
                
                if (transaction.description && transaction.amount !== 0) {
                    results.push(transaction);
                }
            })
            .on('end', async () => {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                
                if (results.length === 0) {
                    return res.status(400).json({ error: 'No valid transactions found in CSV' });
                }
                
                // Categorize transactions using AI service
                try {
                    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
                    const response = await axios.post(`${aiServiceUrl}/categorise`, {
                        transactions: results
                    });
                    
                    const categorizedTransactions = response.data.categorized_transactions;
                    
                    // Add to transactions array
                    transactions.push(...categorizedTransactions);
                    
                    res.json({
                        message: `Successfully processed ${categorizedTransactions.length} transactions`,
                        transactions: categorizedTransactions
                    });
                    
                } catch (aiError) {
                    console.error('AI service error:', aiError.message);
                    // If AI service fails, add transactions without categorization
                    const uncategorizedTransactions = results.map(t => ({
                        ...t,
                        category: 'Uncategorized',
                        confidence: 0
                    }));
                    
                    transactions.push(...uncategorizedTransactions);
                    
                    res.json({
                        message: `Processed ${uncategorizedTransactions.length} transactions (AI categorization failed)`,
                        transactions: uncategorizedTransactions
                    });
                }
            });
            
    } catch (error) {
        console.error('CSV processing error:', error);
        res.status(500).json({ error: 'Failed to process CSV file' });
    }
});

// Update transaction category
app.patch('/api/transactions/:id/category', (req, res) => {
    const { id } = req.params;
    const { category } = req.body;
    
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }
    
    transaction.category = category;
    res.json({ message: 'Category updated successfully', transaction });
});

// Get categories
app.get('/api/categories', async (req, res) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.get(`${aiServiceUrl}/categories`);
        res.json(response.data);
    } catch (error) {
        // Fallback categories if AI service is unavailable
        res.json({
            categories: [
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
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Wealthup Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 