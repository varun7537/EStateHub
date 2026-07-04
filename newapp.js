import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

const App = () => {
  const [bookName, setBookName] = useState('');
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [editId, setEditId] = useState(null);

  // Add new book
  const addBook = () => {
    if (bookName.trim() === '') return;

    const newBook = {
      id: Date.now().toString(),
      title: bookName,
    };

    setBooks([...books, newBook]);
    setBookName('');
  };

  // Delete book
  const deleteBook = (id) => {
    setBooks(books.filter(book => book.id !== id));

    // If deleting the book currently being edited
    if (editId === id) {
      setEditId(null);
      setBookName('');
    }
  };

  // Edit book
  const editBook = (item) => {
    setBookName(item.title);
    setEditId(item.id);
  };

  // Update book
  const updateBook = () => {
    if (bookName.trim() === '') return;

    const updatedBooks = books.map(book =>
      book.id === editId
        ? { ...book, title: bookName }
        : book
    );

    setBooks(updatedBooks);
    setBookName('');
    setEditId(null);
  };

  // Search filter
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Book CRUD</Text>

      <TextInput
        value={bookName}
        onChangeText={setBookName}
        placeholder="Enter book name"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={editId ? updateBook : addBook}
      >
        <Text style={styles.buttonText}>
          {editId ? 'Update Book' : 'Add Book'}
        </Text>
      </TouchableOpacity>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search books..."
        style={styles.input}
      />

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            No books found
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.bookTitle}>{item.title}</Text>

            <View style={styles.row}>
              <TouchableOpacity onPress={() => editBook(item)}>
                <Text style={styles.edit}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => deleteBook(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: 'black',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  edit: {
    color: 'blue',
    fontWeight: 'bold',
  },
  delete: {
    color: 'red',
    fontWeight: 'bold',
  },
});

export default App;