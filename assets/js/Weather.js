/***
 TODO:
  - Organize constructor()
  - Finish Readme (description and screenshots)
  - Error testing and handling (and messages for the user)
  - Location (Functions done)
     - Get user's current location
	 - Local time and time where you are.
  - Weather
     - Average weather / day?
	 - Load the temperature in the history.
  - Design
     - Scalable for mobile
     - Header (1 thing): the width of search is too variable. Title should be a fixed width, settings should be a fixed width, and search should (for the most part) be a fixed width).
     - Location Section
     - Weather Section
     - Set background color to reflect weather conditions / daytime. Maybe background of cards can be a weather image.
 ***/
dayjs.extend(window.dayjs_plugin_utc);

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
		functions:    {},           // Event handler function storage
		location:     [],           // Location object storage
		numberFormat: undefined // Number formatting for different locales.
	};
	//  Element references
	elements  = {
		forecastList:         document.querySelector('.forecast'),
		locationList:         document.querySelector('.search__list--location'),
		locationListOptions:  document.querySelector('.search__list--options'),
		locationSearchButton: document.querySelector('.search__button'),
		locationSearchInput:  document.querySelector('.search__input'),
		locationSearchLabel:  document.querySelector('.search__label'),
		pageHeader:           document.querySelector('.page-header'),
		settingsLanguageList: document.querySelector('.settings__list--language'),
		settingsUnitsList:    document.querySelector('.settings__list--units'),
		weather:              document.querySelector('.weather')
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
		clockDateFormat:  'D MMMM YYYY',      // Clock Date Format
		clockTimeFormat:  'h:mm a',           // Clock Time Format
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
		alert:               document.getElementById('alert').content,
		clock:               document.getElementById('clock').content,
		dayCard:             document.getElementById('day-card').content,
		locationListOptions: document.getElementById('location-option').content,
		locationItem:        document.getElementById('location-item').content,
		settingsItem:        document.getElementById('settings-item').content,
		timeCard:            document.getElementById('time-card').content
	};

	constructor() {
		weather = this;

		this.settings.apiKey = openWeatherMap.apiKey;
		this.languages       = languages;
		//  Load site cache. This will set the languages loaded for the site (which will load the units menu).
		this.apiCacheLoad();
		this.languageMenuBuild();

		// Clock
		const clock = this.clockNew();
		clock.classList.add('weather__item', 'weather__item--time');
		this.elements.weather.querySelector('.weather__item--time').replaceWith(clock);

		// Save the function, and add event handler.
		this.eventClickSave(this.elements.locationSearchButton, 'userLocationLookup', (event) => {
			event.preventDefault();
			//  Search for the user-specified location.
			this.locationLookup(this.elements.locationSearchInput.value);
		});
	}

	// Creates a clock element with the current date and time, offset by an optionally specified timezone.
	clockNew(tzOffset = undefined, timeFormat = undefined, dateFormat = undefined) {
		// Clone the clock element and if a timezone offset was specified, use that for dayjs; otherwise keep it local.
		const clockElement = this.templates.clock.cloneNode(true).firstElementChild;
		const timeCurrent  = (tzOffset) ? dayjs.utc().utcOffset(tzOffset / 60) : dayjs();

		// Set the time and date to their respective elements every second.
		clockElement.clock = setInterval(() => {
			// If alternative formats were specified, use those; otherwise use the ones from settings.
			clockElement.querySelector('.clock__time').textContent = timeCurrent.format(timeFormat ?? this.settings.clockTimeFormat);
			clockElement.querySelector('.clock__date').textContent = timeCurrent.format(dateFormat ?? this.settings.clockDateFormat);
		}, 1000);

		// Return the element node, ready to be appended to the DOM.
		return clockElement;
	}

	/***
	 * API Data functions
	 ***/

	// Save the location and settings data arrays to localStorage.
	apiCacheSave() {
		// Convert the location and settings data array into a string, and ignore elemental references.
		let locationData = JSON.stringify(this.data.location,
		                                  (key, value) => (key === 'element') ? undefined : value);
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
		this.data.location = JSON.parse(localStorage.getItem(this.settings.cacheLocation)) ?? this.data.location;
		this.settings      = JSON.parse(localStorage.getItem(this.settings.cacheSettings)) ?? this.settings;

		// Set the language here because settings are needed, but also the language is needed to rebuild any objects.
		// It will get the language from settings, falling back to the browser's settings and (if the language doesn't
		// exist, or the browser somehow didn't detect it) defaulting to English.
		this.languageSet(this.languages[this.settings.language] || this.languages[navigator.language] || this.languages['en-US']);

		// If the returned location array is not empty, go through the objects and rebuild them.
		// Set the second argument (keepLastAccess) to true to keep the history order.
		this.data.location.forEach(location => this.locationRebuild(location, true));

		// Update the location history list, and return the last location accessed.
		return this.locationListUpdate();
	}

	// Rebuild the weather objects.
	apiDataBuild(apiData) {
		// This creates a new weather data object and returns it.
		const objectBuild = apiData => {
			// Rebuild the weather API object.
			return {
				humidity:   apiData.main.humidity + '%',
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

		apiData.getTemp       = (key, precision = undefined) => {
			return this.convertTemp(apiData.temp[key], precision);
		};
		apiData.getVisibility = () => {
			return this.convertDistance(apiData.visibility);
		};
		apiData.getWind       = key => {
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
			if (!response.ok) throw new Error('networkError');

				/***
				 * Filter. Create an object literal called states, and then loop through that and get the state name to
				 * compare against
				 ***/

			// If a callback was provided, return the value from that, otherwise return the parsed response.
			else return callback ? response.json().then(response => callback(response)) : response.json();
		} catch (error) {
			this.alertUser(this.languageText('error', error));
		}
	}

	async apiUpdate(apiName, locationData, callback = undefined) {
		let cacheName, dataName;
		// The API should only be forecast or weather.
		if (apiName === 'forecast') {
			cacheName = 'cacheForecast';
			dataName  = 'forecastData';
		} else if (apiName === 'weather') {
			cacheName = 'cacheWeather';
			dataName  = 'weatherData';
		} else return false;

		if (!locationData) return false;

		// If the cache has expired OR there isn't any weather data stored in the location object, go fish.
		if (locationData[`${cacheName}Until`] < Date.now() || !locationData[dataName]) {
			// Load the API (URL) object.
			let url = this.apis[apiName];

			// Fill in the search parameters.
			url.search = new URLSearchParams({
				                                 apiKey: this.settings.apiKey,
				                                 lat:    locationData.latitude,
				                                 lon:    locationData.longitude
			                                 });

			// Pull the weather request from the API, and rebuild the response object.
			await this.apiFetchJSON(url.href, apiData => {
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
	convertDistance(distance, incUnits = true) {
		// Check that the distance is a number.
		if (isNaN(+distance)) return false;

		// If converting from metric to imperial, convert kilometers to miles.
		else if (this.settings.unitSystem === 'imperial')
			// 1609.344 meters = 1 mile
			distance = +(distance / 1609.344);

		// Convert meters to kilometers
		else distance /= 1000;

		// Round up to the specified amount of decimals.
		distance = this.data.numberFormat.format(distance.toFixed(this.settings.distanceAccuracy));
		// Return the result.

		// Including units on the end?
		if (incUnits) distance += ` ${this.settings.units[this.settings.unitSystem].distance}`;

		return distance;
	}

	// Convert original temperature unit (Kelvin) to the preferred unit (Celsius|Fahrenheit).
	convertTemp(temp, precision = undefined, incUnits = true) {
		// Check that the temperature is a number.
		if (isNaN(+temp)) return false;
		else {
			//  Convert from Kelvin to Celsius. Kelvin doesn't use °.
			if (this.settings.unitSystem !== 'scientific') temp = temp - 273.15;
			//  Convert from Celsius to Fahrenheit
			if (this.settings.unitSystem === 'imperial') temp = 1.8 * temp + 32;

			//  Return the result with units.
			return this.data.numberFormat.format(temp.toFixed(precision ?? this.settings.tempAccuracy)) + (incUnits ? this.settings.units[this.settings.unitSystem].temp : '');
		}
	}

	/***
	 * Event Functions
	 ***/

	// Remove all children and their click events from the specified parent element.
	eventClickChildrenRemove(element, funcName) {
		[...element.children].forEach(child => {
			this.eventClickRemove(child, funcName);
			child.remove();
		});
	}

	// Remove a click event.
	eventClickRemove(element, funcName) {
		// If the function name exists in the array, grab it; otherwise check if it's an actual function, and save that.
		// This is so that even if the event wasn't created with eventClickSave(), it can still save code.
		const func = this.data.functions[funcName] ?? (typeof funcName === 'function') ? funcName : false;
		// If the function is not a function, abort.
		if (!func) return false;

		// Remove the event listener from the element.
		element.removeEventListener('click', this.data.functions[funcName]);
		return true;
	}

	// Save the function for future removal.
	eventClickSave(element, funcName, func) {
		// If the eventFunctionSave failed, also fail.
		if (!this.eventFunctionSave(funcName, func)) return false;

		// Save the event handler.
		element.addEventListener('click', func);

		return func;
	}

	// Save functions for future reference.
	eventFunctionSave(funcName, func) {
		try {
			// If the function is not a function, abort.
			if (typeof func !== 'function') throw new Error('This is not a function.');

		} catch (error) {
			console.log(error);
			return false;
		}

		// If the function isn't saved, save it.
		if (!this.data.functions[funcName]) this.data.functions[funcName] = func;

		return func;
	}

	/***
	 * Forecast Functions
	 ***/

	// Build the forecast DOM element tree from the forecast data, and then add it to the DOM.
	forecastBuild(locationData) {
		// If forecast data doesn't exist, abort.
		if (!locationData.forecastData) return false;

		// Day builder function.
		const dayBuild = dayData => {
			// Clone the day card element.
			const dayCard = this.templates.dayCard.cloneNode(true).firstElementChild;
			let day       = dayjs(dayData[0].timestamp * 1000);

			// Set the text content of the day headers (date and day).
			dayCard.querySelector('.card__subtitle--date').textContent = day.format('MMMM D');
			dayCard.querySelector('.card__subtitle--day').textContent  = day.format('dddd');

			// Loop through the time blocks and add them to the days.
			dayData.forEach(dayData => dayCard.appendChild(timeBuild(dayData)));

			// TODO: Finish.
			// Build an average
			const dayAverage = {
				temp: dayData.reduce((total, forecast) => total + forecast.temp) / dayData.length,
				max:  [...dayData].sort((a, b) => b.temp - a.temp)[0],
				min:  [...dayData].sort((a, b) => a.temp - b.temp)[0]
			};

			this.eventClickSave(dayCard, 'dayCard', (event) => {
				[...event.currentTarget.parentNode.children]
					.forEach(child => child.classList.toggle('active', event.currentTarget === child));

			});

			return dayCard;
		};

		// Time block builder function
		const timeBuild = forecast => {
			// Clone the time card, and save the querySelector results.
			const timeCard    = this.templates.timeCard.cloneNode(true).firstElementChild;
			const humidity    = timeCard.querySelector('.card__item--humidity');
			const pressure    = timeCard.querySelector('.card__item--pressure');
			const temp        = timeCard.querySelector('.card__item--temp');
			const weatherIcon = timeCard.querySelector('.card__item--icon');
			const wind        = timeCard.querySelector('.card__item--wind');

			// Set the icon for the time block.
			weatherIcon.src = forecast.weather.iconURL;
			weatherIcon.alt = forecast.weather.description;

			// Set the time (format: 12am), current temperature, humidity, and wind speed/direction.
			timeCard.querySelector('.card__item--time').textContent = dayjs.unix(forecast.timestamp).format('ha');

			humidity.textContent = forecast.humidity;
			pressure.textContent = forecast.pressure;
			temp.textContent     = forecast.getTemp('actual');
			wind.textContent     = forecast.getWind('both');

			// Set the data-label attributes for CSS to fill in. This is mostly for translation purposes.
			humidity.dataset.label = this.languageText('labels', 'humidity');
			pressure.dataset.label = this.languageText('labels', 'pressure');
			temp.dataset.label     = this.languageText('labels', 'temp');
			wind.dataset.label     = this.languageText('labels', 'wind');

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
		await this.apiUpdate('forecast', locationData, locationData => {

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

	languageMenuBuild() {
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

	languagePage() {
		// Page title
		document.title                                            = this.languageText('labels', 'title');
		document.querySelector('.page-header__title').textContent = this.languageText('labels', 'title');
		// Form texts
		this.elements.locationSearchButton.textContent            = this.languageText('labels', 'searchButton');
		this.elements.locationSearchLabel.textContent             = this.languageText('labels', 'searchLabel');
		this.elements.locationSearchInput.placeholder             = this.languageText('labels', 'searchInput');
		// Update the data presentation.
		this.unitMenuBuild();
		this.locationUpdate();
	}

	languageSet(language) {
		// Remove any locale script, if there is one.
		document.querySelector(`script[src="${language.dayjs}"]`)?.remove();
		// Set the current language and number format, then save the settings.
		this.settings.language = language;
		console.log(language.locale);
		this.data.numberFormat = new Intl.NumberFormat(language.locale);
		this.apiCacheSave();
		// Set the language in to the <html> tag.
		document.documentElement.lang = language.locale;

		// Toggle the active class on the selected language, and remove it from the others.
		[...this.elements.settingsLanguageList.children]
			.forEach(child => child.classList.toggle('active', language.description === child.firstElementChild.alt));

		// If there's a locale script, load it. English doesn't have one, but still set the locale.
		if (language.dayjs) {
			const scriptElement  = document.createElement('script');
			scriptElement.src    = language.dayjs;
			scriptElement.onload = () => dayjs.locale(language.locale);
			// Add the script element to the DOM.
			document.body.appendChild(scriptElement);

		} else dayjs.locale(language.locale); // for English
		// Update the page with the new language selection.
		this.languagePage();
	}

	languageText(key, subKey) {
		try {
			// Return the language text.
			return this.settings.language[key][subKey];
		} catch (error) {
			this.alertUser('Missing language settings.');
		}
	}

	/***
	 * Location Functions
	 ***/

	// Build the location object data for first-time entry into data storage.
	locationBuild(locationData) {
		let location;
		// If location data does not include proper coordinates, then abort.
		if (!locationData.lat || !locationData.lon) return false;
		//  Convert the coordinates to a lesser accuracy.
		const [latitude, longitude] = this.convertCoords(locationData.lat, locationData.lon);

		const existingIndex = this.data.location.findIndex(loc => loc.city === locationData.name &&
		                                                          this.locationDistanceCheck([loc.latitude, loc.longitude],
		                                                                                     [latitude, longitude])) ?? null;

		location = this.data.location[existingIndex] ?? {};
		// Rebuild the location data object.
		location = {
			// If matching data already exists, merge with that; otherwise merge with an empty object.
			...location,
			cacheForecastUntil: Date.now() - 1,
			cacheWeatherUntil:  Date.now() - 1,
			lastAccess:         Date.now(),
			latitude:           latitude,
			longitude:          longitude,
			city:               locationData.name,
			state:              locationData.state ?? location.state ?? '',
			country:            locationData.country,
			zip:                locationData.zip ?? location.zip ?? ''
		};

		// Save the location object in the location data array.
		// If the location is new, push it to the array. If it was previously saved, overwrite the location.
		if (existingIndex === null) this.data.location.push(location);
		else this.data.location[existingIndex] = location;

		// If there is a zipcode without a state, run the lat/lon pair through the API again.
		if (location.zip && !locationData.state) this.locationLookup(`${latitude},${longitude}`);
		// Otherwise add additional functions to the object.
		else this.locationRebuild(location);
	}

	// Gets the user's current location.
	locationCurrent() {
		navigator.geolocation.getCurrentPosition(position => {
			this.locationLookup(`${position.coords.latitude}, ${position.coords.longitude}`);
		}, error => {
			console.error(error);
			this.alertUser('Unable to retrieve your location. Please try again later.');
		});
	}

	// Compares the distances between two pairs of coordinates. They should be passed here as array items.
	locationDistanceCheck(locationOne, locationTwo) {
		return Math.abs(parseFloat(locationOne[0]) - parseFloat(locationTwo[0])) <= this.settings.similarAccuracy &&
		       Math.abs(parseFloat(locationOne[1]) - parseFloat(locationTwo[1])) <= this.settings.similarAccuracy;
	}

	// List options for multiple returned locations based off of the search criteria.
	locationListOptions(locationListData) {
		const locationList = this.elements.locationListOptions;

		// Build each item of the location options list.
		const listItemBuild = location => {
			const locationOption = this.templates.locationListOptions.cloneNode(true).firstElementChild;

			// Fill In the location details.
			locationOption.querySelector('.search__option-desc--city').textContent   = location.name;
			locationOption.querySelector('.search__option-desc--coords').textContent = `${location.lat}, ${location.lon}`;
			// If the state and country are specified, use those, otherwise use whatever there is.
			locationOption.querySelector('.search__option-desc--stco').textContent   =
				(location.state && location.country) ? `${location.state}, ${location.country}`
				                                     : location.state || location.country || '';

			// Save the function for future removal.
			this.eventClickSave(locationOption, 'locationListOptions', ((locationOption) => {
				// Remove event handlers from all the children, and clear the list.
				[...this.elements.locationListOptions.children].forEach(child => {
					this.eventClickRemove(child, 'locationListOptions');
					child.remove();
				});

				// Rebuild the location object by using the referenced location index, then update the history.
				this.locationBuild(locationOption);
				this.locationListUpdate();
			}).bind(this, location));

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
		const listItemBuild = location => {
			// Clone the template and get the first element
			const locationItem = this.templates.locationItem.cloneNode(true).firstElementChild;

			// Fill In the location details.
			locationItem.querySelector('.search__desc--city').textContent   = location.city;
			locationItem.querySelector('.search__desc--coords').textContent = `${location.latitude}, ${location.longitude}`;
			// If the state and country are specified, use those, otherwise use whatever there is.
			locationItem.querySelector('.search__desc--stco').textContent   =
				(location.state && location.country) ? `${location.state}, ${location.country}`
				                                     : location.state || location.country || '';

			// data doesn't load until the promise is returned. Let's figure that one out.
			if (location.weatherData && typeof location.weatherData.getTemp === 'function') {
				locationItem.querySelector('.search__desc--temp').textContent       = location.weatherData.getTemp('actual', 0);
				locationItem.querySelector('.search__desc--icon').src               = location.weatherData.weather.iconURL;
				locationItem.querySelector('.search__desc--conditions').textContent = location.weatherData.weather.description;
			}

			// Save the reference to the direct object, and add an event listener.
			locationItem.ref = location;
			location.element = locationItem;
			this.eventClickSave(locationItem, 'listItemBuild', () => location.select(false));

			//  Return the location element.
			return locationItem;
		};

		// Remove event handlers from all the children, and clear the list.
		this.eventClickChildrenRemove(this.elements.locationList, 'listItemBuild');

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
				if (Math.abs(parseFloat(matches[1])) > 90 || Math.abs(parseFloat(matches[2])) > 180)
					this.alertUser('coordsInvalid');


				// Get the URL, set the return limit and convert the coordinate accuracy.
				url                            = this.apis.geocodeCoords;
				urlSearch.limit                = this.settings.geoLimit;
				[urlSearch.lat, urlSearch.lon] = this.convertCoords(matches[1], matches[2]);

				//  Cache search test for latitude and longitude. Accept a margin of error, set in similarAccuracy.
				cacheTest = loc => this.locationDistanceCheck([loc.latitude, loc.longitude],
				                                              [urlSearch.lat, urlSearch.lon]);

			} else {
				// Alert the user that there's invalid data.
				this.alertUser('inputInvalid');
				return false;
			}

			// Fill the URL string with parameters.
			url.search = new URLSearchParams(urlSearch);

			// Search for the cached data, and if it's found, load it.
			if (locationData = this.data.location.find(cacheTest)) locationData.select();

			// Otherwise, pull location data from the API
			else await this.apiFetchJSON(url.href, (locationData => {
				if (Array.isArray(locationData)) {

					const stateFilter = new Set();
					// Filter out "duplicate" entries that might get returned.
					locationData      = locationData.filter(location => {
						// If the state name is not in the set, add it, and return true; otherwise false.
						if (!stateFilter.has(location.state)) {
							stateFilter.add(location.state);
							return true;
						}
						return false;
					});

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
	async locationRebuild(locationData, keepLastAccess = false) {
		// Force the weather data to refresh, by expiring the cache.
		locationData.refresh = () => {
			locationData.cacheForecastUntil = Date.now() - 1;
			locationData.cacheWeatherUntil  = Date.now() - 1;
			locationData.select(); // Changed this.select() to locationData.select()
		};
		// Save the element reference to the object, update the weather and forecast, then cache.
		locationData.select  = async (keepLastAccess = false) => {
			// Update if keepLastAccess is false. This saves the order on reload, and is set by apiCacheReload().
			if (keepLastAccess === false)
				locationData.lastAccess = Date.now();
			// Update the weather, the forecast data and the location list; then cache the data.
			await this.weatherUpdate(locationData);
			await this.forecastUpdate(locationData);
			this.locationListUpdate();
			this.apiCacheSave();
		};

		// Run the select() function to update the object and cache the weather data.
		// Maintain the keepLastAccess value.
		await locationData.select(keepLastAccess);
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

	locationUpdate() {
		if (this.data.location.length) this.data.location[0].select();
	}

	/***
	 * Weather Functions
	 ***/

	// Fill in the weather data in the DOM.
	weatherBuild(locationData) {
		// Shorten the references.
		const weatherElement = this.elements.weather;
		const weatherData    = locationData.weatherData;
		const feelsLike      = weatherElement.querySelector('.weather__item--feels-like');
		const humidity       = weatherElement.querySelector('.weather__item--humidity');
		const max            = weatherElement.querySelector('.weather__item--max');
		const min            = weatherElement.querySelector('.weather__item--min');
		const pressure       = weatherElement.querySelector('.weather__item--pressure');
		const temp           = weatherElement.querySelector('.weather__item--temp');
		const weatherIcon    = weatherElement.querySelector('.weather__item--icon');
		const wind           = weatherElement.querySelector('.weather__item--wind');
		const visibility     = weatherElement.querySelector('.weather__item--visibility');

		// Set the location name.
		weatherElement.querySelector('.weather__item--location').textContent = locationData.city;

		// Set the icon for the weather.
		weatherIcon.src = weatherData.weather.iconURL;
		weatherIcon.alt = weatherData.weather.description;

		// Set the text content for the weather data.
		feelsLike.textContent  = weatherData.getTemp('feelsLike');
		humidity.textContent   = weatherData.humidity ?? '';
		max.textContent        = weatherData.getTemp('max');
		min.textContent        = weatherData.getTemp('min');
		pressure.textContent   = weatherData.pressure ?? '';
		temp.textContent       = weatherData.getTemp('actual');
		wind.textContent       = weatherData.getWind('both');
		visibility.textContent = weatherData.getVisibility();

		// Set the data-label attributes for CSS to fill in. This is mostly for translation purposes.
		feelsLike.dataset.label  = this.languageText('labels', 'feelsLike');
		humidity.dataset.label   = this.languageText('labels', 'humidity');
		max.dataset.label        = this.languageText('labels', 'max');
		min.dataset.label        = this.languageText('labels', 'min');
		pressure.dataset.label   = this.languageText('labels', 'pressure');
		temp.dataset.label       = this.languageText('labels', 'temp');
		wind.dataset.label       = this.languageText('labels', 'wind');
		visibility.dataset.label = this.languageText('labels', 'visibility');
	}

	// Updates the weather from OpenWeatherMap API,
	async weatherUpdate(locationData) {
		await this.apiUpdate('weather', locationData, locationData => {
			// Add functions to new data, or previously cached data where it would have been destroyed.
			if (Object.keys(locationData.weatherData).length)
				this.apiDataRebuild(locationData.weatherData);
			// Fill the weather information.
			this.weatherBuild(locationData);
		});
	}

	/***
	 * Miscellaneous Functions
	 ***/

	// Alert the user to some sort of issue.
	alertUser(message) {
		// Clone the alert
		const alertElement = this.templates.alert.cloneNode(true).firstElementChild;

		alertElement.firstElementChild.textContent = message;
		this.elements.pageHeader.insertBefore(alertElement, this.elements.pageHeader.firstElementChild);

		alertElement.classList.add('active');

		// Save the function for future removal.
		this.eventClickSave(alertElement, 'alert', () => {
			// Remove the event handler when it's clicked on.
			this.eventClickRemove(alertElement, 'alert');
			// Remove the element when the user clicks on it.
			alertElement.remove();
		});
	}

	// Build the unit measurement selection menu.
	unitMenuBuild() {
		// Save the event handler function for later so it can be removed.
		const func = this.eventFunctionSave('unitBuildMenu', (event) => {
			// Toggle the active unit and save it.
			[...event.target.parentNode.children]
				.forEach(child => child.classList.toggle('active', child === event.target));
			this.settings.unitSystem = event.target.dataset.unit;
			// Update the locations with the new units.
			this.locationUpdate();
		});

		// Remove the children and their little event listeners too.
		this.eventClickChildrenRemove(this.elements.settingsUnitsList, 'unitMenuBuild');

		// Units Menu Build
		Object.keys(this.settings.units).forEach(unit => {
			//  Clone the unit item.
			const unitElement = this.templates.settingsItem.cloneNode(true).firstElementChild;

			// Set the text, save the unit, add an event listener.
			unitElement.textContent = this.languageText('labels', unit);
			unitElement.classList.toggle('active', unit === this.settings.unitSystem);
			unitElement.dataset.unit = unit;
			unitElement.addEventListener('click', func);
			// Add the item to the list.
			this.elements.settingsUnitsList.appendChild(unitElement);
		});
	}
}

new Weather();