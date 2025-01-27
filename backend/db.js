const { Pool } = require("pg");
const express = require("express");
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const Joi = require("joi");

app.use(
  cors({
    origin: "http://localhost:5173", // Change this to your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

require("dotenv").config();
app.use(express.json());

JWT_SECRET = process.env.JWT_SECRET;
JWT_EXPIRES = process.env.JWT_EXPIRES;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool
  .connect()
  .then(() => console.log("Connected to database"))
  .catch((err) => console.error("Database connection error: ", err));

//   ALTER TABLE books
// ADD COLUMN available_copies INTEGER DEFAULT 0,
// ADD COLUMN rented_copies INTEGER DEFAULT 0;
// UPDATE books SET available_copies = copies;

(async () => {
  try {
    await pool.connect();
    console.log("Connected to database");
    const createCustomersTable = `
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(255) CHECK (role IN ('user', 'admin')) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        copies INTEGER NOT NULL,
        available_copies INTEGER DEFAULT 0,
        rented_copies INTEGER DEFAULT 0
      );
    `;
    const createRentalTable = `
    CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    rent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP,
    returned BOOLEAN DEFAULT FALSE
      );

    `;

    await pool.query(createCustomersTable);
    await pool.query(createBooksTable);
    await pool.query(createRentalTable);
    console.log("Created tables successfully");
  } catch (error) {
    console.log("Error creating table:", error);
  }
})();

// customer schema validation

const regSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  phone: Joi.string()
    .min(10)
    .max(10)
    .pattern(/^[0-9]+$/)
    .required(),
  password: Joi.string()
    .min(6)
    .max(255)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
    )
    .required(),
  role: Joi.string().valid("user", "admin").required(),
});

// const regValidate = (req, res, next) => {
//   const { error } = regSchema.validate(req.body);
//   if (error) {
//     console.log(error);
//     return res.status(400).json({ error: error.details[0].message });
//   }
//   next();
// };

// book schema validation
const bookSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  author: Joi.string().min(3).max(255).required(),
  genre: Joi.string().min(3).max(255).required(),
  price: Joi.number().min(1).required(),
  copies: Joi.number().min(1).required(),
});

const bookValidate = (req, res, next) => {
  const { error } = bookSchema.validate(req.body);
  if (error) {
    console.log(error);
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

// registering
app.post("/register", async (req, res) => {
  const { error } = regSchema.validate(req.body);
  if (error) {
    console.log(error);
    return res.status(400).json({ error: error.details[0].message });
  }
  const { name, phone, password, role } = req.body;
  try {
    const existingUser = await pool.query(
      "SELECT * FROM customers WHERE phone = $1",
      [phone]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO customers (name, phone, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, phone, hashedPassword, role]
    );
    console.log(result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// adding books
app.post("user/:id/addbook", bookValidate, async (req, res) => {
  const { title, author, genre, price, copies } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO books (title, author, genre, price, copies, available_copies) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, author, genre, price, copies]
    );
    console.log(result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// login
app.post("/login", async (req, res) => {
  const loginSchema = Joi.object({
    name: Joi.string().required(),
    password: Joi.string().required(),
    role: Joi.string().valid("user", "admin").required(),
  });

  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, password, role } = req.body;

  try {
    const result = await pool.query("SELECT * FROM customers WHERE name = $1", [
      name,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role !== role) {
      return res.status(403).json({ error: "Access denied for this role" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// authenticateToken
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded Token: ", decoded);

    const userResult = await pool.query(
      `SELECT * FROM customers WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json([{ error: "Invalid token" }]);
  }
};



const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access forbidden: Insufficient permission" });
  }
  next();
};


app.get("/user/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Validate the id (ensure it's a valid number)
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  try {
    const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update user details
app.put("/user/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, password } = req.body;

  try {
    const result = await pool.query(
      "UPDATE customers SET name = $1, phone = $2, password = $3 WHERE id = $4",
      [name, phone, password, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/user/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM customers WHERE id = $1`, [
      id,
    ]);

    if (result.rowCount === 0) {
      console.log("User not found");
      return res.status(404).json({ error: "User not found" });
    } else {
      console.log("User deleted successfully");
      res.status(200).json({ message: "User deleted successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/user/rentbook", authenticateToken, async (req, res) => {
  const { bookId } = req.body;

  try {
    const bookResult = await pool.query("SELECT * FROM books WHERE id = $1", [
      bookId,
    ]);

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const book = bookResult.rows[0];
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: "No copies available for rent" });
    }

    await pool.query("BEGIN");

    await pool.query(
      "UPDATE books SET available_copies = available_copies - 1, rented_copies = rented_copies + 1 WHERE id = $1",
      [bookId]
    );



    const rentalResult = await pool.query(
      "INSERT INTO rentals (customer_id, book_id) VALUES ($1, $2) RETURNING *",
      [req.user.id, bookId]
    );

    await pool.query("COMMIT");
    res.status(201).json(rentalResult.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/user/returnbook", authenticateToken, async (req, res) => {
  const { rentalId } = req.body;

  try {
    const rentalResult = await pool.query(
      "SELECT * FROM rentals WHERE id = $1 AND customer_id = $2 AND returned = FALSE",
      [rentalId, req.user.id]
    );

    if (rentalResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Rental not found or already returned" });
    }

    const rental = rentalResult.rows[0];

    await pool.query("BEGIN");

    await pool.query(
      "UPDATE books SET available_copies = available_copies + 1, rented_copies = rented_copies - 1 WHERE id = $1",
      [rental.book_id]
    );


    await pool.query(
      "UPDATE rentals SET returned = TRUE, return_date = CURRENT_TIMESTAMP WHERE id = $1",
      [rentalId]
    );

    await pool.query("COMMIT");
    res.status(200).json({ message: "Book returned successfully" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//  View Books for Rent (/books)

app.get("/books", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, author, genre, price, available_copies FROM books WHERE available_copies > 0"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(
  "/admin/rentals",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        rentals.id AS rental_id, 
        customers.name AS customer_name, 
        books.title AS book_title, 
        rentals.rent_date, 
        rentals.return_date, 
        rentals.returned 
      FROM rentals
      JOIN customers ON rentals.customer_id = customers.id
      JOIN books ON rentals.book_id = books.id
      ORDER BY rentals.rent_date DESC
    `);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get("/user/:id/rentals", authenticateToken, async (req, res) => {
  try {
    console.log("to check", req.user);

    const result = await pool.query(
      `
      SELECT 
        rentals.id AS rental_id, 
        books.title AS book_title, 
        rentals.rent_date, 
        rentals.return_date, 
        rentals.returned 
      FROM rentals
      JOIN books ON rentals.book_id = books.id
      WHERE rentals.customer_id = $1
      ORDER BY rentals.rent_date DESC
      `,
      [req.user.id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//




app.get("/admin/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;

  // Validate the id (ensure it's a valid number)
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  } else {
    try {
      const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [
        id,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log(result.rows[0]);
      res.status(200).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Get All Books (Admin)
app.get("/admin/:id/books", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, author, genre, price, available_copies FROM books WHERE available_copies > 0"
    );
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Rental Details (Admin)
app.get("/admin/:id/rentals/details", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        rentals.id AS rental_id, 
        customers.id AS customer_id,
        customers.name AS customer_name,
        books.id AS book_id, 
        books.title AS book_title, 
        rentals.rent_date, 
        rentals.return_date, 
        rentals.returned 
      FROM rentals
      JOIN customers ON rentals.customer_id = customers.id
      JOIN books ON rentals.book_id = books.id
      ORDER BY rentals.rent_date
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Overdue Rentals (Admin)
app.get("/admin/:id/overdue-rentals", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        rentals.id AS rental_id, 
        customers.name AS customer_name, 
        books.title AS book_title, 
        rentals.rent_date, 
        rentals.return_date 
      FROM rentals
      JOIN customers ON rentals.customer_id = customers.id
      JOIN books ON rentals.book_id = books.id
      WHERE rentals.returned = FALSE AND rentals.return_date < CURRENT_TIMESTAMP
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Book Rental History (Admin)
app.get("/admin/:id/book/:bookId/rentals", authenticateToken, authorizeAdmin, async (req, res) => {
  const { bookId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        rentals.id AS rental_id, 
        customers.name AS customer_name, 
        rentals.rent_date, 
        rentals.return_date, 
        rentals.returned 
      FROM rentals
      JOIN customers ON rentals.customer_id = customers.id
      WHERE rentals.book_id = $1
      ORDER BY rentals.rent_date DESC
    `, [bookId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Search Users (Admin)
app.get("/admin/:id/users/search", authenticateToken, authorizeAdmin, async (req, res) => {
  const { searchTerm } = req.query; // can search by name or phone number
  try {
    const result = await pool.query(`
      SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1
    `, [`%${searchTerm}%`]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Get User Details by ID (Admin)
app.get("/admin/:id/user/:userId", authenticateToken, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, name, phone, role, created_at FROM customers WHERE id = $1",
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Reset User details (Admin)
app.put("/admin/:id/user/edit/:userId", authenticateToken, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const { name, phone, role, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    const result = await pool.query(
      "UPDATE customers SET name = $1, phone = $2, role = $3, password = $4 WHERE id = $5",
      [name, phone, role, hashedPassword, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User details updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});




// Update Book Copies (Admin)
app.put("/admin/:id/book/:bookId/copies", authenticateToken, authorizeAdmin, async (req, res) => {
  const { bookId } = req.params;
  const { copies } = req.body; // New copy count
  try {
    const result = await pool.query(`
      UPDATE books 
      SET copies = $1, available_copies = GREATEST($1 - rented_copies, 0)
      WHERE id = $2
    `, [copies, bookId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json({ message: "Book copies updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});




// Endpoint to get all users
app.get(
  "/admin/:id/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM customers");
      // decode password
      const password = bcrypt.hashSync(result.rows[0].password, 10);
      res.status(200).json(result.rows.map((row) => ({ ...row, password })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Endpoint to delete a user by admin
app.delete(
  "/admin/:id/user/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(`DELETE FROM customers WHERE id = $1`, [
        id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Endpoint to manage books (CRUD)
// Update book details
app.put(
  "/admin/:id/book/:bookId",
  authenticateToken,
  authorizeAdmin,
  bookValidate,
  async (req, res) => {
    const { bookId } = req.params;
    const { title, author, genre, price, copies } = req.body;

    try {
      const result = await pool.query(
        "UPDATE books SET title = $1, author = $2, genre = $3, price = $4, copies = $5, available_copies = $5 - rented_copies WHERE id = $6",
        [title, author, genre, price, copies, bookId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.status(200).json({ message: "Book updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Delete Book (Admin)
app.delete("/admin/:id/book/:bookId", authenticateToken, authorizeAdmin, async (req, res) => {
  const { bookId } = req.params;

  try {
    const result = await pool.query("DELETE FROM books WHERE id = $1", [bookId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Update User Role (Admin)
app.put("/admin/:id/user/:userId/role", authenticateToken, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const result = await pool.query(
      "UPDATE customers SET role = $1 WHERE id = $2 RETURNING id, name, phone, role",
      [role, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User role updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Generate Reports (Admin)
app.get("/admin/:id/reports", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) AS total_users FROM customers");
    const totalBooks = await pool.query("SELECT COUNT(*) AS total_books FROM books");
    const totalRentals = await pool.query("SELECT COUNT(*) AS total_rentals FROM rentals");
    const overdueRentals = await pool.query(
      "SELECT COUNT(*) AS overdue_rentals FROM rentals WHERE returned = FALSE AND return_date < CURRENT_TIMESTAMP"
    );

    res.status(200).json({
      totalUsers: totalUsers.rows[0].total_users,
      totalBooks: totalBooks.rows[0].total_books,
      totalRentals: totalRentals.rows[0].total_rentals,
      overdueRentals: overdueRentals.rows[0].overdue_rentals,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

// -----------------------------------------------------------------------------

// authentication
// const authenticateToken = async (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   if (!authHeader) {
//     return res.status(401).json({ message: "No token provided" });
//   }
//   const token = authHeader && authHeader.split(" ")[1];
//   if (!token) {
//     return res.status(401).json({ message: "Invalid token format" });
//   }

//   jwt.verify(token, JWT_SECRET, async (err, user) => {
//     if (err) {
//       return res.status(401).json({ message: "Invalid token" });
//     }
//     try {
//       const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [
//         user.userId,
//       ]);
//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "User not found" });
//       }
//       req.user = result.rows[0];
//       next();
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   });
// };

// authorization
// const authorizeAdmin = (req, res, next) => {
//   if (req.user.role !== "admin") {
//     console.log({
//       message: "Access forbidden: Insufficient permission",
//     });

//     return res
//       .status(403)
//       .json({ error: "Access forbidden: Insufficient permission" });
//   }
//   console.log({ message: "Access granted" });
//   next();
// };

// -----------------------------------------------------------------------------

// Pagination for Books and Rentals:

// Implement pagination for /books, /admin/rentals, and /user/:id/rentals to handle large datasets effectively.

// SELECT id, title, author, genre, price, available_copies
// FROM books
// WHERE available_copies > 0
// LIMIT $1 OFFSET $2;

// In your API:

// app.get("/books", authenticateToken, async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   const offset = (page - 1) * limit;

//   try {
//     const result = await pool.query(
//       "SELECT id, title, author, genre, price, available_copies FROM books WHERE available_copies > 0 LIMIT $1 OFFSET $2",
//       [limit, offset]
//     );
//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
