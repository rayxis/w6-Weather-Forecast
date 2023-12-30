# Weather Forecaster

## Description

This is a weather forecast web application that provides current weather conditions and a future 5-day forecast for any
selected location in the world.

It starts off by pulling language data, which has been stored in a JavaScript file (./assets/js/languages.js), and API
key (./assets/js/secret.js) for use with OpenWeatherMap's API. The script will then check if any cache is available.

The script pulls location data from the API server, and reorganizes the returned objects into a more structured object.
The script organizes location, current weather and forecast data within the same object, and each object is stored in an
array, which is cached in localStorage whenever any changes or updates are made.

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
