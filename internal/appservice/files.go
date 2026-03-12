package appservice

import "os"

func (s *Service) ReadTextFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Error("read text file failed", "error", err, "path", path)
		return "", err
	}
	log.Info("read text file", "path", path)
	return string(data), nil
}
