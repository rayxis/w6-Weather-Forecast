// https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid=815b81b4556e7f7c29099ba98f3991ab
// http://api.openweathermap.org/geo/1.0/zip?zip={zip code},{country code}&appid=815b81b4556e7f7c29099ba98f3991ab
/***
 TODO:
	 - Location
	    - Get the user's current location.
	    - Show previously searched locations.
	    - Better testing for search types (include more than just the US)
	    - Popup for search results
	 - Weather
		 - Weather's return has extra items, which may be useful. Maybe not though.
     - Locale and language?
     - Design
	    - Header
        - Display the time.
        - Location Section
        - Weather Section
        - Set background of card to reflect weather conditions.
        - Find some icons to reflect the weather conditions.
***/


class Weather {
	apis      = {
		forecast:      new URL('https://api.openweathermap.org/data/2.5/forecast'),
		geocodeCity:   new URL('http://api.openweathermap.org/geo/1.0/direct'),
		geocodeZip:    new URL('http://api.openweathermap.org/geo/1.0/zip'),
		geocodeCoords: new URL('http://api.openweathermap.org/geo/1.0/reverse')
	};
	forecast  = {};
	locations = {test: 'hello'};
	settings  = {
		apiKey:          '',
		cacheExpiration: 3 * 60 * 60 * 1000,
		geoLimit:        1,
		units:           'F'
	};
	templates = {
		dayCard:  document.getElementById('dayCard').content,
		timeCard: document.getElementById('timeCard').content
	};

	constructor() {
		this.settings.apiKey = openWeatherMap.apiKey;
		this.locations       = JSON.parse(localStorage.getItem('locationData')) ?? {};
	}

	convertDirection(deg) {
		const nesw = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

		//  Divide 360 degrees / 8 = 45 degrees for each octant. Use this to calculate the modulus for the array index,
		//  and return the cardinal direction.
		return nesw[Math.round(deg / 45) % 8];
	}

	convertTemp(temp) {
		//  Convert from Kelvin to Celsius
		if (this.settings.units !== 'K') temp = temp - 273.15;
		//  Convert from Celsius to Fahrenheit
		if (this.settings.units === 'F') temp = 1.8 * temp + 32;

		//  Return the result
		return `${temp.toFixed(2)}°${this.settings.units}`;
	}

	cacheForecast() {
		// localStorage.setItem('forecastData', JSON.stringify(this.locations));
	}

	//  Cache the location information. The information returned from the API will never change.
	cacheLocation(location) {
		//  Codify the object key as a concatenation of latitude and longitude to make it unique,
		//  save the location, and then cache the results.
		this.locations[`${location.lat}${location.lon}`] = location;
		localStorage.setItem('locationData', JSON.stringify(this.locations));
	}

	dayAdd(day) {
		const dayCard = this.templates.dayCard.cloneNode(true);

		// console.log(day);

		// dayCard.querySelector('.dayCard__date').textContent     = day.dateData.format('MMMM D');
		// dayCard.querySelector('.dayCard__day').textContent      = day.dateData.format('dddd');
		dayCard.querySelector('.dayCard__temperature').textContent = day[0].temperature;
		dayCard.querySelector('.dayCard__humidity').textContent    = '90%';
		dayCard.querySelector('.dayCard__wind').textContent        = '5mph NW';

		document.querySelector('.weather').appendChild(dayCard);
	}

	async locationSearch(searchBox) {
		const search  = searchBox.value.trim();
		const comma   = search.indexOf(',');
		let cacheTest, locationData, url;
		let urlSearch = {appid: this.settings.apiKey};

		//  If the search box is empty, abort.
		if (!search.length) return false;

		//  Figure out the search type.
		if (isNaN(search) && comma === -1) {
			// If the search box contains text, assume it's a city.
			url             = this.apis.geocodeCity;
			urlSearch.q     = `${search},US`;
			urlSearch.limit = this.settings.geoLimit;

			//  Cache search test for city
			cacheTest = loc => loc.name === search;
		} else if (search.length === 5 && comma === -1) {
			// If the search box contains numbers, assume it's a zip code.
			url           = this.apis.geocodeZip;
			urlSearch.zip = `${search},US`;

			//  Cache search test for zip code
			cacheTest = loc => loc.zip === search;
		} else if (comma) {
			//  It appears that the search box contains coordinates.
			url             = this.apis.geocodeCoords;
			urlSearch.lat   = search.substring(0, comma);
			urlSearch.lon   = search.substring(comma + 1).trim();
			urlSearch.limit = this.settings.geoLimit;

			//  Cache search test for latitude and longitude.
			cacheTest = loc => loc.lat === urlSearch.lat &&
			                   loc.lon === urlSearch.lon;

			// If the search box contains an unknown type, abort.
		} else return false;

		// Fill the URL string with parameters.
		url.search = new URLSearchParams(urlSearch);

		//  Search the cached locations for matches.
		if (Object.keys(this.locations).length) locationData = Object.values(this.locations).find(cacheTest);

		//  If cached location doesn't exist, search the API for it.
		if (!locationData) {
			try {
				//  Pull the location data from OpenWeatherMap.
				//  TODO: Add error handling to this.
				await fetch(url.href).then(response => response.json().then(
					// Cache the location data
					locationData => this.cacheLocation(locationData)));
			} catch (error) {

			}
		}

		//  TODO: Now run locationData through the weatherSearch().
		// this.weatherSearch(locationData);
		return true;
	}

	async weatherSearch(location) {
		if (!location.forecast || location.forecast.cacheUntil > Date.now()) {
			try {
				//  Grab the URL and set the parameters.
				let url    = this.apis.forecast;
				url.search = new URLSearchParams({
					                                 lat:   location.lat,
					                                 lon:   location.lon,
					                                 appid: this.settings.apiKey
				                                 });

				//  Pull the forecast request from OpenWeatherMap.
				//  TODO: Add error handling to this.
				await fetch(url).then(response => {
					//  Save the response to save API pulls, and set a cache timeout.
					location.forecast            = response.json();
					location.forecast.cacheUntil = Date.now() + this.settings.cacheExpiration;
					//  Cache the result.
					this.cache();
				});
			} catch (error) {

			}
		}
		this.buildForecast(location);
	}

	buildDay(day) {
		//  Clone the Day Card element
		const dayCard = this.templates.dayCard.cloneNode(true);

		//  Set the location, date and day.
		dayCard.querySelector('.dayCard__header__location').textContent = this.location.name;
		dayCard.querySelector('.dayCard__header__date').textContent     = day[0].dateData.format('MMMM DD');
		dayCard.querySelector('.dayCard__header__day').textContent      = day[0].dateData.format('dddd');

		//  Loop through each time block in the day, and populate the fields.
		day.forEach(dayTime => {
			//  Clone the Time Card element
			const timeCard = this.templates.timeCard.cloneNode(true);

			//  Set the time (format: 12am), current temperature, humidity, and wind speed/direction.
			timeCard.querySelector('.timeCard__humidity').textContent    = dayTime.humidity;
			timeCard.querySelector('.timeCard__pressure').textContent    = `${dayTime.pressure}
				hPa`;
			timeCard.querySelector('.timeCard__time').textContent        = dayTime.dateData.format('ha');
			timeCard.querySelector('.timeCard__temperature').textContent = dayTime.temp.current;
			timeCard.querySelector('.timeCard__wind').textContent        = `${dayTime.wind.speed} ${dayTime.wind.direction}`;

			dayCard.querySelector('.dayCard').appendChild(timeCard);
		});
		//  Add day to the forecast
		document.querySelector('.weather').appendChild(dayCard);
	}

	buildForecast(locationData) {
		let forecast     = {};
		let forecastData = locationData.forecast;

		//  Parse through the returned weather data, rebuild the time/weather objects and put them into an array of days.
		forecastData.list.forEach(weather => {
			const day    = dayjs(new Date(weather.dt * 1000));
			const dayKey = day.format('MMMDD');

			//  Rebuild each timeframe weather object.
			const parsedData = {
				dateData: day,
				humidity: weather.main.humidity + '%',
				pressure: weather.main.pressure,
				temp:     {
					current:   this.convertTemp(weather.main.temp),
					feelsLike: this.convertTemp(weather.main.feels_like),
					max:       this.convertTemp(weather.main.temp_max),
					min:       this.convertTemp(weather.main.temp_min)
				},
				weather:  weather.weather,
				wind:     {
					speed:     weather.wind.speed + 'mph',
					direction: this.convertDirection(weather.wind.deg)
				}
			}
			if (!forecast.hasOwnProperty(dayKey)) forecast[dayKey] = [];

			forecast[dayKey].push(parsedData);
		});

		//  Take everything day-by-day.
		Object.values(forecast).forEach(day => this.buildDay(day));
	}
}

const weather = new Weather();