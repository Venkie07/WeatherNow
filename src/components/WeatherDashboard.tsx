import { useState, useEffect } from "react";
import { Search, MapPin, Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Eye, Thermometer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "./ThemeToggle";

interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  feelsLike: number;
  icon: string;
}

interface ForecastDay {
  date: string;
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

const API_KEY = "f37f867ba0124dd49da3669fa19a0c14";

const WeatherDashboard = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentLocationWeather();
    loadRecentSearches();
  }, []);

  const loadRecentSearches = () => {
    const saved = localStorage.getItem("recentWeatherSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (location: string) => {
    const updated = [location, ...recentSearches.filter(item => item !== location)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentWeatherSearches", JSON.stringify(updated));
  };

  const getCurrentLocationWeather = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Fallback to a default city
          fetchWeatherByCity("London");
        }
      );
    } else {
      fetchWeatherByCity("London");
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      
      // Current weather
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      const currentData = await currentResponse.json();
      
      // 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastResponse.json();
      
      processWeatherData(currentData, forecastData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch weather data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCity = async (city: string) => {
    try {
      setLoading(true);
      
      // Current weather
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
      );
      const currentData = await currentResponse.json();
      
      if (currentData.cod !== 200) {
        throw new Error(currentData.message);
      }
      
      // 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastResponse.json();
      
      processWeatherData(currentData, forecastData);
      saveRecentSearch(city);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch weather data for this location",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processWeatherData = (currentData: any, forecastData: any) => {
    const current: WeatherData = {
      location: currentData.name,
      country: currentData.sys.country,
      temperature: Math.round(currentData.main.temp),
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      visibility: Math.round(currentData.visibility / 1000),
      feelsLike: Math.round(currentData.main.feels_like),
      icon: currentData.weather[0].icon,
    };

    setCurrentWeather(current);

    // Process 5-day forecast (take one reading per day at noon)
    const dailyForecasts: ForecastDay[] = [];
    const processedDates = new Set();

    forecastData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toDateString();
      
      if (!processedDates.has(dateStr) && item.dt_txt.includes("12:00:00")) {
        processedDates.add(dateStr);
        dailyForecasts.push({
          date: dateStr,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          condition: item.weather[0].main,
          icon: item.weather[0].icon,
        });
      }
    });

    setForecast(dailyForecasts.slice(0, 5));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      fetchWeatherByCity(searchLocation);
      setSearchLocation("");
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="w-8 h-8 text-weather-sunny animate-pulse-slow" />;
      case 'clouds':
        return <Cloud className="w-8 h-8 text-weather-cloudy animate-float" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-weather-rainy animate-pulse-slow" />;
      case 'snow':
        return <CloudSnow className="w-8 h-8 text-weather-snowy animate-float" />;
      default:
        return <Sun className="w-8 h-8 text-weather-sunny" />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
              Sky Glow Weather
            </h1>
            <p className="text-muted-foreground text-lg">
              Beautiful weather forecasts at your fingertips
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Search Section */}
        <Card className="weather-card">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search for a city..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
            </div>
            <Button type="submit" disabled={loading} className="px-8">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Recent searches:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => fetchWeatherByCity(search)}
                    className="text-xs hover:bg-primary/10 transition-colors"
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Current Weather */}
        {currentWeather && (
          <Card className="weather-card">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-semibold">
                    {currentWeather.location}, {currentWeather.country}
                  </h2>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  {getWeatherIcon(currentWeather.condition)}
                  <div>
                    <div className="text-5xl font-bold gradient-text">
                      {currentWeather.temperature}°C
                    </div>
                    <div className="text-muted-foreground capitalize">
                      {currentWeather.description}
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Feels like {currentWeather.feelsLike}°C
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/30 rounded-lg p-4 text-center">
                  <Droplets className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-semibold">{currentWeather.humidity}%</div>
                  <div className="text-sm text-muted-foreground">Humidity</div>
                </div>
                <div className="bg-background/30 rounded-lg p-4 text-center">
                  <Wind className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-semibold">{currentWeather.windSpeed} km/h</div>
                  <div className="text-sm text-muted-foreground">Wind Speed</div>
                </div>
                <div className="bg-background/30 rounded-lg p-4 text-center">
                  <Eye className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-semibold">{currentWeather.visibility} km</div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
                <div className="bg-background/30 rounded-lg p-4 text-center">
                  <Thermometer className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-semibold">{currentWeather.feelsLike}°C</div>
                  <div className="text-sm text-muted-foreground">Feels Like</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 5-Day Forecast */}
        {forecast.length > 0 && (
          <Card className="weather-card">
            <h3 className="text-2xl font-semibold mb-6 text-center">5-Day Forecast</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {forecast.map((day, index) => (
                <div
                  key={index}
                  className="bg-background/30 rounded-lg p-4 text-center hover:bg-background/50 transition-colors"
                >
                  <div className="font-semibold mb-2">{day.day}</div>
                  <div className="flex justify-center mb-3">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">{day.high}°</div>
                    <div className="text-muted-foreground">{day.low}°</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading weather data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherDashboard;