const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration
const INPUT_FILE = path.join(__dirname, '../data/canara_bank/data.csv');
const OUTPUT_FILE = path.join(__dirname, '../data/processed-transactions.json');

// Categories mapping for common transaction types
const CATEGORY_MAPPING = {
  'AMAZON': 'Shopping',
  'FLIPKART': 'Shopping',
  'SWIGGY': 'Dining',
  'ZOMATO': 'Dining',
  'OLACABS': 'Transportation',
  'UBER': 'Transportation',
  'PAYTM': 'Transfer',
  'NEFT': 'Transfer',
  'IMPS': 'Transfer',
  'UPI': 'Transfer',
  'ATM': 'ATM Withdrawal',
  'SMS ALERT': 'Bank Charges',
  'MARKUPFEE': 'Bank Charges',
  'SHOPIFY': 'Shopping',
  'LORRAINE': 'Salary',
  'AMAZON.COM': 'Salary',
  'PAYPAL': 'Salary',
  'RAZORPAY': 'Transfer',
  'UPSTOX': 'Investment',
  'RKSV': 'Investment',
  'HDFC': 'Investment',
  'DISCOVERY': 'Entertainment',
  'APOLLO': 'Healthcare',
  'GLOSS': 'Shopping',
  'SMAAASH': 'Entertainment',
  'BLINKIT': 'Groceries',
  'NAME-CHEAP': 'Utilities',
  'RNWINESS': 'Entertainment',
  'LAZYPAY': 'Shopping',
  'GARAGEPRE': 'Shopping',
  'SLICE': 'Shopping',
  'TEA POST': 'Dining',
  'GRAND PAR': 'Dining',
  'MITRA HOS': 'Healthcare',
  'PYRAMID': 'Shopping',
  'MUKESH FR': 'Dining',
  'KANNAN UP': 'Dining',
  'RENAUL IS': 'Dining',
  'ARUNODAY': 'Dining',
  'RUBEL STO': 'Dining',
  'BHAVNABEN': 'Transfer',
  'KSHITIJA': 'Transfer',
  'SAJAN KH': 'Transfer',
  'VIKAS SAI': 'Transfer',
  'REJAUL IS': 'Transfer',
  'UPENDRA K': 'Transfer',
  'RAM SAJI': 'Transfer',
  'SHARIK': 'Transfer',
  'SUKHDEV S': 'Transfer',
  'YASHARDA': 'Transfer',
  'AZARUL IS': 'Transfer',
  'PUMPTEEN': 'Shopping',
  'MEENA YA': 'Transfer',
  'AVADHESH': 'Transfer',
  'SODHIS SU': 'Transfer',
  'MAKK ENTE': 'Shopping',
  'ANWAR HOS': 'Healthcare',
  'ULTREX RE': 'Shopping',
  'R4 FOODS': 'Dining',
  'ADD MONEY': 'Transfer',
  'PAYTM MET': 'Shopping',
  'PAYTM AIR': 'Transportation',
  'DISCOVERY': 'Entertainment',
  'HEALTHIFY': 'Healthcare',
  'BIJUS': 'Transfer',
  'SURBHI KH': 'Transfer',
};

function parseDate(dateStr) {
  // Handle different date formats from Canara Bank
  if (dateStr.includes('-')) {
    const [datePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (dateStr.includes(' ')) {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }
  return null;
}

function categorizeTransaction(description) {
  const desc = description.toUpperCase();
  
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPING)) {
    if (desc.includes(keyword)) {
      return category;
    }
  }
  
  // Default categorization based on common patterns
  if (desc.includes('NEFT CR') || desc.includes('IMPS-CR')) {
    return 'Salary';
  } else if (desc.includes('NEFT DR') || desc.includes('IMPS-DR')) {
    return 'Transfer';
  } else if (desc.includes('UPI/CR')) {
    return 'Transfer';
  } else if (desc.includes('UPI/DR')) {
    return 'Transfer';
  } else if (desc.includes('ATM')) {
    return 'ATM Withdrawal';
  } else if (desc.includes('CHARGES') || desc.includes('FEE')) {
    return 'Bank Charges';
  } else if (desc.includes('REFUND')) {
    return 'Refund';
  } else if (desc.includes('INTEREST')) {
    return 'Interest';
  }
  
  return 'Other';
}

function generateTransactionId(row) {
  const dateStr = row['Txn Date'] || '';
  const amount = (row['Debit'] || row['Credit'] || '').replace(/,/g, '');
  const description = row['Description'] || '';
  
  const combined = `${dateStr}-${amount}-${description.substring(0, 50)}`;
  return Buffer.from(combined).toString('base64').substring(0, 32);
}

async function processCSV() {
  const transactions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(INPUT_FILE)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Skip empty rows
          if (!row['Txn Date'] || !row['Description']) {
            return;
          }

          // Parse date
          const date = parseDate(row['Txn Date']);
          if (!date) {
            console.warn('Invalid date format:', row['Txn Date']);
            return;
          }

          // Parse amount and determine type
          const debitStr = row['Debit'] || '';
          const creditStr = row['Credit'] || '';
          
          let amount = 0;
          let type;

          if (debitStr && parseFloat(debitStr.replace(/,/g, '')) > 0) {
            amount = parseFloat(debitStr.replace(/,/g, ''));
            type = 'debit';
          } else if (creditStr && parseFloat(creditStr.replace(/,/g, '')) > 0) {
            amount = parseFloat(creditStr.replace(/,/g, ''));
            type = 'credit';
          } else {
            console.warn('No valid amount found in row:', row);
            return;
          }

          // Parse balance
          const balanceStr = row['Balance'] || '';
          const balance = balanceStr ? parseFloat(balanceStr.replace(/[₹,]/g, '')) : null;

          // Generate transaction ID
          const txnId = generateTransactionId(row);

          // Categorize transaction
          const category = categorizeTransaction(row['Description']);

          const transaction = {
            id: txnId,
            txnId,
            date: date.toISOString().split('T')[0],
            amount: amount.toString(),
            type,
            description: row['Description'] || '',
            chequeNumber: row['Cheque No.'] || null,
            branchCode: row['Branch Code'] || null,
            balance: balance ? balance.toString() : null,
            aiCategory: category,
            aiConfidence: 0.8,
            correctedByUser: false,
            accountId: 'default-account-id',
            categoryId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          transactions.push(transaction);
        } catch (error) {
          console.error('Error processing row:', row, error);
        }
      })
      .on('end', () => {
        console.log(`Processed ${transactions.length} transactions`);
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function main() {
  try {
    console.log('Processing Canara Bank CSV data...');
    const transactions = await processCSV();
    
    // Write processed data to JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transactions, null, 2));
    console.log(`Processed data saved to ${OUTPUT_FILE}`);
    
    // Print summary
    const summary = {
      totalTransactions: transactions.length,
      totalIncome: transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      totalExpenses: transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      categories: {},
    };
    
    transactions.forEach(t => {
      const category = t.aiCategory;
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    });
    
    console.log('\nSummary:');
    console.log(`Total Transactions: ${summary.totalTransactions}`);
    console.log(`Total Income: ₹${summary.totalIncome.toLocaleString()}`);
    console.log(`Total Expenses: ₹${summary.totalExpenses.toLocaleString()}`);
    console.log(`Net Cash Flow: ₹${(summary.totalIncome - summary.totalExpenses).toLocaleString()}`);
    
    console.log('\nCategory Breakdown:');
    Object.entries(summary.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} transactions`);
      });
      
  } catch (error) {
    console.error('Error processing CSV:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processCSV, categorizeTransaction }; 