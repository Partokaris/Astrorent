import { useState } from "react";

function AddHouse() {

  const [form, setForm] = useState({
    title: "",
    location: "",
    price: "",
    image: "",
    beds: "",
    baths: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("http://127.0.0.1:5000/api/houses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    alert("House added!");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow"
    >

      <input name="title" placeholder="Title" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="location" placeholder="Location" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="price" placeholder="Price" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="image" placeholder="Image URL" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="beds" placeholder="Beds" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="baths" placeholder="Baths" onChange={handleChange} className="border p-2 w-full mb-3" />

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Add House
      </button>

    </form>
  );
}

export default AddHouse;