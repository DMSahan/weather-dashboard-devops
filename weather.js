require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static(path.join(__dirname, 'src')));

app.get('/api/weather', async (req, res) => {
  try {
    let lat, lon, cityName = req.query.city;

    if (req.query.lat && req.query.lon) {
      lat = parseFloat(req.query.lat);
      lon = parseFloat(req.query.lon);
      try {
        const reverseRes = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        cityName = reverseRes.data.name;
      } catch (e) { cityName = "Unknown"; }
    } else if (cityName) {
      const geoRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${API_KEY}`
      );
      lat = geoRes.data.coord.lat;
      lon = geoRes.data.coord.lon;
      cityName = geoRes.data.name;
    } else {
      throw new Error("No city or coordinates provided");
    }

    const currentRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    const { coord, sys, name } = currentRes.data;

    const forecastRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );

    const timezoneOffset = currentRes.data.timezone || 0;
    const list = forecastRes.data.list;
    const step = Math.max(1, Math.floor(list.length / 7));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const daily = [];
    for (let i = 0; i < 7; i++) {
      const idx = Math.min(i * step, list.length - 1);
      const item = list[idx] || list[0];
      const dt = new Date((item.dt + timezoneOffset) * 1000);
      const sunriseDt = new Date((sys.sunrise + timezoneOffset) * 1000);
      const sunsetDt = new Date((sys.sunset + timezoneOffset) * 1000);
      daily.push({
        dayName: i === 0 ? 'Today' : days[dt.getUTCDay()],
        time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        wind: `${Math.round(item.wind?.speed || 0)} km/h`,
        pressure: Math.round(item.main.pressure),
        sunrise: sunriseDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        sunset: sunsetDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        humidity: Math.round(item.main.humidity),
        icon: item.weather?.[0]?.icon || '01d'
      });
    }

    const hourlyToday = list.slice(0, 8).map(item => ({
      time: new Date((item.dt + timezoneOffset) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', timeZone: 'UTC' }),
      temp: Math.round(item.main.temp),
      icon: item.weather?.[0]?.icon || '01d'
    }));

    const hourlyTomorrow = list.slice(8, 16).map(item => ({
      time: new Date((item.dt + timezoneOffset) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', timeZone: 'UTC' }),
      temp: Math.round(item.main.temp),
      icon: item.weather?.[0]?.icon || '01d'
    }));

    const hourlyRain = list.slice(0, 8).map(item => ({
      time: new Date((item.dt + timezoneOffset) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', timeZone: 'UTC' }),
      value: Math.round((item.pop || 0) * 100)
    }));

    // 20 cities total (15 original + 5 new)
    const cityNames = [
      'California', 'Beijing', 'Jerusalem', 'Tokyo', 'London',
      'Moscow', 'Dubai', 'Singapore', 'Sydney', 'Cairo',
      'Mumbai', 'Shanghai', 'Los Angeles', 'Berlin', 'Paris',
      'Rome', 'Toronto', 'Mexico City', 'Seoul', 'Bangkok'
    ];

    const otherCities = await Promise.all(
      cityNames.map(async (c) => {
        try {
          const r = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${c}&units=metric&appid=${API_KEY}`
          );
          return {
            name: r.data.name,
            country: r.data.sys.country,
            condition: r.data.weather?.[0]?.main || 'Clear',
            temp: Math.round(r.data.main.temp),
            icon: r.data.weather?.[0]?.icon || '01d'
          };
        } catch {
          return { name: c, country: '--', condition: 'Unknown', temp: 24, icon: '01d' };
        }
      })
    );

    res.json({
      city: name,
      country: sys.country,
      coord,
      daily,
      hourlyToday,
      hourlyTomorrow,
      hourlyRain,
      otherCities
    });

  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

console.log("Weather.js loaded");
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});