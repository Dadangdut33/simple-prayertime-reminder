package qibla

import "math"

const (
	// kaabaLat is the latitude of the Kaaba in Mecca
	kaabaLat = 21.4225
	// kaabaLon is the longitude of the Kaaba in Mecca
	kaabaLon = 39.8262
)

// Direction calculates the Qibla bearing (in degrees, 0-360) from a given location
// to the Kaaba in Mecca. Uses the spherical law of cosines / bearing formula.
func Direction(lat, lon float64) float64 {
	lat1 := toRad(lat)
	lat2 := toRad(kaabaLat)
	dLon := toRad(kaabaLon - lon)

	x := math.Sin(dLon) * math.Cos(lat2)
	y := math.Cos(lat1)*math.Sin(lat2) - math.Sin(lat1)*math.Cos(lat2)*math.Cos(dLon)

	bearing := toDeg(math.Atan2(x, y))
	// Normalize to 0-360
	return math.Mod(bearing+360, 360)
}

// CardinalDirection converts a bearing to a compass direction abbreviation
// e.g. 45 -> "NE", 180 -> "S"
func CardinalDirection(bearing float64) string {
	directions := []string{"N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
		"S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"}
	idx := int((bearing+11.25)/22.5) % 16
	return directions[idx]
}

func toRad(deg float64) float64 { return deg * math.Pi / 180 }
func toDeg(rad float64) float64 { return rad * 180 / math.Pi }
