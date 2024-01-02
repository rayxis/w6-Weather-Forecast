/***
 TODO:
  - Organize constructor()
  - Finish Readme (description and screenshots)
  - Error testing and handling (and messages for the user)
  - Merge existing locations
  - Location
     - Get user's current location
     - Fix popup for search results (same city twice)
	 - Local time and time where you are.
  - Weather
     - Average weather / day?
  - Design
     - Scalable
     - Header
     - Display the time.
     - Location Section
     - Weather Section
     - Set background of card to reflect weather conditions.
  - Bugs
	 - Changing the unitSystem doesn't repaint the window.
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
		locationListOptions: []
	};
	//  Element references
	elements  = {
		clock:                document.querySelector('.weather__item--time'),
		forecastList:         document.querySelector('.forecast'),
		locationList:         document.querySelector('.search__list'),
		locationListOptions:  document.querySelector('.search__list--location-options'),
		locationSearchButton: document.querySelector('.search__button'),
		locationSearchInput:  document.querySelector('.search__input'),
		settingsLanguageList: document.querySelector('.settings__list--language'),
		settingsUnitsList:    document.querySelector('.settings__list--units'),
		weather:              document.querySelector('.weather')
	};
	// Error messages
	errors    = {
		coordsInvalid: 'These are not valid coordinates.',
		inputInvalid:  'This is not valid input.'
	};
	// Store language data
	languages = {};
	//  Regular Expression patterns
	regex     = {
		cityStateCountry: /^([A-Za-z.\s'-]+),([A-Za-z.\s'-]+),?([A-Za-z.\s'-]+)?$/,     //  City, State|Country, Country
		coords:           /^(-?\d{1,2}(?:\.\d{0,7})?)\s*,\s*(-?\d{1,3}(?:\.\d{0,7})?)$/,    //  Lat / Lon pair
		zipCode:          /^(\d{5}|[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d),?([A-Za-z.\s'-]+)?$/    //  5-digit and Canadian
	                                                                                        // Zip Codes
	};
	//  Settings
	settings  = {
		apiKey:           '',   // Leave blank. The API key is filled by the class' constructor.
		coordAccuracy:    2,    // Decimal Accuracy for coordinates (.1 = 11.1km, .01 = 1.11km)
		distanceAccuracy: 2,    // Distance conversion function accuracy.
		cacheForecastExp: 3 * 60 * 60 * 1000, // In milliseconds [3 hours].
		cacheLocation:    'locationData',     // Cache location name for localStorage.
		cacheSettings:    'settingsData',     // Cache settings name for localStorage.
		cacheWeatherExp:  60 * 60 * 1000,     // In milliseconds [1 hour].
		geoLimit:         5,    // Maximum location options from OpenWeatherMaps is 5.
		language:         undefined,
		iconURL:          'https://openweathermap.org/img/wn/', // URL for OpenWeather's icons.
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
		dayCard:             document.getElementById('day-card').content,
		locationListOptions: document.getElementById('location-option').content,
		locationItem:        document.getElementById('location-item').content,
		settingsItem:        document.getElementById('settings-item').content,
		timeCard:            document.getElementById('time-card').content
	};

	constructor() {
		weather = this;

		this.languages       = languages;
		this.settings.apiKey = openWeatherMap.apiKey;
		//  Load site cache.
		this.apiCacheLoad();

		// Clock
		setInterval(() => {
			this.elements.clock.textContent = dayjs().format('HH:mm:ss');
		}, 1000);

		// Languages
		this.languageBuildMenu();
		this.languageSet(this.settings.language ?? this.languages.English);


		// Units Menu Build
		Object.keys(this.settings.units).forEach(unit => {
			const unitElement = this.templates.settingsItem.cloneNode(true).firstElementChild;

			unitElement.textContent  = this.languageText('labels', unit);
			unitElement.dataset.unit = unit;
			unitElement.addEventListener('click', (event) => {
				this.settings.unitSystem = event.target.dataset.unit;
				this.apiCacheSave();
			});
			this.elements.settingsUnitsList.appendChild(unitElement);
		});

		this.elements.locationSearchButton.addEventListener('click', this.actionUserLocationLookup.bind(this));
	}

	/***
	 * User Action Functions
	 ***/

	// User Action: Select a location from a list of optional locations based off multiple returns from a
	// locationLookup() search.
	actionLocationListOptionsSelect(locationOption, event) {
		// Remove event handlers from all the children, and clear the list.
		[...this.elements.locationListOptions.children].forEach(child => {
			child.removeEventListener('click', this.data.locationListOptions.shift());
			child.remove();
		});

		// Rebuild the location object by using the referenced location index, then update the history.
		this.locationBuild(locationOption);
		this.locationListUpdate();
	}

	// User Action: Search for a location, with a proper format.
	actionUserLocationLookup(event) {
		event.preventDefault();
		//  Search for the user-specified location.
		this.locationLookup(this.elements.locationSearchInput.value);
	}

	/***
	 * API Data functions
	 ***/

	// Save the location and settings data arrays to localStorage.
	apiCacheSave() {
		// Convert the location data array into a string.
		let locationData = JSON.stringify(this.data.location);
		let settingsData = JSON.stringify(this.settings);

		// If JSON was successful in converting it, save the item to localStorage.
		if (locationData && settingsData) {
			localStorage.setItem(this.settings.cacheLocation, locationData);
			localStorage.setItem(this.settings.cacheSettings, settingsData);
			// Check the integrity of the data in localStorage.
			if (locationData === localStorage.getItem(this.settings.cacheLocation)) return true;
		}
		// If JSON was not successful, or the data did not save properly, return false.
		return false;
	}

	// Load cached data from localStorage.
	apiCacheLoad() {
		// Load the location and settings data from localStorage, and convert it back into an array.
		this.data.location = JSON.parse(localStorage.getItem(this.settings.cacheLocation)) ?? [];
		this.settings      = JSON.parse(localStorage.getItem(this.settings.cacheSettings)) ?? this.settings;
		// If the returned location array is not empty, go through the objects and rebuild them.
		this.data.location.forEach(location => this.locationRebuild(location));

		// Update the location history list, and return the last location accessed.
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
				timezone:   apiData.timezone / 3600 ?? '',
				temp:       {
					actual:    apiData.main.temp,
					feelsLike: apiData.main.feels_like,
					max:       apiData.main.temp_max,
					min:       apiData.main.temp_min
				},
				visibility: apiData.visibility,
				weather:    {
					...apiData.weather[0],
					iconURL: this.settings.iconURL + apiData.weather[0].icon + '@2x.png'
				},
				wind:       {
					direction: apiData.wind.deg,
					speed:     apiData.wind.speed * 1000
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

				// Organizing the weather by day. If the day doesn't exist in the object, create it; then save the data.
				if (!dayList[dayKey]) dayList[dayKey] = [];
				dayList[dayKey].push(weatherData);
			});
			return dayList;
		} else return objectBuild(apiData);
	}

	apiDataRebuild(apiData) {
		let weatherClass = this;

		apiData.getTemp       = (key) => {
			return this.convertTemp(apiData.temp[key]);
		};
		apiData.getVisibility = () => {
			return this.convertDistance(apiData.visibility);
		};
		apiData.getWind       = (key) => {
			// Return
			return (key === 'both')
				// BOTH the wind speed, and direction,
			       ? this.convertDistance(apiData.wind.speed) + '/h ' + this.convertDirection(apiData.wind.direction)

				// OR the direction, OR the distance.
			       : (key === 'direction') ? this.convertDirection(apiData.wind[key])
			                               : this.convertDistance(apiData.wind[key]) + '/h';
		};
		// Return the modified object.
		return apiData;
	}

	// Handler for API fetch requests, with optional callback function for handling asynchronous requests.
	async apiFetchJSON(url, callback = undefined) {
		try {
			//  Fetch data from the specified URL, and then return it.
			const response = await fetch(url);

			// TODO: Better error handling here.
			// If the response is not okay, throw an error.
			if (!response.ok) throw new Error('Network error');

			// If a callback was provided, return the value from that, otherwise return the parsed response.
			else return callback ? response.json().then(response => callback(response)) : response.json();
		} catch (error) {
			// TODO: Handle errors.
		}
	}

	async apiUpdate(apiName, locationData, callback = undefined) {
		let cacheName, dataName;
		// The API should only be forecast or weather.
		if (apiName === 'forecast') {
			cacheName = 'cacheForecast';
			dataName  = 'forecastData';
		} else if (apiName !== 'weather') {
			cacheName = 'cacheWeather';
			dataName  = 'weatherData';
		} else return false;

		if (!locationData) return false;

		// If the cache has expired OR there isn't any weather data stored in the location object, go fish.
		if (location[`${cacheName}Until`] < Date.now() || !locationData[cacheName]) {
			// Load the API (URL) object.
			let url = this.apis[apiName];

			// Fill in the search parameters.
			url.search = new URLSearchParams({
				                                 apiKey: this.settings.apiKey,
				                                 lat:    locationData.latitude,
				                                 lon:    locationData.longitude
			                                 });

			// Pull the weather request from the API, and rebuild the response object.
			await this.apiFetchJSON(url.href, (apiData) => {
				locationData[dataName] = this.apiDataBuild(apiData);
				// Rebuild the response object, and if valid data was received, set the cache expiration.
				if (locationData[dataName])
					locationData[`${cacheName}Until`] = Date.now() + this.settings[`${cacheName}Exp`];
				// If a callback function was defined, run it; otherwise return the location data.
				return (typeof callback === 'function') ? callback(locationData) : locationData;
			});
		} else return (typeof callback === 'function') ? callback(locationData) : locationData;
	}

	/***
	 * Conversion Functions
	 ***/

	// Convert latitude and longitude to the accuracy specified in the settings.
	convertCoords(latitude, longitude) {
		// Check that the degrees are represented as a number.
		if (isNaN(+latitude) || isNaN(+longitude)) return false;
		// Round the coordinate accuracy, and return as an array.
		else return [
			parseFloat(latitude).toFixed(this.settings.coordAccuracy),
			parseFloat(longitude).toFixed(this.settings.coordAccuracy)
		];
	}

	// Convert degrees into cardinal directions.
	convertDirection(deg) {
		const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

		// Check that the degrees are represented as a number If not, return false. If so, then calculate the direction.
		// Divide 360 degrees / 8 = 45 degrees for each octant. Use this to calculate the modulus for the array
		// index, this will result in an index for referencing the cardinal direction equivalent.
		return (isNaN(+deg)) ? false : direction[Math.round(deg / 45) % 8];
	}

	// Convert distance units from kilometers.
	convertDistance(distance) {
		// Check that the distance is a number.
		if (isNaN(+distance)) return false;

		// If converting from metric to imperial, convert kilometers to miles.
		else if (this.settings.unitSystem === 'imperial')
			// 1609.344 meters = 1 mile
			distance = +(distance / 1609.344);

		// Convert meters to kilometers
		else distance /= 1000;

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

			//  Return the result with units.
			return Number(temp.toFixed(2)) + this.settings.units[this.settings.unitSystem].temp;
		}
	}

	/***
	 * Forecast Functions
	 ***/

	// Build the forecast DOM element tree from the forecast data, and then add it to the DOM.
	forecastBuild(locationData) {
		// If forecast data doesn't exist, abort.
		if (!locationData.forecastData) return false;

		// Day builder function.
		const dayBuild = (dayData) => {
			// Clone the day card element.
			const dayCard = this.templates.dayCard.cloneNode(true).firstElementChild;
			let day       = dayjs(dayData[0].timestamp * 1000);

			// Set the text content of the day headers (date and day).
			dayCard.querySelector('.card__subtitle--date').textContent = day.format('MMMM D');
			dayCard.querySelector('.card__subtitle--day').textContent  = day.format('dddd');

			// Loop through the time blocks and add them to the days.
			dayData.forEach(dayData => dayCard.appendChild(timeBuild(dayData)));

			return dayCard;
		};

		// Time block builder function
		const timeBuild = (forecast) => {
			// Clone the time card
			const timeCard = this.templates.timeCard.cloneNode(true).firstElementChild;

			// Set the icon for the time block.
			timeCard.querySelector('.card__item--icon').src = forecast.weather.iconURL;
			timeCard.querySelector('.card__item--icon').alt = forecast.weather.description;


			// Set the time (format: 12am), current temperature, humidity, and wind speed/direction.
			timeCard.querySelector('.card__item--time').textContent     = dayjs.unix(forecast.timestamp).format('ha');
			timeCard.querySelector('.card__item--humidity').textContent = forecast.humidity;
			timeCard.querySelector('.card__item--pressure').textContent = forecast.pressure;
			timeCard.querySelector('.card__item--temp').textContent     = forecast.getTemp('actual');
			timeCard.querySelector('.card__item--wind').textContent     = forecast.getWind('both');

			// Set the data-label attributes for CSS to fill in. This is mostly for translation purposes.
			timeCard.querySelector('.card__item--humidity').dataset.label = this.languageText('labels', 'humidity');
			timeCard.querySelector('.card__item--pressure').dataset.label = this.languageText('labels', 'pressure');
			timeCard.querySelector('.card__item--temp').dataset.label     = this.languageText('labels', 'temp');
			timeCard.querySelector('.card__item--wind').dataset.label     = this.languageText('labels', 'wind');

			return timeCard;
		};

		// Empty the forecast DOM list, but leave the weather element.
		[...this.elements.forecastList.children].splice(1).forEach(child => child.remove());
		// Loop through the forecast data, create the day elements and add them to the list.
		Object.values(locationData.forecastData).forEach(
			day => this.elements.forecastList.appendChild(dayBuild(day)));
	}

	// Updates the forecast from OpenWeatherMap API,
	async forecastUpdate(locationData) {
		// Get updated forecast data from the API.
		await this.apiUpdate('forecast', locationData, (locationData) => {

			// Loop through each weather object and add functions to new data, or previously cached data where they
			// would have been destroyed.
			Object.keys(locationData.forecastData).forEach(
				day => locationData.forecastData[day] = locationData.forecastData[day].map(
					forecast => this.apiDataRebuild(forecast)));
			// Build the forecast DOM tree.
			this.forecastBuild(locationData);
		});
	}

	/***
	 * Language Functions
	 ***/

	languageBuildMenu() {
		Object.values(this.languages).forEach(language => {
			// Clone the settings item, and create an image.
			const languageItem = this.templates.settingsItem.cloneNode(true).firstElementChild;
			const languageIcon = document.createElement('img');

			// Set the source and description from the language object, and add a language class.
			languageIcon.src = language.icon;
			languageIcon.alt = language.description;
			languageIcon.classList.add('settings__item--language');

			// Add the child to the settings item, and then attach an event listener.
			languageItem.appendChild(languageIcon);
			languageItem.addEventListener('click', this.languageSet.bind(this, language));

			// Add the settings item to the DOM.
			this.elements.settingsLanguageList.appendChild(languageItem);
		});
	}

	languageText(key, subkey) {
		try {
			// Return the language text.
			return this.settings.language[key][subkey];
		} catch (error) {
			// Log the error. The language text must exist to continue operation.
			console.log(error);
			throw new Error("Failed to access language settings");
		}
	}

	languageSet(language) {
		// Remove any locale script, if there is one.
		document.querySelector(`script[src="${language.dayjs}"]`)?.remove();
		// Set the current language, and save the settings.
		this.settings.language = language;
		this.apiCacheSave();

		// Toggle the active class on the selected language, and remove it from the others.
		[...this.elements.settingsLanguageList.children].forEach(child =>
			child.classList.toggle('active', language.description === child.firstElementChild.alt));

		// If there's a locale script, load it. English doesn't have one.
		if (language.dayjs) {
			const scriptElement  = document.createElement('script');
			scriptElement.src    = language.dayjs;
			scriptElement.onload = () => dayjs.locale(language.locale);
			// Add the script element to the DOM.
			document.body.appendChild(scriptElement);
		}
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
		// const locationExisting = this.data.location.find(loc => loc.name === locationData.name &&
		//                                                         loc.lat - latitude < this.settings.similarAccuracy
		// &&
		//                                                         loc.lon - longitude < this.settings.similarAccuracy)
		// ?? null;

		// Set the cache to expired, save any information that is provided by the original object.
		const location = {
			cacheForecastUntil: Date.now() - 1,
			cacheWeatherUntil:  Date.now() - 1,
			lastAccess:         Date.now(),
			latitude:           latitude,
			longitude:          longitude,
			city:               locationData.name ?? '',
			state:              locationData.state ?? '',
			country:            locationData.country ?? '',
			zip:                locationData.zip ?? ''
		};

		// save the location object in the location data array.
		this.data.location.push(location);
		// Add additional functions to the object.
		this.locationRebuild(location);
	}

	// Gets the user's current location, if they allow.
	locationCurrent() {
		// TODO: This.

	}

	// List options for multiple returned locations based off of the search criteria.
	locationListOptions(locationListData) {
		const locationList = this.elements.locationListOptions;

		// Build each item of the location options list.
		const listItemBuild = (location) => {
			const locationOption = this.templates.locationListOptions.cloneNode(true).firstElementChild;

			// TODO: Duplicate code?
			// Fill In the location details.
			locationOption.querySelector('.search__option-description--city').textContent   = location.name;
			locationOption.querySelector('.search__option-description--coords').textContent = `${location.lat}, ${location.lon}`;
			// If the state and country are specified, use those, otherwise use whatever there is.
			locationOption.querySelector('.search__option-description--stco').textContent   =
				(location.state && location.country) ? `${location.state}, ${location.country}`
				                                     : location.state || location.country || '';

			// Create a click function that can be removed when it's no longer needed, and then use that as
			const clickFunction = this.actionLocationListOptionsSelect.bind(this, location);
			this.data.locationListOptions.push(clickFunction);
			locationOption.addEventListener('click', clickFunction);

			return locationOption;
		};
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
			// Clone the template and get the first element
			const locationItem = this.templates.locationItem.cloneNode(true).firstElementChild;

			// Fill In the location details.
			locationItem.querySelector('.search__description--city').textContent   = location.city;
			locationItem.querySelector('.search__description--coords').textContent = `${location.latitude}, ${location.longitude}`;
			// If the state and country are specified, use those, otherwise use whatever there is.
			locationItem.querySelector('.search__description--stco').textContent   =
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

		try {
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
				this.messageWarning('coordsInvalid');
				if (Math.abs(parseFloat(matches[1])) > 90 || Math.abs(parseFloat(matches[2])) > 180)
					this.messageError('coordsInvalid');


				// Get the URL, set the return limit and convert the coordinate accuracy.
				url                            = this.apis.geocodeCoords;
				urlSearch.limit                = this.settings.geoLimit;
				[urlSearch.lat, urlSearch.lon] = this.convertCoords(matches[1], matches[2]);

				//  Cache search test for latitude and longitude. Accept a margin of error for coordinates,
				cacheTest = loc => Math.abs(loc.latitude - parseFloat(urlSearch.lat)) < this.settings.similarAccuracy &&
				                   Math.abs(loc.longitude - parseFloat(urlSearch.lon)) < this.settings.similarAccuracy;

			} else {
				// Alert the user that there's invalid data.
				this.messageError('inputInvalid');
				return false;
			}

			// Fill the URL string with parameters.
			url.search = new URLSearchParams(urlSearch);

			// Search for the cached data, and if it's found, load it.
			if (locationData = this.data.location.find(cacheTest)) locationData.select();

			// Otherwise, pull location data from the API
			else await this.apiFetchJSON(url.href, (locationData => {
				// TODO: There is a bug where the same city can be returned twice, and it triggers the popup.

				// If something other than the zipcode was being searched for, there may be multiple options.
				if (Array.isArray(locationData)) {
					if (locationData.length > 1) {
						this.locationListOptions(locationData);
					} else locationData = locationData[0];
				}
				// If the user doesn't need to make a choice, build the location object and update the list.
				if (locationData) this.locationBuild(locationData);
			}));
		} catch (error) {

		}
	}

	// Add on the functions and "rebuild" the object for both first-time and subsequent time entries. This is to fix
	// data that gets destroyed in the caching process, but also avoids repetition of code.
	async locationRebuild(locationData) {
		let weatherClass     = this;
		// Force the weather data to refresh, by expiring the cache.
		locationData.refresh = () => {
			this.cacheForecastUntil = Date.now() - 1;
			this.cacheWeatherUntil  = Date.now() - 1;
			this.select();
		};
		// Save the element reference to the object, update the weather and forecast, then cache.
		locationData.select  = async () => {
			this.lastAccess = Date.now();
			this.element    = weatherClass.locationListUpdate();

			// Update the weather and the forecast data.
			await weatherClass.weatherUpdate(locationData);
			await weatherClass.forecastUpdate(locationData);
			this.apiCacheSave();
		};

		// TODO: The only problem I foresee here is that select() is going to update all locations, and set all of the
		//  lastAccess times to Date.now(), which will put them out of order when the site reloads, because
		//  locationRebuild() is going to be forced to be looped for all of the cached items.
		// Run the select() function to update the object and cache the weather data.
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

		// Set the location name, and weather icon.
		weatherElement.querySelector('.weather__item--location').textContent = locationData.city;
		weatherElement.querySelector('.weather__item--icon').src             = weatherData.weather.iconURL;
		weatherElement.querySelector('.weather__item--icon').alt             = weatherData.weather.description;

		// Set the text content for the weather data.
		weatherElement.querySelector('.weather__item--feels-like').textContent = weatherData.getTemp('feelsLike');
		weatherElement.querySelector('.weather__item--humidity').textContent   = weatherData.humidity ?? '';
		weatherElement.querySelector('.weather__item--max').textContent        = weatherData.getTemp('max');
		weatherElement.querySelector('.weather__item--min').textContent        = weatherData.getTemp('min');
		weatherElement.querySelector('.weather__item--pressure').textContent   = weatherData.pressure ?? '';
		weatherElement.querySelector('.weather__item--temp').textContent       = weatherData.getTemp('actual');
		weatherElement.querySelector('.weather__item--wind').textContent       = weatherData.getWind('both');
		weatherElement.querySelector('.weather__item--visibility').textContent = weatherData.getVisibility();


		// Set the data-label attributes for CSS to fill in. This is mostly for translation purposes.
		weatherElement.querySelector('.weather__item--feels-like').dataset.label = this.languageText('labels', 'feelsLike');
		weatherElement.querySelector('.weather__item--humidity').dataset.label   = this.languageText('labels', 'humidity');
		weatherElement.querySelector('.weather__item--max').dataset.label        = this.languageText('labels', 'max');
		weatherElement.querySelector('.weather__item--min').dataset.label        = this.languageText('labels', 'min');
		weatherElement.querySelector('.weather__item--pressure').dataset.label   = this.languageText('labels', 'pressure');
		weatherElement.querySelector('.weather__item--temp').dataset.label       = this.languageText('labels', 'temp');
		weatherElement.querySelector('.weather__item--wind').dataset.label       = this.languageText('labels', 'wind');
		weatherElement.querySelector('.weather__item--visibility').dataset.label = this.languageText('labels', 'visibility');
	}

	// Updates the weather from OpenWeatherMap API,
	async weatherUpdate(locationData) {
		await this.apiUpdate('weather', locationData, (locationData) => {
			// Add functions to new data, or previously cached data where it would have been destroyed.
			if (Object.keys(locationData.weatherData).length)
				this.apiDataRebuild(locationData.weatherData);
			// Fill the weather information.
			this.weatherBuild(locationData);
		});
	}

	messageError(message) {

	}
}

new Weather();