/***
 TODO:
	 - Location
	    - Get the user's current location.
	    - Better testing for search types (and include more than just the US); may require regex.
	    - Popup for search results
	 - Weather
	     - Current weather?
	     - Average weather / day?
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
		forecast:      new URL('https://api.openweathermap.org/data/2.5/forecast'),
		geocodeCity:   new URL('https://api.openweathermap.org/geo/1.0/direct'),
		geocodeZip:    new URL('https://api.openweathermap.org/geo/1.0/zip'),
		geocodeCoords: new URL('https://api.openweathermap.org/geo/1.0/reverse'),
		weather:       new URL('https://api.openweathermap.org/data/2.5/weather')
	};
	elements  = {
		locationList: document.querySelector('.location__list'),
		weatherList:  document.querySelector('.weather')
	};
	forecast  = {};
	location  = {test: 'hello'};
	regex     = {
		cityStateCountry: /^([A-Za-z.\s'-]+),([A-Za-z.\s'-]+),?([A-Za-z.\s'-]+)?$/,         //  City, State|Country, Country
		coords:           /^(-?\d{1,2}(?:\.\d{0,7})?)\s*,\s*(-?\d{1,3}(?:\.\d{0,7})?)$/,    //  Lat / Lon pair
		zipCode:          /^(\d{5}|[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d),?([A-Za-z.\s'-]+)?$/    //  5-digit and Canadian Zip Codes
	}
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
	weather   = {};

	constructor() {
		// Save class to external variable so that it can be referenced from event listeners created within the class.
		weather = this;

		//  Get the OpenWeatherMap API key, and pull cached data from localStorage.
		this.settings.apiKey = openWeatherMap.apiKey;
		this.location        = JSON.parse(localStorage.getItem('locationData')) ?? {};
		this.forecast        = JSON.parse(localStorage.getItem('forecastData')) ?? {};

		//  Update (populate) the location list.
		this.locationsUpdate();

		//  Pull the latest weather data, if there is any available, using the first element in the location list.
		const latestLocation = this.elements.locationList.firstElementChild?.locationRef;
		if (latestLocation) {
			this.forecastSearch(latestLocation);
			this.weatherSearch(latestLocation);
		}
	}

	actionLocationSearch(event) {
		weather.locationSearch(`${event.target.locationRef.lat},${event.target.locationRef.lon}`);
	}

	//  Cache API resulting data in localStorage.
	apiCache(apiName, apiData) {
		let data;
		switch (apiName) {
			case 'forecast':
				//  Create a cache expiration for the weather data, and apiData.city.coord holds key data.
				apiData.cacheUntil = Date.now() + this.settings.cacheExpiration;
				data               = apiData.city.coord;
				break;
			case 'location':
				// Save the time of last access, and apiData holds key data.
				apiData.lastAccess = Date.now();
				data               = apiData;
				break;
			case 'weather':
				//  Create a cache expiration for the weather data, and apiData.coord holds key data.
				apiData.cacheUntil = Date.now() + this.settings.cacheExpiration;
				data               = apiData.coord;
				break;
		}
		//  Codify the object key as a concatenation of latitude and longitude to make it unique,
		//  convert the API object list to a JSON string and cache.
		this[apiName][this.keyGet(data)] = apiData;
		localStorage.setItem(`${apiName}Data`, JSON.stringify(this[apiName]));
	}

	async apiDataFromLocation(apiName, locationData) {
		//  If the location's latitude or longitude aren't specified, abort.
		if (locationData.lat === undefined || locationData.lon === undefined) return false;

		//  Convert the key index.
		const indexKey = this.keyGet(locationData);

		//  The API name must exist.
		if (!this.hasOwnProperty(apiName)) throw new Error('Invalid API name');

		//  If the index key does not exist within the API object, or the cache (if specified) is expired,
		//  update through the API.
		if (!this[apiName].hasOwnProperty(indexKey)
		    || (this[apiName][indexKey].hasOwnProperty('cacheUntil')
		        && this[apiName][indexKey].cacheUntil < Date.now())) {

			//  Grab the URL and set the parameters.
			let url    = this.apis[apiName];
			url.search = new URLSearchParams({
				                                 lat:   locationData.lat,
				                                 lon:   locationData.lon,
				                                 appid: this.settings.apiKey
			                                 });
			//  Pull the forecast request from OpenWeatherMap.
			await this.apiFetchJSON(url.href, (apiData) => this.apiCache(apiName, apiData));
		}
	}

	// Handler for API fetch requests, with optional callback function for handling asynchronous requests.
	async apiFetchJSON(url, cb = undefined) {
		try {
			return await fetch(url).then(
				response => {
					//  TODO: Better error handling.
					if (!response.ok) throw new Error('Network error');
					else if (!cb) return response.json();
					else return response.json().then(response => cb(response));
				});
		} catch (error) {
			console.log(error);
		}
	}

	convertDirection(deg) {
		const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

		//  Divide 360 degrees / 8 = 45 degrees for each octant. Use this to calculate the modulus for the array index,
		//  and return the cardinal direction.
		return direction[Math.round(deg / 45) % 8];
	}

	convertTemp(temp) {
		//  Convert from Kelvin to Celsius
		if (this.settings.units !== 'K') temp = temp - 273.15;
		//  Convert from Celsius to Fahrenheit
		if (this.settings.units === 'F') temp = 1.8 * temp + 32;

		//  Return the result
		return `${temp.toFixed(2)}°${this.settings.units}`;
	}

	dayBuild(day) {
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

			//  If the forecast object doesn't have the current day as a property, create one with an empty array.
			if (!forecast.hasOwnProperty(dayKey)) forecast[dayKey] = [];

			//  Push the rebuilt weather object into the forecast day array.
			forecast[dayKey].push(parsedData);
		});

		//  Clear the weather list, and then fill it up, taking everything day-by-day.
		[...this.elements.weatherList.children].forEach(child => child.remove());
		Object.values(forecast).forEach(day => this.dayBuild(day));
	}

	//  TODO: Make this replace forecastBuild()
	weatherBuild(apiName, locationData) {
		const data = this[apiName].list ? this[apiName].list : [this[apiName]];

		//  Parse through the returned weather data, rebuild the time/weather objects and put them into an array of days.
		data.forEach(weatherData => {
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

			//  If the forecast object doesn't have the current day as a property, create one with an empty array.
			if (!forecast.hasOwnProperty(dayKey)) forecast[dayKey] = [];

			//  Push the rebuilt weather object into the forecast day array.
			forecast[dayKey].push(parsedData);
		});
	}

	async forecastSearch(locationData) {
		//  Get the forecast data, and then build the forecast.
		await this.apiDataFromLocation('forecast', locationData);
		this.forecastBuild(locationData);
	}

	keyGet(location) {
		return `${location.lat}${location.lon}`;
	}

	async locationSearch(search) {
		//  Trim any leading/following whitespace characters.
		search = search.trim();

		const comma   = search.indexOf(',');                //  Comma location, if there is one.
		let cacheTest, locationData, url;                            //  Initialize variables
		let matches   = [];
		let urlSearch = {appid: this.settings.apiKey}; // Start with the API key.

		//  If the search box is empty, abort.
		if (!search.length) return false;

		//  Figure out the search type.
		//  TODO: Add error handling to the tests as well.
		if (matches = search.match(this.regex.cityStateCountry)) {
			// If the search box contains text, assume it's a city.
			url             = this.apis.geocodeCity;
			urlSearch.q     = matches.slice(1).map(item => (item !== undefined) ? item.trim() : null).join(',');
			urlSearch.limit = this.settings.geoLimit;

			//  Cache search test for city
			cacheTest = loc => loc.name === search;
		} else if (matches = search.match(this.regex.zipCode)) {
			//  Get the URL, and the zipcode. If the country is included, append that too.
			url           = this.apis.geocodeZip;
			urlSearch.zip = matches.slice(1).map(item => (item !== undefined) ? item.trim() : null).join(',');

			//  Cache search test for zip code
			cacheTest = loc => loc.zip === search;
		} else if (matches = search.match(this.regex.coords)) {
			// Check that the global coordinates are within the valid range {90<=>-90, 180<=>-180}
			//  TODO: Warn user of invalid coordinates.
			if (Math.abs(parseFloat(matches[1])) > 90 || Math.abs(parseFloat(matches[2])) > 180) throw new Error("Invalid coordinates");

			//  It appears that the search box contains lat/lon coordinates.
			url             = this.apis.geocodeCoords;
			urlSearch.lat   = matches[1].toFixed(4);
			urlSearch.lon   = matches[2].toFixed(4);
			urlSearch.limit = this.settings.geoLimit;

			//  Cache search test for latitude and longitude.
			cacheTest = loc => loc.lat === parseFloat(urlSearch.lat) &&
			                   loc.lon === parseFloat(urlSearch.lon);

			// If the search box contains an unknown type, abort.
			//  TODO: Warn user of invalid search.
		} else return false;
		// Fill the URL string with parameters.
		url.search = new URLSearchParams(urlSearch);

		//  Search the cached locations for matches.
		locationData = Object.values(this.location).find(cacheTest);

		//  Function to update the location's cache/access time, the visible list, and get the forecast.
		const locationProcess = (locationData) => {
			this.apiCache('location', locationData);
			this.locationsUpdate();
			this.forecastSearch(locationData);
			this.weatherSearch(locationData);
		}

		//  If cached locationData was found process the data, otherwise search the API for it.
		if (locationData) locationProcess(locationData);
		else {
			try {
				//  Pull the location data from OpenWeatherMap.
				//  TODO: Better error handling.
				await this.apiFetchJSON(url.href, (locationData) => {
					//  If the zipcode was not being searched for, there are options.
					//  TODO: Allow user to select one of the options instead of forcing the first one.
					if (!urlSearch.zip?.length) locationData = locationData[0];
					//  If the response includes a latitude, it probably includes a longitude.
					if (locationData.hasOwnProperty('lat')) {
						//  Round the coordinates to 4 decimal places.
						locationData.lat = locationData.lat.toFixed(4);
						locationData.lon = locationData.lon.toFixed(4);
						//  Process the location data.
						locationProcess(locationData);
					} else throw Error('Coordinates were not received.');
				});
			} catch (error) {
				console.log('Error:', error.message);
			}
		}
	}

	//  Update the locations list.
	locationsUpdate() {
		//  Remove event handlers from all the children, and clear the list.
		[...this.elements.locationList.children].forEach(child => {
			child.removeEventListener('click', this.actionLocationSearch);
			child.remove();
		});

		//  Sort the locations in descending order from last access (this was updated in locationCache()).
		const locationsSorted = Object.values(this.location).sort((a, b) => b.lastAccess - a.lastAccess)

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

	async weatherSearch(locationData) {
		//  Get the current(-ish) weather data, and then build the current weather card.
		await this.apiDataFromLocation('weather', locationData);
		// this.weatherBuild(locationData);
	}

	//  User function to invoke locationSearch, with proper data format.
	userLocationSearch(searchBox) {
		//  Search for the specified location.
		this.locationSearch(searchBox.value);
	}

}

new Weather();
