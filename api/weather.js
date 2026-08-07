// api/weather.js
const axios = require('axios');

module.exports = async (req, res) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY; // use env variable, not hardcoded
  try {
    let lat, lon, cityName = req.query.city;

    if (req.query.lat && req.query.lon) {
      lat = parseFloat(req.query.lat);
      lon = parseFloat(req.query.lon);
      const reverseRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      cityName = reverseRes.data.name;
    } else if (cityName) {
      const geoRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${API_KEY}`
      );
      lat = geoRes.data.coord.lat;
      lon = geoRes.data.coord.lon;
      cityName = geoRes.data.name;
    } else {
      return res.status(400).json({ error: "No city or coordinates provided" });
    }

    const currentRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    const forecastRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    // build your response object (daily, hourly, etc.)
    const data = {
      city: currentRes.data.name,
      country: currentRes.data.sys.country,
      coord: currentRes.data.coord,
      // … include daily, hourlyToday, hourlyTomorrow, hourlyRain, otherCities as in your original code
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
