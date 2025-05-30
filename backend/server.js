const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sims',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// Initialize database
const initializeDatabase = async () => {
    try {
        // Create database if it doesn't exist
        const tempConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        await tempConnection.execute('CREATE DATABASE IF NOT EXISTS sims');
        await tempConnection.end();

        // Create connection pool
        pool = mysql.createPool(dbConfig);

        // Create tables
        const connection = await pool.getConnection();

        // Create Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Users (
                UserID INT AUTO_INCREMENT PRIMARY KEY,
                Username VARCHAR(50) NOT NULL UNIQUE,
                Password VARCHAR(255) NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Spare_Part table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Spare_Part (
                Name VARCHAR(100) PRIMARY KEY,
                Category VARCHAR(50) NOT NULL,
                Quantity INT NOT NULL DEFAULT 0,
                UnitPrice DECIMAL(10, 2) NOT NULL,
                TotalPrice DECIMAL(10, 2) GENERATED ALWAYS AS (Quantity * UnitPrice) STORED,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create Stock_In table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Stock_In (
                StockInID INT AUTO_INCREMENT PRIMARY KEY,
                SparePartName VARCHAR(100) NOT NULL,
                StockInQuantity INT NOT NULL,
                StockInDate DATE NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (SparePartName) REFERENCES Spare_Part(Name) ON DELETE CASCADE
            )
        `);

        // Create Stock_Out table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Stock_Out (
                StockOutID INT AUTO_INCREMENT PRIMARY KEY,
                SparePartName VARCHAR(100) NOT NULL,
                StockOutQuantity INT NOT NULL,
                StockOutUnitPrice DECIMAL(10, 2) NOT NULL,
                StockOutTotalPrice DECIMAL(10, 2) GENERATED ALWAYS AS (StockOutQuantity * StockOutUnitPrice) STORED,
                StockOutDate DATE NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (SparePartName) REFERENCES Spare_Part(Name) ON DELETE CASCADE
            )
        `);

        // Insert default admin user if not exists
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.execute(`
            INSERT IGNORE INTO Users (Username, Password)
            VALUES ('admin', ?)
        `, [hashedPassword]);

        connection.release();
        console.log('Database tables initialized successfully');
        console.log('Default admin user created (username: admin, password: admin123)');

    } catch (error) {
        console.error('Database initialization failed:', error.message);
        throw error;
    }
};

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: 'sims-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SIMS Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

// AUTH ROUTES
// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM Users WHERE Username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid username or password'
            });
        }

        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.Password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid username or password'
            });
        }

        req.session.user = {
            id: user.UserID,
            username: user.Username
        };

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.UserID,
                username: user.Username
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error during login'
        });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({
                error: 'Failed to logout'
            });
        }

        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// Check session
app.get('/api/auth/session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// SPARE PARTS ROUTES
// Get all spare parts
app.get('/api/spare-parts', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT Name, Category, Quantity, UnitPrice, TotalPrice, CreatedAt, UpdatedAt
            FROM Spare_Part
            ORDER BY Name
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get spare parts error:', error);
        res.status(500).json({
            error: 'Failed to fetch spare parts'
        });
    }
});

// Get spare part by name
app.get('/api/spare-parts/:name', requireAuth, async (req, res) => {
    try {
        const { name } = req.params;

        const [rows] = await pool.execute(`
            SELECT Name, Category, Quantity, UnitPrice, TotalPrice, CreatedAt, UpdatedAt
            FROM Spare_Part
            WHERE Name = ?
        `, [name]);

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Spare part not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('Get spare part error:', error);
        res.status(500).json({
            error: 'Failed to fetch spare part'
        });
    }
});

// Add new spare part
app.post('/api/spare-parts', requireAuth, async (req, res) => {
    try {
        const { name, category, quantity, unitPrice } = req.body;

        if (!name || !category || quantity === undefined || unitPrice === undefined) {
            return res.status(400).json({
                error: 'Name, category, quantity, and unit price are required'
            });
        }

        if (quantity < 0 || unitPrice < 0) {
            return res.status(400).json({
                error: 'Quantity and unit price must be non-negative'
            });
        }

        // Check if spare part already exists
        const [existingParts] = await pool.execute(
            'SELECT Name FROM Spare_Part WHERE Name = ?',
            [name]
        );

        if (existingParts.length > 0) {
            return res.status(409).json({
                error: 'Spare part with this name already exists'
            });
        }

        await pool.execute(`
            INSERT INTO Spare_Part (Name, Category, Quantity, UnitPrice)
            VALUES (?, ?, ?, ?)
        `, [name, category, quantity, unitPrice]);

        res.status(201).json({
            success: true,
            message: 'Spare part added successfully'
        });

    } catch (error) {
        console.error('Add spare part error:', error);
        res.status(500).json({
            error: 'Failed to add spare part'
        });
    }
});

// Update spare part
app.put('/api/spare-parts/:name', requireAuth, async (req, res) => {
    try {
        const { name } = req.params;
        const { category, quantity, unitPrice } = req.body;

        // Check if spare part exists
        const [existingParts] = await pool.execute(
            'SELECT Name FROM Spare_Part WHERE Name = ?',
            [name]
        );

        if (existingParts.length === 0) {
            return res.status(404).json({
                error: 'Spare part not found'
            });
        }

        if (!category || quantity === undefined || unitPrice === undefined) {
            return res.status(400).json({
                error: 'Category, quantity, and unit price are required'
            });
        }

        if (quantity < 0 || unitPrice < 0) {
            return res.status(400).json({
                error: 'Quantity and unit price must be non-negative'
            });
        }

        await pool.execute(`
            UPDATE Spare_Part
            SET Category = ?, Quantity = ?, UnitPrice = ?
            WHERE Name = ?
        `, [category, quantity, unitPrice, name]);

        res.json({
            success: true,
            message: 'Spare part updated successfully'
        });

    } catch (error) {
        console.error('Update spare part error:', error);
        res.status(500).json({
            error: 'Failed to update spare part'
        });
    }
});

// Delete spare part
app.delete('/api/spare-parts/:name', requireAuth, async (req, res) => {
    try {
        const { name } = req.params;

        // Check if spare part exists
        const [existingParts] = await pool.execute(
            'SELECT Name FROM Spare_Part WHERE Name = ?',
            [name]
        );

        if (existingParts.length === 0) {
            return res.status(404).json({
                error: 'Spare part not found'
            });
        }

        await pool.execute('DELETE FROM Spare_Part WHERE Name = ?', [name]);

        res.json({
            success: true,
            message: 'Spare part deleted successfully'
        });

    } catch (error) {
        console.error('Delete spare part error:', error);
        res.status(500).json({
            error: 'Failed to delete spare part'
        });
    }
});

// STOCK IN ROUTES
// Get all stock in records
app.get('/api/stock-in', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                si.StockInID,
                si.SparePartName,
                si.StockInQuantity,
                si.StockInDate,
                si.CreatedAt,
                sp.Category,
                sp.UnitPrice
            FROM Stock_In si
            LEFT JOIN Spare_Part sp ON si.SparePartName = sp.Name
            ORDER BY si.StockInDate DESC, si.CreatedAt DESC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get stock in records error:', error);
        res.status(500).json({
            error: 'Failed to fetch stock in records'
        });
    }
});

// Add new stock in record
app.post('/api/stock-in', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { sparePartName, stockInQuantity, stockInDate } = req.body;

        if (!sparePartName || !stockInQuantity || !stockInDate) {
            return res.status(400).json({
                error: 'Spare part name, quantity, and date are required'
            });
        }

        if (stockInQuantity <= 0) {
            return res.status(400).json({
                error: 'Stock in quantity must be positive'
            });
        }

        // Check if spare part exists
        const [spareParts] = await connection.execute(
            'SELECT Name, Quantity FROM Spare_Part WHERE Name = ?',
            [sparePartName]
        );

        if (spareParts.length === 0) {
            return res.status(404).json({
                error: 'Spare part not found'
            });
        }

        const currentQuantity = spareParts[0].Quantity;

        // Insert stock in record
        await connection.execute(`
            INSERT INTO Stock_In (SparePartName, StockInQuantity, StockInDate)
            VALUES (?, ?, ?)
        `, [sparePartName, stockInQuantity, stockInDate]);

        // Update spare part quantity
        const newQuantity = currentQuantity + parseInt(stockInQuantity);
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newQuantity, sparePartName]);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Stock in record added successfully',
            data: {
                sparePartName,
                stockInQuantity,
                stockInDate,
                newTotalQuantity: newQuantity
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Add stock in record error:', error);
        res.status(500).json({
            error: 'Failed to add stock in record'
        });
    } finally {
        connection.release();
    }
});

// Update stock in record
app.put('/api/stock-in/:id', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { stockInQuantity, stockInDate } = req.body;

        if (!stockInQuantity || !stockInDate) {
            return res.status(400).json({
                error: 'Quantity and date are required'
            });
        }

        if (stockInQuantity <= 0) {
            return res.status(400).json({
                error: 'Stock in quantity must be positive'
            });
        }

        // Get current stock in record
        const [currentRecords] = await connection.execute(
            'SELECT SparePartName, StockInQuantity FROM Stock_In WHERE StockInID = ?',
            [id]
        );

        if (currentRecords.length === 0) {
            return res.status(404).json({
                error: 'Stock in record not found'
            });
        }

        const { SparePartName, StockInQuantity: oldQuantity } = currentRecords[0];

        // Get current spare part quantity
        const [spareParts] = await connection.execute(
            'SELECT Quantity FROM Spare_Part WHERE Name = ?',
            [SparePartName]
        );

        const currentSparePartQuantity = spareParts[0].Quantity;

        // Calculate new spare part quantity
        const quantityDifference = parseInt(stockInQuantity) - oldQuantity;
        const newSparePartQuantity = currentSparePartQuantity + quantityDifference;

        if (newSparePartQuantity < 0) {
            return res.status(400).json({
                error: 'Cannot reduce stock in quantity: would result in negative spare part quantity'
            });
        }

        // Update stock in record
        await connection.execute(`
            UPDATE Stock_In
            SET StockInQuantity = ?, StockInDate = ?
            WHERE StockInID = ?
        `, [stockInQuantity, stockInDate, id]);

        // Update spare part quantity
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newSparePartQuantity, SparePartName]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Stock in record updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Update stock in record error:', error);
        res.status(500).json({
            error: 'Failed to update stock in record'
        });
    } finally {
        connection.release();
    }
});

// Delete stock in record
app.delete('/api/stock-in/:id', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get stock in record to delete
        const [records] = await connection.execute(
            'SELECT SparePartName, StockInQuantity FROM Stock_In WHERE StockInID = ?',
            [id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                error: 'Stock in record not found'
            });
        }

        const { SparePartName, StockInQuantity } = records[0];

        // Get current spare part quantity
        const [spareParts] = await connection.execute(
            'SELECT Quantity FROM Spare_Part WHERE Name = ?',
            [SparePartName]
        );

        const currentQuantity = spareParts[0].Quantity;
        const newQuantity = currentQuantity - StockInQuantity;

        if (newQuantity < 0) {
            return res.status(400).json({
                error: 'Cannot delete stock in record: would result in negative spare part quantity'
            });
        }

        // Delete stock in record
        await connection.execute('DELETE FROM Stock_In WHERE StockInID = ?', [id]);

        // Update spare part quantity
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newQuantity, SparePartName]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Stock in record deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Delete stock in record error:', error);
        res.status(500).json({
            error: 'Failed to delete stock in record'
        });
    } finally {
        connection.release();
    }
});

// STOCK OUT ROUTES
// Get all stock out records
app.get('/api/stock-out', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                so.StockOutID,
                so.SparePartName,
                so.StockOutQuantity,
                so.StockOutUnitPrice,
                so.StockOutTotalPrice,
                so.StockOutDate,
                so.CreatedAt,
                sp.Category,
                sp.UnitPrice as CurrentUnitPrice
            FROM Stock_Out so
            LEFT JOIN Spare_Part sp ON so.SparePartName = sp.Name
            ORDER BY so.StockOutDate DESC, so.CreatedAt DESC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get stock out records error:', error);
        res.status(500).json({
            error: 'Failed to fetch stock out records'
        });
    }
});

// Get stock out record by ID
app.get('/api/stock-out/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(`
            SELECT
                so.StockOutID,
                so.SparePartName,
                so.StockOutQuantity,
                so.StockOutUnitPrice,
                so.StockOutTotalPrice,
                so.StockOutDate,
                so.CreatedAt,
                sp.Category,
                sp.UnitPrice as CurrentUnitPrice
            FROM Stock_Out so
            LEFT JOIN Spare_Part sp ON so.SparePartName = sp.Name
            WHERE so.StockOutID = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Stock out record not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('Get stock out record error:', error);
        res.status(500).json({
            error: 'Failed to fetch stock out record'
        });
    }
});

// Add new stock out record
app.post('/api/stock-out', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { sparePartName, stockOutQuantity, stockOutUnitPrice, stockOutDate } = req.body;

        if (!sparePartName || !stockOutQuantity || !stockOutUnitPrice || !stockOutDate) {
            return res.status(400).json({
                error: 'Spare part name, quantity, unit price, and date are required'
            });
        }

        if (stockOutQuantity <= 0 || stockOutUnitPrice < 0) {
            return res.status(400).json({
                error: 'Stock out quantity must be positive and unit price must be non-negative'
            });
        }

        // Check if spare part exists and has sufficient quantity
        const [spareParts] = await connection.execute(
            'SELECT Name, Quantity FROM Spare_Part WHERE Name = ?',
            [sparePartName]
        );

        if (spareParts.length === 0) {
            return res.status(404).json({
                error: 'Spare part not found'
            });
        }

        const currentQuantity = spareParts[0].Quantity;

        if (currentQuantity < stockOutQuantity) {
            return res.status(400).json({
                error: `Insufficient stock. Available quantity: ${currentQuantity}`
            });
        }

        // Insert stock out record
        await connection.execute(`
            INSERT INTO Stock_Out (SparePartName, StockOutQuantity, StockOutUnitPrice, StockOutDate)
            VALUES (?, ?, ?, ?)
        `, [sparePartName, stockOutQuantity, stockOutUnitPrice, stockOutDate]);

        // Update spare part quantity
        const newQuantity = currentQuantity - parseInt(stockOutQuantity);
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newQuantity, sparePartName]);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Stock out record added successfully',
            data: {
                sparePartName,
                stockOutQuantity,
                stockOutUnitPrice,
                stockOutDate,
                newTotalQuantity: newQuantity
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Add stock out record error:', error);
        res.status(500).json({
            error: 'Failed to add stock out record'
        });
    } finally {
        connection.release();
    }
});

// Update stock out record
app.put('/api/stock-out/:id', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { stockOutQuantity, stockOutUnitPrice, stockOutDate } = req.body;

        if (!stockOutQuantity || !stockOutUnitPrice || !stockOutDate) {
            return res.status(400).json({
                error: 'Quantity, unit price, and date are required'
            });
        }

        if (stockOutQuantity <= 0 || stockOutUnitPrice < 0) {
            return res.status(400).json({
                error: 'Stock out quantity must be positive and unit price must be non-negative'
            });
        }

        // Get current stock out record
        const [currentRecords] = await connection.execute(
            'SELECT SparePartName, StockOutQuantity FROM Stock_Out WHERE StockOutID = ?',
            [id]
        );

        if (currentRecords.length === 0) {
            return res.status(404).json({
                error: 'Stock out record not found'
            });
        }

        const { SparePartName, StockOutQuantity: oldQuantity } = currentRecords[0];

        // Get current spare part quantity
        const [spareParts] = await connection.execute(
            'SELECT Quantity FROM Spare_Part WHERE Name = ?',
            [SparePartName]
        );

        const currentSparePartQuantity = spareParts[0].Quantity;

        // Calculate new spare part quantity
        const quantityDifference = oldQuantity - parseInt(stockOutQuantity);
        const newSparePartQuantity = currentSparePartQuantity + quantityDifference;

        if (newSparePartQuantity < 0) {
            return res.status(400).json({
                error: 'Cannot increase stock out quantity: insufficient stock available'
            });
        }

        // Update stock out record
        await connection.execute(`
            UPDATE Stock_Out
            SET StockOutQuantity = ?, StockOutUnitPrice = ?, StockOutDate = ?
            WHERE StockOutID = ?
        `, [stockOutQuantity, stockOutUnitPrice, stockOutDate, id]);

        // Update spare part quantity
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newSparePartQuantity, SparePartName]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Stock out record updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Update stock out record error:', error);
        res.status(500).json({
            error: 'Failed to update stock out record'
        });
    } finally {
        connection.release();
    }
});

// Delete stock out record
app.delete('/api/stock-out/:id', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get stock out record to delete
        const [records] = await connection.execute(
            'SELECT SparePartName, StockOutQuantity FROM Stock_Out WHERE StockOutID = ?',
            [id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                error: 'Stock out record not found'
            });
        }

        const { SparePartName, StockOutQuantity } = records[0];

        // Get current spare part quantity
        const [spareParts] = await connection.execute(
            'SELECT Quantity FROM Spare_Part WHERE Name = ?',
            [SparePartName]
        );

        const currentQuantity = spareParts[0].Quantity;
        const newQuantity = currentQuantity + StockOutQuantity;

        // Delete stock out record
        await connection.execute('DELETE FROM Stock_Out WHERE StockOutID = ?', [id]);

        // Update spare part quantity (add back the stock out quantity)
        await connection.execute(`
            UPDATE Spare_Part
            SET Quantity = ?
            WHERE Name = ?
        `, [newQuantity, SparePartName]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Stock out record deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Delete stock out record error:', error);
        res.status(500).json({
            error: 'Failed to delete stock out record'
        });
    } finally {
        connection.release();
    }
});

// REPORTS ROUTES
// Get daily stock out report
app.get('/api/reports/daily-stock-out', requireAuth, async (req, res) => {
    try {
        const { date } = req.query;

        // Use provided date or current date
        const reportDate = date || new Date().toISOString().split('T')[0];

        const [rows] = await pool.execute(`
            SELECT
                so.StockOutID,
                so.SparePartName,
                sp.Category,
                so.StockOutQuantity,
                so.StockOutUnitPrice,
                so.StockOutTotalPrice,
                so.StockOutDate,
                so.CreatedAt
            FROM Stock_Out so
            LEFT JOIN Spare_Part sp ON so.SparePartName = sp.Name
            WHERE DATE(so.StockOutDate) = ?
            ORDER BY so.CreatedAt DESC
        `, [reportDate]);

        // Calculate totals
        const totalQuantity = rows.reduce((sum, row) => sum + row.StockOutQuantity, 0);
        const totalValue = rows.reduce((sum, row) => sum + parseFloat(row.StockOutTotalPrice), 0);

        res.json({
            success: true,
            data: {
                reportDate,
                records: rows,
                summary: {
                    totalRecords: rows.length,
                    totalQuantity,
                    totalValue: totalValue.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error('Daily stock out report error:', error);
        res.status(500).json({
            error: 'Failed to generate daily stock out report'
        });
    }
});

// Get stock status report
app.get('/api/reports/stock-status', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                sp.Name as SparePartName,
                sp.Category,
                sp.Quantity as CurrentQuantity,
                sp.UnitPrice,
                COALESCE(stock_in_summary.TotalStockIn, 0) as TotalStockIn,
                COALESCE(stock_out_summary.TotalStockOut, 0) as TotalStockOut,
                sp.CreatedAt,
                sp.UpdatedAt
            FROM Spare_Part sp
            LEFT JOIN (
                SELECT
                    SparePartName,
                    SUM(StockInQuantity) as TotalStockIn
                FROM Stock_In
                GROUP BY SparePartName
            ) stock_in_summary ON sp.Name = stock_in_summary.SparePartName
            LEFT JOIN (
                SELECT
                    SparePartName,
                    SUM(StockOutQuantity) as TotalStockOut
                FROM Stock_Out
                GROUP BY SparePartName
            ) stock_out_summary ON sp.Name = stock_out_summary.SparePartName
            ORDER BY sp.Name
        `);

        // Calculate current total value for each item and add initial quantity calculation
        const processedRows = rows.map(row => {
            const currentQuantity = Math.max(0, row.CurrentQuantity); // Ensure non-negative
            const totalPrice = currentQuantity * parseFloat(row.UnitPrice || 0);

            // Calculate initial quantity: Current + Stock Out - Stock In
            const initialQuantity = currentQuantity + row.TotalStockOut - row.TotalStockIn;

            return {
                ...row,
                InitialQuantity: Math.max(0, initialQuantity), // Ensure non-negative
                CurrentQuantity: currentQuantity,
                TotalPrice: totalPrice.toFixed(2)
            };
        });

        // Calculate overall summary
        const totalParts = processedRows.length;
        const totalCurrentQuantity = processedRows.reduce((sum, row) => sum + row.CurrentQuantity, 0);
        const totalCurrentValue = processedRows.reduce((sum, row) => sum + parseFloat(row.TotalPrice || 0), 0);
        const totalStockIn = processedRows.reduce((sum, row) => sum + row.TotalStockIn, 0);
        const totalStockOut = processedRows.reduce((sum, row) => sum + row.TotalStockOut, 0);

        // Identify low stock items (less than 10 units)
        const lowStockItems = processedRows.filter(row => row.CurrentQuantity < 10);

        res.json({
            success: true,
            data: {
                sparePartStatus: processedRows,
                summary: {
                    totalParts,
                    totalCurrentQuantity,
                    totalCurrentValue: totalCurrentValue.toFixed(2),
                    totalStockIn,
                    totalStockOut,
                    lowStockItemsCount: lowStockItems.length
                },
                lowStockItems
            }
        });

    } catch (error) {
        console.error('Stock status report error:', error);
        res.status(500).json({
            error: 'Failed to generate stock status report'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Start server
const startServer = async () => {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`SIMS Backend Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`Frontend URL: http://localhost:5173`);
        });

    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
