const csv = require('csv-parser');
const fs = require('fs');

// Base parser class
class BaseParser {
  constructor() {
    this.bankName = 'Unknown';
    this.supportedFormats = [];
  }

  canParse(headers) {
    return this.supportedFormats.some(format => 
      format.every(header => headers.includes(header))
    );
  }

  parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleaned = String(amountStr).replace(/["',\s₹]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try different date formats
    const dateFormats = [
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
    ];

    for (const format of dateFormats) {
      const match = dateStr.match(format);
      if (match) {
        const [, part1, part2, part3] = match;
        if (part1.length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD
          return `${part1}-${part2}-${part3}`;
        } else {
          // DD-MM-YYYY or DD/MM/YYYY
          return `${part3}-${part2}-${part1}`;
        }
      }
    }

    // Try parsing with Date constructor
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return new Date().toISOString().split('T')[0];
  }

  parseTransaction(row) {
    throw new Error('parseTransaction must be implemented by subclass');
  }
}

// Canara Bank Parser
class CanaraBankParser extends BaseParser {
  constructor() {
    super();
    this.bankName = 'Canara Bank';
    this.supportedFormats = [
      ['Txn Date', 'Description', 'Debit', 'Credit', 'Balance'],
      ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
      ['Transaction Date', 'Transaction Remarks', 'Withdrawal Amt', 'Deposit Amt', 'Balance']
    ];
  }

  parseTransaction(row) {
    const debitAmount = this.parseAmount(row.Debit || row['Withdrawal Amt']);
    const creditAmount = this.parseAmount(row.Credit || row['Deposit Amt']);
    
    let amount = 0;
    let type = 'debit';

    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }

    return {
      date: this.parseDate(row['Txn Date'] || row.Date || row['Transaction Date']),
      amount: amount,
      type: type,
      description: row.Description || row['Transaction Remarks'] || '',
      balance: this.parseAmount(row.Balance),
      chequeNumber: row['Cheque No.'] || row['Cheque No'] || null,
      branchCode: row['Branch Code'] || null
    };
  }
}

// HDFC Bank Parser
class HDFCBankParser extends BaseParser {
  constructor() {
    super();
    this.bankName = 'HDFC Bank';
    this.supportedFormats = [
      ['Date', 'Narration', 'Chq/Ref No', 'Value Dt', 'Withdrawal Amt', 'Deposit Amt', 'Closing Balance'],
      ['Transaction Date', 'Transaction Remarks', 'Cheque Number', 'Value Date', 'Withdrawal Amount', 'Deposit Amount', 'Balance']
    ];
  }

  parseTransaction(row) {
    const debitAmount = this.parseAmount(row['Withdrawal Amt'] || row['Withdrawal Amount']);
    const creditAmount = this.parseAmount(row['Deposit Amt'] || row['Deposit Amount']);
    
    let amount = 0;
    let type = 'debit';

    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }

    return {
      date: this.parseDate(row.Date || row['Transaction Date']),
      amount: amount,
      type: type,
      description: row.Narration || row['Transaction Remarks'] || '',
      balance: this.parseAmount(row['Closing Balance'] || row.Balance),
      chequeNumber: row['Chq/Ref No'] || row['Cheque Number'] || null,
      valueDate: this.parseDate(row['Value Dt'] || row['Value Date'])
    };
  }
}

// ICICI Bank Parser
class ICICIBankParser extends BaseParser {
  constructor() {
    super();
    this.bankName = 'ICICI Bank';
    this.supportedFormats = [
      ['Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amt', 'Deposit Amt', 'Balance'],
      ['Date', 'Cheque No', 'Narration', 'Withdrawal', 'Deposit', 'Balance']
    ];
  }

  parseTransaction(row) {
    const debitAmount = this.parseAmount(row['Withdrawal Amt'] || row.Withdrawal);
    const creditAmount = this.parseAmount(row['Deposit Amt'] || row.Deposit);
    
    let amount = 0;
    let type = 'debit';

    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }

    return {
      date: this.parseDate(row['Transaction Date'] || row.Date),
      amount: amount,
      type: type,
      description: row['Transaction Remarks'] || row.Narration || '',
      balance: this.parseAmount(row.Balance),
      chequeNumber: row['Cheque Number'] || row['Cheque No'] || null
    };
  }
}

// SBI Bank Parser
class SBIBankParser extends BaseParser {
  constructor() {
    super();
    this.bankName = 'State Bank of India';
    this.supportedFormats = [
      ['Txn Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amt', 'Deposit Amt', 'Balance'],
      ['Date', 'Cheque No', 'Narration', 'Withdrawal', 'Deposit', 'Balance']
    ];
  }

  parseTransaction(row) {
    const debitAmount = this.parseAmount(row['Withdrawal Amt'] || row.Withdrawal);
    const creditAmount = this.parseAmount(row['Deposit Amt'] || row.Deposit);
    
    let amount = 0;
    let type = 'debit';

    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }

    return {
      date: this.parseDate(row['Txn Date'] || row.Date),
      amount: amount,
      type: type,
      description: row['Transaction Remarks'] || row.Narration || '',
      balance: this.parseAmount(row.Balance),
      chequeNumber: row['Cheque Number'] || row['Cheque No'] || null
    };
  }
}

// Credit Card Statement Parser (Generic)
class CreditCardParser extends BaseParser {
  constructor() {
    super();
    this.bankName = 'Credit Card';
    this.supportedFormats = [
      ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount'],
      ['Date', 'Description', 'Category', 'Amount', 'Type'],
      ['Transaction Date', 'Description', 'Amount', 'Category'],
      ['Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount'],
      ['Transaction Date', 'Description', 'Category', 'Type', 'Amount']
    ];
  }

  canParse(headers) {
    // Only match if it's clearly a credit card statement
    const hasCreditCardIndicators = headers.some(header => 
      header.toLowerCase().includes('post date') ||
      header.toLowerCase().includes('category') ||
      header.toLowerCase().includes('type')
    );
    
    const hasStandardFields = headers.some(header => 
      header.toLowerCase().includes('transaction date') ||
      header.toLowerCase().includes('description') ||
      header.toLowerCase().includes('amount')
    );
    
    return hasCreditCardIndicators && hasStandardFields;
  }

  parseTransaction(row) {
    const amount = this.parseAmount(row.Amount);
    const type = (row.Type || '').toLowerCase();
    
    // Credit card transactions are typically debits (spending)
    // Credits are usually payments or refunds
    const transactionType = type === 'credit' || amount < 0 ? 'credit' : 'debit';
    const absAmount = Math.abs(amount);

    return {
      date: this.parseDate(row['Transaction Date'] || row.Date),
      amount: absAmount,
      type: transactionType,
      description: row.Description || '',
      category: row.Category || '',
      postDate: this.parseDate(row['Post Date']),
      originalAmount: amount
    };
  }
}

// Parser factory
class ParserFactory {
  constructor() {
    this.parsers = [
      new CanaraBankParser(),
      new HDFCBankParser(),
      new ICICIBankParser(),
      new SBIBankParser(),
      new CreditCardParser()
    ];
  }

  detectParser(headers) {
    for (const parser of this.parsers) {
      if (parser.canParse(headers)) {
        return parser;
      }
    }
    return null;
  }

  getParser(bankName) {
    const parser = this.parsers.find(p => 
      p.bankName.toLowerCase().includes(bankName.toLowerCase())
    );
    return parser || new CanaraBankParser(); // Default fallback
  }

  getAllParsers() {
    return this.parsers.map(parser => ({
      name: parser.bankName,
      supportedFormats: parser.supportedFormats
    }));
  }
}

// Parse CSV file with detected parser
async function parseCSVFile(filePath, bankName = null) {
  return new Promise((resolve, reject) => {
    const transactions = [];
    const factory = new ParserFactory();
    let parser = null;
    let headers = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
        if (bankName) {
          parser = factory.getParser(bankName);
        } else {
          parser = factory.detectParser(headers);
        }
        
        if (!parser) {
          reject(new Error('No suitable parser found for this file format'));
        }
      })
      .on('data', (row) => {
        try {
          const transaction = parser.parseTransaction(row);
          if (transaction.amount > 0) {
            transactions.push({
              ...transaction,
              bankName: parser.bankName
            });
          }
        } catch (error) {
          console.warn('Error parsing row:', row, error.message);
        }
      })
      .on('end', () => {
        resolve({
          transactions,
          parser: parser.bankName,
          totalTransactions: transactions.length
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

module.exports = {
  ParserFactory,
  parseCSVFile,
  BaseParser,
  CanaraBankParser,
  HDFCBankParser,
  ICICIBankParser,
  SBIBankParser,
  CreditCardParser
}; 