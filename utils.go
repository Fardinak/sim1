package sim1

import (
	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gomono"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
	"image"
	"image/draw"
	"image/png"
	"math"
	"os"
	"strings"
)

func isPerfectSquare[T int | uint](n T) bool {
	root := T(math.Sqrt(float64(n)))
	return root*root == n
}

func PlotPNG(grid *Grid, txt string, outFile string) {
	const FontDPI = 72
	const FontSize = 16

	txtLines := strings.Count(txt, "\n")
	if len(txt) > 0 && !strings.HasSuffix(txt, "\n") {
		txtLines++
	}

	//plotBounds := image.Rect(0, 0, int(SimSize*PlotRes), int(SimSize*PlotRes))
	//plot := image.NewRGBA(plotBounds)
	//draw.Draw(plot, plot.Rect, image.White, image.Point{}, draw.Over)
	//
	//// agents
	//for i := range population {
	//	draw.Draw(plot,
	//		image.Rect(
	//			int(population[i].X)*PlotRes,
	//			int(population[i].Y)*PlotRes,
	//			int(population[i].X)*PlotRes+PlotRes,
	//			int(population[i].Y)*PlotRes+PlotRes,
	//		),
	//		image.NewUniform(color.RGBA{
	//			R: uint8(population[i].Genes & GeneMaskColor & 0xFF0000 >> 16),
	//			G: uint8(population[i].Genes & GeneMaskColor & 0x00FF00 >> 8),
	//			B: uint8(population[i].Genes & GeneMaskColor & 0x0000FF),
	//			A: 255,
	//		}),
	//		image.Point{},
	//		draw.Over,
	//	)
	//}

	// output
	out := image.NewRGBA(image.Rectangle{
		Max: image.Point{
			X: grid.Bounds().Max.X + 10,
			Y: grid.Bounds().Max.Y + FontSize*(txtLines+1) + 10,
		},
	})

	// background
	draw.Draw(out, out.Rect, image.White, image.Point{}, draw.Over)

	// text
	f, err := opentype.Parse(gomono.TTF)
	if err != nil {
		panic(err)
	}
	face, err := opentype.NewFace(f, &opentype.FaceOptions{
		Size:    FontSize,
		DPI:     FontDPI,
		Hinting: font.HintingNone,
	})
	if err != nil {
		panic(err)
	}

	lines := strings.Split(txt, "\n")
	for i := range lines {
		(&font.Drawer{
			Dst:  out,
			Src:  image.Black,
			Face: face,
			Dot:  fixed.Point26_6{X: 4 * FontDPI, Y: fixed.Int26_6((FontSize*FontDPI + FontSize) * (i + 1))},
		}).DrawString(lines[i])
	}

	//// plot border
	//bPlot := image.NewRGBA(image.Rectangle{Max: plot.Rect.Max.Add(image.Point{X: 2, Y: 2})})
	//draw.Draw(bPlot, bPlot.Rect, image.Black, image.Point{}, draw.Over)
	//draw.Draw(bPlot, image.Rectangle{Min: image.Point{X: 1, Y: 1}, Max: bPlot.Rect.Max}, plot, image.Point{}, draw.Over)
	//
	//// add plot
	//draw.Draw(out, image.Rectangle{
	//	Min: image.Point{X: 4, Y: out.Rect.Max.Y - bPlot.Rect.Max.Y - 4},
	//	Max: out.Rect.Max,
	//}, bPlot, image.Point{}, draw.Over)

	draw.Draw(out, image.Rectangle{
		Min: image.Point{X: 4, Y: out.Rect.Max.Y - grid.Bounds().Max.Y - 4},
		Max: out.Rect.Max,
	}, grid, image.Point{}, draw.Over)

	// save to file
	file, err := os.OpenFile(outFile, os.O_CREATE|os.O_RDWR, 0755)
	if err != nil {
		panic(err)
	}

	err = png.Encode(file, out)
	if err != nil {
		panic(err)
	}

	err = file.Close()
	if err != nil {
		panic(err)
	}
}
