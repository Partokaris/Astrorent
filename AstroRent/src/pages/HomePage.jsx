import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Bed, Bath } from "lucide-react";
import VerificationBadge from "../components/VerificationBadge";

function HomePage() {
  const [houses, setHouses] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/houses")
      .then((res) => res.json())
      .then((data) => setHouses(data))
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">
          AstroRent
        </h1>

        <div className="flex items-center gap-6">
          <button className="hover:text-blue-600">Home</button>
          <button className="hover:text-blue-600">Listings</button>
          <Link to="/login" className="hover:text-blue-600">
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Sign up
          </Link>
        </div>
      </nav>


      {/* Hero Section */}
      <div className="bg-blue-600 text-white px-8 py-20 text-center">

        <h2 className="text-4xl font-bold mb-4">
          Find Your Perfect Rental Home
        </h2>

        <p className="mb-8 text-lg">
          Search houses anywhere in Kenya
        </p>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-white px-5 py-3 font-semibold text-blue-600 hover:bg-blue-50"
          >
            Login
          </Link>
          <Link
            to="/signup/home-finder"
            className="rounded-lg border border-white px-5 py-3 font-semibold text-white hover:bg-white hover:text-blue-600"
          >
            Sign up as home finder
          </Link>
          <Link
            to="/signup/home-owner"
            className="rounded-lg border border-white px-5 py-3 font-semibold text-white hover:bg-white hover:text-blue-600"
          >
            Sign up as home owner
          </Link>
        </div>


        {/* Search Box */}
        <div className="bg-white rounded-xl p-3 flex max-w-2xl mx-auto shadow-lg">

          <input
            type="text"
            placeholder="Search by location..."
            className="flex-1 outline-none text-black px-3"
          />

          <button className="bg-blue-600 px-6 py-2 rounded-lg">
            <Search size={20} />
          </button>

        </div>

      </div>


      {/* Listings */}
      <div className="px-8 py-12">

        <h2 className="text-3xl font-bold mb-8">
          Featured Properties
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {houses.map((house) => (
            <div
              key={house.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition"
            >

              <img
                src={house.image}
                alt={house.title}
                className="h-56 w-full object-cover"
              />

              <div className="p-5">

                <h3 className="text-xl font-bold mb-2">
                  {house.title}
                </h3>

                <div className="mb-3">
                  <VerificationBadge status={house.status} compact />
                </div>

                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <MapPin size={16} />
                  <span>{house.location}</span>
                </div>

                <p className="text-blue-600 font-bold text-xl mb-4">
                  Ksh {house.price}
                </p>

                <div className="flex gap-5 text-gray-600 mb-4">

                  <div className="flex items-center gap-1">
                    <Bed size={16} />
                    {house.beds}
                  </div>

                  <div className="flex items-center gap-1">
                    <Bath size={16} />
                    {house.baths}
                  </div>

                </div>

                <Link to={`/houses/${house.id}`} className="w-full block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  View Details
                </Link>

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}

export default HomePage;
