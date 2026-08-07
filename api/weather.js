// api/weather.js
// Vercel serverless function: GET /api/weather?city=NAME  or  ?lat=..&lon=..
const axios = require('axios');

const OTHER_CITIES = [
  { name: 'London', country: 'GB' },
  { name: 'New York', country: 'US' },
  { name: 'Tokyo', country: 'JP' },
  { name: 'Sydney', country: 'AU' },
  { name: 'Dubai', country: 'AE' },
];

const BASE = 'https://api.openweathermap.org/data/2.5';

function fmtHour(unixSeconds, tzOffsetSeconds) {
  const d = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  let h = d.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}${ampm}`;
}

function localDateKey(unixSeconds, tzOffsetSeconds) {
  const d = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  return d.toISOString().slice(0, 10);
}

function dayName(unixSeconds, tzOffsetSeconds, index) {
  if (index === 0) return 'Today';
  const d = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function fmtWind(speedMs) {
  return `${Math.round(speedMs * 3.6)} km/h`;
}

async function fetchOtherCities(apiKey) {
  const results = await Promise.allSettled(
    OTHER_CITIES.map((c) =>
      axios.get(`${BASE}/weather`, {
        params: { q: `${c.name},${c.country}`, units: 'metric', appid: apiKey },
      })
    )
  );

  return results
    .map((r, i) => {
      if (r.status !== 'fulfilled') return null;
      const w = r.value.data;
      return {
        name: OTHER_CITIES[i].name,
        country: w.sys?.country || OTHER_CITIES[i].country,
        condition: w.weather?.[0]?.main || '',
        icon: w.weather?.[0]?.icon || '01d',
        temp: Math.round(w.main?.temp ?? 0),
      };
    })
    .filter(Boolean);
}

module.exports = async (req, res) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: OPENWEATHER_API_KEY is not set' });
  }

  try {
    let lat, lon, cityName = req.query.city;

    if (req.query.lat && req.query.lon) {
      lat = parseFloat(req.query.lat);
      lon = parseFloat(req.query.lon);
    } else if (cityName) {
      const geoRes = await axios.get(`${BASE}/weather`, {
        params: { q: cityName, units: 'metric', appid: API_KEY },
      });
      lat = geoRes.data.coord.lat;
      lon = geoRes.data.coord.lon;
    } else {
      return res.status(400).json({ error: 'No city or coordinates provided' });
    }

    const [currentRes, forecastRes, otherCities] = await Promise.all([
      axios.get(`${BASE}/weather`, { params: { lat, lon, units: 'metric', appid: API_KEY } }),
      axios.get(`${BASE}/forecast`, { params: { lat, lon, units: 'metric', appid: API_KEY } }),
      fetchOtherCities(API_KEY),
    ]);

    const current = currentRes.data;
    const forecastList = forecastRes.data.list || [];
    const tz = forecastRes.data.city?.timezone ?? current.timezone ?? 0;

    const todayKey = localDateKey(Math.floor(Date.now() / 1000), tz);

    // Group 3-hourly forecast entries by local date
    const byDate = new Map();
    for (const item of forecastList) {
      const key = localDateKey(item.dt, tz);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(item);
    }
    const dateKeys = Array.from(byDate.keys());

    // Build daily[] — one card per date, using the entry closest to local noon
    const daily = dateKeys.slice(0, 7).map((key, idx) => {
      const entries = byDate.get(key);
      const pick = entries.reduce((best, cur) => {
        const bestHour = new Date((best.dt + tz) * 1000).getUTCHours();
        const curHour = new Date((cur.dt + tz) * 1000).getUTCHours();
        return Math.abs(curHour - 12) < Math.abs(bestHour - 12) ? cur : best;
      }, entries[0]);

      return {
        dayName: idx === 0 ? 'Today' : dayName(pick.dt, tz, idx),
        time: fmtHour(pick.dt, tz),
        temp: Math.round(idx === 0 ? current.main.temp : pick.main.temp),
        feelsLike: Math.round(idx === 0 ? current.main.feels_like : pick.main.feels_like),
        wind: fmtWind(idx === 0 ? current.wind.speed : pick.wind.speed),
        pressure: idx === 0 ? current.main.pressure : pick.main.pressure,
        humidity: idx === 0 ? current.main.humidity : pick.main.humidity,
        sunrise: current.sys?.sunrise ? fmtHour(current.sys.sunrise, tz) : '--',
        sunset: current.sys?.sunset ? fmtHour(current.sys.sunset, tz) : '--',
        icon: idx === 0 ? current.weather[0].icon : pick.weather[0].icon,
      };
    });

    // Ensure today's entry always exists even if the forecast API's first
    // bucket already rolled past local midnight into "tomorrow"
    if (daily.length === 0 || dateKeys[0] !== todayKey) {
      daily.unshift({
        dayName: 'Today',
        time: fmtHour(Math.floor(Date.now() / 1000), tz),
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        wind: fmtWind(current.wind.speed),
        pressure: current.main.pressure,
        humidity: current.main.humidity,
        sunrise: current.sys?.sunrise ? fmtHour(current.sys.sunrise, tz) : '--',
        sunset: current.sys?.sunset ? fmtHour(current.sys.sunset, tz) : '--',
        icon: current.weather[0].icon,
      });
    }

    const tomorrowKey = dateKeys.find((k) => k !== todayKey) || dateKeys[1];

    const hourlyToday = (byDate.get(todayKey) || []).map((item) => ({
      time: fmtHour(item.dt, tz),
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
    }));

    const hourlyTomorrow = (byDate.get(tomorrowKey) || []).map((item) => ({
      time: fmtHour(item.dt, tz),
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
    }));

    const hourlyRain = forecastList.slice(0, 8).map((item) => ({
      time: fmtHour(item.dt, tz),
      value: Math.round((item.pop || 0) * 100),
    }));

    const data = {
      city: current.name,
      country: current.sys.country,
      coord: current.coord,
      daily,
      hourlyToday,
      hourlyTomorrow,
      hourlyRain,
      otherCities,
    };

    res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status === 404 ? 404 : 500;
    const message = error.response?.status === 404 ? 'City not found' : error.message;
    console.error('❌ API Error:', message);
    res.status(status).json({ error: message });
  }
};
