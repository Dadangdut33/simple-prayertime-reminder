package export

import (
	"encoding/csv"
	"fmt"
	"os"
	"time"

	"github.com/dadangdut33/simple-prayertime-reminder/internal/prayer"
	"github.com/xuri/excelize/v2"
)

const timeFormat = "15:04"

// ToCSV exports prayer times to a CSV file
func ToCSV(schedules []prayer.DaySchedule, filepath string) error {
	f, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	header := []string{"Date", "Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"}
	if err := w.Write(header); err != nil {
		return err
	}

	for _, s := range schedules {
		row := []string{
			s.Date,
			formatTime(s.Fajr),
			formatTime(s.Sunrise),
			formatTime(s.Zuhr),
			formatTime(s.Asr),
			formatTime(s.Maghrib),
			formatTime(s.Isha),
		}
		if err := w.Write(row); err != nil {
			return err
		}
	}
	return nil
}

// ToExcel exports prayer times to an Excel (.xlsx) file
func ToExcel(schedules []prayer.DaySchedule, filepath string) error {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Prayer Times"
	f.SetSheetName("Sheet1", sheet)

	// Style for header
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1D4ED8"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	// Style for data rows (alternating)
	evenStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	oddStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EFF6FF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	headers := []string{"Date", "Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"}
	cols := []string{"A", "B", "C", "D", "E", "F", "G"}

	// Write header
	for i, h := range headers {
		cell := cols[i] + "1"
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
		f.SetColWidth(sheet, cols[i], cols[i], 14)
	}

	// Write data
	for rowIdx, s := range schedules {
		excelRow := rowIdx + 2
		rowStr := fmt.Sprintf("%d", excelRow)
		style := evenStyle
		if rowIdx%2 == 0 {
			style = oddStyle
		}

		values := []string{
			s.Date,
			formatTime(s.Fajr),
			formatTime(s.Sunrise),
			formatTime(s.Zuhr),
			formatTime(s.Asr),
			formatTime(s.Maghrib),
			formatTime(s.Isha),
		}

		for i, v := range values {
			cell := cols[i] + rowStr
			f.SetCellValue(sheet, cell, v)
			f.SetCellStyle(sheet, cell, cell, style)
		}
	}

	// Freeze header row
	f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	return f.SaveAs(filepath)
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.Format(timeFormat)
}
