import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPanel({ token, role, id }) {
  const [admin, setAdmin] = useState([]);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [reports, setReports] = useState({});
  const [activeTab, setActiveTab] = useState("adminDetails");

  // State for modal/dialog
  const [editBook, setEditBook] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // Fetch admin data
  const fetchAdmin = async () => {
    try {
      const response = await axios.get(
        `https://haris-libra-rent.netlify.app/${role}/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAdmin(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch users, books, rentals, and reports data
  const fetchUsersData = async () => {
    try {
      const response = await axios.get(
        `https://haris-libra-rent.netlify.app/${role}/${id}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBooks = async () => {
    try {
      const response = await axios.get(
        `https://haris-libra-rent.netlify.app/${role}/${id}/books`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBooks(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRentals = async () => {
    try {
      const response = await axios.get(
        `https://haris-libra-rent.netlify.app/${role}/${id}/rentals/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRentals(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get(
        `https://haris-libra-rent.netlify.app/${role}/${id}/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Update book details
  const handleUpdateBook = async () => {
    try {
      await axios.put(
        `https://haris-libra-rent.netlify.app/${role}/${id}/book/${editBook.id}`,
        editBook,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Book updated successfully!");
      setEditBook(null);
      fetchBooks();
    } catch (err) {
      console.error(err);
      alert("Failed to update book.");
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId) => {
    try {
      await axios.delete(
        `https://haris-libra-rent.netlify.app/${role}/${id}/book/${bookId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Book deleted successfully!");
      fetchBooks();
    } catch (err) {
      console.error(err);
      alert("Failed to delete book.");
    }
  };

  // Reset user password
  // /admin/:id/user/:userId/edit
  const handleUserDetails = async () => {
    try {
      await axios.put(
        `https://haris-libra-rent.netlify.app/${role}/${id}/user/edit/${editUser.id}`,
        editUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("User details updated successfully!");
      setEditUser(null);
    } catch (err) {
      console.error(err);
      alert("Failed to reset user details.");
    }
  };

  // Update user role
  const handleUpdateRole = async () => {
    try {
      await axios.put(
        `https://haris-libra-rent.netlify.app/${role}/${id}/user/${editUser.id}/role`,
        { role: editUser.role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("User role updated successfully!");
      setEditUser(null);
      fetchUsersData();
    } catch (err) {
      console.error(err);
      alert("Failed to update role.");
    }
  };

  useEffect(() => {
    fetchAdmin();
    fetchUsersData();
    fetchBooks();
    fetchRentals();
    fetchReports();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 lg:block justify-center sm:block md:block max-sm:hidden">
          <TabsTrigger value="adminDetails">Admin Details</TabsTrigger>
          <TabsTrigger value="usersDetails">Customers Details</TabsTrigger>
          <TabsTrigger value="books">All Books</TabsTrigger>
          <TabsTrigger value="rent">Rented Books Details</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="adminDetails">
          <h2 className="text-2xl font-semibold mb-4">Admin Details</h2>
          <Card className="p-4">
            <p>
              <strong>ID:</strong> {admin.id}
            </p>
            <p>
              <strong>Name:</strong> {admin.name}
            </p>
            <p>
              <strong>Phone:</strong> {admin.phone}
            </p>
            <p>
              <strong>Role:</strong> {admin.role}
            </p>
            <p>
              <strong>Admin since:</strong>{" "}
              {admin.created_at && new Date(admin.created_at).toDateString()}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="usersDetails">
          <h2 className="text-2xl font-semibold mb-4">Customers Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map((user) => (
              <Card key={user.id} className="p-4 flex ">
                <section>
                  <p>
                    <strong>ID:</strong> {user.id}
                  </p>
                  <p>
                    <strong>Name:</strong> {user.name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {user.phone}
                  </p>
                  <p>
                    <strong>Role:</strong> {user.role}
                  </p>
                  <p>
                    <strong>Customer since:</strong>{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </section>
                <Button
                  className="ml-auto bg-green-600"
                  onClick={() =>
                    setEditUser({
                      ...user,
                      id: user.id,
                      name: user.name,
                      phone: user.phone,
                      role: user.role,
                      newPassword: "",
                    })
                  }
                >
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="books">
          <h2 className="text-2xl font-semibold mb-4">All Books</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {books.map((book) => (
              <Card key={book.id} className="p-4">
                <section className="mb-4">
                  <p>
                    <strong>ID:</strong> {book.id}
                  </p>
                  <p>
                    <strong>Title:</strong> {book.title}
                  </p>
                  <p>
                    <strong>Author:</strong> {book.author}
                  </p>
                  <p>
                    <strong>Genre:</strong> {book.genre}
                  </p>
                  <p>
                    <strong>Price:</strong> {book.price}
                  </p>
                  <p>
                    <strong>Available Copies:</strong> {book.available_copies}
                  </p>
                </section>
                <section className="flex gap-2 justify-between">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteBook(book.id)}
                  >
                    Delete
                  </Button>
                  <Button variant="outline" onClick={() => setEditBook(book)}>
                    Edit
                  </Button>
                </section>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rent">
          <h2 className="text-2xl font-semibold mb-4">Rented Books Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rentals.map((rental) => (
              <Card key={rental.rental_id} className="p-4">
                <p>
                  <strong>Rental ID:</strong> {rental.rental_id}
                </p>
                <p>
                  <strong>Book ID:</strong> {rental.book_id}
                </p>
                <p>
                  <strong>Book Title:</strong> {rental.book_title}
                </p>
                <p>
                  <strong>User ID:</strong> {rental.user_id}
                </p>
                <p>
                  <strong>Customer Name:</strong> {rental.customer_name}
                </p>
                <p>
                  <strong>Customer Phone:</strong> {rental.customer_phone}
                </p>
                <p>
                  <strong>Rent Date:</strong>{" "}
                  {rental.rent_date &&
                    new Date(rental.rent_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Return Date:</strong>{" "}
                  {rental.return_date
                    ? new Date(rental.return_date).toLocaleDateString()
                    : "Not yet returned"}
                </p>
                <p>
                  <strong>Returned:</strong>{" "}
                  {rental.returned ? (
                    <span className="text-green-600 font-bold">Yes</span>
                  ) : (
                    <span className="text-red-600 font-bold">No</span>
                  )}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <h2 className="text-2xl font-semibold mb-4">Reports</h2>
          <Card className="p-4">
            <p>
              <strong>Total Users:</strong> {reports.totalUsers}
            </p>
            <p>
              <strong>Total Books:</strong> {reports.totalBooks}
            </p>
            <p>
              <strong>Total Rentals:</strong> {reports.totalRentals}
            </p>
            <p>
              <strong>Overdue Rentals:</strong> {reports.overdueRentals}
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Book Dialog */}
      {editBook && (
        <Dialog open={Boolean(editBook)} onOpenChange={() => setEditBook(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Book</DialogTitle>
            </DialogHeader>

            <Input
              value={editBook.title}
              onChange={(e) =>
                setEditBook({ ...editBook, title: e.target.value })
              }
              placeholder="Title"
            />
            <Input
              type="text"
              value={editBook.author}
              onChange={(e) =>
                setEditBook({ ...editBook, author: e.target.value })
              }
              placeholder="Author"
            />
            <Input
              type="text"
              value={editBook.genre}
              onChange={(e) =>
                setEditBook({ ...editBook, genre: e.target.value })
              }
              placeholder="Genre"
            />
            <Input
              type="number"
              value={editBook.price}
              onChange={(e) =>
                setEditBook({ ...editBook, price: e.target.value })
              }
              placeholder="Price"
            />
            <Input
              type="number"
              value={editBook.available_copies}
              onChange={(e) =>
                setEditBook({ ...editBook, available_copies: e.target.value })
              }
              placeholder="Available Copies"
            />

            <Button onClick={handleUpdateBook}>Update</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open={Boolean(editUser)} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset User Details</DialogTitle>
            </DialogHeader>
            <Input value={editUser.id} readOnly />
            <Input
              value={editUser.name}
              onChange={(e) =>
                setEditUser({ ...editUser, name: e.target.value })
              }
              placeholder="Name"
            />
            <Input
              value={editUser.phone}
              onChange={(e) =>
                setEditUser({ ...editUser, phone: e.target.value })
              }
              placeholder="Phone"
            />
            {/* edit role */}
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              defaultValue={editUser.role}
              onChange={(e) =>
                setEditUser({ ...editUser, role: e.target.value })
              }
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Input
              value={editUser.newPassword}
              onChange={(e) =>
                setEditUser({ ...editUser, newPassword: e.target.value })
              }
              placeholder="New Password"
              type="password"
            />
            <Button onClick={handleUserDetails}>Reset</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
