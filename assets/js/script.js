// https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid=815b81b4556e7f7c29099ba98f3991ab
// http://api.openweathermap.org/geo/1.0/zip?zip={zip code},{country code}&appid=815b81b4556e7f7c29099ba98f3991ab
/***
 TODO:
     - Get user's current location.
	 - Display the time.
     - Set background of card to reflect weather conditions.
     - Find some icons to reflect the weather conditions.
	 - Weather's return has extra items, which may be useful. Maybe not though.
     - Locale and language?
 ***/

class Weather {
	apis        = {
		apiKey:      '815b81b4556e7f7c29099ba98f3991ab',
		forecast:    'https://api.openweathermap.org/data/2.5/forecast',
		geocodeCity: 'http://api.openweathermap.org/geo/1.0/direct',
		gecodeZip:   'http://api.openweathermap.org/geo/1.0/zip',
	};
	location    = {};
	templates   = {
		dayCard:  document.getElementById('dayCard').content,
		timeCard: document.getElementById('timeCard').content
	};
	units       = 'F';
	weatherData = {};

	constructor() {
		this.locationSearch().then(location => this.weatherSearch(location));
	}

	dayAdd(day) {
		const dayCard = this.templates.dayCard.cloneNode(true);

		console.log(day);

		// dayCard.querySelector('.dayCard__date').textContent     = day.dateData.format('MMMM D');
		// dayCard.querySelector('.dayCard__day').textContent      = day.dateData.format('dddd');
		dayCard.querySelector('.dayCard__temperature').textContent = day[0].temperature;
		dayCard.querySelector('.dayCard__humidity').textContent    = '90%';
		dayCard.querySelector('.dayCard__wind').textContent        = '5mph NW';

		document.querySelector('.weather').appendChild(dayCard);
	}

	async locationSearch() {

		// try {
		// 	let url      = this.apis.gecodeZip + '?zip=78664' + '&appid=' + this.apis.apiKey;
		// 	let response = await fetch(url);
		//
		// 	const locationData = response.json();
		// 	console.log(locationData);
		// } catch (error) {
		//
		// }
		this.location = {
			country: "US",
			lat:     30.5145,
			lon:     -97.668,
			name:    "Round Rock",
			zip:     "78664"
		}
		return this.location;
	}

	async weatherSearch(location) {
		let weatherData = JSON.parse(localStorage.getItem('forecast'), true);
		if (!weatherData) {
			try {
				let url      = `${this.apis.forecast}?lat=${location.lat}&lon=${location.lon}&appid=${this.apis.apiKey}`;
				let response = await fetch(url).then(response => {
					localStorage.setItem('forecast', JSON.stringify(response.json()));
				});
			} catch (error) {

			}
		}
		this.buildForecast(weatherData);
	}

	buildDay(day) {
		const dayCard = this.templates.dayCard.cloneNode(true);

		dayCard.querySelector('.dayCard__header__location').textContent = this.location.name;
		dayCard.querySelector('.dayCard__header__date').textContent     = day[0].dateData.format('MMMM DD');
		dayCard.querySelector('.dayCard__header__day').textContent      = day[0].dateData.format('dddd');

		day.forEach(dayTime => {
			const timeCard                                               = this.templates.timeCard.cloneNode(true);
			timeCard.querySelector('.timeCard__time').textContent        = dayTime.dateData.format('ha');
			timeCard.querySelector('.timeCard__temperature').textContent = dayTime.temp.current;
			timeCard.querySelector('.timeCard__humidity').textContent    = dayTime.humidity;
			timeCard.querySelector('.timeCard__wind').textContent        = `${dayTime.wind.speed} ${dayTime.wind.direction}`;

			dayCard.querySelector('.dayCard').appendChild(timeCard);
		});
		//  Add day to the forecast
		document.querySelector('.weather').appendChild(dayCard);
	}

	buildForecast(weatherData) {
		let forecast = {};

		//  Parse through the returned weather data, rebuild the time/weather objects and put them into an array of days.
		weatherData.list.forEach(weather => {
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

	convertDirection(deg) {
		const nesw = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

		//  Divide 360 degrees / 8 = 45 degrees for each octant. Use this to calculate the modulus for the array index,
		//  and return the cardinal direction.
		return nesw[Math.round(deg / 45) % 8];
	}

	convertTemp(temp) {
		//  Convert from Kelvin to Celsius
		if (this.units !== 'K') temp = temp - 273.15;
		//  Convert from Celsius to Fahrenheit
		if (this.units === 'F') temp = 1.8 * temp + 32;

		//  Return the result
		return `${temp.toFixed(2)}°${this.units}`;
	}
}

const weather = new Weather();