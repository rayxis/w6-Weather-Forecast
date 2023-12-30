/***
 TODO:
	 - Error testing and handling (and messages for the user)
	 - Location
	   - Get user's current location
	   - Fix popup for search results (same city twice)
	   - Use locale and languages.
	 - Weather
	     - Average weather / day?
	 - Design
	   - Scalable
       - Header
       - Display the time.
       - Location Section
       - Weather Section
       - Set background of card to reflect weather conditions.
       - Find some icons to reflect the weather conditions.
     - Bugs
	   - Merge existing locations
 ***/
let weather;

class Weather {
	//  API URLs
	apis      = {
		forecast:      new URL('https://api.openweathermap.org/data/2.5/forecast'),
		geocodeCity:   new URL('https://api.openweathermap.org/geo/1.0/direct'),
		geocodeZip:    new URL('https://api.openweathermap.org/geo/1.0/zip'),
		geocodeCoords: new URL('https://api.openweathermap.org/geo/1.0/reverse'),
		weather:       new URL('https://api.openweathermap.org/data/2.5/weather')
	};
	//  Data storage
	data      = {
		location:            [],
		locationListOptions: [],
	};
	//  Element references
	elements  = {
		forecastList:         document.querySelector('.forecast'),
		locationList:         document.querySelector('.locationSearch__list'),
		locationListOptions:  document.querySelector('.locationSearch__listOptions'),
		locationSearchButton: document.querySelector('.locationSearch__button'),
		locationSearchInput:  document.querySelector('.locationSearch__input'),
		weather:              document.querySelector('.weather')
	};
	// Error messages
	errors    = {
		coordsInvalid: "These are not valid coordinates.",
		inputInvalid:  "This is not valid input."
	};
	//  Regular Expression patterns
	regex     = {
		cityStateCountry: /^([A-Za-z.\s'-]+),([A-Za-z.\s'-]+),?([A-Za-z.\s'-]+)?$/,         //  City, State|Country, Country
		coords:           /^(-?\d{1,2}(?:\.\d{0,7})?)\s*,\s*(-?\d{1,3}(?:\.\d{0,7})?)$/,    //  Lat / Lon pair
		zipCode:          /^(\d{5}|[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d),?([A-Za-z.\s'-]+)?$/    //  5-digit and Canadian Zip Codes
	};
	//  Settings
	settings  = {
		apiKey:           '',   // API key filled by constructor.
		coordAccuracy:    2,    // Decimal Accuracy for coordinates (.1 = 11.1km, .01 = 1.11km)
		distanceAccuracy: 2,    // Distance conversion function accuracy.
		cacheForecastExp: 3 * 60 * 60 * 1000, // In milliseconds [3 hours].
		cacheLocation:    'locationData',     // Cache location name for localStorage.
		cacheWeatherExp:  60 * 60 * 1000,     // In milliseconds [1 hour].
		geoLimit:         5,    // Maximum location options from OpenWeatherMaps is 5.
		similarAccuracy:  .1,   // Difference in distance for two places with the names to be considered the same place.
		tempAccuracy:     2,    // Decimal accuracy for temperature.
		units:            {
			imperial:   {
				distance: 'mi',
				temp:     '°F'
			},
			metric:     {
				distance: 'km',
				temp:     '°C'
			},
			scientific: {
				distance: 'km',
				temp:     ' K'
			}
		},
		unitSystem:       'imperial'  // Unit system (imperial, metric, scientific).
	};
	//  Element template references
	templates = {
		dayCard:             document.getElementById('dayCard').content,
		locationListOptions: document.getElementById('locationListOptions').content,
		locationItem:        document.getElementById('locationItem').content,
		timeCard:            document.getElementById('timeCard').content
	};

	constructor() {
		weather = this;

		this.settings.apiKey = openWeatherMap.apiKey;
		this.apiCacheLoad();

		this.elements.locationSearchButton.addEventListener('click', this.actionUserLocationLookup.bind(this));
	}

	/***
	 * User Action Functions
	 ***/
	// User Action: Select a location from a list of optional locations based off multiple returns from a
	// locationLookup() search.
	actionLocationListOptionsSelect(event) {
		// Get the index of the location of the selected location.
		const locationIndex = [...event.target.parentNode.children].indexOf(event.target);

		// Remove event handlers from all the children, and clear the list.
		[...this.elements.locationListOptions.children].forEach(child => {
			child.removeEventListener('click', this.actionLocationListOptionsSelect);
			child.remove();
		});

		// Rebuild the location object by using the referenced location index, then update the history.
		this.locationBuild(this.data.locationListOptions[locationIndex]);
		this.locationListUpdate();
		//  Empty the array.
		this.data.locationListOptions.length = 0;
	}

	// User Action: Search for a location, with a proper format.
	actionUserLocationLookup(event) {
		event.preventDefault();
		//  Search for the specified location.
		this.locationLookup(this.elements.locationSearchInput.value);
	}

	/***
	 * API Data functions
	 ***/

	// Save the location data array to localStorage.
	apiCacheSave() {
		// Convert the location data array into a string.
		let saveData = JSON.stringify(this.data.location);

		// If JSON was successful in converting it, save the item to localStorage.
		if (saveData) {
			localStorage.setItem(this.settings.cacheLocation, saveData);
			// Check the integrity of the data in localStorage.
			if (saveData === localStorage.getItem(this.settings.cacheLocation)) return true;
		}
		// If JSON was not successful, or the data did not save properly, return false.
		return false;
	}

	// Load cached data from localStorage.
	apiCacheLoad() {
		// Load the data from localStorage, and convert it back into an array. If there is no data, use an empty array.
		this.data.location = JSON.parse(localStorage.getItem(this.settings.cacheLocation)) ?? [];
		// If the returned array is not empty, go through the objects and rebuild them.
		this.data.location.forEach(location => this.locationRebuild(location));
		return this.locationListUpdate();
	}

	// Rebuild the weather objects.
	apiDataBuild(apiData) {
		// This creates a new weather data object and returns it.
		const objectBuild = (apiData) => {
			// Rebuild the weather API object.
			return {
				humidity:   apiData.main.humidity + ' %',
				pressure:   apiData.main.pressure + ' hPa',
				timestamp:  apiData.dt,
				temp:       {
					actual:    this.convertTemp(apiData.main.temp),
					feelsLike: this.convertTemp(apiData.main.feels_like),
					max:       this.convertTemp(apiData.main.temp_max),
					min:       this.convertTemp(apiData.main.temp_min)
				},
				visibility: this.convertDistance(apiData.visibility),
				weather:    apiData.weather,
				wind:       {
					direction: this.convertDirection(apiData.wind.deg),
					speed:     this.convertDistance(apiData.wind.speed * 1000) + '/h'
				}
			};
		};

		// If the incoming object has a list property, then it will need to be looped through; otherwise just return it,
		if (apiData.hasOwnProperty('list')) {
			const dayList = {};

			// Loop through the list of returned forecast objects.
			apiData.list.forEach(data => {
				// Rebuild the weather data object, and create an array index from the date.
				const weatherData = objectBuild(data);
				const dayKey      = dayjs.unix(weatherData.timestamp).format('MMMDD');

				// If the day doesn't exist in the array, create it. Organize the weather data by day.
				if (!dayList[dayKey]) dayList[dayKey] = [];
				dayList[dayKey].push(weatherData);
			});
			return dayList;
		} else return objectBuild(apiData);
	}

	// Handler for API fetch requests, with optional callback function for handling asynchronous requests.
	async apiFetchJSON(url, cb = undefined) {
		//  Return the result.
		return await fetch(url).then(
			response => {
				// TODO: Better error handling here.
				// If the response is not okay, throw an error, otherwise return JSON, or run the callback function.
				if (!response.ok) throw new Error('Network error');
				else if (!cb) return response.json();
				else return response.json().then(response => cb(response));
			}
		)
	}

	/***
	 * Conversion Functions
	 ***/

	// Convert latitude and longitude to the accuracy specified in the settings.
	convertCoords(latitude, longitude) {
		// Check that the degrees are represented as a number.
		if (isNaN(+latitude) || isNaN(+longitude)) return false;
		// Round the coordinate accuracy.
		else return [
			parseFloat(latitude).toFixed(this.settings.coordAccuracy),
			parseFloat(longitude).toFixed(this.settings.coordAccuracy)
		];
	}

	// Convert degrees into cardinal directions.
	convertDirection(deg) {
		const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

		// Check that the degrees are represented as a number.
		if (isNaN(+deg)) return false;
		else {
			//  Divide 360 degrees / 8 = 45 degrees for each octant. Use this to calculate the modulus for the array
			//  index, this will result in an index for referencing the cardinal direction equivalent.
			return direction[Math.round(deg / 45) % 8];
		}
	}

	// Convert distance units from kilometers.
	convertDistance(distance) {
		// Check that the distance is a number.
		if (isNaN(+distance)) return false;

		// If the distance is being converted to miles.
		else if (this.settings.unitSystem === 'imperial') {
			// Convert km to miles (1609.344 meters = 1 mile).
			distance = +(distance / 1609.344).toFixed(2);
		} else distance /= 1000; // Convert meters to kilometers

		// Round up to the specified amount of decimals.
		distance = Number(distance.toFixed(this.settings.distanceAccuracy));
		// Return the result.
		return `${distance} ${this.settings.units[this.settings.unitSystem].distance}`;
	}

	// Convert original temperature unit (Kelvin) to the preferred unit (Celsius|Fahrenheit).
	convertTemp(temp) {
		// Check that the temperature is a number.
		if (isNaN(+temp)) return false;
		else {
			//  Convert from Kelvin to Celsius. Kelvin doesn't use °.
			if (this.settings.unitSystem !== 'scientific') temp = temp - 273.15;
			//  Convert from Celsius to Fahrenheit
			if (this.settings.unitSystem === 'imperial') temp = 1.8 * temp + 32;

			//  Return the result
			return Number(temp.toFixed(2)) + this.settings.units[this.settings.unitSystem].temp;
		}
	}

	/***
	 * Forecast Functions
	 ***/

	// Build the forecast DOM element tree from the forecast data, and then add it to the DOM.
	forecastBuild(locationData) {
		if (!locationData.forecastData) return false;


		// Day builder function
		const dayBuild = (dayData) => {
			const dayCard = this.templates.dayCard.cloneNode(true).firstElementChild;
			let day       = dayjs(dayData[0].timestamp * 1000);

			// Set the text content of the day headers.
			dayCard.querySelector('.dayCard__header__date').textContent = day.format('MMMM D');
			dayCard.querySelector('.dayCard__header__day').textContent  = day.format('dddd');

			// Loop through the time blocks and add them to the days.
			dayData.forEach(dayData => dayCard.appendChild(timeBuild(dayData)));

			return dayCard;
		};

		// Time block builder function
		const timeBuild = (forecast) => {
			// Clone the time card
			const timeCard = this.templates.timeCard.cloneNode(true).firstElementChild;

			//  Set the time (format: 12am), current temperature, humidity, and wind speed/direction.
			timeCard.querySelector('.timeCard__time').textContent     = dayjs.unix(forecast.timestamp).format('ha');
			timeCard.querySelector('.timeCard__humidity').textContent = forecast.humidity;
			timeCard.querySelector('.timeCard__pressure').textContent = forecast.pressure;
			timeCard.querySelector('.timeCard__temp').textContent     = forecast.temp.actual;
			timeCard.querySelector('.timeCard__wind').textContent     = `${forecast.wind.speed} ${forecast.wind.direction}`;

			timeCard.querySelector('.timeCard__humidity').dataset.label = 'Humidity';
			timeCard.querySelector('.timeCard__pressure').dataset.label = 'Pressure';
			timeCard.querySelector('.timeCard__temp').dataset.label     = 'Temp';
			timeCard.querySelector('.timeCard__wind').dataset.label     = 'Wind';

			return timeCard;
		};

		// Empty the forecast DOM list, and then loop through the days and add the updated data to it.
		[...this.elements.forecastList.children].forEach((child, index) => {
			// Do not remove the current weather element.
			if (index !== 0) child.remove();
		});
		Object.values(locationData.forecastData).forEach(day => {
			const newDay = dayBuild(day);
			this.elements.forecastList.appendChild(newDay);
		});
	}

	// Updates the forecast from OpenWeatherMap API,
	async forecastUpdate(locationData) {
		// If the cache has expired OR there isn't any weather data stored in the location object, go fish.
		if (locationData.cacheForecastUntil < Date.now() || !Object.keys(locationData.forecastData).length) {
			let url    = this.apis.forecast;
			url.search = new URLSearchParams({
				                                 apiKey: this.settings.apiKey,
				                                 lat:    locationData.latitude,
				                                 lon:    locationData.longitude
			                                 });

			// Pull the weather request from the API, and rebuild the response object.
			await this.apiFetchJSON(url.href, (forecastData) => {
				locationData.forecastData = this.apiDataBuild(forecastData);
				if (locationData.forecastData)
					locationData.cacheForecastUntil = Date.now() + this.settings.cacheForecastExp;
				// Build (fill in) the weather element data.
				this.forecastBuild(locationData);
			});
		} else this.forecastBuild(locationData);
	}

	/***
	 * Location Functions
	 ***/

	// Build the location object data for first-time entry into data storage.
	locationBuild(locationData) {
		// If location data does not include proper coordinates, then abort.
		if (!locationData.lat || !locationData.lon) return false;
		//  Convert the coordinates to a lesser accuracy.
		const [latitude, longitude] = this.convertCoords(locationData.lat, locationData.lon);

		// TODO: Figure out what to do for existing location merging.
		// const locationExisting      = this.data.location.find(loc => loc.name === locationData.name &&
		//                                                              loc.lat - latitude < this.settings.similarAccuracy &&
		//                                                              loc.lon - longitude < this.settings.similarAccuracy) ?? null;

		const location = {
			cacheForecastUntil: Date.now() - 1,
			cacheWeatherUntil:  Date.now() - 1,
			lastAccess:         Date.now(),
			latitude:           latitude,
			longitude:          longitude,
			city:               locationData.name ?? '',
			state:              locationData.state ?? '',
			country:            locationData.country ?? '',
			zip:                locationData.zip ?? '',
		}

		this.data.location.push(location);
		// Add additional functions to the object.
		this.locationRebuild(location);
	}

	// List options for multiple returned locations based off of the search criteria.
	locationListOptions(locationListData) {
		const locationList = this.elements.locationListOptions;

		// Build each item of the location options list.
		const listItemBuild = (location) => {
			const locationOption = this.templates.locationListOptions.cloneNode(true).firstElementChild;

			// Fill in the text data.
			locationOption.querySelector('.locationSearch__listOptions__option__city').textContent   = location.name;
			locationOption.querySelector('.locationSearch__listOptions__option__coords').textContent = `${location.lat}, ${location.lon}`;
			locationOption.querySelector('.locationSearch__listOptions__option__stco').textContent   =
				(location.state && location.country) ? `${location.state}, ${location.country}`
				                                     : location.state || location.country || '';

			// Add an event listener and attach the object to the element.
			locationOption.addEventListener('click', this.actionLocationListOptionsSelect.bind(this));

			// Save the locations to an array.
			this.data.locationListOptions.push(location);

			return locationOption;
		}
		// Loop through the locations, and add them to the list.
		locationListData.forEach(location => locationList.appendChild(listItemBuild(location)));
	}

	//  Sorts the location list in descending order of most recently accessed location is, and then rebuilds the visual
	//  location history list. This will then return the reference to most recent location in the list (the first one).
	locationListUpdate() {
		// If there isn't any data then there's nothing to do.
		if (!this.data.location.length) return false;

		// This builds the list items for the location history list.
		const listItemBuild = (location) => {
			const locationItem = this.templates.locationItem.cloneNode(true).firstElementChild;

			// Fill In the location details.
			locationItem.querySelector('.locationSearch__list__item__city').textContent   = location.city;
			locationItem.querySelector('.locationSearch__list__item__coords').textContent = `${location.latitude}, ${location.longitude}`;
			locationItem.querySelector('.locationSearch__list__item__stco').textContent   =
				(location.state && location.country) ? `${location.state}, ${location.country}`
				                                     : location.state || location.country || '';

			// Save the reference to the direct object, and add an event listener.
			locationItem.ref = location;
			locationItem.addEventListener('click', location.select);

			return locationItem;
		};

		// Remove event handlers from all the children, and clear the list.
		[...this.elements.locationList.children].forEach(location => {
			location.removeEventListener('click', location.select);
			location.remove();
		});

		// Sort through the locations in descending order, and then loop through them to build the list.
		this.data.location.sort((a, b) => b.lastAccess - a.lastAccess);
		this.data.location.forEach(location => this.elements.locationList.appendChild(listItemBuild(location)));
	}

	async locationLookup(searchData) {
		// Initialize variables and get the OpenWeatherMap API key.
		let cacheTest, locationData, url;
		let matches   = [];
		let urlSearch = {appid: this.settings.apiKey};

		//  Trim any leading/following whitespace characters.
		searchData = searchData.trim();

		//  If user didn't enter anything, abort.
		if (!searchData.length) return false;

		//  Determine search type.
		if (matches = searchData.match(this.regex.cityStateCountry)) {
			// Search for City,State|Country.
			url             = this.apis.geocodeCity;
			urlSearch.q     = matches.slice(1)
			                         .map(item => (item !== undefined) ? item.trim() : null)
			                         .join(',');
			urlSearch.limit = this.settings.geoLimit;

			//  Cache search test for city
			cacheTest = loc => loc.name === matches[1];

		} else if (matches = searchData.match(this.regex.zipCode)) {
			//  Get the URL, and the zipcode. If the country is included, append that too, but filter it out if it
			//  doesn't exist.
			url           = this.apis.geocodeZip;
			urlSearch.zip = matches.slice(1)
			                       .filter(item => item !== undefined)
			                       .map(item => item.trim())
			                       .join(',');

			//  Cache search test for zip code
			cacheTest = loc => loc.zip === matches[1];

		} else if (matches = searchData.match(this.regex.coords)) {
			// Check that the global coordinates are within the valid range {90<=>-90, 180<=>-180}
			this.messageWarning(this.errors.coordsInvalid);
			if (Math.abs(parseFloat(matches[1])) > 90 || Math.abs(parseFloat(matches[2])) > 180)
				this.messageWarning(this.errors.coordsInvalid);


			// Get the URL, set the return limit and convert the coordinate accuracy.
			url                            = this.apis.geocodeCoords;
			urlSearch.limit                = this.settings.geoLimit;
			[urlSearch.lat, urlSearch.lon] = this.convertCoords(matches[1], matches[2]);

			//  Cache search test for latitude and longitude.
			cacheTest = loc => loc.lat === parseFloat(urlSearch.lat) &&
			                   loc.lon === parseFloat(urlSearch.lon);

		} else {
			// Alert the user that there's invalid data.
			this.messageWarning(this.errors.inputInvalid);
			return false;
		}

		// Fill the URL string with parameters.
		url.search = new URLSearchParams(urlSearch);

		// TODO: THE LAST PART TO REWRITE IS FROM HERE TO THE END OF THE FUNCTION.
		// Search for the cached data, and if it's found, load it.
		if (locationData = this.data.location.find(cacheTest)) locationData.select();

		// Otherwise, pull location data from the API
		else await this.apiFetchJSON(url.href, (locationData => {
			// TODO: There is a bug where the same city can be returned twice, and it triggers the popup.

			// If something other than the zipcode was being searched for, there may be multiple options.
			if (!urlSearch.zip?.length && Array.isArray(locationData)) {
				if (locationData.length > 1) this.locationListOptions(locationData);
				else locationData = locationData[0];
			}
			// If the user doesn't need to make a choice, build the location object and update the list.
			if (locationData) this.locationBuild(locationData);
		}));
	}

	// Add on the functions and "rebuild" the object for both first-time and subsequent time entries. This is to fix
	// data that gets destroyed in the caching process, but also avoids repetition of code.
	async locationRebuild(locationData) {
		locationData.refresh = () => {
			locationData.lastAccess = Date.now();
		};
		// Save the element reference to the object, update the weather and forecast, then cache.
		locationData.select  = async () => {
			locationData.lastAccess = Date.now();
			locationData.element    = this.locationListUpdate();
			await this.weatherUpdate(locationData);
			await this.forecastUpdate(locationData);
			this.apiCacheSave();
		};

		// TODO: The only problem I foresee here is that select() is going to update all locations, and set all of the
		//  lastAccess times to Date.now(), which will put them out of order when the site reloads, because
		//  locationRebuild() is going to be forced to be looped for all of the cached items.
		locationData.select();
	}

	// Remove the location object from data storage and cache.
	locationRemove(locationData) {
		// Remove the object's element from the location history list, storage arrays and reset the value.
		locationData.element.remove();
		this.data.location.splice(this.data.location.indexOf(locationData), 1);
		locationData = undefined;

		// Recache the location array.
		this.apiCacheSave();
	}

	/***
	 * Weather Functions
	 ***/

	// Fill in the weather data in the DOM.
	weatherBuild(locationData) {
		// Shorten the references.
		const weatherElement = this.elements.weather;
		const weatherData    = locationData.weatherData;

		weatherElement.querySelector('.weather__location').textContent = locationData.city;

		// Set the text content for the weather data.
		weatherElement.querySelector('.weather__feelsLike').textContent  = weatherData.temp.feelsLike ?? '';
		weatherElement.querySelector('.weather__humidity').textContent   = weatherData.humidity ?? '';
		weatherElement.querySelector('.weather__max').textContent        = weatherData.temp.max ?? '';
		weatherElement.querySelector('.weather__min').textContent        = weatherData.temp.min ?? '';
		weatherElement.querySelector('.weather__pressure').textContent   = weatherData.pressure ?? '';
		weatherElement.querySelector('.weather__temp').textContent       = weatherData.temp.actual ?? '';
		weatherElement.querySelector('.weather__wind').textContent       =
			(weatherData.wind.speed && weatherData.wind.direction)
			? `${weatherData.wind.speed} ${weatherData.wind.direction}` : '';
		weatherElement.querySelector('.weather__visibility').textContent = weatherData.visibility ?? '';

		weatherElement.querySelector('.weather__feelsLike').dataset.label  = 'Feels Like';
		weatherElement.querySelector('.weather__humidity').dataset.label   = 'Humidity';
		weatherElement.querySelector('.weather__max').dataset.label        = 'Max';
		weatherElement.querySelector('.weather__min').dataset.label        = 'Min';
		weatherElement.querySelector('.weather__pressure').dataset.label   = 'Pressure';
		weatherElement.querySelector('.weather__temp').dataset.label       = 'Temp';
		weatherElement.querySelector('.weather__wind').dataset.label       = 'Wind';
		weatherElement.querySelector('.weather__visibility').dataset.label = 'Visibility';
	}

	// Updates the weather from OpenWeatherMap API,
	async weatherUpdate(locationData) {
		// If the cache has expired OR there isn't any weather data stored in the location object, go fish.
		if (locationData.cacheWeatherUntil < Date.now() || !Object.keys(locationData.weatherData).length) {
			let url    = this.apis.weather;
			url.search = new URLSearchParams({
				                                 apiKey: this.settings.apiKey,
				                                 lat:    locationData.latitude,
				                                 lon:    locationData.longitude
			                                 });

			// Pull the weather request from the API, and rebuild the response object.
			await this.apiFetchJSON(url.href, (weatherData) => {
				locationData.weatherData = this.apiDataBuild(weatherData);
				if (locationData.weatherData)
					locationData.cacheWeatherUntil = Date.now() + this.settings.cacheWeatherExp;
				// Build (fill in) the weather element data.
				this.weatherBuild(locationData);
			});
		} else this.weatherBuild(locationData);
	}

	messageWarning(message) {

	}
}

new Weather();