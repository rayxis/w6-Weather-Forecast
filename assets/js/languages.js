const languages = {
	'de-DE': {
		dayjs:       'https://cdn.jsdelivr.net/npm/dayjs@1.11/locale/de.js',
		description: 'Deutsch',
		errors:      {
			coordsInvalid:   'Dies sind keine gültigen Koordinaten.',
			currentLocation: 'Dein aktueller Standort konnte nicht ermittelt werden. Versuche es später noch einmal.',
			inputInvalid:    'Dies ist keine gültige Eingabe.'
		},
		icon:        './assets/images/Germany.webp',
		labels:      {
			feelsLike:    'Fühlt sich an wie',
			humidity:     'Luftfeuchtigkeit',
			imperial:     'imperial',
			max:          'max',
			metric:       'metrisch',
			min:          'min',
			pressure:     'Druck',
			scientific:   'wissenschaftlich',
			searchButton: 'Geh',
			searchInput:  'Einen Ort eingeben',
			searchLabel:  'Stadt, Staat, Land, Postleitzahl oder Lat/Lon',
			temp:         'Temp',
			wind:         'Wind',
			visibility:   'Sichtbarkeit'
		},
		locale:      'de-DE',
		text:        {
			footer: 'Die Seite wurde von Ray Beliveau programmiert und gestaltet.',
			title:  'Wettervorhersage'
		}
	},
	'en-US': {
		description: 'English',
		// Error messages
		errors: {
			coordsInvalid:   'These are not valid coordinates',
			currentLocation: 'Impossible de rechercher votre position actuelle. Réessayez plus tard.',
			inputInvalid:    'This is not valid input.',
			networkError:    'Network error'
		},
		icon:   './assets/images/USA.webp',
		labels: {
			feelsLike:    'Feels Like',
			humidity:     'Humidity',
			imperial:     'Imperial',
			max:          'Max',
			metric:       'Metric',
			min:          'Min',
			pressure:     'Pressure',
			scientific:   'Scientific',
			searchButton: 'Go',
			searchInput:  'Enter a location',
			searchLabel:  'City, State, Country, Zip or Lat/Lon',
			temp:         'Temp',
			wind:         'Wind',
			visibility:   'Visibility'
		},
		locale: 'en-US',
		text:   {
			footer: 'Page coded and designed by Ray Beliveau.',
			title:  'Weather Forecast'
		}
	},
	'es-ES': {
		dayjs:       'https://cdn.jsdelivr.net/npm/dayjs@1.11/locale/es.js',
		description: 'Español',
		errors:      {
			coordsInvalid:   'Estas coordenadas no son válidas',
			currentLocation: 'No se ha podido buscar tu ubicación actual. Vuelve a intentarlo más tarde.',
			inputInvalid:    'Esta entrada no es válida'
		},
		icon:        './assets/images/Spain.webp',
		labels:      {
			feelsLike:    'Se siente como',
			humidity:     'Humedad',
			imperial:     'Imperial',
			max:          'Máx',
			metric:       'Métrico',
			min:          'Min',
			pressure:     'Presión',
			scientific:   'Científico',
			searchButton: 'Ve',
			searchInput:  'Introduzca una ubicación',
			searchLabel:  'Ciudad, Estado, País, Código Postal o Lat/Lon',
			temp:         'Temp',
			wind:         'Viento',
			visibility:   'Visibilidad'
		},
		locale:      'es-ES',
		text:        {
			footer: 'Página codificada y diseñada por Ray Beliveau.',
			title:  'Pronóstico del Tiempo'
		}
	},
	'fr-FR': {
		dayjs:       'https://cdn.jsdelivr.net/npm/dayjs@1.11/locale/fr.js',
		description: 'Français',
		errors:      {
			coordsInvalid:   'Ces coordonnées ne sont pas valides',
			currentLocation: 'Impossible de rechercher votre position actuelle. Réessayez plus tard.',
			inputInvalid:    'Cette entrée n\'est pas valide.'
		},
		icon:        './assets/images/France.webp',
		labels:      {
			feelsLike:    'Ressenti',
			humidity:     'Humidité',
			imperial:     'impérial',
			max:          'Max',
			metric:       'Métrique',
			min:          'Min',
			pressure:     'Pression',
			scientific:   'Scientifique',
			searchButton: 'Va',
			searchInput:  'Saisir un lieu',
			searchLabel:  'Ville, État, Pays, Zip ou Lat/Lon',
			temp:         'Temp',
			wind:         'Vent',
			visibility:   'Visibilité'
		},
		locale:      'fr-FR',
		text:        {
			footer: 'Page codée et dessinée par Ray Beliveau.',
			title:  'Prévisions Météorologiques'
		}
	}
};