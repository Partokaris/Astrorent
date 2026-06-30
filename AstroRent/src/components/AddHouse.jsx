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
  const [files, setFiles] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let images = [];

    // If files selected, upload them first
    if (files && files.length > 0) {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
      const token = localStorage.getItem('token') || null;
      const uploadRes = await fetch('http://127.0.0.1:5000/api/uploads', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        images = uploadData.images || (uploadData.urls || []).map((url) => ({ url }));
      }
    }

    const payload = {
      ...form,
      images
    };

    const token = localStorage.getItem('token') || null;
    await fetch("http://127.0.0.1:5000/api/houses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
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

  <label className="block mb-3">Images</label>
  <input type="file" multiple onChange={handleFileChange} className="border p-2 w-full mb-3" />

      <input name="beds" placeholder="Beds" onChange={handleChange} className="border p-2 w-full mb-3" />

      <input name="baths" placeholder="Baths" onChange={handleChange} className="border p-2 w-full mb-3" />

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Add House
      </button>

    </form>
  );
}

export default AddHouse;
