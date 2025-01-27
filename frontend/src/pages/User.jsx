import React, { useEffect, useState } from "react";
import axios from "axios";

const User = ({ token, role, id }) => {
  const [userData, setUserData] = useState(null);
  const [history, setHistory] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [isRenting, setIsRenting] = useState(false);

  // Fetch user data when the component mounts
  const fetchUserData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserData(response.data);
      console.log(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's rental history
  const fetchUserHistory = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/user/${id}/rentals`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setHistory(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch available books for rent
  const fetchAvailableBooks = async () => {
    try {
      const response = await axios.get("http://localhost:5000/books", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAvailableBooks(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRentBook = async (bookId) => {
    setIsRenting(true);
    try {
      await axios.post(
        `http://localhost:5000/user/rentbook`,
        { bookId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchAvailableBooks();
      fetchUserHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRenting(false);
    }
  };

  // useEffect to fetch data on mount
  useEffect(() => {
    if (token && id) {
      setLoading(true);
      const fetchData = async () => {
        try {
          await fetchUserData(); // First fetch the user data
          await fetchUserHistory(); // Then fetch the rental history
          await fetchAvailableBooks(); // Finally fetch available books
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [token, id]);

  // Handle loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Handle errors
  if (error) {
    return <div>Error: {error}</div>;
  }

  const getTabClassName = (tabName) => {
    return activeTab === tabName
      ? "border-b-2 border-blue-500 px-6 py-3 text-lg text-gray-700 focus:outline-none hover:text-blue-600"
      : "px-6 py-3 text-lg text-gray-700 focus:outline-none hover:text-blue-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tab Navigation */}
      <div className="flex border-b-2 border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab("details")}
          className={getTabClassName("details")}
        >
          User Details
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={getTabClassName("history")}
        >
          Rental History
        </button>
        <button
          onClick={() => setActiveTab("rent")}
          className={getTabClassName("rent")}
        >
          Rent Books
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h1 className="text-2xl font-bold mb-4">User Details</h1>
          {userData ? (
            <>
              <p className="mb-2">
                <strong>Name:</strong> {userData.name}
              </p>
              <p className="mb-2">
                <strong>Phone:</strong> {userData.phone}
              </p>
              <p className="mb-2">
                <strong>Role:</strong> {role}
              </p>
              {/* format the date */}
              <p className="mb-2">
                <strong> Member Since: </strong>
                {new Date(userData.created_at).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p>Loading user data...</p>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">Rental History</h2>
          {history.length > 0 ? (
            <ul className="space-y-4">
              {history.map((rental) => (
                <li
                  key={rental.rental_id}
                  className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50"
                >
                  <p className="font-semibold text-gray-700">
                    Book Title: {rental.book_title}
                  </p>
                  <p>Rent Date: {rental.rent_date}</p>
                  <p>
                    Return Date:{" "}
                    {rental.return_date
                      ? new Date(rental.return_date).toLocaleDateString()
                      : "Not returned"}
                  </p>
                  <p>Returned: {`${rental.returned}`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No rental history.</p>
          )}
        </div>
      )}

      {activeTab === "rent" && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">Rent a Book</h2>
          {availableBooks.length > 0 ? (
            <ul className="space-y-4">
              {availableBooks.map((book) => (
                <li
                  key={book.id}
                  className="flex flex-col gap-4 p-4 border-2 border-gray-300 rounded-lg bg-green-100"
                >
                  <p>
                    Book ID:{" "}
                    <span className="font-bold text-fuchsia-500">
                      {book.id}
                    </span>
                  </p>
                  <p>Book Title: {book.title}</p>
                  <p>Author: {book.author}</p>
                  <p>Genre: {book.genre}</p>
                  <p>Available Copies: {book.available_copies}</p>
                  <button
                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                    onClick={() => handleRentBook(book.id)}
                    disabled={isRenting} // Disable while renting
                  >
                    {isRenting ? "Renting..." : "Rent"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No available books.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default User;

// app.get("/user/:id", authenticateToken, async (req, res) => {
//   const { id } = req.params;

//   // Validate the id (ensure it's a valid number)
//   if (isNaN(id)) {
//     return res.status(400).json({ error: "Invalid user ID format" });
//   }

//   try {
//     const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [
//       id,
//     ]);
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.put("/user/:id", authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   const { name, phone, password } = req.body;

//   try {
//     const result = await pool.query(
//       "UPDATE customers SET name = $1, phone = $2, password = $3 WHERE id = $4",
//       [name, phone, password, id]
//     );
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     res.status(200).json({ message: "User updated successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/user/rentbook", authenticateToken, async (req, res) => {
//   const { bookId } = req.body;

//   try {
//     const bookResult = await pool.query("SELECT * FROM books WHERE id = $1", [
//       bookId,
//     ]);

//     if (bookResult.rows.length === 0) {
//       return res.status(404).json({ error: "Book not found" });
//     }

//     const book = bookResult.rows[0];
//     if (book.available_copies <= 0) {
//       return res.status(400).json({ error: "No copies available for rent" });
//     }

//     await pool.query("BEGIN");

//     await pool.query(
//       "UPDATE books SET available_copies = available_copies - 1, rented_copies = rented_copies + 1 WHERE id = $1",
//       [bookId]
//     );

//     const rentalResult = await pool.query(
//       "INSERT INTO rentals (customer_id, book_id) VALUES ($1, $2) RETURNING *",
//       [req.user.id, bookId]
//     );

//     await pool.query("COMMIT");
//     res.status(201).json(rentalResult.rows[0]);
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/user/returnbook", authenticateToken, async (req, res) => {
//   const { rentalId } = req.body;

//   try {
//     const rentalResult = await pool.query(
//       "SELECT * FROM rentals WHERE id = $1 AND customer_id = $2 AND returned = FALSE",
//       [rentalId, req.user.id]
//     );

//     if (rentalResult.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "Rental not found or already returned" });
//     }

//     const rental = rentalResult.rows[0];

//     await pool.query("BEGIN");

//     await pool.query(
//       "UPDATE books SET available_copies = available_copies + 1, rented_copies = rented_copies - 1 WHERE id = $1",
//       [rental.book_id]
//     );

//     await pool.query(
//       "UPDATE rentals SET returned = TRUE, return_date = CURRENT_TIMESTAMP WHERE id = $1",
//       [rentalId]
//     );

//     await pool.query("COMMIT");
//     res.status(200).json({ message: "Book returned successfully" });
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.get("/user/:id/rentals", authenticateToken, async (req, res) => {
//   try {
//     console.log("to check", req.user);

//     const result = await pool.query(
//       `
//       SELECT
//         rentals.id AS rental_id,
//         books.title AS book_title,
//         rentals.rent_date,
//         rentals.return_date,
//         rentals.returned
//       FROM rentals
//       JOIN books ON rentals.book_id = books.id
//       WHERE rentals.customer_id = $1
//       ORDER BY rentals.rent_date DESC
//       `,
//       [req.user.id]
//     );

//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
