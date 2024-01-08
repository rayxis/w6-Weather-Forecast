# Weather Forecaster

## Description

This is a weather forecast web application that provides current weather conditions and a future 5-day forecast for any
selected location in the world.

It starts off by pulling language data, which has been stored in a JavaScript file (./assets/js/languages.js), and API
key (./assets/js/secret.js) for use with OpenWeatherMap's API. The script will then check if any cache is available.

The script pulls location data from the API server, and reorganizes the returned objects into a more structured object
that can be worked with for the purposes of the application. The script organizes location, current weather and forecast
data within the same object, to make it easier for organizational purposes. Each location object (and weather/forecast
item therein) has several functions which make loading data easier, completing conversions from imperial to metric or
"scientific" (Kelvin, with a metric twist).

The objects are stored in an array, which is cached in localStorage whenever any changes or updates are made. Settings
are also cached in localStorage, which will help user preferences to persist beyond the current session. These settings
include language preference, and unit measurement preference. Because you cannot store functions in a stringified
object, care has been taken to ensure that functions are added separate from object creation in order to make
rebuilding (adding the functions again) an easier process.

## Installation

Installation is simple in that it requires no special permissions, and simply exporting the website to the root location
of your web server's web directory (ex. /var/www/html) should load with no problem. As long as your server is properly
configured, no additional steps are necessary.

Something to note: the API key is pulled from an external file (secret.js), which any visitor has access to. Although
it would be suggested to store the key in a better location due to the fact that no authorization is required to use the
key, options may be limited for you to store it in a secure location. Additional configuration will be needed to
accomplish this task. Once the API key is public, anyone can use the quota for whatever purposes that they would like.
If this was a paid API, this could cost a lot of money.

Additional languages can be added to expand the functionality of the application. By following the structure within
languages.js, you should abe able to add any number of other language translations. This can be as simple as copying the
object data, and pasting it on DeepL's website (https://deepl.com) for accurate translation.

From a site administrator's perspective, there are multiple settings that can be adjusted to provide greater flexibility
in how the application operates. All configuration options are located at the top of the Weather class:

In settings:

* **coordAccuracy** - The accuracy of the coordinates to round to and save. More numbers aren't necessarily better. Each
  degree of latitude or longitude is 111km. That means that for every decimal, it goes down by a factor of 10; so .1
  would be 11.1km; .001 would be 111m; and .0000001 is slightly bigger than the thickness of your cellphone. For the
  purposes of finding an entire city, an accuracy of 2 (.01 = 1.11km) seems sufficient.
* **distanceAccuracy** - The accuracy for converting from kilometers to miles with the function convertDistance(). There
  are
  1609.344 meters in 1 mile, which can lead to some unnecessarily long decimal digits. The number 2 provides accuracy of
  1/100 of a mile, or down to 52.8ft.
* **cacheForecastExp** & **cacheWeatherExp** - The amount of time given for the data cache to expire, for both
  forecastData and weatherData within each object. This is a unit in milliseconds, so it may be easier to put a
  mathematical expression of hours * minutes * seconds * milliseconds in there. Because the forecast is for every 3
  hours, 3 * 60 * 60 * 1000 (or 10,800,000) milliseconds makes the most sense. For weather, something smaller would make
  sense since it's reflective of the current conditions. Some sort of expiration is suggested since API calls can add up
  if you have a quota.
* **cacheLocation** & **cacheSettings** - The locations in localStorage, to store the cached data. cacheLocation is
  where the location, forecast and weather data is stored. cacheSettings is where settings are stored, and this is done
  so because a user may change their language, or their preferred units of measurement.
* **geoLimit** - In the event where OpenWeatherMap returns more than one location, this is the limit to how many
  responses to get. OWM's limit is 5, so any number between 1-5 is allowed.
* **similarAccuracy** - Where someone searches for a location that shares a proximity to another location that they've
  searched for, this is the level of accuracy to allow. The distance here is the difference in coordinate degrees
  between two different points. .1 would be 11.1km. This seems reasonable since a city sharing the same name, within
  11.1km is unlikely (though, not impossible: the Kansas Cities comes to mind).
* **tempAccuracy** - Decimal accuracy for temperature conversions, using the convertTemp() function. The numbers that
  come out of OpenWeatherMap are in Kelvin. The API offers the opportunity to request Fahrenheit or Celsius, but A.)
  where would the fun in that be? B.) I'm sure someone else out there shares my nerdy curiosity. When converting from
  Kelvin to Celsius, decimals aren't a problem. Converting from Celsius to Fahrenheit is where tiny numbers begin to
  appear.

Settings can also be configured for each of the unit systems (imperial, metric and scientific). Units can be changed,
and so if you wanted to have kilometers instead of km–well, why not?

The last bit of settings, which can be changed (although, it's discouraged if you don't know what you're doing) are the
regular expressions. These are used for processing the user's input data. As of right now, cityStateCountry picks up the
combination of at least "City, State" or "City, Country" and at most "City, State, Country". You could make the comma
and what comes after optional by adding a "?"after the first comma, and "?" before the second comma. Coordinates
measures up to 7 decimal places. This should be more than enough. Finally, the zip codes right now accept the Canadian
pattern of A#A #A#, and the US' 5-digits (as well as every other country that uses it). This could be edited to do other
countries like England, Japan, etc.

## Usage

To use the Weather Forecaster, load the page up in your browser. If this is your first time visiting, click on the
search box and enter the location for where you want to know the weather forecast, and click "Go." The acceptable input
values are:

* City, State
* City, Country
* City, State, Country
* Zip Code (Canada and countries that use 5 digits)
* Latitude / Longitude

There are additional settings that you may adjust: language, and measurement units. The language is determined based off
of your locale settings; however, you may also manually select a language. The available languages are English, French,
German and Spanish. Measurement units may also be adjusted. Those options are: imperial (US, Myanmar and Liberia),
metric (the rest of the world), and scientific (nerds among us).

When you click "Go", depending on what you placed in the location box determines what happens next. If multiple
locations were found, (such as in the instance where you might have entered "Holden, US") you'll be presented with a
popup menu to select the location that you intended. When you click on one of the listed locations, the popup will
disappear, and you will be presented with the current weather conditions, and 5-day forecast for the area. Note: this
would also happen if you entered a location that did not have multiple options available to choose from, such as
entering a zip code.

Any location that you select will appear in the history at the top of the screen, in proximity to the search form. If
you have entered multiple locations, you'll be able to click each of those locations in the list history to be able to
toggle the relevant data.

All information is cached, and depending on the type of information it is, some will be cached longer than others.
The information presented for the current weather conditions will be cached for an hour; the 5-day, 3-hour forecast will
be cached for 3 hours; and the location information will not expire at all since most places in the world are fixed in
their locations.

## Screenshots

## Credit

* Paul McCaughtry helped with the idea to use a separate array to compare duplicate return cities from the OpenWeatherMap
API.
* Borrowed and refactored event listener code that I made in a previous personal project (VRA Moderation Tool, Think).

## User Story

```
AS A traveler
I WANT to see the weather outlook for multiple cities
SO THAT I can plan a trip accordingly
```

## Acceptance Criteria

```
GIVEN a weather dashboard with form inputs
WHEN I search for a city
THEN I am presented with current and future conditions for that city and that city is added to the search history
WHEN I view current weather conditions for that city
THEN I am presented with the city name, the date, an icon representation of weather conditions, the temperature, the humidity, and the the wind speed
WHEN I view future weather conditions for that city
THEN I am presented with a 5-day forecast that displays the date, an icon representation of weather conditions, the temperature, the wind speed, and the humidity
WHEN I click on a city in the search history
THEN I am again presented with current and future conditions for that city
```
