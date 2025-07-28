const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://wealthup_user:wealthup_password@localhost:9003/wealthup',
});

// Category mapping based on transaction descriptions
const categoryRules = [
  {
    category: 'Food & Dining',
    keywords: ['restaurant', 'food', 'dining', 'cafe', 'pizza', 'burger', 'fresh', 'grocery', 'swiggy', 'zomato', 'dominos', 'kfc', 'mcdonalds', 'starbucks', 'coffee', 'tea', 'snack', 'meal', 'lunch', 'dinner', 'breakfast']
  },
  {
    category: 'Transportation',
    keywords: ['uber', 'ola', 'taxi', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'transport', 'cab', 'ride']
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'fashion', 'electronics', 'mobile', 'phone', 'laptop', 'computer', 'accessories', 'jewelry', 'watches', 'shoes', 'bags', 'cosmetics', 'beauty']
  },
  {
    category: 'Entertainment',
    keywords: ['netflix', 'prime', 'hotstar', 'movie', 'cinema', 'theatre', 'concert', 'show', 'game', 'gaming', 'sports', 'gym', 'fitness', 'yoga', 'dance', 'music', 'book', 'magazine', 'subscription']
  },
  {
    category: 'Healthcare',
    keywords: ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'health', 'dental', 'clinic', 'lab', 'test', 'vaccine', 'insurance', 'healthcare', 'wellness', 'fitness', 'gym']
  },
  {
    category: 'Utilities',
    keywords: ['electricity', 'water', 'gas', 'internet', 'mobile', 'phone', 'broadband', 'wifi', 'utility', 'bill', 'payment', 'recharge', 'prepaid', 'postpaid']
  },
  {
    category: 'Insurance',
    keywords: ['insurance', 'policy', 'premium', 'lic', 'life', 'health', 'motor', 'vehicle', 'car', 'bike', 'home', 'property']
  },
  {
    category: 'Investment',
    keywords: ['investment', 'mutual', 'fund', 'stock', 'share', 'equity', 'bond', 'fd', 'fixed', 'deposit', 'sip', 'nps', 'ppf', 'epf', 'pension']
  },
  {
    category: 'Salary/Income',
    keywords: ['salary', 'income', 'credit', 'deposit', 'transfer', 'upi/cr', 'credit', 'salary', 'wage', 'bonus', 'commission', 'freelance', 'consulting']
  },
  {
    category: 'Transfer',
    keywords: ['transfer', 'upi', 'neft', 'imps', 'rtgs', 'ach', 'nach', 'standing', 'instruction', 'auto', 'debit', 'credit']
  },
  {
    category: 'Education',
    keywords: ['school', 'college', 'university', 'course', 'training', 'tuition', 'fee', 'education', 'student', 'book', 'library', 'exam', 'test']
  },
  {
    category: 'Travel',
    keywords: ['flight', 'hotel', 'booking', 'travel', 'trip', 'vacation', 'holiday', 'tour', 'tourism', 'airline', 'railway', 'bus', 'train', 'accommodation']
  },
  {
    category: 'Home & Rent',
    keywords: ['rent', 'mortgage', 'emi', 'home', 'house', 'property', 'maintenance', 'repair', 'furniture', 'appliance', 'decoration', 'renovation']
  },
  {
    category: 'Personal Care',
    keywords: ['salon', 'spa', 'beauty', 'cosmetic', 'personal', 'care', 'hygiene', 'grooming', 'haircut', 'massage', 'facial', 'manicure', 'pedicure']
  },
  {
    category: 'Business',
    keywords: ['business', 'office', 'work', 'professional', 'service', 'consulting', 'freelance', 'contract', 'project', 'client', 'invoice', 'expense']
  }
];

async function getCategoryId(categoryName) {
  const result = await pool.query('SELECT id FROM categories WHERE name = $1', [categoryName]);
  return result.rows[0]?.id;
}

async function categorizeTransactions() {
  try {
    console.log('🚀 Starting transaction categorization...');
    
    // Get all uncategorized transactions
    const result = await pool.query(`
      SELECT id, description, type, amount 
      FROM transactions 
      WHERE category_id IS NULL 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} uncategorized transactions`);
    
    let categorized = 0;
    let skipped = 0;
    
    for (const transaction of result.rows) {
      const description = transaction.description.toLowerCase();
      let categoryId = null;
      
      // Find matching category
      let matchedCategory = null;
      for (const rule of categoryRules) {
        const hasKeyword = rule.keywords.some(keyword => 
          description.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          categoryId = await getCategoryId(rule.category);
          matchedCategory = rule.category;
          break;
        }
      }
      
      // Update transaction with category
      if (categoryId) {
        await pool.query(
          'UPDATE transactions SET category_id = $1, updated_at = NOW() WHERE id = $2',
          [categoryId, transaction.id]
        );
        categorized++;
        console.log(`✅ Categorized: ${transaction.description.substring(0, 50)}... -> ${matchedCategory}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped: ${transaction.description.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n📈 Categorization complete:`);
    console.log(`✅ Categorized: ${categorized} transactions`);
    console.log(`⏭️  Skipped: ${skipped} transactions`);
    console.log(`📊 Total processed: ${categorized + skipped} transactions`);
    
  } catch (error) {
    console.error('❌ Error categorizing transactions:', error);
  } finally {
    await pool.end();
  }
}

categorizeTransactions(); 