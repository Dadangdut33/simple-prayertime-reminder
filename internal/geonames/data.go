package geonames

import "embed"

//go:embed cities500.txt readme.md
var data embed.FS
