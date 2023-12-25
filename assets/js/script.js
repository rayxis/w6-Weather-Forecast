// https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid=815b81b4556e7f7c29099ba98f3991ab
// http://api.openweathermap.org/geo/1.0/zip?zip={zip code},{country code}&appid=815b81b4556e7f7c29099ba98f3991ab
/***
 TODO:
	 - Location
	    - Get the user's current location.
	    - Better testing for search types (include more than just the US)
	    - Popup for search results
	 - Weather
	     - Current weather?
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
let weather;

class Weather {
	apis      = {
		current:       new URL('https://api.openweathermap.org/data/2.5/weather'),
		forecast:      new URL('https://api.openweathermap.org/data/2.5/forecast'),
		geocodeCity:   new URL('http://api.openweathermap.org/geo/1.0/direct'),
		geocodeZip:    new URL('http://api.openweathermap.org/geo/1.0/zip'),
		geocodeCoords: new URL('http://api.openweathermap.org/geo/1.0/reverse')
	};
	elements  = {
		locationList: document.querySelector('.location__list'),
		weatherList:  document.querySelector('.weather')
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
		dayCard:       document.getElementById('dayCard').content,
		locationPlace: document.getElementById('locationPlace').content,
		timeCard:      document.getElementById('timeCard').content
	};

	constructor() {
		// Save class to external variable so that it can be referenced from event listeners created within the class.
		weather = this;

		this.settings.apiKey = openWeatherMap.apiKey;
		this.locations       = JSON.parse(localStorage.getItem('locationData')) ?? {};
		this.forecast        = JSON.parse(localStorage.getItem('forecastData')) ?? {};
		this.locationsUpdate();
	}

	actionLocationSearch(event) {
		weather.locationSearch(`${event.target.locationRef.lat},${event.target.locationRef.lon}`);
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

	async fetchJSON(url, cb = undefined) {
		const forecastData = await fetch(url).then(
			response => {
				//  TODO: Better error handling.
				if (!response.ok) throw new Error('Network error');
				else if (!cb) return response.json();
				else return response.json().then(response => cb(response));
			});
		return false;
	}

	forecastBuild(locationData) {
		let forecast     = {};
		let forecastData = this.forecast[this.keyGet(locationData)];

		//  Parse through the returned weather data, rebuild the time/weather objects and put them into an array of days.
		forecastData.list.forEach(weatherData => {
			const day    = dayjs(new Date(weatherData.dt * 1000));
			const dayKey = day.format('MMMDD');

			//  Rebuild each timeframe weather object.
			const parsedData = {
				dateData:   day,
				humidity:   weatherData.main.humidity + '%',
				pressure:   weatherData.main.pressure + 'hPa',
				temp:       {
					current:   this.convertTemp(weatherData.main.temp),
					feelsLike: this.convertTemp(weatherData.main.feels_like),
					max:       this.convertTemp(weatherData.main.temp_max),
					min:       this.convertTemp(weatherData.main.temp_min)
				},
				visibility: weatherData.visibility,
				weather:    weatherData.weather,
				wind:       {
					speed:     weatherData.wind.speed + 'mph',
					direction: this.convertDirection(weatherData.wind.deg)
				}
			}

			//  If the forecast object doesn't have the current day as a property, create one with an empty array..
			if (!forecast.hasOwnProperty(dayKey)) forecast[dayKey] = [];

			//  Push the rebuilt weather object into the forecast day array.
			forecast[dayKey].push(parsedData);
		});

		//  Clear the weather list.
		[...this.elements.weatherList.children].forEach(child => child.remove());

		//  Take everything day-by-day.
		Object.values(forecast).forEach(day => this.buildDay(day));
	}

	//  Cache the location information. The information returned from the API will never change.
	forecastCache(forecast) {
		//  Create a cache expiration for the weather data.
		forecast.cacheUntil = Date.now() + this.settings.cacheExpiration;
		//  Codify the object key as a concatenation of latitude and longitude to make it unique,
		//  save the location, and then cache the results.
		this.forecast[this.keyGet(forecast.city.coord)] = forecast;
		localStorage.setItem('forecastData', JSON.stringify(this.forecast));
	}

	async forecastSearch(location) {
		//  If the location's latitude or longitude aren't specified, abort.
		if (location.lat === undefined || location.lon === undefined) return false;

		//  Convert the key index.
		const forecastKey = this.keyGet(location);

		if (!this.forecast.hasOwnProperty(forecastKey) || this.forecast[forecastKey].cacheUntil < Date.now()) {
			try {
				//  Grab the URL and set the parameters.
				let url    = this.apis.forecast;
				url.search = new URLSearchParams({
					                                 lat:   location.lat,
					                                 lon:   location.lon,
					                                 appid: this.settings.apiKey
				                                 });
				//  Pull the forecast request from OpenWeatherMap.
				await this.fetchJSON(url.href, (forecastData) => {
					this.forecastCache(forecastData);
					return forecastData;
				});
			} catch (error) {
				console.log('Error:', error.message);
			}
		}
		//  Build the weekly forecast.
		this.forecastBuild(location);
	}

	keyGet(location) {
		return `${location.lat}${location.lon}`;
	}

	//  Cache the location information. The information returned from the API will never change.
	locationCache(location) {
		//  Codify the object key as a concatenation of latitude and longitude to make it unique,
		//  save the location, and then cache the results.
		location.lastAccess                   = Date.now();
		this.locations[this.keyGet(location)] = location;
		localStorage.setItem('locationData', JSON.stringify(this.locations));
	}

	async locationSearch(search) {
		//  Trim any leading/following whitespace characters.
		search = search.trim();

		const comma   = search.indexOf(',');                //  Comma location, if there is one.
		let cacheTest, locationData, url;                            //  Initialize variables
		let urlSearch = {appid: this.settings.apiKey}; // Start with the API key.

		//  If the search box is empty, abort.
		if (!search.length) return false;

		//  Figure out the search type.
		//  TODO: Fix city search; maybe regex?
		//  TODO: Add error handling to the tests as well.
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
			cacheTest = loc => loc.lat === parseFloat(urlSearch.lat) &&
			                   loc.lon === parseFloat(urlSearch.lon);

			// If the search box contains an unknown type, abort.
		} else return false;

		// Fill the URL string with parameters.
		url.search = new URLSearchParams(urlSearch);

		//  Search the cached locations for matches.
		locationData = Object.values(this.locations).find(cacheTest);

		//  If cached locationData was found, update the access time, update the list order, and fetch the forecast.
		if (locationData) {
			this.locationCache(locationData);
			this.locationsUpdate();
			this.forecastSearch(locationData);
		}
		// If cached location doesn't exist, search the API for it.
		if (!locationData) {
			try {
				//  Pull the location data from OpenWeatherMap.
				//  TODO: Better error handling.
				await this.fetchJSON(url.href, (locationData) => {
					//  If the returned data has one of the required properties, assume it has what it needs.
					//  Update the location's cache (update access time), the visible list, and get the forecast.
					if (locationData.hasOwnProperty('lat')) {
						this.locationCache(locationData);
						this.locationsUpdate();
						this.forecastSearch(locationData);
					}
				});
			} catch (error) {
				console.log('Error:', error.message);
			}
		}

		//  Update city list
		return locationData;
	}

	//  Update the lcoations list.
	locationsUpdate() {
		//  Remove event handlers from all the children, and clear the list.
		[...this.elements.locationList.children].forEach(child => {
			child.removeEventListener('click', this.actionLocationSearch);
			child.remove();
		});

		//  Sort the locations in descending order from last access (this was updated in locationCache()).
		const locationsSorted = Object.values(this.locations).sort((a, b) => b.lastAccess - a.lastAccess)

		//  Loop through each saved location.
		locationsSorted.forEach(location => {
			//  Clone the location list item.
			const locationPlace = this.templates.locationPlace.cloneNode(true);

			//  Fill In the location details, and add the event listener.
			locationPlace.firstElementChild.textContent = location.name;
			locationPlace.firstElementChild.locationRef = location;
			locationPlace.firstElementChild.addEventListener('click', this.actionLocationSearch);

			//  Add the child to the list.
			this.elements.locationList.appendChild(locationPlace);
		});
	}

	//  User function to invoke locationSearch, with proper data format.
	userLocationSearch(searchBox) {
		//  Search for the specified location.
		this.locationSearch(searchBox.value);
	}

	buildDay(day) {
		//  Clone the Day Card element
		const dayCard = this.templates.dayCard.cloneNode(true);

		//  Set the location, date and day.
		// dayCard.querySelector('.dayCard__header__location').textContent = this.location.name;
		dayCard.querySelector('.dayCard__header__date').textContent = day[0].dateData.format('MMMM DD');
		dayCard.querySelector('.dayCard__header__day').textContent  = day[0].dateData.format('dddd');

		//  Loop through each time block in the day, and populate the fields.
		day.forEach(dayTime => {
			//  Clone the Time Card element
			const timeCard = this.templates.timeCard.cloneNode(true);

			//  Set the time (format: 12am), current temperature, humidity, and wind speed/direction.
			timeCard.querySelector('.timeCard__time').textContent           = dayTime.dateData.format('ha');
			timeCard.querySelector('.timeCard__humidity__data').textContent = dayTime.humidity;
			timeCard.querySelector('.timeCard__pressure__data').textContent = dayTime.pressure;
			timeCard.querySelector('.timeCard__temp__data').textContent     = dayTime.temp.current;
			timeCard.querySelector('.timeCard__wind__data').textContent     = `${dayTime.wind.speed} ${dayTime.wind.direction}`;

			//  Add the time card to the day card.
			dayCard.querySelector('.dayCard__weather').appendChild(timeCard);
		});
		//  Add day to the forecast
		document.querySelector('.weather').appendChild(dayCard);
	}
}

new Weather();