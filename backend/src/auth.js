const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, name, is_active FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }
      
      req.user = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Google OAuth Authentication
const authenticateGoogle = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'Google ID token is required' });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    const client = await pool.connect();
    
    try {
      // Check if user exists
      let userResult = await client.query(
        'SELECT id, email, name, is_active FROM users WHERE email = $1',
        [email]
      );

      let user;

      if (userResult.rows.length === 0) {
        // Create new user
        const newUserResult = await client.query(
          `INSERT INTO users (email, name, google_id, profile_picture, auth_provider) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, email, name, is_active`,
          [email, name, googleId, picture, 'google']
        );
        user = newUserResult.rows[0];
      } else {
        user = userResult.rows[0];
        
        // Update user info if needed
        await client.query(
          `UPDATE users 
           SET name = $1, google_id = $2, profile_picture = $3, auth_provider = $4, updated_at = NOW()
           WHERE id = $5`,
          [name, googleId, picture, 'google', user.id]
        );
      }

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        message: 'Google authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: picture
        },
        token
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
};

// User Registration
const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), passwordHash, name]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// User Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Find user by email
      const result = await client.query(
        'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Get Current User
const getCurrentUser = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({ error: 'At least one field to update is required' });
  }

  try {
    const client = await pool.connect();
    
    try {
      let query = 'UPDATE users SET updated_at = NOW()';
      const params = [];
      let paramIndex = 1;

      if (name) {
        query += `, name = $${paramIndex}`;
        params.push(name);
        paramIndex++;
      }

      if (email) {
        // Check if email is already taken
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.toLowerCase(), req.user.id]
        );
        
        if (existingUser.rows.length > 0) {
          return res.status(409).json({ error: 'Email is already taken' });
        }

        query += `, email = $${paramIndex}`;
        params.push(email.toLowerCase());
        paramIndex++;
      }

      query += ` WHERE id = $${paramIndex} RETURNING id, email, name, updated_at`;
      params.push(req.user.id);

      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  authenticateToken,
  authenticateGoogle,
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserProfile
}; 